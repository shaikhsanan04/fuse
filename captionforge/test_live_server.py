"""
Test live server with uvicorn running on localhost:8000
"""
import sys
import time
import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_live():
    print("Connecting to live backend...")
    
    # 1. Styles
    r = requests.get(f"{BASE_URL}/api/styles")
    print("Styles:", [s["name"] for s in r.json()])
    assert r.status_code == 200

    # 2. Fonts
    r = requests.get(f"{BASE_URL}/api/fonts")
    print("Fonts:", len(r.json()), "fonts available")
    assert r.status_code == 200

    # 3. Upload
    test_video = Path(__file__).resolve().parent / "workspace" / "test_input.mp4"
    with open(test_video, "rb") as f:
        r = requests.post(f"{BASE_URL}/api/upload", files={"file": ("test_input.mp4", f, "video/mp4")})
    assert r.status_code == 200
    upload = r.json()
    job_id = upload["job_id"]
    print("Uploaded job_id:", job_id, upload["metadata"]["width"], "x", upload["metadata"]["height"])

    # 4. Transcribe
    r = requests.post(f"{BASE_URL}/api/transcribe/{job_id}", json={"language": "en", "model": "tiny"})
    assert r.status_code == 200
    print("Transcription queued...")

    # Poll progress
    for _ in range(30):
        time.sleep(1)
        r = requests.get(f"{BASE_URL}/api/progress/{job_id}", stream=True, timeout=2)
        # Or check progress via transcript endpoint once ready
        r_tr = requests.get(f"{BASE_URL}/api/transcript/{job_id}")
        if r_tr.status_code == 200:
            print("Transcript ready!")
            break
        print(".", end="", flush=True)

    r_tr = requests.get(f"{BASE_URL}/api/transcript/{job_id}")
    assert r_tr.status_code == 200
    data = r_tr.json()
    print("\nWords:", len(data["words"]))

    # 5. ASS Generation
    r_ass = requests.post(f"{BASE_URL}/api/ass/{job_id}", json={"style_id": "hormozi_pop"})
    assert r_ass.status_code == 200
    print("ASS generated:", len(r_ass.json()["ass_content"]), "bytes")

    # 6. Render
    r_rend = requests.post(f"{BASE_URL}/api/render/{job_id}", json={"style_id": "hormozi_pop"})
    assert r_rend.status_code == 200
    print("Render queued...")

    for _ in range(40):
        time.sleep(1)
        r_down = requests.get(f"{BASE_URL}/api/download/{job_id}", stream=True)
        if r_down.status_code == 200:
            print("Render complete! Download size:", len(r_down.content), "bytes")
            break
        print("*", end="", flush=True)

    print("\n[ALL PASSED!]")

if __name__ == "__main__":
    test_live()
