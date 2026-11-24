"""Tests for saving/loading progress in ``app/js/storage.js``."""


def test_default_state_shape_and_types(js):
    s = js("return m.storage.defaultState();")
    assert s["schema"] == js("return m.config.SCHEMA_VERSION;")
    assert s["name"] == ""
    assert s["sessions"] == 0
    for key in ("stickers", "outfits", "moves", "wearing"):
        assert isinstance(s[key], list), key
    assert s["moves"] == [js("return m.config.MOVES[0].id;")], "first move is free"
    assert isinstance(s["calendar"], dict) and isinstance(s["sequins"], dict)
    assert s["settings"] == js("return m.config.DEFAULT_SETTINGS;")


def test_round_trip(js):
    res = js("""
        const st = m.storage.defaultState();
        st.name = 'Clara'; st.stickers = ['stern-rosa']; st.sessions = 3;
        st.calendar['2026-11-24'] = { morgens: true, abends: false };
        st.sequins['pailletten-rock'] = '0101';
        const mem = m.storage.memoryStorage();
        const ok = m.storage.saveState(st, mem);
        return [ok, m.storage.loadState(mem)];
    """)
    ok, loaded = res
    assert ok is True
    assert loaded["name"] == "Clara" and loaded["stickers"] == ["stern-rosa"] and loaded["sessions"] == 3
    assert loaded["calendar"]["2026-11-24"] == {"morgens": True, "abends": False}
    assert loaded["sequins"]["pailletten-rock"] == "0101"


def test_real_localstorage_round_trip(js):
    res = js("""
        const st = m.storage.defaultState(); st.name = 'Mia';
        m.storage.saveState(st);
        return [localStorage.getItem(m.config.STORAGE_KEY) !== null, m.storage.loadState().name];
    """)
    assert res == [True, "Mia"]


def test_empty_storage_gives_defaults(js):
    assert js("return m.storage.loadState(m.storage.memoryStorage());") == js("return m.storage.defaultState();")


def test_broken_json_gives_defaults(js):
    res = js("""
        const mem = m.storage.memoryStorage();
        mem.setItem(m.config.STORAGE_KEY, '{kaputt');
        return m.storage.loadState(mem);
    """)
    assert res == js("return m.storage.defaultState();")


def test_wrong_types_are_repaired(js):
    res = js("""
        const raw = { schema: 1, name: 42, sessions: 'viele', stickers: 'x', outfits: [1, 'glitzer-krone', null],
                      moves: [], wearing: {}, calendar: [], sequins: { a: 5, b: '0110' },
                      settings: { totalSec: 9999, zoneOrder: 'gibtsnicht', music: 'ja', volume: 7 } };
        return m.storage.validateState(raw);
    """)
    assert res["name"] == "" and res["sessions"] == 0
    assert res["stickers"] == [] and res["outfits"] == ["glitzer-krone"]
    assert res["moves"] == [js("return m.config.MOVES[0].id;")]
    assert res["wearing"] == [] and res["calendar"] == {}
    assert res["sequins"] == {"b": "0110"}
    s = res["settings"]
    assert s["totalSec"] == js("return m.config.TIMER.maxTotalSec;")
    assert s["zoneOrder"] == js("return m.config.DEFAULT_SETTINGS.zoneOrder;")
    assert s["music"] is True and s["volume"] == 1


def test_unknown_catalog_ids_are_dropped(js):
    res = js("""return m.storage.validateState({ ...m.storage.defaultState(),
                stickers: ['stern-rosa', 'gibts-nicht', 'stern-rosa'], outfits: ['tutu', 'nope'] });""")
    assert res["stickers"] == ["stern-rosa"] and res["outfits"] == ["tutu"]


def test_calendar_entries_validated(js):
    res = js("""return m.storage.validateState({ ...m.storage.defaultState(),
                calendar: { '2026-11-24': { morgens: true }, 'quatsch': { morgens: true },
                            '2026-11-25': 'x', '2026-02-29': { abends: 1 } } }).calendar;""")
    assert res == {"2026-11-24": {"morgens": True, "abends": False},
                   "2026-02-29": {"morgens": False, "abends": False}}


def test_migration_from_schema_0(js):
    res = js("""return m.storage.migrate({ name: 'Alt', stickers: ['stern-rosa'] });""")
    assert res["schema"] == js("return m.config.SCHEMA_VERSION;")
    assert res["name"] == "Alt" and res["stickers"] == ["stern-rosa"]


def test_future_schema_kept_readable(js):
    res = js("""return m.storage.migrate({ ...m.storage.defaultState(), schema: 999, name: 'Neu' });""")
    assert res["name"] == "Neu"


def test_no_localstorage_available(js):
    """Private mode / blocked storage must never crash the app."""
    res = js("""
        const broken = { getItem() { throw new Error('nein'); }, setItem() { throw new Error('nein'); },
                         removeItem() { throw new Error('nein'); } };
        return [m.storage.saveState(m.storage.defaultState(), broken),
                m.storage.loadState(broken).sessions];
    """)
    assert res == [False, 0]


def test_reset_clears(js):
    res = js("""
        const mem = m.storage.memoryStorage();
        const st = m.storage.defaultState(); st.sessions = 9; m.storage.saveState(st, mem);
        m.storage.resetState(mem);
        return m.storage.loadState(mem).sessions;
    """)
    assert res == 0
