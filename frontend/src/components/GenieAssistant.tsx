import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Genie } from "@/components/Genie";
import { useGenie } from "@/lib/genie-context";
import { X } from "lucide-react";

/**
 * GenieAssistant — floating interactive Genie bubble.
 * Fixed to the bottom-right corner of the viewport.
 * Shows context-aware messages with smooth animations.
 */
export function GenieAssistant() {
  const { message, isVisible, dismiss } = useGenie();
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    // Delay to avoid dismissing on the same click that triggered it
    const tid = setTimeout(() => document.addEventListener("mousedown", handler), 200);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("mousedown", handler);
    };
  }, [isVisible, dismiss]);

  if (!message) return null;

  const typeStyles: Record<string, string> = {
    welcome: "from-blue-600/20 via-indigo-500/15 to-blue-400/10 border-blue-400/40",
    celebrate: "from-amber-500/20 via-yellow-400/15 to-orange-400/10 border-amber-400/40",
    encourage: "from-emerald-500/20 via-green-400/15 to-teal-400/10 border-emerald-400/40",
    tip: "from-indigo-500/20 via-purple-400/15 to-blue-400/10 border-indigo-400/40",
    guide: "from-cyan-500/20 via-sky-400/15 to-blue-400/10 border-cyan-400/40",
    warn: "from-orange-500/20 via-amber-400/15 to-yellow-400/10 border-orange-400/40",
    idle: "from-violet-500/20 via-purple-400/15 to-indigo-400/10 border-violet-400/40",
  };

  const badgeEmoji: Record<string, string> = {
    welcome: "👋",
    celebrate: "🎉",
    encourage: "💪",
    tip: "💡",
    guide: "🗺️",
    warn: "⚠️",
    idle: "✨",
  };

  const style = typeStyles[message.type] || typeStyles.idle;
  const emoji = badgeEmoji[message.type] || "✨";

  return (
    <div
      ref={bubbleRef}
      className={cn(
        // Positioning: fixed bottom-right, above mobile bottom nav on small screens
        "fixed z-50 flex items-end gap-3",
        "bottom-20 right-4 md:bottom-8 md:right-6",
        "max-w-[min(calc(100vw-2rem),340px)]",
        // Animated transitions
        "transition-all duration-350 ease-out",
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      )}
    >
      {/* Speech bubble */}
      <div
        className={cn(
          "relative flex flex-col gap-2 rounded-2xl border bg-gradient-to-br p-3.5 shadow-xl backdrop-blur-md",
          "text-sm text-foreground",
          style
        )}
      >
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Type badge */}
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
          <span>{emoji}</span>
          <span>
            {{
              welcome: "مرحبا",
              celebrate: "أحسنت!",
              encourage: "يلا!",
              tip: "نصيحة",
              guide: "دليل",
              warn: "تنبيه",
              idle: "معلومة",
            }[message.type] || "جني"}
          </span>
        </span>

        {/* Message text */}
        <p className="pr-4 leading-snug">{message.text}</p>

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {message.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  a.onClick();
                  dismiss();
                }}
                className="rounded-lg bg-primary/15 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/25"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Tail pointing right → toward the genie */}
        <div className="absolute -right-2.5 bottom-6 h-0 w-0 border-y-[8px] border-l-[10px] border-y-transparent border-l-current opacity-20" />
      </div>

      {/* Genie figure — clickable to toggle bubble */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <Genie
          pose={message.pose}
          className="h-20 w-20 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          onClick={dismiss}
        />
        <span className="text-[9px] font-semibold tracking-wide text-muted-foreground">
          Genie AI
        </span>
      </div>
    </div>
  );
}

/**
 * GenieFloatButton — a compact floating button when no message is showing.
 * Tap it to get a tip.
 */
export function GenieFloatButton() {
  const { message, triggerTip } = useGenie();

  if (message) return null; // hide when a message is already shown

  const TIPS = [
    "💡 راجع ملاحظاتك قبل النوم — ذاكرتك تعمل وأنت نايم!",
    "🔥 الاستمرارية أهم من الكمال — دقيقة دراسة أفضل من لا شيء.",
    "🧠 جرب تشرح الموضوع لصديق — هذا يثبت المعلومة عندك.",
    "⏱️ كل 25 دقيقة دراسة استرح 5 دقائق — Pomodoro technique!",
    "🎯 حدد 3 أهداف صغيرة لكل يوم وحققها واحدة واحدة.",
  ];

  return (
    <button
      onClick={() => {
        const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
        triggerTip(tip);
      }}
      className={cn(
        "fixed z-40 flex items-center justify-center",
        "bottom-20 right-4 md:bottom-8 md:right-6",
        "h-14 w-14 rounded-full shadow-xl",
        "bg-gradient-to-tr from-blue-600/80 to-indigo-500/80 backdrop-blur-sm",
        "border border-blue-400/30",
        "transition-all duration-200 hover:scale-110 active:scale-95",
        "group"
      )}
      aria-label="Ask Genie"
    >
      <div className="relative">
        <Genie pose="idle" className="h-11 w-11" />
        {/* Ping dot */}
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
        </span>
      </div>
    </button>
  );
}
