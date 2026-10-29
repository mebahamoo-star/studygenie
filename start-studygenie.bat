@echo off
echo ========================================================
echo               Starting StudyGenie Services
echo ========================================================

cd /d "%~dp0"

:: Auto-detect or set JAVA_HOME for Java 17
if not defined JAVA_HOME (
    if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" (
        set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
    )
)
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [1/3] Starting AI Engine (FastAPI on http://127.0.0.1:8000)...
start "StudyGenie - AI Engine" cmd /k "cd /d ""%~dp0ai-engine"" && (if exist .venv\Scripts\python.exe (.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000) else if exist .venv2\Scripts\python.exe (.venv2\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000) else (python -m uvicorn app.main:app --host 0.0.0.0 --port 8000))"

echo [2/3] Starting Backend Services (Spring Boot on http://localhost:8080)...
start "StudyGenie - Backend" cmd /k "cd /d ""%~dp0backend-services"" && .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev"

echo [3/3] Starting Frontend (Vite on http://localhost:5173)...
start "StudyGenie - Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0"

echo.
echo All services have been launched!
echo - Frontend:    http://localhost:5173
echo - Backend API: http://localhost:8080
echo - AI Engine:   http://localhost:8000/docs
echo.
pause
