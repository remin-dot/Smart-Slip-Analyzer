"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-rausch px-4 py-2 text-sm font-extrabold text-white hover:opacity-90 print:hidden"
      type="button"
    >
      <Printer size={16} /> {label}
    </button>
  );
}
