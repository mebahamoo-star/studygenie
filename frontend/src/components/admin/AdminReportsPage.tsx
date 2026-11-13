import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileWarning,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminService } from "@/lib/api/services";
import type { AdminReportDto } from "@/lib/api/types";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  IN_REVIEW: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  RESOLVED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  REJECTED: "bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400",
};

export default function AdminReportsPage() {
  const { lang, user } = useApp();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "ADMIN";

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<AdminReportDto | null>(null);
  const [adminNote, setAdminNote] = useState<string>("");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState<string>("");
  const [editingTopicWeek, setEditingTopicWeek] = useState<string>("");

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [
      "admin",
      "reports",
      { page, size: 15, status: statusFilter, reason: reasonFilter, search: searchQuery },
    ],
    queryFn: () =>
      adminService.getReports({
        page,
        size: 15,
        status: statusFilter || undefined,
        reason: reasonFilter || undefined,
        search: searchQuery || undefined,
      }),
    staleTime: 15_000,
  });

  const { data: courseDetails, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["admin", "course-detail", selectedReport?.courseId],
    queryFn: () => adminService.getCourseById(selectedReport!.courseId!),
    enabled: Boolean(selectedReport?.courseId && isAdmin),
    staleTime: 15_000,
  });

  const updateReportMutation = useMutation({
    mutationFn: ({
      reportId,
      status,
      note,
    }: {
      reportId: string;
      status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
      note: string;
    }) => adminService.updateReport(reportId, { status, adminNote: note }),
    onSuccess: (updated) => {
      toast.success(`Report marked as ${updated.status}`);
      setSelectedReport(updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update report");
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (courseId: string) => adminService.reanalyzeCourse(courseId),
    onSuccess: () => {
      toast.success("Course re-analysis started");
      if (selectedReport?.courseId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "course-detail", selectedReport.courseId],
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not trigger re-analysis");
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: ({
      courseId,
      topicId,
      title,
      weekNumber,
    }: {
      courseId: string;
      topicId: string;
      title: string;
      weekNumber?: number;
    }) => adminService.updateCourseTopic(courseId, topicId, { title, weekNumber }),
    onSuccess: () => {
      toast.success("Topic updated");
      setEditingTopicId(null);
      if (selectedReport?.courseId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "course-detail", selectedReport.courseId],
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update topic");
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: ({ courseId, topicId }: { courseId: string; topicId: string }) =>
      adminService.deleteCourseTopic(courseId, topicId),
    onSuccess: () => {
      toast.success("Topic deleted");
      if (selectedReport?.courseId) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "course-detail", selectedReport.courseId],
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete topic");
    },
  });

  const openDrawer = (report: AdminReportDto) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote || "");
    setEditingTopicId(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearchQuery(searchInput.trim());
  };

  return (
    <div className="space-y-6" data-testid="admin-reports-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {lang === "ar" ? "صندوق بلاغات المواد" : "Course Reports Inbox"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ar"
              ? "مراجعة بلاغات الطلاب حول الخطط الدراسية والمواضيع المستخرجة."
              : "Review and resolve student reports about syllabus accuracy and extracted topics."}
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <form
          onSubmit={handleSearchSubmit}
          className="flex min-w-[240px] flex-1 items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "بحث برمز المادة، السبب، أو الوصف..."
                  : "Search course code, reason, or description..."
              }
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            {lang === "ar" ? "بحث" : "Search"}
          </Button>
        </form>

        <select
          aria-label="Filter by report status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground"
        >
          <option value="">{lang === "ar" ? "كل الحالات" : "All Statuses"}</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <Input
          value={reasonFilter}
          onChange={(e) => {
            setReasonFilter(e.target.value);
            setPage(0);
          }}
          placeholder={lang === "ar" ? "تصفية بالسبب..." : "Filter reason..."}
          className="h-9 w-44 text-xs"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center text-sm text-destructive">
            {lang === "ar" ? "تعذر تحميل البلاغات." : "Failed to load course reports."}
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <FileWarning className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-bold">
              {lang === "ar" ? "لا توجد بلاغات مطابقة" : "No reports match your filters"}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === "ar"
                ? "جميع بلاغات المواد تمت معالجتها أو لا توجد نتائج."
                : "All student course reports are clear or no items matched."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((r) => (
                  <tr key={r.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          STATUS_BADGE[r.status] || "bg-muted text-foreground",
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground">
                        {r.courseCode || "Unknown"} — {r.courseName || "Course"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.universityName || "University"}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3.5">
                      <div className="font-semibold text-foreground">{r.reason}</div>
                      {r.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="font-semibold text-foreground">
                        {r.studentName || "Student"}
                      </div>
                      <div className="text-muted-foreground">{r.studentEmail || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDrawer(r)}
                        className="rounded-xl text-xs font-bold"
                      >
                        {lang === "ar" ? "فحص ومعالجة" : "Inspect"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Page {data.page + 1} of {data.totalPages} ({data.totalElements} total)
              {isFetching ? " · Updating..." : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Report Detail Drawer / Modal */}
      <Dialog
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <FileWarning className="h-5 w-5 text-primary" />
                  <span>
                    Report: {selectedReport.courseCode} — {selectedReport.courseName}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Submitted by {selectedReport.studentName || "Student"} (
                  {selectedReport.studentEmail || "no email"}) · Status:{" "}
                  <span className="font-bold text-foreground">{selectedReport.status}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <div className="text-xs font-bold uppercase text-muted-foreground">
                    Reason: {selectedReport.reason}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-foreground">
                    {selectedReport.description || "No additional description provided."}
                  </p>
                  {selectedReport.resolvedByEmail && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last updated by {selectedReport.resolvedByName} (
                      {selectedReport.resolvedByEmail})
                    </p>
                  )}
                </div>

                {/* Quick Course Actions */}
                {selectedReport.courseId && (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Course Quick Actions
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="gap-1.5 rounded-xl text-xs"
                          >
                            <Link to="/admin/courses">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open in Courses Manager
                            </Link>
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={reanalyzeMutation.isPending}
                            onClick={() => reanalyzeMutation.mutate(selectedReport.courseId!)}
                            className="gap-1.5 rounded-xl text-xs"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-gold" />
                            {reanalyzeMutation.isPending ? "Starting..." : "Re-analyze Course"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Topic inspection & quick edit/delete for Admins */}
                    {isAdmin && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Course Topics ({courseDetails?.topics?.length ?? 0})
                        </p>
                        {isLoadingCourse ? (
                          <Skeleton className="h-20 w-full rounded-xl" />
                        ) : courseDetails?.topics && courseDetails.topics.length > 0 ? (
                          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                            {courseDetails.topics.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                              >
                                {editingTopicId === t.id ? (
                                  <div className="flex flex-1 items-center gap-2">
                                    <Input
                                      value={editingTopicWeek}
                                      onChange={(e) => setEditingTopicWeek(e.target.value)}
                                      placeholder="Wk"
                                      className="h-7 w-14 text-xs"
                                    />
                                    <Input
                                      value={editingTopicTitle}
                                      onChange={(e) => setEditingTopicTitle(e.target.value)}
                                      className="h-7 flex-1 text-xs"
                                    />
                                    <Button
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() =>
                                        updateTopicMutation.mutate({
                                          courseId: selectedReport.courseId!,
                                          topicId: t.id,
                                          title: editingTopicTitle,
                                          weekNumber: editingTopicWeek
                                            ? Number(editingTopicWeek)
                                            : undefined,
                                        })
                                      }
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setEditingTopicId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <span className="font-bold text-primary">
                                        W{t.orderIndex ?? t.weekNumber ?? "—"}:
                                      </span>{" "}
                                      <span className="font-medium">
                                        {t.chapterTitle || t.title || t.name || "Untitled Topic"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => {
                                          setEditingTopicId(t.id);
                                          setEditingTopicTitle(
                                            t.chapterTitle || t.title || t.name || "",
                                          );
                                          const wk = t.orderIndex ?? t.weekNumber;
                                          setEditingTopicWeek(wk != null ? String(wk) : "");
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => {
                                          const topicTitle =
                                            t.chapterTitle || t.title || t.name || "this topic";
                                          if (
                                            window.confirm(
                                              `Are you sure you want to delete topic "${topicTitle}"?`,
                                            )
                                          ) {
                                            deleteTopicMutation.mutate({
                                              courseId: selectedReport.courseId!,
                                              topicId: t.id,
                                            });
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No extracted topics on this course.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Resolution Note & Status Actions */}
                <div className="space-y-3">
                  <Label htmlFor="admin-note-input">Admin Resolution Note</Label>
                  <Textarea
                    id="admin-note-input"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Document what action was taken or why this report was resolved/rejected..."
                    rows={3}
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateReportMutation.isPending}
                      onClick={() =>
                        updateReportMutation.mutate({
                          reportId: selectedReport.id,
                          status: "IN_REVIEW",
                          note: adminNote,
                        })
                      }
                      className="gap-1.5 rounded-xl"
                    >
                      <Clock className="h-4 w-4 text-sky-500" />
                      Mark In Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateReportMutation.isPending}
                      onClick={() =>
                        updateReportMutation.mutate({
                          reportId: selectedReport.id,
                          status: "REJECTED",
                          note: adminNote,
                        })
                      }
                      className="gap-1.5 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Report
                    </Button>
                    <Button
                      size="sm"
                      disabled={updateReportMutation.isPending}
                      onClick={() =>
                        updateReportMutation.mutate({
                          reportId: selectedReport.id,
                          status: "RESOLVED",
                          note: adminNote,
                        })
                      }
                      className="gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve Report
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
