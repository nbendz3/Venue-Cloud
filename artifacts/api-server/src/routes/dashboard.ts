import { Router } from "express";
import { db } from "@workspace/db";
import {
  eventsTable,
  leadsTable,
  tasksTable,
  accountsTable,
  contactsTable,
  functionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/summary", async (req, res) => {
  try {
    const today = todayStr();
    const thisMonth = today.slice(0, 7);

    const [events, leads, tasks, accounts, contacts] = await Promise.all([
      db.query.eventsTable.findMany(),
      db.query.leadsTable.findMany(),
      db.query.tasksTable.findMany(),
      db.query.accountsTable.findMany(),
      db.query.contactsTable.findMany(),
    ]);

    const eventsThisMonth = events.filter((e) => e.startDate?.startsWith(thisMonth)).length;
    const openLeads = leads.filter((l) => l.leadStatus === "New" || l.leadStatus === "Tentative").length;
    const openTasks = tasks.filter((t) => t.status === "Open").length;

    const statusCounts: Record<string, number> = {};
    for (const e of events) {
      statusCounts[e.eventStatus] = (statusCounts[e.eventStatus] ?? 0) + 1;
    }
    const eventsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    const upcomingEvents = events
      .filter((e) => e.startDate && e.startDate >= today)
      .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
      .slice(0, 5)
      .map((e) => ({ ...e, primaryContactName: null, accountName: null }));

    res.json({
      totalEvents: events.length,
      eventsThisMonth,
      openLeads,
      openTasks,
      totalAccounts: accounts.length,
      totalContacts: contacts.length,
      eventsByStatus,
      upcomingEvents,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/tasks-today", async (req, res) => {
  try {
    const today = todayStr();
    const tasks = await db.query.tasksTable.findMany();
    const filtered = tasks.filter(
      (t) => t.status === "Open" && t.dueDate && t.dueDate <= today
    );
    res.json(filtered.map((t) => ({ ...t, relatedName: null, contactName: null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/events-today", async (req, res) => {
  try {
    const today = todayStr();
    const events = await db.query.eventsTable.findMany();
    const filtered = events.filter((e) => e.startDate === today);
    res.json(filtered.map((e) => ({ ...e, primaryContactName: null, accountName: null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch events today" });
  }
});

router.get("/functions-today", async (req, res) => {
  try {
    const today = todayStr();
    const fns = await db.query.functionsTable.findMany();
    const filtered = fns.filter((f) => f.functionDate === today);
    const enriched = await Promise.all(
      filtered.map(async (fn) => {
        const { locationsTable } = await import("@workspace/db");
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
    res.status(500).json({ error: "Failed to fetch functions today" });
  }
});

router.get("/upcoming-events", async (req, res) => {
  try {
    const today = todayStr();
    const events = await db.query.eventsTable.findMany();
    const upcoming = events
      .filter((e) => e.startDate && e.startDate >= today)
      .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
      .slice(0, 10);

    const enriched = await Promise.all(
      upcoming.map(async (e) => {
        let accountName: string | null = null;
        if (e.primaryContactId) {
          const contact = await db.query.contactsTable.findFirst({
            where: eq(contactsTable.id, e.primaryContactId),
          });
          if (contact?.accountId) {
            const account = await db.query.accountsTable.findFirst({
              where: eq(accountsTable.id, contact.accountId),
            });
            accountName = account?.name ?? null;
          }
        }
        return { ...e, accountName };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
});

router.get("/activity-feed", async (req, res) => {
  try {
    const [events, tasks, leads] = await Promise.all([
      db.query.eventsTable.findMany(),
      db.query.tasksTable.findMany(),
      db.query.leadsTable.findMany(),
    ]);

    type FeedItem = {
      id: number;
      kind: string;
      title: string;
      subtitle: string;
      ts: string;
      linkHref: string;
    };

    const items: FeedItem[] = [];

    for (const e of events) {
      items.push({
        id: e.id,
        kind: "event",
        title: e.eventName,
        subtitle: `Event ${e.eventStatus} · ${e.eventNumber ?? `#${e.id}`}`,
        ts: e.updatedAt.toISOString(),
        linkHref: `/events/${e.id}`,
      });
    }

    for (const t of tasks) {
      items.push({
        id: t.id,
        kind: "task",
        title: t.name,
        subtitle: `Task · ${t.priority} priority · ${t.status}`,
        ts: t.updatedAt.toISOString(),
        linkHref: `/tasks`,
      });
    }

    for (const l of leads) {
      items.push({
        id: l.id,
        kind: "lead",
        title: l.leadName,
        subtitle: `Lead · ${l.leadStatus}`,
        ts: l.updatedAt.toISOString(),
        linkHref: `/leads/${l.id}`,
      });
    }

    const sorted = items
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 10);

    res.json(sorted);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch activity feed" });
  }
});

export default router;
