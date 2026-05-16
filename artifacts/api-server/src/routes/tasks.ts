import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, contactsTable, eventsTable, leadsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, relatedType, relatedId } = req.query as Record<string, string>;
    const tasks = await db.query.tasksTable.findMany();
    let filtered = tasks;
    if (status) filtered = filtered.filter((t) => t.status === status);
    if (relatedType) filtered = filtered.filter((t) => t.relatedType === relatedType);
    if (relatedId) filtered = filtered.filter((t) => t.relatedId === parseInt(relatedId));
    const enriched = await Promise.all(
      filtered.map(async (t) => {
        let relatedName = null;
        let contactName = null;
        if (t.relatedType === "Event" && t.relatedId) {
          const evt = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, t.relatedId) });
          relatedName = evt?.eventName ?? null;
        } else if (t.relatedType === "Lead" && t.relatedId) {
          const lead = await db.query.leadsTable.findFirst({ where: eq(leadsTable.id, t.relatedId) });
          relatedName = lead?.leadName ?? null;
        }
        if (t.contactId) {
          const c = await db.query.contactsTable.findFirst({ where: eq(contactsTable.id, t.contactId) });
          if (c) contactName = `${c.firstName} ${c.lastName}`;
        }
        return { ...t, relatedName, contactName };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(tasksTable).values(req.body).returning();
    res.status(201).json({ ...created, relatedName: null, contactName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(tasksTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(tasksTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, relatedName: null, contactName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
