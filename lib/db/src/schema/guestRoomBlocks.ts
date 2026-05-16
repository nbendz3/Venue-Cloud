import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestRoomBlocksTable = pgTable("guest_room_blocks", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  blockName: text("block_name").notNull(),
  startDate: text("start_date"),
  departureDate: text("departure_date"),
  cutoffDate: text("cutoff_date"),
  site: text("site"),
  status: text("status"),
  contracted: integer("contracted"),
  blocked: integer("blocked"),
  forecast: integer("forecast"),
  pickup: integer("pickup"),
  numRooms: integer("num_rooms"),
  avgRate: numeric("avg_rate", { precision: 10, scale: 2 }),
  total: numeric("total", { precision: 12, scale: 2 }),
  contactId: integer("contact_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuestRoomBlockSchema = createInsertSchema(guestRoomBlocksTable).omit({ id: true, createdAt: true });
export type InsertGuestRoomBlock = z.infer<typeof insertGuestRoomBlockSchema>;
export type GuestRoomBlock = typeof guestRoomBlocksTable.$inferSelect;
