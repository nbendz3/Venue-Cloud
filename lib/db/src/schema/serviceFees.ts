import { pgTable, serial, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceFeesTable = pgTable("service_fees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ratePercent: numeric("rate_percent", { precision: 6, scale: 4 }),
  isTaxable: boolean("is_taxable").default(false),
  useRevCtrRates: boolean("use_rev_ctr_rates").default(false),
  useFeeTaxRates: boolean("use_fee_tax_rates").default(false),
  salesTaxRate: numeric("sales_tax_rate", { precision: 6, scale: 4 }),
  occupancyTaxRate: numeric("occupancy_tax_rate", { precision: 6, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceFeeSchema = createInsertSchema(serviceFeesTable).omit({ id: true, createdAt: true });
export type InsertServiceFee = z.infer<typeof insertServiceFeeSchema>;
export type ServiceFee = typeof serviceFeesTable.$inferSelect;
