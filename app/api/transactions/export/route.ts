import type { NextRequest } from "next/server";
import { and, desc, eq, gte, ilike, inArray, lte } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { categoryLabels } from "@/lib/categories";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { fail, zodFail } from "@/lib/http";
import { zTransactionListQuery } from "@/lib/transactions";

export const runtime = "nodejs";

const HEADER = [
  "Date",
  "Merchant",
  "Category",
  "Amount",
  "Currency",
  "Payment method",
  "Source",
  "Logged at",
] as const;

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * `GET /api/transactions/export` — the signed-in user's transactions as CSV,
 * honouring the same filters as `GET /api/transactions` (no pagination).
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("unauthenticated", "Authentication required.", 401);
  }

  const sp = request.nextUrl.searchParams;
  const categoryParam = sp.get("category");
  const parsed = zTransactionListQuery.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    categories: categoryParam
      ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    source: sp.get("source") ?? undefined,
    search: sp.get("search") ?? undefined,
  });
  if (!parsed.success) return zodFail(parsed.error);
  const q = parsed.data;

  const filters = [eq(transactions.userId, user.id)];
  if (q.from) filters.push(gte(transactions.occurredOn, q.from));
  if (q.to) filters.push(lte(transactions.occurredOn, q.to));
  if (q.categories.length) {
    filters.push(inArray(transactions.category, q.categories));
  }
  if (q.source) filters.push(eq(transactions.source, q.source));
  if (q.search) {
    filters.push(ilike(transactions.merchantName, `%${escapeLike(q.search)}%`));
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...filters))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id));

  const lines = [HEADER.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.occurredOn,
        r.merchantName,
        categoryLabels[r.category],
        (r.amountCents / 100).toFixed(2),
        r.currency,
        r.paymentMethod ?? "",
        r.source,
        r.createdAt.toISOString(),
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }
  // Prepend a BOM so Excel reads UTF-8 correctly.
  const csv = `﻿${lines.join("\r\n")}\r\n`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
