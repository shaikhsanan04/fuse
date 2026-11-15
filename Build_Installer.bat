@echo off
title Build Fuse Standalone Installer
cd /d "%~dp0"

echo =======================================================
echo          FUSE STANDALONE INSTALLER BUILDER
echo =======================================================
echo.

if not exist "captionforge\.venv\Scripts\python.exe" (
    echo Error: Python virtual environment not found in captionforge\.venv
    pause
    exit /b 1
)

"captionforge\.venv\Scripts\python.exe" build_installer.py
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installer built successfully in dist_installer\Fuse_Setup.exe
) else (
    echo.
    echo Build failed. Check the error messages above.
)

pause
