import { Router } from "express";
import { db } from "@workspace/db";
import {
  functionsTable,
  revenueCentersTable,
  serviceFeesTable,
  paymentsTable,
  adjustmentsTable,
  additionalFeesTable,
  depositsScheduledTable,
  functionLifecycleHistoryTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { calculateFunctionPricing } from "../services/pricing.js";

const router = Router();

// GET /functions/:id/financials
//
// Every figure comes from the shared pricing engine, so this page, the event
// financials page, the services builder and the BEO cannot disagree.
router.get("/:id/financials", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const fn = await db.query.functionsTable.findFirst({ where: eq(functionsTable.id, functionId) });
    if (!fn) return res.status(404).json({ error: "Function not found" });

    const pricing = await calculateFunctionPricing(functionId);

    const revenueBreakdown = pricing.byRevenueCenter.map((rc) => ({
      revenueCenterId: rc.revenueCenterId,
      revenueCenterName: rc.revenueCenterName,
      charges: rc.charges,
      adjustments: rc.adjustments,
      adjustedCharges: rc.adjustedCharges,
      serviceCharge: rc.serviceCharge,
      gratuity: rc.gratuity,
      salesTax: rc.salesTax,
      occupancyTax: rc.occupancyTax,
      total: rc.total,
      cost: rc.cost,
      margin: rc.margin,
      marginPercent: rc.marginPercent,
    }));

    const [adjs, additionalFees, payments, deposits, lifecycle] = await Promise.all([
      db
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
        .where(eq(adjustmentsTable.functionId, functionId)),
      db
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
        .where(eq(additionalFeesTable.functionId, functionId)),
      db
        .select()
        .from(paymentsTable)
        .where(and(eq(paymentsTable.relatedType, "Function"), eq(paymentsTable.relatedId, functionId))),
      db
        .select()
        .from(depositsScheduledTable)
        .where(
          and(eq(depositsScheduledTable.relatedType, "Function"), eq(depositsScheduledTable.relatedId, functionId))
        ),
      db
        .select()
        .from(functionLifecycleHistoryTable)
        .where(eq(functionLifecycleHistoryTable.functionId, functionId)),
    ]);

    const paymentsReceived =
      Math.round(payments.reduce((sum, p) => sum + (parseFloat(p.paymentAmount ?? "0") || 0), 0) * 100) / 100;

    res.json({
      functionId,
      functionType: fn.functionType ?? "Function",
      functionDate: fn.functionDate,
      revenueBreakdown,
      totals: pricing.totals,
      lines: pricing.lines,
      paymentsReceived,
      balanceDue: Math.round((pricing.totals.total - paymentsReceived) * 100) / 100,
      payments,
      adjustments: adjs,
      additionalFees,
      depositsScheduled: deposits,
      lifecycleHistory: lifecycle,
      warnings: pricing.warnings,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /functions/:id/post — lock financial figures
//
// Captures a real snapshot of the function's numbers at the moment of posting.
// This is what the Event Lifecycle "Financial Snapshot" column reads.
router.post("/:id/post", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const today = new Date().toISOString().slice(0, 10);

    const fn = await db.query.functionsTable.findFirst({ where: eq(functionsTable.id, functionId) });
    if (!fn) return res.status(404).json({ error: "Function not found" });

    const pricing = await calculateFunctionPricing(functionId);

    const [snapshot] = await db
      .insert(functionLifecycleHistoryTable)
      .values({
        functionId,
        eventStatus: "Event Order",
        date: today,
        salesperson: "System",
        forecastedCharges: String(pricing.totals.charges),
        charges: String(pricing.totals.charges),
        adjustedCharges: String(pricing.totals.adjustedCharges),
        cost: String(pricing.totals.cost),
        margin: String(pricing.totals.margin),
        marginPercent: String(pricing.totals.marginPercent),
      })
      .returning();

    res.json(snapshot);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
