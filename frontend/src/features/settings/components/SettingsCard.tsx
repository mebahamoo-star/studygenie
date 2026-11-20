import React from "react";

export interface SettingsCardProps {
  title: string;
  description?: string;
  variant?: "default" | "danger";
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsCard({
  title,
  description,
  variant = "default",
  headerAction,
  footer,
  children,
}: SettingsCardProps) {
  const isDanger = variant === "danger";

  return (
    <section
      className={`rounded-[16px] border bg-white transition-shadow duration-150 ${
        isDanger
          ? "border-red-200/90 shadow-[0_2px_12px_-4px_rgba(239,68,68,0.08)]"
          : "border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)]"
      }`}
    >
      <div
        className={`flex flex-col justify-between gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5 ${
          isDanger ? "border-red-100 bg-red-50/35 rounded-t-[16px]" : "border-slate-100"
        }`}
      >
        <div className="min-w-0">
          <h2
            className={`text-base font-semibold tracking-tight sm:text-lg ${
              isDanger ? "text-red-900" : "text-slate-900"
            }`}
          >
            {title}
          </h2>
          {description && (
            <p
              className={`mt-1 text-xs leading-relaxed sm:text-sm ${
                isDanger ? "text-red-700/85" : "text-slate-500"
              }`}
            >
              {description}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div className="divide-y divide-slate-100 px-5 py-2 sm:px-6">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-3 rounded-b-[16px] border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}
