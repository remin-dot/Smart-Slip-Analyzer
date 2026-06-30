"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  ArrowUpDown,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
  currency: string;
  type: string;
  source: string;
  occurredAt: string;
  aiConfidence: number | null;
  aiMetadata: Record<string, unknown> | null;
  category: Category | null;
};

type SortField = "occurredAt" | "amount" | "merchant";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const SOURCE_LABEL_KEYS: Record<string, string> = {
  MANUAL: "tx.srcManual",
  SLIP_SCAN: "tx.srcSlipScan",
  BANK_IMPORT: "tx.srcBankImport",
  AI_INFERRED: "tx.srcAiInferred",
};

export function TransactionList() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Sort
  const [sortBy, setSortBy] = useState<SortField>("occurredAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(0);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    merchant: string;
    amount: string;
    occurredAt: string;
    categoryId: string;
    type: string;
  } | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI classify
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [classifyingAll, setClassifyingAll] = useState(false);

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [debouncedSearch, filterCategory, filterType, filterSource, filterFrom, filterTo, sortBy, sortDir]);

  // Fetch categories once
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("take", String(PAGE_SIZE));
      params.set("skip", String(page * PAGE_SIZE));
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterType) params.set("type", filterType);
      if (filterSource) params.set("source", filterSource);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error("load");
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch {
      setError(t("tx.loadError"));
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, debouncedSearch, filterCategory, filterType, filterSource, filterFrom, filterTo, t]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Sort toggle
  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "merchant" ? "asc" : "desc");
    }
  };

  // Inline edit
  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({
      merchant: tx.merchant,
      amount: String(Number(tx.amount)),
      occurredAt: tx.occurredAt.slice(0, 10),
      categoryId: tx.category?.id ?? "",
      type: tx.type,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    try {
      const body: Record<string, unknown> = {
        merchant: editForm.merchant,
        amount: Number(editForm.amount),
        occurredAt: new Date(editForm.occurredAt).toISOString(),
        type: editForm.type,
      };
      if (editForm.categoryId) body.categoryId = editForm.categoryId;
      else body.categoryId = null;

      const res = await fetch(`/api/transactions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save");
      cancelEdit();
      fetchTransactions();
    } catch {
      setError(t("tx.saveError"));
    }
  };

  // Delete
  const confirmDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      setDeletingId(null);
      fetchTransactions();
    } catch {
      setError(t("tx.deleteError"));
    }
  };

  // AI classify single
  const classifySingle = async (id: string) => {
    try {
      setClassifyingId(id);
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id }),
      });
      if (!res.ok) throw new Error("classify");
      fetchTransactions();
    } catch {
      setError(t("tx.classifyError"));
    } finally {
      setClassifyingId(null);
    }
  };

  // AI classify all uncategorized
  const classifyAll = async () => {
    const ids = transactions.filter((tx) => !tx.category).map((tx) => tx.id);
    if (ids.length === 0) return;
    try {
      setClassifyingAll(true);
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: ids }),
      });
      if (!res.ok) throw new Error("classify");
      fetchTransactions();
    } catch {
      setError(t("tx.classifyError"));
    } finally {
      setClassifyingAll(false);
    }
  };

  const uncategorizedCount = transactions.filter((tx) => !tx.category).length;
  const hasFilters = debouncedSearch || filterCategory || filterType || filterSource || filterFrom || filterTo;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilterCategory("");
    setFilterType("");
    setFilterSource("");
    setFilterFrom("");
    setFilterTo("");
  };

  return (
    <div className="grid gap-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">
          <AlertCircle size={16} />
          <span className="font-bold">{error}</span>
          <button className="ml-auto" onClick={() => setError(null)} type="button"><X size={14} /></button>
        </div>
      )}

      {/* Toolbar: search + filters */}
      <div className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-ink outline-none placeholder:text-slate-400 focus:border-teal focus:ring-1 focus:ring-teal"
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("tx.searchPlaceholder")}
              type="text"
              value={search}
            />
          </div>

          {/* Category filter */}
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-teal"
            onChange={(e) => setFilterCategory(e.target.value)}
            value={filterCategory}
          >
            <option value="">{t("tx.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-teal"
            onChange={(e) => setFilterType(e.target.value)}
            value={filterType}
          >
            <option value="">{t("tx.allTypes")}</option>
            <option value="EXPENSE">{t("tx.expense")}</option>
            <option value="INCOME">{t("tx.income")}</option>
            <option value="TRANSFER">{t("tx.transfer")}</option>
          </select>

          {/* Source filter */}
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-teal"
            onChange={(e) => setFilterSource(e.target.value)}
            value={filterSource}
          >
            <option value="">{t("tx.allSources")}</option>
            <option value="MANUAL">{t("tx.srcManual")}</option>
            <option value="SLIP_SCAN">{t("tx.srcSlipScan")}</option>
            <option value="BANK_IMPORT">{t("tx.srcBankImport")}</option>
            <option value="AI_INFERRED">{t("tx.srcAiInferred")}</option>
          </select>

          {/* Date range */}
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-teal"
            onChange={(e) => setFilterFrom(e.target.value)}
            title={t("tx.fromDate")}
            type="date"
            value={filterFrom}
          />
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-teal"
            onChange={(e) => setFilterTo(e.target.value)}
            title={t("tx.toDate")}
            type="date"
            value={filterTo}
          />

          {hasFilters && (
            <button
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-muted hover:text-ink"
              onClick={clearFilters}
              type="button"
            >
              {t("tx.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Classify all banner */}
      {uncategorizedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber/30 bg-amber/10 px-5 py-3">
          <p className="text-sm font-bold text-ink">
            {t("tx.uncategorizedCount", { n: uncategorizedCount })}
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"
            disabled={classifyingAll}
            onClick={classifyAll}
            type="button"
          >
            {classifyingAll ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {t("tx.classifyAll")}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <SortHeader field="occurredAt" label={t("tx.colDate")} current={sortBy} dir={sortDir} onSort={toggleSort} />
                <SortHeader field="merchant" label={t("tx.colMerchant")} current={sortBy} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 font-extrabold text-muted">{t("tx.colCategory")}</th>
                <SortHeader field="amount" label={t("tx.colAmount")} current={sortBy} dir={sortDir} onSort={toggleSort} className="text-right" />
                <th className="px-4 py-3 font-extrabold text-muted">{t("tx.colSource")}</th>
                <th className="px-4 py-3 text-right font-extrabold text-muted">{t("tx.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={6}>
                    <Loader2 className="mx-auto animate-spin text-teal" size={28} />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={6}>
                    <Bot size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 font-black text-ink">
                      {hasFilters ? t("tx.noMatching") : t("tx.noTx")}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {hasFilters ? t("tx.tryAdjusting") : t("tx.getStarted")}
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) =>
                  editingId === tx.id && editForm ? (
                    <EditRow
                      key={tx.id}
                      form={editForm}
                      categories={categories}
                      onChange={setEditForm}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <TableRow
                      key={tx.id}
                      tx={tx}
                      isDeleting={deletingId === tx.id}
                      isClassifying={classifyingId === tx.id}
                      onEdit={() => startEdit(tx)}
                      onDelete={() => setDeletingId(tx.id)}
                      onConfirmDelete={() => confirmDelete(tx.id)}
                      onCancelDelete={() => setDeletingId(null)}
                      onClassify={() => classifySingle(tx.id)}
                    />
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-muted">
              {t("tx.showing", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total })}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="rounded-lg border border-slate-200 p-2 text-muted hover:bg-slate-50 hover:text-ink disabled:opacity-40"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i;
                } else if (page < 4) {
                  pageNum = i;
                } else if (page > totalPages - 5) {
                  pageNum = totalPages - 7 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${
                      pageNum === page
                        ? "bg-teal text-white"
                        : "text-muted hover:bg-slate-50 hover:text-ink"
                    }`}
                    onClick={() => setPage(pageNum)}
                    type="button"
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                className="rounded-lg border border-slate-200 p-2 text-muted hover:bg-slate-50 hover:text-ink disabled:opacity-40"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortHeader({
  field,
  label,
  current,
  dir,
  onSort,
  className = "",
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        className={`inline-flex items-center gap-1 font-extrabold ${active ? "text-teal" : "text-muted hover:text-ink"}`}
        onClick={() => onSort(field)}
        type="button"
      >
        {label}
        {active ? (
          dir === "asc" ? <ArrowUpDown size={14} /> : <ArrowDownUp size={14} />
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

function TableRow({
  tx,
  isDeleting,
  isClassifying,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onClassify,
}: {
  tx: Transaction;
  isDeleting: boolean;
  isClassifying: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onClassify: () => void;
}) {
  const { t } = useI18n();
  const amount = Number(tx.amount);
  const isIncome = tx.type === "INCOME";
  const date = new Date(tx.occurredAt);
  const meta = tx.aiMetadata as Record<string, unknown> | null;
  const explanation = meta?.classificationExplanation as string | undefined;

  return (
    <tr className="group border-b border-slate-50 transition-colors hover:bg-slate-50/50">
      {/* Date */}
      <td className="whitespace-nowrap px-4 py-3.5">
        <p className="font-bold text-ink">
          {date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </p>
        <p className="text-xs text-muted">
          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
      </td>

      {/* Merchant */}
      <td className="max-w-[240px] px-4 py-3.5">
        <p className="truncate font-black text-ink">{tx.merchant}</p>
        {tx.description && (
          <p className="mt-0.5 truncate text-xs text-muted">{tx.description}</p>
        )}
        {explanation && (
          <p className="mt-1 flex items-center gap-1 text-xs text-teal">
            <Bot size={11} /> {explanation}
          </p>
        )}
      </td>

      {/* Category */}
      <td className="px-4 py-3.5">
        {tx.category ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-ink">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tx.category.color }} />
            {tx.category.name}
          </span>
        ) : (
          <button
            className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal hover:bg-teal/20 disabled:opacity-50"
            disabled={isClassifying}
            onClick={onClassify}
            type="button"
          >
            {isClassifying ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
            {t("tx.classify")}
          </button>
        )}
      </td>

      {/* Amount */}
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        <span className={`font-black ${isIncome ? "text-mint" : "text-ink"}`}>
          {isIncome ? "+" : "-"}
          {amount.toLocaleString(undefined, { style: "currency", currency: tx.currency || "USD" })}
        </span>
      </td>

      {/* Source */}
      <td className="px-4 py-3.5">
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
          tx.source === "SLIP_SCAN"
            ? "bg-teal/10 text-teal"
            : tx.source === "AI_INFERRED"
              ? "bg-ocean/10 text-ocean"
              : "bg-slate-100 text-muted"
        }`}>
          {SOURCE_LABEL_KEYS[tx.source] ? t(SOURCE_LABEL_KEYS[tx.source]) : tx.source}
        </span>
      </td>

      {/* Actions */}
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        {isDeleting ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-xs font-bold text-coral">{t("tx.deleteQ")}</span>
            <button
              className="rounded p-1 text-coral hover:bg-coral/10"
              onClick={onConfirmDelete}
              title={t("tx.confirmDelete")}
              type="button"
            >
              <Check size={15} />
            </button>
            <button
              className="rounded p-1 text-muted hover:bg-slate-100"
              onClick={onCancelDelete}
              title={t("tx.cancel")}
              type="button"
            >
              <X size={15} />
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <button
              className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
              onClick={onEdit}
              title={t("tx.edit")}
              type="button"
            >
              <Pencil size={15} />
            </button>
            <button
              className="rounded p-1.5 text-muted hover:bg-coral/10 hover:text-coral"
              onClick={onDelete}
              title={t("tx.delete")}
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

function EditRow({
  form,
  categories,
  onChange,
  onSave,
  onCancel,
}: {
  form: { merchant: string; amount: string; occurredAt: string; categoryId: string; type: string };
  categories: Category[];
  onChange: (f: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <tr className="border-b border-teal/20 bg-teal/5">
      {/* Date */}
      <td className="px-4 py-2">
        <input
          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-teal"
          onChange={(e) => onChange({ ...form, occurredAt: e.target.value })}
          type="date"
          value={form.occurredAt}
        />
      </td>

      {/* Merchant */}
      <td className="px-4 py-2">
        <input
          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-teal"
          onChange={(e) => onChange({ ...form, merchant: e.target.value })}
          placeholder={t("tx.merchantName")}
          type="text"
          value={form.merchant}
        />
      </td>

      {/* Category */}
      <td className="px-4 py-2">
        <select
          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-teal"
          onChange={(e) => onChange({ ...form, categoryId: e.target.value })}
          value={form.categoryId}
        >
          <option value="">{t("tx.noCategory")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>

      {/* Amount */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <select
            className="w-24 rounded border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-teal"
            onChange={(e) => onChange({ ...form, type: e.target.value })}
            value={form.type}
          >
            <option value="EXPENSE">{t("tx.expense")}</option>
            <option value="INCOME">{t("tx.income")}</option>
            <option value="TRANSFER">{t("tx.transfer")}</option>
          </select>
          <input
            className="w-28 rounded border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-teal"
            min="0"
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
            step="0.01"
            type="number"
            value={form.amount}
          />
        </div>
      </td>

      {/* Source (non-editable) */}
      <td className="px-4 py-2">
        <span className="text-xs text-muted">—</span>
      </td>

      {/* Actions */}
      <td className="whitespace-nowrap px-4 py-2 text-right">
        <span className="inline-flex items-center gap-1">
          <button
            className="rounded bg-teal p-1.5 text-white hover:opacity-90"
            onClick={onSave}
            title={t("tx.save")}
            type="button"
          >
            <Save size={15} />
          </button>
          <button
            className="rounded border border-slate-200 bg-white p-1.5 text-muted hover:text-ink"
            onClick={onCancel}
            title={t("tx.cancel")}
            type="button"
          >
            <X size={15} />
          </button>
        </span>
      </td>
    </tr>
  );
}
