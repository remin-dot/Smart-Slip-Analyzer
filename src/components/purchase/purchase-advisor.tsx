"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Heart,
  HelpCircle,
  Lightbulb,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Feasibility = "go_ahead" | "consider" | "wait" | "avoid";
type Severity = "low" | "medium" | "high" | "critical";
type NeedVerdict = "need" | "want" | "mixed";

type Analysis = {
  needVsWant: { verdict: NeedVerdict; confidence: number; explanation: string };
  financialImpact: { severity: Severity; balanceAfter: number; incomeRatio: number; explanation: string };
  budgetEffect: { affectedBudgets: { category: string; currentUsage: number; afterUsage: number; willExceed: boolean }[]; explanation: string };
  goalImpact: { affectedGoals: { name: string; delayMonths: number; newMonthlyRequired: number }[]; explanation: string };
  recommendation: { verdict: Feasibility; title: string; explanation: string; alternatives: string[] };
  summary: string;
  modelName: string;
};

const VERDICT_STYLES: Record<Feasibility, { bg: string; border: string; icon: React.ReactNode; color: string; badgeBg: string }> = {
  go_ahead: { bg: "bg-mint/5", border: "border-mint/30", icon: <ThumbsUp size={24} />, color: "text-mint", badgeBg: "bg-mint/15 text-mint" },
  consider: { bg: "bg-amber/5", border: "border-amber/30", icon: <HelpCircle size={24} />, color: "text-amber", badgeBg: "bg-amber/15 text-amber" },
  wait: { bg: "bg-ocean/5", border: "border-ocean/30", icon: <Clock size={24} />, color: "text-ocean", badgeBg: "bg-ocean/15 text-ocean" },
  avoid: { bg: "bg-coral/5", border: "border-coral/30", icon: <Ban size={24} />, color: "text-coral", badgeBg: "bg-coral/15 text-coral" },
};

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; labelKey: string }> = {
  low: { color: "text-mint", bg: "bg-mint", labelKey: "pur.low" },
  medium: { color: "text-amber", bg: "bg-amber", labelKey: "pur.medium" },
  high: { color: "text-coral", bg: "bg-coral", labelKey: "pur.high" },
  critical: { color: "text-coral", bg: "bg-coral", labelKey: "pur.critical" },
};

const NEED_STYLES: Record<NeedVerdict, { color: string; bg: string; icon: React.ReactNode; labelKey: string }> = {
  need: { color: "text-mint", bg: "bg-mint/10", icon: <CheckCircle2 size={18} />, labelKey: "pur.need" },
  want: { color: "text-coral", bg: "bg-coral/10", icon: <Heart size={18} />, labelKey: "pur.want" },
  mixed: { color: "text-amber", bg: "bg-amber/10", icon: <HelpCircle size={18} />, labelKey: "pur.mixed" },
};

const VERDICT_LABEL_KEYS: Record<Feasibility, string> = {
  go_ahead: "pur.vGoAhead",
  consider: "pur.vConsider",
  wait: "pur.vWait",
  avoid: "pur.vAvoid",
};

export function PurchaseAdvisor() {
  const { t } = useI18n();
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    const p = parseFloat(price);
    if (!productName.trim() || isNaN(p) || p <= 0) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch("/api/ai/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: productName.trim(), price: p }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAnalyze();
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="grid gap-5">
      {/* Input form */}
      <div className="panel p-5">
        <div className="mb-5">
          <p className="eyebrow">{t("pur.eyebrow")}</p>
          <h3 className="mt-1 text-xl font-black">{t("pur.shouldIBuy")}</h3>
          <p className="mt-1 text-sm text-muted">{t("pur.intro")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">{t("pur.productName")}</label>
            <div className="relative">
              <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-bold text-ink placeholder:text-muted/50 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="text"
                placeholder={t("pur.productPlaceholder")}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">{t("pur.price")}</label>
            <div className="relative">
              <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-bold text-ink placeholder:text-muted/50 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="number"
                min="1"
                step="100"
                placeholder={t("pur.pricePlaceholder")}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-teal px-5 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
              disabled={loading || !productName.trim() || !price}
              onClick={handleAnalyze}
              type="button"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={16} /> {t("pur.analyzing")}</>
              ) : (
                <><Search size={16} /> {t("pur.analyze")}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="panel grid min-h-[200px] place-items-center p-8">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-teal" size={32} />
            <p className="mt-3 text-sm font-bold text-muted">{t("pur.analyzingImpact")}</p>
            <p className="mt-1 text-xs text-muted">{t("pur.checkingData")}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="grid gap-4">
          {/* Recommendation hero */}
          <RecommendationCard analysis={analysis} productName={productName} price={parseFloat(price)} fmt={fmt} />

          {/* Analysis cards grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <NeedVsWantCard data={analysis.needVsWant} />
            <FinancialImpactCard data={analysis.financialImpact} fmt={fmt} />
            <BudgetEffectCard data={analysis.budgetEffect} fmt={fmt} />
            <GoalImpactCard data={analysis.goalImpact} fmt={fmt} />
          </div>

          {/* Alternatives */}
          {analysis.recommendation.alternatives.length > 0 && (
            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-ocean/10 text-ocean">
                  <Lightbulb size={16} />
                </div>
                <h4 className="font-black text-ink">{t("pur.alternatives")}</h4>
              </div>
              <div className="grid gap-2">
                {analysis.recommendation.alternatives.map((alt, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 px-4 py-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ocean/10 text-xs font-black text-ocean">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold leading-6 text-ink">{alt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary + model info */}
          <div className="panel p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-sm font-bold leading-6 text-ink">{analysis.summary}</p>
                <p className="mt-2 text-[11px] font-bold text-muted">
                  {t("pur.analysisBy", { model: analysis.modelName })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!analysis && !loading && (
        <div className="panel grid min-h-[260px] place-items-center p-8 text-center">
          <div>
            <ShoppingCart size={40} className="mx-auto text-muted/30" />
            <p className="mt-4 text-lg font-black text-ink">{t("pur.enterProduct")}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              {t("pur.emptyBody")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["MacBook Pro — 45,000", "Running shoes — 3,500", "iPhone 16 — 38,900", "Coffee machine — 8,000"].map((example) => {
                const [name, priceStr] = example.split(" — ");
                return (
                  <button
                    key={example}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-muted hover:border-teal hover:text-teal transition-colors"
                    onClick={() => {
                      setProductName(name);
                      setPrice(priceStr.replace(",", ""));
                    }}
                    type="button"
                  >
                    {example}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ analysis, productName, price, fmt }: { analysis: Analysis; productName: string; price: number; fmt: (n: number) => string }) {
  const { t } = useI18n();
  const v = VERDICT_STYLES[analysis.recommendation.verdict];
  return (
    <div className={`panel overflow-hidden border-2 ${v.border}`}>
      <div className={`${v.bg} p-5`}>
        <div className="flex items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${v.color} bg-white/60`}>
            {v.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-ink">{analysis.recommendation.title}</h3>
              <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${v.badgeBg}`}>
                {t(VERDICT_LABEL_KEYS[analysis.recommendation.verdict])}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-muted">
              {productName} &middot; {fmt(price)} THB
            </p>
            <p className="mt-3 text-sm font-medium leading-7 text-ink">
              {analysis.recommendation.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeedVsWantCard({ data }: { data: Analysis["needVsWant"] }) {
  const { t } = useI18n();
  const style = NEED_STYLES[data.verdict];
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${style.bg} ${style.color}`}>
          {style.icon}
        </div>
        <h4 className="font-black text-ink">{t("pur.needVsWant")}</h4>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.bg} ${style.color}`}>
          {t(style.labelKey)} &middot; {Math.round(data.confidence * 100)}%
        </span>
      </div>
      <p className="text-sm leading-6 text-muted">{data.explanation}</p>
    </div>
  );
}

function FinancialImpactCard({ data, fmt }: { data: Analysis["financialImpact"]; fmt: (n: number) => string }) {
  const { t } = useI18n();
  const style = SEVERITY_STYLES[data.severity];
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${data.severity === "low" ? "bg-mint/10 text-mint" : data.severity === "medium" ? "bg-amber/10 text-amber" : "bg-coral/10 text-coral"}`}>
          <TrendingDown size={16} />
        </div>
        <h4 className="font-black text-ink">{t("pur.financialImpact")}</h4>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${data.severity === "low" ? "bg-mint/10 text-mint" : data.severity === "medium" ? "bg-amber/10 text-amber" : "bg-coral/10 text-coral"}`}>
          {t(style.labelKey)}
        </span>
      </div>
      <div className="mb-3 flex gap-4">
        <div>
          <p className="text-xs font-bold text-muted">{t("pur.balanceAfter")}</p>
          <p className={`text-lg font-black ${data.balanceAfter >= 0 ? "text-ink" : "text-coral"}`}>{fmt(data.balanceAfter)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">{t("pur.incomeRatio")}</p>
          <p className={`text-lg font-black ${style.color}`}>{Math.round(data.incomeRatio * 100)}%</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted">{data.explanation}</p>
    </div>
  );
}

function BudgetEffectCard({ data, fmt }: { data: Analysis["budgetEffect"]; fmt: (n: number) => string }) {
  const { t } = useI18n();
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-ocean/10 text-ocean">
          <Star size={16} />
        </div>
        <h4 className="font-black text-ink">{t("pur.budgetEffect")}</h4>
      </div>
      {data.affectedBudgets.length > 0 && (
        <div className="mb-3 grid gap-2">
          {data.affectedBudgets.map((b, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-ink">{b.category}</span>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-muted">{b.currentUsage}%</span>
                  <ArrowRight size={12} className="text-muted" />
                  <span className={b.willExceed ? "text-coral" : "text-amber"}>{b.afterUsage}%</span>
                  {b.willExceed && <ShieldAlert size={12} className="text-coral" />}
                </div>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="relative h-full">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-300"
                    style={{ width: `${Math.min(b.afterUsage, 100)}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${b.willExceed ? "bg-coral" : "bg-ocean"}`}
                    style={{ width: `${Math.min(b.currentUsage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm leading-6 text-muted">{data.explanation}</p>
    </div>
  );
}

function GoalImpactCard({ data, fmt }: { data: Analysis["goalImpact"]; fmt: (n: number) => string }) {
  const { t } = useI18n();
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber/10 text-amber">
          <Target size={16} />
        </div>
        <h4 className="font-black text-ink">{t("pur.goalImpact")}</h4>
      </div>
      {data.affectedGoals.length > 0 && (
        <div className="mb-3 grid gap-2">
          {data.affectedGoals.map((g, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-amber/5 border border-amber/15 px-3 py-2.5">
              <div>
                <p className="text-sm font-bold text-ink">{g.name}</p>
                <p className="text-xs font-bold text-muted">{t("pur.newMonthly", { amount: fmt(g.newMonthlyRequired) })}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-amber">+{g.delayMonths}</p>
                <p className="text-[11px] font-bold text-muted">{t("pur.monthsDelayLabel")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm leading-6 text-muted">{data.explanation}</p>
    </div>
  );
}
