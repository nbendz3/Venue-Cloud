import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventPersonnelTable = pgTable("event_personnel", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  department: text("department"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventPersonnelSchema = createInsertSchema(eventPersonnelTable).omit({ id: true, createdAt: true });
export type InsertEventPersonnel = z.infer<typeof insertEventPersonnelSchema>;
export type EventPersonnel = typeof eventPersonnelTable.$inferSelect;
