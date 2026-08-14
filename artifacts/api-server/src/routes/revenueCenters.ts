import { Router } from "express";
import { db } from "@workspace/db";
import { revenueCentersTable, serviceFeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /revenue-centers
router.get("/revenue-centers", async (req, res) => {
  try {
    const rows = await db.select().from(revenueCentersTable).orderBy(revenueCentersTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /revenue-centers
router.post("/revenue-centers", async (req, res) => {
  try {
    const [created] = await db.insert(revenueCentersTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create revenue center" });
  }
});

// PUT /revenue-centers/:id
router.put("/revenue-centers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(revenueCentersTable).set(req.body).where(eq(revenueCentersTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update revenue center" });
  }
});

// DELETE /revenue-centers/:id
router.delete("/revenue-centers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(revenueCentersTable).where(eq(revenueCentersTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete revenue center" });
  }
});

// GET /service-fees
router.get("/service-fees", async (req, res) => {
  try {
    const rows = await db.select().from(serviceFeesTable);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
