@echo off
title Create Fuse Desktop Shortcut
cd /d "%~dp0"

echo Creating Fuse Desktop Shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [System.Environment]::GetFolderPath('Desktop'); $sc = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'Fuse.lnk')); $sc.TargetPath = [System.IO.Path]::Combine($pwd.Path, 'captionforge', '.venv', 'Scripts', 'pythonw.exe'); $sc.Arguments = 'captionforge\desktop_app.py'; $sc.WorkingDirectory = $pwd.Path; $sc.IconLocation = [System.IO.Path]::Combine($pwd.Path, 'captionforge', 'assets', 'fuse.ico') + ',0'; $sc.Description = 'Fuse - Offline AI Subtitle Studio'; $sc.Save(); Write-Host 'Desktop shortcut created successfully!'"

echo.
echo You can now launch Fuse directly from your desktop.
timeout /t 3 >nul
exit
