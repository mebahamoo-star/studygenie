/**
 * genie-context.tsx
 * -----------------
 * Context and provider for the interactive Genie companion.
 * Manages:
 *  - Active tip (message, anchor position/target, side)
 *  - Hover (desktop) and Tap (mobile) show/hide
 *  - Auto-hide timer (4 seconds on mobile)
 *  - Global enabled/disabled toggle (saved in localStorage)
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

export interface GenieTipData {
  message: string;
  pose?: "idle" | "high" | "studying" | "low";
  anchorRect?: DOMRect | null;
  side?: "top" | "bottom" | "start" | "end" | "auto";
}

interface GenieContextType {
  enabled: boolean;
  toggleEnabled: () => void;
  activeTip: GenieTipData | null;
  showTip: (tip: GenieTipData) => void;
  hideTip: () => void;
}

const GenieContext = createContext<GenieContextType | null>(null);

const STORAGE_KEY = "sg-genie-enabled";

export function GenieProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const [activeTip, setActiveTip] = useState<GenieTipData | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      if (!next) {
        setActiveTip(null);
      }
      return next;
    });
  }, []);

  const hideTip = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setActiveTip(null);
  }, []);

  const showTip = useCallback(
    (tip: GenieTipData) => {
      if (!enabled) return;
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      setActiveTip(tip);

      // Auto-hide after 4.5 seconds for touch/mobile interactions
      hideTimerRef.current = window.setTimeout(() => {
        setActiveTip(null);
        hideTimerRef.current = null;
      }, 4500);
    },
    [enabled],
  );

  // Close tip on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideTip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hideTip]);

  return (
    <GenieContext.Provider
      value={{ enabled, toggleEnabled, activeTip, showTip, hideTip }}
    >
      {children}
    </GenieContext.Provider>
  );
}

export function useGenie() {
  const ctx = useContext(GenieContext);
  if (!ctx) {
    throw new Error("useGenie must be used within a GenieProvider");
  }
  return ctx;
}
