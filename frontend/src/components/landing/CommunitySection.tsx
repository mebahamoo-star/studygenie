import React from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Users, GraduationCap, Building2, BookOpen, Sparkles, Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingTranslations } from "./i18n/types";

interface CommunityProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function CommunitySection({ t, lang }: CommunityProps) {
  const shouldReduceMotion = useReducedMotion();
  const isRtl = lang === "ar";

  const hierarchy = [
    {
      level: "1",
      label: t.community.flow.uni,
      icon: GraduationCap,
      example: isRtl ? "جامعة الملك سعود / KSU" : "King Saud University",
    },
    {
      level: "2",
      label: t.community.flow.college,
      icon: Building2,
      example: isRtl ? "كلية علوم الحاسب والمعلومات" : "College of Computer Science",
    },
    {
      level: "3",
      label: t.community.flow.course,
      icon: BookOpen,
      example: isRtl ? "CS210 — هياكل البيانات" : "CS210 — Data Structures",
    },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>{t.community.badge}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-display">
          {t.community.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t.community.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Hierarchy steps (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {hierarchy.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.level}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: isRtl ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.1 }}
                className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-xs backdrop-blur-md text-start"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {item.label}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {item.example}
                  </p>
                </div>
                <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center text-xs shrink-0 font-bold">
                  ✓
                </div>
              </motion.div>
            );
          })}

          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed text-start">
            💡 {t.community.peerBenefit}
          </div>
        </div>

        {/* Right: Join Challenge Card Showcase (7 Cols) */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-7 rounded-3xl border border-indigo-200/60 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-6 md:p-8 backdrop-blur-xl shadow-soft text-start relative overflow-hidden"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-12 -end-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/60 dark:border-indigo-700/60 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-xs">
              <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{t.community.joinChallenge.instantLabel}</span>
            </span>

            <span className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-bold">
              {t.community.joinChallenge.badge}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-foreground font-display">
            {t.community.joinChallenge.title}
          </h3>

          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {t.community.joinChallenge.desc}
          </p>

          {/* Interactive Mock Action */}
          <div className="mt-6 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                <span className="inline-block h-8 w-8 rounded-full bg-blue-500 ring-2 ring-card text-white text-xs font-bold grid place-items-center">س</span>
                <span className="inline-block h-8 w-8 rounded-full bg-purple-500 ring-2 ring-card text-white text-xs font-bold grid place-items-center">م</span>
                <span className="inline-block h-8 w-8 rounded-full bg-indigo-500 ring-2 ring-card text-white text-xs font-bold grid place-items-center">ف</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {isRtl ? "28 طالب من شعبتك انضموا للتحدي" : "28 students from your section joined"}
              </span>
            </div>

            <Button
              variant="magic"
              size="sm"
              asChild
              className="h-10 rounded-xl px-5 text-xs font-bold shadow-glow"
            >
              <Link to="/signup">
                <span>{t.community.joinChallenge.actionText}</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 ms-1" />
              </Link>
            </Button>
          </div>

        </motion.div>

      </div>
    </section>
  );
}
