import os
import sys
import time
import socket
import threading
import ctypes
from ctypes import wintypes
from pathlib import Path

# Explicitly set Windows AppUserModelID before creating any GUI windows or importing webview.
# This prevents Windows from grouping Fuse under generic Python and forces the taskbar
# to display the application's custom icon.
APP_ID = "CaptionForge.Fuse.DesktopApp"
try:
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_ID)
except Exception:
    pass

# Add project root to sys.path so backend imports work reliably
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Add bundled portable FFmpeg bin directory to PATH if present
FFMPEG_BIN = PROJECT_ROOT / "bin"
if FFMPEG_BIN.exists() and (FFMPEG_BIN / "ffmpeg.exe").exists():
    os.environ["PATH"] = str(FFMPEG_BIN.resolve()) + os.pathsep + os.environ.get("PATH", "")

import uvicorn
import webview
from backend.main import app

ICON_PATH = PROJECT_ROOT / "assets" / "fuse.ico"

def find_free_port(preferred_port=8000):
    """Check if preferred port is available, or find an open one."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', preferred_port))
            return preferred_port
        except OSError:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]

def wait_for_server(port, timeout=10.0):
    """Wait until the backend server is accepting connections."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.1)
    return False

def run_server(port):
    """Run uvicorn server in background thread."""
    config = uvicorn.Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False
    )
    server = uvicorn.Server(config)
    server.run()

def apply_taskbar_icon():
    """
    Apply multi-resolution custom Fuse icon to the native window HWND,
    window class, and WinForms Form so it shows up crisp in the Windows Taskbar,
    window title bar, and Alt+Tab task switcher.
    """
    time.sleep(0.3)
    if not ICON_PATH.exists():
        return

    icon_str = str(ICON_PATH.resolve())
    try:
        win = webview.windows[0] if webview.windows else None
        if not win or not win.native:
            return

        hwnd = int(win.native.Handle.ToInt64())
        user32 = ctypes.windll.user32

        # Win32 Constants
        IMAGE_ICON = 1
        LR_LOADFROMFILE = 0x00000010
        WM_SETICON = 0x0080
        ICON_SMALL = 0
        ICON_BIG = 1
        GCLP_HICON = -14
        GCLP_HICONSM = -34

        user32.LoadImageW.argtypes = [
            wintypes.HINSTANCE, wintypes.LPCWSTR, wintypes.UINT,
            ctypes.c_int, ctypes.c_int, wintypes.UINT
        ]
        user32.LoadImageW.restype = wintypes.HANDLE
        user32.SendMessageW.argtypes = [
            wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM
        ]
        user32.SendMessageW.restype = wintypes.LPARAM

        # Load 32x32 (Taskbar & Alt-Tab) and 16x16 (Titlebar) icons
        h_big = user32.LoadImageW(None, icon_str, IMAGE_ICON, 32, 32, LR_LOADFROMFILE)
        h_small = user32.LoadImageW(None, icon_str, IMAGE_ICON, 16, 16, LR_LOADFROMFILE)

        if h_big:
            user32.SendMessageW(hwnd, WM_SETICON, ICON_BIG, h_big)
            try:
                user32.SetClassLongPtrW(hwnd, GCLP_HICON, h_big)
            except Exception:
                pass

        if h_small:
            user32.SendMessageW(hwnd, WM_SETICON, ICON_SMALL, h_small)
            try:
                user32.SetClassLongPtrW(hwnd, GCLP_HICONSM, h_small)
            except Exception:
                pass

        # Also apply via WinForms CLR
        try:
            import clr
            clr.AddReference('System.Drawing')
            from System.Drawing import Icon
            from System import Action

            def _update_form():
                win.native.Icon = Icon(icon_str)
                win.native.ShowInTaskbar = True

            win.native.Invoke(Action(_update_form))
        except Exception:
            pass

    except Exception as e:
        print(f"Note on taskbar icon: {e}")

def main():
    port = find_free_port(8000)
    
    # Check if a server is already running on port 8000
    server_already_running = False
    try:
        with socket.create_connection(('127.0.0.1', 8000), timeout=0.5):
            server_already_running = True
            port = 8000
    except (ConnectionRefusedError, OSError):
        server_already_running = False

    if not server_already_running:
        server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
        server_thread.start()
        
        if not wait_for_server(port):
            print("Warning: Backend took longer than expected to start, launching window...")

    app_url = f"http://127.0.0.1:{port}"
    
    # Create native desktop window
    window = webview.create_window(
        title="Fuse",
        url=app_url,
        width=1280,
        height=840,
        min_size=(960, 640),
        background_color="#09090b",
        confirm_close=False,
    )

    # Start PyWebView with Windows Edge WebView2 engine and run icon callback
    print(f"Starting Fuse Desktop on {app_url}...")
    webview.start(
        func=apply_taskbar_icon,
        gui="edgechromium",
        debug=False,
        icon=str(ICON_PATH) if ICON_PATH.exists() else None
    )

if __name__ == "__main__":
    main()