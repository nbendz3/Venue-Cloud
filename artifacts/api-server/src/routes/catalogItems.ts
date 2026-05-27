import { Router } from "express";
import { db } from "@workspace/db";
import {
  catalogItemsTable,
  serviceItemCategoriesTable,
  serviceTypesMasterTable,
  revenueCentersTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// GET /catalog-items
router.get("/", async (req, res) => {
  try {
    const { search, categoryId, masterTypeId, isActive } = req.query as Record<string, string>;
    let rows = await db
      .select()
      .from(catalogItemsTable)
      .orderBy(asc(catalogItemsTable.sortOrder), asc(catalogItemsTable.name));

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s),
      );
    }
    if (categoryId) rows = rows.filter((r) => r.categoryId === parseInt(categoryId));
    if (masterTypeId) rows = rows.filter((r) => r.masterTypeId === parseInt(masterTypeId));
    if (isActive !== undefined)
      rows = rows.filter((r) => r.isActive === (isActive === "true"));

    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch catalog items" });
  }
});

// GET /catalog-items/meta — lookup lists for form dropdowns
router.get("/meta", async (req, res) => {
  try {
    const [categories, masterTypes, revenueCenters] = await Promise.all([
      db.select().from(serviceItemCategoriesTable).orderBy(asc(serviceItemCategoriesTable.name)),
      db.select().from(serviceTypesMasterTable).orderBy(asc(serviceTypesMasterTable.name)),
      db.select().from(revenueCentersTable).orderBy(asc(revenueCentersTable.name)),
    ]);
    res.json({ categories, masterTypes, revenueCenters });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch catalog meta" });
  }
});

// GET /catalog-items/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch catalog item" });
  }
});

// POST /catalog-items
router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    for (const key of ["price", "cost"]) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        body[key] = String(body[key]);
      } else {
        body[key] = null;
      }
    }
    const [created] = await db.insert(catalogItemsTable).values(body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create catalog item" });
  }
});

// PUT /catalog-items/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = { ...req.body };
    for (const key of ["price", "cost"]) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        body[key] = String(body[key]);
      } else {
        body[key] = null;
      }
    }
    delete body.id;
    delete body.createdAt;
    const [updated] = await db
      .update(catalogItemsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(catalogItemsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update catalog item" });
  }
});

// DELETE /catalog-items/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(catalogItemsTable).where(eq(catalogItemsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete catalog item" });
  }
});

export default router;
