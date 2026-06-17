"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RegisterForm() {
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
      setError(body?.error ?? "Unable to create account.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-extrabold">
          Name
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="name" required />
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          Email
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="email" type="email" required />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-extrabold">
        Password
        <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="password" type="password" minLength={8} required />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-extrabold">
          Monthly income
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="monthlyIncome" type="number" min="0" defaultValue="0" />
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          Saving goal
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="savingGoal" type="number" min="0" defaultValue="0" />
        </label>
        <label className="grid gap-2 text-sm font-extrabold">
          Currency
          <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold uppercase outline-none focus:border-teal" name="currency" maxLength={3} minLength={3} defaultValue="USD" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-extrabold">
        Financial preference
        <select className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="financialPreference" defaultValue="BALANCED">
          <option value="CONSERVATIVE">Conservative</option>
          <option value="BALANCED">Balanced</option>
          <option value="GROWTH">Growth</option>
        </select>
      </label>
      {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{error}</p> : null}
      <button className="min-h-12 rounded-lg bg-teal px-4 font-extrabold text-white disabled:opacity-60" disabled={isLoading} type="submit">
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
