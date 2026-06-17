"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

type PredictedMonth = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  saving: number;
  isPrediction: boolean;
};

type Scenario = {
  name: string;
  type: "optimistic" | "realistic" | "pessimistic";
  monthlyData: { month: string; balance: number; saving: number; expense: number }[];
  endBalance: number;
  totalSaving: number;
  description: string;
};

type SpendingTrend = {
  direction: "increasing" | "decreasing" | "stable";
  avgMonthlyChange: number;
  avgMonthlyChangePct: number;
  explanation: string;
};

type Prediction = {
  endOfMonthBalance: number;
  endOfMonthExpense: number;
  projectedSaving: number;
  savingRate: number;
  spendingTrend: SpendingTrend;
  scenarios: Scenario[];
  predictedMonths: PredictedMonth[];
  insights: string[];
  modelName: string;
};

type Data = { prediction: Prediction; currency: string };

export function FinancialPredictions() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ai/predictions")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError("Could not load predictions."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="mt-3 text-sm font-bold">Crunching your financial future…</p>
      </div>
    );
  }

  if (error || !data) {
    return <div className="panel p-6 text-center text-coral font-bold">{error || "No data"}</div>;
  }

  const { prediction: p, currency } = data;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const TrendIcon = p.spendingTrend.direction === "increasing" ? ArrowUp
    : p.spendingTrend.direction === "decreasing" ? ArrowDown : ArrowRight;
  const trendColor = p.spendingTrend.direction === "increasing" ? "#d85c46"
    : p.spendingTrend.direction === "decreasing" ? "#20875a" : "#cf8b21";

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="End-of-Month Balance" value={`${fmt(p.endOfMonthBalance)} ${currency}`} icon={<Wallet size={18} />} color="#087f7a" />
        <KpiCard label="Projected Saving" value={`${fmt(p.projectedSaving)} ${currency}`} sub={`${p.savingRate}% saving rate`} icon={<TrendingUp size={18} />} color={p.projectedSaving >= 0 ? "#20875a" : "#d85c46"} />
        <KpiCard label="Projected Expense" value={`${fmt(p.endOfMonthExpense)} ${currency}`} icon={<TrendingDown size={18} />} color="#2855a3" />
        <KpiCard label="Spending Trend" value={p.spendingTrend.direction.charAt(0).toUpperCase() + p.spendingTrend.direction.slice(1)} sub={`${fmt(Math.abs(p.spendingTrend.avgMonthlyChange))} ${currency}/mo`} icon={<TrendIcon size={18} />} color={trendColor} />
      </div>

      {/* Balance forecast chart */}
      {p.predictedMonths.length > 0 && (
        <div className="panel p-5">
          <p className="eyebrow">6-month forecast</p>
          <h3 className="mt-1 text-lg font-black text-ink">Balance Projection</h3>
          <div className="mt-4 overflow-x-auto">
            <BalanceChart months={p.predictedMonths} currency={currency} />
          </div>
        </div>
      )}

      {/* Scenarios */}
      <div className="panel p-5">
        <p className="eyebrow">Future scenarios</p>
        <h3 className="mt-1 text-lg font-black text-ink">What Could Happen in 6 Months</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {p.scenarios.map((s) => (
            <ScenarioCard key={s.type} scenario={s} currency={currency} />
          ))}
        </div>
      </div>

      {/* Scenario comparison chart */}
      {p.scenarios.length > 0 && (
        <div className="panel p-5">
          <p className="eyebrow">Scenario comparison</p>
          <h3 className="mt-1 text-lg font-black text-ink">Balance Across Scenarios</h3>
          <div className="mt-4 overflow-x-auto">
            <ScenarioChart scenarios={p.scenarios} currency={currency} />
          </div>
        </div>
      )}

      {/* Insights */}
      {p.insights.length > 0 && (
        <div className="panel p-5">
          <p className="eyebrow">AI insights</p>
          <h3 className="mt-1 text-lg font-black text-ink">Key Takeaways</h3>
          <ul className="mt-3 space-y-2">
            {p.insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-muted">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                {ins}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spending trend explanation */}
      <div className="panel p-5">
        <p className="eyebrow">Trend analysis</p>
        <h3 className="mt-1 text-lg font-black text-ink">Spending Trajectory</h3>
        <p className="mt-3 text-sm leading-7 text-muted">{p.spendingTrend.explanation}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color }}>{icon}{label}</div>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

const SCENARIO_STYLE: Record<string, { color: string; bg: string }> = {
  optimistic: { color: "#20875a", bg: "#e8f5e9" },
  realistic: { color: "#2855a3", bg: "#e3f2fd" },
  pessimistic: { color: "#d85c46", bg: "#fbe9e7" },
};

function ScenarioCard({ scenario: s, currency }: { scenario: Scenario; currency: string }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const style = SCENARIO_STYLE[s.type];

  return (
    <div className="rounded-xl border-2 p-5" style={{ borderColor: style.color + "30", background: style.bg + "40" }}>
      <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: style.color }}>{s.name}</p>
      <p className="mt-3 text-2xl font-black text-ink">{fmt(s.endBalance)} <span className="text-sm text-muted">{currency}</span></p>
      <p className="mt-1 text-sm text-muted">
        {s.totalSaving >= 0 ? "Save" : "Lose"} {fmt(Math.abs(s.totalSaving))} {currency} total
      </p>
      <p className="mt-3 text-xs leading-5 text-muted">{s.description}</p>
    </div>
  );
}

// --- SVG Charts ---
const W = 600, H = 220, PL = 60, PR = 20, PT = 20, PB = 40;

function BalanceChart({ months, currency }: { months: PredictedMonth[]; currency: string }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  if (months.length === 0) return null;

  const balances = months.map((m) => m.balance);
  const minVal = Math.min(...balances) * 0.9;
  const maxVal = Math.max(...balances) * 1.1 || 1;
  const xStep = (W - PL - PR) / Math.max(months.length - 1, 1);

  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + ((maxVal - v) / (maxVal - minVal)) * (H - PT - PB);

  const actualPoints: string[] = [];
  const predPoints: string[] = [];
  let lastActualIdx = -1;

  months.forEach((m, i) => {
    const pt = `${toX(i)},${toY(m.balance)}`;
    if (!m.isPrediction) {
      actualPoints.push(pt);
      lastActualIdx = i;
    } else {
      if (predPoints.length === 0 && lastActualIdx >= 0) {
        predPoints.push(`${toX(lastActualIdx)},${toY(months[lastActualIdx].balance)}`);
      }
      predPoints.push(pt);
    }
  });

  const areaActual = actualPoints.length > 1
    ? `M ${actualPoints[0]} ${actualPoints.slice(1).map((p) => `L ${p}`).join(" ")} L ${toX(lastActualIdx)},${H - PB} L ${PL},${H - PB} Z`
    : "";
  const areaPred = predPoints.length > 1
    ? `M ${predPoints[0]} ${predPoints.slice(1).map((p) => `L ${p}`).join(" ")} L ${toX(months.length - 1)},${H - PB} L ${predPoints[0].split(",")[0]},${H - PB} Z`
    : "";

  const gridLines = 4;
  const step = (maxVal - minVal) / gridLines;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#087f7a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#087f7a" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2855a3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2855a3" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const val = maxVal - step * i;
        const y = toY(val);
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PL - 8} y={y + 4} textAnchor="end" className="fill-muted" fontSize={10}>{fmt(Math.round(val))}</text>
          </g>
        );
      })}

      {/* areas */}
      {areaActual && <path d={areaActual} fill="url(#gradActual)" />}
      {areaPred && <path d={areaPred} fill="url(#gradPred)" />}

      {/* lines */}
      {actualPoints.length > 1 && (
        <polyline points={actualPoints.join(" ")} fill="none" stroke="#087f7a" strokeWidth={2.5} strokeLinejoin="round" />
      )}
      {predPoints.length > 1 && (
        <polyline points={predPoints.join(" ")} fill="none" stroke="#2855a3" strokeWidth={2.5} strokeDasharray="6 4" strokeLinejoin="round" />
      )}

      {/* dots & labels */}
      {months.map((m, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(m.balance)} r={3.5} fill={m.isPrediction ? "#2855a3" : "#087f7a"} />
          <text x={toX(i)} y={H - PB + 16} textAnchor="middle" fontSize={9} className="fill-muted">{m.month}</text>
        </g>
      ))}

      {/* legend */}
      <circle cx={PL} cy={H - 6} r={4} fill="#087f7a" />
      <text x={PL + 8} y={H - 3} fontSize={9} className="fill-muted">Actual</text>
      <circle cx={PL + 55} cy={H - 6} r={4} fill="#2855a3" />
      <text x={PL + 63} y={H - 3} fontSize={9} className="fill-muted">Predicted</text>
    </svg>
  );
}

function ScenarioChart({ scenarios, currency }: { scenarios: Scenario[]; currency: string }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const allBalances = scenarios.flatMap((s) => s.monthlyData.map((m) => m.balance));
  if (allBalances.length === 0) return null;

  const minVal = Math.min(...allBalances) * 0.9;
  const maxVal = Math.max(...allBalances) * 1.1 || 1;
  const months = scenarios[0].monthlyData;
  const xStep = (W - PL - PR) / Math.max(months.length - 1, 1);

  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + ((maxVal - v) / (maxVal - minVal)) * (H - PT - PB);

  const colors = ["#20875a", "#2855a3", "#d85c46"];
  const gridLines = 4;
  const step = (maxVal - minVal) / gridLines;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const val = maxVal - step * i;
        const y = toY(val);
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PL - 8} y={y + 4} textAnchor="end" className="fill-muted" fontSize={10}>{fmt(Math.round(val))}</text>
          </g>
        );
      })}

      {scenarios.map((s, si) => {
        const pts = s.monthlyData.map((m, i) => `${toX(i)},${toY(m.balance)}`).join(" ");
        return (
          <polyline key={s.type} points={pts} fill="none" stroke={colors[si]} strokeWidth={2.5} strokeLinejoin="round" />
        );
      })}

      {months.map((m, i) => (
        <text key={i} x={toX(i)} y={H - PB + 16} textAnchor="middle" fontSize={9} className="fill-muted">{m.month}</text>
      ))}

      {scenarios.map((s, si) => (
        <g key={s.type}>
          <circle cx={PL + si * 80} cy={H - 6} r={4} fill={colors[si]} />
          <text x={PL + si * 80 + 8} y={H - 3} fontSize={9} className="fill-muted">{s.name}</text>
        </g>
      ))}
    </svg>
  );
}
