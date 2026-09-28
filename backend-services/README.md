# StudyGenie Backend Services

This is the backend for the StudyGenie project, built with Spring Boot 3.3 and Java 17.

## How to run with the dev profile (no MySQL required)

The `dev` profile uses an in-memory H2 database, which is perfect for local development without Docker or MySQL.

```bash
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
mvn -f backend-services/pom.xml spring-boot:run
```

## How to run tests

```bash
mvn -f backend-services/pom.xml clean verify
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
