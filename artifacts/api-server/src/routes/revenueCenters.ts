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
    // Exactly one revenue center may be the default: it is the fallback used
    // to tax items that carry no center of their own, so two would be
    // ambiguous and none means those items go untaxed.
    if (req.body?.isDefault === true) {
      await db.update(revenueCentersTable).set({ isDefault: false });
    }
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
    const rows = await db.select().from(serviceFeesTable).orderBy(serviceFeesTable.id);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Service fees had no write endpoints at all, which is why the property had no
 * gratuity configured and every BEO printed without one. A rate is stored as a
 * PERCENT here (22.0000 = 22%), unlike applied_rates which stores a fraction.
 */
function validateFee(body: Record<string, unknown>): string | null {
  const name = String(body.name ?? "").trim();
  if (!name) return "name is required";
  const rate = Number(body.ratePercent);
  if (!Number.isFinite(rate)) return "ratePercent must be a number";
  if (rate < 0 || rate > 100) return "ratePercent must be between 0 and 100";
  return null;
}

// POST /service-fees
router.post("/service-fees", async (req, res) => {
  try {
    const error = validateFee(req.body ?? {});
    if (error) { res.status(400).json({ error }); return; }
    const [created] = await db
      .insert(serviceFeesTable)
      .values({
        name: String(req.body.name).trim(),
        ratePercent: Number(req.body.ratePercent).toFixed(4),
        isTaxable: req.body.isTaxable === true,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create service fee" });
  }
});

// PUT /service-fees/:id
router.put("/service-fees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const error = validateFee(req.body ?? {});
    if (error) { res.status(400).json({ error }); return; }
    const [updated] = await db
      .update(serviceFeesTable)
      .set({
        name: String(req.body.name).trim(),
        ratePercent: Number(req.body.ratePercent).toFixed(4),
        isTaxable: req.body.isTaxable === true,
      })
      .where(eq(serviceFeesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update service fee" });
  }
});

// DELETE /service-fees/:id
router.delete("/service-fees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(serviceFeesTable).where(eq(serviceFeesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete service fee" });
  }
});

export default router;
