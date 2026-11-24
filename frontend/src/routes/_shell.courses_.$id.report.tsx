import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CourseReportPage } from "@/features/post-exam/pages/CourseReportPage";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/courses_/$id/report")({
  head: pageHead(
    "Study Report",
    "Post-exam study summary, schedule adherence, and topic breakdown."
  ),
  component: CourseReportRoute,
});

function CourseReportRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  return (
    <CourseReportPage
      enrollmentId={id}
      onBackToCourses={() =>
        navigate({ to: "/settings/$tab", params: { tab: "study" } })
      }
    />
  );
}
