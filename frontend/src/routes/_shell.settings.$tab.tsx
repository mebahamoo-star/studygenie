import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const Route = createFileRoute("/_shell/settings/$tab")({
  component: SettingsTabRoute,
});

function SettingsTabRoute() {
  const { tab } = Route.useParams();
  return <SettingsPage initialTab={tab as any} />;
}
