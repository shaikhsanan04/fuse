@echo off
title Fuse Desktop (Live Logs)
cd /d "%~dp0"
cd ..
set PYTHONPATH=captionforge

captionforge\.venv\Scripts\python.exe captionforge\desktop_app.py
pause
