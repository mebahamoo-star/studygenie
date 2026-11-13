import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AdminOverviewPage = lazy(() => import("@/components/admin/AdminOverviewPage"));

export const Route = createFileRoute("/_admin/admin/overview")({
  component: () => (
    <Suspense
      fallback={<div className="p-8 text-sm text-muted-foreground">Loading overview...</div>}
    >
      <AdminOverviewPage />
    </Suspense>
  ),
});
