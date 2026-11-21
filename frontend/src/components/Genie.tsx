import { cn } from "@/lib/utils";

export type GeniePose = "low" | "mid" | "high" | "studying" | "idle";

interface GenieProps {
  pose?: GeniePose;
  className?: string;
  onClick?: () => void;
}

/**
 * 3D Photorealistic Mascot for StudyGenie.
 * Uses the official 3D character with transparent alpha,
 * glowing volumetric shadows, and dynamic magical overlays per pose.
 */
export function Genie({ pose = "idle", className, onClick }: GenieProps) {
  const isHigh = pose === "high";
  const isLow = pose === "low";
  const isStudying = pose === "studying";
  const isMid = pose === "mid";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        "h-24 w-24", // standard default dimensions
        className
      )}
      aria-label="StudyGenie 3D Mascot"
      role="img"
      onClick={onClick}
    >
      {/* 3D Mascot Character */}
      <img
        src="/genie-mascot.webp"
        alt="StudyGenie Mascot"
        className={cn(
          "h-full w-full object-contain pointer-events-none transition-all duration-300",
          "drop-shadow-[0_10px_22px_rgba(37,99,235,0.32)]",
          isHigh && "scale-105 drop-shadow-[0_14px_28px_rgba(234,179,8,0.45)]",
          isStudying && "drop-shadow-[0_10px_24px_rgba(56,189,248,0.45)]",
          isLow && "opacity-90 contrast-95"
        )}
        loading="eager"
      />

      {/* Dynamic Magical Overlays */}
      {isStudying && (
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center pointer-events-none">
          {/* Floating glowing ancient book of knowledge */}
          <div className="relative animate-bounce">
            <svg
              viewBox="0 0 80 40"
              className="h-9 w-18 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 14 Q40 6 40 18 Q40 6 74 14 L70 28 Q40 22 40 32 Q40 22 10 28 Z"
                fill="#fef08a"
                stroke="#eab308"
                strokeWidth="1.5"
              />
              <path
                d="M16 17 Q28 15 36 17 M16 22 Q26 20 34 22"
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M44 17 Q52 15 64 17 M46 22 Q54 20 64 22"
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </div>
        </div>
      )}

      {isHigh && (
        <div className="absolute -top-2 inset-x-0 flex justify-between px-1 pointer-events-none">
          <span className="text-amber-400 text-sm animate-ping">✨</span>
          <span className="text-yellow-300 text-base animate-pulse">🌟</span>
          <span className="text-amber-400 text-sm animate-ping">✨</span>
        </div>
      )}

      {isMid && (
        <div className="absolute top-1 right-1 pointer-events-none">
          <span className="text-cyan-300 text-xs animate-pulse">✨</span>
        </div>
      )}

      {isLow && (
        <div className="absolute -top-1 right-2 pointer-events-none opacity-80">
          <span className="text-indigo-300 text-xs">💭</span>
        </div>
      )}
    </div>
  );
}

/**
 * Modern Logo Badge featuring the new 3D Mascot Avatar
 */
export function GenieLogo({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
} = {}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600/25 via-indigo-500/15 to-amber-400/25 p-0.5 shadow-md ring-1 ring-blue-500/30 backdrop-blur-sm transition-transform hover:scale-105 overflow-hidden shrink-0">
        <img
          src="/genie-avatar.webp"
          alt="StudyGenie Avatar"
          className="h-full w-full object-cover rounded-xl"
        />
      </span>
      <span className={cn("font-display text-lg sm:text-xl font-bold tracking-tight text-gradient-magic", textClassName)}>
        StudyGenie
      </span>
    </span>
  );
}
