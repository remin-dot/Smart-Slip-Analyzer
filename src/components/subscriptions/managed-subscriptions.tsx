"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Subscription = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: "monthly" | "quarterly" | "yearly";
  status: "active" | "cancelled";
  nextPaymentAt: string | null;
  note: string | null;
};

type FormState = {
  name: string;
  amount: string;
  currency: string;
  frequency: Subscription["frequency"];
  status: Subscription["status"];
  nextPaymentAt: string;
  note: string;
};

const EMPTY: FormState = {
  name: "",
  amount: "",
  currency: "USD",
  frequency: "monthly",
  status: "active",
  nextPaymentAt: "",
  note: "",
};

const FREQ_COLOR: Record<string, string> = { monthly: "#087f7a", quarterly: "#2855a3", yearly: "#cf8b21" };

export function ManagedSubscriptions() {
  const { t } = useI18n();
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null); // null = closed, "new" = add, else id
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error();
      setItems((await res.json()).subscriptions);
    } catch {
      setError(t("msub.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setForm(EMPTY); setEditingId("new"); };
  const openEdit = (s: Subscription) => {
    setForm({
      name: s.name,
      amount: String(Number(s.amount)),
      currency: s.currency,
      frequency: s.frequency,
      status: s.status,
      nextPaymentAt: s.nextPaymentAt ? s.nextPaymentAt.slice(0, 10) : "",
      note: s.note ?? "",
    });
    setEditingId(s.id);
  };
  const close = () => { setEditingId(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.name.trim() || !form.amount) { setError(t("msub.required")); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        frequency: form.frequency,
        status: form.status,
        nextPaymentAt: form.nextPaymentAt ? new Date(form.nextPaymentAt).toISOString() : null,
        note: form.note.trim() || null,
      };
      const isNew = editingId === "new";
      const res = await fetch(isNew ? "/api/subscriptions" : `/api/subscriptions/${editingId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      close();
      load();
    } catch {
      setError(t("msub.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      load();
    } catch {
      setError(t("msub.deleteError"));
    }
  };

  const fmt = (n: number, cur: string) => n.toLocaleString(undefined, { style: "currency", currency: cur || "USD" });

  return (
    <div className="panel divide-y">
      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <p className="eyebrow">{t("msub.manage")}</p>
          <h3 className="mt-1 text-lg font-black text-ink">{t("msub.title")}</h3>
        </div>
        {editingId === null && (
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-extrabold text-white hover:opacity-90" type="button">
            <Plus size={16} /> {t("msub.add")}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-coral/10 px-5 py-3 text-sm font-bold text-coral">
          {error}<button className="ml-auto" onClick={() => setError("")} type="button"><X size={14} /></button>
        </div>
      )}

      {editingId !== null && (
        <SubscriptionForm form={form} onChange={setForm} onSave={save} onCancel={close} saving={saving} isNew={editingId === "new"} />
      )}

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-teal" size={26} /></div>
      ) : items.length === 0 && editingId === null ? (
        <div className="p-10 text-center text-sm text-muted">{t("msub.empty")}</div>
      ) : (
        items.map((s) => (
          <div key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg text-sm font-black text-white" style={{ background: FREQ_COLOR[s.frequency] }}>
                {s.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-ink">{s.name}</p>
                  {s.status === "cancelled" && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-muted">{t("msub.cancelled")}</span>}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {t(`msub.${s.frequency}`)}{s.nextPaymentAt ? ` · ${t("msub.next", { date: new Date(s.nextPaymentAt).toLocaleDateString() })}` : ""}
                </p>
                {s.note && <p className="mt-0.5 text-xs text-muted">{s.note}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-black text-ink">{fmt(Number(s.amount), s.currency)}</p>
              <button onClick={() => openEdit(s)} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink" title={t("msub.edit")} type="button"><Pencil size={15} /></button>
              <button onClick={() => remove(s.id)} className="rounded p-1.5 text-muted hover:bg-coral/10 hover:text-coral" title={t("msub.delete")} type="button"><Trash2 size={15} /></button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SubscriptionForm({ form, onChange, onSave, onCancel, saving, isNew }: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  const { t } = useI18n();
  const input = "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-teal";
  return (
    <div className="grid gap-3 bg-teal/5 p-5">
      <p className="text-sm font-extrabold text-ink">{isNew ? t("msub.addTitle") : t("msub.editTitle")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder={t("msub.namePh")} value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
        <div className="flex gap-2">
          <input className={`${input} flex-1`} type="number" min="0" step="0.01" placeholder={t("msub.amountPh")} value={form.amount} onChange={(e) => onChange({ ...form, amount: e.target.value })} />
          <input className={`${input} w-20`} maxLength={3} placeholder="USD" value={form.currency} onChange={(e) => onChange({ ...form, currency: e.target.value.toUpperCase() })} />
        </div>
        <select className={input} value={form.frequency} onChange={(e) => onChange({ ...form, frequency: e.target.value as FormState["frequency"] })}>
          <option value="monthly">{t("msub.monthly")}</option>
          <option value="quarterly">{t("msub.quarterly")}</option>
          <option value="yearly">{t("msub.yearly")}</option>
        </select>
        <select className={input} value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as FormState["status"] })}>
          <option value="active">{t("msub.active")}</option>
          <option value="cancelled">{t("msub.cancelled")}</option>
        </select>
        <label className="grid gap-1 text-xs font-bold text-muted">{t("msub.nextPayment")}
          <input className={input} type="date" value={form.nextPaymentAt} onChange={(e) => onChange({ ...form, nextPaymentAt: e.target.value })} />
        </label>
        <input className={input} placeholder={t("msub.notePh")} value={form.note} onChange={(e) => onChange({ ...form, note: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50" type="button">
          {saving && <Loader2 className="animate-spin" size={15} />} {t("msub.save")}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted hover:text-ink" type="button">{t("msub.cancel")}</button>
      </div>
    </div>
  );
}
