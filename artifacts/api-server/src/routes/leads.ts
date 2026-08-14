import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const leads = await db.query.leadsTable.findMany();
    let filtered = leads;
    if (status) filtered = filtered.filter((l) => l.leadStatus === status);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((l) => l.leadName.toLowerCase().includes(s));
    }
    const enriched = await Promise.all(
      filtered.map(async (l) => {
        let primaryContactName = null;
        if (l.primaryContactId) {
          const c = await db.query.contactsTable.findFirst({
            where: eq(contactsTable.id, l.primaryContactId),
          });
          if (c) primaryContactName = `${c.firstName} ${c.lastName}`;
        }
        return {
          ...l,
          budget: l.budget ? parseFloat(l.budget) : null,
          primaryContactName,
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(leadsTable).values(req.body).returning();
    res.status(201).json({ ...created, budget: created.budget ? parseFloat(created.budget) : null, primaryContactName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const lead = await db.query.leadsTable.findFirst({ where: eq(leadsTable.id, id) });
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    let primaryContactName = null;
    if (lead.primaryContactId) {
      const c = await db.query.contactsTable.findFirst({
        where: eq(contactsTable.id, lead.primaryContactId),
      });
      if (c) primaryContactName = `${c.firstName} ${c.lastName}`;
    }
    res.json({ ...lead, budget: lead.budget ? parseFloat(lead.budget) : null, primaryContactName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(leadsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(leadsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, budget: updated.budget ? parseFloat(updated.budget) : null, primaryContactName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(leadsTable).where(eq(leadsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

export default router;
