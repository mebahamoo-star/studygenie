import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  BarChart2,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Edit3,
  LogOut,
  RotateCcw,
  Trophy,
  Users,
  X,
} from "lucide-react";
import "@/features/post-exam/i18n";
import { useEnrollmentStatus } from "@/features/post-exam/hooks/useEnrollmentStatus";
import type { PostExamEnrollment } from "@/features/post-exam/constants/postExamConstants";
import { SettingsCard } from "../components/SettingsCard";
import { ConfirmModal } from "../components/ConfirmModal";
import type { EnrolledCourseItem } from "../constants/settingsConstants";

const DEFAULT_REOPENED_PROGRESS_PERCENT = 100;

export interface CoursesSectionProps {
  courses: EnrolledCourseItem[];
  onUpdateExamDate: (courseId: string, examDate: string) => Promise<void>;
  onLeaveChallenge: (courseId: string) => Promise<void>;
  onShowToast: (type: "success" | "error", message: string) => void;
}

export function CoursesSection({
  courses,
  onUpdateExamDate,
  onLeaveChallenge,
  onShowToast,
}: CoursesSectionProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<string>("");
  const [savingDateId, setSavingDateId] = useState<string | null>(null);

  const [courseToLeave, setCourseToLeave] = useState<EnrolledCourseItem | null>(
    null
  );
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  const {
    enrollments,
    reopenEnrollment,
    archiveEnrollment,
  } = useEnrollmentStatus();

  const [enrollmentToReopen, setEnrollmentToReopen] =
    useState<PostExamEnrollment | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);

  const completedEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "COMPLETED"),
    [enrollments]
  );

  const archivedEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "ARCHIVED"),
    [enrollments]
  );

  const activeCourses = useMemo(() => {
    const completedOrArchivedCodes = new Set(
      enrollments
        .filter((e) => e.status === "COMPLETED" || e.status === "ARCHIVED")
        .map((e) => e.courseCode.trim().toLowerCase())
    );

    const existingActive = courses.filter(
      (c) => !completedOrArchivedCodes.has(c.code.trim().toLowerCase())
    );
    const seenCodes = new Set(
      existingActive.map((c) => c.code.trim().toLowerCase())
    );

    const reopenedActive: EnrolledCourseItem[] = enrollments
      .filter(
        (e) =>
          e.status === "ACTIVE" &&
          !seenCodes.has(e.courseCode.trim().toLowerCase())
      )
      .map((e) => ({
        id: e.id,
        name: isArabic && e.courseNameAr ? e.courseNameAr : e.courseName,
        code: e.courseCode,
        examDate: e.examDate,
        progressPercent: DEFAULT_REOPENED_PROGRESS_PERCENT,
        participantsCount: 1,
      }));

    return [...existingActive, ...reopenedActive];
  }, [courses, enrollments, isArabic]);

  const handleStartEditDate = (course: EnrolledCourseItem) => {
    setEditingCourseId(course.id);
    setDraftDate(course.examDate);
  };

  const handleSaveDate = async (courseId: string) => {
    if (!draftDate) return;
    setSavingDateId(courseId);
    try {
      await onUpdateExamDate(courseId, draftDate);
      setEditingCourseId(null);
      onShowToast("success", t("toasts.courseUpdated"));
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setSavingDateId(null);
    }
  };

  const handleConfirmLeave = async () => {
    if (!courseToLeave) return;
    setIsLeaving(true);
    try {
      await onLeaveChallenge(courseToLeave.id);
      setCourseToLeave(null);
      onShowToast("success", t("toasts.courseLeft"));
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setIsLeaving(false);
    }
  };

  const getLocalizedCourseTitle = (item: PostExamEnrollment) =>
    isArabic && item.courseNameAr ? item.courseNameAr : item.courseName;

  const handleConfirmReopen = async () => {
    if (!enrollmentToReopen) return;
    setIsReopening(true);
    const targetTitle = getLocalizedCourseTitle(enrollmentToReopen);
    try {
      await reopenEnrollment(enrollmentToReopen.id);
      setEnrollmentToReopen(null);
      onShowToast(
        "success",
        t("postExam.coursesTab.reopenedToast", { course: targetTitle })
      );
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setIsReopening(false);
    }
  };

  const handleArchive = async (item: PostExamEnrollment) => {
    setArchivingId(item.id);
    const targetTitle = getLocalizedCourseTitle(item);
    try {
      await archiveEnrollment(item.id);
      onShowToast(
        "success",
        t("postExam.coursesTab.archivedToast", { course: targetTitle })
      );
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title={t("courses.cardTitle")}
        description={t("courses.cardDescription")}
      >
        <div className="space-y-8">
          {/* Active Courses Group */}
          <section aria-labelledby="settings-active-courses-heading">
            <h3
              id="settings-active-courses-heading"
              className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 text-start"
            >
              {t("postExam.coursesTab.activeHeading")}
            </h3>

            {activeCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-6 w-6" aria-hidden="true" />
                </span>
                <h4 className="mt-3 text-sm font-semibold text-slate-900">
                  {t("courses.emptyTitle")}
                </h4>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                  {t("courses.emptyDescription")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeCourses.map((course) => {
                  const isEditing = editingCourseId === course.id;
                  const isSaving = savingDateId === course.id;

                  return (
                    <div
                      key={course.id}
                      className="flex flex-col justify-between gap-4 py-5 lg:flex-row lg:items-center"
                    >
                      {/* Course Info & Progress Bar */}
                      <div className="min-w-0 flex-1 space-y-2.5 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-[8px] bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                            {course.code}
                          </span>
                          <h4 className="truncate text-sm font-semibold text-slate-900">
                            {course.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {course.participantsCount}{" "}
                              {t("courses.participantsLabel")}
                            </span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="max-w-md space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              {t("courses.progressLabel")}
                            </span>
                            <span className="font-semibold tabular-nums text-slate-700">
                              {course.progressPercent}%
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuenow={course.progressPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${course.name} ${t("courses.progressLabel")}`}
                            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                          >
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                              style={{ width: `${course.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Exam Date Picker & Leave Challenge Button */}
                      <div className="flex flex-wrap items-center gap-2.5 lg:ms-auto">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={draftDate}
                              onChange={(e) => setDraftDate(e.target.value)}
                              aria-label={t("courses.examDateLabel")}
                              className="min-h-[44px] rounded-[10px] border border-indigo-300 bg-white px-2.5 py-1.5 text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-xs"
                            />
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveDate(course.id)}
                              aria-label={t("courses.saveDateBtn")}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-[10px] bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{t("courses.saveDateBtn")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCourseId(null)}
                              aria-label={t("page.cancel")}
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-[12px] border border-slate-200/80 bg-slate-50/70 px-3 py-1.5">
                            <Calendar
                              className="h-3.5 w-3.5 text-indigo-600"
                              aria-hidden="true"
                            />
                            <span className="text-xs font-medium text-slate-600">
                              {t("courses.examDateLabel")}:
                            </span>
                            <span className="text-xs font-bold tabular-nums text-slate-900">
                              {course.examDate}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEditDate(course)}
                              aria-label={`${t("courses.editDateBtn")} ${course.name}`}
                              className="ms-1 inline-flex min-h-[36px] items-center gap-1 rounded-[8px] bg-white px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-2xs transition-colors duration-150 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                            >
                              <Edit3 className="h-3 w-3" aria-hidden="true" />
                              <span>{t("page.edit")}</span>
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setCourseToLeave(course)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                        >
                          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t("courses.leaveChallengeBtn")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Completed Courses Group */}
          <section
            aria-labelledby="settings-completed-courses-heading"
            className="border-t border-slate-100 pt-6"
          >
            <h3
              id="settings-completed-courses-heading"
              className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-start"
            >
              {t("postExam.coursesTab.completedHeading")}
            </h3>

            {completedEnrollments.length === 0 ? (
              <p className="rounded-[12px] border border-slate-100 bg-slate-50 px-4 py-4 text-xs text-slate-500 text-start">
                {t("postExam.coursesTab.emptyCompleted")}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {completedEnrollments.map((item) => {
                  const title = getLocalizedCourseTitle(item);
                  const isArchiving = archivingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-4 py-4 lg:flex-row lg:items-center"
                    >
                      <div className="min-w-0 flex-1 space-y-2 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-[8px] bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                            {item.courseCode}
                          </span>
                          <h4 className="truncate text-sm font-semibold text-slate-900">
                            {title}
                          </h4>
                        </div>

                        {/* Grade-free summary: final rank & hours */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          {/* TODO(backend): Final rank comes from mock until course leaderboard snapshot endpoint is available */}
                          <span className="inline-flex items-center gap-1 rounded-[8px] bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                            <Trophy
                              className="h-3.5 w-3.5 text-indigo-600"
                              aria-hidden="true"
                            />
                            {item.finalRank !== null
                              ? t("postExam.coursesTab.rankBadge", {
                                  rank: item.finalRank,
                                })
                              : t("postExam.coursesTab.rankPendingBadge")}
                          </span>

                          <span className="inline-flex items-center gap-1 tabular-nums text-slate-600">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("postExam.coursesTab.completedMeta", {
                              hours: item.totalStudyHours,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
                        <a
                          href={`/courses/${encodeURIComponent(item.id)}/report`}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        >
                          <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t("postExam.coursesTab.viewReport")}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setEnrollmentToReopen(item)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t("postExam.coursesTab.reopen")}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isArchiving}
                          onClick={() => void handleArchive(item)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        >
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t("postExam.coursesTab.archive")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Collapsed Archived Courses Accordion */}
          {archivedEnrollments.length > 0 && (
            <section className="border-t border-slate-100 pt-5">
              <button
                type="button"
                aria-expanded={isArchivedOpen}
                aria-controls="archived-courses-panel"
                onClick={() => setIsArchivedOpen((prev) => !prev)}
                className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <span className="inline-flex items-center gap-2">
                  <Archive className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  {t("postExam.coursesTab.archivedHeading", {
                    count: archivedEnrollments.length,
                  })}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform ${
                    isArchivedOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isArchivedOpen && (
                <div
                  id="archived-courses-panel"
                  className="mt-3 divide-y divide-slate-100 rounded-[12px] border border-slate-200 bg-white px-4"
                >
                  {archivedEnrollments.map((item) => {
                    const title = getLocalizedCourseTitle(item);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-start">
                          <span className="rounded-[8px] bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            {item.courseCode}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {title}
                          </span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {t("postExam.coursesTab.completedMeta", {
                              hours: item.totalStudyHours,
                            })}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/courses/${encodeURIComponent(item.id)}/report`}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          >
                            <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t("postExam.coursesTab.viewReport")}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setEnrollmentToReopen(item)}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t("postExam.coursesTab.reopen")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </SettingsCard>

      {/* Confirm Leave Course Challenge Modal */}
      <ConfirmModal
        isOpen={courseToLeave !== null}
        title={t("courses.leaveModalTitle")}
        description={t("courses.leaveModalDesc", {
          course: courseToLeave?.name || "",
        })}
        confirmLabel={t("courses.leaveConfirmBtn")}
        cancelLabel={t("page.cancel")}
        variant="danger"
        isLoading={isLeaving}
        onConfirm={handleConfirmLeave}
        onCancel={() => setCourseToLeave(null)}
      />

      {/* Confirm Reopen Completed/Archived Challenge Modal */}
      <ConfirmModal
        isOpen={enrollmentToReopen !== null}
        title={t("postExam.coursesTab.reopenConfirmTitle", {
          course: enrollmentToReopen
            ? getLocalizedCourseTitle(enrollmentToReopen)
            : "",
        })}
        description={t("postExam.coursesTab.reopenConfirmBody", {
          course: enrollmentToReopen
            ? getLocalizedCourseTitle(enrollmentToReopen)
            : "",
        })}
        confirmLabel={t("postExam.coursesTab.reopenConfirmAction")}
        cancelLabel={t("postExam.coursesTab.cancel")}
        variant="primary"
        isLoading={isReopening}
        onConfirm={() => void handleConfirmReopen()}
        onCancel={() => setEnrollmentToReopen(null)}
      />
    </div>
  );
}
