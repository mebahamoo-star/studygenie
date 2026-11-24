import React from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Clock, Flame, Trophy } from "lucide-react";
import type { CourseReportResponse } from "../constants/postExamConstants";

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const PERCENT_MAX = 100;

export interface ReportSummaryCardsProps {
  report: CourseReportResponse;
}

export function ReportSummaryCards({ report }: ReportSummaryCardsProps) {
  const { t } = useTranslation();

  const clampedAdherence = Math.min(
    PERCENT_MAX,
    Math.max(0, Math.round(report.adherencePercent))
  );
  const strokeDashoffset =
    RING_CIRCUMFERENCE -
    (clampedAdherence / PERCENT_MAX) * RING_CIRCUMFERENCE;

  return (
    <section
      aria-label={t("postExam.report.title")}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      {/* 1. Total Study Hours */}
      <article className="flex flex-col justify-between rounded-[16px] border border-slate-200 bg-white p-5 shadow-xs text-start">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {t("postExam.report.totalHours")}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
          {report.totalStudyHours}
        </p>
      </article>

      {/* 2. Study Sessions */}
      <article className="flex flex-col justify-between rounded-[16px] border border-slate-200 bg-white p-5 shadow-xs text-start">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {t("postExam.report.sessionsCount")}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
          {report.sessionsCount}
        </p>
      </article>

      {/* 3. Schedule Adherence % with circular progress */}
      <article className="flex items-center justify-between gap-3 rounded-[16px] border border-slate-200 bg-white p-5 shadow-xs text-start">
        <div className="min-w-0">
          <span className="block text-xs font-semibold text-slate-500">
            {t("postExam.report.adherence")}
          </span>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
            {clampedAdherence}%
          </p>
        </div>

        <div
          role="progressbar"
          aria-label={t("postExam.report.adherence")}
          aria-valuenow={clampedAdherence}
          aria-valuemin={0}
          aria-valuemax={PERCENT_MAX}
          className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center"
        >
          <svg
            viewBox="0 0 48 48"
            className="h-14 w-14 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r={RING_RADIUS}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="5"
            />
            <circle
              cx="24"
              cy="24"
              r={RING_RADIUS}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
        </div>
      </article>

      {/* 4. Longest Streak */}
      <article className="flex flex-col justify-between rounded-[16px] border border-slate-200 bg-white p-5 shadow-xs text-start">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {t("postExam.report.longestStreak")}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
          {t("postExam.report.streakDays", { days: report.longestStreak })}
        </p>
      </article>

      {/* 5. Final Leaderboard Rank */}
      {/* TODO(backend): Replace mock finalRank with real course leaderboard rank when endpoint exists */}
      <article className="flex flex-col justify-between rounded-[16px] border border-slate-200 bg-white p-5 shadow-xs text-start">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {t("postExam.report.finalRank")}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-indigo-50 text-indigo-600">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
          {report.finalRank !== null
            ? t("postExam.report.rankValue", { rank: report.finalRank })
            : t("postExam.report.rankUnavailable")}
        </p>
      </article>
    </section>
  );
}
