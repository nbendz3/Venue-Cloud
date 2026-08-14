import { Router } from "express";
import { db } from "@workspace/db";
import { appliedRatesTable, revenueCentersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { loadRateConfig } from "../services/pricing";

const router = Router();

/**
 * Rate configuration, reported the way the pricing engine sees it.
 *
 * A service charge can live in one of two tables, and they disagree about
 * units:
 *
 *   applied_rates.rate          FRACTION   0.2200  = 22%
 *   service_fees.rate_percent   PERCENT   22.0000  = 22%
 *
 * `applied_rates` wins outright when it names a charge, which is why the
 * Service Fees dialog could read an empty `service_fees` table and announce
 * that quotes showed no service charge while every quote carried 22%. The
 * dialog was reading a table the engine had already overruled.
 *
 * The fix is not to teach the dialog the precedence rules - that just moves
 * the same guess somewhere else. `GET /rate-config/effective` asks
 * `loadRateConfig()` itself what it will charge, so the screen cannot drift
 * from the invoice.
 */

/** The four policy labels share this table but are names, not rates. */
const POLICY_LABELS = new Set([
  "gratuity and sales tax",
  "sales tax only",
  "gratuity only",
  "none",
]);

const isPolicyLabel = (name: string) => POLICY_LABELS.has(name.trim().toLowerCase());

/** Display only. The engine works in fractions; humans read percents. */
const toPercent = (fraction: number) => Math.round(fraction * 1_000_000) / 10_000;

interface EffectiveCharge {
  name: string;
  ratePercent: number;
  isGratuity: boolean;
  isTaxable: boolean;
  scope: string;
  /** Present when the charge came from applied_rates, so the UI can edit it. */
  appliedRateId: number | null;
}

// GET /rate-config/effective
router.get("/rate-config/effective", async (req, res) => {
  try {
    const [config, appliedRates, revCenters] = await Promise.all([
      loadRateConfig(),
      db.select().from(appliedRatesTable),
      db.select().from(revenueCentersTable),
    ]);

    const activeCenters = revCenters.filter((rc) => rc.isActive !== false);

    // Ask the engine per centre, plus the unassigned case, because a charge
    // may be scoped to a single revenue centre.
    const scopes: Array<{ id: number | null; label: string }> = [
      ...activeCenters.map((rc) => ({ id: rc.id as number | null, label: rc.name })),
      { id: null, label: "Unassigned" },
    ];

    const appliedByName = new Map<string, (typeof appliedRates)[number]>();
    for (const r of appliedRates) {
      if (r.rate != null && !isPolicyLabel(r.name)) {
        appliedByName.set(r.name.trim().toLowerCase(), r);
      }
    }

    // key -> the scopes it applies to, so an identical charge across every
    // centre collapses to one row instead of ten.
    const seen = new Map<string, { charge: Omit<EffectiveCharge, "scope">; scopes: string[] }>();

    for (const scope of scopes) {
      for (const fee of config.feesForRevenueCenter(scope.id)) {
        const source = appliedByName.get(fee.name.trim().toLowerCase());
        const key = `${fee.name.trim().toLowerCase()}|${fee.rate}|${fee.isTaxable}`;
        const entry = seen.get(key);
        if (entry) {
          entry.scopes.push(scope.label);
        } else {
          seen.set(key, {
            charge: {
              name: fee.name,
              ratePercent: toPercent(fee.rate),
              isGratuity: fee.isGratuity,
              isTaxable: fee.isTaxable,
              appliedRateId: source?.id ?? null,
            },
            scopes: [scope.label],
          });
        }
      }
    }

    const charges: EffectiveCharge[] = [];
    for (const { charge, scopes: applies } of seen.values()) {
      if (applies.length === scopes.length) {
        charges.push({ ...charge, scope: "All revenue centres" });
      } else {
        for (const label of applies) charges.push({ ...charge, scope: label });
      }
    }

    const source: "applied_rates" | "service_fees" | "none" =
      charges.length === 0
        ? "none"
        : charges.some((c) => c.appliedRateId != null)
          ? "applied_rates"
          : "service_fees";

    res.json({ source, charges, warnings: config.warnings });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Could not load rate configuration" });
  }
});

/* -------------------------------------------------------------------------- */
/* applied_rates CRUD                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Validates and converts in one place.
 *
 * The client speaks percents because that is what a salesperson types. The
 * column stores a fraction. Doing the divide anywhere other than here is how
 * a 22% gratuity becomes 2,200%.
 */
function parseRate(body: Record<string, unknown>): { name: string; rate: string; revenueCenterId: number | null } | string {
  const name = String(body.name ?? "").trim();
  if (!name) return "name is required";
  if (isPolicyLabel(name)) {
    return `"${name}" is a policy label, not a rate. Pick a different name, such as "Standard Service Charge".`;
  }

  const percent = Number(body.ratePercent);
  if (!Number.isFinite(percent)) return "ratePercent must be a number";
  if (percent < 0 || percent > 100) return "ratePercent must be between 0 and 100";

  const raw = body.revenueCenterId;
  const revenueCenterId =
    raw === null || raw === undefined || raw === "" ? null : Number(raw);
  if (revenueCenterId !== null && !Number.isInteger(revenueCenterId)) {
    return "revenueCenterId must be a whole number or empty";
  }

  return { name, rate: (percent / 100).toFixed(4), revenueCenterId };
}

// GET /applied-rates - rows that are real rates, not the policy labels.
router.get("/applied-rates", async (req, res) => {
  try {
    const rows = await db.select().from(appliedRatesTable).orderBy(appliedRatesTable.id);
    res.json(
      rows
        .filter((r) => r.rate != null && !isPolicyLabel(r.name))
        .map((r) => ({
          id: r.id,
          name: r.name,
          ratePercent: toPercent(Number(r.rate)),
          revenueCenterId: r.revenueCenterId,
          isActive: r.isActive,
        }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to load applied rates" });
  }
});

// POST /applied-rates
router.post("/applied-rates", async (req, res) => {
  try {
    const parsed = parseRate(req.body ?? {});
    if (typeof parsed === "string") { res.status(400).json({ error: parsed }); return; }
    const [created] = await db
      .insert(appliedRatesTable)
      .values({ ...parsed, isActive: req.body?.isActive !== false })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create applied rate" });
  }
});

// PUT /applied-rates/:id
router.put("/applied-rates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = parseRate(req.body ?? {});
    if (typeof parsed === "string") { res.status(400).json({ error: parsed }); return; }

    const [existing] = await db.select().from(appliedRatesTable).where(eq(appliedRatesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (isPolicyLabel(existing.name)) {
      res.status(400).json({ error: `"${existing.name}" is a policy label and cannot be edited as a rate.` });
      return;
    }

    const [updated] = await db
      .update(appliedRatesTable)
      .set({ ...parsed, isActive: req.body?.isActive !== false })
      .where(eq(appliedRatesTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update applied rate" });
  }
});

// DELETE /applied-rates/:id
router.delete("/applied-rates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(appliedRatesTable).where(eq(appliedRatesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (isPolicyLabel(existing.name)) {
      res.status(400).json({ error: `"${existing.name}" is a policy label used by line items and cannot be deleted here.` });
      return;
    }
    await db.delete(appliedRatesTable).where(eq(appliedRatesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete applied rate" });
  }
});

export default router;
