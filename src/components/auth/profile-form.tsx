"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CURRENCIES } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type ProfileFormProps = {
  user: {
    name: string;
    email: string;
    monthlyIncome: string;
    savingGoal: string;
    financialPreference: string;
    currency: string;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        monthlyIncome: formData.get("monthlyIncome"),
        savingGoal: formData.get("savingGoal"),
        financialPreference: formData.get("financialPreference"),
        currency: formData.get("currency")
      })
    });

    setIsLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? t("auth.updateError"));
      return;
    }

    setMessage(t("auth.profileUpdated"));
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 min-w-0 text-sm font-extrabold">
          {t("auth.name")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="name" defaultValue={user.name} required />
        </label>
        <label className="grid gap-2 min-w-0 text-sm font-extrabold">
          {t("auth.email")}
          <input className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-muted" value={user.email} disabled />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 min-w-0 text-sm font-extrabold">
          {t("auth.monthlyIncome")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="monthlyIncome" type="number" min="0" defaultValue={user.monthlyIncome} />
        </label>
        <label className="grid gap-2 min-w-0 text-sm font-extrabold">
          {t("auth.savingGoal")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="savingGoal" type="number" min="0" defaultValue={user.savingGoal} />
        </label>
        <label className="grid gap-2 min-w-0 text-sm font-extrabold">
          {t("auth.currency")}
          <select className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="currency" defaultValue={user.currency}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2 min-w-0 text-sm font-extrabold">
        {t("auth.financialPreference")}
        <select className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="financialPreference" defaultValue={user.financialPreference}>
          <option value="CONSERVATIVE">{t("auth.conservative")}</option>
          <option value="BALANCED">{t("auth.balanced")}</option>
          <option value="GROWTH">{t("auth.growth")}</option>
        </select>
      </label>
      {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{error}</p> : null}
      {message ? <p className="rounded-lg bg-teal/10 p-3 text-sm font-bold text-teal">{message}</p> : null}
      <button className="min-h-12 rounded-lg bg-teal px-4 font-extrabold text-white disabled:opacity-60" disabled={isLoading} type="submit">
        {isLoading ? t("auth.savingProfile") : t("auth.saveProfile")}
      </button>
    </form>
  );
}
