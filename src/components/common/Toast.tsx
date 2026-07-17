import { CheckCircle2, Info, XCircle } from "lucide-react";
import { ReactElement } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
}

const styles: Record<ToastType, string> = {
  success: "border-emerald-100 bg-emerald-50 text-emerald-800",
  error: "border-rose-100 bg-rose-50 text-rose-800",
  info: "border-blue-100 bg-blue-50 text-blue-800",
};

const icons: Record<ToastType, ReactElement> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

export function ToastContainer({ toasts }: ToastProps) {
  return (
    <div className="fixed right-4 top-[calc(env(safe-area-inset-top)+12px)] z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-float-up rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-medium shadow-lg ${styles[toast.type]}`}
        >
          <div className="flex items-center gap-2">
            {icons[toast.type]}
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction ? (
              <button className="shrink-0 rounded-[8px] bg-white/70 px-2 py-1 text-xs font-semibold" onClick={toast.onAction}>
                {toast.actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
