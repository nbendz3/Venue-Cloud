---
name: Pricing engine patch
description: State of the centralized pricing engine and related caveats after applying the user's 6-patch series (Aug 2026)
---

- A user-supplied patch series made `artifacts/api-server/src/services/pricing.ts` the single source of money calculations. Rule: unconfigured rates yield $0 + warning, never invented defaults; only selected items with qty > 0 are billable.
- **Why:** four surfaces previously disagreed on totals; keep any new money display reading from this engine, never recomputing client-side.
- Known gaps (open follow-up tasks exist): engine ignores per-item `appliedRates`; OpenAPI spec is stale vs. new financials responses (frontend uses `as any` casts).
- api-server has ~58 pre-existing TS errors (missing returns, wrong column names in reports/calendar) — `pnpm run typecheck` is permanently red there; compare error counts before/after when judging new changes.
- `scripts/src/verify-pricing.ts` is destructive (wipes service fees/rates); it is guarded by `ALLOW_DESTRUCTIVE_SEED=yes` — keep that guard.
- Financial query caches: mutations affecting money must also invalidate financials query keys (pattern: predicate matching "/financials"), not just menus.
