import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — StudyGenie" }, { name: "description", content: "Create your free StudyGenie account." }, { property: "og:title", content: "Sign up — StudyGenie" }, { property: "og:description", content: "Create your free StudyGenie account." }] }),
  component: () => <AuthForm mode="signup" />,
});
