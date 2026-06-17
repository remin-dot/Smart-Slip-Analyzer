import { Chrome } from "lucide-react";

export function GoogleButton() {
  return (
    <a
      className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 font-extrabold text-ink"
      href="/api/auth/google"
    >
      <Chrome size={18} /> Continue with Google
    </a>
  );
}
