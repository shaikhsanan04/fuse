import av
# Monkeypatch av.open to remove metadata_errors for newer PyAV
_orig_av_open = av.open
def _safe_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)
av.open = _safe_av_open

import json
from pathlib import Path
from faster_whisper import WhisperModel

print("Loading Whisper model (tiny for fast test)...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")

audio_file = "captionforge/workspace/test_speech.wav"
print("Transcribing...")
segments, info = model.transcribe(
    audio_file,
    word_timestamps=True,
    vad_filter=True,
    language="en"
)

words = []
for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
    if segment.words:
        for w in segment.words:
            words.append({
                "word": w.word.strip(),
                "start": round(w.start, 3),
                "end": round(w.end, 3),
                "probability": round(w.probability, 3)
            })

print(f"Total words transcribed: {len(words)}")
print("Words:", [w["word"] for w in words])
