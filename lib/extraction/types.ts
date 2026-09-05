import type { Category } from "@/lib/categories";
import type { PaymentMethod } from "@/lib/extraction/schema";

export type { PaymentMethod };

/**
 * The `/api/extract` response, handed to the review UI. camelCase. The model
 * produces `merchant`, `amountCents` (from `amount_cents`), `currency`, `date`,
 * `category`, `paymentMethod`, `confidence`; the server derives the rest.
 */
export interface ExtractionResult {
  merchant: string | null;
  /** Server-derived slug of `merchant`; null when there is no merchant. */
  merchantKey: string | null;
  amountCents: number | null;
  currency: string;
  date: string | null;
  category: Category;
  paymentMethod: PaymentMethod | null;
  confidence: number;
  /** confidence < env.CONFIDENCE_THRESHOLD */
  lowConfidence: boolean;
  /** Resolved EXTRACTION_MODEL. */
  model: string;
  /** Resolved PROMPT_VERSION. */
  promptVersion: string;
  /** Wall-clock of the Anthropic call, ms. */
  latencyMs: number;
  /** uuid of the inserted `extraction_logs` row. */
  logId: string;
}
