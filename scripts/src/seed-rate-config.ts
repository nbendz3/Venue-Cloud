/**
 * Seeds a starting rate configuration.
 *
 * The pricing engine deliberately refuses to invent rates: if `service_fees` is
 * empty and every revenue center has a null tax rate, service charge, gratuity
 * and tax all come out as $0 and the UI shows a warning. That is correct
 * behaviour, but a brand-new property still needs somewhere to start.
 *
 * This writes a conventional US resort setup which can then be edited in
 * Settings. It only fills in values that are currently unset, so it will not
 * overwrite rates a property has already configured.
 *
 *   DATABASE_URL=... pnpm --filter @workspace/scripts run seed:rates -- --apply
 */

import { db } from "@workspace/db";
import { revenueCentersTable, serviceFeesTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

/** name -> [salesTax %, occupancyTax %] */
const DEFAULT_TAX: Record<string, [number, number]> = {
  Food: [8, 0],
  "Non-Alcoholic Beverage": [8, 0],
  "Alcoholic Beverage": [10, 0],
  "Room Rental": [8, 0],
  Rentals: [8, 0],
  Equipment: [8, 0],
  Labor: [0, 0],
  "Outside Services": [0, 0],
  "Service Fees": [0, 0],
  "Other (No Taxes or Fees)": [0, 0],
};

const DEFAULT_FEES = [
  { name: "Gratuity 22%", ratePercent: "22.0000", isTaxable: false },
  { name: "Administrative Fee 3%", ratePercent: "3.0000", isTaxable: true },
];

async function main() {
  const revCenters = await db.select().from(revenueCentersTable);
  const existingFees = await db.select().from(serviceFeesTable);

  const plan: string[] = [];

  for (const rc of revCenters) {
    const preset = DEFAULT_TAX[rc.name];
    if (!preset) continue;
    if (rc.salesTaxRate != null || rc.occupancyTaxRate != null) continue;
    plan.push(`  tax   ${rc.name}: sales ${preset[0]}% / occupancy ${preset[1]}%`);
    if (APPLY) {
      await db
        .update(revenueCentersTable)
        .set({ salesTaxRate: preset[0].toFixed(4), occupancyTaxRate: preset[1].toFixed(4) })
        .where(eq(revenueCentersTable.id, rc.id));
    }
  }

  // Exactly one revenue center must be the default; Food is the sane pick for
  // a catering-led property.
  const hasDefault = revCenters.some((rc) => rc.isDefault === true);
  if (!hasDefault) {
    const food = revCenters.find((rc) => rc.name === "Food") ?? revCenters[0];
    if (food) {
      plan.push(`  default revenue center: ${food.name}`);
      if (APPLY) {
        await db.update(revenueCentersTable).set({ isDefault: false });
        await db.update(revenueCentersTable).set({ isDefault: true }).where(eq(revenueCentersTable.id, food.id));
      }
    }
  }

  if (existingFees.length === 0) {
    for (const fee of DEFAULT_FEES) {
      plan.push(`  service fee: ${fee.name} (${fee.ratePercent}%, taxable=${fee.isTaxable})`);
    }
    if (APPLY) await db.insert(serviceFeesTable).values(DEFAULT_FEES);
  }

  if (plan.length === 0) {
    console.log("Nothing to do — rates are already configured.");
  } else {
    console.log(APPLY ? "APPLIED:" : "DRY RUN — pass --apply to write:");
    for (const line of plan) console.log(line);
    console.log("\nEdit these in Settings > Tax Rates and Settings > Financial.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
