# StudyGenie Backend Services

This is the backend for the StudyGenie project, built with Spring Boot 3.3 and Java 17.

## Requirements
- **JDK 17** is the supported version. Newer JDKs are not supported by this Spring Boot version's managed Lombok dependency.
- To set `JAVA_HOME` for a single PowerShell session, use:
  ```powershell
  $env:JAVA_HOME = "<path to JDK 17>"
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
  ```

## How to run with the dev profile (no MySQL required)

The `dev` profile uses an in-memory H2 database, which is perfect for local development without Docker or MySQL.

```bash
.\mvnw.cmd -f backend-services/pom.xml spring-boot:run -Dspring-boot.run.profiles=dev # Windows
./mvnw -f backend-services/pom.xml spring-boot:run -Dspring-boot.run.profiles=dev     # Linux/Mac
# or if Maven is installed globally:
mvn -f backend-services/pom.xml spring-boot:run -Dspring-boot.run.profiles=dev
```

## How to run against MySQL

By default (without the `dev` profile), the application expects a MySQL database configured via environment variables.

1. Ensure MySQL is running (e.g., via docker-compose).
2. Set the necessary environment variables (or rely on `.env` if using Docker/IDE plugins):
   - `DB_URL`
   - `DB_USER`
   - `DB_PASS`
3. Run the application:
```bash
.\mvnw.cmd -f backend-services/pom.xml spring-boot:run
./mvnw -f backend-services/pom.xml spring-boot:run
# or mvn -f backend-services/pom.xml spring-boot:run
```

## How to run tests

```bash
.\mvnw.cmd -f backend-services/pom.xml clean verify
./mvnw -f backend-services/pom.xml clean verify
# or mvn -f backend-services/pom.xml clean verify
```

## Package Layout

Under `com.studygenie.backend`:
- `config`: Configuration classes (e.g., Security, CORS).
- `controller`: REST controllers exposing API endpoints.
- `dto`: Data Transfer Objects (e.g., ApiResponse).
- `entity`: JPA entities (database tables).
- `exception`: Custom exceptions and the global exception handler.
- `repository`: Spring Data JPA repositories.
- `security`: Security-related components (entry point, access denied handler).
- `service`: Business logic layer.

## ApiResponse JSON Format

All API responses follow a consistent envelope structure.

### Success Example

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "application": "backend",
    "time": "2023-10-27T10:00:00Z"
  },
  "timestamp": "2023-10-27T10:00:00Z"
}
```

### Error Example

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ],
  "timestamp": "2023-10-27T10:05:00Z"
}
```

## Authentication

The backend uses JWT for stateless authentication with opaque refresh token rotation.
For production deployments, `JWT_SECRET` must be a strong 32+ byte string.

### Generating a strong JWT_SECRET
You can generate a secure secret in PowerShell:
```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```
Add this to your `.env` file as `JWT_SECRET=<generated_value>`.

### Frontend Integration
- Send the `accessToken` in the Authorization header: `Authorization: Bearer <accessToken>`
- When the API returns a 401 with `"message": "Token expired"`, the frontend should call `POST /api/auth/refresh` once with the refresh token to get a new pair, then retry the original request.
- Store tokens securely (HttpOnly cookies or Secure Storage preferred to mitigate XSS).
- The rate limiter blocks the IP + email after 5 failed login attempts for 15 minutes. Note: The current rate limiter is in-memory and per-instance.

### API Endpoints

| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/api/auth/register` | POST | `{"fullName": "...", "email": "...", "password": "..."}` | Registers a new user and logs them in (returns AuthResponse). |
| `/api/auth/login` | POST | `{"email": "...", "password": "...", "rememberMe": true}` | Authenticates user (returns AuthResponse). rememberMe=true grants a 30-day refresh token instead of 7-day. |
| `/api/auth/refresh` | POST | `{"refreshToken": "..."}` | Rotates tokens (returns new AuthResponse). Reusing a refresh token revokes the entire family. |
| `/api/auth/logout` | POST | `{"refreshToken": "..."}` | Revokes the refresh token. |
| `/api/auth/me` | GET | `(Authorization Bearer token required)` | Returns UserSummary. |

#### AuthResponse Example
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "opaque-token-string",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "refreshExpiresIn": 604800,
    "user": {
      "id": 1,
      "fullName": "Test User",
      "email": "test@example.com"
    }
  },
  "timestamp": "2023-10-27T10:00:00Z"
}
```

### Integration guide for the entities teammate
(Phase 2 complete! In-memory data stores replaced with real JPA-backed adapters.)

## Persistence

The system now runs entirely on JPA entities for durable domain data:
- **Auth**: Uses `Student` and `RefreshToken` entities (via `JpaUserAccountStore` and `JpaRefreshTokenStore`).
- **Gamification**: Uses `Student` (for points/streak) and `PointsLedger` (for the audit log) via `JpaGamificationStore`.
- **Spaced Repetition**: Uses `FlashcardReview` (via `JpaCardScheduleStore`) to persist SM-2 tracking dates.

**Fallback Mechanism (`@ConditionalOnMissingBean`)**: 
If the application runs without the primary profile or in certain tests, the in-memory adapters (`InMemoryUserAccountStore`, `InMemoryGamificationStore`, etc.) act as fallbacks. They are configured via `InMemoryAuthStoreConfig` and `InMemoryAdapterConfig` and automatically step aside when the JPA `@Service` beans are detected on the classpath during standard execution against MySQL.

**Concurrency & Idempotency Strategy (Gamification)**:
- **Concurrency**: `JpaGamificationStore` achieves atomicity by relying on database row-level pessimistic locking (`EntityManager.lock(student, LockModeType.PESSIMISTIC_WRITE)`). This ensures concurrent update requests for the same student serialize sequentially, preventing lost updates.
- **Idempotency**: Event deduplication (e.g., preventing duplicate points for the same `eventId`) is maintained via an in-memory `ConcurrentHashMap` cache storing `processedEventIds` alongside other non-schema gamification tracking data like `unlockedBadges`. This avoids over-engineering the relational schema for transient gamification state while fully securing the point ledger.

## AI Engine Integration
The Spring Boot backend communicates securely with the internal Python FastAPI AI Engine. 
You must provide the following environment variables if not using the defaults:

* AI_ENGINE_URL: Base URL for the AI engine (default: http://localhost:8000/v1 for dev)
* AI_INTERNAL_TOKEN: The secure internal token matching the Python service's token to authenticate service-to-service communication.
* INTERNAL_N8N_TOKEN: shared secret n8n must send as the X-Internal-Token header when calling /api/internal/** endpoints

