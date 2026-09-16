"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastKind = "success" | "info" | "error";
type Toast = { id: number; kind: ToastKind; text: string };

type ToastApi = {
  success: (text: string) => void;
  info: (text: string) => void;
  error: (text: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

const KIND_STYLE: Record<ToastKind, string> = {
  success: "border-green-500/30 text-green-700 dark:text-green-300",
  info: "border-primary/30 text-foreground",
  error: "border-destructive/30 text-destructive",
};

const KIND_ICON: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  error: XCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, kind, text }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const api: ToastApi = {
    success: (text) => push("success", text),
    info: (text) => push("info", text),
    error: (text) => push("error", text),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card px-3.5 py-3 text-sm shadow-lg animate-fade-up ${KIND_STYLE[t.kind]}`} role="status">
            {(() => {
              const Icon = KIND_ICON[t.kind];
              return <Icon className="mt-0.5 size-4 shrink-0" />;
            })()}
            <div className="min-w-0 flex-1 break-words">{t.text}</div>
            <button onClick={() => remove(t.id)} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label="Закрыть">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}