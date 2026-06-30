"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });

    setIsLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not reset password.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (!token) {
    return <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">Missing reset token. Request a new link.</p>;
  }

  if (done) {
    return (
      <p className="rounded-lg bg-teal/10 p-3 text-sm font-bold text-teal">
        Password updated. Redirecting to <Link className="underline" href="/login">login</Link>…
      </p>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-extrabold">
        New password
        <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="password" type="password" minLength={8} required />
      </label>
      {error ? <p className="rounded-lg bg-coral/10 p-3 text-sm font-bold text-coral">{error}</p> : null}
      <button className="min-h-12 rounded-lg bg-teal px-4 font-extrabold text-white disabled:opacity-60" disabled={isLoading} type="submit">
        {isLoading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
