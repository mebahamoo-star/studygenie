/**
 * genie-scenarios.ts
 * ------------------
 * Interactive Genie scenarios and element-anchored tips.
 *
 * Each tip has:
 *  - messageKey: key inside i18n
 *  - pose: "idle" | "high" | "studying" | "low"
 *  - preferred placement side: "top" | "bottom" | "start" | "end" | "auto"
 */

export interface ElementGenieTip {
  id: string;
  messageKey: string;
  pose: "idle" | "high" | "studying" | "low";
  side?: "top" | "bottom" | "start" | "end" | "auto";
}

export const GENIE_TIPS: Record<string, ElementGenieTip> = {
  // Hero Page Tips
  "hero-topics-card": {
    id: "hero-topics-card",
    messageKey: "genie.hero.topicsTip",
    pose: "studying",
    side: "start",
  },
  "hero-cta-button": {
    id: "hero-cta-button",
    messageKey: "genie.hero.ctaTip",
    pose: "high",
    side: "top",
  },
  "hero-try-again": {
    id: "hero-try-again",
    messageKey: "genie.hero.replayTip",
    pose: "idle",
    side: "top",
  },

  // How It Works Page Tips
  "how-step-1": {
    id: "how-step-1",
    messageKey: "genie.how.step1Tip",
    pose: "idle",
    side: "top",
  },
  "how-step-2": {
    id: "how-step-2",
    messageKey: "genie.how.step2Tip",
    pose: "studying",
    side: "top",
  },
  "how-step-3": {
    id: "how-step-3",
    messageKey: "genie.how.step3Tip",
    pose: "high",
    side: "top",
  },

  // Features Bento Page Tips
  "bento-plan": {
    id: "bento-plan",
    messageKey: "genie.bento.planTip",
    pose: "studying",
    side: "top",
  },
  "bento-flashcards": {
    id: "bento-flashcards",
    messageKey: "genie.bento.flashcardsTip",
    pose: "high",
    side: "top",
  },
  "bento-streak": {
    id: "bento-streak",
    messageKey: "genie.bento.streakTip",
    pose: "high",
    side: "top",
  },
  "bento-survival": {
    id: "bento-survival",
    messageKey: "genie.bento.survivalTip",
    pose: "studying",
    side: "top",
  },
  "bento-pomodoro": {
    id: "bento-pomodoro",
    messageKey: "genie.bento.pomodoroTip",
    pose: "idle",
    side: "top",
  },
  "bento-leaderboard": {
    id: "bento-leaderboard",
    messageKey: "genie.bento.leaderboardTip",
    pose: "high",
    side: "top",
  },
};
