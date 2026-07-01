"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ThemeToggle() {
  const { t } = useI18n();
  const [dark, setDark] = useState(false);

  // Sync initial state from the class the no-flash script already applied.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
    >
      <span className="inline-flex items-center gap-2">
        {dark ? <Moon size={17} className="text-rausch" /> : <Sun size={17} className="text-rausch" />}
        {dark ? t("theme.dark") : t("theme.light")}
      </span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${dark ? "bg-rausch" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${dark ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}
