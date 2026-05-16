import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const functionLifecycleHistoryTable = pgTable("function_lifecycle_history", {
  id: serial("id").primaryKey(),
  functionId: integer("function_id").notNull(),
  eventStatus: text("event_status").notNull(), // New / Inquiry / Proposal / Tentative / Definite / Event Order / Guaranteed / Actualized / Thank You / Closed
  date: text("date"),
  salesperson: text("salesperson"),
  forecastedCharges: numeric("forecasted_charges", { precision: 12, scale: 2 }),
  charges: numeric("charges", { precision: 12, scale: 2 }),
  adjustedCharges: numeric("adjusted_charges", { precision: 12, scale: 2 }),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  margin: numeric("margin", { precision: 12, scale: 2 }),
  marginPercent: numeric("margin_percent", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFunctionLifecycleHistorySchema = createInsertSchema(functionLifecycleHistoryTable).omit({ id: true, createdAt: true });
export type InsertFunctionLifecycleHistory = z.infer<typeof insertFunctionLifecycleHistorySchema>;
export type FunctionLifecycleHistory = typeof functionLifecycleHistoryTable.$inferSelect;
