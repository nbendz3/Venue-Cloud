import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, contactsTable, accountsTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, site, search } = req.query as Record<string, string>;
    const events = await db
      .select({
        id: eventsTable.id,
        eventName: eventsTable.eventName,
        eventNumber: eventsTable.eventNumber,
        eventType: eventsTable.eventType,
        eventCategory: eventsTable.eventCategory,
        marketType: eventsTable.marketType,
        referralType: eventsTable.referralType,
        estimatedAttendance: eventsTable.estimatedAttendance,
        owner: eventsTable.owner,
        salesperson: eventsTable.salesperson,
        startDate: eventsTable.startDate,
        endDate: eventsTable.endDate,
        eventStatus: eventsTable.eventStatus,
        site: eventsTable.site,
        eventNote: eventsTable.eventNote,
        paymentArrangements: eventsTable.paymentArrangements,
        billingNotes: eventsTable.billingNotes,
        taxExempt: eventsTable.taxExempt,
        primaryContactId: eventsTable.primaryContactId,
        billingContactId: eventsTable.billingContactId,
        masterEventId: eventsTable.masterEventId,
        groupMasterAccount: eventsTable.groupMasterAccount,
        lifecycleModel: eventsTable.lifecycleModel,
        pmsGroupNumber: eventsTable.pmsGroupNumber,
        createdAt: eventsTable.createdAt,
        updatedAt: eventsTable.updatedAt,
        primaryContactName: db
          .select({ name: contactsTable.firstName })
          .from(contactsTable)
          .where(eq(contactsTable.id, eventsTable.primaryContactId!))
          .limit(1)
          .as("primaryContactName"),
      })
      .from(eventsTable)
      .leftJoin(contactsTable, eq(eventsTable.primaryContactId, contactsTable.id));

    let filtered = events;
    if (status) filtered = filtered.filter((e) => e.eventStatus === status);
    if (site) filtered = filtered.filter((e) => e.site === site);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.eventName.toLowerCase().includes(s) ||
          (e.eventNumber ?? "").toLowerCase().includes(s)
      );
    }

    const result = await db.query.eventsTable.findMany({
      where: and(
        status ? eq(eventsTable.eventStatus, status) : undefined,
        search
          ? or(
              ilike(eventsTable.eventName, `%${search}%`),
              ilike(eventsTable.eventNumber!, `%${search}%`)
            )
          : undefined
      ),
    });

    const enriched = await Promise.all(
      result.map(async (evt) => {
        let primaryContactName = null;
        let accountName = null;
        if (evt.primaryContactId) {
          const contact = await db.query.contactsTable.findFirst({
            where: eq(contactsTable.id, evt.primaryContactId),
          });
          if (contact) {
            primaryContactName = `${contact.firstName} ${contact.lastName}`;
            if (contact.accountId) {
              const acct = await db.query.accountsTable.findFirst({
                where: eq(accountsTable.id, contact.accountId),
              });
              accountName = acct?.name ?? null;
            }
          }
        }
        return { ...evt, primaryContactName, accountName };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const eventNumber = `EVT-${Date.now()}`;
    const [created] = await db
      .insert(eventsTable)
      .values({ ...body, eventNumber })
      .returning();
    res.status(201).json({ ...created, primaryContactName: null, accountName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const evt = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, id),
    });
    if (!evt) return res.status(404).json({ error: "Not found" });
    let primaryContactName = null;
    let accountName = null;
    let billingContactName = null;
    if (evt.primaryContactId) {
      const contact = await db.query.contactsTable.findFirst({
        where: eq(contactsTable.id, evt.primaryContactId),
      });
      if (contact) {
        primaryContactName = `${contact.firstName} ${contact.lastName}`;
        if (contact.accountId) {
          const acct = await db.query.accountsTable.findFirst({
            where: eq(accountsTable.id, contact.accountId),
          });
          accountName = acct?.name ?? null;
        }
      }
    }
    if (evt.billingContactId && evt.billingContactId !== evt.primaryContactId) {
      const bc = await db.query.contactsTable.findFirst({
        where: eq(contactsTable.id, evt.billingContactId),
      });
      if (bc) billingContactName = `${bc.firstName} ${bc.lastName}`;
    } else if (evt.billingContactId && evt.billingContactId === evt.primaryContactId) {
      billingContactName = primaryContactName;
    }
    res.json({ ...evt, primaryContactName, accountName, billingContactName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(eventsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(eventsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, primaryContactName: null, accountName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.get("/:id/functions", async (req, res) => {
  try {
    const { functionsTable, locationsTable } = await import("@workspace/db");
    const id = parseInt(req.params.id);
    const fns = await db.query.functionsTable.findMany({
      where: eq(functionsTable.eventId, id),
    });
    const enriched = await Promise.all(
      fns.map(async (fn) => {
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
        return {
          ...fn,
          roomRental: fn.roomRental ? parseFloat(fn.roomRental) : null,
          locationName,
          locationCode,
          eventName: evt?.eventName ?? null,
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch functions" });
  }
});

router.post("/:id/functions", async (req, res) => {
  try {
    const { functionsTable } = await import("@workspace/db");
    const id = parseInt(req.params.id);
    const functionNumber = `FN-${Date.now()}`;
    const [created] = await db
      .insert(functionsTable)
      .values({ ...req.body, eventId: id, functionNumber })
      .returning();
    res.status(201).json({
      ...created,
      roomRental: created.roomRental ? parseFloat(created.roomRental) : null,
      locationName: null,
      locationCode: null,
      eventName: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create function" });
  }
});

router.get("/:id/notes", async (req, res) => {
  try {
    const { notesTable } = await import("@workspace/db");
    const id = parseInt(req.params.id);
    const notes = await db.query.notesTable.findMany({
      where: and(eq(notesTable.relatedType, "Event"), eq(notesTable.relatedId, id)),
    });
    res.json(notes);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.get("/:id/tasks", async (req, res) => {
  try {
    const { tasksTable } = await import("@workspace/db");
    const id = parseInt(req.params.id);
    const tasks = await db.query.tasksTable.findMany({
      where: and(eq(tasksTable.relatedType, "Event"), eq(tasksTable.relatedId, id)),
    });
    res.json(tasks.map((t) => ({ ...t, relatedName: null, contactName: null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

export default router;
