import { Router } from "express";
import { db } from "@workspace/db";
import { masterEventsTable, eventsTable, contactsTable, functionsTable, locationsTable, functionMenusTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";

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

// GET /master-events/:id/functions — all functions across all events in this master event
router.get("/:id/functions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const events = await db.select({ id: eventsTable.id, eventName: eventsTable.eventName }).from(eventsTable).where(eq(eventsTable.masterEventId, id));
    if (!events.length) { res.json([]); return; }

    const eventIds = events.map((e) => e.id);
    const eventMap: Record<number, string> = {};
    events.forEach((e) => { eventMap[e.id] = e.eventName; });

    const fns = await db.select().from(functionsTable).where(inArray(functionsTable.eventId, eventIds));

    // Get location names
    const locationIds = [...new Set(fns.map((f) => f.locationId).filter(Boolean))] as number[];
    const locationMap: Record<number, string> = {};
    if (locationIds.length) {
      const locs = await db.select({ id: locationsTable.id, name: locationsTable.name }).from(locationsTable).where(inArray(locationsTable.id, locationIds));
      locs.forEach((l) => { locationMap[l.id] = l.name; });
    }

    // Check which functions have menus/services
    const fnIds = fns.map((f) => f.id);
    const serviceSet = new Set<number>();
    if (fnIds.length) {
      const menus = await db.select({ functionId: functionMenusTable.functionId }).from(functionMenusTable).where(inArray(functionMenusTable.functionId, fnIds));
      menus.forEach((m) => { if (m.functionId) serviceSet.add(m.functionId); });
    }

    const result = fns.map((f) => ({
      id: f.id,
      eventId: f.eventId,
      eventName: eventMap[f.eventId] ?? "",
      functionName: f.functionName,
      functionNumber: f.functionNumber,
      functionDate: f.functionDate,
      startTime: f.startTime,
      endTime: f.endTime,
      locationName: f.locationId ? (locationMap[f.locationId] ?? null) : null,
      estimatedAttendance: f.estimatedAttendance,
      hasServices: serviceSet.has(f.id),
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch master event functions" });
  }
});

// GET /master-events/:id — detail with linked events
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [me] = await db.select().from(masterEventsTable).where(eq(masterEventsTable.id, id));
    if (!me) { res.status(404).json({ error: "Not found" }); return; }

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
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
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
