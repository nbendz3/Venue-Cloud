import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  salutation: text("salutation"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  accountId: integer("account_id"),
  title: text("title"),
  email: text("email"),
  workPhone: text("work_phone"),
  mobilePhone: text("mobile_phone"),
  homePhone: text("home_phone"),
  fax: text("fax"),
  owner: text("owner"),
  site: text("site"),
  active: boolean("active").default(true),
  department: text("department"),
  contactType: text("contact_type"),
  preferences: text("preferences"),
  birthday: text("birthday"),
  anniversary: text("anniversary"),
  information: text("information"),
  description: text("description"),
  mailingAddress1: text("mailing_address_1"),
  mailingAddress2: text("mailing_address_2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  otherAddress1: text("other_address_1"),
  otherCity: text("other_city"),
  otherState: text("other_state"),
  otherPostalCode: text("other_postal_code"),
  otherCountry: text("other_country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
