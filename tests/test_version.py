"""Tests for the version line in the parent menu (``app/js/version.js``)."""
import json
import subprocess
from pathlib import Path

from test_ui import open_parents

ROOT = Path(__file__).resolve().parent.parent


def run_version(harness, body: str):
    """Runs ``body`` with the version module available as ``v``."""
    return harness.evaluate(f"""async () => {{
        const v = await import('./js/version.js');
        {body}
    }}""")


def test_parse_version(harness):
    res = run_version(harness, """
        return [
            v.parseVersion({ commit: 'a9eb852', date: '2026-11-24T14:32:05+01:00' }),
            v.parseVersion({ commit: '', date: '' }),
            v.parseVersion({ commit: 'nicht-hex', date: '2026-11-24T14:32:05+01:00' }),
            v.parseVersion({ commit: 'a9eb852', date: 'kein Datum' }),
            v.parseVersion(null),
            v.parseVersion('a9eb852'),
        ];
    """)
    assert res[0] == {"commit": "a9eb852", "date": "2026-11-24T14:32:05+01:00"}
    assert res[1:] == [None] * 5


def test_format_version(harness):
    res = run_version(harness, """
        const local = new Date(2026, 0, 5, 9, 7).toISOString();
        return [v.formatVersion({ commit: 'a9eb852', date: local }), v.formatVersion(null)];
    """)
    assert res == ["Version a9eb852 vom 05.01.2026, 09:07", "Version: lokale Entwicklung"]


def test_placeholder_in_repo_means_local():
    data = json.loads((ROOT / "app" / "version.json").read_text(encoding="utf-8"))
    assert data == {"commit": "", "date": ""}, "the workflow fills it in; keep the placeholder in the repository"


def test_workflow_command_writes_valid_version(harness, tmp_path):
    """Runs the workflow's git command locally and checks the app accepts its output."""
    out = subprocess.run(["git", "log", "-1", '--format={"commit": "%h", "date": "%cI"}'],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    parsed = run_version(harness, f"return v.parseVersion({out.strip()});")
    assert parsed is not None and parsed["commit"] in out


def test_parent_menu_shows_deployed_version(app_page):
    page = app_page
    page.route("**/version.json", lambda route: route.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"commit": "a9eb852", "date": "2026-11-24T14:32:05+01:00"})))
    page.reload()
    page.wait_for_selector("#screen-start.active")
    open_parents(page)
    page.wait_for_function("document.querySelector('#app-version').textContent.includes('a9eb852')")
    assert "24.11.2026" in page.inner_text("#app-version")
    assert not page.console_errors, page.console_errors


def test_parent_menu_shows_local_without_deploy(app_page):
    page = app_page
    open_parents(page)
    page.wait_for_function("document.querySelector('#app-version').textContent.length > 0")
    assert "lokale Entwicklung" in page.inner_text("#app-version")
