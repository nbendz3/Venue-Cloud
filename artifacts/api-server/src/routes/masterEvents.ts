import { Router } from "express";
import { db } from "@workspace/db";
import { masterEventsTable, eventsTable, contactsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /master-events — list with primary contact name
router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: masterEventsTable.id,
        masterEventName: masterEventsTable.masterEventName,
        masterEventNumber: masterEventsTable.masterEventNumber,
        masterEventType: masterEventsTable.masterEventType,
        marketType: masterEventsTable.marketType,
        owner: masterEventsTable.owner,
        salesperson: masterEventsTable.salesperson,
        division: masterEventsTable.division,
        primaryContactId: masterEventsTable.primaryContactId,
        primaryContactName: contactsTable.firstName,
        createdAt: masterEventsTable.createdAt,
      })
      .from(masterEventsTable)
      .leftJoin(contactsTable, eq(masterEventsTable.primaryContactId, contactsTable.id))
      .orderBy(desc(masterEventsTable.createdAt));

    const enriched = rows.map((r) => ({
      ...r,
      primaryContactName: r.primaryContactName || null,
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch master events" });
  }
});

// POST /master-events — create
router.post("/", async (req, res) => {
  try {
    const count = await db.select().from(masterEventsTable);
    const num = `ME-${new Date().getFullYear()}-${String(count.length + 1).padStart(4, "0")}`;
    const [created] = await db
      .insert(masterEventsTable)
      .values({ ...req.body, masterEventNumber: num })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create master event" });
  }
});

// GET /master-events/:id — detail with linked events
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [me] = await db.select().from(masterEventsTable).where(eq(masterEventsTable.id, id));
    if (!me) return res.status(404).json({ error: "Not found" });

    const events = await db.select().from(eventsTable).where(eq(eventsTable.masterEventId, id));
    let primaryContact = null;
    if (me.primaryContactId) {
      const [c] = await db.select().from(contactsTable).where(eq(contactsTable.id, me.primaryContactId));
      primaryContact = c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : null;
    }

    res.json({ ...me, primaryContactName: primaryContact, events });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch master event" });
  }
});

// PUT /master-events/:id — update
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(masterEventsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(masterEventsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update master event" });
  }
});

// DELETE /master-events/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(masterEventsTable).where(eq(masterEventsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete master event" });
  }
});

export default router;
