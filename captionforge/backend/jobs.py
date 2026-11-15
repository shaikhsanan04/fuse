"""
CaptionForge - Job Store and SSE Progress Manager

Maintains in-memory job state and handles real-time Server-Sent Events (SSE) dispatching.
"""

import asyncio
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List


class Job:
    def __init__(self, job_id: str, video_path: Path, metadata: Dict[str, Any]):
        self.job_id = job_id
        self.video_path = video_path
        self.metadata = metadata
        self.audio_path: Optional[Path] = None
        self.ass_path: Optional[Path] = None
        self.output_video_path: Optional[Path] = None
        self.transcript: Optional[Dict[str, Any]] = None
        
        # State tracking
        self.stage = "uploaded"     # uploaded, transcribing, ready, rendering, completed, error
        self.progress = 0.0         # 0.0 to 100.0
        self.message = "Video uploaded successfully"
        self.error: Optional[str] = None
        
        # Active SSE subscriber queues
        self.subscribers: List[asyncio.Queue] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "stage": self.stage,
            "progress": self.progress,
            "message": self.message,
            "error": self.error,
            "metadata": self.metadata,
            "has_transcript": self.transcript is not None,
            "has_output": self.output_video_path is not None and self.output_video_path.exists()
        }


class JobManager:
    def __init__(self, workspace_dir: Path):
        self.workspace_dir = workspace_dir
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        self.jobs: Dict[str, Job] = {}

    def create_job(self, video_path: Path, metadata: Dict[str, Any]) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(job_id=job_id, video_path=video_path, metadata=metadata)
        
        # Define standard workspace paths for this job
        job_dir = self.workspace_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        job.audio_path = job_dir / "audio_16k.wav"
        job.ass_path = job_dir / "subtitles.ass"
        job.output_video_path = job_dir / "captioned.mp4"

        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def update_progress(
        self,
        job_id: str,
        stage: str,
        progress: float,
        message: str = "",
        error: Optional[str] = None
    ):
        job = self.jobs.get(job_id)
        if not job:
            return

        job.stage = stage
        job.progress = round(progress, 1)
        job.message = message
        if error is not None:
            job.error = error

        payload = {
            "job_id": job_id,
            "stage": job.stage,
            "progress": job.progress,
            "message": job.message,
            "error": job.error
        }

        # Broadcast event to all listening SSE clients
        for q in list(job.subscribers):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    def subscribe(self, job_id: str) -> asyncio.Queue:
        job = self.jobs.get(job_id)
        q = asyncio.Queue()
        if job:
            # Immediately enqueue the current state
            q.put_nowait({
                "job_id": job_id,
                "stage": job.stage,
                "progress": job.progress,
                "message": job.message,
                "error": job.error
            })
            job.subscribers.append(q)
        return q

    def unsubscribe(self, job_id: str, q: asyncio.Queue):
        job = self.jobs.get(job_id)
        if job and q in job.subscribers:
            job.subscribers.remove(q)

    def delete_transcript(self, job_id: str) -> bool:
        """Clear the transcript data and delete transcript.json and cached ass files."""
        job = self.jobs.get(job_id)
        if not job:
            return False
        job.transcript = None
        job.stage = "uploaded"
        job.progress = 0.0
        job.message = "Transcript deleted"

        t_path = self.workspace_dir / job_id / "transcript.json"
        if t_path.exists():
            t_path.unlink()
        if job.ass_path and job.ass_path.exists():
            job.ass_path.unlink()
        return True

    def delete_job(self, job_id: str) -> bool:
        """Delete job and its workspace folder."""
        job = self.jobs.pop(job_id, None)
        job_dir = self.workspace_dir / job_id
        if job_dir.exists():
            import shutil
            shutil.rmtree(job_dir, ignore_errors=True)
        return True


# Singleton manager instance initialized relative to workspace
PROJECT_ROOT = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = PROJECT_ROOT / "workspace"
job_manager = JobManager(WORKSPACE_DIR)
