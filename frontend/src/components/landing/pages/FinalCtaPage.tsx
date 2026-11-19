/**
 * FinalCtaPage.tsx
 * ----------------
 * Page 8 — Final Call-To-Action & Celebration.
 *
 * Requirements:
 *  - Fits 100dvh without scroll on 360×640 and desktop.
 *  - Celebratory Genie mascot companion.
 *  - High-impact headline & student-friendly value proposition.
 *  - Primary CTA button + Secondary Login action.
 *  - 100% translated via `t.finalCta.*`.
 */
import React from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Genie as MascotSvg } from "@/components/Genie";
import { GenieTrigger } from "../genie/Genie";
import type { LandingTranslations } from "../i18n/types";

interface FinalCtaPageProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function FinalCtaPage({ t, lang }: FinalCtaPageProps) {
  const isRTL = lang === "ar";
  const shouldReduce = useReducedMotion();
  const FwdArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      id="cta"
      className="flex h-full w-full flex-col items-center justify-center gap-3 sm:gap-5 px-3 py-3 sm:px-6 text-center select-none"
    >
      {/* Celebratory Mascot & Badge */}
      <div className="flex flex-col items-center gap-2">
        <GenieTrigger
          tipMessage={t.genie.cta.celebrate}
          pose="high"
          side="top"
        >
          <motion.div
            animate={
              shouldReduce
                ? {}
                : {
                    y: [0, -8, 0],
                    rotate: [0, 3, -3, 0],
                  }
            }
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="cursor-pointer drop-shadow-2xl"
          >
            <MascotSvg pose="high" className="h-20 w-20 sm:h-28 sm:w-28" />
          </motion.div>
        </GenieTrigger>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t.finalCta.badge}</span>
        </span>
      </div>

      {/* Main Copy */}
      <div className="max-w-xl mx-auto space-y-2">
        <h2
          className="text-balance font-extrabold leading-tight tracking-tight text-foreground"
          style={{ fontSize: "clamp(1.4rem, 4vw, 2.3rem)" }}
        >
          {t.finalCta.title}
        </h2>
        <p
          className="text-muted-foreground leading-relaxed font-medium"
          style={{ fontSize: "clamp(0.85rem, 2vw, 1.05rem)" }}
        >
          {t.finalCta.subtitle}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <Button
          variant="magic"
          size="default"
          asChild
          className="h-11 px-6 text-sm font-bold shadow-glow gap-2"
        >
          <Link to="/signup">
            <span>{t.finalCta.primaryCta}</span>
            <FwdArrow className="h-4 w-4" />
          </Link>
        </Button>

        <Button
          variant="outline"
          size="default"
          asChild
          className="h-11 px-5 text-sm font-semibold border-border/80 bg-card hover:bg-accent"
        >
          <Link to="/login">
            <span>{t.finalCta.secondaryCta}</span>
          </Link>
        </Button>
      </div>

      {/* Guarantee & Features Pill */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] text-muted-foreground">
        <span
          className="flex items-center gap-1 font-semibold"
          dangerouslySetInnerHTML={{ __html: t.finalCta.guarantee }}
        />
        <span>·</span>
        <span className="font-semibold">{t.common.exampleBadge}</span>
      </div>
    </div>
  );
}
