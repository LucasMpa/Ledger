import type { Category } from "@/lib/categories";

/**
 * Shared types + helpers for the `/api/reports/summary` contract. Client- and
 * server-safe (no env, no db imports).
 */

export const REPORTS_MONTHS_DEFAULT = 6;
export const REPORTS_MONTHS_MAX = 24;

export interface ReportsSummary {
  /** Dominant currency across the user's transactions (most frequent). */
  currency: string;
  /** Size of the trend window in months. */
  months: number;
  /** Totals for the current (latest) month in the window. */
  month: { key: string; totalCents: number; count: number };
  /** Current-month spend per category, non-zero only, in `CATEGORIES` order. */
  byCategory: { category: Category; totalCents: number }[];
  /** One entry per month in the window, chronological, zero-filled. */
  trend: { month: string; totalCents: number; count: number }[];
  /** Highest-spend merchants across the whole window (max 5). */
  topMerchants: {
    merchantKey: string;
    merchantName: string;
    totalCents: number;
    count: number;
  }[];
}

/** Clamp a raw `?months=` value to `[1, REPORTS_MONTHS_MAX]`, else the default. */
export function normalizeMonths(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= REPORTS_MONTHS_MAX
    ? n
    : REPORTS_MONTHS_DEFAULT;
}

/** First day (`YYYY-MM-01`, UTC) of the month `months - 1` back from now. */
export function monthWindowStart(months: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );
  return d.toISOString().slice(0, 10);
}

/** `YYYY-MM` keys for the window, oldest first, ending at the current month. */
export function monthKeys(months: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}
