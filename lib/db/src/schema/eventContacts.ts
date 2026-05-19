import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventContactsTable = pgTable("event_contacts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  contactId: integer("contact_id").notNull(),
  contactRole: text("contact_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventContactSchema = createInsertSchema(eventContactsTable).omit({ id: true, createdAt: true });
export type InsertEventContact = z.infer<typeof insertEventContactSchema>;
export type EventContact = typeof eventContactsTable.$inferSelect;
