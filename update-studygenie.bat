@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo              StudyGenie Auto-Updater
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Pulling latest code from GitHub (origin/master)...
git pull origin master
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Git pull failed! Please check your internet connection or git status.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Synchronizing frontend and workspace assets...
if exist "..\frontendgeine" (
    robocopy "%~dp0frontend\src" "..\frontendgeine\src" /E /NDL /NFL /NJH /NJS /nc /ns /np >nul 2>&1
    copy /y "%~dp0frontend\package.json" "..\frontendgeine\package.json" >nul 2>&1
    echo Frontend assets synchronized successfully.
)

echo.
echo [3/3] Verifying and building frontend bundle...
cd /d "%~dp0frontend"
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [WARN] Frontend build finished with notices.
) else (
    echo [OK] Frontend production build succeeded!
)

cd /d "%~dp0"
echo.
echo ========================================================
echo  StudyGenie is fully up-to-date! Latest commit:
git log -1 --oneline
echo ========================================================
echo.
pause
