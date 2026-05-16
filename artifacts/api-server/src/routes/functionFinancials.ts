import { Router } from "express";
import { db } from "@workspace/db";
import {
  functionsTable,
  functionMenusTable,
  serviceTypesTable,
  serviceItemsTable,
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

// GET /functions/:id/financials
router.get("/:id/financials", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const fn = await db.query.functionsTable.findFirst({ where: eq(functionsTable.id, functionId) });
    if (!fn) return res.status(404).json({ error: "Function not found" });

    const revCenters = await db.select().from(revenueCentersTable);
    const serviceFeesList = await db.select().from(serviceFeesTable);
    const gratuityRate = parseFloat(serviceFeesList.find(f => f.name.includes("22%"))?.ratePercent ?? "0.22");

    // Build revenue breakdown per revenue center
    const menus = await db
      .select()
      .from(functionMenusTable)
      .where(eq(functionMenusTable.functionId, functionId));

    const chargesByRC: Record<string, { charges: number; cost: number; rcId?: number }> = {};

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
          if (!chargesByRC[rcName]) chargesByRC[rcName] = { charges: 0, cost: 0, rcId: item.revenueCenterId ?? undefined };
          chargesByRC[rcName].charges += parseFloat(item.itemTotal ?? "0") || 0;
          const qty = parseFloat(item.quantity ?? "1") || 1;
          chargesByRC[rcName].cost += (parseFloat(item.cost ?? "0") || 0) * qty;
        }
      }
    }

    // Adjustments
    const adjs = await db
      .select({
        id: adjustmentsTable.id,
        functionId: adjustmentsTable.functionId,
        date: adjustmentsTable.date,
        amount: adjustmentsTable.amount,
        revenueCenterId: adjustmentsTable.revenueCenterId,
        appliedRates: adjustmentsTable.appliedRates,
        description: adjustmentsTable.description,
        salesperson: adjustmentsTable.salesperson,
        revenueCenterName: revenueCentersTable.name,
      })
      .from(adjustmentsTable)
      .leftJoin(revenueCentersTable, eq(adjustmentsTable.revenueCenterId, revenueCentersTable.id))
      .where(eq(adjustmentsTable.functionId, functionId));

    const additionalFees = await db
      .select({
        id: additionalFeesTable.id,
        functionId: additionalFeesTable.functionId,
        date: additionalFeesTable.date,
        amount: additionalFeesTable.amount,
        serviceFeeId: additionalFeesTable.serviceFeeId,
        description: additionalFeesTable.description,
        revenueCenterId: additionalFeesTable.revenueCenterId,
        salesperson: additionalFeesTable.salesperson,
        serviceFeeName: serviceFeesTable.name,
        revenueCenterName: revenueCentersTable.name,
      })
      .from(additionalFeesTable)
      .leftJoin(serviceFeesTable, eq(additionalFeesTable.serviceFeeId, serviceFeesTable.id))
      .leftJoin(revenueCentersTable, eq(additionalFeesTable.revenueCenterId, revenueCentersTable.id))
      .where(eq(additionalFeesTable.functionId, functionId));

    const totalAdjustments = adjs.reduce((sum, a) => sum + (parseFloat(a.amount ?? "0") || 0), 0);
    const numRCs = Math.max(Object.keys(chargesByRC).length, 1);

    // Build per-RC breakdown
    const revenueBreakdown = Object.entries(chargesByRC).map(([rcName, { charges, cost, rcId }]) => {
      const rc = revCenters.find(r => r.name === rcName);
      const salesTaxRate = (parseFloat(rc?.salesTaxRate ?? "0") || 0) / 100;
      const occupancyTaxRate = (parseFloat(rc?.occupancyTaxRate ?? "0") || 0) / 100;
      const rcAdj = totalAdjustments / numRCs;
      const adjustedCharges = Math.max(0, charges - rcAdj);
      const salesTax = adjustedCharges * salesTaxRate;
      const occupancyTax = adjustedCharges * occupancyTaxRate;
      const gratuity = adjustedCharges * gratuityRate;
      const total = adjustedCharges + salesTax + occupancyTax + gratuity;
      const margin = adjustedCharges - cost;
      const marginPercent = adjustedCharges > 0 ? (margin / adjustedCharges) * 100 : 0;
      return {
        revenueCenterName: rcName,
        charges: Math.round(charges * 100) / 100,
        adjustments: Math.round(rcAdj * 100) / 100,
        adjustedCharges: Math.round(adjustedCharges * 100) / 100,
        salesTax: Math.round(salesTax * 100) / 100,
        occupancyTax: Math.round(occupancyTax * 100) / 100,
        gratuity: Math.round(gratuity * 100) / 100,
        total: Math.round(total * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    const totals = revenueBreakdown.reduce(
      (acc, r) => ({
        charges: acc.charges + r.charges,
        adjustedCharges: acc.adjustedCharges + r.adjustedCharges,
        salesTax: acc.salesTax + r.salesTax,
        occupancyTax: acc.occupancyTax + r.occupancyTax,
        gratuity: acc.gratuity + r.gratuity,
        total: acc.total + r.total,
        cost: acc.cost + r.cost,
        margin: acc.margin + r.margin,
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
      .where(and(eq(paymentsTable.relatedType, "Function"), eq(paymentsTable.relatedId, functionId)));
    const paymentsReceived = payments.reduce((sum, p) => sum + (parseFloat(p.paymentAmount ?? "0") || 0), 0);
    const balanceDue = totals.total - paymentsReceived;

    const deposits = await db
      .select()
      .from(depositsScheduledTable)
      .where(and(eq(depositsScheduledTable.relatedType, "Function"), eq(depositsScheduledTable.relatedId, functionId)));

    const lifecycle = await db
      .select()
      .from(functionLifecycleHistoryTable)
      .where(eq(functionLifecycleHistoryTable.functionId, functionId));

    res.json({
      functionId,
      functionType: fn.functionType ?? "Function",
      functionDate: fn.functionDate,
      revenueBreakdown,
      totals: Object.fromEntries(
        Object.entries(totals).map(([k, v]) => [k, Math.round((v as number) * 100) / 100])
      ),
      paymentsReceived: Math.round(paymentsReceived * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100,
      payments,
      adjustments: adjs,
      additionalFees,
      depositsScheduled: deposits,
      lifecycleHistory: lifecycle,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /functions/:id/post — lock financial figures
router.post("/:id/post", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const today = new Date().toISOString().slice(0, 10);

    // Get current financial snapshot
    const fn = await db.query.functionsTable.findFirst({ where: eq(functionsTable.id, functionId) });
    if (!fn) return res.status(404).json({ error: "Function not found" });

    const [snapshot] = await db
      .insert(functionLifecycleHistoryTable)
      .values({
        functionId,
        eventStatus: "Event Order",
        date: today,
        salesperson: "System",
        forecastedCharges: "0",
        charges: "0",
        adjustedCharges: "0",
        cost: "0",
        margin: "0",
        marginPercent: "0",
      })
      .returning();

    res.json(snapshot);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
