#!/usr/bin/env python3
"""
CaptionForge - Root entrypoint for poc.py
Forwards execution to captionforge/poc.py using the project's virtual environment.
"""
import sys
import subprocess
from pathlib import Path

root_dir = Path(__file__).resolve().parent
captionforge_dir = root_dir / "captionforge"
venv_python = captionforge_dir / ".venv" / "Scripts" / "python.exe"
if not venv_python.exists():
    venv_python = captionforge_dir / ".venv" / "bin" / "python"
if not venv_python.exists():
    venv_python = Path(sys.executable)

target_script = captionforge_dir / "poc.py"
cmd = [str(venv_python), str(target_script)] + sys.argv[1:]
sys.exit(subprocess.call(cmd))
