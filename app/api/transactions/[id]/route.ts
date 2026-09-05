import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions, type NewTransaction } from "@/lib/db/schema";
import { fail, ok, zodFail } from "@/lib/http";
import { merchantSlug } from "@/lib/slug";
import { toTransactionDto, zTransactionUpdate } from "@/lib/transactions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const zId = z.uuid();

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("unauthenticated", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  if (!zId.safeParse(id).success) {
    return fail("invalid_request", "Invalid transaction id.", 400);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return fail("invalid_request", "Body must be valid JSON.", 400);
  }

  const parsed = zTransactionUpdate.safeParse(rawBody);
  if (!parsed.success) return zodFail(parsed.error);
  const b = parsed.data;

  const updates: Partial<NewTransaction> = {};
  if ("merchantName" in b && b.merchantName !== undefined) {
    const key = merchantSlug(b.merchantName);
    if (!key) {
      return fail(
        "invalid_request",
        "merchantName has no usable characters for a key.",
        400,
      );
    }
    updates.merchantName = b.merchantName;
    updates.merchantKey = key;
  }
  if ("amountCents" in b && b.amountCents !== undefined) {
    updates.amountCents = b.amountCents;
  }
  if ("currency" in b && b.currency !== undefined) {
    updates.currency = b.currency;
  }
  if ("category" in b && b.category !== undefined) {
    updates.category = b.category;
  }
  if ("occurredOn" in b && b.occurredOn !== undefined) {
    updates.occurredOn = b.occurredOn;
  }
  if ("paymentMethod" in b) {
    updates.paymentMethod = b.paymentMethod ?? null;
  }

  const [row] = await db
    .update(transactions)
    .set(updates)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning();

  if (!row) return fail("not_found", "Transaction not found.", 404);
  return ok({ transaction: toTransactionDto(row) });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("unauthenticated", "Authentication required.", 401);
  }

  const { id } = await ctx.params;
  if (!zId.safeParse(id).success) {
    return fail("invalid_request", "Invalid transaction id.", 400);
  }

  const [row] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning({ id: transactions.id });

  if (!row) return fail("not_found", "Transaction not found.", 404);
  return ok({ ok: true, id: row.id });
}
