"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Coffee,
  Lightbulb,
  Loader2,
  Repeat,
  Scissors,
  Sparkles,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Insight = {
  type: "spike" | "pattern" | "saving" | "alert" | "praise";
  icon: string;
  title: string;
  description: string;
  amount?: number;
  percentChange?: number;
  category?: string;
};

type Analysis = {
  insights: Insight[];
  recommendations: string[];
  summary: string;
  modelName: string;
  confidence: number;
  createdAt?: string;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={18} />,
  TrendingDown: <TrendingDown size={18} />,
  Coffee: <Coffee size={18} />,
  Lightbulb: <Lightbulb size={18} />,
  AlertTriangle: <AlertTriangle size={18} />,
  ThumbsUp: <ThumbsUp size={18} />,
  Repeat: <Repeat size={18} />,
  Scissors: <Scissors size={18} />,
};

const TYPE_STYLES: Record<string, { bg: string; border: string; iconBg: string; iconColor: string }> = {
  spike: { bg: "bg-coral/5", border: "border-coral/20", iconBg: "bg-coral/10", iconColor: "text-coral" },
  alert: { bg: "bg-amber/5", border: "border-amber/20", iconBg: "bg-amber/10", iconColor: "text-amber" },
  praise: { bg: "bg-mint/5", border: "border-mint/20", iconBg: "bg-mint/10", iconColor: "text-mint" },
  saving: { bg: "bg-ocean/5", border: "border-ocean/20", iconBg: "bg-ocean/10", iconColor: "text-ocean" },
  pattern: { bg: "bg-teal/5", border: "border-teal/20", iconBg: "bg-teal/10", iconColor: "text-teal" },
};

export function InsightsPanel() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/ai/analyze")
      .then((r) => r.json())
      .then((d) => { if (d.analysis) setAnalysis(d.analysis); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateAnalysis = useCallback(async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/ai/analyze", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      // Silently fail — user can retry
    } finally {
      setGenerating(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="panel grid min-h-[200px] place-items-center p-8">
        <Loader2 className="animate-spin text-teal" size={24} />
      </div>
    );
  }

  // No analysis yet — show generate prompt
  if (!analysis) {
    return (
      <article className="panel p-5">
        <div className="mb-5">
          <p className="eyebrow">AI-powered analysis</p>
          <h3 className="mt-1 text-xl font-black">Spending Insights</h3>
        </div>
        <div className="grid min-h-[180px] place-items-center rounded-lg bg-slate-50 p-8 text-center">
          <div>
            <Bot size={36} className="mx-auto text-teal" />
            <p className="mt-3 font-black text-ink">Generate your first spending analysis</p>
            <p className="mt-1 text-sm text-muted">
              AI will analyze your transactions and provide personalized insights.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
              disabled={generating}
              onClick={generateAnalysis}
              type="button"
            >
              {generating ? (
                <><Loader2 className="animate-spin" size={16} /> Analyzing...</>
              ) : (
                <><Sparkles size={16} /> Analyze my spending</>
              )}
            </button>
          </div>
        </div>
      </article>
    );
  }

  const insightsSorted = [...analysis.insights].sort((a, b) => {
    const priority: Record<string, number> = { alert: 0, spike: 1, saving: 2, pattern: 3, praise: 4 };
    return (priority[a.type] ?? 5) - (priority[b.type] ?? 5);
  });

  return (
    <div className="grid gap-5">
      {/* Summary + regenerate */}
      <article className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">AI-powered analysis</p>
            <h3 className="mt-1 text-xl font-black">Spending Insights</h3>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-teal hover:bg-teal/5 disabled:opacity-50"
            disabled={generating}
            onClick={generateAnalysis}
            type="button"
          >
            {generating ? (
              <><Loader2 className="animate-spin" size={14} /> Refreshing...</>
            ) : (
              <><Sparkles size={14} /> Refresh analysis</>
            )}
          </button>
        </div>

        {/* Summary bar */}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-teal/5 px-4 py-3">
          <Bot size={18} className="mt-0.5 shrink-0 text-teal" />
          <div>
            <p className="text-sm font-bold leading-6 text-ink">{analysis.summary}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-bold text-muted">
              <span>Model: {analysis.modelName}</span>
              <span>Confidence: {(analysis.confidence * 100).toFixed(0)}%</span>
              {analysis.createdAt && (
                <span>
                  Generated: {new Date(analysis.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Insight cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {insightsSorted.map((insight, i) => {
          const style = TYPE_STYLES[insight.type] ?? TYPE_STYLES.pattern;
          return (
            <div
              key={i}
              className={`rounded-lg border ${style.border} ${style.bg} p-4 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.iconBg} ${style.iconColor}`}>
                  {ICON_MAP[insight.icon] ?? <Lightbulb size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-ink">{insight.title}</p>
                    {insight.percentChange != null && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          insight.percentChange > 0
                            ? "bg-coral/10 text-coral"
                            : "bg-mint/10 text-mint"
                        }`}
                      >
                        {insight.percentChange > 0 ? "+" : ""}{insight.percentChange}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{insight.description}</p>
                  {insight.category && (
                    <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-muted">
                      {insight.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <article className="panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ocean/10 text-ocean">
              <Lightbulb size={16} />
            </div>
            <h3 className="text-lg font-black">Recommendations</h3>
          </div>
          <div className="grid gap-2">
            {analysis.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-slate-100 px-4 py-3"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ocean/10 text-xs font-black text-ocean">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-ink">{rec}</p>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
