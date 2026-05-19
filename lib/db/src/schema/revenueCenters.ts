import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const revenueCentersTable = pgTable("revenue_centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldCode: text("field_code"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  salesTaxRate: numeric("sales_tax_rate", { precision: 6, scale: 4 }),
  occupancyTaxRate: numeric("occupancy_tax_rate", { precision: 6, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRevenueCenterSchema = createInsertSchema(revenueCentersTable).omit({ id: true, createdAt: true });
export type InsertRevenueCenter = z.infer<typeof insertRevenueCenterSchema>;
export type RevenueCenter = typeof revenueCentersTable.$inferSelect;
