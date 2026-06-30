"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setDevLink("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email") })
    });
    const body = await response.json().catch(() => null);

    setIsLoading(false);
    setMessage(body?.message ?? "If that email is registered, a reset link has been sent.");
    if (body?.resetUrl) setDevLink(body.resetUrl);
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 text-sm font-extrabold">
        Email
        <input className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal" name="email" type="email" required />
      </label>
      {message ? <p className="rounded-lg bg-teal/10 p-3 text-sm font-bold text-teal">{message}</p> : null}
      {devLink ? (
        <a className="break-all rounded-lg bg-slate-100 p-3 text-xs font-bold text-ink underline" href={devLink}>
          Dev reset link: {devLink}
        </a>
      ) : null}
      <button className="min-h-12 rounded-lg bg-teal px-4 font-extrabold text-white disabled:opacity-60" disabled={isLoading} type="submit">
        {isLoading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
