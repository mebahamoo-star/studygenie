import { useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { courseReportService } from "@/lib/api/services";

const REPORT_REASONS = [
  "Wrong syllabus or chapters",
  "Incorrect course name or code",
  "Outdated or irrelevant materials",
  "Duplicate course entry",
  "Poor quality extraction",
  "Other issue",
];

interface ReportCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  courseId?: number | string | null;
  onReportSubmitted?: () => void;
}

export function ReportCourseDialog({
  open,
  onOpenChange,
  courseName,
  courseId,
  onReportSubmitted,
}: ReportCourseDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [reporterName, setReporterName] = useState(() => {
    try {
      const u = localStorage.getItem("sg-user");
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.fullName || parsed.name || parsed.email || "";
      }
    } catch {}
    return "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      toast.error("Please select a reason for reporting this course.");
      return;
    }

    setSubmitting(true);
    try {
      await courseReportService.reportCourse({
        courseId,
        courseName,
        reason: selectedReason,
        details: details.trim(),
        reportedBy: reporterName.trim() || "Anonymous Student",
      });

      setSubmitted(true);
      toast.success("Thank you! Your report has been submitted to moderators.");
      setTimeout(() => {
        onReportSubmitted?.();
        onOpenChange(false);
        // Reset state after closing
        setTimeout(() => {
          setSubmitted(false);
          setDetails("");
          setSelectedReason(REPORT_REASONS[0]);
        }, 300);
      }, 1200);
    } catch (err: any) {
      console.error("Failed to submit course report:", err);
      toast.error(err?.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs tracking-wider uppercase mb-1">
            <Flag className="h-4 w-4" /> Academic Moderation
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Report Course Issue
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Found incorrect syllabus chapters, wrong course code, or bad materials for{" "}
            <span className="font-semibold text-foreground underline decoration-amber-500/50">
              {courseName || "this course"}
            </span>
            ? Report it to help maintain accurate academic materials.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="font-bold text-foreground">Report Received</div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Thank you for keeping StudyGenie accurate! Our moderators will review this course and update the syllabus.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">What is wrong with this course?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_REASONS.map((r) => {
                  const isSel = selectedReason === r;
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setSelectedReason(r)}
                      className={`text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                        isSel
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shadow-sm"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-details" className="text-xs font-semibold">
                Additional Details (Optional)
              </Label>
              <Textarea
                id="report-details"
                rows={3}
                placeholder="Describe what is incorrect (e.g. 'Chapter 3 belongs to CS310, and midterm topics are missing')..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reporter-name" className="text-xs font-semibold">
                Your Name or Email (Optional)
              </Label>
              <Input
                id="reporter-name"
                placeholder="Student Name or Email"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="text-xs rounded-xl h-9"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="h-3.5 w-3.5" /> Submit Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
