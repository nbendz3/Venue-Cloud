import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const functionMenusTable = pgTable("function_menus", {
  id: serial("id").primaryKey(),
  functionId: integer("function_id").notNull(),
  templateId: integer("template_id"),
  functionMenuName: text("function_menu_name").notNull(),
  pricingType: text("pricing_type"),
  autoCalculateQuantity: boolean("auto_calculate_quantity").default(false),
  numberRequired: integer("number_required"),
  perNumberOfGuests: integer("per_number_of_guests"),
  menuQuantity: numeric("menu_quantity", { precision: 10, scale: 2 }),
  menuTotalCharges: numeric("menu_total_charges", { precision: 12, scale: 2 }),
  menuTotalCost: numeric("menu_total_cost", { precision: 12, scale: 2 }),
  useFunctionTimeRange: boolean("use_function_time_range").default(false),
  startTime: text("start_time"),
  endTime: text("end_time"),
  menuLocation: text("menu_location"),
  description: text("description"),
  menuNotes: text("menu_notes"),
  notesInternal: boolean("notes_internal").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFunctionMenuSchema = createInsertSchema(functionMenusTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFunctionMenu = z.infer<typeof insertFunctionMenuSchema>;
export type FunctionMenu = typeof functionMenusTable.$inferSelect;
