@echo off
cd /d "%~dp0"
echo Fetching latest updates from GitHub...
git pull origin master
echo.
echo ====================================
echo  Project successfully updated!
echo ====================================
pause
