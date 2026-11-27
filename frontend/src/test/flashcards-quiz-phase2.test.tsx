import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/lib/app-state";
import { gamificationService } from "@/lib/api/services";
import { useEffect } from "react";

vi.mock("@/lib/api/services", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/services")>("@/lib/api/services");
  return {
    ...actual,
    gamificationService: {
      getProfile: vi.fn(),
      syncProgress: vi.fn(),
      getLeaderboard: vi.fn(),
    },
  };
});

function PointsProbe({ onPoints }: { onPoints: (pts: number) => void }) {
  const { points, refreshGamification } = useApp();
  useEffect(() => {
    refreshGamification();
  }, []);
  useEffect(() => {
    onPoints(points);
  }, [points, onPoints]);
  return <div data-testid="points">{points}</div>;
}

describe("Phase 2: Server-authoritative XP & Gamification sync", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("uses server XP as authoritative and never overwrites server with inflated localStorage points", async () => {
    localStorage.setItem("sg_access_token", "fake-jwt-token");
    localStorage.setItem("sg-guest-points", "99999");
    localStorage.setItem("sg-points", "99999");

    vi.mocked(gamificationService.getProfile).mockResolvedValue({
      userId: 1,
      displayName: "Student",
      currentXp: 120,
      currentLevel: 2,
      currentStreakDays: 3,
      longestStreakDays: 3,
      unlockedBadges: [],
    });

    const latestPoints: number[] = [];
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <PointsProbe onPoints={(p) => latestPoints.push(p)} />
        </AppProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(latestPoints[latestPoints.length - 1]).toBe(120);
    });

    expect(gamificationService.syncProgress).not.toHaveBeenCalled();
    expect(localStorage.getItem("sg-points")).toBe("120");
    expect(localStorage.getItem("sg-guest-points")).toBe("120");
  });
});
