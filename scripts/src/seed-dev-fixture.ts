/**
 * Development fixture.
 *
 * Reproduces the exact shape of production event 1 / function 1 so that the
 * pricing engine can be verified against known-correct numbers:
 *
 *   7 menus, 77 service items, exactly 1 of them selected
 *   sum of ALL items      = $6,053.00   <- what the app used to bill
 *   sum of SELECTED items = $  160.00   <- what it should bill
 *
 * Safe to run repeatedly: it truncates and rebuilds only the tables it owns.
 * NEVER run this against a production database.
 */

import { db } from "@workspace/db";
import {
  eventsTable,
  functionsTable,
  locationsTable,
  revenueCentersTable,
  serviceFeesTable,
  catalogItemsTable,
  menuTemplatesTable,
  menuTemplateItemsTable,
  functionMenusTable,
  serviceTypesTable,
  serviceItemsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

if (process.env.ALLOW_DESTRUCTIVE_SEED !== "yes") {
  console.error("Refusing to run. Set ALLOW_DESTRUCTIVE_SEED=yes to confirm this is a dev database.");
  process.exit(1);
}

async function main() {
  await db.execute(
    sql`TRUNCATE TABLE service_items, service_types, function_menus, menu_template_items, menu_templates,
        catalog_items, functions, events, locations, revenue_centers, service_fees RESTART IDENTITY CASCADE`
  );

  /* ---------------------------------------------------------------- config */
  // Mirrors production: ten revenue centers, no tax rates set, none default.
  const rcNames: [string, string][] = [
    ["Rentals", "Rental"],
    ["Equipment", "Audio Visual"],
    ["Other (No Taxes or Fees)", "Other"],
    ["Alcoholic Beverage", "Food & Beverage"],
    ["Non-Alcoholic Beverage", "Food & Beverage"],
    ["Outside Services", "Service"],
    ["Labor", "Service"],
    ["Service Fees", "Service"],
    ["Room Rental", "Rental"],
    ["Food", "Food & Beverage"],
  ];
  await db.insert(revenueCentersTable).values(
    rcNames.map(([name, category]) => ({ name, category, isActive: true, isDefault: false }))
  );
  const RC_FOOD = 10;
  const RC_BEVERAGE = 4;
  const RC_RENTALS = 1;

  // service_fees intentionally left EMPTY, exactly as in production.

  await db.insert(locationsTable).values([
    { name: "Grand Ballroom", code: "GBALL", capacity: 400, site: "Main", description: "Elegant grand ballroom with chandeliers and hardwood floors" },
    { name: "Cypress Room", code: "CYP", capacity: 60, site: "Main" },
    { name: "Lakeside Terrace", code: "LKT", capacity: 250, site: "Main", description: "Scenic outdoor terrace overlooking the lake" },
  ]);

  /* ----------------------------------------------------------------- event */
  await db.insert(eventsTable).values({
    eventName: "Meridian Annual Leadership Summit",
    eventNumber: "EVT-2026-0001",
    eventType: "Conference",
    estimatedAttendance: 180,
    owner: "Sarah Johnson",
    salesperson: "Sarah Johnson",
    startDate: "2026-05-23",
    endDate: "2026-05-25",
    eventStatus: "Definite",
    site: "Main",
    eventNote: "Full property buyout for 3 nights",
  });

  await db.insert(functionsTable).values([
    {
      eventId: 1, functionType: "General Session", functionDate: "2026-05-23", locationId: 1,
      startTime: "09:00", endTime: "17:00", setupMinutes: 60, teardownMinutes: 60,
      setupStyle: "Theater", estimatedAttendance: 180, functionNumber: "FN-001",
    },
    {
      eventId: 1, functionType: "Networking Dinner", functionDate: "2026-05-23", locationId: 3,
      startTime: "19:00", endTime: "22:00", setupMinutes: 90, teardownMinutes: 45,
      setupStyle: "Reception", estimatedAttendance: 180, functionNumber: "FN-002",
    },
  ]);

  /* --------------------------------------------------------------- catalog */
  // Catalog items carry cost and revenue center; service items must inherit both.
  await db.insert(catalogItemsTable).values([
    { name: "4oz Filet Mignon with Port-Wine Demi", price: "46.00", cost: "13.20", revenueCenterId: RC_FOOD, unit: "per person", isActive: true },
    { name: "Bar Set-up", price: "350.00", cost: "40.00", revenueCenterId: RC_BEVERAGE, isActive: true },
    { name: "60\" Round Tables", price: "0.00", cost: "0.00", revenueCenterId: RC_RENTALS, isActive: true },
  ]);

  /* ----------------------------------------------- menus mirroring prod fn1 */
  // [menu name, templateId, item count, total value of all items, selected index]
  const menuSpecs: { name: string; templateId: number | null; count: number; total: number; selectedIdx: number | null; rc: number }[] = [
    { name: "Custom Menu", templateId: null, count: 0, total: 0, selectedIdx: null, rc: RC_FOOD },
    { name: "Banquet Set Up", templateId: 11, count: 25, total: 0, selectedIdx: null, rc: RC_RENTALS },
    { name: "Banquet Bar Brittany", templateId: 10, count: 4, total: 429, selectedIdx: null, rc: RC_BEVERAGE },
    { name: "Billing Instructions Brittany", templateId: 13, count: 6, total: 800, selectedIdx: null, rc: RC_FOOD },
    { name: "Billing: Event Space", templateId: 12, count: 6, total: 800, selectedIdx: null, rc: RC_RENTALS },
    { name: "Hors d'oeuvres", templateId: 4, count: 32, total: 3595, selectedIdx: 0, rc: RC_FOOD },
    // Duplicate of the same template — production really does have this twice.
    { name: "Banquet Bar Brittany", templateId: 10, count: 4, total: 429, selectedIdx: null, rc: RC_BEVERAGE },
  ];

  let stId = 0;
  for (const spec of menuSpecs) {
    const [menu] = await db
      .insert(functionMenusTable)
      .values({
        functionId: 1,
        templateId: spec.templateId,
        functionMenuName: spec.name,
        pricingType: spec.templateId === null ? "A La Carte Pricing" : "a_la_carte",
      })
      .returning();

    if (spec.count === 0) continue;

    stId += 1;
    const [st] = await db
      .insert(serviceTypesTable)
      .values({ functionMenuId: menu.id, serviceTypeName: spec.name, displayOrder: 0 })
      .returning();

    // Distribute the menu's total across its items; the first item of the
    // Hors d'oeuvres menu is the single selected one and is worth $160.
    const rows = [];
    let remaining = spec.total;
    for (let i = 0; i < spec.count; i++) {
      const isSelected = spec.selectedIdx === i;
      let price: number;
      if (isSelected) price = 160;
      else if (i === spec.count - 1) price = Math.max(0, remaining);
      else price = spec.total === 0 ? 0 : Math.round((spec.total / spec.count) * 100) / 100;
      if (!isSelected) remaining -= price;
      else remaining -= 160;

      rows.push({
        serviceTypeId: st.id,
        itemName: `${spec.name} item ${i + 1}`,
        quantity: "1.0000",
        aLaCartePrice: price.toFixed(2),
        // Production has these null — the backfill script is what populates them.
        cost: null,
        revenueCenterId: null,
        selected: isSelected,
        itemTotal: price.toFixed(2),
        quantityPrecision: "Whole",
      });
    }
    await db.insert(serviceItemsTable).values(rows);
  }

  const [{ count, sumAll, sumSelected }] = (await db.execute(sql`
    SELECT COUNT(*)::int AS count,
           COALESCE(SUM(quantity * a_la_carte_price), 0)::float AS "sumAll",
           COALESCE(SUM(CASE WHEN selected THEN quantity * a_la_carte_price ELSE 0 END), 0)::float AS "sumSelected"
    FROM service_items
  `)).rows as unknown as { count: number; sumAll: number; sumSelected: number }[];

  console.log(`Seeded. items=${count} sumAll=$${sumAll.toFixed(2)} sumSelected=$${sumSelected.toFixed(2)}`);
  if (count !== 77 || Math.abs(sumAll - 6053) > 0.01 || Math.abs(sumSelected - 160) > 0.01) {
    console.error("Fixture does not match production shape (expected 77 / 6053.00 / 160.00)");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
