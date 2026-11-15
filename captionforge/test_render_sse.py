"""
Test SSE progress stream during rendering
"""
import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_render_sse():
    print("Testing SSE stream during rendering...")
    test_video = Path(__file__).resolve().parent / "workspace" / "test_input.mp4"
    with open(test_video, "rb") as f:
        r = requests.post(f"{BASE_URL}/api/upload", files={"file": ("test_render_sse.mp4", f, "video/mp4")})
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # Transcribe first
    requests.post(f"{BASE_URL}/api/transcribe/{job_id}", json={"language": "en", "model": "tiny"})
    with requests.get(f"{BASE_URL}/api/progress/{job_id}", stream=True, timeout=15) as resp:
        for line in resp.iter_lines():
            if not line:
                continue
            line_str = line.decode("utf-8")
            if line_str.startswith("data: "):
                data = json.loads(line_str[6:])
                if data["stage"] in ("ready", "error"):
                    break

    # Now start render
    print(f"Triggering render for job {job_id}...")
    requests.post(f"{BASE_URL}/api/render/{job_id}", json={"style_id": "hormozi_pop"})

    render_events = []
    with requests.get(f"{BASE_URL}/api/progress/{job_id}", stream=True, timeout=25) as resp:
        for line in resp.iter_lines():
            if not line:
                continue
            line_str = line.decode("utf-8")
            if line_str.startswith("data: "):
                data = json.loads(line_str[6:])
                render_events.append(data)
                print(f"  [Render SSE] Stage: {data['stage']} | Progress: {data['progress']}% | Message: {data['message']}")
                if data["stage"] in ("completed", "error"):
                    break

    assert any(e["stage"] == "completed" for e in render_events), "Render did not complete!"
    print(f"Render SSE test successful! Received {len(render_events)} events.")

if __name__ == "__main__":
    test_render_sse()
