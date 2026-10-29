@echo off
echo ========================================================
echo               Starting StudyGenie Services
echo ========================================================

set "JAVA_HOME=C:\Users\ahmad\.jdks\jdk-17.0.20.1+1"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [1/3] Starting AI Engine (FastAPI on http://127.0.0.1:8000)...
start "StudyGenie - AI Engine" cmd /k "cd /d C:\Users\ahmad\studygenie\ai-engine && .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Starting Backend Services (Spring Boot on http://localhost:8080)...
start "StudyGenie - Backend" cmd /k "cd /d C:\Users\ahmad\studygenie\backend-services && set JAVA_HOME=C:\Users\ahmad\.jdks\jdk-17.0.20.1+1 && .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev"

echo [3/3] Starting Frontend (Vite on http://localhost:5173)...
start "StudyGenie - Frontend" cmd /k "cd /d C:\Users\ahmad\studygenie\frontend && npm run dev"

echo.
echo All services have been launched!
echo - Frontend:    http://localhost:5173
echo - Backend API: http://localhost:8080
echo - AI Engine:   http://localhost:8000/docs
echo.
pause
