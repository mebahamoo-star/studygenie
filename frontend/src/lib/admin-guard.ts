import { redirect } from "@tanstack/react-router";
import { getStoredAccessToken } from "@/lib/api/client";
import { authService } from "@/lib/api/services";
import type { UserSummary } from "@/lib/api/types";

export interface AdminGuardDeps {
  hasToken?: () => boolean;
  getMe?: () => Promise<UserSummary>;
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
    throw redirect({ to: "/login" });
  }

  let currentUser: UserSummary;
  try {
    currentUser = await getMe();
  } catch {
    throw redirect({ to: "/dashboard" });
  }

  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MODERATOR")) {
    throw redirect({ to: "/dashboard" });
  }

  if (currentUser.role === "MODERATOR" && !pathname.startsWith("/admin/reports")) {
    throw redirect({ to: "/admin/reports" });
  }

  return currentUser;
}
