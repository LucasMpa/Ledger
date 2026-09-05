import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

import { CATEGORIES } from "@/lib/categories";

/**
 * pgEnums. `category` is built from the single source of truth in
 * `lib/categories.ts` — no second hand-written list.
 */
export const categoryEnum = pgEnum("category", CATEGORIES);
export const transactionSourceEnum = pgEnum("transaction_source", [
  "photo",
  "manual",
]);

/**
 * One confirmed expense. Money is integer cents; `occurred_on` is a plain date.
 * `user_id` + RLS scope every row to its owner. (`auth.users` is managed by
 * Supabase and is referenced only — drizzle-kit's `public` schema filter keeps
 * it out of the generated DDL.)
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    merchantName: text("merchant_name").notNull(),
    merchantKey: text("merchant_key").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),
    category: categoryEnum("category").notNull(),
    occurredOn: date("occurred_on").notNull(),
    paymentMethod: text("payment_method"),
    confidence: real("confidence"),
    source: transactionSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_occurred_on_idx").on(
      t.userId,
      t.occurredOn.desc(),
    ),
    index("transactions_user_category_idx").on(t.userId, t.category),
    index("transactions_user_merchant_key_idx").on(t.userId, t.merchantKey),
    check("transactions_amount_cents_positive", sql`${t.amountCents} > 0`),
    check("transactions_currency_len", sql`char_length(${t.currency}) = 3`),
    pgPolicy("transactions_owner", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`${t.userId} = ${authUid}`,
      withCheck: sql`${t.userId} = ${authUid}`,
    }),
  ],
).enableRLS();

/**
 * Accuracy / cost log for every extraction call — one row per call, including
 * failures (`parsed_ok = false`, `error_code` set). Never stores the image.
 */
export const extractionLogs = pgTable(
  "extraction_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    rawLlmJson: jsonb("raw_llm_json").notNull(),
    parsedOk: boolean("parsed_ok").notNull().default(true),
    errorCode: text("error_code"),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    confidence: real("confidence"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("extraction_logs_user_created_at_idx").on(
      t.userId,
      t.createdAt.desc(),
    ),
    pgPolicy("extraction_logs_owner", {
      as: "permissive",
      for: "all",
      to: authenticatedRole,
      using: sql`${t.userId} = ${authUid}`,
      withCheck: sql`${t.userId} = ${authUid}`,
    }),
  ],
).enableRLS();

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type ExtractionLog = typeof extractionLogs.$inferSelect;
export type NewExtractionLog = typeof extractionLogs.$inferInsert;
