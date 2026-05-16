import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communicationHistoryTable = pgTable("communication_history", {
  id: serial("id").primaryKey(),
  relatedType: text("related_type").notNull(), // Event | Function | Lead | Contact | Account
  relatedId: integer("related_id").notNull(),
  subject: text("subject"),
  type: text("type"), // Call | Email | Meeting | Note | Letter | Fax
  category: text("category"),
  result: text("result"),
  date: text("date"),
  contactId: integer("contact_id"),
  content: text("content"),
  internal: boolean("internal").default(false),
  attachments: text("attachments"), // JSON array of file names
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertCommunicationHistorySchema = createInsertSchema(communicationHistoryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCommunicationHistory = z.infer<typeof insertCommunicationHistorySchema>;
export type CommunicationHistory = typeof communicationHistoryTable.$inferSelect;
