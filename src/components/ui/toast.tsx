"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="top-4 left-1/2 z-100 fixed flex flex-col gap-2 max-w-sm -translate-x-1/2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative rounded-xl border px-4 py-3 pr-8 shadow-lg backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
              t.variant === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : t.variant === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-border bg-background text-foreground"
            }`}
            role="alert"
          >
            <button
              onClick={() => dismiss(t.id)}
              className="top-1.5 right-1.5 absolute hover:bg-black/10 dark:hover:bg-white/10 p-0.5 rounded-md transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <p className="font-medium text-sm">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-muted-foreground text-xs">
                {t.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
