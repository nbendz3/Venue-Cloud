import { Router } from "express";
import { db } from "@workspace/db";
import {
  eventsTable,
  revenueCentersTable,
  serviceFeesTable,
  paymentsTable,
  depositsScheduledTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { calculateEventPricing } from "../services/pricing.js";

const router = Router();

// GET /events/:id/financials
//
// All money on this response comes from the shared pricing engine so that the
// figures here are identical to the function financials page and the BEO.
router.get("/:id/financials", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }

    const pricing = await calculateEventPricing(eventId);

    const functionRows = pricing.functions.map((fp) => ({
      functionId: fp.functionId,
      functionType: fp.functionType,
      functionDate: fp.functionDate,
      charges: fp.totals.charges,
      adjustedCharges: fp.totals.adjustedCharges,
      salesTax: fp.totals.salesTax,
      occupancyTax: fp.totals.occupancyTax,
      serviceCharge: fp.totals.serviceCharge,
      gratuity: fp.totals.gratuity,
      total: fp.totals.total,
      cost: fp.totals.cost,
      margin: fp.totals.margin,
      marginPercent: fp.totals.marginPercent,
    }));

    const revenueCenterBreakdown = pricing.byRevenueCenter.map((rc) => ({
      revenueCenter: rc.revenueCenterName,
      revenueCenterId: rc.revenueCenterId,
      charges: rc.charges,
      adjustedCharges: rc.adjustedCharges,
      salesTax: rc.salesTax,
      occupancyTax: rc.occupancyTax,
      serviceCharge: rc.serviceCharge,
      gratuity: rc.gratuity,
      total: rc.total,
      cost: rc.cost,
      margin: rc.margin,
      marginPercent: rc.marginPercent,
    }));

    const [revCenters, serviceFeesList, payments, deposits] = await Promise.all([
      db.select().from(revenueCentersTable),
      db.select().from(serviceFeesTable),
      db.select().from(paymentsTable).where(eq(paymentsTable.relatedId, eventId)),
      db
        .select()
        .from(depositsScheduledTable)
        .where(and(eq(depositsScheduledTable.relatedType, "Event"), eq(depositsScheduledTable.relatedId, eventId))),
    ]);

    const eventPayments = payments.filter((p) => (p.relatedType ?? "").toLowerCase() === "event");

    res.json({
      eventId,
      eventName: event.eventName,
      functions: functionRows,
      totals: pricing.totals,
      revenueCenterBreakdown,
      paymentsReceived: pricing.paymentsReceived,
      balanceDue: pricing.balanceDue,
      payments: eventPayments,
      depositsScheduled: deposits,
      taxRates: revCenters,
      serviceFees: serviceFeesList,
      // Surfaced in the UI so unconfigured rates are visible rather than
      // silently producing $0 tax on a client-facing document.
      warnings: pricing.warnings,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
