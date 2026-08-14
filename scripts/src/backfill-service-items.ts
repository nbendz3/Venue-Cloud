/**
 * One-time backfill for existing function menu items.
 *
 * Items copied from a menu template before the fix did not inherit
 * `revenue_center_id` or `cost` from the catalog. Without those two columns:
 *
 *   - every dollar rolls up into the "Other" revenue center, so the Revenue
 *     Center Breakdown is meaningless and per-center tax cannot be applied;
 *   - every margin reads 100% because cost is zero.
 *
 * This matches existing service items back to catalog_items by name and fills
 * in the missing values. Run it MANUALLY, once, after deploying.
 *
 *   DATABASE_URL=... pnpm --filter @workspace/scripts run backfill:items
 *
 * Pass --apply to write. Without it the script reports what it would do and
 * changes nothing.
 */

import { db } from "@workspace/db";
import { serviceItemsTable, catalogItemsTable, revenueCentersTable } from "@workspace/db";
import { eq, isNull, or, and } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const [catalog, revCenters, items] = await Promise.all([
    db.select().from(catalogItemsTable),
    db.select().from(revenueCentersTable),
    db
      .select()
      .from(serviceItemsTable)
      .where(or(isNull(serviceItemsTable.revenueCenterId), isNull(serviceItemsTable.cost))),
  ]);

  const catalogByName = new Map<string, typeof catalog[number]>();
  for (const c of catalog) catalogByName.set(normalise(c.name), c);

  const defaultRc = revCenters.find((rc) => rc.isDefault === true) ?? null;

  let matched = 0;
  let unmatched = 0;
  let rcFilled = 0;
  let costFilled = 0;
  let defaulted = 0;
  const unmatchedNames = new Set<string>();

  for (const item of items) {
    const hit = catalogByName.get(normalise(item.itemName));

    const patch: Partial<typeof serviceItemsTable.$inferInsert> = {};

    if (hit) {
      matched++;
      if (item.revenueCenterId == null && hit.revenueCenterId != null) {
        patch.revenueCenterId = hit.revenueCenterId;
        rcFilled++;
      }
      if (item.cost == null && hit.cost != null) {
        patch.cost = hit.cost;
        costFilled++;
      }
    } else {
      unmatched++;
      unmatchedNames.add(item.itemName);
    }

    // Anything still without a revenue center falls back to the configured
    // default so it is at least taxed correctly.
    if (patch.revenueCenterId == null && item.revenueCenterId == null && defaultRc) {
      patch.revenueCenterId = defaultRc.id;
      defaulted++;
    }

    if (Object.keys(patch).length > 0 && APPLY) {
      await db
        .update(serviceItemsTable)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(serviceItemsTable.id, item.id));
    }
  }

  console.log(APPLY ? "APPLIED CHANGES" : "DRY RUN — pass --apply to write");
  console.log(`  service items missing data : ${items.length}`);
  console.log(`  matched to catalog by name : ${matched}`);
  console.log(`  unmatched                  : ${unmatched}`);
  console.log(`  revenue centers filled     : ${rcFilled}`);
  console.log(`  costs filled               : ${costFilled}`);
  console.log(`  fell back to default center: ${defaulted}`);

  if (!defaultRc) {
    console.log("\n  WARNING: no revenue center is flagged as default.");
    console.log("  Set one in Settings > Revenue Centers, then re-run.");
  }

  if (unmatchedNames.size > 0) {
    console.log(`\n  ${unmatchedNames.size} distinct item name(s) had no catalog match:`);
    for (const name of [...unmatchedNames].slice(0, 25)) console.log(`    - ${name}`);
    if (unmatchedNames.size > 25) console.log(`    ... and ${unmatchedNames.size - 25} more`);
    console.log("  These need a revenue center and cost set by hand, or a catalog entry added.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
