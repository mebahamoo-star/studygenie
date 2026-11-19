/**
 * CommunityPage.tsx
 * -----------------
 * Page 3 — Campus Community & Shared Syllabus Challenge.
 * 100% translated via `t.*`. No hardcoded strings.
 */
import React, { useState } from "react";
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Sparkles,
  CheckCircle2,
  LockOpen,
  Zap,
} from "lucide-react";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface CommunityPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function CommunityPage({ t, lang }: CommunityPageProps) {
  const isRTL = lang === "ar";
  const [selectedLevel, setSelectedLevel] = useState<number>(3);
  const [joined, setJoined] = useState(false);
  const [studentCount, setStudentCount] = useState(48);

  const handleJoin = () => {
    if (!joined) {
      setJoined(true);
      setStudentCount((c) => c + 1);
    } else {
      setJoined(false);
      setStudentCount((c) => c - 1);
    }
  };

  const hierarchyNodes = [
    {
      level: 1,
      tag: t.community.flow.uni,
      icon: GraduationCap,
      name: t.community.mockTree.uniName,
      sub: t.community.mockTree.uniSub,
    },
    {
      level: 2,
      tag: t.community.flow.college,
      icon: Building2,
      name: t.community.mockTree.collegeName,
      sub: t.community.mockTree.collegeSub,
    },
    {
      level: 3,
      tag: t.community.flow.course,
      icon: BookOpen,
      name: t.community.mockTree.courseName,
      sub: t.community.mockTree.courseSub,
    },
  ];

  return (
    <div
      id="community"
      className="flex h-full w-full flex-col items-center justify-center gap-2 sm:gap-3 px-3 py-2 sm:px-6"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">
          <Users className="h-3 w-3" />
          <span>{t.community.badge}</span>
        </div>
        <h2
          className="mt-1 font-extrabold text-foreground tracking-tight"
          style={{ fontSize: "clamp(1.2rem, 3.2vw, 1.9rem)" }}
        >
          {t.community.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
          {t.community.subtitle}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-4 flex-1 min-h-0 items-center">
        
        {/* Left Column: Academic Tree */}
        <div className="md:col-span-6 flex flex-col gap-1.5 text-start">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-foreground">
              {t.community.treeTitle}
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
              {t.common.exampleBadge}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {hierarchyNodes.map((node) => {
              const Icon = node.icon;
              const isSelected = selectedLevel === node.level;
              return (
                <div
                  key={node.level}
                  onClick={() => setSelectedLevel(node.level)}
                  className={[
                    "flex items-center gap-2 rounded-xl border p-2 transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/60 bg-card/80 hover:border-primary/40",
                  ].join(" ")}
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide text-primary">
                      {node.tag}
                    </span>
                    <p className="text-xs font-bold text-foreground truncate">
                      {node.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {node.sub}
                    </p>
                  </div>

                  {isSelected && (
                    <span className="text-xs text-primary font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="rounded-xl border border-border/50 bg-muted/30 p-2 text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
            💡 {t.community.peerBenefit}
          </p>
        </div>

        {/* Right Column: Join Challenge Card */}
        <div className="md:col-span-6 flex flex-col justify-center">
          <GenieTrigger
            tipMessage={t.genie.community.tip}
            pose="high"
            side="top"
          >
            <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-3.5 sm:p-4 shadow-lg backdrop-blur-md text-start">
              
              <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  <Zap className="h-3 w-3" />
                  <span>{t.community.joinCard.badge}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5 rtl:space-x-reverse">
                    <span className="h-5 w-5 rounded-full bg-violet-500 text-[9px] text-white font-bold grid place-items-center border border-background">1</span>
                    <span className="h-5 w-5 rounded-full bg-indigo-500 text-[9px] text-white font-bold grid place-items-center border border-background">2</span>
                    <span className="h-5 w-5 rounded-full bg-emerald-500 text-[9px] text-white font-bold grid place-items-center border border-background">3</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {t.community.joinCard.studentsLabel(studentCount)}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-extrabold text-foreground">
                {t.community.joinCard.courseTitle}
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {t.community.joinCard.courseDesc}
              </p>

              <div className="my-2.5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[11px]">
                  {joined
                    ? t.community.joinCard.statusActive
                    : t.community.joinCard.statusOpen}
                </span>
              </div>

              <button
                type="button"
                onClick={handleJoin}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-98 ${
                  joined
                    ? "bg-emerald-600 text-white shadow-emerald-500/20"
                    : "bg-primary text-primary-foreground shadow-glow hover:brightness-110"
                }`}
              >
                {joined ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t.community.joinCard.btnJoined}</span>
                  </>
                ) : (
                  <>
                    <LockOpen className="h-3.5 w-3.5" />
                    <span>{t.community.joinCard.btnJoin}</span>
                  </>
                )}
              </button>
            </div>
          </GenieTrigger>
        </div>

      </div>
    </div>
  );
}
