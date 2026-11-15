# Fuse 🎬⚡
> **100% Offline AI Subtitle Studio & Desktop App for Windows.** Generate animated word-level captions, preview in real time via JASSUB WebAssembly, customize creator-grade typography presets, and export high-definition captioned videos using FFmpeg — completely free and offline.

---

## ⚡ Quick Download for Windows (No Setup Required)

If you just want to use the app without installing Python, Git, Node.js, or FFmpeg:

1. Go to **[Releases](https://github.com/shaikhsanan04/fuse/releases)**.
2. Download **`Fuse_Setup.exe`**.
3. Double-click the installer, click **Next $\rightarrow$ Install $\rightarrow$ Finish**.
4. Launch **Fuse** directly from your Desktop or Start Menu!

---

## ✨ Key Features

- **🖥️ Standalone Windows Desktop App**: Native Windows Edge WebView2 window with dedicated taskbar grouping, multi-scale icons, and zero-flicker startup.
- **🔒 100% Offline & Private**: Runs entirely locally on your PC. No cloud APIs, no subscription fees, no telemetry, and your videos never leave your machine.
- **⚡ Fast Local AI Transcription**: Powered by `faster-whisper` (`int8` quantization for smooth CPU performance, with automatic CUDA acceleration if an NVIDIA GPU is present).
- **🎨 Creator Typography & Presets**:
  - **✨ Aesthetic Editorial**: Two-tier layout with context words on top in smaller scale and massive hero keyword on bottom with ice-blue active highlight (`#A8D4FF`), tight letter-spacing, and diffused ambient drop shadow.
  - **🔥 Hormozi Pop**: 1–3 bold uppercase words with high-contrast outlines and active gold word pop (`#FFD700`).
  - **🎤 Karaoke Highlight**: Smooth continuous word-fill sweep using precise `\k` timing tags.
  - **🌟 Clean Minimal**: Modern broadcast / podcast bottom single-line subtitle with subtle soft shadow.
  - **⬛ Boxed**: Semi-transparent dark backdrop box for maximum legibility over bright or noisy video backgrounds.
  - **⚡ Neon Glow**: Cyber glow halo with vibrant active color accents.
  - **⌨️ Typewriter / Fade**: Clean per-word alpha fade-in animation.
- **👁️ 1:1 Live Browser & Desktop Preview**: Embedded **JASSUB** (libass compiled directly to WebAssembly) renders subtitles in real-time on your canvas, guaranteeing that what you preview is pixel-for-pixel identical to the exported video.
- **🌐 Multilingual Support**:
  - **English** (`en`)
  - **Hindi** (`hi`) with bundled Google OFL `Noto Sans Devanagari` font
  - **Hinglish** (`hinglish`) in Roman script with automatic phonetic intelligence
- **✏️ Interactive Transcript Editor**: Click any word to jump video playback, edit words or timestamps in real time, and split/merge subtitle segments.
- **💾 Native Windows File Export**:
  - **Save As...**: Native Windows Save File dialog to choose your destination folder (Desktop, Videos, External drives).
  - **Quick Save to Downloads**: Instant 1-click copy directly into your Windows `Downloads` folder in milliseconds.
  - **Reveal in Explorer & Play Video**: Open the finished video in Windows File Explorer or play it in your default media player with one click.
  - **Export Formats**: Hardcoded MP4 Video, Advanced SubStation Alpha (`.ass`), and SubRip (`.srt`).
- **🔔 Built-in Auto-Update Alerts**: Checks GitHub Releases on launch and displays a clean banner when a newer version is available.

---

## 🛠️ Developer Setup (Running from Source)

If you are a developer and want to modify or run the codebase locally:

### 1. Prerequisites
- **Python 3.11+** (Check *"Add Python to PATH"* during install)
- **Node.js 18+ & npm**
- **FFmpeg with libass** (or use the portable binaries bundled in `captionforge/bin`)

### 2. Clone & Install
```cmd
git clone https://github.com/shaikhsanan04/fuse.git
cd fuse

:: Setup Python virtual environment
cd captionforge
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python download_fonts.py
python make_icons.py
cd ..

:: Setup and build frontend UI
cd captionforge\frontend
npm install
npm run build
cd ..\..
```

### 3. Launching
- **Desktop Window**: Double-click `Launch_Fuse.bat` (or run `Create_Desktop_Shortcut.bat` to create a desktop shortcut).
- **Web Browser Mode**: Double-click `start.bat` and open `http://127.0.0.1:5173`.

---

## 📦 Building the Standalone Installer (`Fuse_Setup.exe`)

You can compile a self-contained 1-click installer for distribution to friends:

```cmd
Build_Installer.bat
```
*(Or run `python build_installer.py`)*

* Uses **PyInstaller** to bundle Python and all machine learning libraries.
* Uses **Inno Setup 6** to package portable FFmpeg binaries, fonts, icons, and UI assets into `dist_installer/Fuse_Setup.exe` (~180 MB).

---

## 🔄 How Auto-Updates Work

1. On launch, Fuse queries the GitHub Releases API (`api.github.com/repos/shaikhsanan04/fuse/releases/latest`).
2. If a newer version tag (e.g., `v1.1.0` vs local `1.0.0`) is published on GitHub, Fuse shows an in-app banner:
   > **`⚡ Fuse v1.1.0 is available! [Update Now] [X]`**
3. Clicking **Update Now** opens your GitHub release download page in the user's default browser.
4. If the user is offline, the check fails silently without blocking the app.

---

## 🏗️ Project Architecture

```
Fuse/
├── Launch_Fuse.bat                  # Desktop window launcher
├── Create_Desktop_Shortcut.bat      # Generates Fuse shortcut on Desktop
├── Build_Installer.bat              # 1-Click compiler for Fuse_Setup.exe
├── build_installer.py               # PyInstaller + Inno Setup build pipeline
├── start.bat                        # Web browser dual-server launcher
└── captionforge/
    ├── desktop_app.py               # Native PyWebView (Edge WebView2) desktop runner
    ├── make_icons.py                # Multi-resolution ICO & PNG generator
    ├── assets/                      # Desktop & taskbar icon files (fuse.ico, fuse.png)
    ├── bin/                         # Bundled portable FFmpeg binaries (ffmpeg.exe, ffprobe.exe)
    ├── backend/
    │   ├── main.py                  # FastAPI REST & SSE endpoints + static file mount
    │   ├── version.py               # Version metadata & GitHub release checker
    │   ├── transcribe.py            # Faster-Whisper offline transcription engine
    │   ├── ass_generator.py         # Word-level ASS subtitle compiler & keywording
    │   ├── styles.py                # Subtitle styling presets & typography rules
    │   ├── render.py                # FFmpeg libass video burn-in pipeline
    │   └── jobs.py                  # Persistent job manager & disk recovery
    └── frontend/
        ├── src/                     # React + Tailwind CSS studio interface
        │   ├── components/          # Video preview, transcript editor, update banner
        │   └── lib/                 # JASSUB WebAssembly subtitle renderer
        └── dist/                    # Compiled production UI bundle
```

---

## 📜 License
MIT License. Open source and free for personal and commercial video production.
