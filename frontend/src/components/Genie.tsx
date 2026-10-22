import { cn } from "@/lib/utils";

export type GeniePose = "low" | "mid" | "high" | "studying" | "idle";

/** Consistent adult genie mascot: turban, pointed beard, smoke tail. */
export function Genie({ pose = "idle", className }: { pose?: GeniePose; className?: string }) {
  const armsUp = pose === "high";
  const sad = pose === "low";
  return (
    <svg viewBox="0 0 120 140" className={cn("h-24 w-24", className)} aria-label="StudyGenie mascot">
      <defs>
        <linearGradient id="gBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6a11cb" />
          <stop offset="1" stopColor="#2575fc" />
        </linearGradient>
        <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* smoke tail */}
      <path d="M48 92 C40 110 70 112 58 124 C52 130 64 136 72 132 C62 128 78 118 70 108 C64 100 74 96 72 92 Z" fill="url(#gBody)" opacity="0.85" />
      {/* torso */}
      <path d="M36 70 Q60 60 84 70 L76 96 Q60 102 44 96 Z" fill="url(#gBody)" />
      <path d="M52 72 L60 92 L68 72" fill="none" stroke="url(#gGold)" strokeWidth="3" strokeLinecap="round" />
      {/* arms */}
      {armsUp ? (
        <>
          <path d="M38 74 Q22 60 20 40" stroke="url(#gBody)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M82 74 Q98 60 100 40" stroke="url(#gBody)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="36" r="4" fill="url(#gGold)" />
          <circle cx="100" cy="36" r="4" fill="url(#gGold)" />
        </>
      ) : pose === "studying" ? (
        <>
          <path d="M38 76 Q34 90 50 92" stroke="url(#gBody)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M82 76 Q86 90 70 92" stroke="url(#gBody)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <rect x="40" y="84" width="40" height="20" rx="3" fill="url(#gGold)" />
          <line x1="60" y1="84" x2="60" y2="104" stroke="#92400e" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path d={sad ? "M38 74 Q28 86 32 98" : "M38 74 Q26 80 30 92"} stroke="url(#gBody)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d={sad ? "M82 74 Q92 86 88 98" : "M82 74 Q96 70 98 58"} stroke="url(#gBody)" strokeWidth="9" strokeLinecap="round" fill="none" />
          {!sad && <path d="M98 50 l2 4 4 1 -4 2 -2 4 -2-4 -4-2 4-1z" fill="url(#gGold)" />}
        </>
      )}
      {/* head */}
      <ellipse cx="60" cy="46" rx="18" ry="20" fill="#8b7cf6" />
      {/* turban */}
      <path d="M40 38 Q42 18 60 16 Q78 18 80 38 Q60 30 40 38 Z" fill="url(#gGold)" />
      <circle cx="60" cy="30" r="4" fill="#6a11cb" />
      <path d="M60 16 Q66 6 74 8" stroke="url(#gGold)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* eyebrows */}
      <path d={sad ? "M48 40 L55 42" : "M48 41 L55 39"} stroke="#2e1065" strokeWidth="2" strokeLinecap="round" />
      <path d={sad ? "M72 40 L65 42" : "M72 41 L65 39"} stroke="#2e1065" strokeWidth="2" strokeLinecap="round" />
      {/* eyes */}
      {pose === "studying" ? (
        <>
          <path d="M49 47 Q52 49 55 47" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M65 47 Q68 49 71 47" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="52" cy="47" r="3" fill="#fff" />
          <circle cx="68" cy="47" r="3" fill="#fff" />
          <circle cx="52.5" cy="47.5" r="1.4" fill="#1e1b4b" />
          <circle cx="68.5" cy="47.5" r="1.4" fill="#1e1b4b" />
        </>
      )}
      {/* moustache + mouth */}
      <path d="M50 55 Q55 52 60 55 Q65 52 70 55" stroke="#2e1065" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={sad ? "M55 60 Q60 57 65 60" : armsUp ? "M54 58 Q60 65 66 58" : "M55 58 Q60 61 65 58"} stroke="#2e1065" strokeWidth="1.8" fill={armsUp ? "#2e1065" : "none"} strokeLinecap="round" />
      {/* pointed beard */}
      <path d="M53 62 Q60 76 67 62 Q60 66 53 62 Z" fill="#2e1065" />
      {/* earring */}
      <circle cx="41" cy="52" r="2.5" fill="none" stroke="url(#gGold)" strokeWidth="1.5" />
    </svg>
  );
}

export function GenieLogo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
        <Genie className="h-9 w-9" />
      </span>
      <span className="font-display text-xl font-semibold text-gradient-magic">StudyGenie</span>
    </span>
  );
}
