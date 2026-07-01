"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Loader2, Scale } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Tx = {
  id: string;
  merchant: string;
  description: string | null;
  amount: string;
  currency: string;
  type: string;
  occurredAt: string;
  category: { name: string; color: string } | null;
  tags: string[];
};

export function ReceiptCompare() {
  const { t } = useI18n();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  useEffect(() => {
    fetch("/api/transactions?take=100")
      .then((r) => r.json())
      .then((d) => setTxs(d.transactions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const a = useMemo(() => txs.find((x) => x.id === aId) ?? null, [txs, aId]);
  const b = useMemo(() => txs.find((x) => x.id === bId) ?? null, [txs, bId]);

  const label = (x: Tx) =>
    `${x.merchant} · ${Number(x.amount).toLocaleString(undefined, { style: "currency", currency: x.currency || "USD" })} · ${new Date(x.occurredAt).toLocaleDateString()}`;

  return (
    <div className="grid gap-6">
      {/* Pickers */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Picker label={t("compare.receiptA")} value={aId} onChange={setAId} txs={txs} loading={loading} label2={label} disabledId={bId} t={t} />
        <Picker label={t("compare.receiptB")} value={bId} onChange={setBId} txs={txs} loading={loading} label2={label} disabledId={aId} t={t} />
      </div>

      {a && b ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <ReceiptCard tx={a} other={b} t={t} />
            <ReceiptCard tx={b} other={a} t={t} />
          </div>
          <ComparisonSummary a={a} b={b} t={t} />
        </>
      ) : (
        <div className="panel grid place-items-center p-12 text-center">
          <ArrowLeftRight size={32} className="text-slate-300" />
          <p className="mt-3 font-black text-ink">{t("compare.pickTwo")}</p>
        </div>
      )}
    </div>
  );
}

function Picker({
  label, value, onChange, txs, loading, label2, disabledId, t,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  txs: Tx[];
  loading: boolean;
  label2: (x: Tx) => string;
  disabledId: string;
  t: (k: string) => string;
}) {
  return (
    <label className="grid gap-2 text-sm font-extrabold">
      {label}
      <select
        className="rounded-lg border border-slate-200 bg-white px-4 py-3 font-semibold text-ink outline-none focus:border-teal"
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{loading ? "…" : t("compare.choose")}</option>
        {txs.map((x) => (
          <option key={x.id} value={x.id} disabled={x.id === disabledId}>
            {label2(x)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReceiptCard({ tx, other, t }: { tx: Tx; other: Tx; t: (k: string) => string }) {
  const diff = (same: boolean) => (same ? "" : "bg-amber/10");
  const money = (x: Tx) => Number(x.amount).toLocaleString(undefined, { style: "currency", currency: x.currency || "USD" });
  const rows: [string, string, boolean][] = [
    [t("tx.colMerchant"), tx.merchant, tx.merchant === other.merchant],
    [t("scan.amount"), money(tx), Number(tx.amount) === Number(other.amount)],
    [t("scan.date"), new Date(tx.occurredAt).toLocaleDateString(), tx.occurredAt.slice(0, 10) === other.occurredAt.slice(0, 10)],
    [t("scan.type"), tx.type, tx.type === other.type],
    [t("tx.colCategory"), tx.category?.name ?? "—", (tx.category?.name ?? "") === (other.category?.name ?? "")],
    [t("compare.tags"), tx.tags.length ? tx.tags.map((x) => `#${x}`).join(" ") : "—", tx.tags.join(",") === other.tags.join(",")],
    [t("compare.notes"), tx.description ?? "—", (tx.description ?? "") === (other.description ?? "")],
  ];
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-hairline p-4">
        <p className="truncate text-lg font-black text-ink">{tx.merchant}</p>
        <p className="text-sm font-bold text-muted">{money(tx)}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map(([k, v, same]) => (
          <div key={k} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${diff(same)}`}>
            <span className="text-xs font-extrabold uppercase tracking-wide text-muted">{k}</span>
            <span className="truncate text-right text-sm font-bold text-ink">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonSummary({ a, b, t }: { a: Tx; b: Tx; t: (k: string, p?: Record<string, string | number>) => string }) {
  const amtA = Number(a.amount);
  const amtB = Number(b.amount);
  const delta = Math.abs(amtB - amtA);
  const cur = a.currency || "USD";
  const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: cur });
  const dayGap = Math.round(Math.abs(new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()) / 86400000);
  const sameCat = (a.category?.name ?? "") === (b.category?.name ?? "");

  const lines = [
    delta === 0
      ? t("compare.sameAmount")
      : t("compare.amountDiff", { amount: money(delta), pct: amtA ? Math.round((delta / amtA) * 100) : 0 }),
    dayGap === 0 ? t("compare.sameDay") : t("compare.daysApart", { n: dayGap }),
    sameCat ? t("compare.sameCategory") : t("compare.diffCategory"),
  ];

  return (
    <div className="panel p-5">
      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-rausch">
        <Scale size={14} /> {t("compare.summary")}
      </p>
      <ul className="mt-3 grid gap-2">
        {lines.map((l) => (
          <li key={l} className="flex items-start gap-2 text-sm font-bold text-ink">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rausch" /> {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
