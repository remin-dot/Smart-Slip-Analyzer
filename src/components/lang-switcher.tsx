"use client";

import { Languages } from "lucide-react";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";

// Only changes the UI language. Independent of the currency switcher.
export function LangSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-ink">
      <Languages size={17} className="text-rausch" />
      <span className="sr-only">{t("shell.language")}</span>
      <select
        className="w-full bg-transparent font-semibold text-ink outline-none"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
