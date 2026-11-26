"""End-to-end tests of the play window, games hub and the three mini games (WebKit, fake clock)."""
import sys
from pathlib import Path

from test_ui import active_screen, brush_through, open_parents

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402


def cfg(page, expr):
    """Reads a value from the app config, e.g. ``cfg(page, 'SUGAR.roundMs')``."""
    return page.evaluate(f"import('./js/config.js').then(c => c.{expr})")


def finish_brushing(page):
    """Brushes once in fast mode and lands on the reward screen."""
    brush_through(page)
    assert active_screen(page) == "screen-reward"


def open_hub(page):
    """Brushes, opens the reward gift and enters the games hub."""
    finish_brushing(page)
    if page.is_visible("#gift-box"):
        page.click("#gift-box")
        page.clock.run_for(1500)
    page.click("#btn-games")
    assert active_screen(page) == "screen-games"


def wait_phase(page, phase, max_ms=20000):
    """Advances the fake clock until the dance game reaches ``phase``."""
    for _ in range(max_ms // 250):
        if page.get_attribute("#screen-game-dance", "data-phase") == phase:
            return
        page.clock.run_for(250)
    raise AssertionError(f"phase {phase} not reached")


def test_no_games_before_brushing(app_page):
    assert not app_page.is_visible("#btn-games-start")


def test_games_open_after_brushing(app_page):
    page = app_page
    finish_brushing(page)
    page.click("#gift-box")
    page.clock.run_for(1500)
    assert page.is_visible("#btn-games")
    page.click("#btn-reward-next")
    assert page.is_visible("#btn-games-start")
    assert "5" in page.inner_text("#btn-games-start")
    page.click("#btn-games-start")
    assert active_screen(page) == "screen-games"
    for game in ("dance", "piano", "sugar"):
        page.click(f"#btn-game-{game}")
        assert active_screen(page) == f"screen-game-{game}"
        page.click(f"#screen-game-{game} .btn-back")
        assert active_screen(page) == "screen-games"
    page.click("#screen-games .btn-back")
    assert active_screen(page) == "screen-start"
    assert not page.console_errors, page.console_errors


def test_zero_play_minutes_hides_games(app_page):
    page = app_page
    open_parents(page)
    page.fill("#input-play", "0")
    page.dispatch_event("#input-play", "input")
    page.click("#btn-parents-close")
    finish_brushing(page)
    assert not page.is_visible("#btn-games")


def test_time_up_overlay(app_page):
    page = app_page
    open_hub(page)
    page.clock.run_for(cfg(page, "DEFAULT_SETTINGS.playMinutes") * 60000 + 2000)
    assert page.is_visible("#screen-games .timeup-box")
    page.click("#screen-games .btn-timeup")
    assert active_screen(page) == "screen-start"
    assert not page.is_visible("#btn-games-start")


def test_dance_wrong_then_right(app_page):
    page = app_page
    open_hub(page)
    page.click("#btn-game-dance")
    wait_phase(page, "input")
    seq = page.get_attribute("#screen-game-dance", "data-sequence").split(",")
    assert len(seq) == cfg(page, "DANCE_GAME.startLength")
    wrong = next(p for p in ("arme-hoch", "drehung", "huepfer", "welle") if p != seq[0])
    page.click(f".pose-btn[data-pose='{wrong}']")
    assert "Nochmal" in page.inner_text("#dance-status")
    wait_phase(page, "input")
    assert page.get_attribute("#screen-game-dance", "data-sequence").split(",") == seq, "same sequence again"
    for pose in seq:
        page.click(f".pose-btn[data-pose='{pose}']")
    wait_phase(page, "input")
    assert len(page.get_attribute("#screen-game-dance", "data-sequence").split(",")) == len(seq) + 1
    assert not page.console_errors, page.console_errors


def test_piano_hit_and_free_play(app_page):
    page = app_page
    open_hub(page)
    page.click("#btn-game-piano")
    page.click(".song-btn[data-song='entchen']")
    first_lane = page.evaluate("import('./js/songs.js').then(s => import('./js/games/piano.js').then(p =>"
                               " p.buildChart(s.SONGS.find(x => x.id === 'entchen'))[0].lane))")
    page.clock.run_for(cfg(page, "PIANO.leadInMs"))
    page.click(f".piano-key[data-lane='{first_lane}']")
    assert page.inner_text("#piano-hits").strip().startswith("1")
    page.click("#screen-game-piano .btn-back")
    page.click("#btn-game-piano")
    page.click("#btn-piano-free")
    page.click(".piano-key[data-lane='4']")
    assert page.get_attribute("#screen-game-piano", "data-last") == "67"
    assert page.locator(".piano-note").count() == 0
    assert not page.console_errors, page.console_errors


def start_entchen(page):
    """Opens the piano game and starts 'Alle meine Entchen'; returns the chart."""
    open_hub(page)
    page.click("#btn-game-piano")
    page.click(".song-btn[data-song='entchen']")
    return page.evaluate("import('./js/songs.js').then(s => import('./js/games/piano.js').then(p =>"
                         " p.buildChart(s.SONGS.find(x => x.id === 'entchen'))))")


def test_piano_missed_note_is_marked(app_page):
    """A note counts as missed once it is more than the hit window past the line – and then looks missed."""
    page = app_page
    chart = start_entchen(page)
    window = cfg(page, "PIANO.hitWindowMs")
    page.clock.run_for(chart[0]["timeMs"] + window - 30)
    assert "missed" not in (page.get_attribute(".piano-note[data-i='0']", "class") or "")
    page.clock.run_for(60)
    assert "missed" in page.get_attribute(".piano-note[data-i='0']", "class")
    page.click(f".piano-key[data-lane='{chart[0]['lane']}']")
    assert page.inner_text("#piano-hits").strip().startswith("0"), "too late is not a hit"


def test_piano_hit_note_is_marked(app_page):
    page = app_page
    chart = start_entchen(page)
    page.clock.run_for(chart[0]["timeMs"] - 200)
    page.click(f".piano-key[data-lane='{chart[0]['lane']}']")
    assert "hit" in page.get_attribute(".piano-note[data-i='0']", "class")


def test_every_key_press_lights_its_lane(app_page):
    """Feedback above the key on every press, not only on hits."""
    page = app_page
    open_hub(page)
    page.click("#btn-game-piano")
    page.click("#btn-piano-free")
    page.click(".piano-key[data-lane='2']")
    assert "touched" in page.get_attribute(".piano-lane[data-lane='2']", "class")


def test_piano_notes_follow_the_clock(app_page):
    """Each note's fall animation is synced to the song clock, even if its spawn timer fires late."""
    page = app_page
    chart = start_entchen(page)
    page.clock.fast_forward(chart[0]["timeMs"] - 1000)  # the spawn timer fires much too late, like on a busy iPad
    info = page.evaluate("""() => {
        const n = document.querySelector(".piano-note[data-i='0']");
        const a = n.getAnimations()[0];
        return [a.currentTime, a.effect.getTiming().duration];
    }""")
    travel = cfg(page, "PIANO.travelMs")
    # Without the sync the note would start at the top (≈ 0 ms); real time between spawn and reading adds a little.
    assert abs(info[0] - (travel - 1000)) < 150, info


def test_piano_tempo_choice(app_page):
    page = app_page
    open_hub(page)
    page.click("#btn-game-piano")
    assert page.get_attribute(".tempo-btn.selected", "data-tempo") == "langsam"
    page.click(".tempo-btn[data-tempo='normal']")
    assert page.get_attribute(".tempo-btn.selected", "data-tempo") == "normal"
    saved = page.evaluate("JSON.parse(localStorage.getItem('zahnputz-tanz')).settings.pianoTempo")
    assert saved == "normal"
    page.click(".song-btn[data-song='entchen']")
    chart = page.evaluate("import('./js/songs.js').then(s => import('./js/games/piano.js').then(p =>"
                          " p.buildChart(s.SONGS.find(x => x.id === 'entchen'), 'normal')))")
    page.clock.run_for(chart[1]["timeMs"])
    page.click(f".piano-key[data-lane='{chart[1]['lane']}']")
    assert page.inner_text("#piano-hits").strip().startswith("1"), "second note hit at the normal-tempo time"


def test_piano_slide_over_keys(app_page):
    """Sliding a finger across the keyboard plays every key once, in order."""
    page = app_page
    open_hub(page)
    page.click("#btn-game-piano")
    page.click("#btn-piano-free")
    first = page.locator(".piano-key[data-lane='0']").bounding_box()
    last = page.locator(".piano-key[data-lane='7']").bounding_box()
    y = first["y"] + first["height"] / 2
    page.mouse.move(first["x"] + first["width"] / 2, y)
    page.mouse.down()
    page.mouse.move(last["x"] + last["width"] / 2, y, steps=40)
    page.mouse.up()
    assert page.get_attribute("#screen-game-piano", "data-presses") == "8"
    assert page.get_attribute("#screen-game-piano", "data-last") == "72"
    page.mouse.move(last["x"] + last["width"] / 2, y, steps=5)  # moving without pressing plays nothing
    assert page.get_attribute("#screen-game-piano", "data-presses") == "8"


def test_piano_song_ends_with_stars(app_page):
    page = app_page
    open_hub(page)
    page.click("#btn-game-piano")
    page.click(".song-btn[data-song='entchen']")
    page.clock.run_for(60000)
    assert page.is_visible("#piano-result")
    assert "★" in page.inner_text("#piano-result")


def test_sugar_round(app_page):
    page = app_page
    open_hub(page)
    page.click("#btn-game-sugar")
    page.click("#btn-sugar-start")
    page.clock.run_for(cfg(page, "SUGAR.startDelayMs") + 50)
    assert page.locator(".bug").count() >= 1
    page.locator(".bug").first.click(force=True)
    assert page.inner_text("#sugar-count").strip() == "1"
    page.clock.run_for(cfg(page, "SUGAR.roundMs") + 500)
    assert page.is_visible("#sugar-result")
    assert "1" in page.inner_text("#sugar-result")
    assert page.locator(".bug").count() == 0
    assert not page.console_errors, page.console_errors


def test_game_screens_fit_and_have_big_buttons(app_page):
    page = app_page
    open_hub(page)
    for game in ("dance", "piano", "sugar"):
        page.click(f"#btn-game-{game}")
        if game == "piano":
            page.click("#btn-piano-free")
        for viewport in (config.IPAD_LANDSCAPE, config.IPAD_PORTRAIT):
            page.set_viewport_size(viewport)
            size = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
            assert size[0] <= viewport["width"] + 1 and size[1] <= viewport["height"] + 1, (game, viewport)
            buttons = page.eval_on_selector_all(
                f"#screen-game-{game} button", "els => els.filter(e => e.offsetParent).map(e => [e.className, e.offsetWidth, e.offsetHeight])")
            for cls, w, h in buttons:
                assert w >= config.MIN_TOUCH_TARGET_PX and h >= config.MIN_TOUCH_TARGET_PX, (game, viewport, cls, w, h)
        page.set_viewport_size(config.IPAD_LANDSCAPE)
        page.click(f"#screen-game-{game} .btn-back")
