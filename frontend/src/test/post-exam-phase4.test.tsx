import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import settingsI18n from "@/features/settings/i18n";
import { DEFAULT_ENROLLED_COURSES } from "@/features/settings/constants/settingsConstants";
import { CoursesSection } from "@/features/settings/sections/CoursesSection";
import { postExamApi } from "@/features/post-exam/api/postExamApi";
import { mockPostExamApi } from "@/features/post-exam/api/postExamApi.mock";
import { syncPostExamLanguage } from "@/features/post-exam/i18n";
import { CourseReportPage } from "@/features/post-exam/pages/CourseReportPage";

const originalResizeObserver = globalThis.ResizeObserver;

describe("Post-Exam Phase 4: NextStepCard & My Courses Integration", () => {
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

  it("renders NextStepCard with freed hours, nearest upcoming course, and Rest Day / Streak Freeze option on CourseReportPage", async () => {
    render(<CourseReportPage enrollmentId="enroll_cs305" />);

    expect(
      await screen.findByText("You have 6 free hours/week now.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Design & Analysis of Algorithms/)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Accept/i }));
    expect(
      screen.getByText(
        "Redirected 6 hrs/week toward Design & Analysis of Algorithms!"
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Take a well-earned rest day?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use Streak Freeze" }));
    expect(
      screen.getByText(
        "Streak Freeze activation is waiting on backend support — rest guilt-free!"
      )
    ).toBeInTheDocument();
  });

  it("splits My Courses into Active, Completed, and collapsed Archived accordion", async () => {
    render(
      <I18nextProvider i18n={settingsI18n}>
        <CoursesSection
          courses={DEFAULT_ENROLLED_COURSES}
          onUpdateExamDate={vi.fn()}
          onLeaveChallenge={vi.fn()}
          onShowToast={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByText("Active Courses")).toBeInTheDocument();
    expect(screen.getByText("Completed Courses")).toBeInTheDocument();

    expect(
      await screen.findByText("Database Management Systems")
    ).toBeInTheDocument();
    expect(screen.getByText("Rank #3")).toBeInTheDocument();
    expect(screen.getByText("24.5 hrs studied")).toBeInTheDocument();

    const reportLinks = screen.getAllByRole("link", { name: "View report" });
    expect(reportLinks[0]).toHaveAttribute("href", "/courses/enroll_cs305/report");

    const accordionBtn = screen.getByRole("button", {
      name: /Archived Courses \(1\)/i,
    });
    expect(accordionBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("General Physics I")).not.toBeInTheDocument();

    fireEvent.click(accordionBtn);
    expect(accordionBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("General Physics I")).toBeInTheDocument();
  });

  it("reopens a completed challenge after confirmation modal", async () => {
    const reopenSpy = vi.spyOn(postExamApi, "reopenEnrollment");
    const onShowToast = vi.fn();

    render(
      <I18nextProvider i18n={settingsI18n}>
        <CoursesSection
          courses={DEFAULT_ENROLLED_COURSES}
          onUpdateExamDate={vi.fn()}
          onLeaveChallenge={vi.fn()}
          onShowToast={onShowToast}
        />
      </I18nextProvider>
    );

    await screen.findByText("Database Management Systems");

    const reopenButtons = screen.getAllByRole("button", {
      name: "Reopen challenge",
    });
    fireEvent.click(reopenButtons[0]!);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Reopen Database Management Systems?")
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Reopen" }));

    await waitFor(() => {
      expect(reopenSpy).toHaveBeenCalledWith("enroll_cs305");
    });

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith(
        "success",
        "Database Management Systems moved back to Active courses."
      );
    });
  });

  it("archives a completed course and moves it into the Archived accordion", async () => {
    const archiveSpy = vi.spyOn(postExamApi, "archiveEnrollment");
    const onShowToast = vi.fn();

    render(
      <I18nextProvider i18n={settingsI18n}>
        <CoursesSection
          courses={DEFAULT_ENROLLED_COURSES}
          onUpdateExamDate={vi.fn()}
          onLeaveChallenge={vi.fn()}
          onShowToast={onShowToast}
        />
      </I18nextProvider>
    );

    await screen.findByText("Database Management Systems");

    const archiveButtons = screen.getAllByRole("button", { name: "Archive" });
    fireEvent.click(archiveButtons[0]!);

    await waitFor(() => {
      expect(archiveSpy).toHaveBeenCalledWith("enroll_cs305");
    });

    expect(
      await screen.findByRole("button", { name: /Archived Courses \(2\)/i })
    ).toBeInTheDocument();
    expect(onShowToast).toHaveBeenCalledWith(
      "success",
      "Database Management Systems moved to Archived."
    );
  });
});
