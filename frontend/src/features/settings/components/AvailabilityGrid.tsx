import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Check, CheckCheck, Clock, Copy, Layers, RotateCcw, X } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_HOURS,
  WEEKDAY_KEYS,
  formatHourSlot,
  type AvailabilityBlock,
  type DayOfWeekKey,
} from "../constants/settingsConstants";

export interface AvailabilityGridProps {
  value: AvailabilityBlock[];
  onChange: (nextBlocks: AvailabilityBlock[]) => void;
  timeFormat?: "12h" | "24h";
  firstDayOfWeek?: "SUNDAY" | "SATURDAY" | "MONDAY";
  onCopyMondayToast?: () => void;
  onClearAllToast?: () => void;
}

function makeSlotKey(day: DayOfWeekKey, hour: number): string {
  return `${day}::${hour}`;
}

function parseBlocksToSet(blocks: AvailabilityBlock[]): Set<string> {
  const set = new Set<string>();
  for (const block of blocks) {
    const startHour = parseInt(block.startTime.split(":")[0] ?? "", 10);
    const endHour = parseInt(block.endTime.split(":")[0] ?? "", 10);
    if (!isNaN(startHour) && !isNaN(endHour) && endHour > startHour) {
      for (let h = startHour; h < endHour; h++) {
        set.add(makeSlotKey(block.dayOfWeek, h));
      }
    } else if (!isNaN(startHour)) {
      set.add(makeSlotKey(block.dayOfWeek, startHour));
    }
  }
  return set;
}

function serializeSetToBlocks(slotSet: Set<string>): AvailabilityBlock[] {
  const blocks: AvailabilityBlock[] = [];
  for (const day of AVAILABILITY_DAYS) {
    for (const hour of AVAILABILITY_HOURS) {
      if (slotSet.has(makeSlotKey(day, hour))) {
        blocks.push({
          dayOfWeek: day,
          startTime: `${String(hour).padStart(2, "0")}:00`,
          endTime: `${String(hour + 1).padStart(2, "0")}:00`,
        });
      }
    }
  }
  return blocks;
}

export function AvailabilityGrid({
  value,
  onChange,
  timeFormat = "24h",
  firstDayOfWeek = "MONDAY",
  onCopyMondayToast,
  onClearAllToast,
}: AvailabilityGridProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<"paint" | "erase">("paint");

  const activeSet = useMemo(() => parseBlocksToSet(value), [value]);

  const orderedDays = useMemo<DayOfWeekKey[]>(() => {
    if (firstDayOfWeek === "SUNDAY") {
      return [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ];
    }
    if (firstDayOfWeek === "SATURDAY") {
      return [
        "SATURDAY",
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
      ];
    }
    return AVAILABILITY_DAYS;
  }, [firstDayOfWeek]);

  const [mobileSelectedDay, setMobileSelectedDay] = useState<DayOfWeekKey>(
    () => orderedDays[0] || "MONDAY"
  );
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyTargetDays, setCopyTargetDays] = useState<Set<DayOfWeekKey>>(
    new Set()
  );

  useEffect(() => {
    if (!orderedDays.includes(mobileSelectedDay)) {
      setMobileSelectedDay(orderedDays[0] || "MONDAY");
    }
  }, [orderedDays, mobileSelectedDay]);

  // Calculate hours per day & total weekly hours live
  const dailyHoursMap = useMemo(() => {
    const counts: Record<DayOfWeekKey, number> = {
      MONDAY: 0,
      TUESDAY: 0,
      WEDNESDAY: 0,
      THURSDAY: 0,
      FRIDAY: 0,
      SATURDAY: 0,
      SUNDAY: 0,
    };
    for (const day of AVAILABILITY_DAYS) {
      for (const hour of AVAILABILITY_HOURS) {
        if (activeSet.has(makeSlotKey(day, hour))) {
          counts[day] += 1;
        }
      }
    }
    return counts;
  }, [activeSet]);

  const totalWeeklyHours = useMemo(
    () => Object.values(dailyHoursMap).reduce((acc, h) => acc + h, 0),
    [dailyHoursMap]
  );

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [isDragging]);

  const applySlotMutation = useCallback(
    (day: DayOfWeekKey, hour: number, mode: "paint" | "erase") => {
      const key = makeSlotKey(day, hour);
      const hasSlot = activeSet.has(key);
      if (mode === "paint" && hasSlot) return;
      if (mode === "erase" && !hasSlot) return;

      const nextSet = new Set(activeSet);
      if (mode === "paint") {
        nextSet.add(key);
      } else {
        nextSet.delete(key);
      }
      onChange(serializeSetToBlocks(nextSet));
    },
    [activeSet, onChange]
  );

  const handleCellPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    day: DayOfWeekKey,
    hour: number
  ) => {
    event.preventDefault();
    const key = makeSlotKey(day, hour);
    const nextMode = activeSet.has(key) ? "erase" : "paint";
    dragModeRef.current = nextMode;
    setIsDragging(true);
    applySlotMutation(day, hour, nextMode);
  };

  const handleCellPointerEnter = (day: DayOfWeekKey, hour: number) => {
    if (!isDragging) return;
    applySlotMutation(day, hour, dragModeRef.current);
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    day: DayOfWeekKey,
    hour: number
  ) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const key = makeSlotKey(day, hour);
      const nextMode = activeSet.has(key) ? "erase" : "paint";
      applySlotMutation(day, hour, nextMode);
    }
  };

  const handleCopyMondayToWeekdays = () => {
    const nextSet = new Set(activeSet);
    const mondayHours = AVAILABILITY_HOURS.filter((hour) =>
      activeSet.has(makeSlotKey("MONDAY", hour))
    );

    for (const weekday of WEEKDAY_KEYS) {
      if (weekday === "MONDAY") continue;
      for (const hour of AVAILABILITY_HOURS) {
        nextSet.delete(makeSlotKey(weekday, hour));
      }
      for (const hour of mondayHours) {
        nextSet.add(makeSlotKey(weekday, hour));
      }
    }

    onChange(serializeSetToBlocks(nextSet));
    onCopyMondayToast?.();
  };

  const handleClearAll = () => {
    onChange([]);
    onClearAllToast?.();
  };

  const handleOpenCopyModal = () => {
    const others = orderedDays.filter((d) => d !== mobileSelectedDay);
    setCopyTargetDays(new Set(others));
    setIsCopyModalOpen(true);
  };

  const handleToggleCopyTarget = (day: DayOfWeekKey) => {
    setCopyTargetDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const handleApplyCopyToOtherDays = () => {
    const nextSet = new Set(activeSet);
    const selectedDayHours = AVAILABILITY_HOURS.filter((hour) =>
      activeSet.has(makeSlotKey(mobileSelectedDay, hour))
    );

    for (const targetDay of copyTargetDays) {
      for (const hour of AVAILABILITY_HOURS) {
        nextSet.delete(makeSlotKey(targetDay, hour));
      }
      for (const hour of selectedDayHours) {
        nextSet.add(makeSlotKey(targetDay, hour));
      }
    }

    onChange(serializeSetToBlocks(nextSet));
    setIsCopyModalOpen(false);
    onCopyMondayToast?.();
  };

  if (isMobile) {
    const selectedDayHours = dailyHoursMap[mobileSelectedDay];
    return (
      <div className="space-y-4 py-2">
        {/* Top Summary Bar */}
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-slate-200/80 bg-slate-50/70 p-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-indigo-600 text-white shadow-xs">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-slate-500">
                {t("study.totalWeeklyHours")}
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="total-weekly-hours"
                  className="text-lg font-bold tabular-nums text-indigo-700"
                >
                  {totalWeeklyHours}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {t("study.hoursUnit")}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={totalWeeklyHours === 0}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:border-red-200 hover:bg-red-50/50 hover:text-red-700 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("study.clearAllBtn")}</span>
          </button>
        </div>

        {/* Day Switcher Chips (Mon-Sun chips) */}
        <div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {orderedDays.map((day) => {
              const isSelected = day === mobileSelectedDay;
              const count = dailyHoursMap[day];
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setMobileSelectedDay(day)}
                  className={`flex min-h-[44px] min-w-[48px] flex-1 flex-col items-center justify-center rounded-[12px] px-2 py-1 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{t(`study.daysShort.${day}`, day.slice(0, 3))}</span>
                  <span
                    className={`text-[10px] font-medium tabular-nums ${
                      isSelected ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    {count}
                    {t("study.dailyHoursUnit")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Header & Copy Action */}
        <div className="flex items-center justify-between gap-2 rounded-[12px] border border-indigo-100 bg-indigo-50/50 p-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {t(`study.days.${mobileSelectedDay}`)}
            </h4>
            <p className="text-xs text-slate-600">
              {selectedDayHours} {t("study.hoursUnit")} {t("study.availableLabel", "available")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCopyModal}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span>{t("study.copyToOtherDays", "Copy to days")}</span>
          </button>
        </div>

        {/* Large Tappable Hour Blocks (2-Column Grid) */}
        <div className="grid grid-cols-2 gap-2">
          {AVAILABILITY_HOURS.map((hour) => {
            const isSelected = activeSet.has(makeSlotKey(mobileSelectedDay, hour));
            const slotLabel = `${formatHourSlot(hour, timeFormat)} – ${formatHourSlot(
              hour + 1,
              timeFormat
            )}`;

            return (
              <button
                key={hour}
                type="button"
                onClick={() => {
                  applySlotMutation(
                    mobileSelectedDay,
                    hour,
                    isSelected ? "erase" : "paint"
                  );
                }}
                className={`flex min-h-[48px] items-center justify-between rounded-[12px] border px-3 py-2.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30"
                }`}
              >
                <span className="tabular-nums font-semibold">{slotLabel}</span>
                {isSelected ? (
                  <Check className="h-4 w-4 shrink-0 text-white" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile "Copy to Other Days" Bottom Sheet */}
        {isCopyModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
            onClick={() => setIsCopyModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[85vh] overflow-y-auto rounded-t-[24px] border-t border-slate-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] sm:max-w-md sm:rounded-[16px] sm:border sm:pb-6"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
                    <Copy className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {t("study.copyToOtherDays", "Copy Schedule")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t("study.copyDescription", "Copy {{day}}'s hours to other days", {
                        day: t(`study.days.${mobileSelectedDay}`),
                      })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="my-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const weekdays = orderedDays.filter(
                      (d) => WEEKDAY_KEYS.includes(d) && d !== mobileSelectedDay
                    );
                    setCopyTargetDays(new Set(weekdays));
                  }}
                  className="rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {t("study.allWeekdays", "All Weekdays")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allOthers = orderedDays.filter(
                      (d) => d !== mobileSelectedDay
                    );
                    setCopyTargetDays(new Set(allOthers));
                  }}
                  className="rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {t("study.allDays", "All Days")}
                </button>
                <button
                  type="button"
                  onClick={() => setCopyTargetDays(new Set())}
                  className="rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  {t("study.clearSelection", "Clear")}
                </button>
              </div>

              {/* Target Day Options */}
              <div className="space-y-2 py-2">
                {orderedDays
                  .filter((d) => d !== mobileSelectedDay)
                  .map((day) => {
                    const isChecked = copyTargetDays.has(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleCopyTarget(day)}
                        className={`flex min-h-[44px] w-full items-center justify-between rounded-[12px] border px-4 py-2.5 text-sm font-medium transition-colors ${
                          isChecked
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-semibold">
                          {t(`study.days.${day}`)}
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            isChecked
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="min-h-[44px] flex-1 rounded-[12px] border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={copyTargetDays.size === 0}
                  onClick={handleApplyCopyToOtherDays}
                  className="min-h-[44px] flex-1 rounded-[12px] bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40"
                >
                  {t("study.applyCopy", "Apply ({{count}})", {
                    count: copyTargetDays.size,
                  })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-3">
      {/* Top Toolbar: Live Weekly Total + Quick Action Buttons */}
      <div className="flex flex-col justify-between gap-3 rounded-[12px] border border-slate-200/80 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-600 text-white shadow-xs">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t("study.totalWeeklyHours")}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                data-testid="total-weekly-hours"
                className="text-xl font-bold tabular-nums text-indigo-700"
              >
                {totalWeeklyHours}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {t("study.hoursUnit")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMondayToWeekdays}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("study.copyMondayBtn")}</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={totalWeeklyHours === 0}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-2xs transition-colors duration-150 hover:border-red-200 hover:bg-red-50/50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("study.clearAllBtn")}</span>
          </button>
        </div>
      </div>

      {/* Full-Width Heatmap Grid Container */}
      <div className="w-full overflow-x-auto rounded-[12px] border border-slate-200/80 bg-white p-3.5 select-none">
        <div className="w-full min-w-[620px]">
          {/* Hour Column Headers (06:00 - 23:00) */}
          <div className="mb-2.5 grid grid-cols-[104px_repeat(18,minmax(26px,1fr))_46px] items-center gap-1.5">
            <div className="ps-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Day / Hour
            </div>
            {AVAILABILITY_HOURS.map((hour) => (
              <div
                key={hour}
                className="text-center text-[10px] font-semibold tabular-nums text-slate-500"
                title={`${formatHourSlot(hour, timeFormat)} - ${formatHourSlot(
                  hour + 1,
                  timeFormat
                )}`}
              >
                {timeFormat === "24h"
                  ? String(hour).padStart(2, "0")
                  : `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? "p" : "a"}`}
              </div>
            ))}
            <div className="text-end pe-1 text-[10px] font-semibold uppercase text-slate-400">
              Sum
            </div>
          </div>

          {/* 7 Days x 18 Hourly Slots Rows */}
          <div
            role="grid"
            aria-label={t("study.availabilityCardTitle")}
            className="space-y-1.5"
          >
            {orderedDays.map((day) => {
              const dayHours = dailyHoursMap[day];
              const isHighIntensityDay = dayHours >= 4;

              return (
                <div
                  key={day}
                  role="row"
                  className="grid grid-cols-[104px_repeat(18,minmax(26px,1fr))_46px] items-center gap-1.5"
                >
                  <div className="flex items-center justify-between pe-2 ps-1">
                    <span className="truncate text-xs font-semibold text-slate-700">
                      {t(`study.days.${day}`)}
                    </span>
                  </div>

                  {AVAILABILITY_HOURS.map((hour) => {
                    const isSelected = activeSet.has(makeSlotKey(day, hour));
                    const slotLabel = `${t(`study.days.${day}`)} ${formatHourSlot(
                      hour,
                      timeFormat
                    )} – ${formatHourSlot(hour + 1, timeFormat)}`;

                    // Heatmap visual tiers based on selection & daily concentration
                    const cellStyle = isSelected
                      ? isHighIntensityDay
                        ? "border-indigo-700 bg-indigo-600 text-white shadow-[0_1px_4px_rgba(79,70,229,0.35)] hover:bg-indigo-700"
                        : "border-indigo-500 bg-indigo-500/85 text-white hover:bg-indigo-600"
                      : "border-slate-200/75 bg-slate-50/90 text-transparent hover:border-indigo-200 hover:bg-indigo-50/50";

                    return (
                      <button
                        key={hour}
                        type="button"
                        role="gridcell"
                        aria-selected={isSelected}
                        aria-label={slotLabel}
                        title={slotLabel}
                        onPointerDown={(e) => handleCellPointerDown(e, day, hour)}
                        onPointerEnter={() => handleCellPointerEnter(day, hour)}
                        onKeyDown={(e) => handleCellKeyDown(e, day, hour)}
                        className={`h-8 w-full rounded-[6px] border transition-all duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${cellStyle}`}
                      />
                    );
                  })}

                  <div className="text-end pe-1">
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                        dayHours > 0
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-400"
                      }`}
                    >
                      {dayHours}
                      {t("study.dailyHoursUnit")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Heatmap Legend & Drag Tip */}
      <div className="flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span>{t("study.dragHint")}</span>

        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] border border-slate-200 bg-slate-50" />
            <span>{t("study.heatmapLegendLow")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] border border-indigo-500 bg-indigo-500/85" />
            <span>{t("study.heatmapLegendMed")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] border border-indigo-700 bg-indigo-600" />
            <span>{t("study.heatmapLegendHigh")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
