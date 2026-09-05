import { z } from "zod";

import { categorySchema, type Category } from "@/lib/categories";
import { paymentMethodSchema, type PaymentMethod } from "@/lib/extraction/schema";
import type { Transaction as TransactionRow } from "@/lib/db/schema";

/**
 * Shared Zod schemas + response DTO for the /api/transactions contract. All API
 * JSON is camelCase; the DB columns are snake_case and Drizzle maps between.
 */

export const zIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** UTC "today" as YYYY-MM-DD. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

const zPastOrTodayDate = zIsoDate.refine(
  (d) => d <= todayUtc(),
  "date cannot be in the future",
);

export const zTransactionSource = z.enum(["photo", "manual"]);
export const zListSort = z.enum(["occurredOn", "amountCents", "createdAt"]);
export const zListDir = z.enum(["asc", "desc"]);

/** `GET /api/transactions` query params (already split/normalised by the route). */
export const zTransactionListQuery = z.object({
  from: zIsoDate.optional(),
  to: zIsoDate.optional(),
  categories: z.array(categorySchema).default([]),
  source: zTransactionSource.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: zListSort.default("occurredOn"),
  dir: zListDir.default("desc"),
});
export type TransactionListQuery = z.infer<typeof zTransactionListQuery>;

/** `POST /api/transactions` body. */
export const zTransactionCreate = z.object({
  merchantName: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  category: categorySchema,
  occurredOn: zPastOrTodayDate,
  paymentMethod: paymentMethodSchema.nullish(),
  confidence: z.number().min(0).max(1).nullish(),
  source: zTransactionSource,
});
export type TransactionCreateInput = z.infer<typeof zTransactionCreate>;

/** `PATCH /api/transactions/[id]` body — partial, at least one key. */
export const zTransactionUpdate = z
  .object({
    merchantName: z.string().trim().min(1).max(200),
    amountCents: z.number().int().positive(),
    currency: z.string().trim().length(3).toUpperCase(),
    category: categorySchema,
    occurredOn: zPastOrTodayDate,
    paymentMethod: paymentMethodSchema.nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, {
    message: "at least one field is required",
  });
export type TransactionUpdateInput = z.infer<typeof zTransactionUpdate>;

/** The `Transaction` shape returned by every transactions endpoint. */
export interface TransactionDto {
  id: string;
  merchantName: string;
  merchantKey: string;
  amountCents: number;
  currency: string;
  category: Category;
  occurredOn: string;
  paymentMethod: PaymentMethod | null;
  confidence: number | null;
  source: "photo" | "manual";
  createdAt: string;
}

export function toTransactionDto(row: TransactionRow): TransactionDto {
  return {
    id: row.id,
    merchantName: row.merchantName,
    merchantKey: row.merchantKey,
    amountCents: row.amountCents,
    currency: row.currency,
    category: row.category,
    occurredOn: row.occurredOn,
    paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}
