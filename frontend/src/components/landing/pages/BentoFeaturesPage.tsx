/**
 * BentoFeaturesPage.tsx
 * ---------------------
 * Page 4 — Full-screen interactive Bento Grid features experience.
 * 100% translated via `t.*`. No hardcoded strings.
 */
import React, { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import {
  CalendarCheck,
  Layers,
  Flame,
  ShieldAlert,
  Clock,
  Trophy,
  Check,
  RotateCw,
  Play,
  Pause,
  Sparkles,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface BentoFeaturesPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function BentoFeaturesPage({ t }: BentoFeaturesPageProps) {
  const shouldReduce = useReducedMotion();

  // 1. Smart Study Plan
  const [completedDays, setCompletedDays] = useState(2);
  const totalDays = t.bento.smartPlan.days.length;

  // 2. Flashcard Flip
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardScore] = useState(14);

  // 3. Streak Counter
  const [streakDays, setStreakDays] = useState(7);
  const [flameScale, setFlameScale] = useState(1);

  // 4. Survival Mode
  const [survivalActive, setSurvivalActive] = useState(false);

  // 5. Pomodoro
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoSeconds, setPomoSeconds] = useState(1500);

  useEffect(() => {
    let interval: number | null = null;
    if (pomoRunning) {
      interval = window.setInterval(() => {
        setPomoSeconds((s) => (s > 0 ? s - 1 : 1500));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomoRunning]);

  const formatPomo = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // 6. Leaderboard
  const [leaderboard, setLeaderboard] = useState(t.bento.leaderboard.students);

  useEffect(() => {
    setLeaderboard(t.bento.leaderboard.students);
  }, [t]);

  const shuffleLeaderboard = () => {
    setLeaderboard((prev) => {
      const copy = [...prev];
      copy.unshift(copy.pop()!);
      return copy;
    });
  };

  const handleStreakClick = () => {
    setStreakDays((d) => d + 1);
    setFlameScale(1.3);
    setTimeout(() => setFlameScale(1), 300);
  };

  return (
    <div
      id="features"
      className="flex h-full w-full flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">
          <Sparkles className="h-3 w-3" />
          <span>{t.bento.badge}</span>
        </div>
        <h2
          className="mt-1 font-extrabold text-foreground tracking-tight"
          style={{ fontSize: "clamp(1.2rem, 3.2vw, 1.9rem)" }}
        >
          {t.bento.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
          {t.bento.subtitle}
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid w-full max-w-4xl grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 flex-1 min-h-0 items-stretch">
        
        {/* Card 1: Smart Study Plan */}
        <GenieTrigger
          tipMessage={t.genie.bento.planTip}
          pose="studying"
          side="top"
          className="h-full"
        >
          <div
            onClick={() => setCompletedDays((d) => (d >= totalDays ? 1 : d + 1))}
            className="group flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-2.5 sm:p-3 shadow-xs transition-all hover:border-primary/50 cursor-pointer select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {t.bento.smartPlan.title}
                </h3>
              </div>
              <span className="text-[9px] font-bold text-primary/70">{t.common.exampleBadge}</span>
            </div>

            <div className="my-1 flex justify-between gap-1">
              {t.bento.smartPlan.days.map((day, idx) => {
                const done = idx < completedDays;
                return (
                  <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
                    <div
                      className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                        done
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "border border-border/60 bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-1">
              <span>{t.bento.smartPlan.progressFormat(completedDays, totalDays)}</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{t.bento.smartPlan.clickToAdvance}</span>
            </div>
          </div>
        </GenieTrigger>

        {/* Card 2: Spaced Flashcards */}
        <GenieTrigger
          tipMessage={t.genie.bento.flashcardsTip}
          pose="high"
          side="top"
          className="h-full"
        >
          <div
            onClick={() => setIsFlipped((f) => !f)}
            className="group flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-2.5 sm:p-3 shadow-xs transition-all hover:border-amber-500/50 cursor-pointer select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {t.bento.flashcards.title}
                </h3>
              </div>
              <span className="text-[9px] font-bold text-amber-600/70">{t.common.exampleBadge}</span>
            </div>

            <div className="my-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-center min-h-[44px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={isFlipped ? "back" : "front"}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="text-[11px] font-semibold text-foreground leading-snug"
                >
                  {isFlipped ? t.bento.flashcards.answer : t.bento.flashcards.question}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-border/40 pt-1">
              <span className="text-muted-foreground">{t.bento.flashcards.masteredCount(cardScore)}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <RotateCw className="h-2.5 w-2.5" />
                <span>{t.bento.flashcards.tapToFlip}</span>
              </span>
            </div>
          </div>
        </GenieTrigger>

        {/* Card 3: Achievement Streak */}
        <GenieTrigger
          tipMessage={t.genie.bento.streakTip}
          pose="high"
          side="top"
          className="h-full"
        >
          <div
            onClick={handleStreakClick}
            className="group flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-2.5 sm:p-3 shadow-xs transition-all hover:border-orange-500/50 cursor-pointer select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-orange-500/10 p-1.5 text-orange-600 dark:text-orange-400">
                  <Flame className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {t.bento.streak.title}
                </h3>
              </div>
              <span className="text-[9px] font-bold text-orange-600/70">{t.common.exampleBadge}</span>
            </div>

            <div className="my-1 flex items-center justify-center gap-2">
              <motion.div
                animate={{ scale: flameScale }}
                transition={{ duration: 0.2 }}
                className="text-orange-500"
              >
                <Flame className="h-8 w-8 fill-current drop-shadow-md" />
              </motion.div>
              <div className="text-start">
                <span className="text-lg font-extrabold text-foreground font-mono leading-none">
                  {streakDays}
                </span>
                <span className="block text-[10px] text-muted-foreground font-medium">
                  {t.bento.streak.daysLabel(streakDays)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-border/40 pt-1 text-muted-foreground">
              <span>{t.bento.streak.dontBreak}</span>
              <span className="text-orange-500 font-bold">{t.bento.streak.clickToAdd}</span>
            </div>
          </div>
        </GenieTrigger>

        {/* Card 4: Survival Mode */}
        <GenieTrigger
          tipMessage={t.genie.bento.survivalTip}
          pose="studying"
          side="top"
          className="h-full"
        >
          <div
            onClick={() => setSurvivalActive((s) => !s)}
            className="group flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-2.5 sm:p-3 shadow-xs transition-all hover:border-rose-500/50 cursor-pointer select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {t.bento.survivalMode.title}
                </h3>
              </div>
              <span className="text-[9px] font-bold text-rose-600/70">{t.common.exampleBadge}</span>
            </div>

            <div className="my-1 flex items-center justify-between gap-1 rounded-lg border border-border/50 bg-background/50 p-1.5">
              <div className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all ${
                survivalActive ? "bg-rose-500 text-white font-bold" : "text-muted-foreground"
              }`}>
                {t.bento.survivalMode.highYieldLabel}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                <Zap className="h-3 w-3" />
                <span>{survivalActive ? t.bento.survivalMode.activeLabel : t.bento.survivalMode.enableLabel}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-border/40 pt-1 text-muted-foreground">
              <span>{t.bento.survivalMode.examPointsNote}</span>
              <span className="text-rose-500 font-bold">{t.bento.survivalMode.toggleLabel}</span>
            </div>
          </div>
        </GenieTrigger>

        {/* Card 5: Pomodoro Timer */}
        <GenieTrigger
          tipMessage={t.genie.bento.pomodoroTip}
          pose="idle"
          side="top"
          className="h-full"
        >
          <div
            onClick={() => setPomoRunning((r) => !r)}
            className="group flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-2.5 sm:p-3 shadow-xs transition-all hover:border-sky-500/50 cursor-pointer select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-sky-500/10 p-1.5 text-sky-600 dark:text-sky-400">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {t.bento.pomodoro.title}
                </h3>
              </div>
              <span className="text-[9px] font-bold text-sky-600/70">{t.common.exampleBadge}</span>
            </div>

            <div className="my-1 flex items-center justify-center gap-2">
              <span className="text-xl font-extrabold text-foreground font-mono tracking-wider">
                {formatPomo(pomoSeconds)}
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                {pomoRunning ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-border/40 pt-1 text-muted-foreground">
              <span>{t.bento.pomodoro.sessionNote}</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">
                {pomoRunning ? t.bento.pomodoro.pauseLabel : t.bento.pomodoro.startLabel}
              </span>
            </div>
          </div>
        </GenieTrigger>

        {/* Card 6: Leaderboard */}
        <GenieTrigger
          tipMessage={t.genie.bento.leaderboardTip}
          pose="high"
          side="top"
          className="h-full"
        >
          <div
            onClick={shuffleLeaderboard}
            className="group flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/90 p-2.5 sm:p-3 shadow-xs transition-all hover:border-emerald-500/50 cursor-pointer select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                  <Trophy className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  {t.bento.leaderboard.title}
                </h3>
              </div>
              <span className="text-[9px] font-bold text-emerald-600/70">{t.common.exampleBadge}</span>
            </div>

            <div className="my-1 space-y-1">
              {leaderboard.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout={!shouldReduce}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-semibold"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      #{idx + 1}
                    </span>
                    <span className="text-foreground truncate">{item.name}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[9px]">{item.pts} pts</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-border/40 pt-1 text-muted-foreground">
              <span>{t.bento.leaderboard.competeNote}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <ArrowUpDown className="h-2.5 w-2.5" />
                <span>{t.bento.leaderboard.swapLabel}</span>
              </span>
            </div>
          </div>
        </GenieTrigger>

      </div>
    </div>
  );
}
