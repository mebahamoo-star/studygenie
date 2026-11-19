import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AdminCoursesPage = lazy(() => import("@/components/admin/AdminCoursesPage"));

export const Route = createFileRoute("/_admin/admin/courses")({
  component: () => (
    <Suspense
      fallback={<div className="p-8 text-sm text-muted-foreground">Loading courses...</div>}
    >
      <AdminCoursesPage />
    </Suspense>
  ),
});
