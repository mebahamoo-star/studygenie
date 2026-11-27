import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Lock,
  Plus,
  Upload,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { playCelebrationSound } from "@/lib/sound";
import { toast } from "sonner";
import { Riffle } from "@lucasmarkes/hairline/react";
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
import { browseService, studyService } from "@/lib/api/services";
import { fetchApi } from "@/lib/api/client";
import { useApp } from "@/lib/app-state";
import {
  getUserCourses,
  getUserStoragePrefix,
  getUserTaskKits,
  saveUserTaskKits,
  isCourseMaterialUploaded,
} from "@/lib/courses-util";
import type { Course, ProgressResponse, Sm2Rating } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/flashcards")({
  head: pageHead("Flashcards", "Review flashcards with spaced repetition."),
  component: Flashcards,
});

const ratings: { label: string; keyHint: string; cls: string; sub: string; rating: Sm2Rating }[] = [
  { label: "Again", keyHint: "1", cls: "bg-destructive text-destructive-foreground", sub: "<1m", rating: "AGAIN" },
  { label: "Hard", keyHint: "2", cls: "bg-warning text-primary-foreground", sub: "6m", rating: "HARD" },
  { label: "Good", keyHint: "3", cls: "bg-success text-primary-foreground", sub: "1d", rating: "GOOD" },
  { label: "Easy", keyHint: "4", cls: "bg-info text-primary-foreground", sub: "4d", rating: "EASY" },
];

interface FlashcardItem {
  id: string;
  q: string;
  a: string;
  chapter?: string | undefined;
  hint?: string | undefined;
  isDue?: boolean | undefined;
  requeued?: boolean | undefined;
}

function isRtlContent(text?: string, langHint?: string): boolean {
  if (langHint === "ar") return true;
  return Boolean(text && /[\u0600-\u06FF]/.test(text));
}

function Flashcards() {
  const { refreshGamification, lang } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  const [kitId, setKitId] = useState<string | null>(null);
  const [kitLang, setKitLang] = useState<"en" | "ar">(lang === "ar" ? "ar" : "en");
  const [genLanguage, setGenLanguage] = useState<"en" | "ar">(lang === "ar" ? "ar" : "en");
  const [deckProgress, setDeckProgress] = useState<ProgressResponse | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    totalPoints: 0,
  });

  // Track cards already rated against the backend in this session so requeued "Again" cards aren't double-submitted
  const reviewedOnServerRef = useRef<Set<string>>(new Set());

  // Generate more modal state
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [requestedCount, setRequestedCount] = useState<number>(10);
  const [selectedTopicRef, setSelectedTopicRef] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Load enrolled courses for the authenticated user
  useEffect(() => {
    const loadUserCourses = async () => {
      let enrolled: Course[] = [];
      try {
        const remote = await browseService.getEnrolledCourses();
        enrolled = remote || [];
      } catch {
        enrolled = getUserCourses();
      }
      if (enrolled.length === 0) {
        enrolled = getUserCourses();
      }
      setCourses(enrolled);
    };

    loadUserCourses();
  }, []);

  const refreshDeckMeta = useCallback(async (activeKitId: string, loadedCards: FlashcardItem[]) => {
    const [progRes, dueRes] = await Promise.allSettled([
      studyService.getProgress(activeKitId),
      studyService.getDueCards(activeKitId, 200),
    ]);

    if (progRes.status === "fulfilled" && progRes.value) {
      setDeckProgress(progRes.value);
    }

    if (dueRes.status === "fulfilled" && Array.isArray(dueRes.value)) {
      const dueOrder = new Map<string, number>();
      dueRes.value.forEach((d: any, idx: number) => {
        if (d?.cardId) dueOrder.set(String(d.cardId), idx);
      });

      const sorted = [...loadedCards]
        .map((c) => ({ ...c, isDue: dueOrder.has(c.id) }))
        .sort((a, b) => {
          const aDue = dueOrder.has(a.id);
          const bDue = dueOrder.has(b.id);
          if (aDue && !bDue) return -1;
          if (!aDue && bDue) return 1;
          if (aDue && bDue) return (dueOrder.get(a.id) ?? 0) - (dueOrder.get(b.id) ?? 0);
          return 0;
        });
      return sorted;
    }
    return loadedCards;
  }, []);

  // Load flashcards strictly scoped by courseId (no fuzzy name matching or global fallback)
  const handleSelectCourse = async (course: Course) => {
    if (!isCourseMaterialUploaded(course)) {
      toast.warning(`Cannot generate flashcards: Please upload the syllabus for "${course.name}" first.`);
    }
    setSelectedCourse(course);
    setKitId(null);
    setDeckProgress(null);
    setCardIndex(0);
    setFlip(false);
    setSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, totalPoints: 0 });
    reviewedOnServerRef.current = new Set();

    let courseCards: FlashcardItem[] = [];
    let resolvedKitId: string | null = null;
    let resolvedLang: "en" | "ar" = lang === "ar" ? "ar" : "en";
    const isRealId = course.id && !String(course.id).startsWith("c-") && !String(course.id).startsWith("course-");

    // 1. Load persisted study kits from server scoped by courseId
    if (isRealId) {
      try {
        const serverKits = await studyService.getStudyKits(course.id);
        if (Array.isArray(serverKits) && serverKits.length > 0) {
          const primaryKit = serverKits.find((sk: any) =>
            (sk.topics || []).some((t: any) => Array.isArray(t.flashcards) && t.flashcards.length > 0)
          ) || serverKits[0];
          resolvedKitId = primaryKit?.kitId || null;
          if (primaryKit?.language === "ar" || primaryKit?.language === "en") {
            resolvedLang = primaryKit.language;
          }
          if (primaryKit?.topics) {
            primaryKit.topics.forEach((tk: any) => {
              (tk.flashcards || []).forEach((fc: any) => {
                if (fc.front && !courseCards.some((c) => c.id === fc.cardId)) {
                  courseCards.push({
                    id: fc.cardId,
                    q: fc.front,
                    a: fc.back,
                    chapter: tk.chapterTitle || course.name,
                  });
                }
              });
            });
          }
        }
      } catch {}
    }

    // 2. Fallback strictly by courseId in user-scoped cache (no fuzzy name matching, no global sg-active-cards)
    if (courseCards.length === 0) {
      const allKits = getUserTaskKits();
      const exactKey = `course-${String(course.id)}`;
      const courseKit = allKits[exactKey];
      if (courseKit?.flashcards && Array.isArray(courseKit.flashcards)) {
        if (courseKit.kitId && !String(courseKit.kitId).startsWith("kit-") && !String(courseKit.kitId).startsWith("local-")) {
          resolvedKitId = courseKit.kitId;
        }
        if (courseKit.language === "ar" || courseKit.language === "en") {
          resolvedLang = courseKit.language;
        }
        courseKit.flashcards.forEach((f: any, idx: number) => {
          courseCards.push({
            id: f.cardId || f.id || `${exactKey}-${idx}`,
            q: f.q || f.front || f.question,
            a: f.a || f.back || f.answer,
            chapter: f.chapter || course.name,
          });
        });
      }
    }

    setKitId(resolvedKitId);
    setKitLang(resolvedLang);

    if (resolvedKitId && courseCards.length > 0) {
      courseCards = await refreshDeckMeta(resolvedKitId, courseCards);
    }

    const targetSessionLimit = Math.min(25, Math.max(1, requestedCount || 10));
    setCards(courseCards.slice(0, targetSessionLimit));

    if (!course.topics || course.topics.length === 0) {
      if (isRealId) {
        try {
          const freshTopics = await browseService.getCourseTopics(course.id);
          if (freshTopics && freshTopics.length > 0) {
            setSelectedCourse({ ...course, topics: freshTopics });
          }
        } catch {}
      }
    }
  };

  const handleRate = useCallback(async (r: Sm2Rating) => {
    const currentCard = cards[cardIndex];
    if (!currentCard) return;

    setFlip(false);
    const ratingKey = r.toLowerCase() as "again" | "hard" | "good" | "easy";
    let earnedThisCard = 0;

    if (kitId && currentCard.id && !reviewedOnServerRef.current.has(currentCard.id)) {
      reviewedOnServerRef.current.add(currentCard.id);
      try {
        const res = await studyService.reviewCards(kitId, [{ cardId: currentCard.id, rating: r }]);
        if (res.counted > 0 && (r === "GOOD" || r === "EASY")) {
          earnedThisCard = 20;
        }
        const prog = await studyService.getProgress(kitId).catch(() => null);
        if (prog) setDeckProgress(prog);
        await refreshGamification();
      } catch {}
    }

    setSessionStats((prev) => ({
      ...prev,
      [ratingKey]: (prev[ratingKey] || 0) + 1,
      totalPoints: prev.totalPoints + earnedThisCard,
    }));

    if (r === "AGAIN") {
      // Requeue "Again" cards at the end of the current session queue
      setCards((prev) => [...prev, { ...currentCard, requeued: true }]);
      setCardIndex((prev) => prev + 1);
      toast.info("Card requeued for later in this session.");
      return;
    }

    if (cardIndex + 1 < cards.length) {
      setCardIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
      try {
        playCelebrationSound();
      } catch {}
      toast.success("Deck completed! Fantastic job! 🎉");
    }
  }, [cards, cardIndex, kitId, refreshGamification]);

  // Keyboard shortcuts: Space to flip, 1-4 to rate when flipped
  useEffect(() => {
    if (!selectedCourse || cards.length === 0 || sessionCompleted || genModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setFlip((f) => !f);
        return;
      }

      if (!flip) return;
      if (e.key === "1") {
        e.preventDefault();
        handleRate("AGAIN");
      } else if (e.key === "2") {
        e.preventDefault();
        handleRate("HARD");
      } else if (e.key === "3") {
        e.preventDefault();
        handleRate("GOOD");
      } else if (e.key === "4") {
        e.preventDefault();
        handleRate("EASY");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCourse, cards.length, sessionCompleted, genModalOpen, flip, handleRate]);

  const handleRestartDeck = () => {
    setCardIndex(0);
    setFlip(false);
    setSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, totalPoints: 0 });
    reviewedOnServerRef.current = new Set();
    toast.info("Deck reset. Starting fresh session! ✨");
  };

  // Generate flashcards on demand for the selected course
  const handleGenerateCourseCards = async () => {
    if (!selectedCourse) return;
    if (!isCourseMaterialUploaded(selectedCourse) || !selectedCourse.topics || selectedCourse.topics.length === 0) {
      toast.warning(`Cannot generate flashcards: Please upload the course syllabus for "${selectedCourse.name}" first.`);
      setIsGenerating(false);
      return;
    }
    setIsGenerating(true);

    try {
      const sanitizedCount = Math.min(25, Math.max(1, requestedCount));
      const topicObj = selectedCourse.topics?.find((t) => String(t.id) === selectedTopicRef) || selectedCourse.topics?.[0];
      const chapterTitle = topicObj?.name || `${selectedCourse.name} - Core Concepts`;
      const sourceExcerpt = topicObj?.contentExcerpt || (topicObj?.subtopics ? `Key subtopics: ${topicObj.subtopics.join(", ")}` : undefined);

      const payload = {
        course_id: typeof selectedCourse.id === "number" ? selectedCourse.id : undefined,
        course_name: selectedCourse.name,
        language: genLanguage,
        topics: [
          {
            ref: topicObj?.id ? String(topicObj.id) : "1",
            chapter_title: chapterTitle,
            subtopics: topicObj?.subtopics || [chapterTitle],
            source_excerpt: sourceExcerpt,
          },
        ],
        flashcards_per_topic: sanitizedCount,
        questions_per_topic: 5,
      };

      let newFlashcards: FlashcardItem[] = [];
      let serverKitId: string | null = null;

      try {
        const res = await fetchApi<any>("/api/v1/study-kits/generate", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        serverKitId = res?.data?.kitId || null;
        if (res?.data?.topics?.[0]?.flashcards?.length) {
          newFlashcards = res.data.topics[0].flashcards.slice(0, sanitizedCount).map((f: any, idx: number) => ({
            id: f.cardId || f.id || `gen-${Date.now()}-${idx}`,
            q: f.front || f.q || f.question,
            a: f.back || f.a || f.answer,
            chapter: chapterTitle,
          }));
        }
      } catch (err) {
        console.warn("AI engine generation failed:", err);
      }

      if (newFlashcards.length === 0) {
        toast.error("Could not generate flashcards from syllabus. Please ensure the syllabus contains readable chapter text.");
        setIsGenerating(false);
        return;
      }

      const prefix = getUserStoragePrefix();
      const allKits = getUserTaskKits();
      const kitKey = `course-${String(selectedCourse.id)}`;
      allKits[kitKey] = {
        kitId: serverKitId,
        courseId: selectedCourse.id,
        language: genLanguage,
        flashcards: newFlashcards,
        quiz: [],
      };
      saveUserTaskKits(allKits);
      localStorage.setItem(`sg-${prefix}-active-kit-lang`, genLanguage);
      localStorage.setItem("sg-active-kit-lang", genLanguage);
      setKitLang(genLanguage);
      if (serverKitId) {
        localStorage.setItem(`sg-${prefix}-course-kit-${selectedCourse.id}`, serverKitId);
        setKitId(serverKitId);
        newFlashcards = await refreshDeckMeta(serverKitId, newFlashcards);
      }

      reviewedOnServerRef.current = new Set();
      newFlashcards = newFlashcards.slice(0, sanitizedCount);
      setCards(newFlashcards);
      setCardIndex(0);
      setFlip(false);
      setSessionCompleted(false);
      setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, totalPoints: 0 });
      setGenModalOpen(false);
      toast.success(`Generated ${newFlashcards.length} active-recall flashcards! ✨`);
    } catch {
      toast.error("Failed to generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!selectedCourse) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageTitle
          title="Flashcards"
          sub="Select a subject to practice active-recall flashcards with spaced repetition."
        />

        {courses.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 ring-4 ring-amber-500/20">
              <Lock className="h-8 w-8" />
            </div>
            <Genie pose="low" className="mb-4 h-24 w-24" />
            <h2 className="text-2xl font-semibold text-foreground">No Courses Added Yet</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Enroll in a course or upload your syllabus slides to generate personalized active-recall flashcards.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="magic" size="lg" asChild>
                <Link to="/courses">
                  <Plus className="mr-2 h-4 w-4" /> Add a Course
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const chCount = course.topics?.length || 0;
              return (
                <Card
                  key={course.id || course.name}
                  className="group relative flex flex-col justify-between overflow-hidden border-border/60 p-5 transition hover:border-primary/40 hover:shadow-soft"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      {course.code && course.code.toUpperCase() !== "CUSTOM" ? (
                        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                          {course.code}
                        </span>
                      ) : <span />}

                      <StatusBadge status={course.status} />
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                        {course.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {chCount > 0 ? `${chCount} Chapters / Topics` : "Course Ready"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border/40 pt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Active Recall
                    </span>
                    {isCourseMaterialUploaded(course) ? (
                      <Button
                        size="sm"
                        variant="magic"
                        className="gap-1.5 text-xs font-bold"
                        onClick={() => handleSelectCourse(course)}
                      >
                        Open Flashcards →
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        asChild
                      >
                        <Link to="/courses">
                          <Lock className="h-3 w-3" /> Upload Syllabus
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

  const currentCard = cards[cardIndex] || cards[0];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
          onClick={() => setSelectedCourse(null)}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Courses
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs font-bold border border-primary/20 text-primary"
          onClick={() => {
            if (!isCourseMaterialUploaded(selectedCourse)) {
              toast.warning(`Cannot generate flashcards: Please upload the course syllabus for "${selectedCourse.name}" first.`);
              return;
            }
            setGenModalOpen(true);
          }}
        >
          <Sparkles className="h-3.5 w-3.5" /> + Generate Cards (1-25)
        </Button>
      </div>

      <PageTitle
        title={selectedCourse.name}
        sub={currentCard?.chapter || "Active Recall Flashcards Deck"}
        right={
          cards.length > 0 ? (
            <span className="rounded-xl bg-card px-3 py-2 text-sm font-bold shadow-soft">
              Card {cardIndex + 1} of {cards.length}
            </span>
          ) : undefined
        }
      />

      {!isCourseMaterialUploaded(selectedCourse) ? (
        <Card className="flex flex-col items-center justify-center py-16 px-6 text-center border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-soft">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-4 ring-amber-500/10">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Course Syllabus Not Uploaded</h2>
          <p className="mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
            Active-recall flashcards cannot be generated without syllabus material. Please upload your course syllabus or lecture slides for <strong>{selectedCourse.name}</strong> to automatically extract topics and unlock flashcards.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="magic" size="default" asChild className="gap-2 font-bold shadow-soft">
              <Link to="/courses">
                <Upload className="h-4 w-4" /> Upload Course Material
              </Link>
            </Button>
            <Button variant="outline" size="default" onClick={() => setSelectedCourse(null)}>
              Back to Courses
            </Button>
          </div>
        </Card>
      ) : cards.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Genie pose="mid" className="mb-4 h-24 w-24" />
          <h2 className="text-xl font-semibold text-foreground">No Flashcards Generated Yet</h2>
          <p className="mt-1 max-w-sm text-sm">
            Generate your first active-recall deck for this course based on its chapters and content.
          </p>
          <Button
            variant="magic"
            className="mt-6 gap-2"
            onClick={() => setGenModalOpen(true)}
          >
            <Sparkles className="h-4 w-4" /> Generate Flashcards Now
          </Button>
        </Card>
      ) : sessionCompleted ? (
        <Card className="flex flex-col items-center justify-center py-12 px-6 text-center shadow-soft border-primary/30 bg-card">
          <div className="relative mb-4">
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Genie pose="high" className="relative h-24 w-24 animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            <CheckCircle2 className="h-3.5 w-3.5" /> Deck Completed
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Study Session Complete! 🎉
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            You completed active-recall flashcards for <span className="font-semibold text-foreground">{selectedCourse.name}</span>.
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-md">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
              <div className="font-display text-xl font-bold text-primary">
                +{sessionStats.totalPoints}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Points Earned</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <div className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {sessionStats.easy + sessionStats.good}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Mastered</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <div className="font-display text-xl font-bold text-amber-600 dark:text-amber-400">
                {sessionStats.hard}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Hard</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
              <div className="font-display text-xl font-bold text-rose-600 dark:text-rose-400">
                {sessionStats.again}
              </div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Review Again</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <Button
              variant="magic"
              size="lg"
              className="w-full gap-2 font-bold shadow-soft"
              onClick={handleRestartDeck}
            >
              <RotateCcw className="h-4 w-4" /> Review Deck Again
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2 font-semibold"
              onClick={() => setSelectedCourse(null)}
            >
              <ArrowLeft className="h-4 w-4" /> Other Courses
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary gap-1"
              asChild
            >
              <Link to="/quiz">
                <Brain className="h-3.5 w-3.5" /> Practice Quiz →
              </Link>
            </Button>
            <span className="text-muted-foreground/40">•</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary gap-1"
              onClick={() => setGenModalOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate More Cards
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {deckProgress && (
            <div className="mb-4 grid grid-cols-4 gap-2 text-center" data-testid="deck-progress-counts">
              <div className="rounded-xl border border-border/60 bg-card/80 px-2 py-2">
                <div className="font-display text-base font-bold text-blue-600 dark:text-blue-400">{deckProgress.newCards}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">New</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/80 px-2 py-2">
                <div className="font-display text-base font-bold text-amber-600 dark:text-amber-400">{deckProgress.learningCards}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Learning</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/80 px-2 py-2">
                <div className="font-display text-base font-bold text-emerald-600 dark:text-emerald-400">{deckProgress.matureCards}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Mature</div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-2 py-2">
                <div className="font-display text-base font-bold text-primary">{deckProgress.dueToday}</div>
                <div className="text-[10px] font-bold uppercase text-primary/80">Due Today</div>
              </div>
            </div>
          )}

          <div className="mb-5 flex items-center justify-between rounded-2xl border bg-card/60 px-5 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-muted/50 p-1">
                <Riffle play intensity={0.7} className="h-full w-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Interactive Deck</h3>
                  {currentCard?.isDue && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Due Now
                    </span>
                  )}
                  {currentCard?.requeued && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      Requeued
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cards.length - cardIndex} {cards.length - cardIndex === 1 ? "card" : "cards"} remaining in this session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleRestartDeck}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                ✨ SM-2 Spaced Repetition
              </span>
            </div>
          </div>

          <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-magic transition-all duration-300"
              style={{ width: `${((cardIndex + 1) / cards.length) * 100}%` }}
            />
          </div>

          <div className="[perspective:1200px]">
            <motion.button
              onClick={() => setFlip(!flip)}
              animate={{ rotateY: flip ? 180 : 0 }}
              transition={{ duration: 0.5 }}
              className="relative h-80 w-full preserve-3d cursor-pointer text-left"
            >
              <div
                dir={isRtlContent(currentCard?.q, kitLang) ? "rtl" : "ltr"}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border bg-card p-10 shadow-soft backface-hidden text-center"
              >
                <span className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  QUESTION
                </span>
                <p className="font-display text-2xl sm:text-3xl font-medium text-foreground leading-relaxed">
                  {currentCard?.q}
                </p>
                <span className="mt-6 text-xs text-muted-foreground font-semibold">
                  Click / Tap or press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> to flip
                </span>
              </div>
              <div
                dir={isRtlContent(currentCard?.a, kitLang) ? "rtl" : "ltr"}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-magic p-10 text-primary-foreground shadow-glow backface-hidden [transform:rotateY(180deg)] text-center overflow-y-auto"
              >
                <span className="mb-4 text-xs font-bold uppercase tracking-wider opacity-85">
                  ANSWER & EXPLANATION
                </span>
                <p className="font-display text-lg sm:text-xl font-medium leading-relaxed">
                  {currentCard?.a}
                </p>
              </div>
            </motion.button>
          </div>

          <div className="mt-4 flex items-center justify-between px-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={cardIndex === 0}
              onClick={() => {
                setFlip(false);
                setCardIndex((prev) => Math.max(0, prev - 1));
              }}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous Card
            </Button>

            <span className="text-xs font-semibold text-muted-foreground">
              Card {cardIndex + 1} of {cards.length}
            </span>

            <Button
              variant="ghost"
              size="sm"
              disabled={cardIndex >= cards.length - 1}
              onClick={() => {
                setFlip(false);
                setCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
              }}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Next Card <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className={cn("mt-4 grid grid-cols-4 gap-3 transition", !flip && "pointer-events-none opacity-40")}>
            {ratings.map((r) => (
              <button
                key={r.label}
                onClick={() => handleRate(r.rating)}
                className={cn(
                  "rounded-2xl py-3 font-bold shadow-soft transition hover:-translate-y-0.5 relative",
                  r.cls
                )}
              >
                <span className="absolute right-2 top-1.5 text-[10px] font-mono opacity-75">{r.keyHint}</span>
                {r.label}
                <div className="text-xs font-semibold opacity-80">{r.sub}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog open={genModalOpen} onOpenChange={setGenModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="h-4 w-4" />
              <span>AI Flashcards Generator</span>
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight">
              Generate Flashcards for {selectedCourse?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose how many active-recall cards to create (up to 25 cards max). The AI reads the full chapter content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Language
              </Label>
              <div className="inline-flex items-center rounded-lg border border-border/70 bg-background p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setGenLanguage("en")}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition",
                    genLanguage === "en" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setGenLanguage("ar")}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition",
                    genLanguage === "ar" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  العربية (Arabic)
                </button>
              </div>
            </div>

            {selectedCourse?.topics && selectedCourse.topics.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Select Chapter / Topic
                </Label>
                <select
                  value={selectedTopicRef}
                  onChange={(e) => setSelectedTopicRef(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">All Topics (Comprehensive Deck)</option>
                  {selectedCourse.topics.map((t, idx) => (
                    <option key={t.id || idx} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Card Quantity
                </Label>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-primary font-mono">
                    {requestedCount}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">/ 25 max</span>
                </div>
              </div>

              <Slider
                value={[requestedCount]}
                min={1}
                max={25}
                step={1}
                onValueChange={(vals) => setRequestedCount(vals[0] || 10)}
                className="py-1"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-medium text-muted-foreground">Quick select:</span>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20, 25].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setRequestedCount(cnt)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                        requestedCount === cnt
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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setGenModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="magic"
              className="gap-2"
              disabled={isGenerating}
              onClick={handleGenerateCourseCards}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate {requestedCount} Cards
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
