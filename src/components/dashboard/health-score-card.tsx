"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type ScoreLevel = "Poor" | "Average" | "Good" | "Excellent";

type Params = Record<string, string | number>;

type ScoreFactor = {
  name: string;
  nameKey: string;
  score: number;
  maxScore: number;
  weight: number;
  level: ScoreLevel;
  descKey: string;
  descParams?: Params;
  descExtraKey?: string;
  descExtraParams?: Params;
  tipKey: string;
  tipParams?: Params;
};

type HealthScore = {
  totalScore: number;
  level: ScoreLevel;
  factors: ScoreFactor[];
  modelName: string;
};

const LEVEL_COLORS: Record<ScoreLevel, { ring: string; text: string; bg: string; badge: string }> = {
  Excellent: { ring: "#20875a", text: "text-mint", bg: "bg-mint/10", badge: "bg-mint/15 text-mint" },
  Good: { ring: "#087f7a", text: "text-teal", bg: "bg-teal/10", badge: "bg-teal/15 text-teal" },
  Average: { ring: "#cf8b21", text: "text-amber", bg: "bg-amber/10", badge: "bg-amber/15 text-amber" },
  Poor: { ring: "#d85c46", text: "text-coral", bg: "bg-coral/10", badge: "bg-coral/15 text-coral" },
};

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  "Saving Rate": <TrendingUp size={16} />,
  "Spending Habits": <Wallet size={16} />,
  "Budget Control": <Target size={16} />,
  "Expense Consistency": <Activity size={16} />,
};

const LEVEL_LABEL_KEYS: Record<ScoreLevel, string> = {
  Excellent: "health.lvExcellent",
  Good: "health.lvGood",
  Average: "health.lvAverage",
  Poor: "health.lvPoor",
};

export function HealthScoreCard() {
  const { t } = useI18n();
  const [data, setData] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/ai/health-score")
      .then((r) => r.json())
      .then((d) => { if (d.healthScore) setData(d.healthScore); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel grid min-h-[200px] place-items-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-teal" size={24} />
          <p className="mt-2 text-sm font-bold text-muted">{t("health.calculating")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel grid min-h-[180px] place-items-center p-8 text-center">
        <div>
          <ShieldCheck size={32} className="mx-auto text-muted" />
          <p className="mt-3 font-black text-ink">{t("health.noScoreTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("health.addTx")}</p>
        </div>
      </div>
    );
  }

  const colors = LEVEL_COLORS[data.level];
  const circumference = 2 * Math.PI * 54;
  const strokeDash = (data.totalScore / 100) * circumference;

  const best = data.factors.reduce((a, b) => (a.score > b.score ? a : b));
  const worst = data.factors.reduce((a, b) => (a.score < b.score ? a : b));
  const summary =
    t("health.summaryScore", { score: data.totalScore, level: t(LEVEL_LABEL_KEYS[data.level]) }) +
    (best.score > worst.score
      ? ` ${t("health.summaryAreas", { best: t(best.nameKey), worst: t(worst.nameKey) })}`
      : "");

  return (
    <article className="panel overflow-hidden">
      <div className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <p className="eyebrow">{t("health.eyebrow")}</p>
            <h3 className="mt-1 text-xl font-black">{t("health.scoreHeading")}</h3>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${colors.badge}`}>
            {t(LEVEL_LABEL_KEYS[data.level])}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Score ring */}
          <div className="relative flex-shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke={colors.ring}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
                transform="rotate(-90 70 70)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-ink">{data.totalScore}</span>
              <span className="text-[11px] font-bold text-muted">/100</span>
            </div>
          </div>

          {/* Factor bars */}
          <div className="flex-1 grid gap-3 w-full">
            {data.factors.map((factor) => {
              const factorColors = LEVEL_COLORS[factor.level];
              return (
                <div key={factor.name} className="min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={factorColors.text}>
                        {FACTOR_ICONS[factor.name] ?? <Activity size={16} />}
                      </span>
                      <span className="font-bold text-ink">{t(factor.nameKey)}</span>
                      <span className="text-[11px] font-bold text-muted">({factor.weight}%)</span>
                    </div>
                    <span className={`font-extrabold ${factorColors.text}`}>{factor.score}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${factor.score}%`,
                        backgroundColor: factorColors.ring,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary — composed client-side so it translates with the locale. */}
        <p className="mt-5 text-sm font-bold leading-6 text-muted">{summary}</p>
      </div>

      {/* Expandable details */}
      <div className="border-t border-slate-100">
        <button
          className="flex w-full items-center justify-center gap-1.5 px-5 py-3 text-xs font-extrabold text-teal hover:bg-teal/5 transition-colors"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? (
            <>{t("health.hideDetails")} <ChevronUp size={14} /></>
          ) : (
            <>{t("health.viewDetails")} <ChevronDown size={14} /></>
          )}
        </button>

        {expanded && (
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            {data.factors.map((factor) => {
              const factorColors = LEVEL_COLORS[factor.level];
              return (
                <div
                  key={factor.name}
                  className={`rounded-lg border p-4 ${factorColors.bg} border-transparent`}
                >
                  <div className="flex items-center gap-2">
                    <span className={factorColors.text}>
                      {FACTOR_ICONS[factor.name] ?? <Activity size={16} />}
                    </span>
                    <h4 className="font-black text-ink">{t(factor.nameKey)}</h4>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${factorColors.badge}`}>
                      {t(LEVEL_LABEL_KEYS[factor.level])}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t(factor.descKey, factor.descParams)}
                    {factor.descExtraKey ? ` ${t(factor.descExtraKey, factor.descExtraParams)}` : ""}
                  </p>
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-white/60 px-3 py-2">
                    <span className="mt-0.5 text-amber">💡</span>
                    <p className="text-xs font-bold leading-5 text-ink">{t(factor.tipKey, factor.tipParams)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
