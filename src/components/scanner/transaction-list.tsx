"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type Transaction = {
  id: string;
  merchant: string;
  description: string | null;
  amount: string;
  type: string;
  source: string;
  occurredAt: string;
  aiConfidence: number | null;
  aiMetadata: Record<string, unknown> | null;
  category: Category | null;
};

type ClassificationInfo = {
  category: string;
  confidence: number;
  explanation: string;
  modelName: string;
};

export function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [classifyingAll, setClassifyingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, catRes] = await Promise.all([
        fetch("/api/transactions?take=100"),
        fetch("/api/categories"),
      ]);

      if (!txRes.ok || !catRes.ok) throw new Error("Failed to load data.");

      const txData = await txRes.json();
      const catData = await catRes.json();

      setTransactions(txData.transactions);
      setCategories(catData.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateCategory = useCallback(async (transactionId: string, categoryId: string) => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });

      if (!res.ok) throw new Error("Update failed.");

      const { transaction } = await res.json();
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, category: transaction.category } : tx))
      );
      setEditingId(null);
    } catch {
      setError("Failed to update category.");
    }
  }, []);

  const classifySingle = useCallback(async (transactionId: string) => {
    try {
      setClassifyingId(transactionId);
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });

      if (!res.ok) throw new Error("Classification failed.");

      const data = await res.json();
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? {
                ...tx,
                category: data.transaction.category,
                aiConfidence: data.classification.confidence,
                aiMetadata: {
                  ...(tx.aiMetadata ?? {}),
                  classifiedCategory: data.classification.category,
                  classificationConfidence: data.classification.confidence,
                  classificationExplanation: data.classification.explanation,
                },
              }
            : tx
        )
      );
    } catch {
      setError("Failed to classify transaction.");
    } finally {
      setClassifyingId(null);
    }
  }, []);

  const classifyAll = useCallback(async () => {
    const uncategorized = transactions.filter((tx) => !tx.category);
    if (uncategorized.length === 0) return;

    try {
      setClassifyingAll(true);
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: uncategorized.map((tx) => tx.id) }),
      });

      if (!res.ok) throw new Error("Batch classification failed.");

      const data = await res.json();
      const updates = new Map<string, { category: Category; confidence: number; classification: ClassificationInfo }>();

      for (const item of data.results) {
        updates.set(item.transaction.id, {
          category: item.transaction.category,
          confidence: item.classification.confidence,
          classification: item.classification,
        });
      }

      setTransactions((prev) =>
        prev.map((tx) => {
          const update = updates.get(tx.id);
          if (!update) return tx;
          return {
            ...tx,
            category: update.category,
            aiConfidence: update.confidence,
            aiMetadata: {
              ...(tx.aiMetadata ?? {}),
              classifiedCategory: update.classification.category,
              classificationConfidence: update.classification.confidence,
              classificationExplanation: update.classification.explanation,
            },
          };
        })
      );
    } catch {
      setError("Failed to classify transactions.");
    } finally {
      setClassifyingAll(false);
    }
  }, [transactions]);

  const uncategorizedCount = transactions.filter((tx) => !tx.category).length;

  if (loading) {
    return (
      <div className="grid min-h-[300px] place-items-center">
        <Loader2 className="animate-spin text-teal" size={32} />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="panel grid min-h-[300px] place-items-center p-8 text-center">
        <div>
          <Bot size={40} className="mx-auto text-slate-300" />
          <p className="mt-4 font-black">No transactions yet</p>
          <p className="mt-1 text-sm text-muted">
            Scan a slip or add a transaction to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">
          <AlertCircle size={18} />
          <span className="font-bold">{error}</span>
          <button className="ml-auto" onClick={() => setError(null)} type="button">
            <X size={16} />
          </button>
        </div>
      )}

      {uncategorizedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber/30 bg-amber/10 px-5 py-4">
          <div>
            <p className="font-black text-ink">
              {uncategorizedCount} uncategorized transaction{uncategorizedCount > 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              Let AI classify them automatically based on merchant and amount.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-3 font-extrabold text-white hover:opacity-90 disabled:opacity-50"
            disabled={classifyingAll}
            onClick={classifyAll}
            type="button"
          >
            {classifyingAll ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Classifying...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Classify all
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            categories={categories}
            isEditing={editingId === tx.id}
            isClassifying={classifyingId === tx.id}
            onEdit={() => setEditingId(tx.id)}
            onCancelEdit={() => setEditingId(null)}
            onSelectCategory={(catId) => updateCategory(tx.id, catId)}
            onClassify={() => classifySingle(tx.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  categories,
  isEditing,
  isClassifying,
  onEdit,
  onCancelEdit,
  onSelectCategory,
  onClassify,
}: {
  tx: Transaction;
  categories: Category[];
  isEditing: boolean;
  isClassifying: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSelectCategory: (categoryId: string) => void;
  onClassify: () => void;
}) {
  const meta = tx.aiMetadata as Record<string, unknown> | null;
  const explanation = meta?.classificationExplanation as string | undefined;
  const classConfidence = meta?.classificationConfidence as number | undefined;
  const amount = Number(tx.amount);
  const isIncome = tx.type === "INCOME";
  const date = new Date(tx.occurredAt);

  return (
    <div className="panel p-4">
      <div className="flex items-start gap-4">
        {/* Category dot */}
        <div className="mt-1 flex flex-col items-center gap-1">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: tx.category?.color ?? "#d1d5db" }}
          />
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-black">{tx.merchant}</p>
            {tx.source === "SLIP_SCAN" && (
              <span className="shrink-0 rounded bg-teal/10 px-2 py-0.5 text-[11px] font-bold text-teal">
                SCAN
              </span>
            )}
          </div>

          {tx.description && (
            <p className="mt-0.5 truncate text-sm text-muted">{tx.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Category badge / editor */}
            {isEditing ? (
              <CategorySelector
                categories={categories}
                currentId={tx.category?.id ?? null}
                onSelect={onSelectCategory}
                onCancel={onCancelEdit}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                {tx.category ? (
                  <button
                    className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-ink hover:border-teal hover:bg-teal/5"
                    onClick={onEdit}
                    type="button"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tx.category.color }}
                    />
                    {tx.category.name}
                    <Pencil size={12} className="text-muted group-hover:text-teal" />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm font-bold text-muted hover:border-teal hover:text-teal"
                    onClick={onEdit}
                    type="button"
                  >
                    + Add category
                  </button>
                )}

                {!tx.category && (
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-3 py-1 text-sm font-bold text-teal hover:bg-teal/20 disabled:opacity-50"
                    disabled={isClassifying}
                    onClick={onClassify}
                    type="button"
                  >
                    {isClassifying ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    AI classify
                  </button>
                )}
              </div>
            )}

            {/* Confidence badge */}
            {classConfidence != null && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-muted">
                AI {(classConfidence * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Explanation */}
          {explanation && (
            <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-muted">
              <Bot size={14} className="mt-0.5 shrink-0 text-teal" />
              {explanation}
            </p>
          )}
        </div>

        {/* Amount + date */}
        <div className="shrink-0 text-right">
          <p className={`font-black ${isIncome ? "text-mint" : "text-ink"}`}>
            {isIncome ? "+" : "-"}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-sm text-muted">
            {date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
    </div>
  );
}

function CategorySelector({
  categories,
  currentId,
  onSelect,
  onCancel,
}: {
  categories: Category[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-1.5 rounded-full border border-teal bg-teal/5 px-3 py-1 text-sm font-bold text-teal"
        onClick={() => setOpen(!open)}
        type="button"
      >
        Select category <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-bold hover:bg-slate-50 ${
                cat.id === currentId ? "bg-teal/5 text-teal" : "text-ink"
              }`}
              onClick={() => {
                onSelect(cat.id);
                setOpen(false);
              }}
              type="button"
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
              {cat.id === currentId && <Check size={14} className="ml-auto text-teal" />}
            </button>
          ))}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-muted hover:bg-slate-50"
              onClick={onCancel}
              type="button"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
