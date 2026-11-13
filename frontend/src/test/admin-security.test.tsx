import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { verifyAdminRouteAccess } from "@/lib/admin-guard";
import { AppProvider } from "@/lib/app-state";
import type { UserSummary } from "@/lib/api/types";
import fs from "node:fs";
import path from "node:path";

const mockStudent: UserSummary = {
  id: "1",
  fullName: "Normal Student",
  email: "student@studygenie.local",
  universityId: null,
  universityName: null,
  major: "CS",
  studyStyle: null,
  preferredLanguage: "en",
  avatarUrl: null,
  academicYear: 2,
  dailyAvailableHours: 4,
  onboardingCompleted: true,
  geniePoints: 100,
  streakCount: 3,
  longestStreakDays: 5,
  lastStudyDate: null,
  role: "STUDENT",
  status: "ACTIVE",
};

const mockModerator: UserSummary = {
  ...mockStudent,
  id: "2",
  fullName: "Course Moderator",
  email: "mod@studygenie.local",
  role: "MODERATOR",
};

const mockAdmin: UserSummary = {
  ...mockStudent,
  id: "3",
  fullName: "Platform Admin",
  email: "admin@studygenie.local",
  role: "ADMIN",
};

describe("Admin Frontend Security & Route Guards", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users (no access token) to /login", async () => {
    await expect(
      verifyAdminRouteAccess("/admin/overview", {
        hasToken: () => false,
        getMe: async () => mockAdmin,
      }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: "/login" }),
    });
  });

  it("redirects STUDENT users to /dashboard when attempting to access /admin/**", async () => {
    localStorage.setItem("sg-auth-user", JSON.stringify({ ...mockStudent, role: "ADMIN" }));

    await expect(
      verifyAdminRouteAccess("/admin/users", {
        hasToken: () => true,
        getMe: async () => mockStudent,
      }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: "/dashboard" }),
    });
  });

  it("redirects to /dashboard when backend /api/auth/me rejects (offline or invalid token)", async () => {
    await expect(
      verifyAdminRouteAccess("/admin/overview", {
        hasToken: () => true,
        getMe: async () => {
          throw new Error("401 Unauthorized");
        },
      }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: "/dashboard" }),
    });
  });

  it("allows MODERATOR on /admin/reports but redirects MODERATOR away from /admin/users", async () => {
    const allowed = await verifyAdminRouteAccess("/admin/reports", {
      hasToken: () => true,
      getMe: async () => mockModerator,
    });
    expect(allowed.role).toBe("MODERATOR");

    await expect(
      verifyAdminRouteAccess("/admin/users", {
        hasToken: () => true,
        getMe: async () => mockModerator,
      }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: "/admin/reports" }),
    });
  });

  it("allows backend-confirmed ADMIN on all /admin/** routes", async () => {
    const allowed = await verifyAdminRouteAccess("/admin/audit-log", {
      hasToken: () => true,
      getMe: async () => mockAdmin,
    });
    expect(allowed.role).toBe("ADMIN");
    expect(allowed.email).toBe("admin@studygenie.local");
  });

  it("clears the TanStack Query cache when sg-session-cleared is dispatched on logout", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["admin", "overview"], { totalUsers: 42 });
    queryClient.setQueryData(["admin", "users"], { items: [mockAdmin] });

    render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <div>App Content</div>
        </AppProvider>
      </QueryClientProvider>,
    );

    expect(queryClient.getQueryData(["admin", "overview"])).toBeDefined();

    act(() => {
      window.dispatchEvent(new Event("sg-session-cleared"));
    });

    expect(queryClient.getQueryData(["admin", "overview"])).toBeUndefined();
    expect(queryClient.getQueryData(["admin", "users"])).toBeUndefined();
  });

  it("keeps Admin UI code-split so student AppShell never eagerly imports admin page chunks", () => {
    const appShellSource = fs.readFileSync(
      path.resolve(__dirname, "../components/AppShell.tsx"),
      "utf-8",
    );
    expect(appShellSource).not.toContain("components/admin/");
    expect(appShellSource).not.toContain("AdminOverviewPage");
    expect(appShellSource).not.toContain("AdminUsersPage");
    expect(appShellSource).not.toContain("AdminCoursesPage");
    expect(appShellSource).not.toContain("AdminReportsPage");
    expect(appShellSource).not.toContain("AdminAuditLogPage");

    expect(appShellSource).toContain('(user?.role === "ADMIN" || user?.role === "MODERATOR")');
  });
});
