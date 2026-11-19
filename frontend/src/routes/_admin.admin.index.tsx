import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/overview" });
  },
  component: () => <Navigate to="/admin/overview" replace />,
});
