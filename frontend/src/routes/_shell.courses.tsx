import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalendarIcon, Clock, Flame, Plus, RotateCcw, Shield, Trash2, Upload, Wand2, BookOpen, ChevronDown, ChevronUp, Sparkles, Loader2, Flag, User } from "lucide-react";
import { ReportCourseDialog } from "@/components/ReportCourseDialog";
import { toast } from "sonner";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { MagicLoader } from "@/components/MagicLoader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pageHead } from "@/lib/head";
import { browseService, syllabusService } from "@/lib/api/services";
import { fetchApi } from "@/lib/api/client";
import { deduplicateTopics, getUserCourses, saveUserCourses, getUserTaskKits, saveUserTaskKits, getUserStoragePrefix, toLocalDateStr, getActiveCourse, saveActiveCourse, getActivePlan, saveActivePlan, getUserAcademicProfile, isCourseMaterialUploaded } from "@/lib/courses-util";
import { clearExam, deleteExam, isCourseEnrolled, loadExam, loadExams, saveExam } from "@/lib/exam";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import type { Course, CourseStatus, Topic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/courses")({
  head: pageHead("My Courses", "Upload syllabi and join study challenges for your courses."),
  component: CoursesPage,
});

const catalogSuggestions = [
  { name: "Artificial Intelligence", code: "CS 461" },
  { name: "Database Systems", code: "CS 330" },
  { name: "Linear Algebra", code: "MATH 211" },
  { name: "Computer Networks", code: "CS 370" },
  { name: "Physics I", code: "PHYS 101" },
  { name: "Academic Writing", code: "ENG 102" },
  { name: "Discrete Mathematics", code: "MATH 140" },
  { name: "Software Engineering", code: "CS 380" },
];

function CoursesPage() {
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [collegeCatalog, setCollegeCatalog] = useState<Course[]>([]);
  const [sel, setSel] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loadingSelectedTopics, setLoadingSelectedTopics] = useState(false);

  const refreshCourses = async () => {
    const { col } = getUserAcademicProfile();
    let colId: any = undefined;
    if (col?.id && !isNaN(Number(col.id))) colId = Number(col.id);

    // Parallel fetch: user enrolled courses + college catalog simultaneously
    const [enrolledRes, catalogRes] = await Promise.allSettled([
      browseService.getEnrolledCourses(),
      colId !== undefined ? browseService.getAllCourses(colId) : Promise.resolve([]),
    ]);

    let enrolled: Course[] = [];
    let isRemoteOnline = false;
    if (enrolledRes.status === "fulfilled" && Array.isArray(enrolledRes.value)) {
      enrolled = enrolledRes.value;
      isRemoteOnline = true;
    }

    if (catalogRes.status === "fulfilled" && Array.isArray(catalogRes.value)) {
      setCollegeCatalog(catalogRes.value);
      try {
        localStorage.setItem("sg-catalog-cache", JSON.stringify(catalogRes.value));
      } catch {}
    }

    const saved = getUserCourses();
    const savedMap = new Map<string, Course>();
    saved.forEach((c) => savedMap.set(c.name.trim().toLowerCase(), c));

    let myCourses: Course[] = [];
    if (isRemoteOnline) {
      myCourses = enrolled.map((c) => {
        const local = savedMap.get(c.name.trim().toLowerCase());
        const hasLocalTopics = local?.topics && local.topics.length > 0;
        return {
          ...c,
          topics: hasLocalTopics ? local.topics : c.topics || [],
          status: hasLocalTopics || c.status === "ready" ? "ready" : c.status,
        };
      });
    } else {
      myCourses = saved;
    }

    setCourseList(myCourses);
    saveUserCourses(myCourses);
    if (myCourses.length > 0) {
      setSel((prev) => (prev && myCourses.some((c) => String(c.id) === String(prev)) ? prev : String(myCourses[0].id)));
    }

    // Prefetch missing topics concurrently
    const coursesNeedingTopics = enrolled.filter((c) => {
      const local = savedMap.get(c.name.trim().toLowerCase());
      return (!local?.topics || local.topics.length === 0) && c.id && !String(c.id).startsWith("course-") && !String(c.id).startsWith("c-");
    });

    if (coursesNeedingTopics.length > 0) {
      Promise.allSettled(
        coursesNeedingTopics.map(async (c) => {
          try {
            const remoteTopics = await browseService.getCourseTopics(c.id);
            if (remoteTopics && remoteTopics.length > 0) {
              setCourseList((prev) =>
                prev.map((pc) =>
                  String(pc.id) === String(c.id) || pc.name.toLowerCase() === c.name.toLowerCase()
                    ? { ...pc, topics: remoteTopics, status: "ready" }
                    : pc
                )
              );
              const currentSaved = getUserCourses();
              const updatedSaved = currentSaved.map((sc) =>
                String(sc.id) === String(c.id) || sc.name.toLowerCase() === c.name.toLowerCase()
                  ? { ...sc, topics: remoteTopics, status: "ready" }
                  : sc
              );
              saveUserCourses(updatedSaved);
            }
          } catch {}
        })
      );
    }
  };

  useEffect(() => {
    refreshCourses();
  }, []);

    const handleEnrollFromCatalog = async (catalogCourse: Course) => {
    const existing = courseList.find((c) => c.name.toLowerCase() === catalogCourse.name.toLowerCase());
    if (existing) {
      setSel(String(existing.id));
      setOpen(false);
      return;
    }

    let catalogTopics = catalogCourse.topics || [];
    if (catalogCourse.id && (!catalogTopics || catalogTopics.length === 0) && !String(catalogCourse.id).startsWith("course-") && !String(catalogCourse.id).startsWith("c-")) {
      try {
        const remote = await browseService.getCourseTopics(catalogCourse.id);
        if (remote && remote.length > 0) {
          catalogTopics = remote;
        }
      } catch {}
    }

    const courseWithTopics: Course = {
      ...catalogCourse,
      topics: catalogTopics,
      status: catalogTopics.length > 0 ? "ready" : catalogCourse.status,
    };

    const nextList = [courseWithTopics, ...courseList];
    setCourseList(nextList);
    saveUserCourses(nextList);
    setSel(String(courseWithTopics.id));
    setOpen(false);
    toast.success(`Enrolled in "${catalogCourse.name}"! ✨`);

    // Persist to Neon PostgreSQL cloud database for this user!
    try {
      if (catalogCourse.id && !String(catalogCourse.id).startsWith("c-") && !String(catalogCourse.id).startsWith("course-")) {
        await browseService.enrollCourse(catalogCourse.id);
      } else {
        await browseService.syncEnrolledCourses([catalogCourse.name]);
      }
    } catch {}
  };

  const handleAddCourse = async (courseName: string, courseCode?: string) => {
    const trimmed = courseName.trim();
    if (!trimmed) return;
    const existing = courseList.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setSel(String(existing.id));
      setOpen(false);
      setName("");
      setCode("");
      return;
    }

    let newCourse: Course = {
      id: `course-${Date.now()}`,
      code: courseCode?.trim() && courseCode.trim().toUpperCase() !== "CUSTOM" ? courseCode.trim() : "",
      name: trimmed,
      status: "none" as CourseStatus,
    };

    try {
      const { col } = getUserAcademicProfile();
      let colId = (col?.id && !isNaN(Number(col.id))) ? Number(col.id) : 1;
      const created = await browseService.createCourse(colId, trimmed);
      if (created) {
        newCourse = {
          ...created,
          code: courseCode?.trim() && courseCode.trim().toUpperCase() !== "CUSTOM"
            ? courseCode.trim()
            : (created.code && created.code.toUpperCase() !== "CUSTOM" ? created.code : ""),
        };
        // Enroll in newly created course on Neon cloud database
        await browseService.enrollCourse(created.id).catch(() => {});
      }
    } catch (err) {
      console.warn("Could not create course in backend:", err);
    }

    const nextList = [newCourse, ...courseList.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase())];
    setCourseList(nextList);
    saveUserCourses(nextList);
    setSel(String(newCourse.id));
    setOpen(false);
    setName("");
    setCode("");
    toast.success(`Course "${trimmed}" added to My Courses! ✨`);
  };

  const handleDeleteCourse = async (
    courseId: string | number,
    e?: React.MouseEvent,
    skipPrompt: boolean = false
  ) => {
    e?.stopPropagation();
    if (!skipPrompt && !window.confirm("Are you sure you want to delete this course from your courses?")) return;

    try {
      if (courseId && !String(courseId).startsWith("course-") && !String(courseId).startsWith("c-")) {
        await browseService.unenrollCourse(courseId).catch(() => {});
        await browseService.deleteCourse(courseId).catch(() => {});
      }
      const deletedCourse = courseList.find((c) => String(c.id) === String(courseId));
      if (deletedCourse) {
        deleteExam(deletedCourse.name);
      }

      const nextList = courseList.filter((c) => String(c.id) !== String(courseId));
      setCourseList(nextList);
      saveUserCourses(nextList);
      if (String(sel) === String(courseId)) {
        setSel(nextList.length > 0 ? String(nextList[0].id) : "");
      }
      toast.success("Course removed successfully.");
    } catch (err: any) {
      console.error("Delete course error:", err);
      toast.error(err?.message || "Failed to delete course.");
    }
  };

  const course = courseList.find((c) => String(c.id) === String(sel)) ?? courseList[0];

  useEffect(() => {
    if (!course) return;
    const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
    if (isRealId && (!course.topics || course.topics.length === 0)) {
      setLoadingSelectedTopics(true);
      browseService
        .getCourseTopics(course.id)
        .then((ts) => {
          if (ts && ts.length > 0) {
            handleCourseStatusUpdate("ready", ts, course.id);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingSelectedTopics(false);
        });
    }
  }, [course?.id]);

  const handleResetChapters = async (courseId?: number | string) => {
    const targetId = courseId || course?.id;
    if (!targetId) return;
    try {
      const isRealId = targetId && !String(targetId).startsWith("course-") && !String(targetId).startsWith("c-");
      if (isRealId) {
        await browseService.resetCourseSyllabus(targetId).catch(() => {});
      }
    } catch (err) {
      console.warn("Could not reset syllabus on backend:", err);
    }
    handleCourseStatusUpdate("none", []);
    toast.success("Syllabus materials reset. You can now upload fresh documents.");
  };

  const handleCourseStatusUpdate = (updatedStatus: CourseStatus, newTopics?: Topic[], updatedId?: number | string) => {
    if (!course) return;
    const finalId = updatedId || course.id;
    const updated = courseList.map((c) =>
      String(c.id) === String(course.id)
        ? {
            ...c,
            id: finalId,
            status: updatedStatus,
            topics: newTopics !== undefined ? newTopics : c.topics || [],
          }
        : c
    );
    setCourseList(updated);
    saveUserCourses(updated);
    if (finalId !== course.id) {
      setSel(String(finalId));
    }
    const current = updated.find((c) => String(c.id) === String(finalId));
    if (current) saveActiveCourse(current);
  };

  return (
    <div>
      <PageTitle title="My Courses" sub="Manage your courses and study materials" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">College Courses</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" /> Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Course</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddCourse(name, code);
                  }}
                  className="mt-2 flex flex-col gap-4"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="c-name">Course name</Label>
                    <Input
                      id="c-name"
                      placeholder="e.g. Software Engineering"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="c-code">Course code (optional)</Label>
                    <Input
                      id="c-code"
                      placeholder="e.g. CS 380"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  {collegeCatalog.filter((cc) => !courseList.some((my) => my.name.toLowerCase() === cc.name.toLowerCase())).length > 0 && (
                    <div className="grid gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Available in your College (1-Click Enroll):
                      </Label>
                      <div className="flex max-h-36 flex-wrap gap-1.5 overflow-auto pt-1">
                        {collegeCatalog
                          .filter((cc) => !courseList.some((my) => my.name.toLowerCase() === cc.name.toLowerCase()))
                          .map((cc) => (
                            <button
                              key={cc.id || cc.name}
                              type="button"
                              onClick={() => handleEnrollFromCatalog(cc)}
                              className="rounded-lg border border-primary/30 bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-primary hover:bg-primary/10 flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3 text-primary" />
                              {cc.code && cc.code.toUpperCase() !== "CUSTOM" ? `${cc.code} · ` : ""}{cc.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Suggestions:</Label>
                    <div className="flex max-h-36 flex-wrap gap-1.5 overflow-auto pt-1">
                      {catalogSuggestions.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            setName(s.name);
                            setCode(s.code);
                          }}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:bg-accent",
                            name === s.name && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                          )}
                        >
                          {s.code} · {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" variant="magic" className="mt-2" disabled={!name.trim()}>
                    Add to My Courses
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {courseList.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
              No courses added yet.
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Course
              </Button>
            </div>
          ) : (
            courseList.map((c) => (
              <div
                key={c.id}
                onClick={() => setSel(String(c.id))}
                className={cn(
                  "group relative cursor-pointer rounded-xl border bg-card p-4 text-left shadow-soft transition hover:border-primary/50",
                  String(sel) === String(c.id) && "border-primary ring-2 ring-primary/30"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    {c.code && c.code.toUpperCase() !== "CUSTOM" && (
                      <div className="text-xs font-bold text-muted-foreground">{c.code}</div>
                    )}
                    <div className="font-semibold">{c.name}</div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <HoldToConfirmButton
                      duration={1300}
                      onConfirm={() => handleDeleteCourse(c.id, undefined, true)}
                      className="h-7 min-w-0 px-2 py-0 text-xs font-semibold gap-1 opacity-50 transition hover:opacity-100 group-hover:opacity-100"
                      title="Hold to delete course"
                    >
                      <Trash2 className="h-3 w-3" />
                    </HoldToConfirmButton>
                  </div>
                </div>
                <div className="mt-2">
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))
          )}
        </div>

        {courseList.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Genie pose="low" className="mb-4 h-24 w-24" />
            <h2 className="text-xl font-semibold text-foreground">Welcome to College Courses</h2>
            <p className="mt-1 max-w-sm text-sm">
              Add a course you are taking this semester to upload its syllabus and create tailored study plans.
            </p>
            <Button onClick={() => setOpen(true)} variant="magic" className="mt-6">
              <Plus className="mr-1 h-4 w-4" /> Add Your First Course
            </Button>
          </Card>
        ) : loadingSelectedTopics ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Loading Course Syllabus...</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Retrieving chapters and topics from your college library.
            </p>
          </Card>
        ) : course && ((course.status === "ready" && course.topics && course.topics.length > 0) || (course.topics && course.topics.length > 0)) ? (
          <JoinChallenge
            key={String(course.id) || course.name}
            course={course}
            onTopicsUpdated={(newTopics) => handleCourseStatusUpdate("ready", newTopics)}
            onResetChapters={() => handleResetChapters(course.id)}
            onDeleteCourse={() => handleDeleteCourse(course.id)}
          />
        ) : (
          <EmptyUpload
            key={String(course?.id) || course?.name || "empty"}
            processing={course?.status === "processing"}
            course={course}
            onReady={(extractedTopics, realId) => handleCourseStatusUpdate("ready", extractedTopics, realId)}
            onDeleteCourse={() => handleDeleteCourse(course?.id || "")}
          />
        )}
      </div>
    </div>
  );
}

function EmptyUpload({
  processing,
  course,
  onReady,
  onDeleteCourse,
}: {
  processing: boolean;
  course?: Course | undefined;
  onReady: (newTopics?: Topic[], updatedId?: number | string) => void;
  onDeleteCourse?: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isApiFinished, setIsApiFinished] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const handleUpdateTargetExamDate = (newDate: Date) => {
    setDate(newDate);
    const dateStr = toLocalDateStr(newDate);

    try {
      saveExam({
        id: courseExam?.id,
        course: course.name,
        type: courseExam?.type || "Final Exam",
        date: dateStr,
        professor: courseExam?.professor || "",
        uploaderName: courseExam?.uploaderName || "You",
      });

      const curCourses = getUserCourses();
      const cIdx = curCourses.findIndex(
        (c) => String(c.id) === String(course.id) || c.name.toLowerCase().trim() === course.name.toLowerCase().trim()
      );
      if (cIdx !== -1) {
        curCourses[cIdx] = { ...curCourses[cIdx], ...course };
      } else {
        curCourses.push(course);
      }
      saveUserCourses(curCourses);

      toast.success(`Target exam date for ${course.name} set to ${dateStr}`);
    } catch (e) {
      console.warn("Could not auto-save exam date:", e);
    }
  };

  const handleFileUpload = async (fileList?: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) =>
      f.name.match(/\.(pdf|pptx|ppt|txt|md)$/i) ||
      f.type === "application/pdf" ||
      f.type.includes("presentation") ||
      f.type.includes("powerpoint") ||
      f.type.includes("text")
    );

    if (files.length === 0) {
      toast.error("Please select a PDF, PowerPoint presentation, or document.");
      return;
    }

    setFileCount(files.length);
    setAnalyzing(true);
    setIsApiFinished(false);

    try {
      // 1. Ensure course has a real numeric ID in Neon PostgreSQL so chapters are saved to cloud DB
      let targetCourseId = course?.id;
      if (!targetCourseId || String(targetCourseId).startsWith("course-") || String(targetCourseId).startsWith("c-")) {
        try {
          const { col } = getUserAcademicProfile();
      let colId = (col?.id && !isNaN(Number(col.id))) ? Number(col.id) : 1;
          const created = await browseService.createCourse(colId, course?.name || "My Course");
          if (created?.id) {
            targetCourseId = created.id;
            await browseService.enrollCourse(created.id).catch(() => {});
          }
        } catch (err) {
          console.warn("Could not ensure course in cloud DB:", err);
        }
      }

      const allExtractedTopics: Topic[] = [];
      const seenTitles = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (files.length > 1) {
          toast.info(`Analyzing document ${i + 1} of ${files.length}: ${file.name}`);
        }
        const parsed = await syllabusService.parseSyllabus(file, course?.name, targetCourseId);
        const topicsList = parsed?.topics || parsed?.data?.topics || [];
        if (topicsList.length > 0) {
          for (const t of topicsList) {
            let title = (t.categoryTitle || t.category_title || t.chapter_title || t.chapterTitle || t.name || "").trim().replace(/\s*\(Part\s*\d+\)$/i, "").trim();
            if (!title) continue;
            const normKey = title.replace(/^chapter\s*\d+[:\s.-]*/i, "").trim().toLowerCase();
            if (seenTitles.has(normKey)) continue; // Strictly prevent duplicate syllabus chapters
            seenTitles.add(normKey);

            const subtopicsList = (t.subtopics || []).map((s: any) =>
              typeof s === "object" && s !== null ? (s.title ? `${s.title}: ${s.summary || ""}`.trim() : JSON.stringify(s)) : String(s)
            );
            const excerpt = t.content_excerpt || t.contentExcerpt || (
              Array.isArray(t.subtopics)
                ? t.subtopics.map((s: any) => typeof s === "object" && s?.summary ? `${s.title}: ${s.summary}` : "").filter(Boolean).join("\n\n")
                : ""
            );

            allExtractedTopics.push({
              id: t.order_index || t.orderIndex || (allExtractedTopics.length + 1),
              name: title,
              durationMinutes: Math.round((t.estimated_hours || t.estimatedHours || 2) * 60),
              importance: t.importance || 4,
              subtopics: subtopicsList,
              contentExcerpt: excerpt,
            });
          }
        }

        const flashcardsList = (parsed?.flashcards || parsed?.data?.flashcards || []).slice(0, 10);
        if (flashcardsList.length > 0) {
          try {
            const allKits = getUserTaskKits();
            const kitKey = (course?.name || "course").toLowerCase().trim();
            const currentKit = allKits[kitKey] || { flashcards: [], quiz: [] };
            const existing = currentKit.flashcards || [];
            const mappedNew = flashcardsList.map((fc: any, fIdx: number) => ({
              id: `fc-${Date.now()}-${fIdx}`,
              front: fc.question || fc.q || fc.front || "Question",
              back: fc.answer || fc.a || fc.back || "Answer",
              q: fc.question || fc.q || fc.front || "Question",
              a: fc.answer || fc.a || fc.back || "Answer",
              chapter: fc.topicTag || course?.name || "Key Concepts",
            }));
            allKits[kitKey] = {
              ...currentKit,
              flashcards: [...mappedNew, ...existing].slice(0, 10),
            };
            saveUserTaskKits(allKits);
            toast.success(`Generated ${flashcardsList.length} high-yield study flashcards! ✨`);
          } catch (e) {
            console.warn("Could not save flashcards locally:", e);
          }
        }
      }

      // Check remote DB topics if real ID
      let finalTopics = allExtractedTopics;
      if (targetCourseId && !String(targetCourseId).startsWith("course-") && !String(targetCourseId).startsWith("c-")) {
        try {
          const remoteTopics = await browseService.getCourseTopics(targetCourseId);
          if (remoteTopics && remoteTopics.length > 0) {
            finalTopics = remoteTopics.map((rt) => {
              const matching = allExtractedTopics.find((at) => at.name.toLowerCase() === rt.name.toLowerCase());
              return {
                ...rt,
                subtopics: matching?.subtopics || rt.subtopics || [],
                contentExcerpt: rt.contentExcerpt || matching?.contentExcerpt || "",
                importance: matching?.importance || 3,
              };
            });
          }
        } catch {}
      }

      if (finalTopics.length === 0) {
        throw new Error("No topics could be extracted from this document. Please ensure it has readable text.");
      }

      // Signal completion to MagicLoader and smoothly transition
      setIsApiFinished(true);
      setTimeout(() => {
        setAnalyzing(false);
        toast.success(`Successfully analyzed chapter materials! ${finalTopics.length} chapters ready ✨`);
        onReady(finalTopics, targetCourseId);
      }, 600);
    } catch (err: any) {
      console.error("Document parse error:", err);
      toast.error(err?.message || "Could not parse document. Please check the file and try again.");
      setAnalyzing(false);
      setIsApiFinished(false);
    }
  };

  if (processing || analyzing) {
    return (
      <Card className="py-6">
        <MagicLoader
          duration={22000}
          courseTitle={course?.name || "Uploaded Chapter & Materials"}
          isComplete={isApiFinished}
        />
      </Card>
    );
  }

  return (
    <Card className="relative flex flex-col items-center py-12 text-center">
      {course && (
        <div className="mb-4 flex w-full items-center justify-between border-b pb-4">
          <div className="text-left">
            {course.code && course.code.toUpperCase() !== "CUSTOM" && (
              <span className="text-xs font-bold uppercase text-muted-foreground">{course.code}</span>
            )}
            <h3 className="text-lg font-semibold">{course.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 h-8 text-xs font-semibold"
              onClick={() => setReportDialogOpen(true)}
              title="Report this course if syllabus or details are incorrect"
            >
              <Flag className="h-3.5 w-3.5 text-amber-500" /> Report Course
            </Button>
            {onDeleteCourse && (
              <HoldToConfirmButton
                duration={1500}
                onConfirm={() => onDeleteCourse()}
                className="h-8 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hold to Delete
              </HoldToConfirmButton>
            )}
          </div>
        </div>
      )}
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-magic text-primary-foreground shadow-glow">
        <Upload className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold">Upload Syllabus or Chapters</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Upload your syllabus or lecture slide decks (PDF, PPT, PPTX) to extract all topics and build your schedule.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        className={cn(
          "mt-6 flex w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition",
          drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input
          type="file"
          id="course-file-upload"
          className="hidden"
          multiple
          accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <label htmlFor="course-file-upload" className="cursor-pointer">
          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
          <span className="block text-xs text-muted-foreground">PDF (.pdf) or PowerPoint (.ppt, .pptx) files up to 25MB</span>
        </label>
      </div>
      {course && (
        <ReportCourseDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          courseName={course.name}
          courseId={course.id}
        />
      )}
    </Card>
  );
}

function JoinChallenge({
  course,
  onTopicsUpdated,
  onResetChapters,
  onDeleteCourse,
}: {
  course: Course;
  onTopicsUpdated?: (newTopics: Topic[]) => void;
  onResetChapters?: () => void;
  onDeleteCourse?: () => void;
}) {
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseExam = loadExams().find(
    (e) => e.course.toLowerCase().trim() === course.name.toLowerCase().trim()
  );
  const [date, setDate] = useState<Date | undefined>(() => {
    if (courseExam?.date) {
      const parsed = new Date(courseExam.date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d;
  });
  const [mode, setMode] = useState<"normal" | "survival">("normal");
  const [dailyHours, setDailyHours] = useState<number>(2.5);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingMore, setUploadingMore] = useState(false);
  const [expandedTopicIndex, setExpandedTopicIndex] = useState<number | null>(null);
  const [topics, setTopics] = useState<Topic[]>(() => course.topics || []);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualHours, setManualHours] = useState("2");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);



  useEffect(() => {
    if (course.topics && course.topics.length > 0) {
      setTopics(course.topics);
    } else if (course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-")) {
      setTopics([]);
      browseService
        .getCourseTopics(course.id)
        .then((ts) => {
          if (ts && ts.length > 0) {
            setTopics(ts);
            onTopicsUpdated?.(ts);
          } else {
            setTopics([]);
          }
        })
        .catch(() => {
          setTopics([]);
        });
    } else {
      setTopics([]);
    }
  }, [course.id, course.name, course.topics]);

  const handleUploadMoreChapters = async (fileList?: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) =>
      f.name.match(/\.(pdf|pptx|ppt)$/i) ||
      f.type === "application/pdf" ||
      f.type.includes("presentation") ||
      f.type.includes("powerpoint")
    );
    if (files.length === 0) {
      toast.error("Please select a PDF or PowerPoint (.pptx, .ppt) presentation.");
      return;
    }

    setUploadingMore(true);
    try {
      toast.info(`Extracting chapters from ${files.length} document(s)...`);
      let currentTopics = deduplicateTopics(topics);
      const seenTitles = new Set(
        currentTopics.map((t) =>
          t.name.replace(/\s*\(Part\s*\d+\)$/i, "").replace(/^chapter\s*\d+[:\s.-]*/i, "").trim().toLowerCase()
        )
      );

      for (let i = 0; i < files.length; i++) {
        const parsed = await syllabusService.parseSyllabus(files[i], course.name, course.id);
        const topicsList = parsed?.topics || parsed?.data?.topics || [];
        if (topicsList.length > 0) {
          for (const item of topicsList) {
            let title = (item.categoryTitle || item.category_title || item.chapter_title || item.chapterTitle || item.name || "").trim().replace(/\s*\(Part\s*\d+\)$/i, "").trim();
            if (!title) continue;
            const normKey = title.replace(/^chapter\s*\d+[:\s.-]*/i, "").trim().toLowerCase();
            if (seenTitles.has(normKey)) continue; // Strictly prevent duplicate syllabus chapters
            seenTitles.add(normKey);

            const subtopicsList = (item.subtopics || []).map((s: any) =>
              typeof s === "object" && s !== null ? (s.title ? `${s.title}: ${s.summary || ""}`.trim() : JSON.stringify(s)) : String(s)
            );
            const excerpt = item.content_excerpt || item.contentExcerpt || (
              Array.isArray(item.subtopics)
                ? item.subtopics.map((s: any) => typeof s === "object" && s?.summary ? `${s.title}: ${s.summary}` : "").filter(Boolean).join("\n\n")
                : ""
            );

            currentTopics.push({
              id: item.order_index || item.orderIndex || (currentTopics.length + 1),
              name: title,
              durationMinutes: Math.round((item.estimated_hours || item.estimatedHours || 2) * 60),
              importance: item.importance || 4,
              subtopics: subtopicsList,
              contentExcerpt: excerpt,
            });
          }
        }

        const flashcardsList = (parsed?.flashcards || parsed?.data?.flashcards || []).slice(0, 10);
        if (flashcardsList.length > 0) {
          try {
            const allKits = getUserTaskKits();
            const kitKey = course.name.toLowerCase().trim();
            const currentKit = allKits[kitKey] || { flashcards: [], quiz: [] };
            const existing = currentKit.flashcards || [];
            const mappedNew = flashcardsList.map((fc: any, fIdx: number) => ({
              id: `fc-${Date.now()}-${fIdx}`,
              front: fc.question || fc.q || fc.front || "Question",
              back: fc.answer || fc.a || fc.back || "Answer",
              q: fc.question || fc.q || fc.front || "Question",
              a: fc.answer || fc.a || fc.back || "Answer",
              chapter: fc.topicTag || course.name || "Key Concepts",
            }));
            allKits[kitKey] = {
              ...currentKit,
              flashcards: [...mappedNew, ...existing].slice(0, 10),
            };
            saveUserTaskKits(allKits);
            toast.success(`Generated ${flashcardsList.length} study flashcards! ✨`);
          } catch (e) {
            console.warn("Could not save flashcards locally:", e);
          }
        }
      }
      currentTopics = deduplicateTopics(currentTopics);

      // If real backend course, fetch latest from DB
      const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
      if (isRealId) {
        try {
          const fresh = await browseService.getCourseTopics(course.id);
          if (fresh && fresh.length > 0) currentTopics = fresh;
        } catch {}
      }

      setTopics(currentTopics);
      onTopicsUpdated?.(currentTopics);
      toast.success("Additional chapter(s) added successfully! ✨");
    } catch (err: any) {
      console.error("Error adding chapter files:", err);
      toast.error(err?.message || "Failed to parse chapter document.");
    } finally {
      setUploadingMore(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddManualTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = manualTitle.trim();
    if (!title) return;
    const norm = title.replace(/\s*\(Part\s*\d+\)$/i, "").replace(/^chapter\s*\d+[:\s.-]*/i, "").trim().toLowerCase();
    if (topics.some((t) => t.name.replace(/\s*\(Part\s*\d+\)$/i, "").replace(/^chapter\s*\d+[:\s.-]*/i, "").trim().toLowerCase() === norm)) {
      toast.info("This chapter already exists in your syllabus.");
      setAddDialogOpen(false);
      return;
    }
    const hours = parseFloat(manualHours) || 2;

    try {
      const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
      let newTopicItem: Topic;
      if (isRealId) {
        newTopicItem = await browseService.addCourseTopic(course.id, title, hours);
      } else {
        newTopicItem = {
          id: topics.length + 1,
          name: title,
          durationMinutes: Math.round(hours * 60),
          importance: 3,
        };
      }
      const updated = [...topics, newTopicItem];
      setTopics(updated);
      onTopicsUpdated?.(updated);
      setManualTitle("");
      setManualHours("2");
      setAddDialogOpen(false);
      toast.success("Chapter added!");
    } catch (err: any) {
      console.error("Error adding chapter:", err);
      toast.error(err?.message || "Failed to add chapter");
    }
  };

  const handleDeleteTopic = async (topicId: number | string, index: number) => {
    try {
      const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
      if (isRealId && topicId) {
        await browseService.deleteCourseTopic(course.id, topicId).catch((err) => {
          console.warn("Backend topic delete warning:", err);
        });
      }
      const updated = topics.filter((_, idx) => idx !== index);
      setTopics(updated);
      onTopicsUpdated?.(updated);
      toast.success("Chapter removed");
    } catch (err: any) {
      console.error("Error deleting chapter:", err);
      const updated = topics.filter((_, idx) => idx !== index);
      setTopics(updated);
      onTopicsUpdated?.(updated);
      toast.success("Chapter removed");
    }
  };

  const handleGeneratePlan = async () => {
    const effectiveTopics = topics.length > 0 ? topics : (course.topics || []);
    if (!effectiveTopics || effectiveTopics.length === 0) {
      toast.warning("Cannot generate study plan: Please upload the course syllabus or lecture slides first.");
      setPlanModalOpen(false);
      setLoading(false);
      return;
    }
    setPlanModalOpen(false);
    setLoading(true);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // If target date is today or in past, automatically bump to 14 days ahead
    if (targetDate.getTime() <= now.getTime()) {
      targetDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      setDate(targetDate);
    }

    const dateStr = targetDate.toISOString().slice(0, 10);
    const startDateStr = new Date().toISOString().slice(0, 10);

    // Sync to Exam store & backend so Dashboard upper panel and exam cards reflect target exam immediately
    try {
      saveExam({
        id: courseExam?.id,
        course: course.name,
        type: courseExam?.type || "Final Exam",
        date: dateStr,
        professor: courseExam?.professor || "",
        uploaderName: courseExam?.uploaderName,
      });
    } catch (examErr) {
      console.warn("Could not sync exam locally:", examErr);
    }

    const daysUntil = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const bufferDays = daysUntil <= 3 ? 0 : daysUntil <= 7 ? 1 : 2;
    const effDailyHours = mode === "survival" ? Math.max(3.5, dailyHours) : dailyHours;

    try {
      let planData: any = null;
      const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
      if (isRealId) {
        try {
          planData = await browseService.generateOrUpdatePlan(course.id, {
            examDate: dateStr,
            dailyHours: effDailyHours,
            mode,
          });
        } catch (planErr) {
          console.warn("Could not regenerate via /plan endpoint, trying fallback joinCourse:", planErr);
          try {
            planData = await browseService.joinCourse(course.id, {
              examDate: dateStr,
              dailyHours: effDailyHours,
              mode,
            });
          } catch (joinErr) {
            console.warn("Could not join via course ID, attempting direct plan generation", joinErr);
          }
        }
      }

      if (!planData) {
        const activeTopics: Topic[] = effectiveTopics;
        if (!activeTopics || activeTopics.length === 0) {
          throw new Error("No syllabus topics available to generate a study plan. Please upload course material first.");
        }
        const topicsPayload = activeTopics.map((t: Topic, idx: number) => ({
          ref: String(t.id || idx + 1),
          topicRef: String(t.id || idx + 1),
          topic_ref: String(t.id || idx + 1),
          chapterTitle: t.name,
          chapter_title: t.name,
          orderIndex: idx + 1,
          order_index: idx + 1,
          estimatedHours: Math.max(0.5, (t.durationMinutes || 120) / 60),
          estimated_hours: Math.max(0.5, (t.durationMinutes || 120) / 60),
          importance: t.importance || 3,
          subtopics: t.subtopics || [],
        }));

        const res = await fetchApi<any>("/api/v1/study-plans/generate", {
          method: "POST",
          body: JSON.stringify({
            startDate: startDateStr,
            start_date: startDateStr,
            examDate: dateStr,
            exam_date: dateStr,
            topics: topicsPayload,
            dailyHours: mode === "survival" ? 4.0 : 2.5,
            daily_hours: mode === "survival" ? 4.0 : 2.5,
            restDays: [6],
            rest_weekdays: [6],
            mode: mode.toUpperCase(),
            bufferDays: bufferDays,
            buffer_days_before_exam: bufferDays,
            reviewRatio: 0.2,
            review_ratio: 0.2,
          }),
        });
        planData = res.data;
      }

      if (planData) {
        const prefix = getUserStoragePrefix();
        try {
          saveActivePlan(planData);
          if (course.id) {
            localStorage.setItem(`sg-${prefix}-plan-${course.id}`, JSON.stringify(planData));
            if (prefix === "guest") localStorage.setItem(`sg-plan-${course.id}`, JSON.stringify(planData));
          }
          localStorage.setItem(`sg-${prefix}-plan-${course.name}`, JSON.stringify(planData));
          if (prefix === "guest") localStorage.setItem(`sg-plan-${course.name}`, JSON.stringify(planData));
        } catch {}
      }
      const updatedCourse = {
        ...course,
        topics: topics.length > 0 ? topics : course.topics,
      };
      saveActiveCourse(updatedCourse);
      
      const userCourses = getUserCourses();
      const cIdx = userCourses.findIndex((c) => String(c.id) === String(course.id) || c.name.toLowerCase().trim() === course.name.toLowerCase().trim());
      if (cIdx !== -1) {
        userCourses[cIdx] = updatedCourse;
      } else {
        userCourses.push(updatedCourse);
      }
      saveUserCourses(userCourses);

      toast.success("Study plan successfully generated! ✨");
      nav({ to: "/plan" });
    } catch (err: any) {
      console.error("Plan generation error:", err);
      toast.error(err?.message || "Failed to generate study plan");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="py-6">
        <MagicLoader courseTitle={course.name} onDone={() => nav({ to: "/plan" })} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{course.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">
              {topics.length > 0 ? `${topics.length} chapters / topics ready` : "No chapters added yet"}
            </p>
            {courseExam?.uploaderName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <User className="h-3 w-3" /> Uploaded by: {courseExam.uploaderName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            onChange={(e) => handleUploadMoreChapters(e.target.files)}
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={uploadingMore}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploadingMore ? "Parsing..." : "+ Upload Chapter / Slides"}
          </Button>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Chapter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Chapter Manually</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddManualTopic} className="mt-2 flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ch-title">Chapter / Topic Title</Label>
                  <Input
                    id="ch-title"
                    placeholder="e.g. Chapter 4: Graph Algorithms"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ch-hours">Estimated Study Hours</Label>
                  <Input
                    id="ch-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="40"
                    placeholder="2.0"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="magic" className="mt-2" disabled={!manualTitle.trim()}>
                  Add Chapter
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
            onClick={() => setReportDialogOpen(true)}
            title="Report this course if syllabus or details are incorrect"
          >
            <Flag className="h-3.5 w-3.5 text-amber-500" /> Report Course
          </Button>

          {onResetChapters && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={async () => {
                if (window.confirm(`Reset syllabus for "${course.name}"? You will be able to upload fresh materials or syllabus.`)) {
                  await onResetChapters();
                }
              }}
              title="Reset chapters and upload fresh materials"
            >
              <RotateCcw className="h-4 w-4" /> Reset Materials
            </Button>
          )}

          {onDeleteCourse && (
            <HoldToConfirmButton
              duration={1500}
              onConfirm={() => onDeleteCourse()}
              className="h-8 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hold to Delete
            </HoldToConfirmButton>
          )}
        </div>
      </div>

      {topics.length > 0 ? (
        <div className="grid gap-3">
          {topics.map((t, i) => {
            const isExpanded = expandedTopicIndex === i;
            return (
              <div
                key={t.id || t.name + i}
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm transition hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 font-display font-bold text-primary text-sm mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-foreground text-base leading-snug">{t.name}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {t.durationMinutes && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium">
                            <Clock className="h-3 w-3 text-primary" /> {t.durationMinutes}m est.
                          </span>
                        )}
                        {t.importance && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-semibold">
                            <Sparkles className="h-3 w-3" /> Yield: {t.importance}/5
                          </span>
                        )}
                        {t.subtopics && t.subtopics.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                            <BookOpen className="h-3 w-3" /> {t.subtopics.length} concepts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {(t.contentExcerpt || (t.subtopics && t.subtopics.length > 0)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedTopicIndex(isExpanded ? null : i)}
                        className="h-8 gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? "Hide Details" : "View Analysis"}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteTopic(t.id, i)}
                      title="Remove chapter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Subtopic chips */}
                {t.subtopics && t.subtopics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                    {t.subtopics.map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="rounded-lg bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground/80 border border-border/50"
                      >
                        • {sub}
                      </span>
                    ))}
                  </div>
                )}

                {/* Deep Academic Summary Excerpt */}
                {isExpanded && t.contentExcerpt && (
                  <div className="mt-3 rounded-xl bg-accent/40 border border-primary/20 p-3.5 text-xs text-muted-foreground leading-relaxed">
                    <div className="flex items-center gap-1.5 font-semibold text-primary mb-1.5 text-xs">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Deep Academic Analysis & Core Principles:</span>
                    </div>
                    <p className="whitespace-pre-line text-foreground/90 font-normal leading-normal">{t.contentExcerpt}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          No chapters added yet. Upload PowerPoint slides / syllabus or add chapters manually above to generate your plan.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-bold">Target exam date</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon /> {date ? date.toDateString() : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (newDate.getTime() <= today.getTime()) {
                      toast.info("Please pick a future date for your exam.");
                      return;
                    }
                    handleUpdateTargetExamDate(newDate);
                  }
                }}
                disabled={(d) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return d.getTime() <= today.getTime();
                }}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <div className="mb-2 text-sm font-bold">Mode</div>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["normal", "survival"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode((prev) => (prev === m && m === "survival" ? "normal" : m))}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold capitalize transition",
                  mode === m &&
                    (m === "normal"
                      ? "bg-card text-primary shadow-soft"
                      : "bg-destructive text-destructive-foreground")
                )}
              >
                {m === "normal" ? <Shield className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button
        variant="magic"
        size="lg"
        className="mt-6 w-full gap-2 text-base font-bold shadow-soft"
        onClick={() => {
          const effective = topics.length > 0 ? topics : (course.topics || []);
          if (!effective || effective.length === 0) {
            toast.warning("Cannot generate study plan: Please upload your syllabus or chapter documents first.");
            return;
          }
          setPlanModalOpen(true);
        }}
      >
        <Wand2 className="h-5 w-5" /> Generate My Plan
      </Button>

      {/* Target Timeline & Exam Schedule Modal Dialog */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Set Target Exam Time & Timeline
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Configure your exam date and target daily study hours for{" "}
              <span className="font-semibold text-foreground">{course.name}</span> to generate an optimized, day-by-day plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Exam Date Selection */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Target Exam Date
                </Label>
                {date && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {Math.max(1, Math.ceil((date.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))} days remaining
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "7 Days (Sprint)", days: 7 },
                  { label: "14 Days (Balanced)", days: 14 },
                  { label: "21 Days", days: 21 },
                  { label: "30 Days (Deep Study)", days: 30 },
                ].map((preset) => {
                  const pDate = new Date();
                  pDate.setDate(pDate.getDate() + preset.days);
                  pDate.setHours(0, 0, 0, 0);
                  const isSelected = date && date.toDateString() === pDate.toDateString();
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => handleUpdateTargetExamDate(pDate)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-semibold transition border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background border-border/60 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      +{preset.label}
                    </button>
                  );
                })}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm font-medium mt-1">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {date ? date.toDateString() : "Pick custom exam date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (newDate.getTime() <= today.getTime()) {
                          toast.info("Please pick a future date for your exam.");
                          return;
                        }
                        handleUpdateTargetExamDate(newDate);
                      }
                    }}
                    disabled={(d) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return d.getTime() <= today.getTime();
                    }}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Target Daily Study Time */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Target Daily Study Time
                </Label>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-primary font-mono">{dailyHours}</span>
                  <span className="text-xs font-semibold text-muted-foreground">hours / day</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[1.5, 2.0, 2.5, 3.5, 4.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDailyHours(h)}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-xs font-bold transition border",
                      dailyHours === h
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border/60 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Study Mode */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Pacing & Strategy
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("normal")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                    mode === "normal"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 bg-background hover:bg-muted/60 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Shield className="h-4 w-4" /> Normal Mode
                  </div>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    Balanced daily rhythm with structured rest & review days.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("survival")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                    mode === "survival"
                      ? "border-destructive bg-destructive/10 text-destructive shadow-xs"
                      : "border-border/60 bg-background hover:bg-muted/60 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Flame className="h-4 w-4" /> Survival Mode
                  </div>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    Intense cram sprint designed for upcoming deadlines.
                  </span>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="magic" className="gap-2" onClick={handleGeneratePlan} disabled={loading}>
              <Wand2 className="h-4 w-4" />
              Generate Study Plan ({topics.length} Chapters)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReportCourseDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        courseName={course.name}
        courseId={course.id}
      />
    </Card>
  );
}
