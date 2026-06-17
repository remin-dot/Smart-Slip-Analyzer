"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    setIsLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to login.");
      return;
    }

    const nextPath = searchParams.get("next");
    router.push(nextPath === "/profile" ? "/profile" : "/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-extrabold">
        Email
        <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="email" type="email" required />
      </label>
      <label className="grid gap-2 text-sm font-extrabold">
        Password
        <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="password" type="password" required />
      </label>
      {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{error}</p> : null}
      <button className="min-h-12 rounded-lg bg-teal px-4 font-extrabold text-white disabled:opacity-60" disabled={isLoading} type="submit">
        {isLoading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
