import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Pencil, Plus, Timer } from "lucide-react";
import { daysUntil, loadExamsForUser, type Exam } from "@/lib/exam";
import { ExamHub } from "@/components/ExamHub";
import { Card } from "@/components/AppShell";
import { Genie, type GeniePose } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-state";
import { pageHead } from "@/lib/head";
import { getUserCourses, getUserStoragePrefix, saveUserCourses } from "@/lib/courses-util";
import { browseService } from "@/lib/api/services";
import type { Course } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/dashboard")({
  head: pageHead("Dashboard", "Your daily checklist, streak and study progress."),
  component: Dashboard,
});

interface TaskItem {
  id: number | string;
  label: string;
  course: string;
  min: number;
  tag: string;
}

function getWeekDays() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const days = [];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + mondayOffset + i);
    days.push({
      d: dayLabels[i],
      n: d.getDate(),
      today: d.toDateString() === now.toDateString(),
      done: d < now && d.toDateString() !== now.toDateString(),
    });
  }
  return days;
}

function Dashboard() {
  const { user } = useApp();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [done, setDone] = useState<(number | string)[]>([]);
  const [progress, setProgress] = useState(0);
  const [courseName, setCourseName] = useState<string>("No active course");
  const [open, setOpen] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      // 1. Fetch user enrolled courses
      let enrolled = getUserCourses();
      try {
        const remote = await browseService.getEnrolledCourses();
        if (remote && remote.length > 0) {
          const map = new Map<string, Course>();
          remote.forEach((c) => map.set(c.name.trim().toLowerCase(), c));
          enrolled.forEach((c) => {
            if (!map.has(c.name.trim().toLowerCase())) map.set(c.name.trim().toLowerCase(), c);
          });
          enrolled = Array.from(map.values());
          saveUserCourses(enrolled);
        }
      } catch {}

      if (!isMounted) return;

      // 2. If user has no courses enrolled, clear active exam, course name, tasks
      if (enrolled.length === 0) {
        setExams([]);
        setCurrentExamIndex(0);
        setCourseName("No active course");
        setTasks([]);
        setProgress(0);
        return;
      }

      // 3. Load exams ONLY if course is enrolled
      const validExams = loadExamsForUser(enrolled);
      setExams(validExams);
      setCurrentExamIndex(0);

      // 4. Determine active course
      const prefix = getUserStoragePrefix();
      const activeCourseRaw =
        localStorage.getItem(`sg-${prefix}-active-course`) ||
        localStorage.getItem("sg-active-course");
      let activeCourse: Course | null = null;
      if (activeCourseRaw) {
        try {
          const parsed = JSON.parse(activeCourseRaw);
          if (enrolled.some((c) => c.name.toLowerCase() === parsed.name?.toLowerCase())) {
            activeCourse = parsed;
          }
        } catch {}
      }

      // If active course is not set or not in enrolled, default to first enrolled course
      if (!activeCourse) {
        activeCourse = enrolled[0];
      }

      const displayName = activeCourse.code
        ? `${activeCourse.code} · ${activeCourse.name}`
        : activeCourse.name;
      setCourseName(displayName);

      // 5. Load active plan if present
      const activePlanRaw =
        localStorage.getItem(`sg-${prefix}-active-plan`) ||
        localStorage.getItem("sg-active-plan");
      if (activePlanRaw) {
        try {
          const plan = JSON.parse(activePlanRaw);
          if (plan?.tasks && plan.tasks.length > 0) {
            const mapped: TaskItem[] = plan.tasks.slice(0, 5).map((t: any, idx: number) => ({
              id: idx + 1,
              label: t.topic_ref || t.topicRef || "Study topic",
              course: displayName,
              min: t.minutes || 30,
              tag: (t.task_type || t.taskType || "STUDY").toUpperCase(),
            }));
            setTasks(mapped);
            setProgress(25);
          } else {
            setTasks([]);
            setProgress(0);
          }
        } catch {
          setTasks([]);
          setProgress(0);
        }
      } else {
        setTasks([]);
        setProgress(0);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const week = getWeekDays();
  const pose: GeniePose = progress < 34 ? "low" : progress < 67 ? "mid" : "high";
  const line =
    progress === 0
      ? "Welcome! Add your courses or exams to start your learning journey."
      : {
          low: "Let's get going — one step at a time!",
          mid: "Nice pace! Keep that streak alive.",
          high: "Incredible! Your wish is almost granted.",
        }[pose];

  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "Scholar";
  const activeExam = exams.length > 0 ? exams[Math.min(currentExamIndex, exams.length - 1)] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {exams.length > 0 && activeExam ? (
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Header controls for scrolling between exams and adding more */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                Upcoming Exams
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                {exams.length} {exams.length === 1 ? "exam" : "exams"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {exams.length > 1 && (
                <div className="flex items-center gap-1.5 rounded-xl border bg-card p-1 shadow-soft">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setCurrentExamIndex((prev) => (prev > 0 ? prev - 1 : exams.length - 1))
                    }
                    title="Previous exam"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-semibold px-1 min-w-[3.5rem] text-center">
                    {currentExamIndex + 1} of {exams.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setCurrentExamIndex((prev) => (prev < exams.length - 1 ? prev + 1 : 0))
                    }
                    title="Next exam"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 rounded-xl">
                <Link to="/exam-checkin">
                  <Plus className="h-3.5 w-3.5" /> Add Exam
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick horizontal scrollable exam selector tabs */}
          {exams.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {exams.map((ex, idx) => {
                const days = daysUntil(ex.date);
                const active = idx === currentExamIndex;
                return (
                  <button
                    key={ex.id || idx}
                    type="button"
                    onClick={() => setCurrentExamIndex(idx)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <span className="font-bold">{ex.course}</span>
                    <span className="opacity-80">({ex.type})</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {days >= 0 ? `${days}d left` : "Passed"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Exam Hub Card */}
          <ExamHub
            key={activeExam.id || `${activeExam.course}-${activeExam.type}`}
            exam={activeExam}
            onRemove={() => {
              const remaining = exams.filter((_, i) => i !== currentExamIndex);
              setExams(remaining);
              setCurrentExamIndex((prev) => Math.max(0, Math.min(prev, remaining.length - 1)));
            }}
          />
        </div>
      ) : (
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Tell your genie about your exams to tailor your plan.</p>
              <p className="text-xs text-muted-foreground">Add quizzes, midterms, or finals for your courses.</p>
            </div>
            <Button variant="magic" asChild>
              <Link to="/exam-checkin">
                <Plus className="mr-1.5 h-4 w-4" /> Add exam
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <Card className="relative overflow-hidden bg-gradient-magic text-primary-foreground lg:col-span-2">
        <div className="flex items-center gap-6">
          <Genie pose={pose} className="h-40 w-40 shrink-0 animate-float" />
          <div className="flex-1">
            <p className="text-sm font-bold opacity-80">Hello, {firstName}</p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{line}</h1>
            <div className="mt-5 flex items-center gap-3">
              <span className="text-xs font-bold opacity-80">Current Progress</span>
              <span className="font-bold">{progress}%</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col items-center justify-center">
        <ProgressRing value={progress}>
          <div>
            <div className="font-display text-4xl font-semibold">{progress}%</div>
            <div className="text-xs font-bold text-muted-foreground">{courseName}</div>
          </div>
        </ProgressRing>
        <p className="mt-3 text-sm text-muted-foreground">
          {progress > 0 ? "In progress" : "No active study session"}
        </p>
      </Card>

      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Today's checklist</h2>
          <button
            onClick={() => setOpen(true)}
            aria-label="Adjust my schedule"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <BookOpen className="mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">No tasks scheduled for today.</p>
            <p className="text-xs">Add a course or generate a plan to see your daily schedule.</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((t) => {
              const on = done.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setDone((d) => (on ? d.filter((x) => x !== t.id) : [...d, t.id]))
                  }
                  className="flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition hover:bg-accent/50"
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-lg border-2",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {on && <Check className="h-4 w-4" />}
                  </span>
                  <span
                    className={cn("flex-1 font-semibold", on && "text-muted-foreground line-through")}
                  >
                    {t.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      t.tag === "STUDY"
                        ? "bg-info/15 text-info"
                        : "bg-gold/20 text-gold-foreground dark:text-gold"
                    )}
                  >
                    {t.tag}
                  </span>
                  <span className="w-14 text-right text-sm text-muted-foreground">{t.min} min</span>
                </button>
              );
            })}
          </div>
        )}

        <Button variant="magic" className="mt-4" asChild>
          <Link to="/pomodoro">
            <Timer /> Start focus session
          </Link>
        </Button>
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-semibold">This week</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((w) => (
            <div
              key={w.d}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2",
                w.today
                  ? "bg-gradient-magic text-primary-foreground shadow-glow"
                  : "bg-muted"
              )}
            >
              <span className="text-[10px] font-bold opacity-70">{w.d}</span>
              <span className="font-display font-semibold">{w.n}</span>
              <span
                className={cn("h-1.5 w-1.5 rounded-full", w.done ? "bg-gold" : "bg-transparent")}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-accent p-3">
            <div className="font-display text-2xl font-semibold">{done.length}</div>
            <div className="text-xs text-muted-foreground">tasks completed</div>
          </div>
          <div className="rounded-xl bg-accent p-3">
            <div className="font-display text-2xl font-semibold">
              {done.length > 0 ? `${(done.length * 0.5).toFixed(1)}h` : "0h"}
            </div>
            <div className="text-xs text-muted-foreground">studied</div>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Adjust my schedule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-3">
              <Label>Daily study time</Label>
              <Slider defaultValue={[2]} max={6} step={0.5} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Study on weekends</Label>
              <Switch defaultChecked />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
