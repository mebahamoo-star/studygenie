import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Star } from "lucide-react";
import { Card, PageTitle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/lib/head";
import { gamificationService } from "@/lib/api/services";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/leaderboard")({
  head: pageHead("Leaderboard", "See how you rank against students across the platform."),
  component: Leaderboard,
});

interface BoardItem {
  name: string;
  pts: number;
  uni: string;
  me?: boolean;
}

const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Soon({ label }: { label: string }) {
  return (
    <Card className="flex flex-col items-center py-16 text-center">
      <Genie pose="mid" className="h-28 w-28" />
      <h2 className="mt-3 text-2xl font-semibold">{label} rankings coming soon</h2>
      <p className="text-muted-foreground">Invite classmates to unlock this board faster.</p>
    </Card>
  );
}

function Leaderboard() {
  const { user } = useApp();
  const [board, setBoard] = useState<BoardItem[]>([]);

  useEffect(() => {
    gamificationService
      .getLeaderboard()
      .then((entries) => {
        if (entries && entries.length > 0) {
          const mapped: BoardItem[] = entries.map((e) => ({
            name: e.displayName,
            pts: e.xp,
            uni: `Level ${e.level}`,
            me: user ? e.displayName === user.fullName || e.displayName === user.email : false,
          }));
          setBoard(mapped);
        }
      })
      .catch(() => {});
  }, [user]);

  const first = board[0];
  const second = board[1];
  const third = board[2];

  const podium = [
    { p: second, rank: 2, h: "h-28" },
    { p: first, rank: 1, h: "h-40" },
    { p: third, rank: 3, h: "h-20" },
  ].filter((x) => Boolean(x.p));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Leaderboard" sub="Top scholars ranking" />
      <Tabs defaultValue="platform">
        <TabsList className="mb-6 h-11 rounded-xl">
          <TabsTrigger value="college" className="rounded-lg px-5">
            College
          </TabsTrigger>
          <TabsTrigger value="university" className="rounded-lg px-5">
            University
          </TabsTrigger>
          <TabsTrigger value="platform" className="rounded-lg px-5">
            Platform
          </TabsTrigger>
        </TabsList>
        <TabsContent value="college">
          <Soon label="College" />
        </TabsContent>
        <TabsContent value="university">
          <Soon label="University" />
        </TabsContent>
        <TabsContent value="platform">
          {board.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Genie pose="mid" className="mb-4 h-24 w-24" />
              <h2 className="text-xl font-semibold text-foreground">No rankings yet</h2>
              <p className="mt-1 max-w-sm text-sm">
                Be the first scholar on the leaderboard! Complete study tasks, review flashcards, and pass quizzes to earn XP.
              </p>
            </Card>
          ) : (
            <>
              {podium.length > 0 && (
                <Card className="mb-6">
                  <div className="flex items-end justify-center gap-4 pt-6">
                    {podium.map(({ p, rank, h }) => (
                      <div key={p!.name + rank} className="flex w-36 flex-col items-center">
                        {rank === 1 && <Crown className="mb-1 h-7 w-7 fill-gold text-gold" />}
                        <div
                          className={cn(
                            "grid place-items-center rounded-full font-bold text-primary-foreground",
                            rank === 1 ? "h-20 w-20 bg-gradient-gold text-xl" : "h-16 w-16 bg-gradient-magic"
                          )}
                        >
                          {initials(p!.name)}
                        </div>
                        <div className="mt-2 text-center text-sm font-bold">{p!.name}</div>
                        <div className="text-xs text-muted-foreground">{p!.pts.toLocaleString()} XP</div>
                        <div
                          className={cn(
                            "mt-3 grid w-full place-items-center rounded-t-2xl font-display text-3xl font-semibold",
                            h,
                            rank === 1
                              ? "bg-gradient-gold text-gold-foreground"
                              : "bg-accent text-accent-foreground"
                          )}
                        >
                          {rank}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <Card className="p-2">
                {board.slice(podium.length).map((p, idx) => (
                  <div
                    key={p.name + idx}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3",
                      p.me && "bg-accent ring-2 ring-primary/40"
                    )}
                  >
                    <span className="w-6 font-display font-semibold text-muted-foreground">
                      {idx + podium.length + 1}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-bold">
                      {initials(p.name)}
                    </span>
                    <span className="flex-1 font-semibold">
                      {p.name}
                      {p.me && <span className="ml-2 text-xs text-primary">You</span>}
                    </span>
                    <span className="text-sm text-muted-foreground">{p.uni}</span>
                    <span className="flex w-24 items-center justify-end gap-1 font-bold">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      {p.pts.toLocaleString()} XP
                    </span>
                  </div>
                ))}
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
