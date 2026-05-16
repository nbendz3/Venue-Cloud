import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const depositsScheduledTable = pgTable("deposits_scheduled", {
  id: serial("id").primaryKey(),
  relatedType: text("related_type").notNull(), // Event / Function
  relatedId: integer("related_id").notNull(),
  date: text("date"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  description: text("description"),
  salesperson: text("salesperson"),
  hasTask: boolean("has_task").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepositScheduledSchema = createInsertSchema(depositsScheduledTable).omit({ id: true, createdAt: true });
export type InsertDepositScheduled = z.infer<typeof insertDepositScheduledSchema>;
export type DepositScheduled = typeof depositsScheduledTable.$inferSelect;
