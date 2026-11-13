# StudyGenie

StudyGenie is an AI-powered smart study planner and revision orchestrator built as a graduation (capstone) project. The system generates personalized, availability-bound study schedules and processes student-provided PDF materials through a Retrieval-Augmented Generation (RAG) pipeline to support adaptive revision planning.

## Project Scope

- **User base:** Students only
- **Content processing:** PDF documents only
- **Scheduling:** Bound by user-declared availability windows

## Architecture Overview

StudyGenie follows a microservices architecture with the following components:

| Component | Technology | Responsibility |
|---|---|---|
| Backend Services | Java Spring Boot | Stateless REST APIs, JWT authentication, business logic |
| AI Engine | Python FastAPI | RAG pipeline for PDF ingestion and retrieval |
| Frontend | React | Web/mobile client with heatmap schedule visualization |
| Notification Pipeline | n8n | Event-driven notification workflows |
| Infrastructure | Docker / Kubernetes | Containerization and orchestration |

## Repository Structure

```
studygenie/
├── backend-services/     # Spring Boot microservices (JWT auth, scheduling, core APIs)
├── ai-engine/             # Python FastAPI RAG pipeline for PDF processing
├── frontend/              # React web/mobile client
├── n8n-workflows/         # n8n notification pipeline definitions
├── docs/                  # Thesis documentation and supporting artifacts
├── docker-compose.yml     # Local multi-service orchestration
└── README.md
```

## Key Design Constraints

- Authentication is JWT-based across stateless backend services.
- Biometric authentication (fingerprint and iris) is supported at the client level; raw biometric data is never persisted.
- All configuration is externalized from application code.
- AI processing is restricted to PDF input to scope the RAG pipeline's ingestion logic.

## Getting Started

Setup instructions for each service are documented within their respective subdirectories as they are implemented.

## Documentation

Full academic documentation, including system analysis, requirements, and design chapters, is maintained under `docs/`.

## Docker Compose Setup
You can run the entire platform using Docker Compose.

### Prerequisites
- Docker & Docker Compose installed.

### How to Run
1. Copy the environment variables example:
   ```bash
   cp .env.example .env
   ```
2. Fill in the required secrets in `.env`.
3. Start the services:
   ```bash
   docker compose up --build -d
   ```

### URLs
- Backend API (Swagger): http://localhost:8080/swagger-ui.html
- n8n Orchestrator: http://localhost:5678 (Login with credentials from `.env`)

### Smoke Test
After starting the containers, run the smoke test to verify health and end-to-end functionality:
```bash
bash scripts/smoke-test.sh
```

### Resetting Volumes
If you need to wipe the database and n8n data:
```bash
docker compose down -v
```

## Security & Admin Panel Configuration

### Required Environment Variables (Non-Dev Profiles)
The Spring Boot backend refuses to start in non-`dev` profiles unless all required secrets are provided via environment variables:
- `DB_PASS`: PostgreSQL / Supabase database password.
- `JWT_SECRET`: HMAC-SHA256 secret (must be at least 32 bytes).
- `AI_INTERNAL_TOKEN`: Shared internal token between `backend-services` and `ai-engine` (at least 16 characters).
- `INTERNAL_N8N_TOKEN`: Shared internal token for `/api/internal/**` n8n digest endpoints.
- `CORS_ALLOWED_ORIGINS`: Comma-separated allow-list of frontend origins (defaults to `http://localhost:3000,http://localhost:5173` in local dev).

### Bootstrapping the First Admin Account
New accounts registered via `/api/auth/register` or OAuth always receive the `STUDENT` role. Never create a default-password admin account. Instead, promote an existing registered account using either method below:

1. **Startup Environment Variable (Recommended)**:
   Register your account normally in the app, then set `ADMIN_BOOTSTRAP_EMAIL` and restart the backend:
   ```bash
   ADMIN_BOOTSTRAP_EMAIL=your-registered-email@example.com
   ```
   On startup, if no `ADMIN` exists in the `students` table yet, `AdminBootstrapRunner` promotes that existing account to `ADMIN` and logs the promotion.

2. **One-Line SQL Alternative**:
   Run the following SQL statement against PostgreSQL / Supabase:
   ```sql
   UPDATE students SET role = 'ADMIN', status = 'ACTIVE' WHERE LOWER(email) = LOWER('your-registered-email@example.com');
   ```

