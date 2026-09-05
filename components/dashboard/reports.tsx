"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  ErrorPanel,
  LoadingPanel,
  SignInPanel,
  isUnauthenticated,
  useTransactions,
} from "@/components/dashboard/data";
import { Card } from "@/components/ui/card";
import { CATEGORIES, categoryLabels, type Category } from "@/lib/categories";

/** Stable per-category colours, legible on light and dark surfaces. */
const CATEGORY_COLORS: Record<Category, string> = {
  groceries: "#16a34a",
  food: "#f97316",
  transport: "#3b82f6",
  health: "#ef4444",
  home: "#8b5cf6",
  leisure: "#ec4899",
  clothing: "#14b8a6",
  services: "#eab308",
  other: "#6b7280",
};

function currentMonthPrefix(): string {
  // UTC year-month, e.g. "2026-09"
  return new Date().toISOString().slice(0, 7);
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function Reports() {
  const { data, error, loading, reload } = useTransactions({ limit: 200 });

  if (loading) return <LoadingPanel label="Loading reports…" />;
  if (error) {
    return isUnauthenticated(error) ? (
      <SignInPanel />
    ) : (
      <ErrorPanel error={error} onRetry={reload} />
    );
  }
  if (!data) return null;

  const monthPrefix = currentMonthPrefix();
  const monthTx = data.transactions.filter((t) =>
    t.occurredOn.startsWith(monthPrefix),
  );
  const currency = monthTx[0]?.currency ?? data.transactions[0]?.currency ?? "BRL";
  const monthTotal = monthTx.reduce((sum, t) => sum + t.amountCents, 0);

  const perCategory = CATEGORIES.map((slug) => ({
    slug,
    label: categoryLabels[slug],
    value: monthTx
      .filter((t) => t.category === slug)
      .reduce((sum, t) => sum + t.amountCents, 0),
  })).filter((row) => row.value > 0);

  if (monthTx.length === 0) {
    return (
      <Card className="text-sm text-muted">
        No transactions this month yet. Send a receipt to get started.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted">This month</p>
        <p className="text-2xl font-semibold text-foreground">
          {formatMoney(monthTotal, currency)}
        </p>
        <p className="text-xs text-muted">
          {monthTx.length} transaction{monthTx.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-44 w-full sm:w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={perCategory}
                dataKey="value"
                nameKey="label"
                innerRadius="58%"
                outerRadius="100%"
                paddingAngle={2}
                stroke="none"
              >
                {perCategory.map((row) => (
                  <Cell key={row.slug} fill={CATEGORY_COLORS[row.slug]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value), currency)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {perCategory
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((row) => (
                <tr key={row.slug}>
                  <td className="py-1">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ backgroundColor: CATEGORY_COLORS[row.slug] }}
                    />
                    {row.label}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted">
                    {monthTotal > 0
                      ? `${Math.round((row.value / monthTotal) * 100)}%`
                      : "0%"}
                  </td>
                  <td className="py-1 text-right tabular-nums font-medium">
                    {formatMoney(row.value, currency)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
