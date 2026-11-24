"""Tests for unlockable brushing backgrounds (catalogue, unlock rule, storage, UI)."""
from test_ui import active_screen, fast_countdown_ms
from test_devmode import solve
from test_ui import open_parents


def test_catalogue(js):
    res = js("return [m.config.BACKGROUNDS, m.config.REWARDS.backgroundEverySessions];")
    items, every = res
    assert len(items) >= 7 and items[0]["id"] == "papier"
    ids = [b["id"] for b in items]
    assert len(ids) == len(set(ids))
    assert all(isinstance(b["name"], str) and b["name"] for b in items)
    assert isinstance(every, int) and every > 0


def test_default_state_has_free_background(js):
    s = js("return m.storage.defaultState();")
    assert s["backgrounds"] == ["papier"] and s["background"] == "papier"


def test_background_unlocked_every_n_sessions(js):
    res = js("""
        let s = m.storage.defaultState(); const got = [];
        const every = m.config.REWARDS.backgroundEverySessions;
        for (let i = 0; i < every * 2; i++) {
            const day = new Date(2026, 0, 1 + Math.floor(i / 2), i % 2 ? 19 : 7);
            const r = m.rewards.completeSession(s, { date: day, completed: true, rng: () => 0 });
            s = r.state; if (r.reward.background) got.push([i + 1, r.reward.background]);
        }
        return [got, every, m.config.BACKGROUNDS.slice(1, 3).map(b => b.id), s.backgrounds.length];
    """)
    got, every, next_two, owned = res
    assert got == [[every, next_two[0]], [every * 2, next_two[1]]]
    assert owned == 3


def test_all_backgrounds_owned_no_crash(js):
    res = js("""
        const s = m.storage.defaultState(); s.backgrounds = m.config.BACKGROUNDS.map(b => b.id);
        s.sessions = m.config.REWARDS.backgroundEverySessions - 1;
        return m.rewards.completeSession(s, { date: new Date(2026, 10, 24, 8), completed: true, rng: () => 0 }).reward.background;
    """)
    assert res is None


def test_storage_repairs_backgrounds(js):
    res = js("""
        const a = m.storage.validateState({ backgrounds: ['ballettsaal', 'quatsch', 'ballettsaal'], background: 'ballettsaal' });
        const b = m.storage.validateState({ backgrounds: ['ballettsaal'], background: 'sternenhimmel' });
        const c = m.storage.validateState({ backgrounds: 'x', background: 5 });
        return [a.backgrounds, a.background, b.background, c.backgrounds, c.background];
    """)
    assert res == [["papier", "ballettsaal"], "ballettsaal", "papier", ["papier"], "papier"]


def test_dev_mode_unlocks_backgrounds(js):
    res = js("""
        const v = m.devmode.unlockAll(m.storage.defaultState());
        const real = m.storage.defaultState();
        const kept = m.devmode.persistable(real, { ...v, background: 'buehne' });
        return [v.backgrounds.length, m.config.BACKGROUNDS.length, kept.background, kept.backgrounds];
    """)
    assert res[0] == res[1]
    assert res[2] == "buehne" and res[3] == ["papier"]


def test_background_screen_and_brushing(app_page):
    page = app_page
    page.click("#btn-backgrounds")
    assert active_screen(page) == "screen-backgrounds"
    tiles = page.locator(".bg-tile")
    assert tiles.count() == page.evaluate("import('./js/config.js').then(c => c.BACKGROUNDS.length)")
    assert page.locator(".bg-tile.owned").count() == 1
    page.locator(".bg-tile:not(.owned)").first.click()
    assert page.locator(".bg-tile.selected").get_attribute("data-bg") == "papier", "locked tiles cannot be chosen"
    page.click("#screen-backgrounds .btn-back")
    open_parents(page)
    page.click("#btn-dev")
    solve(page)
    page.click("#btn-parents-close")
    page.click("#btn-backgrounds")
    page.click(".bg-tile[data-bg='sternenhimmel']")
    assert page.locator(".bg-tile.selected").get_attribute("data-bg") == "sternenhimmel"
    page.click("#screen-backgrounds .btn-back")
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    assert page.get_attribute("#screen-brush .brush-bg", "data-bg") == "sternenhimmel"
    assert not page.console_errors, page.console_errors
