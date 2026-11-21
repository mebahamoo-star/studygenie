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
  | "idle"
  | "feature";

export interface GenieAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export interface GenieMessage {
  id: string;
  title?: string;
  text: string;
  pose: GeniePose;
  type: GenieMessageType;
  duration?: number; // ms, 0 = sticky until dismissed
  actions?: GenieAction[];
}

interface GenieCtx {
  message: GenieMessage | null;
  isVisible: boolean;
  showMessage: (msg: Omit<GenieMessage, "id">) => void;
  dismiss: () => void;
  triggerPageWelcome: (page: string, userName?: string) => void;
  explainPage: (page: string, userName?: string) => void;
  pokeGenie: (currentPage?: string) => void;
  triggerCelebration: (text: string, title?: string) => void;
  triggerEncourage: (text: string) => void;
  triggerTip: (text: string) => void;
  triggerWarn: (text: string) => void;
}

const GenieCtxRef = createContext<GenieCtx | null>(null);

// ─── Rich Contextual Page Guides ─────────────────────────────────────────────

interface PageGuideData {
  title: string;
  text: string;
  pose: GeniePose;
  type: GenieMessageType;
  duration?: number;
  tips: string[];
  capabilities: string[];
}

const PAGE_GUIDES: Record<string, (name: string) => PageGuideData> = {
  "/login": () => ({
    title: "شاشة تسجيل الدخول 🔑",
    text: "أهلاً بك في بوابة تسجيل الدخول إلى StudyGenie! هنا يمكنك الدخول إلى حسابك الدراسي لمتابعة خطتك وامتحاناتك وبطاقاتك وموادك.",
    pose: "mid",
    type: "guide",
    duration: 9000,
    capabilities: [
      "إدخال البريد الإلكتروني وكلمة المرور للدخول المباشر",
      "تسجيل الدخول السريع عبر حساب Google أو Microsoft بنقرة واحدة",
      "تفعيل خيار 'تذكرني' للبقاء متصلاً دائماً في المرات القادمة",
      "استعادة كلمة المرور عبر رابط 'نسيت كلمة المرور؟' في حال فقدانها",
      "الضغط على 'إنشاء حساب جديد' إن كنت طالباً جديداً للانطلاق مجاناً",
    ],
    tips: [
      "استخدم بريدك الجامعي إن رغبت في التعرف التلقائي على مواد كليتك وزملائك!",
      "يمكنك التبديل بين الوضع الليلي والنهاري من زر القمر والشمس بالأعلى.",
    ],
  }),

  "/signup": () => ({
    title: "إنشاء حساب دراسي جديد ✨",
    text: "مرحباً بك في عائلة StudyGenie! إنشاء حسابك هو الخطوة الأولى نحو تنظيم دراستك، تلخيص سلايداتك، والتفوق في امتحاناتك.",
    pose: "high",
    type: "welcome",
    duration: 9000,
    capabilities: [
      "تسجيل اسمك وبريدك الإلكتروني وكلمة مرور آمنة",
      "التسجيل الفوري بنقرة واحدة باستخدام Google أو Microsoft",
      "ربط حسابك بجامعتك وكليتك وتخصصك الأكاديمي",
      "بدء بناء خططك الدراسية وحزم البطاقات والاختبارات فوراً وبشكل مجاني",
    ],
    tips: [
      "التسجيل مجاني تماماً ولا يتطلب سوى دقيقة واحدة لتكون كل أدوات الدراسة بين يديك!",
    ],
  }),

  "/forgot-password": () => ({
    title: "استعادة كلمة المرور 🔐",
    text: "لا تقلق! أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور فوراً لتتمكن من العودة لدراستك.",
    pose: "studying",
    type: "tip",
    duration: 8000,
    capabilities: [
      "إدخال البريد الإلكتروني المسجل في حسابك",
      "استلام رابط آمن لتجديد كلمة السر خلال ثوانٍ",
      "العودة لشاشة الدخول بمجرد الانتهاء",
    ],
    tips: [
      "إذا لم تصلك الرسالة خلال دقيقة، تحقق من مجلد الرسائل غير المرغوبة (Spam).",
    ],
  }),

  "/": () => ({
    title: "مرحباً بك في StudyGenie! 🧞‍♂️✨",
    text: "منصة المذاكرة الذكية المدعومة بالذكاء الاصطناعي لطلاب الجامعات! نساعدك في تنظيم وقتك، تلخيص المحاضرات، واجتياز الامتحانات بأعلى الدرجات.",
    pose: "high",
    type: "welcome",
    duration: 9000,
    capabilities: [
      "تحويل سلايدات المحاضرات والـ PDF إلى بطاقات استرجاع نشط وملخصات ذكية",
      "إنشاء جداول وخطط دراسية متوازنة بتوزيع تنازلي ذكي حتى يوم الامتحان",
      "قاعة اختبارات تجريبية تفاعلية بأسئلة اختيار من متعدد وإجابات قصيرة",
      "مؤقت بومودورو للتركيز العميق ونظام تنافسي إيجابي مع زملاء دفعتك",
    ],
    tips: [
      "اضغط على 'ابدأ الآن' أو 'تسجيل الدخول' للبدء في تنظيم موادك فوراً!",
    ],
  }),

  "/dashboard": (n) => ({
    title: "لوحة التحكم ومركز قيادتك 🧭",
    text: `أهلاً بك يا ${n}! هذه لوحة التحكم الرئيسية لمتابعة إنجازك اليومي. هنا ترى تقدمك ومهامك المتبقية ومواعيد امتحاناتك القادمة.`,
    pose: "high",
    type: "guide",
    duration: 9000,
    capabilities: [
      "متابعة المهام اليومية وإكمالها لكسب نقاط XP",
      "مراقبة شريط الـ Streak للحفاظ على عادتك اليومية",
      "عداد تنازلي ذكي لكل امتحان حسب مدى خطورته",
      "الانضمام لتحديات المواد مع زملائك بالجامعة",
    ],
    tips: [
      "إكمال مهمة واحدة فقط في اليوم يكفي للحفاظ على الـ Streak مستمراً!",
      "اضغط على أي مادة للانضمام إلى التحدي وتوليد خطة دراسية فورية.",
    ],
  }),

  "/courses": (n) => ({
    title: "مكتبة المواد والمقررات 📚",
    text: `هنا مستودع موادك الدراسية يا ${n}! يمكنك استعراض المواد، رفع ملفات المحاضرات، واستخراج الفصول الذكية.`,
    pose: "studying",
    type: "feature",
    duration: 9000,
    capabilities: [
      "إضافة المقررات الدراسية الخاصة بجامعتك وكليتك",
      "رفع السلايدات والكتب بتنسيق PDF أو PPTX",
      "استخراج الفصول والمواضيع الرئيسية بالذكاء الاصطناعي",
      "توليد حزم دراسية كاملة (بطاقات + اختبارات) بضغطة زر",
    ],
    tips: [
      "كلما كان المحتوى المرفوع منظماً، زادت دقة البطاقات والأسئلة المولدة!",
      "يمكنك فحص حالة المادة للتأكد من جاهزية الخطة الدراسية.",
    ],
  }),

  "/plan": (n) => ({
    title: "جدولك الدراسي المخصص 🗓️",
    text: `هذه خطتك الدراسية الذكية! تم تصميمها لتوزيع الجهد بالتساوي حتى موعد الاختبار، مع مراعاة أيام المراجعة والراحة.`,
    pose: "mid",
    type: "guide",
    duration: 9000,
    capabilities: [
      "توزيع الفصول الدراسية يوماً بيوم بناءً على موعد الامتحان",
      "تخصيص أوقات المراجعة المكثفة قبل الامتحان بأيام",
      "تعديل عدد ساعات الدراسة اليومية وأيام الإجازة",
    ],
    tips: [
      "الدراسة لساعتين بتركيز أفضل بكثير من الدراسة الطويلة المشتتة.",
      "تأكد من تأكيد المهام اليومية في الخطة لتسجيل نقاط التقدم.",
    ],
  }),

  "/flashcards": (n) => ({
    title: "البطاقات التعليمية والاسترجاع النشط 🃏",
    text: `مرحباً بك في أقوى تقنية لتثبيت الحفظ! نظام البطاقات التعليمية يعتمد على الاسترجاع النشط والتكرار المتباعد.`,
    pose: "studying",
    type: "feature",
    duration: 9000,
    capabilities: [
      "قلب البطاقات لاختبار تذكرك للمعلومة قبل رؤية الإجابة",
      "تصنيف سهولة وصعوبة كل بطاقة لتكرار الصعب منها",
      "كسب نقاط XP فورية مع كل بطاقة تتقنها",
    ],
    tips: [
      "حاول نطق الإجابة بصوت عالٍ أو كتابتها قبل قلب البطاقة لرفع جودة التذكر!",
      "راجع البطاقات الصعبة في الصباح الباكر أو قبل النوم.",
    ],
  }),

  "/quiz": (n) => ({
    title: "قاعة الاختبارات والتقييم الذاتي 🧠",
    text: `وقت التحدي الحقيقي! هنا تختبر مدى فهمك واستيعابك للمادة قبل دخول الامتحان الفعلي.`,
    pose: "high",
    type: "feature",
    duration: 9000,
    capabilities: [
      "أسئلة اختيار من متعدد، صح وخطأ، وأسئلة إجابة قصيرة",
      "تصحيح فوري مع شرح وافٍ لسبب صحة كل إجابة",
      "حفظ درجاتك السابقة وتتبع تطور مستواك مع الوقت",
    ],
    tips: [
      "الخطأ في الاختبار التجريبي هو أفضل فرصة لمعرفة ثغراتك وسدها!",
      "الحصول على 80%+ في الكويز يمنحك نقاط مضاعفة ووسام التميز.",
    ],
  }),

  "/pomodoro": (n) => ({
    title: "مؤقت بومودورو للتركيز العميق ⏱️",
    text: `تخلص من التسويف والتشتت! تقنية بومودورو تقسم وقتك إلى جلسات تركيز مكثفة مدتها 25 دقيقة تفصل بينها فترات راحة قصيرة.`,
    pose: "mid",
    type: "guide",
    duration: 9000,
    capabilities: [
      "جلسة تركيز 25 دقيقة بدون أي مقاطعات",
      "استراحة 5 دقائق لتنشيط الذهن وشرب الماء",
      "استراحة طويلة بعد كل 4 جلسات دراسية",
    ],
    tips: [
      "أبعد الهاتف وضع وضع الطيران أثناء جلسة الـ 25 دقيقة.",
      "استغل الاستراحة للنهوض والحركة بعيداً عن الشاشة.",
    ],
  }),

  "/leaderboard": (n) => ({
    title: "لوحة الشرف والمتصدرين 🏆",
    text: `ساحة المنافسة الإيجابية! تعرف على ترتيبك بين طلبة كليتك وجامعتك وتحدى نفسك للوصول للقمة.`,
    pose: "high",
    type: "encourage",
    duration: 8000,
    capabilities: [
      "عرض الترتيب العام حسب نقاط الـ XP المكتسبة",
      "منافسة أسبوعية مع شارات وجوائز معنوية للمراكز الأولى",
      "تصنيف بحسب التخصص والجامعة",
    ],
    tips: [
      "الاستمرارية اليومية وحل الاختبارات تمنحك أكبر كمية من النقاط للصعود في الترتيب!",
    ],
  }),

  "/profile": (n) => ({
    title: "ملفك الأكاديمي وإنجازاتك 👤",
    text: `سجلك الشخصي الذي يوثق رحلتك! هنا ترى ملخص ساعات دراستك، أوسمتك، ومستواك الأكاديمي.`,
    pose: "idle",
    type: "guide",
    duration: 7000,
    capabilities: [
      "مراجعة إجمالي ساعات الدراسة ونقاط الخبرة XP",
      "استعراض الأوسمة المحققة وشارات التميز",
      "التحقق من بيانات الجامعة والكلية المسجلة",
    ],
    tips: [
      "كل وسام تحققه يعكس مهارة جديدة التزمت بها!",
    ],
  }),

  "/settings": (n) => ({
    title: "إعدادات التجربة الدراسية ⚙️",
    text: `خصص رفيقك الدراسي StudyGenie ليناسب أسلوب حياتك تماماً!`,
    pose: "idle",
    type: "tip",
    duration: 7000,
    capabilities: [
      "تعديل عدد ساعات الدراسة اليومية المفضلة",
      "التبديل بين الوضع الليلي (Dark Mode) والنهاري",
      "إدارة تنبيهات مواعيد المراجعة والامتحانات",
    ],
    tips: [
      "الوضع الليلي يساعد على راحة العين أثناء جلسات الدراسة المسائية.",
    ],
  }),

  "/exam-checkin": (n) => ({
    title: "تسجيل جدول الامتحانات 📝",
    text: `الخطوة الأولى للنجاح! حدد مواعيد امتحاناتك لنبني لك جدولاً زمنياً يحميك من تراكم المواد.`,
    pose: "studying",
    type: "guide",
    duration: 8000,
    capabilities: [
      "إدخال مواعيد الامتحانات النصفية والنهائية",
      "حساب الأيام المتبقية تلقائياً وتفعيل شريط التحذير",
    ],
    tips: [
      "حتى لو كان الامتحان بعد شهر، إضافته مبكراً تمنحك خطة مريحة بدون ضغط!",
    ],
  }),

  "/onboarding": () => ({
    title: "إعداد بياناتك الجامعية 🎓",
    text: "خطوة البداية! حدد جامعتك وكليتك وتخصصك الأكاديمي لنجهز لك المقررات والخدمات المناسبة لدراستك.",
    pose: "high",
    type: "welcome",
    duration: 8000,
    capabilities: [
      "اختيار جامعتك وكليتك وسنتك الدراسية",
      "تخصيص المواد الأكاديمية تلقائياً",
    ],
    tips: [
      "تأكد من اختيار الكلية بدقة لتجد المقررات المشتركة مع زملائك!",
    ],
  }),
};

// ─── Path Resolver ────────────────────────────────────────────────────────────

function resolveGuideKey(path: string): string | null {
  if (!path) return null;
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";

  // 1. Direct exact match
  if (PAGE_GUIDES[clean]) return clean;

  // 2. Prefix matching ordered by longest key to shortest
  const sortedKeys = Object.keys(PAGE_GUIDES).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (k === "/") continue;
    if (clean.startsWith(k)) return k;
  }

  // 3. Root landing page
  if (clean === "/") return "/";

  return null;
}

// ─── Playful Poking & Dialogue Lines ─────────────────────────────────────────

const POKE_RESPONSES = [
  { text: "أهلاً بك! معك الجني السحري 🧞‍♂️✨ جاهز للدراسة والتألق؟", pose: "high" as GeniePose },
  { text: "تذكر: خطوة صغيرة يومياً تبني مستقبلك الكبير! أنا معك بكل خطوة 💪", pose: "mid" as GeniePose },
  { text: "هل واجهت مفهوماً صعباً؟ افتح البطاقات أو الكويز وسأساعدك تثبته في ثوانٍ!", pose: "studying" as GeniePose },
  { text: "سر التفوق ليس السهر الطويل، بل الاستمرارية الذكية وفترات الراحة المنظمة ⏱️", pose: "studying" as GeniePose },
  { text: "إذا محتار شو تعمل بهي الصفحة، اضغط 'اشرح لي الصفحة' لأعطيك كل التفاصيل! 🧭", pose: "mid" as GeniePose },
  { text: "أنا فخور بجهدك والتزامك! يلا نكسب نقاط XP جديدة اليوم 🌟", pose: "high" as GeniePose },
];

// ─── Provider Implementation ─────────────────────────────────────────────────

export function GenieProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<GenieMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownPagesRef = useRef<Set<string>>(new Set());
  const pokeIndexRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setIsVisible(false);
    setTimeout(() => setMessage(null), 300);
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

  const explainPage = useCallback(
    (page: string, userName?: string) => {
      const n = userName ? userName.split(" ")[0] : "يا صديقي";
      const key = resolveGuideKey(page);

      if (!key || !PAGE_GUIDES[key]) {
        // Fallback for general pages (admin or custom routes)
        showMessage({
          title: "رفيقك الدراسي StudyGenie 🧞‍♂️",
          text: `أهلاً بك يا ${n}! أنا جنيك الدراسي ومساعدك في المنصة. إذا كان لديك أي استفسار أو احتجت نصيحة دراسية أنا معك دائماً!`,
          pose: "idle",
          type: "guide",
          duration: 7000,
          actions: [
            {
              label: "أعطني نصيحة دراسية 💡",
              onClick: () => {
                showMessage({
                  title: "نصيحة دراسية 💡",
                  text: "💡 الاستمرارية الهادئة والتكرار المتباعد سر تثبيت أي مادة معقدة!",
                  pose: "studying",
                  type: "tip",
                  duration: 6000,
                });
              },
            },
            {
              label: "فهمت عليك 👍",
              onClick: () => dismiss(),
              variant: "primary",
            },
          ],
        });
        return;
      }

      const data = PAGE_GUIDES[key](n);
      const bulletPoints = data.capabilities.map((c) => `• ${c}`).join("\n");
      const fullText = `${data.text}\n\nماذا يمكنك أن تفعل هنا:\n${bulletPoints}`;

      showMessage({
        title: data.title,
        text: fullText,
        pose: data.pose,
        type: data.type,
        duration: 0, // sticky until user interacts
        actions: [
          {
            label: "💡 أعطني نصيحة",
            onClick: () => {
              const tip = data.tips[Math.floor(Math.random() * data.tips.length)];
              showMessage({
                title: "نصيحة سريعة من الجني 💡",
                text: tip,
                pose: "studying",
                type: "tip",
                duration: 7000,
              });
            },
          },
          {
            label: "فهمت عليك 👍",
            onClick: () => dismiss(),
            variant: "primary",
          },
        ],
      });
    },
    [showMessage, dismiss]
  );

  const triggerPageWelcome = useCallback(
    (page: string, userName?: string) => {
      // Don't auto-pop unsolicited welcome dialogs on login/signup to avoid cluttering forms
      if (page.startsWith("/login") || page.startsWith("/signup") || page.startsWith("/forgot-password")) {
        return;
      }

      const key = `${page}-${userName || ""}`;
      if (shownPagesRef.current.has(key)) return;
      shownPagesRef.current.add(key);

      const guideKey = resolveGuideKey(page);
      if (!guideKey || !PAGE_GUIDES[guideKey]) return;

      const n = userName ? userName.split(" ")[0] : "أيها العالم";
      const guide = PAGE_GUIDES[guideKey](n);

      setTimeout(() => {
        showMessage({
          title: guide.title,
          text: guide.text,
          pose: guide.pose,
          type: guide.type,
          duration: guide.duration || 8000,
          actions: [
            {
              label: "ماذا أستطيع أن أفعل هنا؟ 🧭",
              onClick: () => explainPage(page, userName),
            },
            {
              label: "شكراً يا جني ✨",
              onClick: () => dismiss(),
              variant: "primary",
            },
          ],
        });
      }, 700);
    },
    [showMessage, explainPage, dismiss]
  );

  const pokeGenie = useCallback(
    (currentPage?: string) => {
      const idx = pokeIndexRef.current % POKE_RESPONSES.length;
      pokeIndexRef.current++;
      const resp = POKE_RESPONSES[idx];

      showMessage({
        title: "حديث مع الجني 🧞‍♂️",
        text: resp.text,
        pose: resp.pose,
        type: "encourage",
        duration: 8000,
        actions: currentPage
          ? [
              {
                label: "اشرح لي هذه الصفحة 📖",
                onClick: () => explainPage(currentPage),
              },
              {
                label: "أحسنت! 🚀",
                onClick: () => dismiss(),
              },
            ]
          : undefined,
      });
    },
    [showMessage, explainPage, dismiss]
  );

  const triggerCelebration = useCallback(
    (text: string, title?: string) => {
      showMessage({
        title: title || "إنجاز رائع! 🎉",
        text,
        pose: "high",
        type: "celebrate",
        duration: 7000,
      });
    },
    [showMessage]
  );

  const triggerEncourage = useCallback(
    (text: string) => {
      showMessage({
        title: "واصل يا بطل! 💪",
        text,
        pose: "mid",
        type: "encourage",
        duration: 6500,
      });
    },
    [showMessage]
  );

  const triggerTip = useCallback(
    (text: string) => {
      showMessage({
        title: "نصيحة دراسية 💡",
        text,
        pose: "studying",
        type: "tip",
        duration: 7000,
      });
    },
    [showMessage]
  );

  const triggerWarn = useCallback(
    (text: string) => {
      showMessage({
        title: "تنبيه هام ⚠️",
        text,
        pose: "low",
        type: "warn",
        duration: 8000,
      });
    },
    [showMessage]
  );

  return (
    <GenieCtxRef.Provider
      value={{
        message,
        isVisible,
        showMessage,
        dismiss,
        triggerPageWelcome,
        explainPage,
        pokeGenie,
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
