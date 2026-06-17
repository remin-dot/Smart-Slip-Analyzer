"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";

type Feasibility = "on_track" | "tight" | "difficult" | "completed" | "overdue";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  currency: string;
  targetDate: string | null;
  status: string;
  progressPct: number;
  monthsLeft: number;
  daysLeft: number;
  monthlySavingRequired: number;
  isOverdue: boolean;
  feasibility: Feasibility;
  createdAt: string;
};

const FEASIBILITY_STYLES: Record<Feasibility, { badge: string; label: string; icon: React.ReactNode }> = {
  on_track: { badge: "bg-mint/10 text-mint", label: "On Track", icon: <CheckCircle2 size={14} /> },
  tight: { badge: "bg-amber/10 text-amber", label: "Tight", icon: <Clock size={14} /> },
  difficult: { badge: "bg-coral/10 text-coral", label: "Difficult", icon: <AlertTriangle size={14} /> },
  completed: { badge: "bg-teal/10 text-teal", label: "Completed", icon: <Trophy size={14} /> },
  overdue: { badge: "bg-coral/10 text-coral", label: "Overdue", icon: <AlertTriangle size={14} /> },
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function SavingGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingFundsId, setAddingFundsId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [fundSaving, setFundSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("0");
  const [formDeadline, setFormDeadline] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");

  const formRef = useRef<HTMLDivElement | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      if (data.goals) setGoals(data.goals);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => { if (data.goals) setGoals(data.goals); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormTarget("");
    setFormCurrent("0");
    setFormDeadline("");
    setFormStatus("ACTIVE");
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (g: Goal) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormTarget(String(g.targetAmount));
    setFormCurrent(String(g.currentAmount));
    setFormDeadline(g.targetDate ? g.targetDate.slice(0, 10) : "");
    setFormStatus(g.status);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const handleSubmit = async () => {
    const target = parseFloat(formTarget);
    const current = parseFloat(formCurrent) || 0;
    if (!formName.trim() || isNaN(target) || target <= 0) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        targetAmount: target,
        currentAmount: current,
        status: formStatus,
      };
      if (formDeadline) {
        body.targetDate = new Date(formDeadline).toISOString();
      } else {
        body.targetDate = null;
      }

      if (editingId) {
        const res = await fetch(`/api/goals/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Create failed");
      }

      resetForm();
      await fetchGoals();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeletingId(null);
      await fetchGoals();
    } catch {
      // silent
    }
  };

  const handleAddFunds = async (goal: Goal) => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;

    setFundSaving(true);
    try {
      const newCurrent = goal.currentAmount + amount;
      const body: Record<string, unknown> = {
        currentAmount: newCurrent,
      };
      if (newCurrent >= goal.targetAmount) {
        body.status = "COMPLETED";
      }

      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");

      setAddingFundsId(null);
      setFundAmount("");
      await fetchGoals();
    } catch {
      // silent
    } finally {
      setFundSaving(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const otherGoals = goals.filter((g) => g.status !== "ACTIVE");
  const totalTarget = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalMonthlyRequired = activeGoals.reduce((s, g) => s + g.monthlySavingRequired, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const cur = goals[0]?.currency ?? "THB";

  if (loading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-teal" size={32} />
          <p className="mt-3 text-sm font-bold text-muted">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-bold text-muted">Total Target</p>
            <p className="mt-1 text-2xl font-black text-ink">{fmt(totalTarget)}</p>
            <p className="text-xs font-bold text-muted">{cur}</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ocean/10 text-ocean">
            <Target size={20} />
          </div>
        </div>
        <div className="panel flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-bold text-muted">Total Saved</p>
            <p className="mt-1 text-2xl font-black text-mint">{fmt(totalSaved)}</p>
            <p className="text-xs font-bold text-muted">{overallPct}% of target</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint">
            <Coins size={20} />
          </div>
        </div>
        <div className="panel flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-bold text-muted">Monthly Required</p>
            <p className="mt-1 text-2xl font-black text-amber">{fmt(totalMonthlyRequired)}</p>
            <p className="text-xs font-bold text-muted">{cur}/month total</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber/10 text-amber">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="grid gap-3">
          {activeGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              fmt={fmt}
              isDeleting={deletingId === g.id}
              isAddingFunds={addingFundsId === g.id}
              fundAmount={fundAmount}
              fundSaving={fundSaving}
              onEdit={() => startEdit(g)}
              onDelete={() => setDeletingId(deletingId === g.id ? null : g.id)}
              onConfirmDelete={() => handleDelete(g.id)}
              onCancelDelete={() => setDeletingId(null)}
              onStartAddFunds={() => { setAddingFundsId(g.id); setFundAmount(""); }}
              onCancelAddFunds={() => { setAddingFundsId(null); setFundAmount(""); }}
              onFundAmountChange={setFundAmount}
              onConfirmAddFunds={() => handleAddFunds(g)}
            />
          ))}
        </div>
      )}

      {/* Completed / Archived / Paused goals */}
      {otherGoals.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-extrabold text-muted uppercase tracking-wider">
            Completed &amp; Archived
          </p>
          <div className="grid gap-3">
            {otherGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                fmt={fmt}
                isDeleting={deletingId === g.id}
                isAddingFunds={addingFundsId === g.id}
                fundAmount={fundAmount}
                fundSaving={fundSaving}
                onEdit={() => startEdit(g)}
                onDelete={() => setDeletingId(deletingId === g.id ? null : g.id)}
                onConfirmDelete={() => handleDelete(g.id)}
                onCancelDelete={() => setDeletingId(null)}
                onStartAddFunds={() => { setAddingFundsId(g.id); setFundAmount(""); }}
                onCancelAddFunds={() => { setAddingFundsId(null); setFundAmount(""); }}
                onFundAmountChange={setFundAmount}
                onConfirmAddFunds={() => handleAddFunds(g)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && !showForm && (
        <div className="panel grid min-h-[280px] place-items-center p-8 text-center">
          <div>
            <Flag size={40} className="mx-auto text-teal" />
            <p className="mt-4 text-xl font-black text-ink">No saving goals yet</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              Set a goal like &quot;Buy laptop — 60,000 THB in 6 months&quot; and we&apos;ll calculate how much to save each month.
            </p>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90"
              onClick={() => setShowForm(true)}
              type="button"
            >
              <Plus size={16} /> Create your first goal
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div ref={formRef} className="panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-ink">
              {editingId ? "Edit Goal" : "New Saving Goal"}
            </h3>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-slate-100"
              onClick={resetForm}
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-muted">Goal Name</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="text"
                placeholder='e.g. "Buy laptop"'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Target Amount</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="number"
                min="1"
                step="1000"
                placeholder="e.g. 60000"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Deadline</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
              />
            </div>

            {editingId && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Current Amount Saved</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                    type="number"
                    min="0"
                    step="100"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Status</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* AI preview */}
          {formTarget && formDeadline && (
            <AiPreview
              target={parseFloat(formTarget) || 0}
              current={parseFloat(formCurrent) || 0}
              deadline={formDeadline}
              currency={cur}
              fmt={fmt}
            />
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
              disabled={saving || !formName.trim() || !formTarget}
              onClick={handleSubmit}
              type="button"
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={16} /> Saving...</>
              ) : editingId ? (
                <><Pencil size={16} /> Update Goal</>
              ) : (
                <><Plus size={16} /> Create Goal</>
              )}
            </button>
            <button
              className="rounded-lg px-4 py-2.5 text-sm font-extrabold text-muted hover:text-ink"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add goal button */}
      {goals.length > 0 && !showForm && (
        <button
          className="panel flex w-full items-center justify-center gap-2 p-4 text-sm font-extrabold text-teal hover:bg-teal/5 transition-colors"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus size={16} /> Add Saving Goal
        </button>
      )}
    </div>
  );
}

function AiPreview({
  target,
  current,
  deadline,
  currency,
  fmt,
}: {
  target: number;
  current: number;
  deadline: string;
  currency: string;
  fmt: (n: number) => string;
}) {
  const remaining = Math.max(target - current, 0);
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
  const monthsLeft = Math.max(Math.ceil(daysLeft / 30.44), 1);
  const monthly = Math.ceil(remaining / monthsLeft);
  const weekly = Math.ceil(remaining / Math.max(Math.ceil(daysLeft / 7), 1));
  const daily = Math.ceil(remaining / Math.max(daysLeft, 1));

  if (remaining <= 0) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-lg bg-mint/5 border border-mint/20 px-4 py-3">
        <Trophy size={18} className="mt-0.5 shrink-0 text-mint" />
        <p className="text-sm font-bold text-mint">Target already reached!</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg bg-ocean/5 border border-ocean/20 p-4">
      <div className="flex items-center gap-2 text-sm font-extrabold text-ocean">
        <TrendingUp size={16} /> AI Saving Calculation
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-white/60 p-3 text-center">
          <p className="text-xl font-black text-ink">{fmt(monthly)}</p>
          <p className="text-xs font-bold text-muted">{currency}/month</p>
        </div>
        <div className="rounded-lg bg-white/60 p-3 text-center">
          <p className="text-xl font-black text-ink">{fmt(weekly)}</p>
          <p className="text-xs font-bold text-muted">{currency}/week</p>
        </div>
        <div className="rounded-lg bg-white/60 p-3 text-center">
          <p className="text-xl font-black text-ink">{fmt(daily)}</p>
          <p className="text-xs font-bold text-muted">{currency}/day</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-muted">
        Save <strong className="text-ink">{fmt(monthly)} {currency}/month</strong> for{" "}
        <strong className="text-ink">{monthsLeft} month{monthsLeft !== 1 ? "s" : ""}</strong> to
        reach your goal of {fmt(target)} {currency}.
        {current > 0 && <> You&apos;ve already saved {fmt(current)} {currency} — {fmt(remaining)} {currency} to go.</>}
      </p>
    </div>
  );
}

function GoalCard({
  goal: g,
  fmt,
  isDeleting,
  isAddingFunds,
  fundAmount,
  fundSaving,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onStartAddFunds,
  onCancelAddFunds,
  onFundAmountChange,
  onConfirmAddFunds,
}: {
  goal: Goal;
  fmt: (n: number) => string;
  isDeleting: boolean;
  isAddingFunds: boolean;
  fundAmount: string;
  fundSaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onStartAddFunds: () => void;
  onCancelAddFunds: () => void;
  onFundAmountChange: (v: string) => void;
  onConfirmAddFunds: () => void;
}) {
  const f = FEASIBILITY_STYLES[g.feasibility];
  const isCompleted = g.status === "COMPLETED" || g.progressPct >= 100;
  const isPaused = g.status === "PAUSED";
  const isArchived = g.status === "ARCHIVED";
  const dimmed = isPaused || isArchived;

  const barColor = isCompleted
    ? "bg-teal"
    : g.feasibility === "on_track"
      ? "bg-mint"
      : g.feasibility === "tight"
        ? "bg-amber"
        : "bg-coral";

  return (
    <article className={`panel overflow-hidden ${dimmed ? "opacity-60" : ""}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
              isCompleted ? "bg-teal/10 text-teal" : "bg-ocean/10 text-ocean"
            }`}>
              {isCompleted ? <Trophy size={20} /> : isPaused ? <Archive size={20} /> : <Flag size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-ink">{g.name}</h4>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${f.badge}`}>
                  {f.icon} {f.label}
                </span>
                {isPaused && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-muted">Paused</span>
                )}
              </div>
              <p className="text-xs font-bold text-muted">
                {g.targetDate
                  ? <>Deadline: {new Date(g.targetDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} &middot; {g.daysLeft > 0 ? `${g.daysLeft} days left` : "Overdue"}</>
                  : "No deadline set"
                }
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {g.status === "ACTIVE" && (
              <button
                className="grid h-8 w-8 place-items-center rounded-lg text-mint hover:bg-mint/10"
                onClick={onStartAddFunds}
                type="button"
                title="Add funds"
              >
                <Coins size={14} />
              </button>
            )}
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
              onClick={onEdit}
              type="button"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-coral/10 hover:text-coral"
              onClick={onDelete}
              type="button"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-end justify-between text-sm">
            <div>
              <span className="text-2xl font-black text-ink">{fmt(g.currentAmount)}</span>
              <span className="ml-1 font-bold text-muted">/ {fmt(g.targetAmount)} {g.currency}</span>
            </div>
            <span className={`text-lg font-extrabold ${isCompleted ? "text-teal" : g.progressPct >= 50 ? "text-mint" : "text-ocean"}`}>
              {g.progressPct}%
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${Math.min(g.progressPct, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs font-bold">
            <span className="text-muted">Saved: {fmt(g.currentAmount)} {g.currency}</span>
            <span className={g.remaining > 0 ? "text-ocean" : "text-teal"}>
              {g.remaining > 0
                ? `${fmt(g.remaining)} ${g.currency} to go`
                : "Goal reached!"
              }
            </span>
          </div>
        </div>

        {/* AI calculation for active goals */}
        {g.status === "ACTIVE" && g.monthlySavingRequired > 0 && g.remaining > 0 && (
          <div className="mt-3 flex items-start gap-3 rounded-lg bg-ocean/5 border border-ocean/20 px-4 py-3">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-ocean" />
            <div className="text-xs font-bold leading-5">
              <span className="text-ink">
                Save {fmt(g.monthlySavingRequired)} {g.currency}/month
              </span>
              <span className="text-muted">
                {" "}for {g.monthsLeft} month{g.monthsLeft !== 1 ? "s" : ""} to reach your target
              </span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-teal/5 border border-teal/20 px-4 py-3">
            <Trophy size={16} className="mt-0.5 shrink-0 text-teal" />
            <p className="text-xs font-bold leading-5 text-teal">
              Congratulations! You&apos;ve reached your saving goal!
            </p>
          </div>
        )}

        {g.isOverdue && !isCompleted && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-coral/5 border border-coral/20 px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-coral" />
            <p className="text-xs font-bold leading-5 text-coral">
              This goal is past its deadline. Still {fmt(g.remaining)} {g.currency} to go — consider extending the date or adjusting the target.
            </p>
          </div>
        )}
      </div>

      {/* Add funds inline */}
      {isAddingFunds && (
        <div className="flex items-center gap-3 border-t border-mint/20 bg-mint/5 px-5 py-3">
          <Coins size={16} className="shrink-0 text-mint" />
          <input
            className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            type="number"
            min="1"
            step="100"
            placeholder="Amount"
            value={fundAmount}
            onChange={(e) => onFundAmountChange(e.target.value)}
            autoFocus
          />
          <button
            className="rounded-lg bg-mint px-3 py-1.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-50"
            disabled={fundSaving || !fundAmount}
            onClick={onConfirmAddFunds}
            type="button"
          >
            {fundSaving ? "Saving..." : "Add Funds"}
          </button>
          <button
            className="text-xs font-extrabold text-muted hover:text-ink"
            onClick={onCancelAddFunds}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {isDeleting && (
        <div className="flex items-center justify-between border-t border-coral/20 bg-coral/5 px-5 py-3">
          <p className="text-sm font-bold text-coral">Delete this goal?</p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-muted hover:bg-white"
              onClick={onCancelDelete}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-coral px-3 py-1.5 text-xs font-extrabold text-white hover:opacity-90"
              onClick={onConfirmDelete}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
