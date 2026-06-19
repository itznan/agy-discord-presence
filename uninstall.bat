@echo off
title Uninstalling Antigravity Discord Rich Presence
echo ==================================================
echo Running uninstall script via PowerShell...
echo ==================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Uninstallation failed.
    pause
    exit /b %errorlevel%
)
echo.
echo Press any key to exit.
pause > nul
