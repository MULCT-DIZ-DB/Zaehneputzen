"""Touch-related UI tests: big sticker view, sequin buttons, finger-sized sequin touch area."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402

SEQUIN_STATE = {"stickers": ["stern-rosa", "herz-salbei"], "outfits": ["pailletten-rock", "pailletten-top"],
                "wearing": ["pailletten-rock", "pailletten-top"]}


@pytest.fixture()
def seeded_page(app_page, base_url):
    """App page with two stickers and both sequin outfits worn."""
    app_page.evaluate(f"localStorage.setItem('zahnputz-tanz', {json.dumps(json.dumps(SEQUIN_STATE))})")
    app_page.goto(f"{base_url}/index.html?schnell=1")
    app_page.wait_for_selector("#screen-start.active")
    return app_page


def test_sticker_zoom_covers_half_the_display(seeded_page):
    page = seeded_page
    page.click("#btn-album")
    assert not page.is_visible("#sticker-zoom")
    page.locator(".sticker-slot.owned").first.click()
    assert page.is_visible("#sticker-zoom")
    for viewport in (config.IPAD_PORTRAIT, config.IPAD_LANDSCAPE):
        page.set_viewport_size(viewport)
        # Layout size (ignores the short zoom-in animation transform).
        box = page.eval_on_selector("#sticker-zoom .zoom-sticker", "e => ({"
                                    " x: e.offsetLeft, width: e.offsetWidth, height: e.offsetHeight })")
        ratio = box["width"] * box["height"] / (viewport["width"] * viewport["height"])
        assert 0.35 <= ratio <= 0.6, (viewport, ratio)
        assert box["x"] >= 0 and box["x"] + box["width"] <= viewport["width"]
    assert "Stern" in page.inner_text("#sticker-zoom")
    page.mouse.click(10, viewport["height"] - 10)
    assert not page.is_visible("#sticker-zoom")
    assert not page.console_errors, page.console_errors


def test_missing_sticker_does_not_zoom(seeded_page):
    page = seeded_page
    page.click("#btn-album")
    page.locator(".sticker-slot:not(.owned)").first.click()
    assert not page.is_visible("#sticker-zoom")


def fills(page, outfit_id):
    """Returns the fill colours of all sequins of one worn outfit."""
    return page.eval_on_selector_all(f".dress-dancer .sequin-patch[data-outfit='{outfit_id}'] .sq",
                                     "els => els.map(e => e.getAttribute('fill'))")


def outfit_colors(page, outfit_id):
    """Front/back colours of an outfit from the config."""
    return page.evaluate(f"import('./js/config.js').then(c => {{ const o = c.OUTFITS.find(x => x.id === '{outfit_id}');"
                         " return [o.sequinFront, o.sequinBack]; })")


def test_invert_and_reset_buttons(seeded_page):
    page = seeded_page
    page.click("#btn-dress")
    front, back = outfit_colors(page, "pailletten-rock")
    assert set(fills(page, "pailletten-rock")) == {front}
    # Stroke down over the middle of the skirt -> some sequins show the back side.
    box = page.locator(".dress-dancer").bounding_box()
    scale = box["height"] / 340
    x = box["x"] + 100 * scale
    page.mouse.move(x, box["y"] + 165 * scale)
    page.mouse.down()
    page.mouse.move(x, box["y"] + 205 * scale, steps=8)
    page.mouse.up()
    page.clock.run_for(500)
    pattern = fills(page, "pailletten-rock")
    changed = pattern.count(back)
    assert 0 < changed < len(pattern)
    page.click("#btn-flip-all")
    page.clock.run_for(500)
    inverted = fills(page, "pailletten-rock")
    assert inverted.count(back) == len(pattern) - changed, "flip-all inverts the pattern"
    page.click("#btn-sequins-reset")
    page.clock.run_for(500)
    assert set(fills(page, "pailletten-rock")) == {front}
    assert set(fills(page, "pailletten-top")) == {outfit_colors(page, "pailletten-top")[0]}
    saved = page.evaluate("JSON.parse(localStorage.getItem('zahnputz-tanz')).sequins")
    assert set(saved["pailletten-rock"]) == {"0"}
    assert not page.console_errors, page.console_errors


def test_touch_radius_is_finger_sized(seeded_page):
    """The touch radius on screen should be about a fingertip (radius 18–26 px), not tiny and not the whole top."""
    page = seeded_page
    page.click("#btn-dress")
    box = page.locator(".dress-dancer").bounding_box()
    radius = page.evaluate("import('./js/config.js').then(c => c.SEQUINS.touchRadius)")
    on_screen = radius * box["height"] / 340
    assert 18 <= on_screen <= 26, on_screen


def test_stroke_continues_outside_the_dancer(seeded_page):
    """A finger sliding off the dancer and back keeps flipping (pointer capture)."""
    page = seeded_page
    page.click("#btn-dress")
    _, back = outfit_colors(page, "pailletten-rock")
    box = page.locator(".dress-dancer").bounding_box()
    scale = box["height"] / 340
    y = box["y"] + 185 * scale
    page.mouse.move(box["x"] + 20 * scale, y)  # on the dancer, left of the skirt
    page.mouse.down()
    page.mouse.move(box["x"] - 60, y, steps=4)  # finger leaves the dancer …
    page.mouse.move(box["x"] + 180 * scale, y, steps=12)  # … and sweeps right across the skirt
    page.mouse.up()
    page.clock.run_for(500)
    assert back in fills(page, "pailletten-rock")
