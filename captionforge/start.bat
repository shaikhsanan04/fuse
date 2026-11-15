@echo off
title CaptionForge Launcher
echo ========================================================
echo               CaptionForge - Local AI Subtitles
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check Python virtual environment
if exist "captionforge\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=captionforge\.venv\Scripts\python.exe"
    set "BASE_DIR=%~dp0captionforge"
) else if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    set "BASE_DIR=%~dp0"
) else (
    echo [ERROR] Virtual environment not found. Please run setup first!
    pause
    exit /b 1
)

:: 2. Check FFmpeg on PATH
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] FFmpeg was not detected on system PATH.
    echo Please install FFmpeg (e.g. from gyan.dev) and add it to PATH.
    echo.
)

echo [1/3] Starting CaptionForge Backend (FastAPI on port 8000)...
start "CaptionForge Backend" cmd /k "cd /d "%BASE_DIR%" && set PYTHONPATH=%BASE_DIR% && "%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Starting CaptionForge Frontend (Vite on port 5173)...
start "CaptionForge Frontend" cmd /k "cd /d "%BASE_DIR%\frontend" && npm run dev"

echo [3/3] Opening CaptionForge in your default browser...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:5173

echo.
echo ========================================================
echo CaptionForge is running!
echo Live UI: http://127.0.0.1:5173
echo API Docs: http://127.0.0.1:8000/docs
echo Close the popup command windows to stop the servers.
echo ========================================================
