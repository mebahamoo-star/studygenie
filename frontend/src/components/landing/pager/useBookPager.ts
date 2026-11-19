/**
 * useBookPager
 * -----------
 * Core hook powering the "book pages" navigation experience.
 * Manages: current page index, transition direction, keyboard,
 * wheel (debounced), touch swipe, URL hash deep-linking, and
 * aria-live announcements.
 */
import { useState, useCallback, useEffect, useRef } from "react";

export type Direction = "forward" | "backward";

export interface UseBookPagerReturn {
  index: number;
  direction: Direction;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  total: number;
  isTransitioning: boolean;
}

/** Canonical hash for each active presentation page */
export const PAGE_HASHES = [
  "#hero",
  "#how",
  "#community",
  "#features",
  "#showcase",
  "#psychology",
  "#faq",
  "#cta",
] as const;

/** Alias mappings for flexible deep-links */
const HASH_ALIASES: Record<string, string> = {
  "#how-it-works": "#how",
  "#bento": "#features",
  "#services": "#features",
  "#streak": "#features",
  "#flashcards": "#features",
  "#stats": "#how",
};

function hashToIndex(rawHash: string, total: number): number {
  const normalized = HASH_ALIASES[rawHash.toLowerCase()] ?? rawHash.toLowerCase();
  const i = (PAGE_HASHES as readonly string[]).indexOf(normalized as any);
  if (i >= 0 && i < total) return i;
  return 0;
}

export function useBookPager(total: number, isRTL: boolean): UseBookPagerReturn {
  const [index, setIndex] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return hashToIndex(window.location.hash, total);
  });
  const [direction, setDirection] = useState<Direction>("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Transition lock — prevents double-fire during animation (300–450 ms).
  const lockRef = useRef(false);
  const LOCK_MS = 400;

  const goTo = useCallback(
    (i: number) => {
      if (lockRef.current) return;
      if (i < 0 || i >= total) return;
      if (typeof window !== "undefined") {
        setDirection(i > index ? "forward" : "backward");
        setIndex(i);
        window.history.replaceState(null, "", PAGE_HASHES[i] ?? "#hero");

        // Announce page change for screen readers
        const announcer = document.getElementById("sg-page-announcer");
        if (announcer) {
          const heading = document
            .querySelector(`[data-page-index="${i}"] h2, [data-page-index="${i}"] h1`)
            ?.textContent;
          announcer.textContent = heading ?? "";
        }

        lockRef.current = true;
        setIsTransitioning(true);
        setTimeout(() => {
          lockRef.current = false;
          setIsTransitioning(false);
        }, LOCK_MS);
      }
    },
    [index, total],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName ?? "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      // In RTL the "forward" arrow key is ← (ArrowLeft); in LTR it's →.
      const fwdKey = isRTL ? "ArrowLeft" : "ArrowRight";
      const bwdKey = isRTL ? "ArrowRight" : "ArrowLeft";

      switch (e.key) {
        case fwdKey:
        case "Enter":
          e.preventDefault();
          next();
          break;
        case bwdKey:
          e.preventDefault();
          prev();
          break;
        case " ":
          if (e.target === document.body) {
            e.preventDefault();
            next();
          }
          break;
        case "Escape":
          goTo(0);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, goTo, isRTL]);

  // ── Mouse wheel (debounced) ──────────────────────────────────────────────
  useEffect(() => {
    let lastTime = 0;
    const DEBOUNCE = 750; // ms — smooth trackpad debounce

    const handler = (e: WheelEvent) => {
      // Don't intercept wheel if inside an internally scrollable element
      const target = e.target as HTMLElement | null;
      if (target && target.scrollHeight > target.clientHeight) {
        return;
      }

      e.preventDefault();
      const now = Date.now();
      if (now - lastTime < DEBOUNCE) return;
      lastTime = now;
      if (e.deltaY > 25) next();
      else if (e.deltaY < -25) prev();
    };

    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, [next, prev]);

  // ── Touch swipe ─────────────────────────────────────────────────────────
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      // Ignore mostly-vertical swipes
      if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
      if (Math.abs(dx) < 40) return;

      // RTL: swipe right → next; LTR: swipe left → next
      if (isRTL ? dx > 0 : dx < 0) next();
      else prev();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [next, prev, isRTL]);

  // ── Browser Back / Forward (hash change) ────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const i = hashToIndex(window.location.hash, total);
      if (i !== index) {
        setDirection(i > index ? "forward" : "backward");
        setIndex(i);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [index, total]);

  return { index, direction, next, prev, goTo, total, isTransitioning };
}
