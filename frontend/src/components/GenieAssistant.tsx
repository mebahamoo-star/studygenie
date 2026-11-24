import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Genie } from "@/components/Genie";
import { useGenie } from "@/lib/genie-context";
import { useOptionalApp } from "@/lib/app-state";
import { X, Sparkles, Compass, Lightbulb } from "lucide-react";

/**
 * GenieAssistant — Interactive Floating Companion.
 * Features:
 * - Contextual guided speech bubble with structured bullets and titles
 * - Realistic animated typewriter reveal for dialogue
 * - Quick action pills (explain page, study tips, close)
 * - Click-to-poke reactions
 */
export function GenieAssistant() {
  const { message, isVisible, dismiss, pokeGenie, explainPage } = useGenie();
  const lang = useOptionalApp()?.lang ?? "en";
  const isAr = lang === "ar";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState("");

  // Smooth typewriter reveal effect for realism
  useEffect(() => {
    if (!message?.text) {
      setDisplayedText("");
      return;
    }
    const full = message.text;
    // For very long text, reveal faster so student doesn't wait
    const step = full.length > 120 ? 4 : 2;
    let curr = 0;
    setDisplayedText(full.slice(0, Math.min(step, full.length)));

    const interval = setInterval(() => {
      curr += step;
      if (curr >= full.length) {
        setDisplayedText(full);
        clearInterval(interval);
      } else {
        setDisplayedText(full.slice(0, curr));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [message?.text]);

  if (!message) return null;

  const typeConfig: Record<
    string,
    { border: string; glow: string; badge: string; emoji: string; titleColor: string }
  > = {
    welcome: {
      border: "border-blue-400/40 dark:border-blue-500/40",
      glow: "from-blue-600/20 via-indigo-500/15 to-blue-400/10",
      badge: "bg-blue-500/20 text-blue-600 dark:text-blue-300",
      emoji: "👋",
      titleColor: "text-blue-600 dark:text-blue-300",
    },
    celebrate: {
      border: "border-amber-400/50 dark:border-amber-500/50",
      glow: "from-amber-500/25 via-yellow-400/20 to-orange-400/10",
      badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
      emoji: "🎉",
      titleColor: "text-amber-600 dark:text-amber-300",
    },
    encourage: {
      border: "border-emerald-400/40 dark:border-emerald-500/40",
      glow: "from-emerald-500/20 via-green-400/15 to-teal-400/10",
      badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
      emoji: "💪",
      titleColor: "text-emerald-600 dark:text-emerald-300",
    },
    tip: {
      border: "border-indigo-400/40 dark:border-indigo-500/40",
      glow: "from-indigo-500/20 via-purple-400/15 to-blue-400/10",
      badge: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
      emoji: "💡",
      titleColor: "text-indigo-600 dark:text-indigo-300",
    },
    guide: {
      border: "border-cyan-400/40 dark:border-cyan-500/40",
      glow: "from-cyan-500/20 via-sky-400/15 to-blue-400/10",
      badge: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
      emoji: "🧭",
      titleColor: "text-cyan-600 dark:text-cyan-300",
    },
    feature: {
      border: "border-violet-400/40 dark:border-violet-500/40",
      glow: "from-violet-500/20 via-purple-400/15 to-indigo-400/10",
      badge: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
      emoji: "✨",
      titleColor: "text-violet-600 dark:text-violet-300",
    },
    warn: {
      border: "border-orange-400/50 dark:border-orange-500/50",
      glow: "from-orange-500/20 via-amber-400/15 to-yellow-400/10",
      badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
      emoji: "⚠️",
      titleColor: "text-orange-600 dark:text-orange-300",
    },
    idle: {
      border: "border-blue-400/30 dark:border-blue-500/30",
      glow: "from-blue-500/15 via-indigo-500/10 to-transparent",
      badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
      emoji: "🧞‍♂️",
      titleColor: "text-foreground",
    },
  };

  const currentType = typeConfig[message.type] || typeConfig.idle;

  return (
    <aside
      ref={bubbleRef}
      aria-label="Genie Assistant Bubble"
      className={cn(
        // Placement: fixed bottom-right, clears mobile navigation bar
        "fixed z-50 flex items-end gap-3 pointer-events-auto",
        "bottom-20 right-4 sm:bottom-8 sm:right-6",
        "max-w-[min(calc(100vw-2rem),380px)]",
        "transition-all duration-300 ease-out",
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      )}
    >
      {/* 1. Speech Bubble Box */}
      <div
        dir={isAr ? "rtl" : "ltr"}
        className={cn(
          "relative flex flex-col gap-2 rounded-2xl border bg-card/95 p-4 shadow-2xl backdrop-blur-md",
          "text-sm text-foreground ring-1 ring-black/5 dark:ring-white/10",
          currentType.border
        )}
      >
        {/* Soft background glow */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br opacity-80",
            currentType.glow
          )}
        />

        {/* Header row: Badge, Title & Close */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0",
                currentType.badge
              )}
            >
              <span>{currentType.emoji}</span>
              <span>
                {(isAr
                  ? {
                      welcome: "مرحباً",
                      celebrate: "إنجاز!",
                      encourage: "تشجيع",
                      tip: "نصيحة",
                      guide: "دليل الميزة",
                      feature: "استكشاف",
                      warn: "تنبيه",
                      idle: "جني",
                    }
                  : {
                      welcome: "Welcome",
                      celebrate: "Awesome!",
                      encourage: "Keep Going",
                      tip: "Tip",
                      guide: "Page Guide",
                      feature: "Explore",
                      warn: "Alert",
                      idle: "Genie",
                    })[message.type] || (isAr ? "جني" : "Genie")}
              </span>
            </span>
            {message.title && (
              <span className={cn("text-xs font-bold truncate", currentType.titleColor)}>
                {message.title}
              </span>
            )}
          </div>

          <button
            onClick={dismiss}
            className="grid h-6 w-6 place-items-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition shrink-0"
            aria-label="Close message"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Message body with formatted lines and typewriter reveal */}
        <div className="leading-relaxed whitespace-pre-line text-[13px] text-foreground/90 max-h-60 overflow-y-auto pr-1">
          {displayedText}
        </div>

        {/* Action Buttons Row */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2 pt-2 border-t border-border/40">
            {message.actions.map((act, idx) => (
              <button
                key={idx}
                onClick={act.onClick}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shadow-xs active:scale-95",
                  act.variant === "primary"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-accent/80 hover:bg-accent text-accent-foreground border border-border/50"
                )}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}

        {/* Speech Bubble Arrow pointing towards the Genie on the right */}
        <div className="absolute -right-2 bottom-6 h-0 w-0 border-y-[7px] border-l-[8px] border-y-transparent border-l-card" />
      </div>

      {/* 2. Interactive Character Figure */}
      <div className="flex shrink-0 flex-col items-center gap-1 group">
        <Genie
          pose={message.pose}
          className="h-20 w-20 cursor-pointer transition-transform group-hover:scale-105 active:scale-95"
          onClick={() => pokeGenie(path)}
        />
        <button
          onClick={() => pokeGenie(path)}
          className="text-[10px] font-bold text-muted-foreground hover:text-primary transition flex items-center gap-0.5"
          title={isAr ? "اضغط للتحدث مع الجني" : "Click to chat with Genie"}
        >
          <Sparkles className="h-2.5 w-2.5 text-gold" />
          <span>{isAr ? "اسألني" : "Ask me"}</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * GenieFloatButton — Floating magic button shown when Genie bubble is idle.
 * Tapping it lets the student ask questions or get an instant explanation.
 */
export function GenieFloatButton() {
  const { message, pokeGenie, explainPage } = useGenie();
  const lang = useOptionalApp()?.lang ?? "en";
  const isAr = lang === "ar";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  // If Genie is currently talking with a full bubble, hide the compact button
  if (message) return null;

  // On auth pages (login, signup, forgot-password), AuthGeniePresenter handles onboarding
  if (path === "/login" || path === "/signup" || path === "/forgot-password") {
    return null;
  }

  return (
    <div className="fixed z-40 bottom-20 right-4 sm:bottom-8 sm:right-6 flex flex-col items-end gap-2">
      {/* Quick Menu Popover on Tap */}
      {menuOpen && (
        <div
          role="menu"
          dir={isAr ? "rtl" : "ltr"}
          aria-label="Genie Quick Options"
          className="flex flex-col gap-1.5 rounded-2xl border border-primary/25 bg-card/95 p-2 shadow-2xl backdrop-blur-md text-xs font-semibold w-56 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground border-b border-border/40 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-gold" />
              <span>{isAr ? "مساعدك الدراسي" : "Your Study Assistant"}</span>
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => {
              setMenuOpen(false);
              explainPage(path);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-accent text-foreground transition",
              isAr ? "text-right" : "text-left"
            )}
          >
            <Compass className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <span>{isAr ? "ماذا أفعل في هذه الصفحة؟" : "What can I do here?"}</span>
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              pokeGenie(path);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-accent text-foreground transition",
              isAr ? "text-right" : "text-left"
            )}
          >
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{isAr ? "نصيحة دراسية سريعة 💡" : "Quick study tip 💡"}</span>
          </button>
        </div>
      )}

      {/* Floating Orb Button */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className={cn(
          "relative flex items-center justify-center",
          "h-15 w-15 rounded-full shadow-2xl",
          "bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5",
          "transition-all duration-300 hover:scale-110 active:scale-95 group"
        )}
        aria-label="Open Genie Guide"
      >
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-card/90 backdrop-blur-sm">
          <Genie pose="idle" className="h-12 w-12" showAura={false} />

          {/* Pulsing magical ring */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-background" />
          </span>
        </div>
      </button>
    </div>
  );
}
