#!/usr/bin/env python3
"""
CaptionForge - Phase 1 CLI Proof of Concept (poc.py)

Pipeline:
1. Probe video metadata (dimensions, rotation, duration, fps) via ffprobe.
2. Extract 16kHz mono PCM WAV via FFmpeg.
3. Transcribe audio using faster-whisper with word-level timestamps & VAD filter.
   - Auto-detect CUDA vs CPU (int8 compute type).
   - Hinglish support: biased prompt + Devanagari transliteration fallback.
4. Save word-level timestamps to JSON.
5. Generate ASS subtitle file with word-by-word highlight ("Hormozi Pop" style):
   - PlayResX & PlayResY matching video display resolution.
   - Word chunking (1-3 words) with non-overlapping time windows.
   - Active word highlighted in bright yellow/gold with subtle scale pop.
6. Burn subtitles into MP4 with FFmpeg using the `ass` filter and `fontsdir`.
"""

import os
import sys
import json
import re
import shutil
import argparse
import subprocess
from pathlib import Path

# PyAV 19+ compatibility patch: remove deprecated metadata_errors argument if present
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except ImportError:
    pass

from faster_whisper import WhisperModel

try:
    from indic_transliteration import sanscript
except ImportError:
    sanscript = None


def probe_video(video_path: Path) -> dict:
    """
    Probe video file using ffprobe to obtain width, height, duration, fps,
    and detect rotation metadata to calculate oriented display dimensions.
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration,r_frame_rate,tags:side_data=rotation",
        "-of", "json",
        str(video_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    probe_data = json.loads(res.stdout)
    
    stream = probe_data["streams"][0]
    raw_width = int(stream["width"])
    raw_height = int(stream["height"])
    
    # Calculate FPS
    fps_parts = stream.get("r_frame_rate", "30/1").split("/")
    fps = round(float(fps_parts[0]) / float(fps_parts[1]), 2) if len(fps_parts) == 2 and float(fps_parts[1]) > 0 else 30.0

    # Read duration (fall back to format duration if stream duration is absent)
    duration = float(stream.get("duration", 0.0))
    if duration == 0.0:
        fmt_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video_path)]
        fmt_res = subprocess.run(fmt_cmd, capture_output=True, text=True, check=True)
        duration = float(json.loads(fmt_res.stdout).get("format", {}).get("duration", 0.0))

    # Detect rotation in side_data or stream tags (e.g. phone recordings)
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

    # If rotated by 90 or 270 degrees, display width and height are swapped
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


def extract_audio(video_path: Path, output_wav: Path) -> Path:
    """
    Extract 16kHz mono 16-bit PCM WAV audio for Whisper ingestion.
    """
    output_wav.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_wav)
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return output_wav


def detect_device_and_compute():
    """
    Auto-detect CUDA capability. Fall back to CPU with int8 quantization.
    """
    try:
        import ctranslate2
        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def contains_devanagari(text: str) -> bool:
    """Check if string contains any Devanagari characters (U+0900 to U+097F)."""
    return any("\u0900" <= ch <= "\u097f" for ch in text)


def transliterate_to_roman(text: str) -> str:
    """Transliterate Devanagari text to Roman script using ITRANS."""
    if sanscript is not None and contains_devanagari(text):
        return sanscript.transliterate(text, sanscript.DEVANAGARI, sanscript.ITRANS)
    return text


def transcribe_audio(audio_path: Path, model_size: str = "small", language: str = "auto") -> dict:
    """
    Transcribe audio with faster-whisper, word timestamps, and VAD filter.
    Handles Hinglish bias prompt and Devanagari transliteration fallback.
    """
    device, compute_type = detect_device_and_compute()
    print(f"[*] Initializing Whisper model '{model_size}' on {device.upper()} ({compute_type})...")
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    transcribe_kwargs = {
        "word_timestamps": True,
        "vad_filter": True,
    }

    if language == "hinglish":
        # Guide Whisper towards Roman script Hindi via initial_prompt
        transcribe_kwargs["language"] = "hi"
        transcribe_kwargs["initial_prompt"] = (
            "Yaar aaj hum kuch naya try karenge. Video mein captions Hinglish Roman script mein aayenge."
        )
    elif language != "auto":
        transcribe_kwargs["language"] = language

    print("[*] Transcribing audio with word-level timestamps...")
    segments, info = model.transcribe(str(audio_path), **transcribe_kwargs)

    raw_segments = []
    all_words = []

    for seg in segments:
        seg_text = seg.text.strip()
        if language == "hinglish" and contains_devanagari(seg_text):
            seg_text = transliterate_to_roman(seg_text)

        seg_dict = {
            "id": seg.id,
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg_text,
            "words": []
        }

        if seg.words:
            for w in seg.words:
                w_text = w.word.strip()
                if language == "hinglish" and contains_devanagari(w_text):
                    w_text = transliterate_to_roman(w_text)

                word_entry = {
                    "word": w_text,
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "probability": round(w.probability, 3)
                }
                seg_dict["words"].append(word_entry)
                all_words.append(word_entry)

        raw_segments.append(seg_dict)

    return {
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(info.duration, 3),
        "segments": raw_segments,
        "words": all_words
    }


def format_ass_time(seconds: float) -> str:
    """
    Convert seconds into ASS timecode format: H:MM:SS.cs (centiseconds).
    Example: 65.432 -> 0:01:05.43
    """
    if seconds < 0:
        seconds = 0.0
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 0
        s += 1
        if s >= 60:
            s = 0
            m += 1
            if m >= 60:
                m = 0
                h += 1
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def group_words_into_chunks(words: list, max_words: int = 3, max_chars: int = 24, max_pause: float = 0.45) -> list:
    """
    Group word tokens into readable subtitle chunks for short-form video.
    Guarantees that successive chunks never overlap in time.
    """
    if not words:
        return []

    chunks = []
    current_chunk = []
    current_chars = 0

    for i, w in enumerate(words):
        word_len = len(w["word"])
        
        # Check if pause between previous word and current word exceeds max_pause
        pause = 0.0
        if current_chunk:
            pause = w["start"] - current_chunk[-1]["end"]

        should_split = (
            len(current_chunk) >= max_words or
            (current_chars + word_len + 1 > max_chars and len(current_chunk) > 0) or
            pause > max_pause
        )

        if should_split and current_chunk:
            chunks.append(current_chunk)
            current_chunk = []
            current_chars = 0

        current_chunk.append(w)
        current_chars += word_len + 1

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def generate_ass(words: list, width: int, height: int, output_ass: Path, font_name: str = "Montserrat") -> Path:
    """
    Generate an Advanced SubStation Alpha (.ass) file with Hormozi-style
    word-by-word highlight.
    
    ASS Structure:
    - PlayResX & PlayResY match exact video resolution.
    - Font size is relative to video height (5.2% of height).
    - Alignment=2 (Bottom Center), MarginV placed at ~18% from bottom.
    - Outline=5, Shadow=2 for maximum contrast on any background.
    - Active word highlighted in bright yellow (&H0000D7FF&) with subtle 110% scale pop.
    """
    # Auto-fallback to Noto Sans Devanagari if text contains Devanagari script
    has_devanagari = any(contains_devanagari(w.get("word", "")) for w in words)
    if has_devanagari and font_name not in ["Noto Sans Devanagari"]:
        font_name = "Noto Sans Devanagari"

    # Relative font size based on video height (looks great on both 1080x1920 and 1920x1080)
    font_size = max(24, int(height * 0.052))
    outline_width = max(3, int(font_size * 0.075))
    shadow_depth = max(1, int(outline_width * 0.4))
    margin_v = int(height * 0.18)

    # Colors in ASS are &HAABBGGRR (Alpha, Blue, Green, Red)
    # Active: Bright Gold/Yellow -> R=FF, G=D7, B=00 -> &H0000D7FF&
    # Normal: White -> &H00FFFFFF&
    # Outline: Pitch Black -> &H00000000&
    # Shadow: Semi-transparent Black -> &H80000000&

    header = f"""[Script Info]
Title: CaptionForge Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {width}
PlayResY: {height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},&H00FFFFFF,&H0000D7FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{outline_width},{shadow_depth},2,40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    chunks = group_words_into_chunks(words, max_words=3, max_chars=22, max_pause=0.4)
    dialogue_lines = []

    for chunk in chunks:
        # Time duration for the whole chunk
        chunk_start = chunk[0]["start"]
        chunk_end = chunk[-1]["end"]
        if chunk_end <= chunk_start:
            chunk_end = chunk_start + 0.3

        # Generate a distinct event for each word's active window
        for active_idx, active_word in enumerate(chunk):
            word_start = active_word["start"]
            # Active duration ends when next word begins, or at chunk_end
            if active_idx + 1 < len(chunk):
                word_end = chunk[active_idx + 1]["start"]
            else:
                word_end = chunk_end

            if word_end <= word_start:
                word_end = word_start + 0.15

            # Assemble chunk text: active word receives yellow highlight and scale pop tag
            text_tokens = []
            for idx, w in enumerate(chunk):
                cleaned_word = w["word"].upper()
                if idx == active_idx:
                    # Highlighted active word: gold color & 110% font scale
                    text_tokens.append(r"{\c&H0000D7FF&\fscx110\fscy110}" + cleaned_word + r"{\r}")
                else:
                    text_tokens.append(cleaned_word)

            dialogue_text = " ".join(text_tokens)
            start_str = format_ass_time(word_start)
            end_str = format_ass_time(word_end)
            dialogue_lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}")

    full_ass = header + "\n".join(dialogue_lines) + "\n"
    output_ass.write_text(full_ass, encoding="utf-8")
    return output_ass


def escape_ffmpeg_filter_path(path: Path) -> str:
    """
    Escape paths for FFmpeg filter arguments on Windows.
    Colons in drive letters (e.g. C:) must be escaped as C\\:,
    backslashes converted to forward slashes, and single quotes escaped.
    """
    p = str(path.resolve()).replace("\\", "/")
    p = p.replace(":", r"\:")
    p = p.replace("'", r"\'")
    return p


def burn_subtitles(video_path: Path, ass_path: Path, fonts_dir: Path, output_mp4: Path) -> Path:
    """
    Burn ASS subtitles into the video using FFmpeg's `ass` filter and custom fontsdir.
    Encodes with libx264 CRF 18 veryfast, preserves audio (-c:a copy), faststart.
    """
    output_mp4.parent.mkdir(parents=True, exist_ok=True)
    
    escaped_ass = escape_ffmpeg_filter_path(ass_path)
    escaped_fonts = escape_ffmpeg_filter_path(fonts_dir)
    ass_filter = f"ass=filename='{escaped_ass}':fontsdir='{escaped_fonts}'"

    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vf", ass_filter,
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(output_mp4)
    ]

    print(f"[*] Burning subtitles with FFmpeg into '{output_mp4.name}'...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg render failed:\n{res.stderr[-1000:]}")

    return output_mp4


def main():
    parser = argparse.ArgumentParser(description="CaptionForge - Proof of Concept CLI")
    parser.add_argument("--video", required=True, help="Path to input video file (e.g. MP4, MOV, MKV)")
    parser.add_argument("--output", default=None, help="Path to output video file")
    parser.add_argument("--model", default="small", choices=["tiny", "base", "small", "medium", "large-v3-turbo", "large-v3"], help="Whisper model size")
    parser.add_argument("--language", default="auto", choices=["auto", "en", "hi", "hinglish"], help="Audio language")
    parser.add_argument("--font", default="Montserrat", help="Font family name (default: Montserrat)")

    args = parser.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.is_file():
        print(f"[!] Error: Input video file not found: {video_path}")
        sys.exit(1)

    project_root = Path(__file__).resolve().parent
    workspace = project_root / "workspace"
    fonts_dir = project_root / "fonts"
    workspace.mkdir(parents=True, exist_ok=True)

    base_name = video_path.stem
    output_path = Path(args.output).resolve() if args.output else workspace / f"{base_name}_captioned.mp4"
    audio_path = workspace / f"{base_name}_16k.wav"
    json_path = workspace / f"{base_name}_words.json"
    ass_path = workspace / f"{base_name}.ass"

    print("==================================================")
    print("           CaptionForge CLI - Phase 1 PoC         ")
    print("==================================================")
    print(f"Input Video : {video_path}")
    print(f"Output Video: {output_path}")
    print(f"Model       : {args.model}")
    print(f"Language    : {args.language}")
    print(f"Font        : {args.font}")
    print("--------------------------------------------------")

    # Step 1: Probe metadata
    print("[1/5] Probing video dimensions and orientation...")
    meta = probe_video(video_path)
    print(f"      Resolution: {meta['width']}x{meta['height']} (rotation: {meta['rotation']}deg)")
    print(f"      Duration  : {meta['duration']:.2f}s | FPS: {meta['fps']}")

    # Step 2: Extract audio
    print("[2/5] Extracting 16kHz mono audio...")
    extract_audio(video_path, audio_path)
    print(f"      Saved audio to: {audio_path.name}")

    # Step 3: Transcribe
    print("[3/5] Transcribing audio with word timestamps...")
    transcript = transcribe_audio(audio_path, model_size=args.model, language=args.language)
    print(f"      Detected Language: {transcript['language']} (prob: {transcript['language_probability']})")
    print(f"      Total words found: {len(transcript['words'])}")

    # Save transcript JSON
    json_path.write_text(json.dumps(transcript, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"      Saved word JSON to: {json_path.name}")

    # Step 4: Generate ASS
    print("[4/5] Generating ASS subtitle file with Hormozi Pop style...")
    generate_ass(
        words=transcript["words"],
        width=meta["width"],
        height=meta["height"],
        output_ass=ass_path,
        font_name=args.font
    )
    print(f"      Saved ASS file to: {ass_path.name}")

    # Step 5: Burn subtitles
    print("[5/5] Burning subtitles into final video with FFmpeg...")
    burn_subtitles(video_path, ass_path, fonts_dir, output_path)
    
    if output_path.exists():
        size_kb = output_path.stat().st_size / 1024
        print("--------------------------------------------------")
        print(f"[SUCCESS] Export completed: {output_path}")
        print(f"          Final file size: {size_kb:.1f} KB")
        print("==================================================")
    else:
        print("[!] Error: Output file was not created.")
        sys.exit(1)


if __name__ == "__main__":
    main()
