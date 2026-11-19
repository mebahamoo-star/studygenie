import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { UploadCloud, Cpu, CalendarCheck, Sparkles, ArrowRight, FileText } from "lucide-react";
import { LandingTranslations } from "./i18n/types";

interface HowItWorksProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function HowItWorksSection({ t }: HowItWorksProps) {
  const shouldReduceMotion = useReducedMotion();

  const steps = [
    {
      ...t.howItWorks.step1,
      icon: UploadCloud,
      gradient: "from-blue-500 to-indigo-600",
      accentBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50",
    },
    {
      ...t.howItWorks.step2,
      icon: Cpu,
      gradient: "from-purple-500 to-indigo-600",
      accentBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50",
    },
    {
      ...t.howItWorks.step3,
      icon: CalendarCheck,
      gradient: "from-indigo-600 to-teal-500",
      accentBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50",
    },
  ];

  return (
    <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{t.howItWorks.badge}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-display">
          {t.howItWorks.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t.howItWorks.subtitle}
        </p>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 relative">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.step}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative flex flex-col justify-between rounded-3xl border border-border/70 bg-card/80 p-6 md:p-8 backdrop-blur-md shadow-soft hover:border-primary/50 hover:shadow-glow/15 transition-all duration-300 text-start"
            >
              <div>
                {/* Step Top Bar: Number + Tag */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-3xl font-black text-muted-foreground/30 font-display">
                    {item.step}
                  </span>
                </div>

                <div className="inline-block mb-3">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${item.accentBg}`}>
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Bottom Subtle Indicator */}
              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary/80 group-hover:text-primary">
                <span>{item.step === "03" ? "جاهز للاستخدام" : "المرحلة التالية"}</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </div>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}
