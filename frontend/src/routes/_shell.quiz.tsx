import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, Plus, RotateCcw, Upload, XCircle } from "lucide-react";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { pageHead } from "@/lib/head";
import { studyService } from "@/lib/api/services";
import type { ClientQuizQuestion, QuizQuestionResult } from "@/lib/api/types";
import { useApp } from "@/lib/app-state";
import {
  hasUserEnrolledCourses,
  hasUserUploadedMaterial,
  getUserStoragePrefix,
  getActiveCourse,
  saveQuizScore,
  getQuizScores,
  getLastQuizScore,
  type SavedQuizScore,
} from "@/lib/courses-util";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/quiz")({
  head: pageHead("Quiz", "Test yourself with active recall quizzes: multiple choice, true/false, and short answer."),
  component: Quiz,
});

interface QuestionItem {
  id: string;
  type?: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | string;
  q: string;
  options?: string[];
  chapter?: string | undefined;
}

interface AnswerSubmission {
  questionId: string;
  selectedOptionIndex?: number | null;
  answerText?: string | null;
  selfAssessedCorrect?: boolean | null;
}

function mapClientQuestion(q: ClientQuizQuestion): QuestionItem {
  const qType = (q.type || "MCQ").toUpperCase();
  return {
    id: q.questionId,
    type: qType,
    q: q.question,
    options: qType === "SHORT_ANSWER" ? [] : q.options || [],
    chapter: q.chapterTitle || undefined,
  };
}

function Quiz() {
  const { refreshGamification } = useApp();
  const [hasCourses, setHasCourses] = useState<boolean | null>(null);
  const [hasMaterial, setHasMaterial] = useState<boolean | null>(null);
  const [kitId, setKitId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [shortInput, setShortInput] = useState("");
  const [shortSubmitted, setShortSubmitted] = useState(false);
  const [gradingQuestion, setGradingQuestion] = useState(false);
  const [questionResults, setQuestionResults] = useState<Record<string, QuizQuestionResult>>({});
  const [score, setScore] = useState(0);
  const [xpAwardedThisSession, setXpAwardedThisSession] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<AnswerSubmission[]>([]);
  const [pastScores, setPastScores] = useState<SavedQuizScore[]>([]);
  const [lastSavedScore, setLastSavedScore] = useState<SavedQuizScore | null>(null);
  const isFinishingRef = useRef(false);

  useEffect(() => {
    const enrolled = hasUserEnrolledCourses();
    const uploaded = hasUserUploadedMaterial();
    setHasCourses(enrolled);
    setHasMaterial(uploaded);
    setPastScores(getQuizScores());
    setLastSavedScore(getLastQuizScore());

    if (enrolled) {
      try {
        const prefix = getUserStoragePrefix();
        const savedKit =
          localStorage.getItem(`sg-${prefix}-active-kit`) ||
          localStorage.getItem("sg-active-kit");
        const validServerKit =
          savedKit && !savedKit.startsWith("local-") && !savedKit.startsWith("kit-")
            ? savedKit
            : null;

        if (validServerKit) {
          setKitId(validServerKit);
          studyService
            .getQuizQuestions(validServerKit)
            .then((qs) => {
              if (Array.isArray(qs) && qs.length > 0) {
                setQuestions(qs.map(mapClientQuestion));
                return;
              }
              const activeQuizRaw =
                localStorage.getItem(`sg-${prefix}-active-quiz`) ||
                localStorage.getItem("sg-active-quiz");
              if (activeQuizRaw) {
                const parsed = JSON.parse(activeQuizRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setQuestions(parsed);
                }
              }
            })
            .catch(() => {
              const activeQuizRaw =
                localStorage.getItem(`sg-${prefix}-active-quiz`) ||
                localStorage.getItem("sg-active-quiz");
              if (activeQuizRaw) {
                try {
                  const parsed = JSON.parse(activeQuizRaw);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setQuestions(parsed);
                  }
                } catch {}
              }
            });
          return;
        }

        const activeQuizRaw =
          localStorage.getItem(`sg-${prefix}-active-quiz`) ||
          localStorage.getItem("sg-active-quiz");
        if (activeQuizRaw) {
          const parsedQuestions = JSON.parse(activeQuizRaw);
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            setQuestions(parsedQuestions);
          }
        }
      } catch {}
    }
  }, []);

  const handleFinish = async () => {
    if (finished || isFinishingRef.current) return;
    isFinishingRef.current = true;

    let finalScore = Object.values(questionResults).filter((r) => r.correct).length;
    let total = questions.length;
    let pct = total > 0 ? Math.round((finalScore / total) * 100) : 0;
    let earnedXp = 0;

    if (kitId) {
      try {
        const res = await studyService.submitQuiz(kitId, answers);
        finalScore = res.score;
        total = res.total || questions.length;
        pct = Math.round(res.percentage);
        earnedXp = res.xpEligible ? res.score * 50 : 0;

        if (Array.isArray(res.results)) {
          const merged: Record<string, QuizQuestionResult> = {};
          res.results.forEach((r) => {
            merged[r.questionId] = r;
          });
          setQuestionResults((prev) => ({ ...prev, ...merged }));
        }
        await refreshGamification();
      } catch (err: any) {
        toast.error(err?.message || "Failed to grade quiz on the server.");
        isFinishingRef.current = false;
        return;
      }
    }

    setScore(finalScore);
    setXpAwardedThisSession(earnedXp);
    setFinished(true);

    const prefix = getUserStoragePrefix();
    const activeCourse = getActiveCourse();
    const courseName =
      activeCourse?.name ||
      localStorage.getItem(`sg-${prefix}-active-course-name`) ||
      localStorage.getItem("sg-active-course-name") ||
      "Course Practice";

    const scoreRecord: SavedQuizScore = {
      id: `quiz-${Date.now()}`,
      date: new Date().toISOString(),
      courseName,
      score: finalScore,
      total,
      percentage: pct,
      xpAwarded: earnedXp,
    };

    saveQuizScore(scoreRecord);
    setLastSavedScore(scoreRecord);
    setPastScores(getQuizScores());
    if (earnedXp > 0) {
      toast.success(`Quiz passed! Server awarded +${earnedXp} XP (${finalScore}/${total}) ✨`);
    } else {
      toast.success(`Quiz submitted (${finalScore}/${total}) ✨`);
    }
  };

  if (hasCourses === false) {
    return (
      <div className="mx-auto max-w-xl">
        <PageTitle title="Quiz" sub="Active Recall Practice" />
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 ring-4 ring-amber-500/20">
            <Lock className="h-8 w-8" />
          </div>
          <Genie pose="low" className="mb-4 h-24 w-24" />
          <h2 className="text-2xl font-semibold text-foreground">Course Required</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            You haven't chosen or added any courses yet. Quizzes are generated from your course topics and syllabi.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="magic" size="lg" asChild>
              <Link to="/courses">
                <Plus className="mr-2 h-4 w-4" /> Add a Course First
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (hasMaterial === false) {
    return (
      <div className="mx-auto max-w-xl">
        <PageTitle title="Quiz" sub="Active Recall Practice" />
        <Card className="flex flex-col items-center justify-center py-16 px-6 text-center border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-soft">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-4 ring-amber-500/10">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Course Syllabus Required</h2>
          <p className="mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
            Practice quizzes cannot be generated without syllabus material. Please upload your course syllabus or slide decks to automatically extract chapters and unlock practice quizzes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="magic" size="default" asChild className="gap-2 font-bold shadow-soft">
              <Link to="/courses">
                <Upload className="h-4 w-4" /> Upload Course Material
              </Link>
            </Button>
            <Button variant="outline" size="default" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageTitle title="Quiz" sub="Active Recall Practice" />
        <Card className="flex flex-col items-center py-10 text-center">
          <Genie pose="mid" className="mb-4 h-24 w-24" />
          <h2 className="text-xl font-semibold text-foreground">
            {pastScores.length > 0 ? "Saved Quiz History" : "No active quizzes"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {pastScores.length > 0
              ? `You have completed and saved ${pastScores.length} quizzes. Select a course to generate a new quiz!`
              : "Once you enroll in courses and generate a study kit, quizzes will appear here to test your retention and earn XP."}
          </p>

          {pastScores.length > 0 && (
            <div className="mt-6 w-full rounded-xl border border-border bg-card/60 p-4 text-left">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <span>Completed Quiz Scores</span>
                <span>{pastScores.length} Saved</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pastScores.map((ps, idx) => (
                  <div
                    key={ps.id || idx}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{ps.courseName || "Practice Quiz"}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {new Date(ps.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {ps.score}/{ps.total} ({ps.percentage}%)
                      </span>
                      <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                        +{ps.xpAwarded} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="magic" className="mt-6" asChild>
            <Link to="/courses">
              <Plus className="mr-2 h-4 w-4" /> Practice from Courses
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const q = questions[i]!;

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-xl">
        <Card className="flex flex-col items-center py-10 text-center">
          <Genie pose={pct >= 70 ? "high" : pct >= 40 ? "mid" : "low"} className="h-32 w-32" />
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Server Graded & Saved
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Quiz complete!</h1>
          <div className="my-6">
            <ProgressRing value={pct}>
              <div className="font-display text-4xl font-semibold">
                {score}/{questions.length}
              </div>
            </ProgressRing>
          </div>
          <div className="grid w-full grid-cols-3 gap-3">
            <div className="rounded-xl bg-success/15 p-3 text-success">
              <div className="font-display text-2xl font-semibold">{score}</div>
              <div className="text-xs font-bold">Correct</div>
            </div>
            <div className="rounded-xl bg-destructive/15 p-3 text-destructive">
              <div className="font-display text-2xl font-semibold">{questions.length - score}</div>
              <div className="text-xs font-bold">Wrong</div>
            </div>
            <div className="rounded-xl bg-gold/20 p-3 text-gold-foreground dark:text-gold">
              <div className="font-display text-2xl font-semibold">+{xpAwardedThisSession}</div>
              <div className="text-xs font-bold">Server XP</div>
            </div>
          </div>

          {pastScores.length > 1 && (
            <div className="mt-6 w-full rounded-xl border border-border bg-card/60 p-4 text-left">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <span>Recent Saved Quizzes</span>
                <span>{pastScores.length} Recorded</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {pastScores.slice(0, 4).map((ps, idx) => (
                  <div
                    key={ps.id || idx}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{ps.courseName || "Practice Quiz"}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {new Date(ps.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">
                        {ps.score}/{ps.total} ({ps.percentage}%)
                      </span>
                      <span className="text-[10px] text-gold font-bold">+{ps.xpAwarded} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button
            variant="magic"
            className="mt-6"
            onClick={() => {
              setI(0);
              setPick(null);
              setShortInput("");
              setShortSubmitted(false);
              setQuestionResults({});
              setScore(0);
              setXpAwardedThisSession(0);
              setAnswers([]);
              setFinished(false);
              isFinishingRef.current = false;
            }}
          >
            <RotateCcw /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  const currentType = (
    q.type ||
    (q.options && q.options.length === 2 && q.options.includes("True") && q.options.includes("False")
      ? "TRUE_FALSE"
      : q.options && q.options.length > 0
      ? "MCQ"
      : "SHORT_ANSWER")
  ).toUpperCase();

  const isShort = currentType === "SHORT_ANSWER";
  const isTrueFalse = currentType === "TRUE_FALSE";
  const currentResult = questionResults[q.id];
  const answered = isShort ? shortSubmitted && Boolean(currentResult) : pick !== null && Boolean(currentResult);
  const isCurrentCorrect = Boolean(currentResult?.correct);

  const handlePickOption = async (idx: number) => {
    if (answered || gradingQuestion) return;
    setPick(idx);
    const submission: AnswerSubmission = { questionId: q.id, selectedOptionIndex: idx };
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== q.id), submission]);

    if (kitId) {
      setGradingQuestion(true);
      try {
        const res = await studyService.checkQuizAnswer(kitId, submission);
        setQuestionResults((prev) => ({ ...prev, [q.id]: res }));
        if (res.correct) setScore((s) => s + 1);
      } catch (err: any) {
        toast.error(err?.message || "Could not grade answer on server.");
        setPick(null);
      } finally {
        setGradingQuestion(false);
      }
    } else {
      setQuestionResults((prev) => ({
        ...prev,
        [q.id]: { questionId: q.id, correct: false, explanation: "Server kit unavailable for grading." },
      }));
    }
  };

  const handleShortSubmit = async () => {
    if (answered || gradingQuestion || !shortInput.trim()) return;
    const given = shortInput.trim();
    const submission: AnswerSubmission = { questionId: q.id, answerText: given };
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== q.id), submission]);

    if (kitId) {
      setGradingQuestion(true);
      try {
        const res = await studyService.checkQuizAnswer(kitId, submission);
        setQuestionResults((prev) => ({ ...prev, [q.id]: res }));
        setShortSubmitted(true);
        if (res.correct) setScore((s) => s + 1);
      } catch (err: any) {
        toast.error(err?.message || "Could not grade answer on server.");
      } finally {
        setGradingQuestion(false);
      }
    } else {
      setQuestionResults((prev) => ({
        ...prev,
        [q.id]: { questionId: q.id, correct: false, explanation: "Server kit unavailable for grading." },
      }));
      setShortSubmitted(true);
    }
  };

  const handleSelfAssessCorrect = async () => {
    if (!kitId || !currentResult || currentResult.correct || gradingQuestion) return;
    const updatedSub: AnswerSubmission = {
      questionId: q.id,
      answerText: shortInput.trim(),
      selfAssessedCorrect: true,
    };
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== q.id), updatedSub]);
    setGradingQuestion(true);
    try {
      const res = await studyService.checkQuizAnswer(kitId, updatedSub);
      setQuestionResults((prev) => ({ ...prev, [q.id]: res }));
      if (res.correct) {
        setScore((s) => s + 1);
        toast.success("Marked correct via self-assessment.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not update self-assessment.");
    } finally {
      setGradingQuestion(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title="Quiz"
        sub={lastSavedScore ? `Chapter review · Last score: ${lastSavedScore.score}/${lastSavedScore.total} (${lastSavedScore.percentage}%)` : "Chapter review"}
        right={
          <span className="text-sm font-bold text-muted-foreground">
            {i + 1} / {questions.length}
          </span>
        }
      />
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-magic transition-all"
          style={{ width: `${((i + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          {isTrueFalse ? (
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold gap-1">
              ⚖️ True / False
            </Badge>
          ) : isShort ? (
            <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold gap-1">
              ✍️ Short Answer
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold gap-1">
              🔘 Multiple Choice
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">Question {i + 1} of {questions.length}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold leading-relaxed">{q.q}</h2>

        {/* 1. TRUE / FALSE RENDER */}
        {isTrueFalse && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "True", sub: "Statement is correct", val: 0 },
              { label: "False", sub: "Statement is incorrect", val: 1 },
            ].map((tf) => {
              const isSelected = pick === tf.val;
              const isTargetAnswer = answered && currentResult?.correctOptionIndex === tf.val;
              return (
                <button
                  key={tf.label}
                  disabled={answered || gradingQuestion}
                  onClick={() => handlePickOption(tf.val)}
                  className={cn(
                    "group relative flex items-center justify-between rounded-2xl border-2 p-5 text-left font-bold transition shadow-sm",
                    !answered && "hover:border-primary hover:bg-muted/40 bg-card/60",
                    answered && isTargetAnswer && "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    answered && isSelected && !isTargetAnswer && "border-destructive bg-destructive/10 text-destructive"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl border text-base font-bold",
                        answered && isTargetAnswer
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border bg-muted/60"
                      )}
                    >
                      {tf.label[0]}
                    </div>
                    <div>
                      <div className="text-lg">{tf.label}</div>
                      <div className="text-xs font-normal text-muted-foreground">{tf.sub}</div>
                    </div>
                  </div>
                  {answered && isTargetAnswer && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                  {answered && isSelected && !isTargetAnswer && <XCircle className="h-6 w-6 text-destructive" />}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. SHORT ANSWER RENDER */}
        {isShort && (
          <div className="mt-6 space-y-3">
            <div className="relative">
              <Input
                disabled={answered || gradingQuestion}
                value={shortInput}
                onChange={(e) => setShortInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !answered && !gradingQuestion && shortInput.trim()) {
                    handleShortSubmit();
                  }
                }}
                placeholder="Type your answer here (press Enter to submit)..."
                className={cn(
                  "h-14 text-base px-4 pr-32 rounded-xl transition font-medium",
                  answered && isCurrentCorrect && "border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
                  answered && !isCurrentCorrect && "border-destructive bg-destructive/5 text-destructive"
                )}
              />
              {!answered && (
                <Button
                  size="sm"
                  variant="magic"
                  disabled={!shortInput.trim() || gradingQuestion}
                  onClick={handleShortSubmit}
                  className="absolute right-2 top-2 h-10 px-4 font-bold"
                >
                  {gradingQuestion ? "Grading..." : "Submit Answer"}
                </Button>
              )}
            </div>
            {!answered && (
              <p className="text-[11px] text-muted-foreground">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">Enter</kbd> to submit. Graded on the server with Unicode & Arabic normalization.
              </p>
            )}
          </div>
        )}

        {/* 3. MULTIPLE CHOICE (MCQ) RENDER */}
        {!isTrueFalse && !isShort && (
          <div className="mt-6 grid gap-3">
            {(q.options || []).map((o, idx) => {
              const letters = ["A", "B", "C", "D", "E"];
              const correct = answered && currentResult?.correctOptionIndex === idx;
              return (
                <button
                  key={`${q.id}-${idx}`}
                  disabled={answered || gradingQuestion}
                  onClick={() => handlePickOption(idx)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left font-semibold transition shadow-sm",
                    !answered && "hover:border-primary hover:bg-muted/40",
                    answered && correct && "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    answered && pick === idx && !correct && "border-destructive bg-destructive/10 text-destructive"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg border text-xs font-bold shrink-0",
                        answered && correct
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border bg-muted/60"
                      )}
                    >
                      {letters[idx] || idx + 1}
                    </span>
                    <span>{o}</span>
                  </div>
                  {answered && correct && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                  {answered && pick === idx && !correct && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* SERVER-GRADED FEEDBACK & EXPLANATION */}
        {answered && currentResult && (
          <div
            className={cn(
              "mt-5 rounded-xl border p-4 text-sm transition",
              isCurrentCorrect
                ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                : "border-destructive/30 bg-destructive/5 text-foreground"
            )}
          >
            <div className="flex items-center justify-between gap-2 font-bold mb-1.5">
              {isCurrentCorrect ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Correct!
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-4 w-4" /> Not quite.
                </span>
              )}

              {isShort && !isCurrentCorrect && kitId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={gradingQuestion}
                  onClick={handleSelfAssessCorrect}
                  className="h-7 text-xs font-semibold border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                >
                  My answer was right (Self-Assess)
                </Button>
              )}
            </div>

            {isShort && !isCurrentCorrect && currentResult.correctAnswerText && (
              <div className="mb-2 text-xs">
                <span className="font-semibold text-muted-foreground">Expected answer: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {currentResult.correctAnswerText}
                </span>
              </div>
            )}

            <div className="text-xs text-muted-foreground leading-relaxed">{currentResult.explanation}</div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            variant="magic"
            disabled={!answered || gradingQuestion}
            onClick={() => {
              if (i === questions.length - 1) {
                handleFinish();
              } else {
                setI(i + 1);
                setPick(null);
                setShortInput("");
                setShortSubmitted(false);
              }
            }}
          >
            {i === questions.length - 1 ? "See results" : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
