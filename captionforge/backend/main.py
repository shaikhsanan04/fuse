"""
CaptionForge - FastAPI Backend Server

Provides REST and SSE endpoints for:
- Video upload & ffprobe metadata extraction
- Background faster-whisper transcription with streaming progress
- Transcript inspection and interactive editing
- Dynamic ASS subtitle generation for JASSUB live preview
- FFmpeg video burn-in with real-time render progress tracking
- Video streaming (HTTP Range support) and font asset delivery
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .jobs import job_manager, Job
from .styles import list_presets, get_preset, save_custom_preset, delete_custom_preset
from .ass_generator import generate_ass_content
from .transcribe import extract_audio_wav, transcribe_video_audio
from .render import render_video_with_subtitles, check_nvenc_available

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FONTS_DIR = PROJECT_ROOT / "fonts"
WORKSPACE_DIR = PROJECT_ROOT / "workspace"
JASSUB_DIR = PROJECT_ROOT / "frontend" / "node_modules" / "jassub" / "dist"

app = FastAPI(
    title="CaptionForge API",
    description="Local video captioning with faster-whisper, ASS styles, and FFmpeg burn-in",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and web UIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Pydantic Request Models
# -----------------------------------------------------------------------------

class TranscribeRequest(BaseModel):
    language: str = Field(default="auto", description="'auto', 'en', 'hi', or 'hinglish'")
    model: str = Field(default="small", description="'tiny', 'base', 'small', 'medium', 'large-v3-turbo', 'large-v3'")


class AssRequest(BaseModel):
    style_id: str = Field(default="hormozi_pop", description="Preset ID")
    font: Optional[str] = Field(default=None, description="Font family name")
    font_size: Optional[int] = Field(default=None, description="Explicit font size in px")
    overrides: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Style property overrides")
    grouping: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Word grouping parameters")


class TranscriptUpdateRequest(BaseModel):
    words: List[Dict[str, Any]] = Field(..., description="Full list of word tokens with timestamps")
    segments: Optional[List[Dict[str, Any]]] = Field(default=None, description="Segment breakdown")


# -----------------------------------------------------------------------------
# Video Metadata Helper
# -----------------------------------------------------------------------------

def probe_video_metadata(video_path: Path) -> Dict[str, Any]:
    """
    Extract width, height, duration, fps, and orientation using ffprobe.
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration,r_frame_rate,tags:side_data=rotation",
        "-of", "json",
        str(video_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {res.stderr}")

    probe_data = json.loads(res.stdout)
    streams = probe_data.get("streams", [])
    if not streams:
        raise ValueError("No video stream found in uploaded file.")

    stream = streams[0]
    raw_width = int(stream.get("width", 1920))
    raw_height = int(stream.get("height", 1080))

    # Calculate FPS
    fps_parts = stream.get("r_frame_rate", "30/1").split("/")
    fps = round(float(fps_parts[0]) / float(fps_parts[1]), 2) if len(fps_parts) == 2 and float(fps_parts[1]) > 0 else 30.0

    # Duration
    duration = float(stream.get("duration", 0.0))
    if duration == 0.0:
        fmt_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video_path)]
        fmt_res = subprocess.run(fmt_cmd, capture_output=True, text=True)
        duration = float(json.loads(fmt_res.stdout).get("format", {}).get("duration", 0.0))

    # Detect rotation
    rotation = 0
    if "side_data_list" in stream:
        for sd in stream["side_data_list"]:
            if "rotation" in sd:
                rotation = int(sd["rotation"])
                break
    if rotation == 0 and "tags" in stream and "rotate" in stream["tags"]:
        try:
            rotation = int(stream["tags"]["rotate"])
        except ValueError:
            rotation = 0

    if abs(rotation) in (90, 270):
        display_width, display_height = raw_height, raw_width
    else:
        display_width, display_height = raw_width, raw_height

    return {
        "raw_width": raw_width,
        "raw_height": raw_height,
        "width": display_width,
        "height": display_height,
        "duration": duration,
        "fps": fps,
        "rotation": rotation
    }


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/api/styles")
def get_styles():
    """List all available style presets."""
    return list_presets()


@app.get("/api/fonts")
def get_fonts():
    """List bundled fonts available for ASS burn-in and JASSUB preview."""
    fonts = []
    if FONTS_DIR.exists():
        for f in FONTS_DIR.glob("*.ttf"):
            # Clean display name
            display_name = f.stem.replace("-Variable", "").replace("-Regular", "").replace("-Bold", " Bold")
            family = f.stem.split("-")[0]
            if family == "NotoSansDevanagari":
                family = "Noto Sans Devanagari"
            elif family == "BebasNeue":
                family = "Bebas Neue"
            fonts.append({
                "filename": f.name,
                "family": family,
                "display_name": display_name,
                "url": f"/api/fonts/{f.name}"
            })
    return fonts


@app.get("/api/fonts/{filename}")
def serve_font_file(filename: str):
    """Serve font file for JASSUB browser preview font loading."""
    font_file = FONTS_DIR / filename
    if not font_file.is_file():
        raise HTTPException(status_code=404, detail="Font file not found")
    return FileResponse(font_file, media_type="font/ttf")


@app.get("/api/jassub/{file_path:path}")
def serve_jassub_asset(file_path: str):
    """Serve JASSUB WASM and worker assets without Vite bundling collisions."""
    target_file = (JASSUB_DIR / file_path).resolve()
    if not target_file.is_file() or JASSUB_DIR.resolve() not in target_file.parents:
        raise HTTPException(status_code=404, detail="JASSUB asset not found")

    media_type = "application/octet-stream"
    if target_file.suffix == ".js":
        media_type = "application/javascript"
    elif target_file.suffix == ".wasm":
        media_type = "application/wasm"
    elif target_file.suffix == ".woff2":
        media_type = "font/woff2"

    return FileResponse(target_file, media_type=media_type)


@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file, probe its dimensions/duration/rotation,
    and register a new job.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    temp_id = Path(file.filename).stem
    job_target_dir = WORKSPACE_DIR / f"upload_{temp_id}"
    job_target_dir.mkdir(parents=True, exist_ok=True)
    temp_video_path = job_target_dir / file.filename

    # Save uploaded bytes
    try:
        with open(temp_video_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {e}")

    # Probe metadata
    try:
        metadata = probe_video_metadata(temp_video_path)
        metadata["filename"] = file.filename
    except Exception as e:
        if temp_video_path.exists():
            temp_video_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to probe video: {e}")

    # Register Job
    job = job_manager.create_job(video_path=temp_video_path, metadata=metadata)
    
    # Move video to job workspace folder
    final_video_path = WORKSPACE_DIR / job.job_id / f"source_{file.filename}"
    temp_video_path.rename(final_video_path)
    job.video_path = final_video_path

    return {
        "job_id": job.job_id,
        "metadata": job.metadata,
        "video_url": f"/api/video/{job.job_id}"
    }


@app.get("/api/video/{job_id}")
async def stream_video(job_id: str, request: Request):
    """
    Stream source video with HTTP 206 Partial Content (Range header support)
    so the HTML5 video player can scrub cleanly.
    """
    job = job_manager.get_job(job_id)
    if not job or not job.video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    video_path = job.video_path
    file_size = video_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        # Parse range header: "bytes=start-end"
        byte_range = range_header.replace("bytes=", "").split("-")
        start = int(byte_range[0])
        end = int(byte_range[1]) if byte_range[1] else file_size - 1
        content_length = (end - start) + 1

        def iter_chunk():
            with open(video_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_to_read = min(remaining, 64 * 1024)
                    data = f.read(chunk_to_read)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iter_chunk(), status_code=206, headers=headers)

    return FileResponse(video_path, media_type="video/mp4")


# Background task runner for transcription
async def _run_transcription_task(job_id: str, model_size: str, language: str):
    job = job_manager.get_job(job_id)
    if not job:
        return

    try:
        job_manager.update_progress(
            job_id=job_id,
            stage="transcribing",
            progress=5.0,
            message="Extracting 16kHz audio..."
        )

        # 1. Extract audio
        extract_audio_wav(job.video_path, job.audio_path)

        job_manager.update_progress(
            job_id=job_id,
            stage="transcribing",
            progress=15.0,
            message=f"Loading Whisper model '{model_size}'..."
        )

        def on_transcribe_progress(current_sec: float, total_sec: float, pct: float):
            # Scale transcription progress from 15% to 95%
            scaled_pct = 15.0 + (pct * 0.80)
            job_manager.update_progress(
                job_id=job_id,
                stage="transcribing",
                progress=scaled_pct,
                message=f"Transcribing audio... ({current_sec:.1f}s / {total_sec:.1f}s)"
            )

        # 2. Run transcription
        loop = asyncio.get_running_loop()
        transcript = await loop.run_in_executor(
            None,
            lambda: transcribe_video_audio(
                audio_path=job.audio_path,
                total_duration=job.metadata.get("duration", 0.0),
                model_size=model_size,
                language=language,
                progress_callback=on_transcribe_progress
            )
        )

        job.transcript = transcript

        # Save transcript JSON to disk
        transcript_path = WORKSPACE_DIR / job_id / "transcript.json"
        transcript_path.write_text(json.dumps(transcript, indent=2, ensure_ascii=False), encoding="utf-8")

        job_manager.update_progress(
            job_id=job_id,
            stage="ready",
            progress=100.0,
            message=f"Transcription complete! ({len(transcript['words'])} words detected)"
        )

    except Exception as e:
        job_manager.update_progress(
            job_id=job_id,
            stage="error",
            progress=0.0,
            message="Transcription failed",
            error=str(e)
        )


@app.post("/api/transcribe/{job_id}")
async def start_transcription(job_id: str, req: TranscribeRequest):
    """
    Start background transcription with faster-whisper.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_manager.update_progress(
        job_id=job_id,
        stage="transcribing",
        progress=0.0,
        message="Queuing transcription job..."
    )

    # Launch task in background without blocking server
    asyncio.create_task(_run_transcription_task(job_id, req.model, req.language))

    return {"status": "started", "job_id": job_id}


@app.get("/api/progress/{job_id}")
async def stream_progress(job_id: str):
    """
    Server-Sent Events (SSE) stream for real-time progress updates.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    queue = job_manager.subscribe(job_id)

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    # Exit stream once complete or on error
                    if event.get("stage") in ("completed", "error"):
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment
                    yield ": ping\n\n"
        finally:
            job_manager.unsubscribe(job_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/transcript/{job_id}")
def get_transcript(job_id: str):
    """Get the current word-level transcript."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.transcript:
        raise HTTPException(status_code=400, detail="Transcript not ready")
    return job.transcript


@app.put("/api/transcript/{job_id}")
def update_transcript(job_id: str, req: TranscriptUpdateRequest):
    """Update and persist the edited word-level transcript."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.transcript:
        job.transcript = {}

    job.transcript["words"] = req.words
    if req.segments is not None:
        job.transcript["segments"] = req.segments

    # Persist updated transcript
    transcript_path = WORKSPACE_DIR / job_id / "transcript.json"
    transcript_path.write_text(json.dumps(job.transcript, indent=2, ensure_ascii=False), encoding="utf-8")

    return {"status": "saved", "word_count": len(req.words)}


@app.post("/api/ass/{job_id}")
def generate_ass_route(job_id: str, req: AssRequest):
    """
    Generate and return ASS subtitle content for JASSUB live preview.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.transcript or not job.transcript.get("words"):
        raise HTTPException(status_code=400, detail="No transcript available to generate subtitles")

    meta = job.metadata
    width = meta.get("width", 1080)
    height = meta.get("height", 1920)

    ass_text = generate_ass_content(
        words=job.transcript["words"],
        video_width=width,
        video_height=height,
        style_id=req.style_id,
        font=req.font,
        font_size=req.font_size,
        overrides=req.overrides,
        grouping=req.grouping
    )

    # Cache ASS content to disk
    job.ass_path.write_text(ass_text, encoding="utf-8")

    return {
        "job_id": job_id,
        "ass_content": ass_text,
        "style_id": req.style_id
    }


# Background task runner for video rendering
async def _run_render_task(job_id: str, ass_req: AssRequest):
    job = job_manager.get_job(job_id)
    if not job:
        return

    try:
        job_manager.update_progress(
            job_id=job_id,
            stage="rendering",
            progress=0.0,
            message="Preparing subtitles for burn-in..."
        )

        # 1. Regenerate ASS file
        meta = job.metadata
        ass_text = generate_ass_content(
            words=job.transcript["words"],
            video_width=meta.get("width", 1080),
            video_height=meta.get("height", 1920),
            style_id=ass_req.style_id,
            font=ass_req.font,
            font_size=ass_req.font_size,
            overrides=ass_req.overrides,
            grouping=ass_req.grouping
        )
        job.ass_path.write_text(ass_text, encoding="utf-8")

        def on_render_progress(pct: float, current_sec: float, total_sec: float):
            job_manager.update_progress(
                job_id=job_id,
                stage="rendering",
                progress=pct,
                message=f"Burning subtitles with FFmpeg... ({pct:.1f}%)"
            )

        # 2. Burn subtitles with FFmpeg
        await render_video_with_subtitles(
            video_path=job.video_path,
            ass_path=job.ass_path,
            fonts_dir=FONTS_DIR,
            output_path=job.output_video_path,
            total_duration=meta.get("duration", 0.0),
            progress_callback=on_render_progress
        )

        job_manager.update_progress(
            job_id=job_id,
            stage="completed",
            progress=100.0,
            message="Video rendered successfully! Ready to download."
        )

    except Exception as e:
        job_manager.update_progress(
            job_id=job_id,
            stage="error",
            progress=0.0,
            message="Rendering failed",
            error=str(e)
        )


@app.post("/api/render/{job_id}")
async def start_render(job_id: str, req: AssRequest):
    """
    Burn subtitles into final MP4 with FFmpeg and stream progress.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.transcript:
        raise HTTPException(status_code=400, detail="Cannot render without transcript")

    job_manager.update_progress(
        job_id=job_id,
        stage="rendering",
        progress=0.0,
        message="Queuing render job..."
    )

    asyncio.create_task(_run_render_task(job_id, req))

    return {"status": "started", "job_id": job_id}


@app.get("/api/download/{job_id}")
def download_rendered_video(job_id: str):
    """
    Download the final MP4 with burned-in captions.
    """
    job = job_manager.get_job(job_id)
    if not job or not job.output_video_path or not job.output_video_path.exists():
        raise HTTPException(status_code=404, detail="Rendered video not found or not finished yet")

    orig_name = Path(job.metadata.get("filename", "video.mp4")).stem
    download_filename = f"{orig_name}_captioned.mp4"

    return FileResponse(
        job.output_video_path,
        media_type="video/mp4",
        filename=download_filename
    )


@app.post("/api/custom-presets")
def create_custom_preset(preset_data: Dict[str, Any]):
    """Save a user-customized style preset to workspace/presets."""
    try:
        saved = save_custom_preset(preset_data)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/custom-presets/{preset_id}")
def remove_custom_preset(preset_id: str):
    """Delete a user-customized style preset."""
    success = delete_custom_preset(preset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Custom preset not found")
    return {"status": "deleted", "preset_id": preset_id}


@app.get("/api/export/{job_id}/ass")
def export_ass_file(job_id: str):
    """Download the current generated ASS file."""
    job = job_manager.get_job(job_id)
    if not job or not job.ass_path.exists():
        raise HTTPException(status_code=404, detail="ASS file not found")
    return FileResponse(
        job.ass_path,
        media_type="text/plain",
        filename=f"{job_id}.ass"
    )


@app.get("/api/export/{job_id}/srt")
def export_srt_file(job_id: str):
    """Download standard SRT subtitles."""
    job = job_manager.get_job(job_id)
    if not job or not job.transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    segments = job.transcript.get("segments", [])
    if not segments and job.transcript.get("words"):
        from .ass_generator import group_words_into_chunks
        chunks = group_words_into_chunks(job.transcript["words"], max_words=5, max_chars=35)
        segments = [
            {
                "start": float(c[0]["start"]),
                "end": float(c[-1]["end"]),
                "text": " ".join(str(w.get("word", "")).strip() for w in c)
            }
            for c in chunks if c
        ]

    def format_srt_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int(round((seconds - int(seconds)) * 1000))
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    for idx, seg in enumerate(segments, start=1):
        lines.append(str(idx))
        lines.append(f"{format_srt_time(float(seg['start']))} --> {format_srt_time(float(seg['end']))}")
        lines.append(str(seg.get("text", "")).strip())
        lines.append("")

    srt_content = "\n".join(lines)
    srt_path = WORKSPACE_DIR / job_id / "subtitles.srt"
    srt_path.write_text(srt_content, encoding="utf-8")

    return FileResponse(
        srt_path,
        media_type="text/plain",
        filename=f"{job_id}.srt"
    )


# -----------------------------------------------------------------------------
# Server Launcher
# -----------------------------------------------------------------------------

def start():
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    start()
