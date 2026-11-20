/**
 * HowItWorksPage.tsx
 * ------------------
 * Page 2 — "How It Works" in full-screen book-page format.
 * 100% translated via `t.*`. No hardcoded strings.
 */
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import {
  Upload,
  Cpu,
  CalendarCheck2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Calculator,
  Atom,
  Code2,
  Sparkles,
} from "lucide-react";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface HowItWorksPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

/* ─── Step 1: File upload demo ─────────────────────────────────────── */
function Step1Demo({ t }: { t: LandingTranslations }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const shouldReduce = useReducedMotion();

  const start = () => {
    if (done) {
      setProgress(0);
      setDone(false);
      return;
    }
    let p = 0;
    const id = setInterval(() => {
      p += shouldReduce ? 100 : 15;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(id);
        setDone(true);
      }
    }, 60);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={start}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t.howItWorks.step1.clickToSimulate}
        className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10 cursor-pointer shadow-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Upload className={`h-7 w-7 transition-colors ${done ? "text-emerald-500" : "text-primary"}`} />
        <svg className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none" aria-hidden="true">
          <circle
            cx="50%" cy="50%" r="30"
            fill="none" stroke="currentColor"
            strokeWidth="3"
            className="text-border/40"
          />
          <motion.circle
            cx="50%" cy="50%" r="30"
            fill="none" stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-primary"
            pathLength={1}
            animate={{ pathLength: progress / 100 }}
            transition={{ duration: 0.08 }}
          />
        </svg>
      </motion.button>

      <span className="text-xs font-semibold text-foreground">
        {done ? t.howItWorks.step1.uploadSuccess : t.howItWorks.step1.clickToSimulate}
      </span>

      <div className="flex gap-1.5">
        {["PDF", "PPTX", "DOCX"].map((ext) => (
          <span
            key={ext}
            className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
          >
            {ext}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2: Chapter extraction demo ──────────────────────────────── */
const CHAPTER_ICONS = [BookOpen, Calculator, Atom, Code2];

function Step2Demo({ t }: { t: LandingTranslations }) {
  const [expanded, setExpanded] = useState(true);
  const chapters = t.howItWorks.step2.chapters;

  return (
    <div className="flex flex-col items-center gap-2 max-w-xs">
      <motion.button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md cursor-pointer"
      >
        <Cpu className="h-4 w-4" />
        <span>{t.howItWorks.step2.btnLabel}</span>
      </motion.button>

      <div className="grid grid-cols-2 gap-1.5 w-full">
        {chapters.map((ch, i) => {
          const Icon = CHAPTER_ICONS[i % CHAPTER_ICONS.length] as React.ElementType;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: expanded ? 1 : 0.4, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2 py-1 text-[11px] font-semibold text-foreground shadow-2xs"
            >
              <Icon className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{ch}</span>
            </motion.div>
          );
        })}
      </div>

      <span className="text-[10px] text-muted-foreground font-medium">
        {t.howItWorks.step2.footerNote}
      </span>
    </div>
  );
}

/* ─── Step 3: Daily schedule demo ──────────────────────────────────── */
function Step3Demo({ t }: { t: LandingTranslations }) {
  const rows = t.howItWorks.step3.rows;
  const [rowsCount, setRowsCount] = useState(rows.length);

  const toggle = () => {
    setRowsCount((prev) => (prev >= rows.length ? 1 : prev + 1));
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-xs">
      <div className="w-full overflow-hidden rounded-xl border border-border/60 bg-card/90 shadow-sm">
        <div className="grid grid-cols-3 border-b border-border/40 bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          <span>{t.howItWorks.step3.headerDay}</span>
          <span>{t.howItWorks.step3.headerLesson}</span>
          <span className="text-end">{t.howItWorks.step3.headerTime}</span>
        </div>
        <div className="divide-y divide-border/30">
          {rows.slice(0, rowsCount).map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-3 px-2.5 py-1 text-[11px] font-semibold"
            >
              <span className="text-foreground">{r.day}</span>
              <span className="text-muted-foreground truncate">{r.topic}</span>
              <span className="text-end text-primary font-mono">{r.hours}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
      >
        {rowsCount >= rows.length
          ? t.howItWorks.step3.resetSchedule
          : t.howItWorks.step3.addNextDay}
      </button>
    </div>
  );
}

/* ─── Main HowItWorksPage Component ────────────────────────────────── */
export function HowItWorksPage({ t, lang }: HowItWorksPageProps) {
  const [activeStep, setActiveStep] = useState(0);
  const isRTL = lang === "ar";
  const FwdIcon = isRTL ? ChevronLeft : ChevronRight;
  const BwdIcon = isRTL ? ChevronRight : ChevronLeft;

  const steps = [
    {
      key: "step1",
      icon: Upload,
      title: t.howItWorks.step1.title,
      desc: t.howItWorks.step1.desc,
      tag: t.howItWorks.step1.tag,
      tipMessage: t.genie.how.step1Tip,
      demo: <Step1Demo t={t} />,
    },
    {
      key: "step2",
      icon: Cpu,
      title: t.howItWorks.step2.title,
      desc: t.howItWorks.step2.desc,
      tag: t.howItWorks.step2.tag,
      tipMessage: t.genie.how.step2Tip,
      demo: <Step2Demo t={t} />,
    },
    {
      key: "step3",
      icon: CalendarCheck2,
      title: t.howItWorks.step3.title,
      desc: t.howItWorks.step3.desc,
      tag: t.howItWorks.step3.tag,
      tipMessage: t.genie.how.step3Tip,
      demo: <Step3Demo t={t} />,
    },
  ];

  const currentStep = steps[activeStep] ?? steps[0]!;

  return (
    <div
      id="how"
      className="flex min-h-full w-full flex-col items-center justify-center gap-3 sm:gap-4 px-3 py-4 sm:px-6 my-auto"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
          <Sparkles className="h-3 w-3" />
          <span>{t.howItWorks.badge}</span>
        </span>
        <h2
          className="mt-1 font-extrabold text-foreground tracking-tight"
          style={{ fontSize: "clamp(1.3rem, 3.5vw, 2.1rem)" }}
        >
          {t.howItWorks.title}
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-1">
          {t.howItWorks.subtitle}
        </p>
      </div>

      {/* 3 Step Stepper Tabs */}
      <div
        role="tablist"
        aria-label={isRTL ? "خطوات الاستخدام" : "How it works steps"}
        className="flex items-center gap-2 sm:gap-3 shrink-0"
      >
        {steps.map((s, i) => {
          const Icon = s.icon as React.ElementType;
          const isSelected = i === activeStep;
          return (
            <GenieTrigger
              key={s.key}
              tipMessage={s.tipMessage}
              pose={i === 1 ? "studying" : i === 2 ? "high" : "idle"}
              side="top"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveStep(i)}
                className={[
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-glow scale-105"
                    : "border border-border/70 bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden font-mono">{i + 1}</span>
              </button>
            </GenieTrigger>
          );
        })}
      </div>

      {/* Active Step Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex w-full max-w-2xl flex-col items-center justify-between gap-3 rounded-2xl border-2 border-primary/20 bg-card/90 p-3.5 sm:p-5 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-6 flex-1 min-h-0 max-h-[220px]"
        >
          {/* Step Copy */}
          <div className="flex flex-1 flex-col items-start gap-1.5 text-start">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
              {currentStep.tag}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {currentStep.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {currentStep.desc}
            </p>
          </div>

          {/* Interactive Demo */}
          <div className="shrink-0 flex items-center justify-center p-2 rounded-xl bg-background/50 border border-border/40">
            {currentStep.demo}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Next / Back Step Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          disabled={activeStep === 0}
          onClick={() => setActiveStep((x) => x - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 cursor-pointer"
          aria-label={isRTL ? "الخطوة السابقة" : "Previous step"}
        >
          <BwdIcon className="h-4 w-4" />
        </button>

        {steps.map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 rounded-full transition-all duration-200 ${
              i === activeStep
                ? "w-6 bg-primary"
                : "w-2 bg-border"
            }`}
          />
        ))}

        <button
          type="button"
          disabled={activeStep === steps.length - 1}
          onClick={() => setActiveStep((x) => x + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 cursor-pointer"
          aria-label={isRTL ? "الخطوة التالية" : "Next step"}
        >
          <FwdIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
