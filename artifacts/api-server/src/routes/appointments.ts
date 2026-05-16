import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { relatedType, relatedId } = req.query as Record<string, string>;
    const appts = await db.query.appointmentsTable.findMany();
    let filtered = appts;
    if (relatedType) filtered = filtered.filter((a) => a.relatedType === relatedType);
    if (relatedId) filtered = filtered.filter((a) => a.relatedId === parseInt(relatedId));
    const enriched = await Promise.all(
      filtered.map(async (a) => {
        let contactName = null;
        if (a.contactId) {
          const c = await db.query.contactsTable.findFirst({ where: eq(contactsTable.id, a.contactId) });
          if (c) contactName = `${c.firstName} ${c.lastName}`;
        }
        return { ...a, contactName };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(appointmentsTable).values(req.body).returning();
    res.status(201).json({ ...created, contactName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(appointmentsTable)
      .set(req.body)
      .where(eq(appointmentsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, contactName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

export default router;
