import { Router } from "express";
import { db } from "@workspace/db";
import { locationsTable } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const locations = await db.query.locationsTable.findMany();
    res.json(locations);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(locationsTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create location" });
  }
});

export default router;
