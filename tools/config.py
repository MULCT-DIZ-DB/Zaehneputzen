"""Global settings for the Python development tools (dev server and tests).

All paths are derived from this file's location so the project stays
portable across operating systems and machines.
"""
from pathlib import Path

#: Project root folder (parent of ``tools/``).
PROJECT_ROOT = Path(__file__).resolve().parent.parent

#: Folder containing the deployable web app (the only folder to upload).
APP_DIR = PROJECT_ROOT / "app"

#: Host for the dev server. ``0.0.0.0`` makes it reachable from the iPad in the same Wi-Fi.
DEV_HOST = "0.0.0.0"

#: Port for the dev server.
DEV_PORT = 8080

#: Host used by the automated tests (local only).
TEST_HOST = "127.0.0.1"

#: Port ``0`` lets the OS pick a free port for the test server.
TEST_PORT = 0

#: MIME types that Python's default table may get wrong on some systems.
EXTRA_MIME_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json",
    ".json": "application/json",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".png": "image/png",
    ".webp": "image/webp",
}

#: iPad 5 screen size in CSS pixels (landscape / portrait).
IPAD_LANDSCAPE = {"width": 1024, "height": 768}
IPAD_PORTRAIT = {"width": 768, "height": 1024}

#: iPad 5 has a Retina display with device pixel ratio 2.
IPAD_SCALE_FACTOR = 2

#: Minimum size of tappable buttons in CSS pixels.
MIN_TOUCH_TARGET_PX = 64

#: Performance budget: average frame time in ms on the brushing screen.
MAX_AVG_FRAME_MS = 20.0

#: CPU slowdown used to approximate the iPad 5 (A9) on a laptop.
CPU_THROTTLE_RATE = 4

#: How long the performance test samples frames (ms).
PERF_SAMPLE_MS = 3000

#: Fixed start time of the fake browser clock in UI tests (ISO, Berlin morning slot).
TEST_CLOCK_START = "2026-11-24T08:00:00+01:00"

#: Local, git-ignored list of personal terms (names, user/computer names) that must never be committed.
PRIVATE_TERMS_FILE = PROJECT_ROOT / ".private-terms"

#: E-mail addresses ending like this are allowed (anonymous commit/attribution addresses).
ALLOWED_EMAIL_SUFFIXES = ("@users.noreply.github.com", "noreply@anthropic.com")

#: Third-party files that must contain their author's contact (licence texts).
LICENCE_FILES = ("app/fonts/OFL.txt",)

#: Private network addresses allowed in files (loopback/any – not machine specific).
ALLOWED_IPS = ("127.0.0.1", "0.0.0.0", "10.255.255.255")  # last one: fixed probe address in serve.local_ip()

#: Fake URL used to load an empty same-origin page for module tests.
HARNESS_PATH = "/__harness__.html"
