import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AdminAuditLogPage = lazy(() => import("@/components/admin/AdminAuditLogPage"));

export const Route = createFileRoute("/_admin/admin/audit-log")({
  component: () => (
    <Suspense
      fallback={<div className="p-8 text-sm text-muted-foreground">Loading audit log...</div>}
    >
      <AdminAuditLogPage />
    </Suspense>
  ),
});
