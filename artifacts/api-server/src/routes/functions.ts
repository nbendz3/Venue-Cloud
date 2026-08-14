import { Router } from "express";
import { db } from "@workspace/db";
import { functionsTable, locationsTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const fn = await db.query.functionsTable.findFirst({
      where: eq(functionsTable.id, id),
    });
    if (!fn) { res.status(404).json({ error: "Not found" }); return; }
    let locationName = null;
    let locationCode = null;
    if (fn.locationId) {
      const loc = await db.query.locationsTable.findFirst({
        where: eq(locationsTable.id, fn.locationId),
      });
      locationName = loc?.name ?? null;
      locationCode = loc?.code ?? null;
    }
    const evt = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, fn.eventId),
    });
    res.json({
      ...fn,
      roomRental: fn.roomRental ? parseFloat(fn.roomRental) : null,
      locationName,
      locationCode,
      eventName: evt?.eventName ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch function" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(functionsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(functionsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...updated,
      roomRental: updated.roomRental ? parseFloat(updated.roomRental) : null,
      locationName: null,
      locationCode: null,
      eventName: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update function" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(functionsTable).where(eq(functionsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete function" });
  }
});

export default router;
