"use client";

import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import {
  ErrorPanel,
  LoadingPanel,
  SignInPanel,
  isUnauthenticated,
  useTransactions,
} from "@/components/dashboard/data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ApiError,
  deleteTransaction,
  updateTransaction,
} from "@/lib/api-client";
import { CATEGORIES, type Category } from "@/lib/categories";
// Leaf import, not the `@/lib/extraction` barrel (which drags in `lib/env.ts`).
import { PAYMENT_METHODS } from "@/lib/extraction/schema";
import { todayUtc, type TransactionDto } from "@/lib/transactions";

function formatMoney(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

export function TransactionList() {
  const t = useTranslations("transactions");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const { data, error, loading, reload } = useTransactions({ limit: 50 });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [rowError, setRowError] = React.useState<string | null>(null);
  // Optimistic local overlays on top of the fetched list.
  const [deletedIds, setDeletedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [edits, setEdits] = React.useState<Record<string, TransactionDto>>({});

  if (loading) return <LoadingPanel label={t("loading")} />;
  if (error) {
    return isUnauthenticated(error) ? (
      <SignInPanel />
    ) : (
      <ErrorPanel error={error} onRetry={reload} />
    );
  }

  const rows = (data?.transactions ?? [])
    .filter((tx) => !deletedIds.has(tx.id))
    .map((tx) => edits[tx.id] ?? tx);

  if (rows.length === 0) {
    return <Card className="text-sm text-muted">{t("empty")}</Card>;
  }

  const confirmTarget = rows.find((tx) => tx.id === confirmingId) ?? null;

  async function handleDelete(id: string) {
    setRowError(null);
    setDeletedIds((current) => new Set(current).add(id));
    try {
      await deleteTransaction(id);
    } catch (err) {
      setDeletedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setRowError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("errDelete"),
      );
    }
  }

  async function handleSave(id: string, patch: EditPatch) {
    setRowError(null);
    try {
      const { transaction } = await updateTransaction(id, patch);
      setEdits((current) => ({ ...current, [id]: transaction }));
      setEditingId(null);
    } catch (err) {
      setRowError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("errSave"),
      );
    }
  }

  return (
    <Card className="flex flex-col divide-y divide-border p-0">
      {rowError && (
        <p
          className="px-4 py-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {rowError}
        </p>
      )}
      {rows.map((tx) =>
        editingId === tx.id ? (
          <EditRow
            key={tx.id}
            tx={tx}
            onCancel={() => setEditingId(null)}
            onSave={(patch) => handleSave(tx.id, patch)}
          />
        ) : (
          <div
            key={tx.id}
            className="flex items-center gap-3 px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {tx.merchantName}
              </p>
              <p className="text-xs text-muted">
                {tCat(tx.category)} · {formatDate(tx.occurredOn, locale)}
              </p>
            </div>
            <span className="shrink-0 tabular-nums font-medium">
              {formatMoney(tx.amountCents, tx.currency, locale)}
            </span>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRowError(null);
                  setEditingId(tx.id);
                }}
              >
                {t("edit")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRowError(null);
                  setConfirmingId(tx.id);
                }}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        ),
      )}
      <ConfirmDialog
        open={confirmingId !== null}
        title={t("confirmDeleteTitle")}
        description={
          confirmTarget
            ? t("confirmDeleteBody", {
                merchant: confirmTarget.merchantName,
                amount: formatMoney(
                  confirmTarget.amountCents,
                  confirmTarget.currency,
                  locale,
                ),
              })
            : null
        }
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        onConfirm={() => {
          const id = confirmingId;
          setConfirmingId(null);
          if (id) void handleDelete(id);
        }}
        onCancel={() => setConfirmingId(null)}
      />
    </Card>
  );
}

interface EditPatch {
  merchantName: string;
  amountCents: number;
  category: Category;
  occurredOn: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number] | null;
}

function EditRow({
  tx,
  onCancel,
  onSave,
}: {
  tx: TransactionDto;
  onCancel: () => void;
  onSave: (patch: EditPatch) => void;
}) {
  const t = useTranslations("transactions");
  const tCat = useTranslations("categories");
  const tPay = useTranslations("paymentMethods");
  const [merchantName, setMerchantName] = React.useState(tx.merchantName);
  const [amount, setAmount] = React.useState((tx.amountCents / 100).toFixed(2));
  const [category, setCategory] = React.useState<Category>(tx.category);
  const [occurredOn, setOccurredOn] = React.useState(tx.occurredOn);
  const [paymentMethod, setPaymentMethod] = React.useState<string>(
    tx.paymentMethod ?? "",
  );
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const today = todayUtc();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = merchantName.trim();
    const parsed = Number(amount.trim().replace(",", "."));
    if (!trimmed) {
      setLocalError(t("merchantRequired"));
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setLocalError(t("amountPositive"));
      return;
    }
    if (!occurredOn || occurredOn > today) {
      setLocalError(t("dateNotFuture"));
      return;
    }
    setLocalError(null);
    setSaving(true);
    onSave({
      merchantName: trimmed,
      amountCents: Math.round(parsed * 100),
      category,
      occurredOn,
      paymentMethod:
        paymentMethod === ""
          ? null
          : (paymentMethod as (typeof PAYMENT_METHODS)[number]),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 px-4 py-3">
      <Input
        aria-label={t("merchant")}
        value={merchantName}
        onChange={(e) => setMerchantName(e.target.value)}
        maxLength={200}
      />
      <div className="flex gap-2">
        <Input
          aria-label={t("amount")}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          aria-label={t("date")}
          type="date"
          value={occurredOn}
          max={today}
          onChange={(e) => setOccurredOn(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Select
          aria-label={t("category")}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((slug) => (
            <option key={slug} value={slug}>
              {tCat(slug)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t("paymentMethod")}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">{t("noMethod")}</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {tPay(method)}
            </option>
          ))}
        </Select>
      </div>
      {localError && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {localError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="flex-1">
          {saving ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
