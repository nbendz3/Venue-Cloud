import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const functionsTable = pgTable("functions", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  functionType: text("function_type"),
  functionDate: text("function_date"),
  locationId: integer("location_id"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  setupMinutes: integer("setup_minutes"),
  teardownMinutes: integer("teardown_minutes"),
  setupStyle: text("setup_style"),
  roomRental: numeric("room_rental", { precision: 10, scale: 2 }),
  autoUpdateAttendance: boolean("auto_update_attendance").default(false),
  estimatedAttendance: integer("estimated_attendance"),
  guaranteedAttendance: integer("guaranteed_attendance"),
  setCount: integer("set_count"),
  owner: text("owner"),
  functionNumber: text("function_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const insertFunctionSchema = createInsertSchema(functionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFunction = z.infer<typeof insertFunctionSchema>;
export type EventFunction = typeof functionsTable.$inferSelect;
