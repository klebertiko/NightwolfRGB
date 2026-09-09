@echo off
REM Nightwolf RGB - Admin Launcher (Batch version)
REM This batch file requests administrator privileges and launches the dev servers

echo.
echo 🐺 Nightwolf RGB - Starting with Admin Privileges...
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running with administrator privileges
    echo.
    goto :run
) else (
    echo ⚠️  Not running as administrator. Requesting elevation...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:run
cd /d "%~dp0"
echo Starting Nightwolf RGB desktop...
echo.
call npm run desktop

if %errorLevel% neq 0 (
    echo.
    echo ❌ Error occurred. Press any key to exit...
    pause >nul
)
