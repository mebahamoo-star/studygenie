import React from "react";

export interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function ToggleSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 items-center rounded-full p-0.5 transition-colors duration-150 ${
          checked ? "bg-indigo-600" : "bg-slate-200 hover:bg-slate-300"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-6 w-6 sm:h-5 sm:w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
            checked
              ? "ltr:translate-x-5 rtl:-translate-x-5"
              : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
