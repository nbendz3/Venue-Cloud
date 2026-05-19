import { Router } from "express";
import { db } from "@workspace/db";
import { eventPersonnelTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const rows = await db.query.eventPersonnelTable.findMany({
      where: eq(eventPersonnelTable.eventId, eventId),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch event personnel" });
  }
});

router.post("/", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const [created] = await db
      .insert(eventPersonnelTable)
      .values({ ...req.body, eventId })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add event personnel" });
  }
});

router.delete("/:personnelId", async (req, res) => {
  try {
    const personnelId = parseInt(req.params.personnelId);
    await db.delete(eventPersonnelTable).where(eq(eventPersonnelTable.id, personnelId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove event personnel" });
  }
});

export default router;
