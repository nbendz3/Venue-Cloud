import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Simple lookup tables ────────────────────────────────────────────────────

export const eventTypesTable = pgTable("event_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  siteId: integer("site_id"),
});
export const insertEventTypeSchema = createInsertSchema(eventTypesTable).omit({ id: true });
export type EventType = typeof eventTypesTable.$inferSelect;

export const masterEventTypesTable = pgTable("master_event_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertMasterEventTypeSchema = createInsertSchema(masterEventTypesTable).omit({ id: true });
export type MasterEventType = typeof masterEventTypesTable.$inferSelect;

export const eventCategoriesTable = pgTable("event_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertEventCategorySchema = createInsertSchema(eventCategoriesTable).omit({ id: true });
export type EventCategory = typeof eventCategoriesTable.$inferSelect;

export const marketTypesTable = pgTable("market_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertMarketTypeSchema = createInsertSchema(marketTypesTable).omit({ id: true });
export type MarketType = typeof marketTypesTable.$inferSelect;

export const referralTypesTable = pgTable("referral_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertReferralTypeSchema = createInsertSchema(referralTypesTable).omit({ id: true });
export type ReferralType = typeof referralTypesTable.$inferSelect;

export const cancelledReasonsTable = pgTable("cancelled_reasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertCancelledReasonSchema = createInsertSchema(cancelledReasonsTable).omit({ id: true });
export type CancelledReason = typeof cancelledReasonsTable.$inferSelect;

export const setupStylesTable = pgTable("setup_styles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldCode: text("field_code"),
  definedInMasterList: boolean("defined_in_master_list").default(true),
});
export const insertSetupStyleSchema = createInsertSchema(setupStylesTable).omit({ id: true });
export type SetupStyle = typeof setupStylesTable.$inferSelect;

export const paymentArrangementTypesTable = pgTable("payment_arrangement_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertPaymentArrangementTypeSchema = createInsertSchema(paymentArrangementTypesTable).omit({ id: true });
export type PaymentArrangementType = typeof paymentArrangementTypesTable.$inferSelect;

export const paymentMethodTypesTable = pgTable("payment_method_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertPaymentMethodTypeSchema = createInsertSchema(paymentMethodTypesTable).omit({ id: true });
export type PaymentMethodType = typeof paymentMethodTypesTable.$inferSelect;

export const paymentTypeOptionsTable = pgTable("payment_type_options", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertPaymentTypeOptionSchema = createInsertSchema(paymentTypeOptionsTable).omit({ id: true });
export type PaymentTypeOption = typeof paymentTypeOptionsTable.$inferSelect;

export const personnelRolesTable = pgTable("personnel_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertPersonnelRoleSchema = createInsertSchema(personnelRolesTable).omit({ id: true });
export type PersonnelRole = typeof personnelRolesTable.$inferSelect;

export const contactTypesTable = pgTable("contact_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertContactTypeSchema = createInsertSchema(contactTypesTable).omit({ id: true });
export type ContactType = typeof contactTypesTable.$inferSelect;

export const appliedRatesTable = pgTable("applied_rates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rate: numeric("rate", { precision: 8, scale: 4 }),
  revenueCenterId: integer("revenue_center_id"),
  isActive: boolean("is_active").default(true),
});
export const insertAppliedRateSchema = createInsertSchema(appliedRatesTable).omit({ id: true });
export type AppliedRate = typeof appliedRatesTable.$inferSelect;

export const timelineTypesTable = pgTable("timeline_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertTimelineTypeSchema = createInsertSchema(timelineTypesTable).omit({ id: true });
export type TimelineType = typeof timelineTypesTable.$inferSelect;

export const ingredientCategoriesTable = pgTable("ingredient_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertIngredientCategorySchema = createInsertSchema(ingredientCategoriesTable).omit({ id: true });
export type IngredientCategory = typeof ingredientCategoriesTable.$inferSelect;

export const serviceItemCategoryIITable = pgTable("service_item_category_ii", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertServiceItemCategoryIISchema = createInsertSchema(serviceItemCategoryIITable).omit({ id: true });
export type ServiceItemCategoryII = typeof serviceItemCategoryIITable.$inferSelect;

export const serviceTypesMasterTable = pgTable("service_types_master", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
export const insertServiceTypeMasterSchema = createInsertSchema(serviceTypesMasterTable).omit({ id: true });
export type ServiceTypeMaster = typeof serviceTypesMasterTable.$inferSelect;

export const serviceMenuCategoriesTable = pgTable("service_menu_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
});
export const insertServiceMenuCategorySchema = createInsertSchema(serviceMenuCategoriesTable).omit({ id: true });
export type ServiceMenuCategory = typeof serviceMenuCategoriesTable.$inferSelect;

// ── Tables with relationships ────────────────────────────────────────────────

export const mealPeriodsTable = pgTable("meal_periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldCode: text("field_code"),
});
export const insertMealPeriodSchema = createInsertSchema(mealPeriodsTable).omit({ id: true });
export type MealPeriod = typeof mealPeriodsTable.$inferSelect;

export const functionTypesTable = pgTable("function_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  checkAverage1: numeric("check_average_1", { precision: 10, scale: 2 }),
  checkAverage2: numeric("check_average_2", { precision: 10, scale: 2 }),
  mealPeriodId: integer("meal_period_id"),
});
export const insertFunctionTypeSchema = createInsertSchema(functionTypesTable).omit({ id: true });
export type FunctionType = typeof functionTypesTable.$inferSelect;

export const functionSubTypesTable = pgTable("function_sub_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  functionTypeId: integer("function_type_id"),
});
export const insertFunctionSubTypeSchema = createInsertSchema(functionSubTypesTable).omit({ id: true });
export type FunctionSubType = typeof functionSubTypesTable.$inferSelect;

export const serviceItemCategoriesTable = pgTable("service_item_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldCode: text("field_code"),
  revenueCenterId: integer("revenue_center_id"),
  appliedRatesId: integer("applied_rates_id"),
});
export const insertServiceItemCategorySchema = createInsertSchema(serviceItemCategoriesTable).omit({ id: true });
export type ServiceItemCategory = typeof serviceItemCategoriesTable.$inferSelect;

export const ingredientsTable = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id"),
  unit: text("unit"),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 4 }),
});
export const insertIngredientSchema = createInsertSchema(ingredientsTable).omit({ id: true });
export type Ingredient = typeof ingredientsTable.$inferSelect;

export const fiscalYearsTable = pgTable("fiscal_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
});
export const insertFiscalYearSchema = createInsertSchema(fiscalYearsTable).omit({ id: true });
export type FiscalYear = typeof fiscalYearsTable.$inferSelect;

export const fiscalPeriodsTable = pgTable("fiscal_periods", {
  id: serial("id").primaryKey(),
  fiscalYearId: integer("fiscal_year_id").notNull(),
  name: text("name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  sortOrder: integer("sort_order").default(0),
});
export const insertFiscalPeriodSchema = createInsertSchema(fiscalPeriodsTable).omit({ id: true });
export type FiscalPeriod = typeof fiscalPeriodsTable.$inferSelect;

export const budgetQuotasTable = pgTable("budget_quotas", {
  id: serial("id").primaryKey(),
  fiscalPeriodId: integer("fiscal_period_id").notNull(),
  salesperson: text("salesperson"),
  siteId: text("site_id"),
  revenueType: text("revenue_type"),
  quotaAmount: numeric("quota_amount", { precision: 12, scale: 2 }),
});
export const insertBudgetQuotaSchema = createInsertSchema(budgetQuotasTable).omit({ id: true });
export type BudgetQuota = typeof budgetQuotasTable.$inferSelect;

export const timelineItemsMasterTable = pgTable("timeline_items_master", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timelineTypeId: integer("timeline_type_id"),
  defaultOffsetDays: integer("default_offset_days").default(0),
  defaultOffsetDirection: text("default_offset_direction").default("before"),
});
export const insertTimelineItemMasterSchema = createInsertSchema(timelineItemsMasterTable).omit({ id: true });
export type TimelineItemMaster = typeof timelineItemsMasterTable.$inferSelect;

// ── Lifecycle models ─────────────────────────────────────────────────────────

export const lifecycleModelsTable = pgTable("lifecycle_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  stages: text("stages"), // JSON array of stage name strings
  isDefault: boolean("is_default").default(false),
  definedInMasterList: boolean("defined_in_master_list").default(false),
});
export const insertLifecycleModelSchema = createInsertSchema(lifecycleModelsTable).omit({ id: true });
export type LifecycleModel = typeof lifecycleModelsTable.$inferSelect;

// ── Tax rates ────────────────────────────────────────────────────────────────

export const taxRatesTable = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rate: numeric("rate", { precision: 8, scale: 4 }),
  isActive: boolean("is_active").default(true),
});
export const insertTaxRateSchema = createInsertSchema(taxRatesTable).omit({ id: true });
export type TaxRate = typeof taxRatesTable.$inferSelect;

// ── Lifecycle calendar colors ────────────────────────────────────────────────

export const lifecycleColorsTable = pgTable("lifecycle_colors", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().unique(),
  color: text("color").notNull().default("#6B7280"),
  textColor: text("text_color").notNull().default("#FFFFFF"),
});
export const insertLifecycleColorSchema = createInsertSchema(lifecycleColorsTable).omit({ id: true });
export type LifecycleColor = typeof lifecycleColorsTable.$inferSelect;
