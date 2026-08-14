/**
 * Central pricing engine.
 *
 * This is the ONLY place in the codebase where money is calculated. Every
 * surface — the services builder, function financials, event financials, the
 * printed BEO, and reports — must read its numbers from here.
 *
 * Design rules:
 *
 *  1. Rates are configuration, never constants. Sales tax and occupancy tax
 *     come from `revenue_centers`; service charges and gratuity come from
 *     `service_fees`. If a rate is not configured the result is zero and a
 *     warning is emitted. We never silently substitute an invented default —
 *     a wrong number on a signed BEO is worse than a visibly missing one.
 *
 *  2. Only SELECTED line items with a positive quantity are billable.
 *     Attaching a menu template makes items *available*; checking them makes
 *     them *ordered*.
 *
 *  3. Rounding happens once, at the revenue-center subtotal, never per line.
 */

import { db } from "@workspace/db";
import {
  functionsTable,
  functionMenusTable,
  serviceTypesTable,
  serviceItemsTable,
  revenueCentersTable,
  serviceFeesTable,
  adjustmentsTable,
  additionalFeesTable,
  paymentsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PricedLine {
  serviceItemId: number;
  serviceTypeId: number;
  functionMenuId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  /** Hours multiplier applied when the item is charged hourly; 1 otherwise. */
  hours: number;
  lineTotal: number;
  unitCost: number;
  lineCost: number;
  revenueCenterId: number | null;
  revenueCenterName: string;
  /** Internal items appear on the BEO for staff but are never charged. */
  isInternal: boolean;
}

export interface RevenueCenterTotals {
  revenueCenterId: number | null;
  revenueCenterName: string;
  charges: number;
  adjustments: number;
  adjustedCharges: number;
  serviceCharge: number;
  gratuity: number;
  salesTax: number;
  occupancyTax: number;
  total: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export interface PricingTotals {
  charges: number;
  adjustments: number;
  adjustedCharges: number;
  serviceCharge: number;
  gratuity: number;
  salesTax: number;
  occupancyTax: number;
  additionalFees: number;
  total: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export interface FunctionPricing {
  functionId: number;
  lines: PricedLine[];
  /** Keyed by function_menu id. */
  menuTotals: Record<number, { charges: number; cost: number; selectedCount: number; itemCount: number }>;
  /** Keyed by service_type id. */
  serviceTypeTotals: Record<number, { charges: number; cost: number; selectedCount: number; itemCount: number }>;
  byRevenueCenter: RevenueCenterTotals[];
  totals: PricingTotals;
  /** Rate configuration problems the UI should surface to the user. */
  warnings: string[];
}

export interface EventPricing {
  eventId: number;
  functions: (FunctionPricing & { functionType: string | null; functionDate: string | null })[];
  byRevenueCenter: RevenueCenterTotals[];
  totals: PricingTotals;
  paymentsReceived: number;
  balanceDue: number;
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Pure helpers — exported so they can be unit tested without a database.      */
/* -------------------------------------------------------------------------- */

export function toNum(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

export function round2(n: number): number {
  // Nudge away from binary representation error before rounding so that
  // values like 1.005 round the way an accountant expects.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** A line is billable only when it has been explicitly selected. */
export function isBillable(item: {
  selected?: boolean | null;
  quantity?: string | number | null;
  markItemInternal?: boolean | null;
}): boolean {
  if (item.selected !== true) return false;
  if (item.markItemInternal === true) return false;
  return toNum(item.quantity, 0) > 0;
}

/** quantity x unit price, x hours when the item is charged hourly. */
export function computeLineTotal(item: {
  quantity?: string | number | null;
  aLaCartePrice?: string | number | null;
  addOnPrice?: string | number | null;
  chargeHourly?: boolean | null;
  numHours?: string | number | null;
  overtimeHours?: string | number | null;
  overtimeHoursPrice?: string | number | null;
}): number {
  const qty = toNum(item.quantity, 0);
  const unit = toNum(item.aLaCartePrice, 0) + toNum(item.addOnPrice, 0);
  const hours = item.chargeHourly === true ? toNum(item.numHours, 0) : 1;
  const base = qty * unit * hours;
  const overtime = toNum(item.overtimeHours, 0) * toNum(item.overtimeHoursPrice, 0);
  return base + overtime;
}

export function computeLineCost(item: {
  quantity?: string | number | null;
  cost?: string | number | null;
  chargeHourly?: boolean | null;
  numHours?: string | number | null;
}): number {
  const qty = toNum(item.quantity, 0);
  const hours = item.chargeHourly === true ? toNum(item.numHours, 0) : 1;
  return qty * toNum(item.cost, 0) * hours;
}

function emptyTotals(): PricingTotals {
  return {
    charges: 0,
    adjustments: 0,
    adjustedCharges: 0,
    serviceCharge: 0,
    gratuity: 0,
    salesTax: 0,
    occupancyTax: 0,
    additionalFees: 0,
    total: 0,
    cost: 0,
    margin: 0,
    marginPercent: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Rate configuration                                                         */
/* -------------------------------------------------------------------------- */

interface RateConfig {
  revenueCentersById: Map<number, typeof revenueCentersTable.$inferSelect>;
  defaultRevenueCenter: typeof revenueCentersTable.$inferSelect | null;
  serviceFees: (typeof serviceFeesTable.$inferSelect)[];
  warnings: string[];
}

/**
 * A service fee named like a gratuity is reported in the `gratuity` bucket so
 * the UI can show it on its own line; everything else rolls into
 * `serviceCharge`. Both are computed identically — this is presentation only.
 */
function isGratuityFee(fee: { name: string }): boolean {
  return /gratuit|tip/i.test(fee.name);
}

export async function loadRateConfig(): Promise<RateConfig> {
  const [revCenters, serviceFees] = await Promise.all([
    db.select().from(revenueCentersTable),
    db.select().from(serviceFeesTable),
  ]);

  const warnings: string[] = [];
  const revenueCentersById = new Map<number, typeof revenueCentersTable.$inferSelect>();
  for (const rc of revCenters) revenueCentersById.set(rc.id, rc);

  const defaultRevenueCenter = revCenters.find((rc) => rc.isDefault === true) ?? null;
  if (!defaultRevenueCenter) {
    warnings.push(
      "No default revenue center is set. Items without a revenue center are excluded from tax. Set one in Settings > Revenue Centers."
    );
  }

  if (serviceFees.length === 0) {
    warnings.push(
      "No service fees are configured, so service charge and gratuity are $0. Add them in Settings > Financial."
    );
  }

  const untaxed = revCenters.filter(
    (rc) => rc.isActive !== false && toNum(rc.salesTaxRate, 0) === 0 && toNum(rc.occupancyTaxRate, 0) === 0
  );
  if (untaxed.length === revCenters.length && revCenters.length > 0) {
    warnings.push(
      "No tax rates are configured on any revenue center, so all tax is $0. Set them in Settings > Tax Rates."
    );
  }

  return { revenueCentersById, defaultRevenueCenter, serviceFees, warnings };
}

/* -------------------------------------------------------------------------- */
/* Revenue-center rollup                                                      */
/* -------------------------------------------------------------------------- */

interface Bucket {
  revenueCenterId: number | null;
  revenueCenterName: string;
  charges: number;
  cost: number;
}

/**
 * Applies service fees and taxes to a set of per-revenue-center charge buckets.
 *
 * Order of operations:
 *   adjusted   = charges - adjustments (pro-rated across centers by charge share)
 *   fees       = adjusted x each configured service fee rate
 *   taxable    = adjusted + (fees flagged taxable)
 *   sales tax  = taxable x that center's sales tax rate
 *   occ tax    = taxable x that center's occupancy tax rate
 */
function applyRates(
  buckets: Bucket[],
  totalAdjustments: number,
  config: RateConfig
): { rows: RevenueCenterTotals[]; totals: PricingTotals } {
  const grossCharges = buckets.reduce((s, b) => s + b.charges, 0);

  const rows: RevenueCenterTotals[] = buckets.map((bucket) => {
    // Pro-rate adjustments by share of charges rather than splitting evenly
    // across centers — an even split moves money between revenue centers.
    const share = grossCharges > 0 ? bucket.charges / grossCharges : 0;
    const adjustments = totalAdjustments * share;
    const adjustedCharges = Math.max(0, bucket.charges - adjustments);

    const rc = bucket.revenueCenterId != null ? config.revenueCentersById.get(bucket.revenueCenterId) : undefined;
    const salesTaxRate = toNum(rc?.salesTaxRate, 0) / 100;
    const occupancyTaxRate = toNum(rc?.occupancyTaxRate, 0) / 100;

    let serviceCharge = 0;
    let gratuity = 0;
    let taxableFees = 0;

    for (const fee of config.serviceFees) {
      const amount = adjustedCharges * (toNum(fee.ratePercent, 0) / 100);
      if (amount === 0) continue;
      if (isGratuityFee(fee)) gratuity += amount;
      else serviceCharge += amount;
      if (fee.isTaxable === true) taxableFees += amount;
    }

    const taxableBase = adjustedCharges + taxableFees;
    const salesTax = taxableBase * salesTaxRate;
    const occupancyTax = taxableBase * occupancyTaxRate;

    const total = adjustedCharges + serviceCharge + gratuity + salesTax + occupancyTax;
    const margin = adjustedCharges - bucket.cost;

    return {
      revenueCenterId: bucket.revenueCenterId,
      revenueCenterName: bucket.revenueCenterName,
      charges: round2(bucket.charges),
      adjustments: round2(adjustments),
      adjustedCharges: round2(adjustedCharges),
      serviceCharge: round2(serviceCharge),
      gratuity: round2(gratuity),
      salesTax: round2(salesTax),
      occupancyTax: round2(occupancyTax),
      total: round2(total),
      cost: round2(bucket.cost),
      margin: round2(margin),
      marginPercent: adjustedCharges > 0 ? round2((margin / adjustedCharges) * 100) : 0,
    };
  });

  rows.sort((a, b) => b.charges - a.charges);

  const totals = rows.reduce<PricingTotals>((acc, r) => {
    acc.charges += r.charges;
    acc.adjustments += r.adjustments;
    acc.adjustedCharges += r.adjustedCharges;
    acc.serviceCharge += r.serviceCharge;
    acc.gratuity += r.gratuity;
    acc.salesTax += r.salesTax;
    acc.occupancyTax += r.occupancyTax;
    acc.total += r.total;
    acc.cost += r.cost;
    return acc;
  }, emptyTotals());

  totals.margin = round2(totals.adjustedCharges - totals.cost);
  totals.marginPercent = totals.adjustedCharges > 0 ? round2((totals.margin / totals.adjustedCharges) * 100) : 0;

  for (const k of Object.keys(totals) as (keyof PricingTotals)[]) totals[k] = round2(totals[k]);

  return { rows, totals };
}

/* -------------------------------------------------------------------------- */
/* Function pricing                                                           */
/* -------------------------------------------------------------------------- */

export async function calculateFunctionPricing(
  functionId: number,
  preloadedConfig?: RateConfig
): Promise<FunctionPricing> {
  const config = preloadedConfig ?? (await loadRateConfig());

  const menus = await db
    .select()
    .from(functionMenusTable)
    .where(eq(functionMenusTable.functionId, functionId));

  const menuIds = menus.map((m) => m.id);

  const serviceTypes = menuIds.length
    ? await db.select().from(serviceTypesTable).where(inArray(serviceTypesTable.functionMenuId, menuIds))
    : [];

  const serviceTypeIds = serviceTypes.map((st) => st.id);

  const items = serviceTypeIds.length
    ? await db.select().from(serviceItemsTable).where(inArray(serviceItemsTable.serviceTypeId, serviceTypeIds))
    : [];

  const menuIdByServiceType = new Map<number, number>();
  for (const st of serviceTypes) menuIdByServiceType.set(st.id, st.functionMenuId);

  const lines: PricedLine[] = [];
  const menuTotals: FunctionPricing["menuTotals"] = {};
  const serviceTypeTotals: FunctionPricing["serviceTypeTotals"] = {};
  const bucketsByRc = new Map<string, Bucket>();

  for (const m of menus) {
    menuTotals[m.id] = { charges: 0, cost: 0, selectedCount: 0, itemCount: 0 };
  }
  for (const st of serviceTypes) {
    serviceTypeTotals[st.id] = { charges: 0, cost: 0, selectedCount: 0, itemCount: 0 };
  }

  for (const item of items) {
    const menuId = menuIdByServiceType.get(item.serviceTypeId);
    if (menuId === undefined) continue;

    if (menuTotals[menuId]) menuTotals[menuId].itemCount += 1;
    if (serviceTypeTotals[item.serviceTypeId]) serviceTypeTotals[item.serviceTypeId].itemCount += 1;

    if (!isBillable(item)) continue;

    const lineTotal = computeLineTotal(item);
    const lineCost = computeLineCost(item);

    // Fall back to the configured default revenue center so that items without
    // an explicit assignment are still taxed rather than silently landing in a
    // zero-rate "Other" bucket.
    const rcId = item.revenueCenterId ?? config.defaultRevenueCenter?.id ?? null;
    const rcName =
      (rcId != null ? config.revenueCentersById.get(rcId)?.name : undefined) ?? "Unassigned";

    lines.push({
      serviceItemId: item.id,
      serviceTypeId: item.serviceTypeId,
      functionMenuId: menuId,
      itemName: item.itemName,
      quantity: toNum(item.quantity, 0),
      unitPrice: toNum(item.aLaCartePrice, 0) + toNum(item.addOnPrice, 0),
      hours: item.chargeHourly === true ? toNum(item.numHours, 0) : 1,
      lineTotal: round2(lineTotal),
      unitCost: toNum(item.cost, 0),
      lineCost: round2(lineCost),
      revenueCenterId: rcId,
      revenueCenterName: rcName,
      isInternal: item.markItemInternal === true,
    });

    menuTotals[menuId].charges += lineTotal;
    menuTotals[menuId].cost += lineCost;
    menuTotals[menuId].selectedCount += 1;

    serviceTypeTotals[item.serviceTypeId].charges += lineTotal;
    serviceTypeTotals[item.serviceTypeId].cost += lineCost;
    serviceTypeTotals[item.serviceTypeId].selectedCount += 1;

    const key = String(rcId ?? "none");
    const bucket = bucketsByRc.get(key) ?? {
      revenueCenterId: rcId,
      revenueCenterName: rcName,
      charges: 0,
      cost: 0,
    };
    bucket.charges += lineTotal;
    bucket.cost += lineCost;
    bucketsByRc.set(key, bucket);
  }

  for (const id of Object.keys(menuTotals)) {
    const t = menuTotals[Number(id)];
    t.charges = round2(t.charges);
    t.cost = round2(t.cost);
  }
  for (const id of Object.keys(serviceTypeTotals)) {
    const t = serviceTypeTotals[Number(id)];
    t.charges = round2(t.charges);
    t.cost = round2(t.cost);
  }

  const [adjustments, extraFees] = await Promise.all([
    db.select().from(adjustmentsTable).where(eq(adjustmentsTable.functionId, functionId)),
    db.select().from(additionalFeesTable).where(eq(additionalFeesTable.functionId, functionId)),
  ]);

  const totalAdjustments = adjustments.reduce((s, a) => s + toNum(a.amount, 0), 0);
  const totalAdditionalFees = extraFees.reduce((s, f) => s + toNum(f.amount, 0), 0);

  const { rows, totals } = applyRates([...bucketsByRc.values()], totalAdjustments, config);

  totals.additionalFees = round2(totalAdditionalFees);
  totals.total = round2(totals.total + totalAdditionalFees);

  return {
    functionId,
    lines,
    menuTotals,
    serviceTypeTotals,
    byRevenueCenter: rows,
    totals,
    warnings: config.warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Event pricing                                                              */
/* -------------------------------------------------------------------------- */

export async function calculateEventPricing(eventId: number): Promise<EventPricing> {
  const config = await loadRateConfig();

  const fns = await db.select().from(functionsTable).where(eq(functionsTable.eventId, eventId));

  const functionPricings = await Promise.all(
    fns.map(async (fn) => ({
      ...(await calculateFunctionPricing(fn.id, config)),
      functionType: fn.functionType,
      functionDate: fn.functionDate,
    }))
  );

  // Re-aggregate from the raw per-center rows so event totals are the sum of
  // the same numbers the function pages display.
  const merged = new Map<string, RevenueCenterTotals>();
  for (const fp of functionPricings) {
    for (const row of fp.byRevenueCenter) {
      const key = String(row.revenueCenterId ?? "none");
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...row });
        continue;
      }
      existing.charges = round2(existing.charges + row.charges);
      existing.adjustments = round2(existing.adjustments + row.adjustments);
      existing.adjustedCharges = round2(existing.adjustedCharges + row.adjustedCharges);
      existing.serviceCharge = round2(existing.serviceCharge + row.serviceCharge);
      existing.gratuity = round2(existing.gratuity + row.gratuity);
      existing.salesTax = round2(existing.salesTax + row.salesTax);
      existing.occupancyTax = round2(existing.occupancyTax + row.occupancyTax);
      existing.total = round2(existing.total + row.total);
      existing.cost = round2(existing.cost + row.cost);
      existing.margin = round2(existing.margin + row.margin);
      existing.marginPercent =
        existing.adjustedCharges > 0 ? round2((existing.margin / existing.adjustedCharges) * 100) : 0;
    }
  }

  const byRevenueCenter = [...merged.values()].sort((a, b) => b.charges - a.charges);

  const totals = functionPricings.reduce<PricingTotals>((acc, fp) => {
    acc.charges = round2(acc.charges + fp.totals.charges);
    acc.adjustments = round2(acc.adjustments + fp.totals.adjustments);
    acc.adjustedCharges = round2(acc.adjustedCharges + fp.totals.adjustedCharges);
    acc.serviceCharge = round2(acc.serviceCharge + fp.totals.serviceCharge);
    acc.gratuity = round2(acc.gratuity + fp.totals.gratuity);
    acc.salesTax = round2(acc.salesTax + fp.totals.salesTax);
    acc.occupancyTax = round2(acc.occupancyTax + fp.totals.occupancyTax);
    acc.additionalFees = round2(acc.additionalFees + fp.totals.additionalFees);
    acc.total = round2(acc.total + fp.totals.total);
    acc.cost = round2(acc.cost + fp.totals.cost);
    return acc;
  }, emptyTotals());

  totals.margin = round2(totals.adjustedCharges - totals.cost);
  totals.marginPercent = totals.adjustedCharges > 0 ? round2((totals.margin / totals.adjustedCharges) * 100) : 0;

  // Payments are polymorphic: relatedType/relatedId point at either the event
  // itself or one of its functions.
  const functionIds = new Set(fns.map((f) => f.id));
  const allPayments = await db.select().from(paymentsTable);
  const relType = (p: { relatedType: string | null }) => (p.relatedType ?? "").toLowerCase();
  const paymentsReceived = round2(
    allPayments
      .filter(
        (p) =>
          (relType(p) === "event" && p.relatedId === eventId) ||
          (relType(p) === "function" && p.relatedId != null && functionIds.has(p.relatedId))
      )
      .reduce((s, p) => s + toNum(p.paymentAmount, 0), 0)
  );

  return {
    eventId,
    functions: functionPricings,
    byRevenueCenter,
    totals,
    paymentsReceived,
    balanceDue: round2(totals.total - paymentsReceived),
    warnings: config.warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Persistence of cached rollups                                              */
/* -------------------------------------------------------------------------- */

/**
 * Writes the computed rollups back onto function_menus / service_types /
 * service_items so that consumers reading those columns directly (reports,
 * exports) see current values. Call after any mutation to a function's items.
 */
export async function persistFunctionRollups(functionId: number): Promise<FunctionPricing> {
  const pricing = await calculateFunctionPricing(functionId);

  const lineById = new Map(pricing.lines.map((l) => [l.serviceItemId, l]));

  const menuIds = await db
    .select({ id: functionMenusTable.id })
    .from(functionMenusTable)
    .where(eq(functionMenusTable.functionId, functionId));

  const stRows = menuIds.length
    ? await db
        .select({ id: serviceTypesTable.id })
        .from(serviceTypesTable)
        .where(inArray(serviceTypesTable.functionMenuId, menuIds.map((m) => m.id)))
    : [];

  const allItems = stRows.length
    ? await db
        .select({ id: serviceItemsTable.id })
        .from(serviceItemsTable)
        .where(inArray(serviceItemsTable.serviceTypeId, stRows.map((s) => s.id)))
    : [];

  await Promise.all([
    ...allItems.map((row) =>
      db
        .update(serviceItemsTable)
        .set({ itemTotal: String(lineById.get(row.id)?.lineTotal ?? 0), updatedAt: new Date() })
        .where(eq(serviceItemsTable.id, row.id))
    ),
    ...stRows.map((row) =>
      db
        .update(serviceTypesTable)
        .set({
          serviceTypeTotalCharges: String(pricing.serviceTypeTotals[row.id]?.charges ?? 0),
          serviceTypeTotalCost: String(pricing.serviceTypeTotals[row.id]?.cost ?? 0),
          updatedAt: new Date(),
        })
        .where(eq(serviceTypesTable.id, row.id))
    ),
    ...menuIds.map((row) =>
      db
        .update(functionMenusTable)
        .set({
          menuTotalCharges: String(pricing.menuTotals[row.id]?.charges ?? 0),
          menuTotalCost: String(pricing.menuTotals[row.id]?.cost ?? 0),
          updatedAt: new Date(),
        })
        .where(eq(functionMenusTable.id, row.id))
    ),
  ]);

  return pricing;
}

/** Resolves the function that owns a service type, for post-mutation rollups. */
export async function functionIdForServiceType(serviceTypeId: number): Promise<number | null> {
  const rows = await db
    .select({ functionId: functionMenusTable.functionId })
    .from(serviceTypesTable)
    .innerJoin(functionMenusTable, eq(serviceTypesTable.functionMenuId, functionMenusTable.id))
    .where(eq(serviceTypesTable.id, serviceTypeId))
    .limit(1);
  return rows[0]?.functionId ?? null;
}

/** Resolves the function that owns a service item, for post-mutation rollups. */
export async function functionIdForServiceItem(serviceItemId: number): Promise<number | null> {
  const rows = await db
    .select({ functionId: functionMenusTable.functionId })
    .from(serviceItemsTable)
    .innerJoin(serviceTypesTable, eq(serviceItemsTable.serviceTypeId, serviceTypesTable.id))
    .innerJoin(functionMenusTable, eq(serviceTypesTable.functionMenuId, functionMenusTable.id))
    .where(eq(serviceItemsTable.id, serviceItemId))
    .limit(1);
  return rows[0]?.functionId ?? null;
}
