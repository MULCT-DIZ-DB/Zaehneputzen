"""End-to-end tests of the app in WebKit (Safari engine) with a fake clock.

The app is opened with ``?schnell=1`` (short brushing time) from the ``app_page`` fixture.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402


def fast_total_ms(page) -> int:
    """Reads the fast-mode brushing time from the app config."""
    return page.evaluate("import('./js/config.js').then(c => c.TIMER.fastTotalSec * 1000)")


def fast_countdown_ms(page) -> int:
    """Reads the fast-mode countdown time from the app config."""
    return page.evaluate("import('./js/config.js').then(c => c.TIMER.fastCountdownSec * 1000)")


def active_screen(page) -> str:
    """Returns the id of the currently visible screen."""
    return page.eval_on_selector("section.screen.active", "el => el.id")


def brush_through(page) -> None:
    """Starts a brushing session and lets the fake clock run until the end."""
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    assert active_screen(page) == "screen-brush"
    page.clock.run_for(fast_total_ms(page) + 500)


def test_start_screen(app_page):
    assert app_page.evaluate("document.documentElement.lang") == "de"
    assert "Hallo" in app_page.inner_text("#greeting")
    assert app_page.is_visible("#btn-start")


def test_buttons_are_big_enough(app_page):
    sizes = app_page.eval_on_selector_all(
        "#screen-start button", "els => els.map(e => { const r = e.getBoundingClientRect(); return [e.id, r.width, r.height]; })")
    assert sizes
    for bid, w, h in sizes:
        assert w >= config.MIN_TOUCH_TARGET_PX and h >= config.MIN_TOUCH_TARGET_PX, bid


def test_full_brushing_flow_with_zone_changes(app_page):
    page = app_page
    page.click("#btn-start")
    assert active_screen(page) == "screen-countdown"
    page.clock.run_for(fast_countdown_ms(page) + 100)
    assert active_screen(page) == "screen-brush"
    zone_ms = fast_total_ms(page) // 4
    labels = []
    for _ in range(4):
        labels.append(page.inner_text("#zone-label"))
        page.clock.run_for(zone_ms)
    assert labels == ["oben links", "oben rechts", "unten links", "unten rechts"]
    page.clock.run_for(500)
    assert active_screen(page) == "screen-reward"
    page.click("#gift-box")
    page.clock.run_for(1500)
    assert page.is_visible("#reward-sticker")
    page.click("#btn-reward-next")
    page.clock.run_for(100)
    assert active_screen(page) == "screen-start"
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 1
    assert not page.console_errors, page.console_errors


def test_pause_stops_time(app_page):
    page = app_page
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    page.click("#btn-pause")
    page.clock.run_for(fast_total_ms(page) * 2)
    assert active_screen(page) == "screen-brush"
    assert page.inner_text("#zone-label") == "oben links"
    assert not page.is_visible("#btn-pause")
    page.click("#btn-resume")
    page.clock.run_for(fast_total_ms(page) + 500)
    assert active_screen(page) == "screen-reward"


def test_pause_screen_layout(app_page):
    """Continue button in the centre, cancel cross in a corner."""
    page = app_page
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    page.click("#btn-pause")
    vw, vh = config.IPAD_LANDSCAPE["width"], config.IPAD_LANDSCAPE["height"]
    resume = page.locator("#btn-resume").bounding_box()
    cx, cy = resume["x"] + resume["width"] / 2, resume["y"] + resume["height"] / 2
    assert abs(cx - vw / 2) < vw * 0.1 and abs(cy - vh / 2) < vh * 0.2
    stop = page.locator("#btn-stop").bounding_box()
    assert stop["x"] < vw * 0.15 and stop["y"] < vh * 0.15
    assert stop["width"] >= config.MIN_TOUCH_TARGET_PX and resume["height"] >= config.MIN_TOUCH_TARGET_PX


def test_cancel_cross_ends_without_gift(app_page):
    page = app_page
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    page.click("#btn-pause")
    page.click("#btn-stop")
    assert active_screen(page) == "screen-start"
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 0


def test_progress_survives_reload(app_page, base_url):
    page = app_page
    brush_through(page)
    page.click("#gift-box")
    page.clock.run_for(1500)
    page.click("#btn-reward-next")
    page.goto(f"{base_url}/index.html?schnell=1")
    page.wait_for_selector("#screen-start.active")
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 1


def test_second_session_same_slot_gives_no_gift(app_page):
    page = app_page
    for _ in range(2):
        brush_through(page)
        assert active_screen(page) == "screen-reward"
        if page.is_visible("#gift-box"):
            page.click("#gift-box")
            page.clock.run_for(1500)
        page.click("#btn-reward-next")
        page.clock.run_for(100)
    page.click("#btn-album")
    assert page.locator(".sticker-slot.owned").count() == 1


def open_parents(page) -> None:
    """Opens the hidden parent menu with a long press."""
    box = page.locator("#btn-parents").bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.clock.run_for(3100)
    page.mouse.up()


def test_parents_menu_has_back_navigation(app_page):
    open_parents(app_page)
    assert active_screen(app_page) == "screen-parents"
    app_page.click("#screen-parents .btn-back")
    assert active_screen(app_page) == "screen-start"


def test_no_character_while_brushing(app_page):
    page = app_page
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    assert active_screen(page) == "screen-brush"
    assert page.locator("#screen-brush .dancer").count() == 0


def test_confetti_keeps_falling_through_bottom_edge(app_page):
    page = app_page
    brush_through(page)
    assert active_screen(page) == "screen-reward"
    info = page.evaluate("""() => {
        const layer = document.querySelector('#screen-reward .confetti-layer');
        const pieces = [...layer.querySelectorAll('.confetti')];
        const ls = getComputedStyle(layer);
        return { fixed: ls.position, falling: layer.classList.contains('fall'),
                 iterations: pieces.map(p => getComputedStyle(p).animationIterationCount),
                 names: pieces.map(p => getComputedStyle(p).animationName),
                 count: pieces.length, height: layer.getBoundingClientRect().height, vh: innerHeight };
    }""")
    assert info["fixed"] == "fixed" and info["falling"]
    assert info["height"] >= info["vh"] - 1, "layer spans the whole display"
    assert info["count"] >= 12
    assert set(info["iterations"]) == {"infinite"} and set(info["names"]) == {"fall"}
    # Keyframe ends below the visible area: inspect the CSS rule.
    end = page.evaluate("""() => {
        for (const sheet of document.styleSheets) for (const rule of sheet.cssRules)
            if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'fall') return rule.cssRules[rule.cssRules.length - 1].style.transform;
        return '';
    }""")
    assert "100vh" in end


def test_short_tap_does_not_open_parents(app_page):
    app_page.click("#btn-parents")
    app_page.clock.run_for(3100)
    assert active_screen(app_page) == "screen-start"


def test_parent_menu_sets_name(app_page):
    page = app_page
    open_parents(page)
    assert active_screen(page) == "screen-parents"
    page.fill("#input-name", "Clara")
    page.click("#btn-parents-close")
    assert "Clara" in page.inner_text("#greeting")


def test_calendar_and_dress_screens_open(app_page):
    page = app_page
    page.click("#btn-calendar")
    assert active_screen(page) == "screen-calendar"
    assert page.locator(".cal-day").count() >= 28
    page.click("#screen-calendar .btn-back")
    page.click("#btn-dress")
    assert active_screen(page) == "screen-dress"
    page.click("#screen-dress .btn-back")
    assert active_screen(page) == "screen-start"
    assert not app_page.console_errors, app_page.console_errors


@pytest.mark.parametrize("viewport", [config.IPAD_LANDSCAPE, config.IPAD_PORTRAIT])
def test_layout_fits_without_scrolling(app_page, viewport):
    page = app_page
    page.set_viewport_size(viewport)
    for btn in ("#btn-start", None):
        if btn:
            page.click(btn)
            page.clock.run_for(fast_countdown_ms(page) + 100)
        overflow = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
        assert overflow[0] <= viewport["width"] + 1 and overflow[1] <= viewport["height"] + 1
