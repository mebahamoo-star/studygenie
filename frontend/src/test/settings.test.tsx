import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/lib/app-state";
import { SettingsPage } from "@/features/settings/SettingsPage";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function renderSettingsPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <SettingsPage />
      </AppProvider>
    </QueryClientProvider>
  );
}

describe("StudyGenie Settings Page (5-Tab Layout)", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/settings/study");
  });

  it("renders the 5 horizontal tabs and loads Study tab (AvailabilityGrid + My Courses) by default", async () => {
    renderSettingsPage();

    // Verify all 5 horizontal tabs exist in the tablist
    expect(screen.getByRole("tab", { name: /^Profile$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^Study$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^Notifications$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^Privacy & Experience$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^My Data$/i })).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.getByText("Weekly Availability Grid")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Study tab also stacks My Courses card
    expect(
      screen.getByText("Joined Courses & Exam Schedule")
    ).toBeInTheDocument();

    const totalHoursEl = screen.getByTestId("total-weekly-hours");
    expect(Number(totalHoursEl.textContent)).toBeGreaterThan(0);

    // Click "Clear all" quick action and verify live hours drop to 0
    const clearBtn = screen.getByRole("button", { name: /Clear all/i });
    fireEvent.click(clearBtn);

    expect(screen.getByTestId("total-weekly-hours").textContent).toBe("0");

    // Clicking Save when availability changed opens the schedule regeneration confirmation modal
    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Your schedule will be regenerated. Continue?")
      ).toBeInTheDocument();
    });
  });

  it("switches tabs, updates URL pathname, and stacks mapped sections (Profile + Security, Privacy + Language)", async () => {
    renderSettingsPage();

    await waitFor(
      () => {
        expect(
          screen.getByText("Weekly Availability Grid")
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Switch to Profile tab -> shows Profile cards + Account & Security cards and updates URL to /settings/profile
    const profileTab = screen.getByRole("tab", { name: /^Profile$/i });
    fireEvent.click(profileTab);

    expect(window.location.pathname).toBe("/settings/profile");
    expect(screen.getByText("Public Student Profile")).toBeInTheDocument();
    expect(screen.getByText("Academic Affiliation")).toBeInTheDocument();
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByText("Device Sessions")).toBeInTheDocument();

    // Switch to Privacy & Experience tab -> shows Gamification & Privacy + Language & Region cards
    const privacyTab = screen.getByRole("tab", {
      name: /^Privacy & Experience$/i,
    });
    fireEvent.click(privacyTab);

    expect(window.location.pathname).toBe("/settings/privacy");
    expect(screen.getByText("Leaderboards & Identity")).toBeInTheDocument();
    expect(
      screen.getByText("Language & Regional Formatting")
    ).toBeInTheDocument();
  });

  describe("Mobile Layout (<768px)", () => {
    beforeEach(() => {
      localStorage.clear();
      window.history.replaceState(null, "", "/settings");
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes("767px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    it("does not show horizontal tabs on mobile and renders iOS-style section rows with summary", async () => {
      renderSettingsPage();

      // Does not show horizontal tab bar
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

      // Shows iOS-settings style section rows
      await waitFor(() => {
        expect(screen.getByText("Profile")).toBeInTheDocument();
        expect(screen.getByText("Study")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("Privacy & Experience")).toBeInTheDocument();
        expect(screen.getByText("My Data")).toBeInTheDocument();
      });

      // Shows one-line summary for study with available hours
      expect(screen.getByText(/hrs\/week available/i)).toBeInTheDocument();
    });

    it("navigates to section detail view on tapping a row and renders mobile availability grid with day switcher", async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByText("Study")).toBeInTheDocument();
      });

      // Tap Study row
      fireEvent.click(screen.getByText("Study"));

      expect(window.location.pathname).toBe("/settings/study");

      // Verifies back button is present
      expect(screen.getByLabelText(/Back to settings/i)).toBeInTheDocument();

      await waitFor(() => {
        // Mobile availability grid shows day chips (Mon, Tue, etc.) instead of 7-column grid
        expect(screen.getByRole("button", { name: /^Mon/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Tue/i })).toBeInTheDocument();
      });

      // Does not render desktop 7-column table grid
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();

      // Has "Copy to days" action
      expect(screen.getByRole("button", { name: /Copy to days/i })).toBeInTheDocument();
    });
  });
});
