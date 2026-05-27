import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const catalogItemsTable = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  categoryId: integer("category_id"),
  masterTypeId: integer("master_type_id"),
  revenueCenterId: integer("revenue_center_id"),
  unit: text("unit"),
  taxRateCenterId: integer("tax_rate_center_id"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCatalogItemSchema = createInsertSchema(catalogItemsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItemsTable.$inferSelect;
