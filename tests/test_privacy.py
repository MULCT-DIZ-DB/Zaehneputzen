"""The repository must not contain personal or machine-specific data (see tools/privacy_check.py)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import privacy_check  # noqa: E402


def test_tracked_files_are_clean():
    terms = privacy_check.load_terms()
    texts = privacy_check.file_texts(staged=False)
    problems = [p for name, text in texts.items() for p in privacy_check.find_problems(name, text, terms)]
    assert problems == []


def test_detects_personal_data():
    terms = ["geheimname"]
    # Assembled at runtime so this file itself stays clean for the repository scan.
    sample = "\n".join([
        "name = 'Geheimname'",
        "pfad = 'C:" + "\\Users\\someone\\Documents'",
        "mail = 'person" + "@example.org'",
        "ip = '192." + "168.1.23'",
    ])
    found = privacy_check.find_problems("x.py", sample, terms)
    assert [f.split(": ", 1)[1] for f in found] == [
        "privater Begriff aus .private-terms", "persoenlicher Ordnerpfad", "E-Mail-Adresse", "private IP-Adresse"]


def test_allows_neutral_content():
    sample = "\n".join([
        "Co-Authored-By: Claude <noreply@anthropic.com>",
        "author <MULCT-DIZ-DB@users.noreply.github.com>",
        "open http://<laptop-IP>:8080 or 127.0.0.1 / 0.0.0.0",
        r"C:\Users\<name>\  and /home/<name>/",
        "st.name = 'Testkind'",
    ])
    assert privacy_check.find_problems("x.py", sample, ["geheimname"]) == []
