import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  Lock,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { adminService, browseService } from "@/lib/api/services";
import type { AdminCourseDto } from "@/lib/api/types";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export default function AdminCoursesPage() {
  const { lang } = useApp();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"courses" | "catalog">("courses");
  const [page, setPage] = useState(0);
  const [universityId, setUniversityId] = useState<string>("");
  const [collegeId, setCollegeId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editLocked, setEditLocked] = useState(false);

  const [mergeSourceCourse, setMergeSourceCourse] = useState<AdminCourseDto | null>(null);
  const [mergeTargetCourseId, setMergeTargetCourseId] = useState("");

  // Catalog CRUD states
  const [newUniName, setNewUniName] = useState("");
  const [newUniCity, setNewUniCity] = useState("");
  const [newUniWebsite, setNewUniWebsite] = useState("");
  const [newColUniId, setNewColUniId] = useState("");
  const [newColName, setNewColName] = useState("");

  const { data: universities = [] } = useQuery({
    queryKey: ["admin", "catalog", "universities"],
    queryFn: () => browseService.getUniversities(),
    staleTime: 60_000,
  });

  const { data: colleges = [] } = useQuery({
    queryKey: ["admin", "catalog", "colleges", universityId || newColUniId],
    queryFn: () => browseService.getColleges(universityId || newColUniId),
    enabled: Boolean(universityId || newColUniId),
    staleTime: 60_000,
  });

  const {
    data: coursesPage,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "admin",
      "courses",
      {
        page,
        size: 15,
        universityId,
        collegeId,
        status: statusFilter,
        search: searchQuery,
        includeDeleted,
      },
    ],
    queryFn: () =>
      adminService.getCourses({
        page,
        size: 15,
        universityId: universityId || undefined,
        collegeId: collegeId || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        includeDeleted,
      }),
    staleTime: 15_000,
  });

  const { data: courseDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["admin", "course-detail", selectedCourseId],
    queryFn: () => adminService.getCourseById(selectedCourseId!),
    enabled: Boolean(selectedCourseId),
    staleTime: 10_000,
  });

  const openCourseDetail = (c: AdminCourseDto) => {
    setSelectedCourseId(c.id);
    setEditCode(c.code);
    setEditName(c.name);
    setEditVerified(c.verified);
    setEditLocked(c.locked);
  };

  const updateCourseMutation = useMutation({
    mutationFn: () =>
      adminService.updateCourse(selectedCourseId!, {
        code: editCode.trim(),
        name: editName.trim(),
        verified: editVerified,
        locked: editLocked,
      }),
    onSuccess: () => {
      toast.success("Course updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "course-detail", selectedCourseId] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update course"),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => adminService.deleteCourse(courseId),
    onSuccess: () => {
      toast.success("Course soft-deleted");
      setSelectedCourseId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete course"),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (courseId: string) => adminService.reanalyzeCourse(courseId),
    onSuccess: () => {
      toast.success("Syllabus re-analysis started");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: ["admin", "course-detail", selectedCourseId] });
      }
    },
    onError: (err: Error) => toast.error(err.message || "Re-analysis failed"),
  });

  const mergeMutation = useMutation({
    mutationFn: ({
      sourceId,
      targetId,
    }: {
      sourceId: number | string;
      targetId: number | string;
    }) => adminService.mergeCourses(sourceId, targetId),
    onSuccess: (res) => {
      toast.success(
        `Merged into ${res.name} (${res.enrollmentCount} enrollments, ${res.topicCount} topics).`,
      );
      setMergeSourceCourse(null);
      setMergeTargetCourseId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => toast.error(err.message || "Course merge failed"),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: ({ courseId, topicId }: { courseId: string; topicId: string }) =>
      adminService.deleteCourseTopic(courseId, topicId),
    onSuccess: () => {
      toast.success("Topic deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "course-detail", selectedCourseId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete topic"),
  });

  const createUniMutation = useMutation({
    mutationFn: () =>
      adminService.createUniversity({
        name: newUniName.trim(),
        city: newUniCity.trim() || undefined,
        website: newUniWebsite.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("University created");
      setNewUniName("");
      setNewUniCity("");
      setNewUniWebsite("");
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog", "universities"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create university"),
  });

  const deleteUniMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteUniversity(id),
    onSuccess: () => {
      toast.success("University deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog", "universities"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete university"),
  });

  const createColMutation = useMutation({
    mutationFn: () =>
      adminService.createCollege({
        universityId: newColUniId,
        name: newColName.trim(),
      }),
    onSuccess: () => {
      toast.success("College created");
      setNewColName("");
      queryClient.invalidateQueries({ queryKey: ["admin", "catalog", "colleges"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create college"),
  });

  return (
    <div className="space-y-6" data-testid="admin-courses-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {lang === "ar" ? "إدارة المواد والجامعات" : "Courses & Catalog Manager"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ar"
              ? "إدارة المواد المشتركة، دمج التكرارات، إعادة تحليل الخطط، وإدارة الجامعات."
              : "Manage shared courses, merge duplicates, re-trigger AI analysis, and maintain universities."}
          </p>
        </div>

        <div className="flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-bold transition",
              activeTab === "courses"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lang === "ar" ? "المواد الدراسية" : "Courses"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-bold transition",
              activeTab === "catalog"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lang === "ar" ? "الجامعات والكليات" : "Universities & Colleges"}
          </button>
        </div>
      </div>

      {activeTab === "courses" ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(0);
                setSearchQuery(searchInput.trim());
              }}
              className="flex min-w-[220px] flex-1 items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    lang === "ar" ? "بحث بالرمز أو الاسم..." : "Search course code or name..."
                  }
                  className="pl-9"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                {lang === "ar" ? "بحث" : "Search"}
              </Button>
            </form>

            <select
              aria-label="Filter by university"
              value={universityId}
              onChange={(e) => {
                setUniversityId(e.target.value);
                setCollegeId("");
                setPage(0);
              }}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
            >
              <option value="">{lang === "ar" ? "كل الجامعات" : "All Universities"}</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {universityId && (
              <select
                aria-label="Filter by college"
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setPage(0);
                }}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
              >
                <option value="">{lang === "ar" ? "كل الكليات" : "All Colleges"}</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Filter by analysis status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
            >
              <option value="">
                {lang === "ar" ? "كل حالات التحليل" : "All Analysis Statuses"}
              </option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="FAILED">FAILED</option>
              <option value="NO_SYLLABUS">NO_SYLLABUS</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Switch
                checked={includeDeleted}
                onCheckedChange={(v) => {
                  setIncludeDeleted(v);
                  setPage(0);
                }}
              />
              {lang === "ar" ? "إظهار المحذوفة" : "Include Deleted"}
            </label>
          </div>

          {/* Courses Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : isError || !coursesPage ? (
              <div className="p-8 text-center text-sm text-destructive">
                Failed to load courses list.
              </div>
            ) : coursesPage.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-base font-bold">No courses found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">University / College</th>
                      <th className="px-4 py-3">Analysis</th>
                      <th className="px-4 py-3">Enrolled</th>
                      <th className="px-4 py-3">Topics</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {coursesPage.items.map((c) => (
                      <tr
                        key={c.id}
                        className={cn("transition hover:bg-muted/30", c.deletedAt && "opacity-60")}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <span>{c.code}</span>
                            {c.verified && (
                              <CheckCircle2
                                className="h-4 w-4 text-emerald-500"
                                title="Verified course"
                              />
                            )}
                            {c.locked && (
                              <Lock className="h-3.5 w-3.5 text-amber-500" title="Locked course" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.name}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-semibold text-foreground">
                            {c.universityName || "—"}
                          </div>
                          <div className="text-muted-foreground">{c.collegeName || "—"}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                              c.status === "COMPLETED"
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : c.status === "FAILED"
                                  ? "border-destructive/30 bg-destructive/15 text-destructive"
                                  : "border-border bg-muted text-muted-foreground",
                            )}
                          >
                            {c.deletedAt ? "DELETED" : c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums">{c.enrollmentCount}</td>
                        <td className="px-4 py-3.5 font-bold tabular-nums">{c.topicCount}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCourseDetail(c)}
                              className="rounded-xl text-xs"
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Manage
                            </Button>
                            {!c.deletedAt && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setMergeSourceCourse(c);
                                  setMergeTargetCourseId("");
                                }}
                                className="rounded-xl text-xs"
                              >
                                <GitMerge className="mr-1 h-3.5 w-3.5" />
                                Merge
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {coursesPage && coursesPage.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Page {coursesPage.page + 1} of {coursesPage.totalPages} (
                  {coursesPage.totalElements} courses)
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
                    disabled={!coursesPage.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Universities & Colleges Catalog Management */
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Universities ({universities.length})</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={newUniName}
                onChange={(e) => setNewUniName(e.target.value)}
                placeholder="University Name"
              />
              <Input
                value={newUniCity}
                onChange={(e) => setNewUniCity(e.target.value)}
                placeholder="City (optional)"
              />
              <Button
                disabled={!newUniName.trim() || createUniMutation.isPending}
                onClick={() => createUniMutation.mutate()}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add University
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pt-2">
              {universities.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-foreground">{u.name}</div>
                    <div className="text-muted-foreground">{u.city || "—"}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(`Are you sure you want to delete university "${u.name}"?`)
                      ) {
                        deleteUniMutation.mutate(u.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>Colleges</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                value={newColUniId}
                onChange={(e) => setNewColUniId(e.target.value)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
              >
                <option value="">Select University...</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <Input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="College Name"
              />
              <Button
                disabled={!newColUniId || !newColName.trim() || createColMutation.isPending}
                onClick={() => createColMutation.mutate()}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add College
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pt-2">
              {colleges.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
                >
                  <span className="font-bold text-foreground">{col.name}</span>
                  <span className="text-muted-foreground">ID: {col.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Course Detail Dialog */}
      <Dialog
        open={Boolean(selectedCourseId)}
        onOpenChange={(open) => {
          if (!open) setSelectedCourseId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Course</DialogTitle>
            <DialogDescription>
              Edit metadata, verify/lock syllabus changes, inspect topics, or trigger AI
              re-analysis.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail || !courseDetail ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Course Code</Label>
                  <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                </div>
                <div>
                  <Label>Course Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-muted/30 p-3">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <Switch checked={editVerified} onCheckedChange={setEditVerified} />
                  Verified Official Syllabus
                </label>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <Switch checked={editLocked} onCheckedChange={setEditLocked} />
                  Lock Student Topic Edits
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reanalyzeMutation.isPending}
                    onClick={() => reanalyzeMutation.mutate(courseDetail.id)}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-4 w-4 text-gold" />
                    Re-analyze Syllabus
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to soft-delete "${courseDetail.name}"?`,
                        )
                      ) {
                        deleteCourseMutation.mutate(courseDetail.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Soft-Delete Course
                  </Button>
                </div>

                <Button
                  size="sm"
                  disabled={updateCourseMutation.isPending}
                  onClick={() => updateCourseMutation.mutate()}
                >
                  Save Changes
                </Button>
              </div>

              {/* Topics list */}
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">
                  Extracted Topics ({courseDetail.topics?.length ?? 0})
                </h4>
                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {courseDetail.topics?.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                    >
                      <span>
                        <strong>Week {t.orderIndex ?? t.weekNumber ?? "—"}:</strong>{" "}
                        {t.chapterTitle || t.title || t.name || "Untitled Topic"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          const topicTitle = t.chapterTitle || t.title || t.name || "this topic";
                          if (
                            window.confirm(`Are you sure you want to delete topic "${topicTitle}"?`)
                          ) {
                            deleteTopicMutation.mutate({
                              courseId: courseDetail.id,
                              topicId: t.id,
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merge Duplicate Course Dialog */}
      <Dialog
        open={Boolean(mergeSourceCourse)}
        onOpenChange={(open) => {
          if (!open) setMergeSourceCourse(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-primary" />
              Merge Duplicate Course
            </DialogTitle>
            <DialogDescription>
              Transactionally moves all enrollments, topics, study plans, exams, and reports from{" "}
              <strong>
                {mergeSourceCourse?.code} ({mergeSourceCourse?.name})
              </strong>{" "}
              into the target course and soft-deletes the duplicate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label>Target Course (Keep)</Label>
              <select
                value={mergeTargetCourseId}
                onChange={(e) => setMergeTargetCourseId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold"
              >
                <option value="">Select target course...</option>
                {coursesPage?.items
                  .filter((c) => c.id !== mergeSourceCourse?.id && !c.deletedAt)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} ({c.universityName || "University"})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMergeSourceCourse(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!mergeTargetCourseId || mergeMutation.isPending}
                className="gap-1.5"
                onClick={() => {
                  if (mergeSourceCourse && mergeTargetCourseId) {
                    if (
                      window.confirm(
                        `Are you sure you want to merge "${mergeSourceCourse.name}" into the target course? This action cannot be undone.`,
                      )
                    ) {
                      mergeMutation.mutate({
                        sourceId: mergeSourceCourse.id,
                        targetId: mergeTargetCourseId,
                      });
                    }
                  }
                }}
              >
                <GitMerge className="h-3.5 w-3.5" />
                Merge Courses
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
