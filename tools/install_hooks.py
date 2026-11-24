"""Installs git hooks that run tools/privacy_check.py before every commit.

Git hooks live in ``.git/hooks`` and are not uploaded, so run this once per clone::

    .venv\\Scripts\\python tools\\install_hooks.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402

#: Shell snippet (Git for Windows ships sh) that finds the project's Python on Windows, macOS and Linux.
FIND_PYTHON = """PY=".venv/Scripts/python.exe"
[ -x "$PY" ] || PY=".venv/bin/python"
[ -x "$PY" ] || PY="python3"
"""

HOOKS = {
    "pre-commit": FIND_PYTHON + '"$PY" tools/privacy_check.py --staged\n',
    "commit-msg": FIND_PYTHON + '"$PY" tools/privacy_check.py --message "$1"\n',
}


def install(hooks_dir: Path = config.PROJECT_ROOT / ".git" / "hooks") -> list[Path]:
    """Writes the hook scripts (overwriting older versions of them).

    Args:
        hooks_dir: The repository's hooks folder.

    Returns:
        Paths of the written hooks.
    """
    hooks_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for name, body in HOOKS.items():
        path = hooks_dir / name
        path.write_text("#!/bin/sh\n# Installed by tools/install_hooks.py – blocks personal data.\n" + body,
                        encoding="utf-8", newline="\n")
        path.chmod(0o755)
        written.append(path)
    return written


if __name__ == "__main__":
    for hook in install():
        print("installiert:", hook.relative_to(config.PROJECT_ROOT))
