"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORIES, type Category } from "@/lib/categories";
// Import from the leaf modules, not the `@/lib/extraction` barrel: the barrel
// re-exports `claude.ts` -> `lib/env.ts`, whose top-level validation throws in
// the browser. These two leaves only pull in zod.
import { PAYMENT_METHODS } from "@/lib/extraction/schema";
import type { ExtractionResult } from "@/lib/extraction/types";
import { todayUtc } from "@/lib/transactions";

export interface ReceiptFormValues {
  merchantName: string;
  amountCents: number;
  currency: string;
  category: Category;
  occurredOn: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number] | null;
}

interface ReceiptFormProps {
  initial: ExtractionResult;
  onConfirm: (values: ReceiptFormValues) => void;
  onDiscard: () => void;
  submitting: boolean;
  error: string | null;
}

/** cents -> major-unit string, e.g. 4290 -> "42.90". */
function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/** major-unit string -> integer cents, or null when not a positive number. */
function inputToCents(value: string): number | null {
  const normalised = value.trim().replace(",", ".");
  if (!normalised) return null;
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export function ReceiptForm({
  initial,
  onConfirm,
  onDiscard,
  submitting,
  error,
}: ReceiptFormProps) {
  const t = useTranslations("receiptForm");
  const tCat = useTranslations("categories");
  const tPay = useTranslations("paymentMethods");
  const [merchantName, setMerchantName] = React.useState(initial.merchant ?? "");
  const [amount, setAmount] = React.useState(centsToInput(initial.amountCents));
  const [currency] = React.useState(initial.currency || "BRL");
  const [category, setCategory] = React.useState<Category>(initial.category);
  const [occurredOn, setOccurredOn] = React.useState(initial.date ?? "");
  const [paymentMethod, setPaymentMethod] = React.useState<string>(
    initial.paymentMethod ?? "",
  );
  const [localError, setLocalError] = React.useState<string | null>(null);

  const today = todayUtc();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedMerchant = merchantName.trim();
    if (!trimmedMerchant) {
      setLocalError(t("enterMerchant"));
      return;
    }
    const amountCents = inputToCents(amount);
    if (amountCents == null) {
      setLocalError(t("enterAmount"));
      return;
    }
    if (!occurredOn) {
      setLocalError(t("pickDate"));
      return;
    }
    if (occurredOn > today) {
      setLocalError(t("dateNotFuture"));
      return;
    }
    setLocalError(null);
    onConfirm({
      merchantName: trimmedMerchant,
      amountCents,
      currency,
      category,
      occurredOn,
      paymentMethod:
        paymentMethod === ""
          ? null
          : (paymentMethod as (typeof PAYMENT_METHODS)[number]),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {initial.lowConfidence && (
        <div>
          <Badge variant="warning">{t("lowConfidence")}</Badge>
          <p className="mt-1 text-sm text-muted">{t("lowConfidenceHint")}</p>
        </div>
      )}

      <div>
        <Label htmlFor="merchantName">{t("merchant")}</Label>
        <Input
          id="merchantName"
          value={merchantName}
          onChange={(e) => setMerchantName(e.target.value)}
          maxLength={200}
          autoComplete="off"
          required
        />
      </div>

      <div>
        <Label htmlFor="amount">{t("amount", { currency })}</Label>
        <Input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label htmlFor="occurredOn">{t("date")}</Label>
        <Input
          id="occurredOn"
          type="date"
          value={occurredOn}
          max={today}
          onChange={(e) => setOccurredOn(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">{t("category")}</Label>
        <Select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((slug) => (
            <option key={slug} value={slug}>
              {tCat(slug)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
        <Select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">{t("notSpecified")}</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {tPay(method)}
            </option>
          ))}
        </Select>
      </div>

      {(localError || error) && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {localError ?? error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? t("saving") : t("confirm")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onDiscard}
          disabled={submitting}
        >
          {t("discard")}
        </Button>
      </div>
    </form>
  );
}
