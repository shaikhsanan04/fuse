"""
Test SSE progress stream from /api/progress/{job_id}
"""
import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

def test_sse():
    print("Uploading video for SSE test...")
    test_video = Path(__file__).resolve().parent / "workspace" / "test_input.mp4"
    with open(test_video, "rb") as f:
        r = requests.post(f"{BASE_URL}/api/upload", files={"file": ("test_sse.mp4", f, "video/mp4")})
    assert r.status_code == 200
    job_id = r.json()["job_id"]
    print("Job ID:", job_id)

    # Start transcribe
    requests.post(f"{BASE_URL}/api/transcribe/{job_id}", json={"language": "en", "model": "tiny"})
    
    print("Subscribing to SSE stream...")
    events = []
    with requests.get(f"{BASE_URL}/api/progress/{job_id}", stream=True, timeout=15) as resp:
        for line in resp.iter_lines():
            if not line:
                continue
            line_str = line.decode("utf-8")
            if line_str.startswith("data: "):
                data = json.loads(line_str[6:])
                events.append(data)
                print(f"  [SSE Event] Stage: {data['stage']} | Progress: {data['progress']}% | Message: {data['message']}")
                if data["stage"] in ("ready", "error"):
                    break

    assert any(e["stage"] == "ready" for e in events), "Did not receive ready event via SSE!"
    print(f"SSE test successful! Received {len(events)} real-time events.")

if __name__ == "__main__":
    test_sse()
