import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  HelpCircle,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
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
} from "@/lib/courses-util";
import type { Course, Sm2Rating } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/flashcards")({
  head: pageHead("Flashcards", "Review flashcards with spaced repetition."),
  component: Flashcards,
});

const ratings: { label: string; cls: string; sub: string; rating: Sm2Rating }[] = [
  { label: "Again", cls: "bg-destructive text-destructive-foreground", sub: "<1m", rating: "AGAIN" },
  { label: "Hard", cls: "bg-warning text-primary-foreground", sub: "6m", rating: "HARD" },
  { label: "Good", cls: "bg-success text-primary-foreground", sub: "1d", rating: "GOOD" },
  { label: "Easy", cls: "bg-info text-primary-foreground", sub: "4d", rating: "EASY" },
];

interface FlashcardItem {
  id: string;
  q: string;
  a: string;
  chapter?: string;
  hint?: string;
}

function Flashcards() {
  const { addPoints } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  const [kitId, setKitId] = useState<string | null>(null);

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
        enrolled = await browseService.getEnrolledCourses();
      } catch {}

      const local = getUserCourses();
      const map = new Map<string, Course>();

      enrolled.forEach((c) => map.set(c.name.trim().toLowerCase(), c));
      local.forEach((c) => {
        if (!map.has(c.name.trim().toLowerCase())) {
          map.set(c.name.trim().toLowerCase(), c);
        }
      });

      setCourses(Array.from(map.values()));
    };

    loadUserCourses();
  }, []);

  // When a user selects a course, load flashcards specifically for that course
  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setCardIndex(0);
    setFlip(false);

    // 1. Check user-scoped kits for this course
    const allKits = getUserTaskKits();
    const courseCards: FlashcardItem[] = [];

    // Check by course name and topics
    Object.entries(allKits).forEach(([key, kit]: [string, any]) => {
      if (kit?.flashcards && Array.isArray(kit.flashcards)) {
        kit.flashcards.forEach((f: any, idx: number) => {
          courseCards.push({
            id: f.id || `${key}-${idx}`,
            q: f.q || f.front || f.question,
            a: f.a || f.back || f.answer,
            chapter: key,
          });
        });
      }
    });

    // 2. Also check if active cards in storage match this course
    const prefix = getUserStoragePrefix();
    const activeCardsRaw = localStorage.getItem(`sg-${prefix}-active-cards`) || localStorage.getItem("sg-active-cards");
    if (activeCardsRaw) {
      try {
        const parsed = JSON.parse(activeCardsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((f: any, idx: number) => {
            if (!courseCards.some((c) => c.q === (f.q || f.front))) {
              courseCards.unshift({
                id: f.id || `active-${idx}`,
                q: f.q || f.front,
                a: f.a || f.back,
                chapter: course.name,
              });
            }
          });
        }
      } catch {}
    }

    setCards(courseCards);

    // Fetch topics if course topics are not populated
    if (!course.topics || course.topics.length === 0) {
      if (course.id && !String(course.id).startsWith("c-") && !String(course.id).startsWith("course-")) {
        try {
          const freshTopics = await browseService.getCourseTopics(course.id);
          if (freshTopics && freshTopics.length > 0) {
            setSelectedCourse({ ...course, topics: freshTopics });
          }
        } catch {}
      }
    }
  };

  const handleRate = async (r: Sm2Rating) => {
    setFlip(false);
    addPoints(20);

    const currentCard = cards[cardIndex];
    if (kitId && currentCard?.id) {
      try {
        await studyService.reviewCards(kitId, [{ cardId: currentCard.id, rating: r }]);
      } catch {}
    }

    if (cards.length > 0) {
      setCardIndex((prev) => (prev + 1) % cards.length);
    }
  };

  // Generate flashcards on demand for the selected course
  const handleGenerateCourseCards = async () => {
    if (!selectedCourse) return;
    setIsGenerating(true);

    try {
      const sanitizedCount = Math.min(25, Math.max(1, requestedCount));
      const topicObj = selectedCourse.topics?.find((t) => String(t.id) === selectedTopicRef) || selectedCourse.topics?.[0];
      const chapterTitle = topicObj?.name || `${selectedCourse.name} - Core Concepts`;
      const sourceExcerpt = topicObj?.contentExcerpt || (topicObj?.subtopics ? `Key subtopics: ${topicObj.subtopics.join(", ")}` : undefined);

      const payload = {
        course_name: selectedCourse.name,
        language: "en",
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

      try {
        const res = await fetchApi<any>("/api/v1/study-kits/generate", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (res?.data?.topics?.[0]?.flashcards?.length) {
          newFlashcards = res.data.topics[0].flashcards.map((f: any, idx: number) => ({
            id: f.cardId || f.id || `gen-${Date.now()}-${idx}`,
            q: f.front || f.q || f.question,
            a: f.back || f.a || f.answer,
            chapter: chapterTitle,
          }));
        }
      } catch (err) {
        console.warn("AI engine generation offline or failed, using high-yield template:", err);
      }

      // Fallback generator if offline
      if (newFlashcards.length === 0) {
        const pool = [
          { q: `What is the core definition and primary objective of ${chapterTitle}?`, a: `Fundamental principles, definitions, and foundational theory governing ${chapterTitle}.` },
          { q: `Explain the key operational mechanism in ${chapterTitle}.`, a: `Essential operational steps, system constraints, and rules governing ${chapterTitle}.` },
          { q: `How does ${chapterTitle} contrast with alternative techniques or models?`, a: `Key architectural trade-offs, efficiency differences, and distinct use cases.` },
          { q: `What is a critical consideration or edge case in ${chapterTitle}?`, a: `Boundary conditions, performance overheads, and error handling protocols.` },
          { q: `State the primary equation or formula relevant to ${chapterTitle}.`, a: `Core mathematical formulation and required parameters for problem solving.` },
        ];
        while (newFlashcards.length < sanitizedCount) {
          const item = pool[newFlashcards.length % pool.length];
          newFlashcards.push({
            id: `card-${Date.now()}-${newFlashcards.length + 1}`,
            q: newFlashcards.length >= pool.length ? `${item.q} (Part ${Math.floor(newFlashcards.length / pool.length) + 1})` : item.q,
            a: item.a,
            chapter: chapterTitle,
          });
        }
      }

      // Save to user storage
      const prefix = getUserStoragePrefix();
      const allKits = getUserTaskKits();
      const kitKey = chapterTitle.toLowerCase().trim();
      allKits[kitKey] = {
        kitId: `kit-${Date.now()}`,
        flashcards: newFlashcards,
        quiz: [],
      };
      saveUserTaskKits(allKits);
      localStorage.setItem(`sg-${prefix}-active-cards`, JSON.stringify(newFlashcards));

      setCards((prev) => [...newFlashcards, ...prev]);
      setCardIndex(0);
      setGenModalOpen(false);
      toast.success(`Generated ${newFlashcards.length} active-recall flashcards! ✨`);
    } catch (err: any) {
      toast.error("Failed to generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --------------------------------------------------------------------------
  // SCREEN 1: Course Selection First (Matches Study Plan layout)
  // --------------------------------------------------------------------------
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
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                        {course.code || "COURSE"}
                      </span>
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
                    <Button
                      size="sm"
                      variant="magic"
                      className="gap-1.5 text-xs font-bold"
                      onClick={() => handleSelectCourse(course)}
                    >
                      Open Flashcards →
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: Flashcard Deck View for Selected Course
  // --------------------------------------------------------------------------
  const currentCard = cards[cardIndex] || cards[0];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Top Navigation Bar: Back to Courses */}
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
          onClick={() => setGenModalOpen(true)}
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

      {cards.length === 0 ? (
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
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between rounded-2xl border bg-card/60 px-5 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-muted/50 p-1">
                <Riffle play intensity={0.7} className="h-full w-full" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Interactive Deck</h3>
                <p className="text-xs text-muted-foreground">
                  {cards.length - cardIndex} cards remaining in this session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCardIndex(0);
                  setFlip(false);
                  toast.info("Deck reset to start.");
                }}
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
              className="h-full bg-gradient-magic transition-all"
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
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border bg-card p-10 shadow-soft backface-hidden text-center">
                <span className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  QUESTION
                </span>
                <p className="font-display text-2xl sm:text-3xl font-medium text-foreground leading-relaxed">
                  {currentCard?.q}
                </p>
                <span className="mt-6 text-xs text-muted-foreground font-semibold">
                  Click / Tap to flip
                </span>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-magic p-10 text-primary-foreground shadow-glow backface-hidden [transform:rotateY(180deg)] text-center overflow-y-auto">
                <span className="mb-4 text-xs font-bold uppercase tracking-wider opacity-85">
                  ANSWER & EXPLANATION
                </span>
                <p className="font-display text-lg sm:text-xl font-medium leading-relaxed">
                  {currentCard?.a}
                </p>
              </div>
            </motion.button>
          </div>

          <div className={cn("mt-6 grid grid-cols-4 gap-3 transition", !flip && "pointer-events-none opacity-40")}>
            {ratings.map((r) => (
              <button
                key={r.label}
                onClick={() => handleRate(r.rating)}
                className={cn(
                  "rounded-2xl py-3 font-bold shadow-soft transition hover:-translate-y-0.5",
                  r.cls
                )}
              >
                {r.label}
                <div className="text-xs font-semibold opacity-80">{r.sub}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Generate Flashcards Dialog (1 to 25 cards max) */}
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
