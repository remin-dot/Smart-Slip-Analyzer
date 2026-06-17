"use client";

import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CURRENCIES } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

// Currency is a profile setting (drives every money amount returned by the APIs),
// kept fully separate from the language switcher. Changing it PATCHes the profile
// and refreshes so all displayed amounts re-label.
export function CurrencySwitcher() {
  const router = useRouter();
  const { t } = useI18n();
  const [currency, setCurrency] = useState<string>("USD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => d?.user?.currency && setCurrency(d.user.currency))
      .catch(() => {});
  }, []);

  async function onChange(next: string) {
    setCurrency(next);
    setSaving(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: next }),
    }).catch(() => {});
    setSaving(false);
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-ink">
      <Coins size={17} className="text-rausch" />
      <span className="sr-only">{t("shell.currency")}</span>
      <select
        className="w-full bg-transparent font-semibold text-ink outline-none disabled:opacity-60"
        value={currency}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
    </label>
  );
}
