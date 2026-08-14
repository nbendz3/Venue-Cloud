import { Router } from "express";
import { db } from "@workspace/db";
import { guestRoomTypesTable, guestRoomBlocksTable, eventsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();

// ── Room Types ────────────────────────────────────────────────────────────────

router.get("/types", async (req, res) => {
  try {
    const { site } = req.query as Record<string, string>;
    let types = await db.query.guestRoomTypesTable.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });
    if (site) types = types.filter((t) => !t.site || t.site === site);
    res.json(types);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch room types" });
  }
});

router.post("/types", async (req, res) => {
  try {
    const [created] = await db.insert(guestRoomTypesTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create room type" });
  }
});

router.put("/types/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(guestRoomTypesTable)
      .set(req.body)
      .where(eq(guestRoomTypesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update room type" });
  }
});

router.delete("/types/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(guestRoomTypesTable).where(eq(guestRoomTypesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete room type" });
  }
});

// ── Grid Data ─────────────────────────────────────────────────────────────────

router.get("/grid", async (req, res) => {
  try {
    const { start, end, site } = req.query as Record<string, string>;

    // Default: today + 13 days
    const today = new Date().toISOString().slice(0, 10);
    const defaultEnd = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
    const startDate = start || today;
    const endDate = end || defaultEnd;

    // Room types
    let roomTypes = await db.query.guestRoomTypesTable.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });
    if (site) roomTypes = roomTypes.filter((t) => !t.site || t.site === site);

    // Blocks overlapping the date range
    // A block overlaps if startDate <= endDate AND departureDate >= startDate
    const allBlocks = await db.query.guestRoomBlocksTable.findMany();
    const blocks = allBlocks.filter((b) => {
      if (!b.startDate || !b.departureDate) return false;
      return b.startDate <= endDate && b.departureDate >= startDate;
    });

    // Join event names
    const eventIds = [...new Set(blocks.map((b) => b.eventId))];
    const events =
      eventIds.length > 0
        ? await db.query.eventsTable.findMany()
        : [];
    const eventMap: Record<number, string> = {};
    for (const e of events) {
      eventMap[e.id] = e.eventName;
    }

    const blocksWithEvent = blocks.map((b) => ({
      ...b,
      eventName: eventMap[b.eventId] ?? "Unknown Event",
      avgRate: b.avgRate ? parseFloat(b.avgRate) : null,
      total: b.total ? parseFloat(b.total) : null,
    }));

    res.json({
      startDate,
      endDate,
      roomTypes,
      blocks: blocksWithEvent,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch guest rooms grid" });
  }
});

export default router;
