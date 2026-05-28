import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceItemsTable = pgTable("service_items", {
  id: serial("id").primaryKey(),
  serviceTypeId: integer("service_type_id").notNull(),
  itemName: text("item_name").notNull(),
  description: text("description"),
  notes: text("notes"),
  notesInternal: boolean("notes_internal").default(false),
  quantity: numeric("quantity", { precision: 10, scale: 4 }),
  autoQuantity: boolean("auto_quantity").default(false),
  aLaCartePrice: numeric("a_la_carte_price", { precision: 12, scale: 2 }),
  addOnPrice: numeric("add_on_price", { precision: 12, scale: 2 }),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  useIngredientsCost: boolean("use_ingredients_cost").default(false),
  numberRequired: integer("number_required"),
  perNumberOfGuests: integer("per_number_of_guests"),
  quantityPrecision: text("quantity_precision").default("Whole"), // Whole / Half / Quarter
  category: text("category"),
  categorySubOption: text("category_sub_option"),
  categoryIi: text("category_ii"),
  markItemInternal: boolean("mark_item_internal").default(false),
  markQuantityInternal: boolean("mark_quantity_internal").default(false),
  useFunctionTimeRange: boolean("use_function_time_range").default(false),
  startTime: text("start_time"),
  endTime: text("end_time"),
  chargeHourly: boolean("charge_hourly").default(false),
  autoHours: boolean("auto_hours").default(false),
  numHours: numeric("num_hours", { precision: 6, scale: 2 }),
  useFunctionSetupTeardown: boolean("use_function_setup_teardown").default(false),
  setupMinutes: integer("setup_minutes"),
  teardownMinutes: integer("teardown_minutes"),
  overtimeHoursPrice: numeric("overtime_hours_price", { precision: 12, scale: 2 }),
  overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }),
  hoursPrecision: text("hours_precision").default("Whole"),
  revenueCenterId: integer("revenue_center_id"),
  appliedRates: text("applied_rates"),
  sectionName: text("section_name"),
  selected: boolean("selected").default(false),
  itemTotal: numeric("item_total", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceItemSchema = createInsertSchema(serviceItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type ServiceItem = typeof serviceItemsTable.$inferSelect;
