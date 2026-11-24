import React, { useCallback, useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import postExamI18n, { syncPostExamLanguage } from "../i18n";
import { useEnrollmentStatus } from "../hooks/useEnrollmentStatus";
import type { PostExamEnrollment } from "../constants/postExamConstants";
import { getCanonicalExamKey } from "../api/postExamApi.mock";
import { CelebrationModal } from "./CelebrationModal";
import { FeedbackStepper } from "./FeedbackStepper";

const SESSION_DISMISSED_KEY = "sg_post_exam_dismissed_ids";

function getEnrollmentKeys(item: PostExamEnrollment): string[] {
  return [
    item.id,
    getCanonicalExamKey(item.courseName, item.examDate),
    getCanonicalExamKey(item.courseCode, item.examDate),
  ];
}

function isEnrollmentDismissed(
  item: PostExamEnrollment,
  dismissed: string[]
): boolean {
  const keys = getEnrollmentKeys(item);
  return keys.some((k) => dismissed.includes(k));
}

function readSessionDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeSessionDismissedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (ids.length === 0) {
      window.sessionStorage.removeItem(SESSION_DISMISSED_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify(ids));
    }
  } catch {}
}

function PostExamManagerContent() {
  const { t } = useTranslation();

  let appCtx: ReturnType<typeof useApp> | null = null;
  try {
    appCtx = useApp();
  } catch {
    appCtx = null;
  }

  const {
    enrollments,
    isLoading,
    markCelebrationSeen,
    resetDemoCelebration,
    refresh,
  } = useEnrollmentStatus("COMPLETED");

  const [celebrationEnrollment, setCelebrationEnrollment] =
    useState<PostExamEnrollment | null>(null);
  const [feedbackEnrollment, setFeedbackEnrollment] =
    useState<PostExamEnrollment | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() =>
    readSessionDismissedIds()
  );

  const dismissEnrollmentForSession = useCallback(
    (item: PostExamEnrollment) => {
      const keys = getEnrollmentKeys(item);
      setDismissedIds((prev) => {
        const next = Array.from(new Set([...prev, ...keys]));
        writeSessionDismissedIds(next);
        return next;
      });
    },
    []
  );

  const clearSessionDismissals = useCallback(() => {
    setDismissedIds([]);
    writeSessionDismissedIds([]);
  }, []);

  // Sync RTL/LTR language from AppProvider or ?lang=ar|en
  useEffect(() => {
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
  }, [appCtx?.lang]);

  // Listen for explicit sign-in check, exam sync, or course syllabus updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePostExamCheck = () => {
      clearSessionDismissals();
      void refresh();
    };
    const handleDataUpdated = () => {
      void refresh();
    };

    window.addEventListener("sg-post-exam-check", handlePostExamCheck);
    window.addEventListener("sg-exams-updated", handleDataUpdated);
    window.addEventListener("sg-courses-updated", handleDataUpdated);
    return () => {
      window.removeEventListener("sg-post-exam-check", handlePostExamCheck);
      window.removeEventListener("sg-exams-updated", handleDataUpdated);
      window.removeEventListener("sg-courses-updated", handleDataUpdated);
    };
  }, [clearSessionDismissals, refresh]);

  // Automatically trigger CelebrationModal or FeedbackStepper for any unrated COMPLETED past exam
  useEffect(() => {
    if (isLoading || celebrationEnrollment || feedbackEnrollment) return;

    const candidates = enrollments.filter(
      (item) =>
        item.status === "COMPLETED" && !isEnrollmentDismissed(item, dismissedIds)
    );
    if (candidates.length === 0) return;

    const unseenCelebration = candidates.find((item) => !item.celebrationSeen);
    if (unseenCelebration) {
      setCelebrationEnrollment(unseenCelebration);
      return;
    }

    const unratedExam = candidates.find((item) => !item.feedbackSubmitted);
    if (unratedExam) {
      setFeedbackEnrollment(unratedExam);
    }
  }, [
    isLoading,
    enrollments,
    dismissedIds,
    celebrationEnrollment,
    feedbackEnrollment,
  ]);

  // Support manual demo replay via ?postExamDemo=1 or custom window event
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("postExamDemo") === "1") {
      clearSessionDismissals();
      void resetDemoCelebration();
    }

    const handleDemoTrigger = () => {
      clearSessionDismissals();
      void resetDemoCelebration();
    };
    window.addEventListener("sg-trigger-post-exam-demo", handleDemoTrigger);
    return () => {
      window.removeEventListener(
        "sg-trigger-post-exam-demo",
        handleDemoTrigger
      );
    };
  }, [clearSessionDismissals, resetDemoCelebration]);

  const handleContinueFromCelebration = async () => {
    if (!celebrationEnrollment) return;
    const target = celebrationEnrollment;
    try {
      await markCelebrationSeen(target.id);
    } catch {
      // Non-fatal: proceed to feedback or dismiss even if mock/API fails
    }
    setCelebrationEnrollment(null);
    if (!target.feedbackSubmitted) {
      setFeedbackEnrollment({ ...target, celebrationSeen: true });
    } else {
      dismissEnrollmentForSession(target);
    }
  };

  const handleDismissCelebration = async () => {
    if (!celebrationEnrollment) return;
    const target = celebrationEnrollment;
    try {
      await markCelebrationSeen(target.id);
    } catch {
      // Non-fatal: proceed to feedback or dismiss even if mock/API fails
    }
    setCelebrationEnrollment(null);
    if (!target.feedbackSubmitted) {
      setFeedbackEnrollment({ ...target, celebrationSeen: true });
    } else {
      dismissEnrollmentForSession(target);
    }
  };

  const handleFeedbackSubmitted = async () => {
    if (feedbackEnrollment) {
      dismissEnrollmentForSession(feedbackEnrollment);
    }
    setFeedbackEnrollment(null);
    toast.success(t("postExam.feedback.submittedToast"));
    await refresh();
  };

  const handleFeedbackSkip = () => {
    if (feedbackEnrollment) {
      dismissEnrollmentForSession(feedbackEnrollment);
    }
    setFeedbackEnrollment(null);
    toast.info(t("postExam.feedback.skippedToast"));
  };

  return (
    <>
      <CelebrationModal
        isOpen={!!celebrationEnrollment}
        enrollment={celebrationEnrollment}
        onContinue={handleContinueFromCelebration}
        onClose={handleDismissCelebration}
        onShareNotice={(msg) => toast.info(msg)}
      />
      <FeedbackStepper
        isOpen={!!feedbackEnrollment}
        enrollment={feedbackEnrollment}
        onSubmitted={handleFeedbackSubmitted}
        onSkip={handleFeedbackSkip}
      />
    </>
  );
}

export function PostExamManager() {
  return (
    <I18nextProvider i18n={postExamI18n}>
      <PostExamManagerContent />
    </I18nextProvider>
  );
}
