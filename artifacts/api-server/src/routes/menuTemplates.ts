import { Router } from "express";
import { db } from "@workspace/db";
import {
  menuTemplatesTable,
  menuTemplateItemsTable,
  catalogItemsTable,
  serviceItemCategoriesTable,
} from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";

const router = Router();

// GET /menu-templates
router.get("/", async (req, res) => {
  try {
    const { category, search, isActive } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: menuTemplatesTable.id,
        name: menuTemplatesTable.name,
        menuNumber: menuTemplatesTable.menuNumber,
        category: menuTemplatesTable.category,
        categoryId: menuTemplatesTable.categoryId,
        pricingType: menuTemplatesTable.pricingType,
        packagePrice: menuTemplatesTable.packagePrice,
        packageCost: menuTemplatesTable.packageCost,
        useInclusivePricing: menuTemplatesTable.useInclusivePricing,
        description: menuTemplatesTable.description,
        isActive: menuTemplatesTable.isActive,
        createdBy: menuTemplatesTable.createdBy,
        createdAt: menuTemplatesTable.createdAt,
        updatedAt: menuTemplatesTable.updatedAt,
        itemCount: sql<number>`(SELECT COUNT(*)::int FROM menu_template_items WHERE template_id = menu_templates.id)`,
      })
      .from(menuTemplatesTable)
      .orderBy(asc(menuTemplatesTable.name));

    let filtered = rows;
    if (category && category !== "all") filtered = filtered.filter((r) => r.category === category);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s));
    }
    if (isActive !== undefined) filtered = filtered.filter((r) => r.isActive === (isActive === "true"));

    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /menu-templates
router.post("/", async (req, res) => {
  try {
    const body = { ...req.body };
    for (const key of ["packagePrice", "packageCost"]) {
      if (body[key] != null && body[key] !== "") body[key] = String(body[key]);
      else body[key] = null;
    }
    const [template] = await db.insert(menuTemplatesTable).values(body).returning();
    res.status(201).json({ ...template, itemCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /menu-templates/:id  (detail with items)
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [template] = await db.select().from(menuTemplatesTable).where(eq(menuTemplatesTable.id, id));
    if (!template) { res.status(404).json({ error: "Not found" }); return; }

    const items = await db
      .select({
        id: menuTemplateItemsTable.id,
        templateId: menuTemplateItemsTable.templateId,
        catalogItemId: menuTemplateItemsTable.catalogItemId,
        quantity: menuTemplateItemsTable.quantity,
        priceOverride: menuTemplateItemsTable.priceOverride,
        notes: menuTemplateItemsTable.notes,
        sectionName: menuTemplateItemsTable.sectionName,
        sortOrder: menuTemplateItemsTable.sortOrder,
        createdAt: menuTemplateItemsTable.createdAt,
        catalogItemName: catalogItemsTable.name,
        catalogItemDescription: catalogItemsTable.description,
        catalogItemUnit: catalogItemsTable.unit,
        catalogItemPrice: catalogItemsTable.price,
        _categoryId: catalogItemsTable.categoryId,
      })
      .from(menuTemplateItemsTable)
      .leftJoin(catalogItemsTable, eq(menuTemplateItemsTable.catalogItemId, catalogItemsTable.id))
      .where(eq(menuTemplateItemsTable.templateId, id))
      .orderBy(asc(menuTemplateItemsTable.sortOrder), asc(menuTemplateItemsTable.id));

    // Enrich with category names
    const catIds = [...new Set(items.map((i) => i._categoryId).filter((x): x is number => x != null))];
    let catMap: Record<number, string> = {};
    if (catIds.length) {
      const cats = await db
        .select()
        .from(serviceItemCategoriesTable)
        .where(sql`${serviceItemCategoriesTable.id} = ANY(ARRAY[${sql.join(catIds.map((id) => sql`${id}`), sql`, `)}]::int[])`);
      catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    }

    const enrichedItems = items.map(({ _categoryId, ...item }) => ({
      ...item,
      categoryName: _categoryId != null ? (catMap[_categoryId] ?? null) : null,
    }));

    res.json({ ...template, items: enrichedItems });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /menu-templates/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = { ...req.body };
    delete body.id;
    delete body.createdAt;
    delete body.items;
    delete body.itemCount;
    for (const key of ["packagePrice", "packageCost"]) {
      if (body[key] != null && body[key] !== "") body[key] = String(body[key]);
      else body[key] = null;
    }
    const [updated] = await db
      .update(menuTemplatesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(menuTemplatesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /menu-templates/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(menuTemplateItemsTable).where(eq(menuTemplateItemsTable.templateId, id));
    await db.delete(menuTemplatesTable).where(eq(menuTemplatesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /menu-templates/:id/items
router.get("/:id/items", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const items = await db
      .select({
        id: menuTemplateItemsTable.id,
        templateId: menuTemplateItemsTable.templateId,
        catalogItemId: menuTemplateItemsTable.catalogItemId,
        quantity: menuTemplateItemsTable.quantity,
        priceOverride: menuTemplateItemsTable.priceOverride,
        notes: menuTemplateItemsTable.notes,
        sectionName: menuTemplateItemsTable.sectionName,
        sortOrder: menuTemplateItemsTable.sortOrder,
        createdAt: menuTemplateItemsTable.createdAt,
        catalogItemName: catalogItemsTable.name,
        catalogItemDescription: catalogItemsTable.description,
        catalogItemUnit: catalogItemsTable.unit,
        catalogItemPrice: catalogItemsTable.price,
        catalogItemDescription2: catalogItemsTable.description,
      })
      .from(menuTemplateItemsTable)
      .leftJoin(catalogItemsTable, eq(menuTemplateItemsTable.catalogItemId, catalogItemsTable.id))
      .where(eq(menuTemplateItemsTable.templateId, id))
      .orderBy(asc(menuTemplateItemsTable.sortOrder), asc(menuTemplateItemsTable.id));
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /menu-templates/:id/items
router.post("/:id/items", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const body = { ...req.body, templateId };
    for (const key of ["quantity", "priceOverride"]) {
      if (body[key] != null && body[key] !== "") body[key] = String(body[key]);
      else body[key] = null;
    }
    const [item] = await db.insert(menuTemplateItemsTable).values(body).returning();
    const [catalogItem] = await db.select().from(catalogItemsTable).where(eq(catalogItemsTable.id, item.catalogItemId));
    res.status(201).json({
      ...item,
      catalogItemName: catalogItem?.name ?? null,
      catalogItemDescription: catalogItem?.description ?? null,
      catalogItemUnit: catalogItem?.unit ?? null,
      catalogItemPrice: catalogItem?.price ?? null,
      categoryName: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /menu-templates/:id/items/:itemId
router.put("/:id/items/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const body = { ...req.body };
    delete body.id;
    delete body.templateId;
    delete body.createdAt;
    for (const key of ["quantity", "priceOverride"]) {
      if (body[key] != null && body[key] !== "") body[key] = String(body[key]);
      else body[key] = null;
    }
    const [updated] = await db
      .update(menuTemplateItemsTable)
      .set(body)
      .where(eq(menuTemplateItemsTable.id, itemId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const [catalogItem] = await db.select().from(catalogItemsTable).where(eq(catalogItemsTable.id, updated.catalogItemId));
    res.json({
      ...updated,
      catalogItemName: catalogItem?.name ?? null,
      catalogItemDescription: catalogItem?.description ?? null,
      catalogItemUnit: catalogItem?.unit ?? null,
      catalogItemPrice: catalogItem?.price ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /menu-templates/:id/items/:itemId
router.delete("/:id/items/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    await db.delete(menuTemplateItemsTable).where(eq(menuTemplateItemsTable.id, itemId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
