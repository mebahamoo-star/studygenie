import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Brain, Flame, Clock, ShieldAlert, Sparkles, BookOpen } from "lucide-react";
import { LandingTranslations } from "./i18n/types";

interface PsychologyProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function PsychologySection({ t }: PsychologyProps) {
  const shouldReduceMotion = useReducedMotion();

  const principles = [
    {
      ...t.psychology.lossAversion,
      icon: Flame,
      gradient: "from-orange-500 to-red-500",
      pillBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50",
    },
    {
      ...t.psychology.spacingEffect,
      icon: Clock,
      gradient: "from-blue-500 to-indigo-600",
      pillBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50",
    },
    {
      ...t.psychology.yerkesDodson,
      icon: ShieldAlert,
      gradient: "from-purple-500 to-pink-600",
      pillBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50",
    },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span>{t.psychology.badge}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-display">
          {t.psychology.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t.psychology.subtitle}
        </p>
      </div>

      {/* 3 Psychological Principles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {principles.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.scientificPrinciple}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card/85 p-6 md:p-8 backdrop-blur-md shadow-soft hover:shadow-glow/15 transition-all text-start"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-md`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.pillBg}`}>
                    {item.featureName}
                  </span>
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  المبدأ العلمي &middot; Scientific Law
                </span>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  {item.scientificPrinciple}
                </h3>

                <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.explanation}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>مدمج تلقائيًا في StudyGenie</span>
              </div>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}
