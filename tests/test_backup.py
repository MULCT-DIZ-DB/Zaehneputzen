"""Tests for exporting/importing progress (``app/js/backup.js`` and the parent menu)."""
import json

from test_ui import active_screen, open_parents
from test_devmode import solve

PRE = """
const st = m.storage.defaultState();
st.name = 'Testkind'; st.stickers = ['stern-rosa', 'herz-salbei']; st.outfits = ['tutu']; st.sessions = 7;
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
    assert s["name"] == "Testkind" and s["stickers"] == ["stern-rosa", "herz-salbei"] and s["sessions"] == 7
    assert s["calendar"]["2026-11-24"] == {"morgens": True, "abends": False}
    assert raw["kind"] == js("return m.config.BACKUP.kind;")
    assert raw["schema"] == js("return m.config.SCHEMA_VERSION;")
    assert isinstance(raw["exportedAt"], str) and raw["exportedAt"].startswith("2026-11-24")


def test_parse_rejects_and_repairs(js):
    """File name; broken, foreign, incomplete or oversized files are rejected; bad values inside are repaired."""
    res = js("""
        const bad = ['', '{kaputt', 'null', '[]', '42', JSON.stringify({ kind: 'etwas-anderes', state: {} }),
                     JSON.stringify({ kind: m.config.BACKUP.kind }), JSON.stringify({ kind: m.config.BACKUP.kind, state: 'x' }),
                     'x'.repeat(m.config.BACKUP.maxBytes + 1)].map(t => m.backup.parseBackup(t).ok);
        const repaired = m.backup.parseBackup(JSON.stringify({ kind: m.config.BACKUP.kind, schema: 1,
            state: { name: 5, stickers: ['stern-rosa', 'gibts-nicht'], sessions: -3 } }));
        return [m.backup.backupFileName(new Date(2026, 0, 5, 23)), bad, repaired];
    """)
    name, bad, repaired = res
    assert name == "zahnputz-tanz-2026-01-05.json"
    assert bad == [False] * 9
    assert repaired["ok"] is True and repaired["state"]["stickers"] == ["stern-rosa"]
    assert repaired["state"]["sessions"] == 0 and repaired["state"]["name"] == ""


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
            state: { name: 'Testkind', stickers: c.STICKERS.slice(0, 5).map(s => s.id), outfits: ['tutu'] } });
    }""")
    page.on("dialog", lambda d: d.accept())
    open_parents(page)
    page.set_input_files("#input-import", files=[{"name": "sicherung.json", "mimeType": "application/json",
                                                  "buffer": backup.encode("utf-8")}])
    page.wait_for_selector("#backup-msg.ok")
    page.click("#btn-parents-close")
    assert "Testkind" in page.inner_text("#greeting")
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


def test_has_progress(js):
    res = js(PRE + """
        const empty = m.storage.defaultState();
        const onlyCalendar = m.storage.defaultState(); onlyCalendar.calendar['2026-11-24'] = { morgens: true, abends: false };
        return [m.backup.hasProgress(empty), m.backup.hasProgress(st), m.backup.hasProgress(onlyCalendar)];
    """)
    assert res == [False, True, True]


def test_needs_backup_counts_sessions_since_last_backup(js):
    res = js("""
        const every = m.config.BACKUP.remindAfterSessions;
        const at = (n) => { const s = m.storage.defaultState(); s.sessions = n; return s; };
        return [
            m.backup.needsBackup(at(every - 1), 0),
            m.backup.needsBackup(at(every), 0),
            m.backup.needsBackup(at(every + 3), 4),
            m.backup.needsBackup(at(2 * every), every),
            m.backup.needsBackup(at(every), 50),
        ];
    """)
    assert res == [False, True, False, True, True], "a lower count than at the last backup (reset) counts from zero"


def test_backup_record_round_trip_and_bad_meta(js):
    res = js("""
        const store = m.storage.memoryStorage();
        const before = m.backup.lastBackupSessions(store);
        const s = m.storage.defaultState(); s.sessions = 12;
        m.backup.recordBackup(s, store);
        const after = m.backup.lastBackupSessions(store);
        store.setItem(m.config.BACKUP.metaKey, '{kaputt');
        const broken = m.backup.lastBackupSessions(store);
        store.setItem(m.config.BACKUP.metaKey, JSON.stringify({ sessions: -4 }));
        return [before, after, broken, m.backup.lastBackupSessions(store)];
    """)
    assert res == [0, 12, 0, 0]


def seed_state(page, base_url, sessions: int) -> None:
    """Stores progress with the given session count and reloads the app."""
    page.evaluate("""async (n) => {
        const c = await import('./js/config.js');
        const s = await import('./js/storage.js');
        const st = s.defaultState(); st.sessions = n; st.stickers = [c.STICKERS[0].id];
        s.saveState(st);
    }""", sessions)
    page.goto(f"{base_url}/index.html?schnell=1")
    page.wait_for_selector("#screen-start.active")


def hold(page, selector: str, ms: int) -> None:
    """Presses on an element, lets the fake clock run, then releases."""
    box = page.locator(selector).bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.clock.run_for(ms)
    page.mouse.up()


def test_restore_button_only_without_progress(app_page):
    page = app_page
    assert page.is_visible("#btn-restore")
    finish_session(page)
    assert not page.is_visible("#btn-restore")


def test_restore_from_start_screen(app_page):
    page = app_page
    backup = page.evaluate("""async () => {
        const c = await import('./js/config.js');
        return JSON.stringify({ kind: c.BACKUP.kind, schema: c.SCHEMA_VERSION, exportedAt: 'x',
            state: { name: 'Testkind', sessions: 3, stickers: c.STICKERS.slice(0, 3).map(s => s.id) } });
    }""")
    page.on("dialog", lambda d: d.accept())
    page.set_input_files("#input-restore", files=[{"name": "s.json", "mimeType": "application/json",
                                                   "buffer": backup.encode("utf-8")}])
    page.wait_for_selector("#btn-restore", state="hidden")
    assert "Testkind" in page.inner_text("#greeting")
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 3
    assert not page.console_errors, page.console_errors


def test_restore_bad_file_shows_message(app_page):
    page = app_page
    with page.expect_event("dialog") as info:
        page.set_input_files("#input-restore", files=[{"name": "x.json", "mimeType": "application/json",
                                                       "buffer": b"{kaputt"}])
    dialog = info.value
    assert "keine gültige" in dialog.message
    dialog.accept()
    assert page.is_visible("#btn-restore")


def test_backup_reminder_after_enough_sessions(app_page, base_url, tmp_path):
    page = app_page
    assert not page.is_visible("#btn-backup-reminder")
    every = page.evaluate("import('./js/config.js').then(c => c.BACKUP.remindAfterSessions)")
    seed_state(page, base_url, every)
    assert page.is_visible("#btn-backup-reminder")
    page.evaluate("Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })")
    hold(page, "#btn-backup-reminder", 500)
    assert page.is_visible("#btn-backup-reminder"), "a short press does nothing"
    with page.expect_download() as info:
        hold(page, "#btn-backup-reminder", 3100)
    target = tmp_path / "b.json"
    info.value.save_as(target)
    assert json.loads(target.read_text(encoding="utf-8"))["state"]["sessions"] == every
    page.wait_for_selector("#btn-backup-reminder", state="hidden")
    page.goto(f"{base_url}/index.html?schnell=1")
    page.wait_for_selector("#screen-start.active")
    assert not page.is_visible("#btn-backup-reminder"), "stays hidden after the backup"
    assert not page.console_errors, page.console_errors


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
