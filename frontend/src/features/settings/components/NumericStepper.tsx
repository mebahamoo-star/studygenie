import React from "react";
import { Minus, Plus } from "lucide-react";

export interface NumericStepperProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (nextValue: number) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function NumericStepper({
  id,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  ariaLabel,
  disabled = false,
}: NumericStepperProps) {
  const canDecrement = !disabled && value - step >= min;
  const canIncrement = !disabled && value + step <= max;

  const handleDecrement = () => {
    if (canDecrement) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className="inline-flex min-h-[44px] items-center rounded-[12px] border border-slate-200 bg-slate-50/70 p-1 sm:min-h-0"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label={`Decrease ${ariaLabel}`}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] bg-white text-slate-700 shadow-xs transition-all duration-150 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 sm:rounded-[8px]"
      >
        <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
      </button>

      <div
        aria-live="polite"
        className="flex min-w-[84px] items-center justify-center gap-1 px-3 text-base font-semibold tabular-nums text-slate-900 sm:text-sm"
      >
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label={`Increase ${ariaLabel}`}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] bg-white text-slate-700 shadow-xs transition-all duration-150 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 sm:rounded-[8px]"
      >
        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
