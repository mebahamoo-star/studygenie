import React from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles, CheckCircle2, Play, Calendar, Zap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "./Mascot";
import { LandingTranslations } from "./i18n/types";

interface HeroSectionProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function HeroSection({ t, lang }: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const isRtl = lang === "ar";

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
    }
  };

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 md:pt-12 md:pb-24 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        
        {/* Left Column: Hero Copy & Actions (7 Cols) */}
        <div className="lg:col-span-7 text-start flex flex-col items-start">
          
          {/* Badge & Mascot Anchor */}
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary backdrop-blur-md shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{t.hero.badge}</span>
            </motion.div>

            {/* Mascot in Hero Header */}
            <Mascot size="sm" className="hidden sm:flex" />
          </div>

          {/* Single-Sentence Title */}
          <motion.h1
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.18] text-foreground font-display"
          >
            {t.hero.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl"
          >
            {t.hero.subtitle}
          </motion.p>

          {/* Actions: Primary & Secondary CTA */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3.5 w-full sm:w-auto"
          >
            <Button
              variant="magic"
              size="lg"
              className="h-12 rounded-2xl px-7 text-base font-bold shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              asChild
            >
              <Link to="/signup">
                <span>{t.hero.primaryCta}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleScrollToHowItWorks}
              className="h-12 rounded-2xl px-6 text-sm font-semibold border-border/80 bg-card/75 hover:bg-accent text-foreground hover:text-accent-foreground backdrop-blur-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Play className="h-4 w-4 fill-primary/20 text-primary" />
              <span>{t.hero.secondaryCta}</span>
            </Button>
          </motion.div>

          {/* Micro-copy Guarantee */}
          <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t.hero.microCopy }} />
          </p>

        </div>

        {/* Right Column: App Mockup Frame (5 Cols) */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative w-full max-w-md"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-blue-500/20 blur-2xl -z-10" />

            {/* Device Mockup Frame */}
            <div className="relative rounded-3xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
              
              {/* Frame Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <span>{t.hero.mockupLabel}</span>
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Mockup UI Placeholder Content (Crisp SVG / HTML App Preview) */}
              <div className="space-y-3.5 text-start">
                
                {/* Simulated Upper Exam / Course Banner */}
                <div className="rounded-2xl bg-gradient-magic p-4 text-white shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold opacity-90">{t.hero.liveBadge}</span>
                    <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                      Streak: 12 🔥
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-bold">Data Structures & Algorithms</h4>
                  <div className="mt-2.5 flex items-center justify-between text-xs opacity-90">
                    <span>Midterm: in 9 days</span>
                    <span className="font-bold">68% Ready</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full w-[68%]" />
                  </div>
                </div>

                {/* Simulated Today's Checklist */}
                <div className="rounded-2xl border border-border/70 bg-background/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{isRtl ? "خطة اليوم" : "Today's Study Plan"}</span>
                    </span>
                    <span className="text-primary font-bold">2 / 3 {isRtl ? "مكتمل" : "done"}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="line-through text-muted-foreground">Chapter 4: Binary Trees</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold">+50 XP</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-primary/30 shadow-xs">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
                        <span>Chapter 5: Graph Traversal</span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        25 min
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/30 opacity-75">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Layers className="h-4 w-4" />
                        <span>15 Spaced Flashcards</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Quiz</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
