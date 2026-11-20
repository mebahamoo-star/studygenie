/**
 * ProductShowcasePage.tsx
 * -----------------------
 * Page 5 — Realistic Interactive Product Showcase in Device Frame.
 * 100% translated via `t.*`. No hardcoded strings.
 */
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
} from "motion/react";
import {
  Sparkles,
  Sun,
  Moon,
  LayoutDashboard,
  Calendar,
  HelpCircle,
  Flame,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface ProductShowcasePageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function ProductShowcasePage({ t }: ProductShowcasePageProps) {
  const [deviceTheme, setDeviceTheme] = useState<"light" | "dark">("dark");
  const [activeTab, setActiveTab] = useState<"dashboard" | "plan" | "quiz">("dashboard");
  const [quizSelected, setQuizSelected] = useState<number | null>(null);

  const tabs = [
    { id: "dashboard", label: t.showcase.tabs.dashboard, icon: LayoutDashboard },
    { id: "plan", label: t.showcase.tabs.plan, icon: Calendar },
    { id: "quiz", label: t.showcase.tabs.quiz, icon: HelpCircle },
  ];

  return (
    <div
      id="showcase"
      className="flex min-h-full w-full flex-col items-center justify-center gap-3 sm:gap-4 px-3 py-4 sm:px-6 my-auto"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-[11px] font-bold text-primary">
          <Sparkles className="h-3 w-3" />
          <span>{t.showcase.badge}</span>
        </div>
        <h2
          className="mt-1 font-extrabold text-foreground tracking-tight"
          style={{ fontSize: "clamp(1.2rem, 3.2vw, 1.9rem)" }}
        >
          {t.showcase.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
          {t.showcase.subtitle}
        </p>
      </div>

      {/* Device Frame */}
      <div className="w-full max-w-3xl flex-1 min-h-0 flex flex-col justify-center">
        <GenieTrigger
          tipMessage={t.genie.showcase.tip}
          pose="studying"
          side="top"
        >
          <div className="rounded-2xl border-2 border-border/80 bg-card shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/70 px-3 py-1.5 sm:px-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ms-2 hidden sm:inline text-[10px] font-mono text-muted-foreground">
                  app.studygenie.ai
                </span>
              </div>

              {/* View Screen Tabs */}
              <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded-lg border border-border/40">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dark/Light Switcher */}
              <div className="flex items-center gap-1 border border-border/60 rounded-md p-0.5 bg-background/80">
                <button
                  type="button"
                  onClick={() => setDeviceTheme("light")}
                  title="Light preview"
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    deviceTheme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Sun className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceTheme("dark")}
                  title="Dark preview"
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    deviceTheme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Moon className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Viewport */}
            <div
              className={`p-3 sm:p-4 transition-colors select-none ${
                deviceTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
              }`}
            >
              <AnimatePresence mode="wait">
                
                {/* Screen 1: Dashboard */}
                {activeTab === "dashboard" && (
                  <motion.div
                    key="tab-dashboard"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2 text-start"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold">
                          {t.showcase.dashboardMock.greeting}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          {t.showcase.dashboardMock.nextExam}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-orange-500/15 px-2 py-0.5 text-orange-500 font-bold text-[10px]">
                        <Flame className="h-3.5 w-3.5 fill-current" />
                        <span>{t.showcase.dashboardMock.streakDays(7)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border/40 p-2 bg-card/40">
                        <span className="text-[9px] text-muted-foreground block font-medium">
                          {t.showcase.dashboardMock.progressLabel}
                        </span>
                        <span className="text-sm font-extrabold text-primary font-mono">
                          {t.showcase.dashboardMock.progressValue}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/40 p-2 bg-card/40">
                        <span className="text-[9px] text-muted-foreground block font-medium">
                          {t.showcase.dashboardMock.hoursLabel}
                        </span>
                        <span className="text-sm font-extrabold text-emerald-500 font-mono">
                          {t.showcase.dashboardMock.hoursValue}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/40 p-2 bg-card/40">
                        <span className="text-[9px] text-muted-foreground block font-medium">
                          {t.showcase.dashboardMock.masteredLabel}
                        </span>
                        <span className="text-sm font-extrabold text-violet-500 font-mono">
                          {t.showcase.dashboardMock.masteredValue}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Screen 2: Daily Schedule */}
                {activeTab === "plan" && (
                  <motion.div
                    key="tab-plan"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-1.5 text-start"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{t.showcase.planMock.title}</span>
                      <span className="text-primary text-[10px]">{t.showcase.planMock.remainingSessions(2)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{t.showcase.planMock.item1Title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {t.showcase.planMock.item1Meta}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-2 text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{t.showcase.planMock.item2Title}</span>
                        </div>
                        <span className="text-[10px] text-primary font-mono">
                          {t.showcase.planMock.item2Meta}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Screen 3: Active Quiz */}
                {activeTab === "quiz" && (
                  <motion.div
                    key="tab-quiz"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2 text-start"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{t.showcase.quizMock.questionNumber}</span>
                      <span className="text-amber-500 text-[10px] font-mono">{t.showcase.quizMock.pointsBadge}</span>
                    </div>

                    <p className="text-xs font-semibold">
                      {t.showcase.quizMock.questionText}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      {t.showcase.quizMock.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setQuizSelected(opt.id)}
                          className={`p-2 rounded-lg border text-[11px] font-bold transition-all text-start cursor-pointer ${
                            quizSelected === opt.id
                              ? opt.correct
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-400"
                              : "border-border/60 hover:border-primary/40"
                          }`}
                        >
                          {opt.text}
                          {quizSelected === opt.id && (opt.correct ? " ✓" : " ✗")}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Bottom frame footer */}
            <div className="border-t border-border/40 bg-muted/40 px-3 py-1 text-center text-[10px] text-muted-foreground font-semibold">
              {t.showcase.footerNote}
            </div>

          </div>
        </GenieTrigger>
      </div>
    </div>
  );
}
