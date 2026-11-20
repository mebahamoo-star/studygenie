import React from "react";

export interface SettingRowProps {
  id?: string | undefined;
  label: string;
  helperText?: string | undefined;
  badge?: React.ReactNode | undefined;
  error?: string | undefined;
  vertical?: boolean | undefined;
  children: React.ReactNode;
}

export function SettingRow({
  id,
  label,
  helperText,
  badge,
  error,
  vertical = false,
  children,
}: SettingRowProps) {
  return (
    <div
      className={`py-4 transition-colors duration-150 ${
        vertical
          ? "flex flex-col gap-3"
          : "flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-6"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-900 cursor-pointer"
          >
            {label}
          </label>
          {badge}
        </div>
        {helperText && (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {helperText}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>

      <div
        className={
          vertical ? "w-full" : "w-full shrink-0 sm:w-auto sm:ms-auto"
        }
      >
        {children}
      </div>
    </div>
  );
}
