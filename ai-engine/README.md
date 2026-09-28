# StudyGenie AI Engine

This is the Python/FastAPI microservice for StudyGenie, responsible for extracting topics from course syllabi, generating study flashcards and quizzes via Google Gemini, and computing deterministic study plans.

## Architecture

```
[React Frontend] --> [n8n Orchestrator] --> [AI Engine] (Internal)
                                        --> [Spring Boot Backend] (Public API)
```
The AI Engine receives calls from internal services (authenticated via `X-Internal-Token`). It does not connect to the database.

## Configuration (.env)

| Variable | Default | Description |
|---|---|---|
| APP_ENV | dev | Application environment (dev/prod) |
| ENABLE_DOCS | true | Enable OpenAPI docs |
| AI_INTERNAL_TOKEN | (Required) | Secret token for internal auth (must be >= 16 chars) |
| LLM_PROVIDER | gemini | `gemini` or `fake` |
| GEMINI_API_KEY | | Google Gemini API Key (only sent in headers, never logged) |
| LLM_MODEL_PARSE | gemini-2.5-flash | Stronger model for syllabus parsing |
| LLM_MODEL_STUDY_KIT | gemini-2.5-flash-lite | Cheaper model for study kit generation |
| LLM_THINKING_BUDGET | 0 | (Optional) Reasoning token budget |

### Generating the Internal Token
```powershell
$b = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

## Running Locally on Windows
```powershell
cd ai-engine
# 1. Create and activate venv implicitly by calling its executable
py -3.12 -m venv .venv

# 2. Run
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Testing & Linting
```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
```

## Cost Control & Security Design
* **Model Routing:** Uses a stronger model (`gemini-2.5-flash`) only for parsing unstructured PDFs. Uses a cheaper, faster model (`gemini-2.5-flash-lite`) for structured generation (flashcards/quizzes).
* **Deterministic Planner:** The study planner computes the schedule algorithmically. It costs nothing and makes no LLM calls.
* **Topic-level generation:** Flashcards are batched per topic in parallel, not individually, minimizing network overhead.
* **Security:** PDF content is strictly treated as untrusted data. No personal student data is ever sent to Gemini. The API key is injected directly into headers and never exposed in logs or URLs.

## Integration Guide for Spring Backend
The output of `POST /v1/parse-syllabus` perfectly maps to the database structure:
* `topics.chapter_title` maps directly to the response's `chapter_title`.
* `topics.order_index` maps to `order_index`.
* `topics.estimated_hours` maps to `estimated_hours`.

**Deduplication:** Use the `input_sha256` returned by the parser to check if a student is uploading a syllabus that has already been parsed.
**References:** When creating topics, store the `ref` so you can request study kits using it.

## API Examples

### 1. Health
`GET /health` (Public)

### 2. Parse Syllabus
`POST /v1/parse-syllabus` (Multipart)
Headers: `X-Internal-Token: <token>`
Form fields: `file` (PDF)
```json
// Response
{
  "success": true,
  "data": {
    "topics": [{"order_index": 1, "chapter_title": "Intro", "estimated_hours": 2.5, "importance": 3, "subtopics": []}],
    "input_sha256": "..."
  }
}
```

### 3. Generate Plan (No LLM)
`POST /v1/generate-plan`
```json
// Request
{
  "start_date": "2023-10-01",
  "exam_date": "2023-10-10",
  "topics": [{"ref": "t1", "chapter_title": "Intro", "order_index": 1, "estimated_hours": 2, "importance": 4}],
  "mode": "NORMAL"
}
```

### 4. Generate Study Kit
`POST /v1/generate-study-kit`
```json
// Request
{
  "course_name": "CS101",
  "topics": [{"ref": "t1", "chapter_title": "Intro"}]
}
```
