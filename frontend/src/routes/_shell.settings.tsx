import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Landmark,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, PageTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-state";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";
import { celebrationSounds, getSavedCelebrationSound, setSavedCelebrationSound, playCelebrationSound, type CelebrationSoundType } from "@/lib/sound";
import { getUserStoragePrefix } from "@/lib/courses-util";
import { clearExam } from "@/lib/exam";

export const Route = createFileRoute("/_shell/settings")({
  head: pageHead("Settings", "Manage your profile, language and appearance."),
  component: Settings,
});

function Settings() {
  const nav = useNavigate();
  const { lang, setLang, user } = useApp();
  const ar = lang === "ar";
  const [selectedSound, setSelectedSound] = useState<CelebrationSoundType>("magic");
  const [uniName, setUniName] = useState("");
  const [colName, setColName] = useState("");
  const [majorName, setMajorName] = useState("");

  useEffect(() => {
    setSelectedSound(getSavedCelebrationSound());
    try {
      const u = localStorage.getItem("sg-user-uni");
      if (u) setUniName(JSON.parse(u).name || "");
      const c = localStorage.getItem("sg-user-col");
      if (c) setColName(JSON.parse(c).name || "");
      const m = localStorage.getItem("sg-user-major");
      if (m) setMajorName(JSON.parse(m).name || "");
    } catch {}
  }, []);

  const handleSelectSound = (id: CelebrationSoundType) => {
    setSavedCelebrationSound(id);
    setSelectedSound(id);
    playCelebrationSound(id);
  };

  const handleResetLocalData = () => {
    clearExam();
    const prefix = getUserStoragePrefix();
    localStorage.removeItem(`sg-${prefix}-courses`);
    localStorage.removeItem(`sg-${prefix}-exams`);
    localStorage.removeItem(`sg-${prefix}-exam`);
    localStorage.removeItem(`sg-${prefix}-task-kits`);
    localStorage.removeItem(`sg-${prefix}-active-course`);
    localStorage.removeItem(`sg-${prefix}-active-plan`);
    localStorage.removeItem(`sg-${prefix}-active-cards`);
    localStorage.removeItem("sg-exams");
    localStorage.removeItem("sg-exam");
    localStorage.removeItem("sg-uploads");
    localStorage.removeItem("sg-user-courses");
    localStorage.removeItem("sg-user-uni");
    localStorage.removeItem("sg-user-col");
    localStorage.removeItem("sg-user-major");
    localStorage.removeItem("sg-active-plan");
    localStorage.removeItem("sg-active-course");
    localStorage.removeItem("sg-active-kit");
    toast.success("All local test data cleared! Refreshing...");
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 400);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6" dir={ar ? "rtl" : "ltr"}>
      <PageTitle title={ar ? "الإعدادات" : "Settings"} />
      <Card className="grid gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              {ar ? "معلومات الحساب الأكاديمي" : "Academic Student Profile"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ar
                ? "بياناتك الشخصية والأكاديمية المسجلة بشكل دائم"
                : "Your verified student credentials and permanent academic affiliation"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Lock className="h-3.5 w-3.5" />
            {ar ? "سجل غير قابل للتعديل" : "Non-Editable Record"}
          </span>
        </div>

        {/* Academic Protection Warning Callout */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 leading-relaxed">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">
              {ar ? "تنبيه حماية النظام الأكاديمي:" : "Academic Affiliation Notice:"}
            </span>{" "}
            {ar
              ? "الجامعة والكلية والتخصص مسجلة بشكل دائم ولا يمكن تعديلها بعد إنشاء الحساب لحماية ارتباطات المناهج الدراسية وقواعد بيانات المقررات وجداول الاختبارات."
              : "Your University, College, and Major are permanently registered and cannot be modified to protect course catalogs, syllabus databases, and study records."}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Full Name */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" /> {ar ? "الاسم الكامل" : "Full Name"}
              </Label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> {ar ? "قراءة فقط" : "Read-only"}
              </span>
            </div>
            <div className="flex h-11 items-center rounded-xl border border-border/80 bg-muted/40 px-3.5 text-sm font-medium text-foreground select-none">
              {user?.fullName || (ar ? "طالب مسجل" : "Registered Student")}
            </div>
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {ar ? "البريد الإلكتروني" : "Email Address"}
              </Label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> {ar ? "قراءة فقط" : "Read-only"}
              </span>
            </div>
            <div className="flex h-11 items-center rounded-xl border border-border/80 bg-muted/40 px-3.5 text-sm font-medium text-foreground select-none">
              {user?.email || (ar ? "غير متوفر" : "Not specified")}
            </div>
          </div>

          {/* University */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" /> {ar ? "الجامعة" : "University"}
              </Label>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> {ar ? "مقفل" : "Locked"}
              </span>
            </div>
            <div className="flex h-11 items-center justify-between rounded-xl border border-border/80 bg-muted/50 px-3.5 text-sm font-semibold text-foreground select-none">
              <span className="truncate">{uniName || (ar ? "جامعة الملك سعود" : "King Saud University")}</span>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0 ml-2">
                {ar ? "مؤكد" : "Verified"}
              </span>
            </div>
          </div>

          {/* College */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> {ar ? "الكلية" : "College / Faculty"}
              </Label>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> {ar ? "مقفل" : "Locked"}
              </span>
            </div>
            <div className="flex h-11 items-center justify-between rounded-xl border border-border/80 bg-muted/50 px-3.5 text-sm font-semibold text-foreground select-none">
              <span className="truncate">{colName || (ar ? "كلية علوم الحاسب والمعلومات" : "College of Computer & Info Sciences")}</span>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0 ml-2">
                {ar ? "كلية" : "Faculty"}
              </span>
            </div>
          </div>

          {/* Major */}
          <div className="sm:col-span-2 grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> {ar ? "التخصص الأكاديمي" : "Major / Specialization"}
              </Label>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> {ar ? "مقفل" : "Locked"}
              </span>
            </div>
            <div className="flex h-11 items-center justify-between rounded-xl border border-border/80 bg-muted/50 px-3.5 text-sm font-semibold text-foreground select-none">
              <span className="truncate">{majorName || (ar ? "علوم الحاسب (Computer Science)" : "Computer Science")}</span>
              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-muted-foreground shrink-0 ml-2">
                {ar ? "تخصص رئيسي" : "Active Major"}
              </span>
            </div>
          </div>
        </div>
      </Card>
      <Card className="grid gap-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">{ar ? "اللغة" : "Language"}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ar ? "اختر لغة واجهة التطبيق" : "Choose your preferred interface language"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-bold transition",
                  lang === l && "bg-card text-primary shadow-soft"
                )}
              >
                {l === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
        </div>
      </Card>
      <Card className="grid gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {ar ? "صوت الاحتفال (انتهاء الجلسة)" : "Focus Celebration Sound"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {ar
              ? "اختر الصوت الذي سيعمل عند إنهاء جلسة التركيز وكسب النقاط"
              : "Choose the sound effect played when you finish a focus session and earn points"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {celebrationSounds.map((s) => {
            const isSelected = selectedSound === s.id;
            return (
              <div
                key={s.id}
                onClick={() => handleSelectSound(s.id)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      {ar ? s.ar : s.label}
                      {isSelected && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {ar ? "الحالي" : "Active"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playCelebrationSound(s.id);
                  }}
                  title={ar ? "استماع" : "Play preview"}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={handleResetLocalData}>
          <Trash2 className="h-4 w-4" /> Clear Local Data
        </Button>
        <Button variant="destructive" size="lg" onClick={() => nav({ to: "/" })}>
          <LogOut className="h-4 w-4" /> {ar ? "تسجيل الخروج" : "Log out"}
        </Button>
      </div>
    </div>
  );
}
