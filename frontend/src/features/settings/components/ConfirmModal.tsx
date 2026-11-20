import React, { useEffect } from "react";
import { AlertTriangle, HelpCircle, ShieldAlert, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "primary" | "warning" | "danger";
  isLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const iconStyles = {
    primary: "bg-indigo-50 text-indigo-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  }[variant];

  const confirmBtnStyles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600",
    warning: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-600",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  }[variant];

  const IconComponent =
    variant === "danger"
      ? ShieldAlert
      : variant === "warning"
        ? AlertTriangle
        : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] transition-opacity duration-150 sm:items-center sm:p-4"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sg-confirm-modal-title"
        aria-describedby="sg-confirm-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[88vh] overflow-y-auto rounded-t-[24px] border-t border-slate-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] transition-transform duration-150 sm:max-w-md sm:rounded-[16px] sm:border sm:pb-6"
      >
        {/* Mobile bottom sheet drag handle */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${iconStyles}`}
            >
              <IconComponent className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3
                id="sg-confirm-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                {title}
              </h3>
              <p
                id="sg-confirm-modal-desc"
                className="mt-1.5 text-sm leading-relaxed text-slate-600"
              >
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close modal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 sm:h-8 sm:w-8"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex min-h-[44px] w-full items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className={`flex min-h-[44px] w-full items-center justify-center rounded-[12px] px-5 py-2.5 text-sm font-semibold shadow-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${confirmBtnStyles}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
