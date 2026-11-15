"""
CaptionForge - API Test Suite for Phase 2 Verification
"""

import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))
from backend.main import app, job_manager

client = TestClient(app)

def test_phase2_api():
    print("==================================================")
    print("       Running Phase 2 API Verification Suite     ")
    print("==================================================")

    # 1. Test GET /api/styles
    print("\n[1] Testing GET /api/styles...")
    res = client.get("/api/styles")
    assert res.status_code == 200, f"Failed: {res.text}"
    styles = res.json()
    print(f"    Available style presets: {[s['name'] for s in styles]}")
    assert len(styles) >= 6, "Expected at least 6 style presets"

    # 2. Test GET /api/fonts
    print("\n[2] Testing GET /api/fonts...")
    res = client.get("/api/fonts")
    assert res.status_code == 200, f"Failed: {res.text}"
    fonts = res.json()
    print(f"    Available bundled fonts: {[f['display_name'] for f in fonts]}")
    assert len(fonts) >= 7, "Expected bundled fonts"

    # 3. Test POST /api/upload
    print("\n[3] Testing POST /api/upload...")
    test_video = Path(__file__).resolve().parent / "workspace" / "test_input.mp4"
    assert test_video.is_file(), f"Test video not found: {test_video}"

    with open(test_video, "rb") as f:
        res = client.post("/api/upload", files={"file": ("test_input.mp4", f, "video/mp4")})
    assert res.status_code == 200, f"Upload failed: {res.text}"
    upload_data = res.json()
    job_id = upload_data["job_id"]
    meta = upload_data["metadata"]
    print(f"    Uploaded job_id: {job_id}")
    print(f"    Resolution: {meta['width']}x{meta['height']}, Duration: {meta['duration']:.2f}s, FPS: {meta['fps']}")

    # 4. Test POST /api/transcribe/{job_id}
    print(f"\n[4] Testing POST /api/transcribe/{job_id}...")
    res = client.post(f"/api/transcribe/{job_id}", json={"language": "en", "model": "tiny"})
    assert res.status_code == 200, f"Transcribe start failed: {res.text}"
    print("    Transcription started in background. Waiting for completion...")

    # Wait for background transcription to complete
    max_wait = 30
    start_t = time.time()
    while time.time() - start_t < max_wait:
        job = job_manager.get_job(job_id)
        if job and job.stage in ("ready", "error"):
            break
        time.sleep(0.5)

    assert job.stage == "ready", f"Transcription did not reach ready stage: {job.stage}, err: {job.error}"
    print(f"    Transcription complete! Stage: {job.stage}, Progress: {job.progress}%")

    # 5. Test GET /api/transcript/{job_id}
    print(f"\n[5] Testing GET /api/transcript/{job_id}...")
    res = client.get(f"/api/transcript/{job_id}")
    assert res.status_code == 200, f"Get transcript failed: {res.text}"
    transcript = res.json()
    print(f"    Extracted {len(transcript['words'])} words.")
    assert len(transcript["words"]) > 0

    # 6. Test PUT /api/transcript/{job_id}
    print(f"\n[6] Testing PUT /api/transcript/{job_id} (editing word text)...")
    words = transcript["words"]
    words[0]["word"] = "HELLO"
    res = client.put(f"/api/transcript/{job_id}", json={"words": words})
    assert res.status_code == 200, f"Update transcript failed: {res.text}"
    # Verify update
    res = client.get(f"/api/transcript/{job_id}")
    assert res.json()["words"][0]["word"] == "HELLO", "Transcript edit did not persist!"
    print("    Transcript edit successfully persisted!")

    # 7. Test POST /api/ass/{job_id} for multiple presets
    print(f"\n[7] Testing POST /api/ass/{job_id} across styles...")
    for preset_name in ["hormozi_pop", "karaoke", "clean_minimal", "boxed", "neon_glow", "typewriter"]:
        res = client.post(f"/api/ass/{job_id}", json={"style_id": preset_name})
        assert res.status_code == 200, f"ASS generation failed for {preset_name}: {res.text}"
        ass_content = res.json()["ass_content"]
        assert "[Script Info]" in ass_content and "[Events]" in ass_content
        print(f"    [OK] Style '{preset_name}' generated valid ASS ({len(ass_content)} chars)")

    # 8. Test POST /api/render/{job_id}
    print(f"\n[8] Testing POST /api/render/{job_id}...")
    res = client.post(f"/api/render/{job_id}", json={"style_id": "hormozi_pop"})
    assert res.status_code == 200, f"Render start failed: {res.text}"
    print("    Render queued in background. Waiting for completion...")

    start_t = time.time()
    while time.time() - start_t < 40:
        job = job_manager.get_job(job_id)
        if job and job.stage in ("completed", "error"):
            break
        time.sleep(0.5)

    assert job.stage == "completed", f"Render failed: stage={job.stage}, error={job.error}"
    print(f"    Render completed successfully! Output file: {job.output_video_path.name}")

    # 9. Test GET /api/download/{job_id}
    print(f"\n[9] Testing GET /api/download/{job_id}...")
    res = client.get(f"/api/download/{job_id}")
    assert res.status_code == 200, f"Download failed: {res.text}"
    assert len(res.content) > 1000, "Downloaded video is empty"
    print(f"    Downloaded video file size: {len(res.content)} bytes")

    print("\n==================================================")
    print("        ALL PHASE 2 API TESTS PASSED!             ")
    print("==================================================")

if __name__ == "__main__":
    test_phase2_api()
