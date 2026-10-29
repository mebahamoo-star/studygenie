import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Brain,
  Crown,
  Flame,
  Lock,
  Moon,
  Rocket,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Card } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { CountingNumber } from "@/components/animate-ui/texts/counting-number";
import { useApp } from "@/lib/app-state";
import { getUserAcademicProfile } from "@/lib/courses-util";
import { pageHead } from "@/lib/head";
import { gamificationService } from "@/lib/api/services";
import type { GamificationProfile } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/profile")({
  head: pageHead("Profile", "Your level, stats and badge collection."),
  component: Profile,
});

const allBadges = [
  { id: "streak_7", icon: Flame, name: "7-day streak" },
  { id: "first_upload", icon: BookOpen, name: "First upload" },
  { id: "cards_100", icon: Brain, name: "100 cards" },
  { id: "perfect_quiz", icon: Target, name: "Perfect quiz" },
  { id: "night_owl", icon: Moon, name: "Night owl" },
  { id: "speed_run", icon: Zap, name: "Speed run" },
  { id: "top_10", icon: Trophy, name: "Top 10" },
  { id: "streak_30", icon: Rocket, name: "30-day streak" },
  { id: "grand_genie", icon: Crown, name: "Grand Genie" },
];

function Profile() {
  const { user, points, streak } = useApp();
  const [profileData, setProfileData] = useState<GamificationProfile | null>(null);
  const [uniName, setUniName] = useState<string>("");
  const [majorName, setMajorName] = useState<string>("");

  useEffect(() => {
    try {
      const profile = getUserAcademicProfile();
      if (profile.uni?.name) setUniName(profile.uni.name);
      if (profile.major?.name) setMajorName(profile.major.name);
    } catch {}

    gamificationService
      .getProfile()
      .then((data) => {
        if (data) setProfileData(data);
      })
      .catch(() => {});
  }, []);

  const currentLevel = profileData?.currentLevel || 1;
  const currentXp = profileData?.currentXp ?? points ?? 0;
  const currentStreak = profileData?.currentStreakDays ?? streak ?? 0;
  const longestStreak = profileData?.longestStreakDays || currentStreak;

  const unlockedIds = new Set(
    (profileData?.unlockedBadges || []).map((b) => b.id.toLowerCase())
  );

  const badgesWithStatus = allBadges.map((b) => ({
    ...b,
    on: unlockedIds.has(b.id.toLowerCase()) || (b.id === "streak_7" && currentStreak >= 7),
  }));

  const unlockedCount = badgesWithStatus.filter((b) => b.on).length;

  const stats = [
    { icon: Star, v: currentXp.toLocaleString(), l: "XP Points" },
    { icon: Award, v: String(currentLevel), l: "Level" },
    { icon: Flame, v: `${longestStreak} d`, l: "Longest streak" },
    { icon: Trophy, v: `${unlockedCount} / ${allBadges.length}`, l: "Badges" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="flex items-center gap-8 bg-gradient-magic text-primary-foreground">
        <div className="relative">
          <div className="grid h-36 w-36 place-items-center rounded-full bg-card/20 ring-4 ring-gold">
            <Genie pose={currentXp > 100 ? "high" : "mid"} className="h-32 w-32" />
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-xs font-bold text-gold-foreground">
            LV {currentLevel}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">
            {user?.fullName || profileData?.displayName || "Scholar"}
          </h1>
          <p className="opacity-80">
            {user?.email ? `${user.email} · ` : ""}
            {majorName ? `${majorName} · ` : ""}
            {uniName ? `${uniName} · ` : ""}
            <><CountingNumber number={currentStreak} fromNumber={0} className="tabular-nums" />-day streak</>
          </p>
          <div className="mt-4 h-3 max-w-md overflow-hidden rounded-full bg-card/25">
            <div
              className="h-full rounded-full bg-gradient-gold transition-all"
              style={{ width: `${Math.min(100, (currentXp % 1000) / 10)}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-bold opacity-80">
            {currentXp % 1000} / 1000 XP to Level {currentLevel + 1}
          </p>
        </div>
      </Card>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.l} className="text-center">
            <s.icon className="mx-auto h-6 w-6 text-gold" />
            <div className="mt-2 font-display text-3xl font-semibold">{s.v}</div>
            <div className="text-sm text-muted-foreground">{s.l}</div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Badges</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {badgesWithStatus.map((b) => (
            <div
              key={b.name}
              className={cn(
                "flex w-24 shrink-0 flex-col items-center gap-2 text-center",
                !b.on && "opacity-40 grayscale"
              )}
            >
              <div
                className={cn(
                  "relative grid h-20 w-20 place-items-center rounded-2xl",
                  b.on
                    ? "bg-gradient-gold text-gold-foreground shadow-soft"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <b.icon className="h-9 w-9" />
                {!b.on && <Lock className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-card p-0.5" />}
              </div>
              <span className="text-xs font-bold">{b.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
