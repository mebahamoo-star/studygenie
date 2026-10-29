import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-state";
import { pageHead } from "@/lib/head";
import { playPointEarnedSound } from "@/lib/sound";

export const Route = createFileRoute("/_shell/pomodoro")({
  head: pageHead("Pomodoro", "Focus in 25-minute sessions and earn points."),
  component: Pomodoro,
});

const TOTAL = 25 * 60;

function Pomodoro() {
  const { addPoints } = useApp();
  const [left, setLeft] = useState(TOTAL);
  const [running, setRunning] = useState(false);
  const [courseName, setCourseName] = useState<string>("Study Session");
  const done = left === 0;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const active = getActiveCourse();
      if (active?.name) {
        setCourseName(active.name);
      }
    } catch {}

    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/point-earned.mp3");
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (done && running) {
      setRunning(false);
      addPoints(10);
      playPointEarnedSound(audioRef.current);
      toast.success("+10 points! Focus session complete ✨");
    }
  }, [done, running, addPoints]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="flex flex-col items-center py-10">
        {done ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <Genie pose="high" className="h-48 w-48 animate-float" />
            <h1 className="mt-4 text-4xl font-semibold">Session complete!</h1>
            <p className="mt-2 flex items-center gap-1 font-bold text-gold">
              <Zap className="h-5 w-5" /> +10 points earned
            </p>
            <Button
              variant="magic"
              size="lg"
              className="mt-6"
              onClick={() => {
                setLeft(TOTAL);
                setRunning(true);
              }}
            >
              Start another session
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="mb-2 text-sm font-bold text-muted-foreground">
              Focus · {courseName}
            </div>
            <div className="flex items-center gap-10">
              <ProgressRing value={((TOTAL - left) / TOTAL) * 100} size={320} stroke={18}>
                <div className="font-display text-7xl font-semibold tabular-nums">
                  {mm}:{ss}
                </div>
              </ProgressRing>
              <Genie pose="studying" className="h-40 w-40" />
            </div>
            <div className="mt-8 flex gap-3">
              <Button variant="magic" size="lg" onClick={() => setRunning(!running)}>
                {running ? (
                  <>
                    <Pause /> Pause
                  </>
                ) : (
                  <>
                    <Play /> Start
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setRunning(false);
                  setLeft(TOTAL);
                }}
              >
                <RotateCcw /> Reset
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
