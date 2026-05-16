import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { relatedType, relatedId } = req.query as Record<string, string>;
    const notes = await db.query.notesTable.findMany();
    let filtered = notes;
    if (relatedType) filtered = filtered.filter((n) => n.relatedType === relatedType);
    if (relatedId) filtered = filtered.filter((n) => n.relatedId === parseInt(relatedId));
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(notesTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(notesTable)
      .set(req.body)
      .where(eq(notesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(notesTable).where(eq(notesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
