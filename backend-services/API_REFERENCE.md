# StudyGenie API Reference

All successful responses are wrapped in:
`json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
`

Errors are wrapped in:
`json
{
  "success": false,
  "message": "Error details",
  "timestamp": "2024-01-01T00:00:00Z"
}
`

## Authentication
POST /api/auth/register - Register a new student (`role` is always `STUDENT`, `status` is always `ACTIVE`)
POST /api/auth/login - Login and get JWT (`UserSummary` includes `id`, `fullName`, `email`, `role`, `status`; suspended accounts receive `403 Forbidden`)
POST /api/auth/refresh - Refresh access token (revokes tokens and returns `403` if account is `SUSPENDED`)
GET /api/auth/me - Get authenticated user's live profile (`id`, `fullName`, `email`, `role`, `status`)

## Admin API (`/api/admin/**`)
All `/api/admin/**` endpoints require `Authorization: Bearer <token>` and re-verify the caller's `role` and `status` live against the database on every request.
- Unauthenticated -> `401 Unauthorized` JSON
- Insufficient role -> `403 Forbidden` JSON
- `/api/admin/reports/**` requires `ROLE_ADMIN` or `ROLE_MODERATOR`.
- All other `/api/admin/**` endpoints require `ROLE_ADMIN`.
- All paginated endpoints return `AdminPageResponse<T>` (`items`, `page`, `size`, `totalElements`, `totalPages`) with `size` capped at `100`.
- Every mutation writes an append-only entry to `admin_audit_log` in the same transaction.

### 1. Overview
- `GET /api/admin/overview` (`ADMIN`): Returns KPI counts (`totalUsers`, `activeUsersToday`, `activeUsers7d`, `newSignupsToday`, `newSignups7d`, `totalCourses`, `enrolledCount`, `uploadsToday`, `openReports`, `failedAnalyses`) and 14-day time series (`dailySignups`, `dailyActivity`).

### 2. Reports Moderation
- `GET /api/admin/reports` (`ADMIN`, `MODERATOR`): Paginated reports list (`?status=&reason=&courseId=&search=&page=0&size=20`).
- `GET /api/admin/reports/{id}` (`ADMIN`, `MODERATOR`): Single report detail.
- `PATCH /api/admin/reports/{id}` (`ADMIN`, `MODERATOR`): Update report `status` (`PENDING`, `IN_REVIEW`, `RESOLVED`, `REJECTED`) and `adminNote`; sets `resolvedById`, `resolvedBy`, and `resolvedAt` when resolved/rejected.

### 3. Courses, Merge, Re-Analyze, Topics & Catalog CRUD
- `GET /api/admin/courses` (`ADMIN`): Paginated courses list (`?universityId=&collegeId=&status=&minEnrollments=&minTopics=&search=&includeDeleted=false&page=0&size=20`).
- `GET /api/admin/courses/{id}` (`ADMIN`): Course detail with topics, enrollment count, and open report count.
- `PATCH /api/admin/courses/{id}` (`ADMIN`): Update `name`, `collegeId`, `status`, `verified`, or `locked`.
- `DELETE /api/admin/courses/{id}` (`ADMIN`): Soft-delete course (`deletedAt` timestamp).
- `POST /api/admin/courses/{id}/merge` (`ADMIN`): Transactional, idempotent merge of duplicate source course `{id}` into `{ "targetCourseId": <id> }` (moves enrollments, topics, study plans, exams, and course reports, then soft-deletes source course).
- `POST /api/admin/courses/{id}/reanalyze` (`ADMIN`): Re-evaluate/trigger syllabus analysis for a course.
- `PATCH /api/admin/courses/{courseId}/topics/{topicId}` (`ADMIN`): Edit topic `chapterTitle`, `estimatedHours`, or `orderIndex`.
- `DELETE /api/admin/courses/{courseId}/topics/{topicId}` (`ADMIN`): Delete a topic cascade.
- `GET / POST / PATCH / DELETE /api/admin/universities/**` and `/api/admin/colleges/**` (`ADMIN`): University and College catalog CRUD.

### 4. Users Management
- `GET /api/admin/users` (`ADMIN`): Paginated users list (`?search=&role=&status=&universityId=&page=0&size=20`).
- `GET /api/admin/users/{id}` (`ADMIN`): User profile projection (`id`, `fullName`, `email`, `role`, `status`, `universityId`, `universityName`, `authProvider`, `enrolledCoursesCount`, `geniePoints`, `streakCount`, `longestStreakDays`, `lastStudyDate`, `lastActiveAt`, `createdAt`; never exposes password hashes or tokens).
- `PATCH /api/admin/users/{id}/role` (`ADMIN`): Change user role (`STUDENT`, `MODERATOR`, `ADMIN`). Blocks self-demotion and demoting the last active admin.
- `PATCH /api/admin/users/{id}/status` (`ADMIN`): Change account status (`ACTIVE`, `SUSPENDED`). Blocks self-suspension and suspending the last active admin; immediately revokes all refresh tokens when suspended.
- `POST /api/admin/users/{id}/reset-password` (`ADMIN`): Triggers the forgot-password email flow and revokes active refresh tokens (never sets or returns a password directly).

### 5. Audit Log
- `GET /api/admin/audit-log` (`ADMIN`): Paginated, filterable (`?adminId=&action=&targetType=&search=&page=0&size=20`) append-only audit log entries.

## Universities & Colleges (v1)
GET /api/v1/universities - List all universities
GET /api/v1/universities/{id} - Get single university
GET /api/v1/universities/{universityId}/colleges - List colleges for a university

## Courses & Syllabus (v1)
GET /api/v1/colleges/{collegeId}/courses - List courses for a college
POST /api/v1/colleges/{collegeId}/courses - Create a new course (body: { "name": "..." })
GET /api/v1/courses/{courseId} - Get a single course
GET /api/v1/courses/{courseId}/topics - Get extracted topics for a course (requires READY status)
POST /api/v1/courses/{courseId}/join - Join course and generate study plan (body: examDate, dailyHours, mode)
POST /api/v1/syllabus/parse (multipart) - Upload PDF for parsing

## Study Plans & Kits (v1)
POST /api/v1/study-plans/generate - Directly generate study plan (internal/advanced)
POST /api/v1/study-kits/generate - Generate flashcards/quizzes for topics

## Study Sessions (v1)
GET /api/v1/study-kits/{kitId}/due - Get due items
POST /api/v1/study-kits/{kitId}/review - Submit a card review
POST /api/v1/study-kits/{kitId}/quiz-submissions - Submit a quiz
GET /api/v1/study-kits/{kitId}/progress - Get kit progress

## Gamification (v1)
GET /api/v1/gamification/profile - Get user XP and badges
GET /api/v1/gamification/leaderboard - Get top 10 leaderboard
POST /api/v1/gamification/test-trigger - (DEV PROFILE ONLY) Manually trigger gamification events

## Internal
GET /api/internal/digest/daily - Retrieve daily summary for n8n email automation (requires internal.n8n-token)

## System
GET /api/health - Check backend health

## Known Limitations
- **Topic Importance Persistence:** Currently, the Topic JPA entity does not have an importance column. Therefore, when parsing a syllabus, the AI engine's generated importance value (1-5) is discarded, and when generating a study plan via CourseService.joinChallenge, all topics are hardcoded to an importance = 1. This materially weakens the "Survival Mode" generation (which prioritizes topics by importance) until a future migration adds the importance column and threads the value through the entire flow.
