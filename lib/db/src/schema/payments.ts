import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  relatedType: text("related_type").notNull(), // Event / Function
  relatedId: integer("related_id").notNull(),
  date: text("date"),
  paymentAmount: numeric("payment_amount", { precision: 12, scale: 2 }),
  allocatedAmount: numeric("allocated_amount", { precision: 12, scale: 2 }),
  paymentMethod: text("payment_method"), // Check / Credit Card / Cash / ACH / Wire
  paymentType: text("payment_type"), // Deposit / Payment
  description: text("description"),
  salesperson: text("salesperson"),
  creditCardId: integer("credit_card_id"),
  fromGateway: boolean("from_gateway").default(false),
  posted: boolean("posted").default(false),
  isEventPayment: boolean("is_event_payment").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
