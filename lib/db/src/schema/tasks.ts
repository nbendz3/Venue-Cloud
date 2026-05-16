import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  priority: text("priority").notNull().default("Medium"),
  description: text("description"),
  relatedType: text("related_type"),
  relatedId: integer("related_id"),
  contactId: integer("contact_id"),
  category: text("category"),
  result: text("result"),
  status: text("status").notNull().default("Open"),
  salesperson: text("salesperson"),
  dueDate: text("due_date"),
  site: text("site"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
