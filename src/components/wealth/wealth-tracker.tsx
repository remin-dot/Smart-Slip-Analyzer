"use client";

import { useEffect, useState, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Building2,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  TrendingUp,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type WealthItem = {
  id: string;
  type: "CASH" | "INVESTMENT" | "PROPERTY" | "DEBT" | "LOAN";
  name: string;
  value: number;
  currency: string;
  note: string | null;
};

type Summary = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: Record<string, number>;
  growthAmount: number;
  growthPct: number;
};

type HistoryPoint = {
  id: string;
  assets: number;
  liabilities: number;
  netWorth: number;
  snapshotAt: string;
};

type Data = {
  items: WealthItem[];
  summary: Summary;
  history: HistoryPoint[];
  currency: string;
};

const TYPE_META: Record<string, { labelKey: string; icon: typeof Wallet; color: string; side: "asset" | "liability" }> = {
  CASH: { labelKey: "wealth.cash", icon: Banknote, color: "#20875a", side: "asset" },
  INVESTMENT: { labelKey: "wealth.investment", icon: TrendingUp, color: "#2855a3", side: "asset" },
  PROPERTY: { labelKey: "wealth.property", icon: Building2, color: "#cf8b21", side: "asset" },
  DEBT: { labelKey: "wealth.debt", icon: CreditCard, color: "#d85c46", side: "liability" },
  LOAN: { labelKey: "wealth.loan", icon: Landmark, color: "#8b5cf6", side: "liability" },
};

export function WealthTracker() {
  const { t } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wealth");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      type: fd.get("type"),
      name: fd.get("name"),
      value: Number(fd.get("value")),
      note: fd.get("note") || null,
    };
    const res = await fetch("/api/wealth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowForm(false);
      formRef.current?.reset();
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (deleting === id) {
      await fetch(`/api/wealth/${id}`, { method: "DELETE" });
      setDeleting(null);
      load();
    } else {
      setDeleting(id);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <Loader2 className="animate-spin" size={32} />
        <p className="mt-3 text-sm font-bold">{t("wealth.loading")}</p>
      </div>
    );
  }

  if (!data) return null;
  const { items, summary, history, currency } = data;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const assets = items.filter((i) => TYPE_META[i.type]?.side === "asset");
  const liabilities = items.filter((i) => TYPE_META[i.type]?.side === "liability");

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("wealth.totalAssets")}
          value={`${fmt(summary.totalAssets)} ${currency}`}
          icon={<Wallet size={18} />}
          color="#20875a"
        />
        <KpiCard
          label={t("wealth.totalLiabilities")}
          value={`${fmt(summary.totalLiabilities)} ${currency}`}
          icon={<CreditCard size={18} />}
          color="#d85c46"
        />
        <KpiCard
          label={t("wealth.netWorth")}
          value={`${fmt(summary.netWorth)} ${currency}`}
          icon={<TrendingUp size={18} />}
          color={summary.netWorth >= 0 ? "#087f7a" : "#d85c46"}
        />
        <KpiCard
          label={t("wealth.growth")}
          value={`${summary.growthAmount >= 0 ? "+" : ""}${fmt(summary.growthAmount)} ${currency}`}
          sub={history.length >= 2 ? t("wealth.sinceFirst", { pct: `${summary.growthPct >= 0 ? "+" : ""}${summary.growthPct}` }) : t("wealth.needSnapshots")}
          icon={summary.growthAmount >= 0 ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
          color={summary.growthAmount >= 0 ? "#20875a" : "#d85c46"}
        />
      </div>

      {/* Net worth chart */}
      {history.length >= 2 && (
        <div className="panel p-5">
          <p className="eyebrow">{t("wealth.netWorthOverTime")}</p>
          <h3 className="mt-1 text-lg font-black text-ink">{t("wealth.growthHistory")}</h3>
          <div className="mt-4 overflow-x-auto">
            <NetWorthChart history={history} currency={currency} />
          </div>
        </div>
      )}

      {/* Breakdown donut */}
      {items.length > 0 && (
        <div className="panel p-5">
          <p className="eyebrow">{t("wealth.composition")}</p>
          <h3 className="mt-1 text-lg font-black text-ink">{t("wealth.breakdownTitle")}</h3>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <BreakdownDonut summary={summary} currency={currency} />
            <div className="grid gap-2 text-sm">
              {Object.entries(summary.breakdown).map(([type, val]) => {
                const meta = TYPE_META[type];
                if (!meta) return null;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: meta.color }} />
                    <span className="font-bold text-ink">{t(meta.labelKey)}</span>
                    <span className="text-muted">{fmt(val)} {currency}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add button + form */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-3 text-sm font-extrabold text-white hover:opacity-90"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t("wealth.cancel") : t("wealth.addItem")}
        </button>
      </div>

      {showForm && (
        <form ref={formRef} onSubmit={handleAdd} className="panel space-y-4 p-5">
          <p className="text-lg font-black text-ink">{t("wealth.addWealthItem")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">{t("wealth.type")}</label>
              <select name="type" required className="w-full rounded-lg border px-3 py-2.5 text-sm font-bold text-ink">
                <optgroup label={t("wealth.assets")}>
                  <option value="CASH">{t("wealth.cashSavings")}</option>
                  <option value="INVESTMENT">{t("wealth.investment")}</option>
                  <option value="PROPERTY">{t("wealth.property")}</option>
                </optgroup>
                <optgroup label={t("wealth.liabilities")}>
                  <option value="DEBT">{t("wealth.debt")}</option>
                  <option value="LOAN">{t("wealth.loan")}</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">{t("wealth.name")}</label>
              <input
                name="name"
                required
                placeholder={t("wealth.namePlaceholder")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">{t("wealth.valueLabel", { cur: currency })}</label>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">{t("wealth.noteLabel")}</label>
              <input
                name="note"
                placeholder={t("wealth.notePlaceholder")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-ink"
              />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90">
            {t("wealth.saveItem")}
          </button>
        </form>
      )}

      {/* Asset list */}
      <ItemSection kind="assets" items={assets} currency={currency} deleting={deleting} onDelete={handleDelete} />
      <ItemSection kind="liabilities" items={liabilities} currency={currency} deleting={deleting} onDelete={handleDelete} />

      {items.length === 0 && (
        <div className="panel flex flex-col items-center justify-center p-10 text-center">
          <Wallet size={40} className="text-muted/40" />
          <p className="mt-3 text-lg font-black text-ink">{t("wealth.noItems")}</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            {t("wealth.noItemsBody")}
          </p>
        </div>
      )}
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

function ItemSection({
  kind,
  items,
  currency,
  deleting,
  onDelete,
}: {
  kind: "assets" | "liabilities";
  items: WealthItem[];
  currency: string;
  deleting: string | null;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="panel divide-y">
      <div className="p-5">
        <p className="eyebrow">{kind === "assets" ? t("wealth.whatYouOwn") : t("wealth.whatYouOwe")}</p>
        <h3 className="mt-1 text-lg font-black text-ink">{kind === "assets" ? t("wealth.assets") : t("wealth.liabilities")}</h3>
      </div>
      {items.map((item) => {
        const meta = TYPE_META[item.type];
        const Icon = meta?.icon ?? Wallet;
        return (
          <div key={item.id} className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-lg text-white"
                style={{ background: meta?.color ?? "#687188" }}
              >
                <Icon size={18} />
              </div>
              <div>
                <p className="font-extrabold text-ink">{item.name}</p>
                <p className="text-sm text-muted">{meta ? t(meta.labelKey) : item.type}{item.note ? ` · ${item.note}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-black text-ink">{fmt(item.value)} <span className="text-sm text-muted">{currency}</span></p>
              <button
                onClick={() => onDelete(item.id)}
                className={`rounded-lg p-2 text-sm ${deleting === item.id ? "bg-coral/10 text-coral" : "text-muted hover:text-coral"}`}
                title={deleting === item.id ? t("wealth.deleteConfirm") : t("wealth.delete")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- SVG Charts ---
const W = 600, H = 220, PL = 65, PR = 20, PT = 20, PB = 40;

function NetWorthChart({ history, currency }: { history: HistoryPoint[]; currency: string }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (history.length < 2) return null;

  const values = history.map((h) => h.netWorth);
  const minVal = Math.min(...values) * (Math.min(...values) >= 0 ? 0.9 : 1.1);
  const maxVal = Math.max(...values) * 1.1 || 1;
  const range = maxVal - minVal || 1;
  const xStep = (W - PL - PR) / Math.max(history.length - 1, 1);

  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + ((maxVal - v) / range) * (H - PT - PB);

  const points = history.map((h, i) => `${toX(i)},${toY(h.netWorth)}`).join(" ");
  const areaPath = `M ${history.map((h, i) => `${toX(i)},${toY(h.netWorth)}`).join(" L ")} L ${toX(history.length - 1)},${H - PB} L ${PL},${H - PB} Z`;

  const gridLines = 4;
  const step = range / gridLines;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#087f7a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#087f7a" stopOpacity="0.02" />
        </linearGradient>
      </defs>

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

      <path d={areaPath} fill="url(#nwGrad)" />
      <polyline points={points} fill="none" stroke="#087f7a" strokeWidth={2.5} strokeLinejoin="round" />

      {history.map((h, i) => {
        const label = new Date(h.snapshotAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const showLabel = history.length <= 12 || i % Math.ceil(history.length / 8) === 0 || i === history.length - 1;
        return (
          <g key={h.id}>
            <circle cx={toX(i)} cy={toY(h.netWorth)} r={3} fill="#087f7a" />
            {showLabel && <text x={toX(i)} y={H - PB + 16} textAnchor="middle" fontSize={9} className="fill-muted">{label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function BreakdownDonut({ summary, currency }: { summary: Summary; currency: string }) {
  const { t } = useI18n();
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const stroke = 28;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const total = summary.totalAssets + summary.totalLiabilities;
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-muted text-sm">{t("wealth.noData")}</text>
      </svg>
    );
  }

  const segments = Object.entries(summary.breakdown)
    .filter(([, v]) => v > 0)
    .map(([type, val]) => ({ type, val, color: TYPE_META[type]?.color ?? "#687188" }));

  let cumAngle = -90;
  const arcs = segments.map((seg) => {
    const pct = seg.val / total;
    const angle = Math.max(pct * 360, 1);
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;

    return (
      <path
        key={seg.type}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={seg.color}
        strokeWidth={stroke}
        strokeLinecap="butt"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-ink text-lg font-black">{fmt(summary.netWorth)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted text-xs">{t("wealth.netSuffix", { cur: currency })}</text>
    </svg>
  );
}
