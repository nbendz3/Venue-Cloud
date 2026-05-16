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

export default router;
