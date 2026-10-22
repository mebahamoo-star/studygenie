import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Trash2, Volume2 } from "lucide-react";
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
      <Card className="grid gap-4">
        <h2 className="text-lg font-semibold">{ar ? "الملف الشخصي" : "Profile"}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{ar ? "الاسم" : "Full name"}</Label>
            <Input className="rounded-xl" placeholder="Full name" defaultValue={user?.fullName || ""} />
          </div>
          <div className="grid gap-2">
            <Label>{ar ? "البريد" : "Email"}</Label>
            <Input className="rounded-xl" placeholder="Email" defaultValue={user?.email || ""} />
          </div>
          <div className="grid gap-2">
            <Label>{ar ? "الجامعة" : "University"}</Label>
            <Input className="rounded-xl" placeholder="University" defaultValue={uniName} />
          </div>
          <div className="grid gap-2">
            <Label>{ar ? "الكلية" : "College"}</Label>
            <Input className="rounded-xl" placeholder="College / Faculty" defaultValue={colName} />
          </div>
          <div className="col-span-2 grid gap-2">
            <Label>{ar ? "التخصص" : "Major / Specialization"}</Label>
            <Input className="rounded-xl" placeholder="Major / Specialization" defaultValue={majorName} />
          </div>
        </div>
      </Card>
      <Card className="grid gap-5">
        <div className="flex items-center justify-between">
          <Label>{ar ? "اللغة" : "Language"}</Label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["en", "ar"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={cn("rounded-lg px-4 py-1.5 text-sm font-bold", lang === l && "bg-card text-primary shadow-soft")}>{l === "en" ? "English" : "العربية"}</button>
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
