"""
CaptionForge - Transcription Engine

Uses faster-whisper to generate word-level timestamps.
Features:
- Streaming progress reporting for long videos (processed_sec / total_sec)
- Zero-memory-leak PyAV patch
- CUDA auto-detection with int8 CPU fallback
- Hinglish Roman script biasing with Devanagari transliteration fallback
"""

import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Callable, Optional, List

# PyAV 19+ compatibility patch
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


def contains_devanagari(text: str) -> bool:
    """Check if string contains any Devanagari characters (U+0900 to U+097F)."""
    return any("\u0900" <= ch <= "\u097f" for ch in text)


def transliterate_to_roman(text: str) -> str:
    """Transliterate Devanagari text to Roman script using ITRANS."""
    if sanscript is not None and contains_devanagari(text):
        return sanscript.transliterate(text, sanscript.DEVANAGARI, sanscript.ITRANS)
    return text


def detect_device_and_compute():
    """
    Detect whether CUDA is available for ctranslate2.
    Defaults to CPU with int8 quantization if CUDA is unavailable.
    """
    try:
        import ctranslate2
        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def extract_audio_wav(video_path: Path, output_wav: Path) -> Path:
    """
    Extract 16kHz mono PCM WAV audio using FFmpeg.
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
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {res.stderr[-500:]}")
    return output_wav


def transcribe_video_audio(
    audio_path: Path,
    total_duration: float,
    model_size: str = "small",
    language: str = "auto",
    progress_callback: Optional[Callable[[float, float, float], None]] = None
) -> Dict[str, Any]:
    """
    Transcribe audio with faster-whisper, reporting real-time streaming progress.
    
    progress_callback signature:
        callback(processed_seconds: float, total_seconds: float, percent: float)
    """
    device, compute_type = detect_device_and_compute()
    
    # Initialize model (cached in ~/.cache/huggingface/hub)
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    transcribe_kwargs = {
        "word_timestamps": True,
        "vad_filter": True,
    }

    if language == "hinglish":
        transcribe_kwargs["language"] = "hi"
        transcribe_kwargs["initial_prompt"] = (
            "Yaar aaj hum kuch naya try karenge. Video mein captions Hinglish Roman script mein aayenge."
        )
    elif language != "auto":
        transcribe_kwargs["language"] = language

    # Stream segments to avoid loading everything at once and report real progress
    segments_generator, info = model.transcribe(str(audio_path), **transcribe_kwargs)
    
    duration = total_duration or info.duration or 1.0

    raw_segments: List[Dict[str, Any]] = []
    all_words: List[Dict[str, Any]] = []

    for seg in segments_generator:
        seg_text = seg.text.strip()
        if language == "hinglish" and contains_devanagari(seg_text):
            seg_text = transliterate_to_roman(seg_text)

        seg_dict: Dict[str, Any] = {
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

        # Report progress based on timestamp of latest segment
        if progress_callback and duration > 0:
            current_sec = min(duration, float(seg.end))
            pct = round(min(98.0, (current_sec / duration) * 100.0), 1)
            progress_callback(current_sec, duration, pct)

    if progress_callback:
        progress_callback(duration, duration, 100.0)

    return {
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(duration, 3),
        "segments": raw_segments,
        "words": all_words
    }
