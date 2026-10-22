import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — StudyGenie" }, { name: "description", content: "Log in to your StudyGenie account." }, { property: "og:title", content: "Log in — StudyGenie" }, { property: "og:description", content: "Log in to your StudyGenie account." }] }),
  component: () => <AuthForm mode="login" />,
});
