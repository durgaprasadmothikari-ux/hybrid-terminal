@echo off
title CyberTerm
cd /d "%~dp0"
call npm start
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo CyberTerm encountered an issue or exited with code %ERRORLEVEL%.
    pause
)
