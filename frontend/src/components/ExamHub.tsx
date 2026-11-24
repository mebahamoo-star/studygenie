import { cn } from "@/lib/utils";

import { Link } from "@tanstack/react-router";

import { Bell, Calendar, Pencil, Sparkles, Trash2, User, BookOpen, CheckCircle2 } from "lucide-react";

import { toast } from "sonner";

import { Card } from "@/components/AppShell";

import { Button } from "@/components/ui/button";

import { daysUntil, deleteExam, type Exam } from "@/lib/exam";

import { CountingNumber } from "@/components/animate-ui/texts/counting-number";



export function ExamHub({

  exam,

  onRemove,

}: {

  exam: Exam;

  onRemove?: () => void;

}) {

  const rawDays = daysUntil(exam.date);
  const isPast = rawDays < 0;
  const isToday = rawDays === 0;
  const days = Math.abs(rawDays);



  const urgencyStatus = isPast
    ? "past"
    : rawDays < 15
      ? "red"
      : rawDays <= 30
        ? "orange"
        : "green";



  const hubBadgeClass =
    urgencyStatus === "past"
      ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
      : urgencyStatus === "red"
        ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
        : urgencyStatus === "orange"
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";



  const hubCountdownBg =
    urgencyStatus === "past"
      ? "bg-gradient-to-br from-slate-600 to-zinc-700 shadow-slate-500/20"
      : urgencyStatus === "red"
        ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25"
        : urgencyStatus === "orange"
          ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25"
          : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25";



  const handleRemoveExam = () => {

    if (exam.id) {

      deleteExam(exam.id);

    } else {

      deleteExam(exam.course);

    }

    toast.success("Exam reminder removed");

    onRemove?.();

  };



  const formattedDate = new Date(exam.date + "T00:00:00").toLocaleDateString(undefined, {

    weekday: "long",

    month: "short",

    day: "numeric",

    year: "numeric",

  });



  const reminderMessage =
    isPast
      ? days === 1
        ? "This exam took place yesterday. Hope it went great! 🎉"
        : `This exam took place ${days} days ago. Hope it went great! 🎉`
      : isToday
        ? "Today is exam day! Take a deep breath and give it your best. 🌟"
        : days === 1
          ? "Exam is tomorrow! Review key points and get a good night's rest. 🌙"
          : days <= 3
            ? "Final stretch! Focus on high-yield topics and stay calm. 🎯"
            : days <= 7
              ? "1 week left! Steady daily review will keep you prepared. ⏱️"
              : "Plenty of time ahead — pace yourself and stay consistent. 📚";



  return (

    <Card className={cn("relative overflow-hidden bg-gradient-to-br from-card via-card p-4 sm:p-6 shadow-soft lg:col-span-3 transition-colors border min-w-0 max-w-full w-full", urgencyStatus === "past" ? "border-border/80 to-muted/15" : urgencyStatus === "red" ? "border-red-500/30 to-red-500/5" : urgencyStatus === "orange" ? "border-amber-500/30 to-amber-500/5" : "border-emerald-500/30 to-emerald-500/5")}>

      {/* Subtle background ambient blur */}

      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />



      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0 max-w-full w-full">

        {/* Left: Exam Details & Friendly Reminder */}

        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">

          <div className="grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">

            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />

          </div>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">

              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", hubBadgeClass)}>

                {isPast ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-slate-400" /> Past Exam
                  </>
                ) : isToday ? (
                  <>
                    <Bell className="h-3 w-3 animate-pulse" /> Exam Today
                  </>
                ) : (
                  <>
                    <Bell className="h-3 w-3" /> Upcoming Exam Reminder
                  </>
                )}

              </span>

              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">

                {exam.type}

              </span>

            </div>



            <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">

              {exam.course}

            </h2>



            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">

              <span className="flex items-center gap-1 font-medium text-foreground/80">

                <Calendar className="h-3.5 w-3.5 text-primary" />

                {formattedDate}

              </span>

              {exam.professor && (

                <>

                  <span>·</span>

                  <span>Prof. {exam.professor}</span>

                </>

              )}

              {exam.uploaderName && exam.uploaderName !== "You" && (

                <>

                  <span>·</span>

                  <span className="inline-flex items-center gap-1 text-primary/90 font-semibold bg-primary/10 px-2 py-0.5 rounded-md text-xs">

                    <User className="h-3 w-3" /> Uploaded by {exam.uploaderName}

                  </span>

                </>

              )}

            </div>



            <p className="mt-3 flex items-start gap-1.5 text-xs sm:text-sm font-medium text-foreground/80 break-words">

              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />

              <span>{reminderMessage}</span>

            </p>

          </div>

        </div>



        {/* Right: Prominent Days-Left Countdown & Quiet Controls */}

        <div className="flex shrink-0 items-center justify-between gap-3 border-t pt-3 sm:border-0 sm:pt-0 sm:flex-col sm:items-end">

          <div className={cn("rounded-2xl px-5 py-3 text-center text-white shadow-glow", hubCountdownBg)}>

            <div className="font-display text-3xl font-extrabold leading-none">

              <CountingNumber key={exam.id || exam.course} number={days} fromNumber={0} className="tabular-nums" />

            </div>

            <div className="mt-0.5 text-[10px] font-bold tracking-wider opacity-90 uppercase">

              {isPast
                ? (days === 1 ? "Day Ago" : "Days Ago")
                : (days === 1 ? "Day Left" : "Days Left")}

            </div>

          </div>



          <div className="flex items-center gap-1">

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2.5 text-xs text-primary hover:text-primary font-semibold"
            >
              <Link to="/courses" title="View associated course syllabus and chapters">
                <BookOpen className="mr-1 h-3.5 w-3.5" /> Course
              </Link>
            </Button>

            <Button

              variant="ghost"

              size="sm"

              asChild

              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"

            >

              <Link to="/exam-checkin" title="Edit or add exams">

                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit

              </Link>

            </Button>

            <Button

              variant="ghost"

              size="sm"

              onClick={handleRemoveExam}

              className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"

              title="Dismiss reminder"

            >

              <Trash2 className="h-3.5 w-3.5" />

            </Button>

          </div>

        </div>

      </div>

    </Card>

  );

}

