/**
 * FaqPage.tsx
 * -----------
 * Page 7 — Frequently Asked Questions.
 *
 * Requirements:
 *  - Fixed total height: never causes overflow or clipping under bottom nav.
 *  - Two-column layout on wide screens:
 *      Left: List of questions (selectable chips/buttons).
 *      Right: Dedicated fixed-height answer panel with smooth cross-fade.
 *  - On mobile: Compact question pills with fixed-height answer container below.
 *  - Privacy question has a neutral answer with visible TODO in code.
 *  - 100% translated via `t.faq.*`.
 *  - Integrated Genie hover/tap trigger.
 */
import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  HelpCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  MessageCircleQuestion,
} from "lucide-react";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface FaqPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function FaqPage({ t, lang }: FaqPageProps) {
  const isRTL = lang === "ar";
  const shouldReduce = useReducedMotion();
  const FwdChevron = isRTL ? ChevronLeft : ChevronRight;

  const [activeQuestionId, setActiveQuestionId] = useState<string>("free");

  const questions = t.faq.questions;
  const currentQ = questions.find((q) => q.id === activeQuestionId) ?? questions[0]!;

  return (
    <div
      id="faq"
      className="flex h-full w-full flex-col items-center justify-center gap-2.5 sm:gap-4 px-3 py-2 sm:px-6"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">
          <HelpCircle className="h-3 w-3" />
          <span>{t.faq.badge}</span>
        </div>
        <h2
          className="mt-1 font-extrabold text-foreground tracking-tight"
          style={{ fontSize: "clamp(1.2rem, 3.2vw, 1.9rem)" }}
        >
          {t.faq.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
          {t.faq.subtitle}
        </p>
      </div>

      {/* Two-Column Responsive FAQ Arena */}
      <div className="w-full max-w-4xl flex-1 min-h-0 flex flex-col justify-center">
        <GenieTrigger
          tipMessage={t.genie.faq.tip}
          pose="studying"
          side="top"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch rounded-2xl border-2 border-border/80 bg-card/90 p-3 sm:p-5 shadow-xl backdrop-blur-md">
            
            {/* ── Left Column: Selectable Question Buttons (5 cols) ── */}
            <div className="md:col-span-5 flex flex-col gap-1.5 justify-center">
              {questions.map((q) => {
                const isSelected = q.id === activeQuestionId;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveQuestionId(q.id)}
                    className={[
                      "flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs font-bold transition-all text-start cursor-pointer select-none",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-glow scale-[1.01]"
                        : "border border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageCircleQuestion className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="truncate">{q.question}</span>
                    </div>
                    <FwdChevron
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        isSelected ? (isRTL ? "-translate-x-1" : "translate-x-1") : "opacity-40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* ── Right Column: Fixed-Height Dedicated Answer Panel (7 cols) ── */}
            <div className="md:col-span-7 flex flex-col justify-center min-h-[140px] sm:min-h-[170px] rounded-xl border border-border/60 bg-background/60 p-3.5 sm:p-4 text-start relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  {t.faq.answerPanelHeader}
                </span>
                {currentQ.isPrivacy && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{t.faq.privacyNoticeBadge}</span>
                  </span>
                )}
              </div>

              {/* Animated Answer Body without expanding height */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="flex flex-col gap-1.5"
                >
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {currentQ.question}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentQ.answer}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-auto pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>{t.common.exampleBadge}</span>
                </span>
                <span className="text-primary font-bold">StudyGenie FAQ</span>
              </div>
            </div>

          </div>
        </GenieTrigger>
      </div>
    </div>
  );
}
