
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
