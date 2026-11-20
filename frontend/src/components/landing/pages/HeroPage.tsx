/**
 * HeroPage.tsx
 * ------------
 * Page 1 — Full-screen hero.
 * 100% translated via `t.*`. No hardcoded strings.
 */
import React, { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useTransform,
  type Variants,
} from "motion/react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Play,
  RotateCcw,
  BookOpen,
  Calculator,
  Atom,
  Code2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface HeroPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

const TOPIC_ICONS = [BookOpen, Calculator, Atom, Code2, CheckCircle2];
const TOPIC_COLORS = [
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/50",
  "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200/50 dark:border-violet-800/50",
  "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200/50 dark:border-sky-800/50",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/50",
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const topicVariants: Variants = {
  hidden: { opacity: 0, x: -16, scale: 0.96 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

export function HeroPage({ t, lang }: HeroPageProps) {
  const shouldReduce = useReducedMotion();
  const isRTL = lang === "ar";
  const FwdArrow = isRTL ? ArrowLeft : ArrowRight;

  const [replayKey, setReplayKey] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgX = useTransform(mouseX, [-300, 300], shouldReduce ? [0, 0] : [-10, 10]);
  const bgY = useTransform(mouseY, [-300, 300], shouldReduce ? [0, 0] : [-6, 6]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduce) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left - rect.width / 2);
      mouseY.set(e.clientY - rect.top - rect.height / 2);
    },
    [mouseX, mouseY, shouldReduce],
  );

  return (
    <div
      className="relative flex min-h-full w-full flex-col items-center justify-center px-3.5 py-4 sm:px-6 my-auto"
      onMouseMove={handleMouseMove}
    >
      {/* Background ambient gradients */}
      <motion.div
        style={{ x: bgX, y: bgY }}
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute -start-16 top-4 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute end-0 bottom-4 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-600/20" />
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-10">
        
        {/* Left Column: Headline & Actions */}
        <div className="flex flex-col items-start gap-3 sm:gap-4 lg:w-1/2 text-start">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.hero.badge}</span>
          </div>

          <h1
            className="text-balance font-extrabold leading-tight tracking-tight text-foreground"
            style={{ fontSize: "clamp(1.4rem, 4vw, 2.4rem)" }}
          >
            {t.hero.title}
          </h1>

          <p
            className="text-muted-foreground leading-relaxed font-normal"
            style={{ fontSize: "clamp(0.85rem, 2vw, 1.05rem)" }}
          >
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <GenieTrigger
              tipMessage={t.genie.hero.ctaTip}
              pose="high"
              side="top"
            >
              <Button
                variant="magic"
                size="default"
                asChild
                className="font-bold shadow-glow gap-2 h-11 px-5 text-sm"
              >
                <Link to="/signup">
                  <span>{t.hero.primaryCta}</span>
                  <FwdArrow className="h-4 w-4" />
                </Link>
              </Button>
            </GenieTrigger>

            <Button
              variant="outline"
              size="default"
              asChild
              className="gap-2 h-11 px-4 text-sm font-semibold border-border/80 bg-card hover:bg-accent"
            >
              <Link to="/login">
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t.hero.secondaryCta}</span>
              </Link>
            </Button>
          </div>

          <p
            className="text-[11px] sm:text-xs text-muted-foreground/80 font-medium"
            dangerouslySetInnerHTML={{ __html: t.hero.microCopy }}
          />
        </div>

        {/* Right Column: Instant Results Card */}
        <div className="flex w-full flex-col gap-2 lg:w-1/2">
          <div className="flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3 w-3" />
              <span>{t.common.illustrativeExampleBadge}</span>
            </span>

            <GenieTrigger
              tipMessage={t.genie.hero.replayTip}
              pose="idle"
              side="top"
            >
              <button
                type="button"
                onClick={() => setReplayKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-primary/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.hero.tryAgain}</span>
              </button>
            </GenieTrigger>
          </div>

          <GenieTrigger
            tipMessage={t.genie.hero.topicsTip}
            pose="studying"
            side="start"
          >
            <motion.div
              key={replayKey}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative rounded-2xl border-2 border-primary/30 bg-card/90 p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-all hover:border-primary/50"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-start">
                    <p className="truncate text-xs sm:text-sm font-bold text-foreground font-mono">
                      {t.hero.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {t.hero.analyzedBy}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                  {t.common.exampleBadge}
                </span>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1.5"
              >
                {t.hero.topics.map((item, idx) => {
                  const Icon = TOPIC_ICONS[idx % TOPIC_ICONS.length] as React.ElementType;
                  const color = TOPIC_COLORS[idx % TOPIC_COLORS.length];
                  return (
                    <motion.div
                      key={idx}
                      variants={topicVariants}
                      className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${color}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-80 text-[10px] font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{item.duration}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/40 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
                <span>{t.hero.totalFocusTime}</span>
                <span className="text-primary font-bold">{t.hero.readyForPlan}</span>
              </div>
            </motion.div>
          </GenieTrigger>

        </div>

      </div>
    </div>
  );
}
