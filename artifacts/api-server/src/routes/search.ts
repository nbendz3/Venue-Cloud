import { Router } from "express";
import { db } from "@workspace/db";
import {
  eventsTable,
  leadsTable,
  accountsTable,
  contactsTable,
  functionsTable,
  masterEventsTable,
  tasksTable,
} from "@workspace/db";
import { or, ilike, sql } from "drizzle-orm";

const router = Router();

export interface SearchHit {
  type: "Event" | "Lead" | "Account" | "Contact" | "Function" | "Master Event" | "Task";
  id: number;
  title: string;
  subtitle: string | null;
  /** Record number such as EVT-2026-0001, when the entity has one. */
  reference: string | null;
  href: string;
}

const PER_TYPE = 8;

/** Escapes SQL LIKE wildcards so a user typing "%" searches for a literal "%". */
function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// GET /search?q=...
//
// Cross-entity lookup for the header search. Matches on name and on record
// number, so "EVT-2026-0001" and "Meridian" both find the same event.
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ query: q, hits: [], truncated: false });
      return;
    }

    const term = likeTerm(q);
    const hits: SearchHit[] = [];

    const [events, leads, accounts, contacts, fns, masters, tasks] = await Promise.all([
      db
        .select()
        .from(eventsTable)
        .where(or(ilike(eventsTable.eventName, term), ilike(eventsTable.eventNumber, term)))
        .limit(PER_TYPE),
      db.select().from(leadsTable).where(ilike(leadsTable.leadName, term)).limit(PER_TYPE),
      db
        .select()
        .from(accountsTable)
        .where(or(ilike(accountsTable.name, term), ilike(accountsTable.accountNumber, term)))
        .limit(PER_TYPE),
      db
        .select()
        .from(contactsTable)
        .where(
          or(
            ilike(contactsTable.firstName, term),
            ilike(contactsTable.lastName, term),
            ilike(contactsTable.email, term),
            sql`(${contactsTable.firstName} || ' ' || ${contactsTable.lastName}) ILIKE ${term}`
          )
        )
        .limit(PER_TYPE),
      db
        .select()
        .from(functionsTable)
        .where(
          or(
            ilike(functionsTable.functionName, term),
            ilike(functionsTable.functionType, term),
            ilike(functionsTable.functionNumber, term)
          )
        )
        .limit(PER_TYPE),
      db
        .select()
        .from(masterEventsTable)
        .where(or(ilike(masterEventsTable.masterEventName, term), ilike(masterEventsTable.masterEventNumber, term)))
        .limit(PER_TYPE),
      db.select().from(tasksTable).where(ilike(tasksTable.name, term)).limit(PER_TYPE),
    ]);

    for (const e of events)
      hits.push({
        type: "Event",
        id: e.id,
        title: e.eventName,
        subtitle: [e.eventStatus, e.startDate].filter(Boolean).join(" · ") || null,
        reference: e.eventNumber,
        href: `/events/${e.id}`,
      });

    for (const l of leads)
      hits.push({
        type: "Lead",
        id: l.id,
        title: l.leadName,
        subtitle: l.leadStatus ?? null,
        reference: null,
        href: `/leads/${l.id}`,
      });

    for (const a of accounts)
      hits.push({
        type: "Account",
        id: a.id,
        title: a.name,
        subtitle: [a.city, a.state].filter(Boolean).join(", ") || null,
        reference: a.accountNumber,
        href: `/accounts/${a.id}`,
      });

    for (const c of contacts)
      hits.push({
        type: "Contact",
        id: c.id,
        title: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
        subtitle: c.email ?? c.title ?? null,
        reference: null,
        href: `/contacts/${c.id}`,
      });

    for (const f of fns)
      hits.push({
        type: "Function",
        id: f.id,
        title: f.functionName ?? f.functionType ?? `Function ${f.id}`,
        subtitle: f.functionDate ?? null,
        reference: f.functionNumber,
        href: `/events/${f.eventId}/functions/${f.id}`,
      });

    for (const m of masters)
      hits.push({
        type: "Master Event",
        id: m.id,
        title: m.masterEventName,
        subtitle: m.masterEventType ?? null,
        reference: m.masterEventNumber,
        href: `/master-events/${m.id}`,
      });

    for (const t of tasks)
      hits.push({
        type: "Task",
        id: t.id,
        title: t.name,
        subtitle: [t.status, t.dueDate].filter(Boolean).join(" · ") || null,
        reference: null,
        href: `/tasks/${t.id}`,
      });

    res.json({
      query: q,
      hits,
      truncated: [events, leads, accounts, contacts, fns, masters, tasks].some((r) => r.length === PER_TYPE),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
