import { Router } from "express";
import { db } from "@workspace/db";
import { guestRoomBlocksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { eventId } = req.query as Record<string, string>;
    const blocks = await db.query.guestRoomBlocksTable.findMany();
    let filtered = blocks;
    if (eventId) filtered = filtered.filter((b) => b.eventId === parseInt(eventId));
    res.json(
      filtered.map((b) => ({
        ...b,
        avgRate: b.avgRate ? parseFloat(b.avgRate) : null,
        total: b.total ? parseFloat(b.total) : null,
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch guest room blocks" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(guestRoomBlocksTable).values(req.body).returning();
    res.status(201).json({
      ...created,
      avgRate: created.avgRate ? parseFloat(created.avgRate) : null,
      total: created.total ? parseFloat(created.total) : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create guest room block" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(guestRoomBlocksTable)
      .set(req.body)
      .where(eq(guestRoomBlocksTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({
      ...updated,
      avgRate: updated.avgRate ? parseFloat(updated.avgRate) : null,
      total: updated.total ? parseFloat(updated.total) : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update guest room block" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(guestRoomBlocksTable).where(eq(guestRoomBlocksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete guest room block" });
  }
});

export default router;
