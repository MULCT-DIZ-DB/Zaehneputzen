"""Renders the app icons (PNG) from an SVG drawing using Playwright/Chromium.

Usage::

    .venv\\Scripts\\python tools\\make_icons.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402

ICON_SIZES = (180, 192, 512)

ICON_SVG = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='{s}' height='{s}'>
  <rect width='100' height='100' fill='#F7F1E3'/>
  <path d='M50 8 C72 8 90 20 90 45 C90 70 72 92 50 92 C28 92 10 70 10 45 C10 20 28 8 50 8 Z' fill='#E8A9A0'
        stroke='#4A3F3A' stroke-width='3'/>
  <path d='M32 28 C40 22 46 30 50 30 C54 30 60 22 68 28 C76 34 72 50 68 60 C65 68 64 78 59 78
           C54 78 55 62 50 62 C45 62 46 78 41 78 C36 78 35 68 32 60 C28 50 24 34 32 28 Z'
        fill='#FFFDF8' stroke='#4A3F3A' stroke-width='3' stroke-linejoin='round'/>
  <path d='M76 16 Q76 22 82 22 Q76 22 76 28 Q76 22 70 22 Q76 22 76 16 Z' fill='#FFFDF8' stroke='#D8B56A' stroke-width='1.5'/>
  <path d='M20 70 Q20 75 25 75 Q20 75 20 80 Q20 75 15 75 Q20 75 20 70 Z' fill='#FFFDF8' stroke='#D8B56A' stroke-width='1.5'/>
</svg>"""


def render_icons(out_dir: Path = config.APP_DIR / "icons") -> list[Path]:
    """Renders all icon sizes into ``out_dir``.

    Args:
        out_dir: Target folder (created if missing).

    Returns:
        Paths of the written PNG files.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for size in ICON_SIZES:
            page = browser.new_page(viewport={"width": size, "height": size})
            page.set_content(f"<body style='margin:0'>{ICON_SVG.format(s=size)}</body>")
            target = out_dir / f"icon-{size}.png"
            page.screenshot(path=str(target), clip={"x": 0, "y": 0, "width": size, "height": size})
            written.append(target)
            page.close()
        browser.close()
    return written


if __name__ == "__main__":
    for path in render_icons():
        print(path.relative_to(config.PROJECT_ROOT))
