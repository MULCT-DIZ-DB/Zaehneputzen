"""Tests for the developer mode: multiplication gate and 'everything unlocked' view."""
from test_ui import active_screen, open_parents, solve_gate


def test_challenge_uses_single_digits(js):
    res = js("""
        const out = [];
        for (let i = 0; i < 300; i++) out.push(m.devmode.makeChallenge(Math.random));
        const edges = [m.devmode.makeChallenge(() => 0), m.devmode.makeChallenge(() => 0.99999)];
        return [out, edges, m.config.DEV];
    """)
    challenges, edges, dev = res
    for c in challenges + edges:
        assert isinstance(c["a"], int) and isinstance(c["b"], int)
        assert dev["minFactor"] <= c["a"] <= dev["maxFactor"] <= 9
        assert dev["minFactor"] <= c["b"] <= dev["maxFactor"]
    assert edges[0] == {"a": dev["minFactor"], "b": dev["minFactor"]}
    assert edges[1] == {"a": dev["maxFactor"], "b": dev["maxFactor"]}


def test_check_answer(js):
    cases = [("56", True), (" 56 ", True), ("056", True), ("55", False), ("", False), ("abc", False),
             ("56.0", False), ("5 6", False), ("-56", False), ("56abc", False), (None, False), (56, False)]
    res = js("return arg.map(a => m.devmode.checkAnswer({ a: 7, b: 8 }, a));", [c[0] for c in cases])
    assert res == [c[1] for c in cases]


def test_unlock_all_view_does_not_mutate(js):
    res = js("""
        const s = m.storage.defaultState();
        const v = m.devmode.unlockAll(s);
        return [s.stickers.length, s.outfits.length, s.moves.length,
                v.stickers.length, v.outfits.length, v.moves.length,
                m.config.STICKERS.length, m.config.OUTFITS.length, m.config.MOVES.length];
    """)
    assert res[:3] == [0, 0, 1]
    assert res[3:6] == res[6:9]


def test_persistable_keeps_real_progress(js):
    res = js("""
        const real = m.storage.defaultState(); real.stickers = ['stern-rosa']; real.sessions = 4;
        const view = m.devmode.unlockAll(real);
        const edited = { ...view, wearing: ['tutu'], name: 'Mia', sequins: { 'pailletten-rock': '01' } };
        return m.devmode.persistable(real, edited);
    """)
    assert res["stickers"] == ["stern-rosa"] and res["sessions"] == 4
    assert res["outfits"] == [] and res["wearing"] == ["tutu"]
    assert res["name"] == "Mia" and res["sequins"] == {"pailletten-rock": "01"}


def solve(page) -> None:
    """Answers the developer-mode multiplication correctly."""
    solve_gate(page, "dev")


def test_dev_mode_unlocks_everything_in_ui(app_page, base_url):
    page = app_page
    open_parents(page)
    page.click("#btn-dev")
    assert "×" in page.inner_text("#dev-question")
    solve(page)
    assert page.is_visible("#dev-active")
    page.click("#btn-parents-close")
    assert page.is_visible("#dev-badge")
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == page.locator(".sticker-slot").count()
    page.click("#screen-album .btn-back")
    page.click("#btn-dress")
    total_outfits = page.evaluate("import('./js/config.js').then(c => c.OUTFITS.length)")
    assert page.locator(".wardrobe-item").count() == total_outfits
    total_moves = page.evaluate("import('./js/config.js').then(c => c.MOVES.length)")
    assert page.locator(".move-item").count() == total_moves
    page.locator(".wardrobe-item").first.click()
    saved = page.evaluate("JSON.parse(localStorage.getItem('zahnputz-tanz'))")
    assert saved["stickers"] == [] and saved["outfits"] == [], "real progress must stay untouched"
    assert len(saved["wearing"]) == 1
    assert not page.console_errors, page.console_errors
    page.goto(f"{base_url}/index.html?schnell=1")
    page.wait_for_selector("#screen-start.active")
    assert not page.is_visible("#dev-badge"), "dev mode ends on reload"


def test_wrong_answer_then_on_and_off(app_page):
    """A wrong answer keeps developer mode off; a right one turns it on; it can be switched off again."""
    page = app_page
    open_parents(page)
    page.click("#btn-dev")
    a = int(page.get_attribute("#dev-question", "data-a"))
    b = int(page.get_attribute("#dev-question", "data-b"))
    page.fill("#input-dev", str(a * b + 1))
    page.click("#btn-dev-check")
    assert page.is_visible("#dev-wrong") and not page.is_visible("#dev-active")
    solve(page)
    assert page.is_visible("#dev-active")
    page.click("#btn-dev-off")
    page.click("#btn-parents-close")
    assert active_screen(page) == "screen-start" and not page.is_visible("#dev-badge")
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 0