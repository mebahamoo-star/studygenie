import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Calendar,
  Check,
  Edit3,
  LogOut,
  Users,
  X,
} from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { ConfirmModal } from "../components/ConfirmModal";
import type { EnrolledCourseItem } from "../constants/settingsConstants";

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
  const { t } = useTranslation();
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<string>("");
  const [savingDateId, setSavingDateId] = useState<string | null>(null);

  const [courseToLeave, setCourseToLeave] = useState<EnrolledCourseItem | null>(
    null
  );
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

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

  return (
    <div className="space-y-6">
      <SettingsCard
        title={t("courses.cardTitle")}
        description={t("courses.cardDescription")}
      >
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {t("courses.emptyTitle")}
            </h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              {t("courses.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {courses.map((course) => {
              const isEditing = editingCourseId === course.id;
              const isSaving = savingDateId === course.id;

              return (
                <div
                  key={course.id}
                  className="flex flex-col justify-between gap-4 py-5 lg:flex-row lg:items-center"
                >
                  {/* Course Info & Progress Bar */}
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[8px] bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        {course.code}
                      </span>
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {course.name}
                      </h3>
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
                          className="rounded-[10px] border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSaveDate(course.id)}
                          aria-label={t("courses.saveDateBtn")}
                          className="inline-flex items-center gap-1 rounded-[10px] bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t("courses.saveDateBtn")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCourseId(null)}
                          aria-label={t("page.cancel")}
                          className="rounded-[10px] border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
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
                          className="ms-1 inline-flex items-center gap-1 rounded-[8px] bg-white px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-2xs transition-colors duration-150 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                        >
                          <Edit3 className="h-3 w-3" aria-hidden="true" />
                          <span>{t("page.edit")}</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setCourseToLeave(course)}
                      className="inline-flex items-center gap-1.5 rounded-[12px] border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
    </div>
  );
}
