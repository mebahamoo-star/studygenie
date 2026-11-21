import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { GeniePose } from "@/components/Genie";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GenieMessageType =
  | "welcome"
  | "encourage"
  | "tip"
  | "celebrate"
  | "warn"
  | "guide"
  | "idle";

export interface GenieMessage {
  id: string;
  text: string;
  pose: GeniePose;
  type: GenieMessageType;
  duration?: number; // ms, 0 = sticky until dismissed
  actions?: { label: string; onClick: () => void }[];
}

interface GenieCtx {
  message: GenieMessage | null;
  isVisible: boolean;
  showMessage: (msg: Omit<GenieMessage, "id">) => void;
  dismiss: () => void;
  triggerPageWelcome: (page: string, userName?: string) => void;
  triggerCelebration: (text: string) => void;
  triggerEncourage: (text: string) => void;
  triggerTip: (text: string) => void;
  triggerWarn: (text: string) => void;
}

const GenieCtxRef = createContext<GenieCtx | null>(null);

// ─── Page-aware messages ─────────────────────────────────────────────────────

function getPageMessages(
  page: string,
  name?: string
): Omit<GenieMessage, "id"> {
  const n = name ? name.split(" ")[0] : "أيها العالم";

  const map: Record<string, Omit<GenieMessage, "id">> = {
    "/dashboard": {
      text: `أهلاً ${n}! 👋 أنا جنيك الدراسي — هنا ترى تقدمك اليومي. خلينا نحقق أهدافك اليوم!`,
      pose: "high",
      type: "welcome",
      duration: 7000,
    },
    "/courses": {
      text: `📚 صفحة موادك! هنا تضيف موادك وترفع المحتوى. كل مادة أضفتها تقربك من النجاح!`,
      pose: "studying",
      type: "tip",
      duration: 6000,
    },
    "/plan": {
      text: `🗓️ خطتك الدراسية جاهزة! التزم بها يوماً بيوم وستصل لأهدافك بإذن الله 💪`,
      pose: "mid",
      type: "guide",
      duration: 6000,
    },
    "/flashcards": {
      text: `🃏 البطاقات الدراسية أقوى أسلوب للحفظ! كل بطاقة تراجعها تقوّي ذاكرتك.`,
      pose: "studying",
      type: "tip",
      duration: 6000,
    },
    "/quiz": {
      text: `🧠 وقت الاختبار الذاتي! لا تخف من الأسئلة — كل خطأ درس تتعلمه. روح!`,
      pose: "high",
      type: "encourage",
      duration: 6000,
    },
    "/pomodoro": {
      text: `⏱️ تقنية بومودورو: 25 دقيقة تركيز، 5 دقائق راحة. جهز نفسك — ابدأ!`,
      pose: "mid",
      type: "guide",
      duration: 6000,
    },
    "/leaderboard": {
      text: `🏆 قائمة المتصدرين! شوف مكانك وتحدى نفسك. النجاح مش بالحظ — بالمثابرة!`,
      pose: "high",
      type: "encourage",
      duration: 6000,
    },
    "/profile": {
      text: `✨ هاد ملفك الشخصي — إنجازاتك ومسيرتك. كل نقطة كسبتها تعبت عليها!`,
      pose: "idle",
      type: "guide",
      duration: 5000,
    },
    "/settings": {
      text: `⚙️ خصص تجربتك! غيّر الإعدادات اللي تناسبك وخلي Studygenie يشتغل لصالحك.`,
      pose: "idle",
      type: "tip",
      duration: 5000,
    },
  };

  return (
    map[page] || {
      text: `مرحباً ${n}! 🌟 أنا هنا إذا احتجت مساعدة في رحلتك الدراسية!`,
      pose: "idle",
      type: "welcome",
      duration: 5000,
    }
  );
}

// ─── Random idle tips ─────────────────────────────────────────────────────────

const IDLE_TIPS = [
  "💡 نصيحة: الدراسة قبل النوم بساعة تقوي الحفظ بشكل كبير!",
  "🔥 استمر في مراجعة البطاقات يومياً — الثبات هو المفتاح!",
  "⏰ حاول تدرس بنفس الوقت كل يوم لتبني عادة قوية.",
  "🧠 الفهم أهم من الحفظ — اشرح الموضوع لنفسك بكلامك.",
  "💪 كل يوم تدرس هو استثمار في مستقبلك. لا تتوقف!",
  "🎯 ضع هدفاً صغيراً لكل جلسة — أكمل فصل أو راجع 10 بطاقات.",
  "🌟 الأداء الممتاز يبدأ بخطوات صغيرة ومستمرة. أنت قادر!",
];

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GenieProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<GenieMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownPagesRef = useRef<Set<string>>(new Set());
  const idleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setIsVisible(false);
    // slight delay so animation plays
    setTimeout(() => setMessage(null), 350);
  }, [clearTimers]);

  const showMessage = useCallback(
    (msg: Omit<GenieMessage, "id">) => {
      clearTimers();
      const id = `genie-${Date.now()}`;
      setMessage({ ...msg, id });
      setIsVisible(true);

      if (msg.duration && msg.duration > 0) {
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => setMessage(null), 350);
        }, msg.duration);
      }
    },
    [clearTimers]
  );

  const triggerPageWelcome = useCallback(
    (page: string, userName?: string) => {
      // Show once per page per session, skip the same page twice in a row
      const key = `${page}-${userName || ""}`;
      if (shownPagesRef.current.has(key)) return;
      shownPagesRef.current.add(key);

      // Small delay so page renders first
      idleTimerRef.current = setTimeout(() => {
        showMessage(getPageMessages(page, userName));
      }, 800);
    },
    [showMessage]
  );

  const triggerCelebration = useCallback(
    (text: string) => {
      showMessage({ text, pose: "high", type: "celebrate", duration: 6000 });
    },
    [showMessage]
  );

  const triggerEncourage = useCallback(
    (text: string) => {
      showMessage({ text, pose: "mid", type: "encourage", duration: 5500 });
    },
    [showMessage]
  );

  const triggerTip = useCallback(
    (text: string) => {
      showMessage({ text, pose: "studying", type: "tip", duration: 6000 });
    },
    [showMessage]
  );

  const triggerWarn = useCallback(
    (text: string) => {
      showMessage({ text, pose: "low", type: "warn", duration: 7000 });
    },
    [showMessage]
  );

  // Idle random tips every 5 minutes when user is active
  useEffect(() => {
    let tipIdx = 0;
    idleIntervalRef.current = setInterval(
      () => {
        // Only show if no message is active
        setMessage((current) => {
          if (!current) {
            const tip = IDLE_TIPS[tipIdx % IDLE_TIPS.length];
            tipIdx++;
            const id = `genie-idle-${Date.now()}`;
            const newMsg: GenieMessage = {
              id,
              text: tip,
              pose: "idle",
              type: "idle",
              duration: 7000,
            };
            setIsVisible(true);
            setTimeout(() => {
              setIsVisible(false);
              setTimeout(() => setMessage(null), 350);
            }, 7000);
            return newMsg;
          }
          return current;
        });
      },
      5 * 60 * 1000 // every 5 minutes
    );

    return () => {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <GenieCtxRef.Provider
      value={{
        message,
        isVisible,
        showMessage,
        dismiss,
        triggerPageWelcome,
        triggerCelebration,
        triggerEncourage,
        triggerTip,
        triggerWarn,
      }}
    >
      {children}
    </GenieCtxRef.Provider>
  );
}

export function useGenie() {
  const c = useContext(GenieCtxRef);
  if (!c) throw new Error("useGenie must be used inside GenieProvider");
  return c;
}
