import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/")({
  component: () => <Navigate to="/admin/overview" replace />,
});
