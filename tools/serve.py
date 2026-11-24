"""Small static dev server for the app folder.

Usage (PowerShell or cmd, from the project folder)::

    .venv\\Scripts\\python tools\\serve.py

Then open ``http://<laptop-IP>:8080`` on the iPad (same Wi-Fi).
"""
from __future__ import annotations

import functools
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402  (local tools config, imported after path setup)


class AppRequestHandler(SimpleHTTPRequestHandler):
    """Serves the app folder with correct MIME types and without caching."""

    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, **config.EXTRA_MIME_TYPES}

    def end_headers(self) -> None:
        """Adds a no-cache header so changes show up immediately during development."""
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:  # noqa: A002 (signature from base class)
        """Keeps the console quiet except for errors."""
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(format, *args)


def make_server(host: str, port: int, directory: Path = config.APP_DIR) -> ThreadingHTTPServer:
    """Creates (but does not start) a threaded HTTP server for ``directory``.

    Args:
        host: Interface to bind to.
        port: Port to bind to (``0`` picks a free port).
        directory: Folder to serve.

    Returns:
        The configured server; call ``serve_forever()`` to run it.
    """
    handler = functools.partial(AppRequestHandler, directory=str(directory))
    return ThreadingHTTPServer((host, port), handler)


def local_ip() -> str:
    """Returns the laptop's IP address in the local network (best effort).

    Returns:
        IP address as text, or ``"127.0.0.1"`` if it cannot be determined.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        try:
            sock.connect(("10.255.255.255", 1))  # no packet is sent for UDP connect
            return sock.getsockname()[0]
        except OSError:
            return "127.0.0.1"


def main() -> None:
    """Starts the dev server until Ctrl+C is pressed."""
    server = make_server(config.DEV_HOST, config.DEV_PORT)
    print(f"App läuft: http://localhost:{config.DEV_PORT}  |  iPad: http://{local_ip()}:{config.DEV_PORT}")
    print("Beenden mit Strg+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
