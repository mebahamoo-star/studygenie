import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const Route = createFileRoute("/_shell/settings")({
  head: pageHead(
    "Settings",
    "Manage your academic profile, AI study preferences, availability grid, and account security."
  ),
  component: SettingsPage,
});
