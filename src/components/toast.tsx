"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; message: string; kind: ToastKind };
type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const ICON = {
  success: <CheckCircle2 size={18} className="text-mint" />,
  error: <AlertCircle size={18} className="text-coral" />,
  info: <Info size={18} className="text-ocean" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const toast = useCallback<ToastFn>((message, kind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] grid gap-2">
        {toasts.map((tst) => (
          <div
            key={tst.id}
            className="animate-pop pointer-events-auto flex items-center gap-3 rounded-xl border border-hairline bg-white px-4 py-3 shadow-premium"
          >
            {ICON[tst.kind]}
            <span className="text-sm font-bold text-ink">{tst.message}</span>
            <button onClick={() => dismiss(tst.id)} className="ml-2 text-muted hover:text-ink" type="button" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
