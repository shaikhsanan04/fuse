"""
Fuse - Automated Standalone Installer Builder (PyInstaller + Inno Setup)

Step 1: Build production frontend UI (Vite)
Step 2: Generate multi-scale Windows icon assets
Step 3: Ensure portable FFmpeg binaries (ffmpeg.exe, ffprobe.exe) are present
Step 4: Compile standalone Windows executable with PyInstaller
Step 5: Bundle everything into a single 1-click Windows Installer wizard (Fuse_Setup.exe) using Inno Setup
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
CAPTIONFORGE_DIR = PROJECT_ROOT / "captionforge"
DIST_INSTALLER_DIR = PROJECT_ROOT / "dist_installer"
DIST_PYINSTALLER_DIR = PROJECT_ROOT / "dist_pyinstaller"
BUILD_PYINSTALLER_DIR = PROJECT_ROOT / "build_pyinstaller"
ISCC_PATH = Path(r"C:\Users\sanan\AppData\Local\Programs\Inno Setup 6\ISCC.exe")

def run_step(msg, func):
    print(f"\n[+] {msg}...")
    func()
    print(f"[OK] {msg} completed.")

def ensure_prerequisites():
    if not ISCC_PATH.exists():
        raise RuntimeError(f"Inno Setup compiler not found at {ISCC_PATH}")

    # Generate icons
    ico_path = CAPTIONFORGE_DIR / "assets" / "fuse.ico"
    if not ico_path.exists():
        subprocess.run([sys.executable, str(CAPTIONFORGE_DIR / "make_icons.py")], check=True)

    # Build frontend
    dist_html = CAPTIONFORGE_DIR / "frontend" / "dist" / "index.html"
    if not dist_html.exists():
        subprocess.run(["npm", "run", "build"], cwd=str(CAPTIONFORGE_DIR / "frontend"), shell=True, check=True)

    # Ensure FFmpeg binaries exist
    ffmpeg_exe = CAPTIONFORGE_DIR / "bin" / "ffmpeg.exe"
    ffprobe_exe = CAPTIONFORGE_DIR / "bin" / "ffprobe.exe"
    if not ffmpeg_exe.exists() or not ffprobe_exe.exists():
        src_dir = Path(r"C:\Users\sanan\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin")
        bin_dir = CAPTIONFORGE_DIR / "bin"
        bin_dir.mkdir(parents=True, exist_ok=True)
        if (src_dir / "ffmpeg.exe").exists():
            shutil.copy2(src_dir / "ffmpeg.exe", bin_dir / "ffmpeg.exe")
            shutil.copy2(src_dir / "ffprobe.exe", bin_dir / "ffprobe.exe")

def compile_pyinstaller():
    dist_fuse = DIST_PYINSTALLER_DIR / "Fuse" / "Fuse.exe"
    if dist_fuse.exists():
        print("Existing PyInstaller build found, reusing binary.")
        return

    cmd = [
        str(CAPTIONFORGE_DIR / ".venv" / "Scripts" / "pyinstaller.exe"),
        "--name", "Fuse",
        "--windowed",
        "--icon", str(CAPTIONFORGE_DIR / "assets" / "fuse.ico"),
        "--distpath", str(DIST_PYINSTALLER_DIR),
        "--workpath", str(BUILD_PYINSTALLER_DIR),
        "--noconfirm",
        str(CAPTIONFORGE_DIR / "desktop_app.py")
    ]
    subprocess.run(cmd, check=True)

def generate_and_run_inno():
    DIST_INSTALLER_DIR.mkdir(parents=True, exist_ok=True)
    iss_path = PROJECT_ROOT / "installer.iss"

    fuse_dist = str((DIST_PYINSTALLER_DIR / "Fuse").resolve())
    ico_file = str((CAPTIONFORGE_DIR / "assets" / "fuse.ico").resolve())
    fonts_dir = str((CAPTIONFORGE_DIR / "fonts").resolve())
    bin_dir = str((CAPTIONFORGE_DIR / "bin").resolve())
    frontend_dist = str((CAPTIONFORGE_DIR / "frontend" / "dist").resolve())
    output_dir = str(DIST_INSTALLER_DIR.resolve())

    iss_content = f"""
; Inno Setup Script for Fuse
; Standalone Windows Desktop Installer

#define MyAppName "Fuse"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Shaikh Sanan"
#define MyAppURL "https://github.com/shaikhsanan04/fuse"
#define MyAppExeName "Fuse.exe"

[Setup]
AppId={{{{A7E2941B-5F10-4A02-B831-C03C9E2DA6F1}}
AppName={{#MyAppName}}
AppVersion={{#MyAppVersion}}
AppPublisher={{#MyAppPublisher}}
AppPublisherURL={{#MyAppURL}}
AppSupportURL={{#MyAppURL}}
AppUpdatesURL={{#MyAppURL}}/releases
DefaultDirName={{userappdata}}\\Programs\\Fuse
DisableProgramGroupPage=yes
DefaultGroupName={{#MyAppName}}
OutputDir={output_dir}
OutputBaseFilename=Fuse_Setup
SetupIconFile={ico_file}
UninstallDisplayIcon={{app}}\\{{#MyAppExeName}}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{{cm:CreateDesktopIcon}}"; GroupDescription: "{{cm:AdditionalIcons}}"

[Files]
; Main PyInstaller executable bundle
Source: "{fuse_dist}\\*"; DestDir: "{{app}}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Bundled portable FFmpeg binaries
Source: "{bin_dir}\\*"; DestDir: "{{app}}\\bin"; Flags: ignoreversion recursesubdirs createallsubdirs
; Bundled Google Fonts
Source: "{fonts_dir}\\*"; DestDir: "{{app}}\\fonts"; Flags: ignoreversion recursesubdirs createallsubdirs
; Bundled production frontend UI
Source: "{frontend_dist}\\*"; DestDir: "{{app}}\\frontend\\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
; App icons
Source: "{ico_file}"; DestDir: "{{app}}\\assets"; Flags: ignoreversion

[Icons]
Name: "{{autoprograms}}\\{{#MyAppName}}"; Filename: "{{app}}\\{{#MyAppExeName}}"; IconFilename: "{{app}}\\assets\\fuse.ico"; WorkingDir: "{{app}}"
Name: "{{autodesktop}}\\{{#MyAppName}}"; Filename: "{{app}}\\{{#MyAppExeName}}"; IconFilename: "{{app}}\\assets\\fuse.ico"; WorkingDir: "{{app}}"; Tasks: desktopicon

[Run]
Filename: "{{app}}\\{{#MyAppExeName}}"; Description: "{{cm:LaunchProgram,{{#StringChange(MyAppName, '&', '&&')}}}}"; Flags: nowait postinstall skipifsilent
"""
    with open(iss_path, "w", encoding="utf-8") as f:
        f.write(iss_content.strip())

    print("Running Inno Setup compiler (ISCC.exe)...")
    subprocess.run([str(ISCC_PATH), "/Qp", str(iss_path)], check=True)

    setup_exe = DIST_INSTALLER_DIR / "Fuse_Setup.exe"
    if setup_exe.exists():
        size_mb = setup_exe.stat().st_size / (1024 * 1024)
        print(f"\n=======================================================")
        print(f"SUCCESS: Installer built at:\n  -> {setup_exe}\n  -> Size: {size_mb:.1f} MB")
        print(f"=======================================================\n")
    else:
        raise FileNotFoundError("Fuse_Setup.exe was not created.")

def main():
    print("=======================================================")
    print("       FUSE 1-CLICK STANDALONE INSTALLER BUILDER       ")
    print("=======================================================")
    run_step("Prerequisites Check", ensure_prerequisites)
    run_step("PyInstaller Compilation", compile_pyinstaller)
    run_step("Inno Setup Packaging", generate_and_run_inno)

if __name__ == "__main__":
    main()
