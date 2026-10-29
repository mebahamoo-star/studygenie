@echo off
echo Stopping StudyGenie services...

taskkill /FI "WINDOWTITLE eq StudyGenie*" /T /F >nul 2>&1

powershell -Command "Get-NetTCPConnection -LocalPort 5173,8080,8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo StudyGenie services stopped.
pause
