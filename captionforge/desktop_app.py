import os
import sys
import time
import socket
import logging
import threading
import ctypes
from ctypes import wintypes
from pathlib import Path
import urllib.request

# Ensure working directory is the repository root
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
os.chdir(str(REPO_ROOT))

# Setup file logging for desktop app
LOG_FILE = REPO_ROOT / "fuse_desktop.log"
logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("fuse_desktop")

def handle_exception(exc_type, exc_value, exc_traceback):
    logger.error("Uncaught exception:", exc_info=(exc_type, exc_value, exc_traceback))
    sys.__excepthook__(exc_type, exc_value, exc_traceback)

sys.excepthook = handle_exception

# Explicitly set Windows AppUserModelID before creating any GUI windows or importing webview.
# This prevents Windows from grouping Fuse under generic Python and forces the taskbar
# to display the application's custom icon.
APP_ID = "CaptionForge.Fuse.DesktopApp"
try:
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_ID)
except Exception as e:
    logger.warning(f"Could not set AppUserModelID: {e}")

# Single-Instance Enforcement
# Prevent duplicate instances from fighting over WebView2 data or ports.
MUTEX_NAME = "Local\\FuseDesktopApp_SingleInstance_Mutex"
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32
single_instance_mutex = kernel32.CreateMutexW(None, True, MUTEX_NAME)
ERROR_ALREADY_EXISTS = 183
if kernel32.GetLastError() == ERROR_ALREADY_EXISTS:
    logger.info("Another Fuse instance is already running. Focusing existing window...")
    hwnd = user32.FindWindowW(None, "Fuse")
    if hwnd:
        SW_RESTORE = 9
        user32.ShowWindowAsync(hwnd, SW_RESTORE)
        user32.SetForegroundWindow(hwnd)
    sys.exit(0)

# Add project root to sys.path so backend imports work reliably
PROJECT_ROOT = SCRIPT_DIR
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
server_instance = None

def get_available_port(preferred_port=8000, max_attempts=50):
    """Find a verified free TCP port on 127.0.0.1 starting from preferred_port."""
    for p in range(preferred_port, preferred_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', p))
                return p
            except OSError:
                continue
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def wait_for_server(port, timeout=12.0):
    """Wait until the backend server responds to HTTP requests."""
    start_time = time.time()
    url = f"http://127.0.0.1:{port}/api/version"
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'FuseDesktop'})
            with urllib.request.urlopen(req, timeout=0.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.1)
    return False

def run_server(port):
    """Run uvicorn server in background thread."""
    global server_instance
    try:
        config = uvicorn.Config(
            app=app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False
        )
        server_instance = uvicorn.Server(config)
        server_instance.run()
    except Exception as e:
        logger.error(f"Uvicorn server crashed: {e}", exc_info=True)

def cleanup_and_exit():
    """Cleanly shut down server and terminate process to prevent zombie processes."""
    global server_instance, single_instance_mutex
    logger.info("Cleaning up and exiting Fuse Desktop...")
    try:
        if server_instance:
            server_instance.should_exit = True
    except Exception:
        pass
    try:
        if single_instance_mutex:
            kernel32.ReleaseMutex(single_instance_mutex)
            kernel32.CloseHandle(single_instance_mutex)
    except Exception:
        pass
    # Force clean exit of any hanging threads or COM/CLR handles
    os._exit(0)

def apply_taskbar_icon():
    """
    Apply multi-resolution custom Fuse icon to the native window HWND,
    window class, and WinForms Form with retries so it shows up crisp in
    Windows Taskbar, window title bar, and Alt+Tab task switcher.
    """
    if not ICON_PATH.exists():
        return

    icon_str = str(ICON_PATH.resolve())
    for attempt in range(40):
        time.sleep(0.1)
        try:
            win = webview.windows[0] if webview.windows else None
            if not win:
                continue

            hwnd = None
            native = getattr(win, 'native', None)
            if native:
                try:
                    hwnd = int(native.Handle.ToInt64())
                except Exception:
                    hwnd = None

            if not hwnd:
                hwnd = user32.FindWindowW(None, "Fuse")

            if hwnd and hwnd != 0:
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

                if native:
                    try:
                        import clr
                        clr.AddReference('System.Drawing')
                        from System.Drawing import Icon
                        from System import Action

                        def _update_form():
                            native.Icon = Icon(icon_str)
                            native.ShowInTaskbar = True

                        native.Invoke(Action(_update_form))
                    except Exception:
                        pass

                logger.info(f"Taskbar and window icons successfully applied to HWND {hwnd}")
                break
        except Exception as e:
            logger.debug(f"Attempt {attempt+1} applying icon: {e}")

def main():
    logger.info("Starting Fuse Desktop...")
    port = get_available_port(8000)
    logger.info(f"Allocated port {port} for backend server")

    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    if not wait_for_server(port):
        logger.warning(f"Backend took longer than expected to respond on port {port}")
    else:
        logger.info(f"Backend server is responding on port {port}")

    app_url = f"http://127.0.0.1:{port}"

    # Dedicated WebView2 persistent storage directory
    local_appdata = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    storage_dir = Path(local_appdata) / "Fuse" / "webview_data"
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Clean up stale WebView2 cache directories so frontend updates take effect immediately
    for cache_sub in ["Cache", "Code Cache", "GPUPersistentCache", "ShaderCache", "GrShaderCache"]:
        cache_path = storage_dir / "EBWebView" / "Default" / cache_sub
        if cache_path.exists():
            try:
                import shutil
                shutil.rmtree(cache_path, ignore_errors=True)
                logger.info(f"Cleared stale WebView2 cache at {cache_path}")
            except Exception as e:
                logger.warning(f"Could not clear webview cache at {cache_path}: {e}")

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

    # Ensure clean exit when window is closed
    window.events.closed += cleanup_and_exit

    try:
        webview.start(
            func=apply_taskbar_icon,
            gui="edgechromium",
            debug=False,
            icon=str(ICON_PATH) if ICON_PATH.exists() else None,
            private_mode=False,
            storage_path=str(storage_dir.resolve())
        )
    finally:
        cleanup_and_exit()

if __name__ == "__main__":
    main()
