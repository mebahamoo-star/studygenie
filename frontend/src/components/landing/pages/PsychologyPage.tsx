/**
 * PsychologyPage.tsx
 * ------------------
 * Page 6 — Psychological Foundations of StudyGenie.
 * 100% translated via `t.*`. No hardcoded strings.
 */
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
} from "motion/react";
import {
  Brain,
  Flame,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface PsychologyPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function PsychologyPage({ t }: PsychologyPageProps) {
  const [streakLost, setStreakLost] = useState(false);
  const [spacingTab, setSpacingTab] = useState<"cram" | "spaced">("spaced");
  const [pressureLevel, setPressureLevel] = useState<"optimal" | "panic">("optimal");

  return (
    <div
      id="psychology"
      className="flex h-full w-full flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">
          <Brain className="h-3 w-3" />
          <span>{t.psychology.badge}</span>
        </div>
        <h2
          className="mt-1 font-extrabold text-foreground tracking-tight"
          style={{ fontSize: "clamp(1.2rem, 3.2vw, 1.9rem)" }}
        >
          {t.psychology.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
          {t.psychology.subtitle}
        </p>
      </div>

      {/* 3 Scientific Principle Cards Grid */}
      <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 flex-1 min-h-0 items-stretch">
        
        {/* Principle 1: Loss Aversion */}
        <GenieTrigger
          tipMessage={t.genie.psychology.lossTip}
          pose="studying"
          side="top"
          className="h-full"
        >
          <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-xs text-start select-none">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                  {t.psychology.lossAversion.scientificPrinciple}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground">{t.psychology.lossAversion.categoryTag}</span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                {t.psychology.lossAversion.featureName}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {t.psychology.lossAversion.explanation}
              </p>
            </div>

            <div className="my-1.5 rounded-lg border border-border/50 bg-background/50 p-2 text-center">
              <AnimatePresence mode="wait">
                {!streakLost ? (
                  <motion.div
                    key="active-streak"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <Flame className="h-6 w-6 text-orange-500 fill-current drop-shadow-md animate-pulse" />
                    <span className="text-xs font-mono font-bold text-foreground">
                      {t.psychology.lossAversion.streakActiveNote(9)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStreakLost(true)}
                      className="mt-0.5 text-[10px] font-semibold text-rose-500 underline cursor-pointer"
                    >
                      {t.psychology.lossAversion.skipBtn}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="lost-streak"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 leading-tight">
                      {t.psychology.lossAversion.alertTitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStreakLost(false)}
                      className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>{t.psychology.lossAversion.restoreBtn}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className="text-[9px] text-muted-foreground block text-center">
              {t.psychology.lossAversion.citation}
            </span>
          </div>
        </GenieTrigger>

        {/* Principle 2: Spacing Effect */}
        <GenieTrigger
          tipMessage={t.genie.psychology.spacingTip}
          pose="high"
          side="top"
          className="h-full"
        >
          <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-xs text-start select-none">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {t.psychology.spacingEffect.scientificPrinciple}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground">{t.psychology.spacingEffect.categoryTag}</span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                {t.psychology.spacingEffect.featureName}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {t.psychology.spacingEffect.explanation}
              </p>
            </div>

            <div className="my-1.5 rounded-lg border border-border/50 bg-background/50 p-2">
              <div className="flex gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => setSpacingTab("spaced")}
                  className={`flex-1 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    spacingTab === "spaced" ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.psychology.spacingEffect.tabSpaced}
                </button>
                <button
                  type="button"
                  onClick={() => setSpacingTab("cram")}
                  className={`flex-1 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    spacingTab === "cram" ? "bg-rose-500 text-white shadow-xs" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.psychology.spacingEffect.tabCram}
                </button>
              </div>

              <div className="text-center">
                <span className="text-base sm:text-lg font-extrabold font-mono text-primary block leading-none">
                  {spacingTab === "spaced" ? t.psychology.spacingEffect.retentionSpaced : t.psychology.spacingEffect.retentionCram}
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">
                  {spacingTab === "spaced"
                    ? t.psychology.spacingEffect.descSpaced
                    : t.psychology.spacingEffect.descCram}
                </span>
              </div>
            </div>

            <span className="text-[9px] text-muted-foreground block text-center">
              {t.psychology.spacingEffect.citation}
            </span>
          </div>
        </GenieTrigger>

        {/* Principle 3: Yerkes-Dodson Law */}
        <GenieTrigger
          tipMessage={t.genie.psychology.yerkesTip}
          pose="studying"
          side="top"
          className="h-full"
        >
          <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-3 sm:p-3.5 shadow-xs text-start select-none">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  {t.psychology.yerkesDodson.scientificPrinciple}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground">{t.psychology.yerkesDodson.categoryTag}</span>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                {t.psychology.yerkesDodson.featureName}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {t.psychology.yerkesDodson.explanation}
              </p>
            </div>

            <div className="my-1.5 rounded-lg border border-border/50 bg-background/50 p-2 text-center">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                <span>{t.psychology.yerkesDodson.pressureLabel}</span>
                <button
                  type="button"
                  onClick={() => setPressureLevel((p) => (p === "optimal" ? "panic" : "optimal"))}
                  className="text-primary underline cursor-pointer text-[9px]"
                >
                  {t.psychology.yerkesDodson.toggleLabel}
                </button>
              </div>

              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    pressureLevel === "optimal" ? "w-3/5 bg-emerald-500" : "w-full bg-rose-500"
                  }`}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                <span>{t.psychology.yerkesDodson.lowLabel}</span>
                <span className={`font-bold ${pressureLevel === "optimal" ? "text-emerald-500" : "text-rose-500"}`}>
                  {pressureLevel === "optimal"
                    ? t.psychology.yerkesDodson.optimalState
                    : t.psychology.yerkesDodson.panicState}
                </span>
                <span>{t.psychology.yerkesDodson.highLabel}</span>
              </div>
            </div>

            <span className="text-[9px] text-muted-foreground block text-center">
              {t.psychology.yerkesDodson.citation}
            </span>
          </div>
        </GenieTrigger>

      </div>
    </div>
  );
}
