import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, FileSearch, Sparkles } from "lucide-react";
import { Genie } from "./Genie";
import { playCelebrationSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const defaultScanSteps = [
  "Optical scan: Reading syllabus structure & formatting...",
  "Extracting weekly chapters, topics and core readings...",
  "Identifying midterm & final exam milestone dates...",
  "Synthesizing active recall flashcards & quiz topics...",
  "Calibrating your personalized daily study plan...",
];

export function MagicLoader({
  messages = defaultScanSteps,
  duration = 22000,
  courseTitle = "Uploaded Chapter & Materials",
  onDone,
  isComplete,
}: {
  messages?: string[];
  duration?: number;
  courseTitle?: string;
  onDone?: () => void;
  isComplete?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      setActiveStep(messages.length - 1);
      try {
        playCelebrationSound();
      } catch {}
      const timer = setTimeout(() => {
        onDone?.();
      }, 500);
      return () => clearTimeout(timer);
    }

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      // Smoothly advance progress up to 93% while waiting for real AI response
      const pct = Math.min(93, Math.round((elapsed / duration) * 93));
      setProgress(pct);

      const stepIdx = Math.min(
        messages.length - 1,
        Math.floor((elapsed / 3200) % messages.length)
      );
      setActiveStep(stepIdx);
    }, 60);

    return () => clearInterval(interval);
  }, [duration, messages.length, onDone, isComplete]);

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center py-6 px-4 text-center">
      {/* Top Header / Scanner HUD Info */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 w-full max-w-xl text-xs font-mono text-muted-foreground border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-foreground">AI SYLLABUS SCANNER</span>
        </div>
        <div className="flex items-center gap-2">
          <FileSearch className="h-3.5 w-3.5 text-primary" />
          <span>RESOLUTION: 300 DPI</span>
          <span>·</span>
          <span className="text-primary font-bold">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Main Book Scanner Visual Container */}
      <div className="relative w-full max-w-xl [perspective:1200px]">
        {/* Floating Scanner Targets / Corner Reticles */}
        <div className="pointer-events-none absolute -inset-3 rounded-2xl border-2 border-primary/20 z-30">
          <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-primary" />
          <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-primary" />
          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-primary" />
          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-primary" />
        </div>

        {/* Ambient Magical Background Glow */}
        <div className="absolute inset-0 bg-gradient-magic opacity-20 blur-3xl rounded-full pointer-events-none" />

        {/* The Open Book */}
        <div className="relative z-10 grid grid-cols-2 overflow-hidden rounded-2xl border-4 border-sidebar-border bg-card shadow-2xl [transform:rotateX(12deg)] transition-transform">
          {/* Central Book Spine Shadow & Stitching */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/25 via-black/45 to-black/25 z-20 shadow-inner" />
          <div className="pointer-events-none absolute inset-y-2 left-1/2 -translate-x-1/2 w-[1px] bg-border/80 z-20" />

          {/* LEFT PAGE: Syllabus Overview & Objectives */}
          <div className="relative p-5 text-left border-r border-border/40 bg-gradient-to-br from-card via-card to-muted/30">
            {/* Page Header */}
            <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                COURSE SYLLABUS
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">P. 1 / 14</span>
            </div>

            <div className="mb-2 text-xs font-bold truncate text-foreground">{courseTitle}</div>

            {/* Skeleton Paragraph Lines */}
            <div className="space-y-2 mb-4">
              <div className="h-2 w-full rounded bg-muted/90" />
              <div className="h-2 w-5/6 rounded bg-muted/80" />
              <div className="h-2 w-4/6 rounded bg-muted/70" />
            </div>

            {/* Course Objectives Skeleton Box */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1.5">
              <div className="text-[9px] font-mono font-semibold text-muted-foreground uppercase">
                Learning Objectives
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                <span className="h-1.5 w-3/4 rounded bg-muted" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                <span className="h-1.5 w-5/6 rounded bg-muted" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                <span className="h-1.5 w-2/3 rounded bg-muted" />
              </div>
            </div>

            {/* Bottom Grading Weights Table Mock */}
            <div className="mt-4 grid grid-cols-3 gap-1 text-[9px] font-mono text-muted-foreground">
              <div className="rounded bg-muted/40 p-1 text-center">Quiz: 20%</div>
              <div className="rounded bg-muted/40 p-1 text-center">Mid: 30%</div>
              <div className="rounded bg-muted/40 p-1 text-center">Final: 50%</div>
            </div>
          </div>

          {/* RIGHT PAGE: Chapter Breakdown & Milestone Schedule */}
          <div className="relative p-5 text-left bg-gradient-to-bl from-card via-card to-muted/30">
            {/* Page Header */}
            <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                WEEKLY SCHEDULE
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">P. 2 / 14</span>
            </div>

            {/* Simulated Chapter Items */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-[10px]">
                <span className="font-semibold text-foreground">W1: Arrays & Pointers</span>
                <span className="font-mono text-primary font-bold">3.0 h</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-[10px]">
                <span className="font-semibold text-foreground">W2: Stacks & Queues</span>
                <span className="font-mono text-primary font-bold">2.5 h</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-[10px]">
                <span className="font-semibold text-foreground">W3: Trees & BST Traversals</span>
                <span className="font-mono text-primary font-bold">4.0 h</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1.5 text-[10px]">
                <span className="font-semibold text-foreground">W4: Hash Tables & Maps</span>
                <span className="font-mono text-primary font-bold">2.5 h</span>
              </div>
            </div>

            {/* Exam Milestone Callout */}
            <div className="rounded-lg border border-gold/40 bg-gold/10 p-2 text-center">
              <div className="text-[9px] font-mono font-bold text-gold uppercase tracking-wider">
                ⚡ EXAM TARGET IDENTIFIED
              </div>
              <div className="text-[11px] font-bold text-foreground mt-0.5">
                Midterm Exam · Oct 21
              </div>
            </div>
          </div>

          {/* SWEEPING LASER SCANNER BEAM */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 z-30"
            animate={{
              top: ["-5%", "105%", "-5%"],
            }}
            transition={{
              duration: 3.0,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            {/* The Radiant Cyan / Purple Laser Line */}
            <div className="relative h-[3px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_4px_rgba(34,211,238,0.9)]">
              {/* Intense Center Beam Sparkle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-24 rounded-full bg-white blur-[1px] opacity-90 shadow-[0_0_12px_4px_rgba(255,255,255,1)]" />
            </div>

            {/* Laser Sheet Light Trail (Illuminates the scanned text beneath) */}
            <div className="h-28 w-full bg-gradient-to-b from-cyan-400/25 via-primary/10 to-transparent" />
          </motion.div>
        </div>

        {/* Floating Mascot Genie with Magic Sparkles */}
        <div className="absolute -top-12 -right-10 z-30 hidden sm:block">
          <Genie pose="studying" className="h-32 w-32 animate-float drop-shadow-glow" />
        </div>
      </div>

      {/* Real-time Dynamic AI OCR Readout */}
      <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-lg">
        <div className="min-h-[28px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-center gap-2 text-base font-semibold text-foreground"
            >
              <Sparkles className="h-4 w-4 text-gold animate-spin" />
              <span>{messages[activeStep]}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* High-tech Progress Bar */}
        <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-muted border border-border/60 p-0.5">
          <motion.div
            className="h-full rounded-full bg-gradient-magic"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>

        {/* Detected Milestones Ticker */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
          <span className={cn("flex items-center gap-1 transition-colors", progress > 20 && "text-primary")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> 7 Chapters detected
          </span>
          <span className={cn("flex items-center gap-1 transition-colors", progress > 50 && "text-primary")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Exam dates extracted
          </span>
          <span className={cn("flex items-center gap-1 transition-colors", progress > 80 && "text-primary")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Flashcards & quizzes built
          </span>
        </div>
      </div>
    </div>
  );
}
