import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Genie, GenieLogo } from "@/components/Genie";
import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { pageHead } from "@/lib/head";
import { deleteExam, fetchAndSyncExams, isCourseEnrolled, loadExams, saveExam, type Exam } from "@/lib/exam";
import { getStoredAccessToken } from "@/lib/api/client";
import { examService } from "@/lib/api/services";
import { getUserCourses, saveUserCourses } from "@/lib/courses-util";
import { browseService } from "@/lib/api/services";
import type { Course } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-checkin")({
  head: pageHead("Your upcoming exams", "Tell your genie which exams are coming up, when, and who teaches them."),
  component: ExamCheckin,
});

const types = ["Quiz", "First", "Second", "Midterm", "Final"];

function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || !match[1] || !match[2] || !match[3]) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function toIsoDate(display: string): string | null {
  if (!display) return null;
  const match = display.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const dayStr = match[1];
  const monthStr = match[2];
  const yearStr = match[3];
  if (!dayStr || !monthStr || !yearStr) return null;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatInputDDMMYYYY(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
  if (digits.length > 2) {
    if (val.endsWith("/") && digits.length === 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}/`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  if (val.endsWith("/") && digits.length === 2) {
    return `${digits}/`;
  }
  return digits;
}

const schema = z.object({
  course: z.string().trim().min(1, "Enter or pick a course"),
  type: z.string().min(1, "Pick the exam type"),
  date: z.string().min(1, "Pick the exam date"),
  professor: z.string().trim().min(2, "Enter the professor's name").max(80),
});

function ExamCheckin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ course: "", type: "", date: "", professor: "" });
  const [dateInputStr, setDateInputStr] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState("");
  const [userCourses, setUserCourses] = useState<string[]>([]);
  const [existingExams, setExistingExams] = useState<Exam[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  const handleDateInputChange = (val: string) => {
    const formatted = formatInputDDMMYYYY(val);
    setDateInputStr(formatted);
    const iso = toIsoDate(formatted);
    if (iso) {
      setForm((prev) => ({ ...prev, date: iso }));
      setError("");
    } else {
      setForm((prev) => ({ ...prev, date: "" }));
    }
  };

  const handleCalendarSelect = (d: Date | undefined) => {
    if (!d) return;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${day}`;
    const display = `${day}/${month}/${year}`;
    setDateInputStr(display);
    setForm((prev) => ({ ...prev, date: iso }));
    setError("");
    setCalendarOpen(false);
  };

  useEffect(() => {
    let enrolled = getUserCourses();
    if (enrolled.length > 0) {
      setUserCourses(
        enrolled.map((c) => (c.code && c.code.toUpperCase() !== "CUSTOM" ? `${c.code} — ${c.name}` : c.name))
      );
    }

    // Try fetching remote enrolled courses to keep cache up to date
    browseService
      .getEnrolledCourses()
      .then((remote) => {
        if (remote && remote.length > 0) {
          const map = new Map<string, Course>();
          remote.forEach((c) => map.set(c.name.trim().toLowerCase(), c));
          enrolled.forEach((c) => {
            if (!map.has(c.name.trim().toLowerCase())) map.set(c.name.trim().toLowerCase(), c);
          });
          const merged = Array.from(map.values());
          saveUserCourses(merged);
          setUserCourses(
            merged.map((c) => (c.code && c.code.toUpperCase() !== "CUSTOM" ? `${c.code} — ${c.name}` : c.name))
          );
        }
      })
      .catch(() => {});

    fetchAndSyncExams().then((exams) => {
      setExistingExams(exams);
    });
  }, []);

  const handleSkip = () => {
    navigate({ to: "/dashboard" });
  };

  const handleAddAnother = async (ev: React.MouseEvent) => {
    ev.preventDefault();
    let dateToUse = form.date;
    if (dateInputStr && !dateToUse) {
      const iso = toIsoDate(dateInputStr);
      if (!iso) return setError("Please enter a valid exam date in DD/MM/YYYY format (e.g. 15/11/2026)");
      dateToUse = iso;
    }
    if (dateToUse && dateToUse < today) {
      return setError("Please pick today or a future date for your exam");
    }

    const payload = { ...form, date: dateToUse };
    const r = schema.safeParse(payload);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Check the form");

    const enrolledCoursesList = getUserCourses();
    const cleanCourseName = r.data.course.includes("—") ? r.data.course.split("—").pop()?.trim() || r.data.course.trim() : r.data.course.trim();
    const matchedCourse = enrolledCoursesList.find((c) => c.name.toLowerCase().trim() === cleanCourseName.toLowerCase().trim() || c.name.toLowerCase().trim() === r.data.course.toLowerCase().trim());
    const linkedCourseId = matchedCourse?.id;

    const localItem = saveExam({
      ...r.data,
      courseId: linkedCourseId,
    });

    if (getStoredAccessToken()) {
      try {
        const created = await examService.createExam({
          course: r.data.course.trim(),
          courseId: typeof linkedCourseId === "number" ? linkedCourseId : undefined,
          type: r.data.type.trim(),
          date: r.data.date,
          professor: r.data.professor?.trim() || "",
        });
        if (created) {
          saveExam({
            id: String(created.id),
            course: created.course,
            courseId: created.courseId || linkedCourseId,
            type: created.type,
            date: created.date,
            professor: created.professor || "",
          });
        }
      } catch (err) {
        console.warn("Backend exam creation sync failed:", err);
      }
    }

    // Ensure this course is enrolled
    const enrolled = getUserCourses();
    if (!isCourseEnrolled(r.data.course, enrolled)) {
      const cleanCourseName = r.data.course.split("—").pop()?.trim() || r.data.course.trim();
      const detectedCode = r.data.course.includes("—") ? (r.data.course.split("—")[0] ?? "").trim() : "";
      const newCourse: Course = {
        id: "c-" + Date.now(),
        name: cleanCourseName,
        code: detectedCode,
        status: "none",
        topics: [],
      };
      saveUserCourses([...enrolled, newCourse]);
    }

    setExistingExams(loadExams());
    toast.success(`Added ${r.data.course} (${r.data.type})! Add another exam below or finish.`);
    setForm({ course: "", type: "", date: "", professor: "" });
    setDateInputStr("");
    setError("");
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // If the form is completely empty but the user already has saved exams, proceed to dashboard
    if (!form.course && !form.type && !form.date && !dateInputStr && !form.professor && existingExams.length > 0) {
      return navigate({ to: "/dashboard" });
    }

    let dateToUse = form.date;
    if (dateInputStr && !dateToUse) {
      const iso = toIsoDate(dateInputStr);
      if (!iso) return setError("Please enter a valid exam date in DD/MM/YYYY format (e.g. 15/11/2026)");
      dateToUse = iso;
    }
    if (dateToUse && dateToUse < today) {
      return setError("Please pick today or a future date for your exam");
    }

    const payload = { ...form, date: dateToUse };
    const r = schema.safeParse(payload);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Check the form");

    const enrolledCoursesList = getUserCourses();
    const cleanCourseName = r.data.course.includes("—") ? r.data.course.split("—").pop()?.trim() || r.data.course.trim() : r.data.course.trim();
    const matchedCourse = enrolledCoursesList.find((c) => c.name.toLowerCase().trim() === cleanCourseName.toLowerCase().trim() || c.name.toLowerCase().trim() === r.data.course.toLowerCase().trim());
    const linkedCourseId = matchedCourse?.id;

    const localItem = saveExam({
      ...r.data,
      courseId: linkedCourseId,
    });

    if (getStoredAccessToken()) {
      try {
        const created = await examService.createExam({
          course: r.data.course.trim(),
          courseId: typeof linkedCourseId === "number" ? linkedCourseId : undefined,
          type: r.data.type.trim(),
          date: r.data.date,
          professor: r.data.professor?.trim() || "",
        });
        if (created) {
          saveExam({
            id: String(created.id),
            course: created.course,
            courseId: created.courseId || linkedCourseId,
            type: created.type,
            date: created.date,
            professor: created.professor || "",
          });
        }
      } catch (err) {
        console.warn("Backend exam creation sync failed:", err);
      }
    }

    // Ensure this course is in the user's enrolled courses list
    const enrolled = getUserCourses();
    if (!isCourseEnrolled(r.data.course, enrolled)) {
      const cleanCourseName = r.data.course.split("—").pop()?.trim() || r.data.course.trim();
      const detectedCode = r.data.course.includes("—") ? (r.data.course.split("—")[0] ?? "").trim() : "";
      const newCourse: Course = {
        id: "c-" + Date.now(),
        name: cleanCourseName,
        code: detectedCode,
        status: "none",
        topics: [],
      };
      saveUserCourses([...enrolled, newCourse]);
    }

    navigate({ to: "/dashboard" });
  };

  const chip = (on: boolean) =>
    cn(
      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
      on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
    );

  return (
    <div className="min-h-screen bg-gradient-hero pb-12">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <GenieLogo />
        <ThemeToggle />
      </header>

      <form
        onSubmit={submit}
        className="relative mx-auto flex max-w-xl flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-8 shadow-soft"
      >
        <div className="absolute right-5 top-5">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleSkip}
            className="h-7 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Skip →
          </Button>
        </div>

        <div className="flex items-center gap-4 pr-16">
          <Genie pose="mid" className="h-20 w-20 shrink-0 animate-float" />
          <div>
            <h1 className="text-2xl font-semibold">
              {existingExams.length > 0 ? "Add Another Exam" : "What's your next exam?"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Add multiple exams, quizzes, or midterms to track and scroll between them on your dashboard.
            </p>
          </div>
        </div>

        {existingExams.length > 0 && (
          <div className="rounded-xl border bg-muted/40 p-3.5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scheduled Exams ({existingExams.length})
            </p>
            <div className="flex flex-col gap-2">
              {existingExams.map((ex) => (
                <div
                  key={ex.id || `${ex.course}-${ex.type}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ex.course}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                      {ex.type}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {toDisplayDate(ex.date)} · {ex.professor}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary hover:text-primary font-semibold"
                      onClick={() => navigate({ to: "/courses" })}
                      title="View course chapters and syllabus"
                    >
                      View Course & Chapters →
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        if (ex.id) deleteExam(ex.id);
                        else deleteExam(ex.course);
                        setExistingExams(loadExams());
                        toast.success(`Removed ${ex.course} ${ex.type}`);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remove exam"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="course">Course</Label>
            <span className="text-xs text-muted-foreground">Type or pick course</span>
          </div>
          <Input
            id="course"
            placeholder="Type course name (e.g. Physics, Calculus, Data Structures)..."
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
            className="h-11 rounded-xl"
            required={existingExams.length === 0}
          />
          {userCourses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {userCourses.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm({ ...form, course: c })}
                  className={chip(form.course === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Which exam?</Label>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={chip(form.type === t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="date">Exam date</Label>
            <span className="text-xs font-mono font-medium text-muted-foreground">DD/MM/YYYY</span>
          </div>
          <div className="relative flex items-center">
            <Input
              id="date"
              type="text"
              placeholder="DD/MM/YYYY (e.g. 15/11/2026)"
              value={dateInputStr}
              onChange={(e) => handleDateInputChange(e.target.value)}
              className="h-11 rounded-xl pr-12 font-mono text-sm tracking-wide"
              required={existingExams.length === 0}
            />
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Open calendar picker"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={form.date ? new Date(form.date + "T00:00:00") : undefined}
                  onSelect={handleCalendarSelect}
                  disabled={(d) => {
                    const t = new Date();
                    t.setHours(0, 0, 0, 0);
                    return d < t;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prof">Professor</Label>
          <Input
            id="prof"
            placeholder="e.g. Dr. Jordan"
            value={form.professor}
            onChange={(e) => setForm({ ...form, professor: e.target.value })}
            className="h-11 rounded-xl"
            required={existingExams.length === 0}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            size="default"
            type="button"
            onClick={handleAddAnother}
            className="w-full sm:w-auto gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Another Exam
          </Button>
          <Button variant="magic" size="default" type="submit" className="w-full sm:w-auto">
            Save & Open Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}
