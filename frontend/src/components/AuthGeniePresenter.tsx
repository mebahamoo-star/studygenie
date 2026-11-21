import { useState, useEffect } from "react";
import { Genie, type GeniePose } from "@/components/Genie";
import { Sparkles, ChevronRight, ChevronLeft, BookOpen, Clock, Trophy } from "lucide-react";
import { playWaterDropSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

interface FeatureTour {
  id: number;
  title: string;
  tag: string;
  pose: GeniePose;
  description: string;
  icon: typeof BookOpen;
  accent: string;
}

const TOUR_FEATURES: FeatureTour[] = [
  {
    id: 1,
    title: "تلخيص المواد وتوليد البطاقات تلقائياً",
    tag: "ذكاء اصطناعي فائق 📚",
    pose: "studying",
    description:
      "ارفع سلايدات وملفات محاضراتك (PDF أو PPTX)، وسأقوم باستخراج الفصول وتوليد بطاقات Flashcards ذكية فوراً بتقنية الاسترجاع النشط.",
    icon: BookOpen,
    accent: "from-sky-500/20 to-blue-600/10 border-sky-400/30 text-sky-400",
  },
  {
    id: 2,
    title: "خطط دراسية متوازنة وعد تنازلي للاختبارات",
    tag: "تنظيم وجدول ذكي ⏱️",
    pose: "mid",
    description:
      "سجل مواعيد امتحاناتك وسأبني لك خطة يومية توزع الجهد وتحدد فترات المراجعة والراحة حتى تصل للاختبار جاهزاً بدون ضغط ليلة الامتحان.",
    icon: Clock,
    accent: "from-amber-500/20 to-orange-600/10 border-amber-400/30 text-amber-400",
  },
  {
    id: 3,
    title: "اختبارات تفاعلية ونقاط XP وتحديات حماسية",
    tag: "تحفيز وتنافس إيجابي 🏆",
    pose: "high",
    description:
      "اختبر فهمك باختبارات ذكية مع تصحيح فوري وشروحات، اكسب نقاط XP، حافظ على الـ Streak ونافس زملاء كليتك في لوحة المتصدرين!",
    icon: Trophy,
    accent: "from-emerald-500/20 to-teal-600/10 border-emerald-400/30 text-emerald-400",
  },
];

const POKE_QUOTES = [
  "✨ مرحباً يا بطل! أنا جاهز لمساعدتك في رحلتك الدراسية!",
  "🧞‍♂️ اضغط على الميزات لتتعرف أكثر على ما يمكنني فعله لأجلك!",
  "💡 هل تعلم أن الدراسة 25 دقيقة يومياً بانتظام تضاعف حفظك؟",
  "🌟 دراستك معي ستكون أسهل وأمتع بكثير!",
];

/**
 * AuthGeniePresenter — Animated Interactive Genie Guide for Login & Signup.
 * Provides desktop interactive showcase and mobile adaptive banner.
 */
export function AuthGenieDesktopPresenter({ isSignup = false }: { isSignup?: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [pokeQuote, setPokeQuote] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-cycle through features every 7 seconds unless user interacted
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % TOUR_FEATURES.length);
    }, 7500);
    return () => clearInterval(timer);
  }, []);

  const feature = TOUR_FEATURES[activeIdx];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    playWaterDropSound();
    setActiveIdx((prev) => (prev + 1) % TOUR_FEATURES.length);
    setTimeout(() => setIsAnimating(false), 250);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    playWaterDropSound();
    setActiveIdx((prev) => (prev - 1 + TOUR_FEATURES.length) % TOUR_FEATURES.length);
    setTimeout(() => setIsAnimating(false), 250);
  };

  const handleGeniePoke = () => {
    playWaterDropSound();
    const randomQuote = POKE_QUOTES[Math.floor(Math.random() * POKE_QUOTES.length)];
    setPokeQuote(randomQuote);
    setTimeout(() => setPokeQuote(null), 5000);
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center gap-6 max-w-lg w-full px-6 select-none">
      {/* 1. Interactive Speech Bubble Above Character */}
      <div
        className={cn(
          "relative w-full rounded-2xl border bg-black/35 backdrop-blur-md p-5 shadow-2xl transition-all duration-300 animate-speech-pop",
          feature.accent
        )}
      >
        {/* Floating Bubble Arrow pointing Down towards Genie */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-0 w-0 border-x-[10px] border-t-[10px] border-x-transparent border-t-black/45" />

        {/* Top Header Tag */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white">
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span>{pokeQuote ? "رسالة خاصة من الجني" : feature.tag}</span>
          </span>

          <span className="text-[11px] font-semibold text-white/70">
            {activeIdx + 1} / {TOUR_FEATURES.length}
          </span>
        </div>

        {/* Feature Content */}
        {pokeQuote ? (
          <p className="text-base font-medium text-white leading-relaxed py-1 animate-in fade-in">
            {pokeQuote}
          </p>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-1.5 transition-opacity duration-200",
              isAnimating ? "opacity-0" : "opacity-100"
            )}
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <feature.icon className="h-4 w-4 shrink-0 text-amber-300" />
              <span>{feature.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-normal">
              {feature.description}
            </p>
          </div>
        )}

        {/* Navigation & Progress Dots */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_FEATURES.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  playWaterDropSound();
                  setActiveIdx(i);
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  activeIdx === i ? "w-6 bg-amber-300" : "w-2 bg-white/30 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
              aria-label="Previous Feature"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
              aria-label="Next Feature"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Realistic 3D Genie Mascot with Levitation & Mouse Tilt */}
      <div className="relative group cursor-pointer" onClick={handleGeniePoke}>
        <Genie
          pose={pokeQuote ? "high" : feature.pose}
          className="h-72 w-72 transition-transform duration-300 group-hover:scale-105 active:scale-95"
        />

        {/* Poke hint pill below character */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[11px] font-semibold text-white/80 bg-black/35 backdrop-blur-xs px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-md">
            <span>✨ اضغط على الجني للتفاعل</span>
          </span>
        </div>
      </div>

      {/* 3. Bottom Welcome Heading */}
      <div className="text-center mt-1">
        <h2 className="text-2xl font-bold text-white drop-shadow-md">
          {isSignup ? "ابدأ رحلة تفوقك الدراسي مع StudyGenie" : "أهلاً بك مجدداً يا بطل!"}
        </h2>
        <p className="text-xs text-white/70 mt-1">
          رفيقك الذكي لتنظيم الوقت، تلخيص السلايدات والتفوق في الامتحانات
        </p>
      </div>
    </div>
  );
}

/**
 * AuthGenieMobilePresenter — Welcoming Genie banner on smaller mobile screens.
 */
export function AuthGenieMobilePresenter({ isSignup = false }: { isSignup?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [featureIdx, setFeatureIdx] = useState(0);

  const feature = TOUR_FEATURES[featureIdx];

  return (
    <div className="md:hidden w-full mb-4">
      <div className="relative rounded-2xl border border-primary/20 bg-card/70 p-3.5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Animated Mascot */}
          <div
            className="shrink-0 cursor-pointer"
            onClick={() => {
              playWaterDropSound();
              setExpanded((prev) => !prev);
            }}
          >
            <Genie pose={expanded ? feature.pose : "mid"} className="h-16 w-16" showAura={true} />
          </div>

          {/* Quick Welcome & Tour Toggle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <Sparkles className="h-3 w-3 text-gold" />
              <span>StudyGenie AI</span>
            </div>
            <p className="text-xs text-foreground/85 leading-snug font-medium mt-0.5">
              {isSignup
                ? "مرحباً بك! أنا رفيقك الدراسي لمساعدتك في تنظيم موادك والتفوق."
                : "أهلاً بعودتك! سجل دخولك لمتابعة خطتك الدراسية وامتحاناتك."}
            </p>
            <button
              onClick={() => {
                playWaterDropSound();
                setExpanded((prev) => !prev);
              }}
              className="mt-1.5 text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>{expanded ? "إخفاء الدليل ▲" : "ماذا يفعل StudyGenie؟ ▼"}</span>
            </button>
          </div>
        </div>

        {/* Expandable Feature Tour on Mobile */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <feature.icon className="h-3.5 w-3.5 text-primary" />
                <span>{feature.title}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                {featureIdx + 1} / {TOUR_FEATURES.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-1">
                {TOUR_FEATURES.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      featureIdx === i ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() => setFeatureIdx((i) => (i + 1) % TOUR_FEATURES.length)}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                الميزة التالية ❯
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
