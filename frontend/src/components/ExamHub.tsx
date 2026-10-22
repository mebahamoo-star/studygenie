import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  FileText,
  HelpCircle,
  Pencil,
  Play,
  Trash2,
  Upload as UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearExam, daysUntil, deleteExam, type Exam } from "@/lib/exam";
import { chapters, flashcards, quiz } from "@/lib/mock";
import { addUploads, fmtSize, loadUploads, type Upload } from "@/lib/uploads";
import { syllabusService } from "@/lib/api/services";
import { getUserCourses, getUserStoragePrefix, saveUserCourses } from "@/lib/courses-util";

export function ExamHub({
  exam,
  onRemove,
}: {
  exam: Exam;
  onRemove?: () => void;
}) {
  const days = Math.max(0, daysUntil(exam.date));
  const [uploads, setUploads] = useState<Upload[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploads(loadUploads(exam.course));
  }, [exam.course]);

  const totalChapters = chapters.length;
  const reviewed = 0;
  const pct = totalChapters > 0 ? Math.round((reviewed / totalChapters) * 100) : 0;

  const advice =
    days <= 3
      ? "Final stretch! Do a practice quiz every day."
      : days <= 10
        ? "Focus on your weakest chapters this week."
        : "Great timing — steady daily sessions will get you there.";

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const fileList = Array.from(list);
    const files = fileList.map((f) => ({
      name: f.name,
      size: f.size,
      date: new Date().toISOString().slice(0, 10),
      by: "You",
    }));
    setUploads(addUploads(exam.course, files));

    const docFiles = fileList.filter((f) => 
      f.name.match(/\.(pdf|pptx|ppt)$/i) || 
      f.type === "application/pdf" ||
      f.type.includes("presentation") ||
      f.type.includes("powerpoint")
    );

    if (docFiles.length > 0) {
      toast.info(`Sending ${docFiles.length} document${docFiles.length > 1 ? "s" : ""} (PDF/PowerPoint) to AI for analysis...`);
      try {
        let allNewTopics: any[] = [];
        for (const file of docFiles) {
          const parsed = await syllabusService.parseSyllabus(file, exam.course);
          if (parsed?.topics && parsed.topics.length > 0) {
            allNewTopics = [...allNewTopics, ...parsed.topics];
          }
        }
        if (allNewTopics.length > 0) {
          toast.success(`Materials analyzed by AI! ${allNewTopics.length} chapters/topics ready ✨`);
          const newTopics = allNewTopics.map((t: any, idx: number) => ({
            id: t.order_index || idx + 1,
            name: t.chapter_title,
            durationMinutes: Math.round((t.estimated_hours || 2) * 60),
          }));
          let currentCourses = getUserCourses();
          currentCourses = currentCourses.map((c: any) =>
            c.name.toLowerCase() === exam.course.toLowerCase() ? { ...c, status: "ready", topics: newTopics } : c
          );
          saveUserCourses(currentCourses);
          const prefix = getUserStoragePrefix();
          localStorage.setItem(`sg-${prefix}-active-course`, JSON.stringify({ name: exam.course, status: "ready", topics: newTopics }));
        }
      } catch (err: any) {
        console.warn("AI parse error in ExamHub:", err);
        toast.error("Could not process some documents. Please check file format.");
      }
    } else {
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded · +50 points`);
    }
  };

  const handleRemoveExam = () => {
    if (exam.id) {
      deleteExam(exam.id);
    } else {
      deleteExam(exam.course);
    }
    toast.success("Exam removed from dashboard");
    onRemove?.();
  };

  return (
    <Card className="lg:col-span-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-primary">UPCOMING EXAM</p>
          <h2 className="text-2xl font-semibold">
            {exam.course} — {exam.type}
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date(exam.date + "T00:00:00").toDateString()} · {exam.professor}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-magic px-4 py-2 text-center text-primary-foreground">
            <div className="font-display text-3xl font-semibold leading-none">{days}</div>
            <div className="text-[10px] font-bold opacity-80">DAYS LEFT</div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/exam-checkin">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveExam}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete this exam"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4 rounded-xl bg-muted/60 p-4">
          <ProgressRing value={pct} size={110} stroke={10}>
            <div className="font-display text-2xl font-semibold">{pct}%</div>
          </ProgressRing>
          <div className="text-sm">
            <p className="font-semibold">Course progress</p>
            <p className="text-muted-foreground">
              {totalChapters > 0 ? `${reviewed}/${totalChapters} chapters` : "0 chapters studied"}
            </p>
            <p className="text-muted-foreground">{flashcards.length} flashcards</p>
            <p className="text-muted-foreground">{quiz.length}-question quiz</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="magic" asChild>
              <Link to="/pomodoro">
                <Play /> Start session
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/flashcards">
                <BookOpen /> Flashcards ({flashcards.length})
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/quiz">
                <HelpCircle /> Practice quiz
              </Link>
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <UploadIcon /> Upload course material
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
              className="hidden"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!uploads.length} className="justify-between">
                  <span className="flex items-center gap-2">
                    <FileText />{" "}
                    {uploads.length ? `Previous uploads (${uploads.length})` : "No uploads yet"}
                  </span>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Materials for this course</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uploads.map((u, i) => (
                  <DropdownMenuItem
                    key={i}
                    className="flex-col items-start gap-0"
                    onSelect={() => toast(`Opening ${u.name} (preview only)`)}
                  >
                    <span className="font-semibold">{u.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtSize(u.size)} · {u.date} · by {u.by}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-accent p-3">
            <Genie pose="mid" className="h-10 w-10 shrink-0" />
            <p className="text-sm font-semibold">
              {days} days left: {advice}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
