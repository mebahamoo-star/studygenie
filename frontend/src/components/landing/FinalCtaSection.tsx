import React from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "./Mascot";
import { LandingTranslations } from "./i18n/types";

interface FinalCtaProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function FinalCtaSection({ t }: FinalCtaProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative z-10 mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-indigo-500/10 via-purple-500/15 to-blue-500/10 p-8 sm:p-12 md:p-16 text-center backdrop-blur-xl shadow-glow/10"
      >
        {/* Ambient background glows */}
        <div className="absolute -top-20 -start-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -end-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          
          {/* Mascot in Final CTA */}
          <div className="mb-6">
            <Mascot size="md" />
          </div>

          {/* Single-Sentence Headline */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-display leading-[1.25]">
            {t.finalCta.title}
          </h2>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
            {t.finalCta.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 w-full sm:w-auto">
            <Button
              variant="magic"
              size="lg"
              asChild
              className="h-12 rounded-2xl px-8 text-base font-bold shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Link to="/signup">
                <span>{t.finalCta.ctaButton}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="h-12 rounded-2xl px-6 text-sm font-semibold border-border/80 bg-card/80 hover:bg-accent text-foreground hover:text-accent-foreground backdrop-blur-sm transition-all w-full sm:w-auto"
            >
              <Link to="/login">{t.finalCta.loginButton}</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t.finalCta.guarantee }} />
          </p>

        </div>
      </motion.div>
    </section>
  );
}
