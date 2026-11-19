import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Sparkles, Sun, Moon, Calendar, Layers, Trophy, CheckCircle2, Zap } from "lucide-react";
import { LandingTranslations } from "./i18n/types";

interface ProductShowcaseProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function ProductShowcaseSection({ t, lang }: ProductShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{t.showcase.badge}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-display">
          {t.showcase.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t.showcase.subtitle}
        </p>

        {/* Device Theme Switcher (Light / Dark) */}
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setPreviewTheme("light")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              previewTheme === "light"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Light Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTheme("dark")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              previewTheme === "dark"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* Embla Carousel in Device Frame */}
      <div className="relative mx-auto max-w-4xl px-2">
        <Carousel
          opts={{
            loop: true,
            direction: lang === "ar" ? "rtl" : "ltr",
          }}
          className="w-full"
        >
          <CarouselContent>
            {t.showcase.slides.map((slide) => (
              <CarouselItem key={slide.id}>
                <div
                  className={`rounded-3xl border border-border/90 p-5 md:p-8 shadow-2xl transition-colors duration-300 text-start ${
                    previewTheme === "dark"
                      ? "bg-slate-900 text-slate-100"
                      : "bg-white text-slate-800"
                  }`}
                >
                  {/* Laptop / Tablet Header Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {slide.badge}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">studygenie.app</span>
                  </div>

                  {/* Slide Content Preview */}
                  <div className="space-y-4 min-h-[280px] sm:min-h-[320px] flex flex-col justify-between">
                    
                    {/* Simulated Screen Body */}
                    {slide.previewType === "dashboard" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 rounded-2xl bg-gradient-magic text-white">
                            <span className="text-[11px] opacity-80">Current Streak</span>
                            <div className="text-2xl font-black mt-1">14 Days 🔥</div>
                            <span className="text-[10px] opacity-90">+350 XP earned today</span>
                          </div>
                          <div className={`p-3.5 rounded-2xl border ${previewTheme === "dark" ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <span className="text-[11px] text-muted-foreground">Today's Goal</span>
                            <div className="text-xl font-bold mt-1 text-primary">3 / 4 Milestones</div>
                            <span className="text-[10px] text-emerald-600 font-bold">75% Complete</span>
                          </div>
                          <div className={`p-3.5 rounded-2xl border ${previewTheme === "dark" ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <span className="text-[11px] text-muted-foreground">Campus Rank</span>
                            <div className="text-xl font-bold mt-1 text-amber-500">#4 in College</div>
                            <span className="text-[10px] text-muted-foreground">Top 2% this week</span>
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border ${previewTheme === "dark" ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <h5 className="text-xs font-bold text-foreground mb-2">Upcoming Exam: Algorithms Final</h5>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full w-[82%]" />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Target: May 12</span>
                            <span className="font-bold text-primary">82% Readiness Score</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {slide.previewType === "plan" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                          <span className="text-xs font-bold text-primary">Week 8 Daily Plan</span>
                          <span className="text-[11px] text-muted-foreground">Auto-synced with syllabus</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${previewTheme === "dark" ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Monday: Read Ch 6 Dynamic Programming (18 pgs)</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600">Done</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${previewTheme === "dark" ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                            <span>Tuesday: Memoization Practice & 10 Quiz Questions</span>
                          </div>
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">In Progress</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex items-center justify-between opacity-60 ${previewTheme === "dark" ? "bg-slate-800/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>Wednesday: Review Buffer Day (Exam Warmup)</span>
                          </div>
                          <span className="text-[10px]">Upcoming</span>
                        </div>
                      </div>
                    )}

                    {slide.previewType === "quiz" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary">Active Recall Deck: Chapter 5</span>
                          <span className="text-muted-foreground">Card 7 of 24</span>
                        </div>
                        <div className={`p-6 rounded-2xl border text-center ${previewTheme === "dark" ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Flashcard Question</span>
                          <h5 className="mt-2 text-sm sm:text-base font-bold text-foreground">
                            What is the worst-case time complexity of Dijkstra’s Algorithm with a min-priority queue?
                          </h5>
                          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-xl border border-primary/20">
                            <span>O((V + E) log V) — Tap to flip</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Slide Caption Bottom Bar */}
                    <div className="pt-3 border-t border-border/50">
                      <h4 className="text-base font-bold text-foreground">{slide.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{slide.caption}</p>
                    </div>

                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex items-center justify-end gap-2 mt-4">
            <CarouselPrevious className="static translate-y-0 h-9 w-9 rounded-xl border border-border" />
            <CarouselNext className="static translate-y-0 h-9 w-9 rounded-xl border border-border" />
          </div>
        </Carousel>
      </div>

    </section>
  );
}
