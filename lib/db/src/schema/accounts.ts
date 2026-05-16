import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accountNumber: text("account_number"),
  parentAccountId: integer("parent_account_id"),
  description: text("description"),
  owner: text("owner"),
  phone: text("phone"),
  fax: text("fax"),
  website: text("website"),
  mailingAddress1: text("mailing_address_1"),
  mailingAddress2: text("mailing_address_2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  taxExempt: boolean("tax_exempt"),
  taxExemptExpDate: text("tax_exempt_exp_date"),
  taxExemptNumber: text("tax_exempt_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
