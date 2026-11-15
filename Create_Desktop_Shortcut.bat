@echo off
title Create Fuse Desktop Shortcut
cd /d "%~dp0"

echo Creating Fuse Desktop Shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Fuse.lnk')); $sc.TargetPath = [System.IO.Path]::Combine($pwd.Path, 'Launch_Fuse.bat'); $sc.WorkingDirectory = $pwd.Path; $sc.IconLocation = [System.IO.Path]::Combine($pwd.Path, 'captionforge', 'assets', 'fuse.ico') + ',0'; $sc.Description = 'Fuse - Offline AI Subtitle Studio'; $sc.Save(); Write-Host 'Desktop shortcut created successfully!'"

echo.
echo You can now launch Fuse directly from your desktop.
timeout /t 3 >nul
exit
