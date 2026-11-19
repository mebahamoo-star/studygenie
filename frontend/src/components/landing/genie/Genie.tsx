/**
 * Genie.tsx
 * ---------
 * The StudyGenie companion overlay.
 * Uses the authentic turban/beard/tail Genie mascot from @/components/Genie.
 *
 * Behavior:
 * - Listens to `activeTip` from GenieContext.
 * - Positions itself adaptively near the hovered/tapped element.
 * - Speech bubble flips orientation automatically near edges or according to RTL.
 * - Disappears on hover out (desktop) or after 4.5s / tap outside (mobile).
 * - `aria-hidden="true"` so screen readers aren't interrupted by decorative animations.
 */
import React, { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Genie as MascotSvg } from "@/components/Genie";
import { useGenie } from "./genie-context";

interface GenieProps {
  lang?: "ar" | "en";
  dismissLabel?: string;
}

export function Genie({ lang = "ar", dismissLabel }: GenieProps) {
  const { enabled, activeTip, hideTip } = useGenie();
  const shouldReduce = useReducedMotion();
  const isRTL = lang === "ar";
  const defaultDismiss = isRTL ? "اضغط للإغلاق" : "Tap to dismiss";

  // Calculate position coordinates relative to viewport
  const positionStyles = useMemo(() => {
    if (!activeTip?.anchorRect) {
      // Default corner position when not anchored to a specific rect
      return {
        bottom: 76,
        [isRTL ? "right" : "left"]: 24,
      };
    }

    const rect = activeTip.anchorRect;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;

    // Preferred side calculation with boundary collision avoidance
    const side = activeTip.side ?? "auto";

    let top: number | undefined;
    let bottom: number | undefined;
    let left: number | undefined;
    let right: number | undefined;

    // Check vertical space
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    if (side === "bottom" || (side === "auto" && spaceBelow > 180)) {
      top = Math.min(rect.bottom + 12, viewportHeight - 160);
    } else {
      bottom = Math.max(viewportHeight - rect.top + 12, 80);
    }

    // Check horizontal center/offset
    const elementCenter = rect.left + rect.width / 2;
    if (elementCenter < viewportWidth / 2) {
      // Closer to left
      left = Math.max(16, rect.left);
    } else {
      // Closer to right
      right = Math.max(16, viewportWidth - rect.right);
    }

    return { top, bottom, left, right };
  }, [activeTip, isRTL]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {activeTip && (
        <motion.div
          key="genie-companion"
          aria-hidden="true"
          onClick={hideTip}
          style={positionStyles}
          initial={
            shouldReduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.8, y: 12 }
          }
          animate={
            shouldReduce
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            shouldReduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.85, y: 8 }
          }
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={[
            "fixed z-50 flex items-end gap-2.5 pointer-events-auto select-none cursor-pointer",
            "max-w-[280px] sm:max-w-[340px]",
            isRTL ? "flex-row-reverse" : "flex-row",
          ].join(" ")}
        >
          {/* Mascot SVG Character */}
          <motion.div
            animate={
              shouldReduce
                ? {}
                : {
                    y: [0, -6, 0],
                    rotate: [0, 2, -1, 0],
                  }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="shrink-0 drop-shadow-xl"
          >
            <MascotSvg
              pose={activeTip.pose ?? "studying"}
              className="h-16 w-16 sm:h-20 sm:w-20"
            />
          </motion.div>

          {/* Speech Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={[
              "relative rounded-2xl border border-primary/25 bg-background/95 p-3 text-xs sm:text-sm font-semibold text-foreground shadow-2xl backdrop-blur-md",
              "leading-snug max-w-[220px] sm:max-w-[260px]",
              isRTL ? "rounded-br-xs text-right" : "rounded-bl-xs text-left",
            ].join(" ")}
          >
            <p className="text-foreground font-medium">{activeTip.message}</p>
            <span className="block mt-1 text-[10px] text-muted-foreground/80 font-normal">
              {dismissLabel ?? defaultDismiss}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Helper wrapper for any element that wants to trigger the Genie on hover/tap */
interface GenieTriggerProps {
  tipMessage: string;
  pose?: "idle" | "high" | "studying" | "low";
  side?: "top" | "bottom" | "start" | "end" | "auto";
  children: React.ReactNode;
  className?: string;
}

export function GenieTrigger({
  tipMessage,
  pose = "studying",
  side = "auto",
  children,
  className = "",
}: GenieTriggerProps) {
  const { showTip, hideTip } = useGenie();

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    showTip({
      message: tipMessage,
      pose,
      side,
      anchorRect: rect,
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    showTip({
      message: tipMessage,
      pose,
      side,
      anchorRect: rect,
    });
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={hideTip}
      onClick={handleClick}
      className={className}
    >
      {children}
    </div>
  );
}
