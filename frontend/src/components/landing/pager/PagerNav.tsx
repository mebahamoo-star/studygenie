/**
 * PagerNav.tsx
 * ------------
 * Fixed bottom navigation bar for BookPager.
 * Contains:
 *  - Back button (RTL-aware)
 *  - Interactive progress indicator (clickable dots + "N / Total")
 *  - Next/Finish button (RTL-aware)
 *  - Fixed sound mute toggle button (top-corner)
 *  - Fixed Genie tips enable/disable toggle button (top-corner)
 *  - All touch targets >= 44px
 */
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles, EyeOff } from "lucide-react";
import { PAGE_HASHES } from "./useBookPager";
import type { UseSoundReturn } from "../sound/useSound";
import { useGenie } from "../genie/genie-context";

interface PagerNavProps {
  index: number;
  total: number;
  isRTL: boolean;
  isTransitioning: boolean;
  sound: UseSoundReturn;
  labels: {
    next: string;
    back: string;
    start: string;
    finish: string;
    mute: string;
    unmute: string;
    toggleGenie: string;
    genieLabel: string;
    pageOf: (current: number, total: number) => string;
  };
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (i: number) => void;
}

export function PagerNav({
  index,
  total,
  isRTL,
  isTransitioning,
  sound,
  labels,
  onNext,
  onPrev,
  onGoTo,
}: PagerNavProps) {
  const { enabled: genieEnabled, toggleEnabled: toggleGenie } = useGenie();
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Forward chevron respects RTL automatically
  const FwdIcon = isRTL ? ChevronLeft : ChevronRight;
  const BwdIcon = isRTL ? ChevronRight : ChevronLeft;

  const handleNext = () => {
    if (isTransitioning) return;
    sound.playForward();
    onNext();
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    sound.playBackward();
    onPrev();
  };

  return (
    <>
      {/* Hidden live region for screen reader announcements */}
      <div
        id="sg-page-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Bottom navigation bar */}
      <nav
        aria-label={isRTL ? "التنقل بين صفحات العرض" : "Presentation page navigation"}
        className={[
          "shrink-0 min-h-14 sm:min-h-16 w-full z-40",
          "flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-6 sm:py-2.5",
          "border-t border-border/40 bg-background/95 backdrop-blur-md",
          "pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] select-none",
        ].join(" ")}
      >
        {/* Back button */}
        <AnimatePresence mode="wait">
          {!isFirst ? (
            <motion.button
              key="back-btn"
              type="button"
              onClick={handlePrev}
              disabled={isTransitioning}
              aria-label={labels.back}
              initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={[
                "flex h-10 sm:h-11 min-w-[44px] items-center gap-1.5 rounded-xl border border-border/60",
                "bg-card px-3 text-xs sm:text-sm font-semibold text-foreground transition-colors cursor-pointer",
                "hover:bg-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary",
              ].join(" ")}
            >
              <BwdIcon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{labels.back}</span>
            </motion.button>
          ) : (
            <div key="back-placeholder" className="h-10 w-10 sm:h-11 sm:w-11" />
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        <div className="flex flex-col items-center gap-1">
          {/* Dots row */}
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label={isRTL ? "الصفحات" : "Pages"}
          >
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Page ${i + 1}`}
                onClick={() => onGoTo(i)}
                disabled={isTransitioning}
                className="group flex h-5 w-5 items-center justify-center focus-visible:outline-2 focus-visible:outline-primary rounded-full cursor-pointer"
              >
                <motion.span
                  animate={{
                    width: i === index ? "22px" : "6px",
                    backgroundColor:
                      i === index
                        ? "hsl(var(--primary))"
                        : "hsl(var(--border))",
                  }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="block h-1.5 rounded-full"
                />
              </button>
            ))}
          </div>

          {/* Numeric counter & Genie tips toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] tabular-nums font-bold text-muted-foreground">
              {labels.pageOf(index + 1, total)}
            </span>
            <button
              type="button"
              onClick={toggleGenie}
              title={labels.toggleGenie}
              aria-label={labels.toggleGenie}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold transition-all cursor-pointer ${
                genieEnabled
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "bg-muted text-muted-foreground/60 border border-border/40"
              }`}
            >
              {genieEnabled ? (
                <Sparkles className="h-2.5 w-2.5" />
              ) : (
                <EyeOff className="h-2.5 w-2.5" />
              )}
              <span>{labels.genieLabel}</span>
            </button>
          </div>
        </div>

        {/* Next / Finish button */}
        <motion.button
          type="button"
          onClick={handleNext}
          disabled={isLast || isTransitioning}
          aria-label={isLast ? labels.finish : labels.next}
          whileTap={isLast ? {} : { scale: 0.96 }}
          className={[
            "flex h-10 sm:h-11 min-w-[44px] items-center gap-1.5 rounded-xl px-4 text-xs sm:text-sm font-bold cursor-pointer",
            "transition-all focus-visible:outline-2 focus-visible:outline-primary",
            isLast
              ? "border border-border/40 bg-card text-muted-foreground cursor-default"
              : "bg-primary text-primary-foreground shadow-glow hover:brightness-110 disabled:opacity-40",
          ].join(" ")}
        >
          <span>{isLast ? labels.finish : labels.next}</span>
          {!isLast && <FwdIcon className="h-4 w-4 shrink-0" />}
        </motion.button>
      </nav>
    </>
  );
}
