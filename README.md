# Fuse 🎬⚡
> **100% Offline AI Subtitle Studio & Desktop App for Windows.** Generate word-level captions, preview in real time via JASSUB WebAssembly, customize creator-grade typography presets, and export high-definition captioned videos using FFmpeg — completely free and offline.

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

---

## 🚀 Quick Start (Running on Windows)

### 1. Prerequisites
Before running Fuse from source, make sure you have:

1. **Python 3.11+**:
   - Download from [python.org](https://www.python.org/downloads/).
   - ⚠️ **Check "Add Python to PATH"** during installation.
2. **Node.js 18+ & npm**:
   - Download from [nodejs.org](https://nodejs.org/).
3. **FFmpeg with libass**:
   - Download the full build from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) (`ffmpeg-release-full.7z`).
   - Extract to a folder (e.g., `C:\ffmpeg`) and add `C:\ffmpeg\bin` to your Windows Environment Variables `Path`.
   - Verify in Command Prompt: `ffmpeg -version` (ensure `libass` is listed).

---

### 2. Setup & Installation

Clone the repository and open Command Prompt in the project folder:

```cmd
git clone https://github.com/shaikhsanan04/fuse.git
cd fuse
```

#### Install Backend & Desktop Dependencies:
```cmd
cd captionforge
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python download_fonts.py
python make_icons.py
cd ..
```

#### Install & Build Frontend:
```cmd
cd captionforge\frontend
npm install
npm run build
cd ..\..
```

---

### 3. Launching Fuse

- **Desktop Window (Recommended)**:
  Double-click `Launch_Fuse.bat` in the root folder, or run `Create_Desktop_Shortcut.bat` to place a **Fuse** icon directly on your Windows Desktop.
- **Web Browser Mode**:
  If you prefer running in Chrome / Edge:
  ```cmd
  start.bat
  ```
  And navigate to `http://127.0.0.1:5173`.

---

## 📦 How Distribution & Installation Works for End-Users

| Method | Target Audience | How It Works |
|---|---|---|
| **Developer / Source (Current)** | Developers, GitHub users | Clone repo, set up Python + FFmpeg, run `Launch_Fuse.bat`. |
| **Standalone Installer (`.exe`)** | Friends & non-technical users | A single `Fuse_Setup.exe` built with PyInstaller & Inno Setup that bundles Python, FFmpeg, and the UI. Users click Next -> Finish without installing Python. |
| **Portable Zip** | Plug-and-play users | Download and extract a pre-built folder containing `Fuse.exe`, double-click to launch immediately. |

### Are Auto-Updates Active?
- **Currently**: Auto-updates are **off**. Pushing updates to GitHub updates the repository, but does not automatically change installed builds on other computers.
- **Auto-Update Roadmap**:
  - We can enable an automated GitHub Release checker: when Fuse launches, it queries `api.github.com/repos/shaikhsanan04/fuse/releases/latest`.
  - If a newer release exists, Fuse alerts the user with a 1-click update toast.

---

## 🏗️ Architecture

```
Fuse/
├── Launch_Fuse.bat                  # Quiet Windows Desktop launcher
├── Create_Desktop_Shortcut.bat      # Generates Fuse shortcut on Desktop
├── start.bat                        # Web browser dual-server launcher
└── captionforge/
    ├── desktop_app.py               # Native PyWebView (Edge WebView2) desktop runner
    ├── make_icons.py                # Multi-resolution ICO & PNG generator
    ├── assets/                      # Desktop & taskbar icon files (fuse.ico, fuse.png)
    ├── backend/
    │   ├── main.py                  # FastAPI REST & SSE endpoints + static file mount
    │   ├── transcribe.py            # Faster-Whisper offline transcription engine
    │   ├── ass_generator.py         # Word-level ASS subtitle compiler & keywording
    │   ├── styles.py                # Subtitle styling presets & typography rules
    │   ├── render.py                # FFmpeg libass video burn-in pipeline
    │   └── jobs.py                  # Persistent job manager & disk recovery
    └── frontend/
        ├── src/                     # React + Tailwind CSS studio interface
        │   ├── components/          # Video preview, transcript editor, export modal
        │   └── lib/                 # JASSUB WebAssembly subtitle renderer
        └── dist/                    # Compiled production UI bundle
```

---

## 📜 License
MIT License. Open source and free for personal and commercial video production.
