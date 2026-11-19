/**
 * SoundToggle.tsx
 * ---------------
 * Sound mute/unmute toggle button for the main Header bar.
 * Designed to match ThemeToggle exactly (rounded-xl, 44px min-target,
 * shadow-soft, smooth hover transition).
 *
 * Persists muted state in localStorage within try/catch.
 * RTL-friendly and fully accessible.
 */
import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "./useSound";

interface SoundToggleProps {
  lang?: "ar" | "en";
}

export function SoundToggle({ lang = "ar" }: SoundToggleProps) {
  const { muted, toggleMute } = useSound();
  const isRTL = lang === "ar";

  const label = muted
    ? isRTL
      ? "تشغيل الصوت"
      : "Unmute sound"
    : isRTL
      ? "كتم الصوت"
      : "Mute sound";

  return (
    <button
      type="button"
      onClick={toggleMute}
      title={label}
      aria-label={label}
      className="grid h-10 w-10 min-w-[40px] sm:min-w-[44px] sm:h-10 sm:w-10 place-items-center rounded-xl bg-card text-foreground shadow-soft transition hover:scale-105 border border-border/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
    >
      {muted ? (
        <VolumeX className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Volume2 className="h-5 w-5 text-primary" />
      )}
    </button>
  );
}
