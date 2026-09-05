import type { NextRequest } from "next/server";
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { fail, ok, zodFail } from "@/lib/http";
import { merchantSlug } from "@/lib/slug";
import {
  toTransactionDto,
  zTransactionCreate,
  zTransactionListQuery,
} from "@/lib/transactions";

export const runtime = "nodejs";

const SORT_COLUMNS = {
  occurredOn: transactions.occurredOn,
  amountCents: transactions.amountCents,
  createdAt: transactions.createdAt,
} as const;

/** Escape LIKE/ILIKE wildcards; default escape char is backslash. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

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
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    dir: sp.get("dir") ?? undefined,
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
  const where = and(...filters);

  const sortCol = SORT_COLUMNS[q.sort];
  const orderBy = q.dir === "asc" ? asc(sortCol) : desc(sortCol);

  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(orderBy, desc(transactions.id))
      .limit(q.limit)
      .offset(q.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(where),
  ]);

  return ok({
    transactions: rows.map(toTransactionDto),
    total: countRow?.count ?? 0,
    limit: q.limit,
    offset: q.offset,
  });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("unauthenticated", "Authentication required.", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return fail("invalid_request", "Body must be valid JSON.", 400);
  }

  const parsed = zTransactionCreate.safeParse(rawBody);
  if (!parsed.success) return zodFail(parsed.error);
  const body = parsed.data;

  const merchantKey = merchantSlug(body.merchantName);
  if (!merchantKey) {
    return fail(
      "invalid_request",
      "merchantName has no usable characters for a key.",
      400,
    );
  }

  const confidence =
    body.source === "manual" ? null : (body.confidence ?? null);

  const [row] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      merchantName: body.merchantName,
      merchantKey,
      amountCents: body.amountCents,
      currency: body.currency ?? "BRL",
      category: body.category,
      occurredOn: body.occurredOn,
      paymentMethod: body.paymentMethod ?? null,
      confidence,
      source: body.source,
    })
    .returning();

  return ok({ transaction: toTransactionDto(row) }, { status: 201 });
}
