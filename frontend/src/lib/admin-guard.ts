import { redirect } from "@tanstack/react-router";
import { getStoredAccessToken, refreshAccessToken } from "@/lib/api/client";
import { authService } from "@/lib/api/services";
import type { UserSummary } from "@/lib/api/types";

export interface AdminGuardDeps {
  hasToken?: () => boolean;
  getMe?: () => Promise<UserSummary>;
}

let cachedAdminCheck: { user: UserSummary; ts: number } | null = null;

export function clearAdminGuardCache() {
  cachedAdminCheck = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("sg-session-cleared", () => clearAdminGuardCache());
}

/**
 * Verifies admin/moderator authorization directly against the backend (`GET /api/auth/me`).
 * Never trusts roles stored in localStorage or offline mock fallbacks.
 */
export async function verifyAdminRouteAccess(
  pathname: string,
  deps: AdminGuardDeps = {},
): Promise<UserSummary> {
  const hasToken = deps.hasToken ?? (() => Boolean(getStoredAccessToken()));
  const getMe = deps.getMe ?? (() => authService.getMe());

  if (!hasToken()) {
    clearAdminGuardCache();
    throw redirect({ to: "/login" });
  }

  // If using default getMe and recently verified within 10s, return cached result
  if (!deps.getMe && cachedAdminCheck && Date.now() - cachedAdminCheck.ts < 10_000) {
    const cached = cachedAdminCheck.user;
    if (cached.role === "MODERATOR" && !pathname.startsWith("/admin/reports")) {
      throw redirect({ to: "/admin/reports" });
    }
    return cached;
  }

  let currentUser: UserSummary | null = null;
  try {
    currentUser = await getMe();
  } catch {
    // If the call failed (e.g. expired access token), attempt token refresh and retry before redirecting
    try {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        currentUser = await getMe();
      }
    } catch {
      currentUser = null;
    }
  }

  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MODERATOR")) {
    clearAdminGuardCache();
    throw redirect({ to: "/dashboard" });
  }

  if (currentUser.role === "MODERATOR" && !pathname.startsWith("/admin/reports")) {
    throw redirect({ to: "/admin/reports" });
  }

  if (!deps.getMe) {
    cachedAdminCheck = { user: currentUser, ts: Date.now() };
  }

  return currentUser;
}
