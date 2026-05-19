import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, functionsTable, locationsTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/events", async (req, res) => {
  try {
    const { start, end, siteId, status, type } = req.query as Record<string, string>;
    const events = await db.query.eventsTable.findMany();
    let filtered = events;

    if (start) {
      filtered = filtered.filter((e) => !e.startDate || e.startDate >= start);
    }
    if (end) {
      filtered = filtered.filter((e) => !e.endDate || e.endDate <= end);
    }
    if (status) filtered = filtered.filter((e) => e.eventStatus === status);
    if (type) filtered = filtered.filter((e) => e.eventType === type);
    if (siteId) filtered = filtered.filter((e) => e.site === siteId);

    const enriched = await Promise.all(
      filtered.map(async (evt) => {
        const fns = await db.query.functionsTable.findMany({
          where: eq(functionsTable.eventId, evt.id),
        });
        const enrichedFns = await Promise.all(
          fns.map(async (fn) => {
            let locationCode = null;
            if (fn.locationId) {
              const loc = await db.query.locationsTable.findFirst({
                where: eq(locationsTable.id, fn.locationId),
              });
              locationCode = loc?.code ?? null;
            }
            return {
              startTime: fn.startTime,
              endTime: fn.endTime,
              locationCode,
              functionType: fn.functionType,
            };
          })
        );
        let accountName: string | null = null;
        if (evt.accountId) {
          const account = await db.query.accountsTable.findFirst({
            where: eq(accountsTable.id, evt.accountId),
          });
          accountName = account?.accountName ?? null;
        }
        return {
          id: evt.id,
          eventName: evt.eventName,
          accountName,
          startDate: evt.startDate,
          endDate: evt.endDate,
          eventStatus: evt.eventStatus,
          eventType: evt.eventType,
          site: evt.site,
          estimatedAttendance: evt.estimatedAttendance,
          functions: enrichedFns,
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

export default router;
