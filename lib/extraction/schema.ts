import { z } from "zod";

import { categorySchema } from "@/lib/categories";

export const PAYMENT_METHODS = [
  "cash",
  "credit",
  "debit",
  "pix",
  "other",
] as const;

export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/**
 * The model-facing structured-output schema. Snake_case; this is exactly what
 * Claude must return and what `messages.parse` validates. On validation failure
 * the route returns 422 and logs `parsed_ok = false`. No `items`/`notes` in v1.
 */
export const llmExtractionSchema = z.object({
  merchant: z.string().nullable(),
  amount_cents: z.number().int().nullable(),
  currency: z.string().default("BRL"),
  date: isoDate.nullable(),
  category: categorySchema,
  payment_method: paymentMethodSchema.nullable(),
  confidence: z.number().min(0).max(1),
});

export type LlmExtractionOutput = z.infer<typeof llmExtractionSchema>;
