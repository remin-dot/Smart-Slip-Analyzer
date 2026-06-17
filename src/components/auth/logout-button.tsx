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
    <button className="w-full rounded-lg border border-ink bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface disabled:opacity-60" disabled={isLoading} onClick={logout} type="button">
      {isLoading ? "Signing out..." : "Logout"}
    </button>
  );
}
