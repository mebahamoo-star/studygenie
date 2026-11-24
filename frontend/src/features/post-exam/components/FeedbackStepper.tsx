import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, X } from "lucide-react";
import { useMediaQuery } from "@/features/settings/hooks/useMediaQuery";
import {
  MOBILE_BREAKPOINT_QUERY,
  type ExamDifficulty,
  type PostExamEnrollment,
} from "../constants/postExamConstants";
import { feedbackSchema } from "../schemas/feedbackSchema";
import { useExamFeedback } from "../hooks/useExamFeedback";
import { DifficultyCard } from "./DifficultyCard";
import { TopicChecklist } from "./TopicChecklist";

export interface FeedbackStepperProps {
  isOpen: boolean;
  enrollment: PostExamEnrollment | null;
  onSubmitted: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 2;

export function FeedbackStepper({
  isOpen,
  enrollment,
  onSubmitted,
  onSkip,
}: FeedbackStepperProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const { submitFeedback, isSubmitting, submitError, clearError } =
    useExamFeedback();

  const [step, setStep] = useState<1 | 2>(1);
  const [difficulty, setDifficulty] = useState<ExamDifficulty | undefined>(
    undefined
  );
  const [hardTopicIds, setHardTopicIds] = useState<number[]>([]);
  const [testedTopicIds, setTestedTopicIds] = useState<number[]>([]);
  const [difficultyError, setDifficultyError] = useState<string | null>(null);

  // Reset stepper state ONLY when closing so opening never races with user clicks
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setDifficulty(undefined);
      setHardTopicIds([]);
      setTestedTopicIds([]);
      setDifficultyError(null);
      clearError();
    }
  }, [isOpen, clearError]);

  if (!isOpen || !enrollment) return null;

  const isArabic = i18n.language === "ar";
  const courseDisplayName =
    isArabic && enrollment.courseNameAr
      ? enrollment.courseNameAr
      : enrollment.courseName;

  const handleToggleId = (
    field: "hardTopicIds" | "testedTopicIds",
    topicId: number
  ) => {
    if (field === "hardTopicIds") {
      setHardTopicIds((prev) =>
        prev.includes(topicId)
          ? prev.filter((id) => id !== topicId)
          : [...prev, topicId]
      );
    } else {
      setTestedTopicIds((prev) =>
        prev.includes(topicId)
          ? prev.filter((id) => id !== topicId)
          : [...prev, topicId]
      );
    }
  };

  const handleNextStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!difficulty) {
      setDifficultyError("postExam.feedback.errors.difficultyRequired");
      return;
    }
    setDifficultyError(null);
    setStep(2);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      handleNextStep();
      return;
    }

    const parsed = feedbackSchema.safeParse({
      difficulty,
      hardTopicIds,
      testedTopicIds,
    });
    if (!parsed.success) {
      setDifficultyError("postExam.feedback.errors.difficultyRequired");
      setStep(1);
      return;
    }

    const ok = await submitFeedback(enrollment.id, {
      difficulty: parsed.data.difficulty,
      hardTopicIds: parsed.data.hardTopicIds,
      testedTopicIds: parsed.data.testedTopicIds,
    });
    if (ok) {
      onSubmitted();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-exam-feedback-title"
      className="fixed inset-0 z-50 flex justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:items-center sm:p-4"
    >
      <div
        className={`relative flex w-full flex-col bg-white text-slate-900 shadow-2xl border border-slate-200 ${
          isMobile
            ? "mt-auto max-h-[92vh] rounded-t-[20px] rounded-b-none"
            : "max-w-xl rounded-[16px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0 text-start">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {t("postExam.feedback.stepIndicator", {
                step,
                total: TOTAL_STEPS,
              })}
            </span>
            <h2
              id="post-exam-feedback-title"
              className="mt-1.5 text-xl font-bold text-slate-900"
            >
              {step === 1
                ? t("postExam.feedback.step1Title")
                : t("postExam.feedback.step2Title")}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {step === 1
                ? t("postExam.feedback.step1Subtitle", {
                    course: courseDisplayName,
                  })
                : t("postExam.feedback.step2Subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={onSkip}
            aria-label={t("postExam.feedback.closeLabel")}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[12px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="post-exam-feedback-form"
          onSubmit={handleFormSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {step === 1 ? (
              <div className="space-y-2">
                <DifficultyCard
                  value={difficulty}
                  hasError={!!difficultyError}
                  onChange={(val) => {
                    setDifficulty(val);
                    setDifficultyError(null);
                    clearError();
                  }}
                />
                {difficultyError && (
                  <p
                    role="alert"
                    className="text-xs font-medium text-rose-600 text-start"
                  >
                    {t(difficultyError)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>
                    {t("postExam.feedback.selectedCounts", {
                      hardCount: hardTopicIds.length,
                      testedCount: testedTopicIds.length,
                    })}
                  </span>
                </div>
                <TopicChecklist
                  topics={enrollment.topics}
                  hardTopicIds={hardTopicIds}
                  testedTopicIds={testedTopicIds}
                  onToggleHard={(id) => handleToggleId("hardTopicIds", id)}
                  onToggleTested={(id) => handleToggleId("testedTopicIds", id)}
                />
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 text-start"
              >
                {submitError.startsWith("postExam.")
                  ? t(submitError)
                  : submitError}
              </div>
            )}

            {/* Privacy assurance note */}
            <p className="flex items-start gap-2 rounded-[12px] bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600 text-start">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span>{t("postExam.feedback.privacyNote")}</span>
            </p>
          </div>

          {/* Sticky bottom action bar */}
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onSkip}
              disabled={isSubmitting}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              {t("postExam.feedback.skipButton")}
            </button>

            <div className="flex items-center gap-2 ms-auto">
              {step === 2 && (
                <button
                  key="step-2-back-btn"
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  {t("postExam.feedback.backButton")}
                </button>
              )}

              {step === 1 ? (
                <button
                  key="step-1-next-btn"
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  {t("postExam.feedback.nextButton")}
                </button>
              ) : (
                <button
                  key="step-2-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  {isSubmitting
                    ? t("postExam.feedback.submittingButton")
                    : t("postExam.feedback.submitButton")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
