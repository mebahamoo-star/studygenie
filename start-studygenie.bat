@echo off
title StudyGenie Launcher
echo ========================================================
echo               Starting StudyGenie Services
echo ========================================================

cd /d "%~dp0"

:: 1. Free ports 5173, 8080, 8000 if previously occupied by lingering processes
echo [0/3] Checking and clearing ports 5173, 8080, 8000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173,8080,8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 2. Auto-detect & normalize JAVA_HOME for Java 17
if not defined JAVA_HOME (
    if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" (
        set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
    ) else if exist "C:\Program Files\Java\jdk-17" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-17"
    )
)
if defined JAVA_HOME (
    if "%JAVA_HOME:~-1%"=="\" set "JAVA_HOME=%JAVA_HOME:~0,-1%"
)
set "PATH=%JAVA_HOME%\bin;%PATH%"

:: 3. Safely load environment variables from root .env without stripping exclamation marks or quotes
if exist .env (
    for /f "usebackq eol=# tokens=1* delims==" %%A in (".env") do (
        if not "%%A"=="" (
            set "%%A=%%~B"
        )
    )
)

:: 4. Start AI Engine (FastAPI on http://127.0.0.1:8000)
echo [1/3] Starting AI Engine (FastAPI on http://127.0.0.1:8000)...
set "AI_PYTHON=python"
if exist "%~dp0ai-engine\.venv\Scripts\python.exe" (
    set "AI_PYTHON=%~dp0ai-engine\.venv\Scripts\python.exe"
) else if exist "%~dp0ai-engine\.venv2\Scripts\python.exe" (
    set "AI_PYTHON=%~dp0ai-engine\.venv2\Scripts\python.exe"
)

start "StudyGenie - AI Engine" /D "%~dp0ai-engine" cmd /k "title StudyGenie - AI Engine && "%AI_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 5. Start Backend Services (Spring Boot on http://127.0.0.1:8080)
echo [2/3] Starting Backend Services (Spring Boot on http://127.0.0.1:8080)...
start "StudyGenie - Backend" /D "%~dp0backend-services" cmd /k "title StudyGenie - Backend && set ADMIN_BOOTSTRAP_EMAIL=momo@gmail.com && call .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev" "-Dmaven.test.skip=true""

:: 6. Wait for Backend & AI Engine to initialize before opening Frontend
echo.
echo Waiting for Backend & AI Engine to connect and start listening...
echo (Connecting to Supabase PostgreSQL and starting Tomcat...)

set RETRIES=0
:WAIT_LOOP
powershell -NoProfile -Command "try { $b = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 8080); $b.Close(); $a = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 8000); $a.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto SERVICES_READY

set /a RETRIES+=1
if %RETRIES% GEQ 30 (
    echo.
    echo [WARNING] Backend is taking longer than usual, proceeding to start Frontend...
    goto LAUNCH_FRONTEND
)

<nul set /p "=. "
ping -n 3 127.0.0.1 >nul
goto WAIT_LOOP

:SERVICES_READY
echo.
echo [OK] Backend API and AI Engine are LIVE and responding!

:LAUNCH_FRONTEND
:: 7. Start Frontend (Vite on http://localhost:5173)
echo [3/3] Starting Frontend (Vite on http://localhost:5173)...
start "StudyGenie - Frontend" /D "%~dp0frontend" cmd /k "title StudyGenie - Frontend && npm run dev -- --host 0.0.0.0"

:: Wait 2 seconds for Vite dev server to bind, then open browser automatically
ping -n 3 127.0.0.1 >nul
start http://localhost:5173

echo.
echo ========================================================
echo        All StudyGenie Services Are Live & Ready!
echo ========================================================
echo - Frontend:    http://localhost:5173 (Opened in browser)
echo - Backend API: http://localhost:8080
echo - Swagger UI:  http://localhost:8080/swagger-ui/index.html
echo - AI Engine:   http://localhost:8000/docs
echo ========================================================
echo.
echo To stop all services cleanly at any time, run stop-studygenie.bat.
echo.
pause
