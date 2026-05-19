import { Router } from "express";
import { db } from "@workspace/db";
import {
  eventsTable,
  functionsTable,
  serviceItemsTable,
  serviceTypesTable,
  functionMenusTable,
  revenueCentersTable,
  serviceFeesTable,
  paymentsTable,
  adjustmentsTable,
  additionalFeesTable,
  depositsScheduledTable,
  functionLifecycleHistoryTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// Helper: get all service items for a function with revenue center info
async function getFunctionCharges(functionId: number) {
  const menus = await db
    .select()
    .from(functionMenusTable)
    .where(eq(functionMenusTable.functionId, functionId));

  const charges: Record<string, { charges: number; cost: number }> = {};

  for (const menu of menus) {
    const serviceTypes = await db
      .select()
      .from(serviceTypesTable)
      .where(eq(serviceTypesTable.functionMenuId, menu.id));

    for (const st of serviceTypes) {
      const items = await db
        .select({
          itemTotal: serviceItemsTable.itemTotal,
          cost: serviceItemsTable.cost,
          quantity: serviceItemsTable.quantity,
          revenueCenterId: serviceItemsTable.revenueCenterId,
          revenueCenterName: revenueCentersTable.name,
        })
        .from(serviceItemsTable)
        .leftJoin(revenueCentersTable, eq(serviceItemsTable.revenueCenterId, revenueCentersTable.id))
        .where(eq(serviceItemsTable.serviceTypeId, st.id));

      for (const item of items) {
        const rcName = item.revenueCenterName ?? "Other";
        if (!charges[rcName]) charges[rcName] = { charges: 0, cost: 0 };
        charges[rcName].charges += parseFloat(item.itemTotal ?? "0") || 0;
        const qty = parseFloat(item.quantity ?? "1") || 1;
        charges[rcName].cost += (parseFloat(item.cost ?? "0") || 0) * qty;
      }
    }
  }

  return charges;
}

type RCBreakdown = { charges: number; adjustedCharges: number; salesTax: number; occupancyTax: number; gratuity: number; total: number; cost: number };

// GET /events/:id/financials
router.get("/:id/financials", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const fns = await db
      .select()
      .from(functionsTable)
      .where(eq(functionsTable.eventId, eventId));

    const serviceFeesList = await db.select().from(serviceFeesTable);
    const gratuityRate = parseFloat(serviceFeesList.find(f => f.name.includes("22%"))?.ratePercent ?? "0.22");

    const revCenters = await db.select().from(revenueCentersTable);
    const revCenterMap: Record<number, typeof revCenters[0]> = {};
    for (const rc of revCenters) revCenterMap[rc.id] = rc;

    // Event-level revenue center aggregation
    const eventRCBreakdown: Record<string, RCBreakdown> = {};

    const functionRows = await Promise.all(
      fns.map(async (fn) => {
        const chargesByRC = await getFunctionCharges(fn.id);

        // Adjustments reduce charges
        const adjs = await db
          .select()
          .from(adjustmentsTable)
          .where(eq(adjustmentsTable.functionId, fn.id));
        const totalAdj = adjs.reduce((sum, a) => sum + (parseFloat(a.amount ?? "0") || 0), 0);

        let totalCharges = 0;
        let totalCost = 0;
        let totalSalesTax = 0;
        let totalOccupancyTax = 0;

        const rcCount = Math.max(1, Object.keys(chargesByRC).length);
        for (const [rcName, { charges, cost }] of Object.entries(chargesByRC)) {
          const rc = revCenters.find(r => r.name === rcName);
          const salesTaxRate = parseFloat(rc?.salesTaxRate ?? "0") || 0;
          const occupancyTaxRate = parseFloat(rc?.occupancyTaxRate ?? "0") || 0;
          const adjShare = totalAdj / rcCount;
          const rcAdjCharges = Math.max(0, charges - adjShare);
          const rcGratuity = rcAdjCharges * gratuityRate;
          const rcSalesTax = rcAdjCharges * (salesTaxRate / 100);
          const rcOccTax = rcAdjCharges * (occupancyTaxRate / 100);
          const rcTotal = rcAdjCharges + rcSalesTax + rcOccTax + rcGratuity;

          totalCharges += charges;
          totalCost += cost;
          totalSalesTax += rcSalesTax;
          totalOccupancyTax += rcOccTax;

          if (!eventRCBreakdown[rcName]) {
            eventRCBreakdown[rcName] = { charges: 0, adjustedCharges: 0, salesTax: 0, occupancyTax: 0, gratuity: 0, total: 0, cost: 0 };
          }
          eventRCBreakdown[rcName].charges += charges;
          eventRCBreakdown[rcName].adjustedCharges += rcAdjCharges;
          eventRCBreakdown[rcName].salesTax += rcSalesTax;
          eventRCBreakdown[rcName].occupancyTax += rcOccTax;
          eventRCBreakdown[rcName].gratuity += rcGratuity;
          eventRCBreakdown[rcName].total += rcTotal;
          eventRCBreakdown[rcName].cost += cost;
        }

        const adjustedCharges = Math.max(0, totalCharges - totalAdj);
        const gratuity = adjustedCharges * gratuityRate;
        const total = adjustedCharges + totalSalesTax + totalOccupancyTax + gratuity;
        const margin = adjustedCharges - totalCost;
        const marginPercent = adjustedCharges > 0 ? (margin / adjustedCharges) * 100 : 0;

        return {
          functionId: fn.id,
          functionType: fn.functionType,
          functionDate: fn.functionDate,
          charges: Math.round(totalCharges * 100) / 100,
          adjustedCharges: Math.round(adjustedCharges * 100) / 100,
          salesTax: Math.round(totalSalesTax * 100) / 100,
          occupancyTax: Math.round(totalOccupancyTax * 100) / 100,
          gratuity: Math.round(gratuity * 100) / 100,
          total: Math.round(total * 100) / 100,
          cost: Math.round(totalCost * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          marginPercent: Math.round(marginPercent * 100) / 100,
        };
      })
    );

    const revenueCenterBreakdown = Object.entries(eventRCBreakdown)
      .sort((a, b) => b[1].charges - a[1].charges)
      .map(([name, data]) => ({
        revenueCenter: name,
        charges: Math.round(data.charges * 100) / 100,
        adjustedCharges: Math.round(data.adjustedCharges * 100) / 100,
        salesTax: Math.round(data.salesTax * 100) / 100,
        occupancyTax: Math.round(data.occupancyTax * 100) / 100,
        gratuity: Math.round(data.gratuity * 100) / 100,
        total: Math.round(data.total * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
      }));

    const totals = functionRows.reduce(
      (acc, fn) => ({
        charges: acc.charges + fn.charges,
        adjustedCharges: acc.adjustedCharges + fn.adjustedCharges,
        salesTax: acc.salesTax + fn.salesTax,
        occupancyTax: acc.occupancyTax + fn.occupancyTax,
        gratuity: acc.gratuity + fn.gratuity,
        total: acc.total + fn.total,
        cost: acc.cost + fn.cost,
        margin: acc.margin + fn.margin,
        marginPercent: 0,
      }),
      { charges: 0, adjustedCharges: 0, salesTax: 0, occupancyTax: 0, gratuity: 0, total: 0, cost: 0, margin: 0, marginPercent: 0 }
    );
    if (totals.adjustedCharges > 0) {
      totals.marginPercent = Math.round((totals.margin / totals.adjustedCharges) * 10000) / 100;
    }

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.relatedId, eventId));
    const eventPayments = payments.filter(p => p.relatedType === "Event");
    const paymentsReceived = eventPayments.reduce((sum, p) => sum + (parseFloat(p.paymentAmount ?? "0") || 0), 0);
    const balanceDue = totals.total - paymentsReceived;

    const deposits = await db
      .select()
      .from(depositsScheduledTable)
      .where(and(eq(depositsScheduledTable.relatedType, "Event"), eq(depositsScheduledTable.relatedId, eventId)));

    res.json({
      eventId,
      eventName: event.eventName,
      functions: functionRows,
      totals: Object.fromEntries(
        Object.entries(totals).map(([k, v]) => [k, Math.round((v as number) * 100) / 100])
      ),
      revenueCenterBreakdown,
      paymentsReceived: Math.round(paymentsReceived * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100,
      payments: eventPayments,
      depositsScheduled: deposits,
      taxRates: revCenters,
      serviceFees: serviceFeesList,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
