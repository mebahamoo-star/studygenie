import React from "react";
import { Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MascotProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Temporary single-file Mascot component.
 * Features a fixed-size container with a magical star badge.
 * Designed to be swapped with a final 3D/vector mascot asset later
 * in this single file without altering the layout of Hero or CTA.
 */
export function Mascot({ className, size = "md" }: MascotProps) {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-3xl",
        "bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500",
        "text-white shadow-glow select-none group transition-transform duration-300 hover:scale-105",
        sizeClasses[size],
        className
      )}
      aria-label="StudyGenie Mascot"
    >
      {/* Background ambient glow pulse */}
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-magic opacity-40 blur-xl group-hover:opacity-70 transition-opacity" />

      {/* Outer decorative ring */}
      <div className="absolute inset-0 rounded-3xl border border-white/25 pointer-events-none" />

      {/* Primary temporary mascot icon (star/sparkles) */}
      <div className="relative flex items-center justify-center">
        <Star className={cn("fill-amber-300 text-amber-300 drop-shadow-md animate-pulse", iconSizes[size])} />
        <Sparkles className="absolute -top-1 -end-1 w-4 h-4 text-white animate-bounce" />
      </div>

      {/* Mascot label badge */}
      <span className="absolute -bottom-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white border border-white/20 backdrop-blur-xs">
        Genie ✨
      </span>
    </div>
  );
}
