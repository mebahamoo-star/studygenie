import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AdminReportsPage = lazy(() => import("@/components/admin/AdminReportsPage"));

export const Route = createFileRoute("/_admin/admin/reports")({
  component: () => (
    <Suspense
      fallback={<div className="p-8 text-sm text-muted-foreground">Loading reports...</div>}
    >
      <AdminReportsPage />
    </Suspense>
  ),
});
