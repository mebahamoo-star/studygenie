import { createFileRoute, redirect } from "@tanstack/react-router";
import { verifyAdminRouteAccess } from "@/lib/admin-guard";

export const Route = createFileRoute("/_admin/admin/")({
  beforeLoad: async ({ location }) => {
    const adminUser = await verifyAdminRouteAccess(location.pathname);
    if (adminUser?.role === "MODERATOR") {
      throw redirect({ to: "/admin/reports" });
    }
    throw redirect({ to: "/admin/overview" });
  },
  component: () => null,
});
