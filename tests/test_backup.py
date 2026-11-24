"""Tests for exporting/importing progress (``app/js/backup.js`` and the parent menu)."""
import json

from test_ui import active_screen, open_parents
from test_devmode import solve

PRE = """
const st = m.storage.defaultState();
st.name = 'Clara'; st.stickers = ['stern-rosa', 'herz-salbei']; st.outfits = ['tutu']; st.sessions = 7;
st.wearing = ['tutu']; st.calendar['2026-11-24'] = { morgens: true, abends: false };
"""


def test_backup_round_trip(js):
    res = js(PRE + """
        const text = m.backup.serializeBackup(st, new Date(2026, 10, 24, 9));
        return [m.backup.parseBackup(text), JSON.parse(text)];
    """)
    parsed, raw = res
    assert parsed["ok"] is True
    s = parsed["state"]
    assert s["name"] == "Clara" and s["stickers"] == ["stern-rosa", "herz-salbei"] and s["sessions"] == 7
    assert s["calendar"]["2026-11-24"] == {"morgens": True, "abends": False}
    assert raw["kind"] == js("return m.config.BACKUP.kind;")
    assert raw["schema"] == js("return m.config.SCHEMA_VERSION;")
    assert isinstance(raw["exportedAt"], str) and raw["exportedAt"].startswith("2026-11-24")


def test_file_name(js):
    assert js("return m.backup.backupFileName(new Date(2026, 0, 5, 23));") == "zahnputz-tanz-2026-01-05.json"


def test_invalid_backups_rejected(js):
    res = js("""
        return ['', '{kaputt', 'null', '[]', '42', JSON.stringify({ kind: 'etwas-anderes', state: {} }),
                JSON.stringify({ kind: m.config.BACKUP.kind }), JSON.stringify({ kind: m.config.BACKUP.kind, state: 'x' })]
            .map(t => m.backup.parseBackup(t).ok);
    """)
    assert res == [False] * 8


def test_bad_values_inside_backup_are_repaired(js):
    res = js("""
        const text = JSON.stringify({ kind: m.config.BACKUP.kind, schema: 1,
            state: { name: 5, stickers: ['stern-rosa', 'gibts-nicht'], sessions: -3 } });
        return m.backup.parseBackup(text);
    """)
    assert res["ok"] is True
    assert res["state"]["stickers"] == ["stern-rosa"] and res["state"]["sessions"] == 0 and res["state"]["name"] == ""


def test_too_large_file_rejected(js):
    res = js("return m.backup.parseBackup('x'.repeat(m.config.BACKUP.maxBytes + 1)).ok;")
    assert res is False


def finish_session(page) -> None:
    """Brushes once (fast mode) and takes the gift."""
    page.click("#btn-start")
    page.clock.run_for(page.evaluate("import('./js/config.js').then(c => c.TIMER.fastCountdownSec * 1000)") + 100)
    page.clock.run_for(page.evaluate("import('./js/config.js').then(c => c.TIMER.fastTotalSec * 1000)") + 500)
    page.click("#gift-box")
    page.clock.run_for(1500)
    page.click("#btn-reward-next")


def test_export_downloads_real_progress_even_in_dev_mode(app_page, tmp_path):
    page = app_page
    page.evaluate("Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })")
    finish_session(page)
    open_parents(page)
    page.click("#btn-dev")
    solve(page)
    with page.expect_download() as info:
        page.click("#btn-export")
    download = info.value
    assert download.suggested_filename.startswith("zahnputz-tanz-") and download.suggested_filename.endswith(".json")
    target = tmp_path / download.suggested_filename
    download.save_as(target)
    data = json.loads(target.read_text(encoding="utf-8"))
    assert len(data["state"]["stickers"]) == 1, "export contains real progress, not the dev-mode view"
    assert not page.console_errors, page.console_errors


def test_import_replaces_progress(app_page):
    page = app_page
    backup = page.evaluate("""async () => {
        const c = await import('./js/config.js');
        return JSON.stringify({ kind: c.BACKUP.kind, schema: c.SCHEMA_VERSION, exportedAt: 'x',
            state: { name: 'Clara', stickers: c.STICKERS.slice(0, 5).map(s => s.id), outfits: ['tutu'] } });
    }""")
    page.on("dialog", lambda d: d.accept())
    open_parents(page)
    page.set_input_files("#input-import", files=[{"name": "sicherung.json", "mimeType": "application/json",
                                                  "buffer": backup.encode("utf-8")}])
    page.wait_for_selector("#backup-msg.ok")
    page.click("#btn-parents-close")
    assert "Clara" in page.inner_text("#greeting")
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 5


def test_import_bad_file_keeps_progress(app_page):
    page = app_page
    page.on("dialog", lambda d: d.accept())
    finish_session(page)
    open_parents(page)
    page.set_input_files("#input-import", files=[{"name": "x.json", "mimeType": "application/json", "buffer": b"{kaputt"}])
    page.wait_for_selector("#backup-msg.bad")
    page.click("#btn-parents-close")
    assert active_screen(page) == "screen-start"
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 1


def test_import_cancelled_keeps_progress(app_page):
    page = app_page
    page.on("dialog", lambda d: d.dismiss())
    finish_session(page)
    backup = page.evaluate("""async () => {
        const c = await import('./js/config.js');
        return JSON.stringify({ kind: c.BACKUP.kind, schema: 1, state: { stickers: [] } });
    }""")
    open_parents(page)
    page.set_input_files("#input-import", files=[{"name": "s.json", "mimeType": "application/json", "buffer": backup.encode()}])
    page.click("#btn-parents-close")
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 1
