import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, GraduationCap, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Genie, GenieLogo } from "@/components/Genie";
import { ThemeToggle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { browseService } from "@/lib/api/services";
import type { College, Course, University } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your studies — StudyGenie" },
      { name: "description", content: "Pick your university, college, major and courses." },
      { property: "og:title", content: "Set up your studies — StudyGenie" },
      { property: "og:description", content: "Pick your university, college, major and courses." },
    ],
  }),
  component: Onboarding,
});

const steps = ["University", "College", "Major", "Courses"];

const majorSuggestions = [
  "Computer Science",
  "Software Engineering",
  "Artificial Intelligence",
  "Cybersecurity",
  "Computer Information Systems",
  "Computer Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Medicine",
  "Pharmacy",
  "Nursing",
  "Business Administration",
  "Accounting",
  "Finance",
  "Architecture",
];

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState("");

  const [uniList, setUniList] = useState<{ id?: number | string; name: string }[]>([]);
  const [selectedUni, setSelectedUni] = useState<{ id?: number | string; name: string } | null>(null);
  const [customUni, setCustomUni] = useState("");

  const [colList, setColList] = useState<{ id?: number | string; name: string }[]>([]);
  const [selectedCol, setSelectedCol] = useState<{ id?: number | string; name: string } | null>(null);
  const [customCol, setCustomCol] = useState("");

  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [customMajor, setCustomMajor] = useState("");

  const [picked, setPicked] = useState<string[]>([]);
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [customCourse, setCustomCourse] = useState("");

  useEffect(() => {
    browseService
      .getUniversities()
      .then((data) => {
        if (data && data.length > 0) {
          setUniList(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectUni = (u: { id?: number | string; name: string }) => {
    setSelectedUni(u);
    if (u.id) {
      browseService
        .getColleges(u.id)
        .then((cols) => {
          if (cols && cols.length > 0) {
            setColList(cols);
          }
        })
        .catch(() => {});
    }
  };

  const handleAddCustomUni = () => {
    const trimmed = customUni.trim();
    if (!trimmed) return;
    const item = { id: `uni-${Date.now()}`, name: trimmed };
    setUniList((prev) => [item, ...prev]);
    setSelectedUni(item);
    setCustomUni("");
  };

  const handleSelectCol = (c: { id?: number | string; name: string }) => {
    setSelectedCol(c);
    if (c.id) {
      browseService
        .getCourses(c.id)
        .then((cs) => {
          if (cs && cs.length > 0) {
            setCourseList(cs);
          }
        })
        .catch(() => {});
    }
  };

  const handleAddCustomCol = () => {
    const trimmed = customCol.trim();
    if (!trimmed) return;
    const item = { id: `col-${Date.now()}`, name: trimmed };
    setColList((prev) => [item, ...prev]);
    setSelectedCol(item);
    setCustomCol("");
  };

  const handlePickMajor = (major: string) => {
    setSelectedMajor(major);
    setCustomMajor("");
  };

  const handleAddCustomMajor = () => {
    const trimmed = customMajor.trim();
    if (!trimmed) return;
    setSelectedMajor(trimmed);
  };

  const addCustomCourse = async () => {
    const trimmed = customCourse.trim();
    if (!trimmed) return;

    const existing = courseList.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!picked.includes(String(existing.id))) setPicked((p) => [...p, String(existing.id)]);
      setCustomCourse("");
      return;
    }

    if (selectedCol?.id && !String(selectedCol.id).startsWith("col-")) {
      try {
        const created = await browseService.createCourse(selectedCol.id, trimmed);
        setCourseList((prev) => [created, ...prev]);
        setPicked((p) => [...p, String(created.id)]);
        setCustomCourse("");
        return;
      } catch {}
    }

    const fallbackCourse: Course = {
      id: `c-${Date.now()}`,
      code: "CUSTOM",
      name: trimmed,
      status: "none",
    };
    setCourseList((prev) => [fallbackCourse, ...prev]);
    setPicked((p) => [...p, String(fallbackCourse.id)]);
    setCustomCourse("");
  };

  const handleFinish = () => {
    if (picked.length === 0) {
      toast.error("Please add or select at least one course to start your study plan!");
      return;
    }

    try {
      const selectedCoursesData = courseList.filter((c) => picked.includes(String(c.id)));
      if (selectedCoursesData.length > 0) {
        localStorage.setItem("sg-user-courses", JSON.stringify(selectedCoursesData));
      }
      if (selectedUni) {
        localStorage.setItem("sg-user-uni", JSON.stringify(selectedUni));
      }
      if (selectedCol) {
        localStorage.setItem("sg-user-col", JSON.stringify(selectedCol));
      }
      if (selectedMajor) {
        localStorage.setItem("sg-user-major", JSON.stringify({ name: selectedMajor }));
      }
    } catch {}

    toast.success("Profile setup complete! Welcome to StudyGenie ✨");
    nav({ to: "/dashboard" });
  };

  const row = (active: boolean) =>
    cn(
      "flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left font-semibold transition hover:border-primary",
      active && "border-primary ring-2 ring-primary/30"
    );

  const isNextDisabled = () => {
    if (step === 0) return !selectedUni;
    if (step === 1) return !selectedCol;
    if (step === 2) return !selectedMajor && !customMajor.trim();
    if (step === 3) return picked.length === 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/">
          <GenieLogo />
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="mb-8 flex items-center gap-3">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-sm font-bold",
                  i <= step
                    ? "bg-gradient-magic text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="text-xs font-bold sm:text-sm">{s}</span>
              {i < steps.length - 1 && (
                <div className={cn("h-1 flex-1 rounded-full", i < step ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border bg-card p-8 shadow-soft">
          <div className="mb-6 flex items-center gap-4">
            <Genie pose="mid" className="h-16 w-16" />
            <h1 className="text-2xl font-semibold">
              {
                [
                  "Where do you study?",
                  "Which college or faculty?",
                  "What is your major?",
                  "Pick or add your courses",
                ][step]
              }
            </h1>
          </div>

          {step === 0 && (
            <>
              <div className="mb-3 flex gap-2">
                <Input
                  value={customUni}
                  onChange={(e) => setCustomUni(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomUni();
                    }
                  }}
                  placeholder="Type your university name..."
                  className="h-11 rounded-xl"
                />
                <Button type="button" onClick={handleAddCustomUni} variant="secondary">
                  Add
                </Button>
              </div>

              {uniList.length > 0 ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search universities"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                  <div className="flex max-h-80 flex-col gap-2 overflow-auto">
                    {uniList
                      .filter((u) => u.name.toLowerCase().includes(q.toLowerCase()))
                      .map((u) => {
                        const isSelected = selectedUni?.name === u.name;
                        return (
                          <button
                            key={u.name}
                            onClick={() => handleSelectUni(u)}
                            className={row(isSelected)}
                          >
                            {u.name}
                            {isSelected && <Check className="h-5 w-5 text-primary" />}
                          </button>
                        );
                      })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Type your university name above and click "Add" to proceed.
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="mb-3 flex gap-2">
                <Input
                  value={customCol}
                  onChange={(e) => setCustomCol(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomCol();
                    }
                  }}
                  placeholder="e.g. Computer Science, Engineering, Medicine..."
                  className="h-11 rounded-xl"
                />
                <Button type="button" onClick={handleAddCustomCol} variant="secondary">
                  Add
                </Button>
              </div>

              {colList.length > 0 ? (
                <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto">
                  {colList.map((c) => {
                    const isSelected = selectedCol?.name === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => handleSelectCol(c)}
                        className={row(isSelected)}
                      >
                        {c.name}
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Type your faculty or college name above and click "Add" to continue.
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  value={customMajor}
                  onChange={(e) => {
                    setCustomMajor(e.target.value);
                    setSelectedMajor(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomMajor();
                    }
                  }}
                  placeholder="Type your major (e.g. Software Engineering, Cybersecurity)..."
                  className="h-11 rounded-xl"
                />
                <Button type="button" onClick={handleAddCustomMajor} variant="secondary">
                  Select
                </Button>
              </div>

              <div>
                <Label className="mb-2 block text-xs font-semibold text-muted-foreground">
                  Or pick a common major:
                </Label>
                <div className="flex max-h-72 flex-wrap gap-2 overflow-auto pt-1">
                  {majorSuggestions.map((m) => {
                    const isChosen = selectedMajor.toLowerCase() === m.toLowerCase();
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handlePickMajor(m)}
                        className={cn(
                          "rounded-xl border px-3.5 py-2 text-sm font-semibold transition hover:border-primary",
                          isChosen
                            ? "border-primary bg-primary text-primary-foreground shadow-soft"
                            : "bg-card text-card-foreground hover:bg-accent"
                        )}
                      >
                        <GraduationCap className="mr-1.5 inline h-4 w-4" />
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedMajor && (
                <div className="rounded-xl bg-accent/60 p-3 text-sm font-semibold text-accent-foreground">
                  Selected major: <span className="text-primary">{selectedMajor}</span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomCourse();
                    }
                  }}
                  placeholder="Type a course name (e.g. Physics, Calculus, Algorithms)..."
                  className="h-11 rounded-xl"
                />
                <Button type="button" onClick={addCustomCourse} variant="secondary" className="shrink-0">
                  Add Course
                </Button>
              </div>

              {courseList.length > 0 ? (
                <div className="flex max-h-72 flex-col gap-2 overflow-auto">
                  {courseList.map((c) => {
                    const on = picked.includes(String(c.id));
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          setPicked((p) =>
                            on ? p.filter((x) => x !== String(c.id)) : [...p, String(c.id)]
                          )
                        }
                        className={row(on)}
                      >
                        <span>
                          <span className="mr-2 text-xs text-muted-foreground">{c.code}</span>
                          {c.name}
                        </span>
                        <StatusBadge status={c.status} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No courses added yet. Type course names above and click "Add Course".
                </div>
              )}

              {picked.length === 0 && (
                <p className="text-xs text-amber-500 font-medium">
                  * At least one course is required before proceeding to the study tools.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ChevronLeft /> Back
            </Button>
            <Button
              variant="magic"
              disabled={isNextDisabled()}
              onClick={() => {
                if (step === 2 && !selectedMajor && customMajor.trim()) {
                  setSelectedMajor(customMajor.trim());
                }
                if (step < steps.length - 1) {
                  setStep(step + 1);
                } else {
                  handleFinish();
                }
              }}
            >
              {step < steps.length - 1 ? "Continue" : "Finish & Go to Dashboard"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
