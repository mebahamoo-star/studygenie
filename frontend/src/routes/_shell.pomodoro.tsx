import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Flame,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/app-state";
import { pageHead } from "@/lib/head";
import { playCelebrationSound, playPointEarnedSound } from "@/lib/sound";
import { getActiveCourse, getUserStoragePrefix } from "@/lib/courses-util";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/pomodoro")({
  head: pageHead("Pomodoro Focus", "Focus in 25-minute rounds and earn XP with 30-minute milestone breaks."),
  component: Pomodoro,
});

type PomodoroMode = "focus" | "short_break" | "long_break";

const FOCUS_SECONDS = 25 * 60;       // 25 minutes
const SHORT_BREAK_SECONDS = 5 * 60;   // 5 minutes
const LONG_BREAK_SECONDS = 30 * 60;   // 30 minutes (after 4 rounds)

const FOCUS_MOTIVATIONS = [
  "Discipline is the bridge between your academic goals and your achievements.",
  "Deep focus is a superpower. Silence distractions and enter your flow state.",
  "Small daily efforts, repeated session after session, create extraordinary exam results.",
  "Action cures anxiety. Tackle this chapter one focused minute at a time.",
  "The difference between ordinary and extraordinary is that little 'extra' focus.",
  "Your future self is depending on what you do in this very session. Lock in!",
  "Quality of study matters far more than quantity of time. Make every minute count.",
];

const SHORT_BREAK_MOTIVATIONS = [
  "Step away from the screen, take 3 deep breaths, and gently stretch your neck and shoulders.",
  "Drink a glass of water! A well-hydrated brain processes and retains concepts 14% faster.",
  "Look at an object at least 20 feet away for 20 seconds to rest your optic muscles.",
  "Rest is not a reward for work — it is a vital part of cognitive consolidation.",
];

const LONG_BREAK_MOTIVATIONS = [
  "Outstanding accomplishment! 4 consecutive rounds is 100 minutes of pure deep focus.",
  "Your brain needs this 30-minute break to consolidate long-term memory. Step away and relax!",
  "Take a refreshing walk, grab a healthy snack, or listen to relaxing music.",
  "You've built incredible momentum today. Enjoy this milestone rest — you've earned every minute!",
];

export function Pomodoro() {
  const { addPoints } = useApp();
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [left, setLeft] = useState<number>(FOCUS_SECONDS);
  const [running, setRunning] = useState<boolean>(false);
  const [roundsCompleted, setRoundsCompleted] = useState<number>(0); // 0 to 4 within current cycle
  const [totalCompleted, setTotalCompleted] = useState<number>(0);
  const [courseName, setCourseName] = useState<string>("Study Session");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [motivationIdx, setMotivationIdx] = useState<number>(0);
  const [celebrationModalOpen, setCelebrationModalOpen] = useState<boolean>(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    round: number;
    isMilestone: boolean;
    title: string;
    message: string;
    motivation: string;
    points: number;
  }>({
    round: 1,
    isMilestone: false,
    title: "",
    message: "",
    motivation: "",
    points: 25,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load active course and user's saved Pomodoro rounds
  useEffect(() => {
    try {
      const active = getActiveCourse();
      if (active?.name) {
        setCourseName(active.name);
      }
    } catch {}

    try {
      const prefix = getUserStoragePrefix();
      const savedRounds = localStorage.getItem(`sg-${prefix}-pomo-rounds`);
      const savedTotal = localStorage.getItem(`sg-${prefix}-pomo-total`);
      if (savedRounds) {
        const parsed = parseInt(savedRounds, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
          setRoundsCompleted(parsed);
        }
      }
      if (savedTotal) {
        const parsedTotal = parseInt(savedTotal, 10);
        if (!isNaN(parsedTotal) && parsedTotal >= 0) {
          setTotalCompleted(parsedTotal);
        }
      }
    } catch {}

    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/point-earned.mp3");
    }
  }, []);

  // Save rounds to user storage
  const persistRounds = (rounds: number, total: number) => {
    try {
      const prefix = getUserStoragePrefix();
      localStorage.setItem(`sg-${prefix}-pomo-rounds`, String(rounds));
      localStorage.setItem(`sg-${prefix}-pomo-total`, String(total));
    } catch {}
  };

  // Timer tick effect
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, mode, roundsCompleted, totalCompleted]);

  // Handle session finished (either focus round or break)
  const handleSessionFinished = () => {
    setRunning(false);

    if (mode === "focus") {
      const nextRound = (roundsCompleted % 4) + 1;
      const nextTotal = totalCompleted + 1;
      const isMilestone = nextRound === 4;
      const pts = isMilestone ? 50 : 25;

      setRoundsCompleted(nextRound);
      setTotalCompleted(nextTotal);
      persistRounds(nextRound, nextTotal);

      // Award XP
      try {
        addPoints(pts);
      } catch {}

      // Play celebration sound
      if (soundEnabled) {
        try {
          if (isMilestone) {
            playCelebrationSound("fanfare");
          } else {
            playPointEarnedSound(audioRef.current);
          }
        } catch {}
      }

      // Configure Celebration Modal
      let title = `Round ${nextRound} Complete! 🎉`;
      let message = `Great work! You've successfully finished 25 minutes of focused study.`;
      let motivation = SHORT_BREAK_MOTIVATIONS[Math.floor(Math.random() * SHORT_BREAK_MOTIVATIONS.length)];

      if (nextRound === 1) {
        title = "Round 1 Smashed! ⚡";
        message = "Fantastic start to your study session! Take 5 minutes to relax your mind and eyes.";
      } else if (nextRound === 2) {
        title = "Round 2 Complete! 🚀";
        message = "Halfway through this 4-round cycle! Keep this great rhythm going. Take a 5-minute break.";
      } else if (nextRound === 3) {
        title = "Round 3 Crushed! 🔥";
        message = "You are in deep flow state! Just 1 more round to reach the 4-round milestone and unlock your 30-minute break.";
      } else if (isMilestone) {
        title = "🏆 4-ROUND MILESTONE ACHIEVED!";
        message = "Incredible dedication! You have completed 4 full Pomodoro rounds (100 minutes of deep focus). Your brain deserves a complete reset. Enjoy a 30-minute long break!";
        motivation = LONG_BREAK_MOTIVATIONS[Math.floor(Math.random() * LONG_BREAK_MOTIVATIONS.length)];
      }

      setCelebrationDetails({
        round: nextRound,
        isMilestone,
        title,
        message,
        motivation,
        points: pts,
      });

      setCelebrationModalOpen(true);
      toast.success(isMilestone ? "🏆 4 Rounds Complete! +50 Points & 30-Min Break!" : `+${pts} Points! Round ${nextRound} Complete ✨`);
    } else {
      // Break session finished
      if (soundEnabled) {
        try {
          playCelebrationSound("magic");
        } catch {}
      }

      if (mode === "long_break") {
        // Reset 4-round cycle for the next set
        setRoundsCompleted(0);
        persistRounds(0, totalCompleted);
        toast.info("Long break complete! You're refreshed and ready for a new 4-round cycle! 🚀", { duration: 6000 });
      } else {
        toast.info(`Break finished! Ready for Round ${roundsCompleted + 1}? Let's do this! ✨`, { duration: 5000 });
      }

      // Switch back to focus
      setMode("focus");
      setLeft(FOCUS_SECONDS);
    }
  };

  // Switch modes manually
  const switchMode = (newMode: PomodoroMode) => {
    setRunning(false);
    setMode(newMode);
    if (newMode === "focus") {
      setLeft(FOCUS_SECONDS);
    } else if (newMode === "short_break") {
      setLeft(SHORT_BREAK_SECONDS);
    } else if (newMode === "long_break") {
      setLeft(LONG_BREAK_SECONDS);
    }
  };

  // Start break after closing celebration modal
  const handleStartBreakFromModal = () => {
    setCelebrationModalOpen(false);
    if (celebrationDetails.isMilestone) {
      switchMode("long_break");
      setRunning(true);
    } else {
      switchMode("short_break");
      setRunning(true);
    }
  };

  // Reset current timer
  const handleReset = () => {
    setRunning(false);
    if (mode === "focus") {
      setLeft(FOCUS_SECONDS);
    } else if (mode === "short_break") {
      setLeft(SHORT_BREAK_SECONDS);
    } else {
      setLeft(LONG_BREAK_SECONDS);
    }
  };

  // Reset entire 4-round cycle
  const handleResetCycle = () => {
    if (window.confirm("Reset your current 4-round Pomodoro cycle back to Round 1?")) {
      setRunning(false);
      setRoundsCompleted(0);
      setMode("focus");
      setLeft(FOCUS_SECONDS);
      persistRounds(0, totalCompleted);
      toast.info("Pomodoro cycle reset to Round 1");
    }
  };

  // Fast-forward / Skip button (handy for testing or early finish)
  const handleSkip = () => {
    if (window.confirm(`Skip the rest of this ${mode === "focus" ? "focus session" : "break"}?`)) {
      handleSessionFinished();
    }
  };

  // Total duration of current mode
  const totalDuration = mode === "focus" ? FOCUS_SECONDS : mode === "short_break" ? SHORT_BREAK_SECONDS : LONG_BREAK_SECONDS;
  const progressPercent = ((totalDuration - left) / totalDuration) * 100;

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  // Motivational quote of the day
  const currentMotivation =
    mode === "focus"
      ? FOCUS_MOTIVATIONS[motivationIdx % FOCUS_MOTIVATIONS.length]
      : mode === "short_break"
        ? SHORT_BREAK_MOTIVATIONS[motivationIdx % SHORT_BREAK_MOTIVATIONS.length]
        : LONG_BREAK_MOTIVATIONS[motivationIdx % LONG_BREAK_MOTIVATIONS.length];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page Header */}
      <PageTitle
        title="Pomodoro Focus"
        sub={
          courseName && courseName !== "Study Session"
            ? `Target Course: ${courseName} · 4-Round Deep Work Cycles`
            : "Master deep focus with 25-minute rounds and 30-minute milestone breaks."
        }
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              title={soundEnabled ? "Mute celebration sounds" : "Enable celebration sounds"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              <span className="hidden sm:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCycle}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Reset Cycle
            </Button>
          </div>
        }
      />

      {/* 4-ROUND PROGRESS TRACKER */}
      <Card className="p-5 shadow-soft border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                <Flame className="h-3.5 w-3.5" />
                Pomodoro Cycle
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {roundsCompleted === 4
                  ? "Milestone: 30-Minute Break Unlocked!"
                  : `Round ${roundsCompleted + 1} of 4 in progress`}
              </span>
            </div>
            <h3 className="mt-1 font-display text-lg font-bold text-foreground">
              {roundsCompleted === 4
                ? "🏆 4 Rounds Completed (100 min total)"
                : `${roundsCompleted} of 4 Focus Rounds Finished`}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-tight">Lifetime Sessions</div>
              <div className="font-display text-lg font-bold text-foreground flex items-center justify-end gap-1">
                <Zap className="h-4 w-4 text-amber-500" />
                {totalCompleted} Pomodoros
              </div>
            </div>
          </div>
        </div>

        {/* 4 Round Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((r) => {
            const isFinished = roundsCompleted >= r;
            const isCurrent = (roundsCompleted === r - 1 && mode === "focus") || (roundsCompleted === 4 && r === 4 && mode === "long_break");
            const isLast = r === 4;

            return (
              <div
                key={r}
                className={cn(
                  "relative flex flex-col p-3 rounded-xl border transition-all",
                  isFinished
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary shadow-soft ring-2 ring-primary/20"
                      : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isLast ? "Milestone" : `Round ${r}`}
                  </span>
                  {isFinished ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : isLast ? (
                    <Trophy className={cn("h-4 w-4", isCurrent ? "text-amber-500 animate-bounce" : "text-muted-foreground/60")} />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground/70">25m</span>
                  )}
                </div>

                <div className="mt-2 text-xs font-semibold">
                  {isFinished ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      ✓ Done (+{isLast ? 50 : 25} XP)
                    </span>
                  ) : isCurrent ? (
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                      {mode === "focus" ? "In Focus" : "Break Active"}
                    </span>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>

                <div className="mt-1 text-[10px] text-muted-foreground">
                  {isLast ? "→ 30-min break" : "→ 5-min break"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* MAIN TIMER CARD */}
      <Card className="flex flex-col items-center py-10 shadow-soft">
        {/* Mode Selector Buttons */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 rounded-2xl border bg-muted/40 p-1.5">
          <button
            onClick={() => switchMode("focus")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition",
              mode === "focus"
                ? "bg-card text-primary shadow-soft border border-primary/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            Focus (25m)
          </button>
          <button
            onClick={() => switchMode("short_break")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition",
              mode === "short_break"
                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-soft border border-emerald-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Coffee className="h-3.5 w-3.5" />
            Short Break (5m)
          </button>
          <button
            onClick={() => switchMode("long_break")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition",
              mode === "long_break"
                ? "bg-card text-amber-600 dark:text-amber-400 shadow-soft border border-amber-500/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Long Break (30m)
          </button>
        </div>

        {/* Circular Progress Timer & Genie Mascot */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 my-2">
          <div className="relative">
            <ProgressRing
              value={progressPercent}
              size={300}
              stroke={16}
              className={cn(
                mode === "focus"
                  ? "text-primary"
                  : mode === "short_break"
                    ? "text-emerald-500"
                    : "text-amber-500"
              )}
            >
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {mode === "focus"
                    ? `Round ${roundsCompleted < 4 ? roundsCompleted + 1 : 4} of 4`
                    : mode === "short_break"
                      ? "Short Break"
                      : "30-Min Long Break"}
                </span>
                <div className="font-display text-6xl sm:text-7xl font-bold tabular-nums text-foreground tracking-tight">
                  {mm}:{ss}
                </div>
                <span className="text-xs font-semibold text-muted-foreground mt-2">
                  {running ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      Timer Running
                    </span>
                  ) : (
                    "Paused"
                  )}
                </span>
              </div>
            </ProgressRing>
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <Genie
              pose={
                mode === "focus"
                  ? running
                    ? "studying"
                    : "mid"
                  : mode === "short_break"
                    ? "mid"
                    : "high"
              }
              className="h-36 w-36 sm:h-44 sm:w-44 animate-float"
            />
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {mode === "focus" ? "25 Minutes Focus" : mode === "short_break" ? "5 Minutes Rest" : "30 Minutes Big Break"}
              </span>
              <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                {mode === "focus"
                  ? "Deep work round. Avoid switching tabs until the chime."
                  : mode === "short_break"
                    ? "Rest your eyes, hydrate, and stretch."
                    : "You completed 4 rounds! Relax and recharge."}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full max-w-md px-4">
          <Button
            variant={running ? "outline" : "magic"}
            size="lg"
            className="flex-1 gap-2 font-bold text-base shadow-soft min-w-[140px]"
            onClick={() => setRunning(!running)}
          >
            {running ? (
              <>
                <Pause className="h-5 w-5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5" /> Start {mode === "focus" ? "Focus" : "Break"}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="gap-2 font-semibold text-muted-foreground hover:text-foreground"
            onClick={handleReset}
            title="Reset current timer"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
            title="Skip current session"
          >
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
        </div>
      </Card>

      {/* DYNAMIC MOTIVATIONAL MESSAGE CARD */}
      <Card className="p-5 shadow-soft border-border/80 bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-2 ring-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {mode === "focus" ? "Focus Motivation" : "Mindful Rest"}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-[11px] text-muted-foreground">StudyGenie Wisdom</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentMotivation}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 text-sm font-medium text-foreground leading-relaxed italic"
                >
                  "{currentMotivation}"
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMotivationIdx((prev) => prev + 1)}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            title="New quote"
          >
            Next Quote →
          </Button>
        </div>
      </Card>

      {/* CELEBRATION MODAL (Triggers after EVERY round, with special 4-round milestone) */}
      <Dialog open={celebrationModalOpen} onOpenChange={setCelebrationModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <div className="relative mb-2">
              <div className="absolute -inset-2 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <Genie pose="high" className="relative h-28 w-28 animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> +{celebrationDetails.points} XP Earned!
            </div>

            <DialogTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {celebrationDetails.title}
            </DialogTitle>

            <DialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {celebrationDetails.message}
            </DialogDescription>
          </DialogHeader>

          {/* Motivational Advice Inside Celebration Dialog */}
          <div className="my-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              {celebrationDetails.isMilestone ? "30-Minute Milestone Rest Advice:" : "Quick Rest Tip:"}
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed italic">
              "{celebrationDetails.motivation}"
            </p>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2 w-full">
            <Button
              variant="magic"
              size="lg"
              className="w-full gap-2 font-bold shadow-soft"
              onClick={handleStartBreakFromModal}
            >
              {celebrationDetails.isMilestone ? (
                <>
                  <Trophy className="h-4 w-4" /> Start 30-Minute Long Break
                </>
              ) : (
                <>
                  <Coffee className="h-4 w-4" /> Start 5-Minute Break
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setCelebrationModalOpen(false)}
            >
              Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Pomodoro;
