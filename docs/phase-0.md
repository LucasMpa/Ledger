# Phase 0 + Phase 1 — plan & data contracts

Owner: tech-lead. This is the contract the backend and frontend agents build against.
Scope guard: **no** queue/async, billing, multi-tenant, or image storage. Nothing from
Phase 2+ (save, list, edit, reports, CSV, PWA) lands in Phase 0/1.

---

## Next.js 16 notes (read before writing route/middleware code)

- Route Handler `params` is a **Promise**: `export async function GET(req, ctx: RouteContext<'/api/transactions/[id]'>) { const { id } = await ctx.params }`.
- `middleware.ts` is renamed **`proxy.ts`** (repo root): `export function proxy(req: NextRequest)`, `export const config = { matcher: [...] }`.
- Route Handlers are **not cached** by default; no need to opt out for our dynamic routes.
- `PageProps<'/route'>` / `LayoutProps<'/route'>` are globally available type helpers.
- Structured output from Claude: `client.messages.parse({ ..., output_config: { format: zodOutputFormat(schema) } })` → `response.parsed_output` (null on parse failure).

---

## Task breakdown — Phase 0 (Setup)

In dependency order. Tag: `[backend]` / `[frontend]` / `[shared]`.

1. `[shared]` **Env plumbing.** `.env.example` with every var (below); `lib/env.ts` — Zod-validated, fails fast at boot, exports a typed `env`. README "Environment variables" section kept in sync.
2. `[backend]` **`lib/categories.ts` — single source of truth.** Exports: `CATEGORIES` (readonly tuple of the 9 slugs), `Category` type, `categoryLabels` (slug → display label for the UI), and a `categorySchema` (`z.enum(CATEGORIES)`). Everything else imports from here.
3. `[backend]` **`lib/db/schema.ts`.** Drizzle: `categoryEnum` = `pgEnum('category', CATEGORIES)`, `sourceEnum` = `pgEnum('transaction_source', ['photo','manual'])`, tables `transactions` + `extraction_logs` (columns in this doc), indexes, RLS policies (`pgPolicy`) + `.enableRLS()`.
4. `[backend]` **`lib/db/client.ts`.** `postgres(env.DATABASE_URL)` + `drizzle()` singleton, guarded against dev HMR re-connects.
5. `[backend]` **`drizzle.config.ts`.** dialect `postgresql`, `schema: './lib/db/schema.ts'`, `out: './lib/db/migrations'`, `dbCredentials.url = DATABASE_URL`.
6. `[backend]` **First migration.** `npm run db:generate` → **review the SQL**: enums created, both tables, RLS `ENABLE` + policies present → `npm run db:migrate` against a fresh Supabase Postgres. Commit `lib/db/migrations/**`.
7. `[backend]` **Supabase clients.** `lib/supabase/server.ts` (SSR server client, cookie-bound), `lib/supabase/middleware.ts` (session-refresh helper for `proxy.ts`), `lib/auth.ts` — `getUser()` / `requireUser()` returning `{ id }` from the session.
8. `[shared]` **`proxy.ts`** (repo root). Refreshes the Supabase session; redirects unauthenticated hits on `/dashboard` and `/send-receipt` → `/login`; `/` → `/dashboard`. `config.matcher` excludes `_next`, static, `favicon`.
9. `[frontend]` **`app/layout.tsx`.** Replace create-next-app boilerplate: real `metadata` (title "Ledger"), navbar (`Dashboard` | `Send Receipt`), Tailwind base. No new CSS files.
10. `[frontend]` **`components/ui/` primitives.** `button.tsx`, `input.tsx`, `select.tsx`, `label.tsx`, `card.tsx`, `badge.tsx` — Tailwind classes only, typed props, `forwardRef` where it matters.
11. `[frontend]` **Route stubs.** `app/page.tsx` → `redirect('/dashboard')`; `app/dashboard/page.tsx` (auth-guarded, empty shell with the three section headings Reports / Transactions / Settings); `app/login/page.tsx` (minimal Supabase sign-in).
12. `[backend]` **Auth flow wiring.** `app/auth/callback/route.ts` — exchanges the Supabase code for a session and redirects to `/dashboard`. Login action in `app/login`.
13. `[shared]` **Deploy.** Supabase project provisioned (db + auth); Vercel project with all env vars; production build green; deployed URL loads the auth-gated dashboard.
14. `[shared]` **Green check.** `npm run lint && npm run typecheck && npm run build` all pass on a clean checkout. README env + data-model sections match the code.

## Task breakdown — Phase 1 (Vertical slice: one photo → JSON on screen, not saved)

1. `[backend]` **`lib/extraction/schema.ts`.** `llmExtractionSchema` (Zod, the model-facing shape — see below) and the `ExtractionResult` type.
2. `[backend]` **`lib/extraction/prompt.ts`.** `PROMPTS: Record<string, { system: string }>` keyed by `PROMPT_VERSION` (`v1` present). Prompt injects the category list from `lib/categories.ts` and states the rules: amounts as **integer cents**, date **as printed** `YYYY-MM-DD`, pick exactly one category (unsure → `other`), **never extract CPF or any personal tax ID / document number**, `confidence` is a 0–1 self-assessment.
3. `[backend]` **`lib/extraction/claude.ts`.** `extractReceipt(image: { data: string; mimeType: string }) => Promise<ExtractionResult>`. Uses the Anthropic SDK `messages.parse` with `zodOutputFormat(llmExtractionSchema)`, `model: env.EXTRACTION_MODEL`, one image block + the versioned system prompt. Maps snake_case → camelCase, derives `merchantKey`, `lowConfidence`, `model`, `promptVersion`, `latencyMs`. Throws typed errors (`ExtractionParseError`, `ExtractionUnavailableError`).
4. `[backend]` **`lib/extraction/index.ts`.** Barrel — the only import surface: `extractReceipt`, `ExtractionResult`, error types. No route/component imports `@anthropic-ai/sdk` directly.
5. `[backend]` **`lib/http.ts`.** JSON helpers: `ok(data, init?)`, `fail(code, message, status, details?)`, `zodFail(error)` → 400 envelope.
6. `[backend]` **`app/api/extract/route.ts`.** `POST` only. `export const runtime = 'nodejs'`, `export const maxDuration = 30`. Flow: `requireUser()` → parse body `{ image, mimeType }` (Zod; reject > `MAX_IMAGE_BYTES` = 6 MB decoded → 413) → `extractReceipt()` → insert one `extraction_logs` row (**no image**) → return `ExtractionResult` (200). The decoded image is a local `const`, never written to disk / DB / storage / logs.
7. `[frontend]` **`lib/api-client.ts`.** `runExtraction(file: File)` — compress with `browser-image-compression` (`maxWidthOrHeight: 1200`, `maxSizeMB: 0.3`), base64-encode (strip the `data:` prefix), `POST /api/extract`, return `ExtractionResult` or a typed error.
8. `[frontend]` **`components/receipt-capture.tsx`.** `'use client'`. `<input type="file" accept="image/*" capture="environment">`, thumbnail preview, submit button, loading + error states.
9. `[frontend]` **`components/extraction-result-card.tsx`.** Read-only render of every `ExtractionResult` field; `badge` "Low confidence" when `lowConfidence`. Amounts shown as `currency` + value/100. **No save button** (Phase 2).
10. `[frontend]` **`app/send-receipt/page.tsx`.** Auth-guarded. Two-state machine: `capture` → `review`. `review` renders `extraction-result-card` + a "Discard / start over" that returns to `capture`.
11. `[shared]` **Manual QA.** Real receipt photographed on a phone against the deployed preview → fields appear and are plausible. `lint` / `typecheck` / `build` green.

---

## Data contracts

All API JSON is **camelCase**. All money is **integer cents**. Dates without time are
`YYYY-MM-DD` strings; timestamps are ISO-8601 UTC. Auth is required on every route;
`userId` is always taken from the session, never from the body or query.

### Shared error envelope (every `/api/*` route)

```ts
type ApiError = {
  error: {
    code: string;      // stable machine string, see table
    message: string;   // human-readable, safe to surface
    details?: unknown;  // e.g. Zod flatten() on validation errors
  };
};
```

| status | code                | when |
|--------|---------------------|------|
| 400    | `invalid_request`   | body/query fails Zod validation (`details` = `flatten()`) |
| 401    | `unauthenticated`   | no valid Supabase session |
| 404    | `not_found`         | id does not exist **or** not owned by the user |
| 413    | `payload_too_large` | decoded image over `MAX_IMAGE_BYTES` |
| 422    | `extraction_failed` | model output failed schema validation / refusal |
| 502    | `llm_unavailable`   | Anthropic call errored or timed out |
| 500    | `internal`          | anything else |

---

### `POST /api/extract`

**Request body** (`application/json`):

```ts
type ExtractRequest = {
  image: string;      // base64 of the compressed image, NO "data:*;base64," prefix
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};
```

**Response `200`** — the `ExtractionResult` (below). Also writes one `extraction_logs` row.
The image is held in memory for the Anthropic call only and then discarded.

**Errors**: `401`, `400`, `413`, `422`, `502`.

---

### `ExtractionResult` (route response → review UI)

```ts
type PaymentMethod = "cash" | "credit" | "debit" | "pix" | "other";

type ExtractionResult = {
  merchant: string | null;         // as read from the receipt
  merchantKey: string | null;      // server-derived slug of merchant (lowercase, trimmed,
                                    //   diacritics stripped, non-alnum → "-"); null if no merchant
  amountCents: number | null;      // integer cents; null if not found
  currency: string;                // ISO-4217; "BRL" when the receipt doesn't say
  date: string | null;             // "YYYY-MM-DD" as printed; null if not found
  category: Category;              // exactly one of the 9; never null/empty
  paymentMethod: PaymentMethod | null;
  confidence: number;              // 0..1, model self-assessment (clamped)
  lowConfidence: boolean;          // confidence < CONFIDENCE_THRESHOLD
  model: string;                   // resolved EXTRACTION_MODEL
  promptVersion: string;           // resolved PROMPT_VERSION
  latencyMs: number;               // wall-clock of the Anthropic call
  logId: string;                   // uuid of the extraction_logs row
};
```

Server-derived fields (`merchantKey`, `lowConfidence`, `model`, `promptVersion`,
`latencyMs`, `logId`) are **not** produced by the model.

### LLM structured-output schema (`llmExtractionSchema`, model-facing)

Snake_case; this is exactly what Claude must return and what Zod validates. On validation
failure the route returns `422` and logs `parsed_ok = false`.

```ts
{
  merchant: string | null,          // store/business name; null if illegible
  amount_cents: number | null,      // INTEGER cents (e.g. R$ 12,34 → 1234); null if not found
  currency: string,                 // ISO-4217 uppercase; "BRL" if not indicated
  date: string | null,              // "YYYY-MM-DD" exactly as printed; null if not found
  category: "groceries" | "food" | "transport" | "health" | "home"
          | "leisure" | "clothing" | "services" | "other",  // required, exactly one
  payment_method: "cash" | "credit" | "debit" | "pix" | "other" | null,
  confidence: number                // 0..1 overall confidence in this extraction
}
```

Prompt rules the model is held to: never output a CPF / personal tax id / document number;
never invent a total — use `null`; category is mandatory, `other` when unsure.

---

### `GET /api/transactions`

**Query parameters** (all optional):

| param      | type / values | default | notes |
|------------|---------------|---------|-------|
| `from`     | `YYYY-MM-DD`  | –       | `occurred_on >= from` (inclusive) |
| `to`       | `YYYY-MM-DD`  | –       | `occurred_on <= to` (inclusive) |
| `category` | one of the 9; comma-separated for multiple | – | |
| `source`   | `photo` \| `manual` | – | |
| `search`   | string        | –       | case-insensitive substring on `merchant_name` |
| `limit`    | int 1–200     | `50`    | |
| `offset`   | int ≥ 0       | `0`     | |
| `sort`     | `occurredOn` \| `amountCents` \| `createdAt` | `occurredOn` | |
| `dir`      | `asc` \| `desc` | `desc` | |

**Response `200`**:

```ts
type Transaction = {
  id: string;                 // uuid
  merchantName: string;
  merchantKey: string;
  amountCents: number;        // integer cents
  currency: string;           // ISO-4217
  category: Category;
  occurredOn: string;         // "YYYY-MM-DD"
  paymentMethod: PaymentMethod | null;
  confidence: number | null;  // null for manual entries
  source: "photo" | "manual";
  createdAt: string;          // ISO-8601 UTC
};

type TransactionListResponse = {
  transactions: Transaction[];
  total: number;   // count matching the filters, ignoring limit/offset
  limit: number;
  offset: number;
};
```

**Errors**: `401`, `400`.

---

### `POST /api/transactions`

**Request body**:

```ts
type CreateTransactionBody = {
  merchantName: string;             // 1..200, trimmed, required
  amountCents: number;              // integer, > 0, required
  currency?: string;                // ISO-4217; default "BRL"
  category: Category;              // required, one of the 9
  occurredOn: string;              // "YYYY-MM-DD", required; not in the future
  paymentMethod?: PaymentMethod | null;
  confidence?: number | null;      // 0..1; carried from ExtractionResult when source = "photo"
  source: "photo" | "manual";      // required
};
```

`userId` is set from the session. `merchantKey` is derived server-side (same slug rule as
extraction). `confidence` is forced to `null` when `source = "manual"`.

**Response `201`**: `{ transaction: Transaction }`.

**Errors**: `401`, `400`.

---

### `PATCH /api/transactions/[id]`

Partial update of user-editable fields. At least one key required.

```ts
type UpdateTransactionBody = Partial<{
  merchantName: string;      // 1..200
  amountCents: number;       // integer, > 0
  currency: string;          // ISO-4217
  category: Category;
  occurredOn: string;        // "YYYY-MM-DD", not in the future
  paymentMethod: PaymentMethod | null;
}>;
```

`source`, `confidence`, `userId`, `id`, `createdAt` are **not** editable. `merchantKey` is
re-derived if `merchantName` changes.

**Response `200`**: `{ transaction: Transaction }`.
**Errors**: `401`, `400`, `404` (unknown id or not owned).

### `DELETE /api/transactions/[id]`

No body. **Response `200`**: `{ ok: true, id: string }`.
**Errors**: `401`, `404`.

---

## Database columns

pgEnums (created in migration 1): `category` = the 9 slugs from `lib/categories.ts`;
`transaction_source` = `('photo','manual')`.

### `transactions`

| column          | type                 | null | default              | notes |
|-----------------|----------------------|------|----------------------|-------|
| `id`            | `uuid`               | no   | `gen_random_uuid()`  | PK |
| `user_id`       | `uuid`               | no   | –                    | FK → `auth.users(id)` `ON DELETE CASCADE` |
| `merchant_name` | `text`               | no   | –                    | 1..200 chars (app-validated) |
| `merchant_key`  | `text`               | no   | –                    | derived slug, used for grouping |
| `amount_cents`  | `integer`            | no   | –                    | `CHECK (amount_cents > 0)` |
| `currency`      | `text`               | no   | `'BRL'`              | `CHECK (char_length(currency) = 3)` |
| `category`      | `category` (enum)    | no   | –                    | |
| `occurred_on`   | `date`               | no   | –                    | receipt date, no time, no TZ shift |
| `payment_method`| `text`               | yes  | `null`               | one of the `PaymentMethod` set |
| `confidence`    | `real`               | yes  | `null`               | 0..1; `null` for manual entries |
| `source`        | `transaction_source` | no   | –                    | |
| `created_at`    | `timestamptz`        | no   | `now()`              | UTC |

Indexes: `(user_id, occurred_on DESC)`, `(user_id, category)`, `(user_id, merchant_key)`.
RLS: **enabled**. Policies (`FOR ALL` / per-command, `TO authenticated`):
`USING (user_id = auth.uid())` and `WITH CHECK (user_id = auth.uid())`.

### `extraction_logs`

Accuracy / cost measurement. **Never stores the image.**

| column           | type          | null | default             | notes |
|------------------|---------------|------|---------------------|-------|
| `id`             | `uuid`        | no   | `gen_random_uuid()` | PK |
| `user_id`        | `uuid`        | no   | –                   | FK → `auth.users(id)` `ON DELETE CASCADE` |
| `raw_llm_json`   | `jsonb`       | no   | –                   | model output only (no image, no CPF) |
| `parsed_ok`      | `boolean`     | no   | `true`              | `false` when schema validation failed |
| `error_code`     | `text`        | yes  | `null`              | set when `parsed_ok = false` or the call errored |
| `model`          | `text`        | no   | –                   | resolved `EXTRACTION_MODEL` |
| `prompt_version` | `text`        | no   | –                   | resolved `PROMPT_VERSION` |
| `confidence`     | `real`        | yes  | `null`              | model self-assessment |
| `latency_ms`     | `integer`     | no   | –                   | wall-clock of the Anthropic call |
| `created_at`     | `timestamptz` | no   | `now()`             | UTC |

Index: `(user_id, created_at DESC)`. RLS: **enabled**, same `user_id = auth.uid()` policy.
(README's data-model block lists the original subset — update it to match these columns.)

---

## Environment variables

| var | required | default | used by |
|-----|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL`      | yes | – | supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | – | supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY`     | yes | – | server-only admin ops |
| `DATABASE_URL`                  | yes | – | Drizzle client + `drizzle-kit` |
| `ANTHROPIC_API_KEY`            | yes | – | `lib/extraction/claude.ts` |
| `EXTRACTION_MODEL`             | no  | `claude-sonnet-5` | extraction |
| `CONFIDENCE_THRESHOLD`         | no  | `0.7` | `lowConfidence` flag |
| `PROMPT_VERSION`              | no  | `v1`  | prompt selection + log |

`lib/env.ts` validates all of these with Zod at startup and throws on a missing/invalid
required var. `.env.example` mirrors this table.

---

## Definition of done — Phase 0

- `npm run lint`, `npm run typecheck`, `npm run build` all pass on a clean checkout.
- `.env.example` lists every var; `lib/env.ts` fails fast when a required one is missing/invalid.
- First Drizzle migration is committed under `lib/db/migrations/` and `npm run db:migrate`
  applies cleanly to a fresh Supabase Postgres.
- `transactions` and `extraction_logs` exist with exactly the columns above, the `category`
  and `transaction_source` pgEnums, the listed indexes, and **RLS enabled** with
  `user_id = auth.uid()` policies — all in migration 1.
- The 9 categories exist only in `lib/categories.ts`; `lib/db/schema.ts` builds the pgEnum
  from that tuple (no second hand-written list).
- Supabase Auth works end to end: sign in via `/login`; `proxy.ts` bounces an
  unauthenticated visitor off `/dashboard` and `/send-receipt`; `/` → `/dashboard`.
- App deploys to Vercel with all env vars set; the deployed URL serves the auth-gated
  (empty) dashboard.
- No `/api/extract`, no transaction logic, no receipt persistence anywhere (no storage
  bucket, no image column, no base64 in any table or log).
- Tailwind only: no new `.css` beyond `app/globals.css`; `components/ui/` holds the primitives.
- README "Environment variables" and "Data model" sections match the code.

---

## Review checklist — grading backend / frontend output against the invariants

**Money / dates / currency**
- [ ] Every amount is integer cents end to end — no floats, no `toFixed` arithmetic on money, DB column is `integer`. `/100` happens only at display.
- [ ] `occurred_on` is a `date` (no time). Receipt dates parsed as `YYYY-MM-DD` UTC, never `new Date("...")` in local TZ.
- [ ] `created_at` is `timestamptz`, written/read as UTC.
- [ ] `currency` column present, non-null, default `BRL`; no hard-coded `R$` in the API layer.

**Tenancy**
- [ ] Every table has `user_id`; RLS policies (`user_id = auth.uid()`) are in migration 1.
- [ ] `user_id` comes from the Supabase session only — never request body or query string.
- [ ] Every DB read/write also filters by `user_id` in application code.
- [ ] `PATCH`/`DELETE` on someone else's id returns `404`, not `403`/`500`.

**Categories**
- [ ] `groceries food transport health home leisure clothing services other` appear only in `lib/categories.ts`. No inline category literals, no duplicate list in Zod/UI/prompt.
- [ ] pgEnum, Zod schema, UI `<select>`, and the prompt all import that module.
- [ ] LLM output validated against the enum; unknown/empty → `other`.

**Extraction / image**
- [ ] All extraction goes through `extractReceipt()`. No `new Anthropic()`, model id, or prompt text in a route or component.
- [ ] `EXTRACTION_MODEL`, `CONFIDENCE_THRESHOLD`, `PROMPT_VERSION` read from `env`, not literals. Prompt is versioned and keyed by `PROMPT_VERSION`.
- [ ] Image is received in memory, passed to `extractReceipt`, then out of scope. Grep shows no `writeFile`, `fs.`, `supabase.storage`, image column, or image logging.
- [ ] `extraction_logs.raw_llm_json` holds model output only. No CPF / personal tax id in the schema, prompt output contract, or any stored row.
- [ ] One `extraction_logs` row written per `/api/extract` call (including failures, with `parsed_ok = false`).

**API shape**
- [ ] Field names, casing (camelCase JSON), status codes, and the error envelope match this doc.
- [ ] Zod is the single validator for each payload; shared types re-used (no parallel `interface` redefinitions of SDK/DB shapes).
- [ ] `GET /api/transactions` honours every filter + `limit`/`offset`/`sort`/`dir` and returns `total`.

**Frontend**
- [ ] Tailwind only — no component-level `.css`/`.scss`, no CSS-in-JS, no inline `<style>`. UI composed from `components/ui/`.
- [ ] `'use client'` only where interactivity requires it; pages are Server Components otherwise.
- [ ] Routes: `/dashboard`, `/send-receipt`, `/login`; `proxy.ts` guards the first two; `/` redirects.
- [ ] `browser-image-compression` runs before upload (~1200px, <300KB); base64 has no `data:` prefix.

**Process**
- [ ] Changes are small and focused; `lint` / `typecheck` / `build` green.
- [ ] README env + data-model sections kept in sync.
- [ ] Nothing from Phase 2+ (save form, list UI, edit/delete, reports, CSV, PWA, queue) merged early.
