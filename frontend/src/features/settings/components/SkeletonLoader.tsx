import React from "react";

export function SettingsSkeletonLoader() {
  return (
    <div
      role="status"
      aria-label="Loading settings..."
      className="space-y-6 animate-pulse"
    >
      {[1, 2].map((cardIndex) => (
        <div
          key={cardIndex}
          className="rounded-[16px] border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)]"
        >
          <div className="border-b border-slate-100 pb-4">
            <div className="h-5 w-48 rounded-[8px] bg-slate-200/80" />
            <div className="mt-2 h-3.5 w-72 max-w-full rounded-[6px] bg-slate-100" />
          </div>
          <div className="divide-y divide-slate-100 pt-2">
            {[1, 2, 3].map((rowIndex) => (
              <div
                key={rowIndex}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded-[6px] bg-slate-200/70" />
                  <div className="h-3 w-64 max-w-full rounded-[6px] bg-slate-100" />
                </div>
                <div className="h-10 w-32 rounded-[12px] bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
