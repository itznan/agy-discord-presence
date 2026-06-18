@echo off
title Installing Antigravity Discord Rich Presence
echo ==================================================
echo Running installation script via PowerShell...
echo ==================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installation failed.
    pause
    exit /b %errorlevel%
)
echo.
echo Press any key to exit.
pause > nul
