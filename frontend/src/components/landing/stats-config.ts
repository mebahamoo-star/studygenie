/**
 * Configuration for the Stats / Numbers Bar.
 * IMPORTANT: As specified in requirements, fake numbers and made-up testimonials
 * are strictly forbidden. This section is disabled by default (enabled: false)
 * until verified, real production numbers are plugged in.
 */

export interface StatItem {
  id: string;
  value: string;
  labelAr: string;
  labelEn: string;
}

export interface StatsConfig {
  /** Keep disabled by default until real production metrics are available. */
  enabled: boolean;
  items: StatItem[];
}

export const statsConfig: StatsConfig = {
  enabled: false,
  items: [
    {
      id: "active-students",
      value: "--",
      labelAr: "طالب جامعي نشط",
      labelEn: "Active University Students",
    },
    {
      id: "syllabi-processed",
      value: "--",
      labelAr: "منهج دراسي تم تحليله",
      labelEn: "Course Syllabi Analyzed",
    },
    {
      id: "focus-hours",
      value: "--",
      labelAr: "ساعة مذاكرة مركزة",
      labelEn: "Hours of Focused Study",
    },
    {
      id: "colleges",
      value: "--",
      labelAr: "كلية وقسم مشارك",
      labelEn: "Participating Colleges",
    },
  ],
};
