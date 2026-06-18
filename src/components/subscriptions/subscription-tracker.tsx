"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  Loader2,
  RefreshCw,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Subscription = {
  merchant: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "yearly";
  monthlyEquivalent: number;
  yearlyEquivalent: number;
  occurrences: number;
  lastPaid: string;
  avgDaysBetween: number;
  confidence: number;
  description: string | null;
  status: "active" | "possibly_unused";
};

type Summary = {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  unusedCount: number;
  unusedMonthly: number;
  incomePercent: number;
};

type Data = {
  subscriptions: Subscription[];
  summary: Summary;
  recommendations: string[];
  currency: string;
};

const FREQ_LABEL_KEY: Record<string, string> = { monthly: "sub.freqMonthly", quarterly: "sub.freqQuarterly", yearly: "sub.freqYearly" };
const FREQ_COLOR: Record<string, string> = { monthly: "#087f7a", quarterly: "#2855a3", yearly: "#cf8b21" };

export function SubscriptionTracker() {
  const { t } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/subscriptions");
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch {
      setError("__LOAD_ERROR__");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="mt-3 text-sm font-bold">{t("sub.analyzing")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-coral font-bold">{t("sub.loadError")}</p>
        <button onClick={load} className="mt-3 text-sm font-bold text-teal hover:underline">
          {t("sub.tryAgain")}
        </button>
      </div>
    );
  }

  if (!data) return null;
  const { subscriptions, summary, recommendations, currency } = data;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("sub.monthlyCost")}
          value={`${fmt(summary.totalMonthly)} ${currency}`}
          sub={t("sub.subsDetected", { n: summary.activeCount + summary.unusedCount })}
          icon={<CreditCard size={18} />}
          color="#087f7a"
        />
        <KpiCard
          label={t("sub.yearlyCost")}
          value={`${fmt(summary.totalYearly)} ${currency}`}
          sub={t("sub.ofIncome", { pct: summary.incomePercent })}
          icon={<Calendar size={18} />}
          color="#2855a3"
        />
        <KpiCard
          label={t("sub.possiblyUnused")}
          value={`${summary.unusedCount}`}
          sub={summary.unusedCount > 0 ? t("sub.saveable", { amount: fmt(summary.unusedMonthly), cur: currency }) : t("sub.allActive")}
          icon={<AlertTriangle size={18} />}
          color={summary.unusedCount > 0 ? "#d85c46" : "#20875a"}
        />
        <KpiCard
          label={t("sub.active")}
          value={`${summary.activeCount}`}
          sub={t("sub.currentlyRecurring")}
          icon={<RefreshCw size={18} />}
          color="#20875a"
        />
      </div>

      {/* Donut chart */}
      {subscriptions.length > 0 && (
        <div className="panel p-5">
          <p className="eyebrow">{t("sub.costBreakdown")}</p>
          <h3 className="mt-1 text-lg font-black text-ink">{t("sub.subscriptionShare")}</h3>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <SubscriptionDonut subscriptions={subscriptions} totalMonthly={summary.totalMonthly} currency={currency} />
            <div className="grid gap-2 text-sm">
              {subscriptions.map((sub) => {
                const pct = summary.totalMonthly > 0 ? Math.round((sub.monthlyEquivalent / summary.totalMonthly) * 100) : 0;
                return (
                  <div key={sub.merchant + sub.amount} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: subColor(sub, subscriptions.indexOf(sub)) }} />
                    <span className="font-bold text-ink">{sub.merchant}</span>
                    <span className="text-muted">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subscription list */}
      {subscriptions.length > 0 ? (
        <div className="panel divide-y">
          <div className="p-5">
            <p className="eyebrow">{t("sub.detectedSubs")}</p>
            <h3 className="mt-1 text-lg font-black text-ink">{t("sub.recurringPayments")}</h3>
          </div>
          {subscriptions.map((sub, i) => (
            <div key={sub.merchant + sub.amount + i} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg text-white font-black text-sm"
                  style={{ background: sub.status === "possibly_unused" ? "#d85c46" : FREQ_COLOR[sub.frequency] }}
                >
                  {sub.merchant.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-ink">{sub.merchant}</p>
                    {sub.status === "possibly_unused" && (
                      <span className="rounded bg-coral/10 px-2 py-0.5 text-xs font-bold text-coral">{t("sub.possiblyUnusedBadge")}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {t("sub.metaLine", { freq: t(FREQ_LABEL_KEY[sub.frequency]), count: sub.occurrences, date: new Date(sub.lastPaid).toLocaleDateString() })}
                  </p>
                  {sub.description && (
                    <p className="mt-0.5 text-xs text-muted">{sub.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right sm:flex-shrink-0">
                <div>
                  <p className="text-lg font-black text-ink">{fmt(sub.amount)} <span className="text-sm text-muted">{currency}</span></p>
                  <p className="text-xs text-muted">
                    {sub.frequency !== "monthly" && t("sub.approxMo", { amount: fmt(sub.monthlyEquivalent), cur: currency })}
                    {t("sub.perYr", { amount: fmt(sub.yearlyEquivalent), cur: currency })}
                  </p>
                </div>
                <div
                  className="grid h-8 w-8 place-items-center rounded-full"
                  style={{ background: sub.confidence >= 0.7 ? "#e8f5e9" : "#fff3e0" }}
                  title={t("sub.confidence", { pct: Math.round(sub.confidence * 100) })}
                >
                  <span className="text-xs font-bold" style={{ color: sub.confidence >= 0.7 ? "#20875a" : "#cf8b21" }}>
                    {Math.round(sub.confidence * 100)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel flex flex-col items-center justify-center p-10 text-center">
          <XCircle size={40} className="text-muted/40" />
          <p className="mt-3 text-lg font-black text-ink">{t("sub.noSubs")}</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            {t("sub.noSubsBody")}
          </p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="panel p-5">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-teal" />
            <p className="eyebrow">{t("sub.aiRecommendations")}</p>
          </div>
          <h3 className="mt-1 text-lg font-black text-ink">{t("sub.savingOpportunities")}</h3>
          <ul className="mt-3 space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-muted">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color }}>{icon}{label}</div>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

const DONUT_COLORS = ["#087f7a", "#2855a3", "#cf8b21", "#d85c46", "#20875a", "#6366f1", "#8b5cf6", "#ec4899"];

function subColor(sub: Subscription, idx: number) {
  if (sub.status === "possibly_unused") return "#d85c46";
  return DONUT_COLORS[idx % DONUT_COLORS.length];
}

function SubscriptionDonut({ subscriptions, totalMonthly, currency }: { subscriptions: Subscription[]; totalMonthly: number; currency: string }) {
  const { t } = useI18n();
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const stroke = 28;

  let cumAngle = -90;
  const arcs = subscriptions.map((sub, i) => {
    const pct = totalMonthly > 0 ? sub.monthlyEquivalent / totalMonthly : 0;
    const angle = pct * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;

    return (
      <path
        key={sub.merchant + i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={subColor(sub, i)}
        strokeWidth={stroke}
        strokeLinecap="butt"
      />
    );
  });

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {subscriptions.length === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      ) : (
        arcs
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-ink text-lg font-black">{fmt(totalMonthly)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted text-xs">{t("sub.perMoSuffix", { cur: currency })}</text>
    </svg>
  );
}
