# StudyGenie Settings Feature (`src/features/settings`)

A production-quality, bilingual (English LTR & Arabic RTL) Settings module built for **StudyGenie** following the **"Modern Light"** design system.

---

## 1. How to Run

From the `frontend` directory:

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server (port 5173)
npm run dev

# 3. Run unit & integration tests
npm run test
```

Open `http://localhost:5173/settings` (or deep-link directly to `/settings/profile`, `/settings/study`, `/settings/notifications`, `/settings/privacy`, or `/settings/data`) in your browser.

---

## 2. Layout & Tab Mapping (Single Main Area, No Secondary Sidebar)

Because StudyGenie already provides a global application sidebar (`AppShell`), the Settings page renders strictly inside the main content area (`max-w-[800px]`, centered) with a sticky horizontal tab bar (`SettingsTabs.tsx`):

| Tab Label | URL Path | Stacked Sections / Cards |
| :--- | :--- | :--- |
| **Profile** | `/settings/profile` | Profile Card, Academic Affiliation Card (`ProfileSection`) + Change Password, Device Sessions (`SecuritySection`) |
| **Study** | `/settings/study` | Full-Width Weekly Availability Grid, Pomodoro Engine, Daily Goal & Survival Mode (`StudyPreferencesSection`) + Joined Courses (`CoursesSection`) |
| **Notifications** | `/settings/notifications` | Delivery Channels, Study & Challenge Alerts, Quiet Hours (`NotificationsSection`) |
| **Privacy & Experience** | `/settings/privacy` | Leaderboards & Alias, Sensory Feedback (`PrivacySection`) + Language & Region (`LanguageSection`) |
| **My Data** | `/settings/data` | Uploaded Course PDFs, Data Export, Danger Zone Account Deletion (`DataSection`) |

---

## 3. Switching Between Mock API and Real Spring Boot API

By default, the Settings module runs against the realistic Mock API layer (`settingsApi.mock.ts`) with simulated network latency (`260ms`) and `localStorage` persistence so all edits survive page reloads.

### Option A: Environment Variable (Recommended)
Add the following flag to `frontend/.env`:

```env
VITE_SETTINGS_USE_REAL_API=true
```

### Option B: Single Flag in `src/features/settings/api/settingsApi.ts`
Open `src/features/settings/api/settingsApi.ts` and change:

```ts
export const USE_MOCK_API: boolean = false;
```

When `USE_MOCK_API` is `false`, all requests automatically go through the centralized Axios client (`src/features/settings/api/axiosClient.ts`) which:
- Attaches `Authorization: Bearer <JWT>` from `sg_access_token`
- Handles `401 Unauthorized` by clearing the session and redirecting to `/login`
- Normalizes `400` / `422` validation responses into `fieldErrors` mapped directly to `react-hook-form` inputs

---

## 3. Spring Boot Backend Endpoints Covered

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/users/me/settings` | Fetch complete user settings payload |
| `PATCH` | `/api/users/me/settings` | Partial update (profile, notifications, privacy, language, PDFs) |
| `PUT` | `/api/users/me/availability` | Replace weekly availability slots (`{ dayOfWeek, startTime, endTime }[]`) |
| `POST` | `/api/users/me/password` | Change password (`{ currentPassword, newPassword }`) |
| `POST` | `/api/users/me/logout-all` | Revoke active sessions across all other devices |
| `GET` | `/api/users/me/courses` | List joined courses & challenge progress |
| `PATCH` | `/api/users/me/courses/{id}` | Update exam date for an enrolled course |
| `DELETE` | `/api/users/me/courses/{id}` | Leave a course challenge |
| `GET` | `/api/users/me/export` | Export portable JSON archive of user study data |
| `DELETE` | `/api/users/me` | Permanently delete account (requires `{ password }`) |
