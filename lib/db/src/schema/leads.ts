import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("event_leads", {
  id: serial("id").primaryKey(),
  primaryContactId: integer("primary_contact_id"),
  leadName: text("lead_name").notNull(),
  division: text("division"),
  site: text("site"),
  leadType: text("lead_type"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  probability: integer("probability"),
  leadStatus: text("lead_status").notNull().default("New"),
  decisionDate: text("decision_date"),
  lastActivity: text("last_activity"),
  nextAction: text("next_action"),
  owner: text("owner"),
  salesperson: text("salesperson"),
  referralType: text("referral_type"),
  functionType: text("function_type"),
  eventDate: text("event_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  locationId: integer("location_id"),
  estimatedAttendance: integer("estimated_attendance"),
  description: text("description"),
  billingContactId: integer("billing_contact_id"),
  billingNotes: text("billing_notes"),
  paymentArrangements: text("payment_arrangements"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
