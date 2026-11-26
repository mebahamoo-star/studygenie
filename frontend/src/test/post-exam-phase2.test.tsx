import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { postExamApi } from "@/features/post-exam/api/postExamApi";
import { mockPostExamApi } from "@/features/post-exam/api/postExamApi.mock";
import { PostExamManager } from "@/features/post-exam/components/PostExamManager";

const originalMatchMedia = window.matchMedia;
const originalFetch = globalThis.fetch;

describe("Post-Exam Phase 2: CelebrationModal & FeedbackStepper", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockPostExamApi.resetMockPostExamState();
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nm: "genie-celebrate", layers: [{}] }),
    } as Response);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    globalThis.fetch = originalFetch;
  });

  it("opens CelebrationModal automatically when a COMPLETED enrollment has celebrationSeen=false", async () => {
    render(<PostExamManager />);

    await waitFor(() => {
      expect(screen.getByText("Course Conquered")).toBeInTheDocument();
      expect(screen.getByTestId("genie-lottie-animation")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Congratulations! Exam Complete")
    ).toBeInTheDocument();
    expect(screen.getByText(/Database Management Systems/)).toBeInTheDocument();
  });

  it("calls markCelebrationSeen on Continue and opens FeedbackStepper Step 1", async () => {
    const seenSpy = vi.spyOn(postExamApi, "markCelebrationSeen");

    render(<PostExamManager />);

    const continueBtn = await screen.findByRole("button", {
      name: "Continue",
    });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(seenSpy).toHaveBeenCalledWith("enroll_cs305");
    });

    await waitFor(() => {
      expect(screen.getByText("How was the exam?")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Your answers are private and only used in aggregate to improve study plans."
      )
    ).toBeInTheDocument();
  });

  it("submits Step 1 difficulty + Step 2 topic selections via postExamApi.submitFeedback", async () => {
    const submitSpy = vi.spyOn(postExamApi, "submitFeedback");

    render(<PostExamManager />);

    const continueBtn = await screen.findByRole("button", {
      name: "Continue",
    });
    fireEvent.click(continueBtn);

    const hardRadio = await screen.findByRole("radio", { name: /Hard/i });
    fireEvent.click(hardRadio);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Which topics stood out?")).toBeInTheDocument();
    });

    // Search filter works for > 5 syllabus topics
    const searchInput = screen.getByPlaceholderText("Search syllabus topics...");
    fireEvent.change(searchInput, { target: { value: "BCNF" } });

    expect(
      screen.getByText("Functional Dependencies & BCNF")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hardest for me" }));
    fireEvent.click(screen.getByRole("button", { name: "Heavily tested" }));

    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith("enroll_cs305", {
        courseId: 305,
        courseName: "Database Management Systems",
        difficulty: "HARD",
        hardTopicIds: [4],
        testedTopicIds: [4],
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Which topics stood out?")
      ).not.toBeInTheDocument();
    });
  });

  it("allows skipping FeedbackStepper at any point without submitting", async () => {
    const submitSpy = vi.spyOn(postExamApi, "submitFeedback");

    render(<PostExamManager />);

    const continueBtn = await screen.findByRole("button", {
      name: "Continue",
    });
    fireEvent.click(continueBtn);

    const skipBtn = await screen.findByRole("button", { name: "Skip" });
    fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.queryByText("How was the exam?")).not.toBeInTheDocument();
    });
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("renders static Genie illustration and immediate XP when prefers-reduced-motion is reduce", async () => {
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }) as MediaQueryList;

    render(<PostExamManager />);

    await waitFor(() => {
      expect(
        screen.getByTestId("genie-static-illustration")
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("earned-genie-points")).toHaveTextContent(
      "+450 XP"
    );
  });

  it("opens FeedbackStepper automatically on mount and after sg-post-exam-check when a past exam is unrated", async () => {
    await postExamApi.markCelebrationSeen("enroll_cs305");

    render(<PostExamManager />);

    await waitFor(() => {
      expect(screen.getByText("How was the exam?")).toBeInTheDocument();
    });
    expect(screen.getByText(/Database Management Systems/)).toBeInTheDocument();

    // Skipping dismisses for this session
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => {
      expect(screen.queryByText("How was the exam?")).not.toBeInTheDocument();
    });

    // Next sign-in clears session dismissal and re-prompts the unrated exam review
    window.dispatchEvent(new Event("sg-post-exam-check"));
    await waitFor(() => {
      expect(screen.getByText("How was the exam?")).toBeInTheDocument();
    });
  });

  it("syncs a real expired user exam from localStorage and launches post-exam review automatically", async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      "sg_user",
      JSON.stringify({ id: 99, fullName: "Momo", email: "momo@example.com" })
    );
    localStorage.setItem(
      "sg-user",
      JSON.stringify({ id: 99, fullName: "Momo", email: "momo@example.com" })
    );
    localStorage.setItem(
      "sg-u99-courses",
      JSON.stringify([
        {
          id: 24,
          name: "wireless",
          code: "C-24",
          status: "ready",
          topics: [{ id: 101, name: "RF Propagation", durationMinutes: 90 }],
        },
      ])
    );
    localStorage.setItem(
      "sg-u99-exams",
      JSON.stringify([
        {
          id: "ex-24",
          course: "C-24 — wireless",
          type: "Midterm",
          date: "2020-01-10",
          professor: "dr.bssam",
        },
      ])
    );

    render(<PostExamManager />);

    await waitFor(() => {
      expect(screen.getByText("Congratulations! Exam Complete")).toBeInTheDocument();
    });
    expect(screen.getByText(/wireless/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByText("How was the exam?")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("radio", { name: /Medium/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("RF Propagation")).toBeInTheDocument();

    // Submit review and confirm background exam/course syncs or ID shifts never re-prompt the same exam
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await waitFor(() => {
      expect(
        screen.queryByText("Which topics stood out?")
      ).not.toBeInTheDocument();
    });

    // Simulate backend sync updating exam ID from temp local ID to numeric remote ID + firing sync events
    localStorage.setItem(
      "sg-u99-exams",
      JSON.stringify([
        {
          id: "777",
          course: "C-24 — wireless",
          type: "Midterm",
          date: "2020-01-10",
          professor: "dr.bssam",
        },
      ])
    );
    window.dispatchEvent(new Event("sg-exams-updated"));
    window.dispatchEvent(new Event("sg-post-exam-check"));

    await new Promise((r) => setTimeout(r, 350));
    expect(
      screen.queryByText("Congratulations! Exam Complete")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("How was the exam?")).not.toBeInTheDocument();
  });
});
