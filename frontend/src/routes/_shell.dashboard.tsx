import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Timer,
} from "lucide-react";
import { daysUntil, fetchAndSyncExams, loadExamsForUser, type Exam } from "@/lib/exam";
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
  id: string;
  label: string;
  course: string;
  min: number;
  tag: string;
  description?: string;
  date: string;
  courseId?: string | number;
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
  const [done, setDone] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [courseName, setCourseName] = useState<string>("No active course");
  const [hasPlans, setHasPlans] = useState<boolean | null>(null);
  const [checklistDateLabel, setChecklistDateLabel] = useState<string>("Today");
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      const prefix = getUserStoragePrefix();
      const todayStr = new Date().toISOString().slice(0, 10);
      const doneKey = `sg-${prefix}-checklist-done-${todayStr}`;

      // Load saved done checkboxes for today
      let savedDone: string[] = [];
      try {
        const rawDone = localStorage.getItem(doneKey);
        if (rawDone) savedDone = JSON.parse(rawDone);
      } catch {}
      if (isMounted) setDone(savedDone);

      // 1. Fetch user enrolled courses from Neon cloud database
      let enrolled: Course[] = [];
      try {
        const remote = await browseService.getEnrolledCourses();
        enrolled = remote || [];
        saveUserCourses(enrolled);
      } catch {
        enrolled = getUserCourses();
      }

      if (!isMounted) return;
      setEnrolledCount(enrolled.length);

      // 2. Load and sync user exams
      const validExams = await fetchAndSyncExams();
      if (!isMounted) return;
      setExams(validExams);
      setCurrentExamIndex(0);

      // 3. If user has no courses enrolled, set course display and exit tasks setup
      if (enrolled.length === 0) {
        setCourseName(validExams.length > 0 ? validExams[0].course : "No active course");
        setHasPlans(false);
        setTasks([]);
        setProgress(0);
        return;
      }

      // 4. Determine active course
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

      if (!activeCourse) {
        activeCourse = enrolled[0];
      }

      const displayName = activeCourse.code && activeCourse.code.toUpperCase() !== "CUSTOM"
        ? `${activeCourse.code} · ${activeCourse.name}`
        : activeCourse.name;
      setCourseName(displayName);

      // 5. Discover plans across all enrolled courses and local storage
      interface DiscoveredPlan {
        courseName: string;
        courseCode?: string;
        courseId?: string | number;
        topics?: any[];
        tasks: any[];
      }

      const allPlans: DiscoveredPlan[] = [];

      for (const c of enrolled) {
        let planData: any = null;
        try {
          const localPlan =
            localStorage.getItem(`sg-${prefix}-plan-${c.id}`) ||
            localStorage.getItem(`sg-plan-${c.id}`);
          if (localPlan) {
            planData = JSON.parse(localPlan);
          }
        } catch {}

        if (!planData && c.id && !String(c.id).startsWith("c-") && !String(c.id).startsWith("course-")) {
          try {
            const remotePlan = await browseService.getCoursePlan(c.id);
            if (remotePlan?.tasks && remotePlan.tasks.length > 0) {
              planData = remotePlan;
              try {
                localStorage.setItem(`sg-plan-${c.id}`, JSON.stringify(remotePlan));
              } catch {}
            }
          } catch {}
        }

        if (planData?.tasks && planData.tasks.length > 0) {
          allPlans.push({
            courseName: c.name,
            courseCode: c.code && c.code.toUpperCase() !== "CUSTOM" ? c.code : undefined,
            courseId: c.id,
            topics: c.topics,
            tasks: planData.tasks,
          });
        }
      }

      // Also check global active plan
      try {
        const activeRaw =
          localStorage.getItem(`sg-${prefix}-active-plan`) ||
          localStorage.getItem("sg-active-plan");
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          if (parsed?.tasks && parsed.tasks.length > 0) {
            const alreadyIn = allPlans.some((p) => p.tasks.length === parsed.tasks.length);
            if (!alreadyIn) {
              allPlans.push({
                courseName: activeCourse?.name || "General Course",
                courseCode: activeCourse?.code && activeCourse.code.toUpperCase() !== "CUSTOM" ? activeCourse.code : undefined,
                courseId: activeCourse?.id,
                topics: activeCourse?.topics,
                tasks: parsed.tasks,
              });
            }
          }
        }
      } catch {}

      if (!isMounted) return;

      if (allPlans.length === 0) {
        setHasPlans(false);
        setTasks([]);
        setProgress(0);
        return;
      }

      setHasPlans(true);

      // 6. Map tasks with real topic titles and course info
      const allMappedTasks: TaskItem[] = [];

      allPlans.forEach((plan) => {
        const topicMap: Record<string, string> = {};
        if (plan.topics && Array.isArray(plan.topics)) {
          plan.topics.forEach((t: any, idx: number) => {
            const key = String(t.id || idx + 1);
            topicMap[key] = t.name || t.chapter_title || t.chapterTitle || `Chapter ${idx + 1}`;
          });
        }

        plan.tasks.forEach((t: any, idx: number) => {
          const ref = String(t.topic_ref || t.topicRef || "");
          const rawTitle = t.topic_title || t.topicTitle || t.chapter_title || t.chapterTitle;
          const mappedTitle = topicMap[ref];

          const label =
            rawTitle && !/^\d+$/.test(rawTitle.trim())
              ? rawTitle
              : mappedTitle || (ref && !/^\d+$/.test(ref) ? ref : `Chapter ${ref || idx + 1}`);

          const taskDate = t.date || "Today";
          const courseDisplayName = plan.courseCode ? `${plan.courseCode} · ${plan.courseName}` : plan.courseName;

          allMappedTasks.push({
            id: `${plan.courseId || plan.courseName}-${taskDate}-${idx}`,
            label,
            course: courseDisplayName,
            courseId: plan.courseId,
            min: t.minutes || t.min || 30,
            tag: (t.task_type || t.taskType || t.tag || "STUDY").toUpperCase(),
            description:
              t.description ||
              (Array.isArray(t.subtopics) && t.subtopics.length > 0
                ? t.subtopics.slice(0, 2).join(", ")
                : undefined),
            date: taskDate,
          });
        });
      });

      // 7. Find Today's tasks
      let todayTasks = allMappedTasks.filter(
        (t) => t.date === todayStr || t.date === "Today" || t.date.startsWith(todayStr)
      );

      // If no tasks match today's exact date string, pick the next scheduled date
      if (todayTasks.length === 0 && allMappedTasks.length > 0) {
        const uniqueDates = Array.from(new Set(allMappedTasks.map((t) => t.date))).sort();
        const nextDate = uniqueDates.find((d) => d >= todayStr) || uniqueDates[0];
        todayTasks = allMappedTasks.filter((t) => t.date === nextDate);
        setChecklistDateLabel(nextDate ? `Upcoming: ${nextDate}` : "Today");
      } else {
        setChecklistDateLabel("Today");
      }

      setTasks(todayTasks);

      const completedCount = todayTasks.filter((t) => savedDone.includes(t.id)).length;
      const initialProgress =
        todayTasks.length > 0 ? Math.round((completedCount / todayTasks.length) * 100) : 0;
      setProgress(initialProgress);
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTask = (taskId: string) => {
    const prefix = getUserStoragePrefix();
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneKey = `sg-${prefix}-checklist-done-${todayStr}`;

    setDone((prev) => {
      const isDone = prev.includes(taskId);
      const next = isDone ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      try {
        localStorage.setItem(doneKey, JSON.stringify(next));
      } catch {}

      if (tasks.length > 0) {
        const completedCount = tasks.filter((t) => next.includes(t.id)).length;
        setProgress(Math.round((completedCount / tasks.length) * 100));
      }
      return next;
    });
  };

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
  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Today's checklist</h2>
              {tasks.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {done.filter((id) => tasks.some((t) => t.id === id)).length} / {tasks.length} done
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayDateStr} · {checklistDateLabel}
            </p>
          </div>

          {hasPlans && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to="/plan">
                View Full Plan <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {!hasPlans || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Brain className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {!hasPlans ? "No active study plan" : "No tasks scheduled for today"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {!hasPlans
                ? enrolledCount === 0
                  ? "You haven't added any courses yet. Add your courses and generate a study plan to see your daily schedule."
                  : "You have enrolled courses, but haven't generated a study plan yet. Generate a plan to get your day-by-day checklist."
                : "You're all caught up for today! Take a break or review your flashcards."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="magic" size="sm" asChild>
                <Link to={!hasPlans ? (enrolledCount === 0 ? "/courses" : "/plan") : "/plan"}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {!hasPlans ? (enrolledCount === 0 ? "Browse Courses" : "Generate Study Plan") : "Open Study Plan"}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tasks.map((t) => {
              const on = done.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-xl border p-3.5 transition",
                    on
                      ? "border-muted bg-muted/30 opacity-70"
                      : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 group-hover:border-primary"
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {t.course}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            t.tag === "STUDY"
                              ? "bg-info/15 text-info"
                              : t.tag === "REVIEW"
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                : t.tag === "QUIZ"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-gold/20 text-gold-foreground dark:text-gold"
                          )}
                        >
                          {t.tag}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-sm font-semibold text-foreground transition",
                          on && "line-through text-muted-foreground"
                        )}
                      >
                        {t.label}
                      </p>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 opacity-70" /> {t.min}m
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      title="Start Focus Timer for this task"
                    >
                      <Link to="/pomodoro">
                        <Play className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}

            {tasks.length > 0 && done.filter((id) => tasks.some((t) => t.id === id)).length === tasks.length && (
              <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                🎉 All tasks completed for today! Keep that streak shining.
              </div>
            )}
          </div>
        )}

        {hasPlans && tasks.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground">
              Total: {tasks.reduce((acc, t) => acc + t.min, 0)} minutes of scheduled study
            </span>
            <Button variant="magic" size="sm" asChild>
              <Link to="/pomodoro">
                <Timer className="mr-1.5 h-3.5 w-3.5" /> Start Focus Session
              </Link>
            </Button>
          </div>
        )}
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
            <div className="font-display text-2xl font-semibold">
              {done.filter((id) => tasks.some((t) => t.id === id)).length}
            </div>
            <div className="text-xs text-muted-foreground">tasks completed</div>
          </div>
          <div className="rounded-xl bg-accent p-3">
            <div className="font-display text-2xl font-semibold">
              {(() => {
                const completedTasks = tasks.filter((t) => done.includes(t.id));
                const totalMinutes = completedTasks.reduce((sum, t) => sum + t.min, 0);
                return totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)}h` : "0h";
              })()}
            </div>
            <div className="text-xs text-muted-foreground">studied today</div>
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
