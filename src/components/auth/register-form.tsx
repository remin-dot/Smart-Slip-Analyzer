"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CURRENCIES } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        monthlyIncome: formData.get("monthlyIncome"),
        savingGoal: formData.get("savingGoal"),
        financialPreference: formData.get("financialPreference"),
        currency: formData.get("currency")
      })
    });

    setIsLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? t("auth.createError"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-extrabold">
          {t("auth.name")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="name" required />
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          {t("auth.email")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="email" type="email" required />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-extrabold">
        {t("auth.password")}
        <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="password" type="password" minLength={8} required />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-extrabold">
          {t("auth.monthlyIncome")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="monthlyIncome" type="number" min="0" defaultValue="0" />
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          {t("auth.savingGoal")}
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="savingGoal" type="number" min="0" defaultValue="0" />
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          {t("auth.currency")}
          <select className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="currency" defaultValue="USD">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-extrabold">
        {t("auth.financialPreference")}
        <select className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="financialPreference" defaultValue="BALANCED">
          <option value="CONSERVATIVE">{t("auth.conservative")}</option>
          <option value="BALANCED">{t("auth.balanced")}</option>
          <option value="GROWTH">{t("auth.growth")}</option>
        </select>
      </label>
      {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{error}</p> : null}
      <button className="min-h-12 rounded-lg bg-teal px-4 font-extrabold text-white disabled:opacity-60" disabled={isLoading} type="submit">
        {isLoading ? t("auth.creatingAccount") : t("auth.createAccount")}
      </button>
    </form>
  );
}
