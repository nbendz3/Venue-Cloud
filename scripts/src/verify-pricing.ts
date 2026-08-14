/**
 * Regression check for the pricing engine, run against the dev fixture.
 *
 * The fixture reproduces production function 1: 77 items of which exactly one
 * is selected. Before the fix the app billed the sum of ALL items ($6,053.00);
 * it must now bill only the selected one ($160.00).
 */

import { db } from "@workspace/db";
import { revenueCentersTable, serviceFeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  calculateFunctionPricing,
  calculateEventPricing,
  computeLineTotal,
  isBillable,
  round2,
} from "../../artifacts/api-server/src/services/pricing.ts";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

async function main() {
  // Make the run repeatable: clear any rate configuration left behind by a
  // previous run, so phase 1 always starts from "nothing configured".
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "yes") { console.error("Refusing to run: this rewrites tax and service-fee configuration. Point DATABASE_URL at a dev database and set ALLOW_DESTRUCTIVE_SEED=yes."); process.exit(1); }
  await db.delete(serviceFeesTable);
  await db
    .update(revenueCentersTable)
    .set({ isDefault: false, salesTaxRate: null, occupancyTaxRate: null });

  /* ------------------------------------------------------- pure functions */
  check("unselected item is not billable", isBillable({ selected: false, quantity: "1" }), false);
  check("selected item with qty is billable", isBillable({ selected: true, quantity: "1" }), true);
  check("selected item with zero qty is not billable", isBillable({ selected: true, quantity: "0" }), false);
  check("internal item is not billable", isBillable({ selected: true, quantity: "1", markItemInternal: true }), false);

  check("line total = qty x price", computeLineTotal({ quantity: "3", aLaCartePrice: "46.00" }), 138);
  check(
    "hourly line total = qty x price x hours",
    computeLineTotal({ quantity: "2", aLaCartePrice: "75.00", chargeHourly: true, numHours: "4" }),
    600
  );
  check("addOnPrice is included", computeLineTotal({ quantity: "1", aLaCartePrice: "10", addOnPrice: "5" }), 15);
  check("rounding is half-up at 2dp", round2(1.005), 1.01);

  /* --------------------------------------------------- engine vs fixture */
  const fn = await calculateFunctionPricing(1);

  check("function 1 billable line count", fn.lines.length, 1);
  check("function 1 charges (was 6053.00)", fn.totals.charges, 160);
  check("no service fees configured -> gratuity is 0", fn.totals.gratuity, 0);
  check("no tax rates configured -> sales tax is 0", fn.totals.salesTax, 0);
  check("function 1 total", fn.totals.total, 160);

  const menuTotalsSum = round2(
    Object.values(fn.menuTotals).reduce((s, m) => s + m.charges, 0)
  );
  check("menu totals sum to function charges", menuTotalsSum, fn.totals.charges);

  const rcSum = round2(fn.byRevenueCenter.reduce((s, r) => s + r.charges, 0));
  check("revenue center totals sum to function charges", rcSum, fn.totals.charges);

  check(
    "item counts are still reported for unselected items",
    Object.values(fn.menuTotals).reduce((s, m) => s + m.itemCount, 0),
    77
  );

  check("warns that service fees are unconfigured", fn.warnings.some((w) => /service fees/i.test(w)), true);
  check("warns that no default revenue center is set", fn.warnings.some((w) => /default revenue center/i.test(w)), true);

  /* ------------------------------------------------------------- event */
  const ev = await calculateEventPricing(1);
  check("event charges equal sum of its functions", ev.totals.charges, 160);
  check("event balance due", ev.balanceDue, 160);
  check("event has two functions", ev.functions.length, 2);

  /* ------------------------------- with rates actually configured ------- */
  // Prove that tax and gratuity are driven by configuration rather than by
  // constants baked into the code.
  await db.update(revenueCentersTable).set({ isDefault: false });
  await db
    .update(revenueCentersTable)
    .set({ isDefault: true, salesTaxRate: "8.0000", occupancyTaxRate: "0.0000" })
    .where(eq(revenueCentersTable.name, "Food"));
  await db.insert(serviceFeesTable).values([
    { name: "Gratuity 22%", ratePercent: "22.0000", isTaxable: false },
  ]);

  const fn2 = await calculateFunctionPricing(1);
  check("charges unchanged by rate config", fn2.totals.charges, 160);
  check("gratuity now 22% of 160", fn2.totals.gratuity, 35.2);
  check("sales tax now 8% of 160", fn2.totals.salesTax, 12.8);
  check("grand total = 160 + 35.20 + 12.80", fn2.totals.total, 208);
  check("no rate warnings once configured", fn2.warnings.length, 0);
  check("item lands in the default revenue center", fn2.byRevenueCenter[0]?.revenueCenterName, "Food");

  // Taxable service fees must widen the tax base.
  await db.update(serviceFeesTable).set({ isTaxable: true });
  const fn3 = await calculateFunctionPricing(1);
  check("taxable gratuity widens the tax base", fn3.totals.salesTax, 15.62);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
