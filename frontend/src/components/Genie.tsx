import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export type GeniePose = "low" | "mid" | "high" | "studying" | "idle";

export interface GenieProps {
  pose?: GeniePose;
  className?: string;
  onClick?: () => void;
  showAura?: boolean;
  interactiveTilt?: boolean;
}

/**
 * 3D Ultra-Realistic Mascot for StudyGenie.
 * Features:
 * - Lifelike organic floating & breathing physics
 * - Dynamic volumetric ambient lighting aura per pose
 * - Interactive 3D mouse parallax tilt (follows the user's cursor)
 * - Dynamic magical study overlays & particle wisps
 */
export function Genie({
  pose = "idle",
  className,
  onClick,
  showAura = true,
  interactiveTilt = true,
}: GenieProps) {
  const isHigh = pose === "high";
  const isLow = pose === "low";
  const isStudying = pose === "studying";
  const isMid = pose === "mid";

  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isPoked, setIsPoked] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactiveTilt || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Subtle 3D tilt: max +-14 degrees
      const rotateX = -(y - 0.5) * 18;
      const rotateY = (x - 0.5) * 18;
      setTilt({
        rotateX,
        rotateY,
        glareX: Math.round(x * 100),
        glareY: Math.round(y * 100),
      });
    },
    [interactiveTilt]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  }, []);

  const handleClick = useCallback(() => {
    setIsPoked(true);
    setTimeout(() => setIsPoked(false), 400);
    onClick?.();
  }, [onClick]);

  // Color theme of the volumetric aura based on pose
  const auraGradients = {
    idle: "from-blue-600/35 via-indigo-500/20 to-purple-600/10",
    studying: "from-sky-400/40 via-cyan-500/25 to-blue-600/15",
    high: "from-amber-400/45 via-yellow-500/30 to-orange-500/20",
    mid: "from-blue-500/35 via-teal-400/25 to-indigo-600/15",
    low: "from-indigo-600/25 via-slate-500/20 to-purple-900/15",
  };

  const auraGlow = auraGradients[pose] || auraGradients.idle;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ perspective: 800 }}
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        "h-24 w-24", // standard default dimensions
        onClick && "cursor-pointer",
        className
      )}
      aria-label="StudyGenie 3D Mascot"
      role="img"
    >
      {/* 1. Volumetric Ambient Glow / Magic Aura behind Genie */}
      {showAura && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute -inset-4 rounded-full blur-2xl pointer-events-none transition-all duration-700",
            "bg-radial",
            auraGlow,
            "animate-genie-aura opacity-70"
          )}
        />
      )}

      {/* 2. Floating Body Container with 3D Parallax & Levitation */}
      <div
        style={{
          transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1, 1, 1)`,
          transition: tilt.rotateX === 0 ? "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)" : "transform 0.1s ease-out",
        }}
        className={cn(
          "relative h-full w-full flex items-center justify-center",
          "animate-genie-float",
          isPoked && "scale-110 -translate-y-2 transition-transform duration-200"
        )}
      >
        {/* 3. Mascot Character Image */}
        <img
          src="/genie-mascot.webp"
          alt="StudyGenie Mascot"
          className={cn(
            "h-full w-full object-contain pointer-events-none transition-all duration-300",
            "drop-shadow-[0_12px_28px_rgba(37,99,235,0.4)]",
            isHigh && "scale-105 drop-shadow-[0_16px_36px_rgba(234,179,8,0.55)]",
            isStudying && "drop-shadow-[0_14px_32px_rgba(56,189,248,0.55)]",
            isLow && "opacity-90 contrast-95 drop-shadow-[0_8px_20px_rgba(99,102,241,0.25)]"
          )}
          loading="eager"
        />

        {/* Dynamic Light Specular Reflection following cursor */}
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.25) 0%, transparent 60%)`,
          }}
          className="absolute inset-0 pointer-events-none rounded-full mix-blend-overlay opacity-60"
        />

        {/* 4. Magic Particles & Whispers */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {/* Top magic sparkle */}
          <span
            className="absolute top-1 left-2 text-[10px] opacity-80"
            style={{ animation: "genie-sparkle 2.6s ease-in-out infinite" }}
          >
            ✦
          </span>
          <span
            className="absolute bottom-6 right-1 text-[11px] text-amber-300 opacity-75"
            style={{ animation: "genie-sparkle 3.2s ease-in-out infinite 0.9s" }}
          >
            ✧
          </span>
          <span
            className="absolute top-4 right-2 text-[9px] text-cyan-300 opacity-70"
            style={{ animation: "genie-sparkle 2.9s ease-in-out infinite 1.7s" }}
          >
            ✨
          </span>
        </div>

        {/* 5. Dynamic Overlays based on Pose */}
        {isStudying && (
          <div className="absolute inset-x-0 -bottom-1 flex items-center justify-center pointer-events-none">
            {/* Floating glowing ancient book of knowledge with floating page glow */}
            <div className="relative animate-bounce drop-shadow-[0_0_16px_rgba(56,189,248,0.95)]">
              <svg
                viewBox="0 0 80 40"
                className="h-10 w-20"
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
          <div className="absolute -top-3 inset-x-0 flex justify-between px-1 pointer-events-none">
            <span className="text-amber-300 text-sm animate-ping">✨</span>
            <span className="text-yellow-300 text-lg animate-pulse">🌟</span>
            <span className="text-amber-300 text-sm animate-ping">✨</span>
          </div>
        )}

        {isMid && (
          <div className="absolute top-1 right-1 pointer-events-none">
            <span className="text-cyan-300 text-sm animate-pulse">✨</span>
          </div>
        )}

        {isLow && (
          <div className="absolute -top-1 right-2 pointer-events-none opacity-85">
            <span className="text-indigo-300 text-xs animate-bounce">💭</span>
          </div>
        )}
      </div>

      {/* 6. Soft ground shadow reflecting levitation height */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute -bottom-2 w-3/5 h-2 rounded-[100%] bg-blue-950/25 dark:bg-black/45 blur-xs pointer-events-none transition-all duration-300",
          isPoked && "scale-75 opacity-30"
        )}
      />
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
      <span className="relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-amber-400/30 p-0.5 shadow-md ring-1 ring-blue-500/30 backdrop-blur-sm transition-transform hover:scale-105 overflow-hidden shrink-0">
        <img
          src="/genie-avatar.webp"
          alt="StudyGenie Avatar"
          className="h-full w-full object-cover rounded-xl"
        />
        {/* Subtle magical sheen */}
        <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
      </span>
      <span className={cn("font-display text-lg sm:text-xl font-bold tracking-tight text-gradient-magic", textClassName)}>
        StudyGenie
      </span>
    </span>
  );
}
