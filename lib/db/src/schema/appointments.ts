import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDatetime: text("start_datetime"),
  endDatetime: text("end_datetime"),
  relatedType: text("related_type"),
  relatedId: integer("related_id"),
  contactId: integer("contact_id"),
  category: text("category"),
  result: text("result"),
  salesperson: text("salesperson"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
