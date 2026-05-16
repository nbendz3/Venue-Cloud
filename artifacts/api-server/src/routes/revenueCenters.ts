import { Router } from "express";
import { db } from "@workspace/db";
import { revenueCentersTable, serviceFeesTable } from "@workspace/db";

const router = Router();

// GET /revenue-centers
router.get("/revenue-centers", async (req, res) => {
  try {
    const rows = await db.select().from(revenueCentersTable);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
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
