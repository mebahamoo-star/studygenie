# StudyGenie Post-Exam Experience

End-to-end post-exam celebration, exam feedback capture, study effort report, and next-step planning flow built with the **Modern Light** design system and full **EN (LTR) + AR (RTL)** support via `react-i18next`.

---

## Folder Structure

```text
src/features/post-exam/
├── api/
│   ├── postExamApi.mock.ts         # Stateful localStorage-backed mock API
│   └── postExamApi.ts              # Flag-controlled Axios client (reuses settingsAxiosClient)
├── components/
│   ├── CelebrationModal.tsx        # Celebration dialog / mobile bottom sheet + Genie Lottie/static fallback + XP count-up
│   ├── DifficultyCard.tsx          # Accessible EASY / MEDIUM / HARD radio group
│   ├── FeedbackStepper.tsx         # 2-step exam feedback modal/sheet (skippable)
│   ├── NextStepCard.tsx            # Freed hours redirect + optional Streak Freeze suggestion
│   ├── PlannedVsActualChart.tsx    # Recharts bar chart (weekly planned vs. actual hours)
│   ├── PostExamManager.tsx         # Auto-checks COMPLETED & celebrationSeen=false on AppShell mount
│   ├── ReportSummaryCards.tsx      # 5 summary cards + SVG circular adherence progress ring
│   ├── SlowTopicsList.tsx          # Topics taking longer than planned
│   └── TopicChecklist.tsx          # Searchable syllabus checklist ("Hardest for me" / "Heavily tested")
├── constants/
│   └── postExamConstants.ts        # Shared TypeScript interfaces, mock seed data, named constants
├── hooks/
│   ├── useCourseReport.ts          # Report fetch + mocked PDF export notice
│   ├── useEnrollmentStatus.ts      # Enrollment fetch, celebrationSeen, reopen, archive
│   └── useExamFeedback.ts          # Feedback submission + normalized 4xx field/form errors
├── i18n/
│   ├── ar.json                     # Arabic RTL strings
│   ├── en.json                     # English LTR strings
│   └── index.ts                    # Registers postExam bundle into shared settingsI18n
├── pages/
│   └── CourseReportPage.tsx        # Full /courses/:id/report page
└── schemas/
    └── feedbackSchema.ts           # Zod validation schema
```

Mounted integrations:
- Global trigger: `src/components/AppShell.tsx` (`<PostExamManager />`)
- Report route: `src/routes/_shell.courses_.$id.report.tsx` (`/courses/$id/report`)
- Settings > Study tab: `src/features/settings/sections/CoursesSection.tsx` (Active, Completed, and collapsed Archived accordion)

---

## Switching from Mock API to Real Backend

1. In `frontend/.env` (or `.env.local`), set:
   ```env
   VITE_POST_EXAM_USE_REAL_API=true
   ```
   Alternatively, flip `USE_POST_EXAM_MOCK_API` to `false` in `src/features/post-exam/api/postExamApi.ts`.
2. Ensure your Spring Boot backend exposes the contract endpoints via `settingsAxiosClient` (JWT automatically attached, `401` redirects to `/login`):
   - `GET /api/enrollments?status=ACTIVE|COMPLETED|ARCHIVED`
   - `POST /api/enrollments/{id}/celebration-seen`
   - `POST /api/enrollments/{id}/feedback` → `{ difficulty: "EASY" | "MEDIUM" | "HARD", hardTopicIds: number[], testedTopicIds: number[] }`
   - `GET /api/enrollments/{id}/report` → `{ courseName, totalStudyHours, sessionsCount, adherencePercent, longestStreak, finalRank, weekly, slowTopics }`
   - `POST /api/enrollments/{id}/reopen`
   - `POST /api/enrollments/{id}/archive`

---

## Customizing the Lottie Asset

`CelebrationModal` loads `/assets/genie-celebrate.json`, which lives at:
- `frontend/public/assets/genie-celebrate.json`

Replace that file with your final exported Lottie animation JSON at the exact same path. If loading fails or `prefers-reduced-motion: reduce` is active, it falls back automatically to the static Genie illustration.

---

## `// TODO(backend)` Placeholders

Features whose backend endpoints do not exist yet display honest notices instead of silently faking persistence:
- **Final Leaderboard Rank (`finalRank`)**: mocked in `postExamApi.mock.ts` / displayed in `ReportSummaryCards.tsx` and `CoursesSection.tsx`.
- **Share your journey** (`CelebrationModal.tsx`): shows an informational status notice.
- **Download PDF summary** (`useCourseReport.ts` / `CourseReportPage.tsx`): shows a loading indicator followed by an informational backend-pending notice.
- **Streak Freeze activation** (`NextStepCard.tsx`): shows an informational backend-pending notice.
