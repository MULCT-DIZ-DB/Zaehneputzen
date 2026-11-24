"""Runs the full test suite (the tests start their own local server).

Usage (PowerShell or cmd, from any folder)::

    .venv\\Scripts\\python tools\\run_tests.py [extra pytest arguments]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402


def main(args: list[str]) -> int:
    """Runs pytest in the project root with the current Python interpreter.

    Args:
        args: Extra pytest arguments.

    Returns:
        The pytest exit code.
    """
    return subprocess.call([sys.executable, "-m", "pytest", *args], cwd=config.PROJECT_ROOT)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
