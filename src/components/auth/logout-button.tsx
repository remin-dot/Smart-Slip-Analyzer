"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-ink" disabled={isLoading} onClick={logout} type="button">
      {isLoading ? "Signing out..." : "Logout"}
    </button>
  );
}
