import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, depositsScheduledTable, adjustmentsTable, additionalFeesTable, revenueCentersTable, serviceFeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// POST /payments
router.post("/payments", async (req, res) => {
  try {
    const { relatedType, relatedId, date, paymentAmount, allocatedAmount, paymentMethod, paymentType, description, salesperson, fromGateway, posted, isEventPayment } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        relatedType,
        relatedId: parseInt(relatedId),
        date: date ?? today,
        paymentAmount: paymentAmount?.toString(),
        allocatedAmount: (allocatedAmount ?? paymentAmount)?.toString(),
        paymentMethod,
        paymentType,
        description,
        salesperson,
        fromGateway: fromGateway ?? false,
        posted: posted ?? false,
        isEventPayment: isEventPayment ?? false,
      })
      .returning();
    res.status(201).json(payment);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /payments/:id
router.delete("/payments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /deposits
router.post("/deposits", async (req, res) => {
  try {
    const { relatedType, relatedId, date, amount, description, salesperson, hasTask } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const [deposit] = await db
      .insert(depositsScheduledTable)
      .values({
        relatedType,
        relatedId: parseInt(relatedId),
        date: date ?? today,
        amount: amount?.toString(),
        description,
        salesperson,
        hasTask: hasTask ?? false,
      })
      .returning();
    res.status(201).json(deposit);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /adjustments
router.post("/adjustments", async (req, res) => {
  try {
    const { functionId, date, amount, revenueCenterId, appliedRates, description, salesperson } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const [adj] = await db
      .insert(adjustmentsTable)
      .values({
        functionId: parseInt(functionId),
        date: date ?? today,
        amount: amount?.toString(),
        revenueCenterId: revenueCenterId ? parseInt(revenueCenterId) : null,
        appliedRates,
        description,
        salesperson,
      })
      .returning();

    const rc = revenueCenterId
      ? await db.query.revenueCentersTable.findFirst({ where: eq(revenueCentersTable.id, revenueCenterId) })
      : null;
    res.status(201).json({ ...adj, revenueCenterName: rc?.name ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /adjustments/:id
router.delete("/adjustments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(adjustmentsTable).where(eq(adjustmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
