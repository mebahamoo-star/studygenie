#!/bin/bash
set -e

echo "Starting smoke test..."

# Wait for backend to be ready
echo "Waiting for backend to be healthy..."
RETRIES=0
MAX_RETRIES=15
until curl -s -f http://localhost:8080/actuator/health | grep '"status":"UP"'; do
  if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "Backend did not become healthy in time."
    exit 1
  fi
  echo "Still waiting..."
  sleep 10
  ((RETRIES++))
done
echo "Backend is healthy!"

# Register User
echo "Registering test user..."
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@studygenie.local","password":"Password123!","name":"Smoke Test"}' || true

# Login User
echo "Logging in test user..."
LOGIN_RESP=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@studygenie.local","password":"Password123!"}')

JWT=$(echo $LOGIN_RESP | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$JWT" ]; then
  echo "Failed to retrieve JWT token"
  echo "Response: $LOGIN_RESP"
  exit 1
fi
echo "Successfully logged in."

# Test Plan Generation Endpoint
echo "Testing Plan Generation..."
PLAN_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8080/api/v1/study-plans/generate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-10-01","examDate":"2026-10-14","dailyHours":2.0,"mode":"NORMAL","topics":[{"ref":"T1","chapterTitle":"Test","orderIndex":1,"estimatedHours":2.0,"importance":3}]}')

HTTP_STATUS=$(echo "$PLAN_RESP" | grep -o "HTTP_STATUS:[0-9]*" | cut -d':' -f2)

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "Plan generation failed!"
  echo "$PLAN_RESP"
  exit 1
fi
echo "Plan generation successful."

# Test Syllabus Parse Endpoint
echo "Testing Syllabus Parse..."
# Create a dummy PDF
echo "dummy pdf content" > dummy.pdf
SYLLABUS_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:8080/api/v1/syllabus/parse \
  -H "Authorization: Bearer $JWT" \
  -F "file=@dummy.pdf" \
  -F "course_name=Smoke Test Course")

HTTP_STATUS=$(echo "$SYLLABUS_RESP" | grep -o "HTTP_STATUS:[0-9]*" | cut -d':' -f2)
rm dummy.pdf

if [ "$HTTP_STATUS" -ne 200 ] && [ "$HTTP_STATUS" -ne 422 ]; then
  echo "Syllabus parsing failed with unexpected status!"
  echo "$SYLLABUS_RESP"
  exit 1
fi
echo "Syllabus parsing call completed successfully (expected 200 or 422 due to dummy PDF)."

echo "Smoke test completed successfully!"
