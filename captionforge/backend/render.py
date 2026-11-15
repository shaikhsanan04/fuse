"""
CaptionForge - Render Engine

Burns ASS subtitles into video via FFmpeg using the `ass` filter and custom fontsdir.
Parses `-progress pipe:1` in real-time to stream actual render percentage.
"""

import os
import sys
import re
import asyncio
import subprocess
from pathlib import Path
from typing import Callable, Optional

# Global queue-safe render lock
RENDER_LOCK = asyncio.Lock()


def escape_ffmpeg_filter_path(path: Path) -> str:
    """
    Escape Windows paths for FFmpeg filter arguments.
    Replaces backslashes with slashes, escapes colons (C\\:) and single quotes.
    """
    p = str(path.resolve()).replace("\\", "/")
    p = p.replace(":", r"\:")
    p = p.replace("'", r"\'")
    return p


def check_nvenc_available() -> bool:
    """
    Check if NVIDIA NVENC encoder is usable on the current machine.
    """
    try:
        res = subprocess.run(
            ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "nullsrc=s=64x64:d=0.1", "-c:v", "h264_nvenc", "-f", "null", "-"],
            capture_output=True,
            timeout=3
        )
        return res.returncode == 0
    except Exception:
        return False


async def render_video_with_subtitles(
    video_path: Path,
    ass_path: Path,
    fonts_dir: Path,
    output_path: Path,
    total_duration: float,
    use_nvenc: bool = False,
    progress_callback: Optional[Callable[[float, float, float], None]] = None
) -> Path:
    """
    Burn subtitles into video using FFmpeg and stream progress from `-progress pipe:1`.
    Protected by RENDER_LOCK to ensure queue safety.
    """
    async with RENDER_LOCK:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        escaped_ass = escape_ffmpeg_filter_path(ass_path)
        escaped_fonts = escape_ffmpeg_filter_path(fonts_dir)
        ass_filter = f"ass=filename='{escaped_ass}':fontsdir='{escaped_fonts}'"

        encoder = "libx264"
        encoder_args = ["-crf", "18", "-preset", "veryfast"]

        if use_nvenc and check_nvenc_available():
            encoder = "h264_nvenc"
            encoder_args = ["-cq", "20", "-preset", "p4"]

        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vf", ass_filter,
            "-c:v", encoder,
            *encoder_args,
            "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-movflags", "+faststart",
            "-progress", "pipe:1",
            str(output_path)
        ]

        # Launch FFmpeg asynchronously
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        duration = max(1.0, total_duration)

        # Parse -progress output line by line
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            line_str = line.decode("utf-8", errors="ignore").strip()
            if "=" in line_str:
                key, val = line_str.split("=", 1)
                key = key.strip()
                val = val.strip()

                if key == "out_time_us":
                    try:
                        time_sec = int(val) / 1_000_000.0
                        pct = round(min(99.0, (time_sec / duration) * 100.0), 1)
                        if progress_callback:
                            progress_callback(pct, time_sec, duration)
                    except ValueError:
                        pass
                elif key == "progress" and val == "end":
                    if progress_callback:
                        progress_callback(100.0, duration, duration)

        await process.wait()

        if process.returncode != 0:
            stderr_output = (await process.stderr.read()).decode("utf-8", errors="ignore")
            raise RuntimeError(f"FFmpeg render failed with code {process.returncode}:\n{stderr_output[-1000:]}")

        if progress_callback:
            progress_callback(100.0, duration, duration)

        return output_path
