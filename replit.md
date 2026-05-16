# VenueCloud

A venue sales and event management system for The Pines Resort hospitality property.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/venuecloud run dev` — run the frontend (port 18371)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter router, TanStack React Query, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (one file per entity)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/venuecloud/src/` — React frontend (pages, components, layout)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation (do not edit)

## Architecture decisions

- OpenAPI-first: all endpoints defined in `openapi.yaml`, codegen produces typed hooks and schemas
- The API server handles all data enrichment (joining contact names, account names) before returning
- Recent items tracked in localStorage on the frontend
- All 10 DB tables correspond 1:1 to spec entities; foreign key joins done in route handlers
- Calendar events endpoint accepts date range + site/status/type filters

## Product

VenueCloud is a full-featured venue CRM for The Pines Resort with 11 modules:

- **Dashboard** — "My Day At A Glance" with live stats cards and overdue/today tables
- **Events** — list + calendar (month/week/day) + full detail page with 18 sections (functions, guest rooms, personnel, timeline, notes, tasks, appointments, communication history, lifecycle, attachments)
- **Event Leads** — pipeline management with probability tracking
- **Accounts** — corporate account management with full address/billing details
- **Contacts** — contact directory linked to accounts
- **Tasks** — task management with priority, overdue highlighting, bulk actions
- **Guest Rooms** — grid calendar view for room block management
- **Reports** — folder-tree report library with run/export actions
- **Settings** — accordion configuration sections

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any `openapi.yaml` change before editing routes or frontend
- The frontend uses `wouter` (not react-router) for routing
- DB numeric fields (roomRental, budget, avgRate, total) are stored as `numeric` strings in Postgres — parse with `parseFloat()` in route handlers before returning JSON

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
