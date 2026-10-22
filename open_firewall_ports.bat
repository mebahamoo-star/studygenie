@echo off
:: Batch script to open StudyGenie network ports in Windows Firewall
echo ========================================================
echo   Opening Windows Firewall Ports for StudyGenie
echo   (Ports: 5173, 8080, 8000)
echo ========================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges!
    echo Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Adding inbound rule for ports 5173, 8080, 8000...
netsh advfirewall firewall delete rule name="StudyGenie-Network-Ports" >nul 2>&1
netsh advfirewall firewall add rule name="StudyGenie-Network-Ports" dir=in action=allow protocol=TCP localport=5173,8080,8000

echo.
echo ========================================================
echo   SUCCESS! Ports 5173, 8080, and 8000 are now open!
echo   You can access StudyGenie from any device on your Wi-Fi:
echo.
echo   http://192.168.100.81:5173
echo ========================================================
echo.
pause
