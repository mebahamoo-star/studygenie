import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/lib/app-state";
import { browseService, studyService } from "@/lib/api/services";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (opts: any) => opts,
    useRouterState: () => "/study",
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  };
});

vi.mock("@/lib/genie-context", () => ({
  useGenie: () => ({
    explainPage: vi.fn(),
    triggerCelebration: vi.fn(),
    triggerEncourage: vi.fn(),
    triggerWarn: vi.fn(),
  }),
}));

vi.mock("@/lib/sound", () => ({
  playCelebrationSound: vi.fn(),
}));

vi.mock("@lucasmarkes/hairline/react", () => ({
  Riffle: ({ className }: { className?: string }) => <div className={className} data-testid="riffle-mock" />,
}));

vi.mock("@/lib/api/services", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/services")>("@/lib/api/services");
  return {
    ...actual,
    browseService: {
      ...actual.browseService,
      getEnrolledCourses: vi.fn(),
      getCourseTopics: vi.fn(),
    },
    studyService: {
      ...actual.studyService,
      getStudyKits: vi.fn(),
      getProgress: vi.fn(),
      getDueCards: vi.fn(),
      reviewCards: vi.fn(),
      getQuizQuestions: vi.fn(),
      checkQuizAnswer: vi.fn(),
      submitQuiz: vi.fn(),
    },
  };
});

describe("Phase 4: Flashcards & Quiz UX", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("loads flashcards by courseId with due cards first, progress counts, Again requeue, and keyboard shortcuts", async () => {
    const course = { id: 10, name: "Algorithms", status: "ready" as const, topics: [{ id: 1, name: "Trees" }] };
    localStorage.setItem("sg-guest-courses", JSON.stringify([course]));
    // Polluted global active-cards must be ignored
    localStorage.setItem("sg-active-cards", JSON.stringify([{ id: "stale", q: "Stale Q", a: "Stale A" }]));

    vi.mocked(browseService.getEnrolledCourses).mockResolvedValue([course]);
    vi.mocked(studyService.getStudyKits).mockResolvedValue([
      {
        kitId: "kit-algo-10",
        courseId: 10,
        language: "en",
        topics: [
          {
            ref: "1",
            chapterTitle: "Trees",
            flashcards: [
              { cardId: "c1", front: "Not Due First In List", back: "Back 1" },
              { cardId: "c2", front: "Due Card Priority", back: "Back 2" },
            ],
            quiz: [],
          },
        ],
      },
    ]);
    vi.mocked(studyService.getProgress).mockResolvedValue({
      totalCards: 2,
      newCards: 1,
      learningCards: 1,
      matureCards: 0,
      dueToday: 1,
    });
    vi.mocked(studyService.getDueCards).mockResolvedValue([{ cardId: "c2" }]);
    vi.mocked(studyService.reviewCards).mockResolvedValue({
      reviewed: 1,
      counted: 1,
      againCount: 1,
      hardCount: 0,
      goodCount: 0,
      easyCount: 0,
    });

    const { Route } = await import("@/routes/_shell.flashcards");
    const FlashcardsComponent = (Route as any).component;
    const queryClient = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <FlashcardsComponent />
        </AppProvider>
      </QueryClientProvider>
    );

    const openBtn = await screen.findByRole("button", { name: /Open Flashcards/i });
    fireEvent.click(openBtn);

    // Due card c2 should be shown FIRST, not c1 or stale card
    await waitFor(() => {
      expect(container.textContent).toContain("Due Card Priority");
      expect(container.textContent).not.toContain("Stale Q");
      expect(screen.getByTestId("deck-progress-counts").textContent).toContain("New");
      expect(screen.getByTestId("deck-progress-counts").textContent).toContain("Learning");
      expect(screen.getByTestId("deck-progress-counts").textContent).toContain("Mature");
    });

    // Space flips, "1" rates AGAIN -> requeues c2 to the end (now 3 cards total, index moves to c1)
    fireEvent.keyDown(window, { code: "Space", key: " " });
    fireEvent.keyDown(window, { key: "1" });

    await waitFor(() => {
      expect(container.textContent).toContain("Not Due First In List");
      expect(container.textContent).toContain("Card 2 of 3");
    });

    // Rate c1 Good with "Space" + "3" -> advances to requeued c2 ("Card 3 of 3")
    fireEvent.keyDown(window, { code: "Space", key: " " });
    fireEvent.keyDown(window, { key: "3" });

    await waitFor(() => {
      expect(container.textContent).toContain("Due Card Priority");
      expect(container.textContent).toContain("Card 3 of 3");
      expect(container.textContent).toContain("Requeued");
    });

    // Rate requeued c2 Good ("Space" + "3") -> completes session!
    fireEvent.keyDown(window, { code: "Space", key: " " });
    fireEvent.keyDown(window, { key: "3" });

    await waitFor(() => {
      expect(container.textContent).toContain("Study Session Complete!");
    });
  });

  it("shows review of wrong answers and supports Retry Wrong Only on quiz completion", async () => {
    const course = { id: 20, name: "Databases", status: "ready" as const, topics: [{ id: 2, name: "SQL" }] };
    localStorage.setItem("sg-guest-courses", JSON.stringify([course]));

    vi.mocked(browseService.getEnrolledCourses).mockResolvedValue([course]);
    vi.mocked(studyService.getStudyKits).mockResolvedValue([
      {
        kitId: "kit-db-20",
        courseId: 20,
        language: "en",
        topics: [
          {
            ref: "2",
            chapterTitle: "SQL Joins",
            flashcards: [],
            quiz: [
              { questionId: "q1", type: "MCQ", question: "What is INNER JOIN?", options: ["Intersection", "Union"] },
              { questionId: "q2", type: "MCQ", question: "What is DDL?", options: ["Data Definition", "Data Display"] },
            ],
          },
        ],
      },
    ]);

    vi.mocked(studyService.checkQuizAnswer)
      .mockResolvedValueOnce({
        questionId: "q1",
        correct: false,
        correctOptionIndex: 0,
        correctAnswerText: "Intersection",
        explanation: "INNER JOIN keeps matching rows.",
      })
      .mockResolvedValueOnce({
        questionId: "q2",
        correct: true,
        correctOptionIndex: 0,
        correctAnswerText: "Data Definition",
        explanation: "DDL defines schema.",
      });

    vi.mocked(studyService.submitQuiz).mockResolvedValue({
      score: 1,
      total: 2,
      percentage: 50,
      passed: false,
      xpEligible: false,
      results: [
        { questionId: "q1", correct: false, correctOptionIndex: 0, correctAnswerText: "Intersection", explanation: "INNER JOIN keeps matching rows." },
        { questionId: "q2", correct: true, correctOptionIndex: 0, correctAnswerText: "Data Definition", explanation: "DDL defines schema." },
      ],
    });

    const { Route } = await import("@/routes/_shell.quiz");
    const QuizComponent = (Route as any).component;
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <QuizComponent />
        </AppProvider>
      </QueryClientProvider>
    );

    // Question 1: pick wrong option "Union"
    const unionBtn = await screen.findByText("Union");
    fireEvent.click(unionBtn);
    await screen.findByText("Not quite.");
    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }));

    // Question 2: pick right option "Data Definition"
    const ddlBtn = await screen.findByText("Data Definition");
    fireEvent.click(ddlBtn);
    await screen.findByText("Correct!");
    fireEvent.click(screen.getByRole("button", { name: /See results/i }));

    // Review wrong answers + Retry Wrong Only (1)
    const reviewBox = await screen.findByTestId("wrong-answers-review");
    expect(reviewBox.textContent).toContain("What is INNER JOIN?");
    expect(reviewBox.textContent).toContain("Your answer: Union");
    expect(reviewBox.textContent).toContain("Correct answer: Intersection");
    expect(reviewBox.textContent).toContain("INNER JOIN keeps matching rows.");

    const retryWrongBtn = screen.getByTestId("retry-wrong-only");
    expect(retryWrongBtn.textContent).toContain("Retry Wrong Only (1)");
    fireEvent.click(retryWrongBtn);

    await waitFor(() => {
      expect(screen.getByText("What is INNER JOIN?")).toBeInTheDocument();
      expect(screen.getByText("1 / 1")).toBeInTheDocument();
    });
  });
});
