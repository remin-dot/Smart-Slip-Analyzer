"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { BarChart } from "./bar-chart";
import { DonutChart } from "./donut-chart";
import { HealthScoreCard } from "./health-score-card";
import { InsightsPanel } from "./insights-panel";
import { TrendChart } from "./trend-chart";

type DashboardData = {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    monthIncome: number;
    monthExpense: number;
    monthBalance: number;
    savingRate: number;
    txCount: number;
    monthTxCount: number;
    profileIncome: number;
    profileSavingGoal: number;
    currency: string;
  };
  monthlyExpenses: { month: string; income: number; expense: number }[];
  categorySpending: { name: string; amount: number; color: string }[];
  spendingTrend: { date: string; amount: number }[];
  recentTransactions: {
    id: string;
    merchant: string;
    amount: number;
    type: string;
    occurredAt: string;
    category: { name: string; color: string } | null;
  }[];
};

export function AnalyticsDashboard() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-teal" size={32} />
          <p className="mt-3 text-sm font-bold text-muted">{t("dash.loading")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel grid min-h-[300px] place-items-center p-8 text-center">
        <p className="font-black text-ink">{t("dash.loadError")}</p>
      </div>
    );
  }

  const { summary: s } = data;
  const cur = s.currency;
  const money = (n: number) => formatCurrency(n, cur);

  return (
    <div className="grid gap-5">
      {/* Health Score */}
      <HealthScoreCard />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("dash.totalIncome")}
          value={money(s.totalIncome)}
          sub={`${money(s.monthIncome)} ${t("dash.thisMonth")}`}
          icon={<TrendingUp size={20} />}
          iconBg="bg-mint/10"
          iconColor="text-mint"
          trend={s.monthIncome > 0 ? "up" : undefined}
        />
        <KpiCard
          label={t("dash.totalExpenses")}
          value={money(s.totalExpense)}
          sub={`${money(s.monthExpense)} ${t("dash.thisMonth")}`}
          icon={<TrendingDown size={20} />}
          iconBg="bg-coral/10"
          iconColor="text-coral"
          trend={s.monthExpense > 0 ? "down" : undefined}
        />
        <KpiCard
          label={t("dash.balance")}
          value={money(s.balance)}
          sub={`${s.balance >= 0 ? "+" : ""}${money(s.monthBalance)} ${t("dash.thisMonth")}`}
          icon={<Wallet size={20} />}
          iconBg="bg-ocean/10"
          iconColor="text-ocean"
          trend={s.monthBalance >= 0 ? "up" : "down"}
        />
        <KpiCard
          label={t("dash.savingRate")}
          value={`${s.savingRate}%`}
          sub={s.savingRate >= 20 ? t("dash.healthySavings") : s.savingRate > 0 ? t("dash.belowTarget") : t("dash.noIncome")}
          icon={<PiggyBank size={20} />}
          iconBg={s.savingRate >= 20 ? "bg-mint/10" : "bg-amber/10"}
          iconColor={s.savingRate >= 20 ? "text-mint" : "text-amber"}
          trend={s.savingRate >= 20 ? "up" : s.savingRate > 0 ? "down" : undefined}
        />
      </div>

      {/* Charts row 1: monthly + donut */}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel p-5">
          <div className="mb-5">
            <p className="eyebrow">{t("dash.last6mo")}</p>
            <h3 className="mt-1 text-xl font-black">{t("dash.monthlyIncomeVsExpenses")}</h3>
          </div>
          {data.monthlyExpenses.some((d) => d.income > 0 || d.expense > 0) ? (
            <BarChart data={data.monthlyExpenses} currency={cur} />
          ) : (
            <EmptyChart message={t("dash.noData6mo")} />
          )}
        </article>

        <article className="panel p-5">
          <div className="mb-5">
            <p className="eyebrow">{t("dash.allTime")}</p>
            <h3 className="mt-1 text-xl font-black">{t("dash.spendingByCategory")}</h3>
          </div>
          {data.categorySpending.length > 0 ? (
            <DonutChart data={data.categorySpending} currency={cur} />
          ) : (
            <EmptyChart message={t("dash.noCategorized")} />
          )}
        </article>
      </div>

      {/* Chart row 2: spending trend */}
      <article className="panel p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="eyebrow">{t("dash.last30")}</p>
            <h3 className="mt-1 text-xl font-black">{t("dash.spendingTrend")}</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-ink">
              {money(data.spendingTrend.reduce((sum, d) => sum + d.amount, 0))}
            </p>
            <p className="text-xs font-bold text-muted">{t("dash.totalSpent")}</p>
          </div>
        </div>
        <TrendChart data={data.spendingTrend} currency={cur} />
      </article>

      {/* AI Insights */}
      <InsightsPanel />

      {/* Recent transactions */}
      <article className="panel p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">{t("dash.recentActivity")}</p>
            <h3 className="mt-1 text-xl font-black">{t("dash.latestTransactions")}</h3>
          </div>
          <a
            className="text-sm font-extrabold text-teal hover:underline"
            href="/transactions"
          >
            {t("dash.viewAll")}
          </a>
        </div>
        {data.recentTransactions.length > 0 ? (
          <div className="grid gap-2">
            {data.recentTransactions.map((tx) => {
              const isIncome = tx.type === "INCOME";
              const date = new Date(tx.occurredAt);
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tx.category?.color ?? "#d1d5db" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{tx.merchant}</p>
                    <p className="text-xs text-muted">
                      {tx.category?.name ?? t("dash.uncategorized")} &middot;{" "}
                      {date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className={`shrink-0 font-black ${isIncome ? "text-mint" : "text-ink"}`}>
                    {isIncome ? "+" : "-"}{money(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyChart message={t("dash.noTx")} />
        )}
      </article>

      {/* Stats footer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox label={t("dash.totalTransactions")} value={String(s.txCount)} />
        <StatBox label={t("dash.thisMonthCount")} value={String(s.monthTxCount)} />
        <StatBox label={t("dash.profileSavingGoal")} value={money(s.profileSavingGoal)} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  currency,
  sub,
  icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string;
  value: string;
  currency?: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down";
}) {
  return (
    <article className="panel flex items-start justify-between p-5">
      <div>
        <p className="text-sm font-bold text-muted">{label}</p>
        <p className="mt-2 text-2xl font-black text-ink leading-tight">
          {value}
          {currency && <span className="ml-1 text-sm font-bold text-muted">{currency}</span>}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-xs font-bold">
          {trend === "up" && <ArrowUpRight size={13} className="text-mint" />}
          {trend === "down" && <ArrowDownRight size={13} className="text-coral" />}
          <span className={trend === "up" ? "text-mint" : trend === "down" ? "text-coral" : "text-muted"}>
            {sub}
          </span>
        </p>
      </div>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${iconBg} ${iconColor}`}>
        {icon}
      </div>
    </article>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel flex items-center justify-between p-4">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="text-lg font-black text-ink">{value}</span>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid min-h-[160px] place-items-center rounded-lg bg-slate-50 text-center">
      <p className="text-sm font-bold text-muted">{message}</p>
    </div>
  );
}
