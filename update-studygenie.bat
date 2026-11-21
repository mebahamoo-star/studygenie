@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "NO_PAUSE=0"
if /i "%~1"=="--no-pause" set "NO_PAUSE=1"

echo ========================================================
echo              StudyGenie Safe Auto-Updater
echo ========================================================
echo.

where git >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Git is not installed or not found in PATH.
    echo         Please install Git for Windows and try again.
    goto :FAIL_EXIT
)

set "CURRENT_BRANCH="
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%b"
if "!CURRENT_BRANCH!"=="" (
    echo [ERROR] Current folder is not a valid Git repository.
    goto :FAIL_EXIT
)

set "OLD_HEAD="
for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set "OLD_HEAD=%%h"

echo Current branch: !CURRENT_BRANCH!
echo.

echo [1/4] Checking local changes...
set "IS_DIRTY=0"
for /f "delims=" %%s in ('git status --porcelain 2^>nul') do (
    set "IS_DIRTY=1"
)

set "STASHED=0"
if "!IS_DIRTY!"=="1" (
    set "STASH_BEFORE="
    for /f "delims=" %%r in ('git rev-parse --verify -q refs/stash 2^>nul') do set "STASH_BEFORE=%%r"

    echo Local uncommitted changes found. Saving safely to stash...
    git stash push -u -m "auto-update"
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Failed to stash your local changes. Nothing was modified.
        echo         Please check "git status" and try again.
        goto :FAIL_EXIT
    )

    set "STASH_AFTER="
    for /f "delims=" %%r in ('git rev-parse --verify -q refs/stash 2^>nul') do set "STASH_AFTER=%%r"
    if not "!STASH_AFTER!"=="!STASH_BEFORE!" (
        set "STASHED=1"
        echo [OK] Local changes stashed as "auto-update".
    ) else (
        echo [OK] Working tree has no stashable changes.
    )
) else (
    echo [OK] Working tree is clean.
)

echo.
echo [2/4] Pulling latest updates from origin/master...
git pull --no-rebase --no-edit origin master
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Git pull from origin/master failed!
    echo         Check your internet connection, remote access, or branch state.
    git merge --abort >nul 2>&1
    if "!STASHED!"=="1" (
        echo Restoring your local changes from stash...
        git stash pop >nul 2>&1
        if !errorlevel! neq 0 (
            echo [WARN] Could not auto-restore stash. Your work is still safe in "git stash list".
        ) else (
            echo [OK] Your local changes have been restored.
        )
    )
    goto :FAIL_EXIT
)
echo [OK] Pulled latest commits from origin/master.

echo.
echo [3/4] Restoring local changes...
if "!STASHED!"=="1" (
    git stash pop
    set "POP_ERR=!errorlevel!"
    set "HAS_CONFLICTS=0"
    for /f "delims=" %%f in ('git diff --name-only --diff-filter=U 2^>nul') do set "HAS_CONFLICTS=1"
    if !POP_ERR! neq 0 set "HAS_CONFLICTS=1"

    if "!HAS_CONFLICTS!"=="1" (
        echo.
        echo ========================================================
        echo [WARN] Merge conflict detected while restoring your work!
        echo ========================================================
        echo Conflicted file^(s^):
        git diff --name-only --diff-filter=U
        echo.
        echo Do not worry: your original local changes are still safe in Git stash.
        echo.
        echo Next steps:
        echo   1. Open the conflicted file^(s^) in VS Code and resolve the conflict markers.
        echo   2. Stage your resolved files:  git add .
        echo   3. Drop the backup stash:      git stash drop
        echo ========================================================
        goto :FAIL_EXIT
    )
    echo [OK] Local changes restored cleanly.
) else (
    echo [OK] No stashed changes to restore.
)

echo.
echo [4/4] Checking frontend dependencies and building...
set "NEW_HEAD="
for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set "NEW_HEAD=%%h"

set "NEED_INSTALL=0"
if not exist "%~dp0frontend\node_modules" (
    set "NEED_INSTALL=1"
) else if not "!OLD_HEAD!"=="!NEW_HEAD!" (
    for /f "delims=" %%p in ('git diff --name-only !OLD_HEAD! !NEW_HEAD! -- frontend/package.json frontend/package-lock.json 2^>nul') do (
        set "NEED_INSTALL=1"
    )
)

set "BUILD_STATUS=OK"
set "EXIT_CODE=0"

pushd "%~dp0frontend" >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Could not find the frontend directory.
    set "BUILD_STATUS=FAILED"
    set "EXIT_CODE=1"
) else (
    if "!NEED_INSTALL!"=="1" (
        echo Package changes detected or node_modules missing. Running npm install...
        call npm.cmd install
        if !errorlevel! neq 0 (
            echo [ERROR] npm install failed!
            set "BUILD_STATUS=FAILED"
            set "EXIT_CODE=1"
        )
    ) else (
        echo [OK] package.json unchanged ^(skipping npm install^).
    )

    if "!BUILD_STATUS!"=="OK" (
        echo Building frontend bundle...
        call npm.cmd run build
        if !errorlevel! neq 0 (
            echo [ERROR] Frontend build failed!
            set "BUILD_STATUS=FAILED"
            set "EXIT_CODE=1"
        ) else (
            echo [OK] Frontend build succeeded!
        )
    )
    popd
)

echo.
echo ========================================================
echo  StudyGenie Update Summary
echo --------------------------------------------------------
echo  Branch       : !CURRENT_BRANCH!
<nul set /p "= Latest Commit: "
git log -1 --oneline
echo  Build Status : !BUILD_STATUS!
echo ========================================================
if "!BUILD_STATUS!"=="OK" (
    echo  Status: Sync complete and frontend build is OK.
) else (
    echo  Status: Code synced, but frontend build FAILED! See errors above.
)
echo.

if not "!EXIT_CODE!"=="0" goto :FAIL_EXIT
if "!NO_PAUSE!"=="0" pause
endlocal & exit /b 0

:FAIL_EXIT
if "!NO_PAUSE!"=="0" pause
endlocal & exit /b 1
