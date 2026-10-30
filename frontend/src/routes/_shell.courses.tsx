import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarIcon, Clock, Flame, Plus, RotateCcw, Shield, Trash2, Upload, Wand2, BookOpen, ChevronDown, ChevronUp, Sparkles, Loader2, Flag, User, Brain, HelpCircle, Check, Pencil } from "lucide-react";

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

import { browseService, syllabusService, examService } from "@/lib/api/services";

import { fetchApi, getStoredAccessToken } from "@/lib/api/client";

import { deduplicateTopics, getUserCourses, saveUserCourses, getUserTaskKits, saveUserTaskKits, getUserStoragePrefix, toLocalDateStr, getActiveCourse, saveActiveCourse, getActivePlan, saveActivePlan, getUserAcademicProfile, isCourseMaterialUploaded } from "@/lib/courses-util";

import { clearExam, deleteExam, isCourseEnrolled, loadExam, loadExams, saveExam, daysUntil } from "@/lib/exam";

import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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

                <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                  <StatusBadge status={c.status} />
                  {(() => {
                    const cExam = loadExams().find(
                      (e) => (c.id && e.courseId && String(e.courseId) === String(c.id)) ||
                             e.course.toLowerCase().trim() === c.name.toLowerCase().trim()
                    );
                    if (!cExam) return null;
                    const dLeft = Math.max(0, daysUntil(cExam.date));
                    return (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary/80" title={`${cExam.type}: ${cExam.date}`}>
                        <CalendarIcon className="h-3 w-3" />
                        <span>{dLeft}d to {cExam.type.split(" ")[0]}</span>
                      </span>
                    );
                  })()}
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

              fileName: file.name,

              fileIndex: i + 1,

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
            const remoteMap = new Map<string, number | string>();
            remoteTopics.forEach((rt) => remoteMap.set(rt.name.trim().toLowerCase(), rt.id));
            finalTopics = allExtractedTopics.map((at) => {
              const dbId = remoteMap.get(at.name.trim().toLowerCase());
              return {
                ...at,
                id: dbId ?? at.id,
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



interface TopicSubtopicItem {
  id: string;
  title: string;
  explanation: string;
}

interface ChapterFileGroup {
  id: string;
  chapterNumber: number;
  fileName: string;
  chapterTitle: string;
  durationMinutes: number;
  topics: Topic[];
}

function findAnalysisInExcerpt(topicTitle: string, excerpt: string): string {
  if (!topicTitle || !excerpt) return "";
  const normTitle = topicTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normTitle) return "";
  const blocks = excerpt.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const colonIdx = block.indexOf(":");
    if (colonIdx > 0) {
      const header = block.substring(0, colonIdx).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (header.includes(normTitle) || normTitle.includes(header)) {
        return block.substring(colonIdx + 1).trim();
      }
    }
  }
  const lines = excerpt.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const header = line.substring(0, colonIdx).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (header.includes(normTitle) || normTitle.includes(header)) {
        return line.substring(colonIdx + 1).trim();
      }
    }
  }
  return "";
}

function extractTopicSubtopics(topic: Topic, topicIdx: number): TopicSubtopicItem[] {
  const result: TopicSubtopicItem[] = [];
  const seenTitles = new Set<string>();

  // 1. If topic.subtopics has items
  if (Array.isArray(topic.subtopics) && topic.subtopics.length > 0) {
    topic.subtopics.forEach((sub: any, sIdx: number) => {
      let title = "";
      let explanation = "";

      if (typeof sub === "object" && sub !== null) {
        title = (sub.title || sub.name || `Subtopic ${sIdx + 1}`).trim();
        explanation = (sub.summary || sub.analysis || sub.explanation || sub.description || "").trim();
      } else if (typeof sub === "string") {
        const trimmed = sub.trim();
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0 && colonIdx < 120 && colonIdx < trimmed.length - 1) {
          title = trimmed.substring(0, colonIdx).trim();
          explanation = trimmed.substring(colonIdx + 1).trim();
        } else {
          title = trimmed;
        }
      }

      title = title.replace(/^[-•*]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();

      if (title && !seenTitles.has(title.toLowerCase())) {
        seenTitles.add(title.toLowerCase());
        if (!explanation && topic.contentExcerpt) {
          explanation = findAnalysisInExcerpt(title, topic.contentExcerpt);
        }
        result.push({
          id: `sub-${topic.id ?? topicIdx}-${sIdx}`,
          title,
          explanation: explanation || `Core conceptual breakdown, key formulas, and exam preparation takeaways for "${title}".`,
        });
      }
    });
  }

  // 2. If subtopics didn't yield items, parse from contentExcerpt
  if (result.length === 0 && topic.contentExcerpt) {
    const blocks = topic.contentExcerpt
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    blocks.forEach((block, bIdx) => {
      let title = "";
      let explanation = "";
      const colonIdx = block.indexOf(":");
      if (colonIdx > 0 && colonIdx < 120 && colonIdx < block.length - 1) {
        title = block.substring(0, colonIdx).trim();
        explanation = block.substring(colonIdx + 1).trim();
      } else {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          title = lines[0];
          explanation = lines.slice(1).join("\n");
        } else {
          title = block.length > 70 ? block.substring(0, 67) + "..." : block;
          explanation = block;
        }
      }

      title = title.replace(/^[-•*]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
      if (title && !seenTitles.has(title.toLowerCase())) {
        seenTitles.add(title.toLowerCase());
        result.push({
          id: `sub-excerpt-${topic.id ?? topicIdx}-${bIdx}`,
          title,
          explanation: explanation || block,
        });
      }
    });
  }

  // 3. Fallback
  if (result.length === 0) {
    result.push({
      id: `sub-core-${topic.id ?? topicIdx}-0`,
      title: `${topic.name} - Core Principles`,
      explanation: topic.contentExcerpt || `Foundational principles, core terminology, definitions, and high-yield examination preparation points for ${topic.name}.`,
    });
  }

  return result;
}

function groupTopicsIntoChapters(topics: Topic[], courseName?: string): ChapterFileGroup[] {
  if (!topics || topics.length === 0) return [];

  // 1. Group by explicit chapter file tracking (fileName and fileIndex)
  const fileBuckets = new Map<string, { fileName: string; fileIndex: number; topics: Topic[] }>();
  const hasFileMarkers = topics.some((t) => (t.fileName && t.fileName.trim().length > 0) || (t.fileIndex && t.fileIndex > 1));

  if (hasFileMarkers) {
    topics.forEach((t) => {
      let fn = t.fileName?.trim();
      let fi = t.fileIndex;

      // Topics without explicit file markers default to Chapter 1
      if (!fn && (!fi || fi === 1)) {
        fn = `${courseName || "Course"}_Chapter_1.pdf`;
        fi = 1;
      } else if (!fn && fi) {
        fn = `Chapter_${fi}.pdf`;
      } else if (fn && !fi) {
        let existingFi: number | undefined;
        fileBuckets.forEach((b) => {
          if (b.fileName.toLowerCase() === fn!.toLowerCase()) existingFi = b.fileIndex;
        });
        fi = existingFi || (fileBuckets.size + 1);
      }

      const bucketKey = `f_${fi}_${fn}`;
      if (!fileBuckets.has(bucketKey)) {
        fileBuckets.set(bucketKey, { fileName: fn!, fileIndex: fi!, topics: [] });
      }
      fileBuckets.get(bucketKey)!.topics.push({
        ...t,
        fileName: fn,
        fileIndex: fi,
      });
    });

    const groups: ChapterFileGroup[] = [];
    let chapNumber = 1;

    fileBuckets.forEach(({ fileName, fileIndex, topics: fileTopics }) => {
      const totalMins = fileTopics.reduce((sum, t) => sum + (t.durationMinutes || 120), 0);
      const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/^[_-]+|[_-]+$/g, "");
      const isNamedChapter = /^(chapter|lecture|unit|module|week)\s*\d+/i.test(cleanName);
      const displayTitle = isNamedChapter ? cleanName : `Chapter ${chapNumber}: ${cleanName}`;

      groups.push({
        id: `chap-${chapNumber}-${fileName.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        chapterNumber: chapNumber,
        fileName,
        chapterTitle: displayTitle,
        durationMinutes: totalMins,
        topics: fileTopics,
      });
      chapNumber++;
    });

    return groups;
  }

  // 2. Fallback: check if topic titles explicitly indicate chapters (e.g. Chapter 1, Chapter 2)
  const chapterNamed = topics.filter((t) =>
    /^(chapter|lecture|unit|module|week)\s*\d+/i.test(t.name)
  );
  if (chapterNamed.length >= 2) {
    const titleBuckets = new Map<string, { title: string; num: number; topics: Topic[] }>();
    topics.forEach((t) => {
      const match = t.name.match(/^(chapter|lecture|unit|module|week)\s*(\d+)[:\s.-]*(.*)/i);
      const num = match ? parseInt(match[2], 10) : 1;
      const key = `ch_${num}`;
      if (!titleBuckets.has(key)) {
        titleBuckets.set(key, {
          title: match ? `${match[1]} ${match[2]}${match[3] ? `: ${match[3].trim()}` : ""}` : `Chapter ${num}`,
          num,
          topics: [],
        });
      }
      titleBuckets.get(key)!.topics.push(t);
    });

    const groups: ChapterFileGroup[] = [];
    let idx = 1;
    titleBuckets.forEach(({ title, num, topics: fileTopics }) => {
      const totalMins = fileTopics.reduce((sum, t) => sum + (t.durationMinutes || 120), 0);
      const fn = `Chapter_${num}.pdf`;
      groups.push({
        id: `chap-${idx}-${fn}`,
        chapterNumber: idx,
        fileName: fn,
        chapterTitle: title,
        durationMinutes: totalMins,
        topics: fileTopics.map((t) => ({ ...t, fileName: fn, fileIndex: idx })),
      });
      idx++;
    });
    return groups;
  }

  // 3. Fallback: single chapter for initial material
  const totalMins = topics.reduce((sum, t) => sum + (t.durationMinutes || 120), 0);
  const defaultFn = `${courseName || "Course_Material"}_Chapter_1.pdf`;
  return [
    {
      id: "chap-1-default",
      chapterNumber: 1,
      fileName: defaultFn,
      chapterTitle: `Chapter 1: ${courseName || "Course Material"}`,
      durationMinutes: totalMins,
      topics: topics.map((t) => ({ ...t, fileName: defaultFn, fileIndex: 1 })),
    },
  ];
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

  const allExams = loadExams();
  const courseExam = allExams.find(
    (e) => (course.id && e.courseId && String(e.courseId) === String(course.id)) ||
           e.course.toLowerCase().trim() === course.name.toLowerCase().trim()
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
  // Topics state declared before any usage
  const [topics, setTopics] = useState<Topic[]>(() => course.topics || []);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualHours, setManualHours] = useState("2");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Group topics into chapters (where each chapter is an uploaded material file)
  const chapters = useMemo(() => groupTopicsIntoChapters(topics, course.name), [topics, course.name]);

  // Chapter selection state (checkbox is for the CHAPTER / FILE, not individual topics)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(() => {
    return new Set(groupTopicsIntoChapters(course.topics || [], course.name).map((c) => c.id));
  });

  // Smooth expand/collapse state for chapter files
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(() => {
    return new Set(groupTopicsIntoChapters(course.topics || [], course.name).map((c) => c.id));
  });

  const toggleChapterKey = (chapterId: string) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const toggleSelectAllChapters = () => {
    if (selectedChapterIds.size === chapters.length) {
      setSelectedChapterIds(new Set());
    } else {
      setSelectedChapterIds(new Set(chapters.map((c) => c.id)));
    }
  };

  const toggleExpandChapter = (chapterId: string) => {
    setExpandedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const toggleExpandAllChapters = () => {
    if (expandedChapterIds.size === chapters.length) {
      setExpandedChapterIds(new Set());
    } else {
      setExpandedChapterIds(new Set(chapters.map((c) => c.id)));
    }
  };

  // Helper to extract all topics from the currently selected chapter files
  const getSelectedTopics = () => {
    const selectedChaps = chapters.filter((c) => selectedChapterIds.has(c.id));
    const list: Topic[] = [];
    selectedChaps.forEach((c) => {
      list.push(...c.topics);
    });
    return list;
  };

  const handleDeleteChapterFile = async (chap: ChapterFileGroup) => {
    try {
      const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
      if (isRealId) {
        for (const t of chap.topics) {
          if (t.id) {
            await browseService.deleteCourseTopic(course.id, t.id).catch(() => {});
          }
        }
      }
      const remainingTopics = topics.filter((t) => !chap.topics.some((ct) => ct.id === t.id && ct.name === t.name));
      setTopics(remainingTopics);
      onTopicsUpdated?.(remainingTopics);
      toast.success(`Removed chapter material "${chap.fileName}"`);
    } catch (err: any) {
      console.error("Error deleting chapter file:", err);
      const remainingTopics = topics.filter((t) => !chap.topics.some((ct) => ct.id === t.id && ct.name === t.name));
      setTopics(remainingTopics);
      onTopicsUpdated?.(remainingTopics);
      toast.success(`Removed chapter material "${chap.fileName}"`);
    }
  };

  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examFormType, setExamFormType] = useState<string>(() => courseExam?.type || "Final Exam");
  const [examFormDate, setExamFormDate] = useState<string>(() => courseExam?.date || "");
  const [examFormProf, setExamFormProf] = useState<string>(() => courseExam?.professor || "");

  const handleUpdateTargetExamDate = (newDate: Date) => {
    setDate(newDate);
    const dateStr = toLocalDateStr(newDate);
    try {
      saveExam({
        id: courseExam?.id,
        course: course.name,
        courseId: course.id,
        type: courseExam?.type || "Final Exam",
        date: dateStr,
        professor: courseExam?.professor || "",
        uploaderName: (courseExam?.uploaderName && courseExam.uploaderName !== "You") ? courseExam.uploaderName : undefined,
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

  const toggleTopicKey = toggleChapterKey;
  const toggleSelectAll = toggleSelectAllChapters;

  const handleSaveCourseExam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!examFormDate) {
      toast.warning("Please choose an exam date.");
      return;
    }
    try {
      saveExam({
        id: courseExam?.id,
        course: course.name,
        courseId: course.id,
        type: examFormType || "Final Exam",
        date: examFormDate,
        professor: examFormProf || "",
      });

      if (getStoredAccessToken()) {
        try {
          const created = await examService.createExam({
            course: course.name,
            courseId: typeof course.id === "number" ? course.id : undefined,
            type: examFormType || "Final Exam",
            date: examFormDate,
            professor: examFormProf || "",
          });
          if (created) {
            saveExam({
              id: String(created.id),
              course: created.course,
              courseId: created.courseId || course.id,
              type: created.type,
              date: created.date,
              professor: created.professor || "",
            });
          }
        } catch (apiErr) {
          console.warn("Backend exam sync error:", apiErr);
        }
      }

      const parsedDate = new Date(examFormDate + "T00:00:00");
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
      }
      setExamModalOpen(false);
      toast.success(`Exam for "${course.name}" saved and connected! ✨`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save exam.");
    }
  };

  const handleRemoveCourseExam = () => {
    if (courseExam) {
      if (courseExam.id) {
        deleteExam(courseExam.id);
      } else {
        deleteExam(courseExam.course);
      }
      toast.success(`Exam reminder for "${course.name}" removed.`);
    }
  };

  const handlePracticeQuiz = async () => {
    const selectedTopics = getSelectedTopics();
    if (selectedTopics.length === 0) {
      toast.warning("Please select at least one chapter file to practice a quiz.");
      return;
    }
    setLoadingQuiz(true);
    try {
      const payload = {
        course_name: course.name,
        language: "en",
        topics: selectedTopics.map((t, idx) => ({
          ref: String(t.id || idx + 1),
          chapter_title: t.name,
          subtopics: t.subtopics && t.subtopics.length > 0 ? t.subtopics : [t.name],
          source_excerpt: t.contentExcerpt || (t.subtopics ? t.subtopics.join(". ") : undefined),
        })),
        flashcards_per_topic: 2,
        questions_per_topic: Math.min(5, Math.max(2, Math.ceil(12 / selectedTopics.length))),
      };

      let generatedQuestions: any[] = [];
      try {
        const res = await fetchApi<any>("/api/v1/study-kits/generate", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res?.data?.topics) {
          res.data.topics.forEach((tk: any) => {
            (tk.quiz || []).forEach((q: any, qIdx: number) => {
              generatedQuestions.push({
                id: q.questionId || `q-${Date.now()}-${qIdx}`,
                q: q.question || q.q,
                options: q.options || ["True", "False"],
                answer: typeof q.answer === "number" ? q.answer : 0,
                explain: q.explain || `Key takeaway from ${tk.ref || "chapter concepts"}.`,
              });
            });
          });
        }
      } catch (e) {
        console.warn("Backend study-kits call failed:", e);
      }

      if (generatedQuestions.length === 0) {
        selectedTopics.forEach((st, idx) => {
          const sub = st.subtopics && st.subtopics[0] ? st.subtopics[0] : st.name;
          generatedQuestions.push({
            id: `q-gen-${idx}-1`,
            q: `Which concept is a core component of "${st.name}"?`,
            options: [
              sub,
              `Inverted logic of ${st.name}`,
              `Unrelated legacy protocol`,
              `None of the above`,
            ],
            answer: 0,
            explain: `Based on your course syllabus for ${st.name}.`,
          });
          if (st.subtopics && st.subtopics.length > 1) {
            generatedQuestions.push({
              id: `q-gen-${idx}-2`,
              q: `In the context of ${st.name}, what is the significance of "${st.subtopics[1]}"?`,
              options: [
                `It establishes foundational principles for ${st.name}`,
                `It is deprecated syntax`,
                `It is only used in peripheral architectures`,
                `No relevant relationship`,
              ],
              answer: 0,
              explain: `Extracted directly from syllabus concepts in ${st.name}.`,
            });
          }
        });
      }

      if (generatedQuestions.length === 0) {
        toast.error("Could not generate quiz questions from selected chapters.");
        return;
      }

      localStorage.setItem("sg-active-quiz", JSON.stringify(generatedQuestions));
      toast.success(`Generated ${generatedQuestions.length} quiz questions from ${selectedTopics.length} chapters! ✨`);
      nav({ to: "/quiz" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate quiz.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleReviewFlashcards = async () => {
    const selectedTopics = getSelectedTopics();
    if (selectedTopics.length === 0) {
      toast.warning("Please select at least one chapter file to generate flashcards.");
      return;
    }
    setLoadingCards(true);
    try {
      const payload = {
        course_name: course.name,
        language: "en",
        topics: selectedTopics.map((t, idx) => ({
          ref: String(t.id || idx + 1),
          chapter_title: t.name,
          subtopics: t.subtopics && t.subtopics.length > 0 ? t.subtopics : [t.name],
          source_excerpt: t.contentExcerpt || (t.subtopics ? t.subtopics.join(". ") : undefined),
        })),
        flashcards_per_topic: Math.min(5, Math.max(2, Math.ceil(12 / selectedTopics.length))),
        questions_per_topic: 1,
      };

      let generatedCards: any[] = [];
      try {
        const res = await fetchApi<any>("/api/v1/study-kits/generate", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res?.data?.topics) {
          res.data.topics.forEach((tk: any) => {
            (tk.flashcards || []).forEach((fc: any, fcIdx: number) => {
              generatedCards.push({
                id: fc.cardId || `fc-${Date.now()}-${fcIdx}`,
                q: fc.front || fc.question || fc.q,
                a: fc.back || fc.answer || fc.a,
                chapter: tk.ref || course.name,
              });
            });
          });
        }
      } catch (e) {
        console.warn("Backend study-kits call failed:", e);
      }

      if (generatedCards.length === 0) {
        selectedTopics.forEach((st, idx) => {
          if (st.subtopics && st.subtopics.length > 0) {
            st.subtopics.forEach((sub, subIdx) => {
              generatedCards.push({
                id: `fc-gen-${idx}-${subIdx}`,
                q: `What is the key principle of: ${sub}?`,
                a: `A core concept covered in ${st.name} focusing on foundational application and theory.`,
                chapter: st.name,
              });
            });
          } else {
            generatedCards.push({
              id: `fc-gen-${idx}-0`,
              q: `What is the primary objective of studying "${st.name}"?`,
              a: `Mastering the theoretical principles and practical application as outlined in the course syllabus.`,
              chapter: st.name,
            });
          }
        });
      }

      if (generatedCards.length === 0) {
        toast.error("Could not generate flashcards from selected chapters.");
        return;
      }

      const prefix = getUserStoragePrefix();
      localStorage.setItem(`sg-${prefix}-active-cards`, JSON.stringify(generatedCards));
      localStorage.setItem("sg-active-cards", JSON.stringify(generatedCards));

      const allKits = getUserTaskKits();
      const kitKey = course.name.toLowerCase().trim();
      allKits[kitKey] = {
        kitId: `kit-${Date.now()}`,
        flashcards: generatedCards,
        quiz: [],
      };
      saveUserTaskKits(allKits);

      toast.success(`Generated ${generatedCards.length} flashcards from ${selectedTopics.length} chapters! ✨`);
      nav({ to: "/flashcards" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate flashcards.");
    } finally {
      setLoadingCards(false);
    }
  };

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
          }
        })
        .catch(() => {});
    }
  }, [course.id, course.topics]);

  useEffect(() => {
    if (topics && topics.length > 0) {
      const newChapters = groupTopicsIntoChapters(topics, course.name);
      setSelectedChapterIds((prev) => {
        const next = new Set(prev);
        newChapters.forEach((c) => next.add(c.id));
        return next;
      });

      setExpandedChapterIds((prev) => {
        const next = new Set(prev);
        newChapters.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }, [topics, course.name]);

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

      // 1. Calculate existing chapter count to assign next chapter number
      const existingChapters = groupTopicsIntoChapters(topics, course.name);
      const existingChapterCount = Math.max(1, existingChapters.length);

      // Lock existing topics into their chapter file identity
      const existingTopics: Topic[] = (topics || []).map((t) => {
        let fn = t.fileName?.trim();
        let fi = t.fileIndex;
        if (!fn && (!fi || fi === 1)) {
          fn = `${course.name || "Course"}_Chapter_1.pdf`;
          fi = 1;
        } else if (!fn && fi) {
          fn = `Chapter_${fi}.pdf`;
        } else if (fn && !fi) {
          fi = 1;
        }
        return {
          ...t,
          fileName: fn,
          fileIndex: fi,
        };
      });

      const newExtractedTopics: Topic[] = [];

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const newChapterNumber = existingChapterCount + i + 1;

        const parsed = await syllabusService.parseSyllabus(currentFile, course.name, course.id);
        const topicsList = parsed?.topics || parsed?.data?.topics || [];

        if (topicsList.length > 0) {
          for (const item of topicsList) {
            let title = (item.categoryTitle || item.category_title || item.chapter_title || item.chapterTitle || item.name || "").trim().replace(/\s*\(Part\s*\d+\)$/i, "").trim();
            if (!title) continue;

            const subtopicsList = (item.subtopics || []).map((s: any) =>
              typeof s === "object" && s !== null ? (s.title ? `${s.title}: ${s.summary || ""}`.trim() : JSON.stringify(s)) : String(s)
            );

            const excerpt = item.content_excerpt || item.contentExcerpt || (
              Array.isArray(item.subtopics)
                ? item.subtopics.map((s: any) => typeof s === "object" && s?.summary ? `${s.title}: ${s.summary}` : "").filter(Boolean).join("\n\n")
                : ""
            );

            newExtractedTopics.push({
              id: item.order_index || item.orderIndex || (existingTopics.length + newExtractedTopics.length + 1),
              name: title,
              fileName: currentFile.name,
              fileIndex: newChapterNumber,
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
              chapter: fc.topicTag || currentFile.name.replace(/\.[^/.]+$/, "") || course.name || "Key Concepts",
            }));
            allKits[kitKey] = {
              ...currentKit,
              flashcards: [...mappedNew, ...existing].slice(0, 20),
            };
            saveUserTaskKits(allKits);
          } catch (e) {
            console.warn("Could not save flashcards locally:", e);
          }
        }
      }

      // 2. Combine existing chapters and newly extracted chapter topics
      let combinedTopics = deduplicateTopics([...existingTopics, ...newExtractedTopics]);

      // 3. If real backend course, fetch latest from DB to link database IDs without destroying client chapter structures
      const isRealId = course.id && !String(course.id).startsWith("course-") && !String(course.id).startsWith("c-");
      if (isRealId) {
        try {
          const fresh = await browseService.getCourseTopics(course.id);
          if (fresh && fresh.length > 0) {
            const freshMap = new Map<string, number | string>();
            fresh.forEach((ft) => freshMap.set(ft.name.trim().toLowerCase(), ft.id));
            combinedTopics = combinedTopics.map((ct) => {
              const dbId = freshMap.get(ct.name.trim().toLowerCase());
              return dbId ? { ...ct, id: dbId } : ct;
            });
          }
        } catch {}
      }

      setTopics(combinedTopics);
      onTopicsUpdated?.(combinedTopics);

      // Persist in localStorage userCourses
      const curCourses = getUserCourses();
      const updatedCourses = curCourses.map((c) =>
        String(c.id) === String(course.id) || c.name.toLowerCase() === course.name.toLowerCase()
          ? { ...c, topics: combinedTopics, status: "ready" as CourseStatus }
          : c
      );
      saveUserCourses(updatedCourses);

      // Auto-expand and select all chapters including the newly uploaded one
      const updatedChapters = groupTopicsIntoChapters(combinedTopics, course.name);
      setSelectedChapterIds(new Set(updatedChapters.map((c) => c.id)));
      setExpandedChapterIds(new Set(updatedChapters.map((c) => c.id)));

      toast.success(`Chapter "${files[0].name}" added as a separate chapter! ✨`);
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
    const selectedTopics = getSelectedTopics();
    const effectiveTopics = selectedTopics.length > 0 ? selectedTopics : (topics.length > 0 ? topics : (course.topics || []));

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

        uploaderName: (courseExam?.uploaderName && courseExam.uploaderName !== "You") ? courseExam.uploaderName : undefined,

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

          const selectedIds = effectiveTopics.map((t) => t.id).filter((id): id is number => typeof id === "number");
          planData = await browseService.generateOrUpdatePlan(course.id, {
            examDate: dateStr,
            dailyHours: effDailyHours,
            mode,
            selectedTopicIds: selectedIds.length > 0 ? selectedIds : undefined,
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

            {courseExam?.uploaderName && courseExam.uploaderName !== "You" && (

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



      {/* Associated Exam Banner / Details */}
      <div className="mb-5 rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/40">
        {courseExam ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Associated Exam:
                  </span>
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {courseExam.type || "Final Exam"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      daysUntil(courseExam.date) < 15
                        ? "border border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400"
                        : daysUntil(courseExam.date) <= 30
                          ? "border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {Math.max(0, daysUntil(courseExam.date))} days left
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Exam Date: <strong className="text-foreground">{courseExam.date}</strong></span>
                  {courseExam.professor && (
                    <>
                      <span>•</span>
                      <span>Prof. <strong className="text-foreground">{courseExam.professor}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => {
                  setExamFormType(courseExam.type || "Final Exam");
                  setExamFormDate(courseExam.date || "");
                  setExamFormProf(courseExam.professor || "");
                  setExamModalOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Exam
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => nav({ to: "/exam-checkin" })}
              >
                View in Exam Hub
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRemoveCourseExam}
                title="Unlink exam reminder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">No Exam Scheduled for this Course</div>
                <p className="text-xs text-muted-foreground">
                  Connect an exam date and professor to enable study countdowns and personalized revision schedules.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-sm"
              onClick={() => {
                setExamFormType("Final Exam");
                setExamFormDate(date ? toLocalDateStr(date) : "");
                setExamFormProf("");
                setExamModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> + Schedule Exam for this Course
            </Button>
          </div>
        )}
      </div>

      {/* Chapter Selection & Batch Generation Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-3 shadow-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-semibold text-foreground hover:text-primary transition">
            <input
              type="checkbox"
              checked={selectedChapterIds.size === chapters.length && chapters.length > 0}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedChapterIds.size > 0 && selectedChapterIds.size < chapters.length;
                }
              }}
              onChange={toggleSelectAllChapters}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <span>Select All</span>
          </label>
          <span className="text-xs font-semibold text-muted-foreground">
            ({selectedChapterIds.size} of {chapters.length} chapters selected)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1.5 text-xs font-semibold shadow-soft"
            disabled={selectedChapterIds.size === 0}
            onClick={() => {
              if (selectedChapterIds.size === 0) {
                toast.warning("Please select at least one chapter file to generate a plan.");
                return;
              }
              setPlanModalOpen(true);
            }}
            title="Generate study plan for selected chapters"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Generate Plan ({selectedChapterIds.size})
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            disabled={selectedChapterIds.size === 0 || loadingQuiz}
            onClick={handlePracticeQuiz}
            title="Generate practice quiz for selected chapters"
          >
            {loadingQuiz ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HelpCircle className="h-3.5 w-3.5" />}
            Practice Quiz ({selectedChapterIds.size})
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
            disabled={selectedChapterIds.size === 0 || loadingCards}
            onClick={handleReviewFlashcards}
            title="Generate flashcards for selected chapters"
          >
            {loadingCards ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Review Flashcards ({selectedChapterIds.size})
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={toggleExpandAllChapters}
            title={expandedChapterIds.size === chapters.length ? "Collapse all chapter files" : "Expand all chapter files"}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {expandedChapterIds.size === chapters.length ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </div>

      {/* Chapters (Material Files) List */}
      {chapters.length > 0 ? (
        <div className="grid gap-4">
          {chapters.map((chap) => {
            const isSelected = selectedChapterIds.has(chap.id);
            const isExpanded = expandedChapterIds.has(chap.id);

            return (
              <div
                key={chap.id}
                className={cn(
                  "rounded-2xl border transition-all duration-300 shadow-sm",
                  isSelected
                    ? "border-primary/50 bg-card shadow-soft ring-1 ring-primary/20"
                    : "border-border/60 bg-card/60 opacity-80 hover:opacity-100"
                )}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Chapter Checkbox, Badge, File Title & Metadata */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleChapterKey(chap.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                          title={isSelected ? "Uncheck chapter file" : "Check chapter file to include in plan/quiz/cards"}
                        />
                      </div>

                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-xl font-display font-bold text-sm mt-0.5 transition-colors",
                          isSelected ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {chap.chapterNumber}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary/80">
                            Chapter {chap.chapterNumber}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/40">
                            <Upload className="h-3 w-3 text-primary/70" /> {chap.fileName}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              <Check className="h-3 w-3" /> Selected for Study Kit
                            </span>
                          )}
                        </div>

                        <h4 className="font-semibold text-foreground text-base sm:text-lg leading-snug mt-1 break-words">
                          {chap.chapterTitle}
                        </h4>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {chap.durationMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium">
                              <Clock className="h-3 w-3 text-primary" /> {chap.durationMinutes}m est.
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                            <BookOpen className="h-3 w-3" /> {chap.topics.length} {chap.topics.length === 1 ? "Topic" : "Topics"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand/Collapse & Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpandChapter(chap.id)}
                        className={cn(
                          "h-8 gap-1.5 text-xs font-semibold rounded-lg transition-colors",
                          isExpanded ? "bg-accent/60 text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>{isExpanded ? "Hide Topics" : `View Topics (${chap.topics.length})`}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        onClick={() => handleDeleteChapterFile(chap)}
                        title="Remove chapter material file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Smooth Collapsible Container for Topics inside this Chapter */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                      isExpanded ? "grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-border/40" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden space-y-3.5">
                      <div className="text-xs font-semibold text-muted-foreground px-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> Topics in this Material:
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          Click any subtopic to view its explanation
                        </span>
                      </div>

                      {chap.topics.map((topic, topicIdx) => {
                        const subtopics = extractTopicSubtopics(topic, topicIdx);

                        return (
                          <div
                            key={topic.id || topicIdx}
                            className="rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-4 space-y-2.5"
                          >
                            {/* Topic Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                                  {topicIdx + 1}
                                </span>
                                <h5 className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                                  {topic.name}
                                </h5>
                              </div>
                              {topic.durationMinutes && (
                                <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                                  {topic.durationMinutes}m
                                </span>
                              )}
                            </div>

                            {/* Subtopics with Explanations Accordion */}
                            {subtopics.length > 0 && (
                              <div className="pt-1">
                                <Accordion
                                  multiple
                                  defaultValue={[subtopics[0]?.id].filter(Boolean)}
                                  className="w-full rounded-lg border border-border/50 bg-background/70 divide-y divide-border/40"
                                >
                                  {subtopics.map((sub, sIdx) => (
                                    <AccordionItem key={sub.id} value={sub.id} className="px-3 py-0.5">
                                      <AccordionTrigger className="text-xs sm:text-sm font-medium text-foreground hover:text-primary py-2">
                                        <div className="flex items-center gap-2 text-left">
                                          <span className="text-[11px] text-muted-foreground font-mono">
                                            {topicIdx + 1}.{sIdx + 1}
                                          </span>
                                          <span className="font-medium text-foreground/90">{sub.title}</span>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="pt-0 pb-2.5 text-xs leading-relaxed text-muted-foreground">
                                        <div className="rounded-md bg-accent/30 border border-border/50 p-2.5 text-xs text-foreground/85 leading-relaxed font-normal">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-primary/90 mb-1 flex items-center gap-1">
                                            <Sparkles className="h-2.5 w-2.5" /> Explanation & Core Takeaways:
                                          </div>
                                          <p className="whitespace-pre-line leading-relaxed">
                                            {sub.explanation}
                                          </p>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
              Generate Study Plan ({selectedChapterIds.size} Chapters)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule / Edit Exam Modal Dialog */}
      <Dialog open={examModalOpen} onOpenChange={setExamModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {courseExam ? "Edit Associated Exam" : "Schedule Exam for Course"}
            </DialogTitle>
            <DialogDescription>
              Link this exam to <strong className="text-foreground">{course.name}</strong> to sync with Exam Hub and target your study goals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCourseExam} className="mt-2 flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="exam-type">Exam Type</Label>
              <select
                id="exam-type"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={examFormType}
                onChange={(e) => setExamFormType(e.target.value)}
              >
                <option value="Final Exam">Final Exam</option>
                <option value="Midterm">Midterm</option>
                <option value="First Exam">First Exam</option>
                <option value="Second Exam">Second Exam</option>
                <option value="Quiz">Quiz</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="exam-date">Exam Date</Label>
              <Input
                id="exam-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={examFormDate}
                onChange={(e) => setExamFormDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="exam-prof">Professor / Instructor (Optional)</Label>
              <Input
                id="exam-prof"
                placeholder="e.g. Dr. Emily Carter"
                value={examFormProf}
                onChange={(e) => setExamFormProf(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-2 flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setExamModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="magic" className="font-semibold">
                Save & Link Exam
              </Button>
            </DialogFooter>
          </form>
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

