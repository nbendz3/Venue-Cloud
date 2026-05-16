import { pgTable, serial, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuTemplatesTable = pgTable("menu_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  menuNumber: text("menu_number"),
  category: text("category"), // Wedding Menus / Banquet Menus / Beverage Menus / Setup and Service Menus / Amenities
  pricingType: text("pricing_type"), // A La Carte Pricing / Package Pricing - Percentage Amount Allocation / Package Pricing - Monetary Amount Allocation
  packagePrice: numeric("package_price", { precision: 12, scale: 2 }),
  packageCost: numeric("package_cost", { precision: 12, scale: 2 }),
  useInclusivePricing: boolean("use_inclusive_pricing").default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMenuTemplateSchema = createInsertSchema(menuTemplatesTable).omit({ id: true, createdAt: true });
export type InsertMenuTemplate = z.infer<typeof insertMenuTemplateSchema>;
export type MenuTemplate = typeof menuTemplatesTable.$inferSelect;
