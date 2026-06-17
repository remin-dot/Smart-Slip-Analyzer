"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  Crown,
  Gem,
  Loader2,
  Lock,
  Percent,
  PiggyBank,
  ShieldCheck,
  Sprout,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
};

type Level = { rank: number; name: string; minXp: number; icon: string };

type Stats = {
  unlockedCount: number;
  totalAchievements: number;
  totalSaving: number;
  txCount: number;
  completedGoals: number;
  monthsActive: number;
  savingRate: number;
};

type Data = {
  xp: number;
  level: Level;
  nextLevel: Level | null;
  levelProgress: number;
  levels: Level[];
  achievements: Achievement[];
  stats: Stats;
  currency: string;
};

const ICON_MAP: Record<string, typeof Star> = {
  Sprout, Wallet, TrendingUp, Crown, PiggyBank, Gem, ShieldCheck,
  ClipboardList, Target, Trophy, BarChart3, Building2, Percent,
  ArrowDownCircle, Calendar,
};

const LEVEL_COLORS = ["#687188", "#087f7a", "#2855a3", "#cf8b21"];

export function GamificationPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/gamification")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="mt-3 text-sm font-bold">Loading your progress…</p>
      </div>
    );
  }

  if (!data) return <div className="panel p-6 text-center text-coral font-bold">Could not load gamification data.</div>;

  const { xp, level, nextLevel, levelProgress, levels, achievements, stats, currency } = data;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const LevelIcon = ICON_MAP[level.icon] ?? Star;

  return (
    <div className="space-y-6">
      {/* Level hero card */}
      <div className="panel overflow-hidden">
        <div className="relative p-6" style={{ background: `linear-gradient(135deg, ${LEVEL_COLORS[level.rank - 1]}18, ${LEVEL_COLORS[level.rank - 1]}08)` }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
                style={{ background: LEVEL_COLORS[level.rank - 1] }}
              >
                <LevelIcon size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted">Level {level.rank}</p>
                <h2 className="text-2xl font-black text-ink">{level.name}</h2>
                <p className="mt-0.5 text-sm font-bold" style={{ color: LEVEL_COLORS[level.rank - 1] }}>{fmt(xp)} XP</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-muted">
                {stats.unlockedCount}/{stats.totalAchievements} achievements
              </p>
              <p className="text-sm text-muted">{stats.savingRate}% saving rate</p>
            </div>
          </div>

          {/* XP progress bar */}
          {nextLevel && (
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs font-bold text-muted">
                <span>{level.name}</span>
                <span>{nextLevel.name}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/60">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${levelProgress}%`, background: LEVEL_COLORS[level.rank - 1] }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-muted">
                {fmt(nextLevel.minXp - xp)} XP to next level
              </p>
            </div>
          )}
          {!nextLevel && (
            <p className="mt-4 text-center text-sm font-bold" style={{ color: LEVEL_COLORS[3] }}>
              Max level reached!
            </p>
          )}
        </div>
      </div>

      {/* Level roadmap */}
      <div className="panel p-5">
        <p className="eyebrow">Your journey</p>
        <h3 className="mt-1 text-lg font-black text-ink">Level Roadmap</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {levels.map((lv) => {
            const Icon = ICON_MAP[lv.icon] ?? Star;
            const reached = xp >= lv.minXp;
            return (
              <div
                key={lv.rank}
                className={`relative rounded-xl border-2 p-4 text-center transition-all ${reached ? "" : "opacity-50 grayscale"}`}
                style={{ borderColor: reached ? LEVEL_COLORS[lv.rank - 1] + "40" : "#e5e7eb" }}
              >
                <div
                  className="mx-auto grid h-12 w-12 place-items-center rounded-xl text-white"
                  style={{ background: reached ? LEVEL_COLORS[lv.rank - 1] : "#cbd5e1" }}
                >
                  <Icon size={22} />
                </div>
                <p className="mt-2 text-sm font-black text-ink">{lv.name}</p>
                <p className="text-xs text-muted">{fmt(lv.minXp)} XP</p>
                {level.rank === lv.rank && (
                  <span className="absolute -top-2 right-2 rounded-full bg-teal px-2 py-0.5 text-[10px] font-black text-white">
                    YOU
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Transactions" value={fmt(stats.txCount)} color="#087f7a" />
        <StatCard label="Total Saved" value={`${fmt(stats.totalSaving)} ${currency}`} color="#20875a" />
        <StatCard label="Goals Completed" value={String(stats.completedGoals)} color="#2855a3" />
        <StatCard label="Months Active" value={String(stats.monthsActive)} color="#cf8b21" />
      </div>

      {/* Achievements */}
      <div className="panel p-5">
        <p className="eyebrow">Achievements</p>
        <h3 className="mt-1 text-lg font-black text-ink">
          {stats.unlockedCount} of {stats.totalAchievements} Unlocked
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-bold" style={{ color }}>{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function AchievementCard({ achievement: a }: { achievement: Achievement }) {
  const Icon = ICON_MAP[a.icon] ?? Star;
  const pct = a.target > 0 ? Math.min(Math.round((a.progress / a.target) * 100), 100) : 0;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className={`rounded-xl border p-4 transition-all ${a.unlocked ? "border-teal/30 bg-teal/5" : "border-slate-200 opacity-70"}`}>
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ${a.unlocked ? "bg-teal text-white" : "bg-slate-100 text-slate-400"}`}
        >
          {a.unlocked ? <Icon size={18} /> : <Lock size={16} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-extrabold text-ink">{a.name}</p>
            {a.unlocked && <span className="text-xs text-teal">&#10003;</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted">{a.description}</p>

          {!a.unlocked && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-300 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-muted">{fmt(a.progress)} / {fmt(a.target)}</p>
            </div>
          )}

          {a.unlocked && a.unlockedAt && (
            <p className="mt-1 text-[10px] text-teal">
              Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
