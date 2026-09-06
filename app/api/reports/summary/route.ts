import type { NextRequest } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { fail, ok } from "@/lib/http";
import {
  monthKeys,
  monthWindowStart,
  normalizeMonths,
  type ReportsSummary,
} from "@/lib/reports";

export const runtime = "nodejs";

/**
 * `GET /api/reports/summary?months=6`
 *
 * Server-side aggregates for the dashboard Reports section: current-month total
 * + per-category breakdown, an N-month spend trend, and top merchants over the
 * window. All scoped to the signed-in user (RLS + explicit `user_id` filter).
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("unauthenticated", "Authentication required.", 401);
  }

  const months = normalizeMonths(request.nextUrl.searchParams.get("months"));
  const windowStart = monthWindowStart(months);
  const keys = monthKeys(months);
  const currentKey = keys[keys.length - 1];

  const ym = sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`;
  const owned = eq(transactions.userId, user.id);
  const inWindow = and(owned, gte(transactions.occurredOn, windowStart));

  const [trendRows, categoryRows, merchantRows, currencyRows] =
    await Promise.all([
      db
        .select({
          key: ym,
          total: sql<number>`sum(${transactions.amountCents})::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(transactions)
        .where(inWindow)
        .groupBy(ym),
      db
        .select({
          category: transactions.category,
          total: sql<number>`sum(${transactions.amountCents})::int`,
        })
        .from(transactions)
        .where(and(owned, sql`${ym} = ${currentKey}`))
        .groupBy(transactions.category),
      db
        .select({
          merchantKey: transactions.merchantKey,
          merchantName: sql<string>`max(${transactions.merchantName})`,
          total: sql<number>`sum(${transactions.amountCents})::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(transactions)
        .where(inWindow)
        .groupBy(transactions.merchantKey)
        .orderBy(desc(sql`sum(${transactions.amountCents})`))
        .limit(5),
      db
        .select({
          currency: transactions.currency,
          count: sql<number>`count(*)::int`,
        })
        .from(transactions)
        .where(owned)
        .groupBy(transactions.currency)
        .orderBy(desc(sql`count(*)`))
        .limit(1),
    ]);

  const trendByKey = new Map(trendRows.map((r) => [r.key, r]));
  const trend = keys.map((key) => {
    const row = trendByKey.get(key);
    return { month: key, totalCents: row?.total ?? 0, count: row?.count ?? 0 };
  });

  const totalByCategory = new Map(
    categoryRows.map((r) => [r.category, r.total]),
  );
  const byCategory = CATEGORIES.map((category) => ({
    category,
    totalCents: totalByCategory.get(category) ?? 0,
  })).filter((r) => r.totalCents > 0);

  const current = trend[trend.length - 1];

  const summary: ReportsSummary = {
    currency: currencyRows[0]?.currency ?? "BRL",
    months,
    month: {
      key: currentKey,
      totalCents: current.totalCents,
      count: current.count,
    },
    byCategory,
    trend,
    topMerchants: merchantRows.map((r) => ({
      merchantKey: r.merchantKey,
      merchantName: r.merchantName,
      totalCents: r.total,
      count: r.count,
    })),
  };

  return ok(summary);
}
