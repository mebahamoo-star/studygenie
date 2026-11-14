import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Flame,
  Siren,
  Sparkles,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/head";
import { browseService } from "@/lib/api/services";
import { getActiveCourse, getActivePlan, getUserCourses, getUserStoragePrefix, isCourseMaterialUploaded, saveActiveCourse, saveUserCourses } from "@/lib/courses-util";
import type { Course, PlanResponseData } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-state";

export const Route = createFileRoute("/_shell/plan")({
  head: pageHead("Study plan", "Your day-by-day study and review timeline."),
  component: Plan,
});

interface DayTask {
  ref: string;
  title: string;
  tag: string;
  min: number;
  desc?: string;
  subtopics?: string[];
  contentExcerpt?: string;
}

interface DayPlan {
  date: string;
  tasks: DayTask[];
}

function Plan() {
  const { addPoints } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [doneMap, setDoneMap] = useState<Record<string, string[]>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [survival, setSurvival] = useState(false);
  const [planDays, setPlanDays] = useState<DayPlan[]>([]);
  const [fullPlanDays, setFullPlanDays] = useState<DayPlan[]>([]);
  const [courseInfo, setCourseInfo] = useState<{ name: string; code?: string }>({
    name: "Study Plan",
    code: "",
  });

  useEffect(() => {
    // Load subjects specifically enrolled by this user from cloud database
    const loadSubjects = async () => {
      let enrolled: Course[] = [];
      try {
        const remote = await browseService.getEnrolledCourses();
        const local = getUserCourses();
        enrolled = (remote || []).map((rc) => {
          const match = local.find(
            (lc) => String(lc.id) === String(rc.id) || lc.name.toLowerCase() === rc.name.toLowerCase()
          );
          return {
            ...rc,
            topics: rc.topics && rc.topics.length > 0 ? rc.topics : match?.topics || [],
          };
        });
        saveUserCourses(enrolled);
      } catch {
        enrolled = getUserCourses();
      }
      setCourses(enrolled);

      // Auto-select active course if redirected from course configuration
      const act = getActiveCourse();
      if (act) {
        try {
          const matched = enrolled.find((e) => String(e.id) === String(act.id)) || act;
          handleSelectSubject(matched);
          return;
        } catch {}
      }

      if (enrolled.length > 0) {
        handleSelectSubject(enrolled[0]);
      }
    };

    loadSubjects();
  }, []);

  useEffect(() => {
    const prefix = getUserStoragePrefix();
    const loadDoneState = () => {
      const map: Record<string, string[]> = {};
      planDays.forEach((d) => {
        const raw = localStorage.getItem(`sg-${prefix}-checklist-done-${d.date}`);
        if (raw) {
          try {
            map[d.date] = JSON.parse(raw);
          } catch {}
        }
      });
      setDoneMap(map);
    };
    loadDoneState();

    const handleSync = (e: any) => {
      if (e?.detail?.date) {
        setDoneMap((prev) => ({ ...prev, [e.detail.date]: e.detail.list }));
      } else {
        loadDoneState();
      }
    };
    window.addEventListener("sg-checklist-updated", handleSync);
    return () => window.removeEventListener("sg-checklist-updated", handleSync);
  }, [planDays]);

  const isTaskDone = (dateStr: string, t: DayTask) => {
    const prefix = getUserStoragePrefix();
    const taskId = `${selectedCourse?.name || "course"}-${dateStr}-${t.ref || t.title}`;
    const list = doneMap[dateStr] || [];
    return list.includes(taskId) || list.includes(t.ref) || list.includes(t.title);
  };

  const togglePlanTaskDone = (dateStr: string, t: DayTask) => {
    const prefix = getUserStoragePrefix();
    const taskId = `${selectedCourse?.name || "course"}-${dateStr}-${t.ref || t.title}`;
    const currentList = doneMap[dateStr] || [];
    const isDone = currentList.includes(taskId) || currentList.includes(t.ref) || currentList.includes(t.title);
    const nextList = isDone ? currentList.filter((id) => id !== taskId && id !== t.ref && id !== t.title) : [...currentList, taskId];

    setDoneMap((prev) => ({ ...prev, [dateStr]: nextList }));
    try {
      localStorage.setItem(`sg-${prefix}-checklist-done-${dateStr}`, JSON.stringify(nextList));
      const todayStr = new Date().toISOString().slice(0, 10);
      if (dateStr === todayStr) {
        localStorage.setItem(`sg-${prefix}-checklist-done`, JSON.stringify(nextList));
      }
      window.dispatchEvent(new CustomEvent("sg-checklist-updated", { detail: { date: dateStr, list: nextList } }));
    } catch {}

    if (!isDone) {
      addPoints(15);
      toast.success("+15 XP! Topic marked as completed 🎉");
    }
  };

  const handleRefreshFromServer = async () => {
    if (!selectedCourse) return;
    setIsRefreshing(true);
    try {
      if (selectedCourse.id && !String(selectedCourse.id).startsWith("course-") && !String(selectedCourse.id).startsWith("c-")) {
        const remote = await browseService.getCoursePlan(selectedCourse.id);
        if (remote?.tasks && remote.tasks.length > 0) {
          const prefix = getUserStoragePrefix();
          localStorage.setItem(`sg-${prefix}-plan-${selectedCourse.id}`, JSON.stringify(remote));
          localStorage.setItem(`sg-${prefix}-plan-${selectedCourse.name}`, JSON.stringify(remote));
          formatAndSetTasks(remote.tasks, selectedCourse);
          toast.success("Plan refreshed successfully from server!");
          return;
        }
      }
      toast.info("Plan is already up to date.");
    } catch (err: any) {
      toast.error(err?.message || "Could not refresh plan from server.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectSubject = async (c: Course) => {
    let currentCourse = c;

    // Fetch topics if missing for a cloud-synced course
    if (
      (!currentCourse.topics || currentCourse.topics.length === 0) &&
      currentCourse.id &&
      !String(currentCourse.id).startsWith("course-") &&
      !String(currentCourse.id).startsWith("c-")
    ) {
      try {
        const remoteTopics = await browseService.getCourseTopics(currentCourse.id);
        if (remoteTopics && remoteTopics.length > 0) {
          currentCourse = { ...currentCourse, topics: remoteTopics, status: "ready" };
          setSelectedCourse(currentCourse);
          setCourses((prev) =>
            prev.map((item) => String(item.id) === String(currentCourse.id) ? currentCourse : item)
          );
        }
      } catch {}
    }

    if (!isCourseMaterialUploaded(currentCourse)) {
      toast.warning(`Cannot view plan: Course syllabus has not been uploaded for "${currentCourse.name}". Please upload course materials first.`);
    }
    setSelectedCourse(currentCourse);
    saveActiveCourse(currentCourse);
    setCourseInfo({ name: currentCourse.name, code: currentCourse.code });
    setPlanDays([]);
    setFullPlanDays([]);
    setSurvival(false);

    let planData: any = null;
    if (currentCourse.id && !String(currentCourse.id).startsWith("course-") && !String(currentCourse.id).startsWith("c-")) {
      try {
        const res = await browseService.getCoursePlan(currentCourse.id);
        if (res?.tasks && res.tasks.length > 0) {
          planData = res;
          const prefix = getUserStoragePrefix();
          try {
            localStorage.setItem(`sg-${prefix}-plan-${currentCourse.id}`, JSON.stringify(res));
            localStorage.setItem(`sg-plan-${currentCourse.id}`, JSON.stringify(res));
            if (currentCourse.name) {
              localStorage.setItem(`sg-${prefix}-plan-${currentCourse.name}`, JSON.stringify(res));
              localStorage.setItem(`sg-plan-${currentCourse.name}`, JSON.stringify(res));
            }
          } catch {}
        }
      } catch {}
    }

    if (!planData) {
      try {
        const prefix = getUserStoragePrefix();
        const localPlan = localStorage.getItem(`sg-${prefix}-plan-${currentCourse.id}`) || (prefix === "guest" ? localStorage.getItem(`sg-plan-${currentCourse.id}`) : null);
        if (localPlan) {
          planData = JSON.parse(localPlan);
        } else {
          planData = getActivePlan();
        }
      } catch {}
    }

    if (planData?.tasks && planData.tasks.length > 0) {
      formatAndSetTasks(planData.tasks, currentCourse);
    }
  };

  const formatAndSetTasks = (tasks: any[], courseParam?: Course) => {
    const topicMap: Record<string, { title: string; subtopics: string[]; excerpt?: string }> = {};
    const curCourse = courseParam || selectedCourse;
    if (curCourse?.topics && Array.isArray(curCourse.topics)) {
      curCourse.topics.forEach((t: any, idx: number) => {
        const key = String(t.id || idx + 1);
        topicMap[key] = {
          title: t.name || t.chapter_title || t.chapterTitle || `Chapter ${idx + 1}`,
          subtopics: Array.isArray(t.subtopics) ? t.subtopics : [],
          excerpt: t.content_excerpt || t.contentExcerpt || t.excerpt,
        };
      });
    }

    const grouped: Record<string, DayTask[]> = {};
    tasks.forEach((item) => {
      const d = item.date || "Today";
      if (!grouped[d]) grouped[d] = [];

      const ref = String(item.topic_ref || item.topicRef || "");
      const mapped = topicMap[ref];

      const rawTitle =
        item.topic_title ||
        item.topicTitle ||
        item.chapter_title ||
        item.chapterTitle ||
        mapped?.title;

      const title =
        rawTitle && !/^\d+$/.test(rawTitle.trim())
          ? rawTitle
          : mapped?.title || (ref && !/^\d+$/.test(ref) ? ref : `Chapter ${ref || 1}`);

      const tag = (item.task_type || item.taskType || item.tag || "STUDY").toUpperCase();
      const min = item.minutes || item.min || 30;

      const subtopics: string[] =
        Array.isArray(item.subtopics) && item.subtopics.length > 0
          ? item.subtopics
          : mapped?.subtopics || [];

      const contentExcerpt = item.content_excerpt || item.contentExcerpt || mapped?.excerpt;

      const explicitDesc = item.description || item.action || item.desc;
      let desc = explicitDesc;
      if (!desc || desc === title) {
        const subPreview = subtopics.slice(0, 3).join(", ");
        if (tag === "REVIEW") {
          desc = subPreview
            ? `Active recall & practice quiz (${subPreview})`
            : `Active recall & practice quiz for ${title}`;
        } else {
          desc = subPreview
            ? `Core concepts & practice (${subPreview})`
            : `Read chapter material & solve practice exercises`;
        }
      }

      grouped[d].push({
        ref,
        title,
        tag,
        min,
        desc,
        subtopics,
        contentExcerpt,
      });
    });

    const formatted: DayPlan[] = Object.entries(grouped).map(([date, dayTasks]) => ({
      date,
      tasks: dayTasks,
    }));
    if (formatted.length > 0) {
      setFullPlanDays(formatted);
      if (survival) {
        setPlanDays(computeSurvivalPlan(formatted));
      } else {
        setPlanDays(formatted);
      }
    }
  };

  const computeSurvivalPlan = (days: DayPlan[]): DayPlan[] => {
    const sliceCount = Math.max(1, Math.ceil(days.length * 0.7));
    return days.slice(0, sliceCount).map((d) => ({
      ...d,
      tasks: d.tasks.filter((t, idx) => {
        if (d.tasks.length <= 1) return true;
        return t.tag === "STUDY" || idx % 2 === 0;
      }),
    })).filter((d) => d.tasks.length > 0);
  };

  const handleToggleSurvival = () => {
    if (survival) {
      setSurvival(false);
      const restored = fullPlanDays.length > 0 ? fullPlanDays : planDays;
      setPlanDays(restored);
      toast.success("Survival Mode deactivated ✨ — full study schedule restored.");
    } else {
      setSurvival(true);
      const base = fullPlanDays.length > 0 ? fullPlanDays : planDays;
      if (fullPlanDays.length === 0 && planDays.length > 0) {
        setFullPlanDays(planDays);
      }
      setPlanDays(computeSurvivalPlan(base));
      toast.error("Survival Mode activated ⚡ — plan compressed to high-yield topics.");
    }
  };

  // SCREEN 1: Show Subjects First
  if (!selectedCourse) {
    return (
      <div className="max-w-4xl">
        <PageTitle
          title="Study Subjects"
          sub="Select a subject to view your day-by-day plan, flashcards, and quizzes."
          right={
            <Button variant="outline" asChild>
              <Link to="/courses">Manage Courses</Link>
            </Button>
          }
        />

        {courses.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Genie pose="low" className="mb-4 h-24 w-24" />
            <h2 className="text-xl font-semibold text-foreground">No subjects found</h2>
            <p className="mt-1 max-w-sm text-sm">
              Add a course from your college catalog or upload a syllabus to start your tailored study plan.
            </p>
            <Button variant="magic" className="mt-6" asChild>
              <Link to="/courses">Go to Courses</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((c) => {
              const isReady = c.status === "ready";
              const topicsCount = c.topics?.length || 0;
              return (
                <Card
                  key={c.id}
                  className={cn(
                    "flex flex-col justify-between p-5 transition hover:border-primary/50 shadow-sm",
                    isReady ? "border-border/80" : "opacity-90"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {c.code && c.code.toUpperCase() !== "CUSTOM" ? c.code : ""}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-foreground">{c.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {topicsCount > 0
                        ? `${topicsCount} chapters & topics prepared`
                        : isReady
                          ? "Syllabus ready"
                          : "Awaiting materials"}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-border/50 pt-4">
                    {isReady ? (
                      <Button
                        variant="magic"
                        className="w-full justify-between"
                        onClick={() => handleSelectSubject(c)}
                      >
                        <span>View Study Plan</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full justify-between" asChild>
                        <Link to="/courses">
                          <span>Upload Syllabus</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // SCREEN 2: Show Plan for Chosen Subject
  return (
    <div className="max-w-4xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setSelectedCourse(null)}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Subjects
      </Button>

      <PageTitle
        title={selectedCourse.name}
        sub={
          selectedCourse.code && selectedCourse.code.toUpperCase() !== "CUSTOM"
            ? `${selectedCourse.code} · Day-by-day study and review timeline`
            : "Day-by-day study and review timeline"
        }
        right={
          planDays.length > 0 || fullPlanDays.length > 0 ? (
            <Button
              variant={survival ? "survival" : "outline"}
              size="lg"
              onClick={handleToggleSurvival}
              className={cn(
                "gap-2 font-bold transition-all shadow-sm",
                survival
                  ? "bg-destructive text-destructive-foreground hover:brightness-110 shadow-survival animate-pulse-soft"
                  : "border-destructive/40 text-destructive hover:bg-destructive/10"
              )}
            >
              {survival ? (
                <>
                  <Siren className="h-4 w-4" />
                  <span>Survival Mode: ON</span>
                  <span className="ml-1 rounded-full bg-destructive-foreground/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Click to disable
                  </span>
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4" />
                  <span>Survival Mode: OFF</span>
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {survival && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 font-semibold text-destructive shadow-sm">
          <div className="flex items-center gap-2.5">
            <Flame className="h-5 w-5 animate-pulse shrink-0" />
            <div>
              <span className="font-bold">Survival Mode Active:</span> plan compressed to essential, high-yield chapters only.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSurvival}
            className="border-destructive/30 bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-bold shadow-xs"
          >
            Turn Off Survival Mode
          </Button>
        </div>
      )}

      {!isCourseMaterialUploaded(selectedCourse) ? (
        <Card className="flex flex-col items-center justify-center py-16 px-6 text-center border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-soft">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-4 ring-amber-500/10">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Course Syllabus Not Uploaded</h2>
          <p className="mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
            A study plan cannot be generated without syllabus materials. Please upload your syllabus or lecture slides for <strong>{selectedCourse.name}</strong> to automatically build your day-by-day plan.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="magic" size="default" asChild className="gap-2 font-bold shadow-soft">
              <Link to="/courses">
                <Upload className="h-4 w-4" /> Upload Course Material
              </Link>
            </Button>
            <Button variant="outline" size="default" onClick={() => setSelectedCourse(null)}>
              Back to Subjects
            </Button>
          </div>
        </Card>
      ) : planDays.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Genie pose="low" className="mb-4 h-24 w-24" />
          <h2 className="text-xl font-semibold text-foreground">No study plan generated for this subject yet</h2>
          <p className="mt-1 max-w-sm text-sm">
            Configure your exam target date and learning mode in Courses to generate your schedule.
          </p>
          <Button variant="magic" className="mt-6" asChild>
            <Link to="/courses">Configure Course & Generate Plan</Link>
          </Button>
        </Card>
      ) : (
        <div className="relative flex flex-col gap-6 pl-8 before:absolute before:left-3 before:top-2 before:h-full before:w-0.5 before:bg-border">
          {/* Smart Adaptive Progress & Daily Hours Card */}
      {planDays.length > 0 && (() => {
        const allTasks = planDays.flatMap((d) => d.tasks.map((t) => ({ ...t, date: d.date })));
        const totalTasksCount = allTasks.length;
        const completedTasksCount = allTasks.filter((t) => isTaskDone(t.date, t)).length;
        const totalPlannedMinutes = allTasks.reduce((sum, t) => sum + (t.min || 30), 0);
        const completedMinutes = allTasks.filter((t) => isTaskDone(t.date, t)).reduce((sum, t) => sum + (t.min || 30), 0);
        const progressPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
        const totalPlannedHours = (totalPlannedMinutes / 60).toFixed(1);
        const completedHours = (completedMinutes / 60).toFixed(1);

        return (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-gold/5 p-4 shadow-sm">
            <div className="flex flex-col justify-center">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course Completion</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-foreground">{completedTasksCount} / {totalTasksCount}</span>
                <span className="text-xs font-semibold text-primary font-bold">({progressPct}% finished)</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-border/60 sm:pl-4 pt-2 sm:pt-0">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Study Time Progress</div>
              <div className="mt-1 flex items-baseline gap-1.5 font-display text-2xl font-bold text-foreground">
                <span>{completedHours}h</span>
                <span className="text-xs font-medium text-muted-foreground">/ {totalPlannedHours}h total</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground font-medium">
                ⏱️ Daily Target: {(totalPlannedMinutes / Math.max(1, planDays.length * 60)).toFixed(1)} hrs/day across {planDays.length} days
              </div>
            </div>
            <div className="flex items-center justify-end border-t sm:border-t-0 sm:border-l border-border/60 sm:pl-4 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshFromServer}
                disabled={isRefreshing}
                className="w-full sm:w-auto gap-2 font-semibold text-xs border-primary/30 hover:bg-primary/10 hover:text-primary shadow-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
                {isRefreshing ? "Syncing..." : "Refresh Plan"}
              </Button>
            </div>
          </div>
        );
      })()}

      {planDays.map((day, i) => (
            <div key={day.date + i} className="relative">
              <span
                className={cn(
                  "absolute -left-[26px] top-1 h-4 w-4 rounded-full border-4 border-background",
                  i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              <div className="mb-2 font-display font-semibold">
                {day.date}
                {i === 0 && <span className="ml-2 text-xs text-primary">Today</span>}
              </div>
              <Card className="flex flex-col gap-3 p-4">
                {day.tasks.map((t, idx) => (
                  <div
                    key={t.title + t.tag + idx}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3.5 hover:border-primary/40 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                            t.tag === "STUDY"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-gold/20 text-gold-foreground dark:text-gold border border-gold/30"
                          )}
                        >
                          {t.tag === "STUDY" ? <BookOpen className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                          {t.tag}
                        </span>
                        <button
                          type="button"
                          aria-label="Toggle completed"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlanTaskDone(day.date, t);
                          }}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer",
                            isTaskDone(day.date, t)
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                              : "border-border hover:border-primary"
                          )}
                        >
                          {isTaskDone(day.date, t) && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </button>
                        <span className={cn("font-semibold text-sm sm:text-base transition-all", isTaskDone(day.date, t) ? "line-through text-muted-foreground opacity-60" : "text-foreground")}>
                          {t.title}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5" />
                        {t.min >= 60 ? `${(t.min / 60).toFixed(1)}h` : `${t.min}m`}
                      </span>
                    </div>

                    {t.desc && (
                      <p className="text-xs text-muted-foreground">
                        {t.desc}
                      </p>
                    )}

                    {t.subtopics && t.subtopics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          Topics:
                        </span>
                        {t.subtopics.map((sub, sIdx) => (
                          <span
                            key={sub + sIdx}
                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80 border border-border/50"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
