import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error";
  message: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

/**
 * Animated SVG micro-interaction checkmark for save confirmations
 */
export function AnimatedCheckmarkIcon() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M5 13l4 4L19 7"
          style={{
            strokeDasharray: 24,
            strokeDashoffset: 0,
            animation: "sgCheckDraw 220ms ease-out forwards",
          }}
        />
      </svg>
    </span>
  );
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3400);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={`pointer-events-auto flex items-center gap-3 rounded-[12px] border bg-white px-4 py-3 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] transition-all duration-150 ${
        isSuccess ? "border-emerald-200/90" : "border-red-200/90"
      }`}
    >
      {isSuccess ? (
        <AnimatedCheckmarkIcon />
      ) : (
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <p className="text-sm font-medium text-slate-800">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="ms-2 rounded-[8px] p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-5 end-5 z-50 flex max-w-sm flex-col gap-2 ps-4"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
