import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, Plus, RotateCcw, Upload, XCircle } from "lucide-react";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/head";
import { studyService } from "@/lib/api/services";
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
  head: pageHead("Quiz", "Test yourself with quick multiple-choice quizzes."),
  component: Quiz,
});

interface QuestionItem {
  id: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

function Quiz() {
  const { addPoints, refreshGamification } = useApp();
  const [hasCourses, setHasCourses] = useState<boolean | null>(null);
  const [hasMaterial, setHasMaterial] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; selectedOptionIndex: number }[]>([]);
  const [pastScores, setPastScores] = useState<SavedQuizScore[]>([]);
  const [lastSavedScore, setLastSavedScore] = useState<SavedQuizScore | null>(null);

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
        const activeQuizRaw =
          localStorage.getItem(`sg-${prefix}-active-quiz`) ||
          localStorage.getItem("sg-active-quiz");
        if (activeQuizRaw) {
          const parsedQuestions = JSON.parse(activeQuizRaw);
          if (parsedQuestions && parsedQuestions.length > 0) {
            setQuestions(parsedQuestions);
            return;
          }
        }

        const savedKit =
          localStorage.getItem(`sg-${prefix}-active-kit`) ||
          localStorage.getItem("sg-active-kit");
        if (savedKit && !savedKit.startsWith("local-")) {
          studyService
            .getProgress(savedKit)
            .then((prog) => {
              if (prog?.questions) {
                setQuestions(prog.questions);
              }
            })
            .catch(() => {});
        }
      } catch {}
    }
  }, []);

  const handleFinish = async (finalScore: number) => {
    // 1. Compute exact score from verified answers to prevent stale state desync
    let computedCorrect = 0;
    questions.forEach((qItem, idx) => {
      const userAns = answers.find(
        (a) => a.questionId === (qItem.id || `q-${idx + 1}`)
      );
      if (userAns && userAns.selectedOptionIndex === qItem.answer) {
        computedCorrect++;
      }
    });

    const resolvedScore = Math.max(finalScore, computedCorrect);
    setScore(resolvedScore);
    setFinished(true);

    const total = questions.length;
    const pct = total > 0 ? Math.round((resolvedScore / total) * 100) : 0;
    const earnedPoints = resolvedScore * 10;

    // 2. Add points (persisted in localStorage and synchronized with app state)
    addPoints(earnedPoints);

    // 3. Save score in localStorage for persistence across reloads & sessions
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
      score: resolvedScore,
      total,
      percentage: pct,
      xpAwarded: earnedPoints,
    };

    saveQuizScore(scoreRecord);
    setLastSavedScore(scoreRecord);
    setPastScores(getQuizScores());
    toast.success(`Score saved! You earned +${earnedPoints} XP (${resolvedScore}/${total}) ✨`);

    // 4. Submit to backend if kitId is available and valid
    try {
      const kitId =
        localStorage.getItem(`sg-${prefix}-active-kit`) ||
        localStorage.getItem("sg-active-kit");
      if (kitId && !kitId.startsWith("local-")) {
        await studyService.submitQuiz(kitId, answers);
        await refreshGamification();
      }
    } catch (err) {
      console.warn("Backend quiz sync deferred, score safely stored locally:", err);
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
            <CheckCircle2 className="h-3.5 w-3.5" /> Score & XP Saved
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
              <div className="font-display text-2xl font-semibold">+{score * 10}</div>
              <div className="text-xs font-bold">XP Saved</div>
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
              setScore(0);
              setAnswers([]);
              setFinished(false);
            }}
          >
            <RotateCcw /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  const answered = pick !== null;

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
        <h2 className="text-2xl font-semibold">{q.q}</h2>
        <div className="mt-6 grid gap-3">
          {q.options.map((o, idx) => {
            const correct = idx === q.answer;
            return (
              <button
                key={o}
                disabled={answered}
                onClick={() => {
                  setPick(idx);
                  if (correct) setScore((s) => s + 1);
                  setAnswers((prev) => [
                    ...prev,
                    { questionId: q.id || `q-${i + 1}`, selectedOptionIndex: idx },
                  ]);
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left font-semibold transition",
                  !answered && "hover:border-primary",
                  answered && correct && "border-success bg-success/10 text-success",
                  answered && pick === idx && !correct && "border-destructive bg-destructive/10 text-destructive"
                )}
              >
                {o}
                {answered && correct && <CheckCircle2 className="h-5 w-5" />}
                {answered && pick === idx && !correct && <XCircle className="h-5 w-5" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-5 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
            <b>{pick === q.answer ? "Correct! " : "Not quite. "}</b>
            {q.explain}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <Button
            variant="magic"
            disabled={!answered}
            onClick={() => {
              if (i === questions.length - 1) {
                handleFinish(score);
              } else {
                setI(i + 1);
                setPick(null);
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
