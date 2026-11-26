"""Tests for the play window after brushing (``app/js/playtime.js``) and its stored values."""
MIN = 60000
NOW = 1_800_000_000_000  # fixed epoch ms for pure tests


def test_defaults(js):
    s = js("return m.storage.defaultState();")
    assert s["playUntil"] == 0
    assert s["gameStats"] == {"danceBest": 0, "sugarBest": 0}
    g = js("return m.config.GAMES;")
    assert s["settings"]["playMinutes"] == g["defaultMinutes"]
    assert g["minMinutes"] == 0 and g["maxMinutes"] == 15


def test_open_window_uses_setting(js):
    res = js("""
        const s = m.storage.defaultState(); s.settings.playMinutes = 5;
        const o = m.playtime.openPlayWindow(s, arg);
        return [s.playUntil, o.playUntil];
    """, NOW)
    assert res == [0, NOW + 5 * MIN], "input state is not mutated"


def test_zero_minutes_keeps_games_closed(js):
    res = js("""
        const s = m.storage.defaultState(); s.settings.playMinutes = 0;
        const o = m.playtime.openPlayWindow(s, arg);
        return [o.playUntil, m.playtime.isPlayOpen(o, arg, false)];
    """, NOW)
    assert res == [0, False]


def test_minutes_left(js):
    cases = [(0, 5, True), (1, 5, True), (4 * MIN + 1, 1, True), (5 * MIN - 1, 1, True), (5 * MIN, 0, False), (9 * MIN, 0, False)]
    res = js("""
        const s = m.playtime.openPlayWindow(m.storage.defaultState(), arg.now);
        return arg.offsets.map(o => [m.playtime.playMinutesLeft(s, arg.now + o, false), m.playtime.isPlayOpen(s, arg.now + o, false)]);
    """, {"now": NOW, "offsets": [c[0] for c in cases]})
    assert res == [[c[1], c[2]] for c in cases]

def test_clock_set_backwards_is_capped(js):
    """If the device clock jumps back, the window never grows beyond the configured length."""
    res = js("""
        const s = m.playtime.openPlayWindow(m.storage.defaultState(), arg);
        return m.playtime.playMsLeft(s, arg - 3600000, false);
    """, NOW)
    assert res == 5 * MIN


def test_dev_mode_always_open(js):
    res = js("""
        const s = m.storage.defaultState();
        return [m.playtime.isPlayOpen(s, arg, true), m.playtime.isPlayOpen(s, arg, false)];
    """, NOW)
    assert res == [True, False]


def test_storage_repairs_play_values(js):
    res = js("""
        const v = m.storage.validateState({ playUntil: -5, gameStats: { danceBest: 3.5, sugarBest: 'x', extra: 1 },
            settings: { playMinutes: 99 } });
        const w = m.storage.validateState({ playUntil: 'bald', gameStats: [], settings: { playMinutes: -1 } });
        const ok = m.storage.validateState({ playUntil: 123, gameStats: { danceBest: 4, sugarBest: 17 }, settings: { playMinutes: 7 } });
        return [v.playUntil, v.gameStats, v.settings.playMinutes, w.playUntil, w.gameStats, w.settings.playMinutes,
                ok.playUntil, ok.gameStats, ok.settings.playMinutes];
    """)
    assert res == [0, {"danceBest": 0, "sugarBest": 0}, 15, 0, {"danceBest": 0, "sugarBest": 0}, 0,
                   123, {"danceBest": 4, "sugarBest": 17}, 7]


def test_dev_mode_keeps_play_fields(js):
    res = js("""
        const real = m.storage.defaultState();
        const kept = m.devmode.persistable(real, { ...m.devmode.unlockAll(real), playUntil: 99, gameStats: { danceBest: 2, sugarBest: 3 } });
        return [kept.playUntil, kept.gameStats, kept.stickers];
    """)
    assert res == [99, {"danceBest": 2, "sugarBest": 3}, []]
