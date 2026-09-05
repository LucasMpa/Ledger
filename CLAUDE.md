@AGENTS.md

# Ledger

Proof-of-concept expense tracker for family use: photograph a receipt → Claude (vision)
extracts merchant / total / date / category as JSON → user confirms → saved. Goal: retire
the monthly expense spreadsheet. Out of scope: queue/async, billing, multi-tenant, image storage.

Stack: Next.js 16 (App Router, no `src/`, `@/*` → repo root), React 19, TypeScript strict,
Tailwind v4, Supabase (Postgres + Auth), Drizzle ORM, Zod, Anthropic SDK (vision), Recharts.

## Folder layout

- `app/` — routes: `dashboard/`, `send-receipt/`, `login/`, `api/extract/route.ts`,
  `api/transactions/route.ts`, `api/transactions/[id]/route.ts`. `proxy.ts` (repo root) = auth guard.
- `lib/` — `categories.ts`, `env.ts`, `db/` (schema, client, migrations),
  `supabase/` (server + middleware clients, auth), `extraction/` (`extractReceipt()` +
  Zod schema + versioned prompt; barrel `index.ts` is the only import surface).
- `components/` — `ui/` primitives (Tailwind only), `receipt-form.tsx`, `reports/`.
- `docs/phase-0.md` — task breakdown + full data contracts. Read before building.

## Conventions

- Files/dirs `kebab-case`; components `PascalCase` (one per file); vars/functions `camelCase`;
  DB columns `snake_case`; types `PascalCase`.
- API JSON is `camelCase`; DB is `snake_case` (Drizzle maps between them).
- Server Components by default; `'use client'` only where interactivity needs it.
- Next 16: Route Handler `params` is a Promise (`await ctx.params`, type `RouteContext<'/api/...'>`);
  middleware is `proxy.ts` (`export function proxy`, `export const config`).
- **Tailwind only** — no `.css`/`.scss` beyond `app/globals.css`, no CSS-in-JS, no inline
  `<style>`. Compose UI from `components/ui/`.

## Money / dates / currency

Money is **integer cents** everywhere (DB `integer`, API `amountCents`); divide by 100 only at
display, never do float math on money. Receipt date `occurred_on` is a `date` (no time); parse
`YYYY-MM-DD` as UTC, never local. `created_at` is `timestamptz` in **UTC**. Every transaction
has a non-null `currency` (ISO-4217, default `BRL`) — no hard-coded `R$`.

## Auth / tenancy

Every table has `user_id` and RLS (`user_id = auth.uid()`) from the first migration. `user_id`
always comes from the Supabase session — never the request body or query string. Every query
also filters by `user_id` in code (belt and suspenders).

## Categories

The 9 categories live only in `lib/categories.ts`:
`groceries` `food` `transport` `health` `home` `leisure` `clothing` `services` `other`.
That module feeds the pgEnum, the Zod schema, the UI `<select>`, and the LLM prompt. The LLM
always picks exactly one; unsure → `other`, never empty.

## Extraction / image

All extraction goes through `extractReceipt(image) => ExtractionResult` in `lib/extraction/`.
No `new Anthropic()`, model id, or prompt text in a route or component. The receipt **image is
never persisted** — it lives in memory during `/api/extract` and is discarded: no storage
bucket, no column, no logging. `extraction_logs` stores model output only (no image, no CPF).

## Env vars (`lib/env.ts`, Zod-validated at boot; mirror in `.env.example`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`DATABASE_URL`, `ANTHROPIC_API_KEY`, `EXTRACTION_MODEL` (default `claude-sonnet-5`),
`CONFIDENCE_THRESHOLD` (default `0.7`), `PROMPT_VERSION` (default `v1`).

## Migrations

`npm run db:generate` (SQL from `lib/db/schema.ts`) → review the SQL (enums + RLS included) →
`npm run db:migrate` (apply). `db:push` for throwaway local sync, `db:studio` to inspect.
Commit everything under `lib/db/migrations/`.

## Checks

`npm run lint`, `npm run typecheck`, `npm run build` must pass. Keep the README env +
data-model sections in sync. Stay inside the current roadmap phase (`docs/phase-0.md`).
