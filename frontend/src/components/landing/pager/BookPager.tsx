/**
 * BookPager.tsx
 * -------------
 * Root container for the full-screen "book pages" experience.
 *
 * Layout contract:
 *   - Each page fills 100dvh (minus bottom navigation bar).
 *   - AnimatePresence tracks ONLY the currently active page.
 *   - Zero stuck opacity or cancelled animations.
 *   - Focus moved to new page heading on transition.
 *   - GenieProvider wraps the presentation so hover/tap triggers work seamlessly.
 */
import React, {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import { useBookPager } from "./useBookPager";
import { PagerNav } from "./PagerNav";
import { useSound } from "../sound/useSound";
import { Genie } from "../genie/Genie";
import { GenieProvider } from "../genie/genie-context";
import type { LandingTranslations } from "../i18n/types";

export interface PageConfig {
  id: string;
  node: ReactNode;
  seoTitle?: string;
}

interface BookPagerProps {
  pages: PageConfig[];
  lang: "ar" | "en";
  t: LandingTranslations;
}

const NAV_HEIGHT = 58; // px

export function BookPager({ pages, lang, t }: BookPagerProps) {
  const isRTL = lang === "ar";
  const shouldReduce = useReducedMotion();
  const total = pages.length;
  const pager = useBookPager(total, isRTL);
  const sound = useSound();
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Focus management: move focus to the new page's heading on transition
  useEffect(() => {
    const timer = setTimeout(() => {
      const heading = pageContainerRef.current?.querySelector<HTMLElement>("h1, h2");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [pager.index]);

  const navLabels = {
    next: t.pager.next,
    back: t.pager.back,
    start: t.hero.primaryCta,
    finish: t.pager.finish,
    mute: t.nav.muteSound,
    unmute: t.nav.unmuteSound,
    toggleGenie: t.nav.toggleGenie,
    genieLabel: t.nav.genieLabel,
    pageOf: t.pager.pageOf,
  };

  // Slide variants — direction-aware + RTL-aware
  const variants: Variants = {
    enter: (direction: "forward" | "backward") => {
      if (shouldReduce) return { opacity: 0 };
      const isForward = direction === "forward";
      const enterX = isRTL
        ? isForward ? "-60%" : "60%"
        : isForward ? "60%" : "-60%";
      return { x: enterX, opacity: 0 };
    },
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "backward") => {
      if (shouldReduce) return { opacity: 0 };
      const isForward = direction === "forward";
      const exitX = isRTL
        ? isForward ? "60%" : "-60%"
        : isForward ? "-60%" : "60%";
      return { x: exitX, opacity: 0 };
    },
  };

  const activePage = pages[pager.index] ?? pages[0] ?? { id: "hero", node: null, seoTitle: "" };

  return (
    <GenieProvider>
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {/* Active Page Viewport with AnimatePresence */}
        <AnimatePresence mode="wait" custom={pager.direction}>
          <motion.div
            key={activePage.id}
            id={activePage.id}
            data-page-index={pager.index}
            ref={pageContainerRef}
            custom={pager.direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: shouldReduce ? 0.1 : 0.3,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-col md:justify-center scroll-smooth overscroll-contain"
          >
            {activePage.node}
          </motion.div>
        </AnimatePresence>

        {/* Hidden Semantic Structure for SEO & Crawlers */}
        <div className="sr-only" aria-hidden="true">
          {pages.map((p, idx) => (
            <div key={p.id} id={`seo-${p.id}`} data-page-index={idx}>
              <h2>{p.seoTitle ?? p.id}</h2>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Floating Genie Overlay */}
      <Genie lang={lang} dismissLabel={t.common.dismissTip} />

      {/* Navigation bar placed directly in flex flow */}
      <PagerNav
        index={pager.index}
        total={total}
        isRTL={isRTL}
        isTransitioning={pager.isTransitioning}
        sound={sound}
        labels={navLabels}
        onNext={pager.next}
        onPrev={pager.prev}
        onGoTo={pager.goTo}
      />
    </GenieProvider>
  );
}
