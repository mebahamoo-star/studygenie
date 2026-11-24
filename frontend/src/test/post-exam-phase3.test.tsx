import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { mockPostExamApi } from "@/features/post-exam/api/postExamApi.mock";
import { syncPostExamLanguage } from "@/features/post-exam/i18n";
import { CourseReportPage } from "@/features/post-exam/pages/CourseReportPage";

const originalResizeObserver = globalThis.ResizeObserver;

describe("Post-Exam Phase 3: CourseReportPage & PlannedVsActualChart", () => {
  beforeEach(() => {
    localStorage.clear();
    syncPostExamLanguage("en");
    mockPostExamApi.resetMockPostExamState();
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
    syncPostExamLanguage("en");
  });

  it("shows loading skeleton then renders all 5 summary cards, chart breakdown, and slow topics", async () => {
    render(<CourseReportPage enrollmentId="enroll_cs305" />);

    expect(screen.getByTestId("course-report-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Post-Exam Study Report")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Database Management Systems/)
    ).toBeInTheDocument();
    expect(screen.getByText("24.5")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Schedule Adherence" })
    ).toHaveAttribute("aria-valuenow", "86");
    expect(screen.getByText("9 days")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();

    // Weekly breakdown table & Slow topics list
    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(
      screen.getByText("Functional Dependencies & BCNF")
    ).toBeInTheDocument();
    expect(
      screen.getByText("255m actual / 180m planned")
    ).toBeInTheDocument();
  });

  it("handles PDF summary loading state and honest backend-pending message", async () => {
    render(<CourseReportPage enrollmentId="enroll_cs305" />);

    const downloadBtn = await screen.findByRole("button", {
      name: "Download PDF summary",
    });
    fireEvent.click(downloadBtn);

    expect(
      await screen.findByRole("button", { name: "Preparing PDF summary..." })
    ).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.getByText(
          "PDF export preview will connect to the backend generator soon."
        )
      ).toBeInTheDocument();
    });
  });

  it("renders Arabic RTL report layout when languageOverride is ar", async () => {
    render(
      <CourseReportPage enrollmentId="enroll_cs305" languageOverride="ar" />
    );

    await waitFor(() => {
      expect(
        screen.getByText("تقرير الدراسة بعد الامتحان")
      ).toBeInTheDocument();
    });

    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(
      screen.getByRole("heading", { name: "الساعات المخططة مقابل الفعلية" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "المواضيع التي استغرقت وقتاً أطول من المتوقع",
      })
    ).toBeInTheDocument();
  });
});
