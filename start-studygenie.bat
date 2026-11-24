@echo off
title StudyGenie Launcher
echo ========================================================
echo               Starting StudyGenie Services
echo ========================================================

cd /d "%~dp0"

set "SKIP_UPDATE=0"
if /i "%~1"=="--skip-update" set "SKIP_UPDATE=1"

:: 0. Free ports 5173, 8080, 8000 if previously occupied by lingering processes
echo [0/4] Checking and clearing ports 5173, 8080, 8000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173,8080,8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 1. Optional auto-update check (5s countdown, defaults to Yes)
if "%SKIP_UPDATE%"=="0" if exist "%~dp0update-studygenie.bat" (
    echo.
    echo [1/4] Checking for GitHub updates...
    setlocal enabledelayedexpansion
    choice /c YN /n /t 5 /d Y /m "Pull latest updates from GitHub before starting? [Y/N] (auto-Yes in 5s): "
    if errorlevel 2 (
        echo [SKIP] Skipping Git update. Starting with current local files.
        endlocal
    ) else (
        set "START_BLOB_BEFORE="
        for /f "delims=" %%b in ('git rev-parse HEAD:start-studygenie.bat 2^>nul') do set "START_BLOB_BEFORE=%%b"

        call "%~dp0update-studygenie.bat" --no-pause --skip-build
        set "UPD_ERR=!errorlevel!"

        if "!UPD_ERR!"=="0" (
            set "START_BLOB_AFTER="
            for /f "delims=" %%b in ('git rev-parse HEAD:start-studygenie.bat 2^>nul') do set "START_BLOB_AFTER=%%b"
            if not "!START_BLOB_AFTER!"=="" if not "!START_BLOB_AFTER!"=="!START_BLOB_BEFORE!" (
                echo.
                echo [INFO] start-studygenie.bat was updated. Reloading launcher...
                endlocal
                "%~f0" --skip-update
            )
            endlocal
        ) else if "!UPD_ERR!"=="2" (
            echo.
            echo [STOP] Merge conflict or stash error detected. Services were NOT started.
            echo        Resolve conflicts in VS Code first, then run start-studygenie.bat again.
            pause
            goto :ABORT_START
        ) else if "!UPD_ERR!"=="3" (
            echo.
            echo [WARN] Could not pull updates from GitHub ^(offline or remote error^). Your local changes are safe.
            choice /c YN /m "Start local services offline anyway? "
            if errorlevel 2 goto :ABORT_START
            endlocal
        ) else (
            echo.
            echo [STOP] Update or dependency installation failed. Fix the errors above before starting.
            pause
            goto :ABORT_START
        )
    )
)

:: 2. Auto-detect & normalize JAVA_HOME for Java 17
if not defined JAVA_HOME (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2025.2.3\jbr" (
        set "JAVA_HOME=C:\Program Files\JetBrains\IntelliJ IDEA 2025.2.3\jbr"
    ) else if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" (
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
echo.
echo [2/4] Starting AI Engine (FastAPI on http://127.0.0.1:8000)...
set "AI_PYTHON=python"
if exist "%~dp0ai-engine\.venv\Scripts\python.exe" (
    set "AI_PYTHON=%~dp0ai-engine\.venv\Scripts\python.exe"
) else if exist "%~dp0ai-engine\.venv2\Scripts\python.exe" (
    set "AI_PYTHON=%~dp0ai-engine\.venv2\Scripts\python.exe"
)

start "StudyGenie - AI Engine" /D "%~dp0ai-engine" cmd /k "title StudyGenie - AI Engine && "%AI_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 5. Start Backend Services (Spring Boot on http://127.0.0.1:8080)
echo [3/4] Starting Backend Services (Spring Boot on http://127.0.0.1:8080)...
start "StudyGenie - Backend" /D "%~dp0backend-services" cmd /k "title StudyGenie - Backend && set ADMIN_BOOTSTRAP_EMAIL=ahmadalhrini4@gmail.com && call .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev" "-Dmaven.test.skip=true""

:: 6. Wait for Backend & AI Engine to initialize before opening Frontend
echo.
echo Waiting for Backend and AI Engine to connect and start listening...
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
echo [4/4] Starting Frontend (Vite on http://localhost:5173)...
start "StudyGenie - Frontend" /D "%~dp0frontend" cmd /k "title StudyGenie - Frontend && npm run dev -- --host 0.0.0.0"

:: Wait until Frontend (Vite) is listening and serving HTTP before opening browser
echo Waiting for Frontend to finish loading on http://localhost:5173...
set FE_RETRIES=0
:WAIT_FRONTEND
powershell -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 10; exit 0 } catch { if ($_.Exception.Response) { exit 0 } else { exit 1 } }" >nul 2>&1
if not errorlevel 1 goto FRONTEND_READY

set /a FE_RETRIES+=1
if %FE_RETRIES% GEQ 45 (
    echo.
    echo [WARNING] Frontend is taking longer than usual, opening browser anyway...
    goto OPEN_BROWSER
)

<nul set /p "=. "
ping -n 2 127.0.0.1 >nul
goto WAIT_FRONTEND

:FRONTEND_READY
echo.
echo [OK] Frontend is LIVE and ready!

:OPEN_BROWSER
start http://localhost:5173

echo.
echo ========================================================
echo        All StudyGenie Services Are Live and Ready!
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
exit /b 0

:ABORT_START
endlocal
exit /b 1
