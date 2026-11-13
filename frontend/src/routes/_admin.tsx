import { Suspense, lazy } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { verifyAdminRouteAccess } from "@/lib/admin-guard";
import type { UserSummary } from "@/lib/api/types";

const LazyAdminShell = lazy(() =>
  import("@/components/admin/AdminShell").then((m) => ({ default: m.AdminShell })),
);

export const Route = createFileRoute("/_admin")({
  beforeLoad: async ({ location }): Promise<{ adminUser: UserSummary | null }> => {
    if (typeof window === "undefined") {
      return { adminUser: null };
    }
    const adminUser = await verifyAdminRouteAccess(location.pathname);
    return { adminUser };
  },
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  const { adminUser } = Route.useRouteContext();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading Admin Panel...
        </div>
      }
    >
      <LazyAdminShell initialAdminUser={adminUser}>
        <Outlet />
      </LazyAdminShell>
    </Suspense>
  );
}
