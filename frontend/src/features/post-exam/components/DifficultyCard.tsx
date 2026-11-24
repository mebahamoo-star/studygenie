import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Feather, Gauge, Flame, Check } from "lucide-react";
import type { ExamDifficulty } from "../constants/postExamConstants";
import { EXAM_DIFFICULTIES } from "../schemas/feedbackSchema";

export interface DifficultyCardProps {
  value: ExamDifficulty | undefined;
  onChange: (difficulty: ExamDifficulty) => void;
  hasError?: boolean;
}

const DIFFICULTY_ICONS: Record<ExamDifficulty, React.ComponentType<{ className?: string }>> = {
  EASY: Feather,
  MEDIUM: Gauge,
  HARD: Flame,
};

export function DifficultyCard({ value, onChange, hasError }: DifficultyCardProps) {
  const { t } = useTranslation();
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const total = EXAM_DIFFICULTIES.length;
    let nextIdx: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIdx = (index + 1) % total;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIdx = (index - 1 + total) % total;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      const nextDiff = EXAM_DIFFICULTIES[nextIdx]!;
      onChange(nextDiff);
      buttonRefs.current[nextDiff]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("postExam.feedback.step1Title")}
      aria-invalid={hasError ? "true" : "false"}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {EXAM_DIFFICULTIES.map((level, idx) => {
        const Icon = DIFFICULTY_ICONS[level];
        const selected = value === level;

        return (
          <button
            key={level}
            ref={(el) => {
              buttonRefs.current[level] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && idx === 0) ? 0 : -1}
            onClick={() => onChange(level)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative flex min-h-[96px] flex-col items-start justify-between rounded-[16px] border p-4 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
              selected
                ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] ${
                  selected
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {selected && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-sm font-bold text-slate-900">
                {t(`postExam.feedback.difficulties.${level}.label`)}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">
                {t(`postExam.feedback.difficulties.${level}.description`)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
