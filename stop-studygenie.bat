@echo off
echo Stopping StudyGenie services...

taskkill /FI "WINDOWTITLE eq StudyGenie*" /T /F >nul 2>&1

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173,8080,8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -gt 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo StudyGenie services stopped.
pause
