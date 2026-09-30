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
POST /api/auth/register - Register a new student
POST /api/auth/login - Login and get JWT

*All endpoints under /api/v1/** require Authorization: Bearer <token>.*

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
