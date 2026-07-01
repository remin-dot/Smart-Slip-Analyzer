"use client";

import { useEffect, useRef, useState } from "react";
import { Braces, Download, FileSpreadsheet, Printer, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TransactionExport() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const download = (format: "csv" | "json") => {
    window.location.href = `/api/transactions/export?format=${format}`;
    setOpen(false);
  };

  const share = async () => {
    setOpen(false);
    try {
      const res = await fetch("/api/transactions/export?format=csv");
      const blob = await res.blob();
      const file = new File([blob], "transactions.csv", { type: "text/csv" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Smart Slip Analyzer" });
        return;
      }
    } catch {
      /* fall through to download */
    }
    download("csv");
  };

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-ink hover:bg-surface"
        type="button"
      >
        <Download size={16} /> {t("export.export")}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-xl border border-hairline bg-white shadow-premium">
          <MenuItem icon={<FileSpreadsheet size={16} />} label={t("export.csv")} onClick={() => download("csv")} />
          <MenuItem icon={<Braces size={16} />} label={t("export.json")} onClick={() => download("json")} />
          <MenuItem icon={<Printer size={16} />} label={t("export.print")} onClick={() => { window.open("/transactions/report", "_blank"); setOpen(false); }} />
          <MenuItem icon={<Share2 size={16} />} label={t("export.share")} onClick={share} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-ink hover:bg-surface" type="button">
      <span className="text-muted">{icon}</span> {label}
    </button>
  );
}
