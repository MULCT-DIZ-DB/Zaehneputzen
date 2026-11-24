"""Blocks personal or machine-specific data from entering the repository.

Checks for
* terms from the local, git-ignored ``.private-terms`` file (child's name, user and computer names …),
* personal folder paths (``C:\\Users\\<name>``, ``/Users/<name>``, ``/home/<name>``),
* e-mail addresses other than anonymous noreply addresses,
* private network IP addresses (e.g. ``192.168.x.y`` of the laptop).

Usage (PowerShell or cmd, project folder)::

    .venv\\Scripts\\python tools\\privacy_check.py            # all tracked files
    .venv\\Scripts\\python tools\\privacy_check.py --staged   # what is about to be committed (pre-commit hook)
    .venv\\Scripts\\python tools\\privacy_check.py --message .git\\COMMIT_EDITMSG   # commit message (commit-msg hook)
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config  # noqa: E402

PATTERNS = {
    "persoenlicher Ordnerpfad": re.compile(r"[A-Za-z]:[\\/]+Users[\\/]+(?!<)[^\\/\s\"'`]+|/(?:Users|home)/(?!<)[^/\s\"'`]+"),
    "E-Mail-Adresse": re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"),
    "private IP-Adresse": re.compile(r"\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b"),
}


def load_terms(path: Path = config.PRIVATE_TERMS_FILE) -> list[str]:
    """Reads the local private terms (empty list if the file does not exist).

    Args:
        path: Location of the terms file.

    Returns:
        Lower-case terms, comments and blank lines removed.
    """
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    return [ln.strip().lower() for ln in lines if ln.strip() and not ln.strip().startswith("#")]


def find_problems(name: str, text: str, terms: list[str]) -> list[str]:
    """Finds personal data in one text.

    Args:
        name: File name (for messages and the licence-file exception).
        text: Content to check.
        terms: Private terms (lower case).

    Returns:
        Messages ``file:line: reason`` (the matched private term itself is not repeated).
    """
    problems = []
    for number, line in enumerate(text.splitlines(), start=1):
        lower = line.lower()
        if any(term in lower for term in terms):
            problems.append(f"{name}:{number}: privater Begriff aus .private-terms")
        for reason, pattern in PATTERNS.items():
            for match in pattern.findall(line):
                if reason == "E-Mail-Adresse" and (name in config.LICENCE_FILES
                                                    or match.lower().endswith(config.ALLOWED_EMAIL_SUFFIXES)):
                    continue
                if reason == "private IP-Adresse" and match in config.ALLOWED_IPS:
                    continue
                problems.append(f"{name}:{number}: {reason}")
    return problems


def git(*args: str) -> str:
    """Runs a git command in the project root and returns its output."""
    return subprocess.run(["git", *args], cwd=config.PROJECT_ROOT, capture_output=True, check=True,
                          text=True, encoding="utf-8", errors="replace").stdout


def file_texts(staged: bool) -> dict[str, str]:
    """Collects the text of tracked (or staged) files; binary files are skipped.

    Args:
        staged: True to read the staged versions of files about to be committed.

    Returns:
        Mapping of repository path to text.
    """
    names = git("diff", "--cached", "--name-only", "--diff-filter=ACMR") if staged else git("ls-files")
    texts = {}
    for name in filter(None, names.splitlines()):
        if staged:  # exactly what is about to be committed
            raw = subprocess.run(["git", "show", f":{name}"], cwd=config.PROJECT_ROOT, capture_output=True).stdout
        else:  # current files on disk
            path = config.PROJECT_ROOT / name
            raw = path.read_bytes() if path.is_file() else b""
        if b"\0" in raw[:8000]:
            continue
        texts[name] = raw.decode("utf-8", errors="replace")
    texts["<git-config author>"] = git("config", "user.email")
    return texts


def main(argv: list[str]) -> int:
    """Checks files or a commit message; prints findings.

    Args:
        argv: Command-line arguments.

    Returns:
        0 if clean, 1 if personal data was found.
    """
    terms = load_terms()
    if "--message" in argv:
        path = Path(argv[argv.index("--message") + 1])
        texts = {"<Commit-Nachricht>": path.read_text(encoding="utf-8", errors="replace")}
    else:
        texts = file_texts(staged="--staged" in argv)
    problems = [p for name, text in texts.items() for p in find_problems(name, text, terms)]
    if not terms:
        print("Hinweis: .private-terms fehlt – nur allgemeine Muster werden geprüft.")
    for p in problems:
        print(f"BLOCKIERT {p}")
    if problems:
        print("Persönliche Daten gefunden – bitte entfernen (z. B. Testnamen durch 'Testkind' ersetzen).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
