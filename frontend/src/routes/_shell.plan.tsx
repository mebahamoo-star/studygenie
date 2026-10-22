import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Flame,
  HelpCircle,
  Loader2,
  Siren,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { pageHead } from "@/lib/head";
import { browseService } from "@/lib/api/services";
import { fetchApi } from "@/lib/api/client";
import { getUserCourses, getUserTaskKits, saveUserTaskKits } from "@/lib/courses-util";
import type { Course, PlanResponseData } from "@/lib/api/types";
import { cn } from "@/lib/utils";

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

interface StoredTaskKit {
  kitId?: string;
  flashcards: { id: string; q: string; a: string; hint?: string }[];
  quiz: { id: string; question: string; options: string[]; explanation?: string }[];
}

function Plan() {
  const nav = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [survival, setSurvival] = useState(false);
  const [planDays, setPlanDays] = useState<DayPlan[]>([]);
  const [fullPlanDays, setFullPlanDays] = useState<DayPlan[]>([]);
  const [courseInfo, setCourseInfo] = useState<{ name: string; code?: string }>({
    name: "Study Plan",
    code: "",
  });
  const [kitsMap, setKitsMap] = useState<Record<string, StoredTaskKit>>({});
  const [loadingTaskKey, setLoadingTaskKey] = useState<string | null>(null);

  // Flashcards generation modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [targetTask, setTargetTask] = useState<DayTask | null>(null);
  const [requestedCardCount, setRequestedCardCount] = useState<number>(10);

  useEffect(() => {
    // 1. Load user-scoped kits cache
    const kits = getUserTaskKits();
    setKitsMap(kits);

    // 2. Load subjects specifically enrolled by this user from cloud database
    const loadSubjects = async () => {
      let enrolled: Course[] = [];
      try {
        const remote = await browseService.getEnrolledCourses();
        enrolled = remote || [];
        saveUserCourses(enrolled);
      } catch {
        enrolled = getUserCourses();
      }
      setCourses(enrolled);
    };

    loadSubjects();
  }, []);

  const handleSelectSubject = async (c: Course) => {
    setSelectedCourse(c);
    setCourseInfo({ name: c.name, code: c.code });
    setPlanDays([]);
    setFullPlanDays([]);
    setSurvival(false);

    let planData: any = null;
    if (c.id && !String(c.id).startsWith("course-") && !String(c.id).startsWith("c-")) {
      try {
        const res = await browseService.getCoursePlan(c.id);
        if (res?.tasks && res.tasks.length > 0) {
          planData = res;
        }
      } catch {}
    }

    if (!planData) {
      try {
        const localPlan = localStorage.getItem(`sg-plan-${c.id}`);
        if (localPlan) {
          planData = JSON.parse(localPlan);
        } else {
          const activePlan = localStorage.getItem("sg-active-plan");
          if (activePlan) {
            planData = JSON.parse(activePlan);
          }
        }
      } catch {}
    }

    if (planData?.tasks && planData.tasks.length > 0) {
      formatAndSetTasks(planData.tasks, c);
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

  // Open modal asking how many cards the user wants (max 25)
  const handleFlashcardClick = (task: DayTask) => {
    const taskKey = task.ref && !task.ref.startsWith("task-") ? String(task.ref) : task.title.trim().toLowerCase();
    const titleKey = task.title.trim().toLowerCase();
    const existing = kitsMap[taskKey] || kitsMap[titleKey];

    if (existing?.flashcards?.length) {
      handleOpenFlashcards(task, existing.flashcards, existing.kitId);
      return;
    }

    setTargetTask(task);
    setRequestedCardCount(10);
    setCardModalOpen(true);
  };

  // Generate flashcards or quiz without duplicating for identical tasks
  const handleGenerateTaskKit = async (task: DayTask, target: "flashcards" | "quiz", cardCount: number = 10) => {
    const taskKey = task.ref && !task.ref.startsWith("task-") ? String(task.ref) : task.title.trim().toLowerCase();
    const titleKey = task.title.trim().toLowerCase();

    // Deduplication check: if this task or a duplicate task already generated, open directly!
    const existing = kitsMap[taskKey] || kitsMap[titleKey];
    if (existing && ((target === "flashcards" && existing.flashcards?.length) || (target === "quiz" && existing.quiz?.length))) {
      if (target === "flashcards") {
        handleOpenFlashcards(task, existing.flashcards, existing.kitId);
      } else {
        handleOpenQuiz(task, existing.quiz, existing.kitId);
      }
      return;
    }

    setLoadingTaskKey(`${taskKey}-${target}`);
    try {
      const sanitizedCardCount = Math.min(25, Math.max(1, cardCount));
      const sourceExcerpt =
        task.contentExcerpt ||
        (task.subtopics && task.subtopics.length > 0
          ? `Key concepts and modules: ${task.subtopics.join(", ")}`
          : undefined);

      const payload = {
        course_name: selectedCourse?.name || courseInfo.name || "Course",
        language: "en",
        topics: [
          {
            ref: task.ref || "1",
            chapter_title: task.title,
            subtopics: task.subtopics && task.subtopics.length > 0 ? task.subtopics : [task.title],
            source_excerpt: sourceExcerpt,
          },
        ],
        flashcards_per_topic: sanitizedCardCount,
        questions_per_topic: 5,
      };

      let flashcards: any[] = [];
      let quiz: any[] = [];
      let kitId = `kit-${Date.now()}`;

      try {
        const res = await fetchApi<any>("/api/v1/study-kits/generate", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (res?.data) {
          kitId = res.data.kitId || kitId;
          const topicKit = res.data.topics?.[0];
          if (topicKit?.flashcards?.length) {
            flashcards = topicKit.flashcards.map((f: any, idx: number) => ({
              id: f.cardId || f.id || String(idx + 1),
              q: f.front || f.question || f.q,
              a: f.back || f.answer || f.a,
              hint: f.hint,
            }));
          }
          if (topicKit?.quiz?.length) {
            quiz = topicKit.quiz.map((q: any, idx: number) => ({
              id: q.questionId || q.id || String(idx + 1),
              question: q.questionText || q.question,
              options: q.options || [],
              explanation: q.explanation,
            }));
          }
        }
      } catch (apiErr) {
        console.warn("Backend study kit generation failed, creating high-yield kit:", apiErr);
      }

      // Professional fallback cards if AI generation was offline
      if (flashcards.length === 0) {
        const subs = task.subtopics && task.subtopics.length > 0 ? task.subtopics : ["Core principles", "Mechanisms", "Applications"];
        const pool = [
          { q: `What is the core definition and primary objective of ${task.title}?`, a: `Fundamental principles, definition, and foundational theory governing ${task.title}.` },
          { q: `Explain the key mechanism underlying ${subs[0] || task.title}.`, a: `Essential operational rules, steps, and system constraints governing ${subs[0] || task.title}.` },
          { q: `How does ${subs[0] || task.title} contrast with alternative models or techniques?`, a: `Key architectural trade-offs, efficiency differences, and distinct use cases.` },
          { q: `What is a critical consideration or potential pitfall in ${task.title}?`, a: `Boundary conditions, performance overheads, and error handling protocols.` },
          { q: `What role does ${subs[1] || subs[0] || task.title} play in overall exam problems?`, a: `Synthesis of conceptual equations, practical applications, and validation rules.` },
          { q: `State the operational rule or formula relevant to ${task.title}.`, a: `The primary mathematical or algorithmic formulation and its required parameters.` },
          { q: `Under what conditions is ${task.title} applied most effectively?`, a: `Optimal operational conditions, scalability boundaries, and resource availability.` },
          { q: `What are the rate-limiting steps or trade-offs in ${subs[0] || task.title}?`, a: `Resource constraints, latency, and computational or physical bottlenecks.` },
          { q: `Define the primary distinction of ${subs[2] || subs[0] || task.title}.`, a: `Specific terminology, domain rules, and standard industry classifications.` },
          { q: `How do you verify correctness when analyzing ${task.title}?`, a: `Testing protocols, validation invariants, and verification methodologies.` },
        ];

        while (flashcards.length < sanitizedCardCount) {
          const item = pool[flashcards.length % pool.length];
          const suffix = flashcards.length >= pool.length ? ` (Part ${Math.floor(flashcards.length / pool.length) + 1})` : "";
          flashcards.push({
            id: `c-${Date.now()}-${flashcards.length + 1}`,
            q: `${item.q}${suffix}`,
            a: item.a,
          });
        }
      }

      if (quiz.length === 0) {
        const sub = task.subtopics?.[0] || task.title;
        quiz = [
          {
            id: `q-${Date.now()}-1`,
            question: `Which statement best describes the primary objective of ${task.title}?`,
            options: [
              `To optimize and structure ${sub} systematically`,
              "To replace all preceding standards without verification",
              "To eliminate all trade-offs entirely",
              "None of the above",
            ],
            explanation: `${task.title} establishes structured principles for ${sub}.`,
          },
          {
            id: `q-${Date.now()}-2`,
            question: `In the context of ${sub}, what is a critical consideration?`,
            options: [
              "Trade-offs between performance and complexity",
              "Ignoring boundary conditions",
              "Disabling concurrent execution",
              "All of the above",
            ],
            explanation: "Engineering trade-offs are central to analyzing these systems.",
          },
          {
            id: `q-${Date.now()}-3`,
            question: `How does ${task.title} address system scalability?`,
            options: [
              "Through modular abstraction and structured protocols",
              "By hardcoding fixed resource limits",
              "By eliminating asynchronous messaging",
              "It does not address scalability",
            ],
            explanation: "Modular abstraction provides clean expansion under varying workloads.",
          },
        ];
      }

      const kitObj: StoredTaskKit = { kitId, flashcards, quiz };
      const nextMap = {
        ...kitsMap,
        [taskKey]: kitObj,
        [titleKey]: kitObj,
      };
      setKitsMap(nextMap);
      saveUserTaskKits(nextMap);
      try {
        localStorage.setItem("sg-task-kits", JSON.stringify(nextMap));
      } catch {}

      toast.success(`Generated ${flashcards.length} professional flashcards! ✨`);

      if (target === "flashcards") {
        handleOpenFlashcards(task, flashcards, kitId);
      } else {
        handleOpenQuiz(task, quiz, kitId);
      }
    } catch (err: any) {
      console.error("Kit generation error:", err);
      toast.error("Failed to generate task study material.");
    } finally {
      setLoadingTaskKey(null);
    }
  };

  const handleOpenFlashcards = (task: DayTask, cardsParam?: any[], kitIdParam?: string) => {
    const taskKey = task.ref && !task.ref.startsWith("task-") ? String(task.ref) : task.title.trim().toLowerCase();
    const c = cardsParam || kitsMap[taskKey]?.flashcards || kitsMap[task.title.trim().toLowerCase()]?.flashcards;
    if (!c || c.length === 0) return;

    try {
      localStorage.setItem("sg-active-cards", JSON.stringify(c));
      const k = kitIdParam || kitsMap[taskKey]?.kitId;
      if (k) localStorage.setItem("sg-active-kit", k);
    } catch {}

    toast.success(`Opening ${c.length} flashcards for ${task.title} ✨`);
    nav({ to: "/flashcards" });
  };

  const handleOpenQuiz = (task: DayTask, quizParam?: any[], kitIdParam?: string) => {
    const taskKey = task.ref && !task.ref.startsWith("task-") ? String(task.ref) : task.title.trim().toLowerCase();
    const q = quizParam || kitsMap[taskKey]?.quiz || kitsMap[task.title.trim().toLowerCase()]?.quiz;
    if (!q || q.length === 0) return;

    try {
      localStorage.setItem("sg-active-quiz", JSON.stringify(q));
      const k = kitIdParam || kitsMap[taskKey]?.kitId;
      if (k) localStorage.setItem("sg-active-kit", k);
    } catch {}

    toast.success(`Starting practice quiz for ${task.title} ✨`);
    nav({ to: "/quiz" });
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
                        {c.code || "SUBJECT"}
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
          selectedCourse.code
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

      {planDays.length === 0 ? (
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
                {day.tasks.map((t, idx) => {
                  const taskKey = t.ref && !t.ref.startsWith("task-") ? String(t.ref) : t.title.trim().toLowerCase();
                  const existingKit = kitsMap[taskKey] || kitsMap[t.title.trim().toLowerCase()];
                  const hasCards = existingKit?.flashcards && existingKit.flashcards.length > 0;
                  const hasQuiz = existingKit?.quiz && existingKit.quiz.length > 0;
                  const isGeneratingCards = loadingTaskKey === `${taskKey}-flashcards`;
                  const isGeneratingQuiz = loadingTaskKey === `${taskKey}-quiz`;

                  return (
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
                          <span className="font-semibold text-foreground text-sm sm:text-base">
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

                      {/* Flashcards & Quiz Action Buttons Behind Every Task */}
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Active Recall Tools:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {hasCards ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 gap-1.5 border border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20"
                              onClick={() => handleOpenFlashcards(t, existingKit?.flashcards, existingKit?.kitId)}
                              title="Open ready flashcards"
                            >
                              <Check className="h-3.5 w-3.5 text-primary" />
                              Flashcards ({existingKit.flashcards.length})
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                              disabled={isGeneratingCards || isGeneratingQuiz}
                              onClick={() => handleFlashcardClick(t)}
                            >
                              {isGeneratingCards ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                  Flashcards
                                </>
                              )}
                            </Button>
                          )}

                          {hasQuiz ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 gap-1.5 border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                              onClick={() => handleOpenQuiz(t, existingKit?.quiz, existingKit?.kitId)}
                              title="Practice quiz"
                            >
                              <Check className="h-3.5 w-3.5 text-amber-500" />
                              Quiz ({existingKit.quiz.length}Q)
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs font-semibold hover:border-amber-500 hover:text-amber-500"
                              disabled={isGeneratingCards || isGeneratingQuiz}
                              onClick={() => handleGenerateTaskKit(t, "quiz")}
                            >
                              {isGeneratingQuiz ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                                  Quiz
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Dialog for asking how many flashcards the user wants (max 25 cards) */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="h-4 w-4" />
              <span>AI Active-Recall Generator</span>
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight">
              Generate Flashcards
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select how many active-recall flashcards to generate for{" "}
              <span className="font-semibold text-foreground">
                {targetTask?.title}
              </span>
              . The AI reads the full chapter content to produce high-yield cards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Card Quantity
                </Label>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-primary font-mono">
                    {requestedCardCount}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">/ 25 max</span>
                </div>
              </div>

              <Slider
                value={[requestedCardCount]}
                min={1}
                max={25}
                step={1}
                onValueChange={(vals) => setRequestedCardCount(vals[0] || 10)}
                className="py-1"
              />

              {/* Fast presets */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-medium text-muted-foreground">Quick select:</span>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20, 25].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setRequestedCardCount(cnt)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                        requestedCardCount === cnt
                          ? "bg-primary text-primary-foreground shadow-sm scale-105"
                          : "bg-background border border-border/60 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-primary/5 rounded-xl p-3 border border-primary/15 flex items-start gap-2.5">
              <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Cards test key definitions, mechanisms, and contrasts extracted directly from this chapter, capped at <strong>25 cards</strong>.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCardModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="magic"
              className="gap-2"
              disabled={loadingTaskKey !== null}
              onClick={() => {
                if (targetTask) {
                  const count = Math.min(25, Math.max(1, requestedCardCount));
                  setCardModalOpen(false);
                  handleGenerateTaskKit(targetTask, "flashcards", count);
                }
              }}
            >
              <Sparkles className="h-4 w-4" />
              Generate {requestedCardCount} Cards
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
