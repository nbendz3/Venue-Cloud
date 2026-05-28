import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuTemplateItemsTable = pgTable("menu_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  catalogItemId: integer("catalog_item_id").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1"),
  priceOverride: numeric("price_override", { precision: 12, scale: 2 }),
  notes: text("notes"),
  sectionName: text("section_name"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMenuTemplateItemSchema = createInsertSchema(menuTemplateItemsTable).omit({ id: true, createdAt: true });
export type InsertMenuTemplateItem = z.infer<typeof insertMenuTemplateItemSchema>;
export type MenuTemplateItem = typeof menuTemplateItemsTable.$inferSelect;
