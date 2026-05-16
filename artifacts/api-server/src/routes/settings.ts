import { Router } from "express";
import { db } from "@workspace/db";
import {
  eventTypesTable, masterEventTypesTable, eventCategoriesTable,
  marketTypesTable, referralTypesTable, cancelledReasonsTable,
  setupStylesTable, paymentArrangementTypesTable, paymentMethodTypesTable,
  paymentTypeOptionsTable, personnelRolesTable, contactTypesTable,
  appliedRatesTable, timelineTypesTable, ingredientCategoriesTable,
  serviceItemCategoryIITable, serviceTypesMasterTable, serviceMenuCategoriesTable,
  mealPeriodsTable, functionTypesTable, functionSubTypesTable,
  serviceItemCategoriesTable, ingredientsTable, fiscalYearsTable,
  fiscalPeriodsTable, budgetQuotasTable, timelineItemsMasterTable,
  lifecycleColorsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

// Registry maps slug → drizzle table
const TABLE_REGISTRY: Record<string, PgTable> = {
  "event-types": eventTypesTable,
  "master-event-types": masterEventTypesTable,
  "event-categories": eventCategoriesTable,
  "market-types": marketTypesTable,
  "referral-types": referralTypesTable,
  "cancelled-reasons": cancelledReasonsTable,
  "setup-styles": setupStylesTable,
  "payment-arrangement-types": paymentArrangementTypesTable,
  "payment-method-types": paymentMethodTypesTable,
  "payment-type-options": paymentTypeOptionsTable,
  "personnel-roles": personnelRolesTable,
  "contact-types": contactTypesTable,
  "applied-rates": appliedRatesTable,
  "timeline-types": timelineTypesTable,
  "ingredient-categories": ingredientCategoriesTable,
  "service-item-category-ii": serviceItemCategoryIITable,
  "service-types-master": serviceTypesMasterTable,
  "service-menu-categories": serviceMenuCategoriesTable,
  "meal-periods": mealPeriodsTable,
  "function-types": functionTypesTable,
  "function-sub-types": functionSubTypesTable,
  "service-item-categories": serviceItemCategoriesTable,
  "ingredients": ingredientsTable,
  "fiscal-years": fiscalYearsTable,
  "fiscal-periods": fiscalPeriodsTable,
  "budget-quotas": budgetQuotasTable,
  "timeline-items-master": timelineItemsMasterTable,
  "lifecycle-colors": lifecycleColorsTable,
};

const router = Router();

// GET /settings/:table — list
router.get("/:table", async (req, res) => {
  const table = TABLE_REGISTRY[req.params.table];
  if (!table) return res.status(404).json({ error: "Unknown settings table" });
  try {
    const rows = await db.select().from(table).orderBy((table as any).id);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// POST /settings/:table — create
router.post("/:table", async (req, res) => {
  const table = TABLE_REGISTRY[req.params.table];
  if (!table) return res.status(404).json({ error: "Unknown settings table" });
  try {
    const [created] = await db.insert(table).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create setting" });
  }
});

// PUT /settings/:table/:id — update
router.put("/:table/:id", async (req, res) => {
  const table = TABLE_REGISTRY[req.params.table];
  if (!table) return res.status(404).json({ error: "Unknown settings table" });
  const id = parseInt(req.params.id);
  try {
    const [updated] = await db.update(table).set(req.body).where(eq((table as any).id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// DELETE /settings/:table/:id — delete
router.delete("/:table/:id", async (req, res) => {
  const table = TABLE_REGISTRY[req.params.table];
  if (!table) return res.status(404).json({ error: "Unknown settings table" });
  const id = parseInt(req.params.id);
  try {
    await db.delete(table).where(eq((table as any).id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete setting" });
  }
});

export default router;
