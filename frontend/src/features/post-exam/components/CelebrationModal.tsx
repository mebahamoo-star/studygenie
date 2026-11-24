import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Award, Share2, Sparkles, X } from "lucide-react";
import { useMediaQuery } from "@/features/settings/hooks/useMediaQuery";
import {
  CELEBRATION_COUNTUP_DURATION_MS,
  CELEBRATION_COUNTUP_STEPS,
  CELEBRATION_LOTTIE_ASSET_PATH,
  MOBILE_BREAKPOINT_QUERY,
  REDUCED_MOTION_QUERY,
  type PostExamEnrollment,
} from "../constants/postExamConstants";

interface LottieAnimationMetadata {
  nm?: string;
  fr?: number;
  op?: number;
  layers?: unknown[];
}

export interface CelebrationModalProps {
  isOpen: boolean;
  enrollment: PostExamEnrollment | null;
  onContinue: () => void | Promise<void>;
  onClose?: () => void;
  onShareNotice?: (message: string) => void;
}

function GenieStaticIllustration({ alt }: { alt: string }) {
  return (
    <div
      data-testid="genie-static-illustration"
      role="img"
      aria-label={alt}
      className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-indigo-50 ring-8 ring-indigo-50/60"
    >
      <svg
        viewBox="0 0 120 120"
        className="h-20 w-20"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="52" fill="#EEF2FF" />
        <path
          d="M42 40h36v18c0 11-8 20-18 20s-18-9-18-20V40z"
          fill="#4F46E5"
        />
        <path
          d="M34 45h8v10c-5 0-8-4-8-10zm52 0h-8v10c5 0 8-4 8-10z"
          fill="#6366F1"
        />
        <rect x="54" y="76" width="12" height="10" rx="2" fill="#4338CA" />
        <rect x="44" y="86" width="32" height="8" rx="4" fill="#312E81" />
        <polygon
          points="60,46 63,53 70,53 64.5,57.5 66.5,64.5 60,60 53.5,64.5 55.5,57.5 50,53 57,53"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
}

function GenieLottieCelebration({
  animationName,
  alt,
}: {
  animationName: string;
  alt: string;
}) {
  return (
    <div
      data-testid="genie-lottie-animation"
      data-lottie-name={animationName}
      role="img"
      aria-label={alt}
      className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-indigo-50 ring-8 ring-indigo-100/80"
    >
      <div className="animate-bounce">
        <Award className="h-14 w-14 text-indigo-600" aria-hidden="true" />
      </div>
      <Sparkles
        className="absolute -top-1 end-1 h-6 w-6 animate-pulse text-indigo-500"
        aria-hidden="true"
      />
      <Sparkles
        className="absolute bottom-1 start-1 h-5 w-5 animate-ping text-indigo-400"
        aria-hidden="true"
      />
    </div>
  );
}

export function CelebrationModal({
  isOpen,
  enrollment,
  onContinue,
  onClose,
  onShareNotice,
}: CelebrationModalProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const [lottieData, setLottieData] = useState<LottieAnimationMetadata | null>(
    null
  );
  const [lottieFailed, setLottieFailed] = useState(false);
  const [displayedPoints, setDisplayedPoints] = useState(0);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  const targetPoints = enrollment?.earnedGeniePoints ?? 0;
  const effectivePoints = prefersReducedMotion ? targetPoints : displayedPoints;

  // Load /assets/genie-celebrate.json unless user prefers reduced motion
  useEffect(() => {
    if (!isOpen || prefersReducedMotion) {
      setLottieData(null);
      return;
    }

    let cancelled = false;
    setLottieFailed(false);

    fetch(CELEBRATION_LOTTIE_ASSET_PATH)
      .then((res) => {
        if (!res.ok) throw new Error("Lottie asset failed to load");
        return res.json() as Promise<LottieAnimationMetadata>;
      })
      .then((json) => {
        if (!cancelled && json && Array.isArray(json.layers)) {
          setLottieData(json);
        } else if (!cancelled) {
          setLottieFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLottieFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, prefersReducedMotion]);

  // Animate Earned Genie Points count-up (respects prefers-reduced-motion)
  useEffect(() => {
    if (!isOpen) {
      setDisplayedPoints(0);
      setShareFeedback(null);
      return;
    }
    if (prefersReducedMotion || targetPoints <= 0) {
      setDisplayedPoints(targetPoints);
      return;
    }

    let currentStep = 0;
    const stepMs = Math.max(
      16,
      Math.round(CELEBRATION_COUNTUP_DURATION_MS / CELEBRATION_COUNTUP_STEPS)
    );
    const timer = window.setInterval(() => {
      currentStep += 1;
      const ratio = Math.min(1, currentStep / CELEBRATION_COUNTUP_STEPS);
      setDisplayedPoints(Math.round(targetPoints * ratio));
      if (ratio >= 1) {
        window.clearInterval(timer);
      }
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [isOpen, targetPoints, prefersReducedMotion]);

  if (!isOpen || !enrollment) return null;

  const isArabic = i18n.language === "ar";
  const courseDisplayName =
    isArabic && enrollment.courseNameAr
      ? enrollment.courseNameAr
      : enrollment.courseName;

  const handleShareClick = () => {
    // TODO(backend): Replace placeholder share action when social/achievement share endpoint is ready
    const msg = t("postExam.celebration.shareNotReady");
    setShareFeedback(msg);
    onShareNotice?.(msg);
  };

  const handleContinueClick = async () => {
    setIsContinuing(true);
    try {
      await onContinue();
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-exam-celebration-title"
      className="fixed inset-0 z-50 flex justify-center bg-slate-900/45 backdrop-blur-[2px] p-0 sm:items-center sm:p-4"
    >
      <div
        className={`relative flex w-full flex-col bg-white text-slate-900 shadow-2xl border border-slate-200 ${
          isMobile
            ? "mt-auto max-h-[92vh] rounded-t-[20px] rounded-b-none"
            : "max-w-lg rounded-[16px]"
        }`}
      >
        {/* Top bar with Course Conquered badge & close button */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            {t("postExam.celebration.badge")}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("postExam.celebration.closingLabel")}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 text-center">
          {!prefersReducedMotion && lottieData && !lottieFailed ? (
            <GenieLottieCelebration
              animationName={lottieData.nm || "genie-celebrate"}
              alt={t("postExam.celebration.reducedMotionAlt")}
            />
          ) : (
            <GenieStaticIllustration
              alt={t("postExam.celebration.reducedMotionAlt")}
            />
          )}

          <p className="mt-4 inline-flex items-center rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {enrollment.courseCode}
          </p>

          <h2
            id="post-exam-celebration-title"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-900"
          >
            {t("postExam.celebration.title")}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("postExam.celebration.subtitle", { course: courseDisplayName })}
          </p>

          {/* Earned Genie Points count-up card */}
          <div className="mt-5 rounded-[16px] border border-indigo-100 bg-indigo-50/70 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {t("postExam.celebration.pointsLabel")}
            </p>
            <p
              data-testid="earned-genie-points"
              className="mt-1 text-3xl font-extrabold tabular-nums text-indigo-600"
            >
              {t("postExam.celebration.pointsValue", {
                points: effectivePoints,
              })}
            </p>
          </div>

          {shareFeedback && (
            <p
              role="status"
              className="mt-4 rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700"
            >
              {shareFeedback}
            </p>
          )}
        </div>

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 flex flex-col-reverse gap-2.5 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleShareClick}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t("postExam.celebration.shareButton")}
          </button>
          <button
            type="button"
            disabled={isContinuing}
            onClick={handleContinueClick}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            {t("postExam.celebration.continueButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
