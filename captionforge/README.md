# CaptionForge 🎬⚡
> **100% Offline Local AI Subtitle Studio** for Windows. Generate word-level captions, preview live via JASSUB WASM, customize aesthetic creator styles, and burn high-quality subtitles using FFmpeg.

---

## ✨ Features
- **100% Offline & Free**: Runs locally on your machine. Zero cloud APIs, zero telemetry, zero monthly subscriptions.
- **CPU-Friendly Defaults**: Powered by `faster-whisper` (`int8` CPU quantization with automatic CUDA acceleration if NVIDIA GPU detected).
- **Aesthetic Creator Presets**:
  - **✨ Aesthetic Editorial** (New!): Two-tier layout with context words on top in smaller scale and massive hero keyword on bottom with ice-blue active highlight (`#A8D4FF`), tight letter-spacing, and diffused ambient drop shadow.
  - **🔥 Hormozi Pop**: 1-3 words, bold uppercase, thick black outline, active gold word pop (`#FFD700`).
  - **🎤 Karaoke Highlight**: Smooth continuous word color sweep (`\k` timing tags).
  - **🌟 Clean Minimal**: Broadcast / podcast bottom single-line subtitle with soft drop shadow.
  - **⬛ Boxed**: Semi-transparent dark backdrop box for noisy or bright videos.
  - **⚡ Neon Glow**: Blurred cyber glow halo with vibrant active pop.
  - **⌨️ Typewriter / Fade**: Smooth alpha fade-in per word.
- **1:1 Live Browser Preview**: Uses **JASSUB** (libass compiled to WebAssembly) directly in the browser. Guarantees that what you see in the live preview is pixel-for-pixel identical to the final exported video.
- **Multilingual Support**:
  - English (`en`)
  - Hindi (`hi`) with bundled Google OFL `Noto Sans Devanagari` font
  - Hinglish (`hinglish`) written in Roman script (e.g. *"Yaar aaj hum kuch naya try karenge"*) with automatic fallback transliteration.
- **Interactive Transcript Editor**: Edit any word or timing, split or merge segments, and seek video by clicking words.
- **Custom Presets**: Save and reload your own custom typography, colors, and layout presets to disk (`workspace/presets/`).
- **Export Options**: Burned MP4 video, `.ass` subtitle file, and `.srt` subtitle file.

---

## 🚀 Quick Start (Single Click)

If you have already installed requirements:
```cmd
start.bat
```
This automatically boots both FastAPI (port 8000) and Vite React UI (port 5173), and opens `http://127.0.0.1:5173` in your default browser.

---

## 🛠️ Step-by-Step Windows Setup

### 1. Prerequisites
1. **Python 3.11+**:
   - Download from [python.org](https://www.python.org/downloads/).
   - ⚠️ **Important**: Check the box **"Add Python to PATH"** during setup.
2. **Node.js 18+ & npm**:
   - Download the LTS installer from [nodejs.org](https://nodejs.org/).
3. **FFmpeg with libass**:
   - Download the **full build** from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) (`ffmpeg-git-full.7z` or `ffmpeg-release-full.7z`).
   - Extract the folder (e.g. to `C:\ffmpeg`).
   - Add `C:\ffmpeg\bin` to your Windows System Environment Variable `Path`.
   - **Verify in Command Prompt**:
     ```cmd
     ffmpeg -version
     ffprobe -version
     ```
     Ensure `libass` is listed under configuration.

---

### 2. Install Backend
Open Command Prompt in the `captionforge` directory:
```cmd
cd captionforge

:: Create virtual environment
python -m venv .venv

:: Activate virtual environment
.venv\Scripts\activate

:: Install dependencies
pip install -r requirements.txt

:: Download bundled Google Fonts (Montserrat, Poppins, Inter, Roboto, Anton, Bebas Neue, Noto Sans Devanagari)
python download_fonts.py
```
> **Note on First Run**: Faster-Whisper downloads the chosen Whisper model (e.g. `small` is ~460MB) once to `~/.cache/huggingface/hub`. Subsequent runs operate completely offline.

---

### 3. Install Frontend
```cmd
cd frontend
npm install
```

---

### 4. Running the Application Manually

**Terminal 1 (Backend API):**
```cmd
cd captionforge
.venv\Scripts\activate
set PYTHONPATH=%CD%
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 (Frontend UI):**
```cmd
cd captionforge\frontend
npm run dev
```

Open your browser at:
👉 **`http://127.0.0.1:5173`**

---

## 📂 Project Architecture
```
captionforge/
├── backend/
│   ├── main.py              # FastAPI REST & SSE endpoints
│   ├── transcribe.py        # faster-whisper CPU int8 & CUDA transcription
│   ├── ass_generator.py     # ASS subtitle tag engine (editorial, pop, karaoke, etc.)
│   ├── styles.py            # Presets & custom workspace preset persistence
│   ├── render.py            # FFmpeg burn-in engine with progress streaming
│   ├── jobs.py              # In-memory thread-safe job store
│   └── requirements.txt     # Pinned Python package versions
├── frontend/
│   ├── src/
│   │   ├── components/      # VideoPlayerPreview (JASSUB), Tabs, Header, ExportModal
│   │   ├── App.jsx          # Vercel Geist dark theme reactive application
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js       # JASSUB WASM and worker optimizations
├── fonts/                   # Bundled open-source fonts for FFmpeg & JASSUB
├── workspace/               # Video uploads, JSON transcripts, rendered MP4s (git-ignored)
├── start.bat                # 1-click Windows launcher
└── README.md
```

---

## 🎨 Style Customization Tips
- **Aesthetic Editorial**: Best for modern TikTok / Reels creators. Uses natural sentence case, two-tier text hierarchy (context top line, hero keyword bottom line), soft Ice Blue accent (`#A8D4FF`), and negative letter spacing (`-2px`).
- **Safe Area Guides**: Toggle the safe-area overlay in the player toolbar to check caption placement against TikTok / Instagram Reels profile bars, likes buttons, and captions.
- **Exporting**: Click "Export" to burn captions into a new MP4. You can also export pure `.srt` and `.ass` subtitle files directly from the export window.
