import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const additionalFeesTable = pgTable("additional_fees", {
  id: serial("id").primaryKey(),
  functionId: integer("function_id").notNull(),
  date: text("date"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  serviceFeeId: integer("service_fee_id"),
  description: text("description"),
  revenueCenterId: integer("revenue_center_id"),
  salesperson: text("salesperson"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdditionalFeeSchema = createInsertSchema(additionalFeesTable).omit({ id: true, createdAt: true });
export type InsertAdditionalFee = z.infer<typeof insertAdditionalFeeSchema>;
export type AdditionalFee = typeof additionalFeesTable.$inferSelect;
