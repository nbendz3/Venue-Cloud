import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestRoomTypesTable = pgTable("guest_room_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalInventory: integer("total_inventory").default(0),
  site: text("site"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuestRoomTypeSchema = createInsertSchema(guestRoomTypesTable).omit({ id: true, createdAt: true });
export type InsertGuestRoomType = z.infer<typeof insertGuestRoomTypeSchema>;
export type GuestRoomType = typeof guestRoomTypesTable.$inferSelect;
