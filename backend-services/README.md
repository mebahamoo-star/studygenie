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
Currently, user accounts and refresh tokens are stored in-memory (data is lost on restart).
To integrate JPA entities:
1. Create `Student` and `RefreshToken` entities mapping to your tables.
2. Create Spring Data JPA repositories for them.
3. Create `JpaUserAccountStore` implementing `com.studygenie.backend.service.auth.UserAccountStore`.
4. Create `JpaRefreshTokenStore` implementing `com.studygenie.backend.service.auth.RefreshTokenStore`.
5. Annotate these implementation classes with `@Service` or `@Component`.
6. **No other changes are needed.** The application will automatically detect your beans and disable the in-memory fallbacks.
7. Re-run `mvnw test` to ensure `InMemoryAuthStoreConfigTest` and `AuthControllerTest` still pass with your JPA implementations (they should if your implementations are correct).
