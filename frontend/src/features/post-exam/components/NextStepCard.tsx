import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Snowflake, Sparkles } from "lucide-react";
import {
  LONG_STREAK_REST_THRESHOLD_DAYS,
  type PostExamEnrollment,
} from "../constants/postExamConstants";

const MS_PER_DAY = 86_400_000;
const MINIMUM_DAYS_UNTIL = 1;

export interface NextStepCardProps {
  freedWeeklyHours: number;
  nearestActiveCourse: PostExamEnrollment | null;
  longestStreak: number;
}

function getDaysUntilExam(examDate: string): number {
  if (!examDate) return MINIMUM_DAYS_UNTIL;
  const target = new Date(`${examDate}T00:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.max(MINIMUM_DAYS_UNTIL, Math.round((target - today) / MS_PER_DAY));
}

export function NextStepCard({
  freedWeeklyHours,
  nearestActiveCourse,
  longestStreak,
}: NextStepCardProps) {
  const { t, i18n } = useTranslation();
  const [dismissedRedirect, setDismissedRedirect] = useState(false);
  const [acceptedRedirect, setAcceptedRedirect] = useState(false);
  const [streakFreezeNotice, setStreakFreezeNotice] = useState<string | null>(
    null
  );

  const isArabic = i18n.language === "ar";
  const nearestCourseTitle = nearestActiveCourse
    ? isArabic && nearestActiveCourse.courseNameAr
      ? nearestActiveCourse.courseNameAr
      : nearestActiveCourse.courseName
    : "";
  const daysLeft = nearestActiveCourse
    ? getDaysUntilExam(nearestActiveCourse.examDate)
    : MINIMUM_DAYS_UNTIL;

  const showRedirectCard =
    nearestActiveCourse !== null &&
    freedWeeklyHours > 0 &&
    !dismissedRedirect;

  const showRestSuggestion =
    longestStreak >= LONG_STREAK_REST_THRESHOLD_DAYS;

  if (!showRedirectCard && !showRestSuggestion) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {showRedirectCard && nearestActiveCourse && (
        <section
          aria-label={t("postExam.nextStep.eyebrow")}
          className="flex flex-col justify-between rounded-[16px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xs text-start"
        >
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("postExam.nextStep.eyebrow")}
            </span>

            <h2 className="text-lg font-bold text-slate-900">
              {t("postExam.nextStep.title", { hours: freedWeeklyHours })}
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              {t("postExam.nextStep.prompt", {
                course: nearestCourseTitle,
                days: daysLeft,
              })}
            </p>
          </div>

          {acceptedRedirect ? (
            <div
              role="status"
              className="mt-5 flex items-center gap-2 rounded-[12px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-800"
            >
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-indigo-600"
                aria-hidden="true"
              />
              <span>
                {t("postExam.nextStep.acceptedToast", {
                  hours: freedWeeklyHours,
                  course: nearestCourseTitle,
                })}
              </span>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setAcceptedRedirect(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                <span>{t("postExam.nextStep.acceptButton")}</span>
                <ArrowRight
                  className="h-4 w-4 rtl:rotate-180"
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                onClick={() => setDismissedRedirect(true)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                {t("postExam.nextStep.notNowButton")}
              </button>
            </div>
          )}
        </section>
      )}

      {showRestSuggestion && (
        <section
          aria-label={t("postExam.nextStep.restTitle")}
          className="flex flex-col justify-between rounded-[16px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xs text-start"
        >
          <div className="space-y-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
              <Snowflake className="h-5 w-5" aria-hidden="true" />
            </span>

            <h2 className="text-lg font-bold text-slate-900">
              {t("postExam.nextStep.restTitle")}
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              {t("postExam.nextStep.restSubtitle", { streak: longestStreak })}
            </p>
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                // TODO(backend): Connect Streak Freeze activation endpoint when available
                setStreakFreezeNotice(t("postExam.nextStep.restNotReady"));
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <Snowflake className="h-4 w-4" aria-hidden="true" />
              <span>{t("postExam.nextStep.restButton")}</span>
            </button>

            {streakFreezeNotice && (
              <p
                role="status"
                className="rounded-[12px] border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700"
              >
                {streakFreezeNotice}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
