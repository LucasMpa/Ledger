"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Card } from "@/components/ui/card";
import {
  ApiError,
  getReportsSummary,
  listTransactions,
  type ListTransactionsParams,
  type TransactionListResponse,
} from "@/lib/api-client";
import type { ReportsSummary } from "@/lib/reports";

interface AsyncState<T> {
  data: T | null;
  error: ApiError | Error | null;
  loading: boolean;
  reload: () => void;
}

function normalizeError(err: unknown): ApiError | Error {
  return err instanceof ApiError || err instanceof Error
    ? err
    : new Error("Failed to load.");
}

export function useTransactions(
  params: ListTransactionsParams,
): AsyncState<TransactionListResponse> {
  const key = JSON.stringify(params);
  const [nonce, setNonce] = React.useState(0);
  const [settled, setSettled] = React.useState<{
    key: string;
    nonce: number;
    data: TransactionListResponse | null;
    error: ApiError | Error | null;
  }>({ key: "", nonce: -1, data: null, error: null });

  React.useEffect(() => {
    let cancelled = false;
    listTransactions(JSON.parse(key) as ListTransactionsParams)
      .then((res) => {
        if (!cancelled) setSettled({ key, nonce, data: res, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSettled({ key, nonce, data: null, error: normalizeError(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  const fresh = settled.key === key && settled.nonce === nonce;

  return {
    data: fresh ? settled.data : null,
    error: fresh ? settled.error : null,
    loading: !fresh,
    reload,
  };
}

export function useReportsSummary(months: number): AsyncState<ReportsSummary> {
  const [nonce, setNonce] = React.useState(0);
  const [settled, setSettled] = React.useState<{
    months: number;
    nonce: number;
    data: ReportsSummary | null;
    error: ApiError | Error | null;
  }>({ months: -1, nonce: -1, data: null, error: null });

  React.useEffect(() => {
    let cancelled = false;
    getReportsSummary({ months })
      .then((res) => {
        if (!cancelled) setSettled({ months, nonce, data: res, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSettled({ months, nonce, data: null, error: normalizeError(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [months, nonce]);

  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  const fresh = settled.months === months && settled.nonce === nonce;

  return {
    data: fresh ? settled.data : null,
    error: fresh ? settled.error : null,
    loading: !fresh,
    reload,
  };
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.code === "unauthenticated";
}

export function SignInPanel() {
  const t = useTranslations("common");
  return (
    <Card className="text-sm text-muted">
      <p className="font-medium text-foreground">{t("signInToSeeData")}</p>
      <p className="mt-1">{t("sessionExpired")}</p>
      <a
        href="/login"
        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
      >
        {t("goToSignIn")}
      </a>
    </Card>
  );
}

export function ErrorPanel({
  error,
  onRetry,
}: {
  error: ApiError | Error;
  onRetry: () => void;
}) {
  const t = useTranslations("common");
  return (
    <Card className="text-sm">
      <p className="font-medium text-foreground">{t("couldntLoad")}</p>
      <p className="mt-1 text-muted">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-sm font-medium text-primary hover:underline"
      >
        {t("retry")}
      </button>
    </Card>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <Card className="text-sm text-muted" aria-busy="true">
      {label}
    </Card>
  );
}
