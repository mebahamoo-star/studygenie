import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/lib/app-state";
import { studyService } from "@/lib/api/services";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (opts: any) => opts,
    useRouterState: () => "/quiz",
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

vi.mock("@/lib/api/services", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/services")>("@/lib/api/services");
  return {
    ...actual,
    studyService: {
      ...actual.studyService,
      getQuizQuestions: vi.fn(),
      checkQuizAnswer: vi.fn(),
      submitQuiz: vi.fn(),
    },
  };
});

describe("Phase 3: Arabic RTL quiz rendering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders Arabic quiz questions with dir='rtl'", async () => {
    localStorage.setItem("sg-guest-courses", JSON.stringify([{ id: 1, name: "AI", status: "ready", topics: [{ id: 1, name: "Ch 1" }] }]));
    localStorage.setItem("sg-guest-active-kit", "uuid-ar-1");
    localStorage.setItem("sg-guest-active-kit-lang", "ar");

    vi.mocked(studyService.getQuizQuestions).mockResolvedValue([
      {
        questionId: "q-ar-1",
        type: "MCQ",
        question: "ما هو التعلم الآلي؟",
        options: ["فرع من الذكاء الاصطناعي", "لغة برمجة قديمة"],
      },
    ]);

    const { Route } = await import("@/routes/_shell.quiz");
    const QuizComponent = (Route as any).component;
    const queryClient = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <QuizComponent />
        </AppProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const rtlEl = container.querySelector('[dir="rtl"]');
      expect(rtlEl).not.toBeNull();
      expect(container.textContent).toContain("ما هو التعلم الآلي؟");
    });
  });
});
