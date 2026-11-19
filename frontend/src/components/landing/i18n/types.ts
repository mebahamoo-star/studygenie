/**
 * types.ts
 * --------
 * Strongly-typed definitions for all StudyGenie Landing translations.
 * Every single piece of user-facing text, label, badge, mock data,
 * and tooltip is defined here.
 *
 * TypeScript enforces that ar.ts and en.ts implement 100% of these keys.
 */

export interface LandingTranslations {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    logIn: string;
    getStarted: string;
    getStartedShort: string;
    switchLang: string;
    switchLangShort: string;
    toggleTheme: string;
    muteSound: string;
    unmuteSound: string;
    toggleGenie: string;
    genieLabel: string;
  };
  common: {
    exampleBadge: string;
    illustrativeExampleBadge: string;
    dismissTip: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    microCopy: string;
    fileName: string;
    analyzedBy: string;
    totalFocusTime: string;
    readyForPlan: string;
    tryAgain: string;
    mockupLabel?: string;
    liveBadge?: string;
    topics: Array<{
      title: string;
      duration: string;
    }>;
  };
  howItWorks: {
    badge: string;
    title: string;
    subtitle: string;
    step1: {
      tag: string;
      title: string;
      desc: string;
      uploadSuccess: string;
      clickToSimulate: string;
      step?: string;
    };
    step2: {
      tag: string;
      title: string;
      desc: string;
      btnLabel: string;
      footerNote: string;
      chapters: string[];
      step?: string;
    };
    step3: {
      tag: string;
      title: string;
      desc: string;
      headerDay: string;
      headerLesson: string;
      headerTime: string;
      addNextDay: string;
      resetSchedule: string;
      rows: Array<{
        day: string;
        topic: string;
        hours: string;
      }>;
      step?: string;
    };
  };
  community: {
    badge: string;
    title: string;
    subtitle: string;
    peerBenefit: string;
    treeTitle: string;
    flow: {
      uni: string;
      college: string;
      course: string;
    };
    mockTree: {
      uniName: string;
      uniSub: string;
      collegeName: string;
      collegeSub: string;
      courseName: string;
      courseSub: string;
    };
    joinCard: {
      badge: string;
      studentsLabel: (count: number) => string;
      courseTitle: string;
      courseDesc: string;
      statusActive: string;
      statusOpen: string;
      btnJoin: string;
      btnJoined: string;
    };
    joinChallenge?: {
      title: string;
      desc: string;
      badge: string;
      instantLabel: string;
      actionText: string;
    };
  };
  bento: {
    badge: string;
    title: string;
    subtitle: string;
    smartPlan: {
      title: string;
      days: string[];
      progressFormat: (completed: number, total: number) => string;
      clickToAdvance: string;
    };
    flashcards: {
      title: string;
      question: string;
      answer: string;
      masteredCount: (count: number) => string;
      tapToFlip: string;
    };
    streak: {
      title: string;
      daysLabel: (days: number) => string;
      dontBreak: string;
      clickToAdd: string;
    };
    survivalMode: {
      title: string;
      highYieldLabel: string;
      activeLabel: string;
      enableLabel: string;
      examPointsNote: string;
      toggleLabel: string;
    };
    pomodoro: {
      title: string;
      sessionNote: string;
      startLabel: string;
      pauseLabel: string;
    };
    leaderboard: {
      title: string;
      students: Array<{ id: string; name: string; pts: number }>;
      competeNote: string;
      swapLabel: string;
    };
    quizzes?: {
      title: string;
      desc: string;
      tag: string;
    };
  };
  showcase: {
    badge: string;
    title: string;
    subtitle: string;
    tabs: {
      dashboard: string;
      plan: string;
      quiz: string;
    };
    dashboardMock: {
      greeting: string;
      nextExam: string;
      streakDays: (days: number) => string;
      progressLabel: string;
      progressValue: string;
      hoursLabel: string;
      hoursValue: string;
      masteredLabel: string;
      masteredValue: string;
    };
    planMock: {
      title: string;
      remainingSessions: (count: number) => string;
      item1Title: string;
      item1Meta: string;
      item2Title: string;
      item2Meta: string;
    };
    quizMock: {
      questionNumber: string;
      pointsBadge: string;
      questionText: string;
      options: Array<{ id: number; text: string; correct: boolean }>;
    };
    footerNote: string;
    slides?: Array<{
      id: string;
      title: string;
      caption: string;
      badge: string;
      previewType: string;
    }>;
  };
  psychology: {
    badge: string;
    title: string;
    subtitle: string;
    lossAversion: {
      scientificPrinciple: string;
      featureName: string;
      explanation: string;
      categoryTag: string;
      streakActiveNote: (days: number) => string;
      skipBtn: string;
      alertTitle: string;
      restoreBtn: string;
      citation: string;
    };
    spacingEffect: {
      scientificPrinciple: string;
      featureName: string;
      explanation: string;
      categoryTag: string;
      tabSpaced: string;
      tabCram: string;
      retentionSpaced: string;
      retentionCram: string;
      descSpaced: string;
      descCram: string;
      citation: string;
    };
    yerkesDodson: {
      scientificPrinciple: string;
      featureName: string;
      explanation: string;
      categoryTag: string;
      pressureLabel: string;
      toggleLabel: string;
      lowLabel: string;
      highLabel: string;
      optimalState: string;
      panicState: string;
      citation: string;
    };
  };
  faq: {
    badge: string;
    title: string;
    subtitle: string;
    answerPanelHeader: string;
    privacyNoticeBadge: string;
    questions: Array<{
      id: string;
      question: string;
      answer: string;
      isPrivacy?: boolean;
    }>;
  };
  finalCta: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    guarantee: string;
    ctaButton?: string;
    loginButton?: string;
  };
  stats?: {
    title: string;
    subtitle?: string;
  };
  footer: {
    tagline: string;
    rights: string;
  };
  genie: {
    hero: {
      welcome: string;
      topicsTip: string;
      ctaTip: string;
      replayTip: string;
    };
    how: {
      guide: string;
      step1Tip: string;
      step2Tip: string;
      step3Tip: string;
    };
    community: {
      tip: string;
    };
    bento: {
      planTip: string;
      flashcardsTip: string;
      streakTip: string;
      survivalTip: string;
      pomodoroTip: string;
      leaderboardTip: string;
    };
    showcase: {
      tip: string;
    };
    psychology: {
      lossTip: string;
      spacingTip: string;
      yerkesTip: string;
    };
    faq: {
      tip: string;
    };
    cta: {
      celebrate: string;
    };
  };
  pager: {
    next: string;
    back: string;
    finish: string;
    pageOf: (current: number, total: number) => string;
  };
}
