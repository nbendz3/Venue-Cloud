import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventLifecycleHistoryTable = pgTable("event_lifecycle_history", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  action: text("action").notNull(),
  eventStatus: text("event_status"),
  eventStatusPhase: text("event_status_phase"),
  financialSnapshot: numeric("financial_snapshot", { precision: 12, scale: 2 }),
  dateProcessed: text("date_processed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventLifecycleHistorySchema = createInsertSchema(eventLifecycleHistoryTable).omit({ id: true, createdAt: true });
export type InsertEventLifecycleHistory = z.infer<typeof insertEventLifecycleHistorySchema>;
export type EventLifecycleHistory = typeof eventLifecycleHistoryTable.$inferSelect;
