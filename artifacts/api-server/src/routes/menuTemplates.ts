import { Router } from "express";
import { db } from "@workspace/db";
import { menuTemplatesTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";

const router = Router();

// GET /menu-templates
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query as Record<string, string>;
    let rows = await db.select().from(menuTemplatesTable);
    if (category && category !== "all") {
      rows = rows.filter((r) => r.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(s));
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /menu-templates
router.post("/", async (req, res) => {
  try {
    const { name, category, pricingType, packagePrice, packageCost, useInclusivePricing, createdBy } = req.body;
    const [template] = await db
      .insert(menuTemplatesTable)
      .values({
        name,
        category,
        pricingType,
        packagePrice: packagePrice?.toString(),
        packageCost: packageCost?.toString(),
        useInclusivePricing,
        createdBy,
      })
      .returning();
    res.status(201).json(template);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
