"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import {
  ErrorPanel,
  LoadingPanel,
  SignInPanel,
  isUnauthenticated,
  useReportsSummary,
} from "@/components/dashboard/data";
import { Card } from "@/components/ui/card";
import { transactionsExportHref } from "@/lib/api-client";
import { type Category } from "@/lib/categories";

/** Trend window shown on the dashboard. */
const TREND_MONTHS = 6;

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

/** "2026-04" -> localized short month, e.g. "abr." / "Apr". */
function monthLabel(key: string, locale: string): string {
  const d = new Date(`${key}-01T00:00:00Z`);
  return d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
}

export function Reports() {
  const t = useTranslations("reports");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const { data, error, loading, reload } = useReportsSummary(TREND_MONTHS);

  if (loading) return <LoadingPanel label={t("loading")} />;
  if (error) {
    return isUnauthenticated(error) ? (
      <SignInPanel />
    ) : (
      <ErrorPanel error={error} onRetry={reload} />
    );
  }
  if (!data) return null;

  const { currency, month, byCategory, trend, topMerchants } = data;
  const hasAnything =
    month.count > 0 ||
    trend.some((tr) => tr.count > 0) ||
    topMerchants.length > 0;

  if (!hasAnything) {
    return <Card className="text-sm text-muted">{t("noData")}</Card>;
  }

  const trendMax = Math.max(1, ...trend.map((tr) => tr.totalCents));
  const exportHref = transactionsExportHref();

  return (
    <div className="flex flex-col gap-4">
      {/* This month + export */}
      <Card className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t("thisMonth")}</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatMoney(month.totalCents, currency, locale)}
          </p>
          <p className="text-xs text-muted">
            {t("transactionCount", { count: month.count })}
          </p>
        </div>
        <a
          href={exportHref}
          download
          className="inline-flex shrink-0 items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
        >
          {t("exportCsv")}
        </a>
      </Card>

      {/* Category breakdown (current month) */}
      {byCategory.length > 0 ? (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-44 w-full sm:w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="totalCents"
                  nameKey="category"
                  innerRadius="58%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {byCategory.map((row) => (
                    <Cell
                      key={row.category}
                      fill={CATEGORY_COLORS[row.category]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => [
                    formatMoney(Number(value), currency, locale),
                    tCat(item?.payload?.category as Category),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {byCategory
                .slice()
                .sort((a, b) => b.totalCents - a.totalCents)
                .map((row) => (
                  <tr key={row.category}>
                    <td className="py-1">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{
                          backgroundColor: CATEGORY_COLORS[row.category],
                        }}
                      />
                      {tCat(row.category)}
                    </td>
                    <td className="py-1 text-right tabular-nums text-muted">
                      {month.totalCents > 0
                        ? `${Math.round(
                            (row.totalCents / month.totalCents) * 100,
                          )}%`
                        : "0%"}
                    </td>
                    <td className="py-1 text-right tabular-nums font-medium">
                      {formatMoney(row.totalCents, currency, locale)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {/* Spend trend */}
      <Card className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          {t("lastMonths", { count: trend.length })}
        </p>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trend.map((tr) => ({
                ...tr,
                label: monthLabel(tr.month, locale),
              }))}
              margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--color-muted)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-border)", opacity: 0.4 }}
                formatter={(value) => [
                  formatMoney(Number(value), currency, locale),
                  t("spent"),
                ]}
              />
              <Bar
                dataKey="totalCents"
                radius={[4, 4, 0, 0]}
                fill="var(--color-primary)"
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-right text-xs text-muted">
          {t("peak", { value: formatMoney(trendMax, currency, locale) })}
        </p>
      </Card>

      {/* Top merchants */}
      {topMerchants.length > 0 ? (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            {t("topMerchants", { count: trend.length })}
          </p>
          <table className="w-full text-sm">
            <tbody>
              {topMerchants.map((m) => (
                <tr key={m.merchantKey}>
                  <td className="py-1 pr-2">{m.merchantName}</td>
                  <td className="py-1 text-right tabular-nums text-muted">
                    {m.count}×
                  </td>
                  <td className="py-1 text-right tabular-nums font-medium">
                    {formatMoney(m.totalCents, currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
