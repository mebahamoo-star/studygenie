import React, { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Flame, Save } from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import { AvailabilityGrid } from "../components/AvailabilityGrid";
import { NumericStepper } from "../components/NumericStepper";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  createStudyPreferencesSchema,
  type StudyPreferencesFormValues,
} from "../schemas/settingsSchemas";
import {
  STUDY_LIMITS,
  type AvailabilityBlock,
  type SectionId,
  type StudyPreferencesSettings,
} from "../constants/settingsConstants";

export interface StudyPreferencesSectionProps {
  studyPreferences: StudyPreferencesSettings;
  availability: AvailabilityBlock[];
  timeFormat: "12h" | "24h";
  firstDayOfWeek: "SUNDAY" | "SATURDAY" | "MONDAY";
  onSaveStudyPreferences: (
    prefs: StudyPreferencesSettings,
    slots: AvailabilityBlock[]
  ) => Promise<void>;
  onDirtyChange: (section: SectionId, isDirty: boolean) => void;
  onShowToast: (type: "success" | "error", message: string) => void;
}

function serializeBlocksSignature(blocks: AvailabilityBlock[]): string {
  return [...blocks]
    .map((b) => `${b.dayOfWeek}:${b.startTime}-${b.endTime}`)
    .sort()
    .join("|");
}

export function StudyPreferencesSection({
  studyPreferences,
  availability,
  timeFormat,
  firstDayOfWeek,
  onSaveStudyPreferences,
  onDirtyChange,
  onShowToast,
}: StudyPreferencesSectionProps) {
  const { t } = useTranslation();
  const [draftAvailability, setDraftAvailability] =
    useState<AvailabilityBlock[]>(availability);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] =
    useState<StudyPreferencesFormValues | null>(null);

  const schema = useMemo(() => createStudyPreferencesSchema(), []);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty: isFormDirty, errors },
  } = useForm<StudyPreferencesFormValues>({
    resolver: zodResolver(schema),
    defaultValues: studyPreferences,
  });

  useEffect(() => {
    reset(studyPreferences);
  }, [studyPreferences, reset]);

  useEffect(() => {
    setDraftAvailability(availability);
  }, [availability]);

  const isAvailabilityDirty = useMemo(() => {
    return (
      serializeBlocksSignature(draftAvailability) !==
      serializeBlocksSignature(availability)
    );
  }, [draftAvailability, availability]);

  const isAnyDirty = isFormDirty || isAvailabilityDirty;

  useEffect(() => {
    onDirtyChange("studyPreferences", isAnyDirty);
    return () => onDirtyChange("studyPreferences", false);
  }, [isAnyDirty, onDirtyChange]);

  const survivalModeEnabled = watch("survivalModeEnabled");
  const dailyGoalHours = watch("dailyStudyGoalHours");

  const executeSave = async (values: StudyPreferencesFormValues) => {
    setIsSaving(true);
    try {
      await onSaveStudyPreferences(values, draftAvailability);
      reset(values);
      setPendingSubmitValues(null);
      onDirtyChange("studyPreferences", false);
      onShowToast("success", t("toasts.studyPrefsSaved"));
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = (values: StudyPreferencesFormValues) => {
    const examOrScheduleChanged =
      isAvailabilityDirty ||
      values.survivalModeEnabled !== studyPreferences.survivalModeEnabled ||
      values.survivalModeDaysBeforeExam !==
        studyPreferences.survivalModeDaysBeforeExam ||
      values.dailyStudyGoalHours !== studyPreferences.dailyStudyGoalHours;

    if (examOrScheduleChanged) {
      setPendingSubmitValues(values);
    } else {
      executeSave(values);
    }
  };

  return (
    <form
      id="study-preferences-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* 1. Weekly Availability Grid Card */}
      <SettingsCard
        title={t("study.availabilityCardTitle")}
        description={t("study.availabilityCardDescription")}
      >
        <AvailabilityGrid
          value={draftAvailability}
          onChange={setDraftAvailability}
          timeFormat={timeFormat}
          firstDayOfWeek={firstDayOfWeek}
          onCopyMondayToast={() =>
            onShowToast("success", t("toasts.mondayCopied"))
          }
          onClearAllToast={() =>
            onShowToast("success", t("toasts.gridCleared"))
          }
        />
      </SettingsCard>

      {/* 2. Pomodoro Focus Engine Card */}
      <SettingsCard
        title={t("study.pomodoroCardTitle")}
        description={t("study.pomodoroCardDescription")}
      >
        <SettingRow
          label={t("study.focusDurationLabel")}
          helperText={t("study.focusDurationHelper")}
          error={errors.pomodoroFocusMinutes?.message}
        >
          <Controller
            name="pomodoroFocusMinutes"
            control={control}
            render={({ field }) => (
              <NumericStepper
                value={field.value}
                min={STUDY_LIMITS.FOCUS_MIN}
                max={STUDY_LIMITS.FOCUS_MAX}
                step={STUDY_LIMITS.FOCUS_STEP}
                unit={t("study.minutesUnit")}
                onChange={field.onChange}
                ariaLabel={t("study.focusDurationLabel")}
              />
            )}
          />
        </SettingRow>

        <SettingRow
          label={t("study.shortBreakLabel")}
          helperText={t("study.shortBreakHelper")}
          error={errors.pomodoroShortBreakMinutes?.message}
        >
          <Controller
            name="pomodoroShortBreakMinutes"
            control={control}
            render={({ field }) => (
              <NumericStepper
                value={field.value}
                min={STUDY_LIMITS.SHORT_BREAK_MIN}
                max={STUDY_LIMITS.SHORT_BREAK_MAX}
                step={STUDY_LIMITS.SHORT_BREAK_STEP}
                unit={t("study.minutesUnit")}
                onChange={field.onChange}
                ariaLabel={t("study.shortBreakLabel")}
              />
            )}
          />
        </SettingRow>

        <SettingRow
          label={t("study.longBreakLabel")}
          helperText={t("study.longBreakHelper")}
          error={errors.pomodoroLongBreakMinutes?.message}
        >
          <Controller
            name="pomodoroLongBreakMinutes"
            control={control}
            render={({ field }) => (
              <NumericStepper
                value={field.value}
                min={STUDY_LIMITS.LONG_BREAK_MIN}
                max={STUDY_LIMITS.LONG_BREAK_MAX}
                step={STUDY_LIMITS.LONG_BREAK_STEP}
                unit={t("study.minutesUnit")}
                onChange={field.onChange}
                ariaLabel={t("study.longBreakLabel")}
              />
            )}
          />
        </SettingRow>

        <SettingRow
          label={t("study.sessionsCountLabel")}
          helperText={t("study.sessionsCountHelper")}
          error={errors.pomodoroSessionsBeforeLongBreak?.message}
        >
          <Controller
            name="pomodoroSessionsBeforeLongBreak"
            control={control}
            render={({ field }) => (
              <NumericStepper
                value={field.value}
                min={STUDY_LIMITS.SESSIONS_MIN}
                max={STUDY_LIMITS.SESSIONS_MAX}
                step={STUDY_LIMITS.SESSIONS_STEP}
                unit={t("study.sessionsUnit")}
                onChange={field.onChange}
                ariaLabel={t("study.sessionsCountLabel")}
              />
            )}
          />
        </SettingRow>
      </SettingsCard>

      {/* 3. Daily Goal & Survival Mode Card */}
      <SettingsCard
        title={t("study.goalsCardTitle")}
        description={t("study.goalsCardDescription")}
        footer={
          <button
            type="submit"
            disabled={!isAnyDirty || isSaving}
            className="inline-flex items-center gap-2 rounded-[12px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSaving ? t("page.saving") : t("page.saveChanges")}
            </span>
          </button>
        }
      >
        {/* Daily Study Goal Slider */}
        <SettingRow
          id="daily-study-goal-slider"
          label={t("study.dailyGoalLabel")}
          helperText={t("study.dailyGoalHelper")}
          badge={
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-700">
              {dailyGoalHours} {t("study.hoursPerDay")}
            </span>
          }
        >
          <Controller
            name="dailyStudyGoalHours"
            control={control}
            render={({ field }) => (
              <div className="flex w-full items-center gap-3 sm:w-64">
                <span className="text-xs font-medium text-slate-400">
                  {STUDY_LIMITS.DAILY_GOAL_MIN}h
                </span>
                <input
                  id="daily-study-goal-slider"
                  type="range"
                  min={STUDY_LIMITS.DAILY_GOAL_MIN}
                  max={STUDY_LIMITS.DAILY_GOAL_MAX}
                  step={STUDY_LIMITS.DAILY_GOAL_STEP}
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  aria-label={t("study.dailyGoalLabel")}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                />
                <span className="text-xs font-medium text-slate-400">
                  {STUDY_LIMITS.DAILY_GOAL_MAX}h
                </span>
              </div>
            )}
          />
        </SettingRow>

        {/* Survival Mode Toggle */}
        <SettingRow
          id="survival-mode-toggle"
          label={t("study.survivalModeLabel")}
          helperText={t("study.survivalModeHelper")}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <Flame className="h-3 w-3" aria-hidden="true" />
              AI Exam Crunch
            </span>
          }
        >
          <Controller
            name="survivalModeEnabled"
            control={control}
            render={({ field }) => (
              <ToggleSwitch
                id="survival-mode-toggle"
                checked={field.value}
                onChange={field.onChange}
                ariaLabel={t("study.survivalModeLabel")}
              />
            )}
          />
        </SettingRow>

        {/* Activate automatically X days before exam */}
        <SettingRow
          id="survival-days-input"
          label={t("study.survivalDaysLabel")}
          helperText={t("study.survivalDaysHelper")}
          error={errors.survivalModeDaysBeforeExam?.message}
        >
          <Controller
            name="survivalModeDaysBeforeExam"
            control={control}
            render={({ field }) => (
              <div className="inline-flex items-center gap-2">
                <input
                  id="survival-days-input"
                  type="number"
                  min={STUDY_LIMITS.SURVIVAL_DAYS_MIN}
                  max={STUDY_LIMITS.SURVIVAL_DAYS_MAX}
                  disabled={!survivalModeEnabled}
                  value={field.value}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed)) {
                      const clamped = Math.min(
                        STUDY_LIMITS.SURVIVAL_DAYS_MAX,
                        Math.max(STUDY_LIMITS.SURVIVAL_DAYS_MIN, parsed)
                      );
                      field.onChange(clamped);
                    }
                  }}
                  aria-label={t("study.survivalDaysLabel")}
                  className="w-20 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold tabular-nums text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="text-xs font-medium text-slate-500">
                  {t("study.daysBeforeExamUnit")}
                </span>
              </div>
            )}
          />
        </SettingRow>
      </SettingsCard>

      {/* Schedule Regeneration Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingSubmitValues !== null}
        title={t("study.regenerateModalTitle")}
        description={t("study.regenerateModalDesc")}
        confirmLabel={t("page.continue")}
        cancelLabel={t("page.cancel")}
        variant="warning"
        isLoading={isSaving}
        onConfirm={() => {
          if (pendingSubmitValues) {
            executeSave(pendingSubmitValues);
          }
        }}
        onCancel={() => setPendingSubmitValues(null)}
      />
    </form>
  );
}
