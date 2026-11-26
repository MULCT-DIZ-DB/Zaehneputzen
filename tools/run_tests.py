"""Runs the full test suite: everything in parallel first, then the frame-time test alone.

Each parallel worker starts its own test server (free port) and its own browser; every test
gets a fresh browser context with empty storage, so tests cannot disturb each other. The
frame-time measurement (marker ``perf``) runs afterwards on its own, because other tests
running at the same time would distort it.

Usage (PowerShell or cmd, from any folder)::

    .venv\\Scripts\\python tools\\run_tests.py [extra pytest arguments]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402

#: pytest exit code when a selection contains no tests (e.g. a filter excludes the perf test).
NO_TESTS_COLLECTED = 5


def pytest(*args: str) -> int:
    """Runs pytest in the project root with the current Python interpreter.

    Args:
        args: pytest arguments.

    Returns:
        The pytest exit code (0 also when nothing matched the selection).
    """
    code = subprocess.call([sys.executable, "-m", "pytest", *args], cwd=config.PROJECT_ROOT)
    return 0 if code == NO_TESTS_COLLECTED else code


def main(args: list[str]) -> int:
    """Phase 1: all tests except ``perf`` in parallel. Phase 2: ``perf`` alone.

    Args:
        args: Extra pytest arguments, passed to both phases.

    Returns:
        0 if both phases passed, otherwise the first failing exit code.
    """
    parallel = pytest("-n", str(config.TEST_WORKERS), "-m", "not perf", *args)
    alone = pytest("-m", "perf", *args)
    return parallel or alone


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
