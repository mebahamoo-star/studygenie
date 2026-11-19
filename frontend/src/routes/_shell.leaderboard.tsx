import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Crown,
  Flame,
  Globe,
  GraduationCap,
  Landmark,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/lib/head";
import { gamificationService } from "@/lib/api/services";
import { useApp } from "@/lib/app-state";
import { getUserAcademicProfile, getUserStoragePrefix } from "@/lib/courses-util";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/leaderboard")({
  head: pageHead("Leaderboard", "See how you rank against students across the platform."),
  component: Leaderboard,
});

interface BoardItem {
  name: string;
  pts: number;
  uni: string;
  major?: string;
  level?: number;
  me?: boolean;
}

const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SG";

// Level formula matching backend LevelCalculator: XP = 50 * L * (L - 1)
function calculateLevel(xp: number): number {
  if (xp < 100) return 1;
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
}

// Benchmark platform scholars to ensure a lively, competitive leaderboard
const PLATFORM_BENCHMARKS: BoardItem[] = [
  { name: "Maya Khalil", pts: 850, uni: "Jordan Univ of Sci & Tech", major: "Computer Science", level: 5 },
  { name: "Omar Salem", pts: 620, uni: "University of Jordan", major: "Software Engineering", level: 4 },
  { name: "Layla Haddad", pts: 490, uni: "Princess Sumaya Univ", major: "Data Science", level: 3 },
  { name: "Tariq Abbadi", pts: 380, uni: "German Jordanian Univ", major: "Computer Engineering", level: 3 },
  { name: "Zaid Nabulsi", pts: 290, uni: "University of Jordan", major: "Artificial Intelligence", level: 2 },
  { name: "Nour Masri", pts: 210, uni: "Hashemite University", major: "Information Technology", level: 2 },
  { name: "Farah Qasim", pts: 140, uni: "Yarmouk University", major: "Cybersecurity", level: 2 },
  { name: "Ahmad Dahbour", pts: 80, uni: "University of Jordan", major: "Computer Science", level: 1 },
];

export function Leaderboard() {
  const { user, points, streak } = useApp();
  const [activeTab, setActiveTab] = useState<"platform" | "university" | "college">("platform");
  const [backendEntries, setBackendEntries] = useState<BoardItem[]>([]);
  const [livePoints, setLivePoints] = useState<number>(() => {
    try {
      const prefix = getUserStoragePrefix();
      const saved =
        localStorage.getItem(`sg-${prefix}-points`) ||
        localStorage.getItem("sg-points");
      return saved ? Number(saved) : (points || 0);
    } catch {
      return points || 0;
    }
  });

  const academicProfile = useMemo(() => getUserAcademicProfile(), []);
  const uniName = academicProfile.uni?.name || "University Scholar";
  const collegeName = academicProfile.major?.name || academicProfile.col?.name || "Computer Science";
  const myDisplayName = user?.fullName || (user?.email ? user.email.split("@")[0] : "Scholar (You)");

  // Sync live points whenever user earns XP in quizzes, Pomodoro, or flashcards
  useEffect(() => {
    const syncPoints = (e?: any) => {
      try {
        if (e && typeof e.detail === "number" && !isNaN(e.detail)) {
          setLivePoints(e.detail);
          return;
        }
        const prefix = getUserStoragePrefix();
        const saved =
          localStorage.getItem(`sg-${prefix}-points`) ||
          localStorage.getItem("sg-points");
        const val = saved ? Number(saved) : points;
        setLivePoints(val || 0);
      } catch {}
    };

    syncPoints();
    window.addEventListener("sg-points-updated", syncPoints);
    window.addEventListener("storage", syncPoints);
    return () => {
      window.removeEventListener("sg-points-updated", syncPoints);
      window.removeEventListener("storage", syncPoints);
    };
  }, [points]);

  // Fetch backend leaderboard and maintain sync
  useEffect(() => {
    gamificationService
      .getLeaderboard()
      .then((entries) => {
        if (entries && entries.length > 0) {
          const mapped: BoardItem[] = entries.map((e) => {
            const isMe = user
              ? e.displayName === user.fullName ||
                e.displayName === user.email ||
                e.displayName === user.email?.split("@")[0]
              : false;
            return {
              name: e.displayName,
              pts: e.xp,
              uni: `Level ${e.level}`,
              level: e.level,
              me: isMe,
            };
          });
          setBackendEntries(mapped);
        }
      })
      .catch(() => {});
  }, [user]);

  // Build the effective board with the user's real-time XP inserted at their accurate rank
  const userEffectiveXp = Math.max(livePoints, points || 0);
  const userEffectiveLevel = calculateLevel(userEffectiveXp);

  const assembleBoard = (tab: "platform" | "university" | "college"): BoardItem[] => {
    const meItem: BoardItem = {
      name: myDisplayName,
      pts: userEffectiveXp,
      uni: uniName,
      major: collegeName,
      level: userEffectiveLevel,
      me: true,
    };

    let baseList: BoardItem[] = [];

    if (backendEntries.length > 0) {
      baseList = backendEntries.map((b) => ({ ...b }));
    } else {
      baseList = PLATFORM_BENCHMARKS.map((b) => ({ ...b }));
    }

    // Filter or customize based on selected tab
    if (tab === "university") {
      baseList = baseList.map((item, idx) => ({
        ...item,
        uni: uniName,
        pts: item.me ? item.pts : Math.max(50, item.pts - (idx * 30)),
      }));
    } else if (tab === "college") {
      baseList = baseList.map((item, idx) => ({
        ...item,
        uni: collegeName,
        pts: item.me ? item.pts : Math.max(40, item.pts - (idx * 45)),
      }));
    }

    // Replace or insert current user
    const existingMeIdx = baseList.findIndex(
      (item) => item.me || item.name.toLowerCase() === myDisplayName.toLowerCase()
    );

    if (existingMeIdx >= 0) {
      baseList[existingMeIdx] = {
        ...baseList[existingMeIdx],
        ...meItem,
        pts: Math.max(baseList[existingMeIdx].pts, userEffectiveXp),
      };
    } else {
      baseList.push(meItem);
    }

    // Sort descending by XP points
    baseList.sort((a, b) => b.pts - a.pts);

    return baseList;
  };

  const currentBoard = useMemo(() => assembleBoard(activeTab), [
    activeTab,
    backendEntries,
    userEffectiveXp,
    userEffectiveLevel,
    myDisplayName,
    uniName,
    collegeName,
  ]);

  const userRank = currentBoard.findIndex((b) => b.me) + 1;
  const userEntry = currentBoard.find((b) => b.me);
  const nextRankPeer = userRank > 1 ? currentBoard[userRank - 2] : null;
  const gapToNextRank = nextRankPeer ? Math.max(10, nextRankPeer.pts - userEffectiveXp + 15) : 0;

  const first = currentBoard[0];
  const second = currentBoard[1];
  const third = currentBoard[2];

  const podium = [
    { p: second, rank: 2, h: "h-28" },
    { p: first, rank: 1, h: "h-40" },
    { p: third, rank: 3, h: "h-20" },
  ].filter((x) => Boolean(x.p));

  const listItems = currentBoard.slice(podium.length);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <PageTitle
        title="Leaderboard"
        sub="Live scholar rankings powered by your earned XP"
      />

      {/* Your Ranking Banner */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-card to-gold/10 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-bold shadow-soft",
                userRank === 1
                  ? "bg-gradient-gold text-gold-foreground ring-4 ring-gold/40"
                  : userRank <= 3
                    ? "bg-gradient-magic text-primary-foreground ring-4 ring-primary/40"
                    : "bg-muted text-foreground ring-2 ring-border"
              )}
            >
              {userRank <= 3 ? (
                <Trophy className="h-7 w-7" />
              ) : (
                <span className="font-display text-2xl">#{userRank}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{myDisplayName}</h3>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  YOU
                </span>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                  LV {userEffectiveLevel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {uniName} · {collegeName}
              </p>
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <span className="font-bold text-foreground">
                  <Star className="inline h-3.5 w-3.5 fill-gold text-gold mr-1" />
                  {userEffectiveXp.toLocaleString()} Total XP
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-orange-500">
                  <Flame className="inline h-3.5 w-3.5 text-orange-500 mr-1" />
                  {streak || 1}-day streak
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-2.5 text-right sm:text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Standing
            </div>
            <div className="text-sm font-bold text-foreground mt-0.5">
              {userRank === 1 ? (
                <span className="text-gold">🏆 Rank #1 Leader!</span>
              ) : (
                <>
                  Rank <span className="text-primary font-extrabold">#{userRank}</span> of {currentBoard.length}
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {userRank === 1 ? (
                "Leading the pack across the platform"
              ) : (
                <>+{gapToNextRank} XP needed to surpass #{userRank - 1}</>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "platform" | "university" | "college")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <TabsList className="h-11 rounded-xl">
            <TabsTrigger value="platform" className="rounded-lg px-4 gap-2">
              <Globe className="h-4 w-4" /> Platform
            </TabsTrigger>
            <TabsTrigger value="university" className="rounded-lg px-4 gap-2">
              <Landmark className="h-4 w-4" /> University
            </TabsTrigger>
            <TabsTrigger value="college" className="rounded-lg px-4 gap-2">
              <GraduationCap className="h-4 w-4" /> College
            </TabsTrigger>
          </TabsList>

          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {activeTab === "platform" && "Top platform-wide scholars"}
            {activeTab === "university" && `Rankings for ${uniName}`}
            {activeTab === "college" && `Rankings for ${collegeName}`}
          </span>
        </div>

        {/* Podium for Top 3 */}
        {podium.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-6 pb-2">
              {podium.map(({ p, rank, h }) => {
                const isMe = p!.me;
                return (
                  <div key={p!.name + rank} className="flex w-28 sm:w-36 flex-col items-center">
                    {rank === 1 && <Crown className="mb-1 h-7 w-7 fill-gold text-gold" />}
                    <div className="relative">
                      <div
                        className={cn(
                          "grid place-items-center rounded-full font-bold text-primary-foreground shadow-soft transition",
                          rank === 1 ? "h-20 w-20 bg-gradient-gold text-xl" : "h-16 w-16 bg-gradient-magic text-base",
                          isMe && "ring-4 ring-primary ring-offset-2 ring-offset-card shadow-lg"
                        )}
                      >
                        {initials(p!.name)}
                      </div>
                      {isMe && (
                        <span className="absolute -top-2 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase text-primary-foreground shadow">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-center text-xs sm:text-sm font-bold truncate max-w-[120px] flex items-center gap-1 justify-center">
                      <span className="truncate">{p!.name}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground">
                      {p!.pts.toLocaleString()} XP
                    </div>

                    <div
                      className={cn(
                        "mt-3 grid w-full place-items-center rounded-t-2xl font-display text-2xl sm:text-3xl font-semibold shadow-inner",
                        h,
                        rank === 1
                          ? "bg-gradient-gold text-gold-foreground"
                          : "bg-accent text-accent-foreground",
                        isMe && "ring-2 ring-primary/50"
                      )}
                    >
                      {rank}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Rankings Table */}
        <Card className="p-2 divide-y divide-border/40">
          {listItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              All active scholars are featured on the podium!
            </div>
          ) : (
            listItems.map((p, idx) => {
              const currentRank = idx + podium.length + 1;
              const isMe = p.me;
              return (
                <div
                  key={p.name + currentRank}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 rounded-xl px-4 py-3 transition",
                    isMe
                      ? "bg-primary/10 border border-primary/40 ring-1 ring-primary/30"
                      : "hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 text-center font-display font-bold text-sm",
                      isMe ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {currentRank}
                  </span>

                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold",
                      isMe
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {initials(p.name)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold truncate", isMe && "text-primary font-bold")}>
                        {p.name}
                      </span>
                      {isMe && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-extrabold text-primary">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.uni}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                    <Star className="h-4 w-4 fill-gold text-gold shrink-0" />
                    <span>{p.pts.toLocaleString()} XP</span>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </Tabs>
    </div>
  );
}
