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
import { useOptionalApp } from "@/lib/app-state";

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

const GLOBAL_GENIE_CTX_KEY = "__studygenie_genie_ctx__";
const GenieCtxRef: ReturnType<typeof createContext<GenieCtx | null>> =
  (globalThis as Record<string, any>)[GLOBAL_GENIE_CTX_KEY] ??
  ((globalThis as Record<string, any>)[GLOBAL_GENIE_CTX_KEY] = createContext<GenieCtx | null>(null));

// ─── Rich Contextual Page Guides (Bilingual AR / EN) ─────────────────────────

interface PageGuideData {
  title: string;
  text: string;
  pose: GeniePose;
  type: GenieMessageType;
  duration?: number;
  tips: string[];
  capabilities: string[];
}

const PAGE_GUIDES_AR: Record<string, (name: string) => PageGuideData> = {
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

  "/plan": () => ({
    title: "جدولك الدراسي المخصص 🗓️",
    text: "هذه خطتك الدراسية الذكية! تم تصميمها لتوزيع الجهد بالتساوي حتى موعد الاختبار، مع مراعاة أيام المراجعة والراحة.",
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

  "/flashcards": () => ({
    title: "البطاقات التعليمية والاسترجاع النشط 🃏",
    text: "مرحباً بك في أقوى تقنية لتثبيت الحفظ! نظام البطاقات التعليمية يعتمد على الاسترجاع النشط والتكرار المتباعد.",
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

  "/quiz": () => ({
    title: "قاعة الاختبارات والتقييم الذاتي 🧠",
    text: "وقت التحدي الحقيقي! هنا تختبر مدى فهمك واستيعابك للمادة قبل دخول الامتحان الفعلي.",
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

  "/pomodoro": () => ({
    title: "مؤقت بومودورو للتركيز العميق ⏱️",
    text: "تخلص من التسويف والتشتت! تقنية بومودورو تقسم وقتك إلى جلسات تركيز مكثفة مدتها 25 دقيقة تفصل بينها فترات راحة قصيرة.",
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

  "/leaderboard": () => ({
    title: "لوحة الشرف والمتصدرين 🏆",
    text: "ساحة المنافسة الإيجابية! تعرف على ترتيبك بين طلبة كليتك وجامعتك وتحدى نفسك للوصول للقمة.",
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

  "/profile": () => ({
    title: "ملفك الأكاديمي وإنجازاتك 👤",
    text: "سجلك الشخصي الذي يوثق رحلتك! هنا ترى ملخص ساعات دراستك، أوسمتك، ومستواك الأكاديمي.",
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

  "/settings": () => ({
    title: "إعدادات التجربة الدراسية ⚙️",
    text: "خصص رفيقك الدراسي StudyGenie ليناسب أسلوب حياتك تماماً!",
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

  "/exam-checkin": () => ({
    title: "تسجيل جدول الامتحانات 📝",
    text: "الخطوة الأولى للنجاح! حدد مواعيد امتحاناتك لنبني لك جدولاً زمنياً يحميك من تراكم المواد.",
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

const PAGE_GUIDES_EN: Record<string, (name: string) => PageGuideData> = {
  "/login": () => ({
    title: "Sign In Screen 🔑",
    text: "Welcome to the StudyGenie sign-in portal! Log in to access your study plan, upcoming exams, flashcards, and courses.",
    pose: "mid",
    type: "guide",
    duration: 9000,
    capabilities: [
      "Sign in directly with your email and password",
      "One-click sign in with Google or Microsoft",
      "Enable 'Remember me' to stay signed in on this device",
      "Reset a forgotten password via the 'Forgot password?' link",
      "Switch to 'Create account' if you're new and want to start for free",
    ],
    tips: [
      "Use your university email to automatically match your college courses and peers!",
      "You can toggle dark/light mode or switch language from the top bar.",
    ],
  }),

  "/signup": () => ({
    title: "Create Your Study Account ✨",
    text: "Welcome to StudyGenie! Creating your account is the first step toward organizing your courses, summarizing slides, and acing your exams.",
    pose: "high",
    type: "welcome",
    duration: 9000,
    capabilities: [
      "Register with your name, email, and a secure password",
      "Instant one-click sign up using Google or Microsoft",
      "Link your account to your university, faculty, and major",
      "Start building study plans, flashcards, and quizzes immediately for free",
    ],
    tips: [
      "Signing up is completely free and takes less than a minute!",
    ],
  }),

  "/forgot-password": () => ({
    title: "Password Recovery 🔐",
    text: "No worries! Enter your email address and we'll send you a secure link to reset your password right away.",
    pose: "studying",
    type: "tip",
    duration: 8000,
    capabilities: [
      "Enter the email address registered to your account",
      "Receive a secure password reset link within seconds",
      "Return to the login screen as soon as you're done",
    ],
    tips: [
      "If you don't see the email within a minute, check your Spam/Junk folder.",
    ],
  }),

  "/": () => ({
    title: "Welcome to StudyGenie! 🧞‍♂️✨",
    text: "Your AI-powered smart study companion for university students! Organize your time, summarize lectures, and ace your exams.",
    pose: "high",
    type: "welcome",
    duration: 9000,
    capabilities: [
      "Turn lecture slides & PDFs into active-recall flashcards and smart summaries",
      "Build balanced daily study plans with a smart countdown to exam day",
      "Practice in an interactive quiz arena with MCQs and short-answer questions",
      "Stay focused with a Pomodoro timer and friendly leaderboard competition",
    ],
    tips: [
      "Click 'Get Started' or 'Sign In' to start organizing your courses right away!",
    ],
  }),

  "/dashboard": (n) => ({
    title: "Dashboard & Command Center 🧭",
    text: `Welcome back, ${n}! This is your main dashboard to track daily progress, remaining tasks, and upcoming exam countdowns.`,
    pose: "high",
    type: "guide",
    duration: 9000,
    capabilities: [
      "Track and complete daily tasks to earn XP points",
      "Monitor your daily Streak bar to build a consistent habit",
      "View smart countdowns for each upcoming exam by urgency",
      "Join course challenges with classmates at your university",
    ],
    tips: [
      "Completing just one task a day keeps your Streak alive!",
      "Click any course to join the challenge and generate an instant study plan.",
    ],
  }),

  "/courses": (n) => ({
    title: "Courses & Materials Library 📚",
    text: `Here is your course hub, ${n}! Browse your courses, upload lecture files, and extract smart chapters with AI.`,
    pose: "studying",
    type: "feature",
    duration: 9000,
    capabilities: [
      "Add courses tailored to your university and faculty",
      "Upload lecture slides and textbooks in PDF or PPTX format",
      "Extract chapters and key topics automatically with AI",
      "Generate complete study packs (flashcards + quizzes) in one click",
    ],
    tips: [
      "The cleaner your uploaded slides, the more accurate your generated cards and questions!",
      "Check course status anytime to make sure your study plan is ready.",
    ],
  }),

  "/plan": () => ({
    title: "Your Personalized Study Plan 🗓️",
    text: "Here is your smart study schedule! It distributes your workload evenly until exam day while leaving room for review and rest.",
    pose: "mid",
    type: "guide",
    duration: 9000,
    capabilities: [
      "Spread chapters day by day based on your exam dates",
      "Reserve focused review blocks in the final days before exams",
      "Adjust daily study hours and rest days to fit your routine",
    ],
    tips: [
      "Two focused hours beat six distracted hours every time.",
      "Check off daily tasks in your plan to log progress and earn XP.",
    ],
  }),

  "/flashcards": () => ({
    title: "Flashcards & Active Recall 🃏",
    text: "Welcome to the most effective way to lock in memory! Flashcards use active recall and spaced repetition.",
    pose: "studying",
    type: "feature",
    duration: 9000,
    capabilities: [
      "Flip cards to test your memory before revealing the answer",
      "Rate card difficulty so harder concepts reappear more often",
      "Earn instant XP with every card you master",
    ],
    tips: [
      "Try saying or writing the answer out loud before flipping the card!",
      "Review tricky cards in the morning or right before sleep for stronger retention.",
    ],
  }),

  "/quiz": () => ({
    title: "Quiz Arena & Self-Assessment 🧠",
    text: "Challenge time! Test how well you truly understand the material before walking into the real exam.",
    pose: "high",
    type: "feature",
    duration: 9000,
    capabilities: [
      "Practice with multiple-choice, true/false, and short-answer questions",
      "Get instant grading with clear explanations for every answer",
      "Save past scores and track your improvement over time",
    ],
    tips: [
      "Every mistake in a practice quiz is a gap caught early before exam day!",
      "Scoring 80%+ earns bonus XP and unlocks mastery badges.",
    ],
  }),

  "/pomodoro": () => ({
    title: "Pomodoro Deep Focus Timer ⏱️",
    text: "Beat procrastination and distractions! Pomodoro splits your study time into 25-minute deep focus sprints with short breaks.",
    pose: "mid",
    type: "guide",
    duration: 9000,
    capabilities: [
      "25-minute distraction-free focus sessions",
      "5-minute breaks to refresh your mind and hydrate",
      "Longer break after every 4 completed focus sessions",
    ],
    tips: [
      "Put your phone on airplane mode during each 25-minute sprint.",
      "Use your 5-minute break to stand up and step away from the screen.",
    ],
  }),

  "/leaderboard": () => ({
    title: "Leaderboard & Hall of Fame 🏆",
    text: "Friendly competition! See how you rank among students in your faculty and university, and push yourself to the top.",
    pose: "high",
    type: "encourage",
    duration: 8000,
    capabilities: [
      "View overall rankings by total XP earned",
      "Compete weekly for top spots and achievement badges",
      "Filter rankings by major and university",
    ],
    tips: [
      "Daily consistency and quizzes give you the fastest XP boost up the ranks!",
    ],
  }),

  "/profile": () => ({
    title: "Your Academic Profile & Achievements 👤",
    text: "Your personal journey log! View your total study hours, earned badges, and academic level.",
    pose: "idle",
    type: "guide",
    duration: 7000,
    capabilities: [
      "Review total study hours and experience points (XP)",
      "Browse unlocked badges and achievement milestones",
      "Verify your university and faculty details",
    ],
    tips: [
      "Every badge reflects a real study habit you built!",
    ],
  }),

  "/settings": () => ({
    title: "Study Experience Settings ⚙️",
    text: "Customize StudyGenie to match your study style, language, and daily schedule!",
    pose: "idle",
    type: "tip",
    duration: 7000,
    capabilities: [
      "Adjust your preferred daily study hours",
      "Switch between Dark Mode, Light Mode, and language",
      "Manage exam and review reminder notifications",
    ],
    tips: [
      "Dark Mode helps reduce eye strain during late-night study sessions.",
    ],
  }),

  "/exam-checkin": () => ({
    title: "Exam Schedule Check-In 📝",
    text: "First step to success! Enter your exam dates so we can build a timeline that prevents last-minute cramming.",
    pose: "studying",
    type: "guide",
    duration: 8000,
    capabilities: [
      "Add midterm and final exam dates",
      "Automatically calculate days left and activate urgency alerts",
    ],
    tips: [
      "Even if an exam is a month away, adding it early gives you a stress-free plan!",
    ],
  }),

  "/onboarding": () => ({
    title: "University Profile Setup 🎓",
    text: "Let's get started! Choose your university, faculty, and major so we can tailor courses and tools for your studies.",
    pose: "high",
    type: "welcome",
    duration: 8000,
    capabilities: [
      "Select your university, faculty, and academic year",
      "Auto-personalize your recommended courses",
    ],
    tips: [
      "Make sure to pick your exact faculty so you can see shared courses with classmates!",
    ],
  }),
};

// ─── Path Resolver ────────────────────────────────────────────────────────────

function resolveGuideKey(path: string, guides: Record<string, (name: string) => PageGuideData>): string | null {
  if (!path) return null;
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";

  // 1. Direct exact match
  if (guides[clean]) return clean;

  // 2. Prefix matching ordered by longest key to shortest
  const sortedKeys = Object.keys(guides).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (k === "/") continue;
    if (clean.startsWith(k)) return k;
  }

  // 3. Root landing page
  if (clean === "/") return "/";

  return null;
}

// ─── Playful Poking & Dialogue Lines ─────────────────────────────────────────

const POKE_RESPONSES_AR = [
  { text: "أهلاً بك! معك الجني السحري 🧞‍♂️✨ جاهز للدراسة والتألق؟", pose: "high" as GeniePose },
  { text: "تذكر: خطوة صغيرة يومياً تبني مستقبلك الكبير! أنا معك بكل خطوة 💪", pose: "mid" as GeniePose },
  { text: "هل واجهت مفهوماً صعباً؟ افتح البطاقات أو الكويز وسأساعدك تثبته في ثوانٍ!", pose: "studying" as GeniePose },
  { text: "سر التفوق ليس السهر الطويل، بل الاستمرارية الذكية وفترات الراحة المنظمة ⏱️", pose: "studying" as GeniePose },
  { text: "إذا محتار شو تعمل بهي الصفحة، اضغط 'اشرح لي الصفحة' لأعطيك كل التفاصيل! 🧭", pose: "mid" as GeniePose },
  { text: "أنا فخور بجهدك والتزامك! يلا نكسب نقاط XP جديدة اليوم 🌟", pose: "high" as GeniePose },
];

const POKE_RESPONSES_EN = [
  { text: "Hey there! Magic Genie here 🧞‍♂️✨ Ready to study and shine?", pose: "high" as GeniePose },
  { text: "Remember: one small step each day builds your big future! I'm right here with you 💪", pose: "mid" as GeniePose },
  { text: "Stuck on a tough concept? Open Flashcards or Quiz and let's lock it in!", pose: "studying" as GeniePose },
  { text: "Top grades aren't about all-nighters — they're about smart consistency and timed breaks ⏱️", pose: "studying" as GeniePose },
  { text: "Not sure what to do on this page? Click 'Explain this page' and I'll walk you through it! 🧭", pose: "mid" as GeniePose },
  { text: "I'm proud of your effort! Let's earn some fresh XP today 🌟", pose: "high" as GeniePose },
];

// ─── Provider Implementation ─────────────────────────────────────────────────

export function GenieProvider({ children }: { children: ReactNode }) {
  const lang = useOptionalApp()?.lang ?? "en";
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

  // Dismiss any open bubble when language changes so stale-language text isn't left on screen
  useEffect(() => {
    dismiss();
  }, [lang, dismiss]);

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
      const isAr = lang === "ar";
      const guides = isAr ? PAGE_GUIDES_AR : PAGE_GUIDES_EN;
      const n = userName ? userName.split(" ")[0] : isAr ? "يا صديقي" : "friend";
      const key = resolveGuideKey(page, guides);

      if (!key || !guides[key]) {
        showMessage({
          title: isAr ? "رفيقك الدراسي StudyGenie 🧞‍♂️" : "Your StudyGenie Companion 🧞‍♂️",
          text: isAr
            ? `أهلاً بك يا ${n}! أنا جنيك الدراسي ومساعدك في المنصة. إذا كان لديك أي استفسار أو احتجت نصيحة دراسية أنا معك دائماً!`
            : `Hey ${n}! I'm your StudyGenie companion. Anytime you need guidance or a quick study tip, I'm right here!`,
          pose: "idle",
          type: "guide",
          duration: 7000,
          actions: [
            {
              label: isAr ? "أعطني نصيحة دراسية 💡" : "Give me a study tip 💡",
              onClick: () => {
                showMessage({
                  title: isAr ? "نصيحة دراسية 💡" : "Study Tip 💡",
                  text: isAr
                    ? "💡 الاستمرارية الهادئة والتكرار المتباعد سر تثبيت أي مادة معقدة!"
                    : "💡 Steady consistency and spaced repetition are the secret to mastering any tough subject!",
                  pose: "studying",
                  type: "tip",
                  duration: 6000,
                });
              },
            },
            {
              label: isAr ? "فهمت عليك 👍" : "Got it 👍",
              onClick: () => dismiss(),
              variant: "primary",
            },
          ],
        });
        return;
      }

      const data = guides[key](n);
      const bulletPoints = data.capabilities.map((c) => `• ${c}`).join("\n");
      const heading = isAr ? "ماذا يمكنك أن تفعل هنا:" : "What you can do here:";
      const fullText = `${data.text}\n\n${heading}\n${bulletPoints}`;

      showMessage({
        title: data.title,
        text: fullText,
        pose: data.pose,
        type: data.type,
        duration: 0, // sticky until user interacts
        actions: [
          {
            label: isAr ? "💡 أعطني نصيحة" : "💡 Give me a tip",
            onClick: () => {
              const tip = data.tips[Math.floor(Math.random() * data.tips.length)];
              showMessage({
                title: isAr ? "نصيحة سريعة من الجني 💡" : "Quick Genie Tip 💡",
                text: tip,
                pose: "studying",
                type: "tip",
                duration: 7000,
              });
            },
          },
          {
            label: isAr ? "فهمت عليك 👍" : "Got it 👍",
            onClick: () => dismiss(),
            variant: "primary",
          },
        ],
      });
    },
    [lang, showMessage, dismiss]
  );

  const triggerPageWelcome = useCallback(
    (page: string, userName?: string) => {
      // Don't auto-pop unsolicited welcome dialogs on login/signup to avoid cluttering forms
      if (page.startsWith("/login") || page.startsWith("/signup") || page.startsWith("/forgot-password")) {
        return;
      }

      const isAr = lang === "ar";
      const guides = isAr ? PAGE_GUIDES_AR : PAGE_GUIDES_EN;
      const key = `${page}-${userName || ""}-${lang}`;
      if (shownPagesRef.current.has(key)) return;
      shownPagesRef.current.add(key);

      const guideKey = resolveGuideKey(page, guides);
      if (!guideKey || !guides[guideKey]) return;

      const n = userName ? userName.split(" ")[0] : isAr ? "أيها العالم" : "scholar";
      const guide = guides[guideKey](n);

      setTimeout(() => {
        showMessage({
          title: guide.title,
          text: guide.text,
          pose: guide.pose,
          type: guide.type,
          duration: guide.duration || 8000,
          actions: [
            {
              label: isAr ? "ماذا أستطيع أن أفعل هنا؟ 🧭" : "What can I do here? 🧭",
              onClick: () => explainPage(page, userName),
            },
            {
              label: isAr ? "شكراً يا جني ✨" : "Thanks, Genie ✨",
              onClick: () => dismiss(),
              variant: "primary",
            },
          ],
        });
      }, 700);
    },
    [lang, showMessage, explainPage, dismiss]
  );

  const pokeGenie = useCallback(
    (currentPage?: string) => {
      const isAr = lang === "ar";
      const pool = isAr ? POKE_RESPONSES_AR : POKE_RESPONSES_EN;
      const idx = pokeIndexRef.current % pool.length;
      pokeIndexRef.current++;
      const resp = pool[idx];

      showMessage({
        title: isAr ? "حديث مع الجني 🧞‍♂️" : "Chat with Genie 🧞‍♂️",
        text: resp.text,
        pose: resp.pose,
        type: "encourage",
        duration: 8000,
        actions: currentPage
          ? [
              {
                label: isAr ? "اشرح لي هذه الصفحة 📖" : "Explain this page 📖",
                onClick: () => explainPage(currentPage),
              },
              {
                label: isAr ? "أحسنت! 🚀" : "Awesome! 🚀",
                onClick: () => dismiss(),
              },
            ]
          : undefined,
      });
    },
    [lang, showMessage, explainPage, dismiss]
  );

  const triggerCelebration = useCallback(
    (text: string, title?: string) => {
      showMessage({
        title: title || (lang === "ar" ? "إنجاز رائع! 🎉" : "Great Achievement! 🎉"),
        text,
        pose: "high",
        type: "celebrate",
        duration: 7000,
      });
    },
    [lang, showMessage]
  );

  const triggerEncourage = useCallback(
    (text: string) => {
      showMessage({
        title: lang === "ar" ? "واصل يا بطل! 💪" : "Keep Going, Champ! 💪",
        text,
        pose: "mid",
        type: "encourage",
        duration: 6500,
      });
    },
    [lang, showMessage]
  );

  const triggerTip = useCallback(
    (text: string) => {
      showMessage({
        title: lang === "ar" ? "نصيحة دراسية 💡" : "Study Tip 💡",
        text,
        pose: "studying",
        type: "tip",
        duration: 7000,
      });
    },
    [lang, showMessage]
  );

  const triggerWarn = useCallback(
    (text: string) => {
      showMessage({
        title: lang === "ar" ? "تنبيه هام ⚠️" : "Heads Up ⚠️",
        text,
        pose: "low",
        type: "warn",
        duration: 8000,
      });
    },
    [lang, showMessage]
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
