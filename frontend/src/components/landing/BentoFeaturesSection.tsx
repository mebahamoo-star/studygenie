import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarCheck,
  Layers,
  Trophy,
  Clock,
  Flame,
  ShieldAlert,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { LandingTranslations } from "./i18n/types";

interface BentoFeaturesProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function BentoFeaturesSection({ t }: BentoFeaturesProps) {
  const shouldReduceMotion = useReducedMotion();

  const bentoItems = [
    {
      ...t.bento.smartPlan,
      icon: CalendarCheck,
      gridSpan: "md:col-span-2",
      gradient: "from-indigo-600 to-purple-600",
      accentBorder: "hover:border-indigo-500/50",
    },
    {
      ...t.bento.flashcards,
      icon: Layers,
      gridSpan: "md:col-span-1",
      gradient: "from-amber-500 to-orange-500",
      accentBorder: "hover:border-amber-500/50",
    },
    {
      ...t.bento.streak,
      icon: Flame,
      gridSpan: "md:col-span-1",
      gradient: "from-orange-500 to-red-500",
      accentBorder: "hover:border-orange-500/50",
    },
    {
      ...t.bento.survivalMode,
      icon: ShieldAlert,
      gridSpan: "md:col-span-2",
      gradient: "from-rose-500 to-pink-600",
      accentBorder: "hover:border-rose-500/50",
    },
    {
      ...t.bento.leaderboard,
      icon: Trophy,
      gridSpan: "md:col-span-1",
      gradient: "from-emerald-500 to-teal-600",
      accentBorder: "hover:border-emerald-500/50",
    },
    {
      ...t.bento.pomodoro,
      icon: Clock,
      gridSpan: "md:col-span-1",
      gradient: "from-sky-500 to-blue-600",
      accentBorder: "hover:border-sky-500/50",
    },
    {
      ...t.bento.quizzes,
      icon: HelpCircle,
      gridSpan: "md:col-span-1",
      gradient: "from-violet-500 to-indigo-600",
      accentBorder: "hover:border-violet-500/50",
    },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{t.bento.badge}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-display">
          {t.bento.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t.bento.subtitle}
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {bentoItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className={`group relative rounded-3xl border border-border/80 bg-card/85 p-6 backdrop-blur-md shadow-soft transition-all duration-300 hover:shadow-glow/15 hover:-translate-y-1 text-start flex flex-col justify-between ${item.gridSpan} ${item.accentBorder}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-sm transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>

                {/* Exactly one concise line per feature as required */}
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>تعلّم المزيد</span>
                <span className="rtl:rotate-180">&rarr;</span>
              </div>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}
