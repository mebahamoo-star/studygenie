import type { CourseStatus } from "@/lib/mock";
import { cn } from "@/lib/utils";

const map: Record<CourseStatus, { label: string; cls: string }> = {
  ready: { label: "Ready", cls: "bg-success/15 text-success" },
  none: { label: "No syllabus yet", cls: "bg-muted text-muted-foreground" },
  processing: { label: "Processing", cls: "bg-warning/15 text-warning" },
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  const m = map[status];
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", m.cls)}>{m.label}</span>;
}
