"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type Budget = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: string;
  alertAtPct: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  categoryId: string | null;
  category: Category | null;
  spent: number;
  remaining: number;
  usedPct: number;
  status: "safe" | "warning" | "exceeded";
  createdAt: string;
};

const STATUS_STYLES = {
  safe: {
    bar: "bg-mint",
    badge: "bg-mint/10 text-mint",
    icon: <CheckCircle2 size={16} className="text-mint" />,
    label: "On Track",
  },
  warning: {
    bar: "bg-amber",
    badge: "bg-amber/10 text-amber",
    icon: <AlertTriangle size={16} className="text-amber" />,
    label: "Warning",
  },
  exceeded: {
    bar: "bg-coral",
    badge: "bg-coral/10 text-coral",
    icon: <ShieldAlert size={16} className="text-coral" />,
    label: "Exceeded",
  },
};

export function BudgetPlanner() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formAlertPct, setFormAlertPct] = useState("80");

  const formRef = useRef<HTMLDivElement | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch("/api/budgets");
      const data = await res.json();
      if (data.budgets) setBudgets(data.budgets);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/budgets").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([budgetData, catData]) => {
        if (budgetData.budgets) setBudgets(budgetData.budgets);
        if (catData.categories) {
          setCategories(
            catData.categories.filter((c: Category & { name: string }) => c.name !== "Income")
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormCategoryId("");
    setFormAmount("");
    setFormAlertPct("80");
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (b: Budget) => {
    setEditingId(b.id);
    setFormCategoryId(b.categoryId ?? "");
    setFormAmount(String(b.amount));
    setFormAlertPct(String(b.alertAtPct));
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const handleSubmit = async () => {
    const cat = categories.find((c) => c.id === formCategoryId);
    const amount = parseFloat(formAmount);
    if (!formCategoryId || isNaN(amount) || amount <= 0) return;

    setSaving(true);
    try {
      const body = {
        categoryId: formCategoryId,
        name: cat ? `${cat.name} Budget` : "Budget",
        amount,
        currency: budgets[0]?.currency ?? "THB",
        period: "MONTHLY",
        startsAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        alertAtPct: parseInt(formAlertPct) || 80,
        isActive: true,
      };

      if (editingId) {
        const res = await fetch(`/api/budgets/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Create failed");
      }

      resetForm();
      await fetchBudgets();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeletingId(null);
      await fetchBudgets();
    } catch {
      // silent
    }
  };

  const usedCategoryIds = budgets
    .filter((b) => b.categoryId && b.id !== editingId)
    .map((b) => b.categoryId);
  const availableCategories = categories.filter((c) => !usedCategoryIds.includes(c.id));

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (loading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-teal" size={32} />
          <p className="mt-3 text-sm font-bold text-muted">Loading budgets...</p>
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
            <p className="text-sm font-bold text-muted">Total Budget</p>
            <p className="mt-1 text-2xl font-black text-ink">{fmt(totalBudget)}</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ocean/10 text-ocean">
            <CircleDollarSign size={20} />
          </div>
        </div>
        <div className="panel flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-bold text-muted">Total Spent</p>
            <p className={`mt-1 text-2xl font-black ${totalSpent > totalBudget ? "text-coral" : "text-ink"}`}>
              {fmt(totalSpent)}
            </p>
          </div>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${totalSpent > totalBudget ? "bg-coral/10 text-coral" : "bg-amber/10 text-amber"}`}>
            <AlertTriangle size={20} />
          </div>
        </div>
        <div className="panel flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-bold text-muted">Remaining</p>
            <p className={`mt-1 text-2xl font-black ${totalRemaining >= 0 ? "text-mint" : "text-coral"}`}>
              {totalRemaining >= 0 ? fmt(totalRemaining) : `-${fmt(Math.abs(totalRemaining))}`}
            </p>
          </div>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${totalRemaining >= 0 ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Overall progress */}
      {budgets.length > 0 && (
        <div className="panel p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-muted">Overall monthly usage</span>
            <span className={`font-extrabold ${overallPct > 100 ? "text-coral" : overallPct >= 80 ? "text-amber" : "text-mint"}`}>
              {overallPct}%
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallPct > 100 ? "bg-coral" : overallPct >= 80 ? "bg-amber" : "bg-mint"
              }`}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-muted">
            {fmt(totalSpent)} of {fmt(totalBudget)} {budgets[0]?.currency ?? "THB"} used this month
          </p>
        </div>
      )}

      {/* Budget list */}
      <div className="grid gap-3">
        {budgets.map((b) => {
          const style = STATUS_STYLES[b.status];
          const isDeleting = deletingId === b.id;

          return (
            <article key={b.id} className="panel overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white font-bold text-sm"
                      style={{ backgroundColor: b.category?.color ?? "#687188" }}
                    >
                      {b.category?.name.charAt(0) ?? "B"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-ink">{b.category?.name ?? b.name}</h4>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${style.badge}`}>
                          {style.icon} {style.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-muted">
                        {fmt(b.amount)} {b.currency}/{b.period.toLowerCase()} &middot; Alert at {b.alertAtPct}%
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
                      onClick={() => startEdit(b)}
                      type="button"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-coral/10 hover:text-coral"
                      onClick={() => setDeletingId(isDeleting ? null : b.id)}
                      type="button"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-end justify-between text-sm">
                    <div>
                      <span className="text-2xl font-black text-ink">{fmt(b.spent)}</span>
                      <span className="ml-1 font-bold text-muted">/ {fmt(b.amount)} {b.currency}</span>
                    </div>
                    <span className={`text-lg font-extrabold ${b.usedPct > 100 ? "text-coral" : b.usedPct >= 80 ? "text-amber" : "text-mint"}`}>
                      {b.usedPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                      style={{ width: `${Math.min(b.usedPct, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-bold">
                    <span className="text-muted">Spent: {fmt(b.spent)} {b.currency}</span>
                    <span className={b.remaining >= 0 ? "text-mint" : "text-coral"}>
                      {b.remaining >= 0
                        ? `${fmt(b.remaining)} ${b.currency} left`
                        : `${fmt(Math.abs(b.remaining))} ${b.currency} over`}
                    </span>
                  </div>
                </div>

                {/* Exceeded warning */}
                {b.status === "exceeded" && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-coral/5 border border-coral/20 px-3 py-2.5">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0 text-coral" />
                    <p className="text-xs font-bold leading-5 text-coral">
                      Budget exceeded by {fmt(Math.abs(b.remaining))} {b.currency}! Consider reducing {b.category?.name ?? "this category"} spending.
                    </p>
                  </div>
                )}

                {b.status === "warning" && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber/5 border border-amber/20 px-3 py-2.5">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber" />
                    <p className="text-xs font-bold leading-5 text-amber">
                      Approaching limit — only {fmt(b.remaining)} {b.currency} remaining for {b.category?.name ?? "this budget"}.
                    </p>
                  </div>
                )}
              </div>

              {/* Delete confirmation */}
              {isDeleting && (
                <div className="flex items-center justify-between border-t border-coral/20 bg-coral/5 px-5 py-3">
                  <p className="text-sm font-bold text-coral">Delete this budget?</p>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-muted hover:bg-white"
                      onClick={() => setDeletingId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-lg bg-coral px-3 py-1.5 text-xs font-extrabold text-white hover:opacity-90"
                      onClick={() => handleDelete(b.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Empty state */}
      {budgets.length === 0 && !showForm && (
        <div className="panel grid min-h-[240px] place-items-center p-8 text-center">
          <div>
            <CircleDollarSign size={40} className="mx-auto text-teal" />
            <p className="mt-4 text-xl font-black text-ink">No budgets yet</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Create category budgets to track your monthly spending limits.
            </p>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90"
              onClick={() => setShowForm(true)}
              type="button"
            >
              <Plus size={16} /> Create your first budget
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div ref={formRef} className="panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-ink">
              {editingId ? "Edit Budget" : "New Budget"}
            </h3>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-slate-100"
              onClick={resetForm}
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {/* Category select */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Category</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                >
                  <option value="">Select category...</option>
                  {(editingId ? categories : availableCategories).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Monthly Limit</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="number"
                min="1"
                step="100"
                placeholder="e.g. 8000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>

            {/* Alert threshold */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">Alert at (%)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                type="number"
                min="1"
                max="100"
                placeholder="80"
                value={formAlertPct}
                onChange={(e) => setFormAlertPct(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
              disabled={saving || !formCategoryId || !formAmount}
              onClick={handleSubmit}
              type="button"
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={16} /> Saving...</>
              ) : editingId ? (
                <><Pencil size={16} /> Update Budget</>
              ) : (
                <><Plus size={16} /> Create Budget</>
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

      {/* Add budget button when budgets exist */}
      {budgets.length > 0 && !showForm && availableCategories.length > 0 && (
        <button
          className="panel flex w-full items-center justify-center gap-2 p-4 text-sm font-extrabold text-teal hover:bg-teal/5 transition-colors"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus size={16} /> Add Category Budget
        </button>
      )}
    </div>
  );
}
