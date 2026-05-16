import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceTypesTable = pgTable("service_types", {
  id: serial("id").primaryKey(),
  functionMenuId: integer("function_menu_id").notNull(),
  serviceTypeName: text("service_type_name").notNull(), // Buffet / Food & Bev / Set Up / etc.
  useFunctionTimeRange: boolean("use_function_time_range").default(false),
  startTime: text("start_time"),
  endTime: text("end_time"),
  serviceLocation: text("service_location"),
  description: text("description"),
  serviceNotes: text("service_notes"),
  notesInternal: boolean("notes_internal").default(false),
  maxSelections: integer("max_selections"),
  displayOrder: integer("display_order").default(0),
  serviceTypeTotalCharges: numeric("service_type_total_charges", { precision: 12, scale: 2 }),
  serviceTypeTotalCost: numeric("service_type_total_cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;
export type ServiceType = typeof serviceTypesTable.$inferSelect;
