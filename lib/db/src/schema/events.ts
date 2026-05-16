import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  primaryContactId: integer("primary_contact_id"),
  eventName: text("event_name").notNull(),
  groupMasterAccount: text("group_master_account"),
  eventType: text("event_type"),
  eventCategory: text("event_category"),
  marketType: text("market_type"),
  referralType: text("referral_type"),
  estimatedAttendance: integer("estimated_attendance"),
  owner: text("owner"),
  salesperson: text("salesperson"),
  eventNumber: text("event_number"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  lifecycleModel: text("lifecycle_model"),
  pmsGroupNumber: text("pms_group_number"),
  eventStatus: text("event_status").notNull().default("New"),
  site: text("site"),
  eventNote: text("event_note"),
  paymentArrangements: text("payment_arrangements"),
  billingContactId: integer("billing_contact_id"),
  billingNotes: text("billing_notes"),
  taxExempt: boolean("tax_exempt"),
  masterEventId: integer("master_event_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
