import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adjustmentsTable = pgTable("adjustments", {
  id: serial("id").primaryKey(),
  functionId: integer("function_id").notNull(),
  date: text("date"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  revenueCenterId: integer("revenue_center_id"),
  appliedRates: text("applied_rates"),
  description: text("description"),
  salesperson: text("salesperson"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdjustmentSchema = createInsertSchema(adjustmentsTable).omit({ id: true, createdAt: true });
export type InsertAdjustment = z.infer<typeof insertAdjustmentSchema>;
export type Adjustment = typeof adjustmentsTable.$inferSelect;
