<p align="center">
  <img src="assets/ledger-logo.png" alt="Ledger" width="160" />
</p>

<h1 align="center">Ledger</h1>

<p align="center">
  Snap the receipt. Forget the spreadsheet.
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-proof%20of%20concept-orange" />
  <img alt="next.js" src="https://img.shields.io/badge/Next.js-000?logo=next.js&logoColor=white" />
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="tailwind" src="https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white" />
</p>

---

## What it is

**Ledger** is an expense-tracking webapp where the user's only job is to **send a photo of a receipt**. The backend calls an LLM (Claude, with vision) that reads the image and returns, as structured JSON, the **merchant**, **total amount**, **date**, and **category** of the expense. The entry is created automatically and feeds the monthly reports — making the expense spreadsheet unnecessary.

> **Current stage:** proof of concept (PoC) for family use (a handful of users).

---

## How it works

```
[PWA on phone]  take / pick a photo of the receipt
      │  compressed in the browser (~1200px, <300KB)
      ▼
POST /api/extract            image as base64 — NOT stored
      │  Claude (vision) → JSON { merchant, total, date, category, ... }
      ▼
Review screen                pre-filled form; the user checks / corrects
      │
      ▼
POST /api/transactions       the expense is saved; the image is discarded
      ▼
Dashboard                    reports by month, category and merchant + CSV export
```

The receipt image is **never persisted**. It only exists in memory during the extraction call and is discarded right after.

---

## Features

- 📸 **Photo capture** — from the camera or gallery; future integration with the phone's *share* button (PWA share target).
- 🤖 **Automatic extraction** — Claude identifies merchant, amount, date, and category.
- ✅ **One-step review** — the user confirms or tweaks the fields right after sending, with the paper still in hand.
- 🧠 **Assisted categorization** — the LLM always classifies into one of 9 fixed categories.
- 📊 **Reports** — monthly total, spending by category, trend over recent months, top merchants.
- 📁 **CSV export** — take the data back into a spreadsheet whenever you want.
- 📈 **Extraction log** — every LLM read is recorded (without the image) to measure accuracy and pick the most cost-effective model from data.

---

## Categories

Every transaction is classified into **one** of the 9 categories below (single source of truth in `lib/categories.ts`):

`groceries` · `food` · `transport` · `health` · `home` · `leisure` · `clothing` · `services` · `other`

The LLM never returns an empty category — when unsure, it uses `other`.

---

## Front-end routes

| Route | Description |
|---|---|
| `/dashboard` | Main panel. Sections: **Reports**, **Transactions** (list, edit, delete), and user **Settings**. |
| `/send-receipt` | **Send Receipt.** Two-state machine: *capture* (pick and send the photo) → *review* (pre-filled form → **Confirm** saves / **Discard** restarts). |

`/` redirects to `/dashboard`. The navbar and route guard live in `layout.tsx`.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript, set up as a PWA |
| Styling | Tailwind CSS (custom components in `components/ui/`) |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| ORM | Drizzle ORM |
| Validation | Zod (schema shared front/back and used to validate the LLM response) |
| Charts | Recharts |
| LLM | Anthropic API — Claude with vision |
| Hosting | Vercel + Supabase (free tier) |

---

## Project structure

```
app/
  layout.tsx               shell + navbar (Dashboard | Send Receipt) + auth guard
  page.tsx                 redirects to /dashboard
  dashboard/page.tsx       panel with Reports / Transactions / Settings sections
  send-receipt/page.tsx    capture → send → review
  api/
    extract/route.ts       POST: base64 image → Claude → JSON (nothing saved)
    transactions/route.ts  GET list · POST create · PATCH/DELETE edit
lib/
  categories.ts            the 9 categories — single source (pgEnum, Zod, <select>, prompt)
  extraction/              extractReceipt() interface + Claude implementation + Zod schema + versioned prompt
  db/                      Drizzle schema + client
components/
  ui/                      button, input, select, badge (Tailwind)
  receipt-form.tsx         review form
  reports/                 Recharts charts
assets/
  ledger-logo.png
```

---

## Data model

```
transactions
  id, user_id, merchant_name, merchant_key, amount_cents,
  currency, category, occurred_on, payment_method,
  confidence, source ('photo' | 'manual'), created_at

extraction_logs            (accuracy measurement — no image)
  id, user_id, raw_llm_json, model, prompt_version,
  confidence, latency_ms, created_at
```

Money is always stored as **integer cents**; dates in UTC; `user_id` and RLS on every table from day one.

---

## Running locally

> The project is still in the setup phase — the steps below describe the intended flow.

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (Postgres + Auth)
- An [Anthropic API](https://console.anthropic.com) key

### Steps

```bash
git clone https://github.com/<your-user>/ledger.git
cd ledger
npm install

cp .env.example .env.local   # fill in the variables below

npm run db:push              # applies the Drizzle schema to Postgres
npm run dev                  # http://localhost:3000
```

### Environment variables

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Anthropic
ANTHROPIC_API_KEY=

# Extraction (tunable per environment)
EXTRACTION_MODEL=claude-sonnet-5
CONFIDENCE_THRESHOLD=0.7
PROMPT_VERSION=v1
```

---

## Roadmap

| Phase | Deliverable |
|---|---|
| **0 — Setup** | Repo, Next.js + TS + Tailwind, Supabase (db + auth), Drizzle + migrations, deploy to Vercel |
| **1 — Vertical slice** | `/send-receipt`: upload one photo → `/api/extract` → JSON on screen (not saved). Measures extraction quality. |
| **2 — Confirm & save** | Review form → `/api/transactions`; transaction list; manual edit and delete |
| **3 — Reports** | `/dashboard`: monthly total, spending by category, 6-month trend, CSV export |
| **4 — PWA & polish** | Installable app, share target, client-side compression, review of `extraction_logs` to settle on a model |

End of Phase 3 = a PoC that already replaces the spreadsheet.

**Possible future work:** asynchronous processing with a queue (Inngest/QStash), reading the NFC-e QR code for structured data without the LLM, per-merchant category memory, monthly budgets.

---

## Privacy

- The **receipt image is not stored** — it is processed in memory and discarded.
- Receipts may contain a CPF (Brazilian tax ID); the LLM is instructed **not to extract** it.

---

## License

_To be defined._
