@echo off
title Fuse Desktop
cd /d "%~dp0"
set PYTHONPATH=captionforge

REM Check if python virtual environment exists
if not exist "captionforge\.venv\Scripts\pythonw.exe" (
    echo Error: Python virtual environment not found in captionforge\.venv
    echo Please install dependencies first using:
    echo   cd captionforge
    echo   python -m venv .venv
    echo   .venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

REM Build frontend UI assets if dist does not exist
if not exist "captionforge\frontend\dist" (
    echo Building frontend UI assets...
    cd captionforge\frontend
    call npm run build
    cd ..\..
)

REM Generate icon assets if not present
if not exist "captionforge\assets\fuse.ico" (
    "captionforge\.venv\Scripts\python.exe" captionforge\make_icons.py
)

REM Launch native desktop window cleanly without persistent command prompt window
start "" "captionforge\.venv\Scripts\pythonw.exe" captionforge\desktop_app.py
exit
