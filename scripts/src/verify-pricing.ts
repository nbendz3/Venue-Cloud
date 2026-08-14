/**
 * Regression check for the pricing engine, run against the dev fixture.
 *
 * The fixture reproduces production function 1: 77 items of which exactly one
 * is selected. Before the fix the app billed the sum of ALL items ($6,053.00);
 * it must now bill only the selected one ($160.00).
 */

import { db } from "@workspace/db";
import { revenueCentersTable, serviceFeesTable, appliedRatesTable, serviceItemsTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import {
  resolvePolicy,
  calculateFunctionPricing,
  calculateEventPricing,
  computeLineTotal,
  isBillable,
  round2,
} from "../../artifacts/api-server/src/services/pricing.ts";

let failures = 0;

/** Gratuity and service charge are the same money under two labels. */
const feeTotal = (t: { serviceCharge: number; gratuity: number }) => round2(t.serviceCharge + t.gratuity);

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "yes") { console.error("Refusing to run: this rewrites tax and service-fee configuration. Point DATABASE_URL at a dev database and set ALLOW_DESTRUCTIVE_SEED=yes."); process.exit(1); }

  /** Return the fixture to "no rates configured at all". */
  async function clearRateConfig() {
    await db.delete(serviceFeesTable);
    // Keep the four policy LABELS; drop any row that carries an actual rate.
    await db.delete(appliedRatesTable).where(isNotNull(appliedRatesTable.rate));
    await db
      .update(revenueCentersTable)
      .set({ isDefault: false, salesTaxRate: null, occupancyTaxRate: null });
    // The per-item policy assertions below mutate items; restore the default
    // so a second run starts from the same place as the first.
    await db.update(serviceItemsTable).set({ appliedRates: "Gratuity and Sales Tax" });
  }

  await clearRateConfig();

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
  check("nothing configured -> no service charge", feeTotal(fn.totals), 0);
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

  check("warns that no service charge is configured", fn.warnings.some((w) => /service charge or gratuity/i.test(w)), true);
  check("warns that no default revenue center is set", fn.warnings.some((w) => /default revenue center/i.test(w)), true);

  /* ------------------------------------------------------------- event */
  const ev = await calculateEventPricing(1);
  check("event charges equal sum of its functions", ev.totals.charges, 160);
  check("event balance due", ev.balanceDue, 160);
  check("event has two functions", ev.functions.length, 2);

  /* --------------------------------------------- per-item rate policy ---- */
  check("null policy defaults to gratuity + tax", resolvePolicy(null), { serviceCharge: true, salesTax: true });
  check("'None' attracts nothing", resolvePolicy("None"), { serviceCharge: false, salesTax: false });
  check("'Sales Tax Only'", resolvePolicy("Sales Tax Only"), { serviceCharge: false, salesTax: true });
  check("'Gratuity Only'", resolvePolicy("Gratuity Only"), { serviceCharge: true, salesTax: false });
  check("policy match is case-insensitive", resolvePolicy("  sales tax only "), { serviceCharge: false, salesTax: true });

  /* ------------------------------- with rates actually configured ------- */
  // The property has TWO rival gratuities in service_fees (22% and 20%), and
  // names the one that actually applies in applied_rates. This is the exact
  // configuration that made the first version of this engine charge 42%.
  await db.insert(serviceFeesTable).values([
    { name: "Gratuity 22%", ratePercent: "22.0000", isTaxable: false },
    { name: "Gratuity 20%", ratePercent: "20.0000", isTaxable: false },
  ]);
  await db.insert(appliedRatesTable).values([
    { name: "Standard Service Charge", rate: "0.2200", isActive: true },
  ]);
  await db
    .update(revenueCentersTable)
    .set({ isDefault: true, salesTaxRate: "8.0000", occupancyTaxRate: "0.0000" })
    .where(eq(revenueCentersTable.name, "Food"));

  const fn2 = await calculateFunctionPricing(1);
  check("charges unchanged by rate config", fn2.totals.charges, 160);
  check("ONE 22% charge applies, not the sum of both (42%)", feeTotal(fn2.totals), 35.2);
  check("sales tax is 8% of 160", fn2.totals.salesTax, 12.8);
  check("grand total = 160 + 35.20 + 12.80", fn2.totals.total, 208);
  check("item lands in the default revenue center", fn2.byRevenueCenter[0]?.revenueCenterName, "Food");
  check("no rate warnings once configured", fn2.warnings.length, 0);

  /* --------------------------- ambiguity must never become an overcharge - */
  await db.delete(appliedRatesTable).where(eq(appliedRatesTable.name, "Standard Service Charge"));
  const fnAmbig = await calculateFunctionPricing(1);
  check("two rival gratuities => charge none, never 42%", feeTotal(fnAmbig.totals), 0);
  check("and say so in a warning", fnAmbig.warnings.some((w) => /more than one gratuity/i.test(w)), true);

  /* ------------------------------- a single fee is unambiguous, so charge - */
  await db.delete(serviceFeesTable).where(eq(serviceFeesTable.name, "Gratuity 20%"));
  const fnSingle = await calculateFunctionPricing(1);
  check("single fee falls back correctly: 22% of 160", feeTotal(fnSingle.totals), 35.2);

  /* -------------------------------------- units: percent vs fraction ----- */
  // service_fees.rate_percent is a PERCENT (22.0000); applied_rates.rate is a
  // FRACTION (0.2200). Both must yield the same money.
  await db.insert(appliedRatesTable).values([{ name: "Standard Service Charge", rate: "0.2200", isActive: true }]);
  const fnFraction = await calculateFunctionPricing(1);
  check("fraction and percent sources agree", feeTotal(fnFraction.totals), feeTotal(fnSingle.totals));

  /* ----------------------------------- taxable fees widen the tax base --- */
  await db.delete(appliedRatesTable).where(eq(appliedRatesTable.name, "Standard Service Charge"));
  await db.update(serviceFeesTable).set({ isTaxable: true });
  const fn3 = await calculateFunctionPricing(1);
  check("taxable gratuity widens the tax base", fn3.totals.salesTax, 15.62);
  await db.update(serviceFeesTable).set({ isTaxable: false });

  /* ------------------------- per-item exemptions actually take effect ---- */
  const selected = eq(serviceItemsTable.selected, true);

  await db.update(serviceItemsTable).set({ appliedRates: "None" }).where(selected);
  const fnNone = await calculateFunctionPricing(1);
  check("'None' item still contributes charges", fnNone.totals.charges, 160);
  check("'None' item attracts no gratuity", feeTotal(fnNone.totals), 0);
  check("'None' item attracts no tax", fnNone.totals.salesTax, 0);

  await db.update(serviceItemsTable).set({ appliedRates: "Sales Tax Only" }).where(selected);
  const fnTaxOnly = await calculateFunctionPricing(1);
  check("'Sales Tax Only' pays tax", fnTaxOnly.totals.salesTax, 12.8);
  check("'Sales Tax Only' pays no gratuity", feeTotal(fnTaxOnly.totals), 0);

  await db.update(serviceItemsTable).set({ appliedRates: "Gratuity Only" }).where(selected);
  const fnGratOnly = await calculateFunctionPricing(1);
  check("'Gratuity Only' pays gratuity", feeTotal(fnGratOnly.totals), 35.2);
  check("'Gratuity Only' pays no tax", fnGratOnly.totals.salesTax, 0);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
