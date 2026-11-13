import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AdminUsersPage = lazy(() => import("@/components/admin/AdminUsersPage"));

export const Route = createFileRoute("/_admin/admin/users")({
  component: () => (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading users...</div>}>
      <AdminUsersPage />
    </Suspense>
  ),
});
