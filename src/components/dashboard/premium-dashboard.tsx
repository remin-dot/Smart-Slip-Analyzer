"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Crown,
  Flag,
  Loader2,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

/* ── types ────────────────────────────────────────────────────── */

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

type HealthScore = {
  totalScore: number;
  level: string;
  factors: { name: string; score: number; level: string }[];
  summary: string;
};

type GoalData = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  feasibility: string;
};

type GamData = {
  xp: number;
  level: { rank: number; name: string };
  levelProgress: number;
  stats: { unlockedCount: number; totalAchievements: number };
};

/* ── helpers ──────────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmt2 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── component ───────────────────────────────────────────────── */

export function PremiumDashboard() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [score, setScore] = useState<HealthScore | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [gam, setGam] = useState<GamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/ai/health-score").then((r) => r.json()).catch(() => null),
      fetch("/api/goals").then((r) => r.json()).then((d) => d.goals ?? []).catch(() => []),
      fetch("/api/ai/gamification").then((r) => r.json()).catch(() => null),
    ])
      .then(([d, h, g, gm]) => {
        setDash(d);
        if (h?.healthScore) setScore(h.healthScore);
        if (Array.isArray(g)) setGoals(g.slice(0, 4));
        if (gm?.level) setGam(gm);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-cyan-400" size={36} />
          <p className="mt-4 text-sm font-medium text-slate-400">Loading your financial universe…</p>
        </div>
      </div>
    );
  }

  if (!dash) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="font-bold text-white/70">Unable to load dashboard data.</p>
      </div>
    );
  }

  const s = dash.summary;
  const cur = s.currency;
  const money = (n: number) => formatCurrency(n, cur);

  return (
    <div className="grid gap-5">
      {/* ── Row 1: KPI strip ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassKpi
          label="Total Balance"
          value={money(s.balance)}
          delta={s.monthBalance}
          deltaLabel="this month"
          icon={<Wallet size={20} />}
          accent="cyan"
        />
        <GlassKpi
          label="Monthly Income"
          value={money(s.monthIncome)}
          icon={<TrendingUp size={20} />}
          accent="emerald"
        />
        <GlassKpi
          label="Monthly Expenses"
          value={money(s.monthExpense)}
          icon={<ArrowDownRight size={20} />}
          accent="rose"
        />
        <GlassKpi
          label="Saving Rate"
          value={`${s.savingRate}%`}
          sub={s.savingRate >= 20 ? "On track" : "Below target"}
          icon={<PiggyBank size={20} />}
          accent={s.savingRate >= 20 ? "emerald" : "amber"}
        />
      </div>

      {/* ── Row 2: Score + Level + AI insight ────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Health score */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Financial Health</p>
          <div className="mt-4 flex items-center gap-5">
            <ScoreRing score={score?.totalScore ?? 0} level={score?.level ?? "N/A"} />
            <div className="flex-1 space-y-2">
              {(score?.factors ?? []).slice(0, 4).map((f) => (
                <div key={f.name}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">{f.name}</span>
                    <span className="font-bold text-white">{f.score}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${f.score}%`, background: scoreColor(f.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {score?.summary && (
            <p className="mt-4 text-xs leading-5 text-slate-400">{score.summary}</p>
          )}
        </div>

        {/* Level / gamification */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Your Level</p>
          {gam ? (
            <>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 text-amber-400">
                  <Crown size={26} />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">Level {gam.level.rank}</p>
                  <p className="text-sm font-medium text-amber-400/80">{gam.level.name}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{fmt(gam.xp)} XP</span>
                  <span>{gam.levelProgress}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                    style={{ width: `${gam.levelProgress}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <Star size={14} className="text-amber-400" />
                <span>{gam.stats.unlockedCount}/{gam.stats.totalAchievements} achievements unlocked</span>
              </div>
            </>
          ) : (
            <div className="mt-6 text-center text-sm text-slate-500">Track more to unlock levels</div>
          )}
        </div>

        {/* AI Quick Insight */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">AI Insights</p>
          <div className="mt-4 flex items-start gap-3">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-400">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Smart Summary</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {s.monthIncome > 0
                  ? `You've earned ${money(s.monthIncome)} and spent ${money(s.monthExpense)} this month. ${s.savingRate >= 20 ? "Great saving discipline!" : "Consider cutting expenses to boost savings."}`
                  : "Start tracking income to get personalized insights."}
              </p>
            </div>
          </div>
          {dash.categorySpending.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Top spending categories</p>
              {dash.categorySpending.slice(0, 3).map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-xs font-medium text-slate-300">{c.name}</span>
                  </div>
                  <span className="text-xs font-bold text-white">{money(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/chat" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300">
            <Sparkles size={12} /> Ask AI Assistant
          </Link>
        </div>
      </div>

      {/* ── Row 3: Charts ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Revenue chart */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Last 6 Months</p>
          <h3 className="mt-1 text-lg font-black text-white">Income vs Expenses</h3>
          <div className="mt-4">
            <DarkBarChart data={dash.monthlyExpenses} currency={cur} />
          </div>
        </div>

        {/* Category donut */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Breakdown</p>
          <h3 className="mt-1 text-lg font-black text-white">Spending by Category</h3>
          {dash.categorySpending.length > 0 ? (
            <div className="mt-4 flex flex-col items-center gap-4">
              <DarkDonut data={dash.categorySpending} currency={cur} />
              <div className="grid w-full gap-1.5">
                {dash.categorySpending.slice(0, 5).map((c) => {
                  const total = dash.categorySpending.reduce((s, x) => s + x.amount, 0);
                  const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
                  return (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        <span className="font-medium text-slate-300">{c.name}</span>
                      </div>
                      <span className="font-bold text-white">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-slate-500">No categorized expenses yet</div>
          )}
        </div>
      </div>

      {/* ── Row 4: Trend chart ───────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">30-Day Trend</p>
            <h3 className="mt-1 text-lg font-black text-white">Spending Trajectory</h3>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">
              {money(dash.spendingTrend.reduce((sum, d) => sum + d.amount, 0))}
            </p>
            <p className="text-xs text-slate-400">total</p>
          </div>
        </div>
        <div className="mt-4">
          <DarkTrendChart data={dash.spendingTrend} />
        </div>
      </div>

      {/* ── Row 5: Goals + Recent Transactions ───────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Goals */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Saving Goals</p>
              <h3 className="mt-1 text-lg font-black text-white">Progress</h3>
            </div>
            <Link href="/goals" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">View all</Link>
          </div>
          {goals.length > 0 ? (
            <div className="mt-4 space-y-3">
              {goals.map((g) => (
                <div key={g.id} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag size={14} className="text-emerald-400" />
                      <span className="text-sm font-bold text-white">{g.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{g.progressPct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${Math.min(g.progressPct, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                    <span>{money(g.currentAmount)}</span>
                    <span>{money(g.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center text-center">
              <Target size={28} className="text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">No goals yet</p>
              <Link href="/goals" className="mt-2 text-xs font-bold text-emerald-400">Create a goal</Link>
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Recent Activity</p>
              <h3 className="mt-1 text-lg font-black text-white">Transactions</h3>
            </div>
            <Link href="/transactions" className="text-xs font-bold text-cyan-400 hover:text-cyan-300">View all</Link>
          </div>
          {dash.recentTransactions.length > 0 ? (
            <div className="mt-4 space-y-1.5">
              {dash.recentTransactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                return (
                  <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tx.category?.color ?? "#475569" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{tx.merchant}</p>
                      <p className="text-[10px] text-slate-500">
                        {tx.category?.name ?? "Uncategorized"} · {new Date(tx.occurredAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-black ${isIncome ? "text-emerald-400" : "text-white"}`}>
                      {isIncome ? "+" : "-"}{money(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-slate-500">No transactions yet</div>
          )}
        </div>
      </div>

      {/* ── Row 6: Quick stats ───────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Total Transactions" value={String(s.txCount)} icon={<Zap size={16} />} />
        <MiniStat label="This Month" value={String(s.monthTxCount)} icon={<Target size={16} />} />
        <MiniStat label="Saving Goal" value={money(s.profileSavingGoal)} icon={<ShieldCheck size={16} />} />
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────── */

const ACCENT_MAP: Record<string, string> = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  violet: "text-violet-400",
};

const ACCENT_GLOW: Record<string, string> = {
  cyan: "shadow-cyan-500/10",
  emerald: "shadow-emerald-500/10",
  rose: "shadow-rose-500/10",
  amber: "shadow-amber-500/10",
};

function GlassKpi({
  label, value, currency, delta, deltaLabel, sub, icon, accent,
}: {
  label: string; value: string; currency?: string; delta?: number; deltaLabel?: string;
  sub?: string; icon: React.ReactNode; accent: string;
}) {
  const accentText = ACCENT_MAP[accent] ?? "text-cyan-400";
  const glow = ACCENT_GLOW[accent] ?? "";
  return (
    <div className={`glass rounded-2xl p-5 shadow-lg ${glow}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={accentText}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-white">
        {value}
        {currency && <span className="ml-1.5 text-sm font-medium text-slate-500">{currency}</span>}
      </p>
      {delta != null && deltaLabel && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold">
          {delta >= 0 ? <ArrowUpRight size={13} className="text-emerald-400" /> : <ArrowDownRight size={13} className="text-rose-400" />}
          <span className={delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {delta >= 0 ? "+" : ""}{fmt2(delta)} {deltaLabel}
          </span>
        </p>
      )}
      {sub && <p className="mt-1.5 text-xs font-semibold text-slate-500">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass flex items-center justify-between rounded-2xl px-5 py-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <span className="text-lg font-black text-white">{value}</span>
    </div>
  );
}

function ScoreRing({ score, level }: { score: number; level: string }) {
  const circ = 2 * Math.PI * 42;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="relative flex-shrink-0">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r="42" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 55 55)" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white">{score}</span>
        <span className="text-[9px] font-bold text-slate-500">{level}</span>
      </div>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#22d3ee";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

/* ── dark SVG charts ─────────────────────────────────────────── */

const W = 560, H = 200, PL = 50, PR = 12, PT = 12, PB = 32;

function DarkBarChart({ data, currency }: { data: { month: string; income: number; expense: number }[]; currency: string }) {
  if (!data.some((d) => d.income > 0 || d.expense > 0)) {
    return <div className="grid min-h-[160px] place-items-center text-sm text-slate-500">No data yet</div>;
  }

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const barW = 20;
  const gap = (W - PL - PR) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="pBarInc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="pBarExp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = PT + (1 - pct) * (H - PT - PB);
        return (
          <g key={pct}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PL - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9}>{fmt(Math.round(maxVal * pct))}</text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const cx = PL + i * gap + gap / 2;
        const incH = (d.income / maxVal) * (H - PT - PB);
        const expH = (d.expense / maxVal) * (H - PT - PB);
        return (
          <g key={d.month}>
            <rect x={cx - barW - 1} y={H - PB - incH} width={barW} height={incH} rx={4} fill="url(#pBarInc)" opacity={0.85} />
            <rect x={cx + 1} y={H - PB - expH} width={barW} height={expH} rx={4} fill="url(#pBarExp)" opacity={0.85} />
            <text x={cx} y={H - PB + 14} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={10}>{d.month}</text>
          </g>
        );
      })}

      {/* legend */}
      <circle cx={PL} cy={H - 4} r={3} fill="#34d399" />
      <text x={PL + 7} y={H - 1} fill="rgba(255,255,255,0.4)" fontSize={9}>Income</text>
      <circle cx={PL + 55} cy={H - 4} r={3} fill="#f87171" />
      <text x={PL + 62} y={H - 1} fill="rgba(255,255,255,0.4)" fontSize={9}>Expense</text>
    </svg>
  );
}

function DarkDonut({ data, currency }: { data: { name: string; amount: number; color: string }[]; currency: string }) {
  const size = 150;
  const cx = size / 2, cy = size / 2, r = 55, stroke = 22;
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return null;

  let cumAngle = -90;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const pct = d.amount / total;
        const angle = Math.max(pct * 360, 1);
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;
        const s = (startAngle * Math.PI) / 180;
        const e = (endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
        const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
        const large = angle > 180 ? 1 : 0;
        return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={d.color} strokeWidth={stroke} strokeLinecap="butt" />;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={16} fontWeight="900">{fmt(total)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9}>{currency}</text>
    </svg>
  );
}

function DarkTrendChart({ data }: { data: { date: string; amount: number }[] }) {
  if (!data.some((d) => d.amount > 0)) {
    return <div className="grid min-h-[140px] place-items-center text-sm text-slate-500">No spending data</div>;
  }

  const maxVal = Math.max(...data.map((d) => d.amount), 1) * 1.15;
  const xStep = (W - PL - PR) / Math.max(data.length - 1, 1);
  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + ((maxVal - v) / maxVal) * (H - PT - PB);

  const points = data.map((d, i) => `${toX(i)},${toY(d.amount)}`).join(" ");
  const areaPath = `M ${PL},${H - PB} ${data.map((d, i) => `L ${toX(i)},${toY(d.amount)}`).join(" ")} L ${toX(data.length - 1)},${H - PB} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="pTrendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((pct) => {
        const y = PT + (1 - pct) * (H - PT - PB);
        return <line key={pct} x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
      })}

      <path d={areaPath} fill="url(#pTrendGrad)" />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinejoin="round" />

      {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, _, arr) => {
        const idx = data.indexOf(d);
        const label = new Date(d.date).toLocaleDateString("en-US", { day: "numeric", month: "short" });
        return (
          <text key={d.date} x={toX(idx)} y={H - PB + 14} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9}>{label}</text>
        );
      })}
    </svg>
  );
}
