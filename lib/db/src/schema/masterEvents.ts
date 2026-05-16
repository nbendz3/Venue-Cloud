import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masterEventsTable = pgTable("master_events", {
  id: serial("id").primaryKey(),
  primaryContactId: integer("primary_contact_id"),
  masterEventName: text("master_event_name").notNull(),
  groupMasterAccount: text("group_master_account"),
  masterEventType: text("master_event_type"),
  marketType: text("market_type"),
  referralType: text("referral_type"),
  owner: text("owner"),
  salesperson: text("salesperson"),
  masterEventNumber: text("master_event_number"),
  division: text("division"),
  paymentArrangements: text("payment_arrangements"),
  billingContactId: integer("billing_contact_id"),
  billingNotes: text("billing_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertMasterEventSchema = createInsertSchema(masterEventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMasterEvent = z.infer<typeof insertMasterEventSchema>;
export type MasterEvent = typeof masterEventsTable.$inferSelect;
