import React, { useEffect, useMemo } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/lib/app-state";
import { useMediaQuery } from "@/features/settings/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT_QUERY } from "../constants/postExamConstants";
import postExamI18n, { syncPostExamLanguage } from "../i18n";
import { useCourseReport } from "../hooks/useCourseReport";
import { useEnrollmentStatus } from "../hooks/useEnrollmentStatus";
import { ReportSummaryCards } from "../components/ReportSummaryCards";
import { PlannedVsActualChart } from "../components/PlannedVsActualChart";
import { SlowTopicsList } from "../components/SlowTopicsList";
import { NextStepCard } from "../components/NextStepCard";

const DEFAULT_FREED_WEEKLY_HOURS = 6;

export interface CourseReportPageProps {
  enrollmentId: string;
  onBackToCourses?: () => void;
  languageOverride?: "en" | "ar";
}

function CourseReportSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      data-testid="course-report-skeleton"
      aria-busy="true"
      aria-label={t("postExam.report.loadingLabel")}
      className="mx-auto max-w-6xl space-y-6 rounded-[16px] bg-slate-50 p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-[8px] bg-slate-200" />
          <div className="h-7 w-64 animate-pulse rounded-[10px] bg-slate-200" />
        </div>
        <div className="h-11 w-44 animate-pulse rounded-[12px] bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 animate-pulse rounded-[16px] border border-slate-200 bg-white p-5"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-[16px] border border-slate-200 bg-white" />
      <div className="h-52 animate-pulse rounded-[16px] border border-slate-200 bg-white" />
    </div>
  );
}

function CourseReportContent({
  enrollmentId,
  onBackToCourses,
  languageOverride,
}: CourseReportPageProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);

  let appCtx: ReturnType<typeof useApp> | null = null;
  try {
    appCtx = useApp();
  } catch {
    appCtx = null;
  }

  useEffect(() => {
    if (languageOverride) {
      syncPostExamLanguage(languageOverride);
      return;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get("lang");
      if (urlLang === "ar" || urlLang === "en") {
        syncPostExamLanguage(urlLang);
        return;
      }
    }
    if (appCtx?.lang === "ar" || appCtx?.lang === "en") {
      syncPostExamLanguage(appCtx.lang);
    }
  }, [appCtx?.lang, languageOverride]);

  const {
    report,
    isLoading,
    error,
    isDownloadingPdf,
    pdfNotice,
    refresh,
    downloadPdfSummary,
  } = useCourseReport(enrollmentId);

  const { enrollments } = useEnrollmentStatus();

  const currentEnrollment = useMemo(
    () =>
      enrollments.find(
        (item) =>
          item.id === enrollmentId || String(item.courseId) === String(enrollmentId)
      ) ?? null,
    [enrollments, enrollmentId]
  );

  const nearestActiveCourse = useMemo(() => {
    const active = enrollments.filter((item) => item.status === "ACTIVE");
    if (active.length === 0) return null;
    return [...active].sort((a, b) => a.examDate.localeCompare(b.examDate))[0]!;
  }, [enrollments]);

  const freedWeeklyHours =
    currentEnrollment?.freedWeeklyHours && currentEnrollment.freedWeeklyHours > 0
      ? currentEnrollment.freedWeeklyHours
      : DEFAULT_FREED_WEEKLY_HOURS;

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onBackToCourses) {
      e.preventDefault();
      onBackToCourses();
    }
  };

  const handleDownloadPdf = () => {
    void downloadPdfSummary(t("postExam.report.pdfNotReady"));
  };

  if (isLoading) {
    return <CourseReportSkeleton />;
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl rounded-[16px] border border-rose-200 bg-white p-6 text-start shadow-xs">
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
            aria-hidden="true"
          />
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              {error || "Could not load study report."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
              <a
                href="/settings/study"
                onClick={handleBackClick}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                <ArrowLeft
                  className="h-4 w-4 rtl:rotate-180"
                  aria-hidden="true"
                />
                {t("postExam.report.backToCourses")}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-[16px] bg-slate-50 p-4 pb-24 sm:p-6 sm:pb-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 rounded-[16px] border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="space-y-1.5 text-start">
          <a
            href="/settings/study"
            onClick={handleBackClick}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 rounded-[8px] pe-2"
          >
            <ArrowLeft
              className="h-4 w-4 rtl:rotate-180"
              aria-hidden="true"
            />
            {t("postExam.report.backToCourses")}
          </a>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("postExam.report.title")}
          </h1>
          <p className="text-sm text-slate-600">
            {t("postExam.report.subtitle", { course: report.courseName })}
          </p>
        </div>

        {/* Desktop actions */}
        {!isMobile && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("postExam.report.downloadingPdf")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("postExam.report.downloadPdf")}
                </>
              )}
            </button>
          </div>
        )}
      </header>

      {pdfNotice && (
        <div
          role="status"
          className="rounded-[12px] border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-800 text-start"
        >
          {pdfNotice}
        </div>
      )}

      {/* 5 Summary Cards */}
      <ReportSummaryCards report={report} />

      {/* Weekly Planned vs Actual Bar Chart */}
      <PlannedVsActualChart weekly={report.weekly} />

      {/* Slow Topics List */}
      <SlowTopicsList slowTopics={report.slowTopics} />

      {/* Next Step Suggestion & Optional Rest Day / Streak Freeze */}
      <NextStepCard
        freedWeeklyHours={freedWeeklyHours}
        nearestActiveCourse={nearestActiveCourse}
        longestStreak={report.longestStreak}
      />

      {/* Sticky mobile bottom bar (<768px) */}
      {isMobile && (
        <div className="sticky bottom-0 z-20 flex items-center gap-2.5 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xs rounded-t-[16px]">
          <a
            href="/settings/study"
            onClick={handleBackClick}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t("postExam.report.backToCourses")}
          </a>
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {isDownloadingPdf
              ? t("postExam.report.downloadingPdf")
              : t("postExam.report.downloadPdf")}
          </button>
        </div>
      )}
    </div>
  );
}

export function CourseReportPage(props: CourseReportPageProps) {
  return (
    <I18nextProvider i18n={postExamI18n}>
      <CourseReportContent {...props} />
    </I18nextProvider>
  );
}
