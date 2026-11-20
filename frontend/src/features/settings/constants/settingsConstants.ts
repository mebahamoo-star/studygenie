export type SettingsTabId =
  | "profile"
  | "study"
  | "notifications"
  | "privacy"
  | "data";

export const VALID_SETTINGS_TABS: SettingsTabId[] = [
  "profile",
  "study",
  "notifications",
  "privacy",
  "data",
];

export const DEFAULT_SETTINGS_TAB: SettingsTabId = "study";

export function parseSettingsTabFromUrl(pathname: string): SettingsTabId {
  const segments = pathname.split("/").filter(Boolean);
  const settingsIdx = segments.indexOf("settings");
  const candidate =
    settingsIdx !== -1 ? segments[settingsIdx + 1]?.toLowerCase() : undefined;
  if (
    candidate &&
    (VALID_SETTINGS_TABS as string[]).includes(candidate)
  ) {
    return candidate as SettingsTabId;
  }
  return DEFAULT_SETTINGS_TAB;
}

export type SectionId =
  | "profile"
  | "security"
  | "studyPreferences"
  | "notifications"
  | "privacy"
  | "courses"
  | "language"
  | "data";

export type DayOfWeekKey =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface AvailabilityBlock {
  dayOfWeek: DayOfWeekKey;
  startTime: string; // e.g., "06:00"
  endTime: string;   // e.g., "07:00"
}

export interface ProfileSettings {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  universityId: string;
  collegeId: string;
}

export interface StudyPreferencesSettings {
  pomodoroFocusMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroSessionsBeforeLongBreak: number;
  dailyStudyGoalHours: number;
  survivalModeEnabled: boolean;
  survivalModeDaysBeforeExam: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  browserPushEnabled: boolean;
  sessionReminderEnabled: boolean;
  sessionReminderLeadMinutes: 5 | 10 | 30;
  streakReminderEnabled: boolean;
  examCountdownEnabled: boolean;
  newChallengeJoinersEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PrivacyGamificationSettings {
  showOnLeaderboards: boolean;
  useAlias: boolean;
  aliasName: string;
  soundsEnabled: boolean;
  animationsEnabled: boolean;
  genieMascotReactionsEnabled: boolean;
}

export interface LanguageRegionSettings {
  language: "en" | "ar";
  timezone: string;
  timeFormat: "12h" | "24h";
  firstDayOfWeek: "SUNDAY" | "SATURDAY" | "MONDAY";
}

export interface EnrolledCourseItem {
  id: string;
  name: string;
  code: string;
  examDate: string; // YYYY-MM-DD
  progressPercent: number;
  participantsCount: number;
}

export interface UploadedPdfItem {
  id: string;
  name: string;
  courseName: string;
  sizeBytes: number;
  uploadedAt: string; // YYYY-MM-DD
}

export interface UserSettingsPayload {
  profile: ProfileSettings;
  studyPreferences: StudyPreferencesSettings;
  availability: AvailabilityBlock[];
  notifications: NotificationSettings;
  privacy: PrivacyGamificationSettings;
  languageRegion: LanguageRegionSettings;
  pdfs: UploadedPdfItem[];
}

export const AVAILABILITY_DAYS: DayOfWeekKey[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const WEEKDAY_KEYS: DayOfWeekKey[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

// Hourly slots from 06:00 to 24:00 (18 one-hour slots: 6, 7, ..., 23)
export const AVAILABILITY_START_HOUR = 6;
export const AVAILABILITY_END_HOUR = 24;
export const AVAILABILITY_HOURS: number[] = Array.from(
  { length: AVAILABILITY_END_HOUR - AVAILABILITY_START_HOUR },
  (_, index) => AVAILABILITY_START_HOUR + index
);

export const STUDY_LIMITS = {
  FOCUS_MIN: 15,
  FOCUS_MAX: 90,
  FOCUS_STEP: 5,
  SHORT_BREAK_MIN: 3,
  SHORT_BREAK_MAX: 30,
  SHORT_BREAK_STEP: 1,
  LONG_BREAK_MIN: 10,
  LONG_BREAK_MAX: 60,
  LONG_BREAK_STEP: 5,
  SESSIONS_MIN: 2,
  SESSIONS_MAX: 8,
  SESSIONS_STEP: 1,
  DAILY_GOAL_MIN: 1,
  DAILY_GOAL_MAX: 12,
  DAILY_GOAL_STEP: 0.5,
  SURVIVAL_DAYS_MIN: 1,
  SURVIVAL_DAYS_MAX: 30,
} as const;

export const REMINDER_LEAD_TIME_OPTIONS: Array<5 | 10 | 30> = [5, 10, 30];

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UniversityOption {
  id: string;
  nameEn: string;
  nameAr: string;
  colleges: Array<{
    id: string;
    nameEn: string;
    nameAr: string;
  }>;
}

export const UNIVERSITIES_CATALOG: UniversityOption[] = [
  {
    id: "ksu",
    nameEn: "King Saud University (KSU)",
    nameAr: "جامعة الملك سعود",
    colleges: [
      {
        id: "ksu_ccis",
        nameEn: "College of Computer & Information Sciences",
        nameAr: "كلية علوم الحاسب والمعلومات",
      },
      {
        id: "ksu_eng",
        nameEn: "College of Engineering",
        nameAr: "كلية الهندسة",
      },
      {
        id: "ksu_med",
        nameEn: "College of Medicine",
        nameAr: "كلية الطب",
      },
      {
        id: "ksu_bus",
        nameEn: "College of Business Administration",
        nameAr: "كلية إدارة الأعمال",
      },
      {
        id: "ksu_sci",
        nameEn: "College of Science",
        nameAr: "كلية العلوم",
      },
    ],
  },
  {
    id: "kfupm",
    nameEn: "King Fahd University of Petroleum & Minerals (KFUPM)",
    nameAr: "جامعة الملك فهد للبترول والمعادن",
    colleges: [
      {
        id: "kfupm_ccse",
        nameEn: "College of Computing & Mathematics",
        nameAr: "كلية الحوسبة والرياضيات",
      },
      {
        id: "kfupm_ceng",
        nameEn: "College of Engineering & Physics",
        nameAr: "كلية الهندسة والفيزياء",
      },
      {
        id: "kfupm_kbs",
        nameEn: "KFUPM Business School",
        nameAr: "كلية الأعمال",
      },
    ],
  },
  {
    id: "kau",
    nameEn: "King Abdulaziz University (KAU)",
    nameAr: "جامعة الملك عبدالعزيز",
    colleges: [
      {
        id: "kau_fcit",
        nameEn: "Faculty of Computing & Information Technology",
        nameAr: "كلية الحاسبات وتقنية المعلومات",
      },
      {
        id: "kau_eng",
        nameEn: "Faculty of Engineering",
        nameAr: "كلية الهندسة",
      },
      {
        id: "kau_med",
        nameEn: "Faculty of Medicine",
        nameAr: "كلية الطب",
      },
      {
        id: "kau_econ",
        nameEn: "Faculty of Economics & Administration",
        nameAr: "كلية الاقتصاد والإدارة",
      },
    ],
  },
  {
    id: "pnu",
    nameEn: "Princess Nourah bint Abdulrahman University (PNU)",
    nameAr: "جامعة الأميرة نورة بنت عبدالرحمن",
    colleges: [
      {
        id: "pnu_ccis",
        nameEn: "College of Computer & Information Sciences",
        nameAr: "كلية علوم الحاسب والمعلومات",
      },
      {
        id: "pnu_eng",
        nameEn: "College of Engineering",
        nameAr: "كلية الهندسة",
      },
      {
        id: "pnu_health",
        nameEn: "College of Health & Rehabilitation Sciences",
        nameAr: "كلية علوم الصحة والتأهيل",
      },
    ],
  },
  {
    id: "cairo_uni",
    nameEn: "Cairo University",
    nameAr: "جامعة القاهرة",
    colleges: [
      {
        id: "cu_fcai",
        nameEn: "Faculty of Computers & Artificial Intelligence",
        nameAr: "كلية الحاسبات والذكاء الاصطناعي",
      },
      {
        id: "cu_eng",
        nameEn: "Faculty of Engineering",
        nameAr: "كلية الهندسة",
      },
      {
        id: "cu_med",
        nameEn: "Kasr Al-Ainy Faculty of Medicine",
        nameAr: "كلية طب قصر العيني",
      },
    ],
  },
  {
    id: "uaeu",
    nameEn: "United Arab Emirates University (UAEU)",
    nameAr: "جامعة الإمارات العربية المتحدة",
    colleges: [
      {
        id: "uaeu_cit",
        nameEn: "College of Information Technology",
        nameAr: "كلية تقنية المعلومات",
      },
      {
        id: "uaeu_eng",
        nameEn: "College of Engineering",
        nameAr: "كلية الهندسة",
      },
      {
        id: "uaeu_cbe",
        nameEn: "College of Business & Economics",
        nameAr: "كلية الإدارة والاقتصاد",
      },
    ],
  },
];

export interface TimezoneOption {
  value: string;
  labelEn: string;
  labelAr: string;
  offset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  {
    value: "Asia/Riyadh",
    labelEn: "Riyadh, Kuwait, Doha (Arabia Standard Time)",
    labelAr: "الرياض، الكويت، الدوحة (توقيت السعودية)",
    offset: "UTC+03:00",
  },
  {
    value: "Asia/Dubai",
    labelEn: "Dubai, Abu Dhabi, Muscat (Gulf Standard Time)",
    labelAr: "دبي، أبوظبي، مسقط (توقيت الخليج)",
    offset: "UTC+04:00",
  },
  {
    value: "Africa/Cairo",
    labelEn: "Cairo, Alexandria (Egypt Standard Time)",
    labelAr: "القاهرة، الإسكندرية (توقيت مصر)",
    offset: "UTC+02:00",
  },
  {
    value: "Asia/Amman",
    labelEn: "Amman, Damascus (Eastern European / Levant)",
    labelAr: "عمّان، دمشق (توقيت المشرق)",
    offset: "UTC+03:00",
  },
  {
    value: "Africa/Casablanca",
    labelEn: "Casablanca, Rabat (Morocco Time)",
    labelAr: "الدار البيضاء، الرباط (توقيت المغرب)",
    offset: "UTC+01:00",
  },
  {
    value: "Europe/London",
    labelEn: "London, Dublin (Greenwich Mean Time)",
    labelAr: "لندن، دبلن (توقيت غرينتش)",
    offset: "UTC+00:00",
  },
  {
    value: "Europe/Paris",
    labelEn: "Paris, Berlin, Madrid (Central European Time)",
    labelAr: "باريس، برلين، مدريد (توقيت وسط أوروبا)",
    offset: "UTC+01:00",
  },
  {
    value: "America/New_York",
    labelEn: "New York, Toronto (Eastern Time)",
    labelAr: "نيويورك، تورونتو (التوقيت الشرقي)",
    offset: "UTC-05:00",
  },
  {
    value: "America/Chicago",
    labelEn: "Chicago, Dallas (Central Time)",
    labelAr: "شيكاغو، دالاس (التوقيت المركزي)",
    offset: "UTC-06:00",
  },
  {
    value: "America/Los_Angeles",
    labelEn: "Los Angeles, Vancouver (Pacific Time)",
    labelAr: "لوس أنجلوس، فانكوفر (توقيت المحيط الهادئ)",
    offset: "UTC-08:00",
  },
  {
    value: "Asia/Tokyo",
    labelEn: "Tokyo, Seoul (Japan Standard Time)",
    labelAr: "طوكيو، سيول (توقيت اليابان)",
    offset: "UTC+09:00",
  },
  {
    value: "Asia/Singapore",
    labelEn: "Singapore, Kuala Lumpur",
    labelAr: "سنغافورة، كوالالمبور",
    offset: "UTC+08:00",
  },
];

export function formatHourSlot(hour: number, format: "12h" | "24h" = "24h"): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (format === "24h") {
    return `${String(normalized).padStart(2, "0")}:00`;
  }
  const period = normalized >= 12 ? "PM" : "AM";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayHour}:00 ${period}`;
}

export function createDefaultAvailability(): AvailabilityBlock[] {
  const blocks: AvailabilityBlock[] = [];
  // Realistic university student default: Mon-Thu 16:00-20:00, Sat 10:00-14:00, Sun 17:00-21:00
  const schedule: Partial<Record<DayOfWeekKey, number[]>> = {
    MONDAY: [16, 17, 18, 19],
    TUESDAY: [16, 17, 18, 19],
    WEDNESDAY: [15, 16, 17, 18],
    THURSDAY: [16, 17, 18],
    FRIDAY: [14, 15],
    SATURDAY: [10, 11, 12, 13],
    SUNDAY: [17, 18, 19, 20],
  };

  for (const day of AVAILABILITY_DAYS) {
    const hours = schedule[day] || [];
    for (const h of hours) {
      blocks.push({
        dayOfWeek: day,
        startTime: `${String(h).padStart(2, "0")}:00`,
        endTime: `${String(h + 1).padStart(2, "0")}:00`,
      });
    }
  }
  return blocks;
}

export const DEFAULT_USER_SETTINGS: UserSettingsPayload = {
  profile: {
    displayName: "Sara Al-Mansour",
    email: "sara.almansour@student.ksu.edu.sa",
    avatarUrl: null,
    universityId: "ksu",
    collegeId: "ksu_ccis",
  },
  studyPreferences: {
    pomodoroFocusMinutes: 25,
    pomodoroShortBreakMinutes: 5,
    pomodoroLongBreakMinutes: 15,
    pomodoroSessionsBeforeLongBreak: 4,
    dailyStudyGoalHours: 3.5,
    survivalModeEnabled: true,
    survivalModeDaysBeforeExam: 7,
  },
  availability: createDefaultAvailability(),
  notifications: {
    emailEnabled: true,
    browserPushEnabled: true,
    sessionReminderEnabled: true,
    sessionReminderLeadMinutes: 10,
    streakReminderEnabled: true,
    examCountdownEnabled: true,
    newChallengeJoinersEnabled: false,
    quietHoursEnabled: true,
    quietHoursStart: "22:30",
    quietHoursEnd: "07:00",
  },
  privacy: {
    showOnLeaderboards: true,
    useAlias: false,
    aliasName: "QuantumScholar",
    soundsEnabled: true,
    animationsEnabled: true,
    genieMascotReactionsEnabled: true,
  },
  languageRegion: {
    language: "en",
    timezone: "Asia/Riyadh",
    timeFormat: "12h",
    firstDayOfWeek: "SUNDAY",
  },
  pdfs: [
    {
      id: "pdf_1",
      name: "CS311_Algorithms_Syllabus_Fall2026.pdf",
      courseName: "Design & Analysis of Algorithms",
      sizeBytes: 2458600,
      uploadedAt: "2026-10-14",
    },
    {
      id: "pdf_2",
      name: "CS340_Operating_Systems_Lecture_Notes_Ch1-5.pdf",
      courseName: "Operating Systems",
      sizeBytes: 5124900,
      uploadedAt: "2026-10-28",
    },
    {
      id: "pdf_3",
      name: "MATH244_Linear_Algebra_Problem_Set.pdf",
      courseName: "Linear Algebra",
      sizeBytes: 1184200,
      uploadedAt: "2026-11-04",
    },
  ],
};

export const DEFAULT_ENROLLED_COURSES: EnrolledCourseItem[] = [
  {
    id: "course_cs311",
    name: "Design & Analysis of Algorithms",
    code: "CS 311",
    examDate: "2026-12-14",
    progressPercent: 68,
    participantsCount: 42,
  },
  {
    id: "course_cs340",
    name: "Operating Systems",
    code: "CS 340",
    examDate: "2026-12-18",
    progressPercent: 52,
    participantsCount: 37,
  },
  {
    id: "course_math244",
    name: "Linear Algebra",
    code: "MATH 244",
    examDate: "2026-12-09",
    progressPercent: 84,
    participantsCount: 64,
  },
];
