/**
 * routes/index.tsx — StudyGenie Landing Page (Book-Pager Edition)
 * - Unauthenticated users -> Interactive 100dvh Book-Pages presentation
 * - Authenticated users   -> Immediate redirect to /dashboard
 * - 100% translated via `t.*`. No hardcoded strings.
 */
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { useApp } from "@/lib/app-state";
import { arTranslations } from "@/components/landing/i18n/ar";
import { enTranslations } from "@/components/landing/i18n/en";
import { Genie, GenieLogo } from "@/components/Genie";
import { ThemeToggle } from "@/components/AppShell";
import { SoundToggle } from "@/components/landing/sound/SoundToggle";
import { Button } from "@/components/ui/button";
import { Globe, User } from "lucide-react";
import { getStoredAccessToken } from "@/lib/api/client";

import { BookPager } from "@/components/landing/pager/BookPager";
import type { PageConfig } from "@/components/landing/pager/BookPager";

// Dedicated 100dvh Interactive Pages for All Sections
import { HeroPage } from "@/components/landing/pages/HeroPage";
import { HowItWorksPage } from "@/components/landing/pages/HowItWorksPage";
import { CommunityPage } from "@/components/landing/pages/CommunityPage";
import { BentoFeaturesPage } from "@/components/landing/pages/BentoFeaturesPage";
import { ProductShowcasePage } from "@/components/landing/pages/ProductShowcasePage";
import { PsychologyPage } from "@/components/landing/pages/PsychologyPage";
import { FaqPage } from "@/components/landing/pages/FaqPage";
import { FinalCtaPage } from "@/components/landing/pages/FinalCtaPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyGenie — Study smarter, with a little magic" },
      {
        name: "description",
        content:
          "Upload your syllabus and let your study genie build a daily plan, active flashcards and shared challenges for university students.",
      },
      { property: "og:title", content: "StudyGenie — Study smarter, with a little magic" },
      {
        property: "og:description",
        content:
          "Gamified daily study plans, spaced flashcards, and campus study rooms tailored to your syllabus.",
      },
      { property: "og:image", content: "/og-preview.png" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { lang, setLang, isAuthenticated } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const hasStoredSession =
      isAuthenticated ||
      (typeof window !== "undefined" && Boolean(getStoredAccessToken()));

    if (Capacitor.isNativePlatform()) {
      if (hasStoredSession) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
      return;
    }
    if (hasStoredSession) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
      document.title = lang === "ar" ? arTranslations.meta.title : enTranslations.meta.title;
    }
  }, [lang]);

  const t = lang === "ar" ? arTranslations : enTranslations;
  const isRTL = lang === "ar";

  const toggleLanguage = () => setLang(lang === "ar" ? "en" : "ar");

  // All 8 active presentation pages
  const pages: PageConfig[] = useMemo(() => {
    return [
      {
        id: "hero",
        seoTitle: t.hero.title,
        node: <HeroPage t={t} lang={lang} />,
      },
      {
        id: "how",
        seoTitle: t.howItWorks.title,
        node: <HowItWorksPage t={t} lang={lang} />,
      },
      {
        id: "community",
        seoTitle: t.community.title,
        node: <CommunityPage t={t} lang={lang} />,
      },
      {
        id: "features",
        seoTitle: t.bento.title,
        node: <BentoFeaturesPage t={t} lang={lang} />,
      },
      {
        id: "showcase",
        seoTitle: t.showcase.title,
        node: <ProductShowcasePage t={t} lang={lang} />,
      },
      {
        id: "psychology",
        seoTitle: t.psychology.title,
        node: <PsychologyPage t={t} lang={lang} />,
      },
      {
        id: "faq",
        seoTitle: t.faq.title,
        node: <FaqPage t={t} lang={lang} />,
      },
      {
        id: "cta",
        seoTitle: t.finalCta.title,
        node: <FinalCtaPage t={t} lang={lang} />,
      },
    ];
  }, [t, lang]);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative flex h-screen h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground transition-colors duration-300 font-sans"
    >
      {/* Sticky Header with Safe-Area Top & Unclipped Exact Ordered Controls */}
      <header className="shrink-0 min-h-14 sm:min-h-16 pt-[env(safe-area-inset-top,0px)] flex items-center justify-between gap-1 sm:gap-2 border-b border-border/40 bg-background/85 px-2 sm:px-6 backdrop-blur-md z-40">
        <Link
          to="/"
          className="flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-primary rounded-lg shrink min-w-0"
        >
          <GenieLogo textClassName="hidden md:inline" />
        </Link>

        {/* Ordered controls: [Language] [Theme] [Sound] [Log in] [Get Started] */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={t.nav.switchLang}
            aria-label={t.nav.switchLang}
            className="inline-flex h-9 sm:h-10 items-center gap-1 rounded-xl border border-border/80 bg-card px-2 sm:px-3 text-xs font-bold text-foreground hover:bg-accent transition-colors shadow-soft cursor-pointer focus-visible:outline-2 focus-visible:outline-primary shrink-0"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="hidden xs:inline">{t.nav.switchLang}</span>
            <span className="xs:hidden">{t.nav.switchLangShort}</span>
          </button>

          {/* 2. Theme Toggle (Dark / Light) */}
          <div className="shrink-0">
            <ThemeToggle />
          </div>

          {/* 3. Sound Toggle (Mute / Unmute) */}
          <div className="shrink-0">
            <SoundToggle lang={lang} />
          </div>

          {/* 4. Login Action */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 sm:h-10 px-2 sm:px-2.5 text-xs font-semibold shrink-0"
          >
            <Link to="/login" title={t.nav.logIn} aria-label={t.nav.logIn}>
              <User className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">{t.nav.logIn}</span>
            </Link>
          </Button>

          {/* 5. Primary CTA Action (Always visible on mobile as "Start" / "ابدأ") */}
          <Button
            variant="magic"
            size="sm"
            asChild
            className="h-9 sm:h-10 text-xs font-bold shadow-glow shrink-0 px-2.5 sm:px-3.5"
          >
            <Link to="/signup">
              <span className="hidden sm:inline">{t.nav.getStarted}</span>
              <span className="sm:hidden">{t.nav.getStartedShort}</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Book Pager Main Viewport */}
      <main className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <BookPager pages={pages} lang={lang} t={t} />
      </main>
    </div>
  );
}
