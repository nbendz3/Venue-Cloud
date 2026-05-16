import { Router } from "express";
import { db } from "@workspace/db";
import { serviceItemsTable, revenueCentersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// PUT /service-items/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = { ...req.body };

    // Recalculate total if pricing fields changed
    if (updates.aLaCartePrice !== undefined || updates.addOnPrice !== undefined || updates.quantity !== undefined) {
      const existing = await db.query.serviceItemsTable.findFirst({ where: eq(serviceItemsTable.id, id) });
      const qty = parseFloat(updates.quantity ?? existing?.quantity ?? "1") || 1;
      const price = parseFloat(updates.aLaCartePrice ?? existing?.aLaCartePrice ?? "0") || 0;
      const addOn = parseFloat(updates.addOnPrice ?? existing?.addOnPrice ?? "0") || 0;
      updates.itemTotal = ((price + addOn) * qty).toFixed(2);
    }

    // Normalize numeric fields to strings for numeric DB columns
    for (const key of ["aLaCartePrice", "addOnPrice", "cost", "quantity", "numHours", "overtimeHoursPrice", "overtimeHours"]) {
      if (updates[key] !== undefined && updates[key] !== null) {
        updates[key] = updates[key].toString();
      }
    }

    const [updated] = await db
      .update(serviceItemsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(serviceItemsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });

    const rc = updated.revenueCenterId
      ? await db.query.revenueCentersTable.findFirst({ where: eq(revenueCentersTable.id, updated.revenueCenterId) })
      : null;

    res.json({ ...updated, revenueCenterName: rc?.name ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /service-items/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(serviceItemsTable).where(eq(serviceItemsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
