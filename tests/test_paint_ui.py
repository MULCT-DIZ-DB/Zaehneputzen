"""Colouring game in the real app (WebKit): picture choice, colour wheel, tools, mixing, undo, saving."""
import sys
from pathlib import Path

import pytest

from test_ui import active_screen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402

PIXEL = """([x, y]) => {
    const c = document.querySelector('#screen-paint canvas.paint-layer');
    const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
}"""


def open_picture(page, picture="frei"):
    """Start screen → Malen → picture."""
    page.click("#btn-paint")
    assert active_screen(page) == "screen-paintmenu"
    page.click(f".paint-pick[data-picture='{picture}']")
    assert active_screen(page) == "screen-paint"


def to_screen(page, x, y):
    """Converts paint coordinates (1024×640) to screen coordinates."""
    box = page.locator("#screen-paint canvas.paint-layer").bounding_box()
    return box["x"] + x * box["width"] / 1024, box["y"] + y * box["height"] / 640


def stroke(page, points, steps=8):
    """Draws a finger stroke through paint coordinates."""
    sx, sy = to_screen(page, *points[0])
    page.mouse.move(sx, sy)
    page.mouse.down()
    for p in points[1:]:
        page.mouse.move(*to_screen(page, *p), steps=steps)
    page.mouse.up()
    page.clock.run_for(100)  # let the next animation frame draw


def pixel(page, x, y):
    """Colour of the painted layer at paint coordinates."""
    return page.evaluate(PIXEL, [x, y])


def pick(page, color=None, tool=None, size=None):
    """Selects colour / tool / size in the panel."""
    if color:
        page.click(f".wheel-seg[data-color='{color}']", force=True)
    if tool:
        page.click(f".tool-btn[data-tool='{tool}']")
    if size:
        page.click(f".size-btn[data-size='{size}']")


def test_paint_menu_lists_pictures(app_page):
    page = app_page
    page.click("#btn-paint")
    ids = page.eval_on_selector_all(".paint-pick", "els => els.map(e => e.dataset.picture)")
    assert ids[0] == "frei" and {"taenzerin", "buehne", "katze", "schmetterling", "regenbogen"} <= set(ids)
    page.click("#screen-paintmenu .btn-back")
    assert active_screen(page) == "screen-start"


def test_draw_mix_erase_undo(app_page):
    page = app_page
    open_picture(page)
    pick(page, color="rot-1", tool="pinsel", size="gross")
    stroke(page, [(300, 300), (500, 300)])
    r, g, b, a = pixel(page, 400, 300)
    assert a == 255 and r > 150 and g < 100, (r, g, b, a)
    pick(page, color="blau-1")
    stroke(page, [(400, 220), (400, 380)])
    r, g, b, a = pixel(page, 400, 300)
    assert r > g + 40 and b > g + 40, ("red + blue = violet", r, g, b)
    pick(page, tool="radierer")
    stroke(page, [(450, 300), (470, 300)])
    assert pixel(page, 460, 300)[3] == 0, "eraser"
    page.click("#btn-paint-undo")
    page.clock.run_for(100)
    assert pixel(page, 460, 300)[3] == 255, "undo brings it back"
    page.click("#btn-paint-undo")
    page.clock.run_for(100)
    r, g, b, a = pixel(page, 400, 300)
    assert r > 150 and b < 100, "second undo removes the blue"
    assert not page.console_errors, page.console_errors


def test_spray_and_pen(app_page):
    page = app_page
    open_picture(page)
    pick(page, color="gelb-1", tool="spray")
    stroke(page, [(200, 200), (260, 200)])
    painted = page.evaluate("""() => {
        const c = document.querySelector('#screen-paint canvas.paint-layer');
        const d = c.getContext('2d').getImageData(150, 150, 160, 100).data;
        let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
    }""")
    assert painted > 50
    pick(page, color="gruen-1", tool="stift", size="klein")
    stroke(page, [(600, 500), (700, 500)])
    assert pixel(page, 650, 500)[3] == 255 and pixel(page, 650, 512)[3] == 0, "thin pen line"


def test_bucket_fills_inside_the_lines(app_page):
    page = app_page
    open_picture(page, "regenbogen")
    pick(page, color="lila-1", tool="eimer")
    point = page.evaluate("import('./js/paint/templates.js').then(t => t.PICTURES.find(p => p.id === 'regenbogen').fillPoint)")
    x, y = point["x"], point["y"]
    page.mouse.click(*to_screen(page, x, y))
    page.clock.run_for(100)
    assert pixel(page, x, y)[3] == 255
    coverage = page.evaluate("""() => {
        const c = document.querySelector('#screen-paint canvas.paint-layer');
        const d = c.getContext('2d').getImageData(0, 0, 1024, 640).data;
        let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n / (1024 * 640);
    }""")
    assert 0.0005 < coverage < 0.6, "filled one area, not the whole sheet"


def test_painting_is_saved(app_page, base_url):
    page = app_page
    open_picture(page, "katze")
    pick(page, color="orange-1", tool="pinsel", size="gross")
    stroke(page, [(100, 550), (200, 550)])
    page.click("#screen-paint .btn-back")  # leaving saves
    page.wait_for_function("document.querySelector('#screen-paint').dataset.saved === 'katze'")
    page.goto(f"{base_url}/index.html?schnell=1")
    page.wait_for_selector("#screen-start.active")
    open_picture(page, "katze")
    page.wait_for_function("document.querySelector('#screen-paint').dataset.loaded === 'katze'")
    assert pixel(page, 150, 550)[3] == 255, "painting restored after reload"
    page.click("#screen-paint .btn-back")  # back in the picture menu
    page.click(".paint-pick[data-picture='frei']")
    page.wait_for_function("document.querySelector('#screen-paint').dataset.loaded === 'frei'")
    assert pixel(page, 150, 550)[3] == 0, "each picture has its own painting"


def test_clear_needs_confirmation(app_page):
    page = app_page
    open_picture(page)
    pick(page, color="rot-1", tool="pinsel")
    stroke(page, [(300, 300), (320, 300)])
    page.click("#btn-paint-clear")
    assert page.is_visible("#paint-clear-confirm")
    page.click("#btn-paint-clear-no")
    assert pixel(page, 310, 300)[3] == 255
    page.click("#btn-paint-clear")
    page.click("#btn-paint-clear-yes")
    page.clock.run_for(100)
    assert pixel(page, 310, 300)[3] == 0


@pytest.mark.parametrize("viewport", [config.IPAD_LANDSCAPE, config.IPAD_PORTRAIT])
def test_paint_layout(app_page, viewport):
    page = app_page
    page.set_viewport_size(viewport)
    open_picture(page, "taenzerin")
    size = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
    assert size[0] <= viewport["width"] + 1 and size[1] <= viewport["height"] + 1
    wheel = page.locator(".color-wheel").bounding_box()
    assert wheel["width"] >= 200, "wheel big enough for small fingers"
    buttons = page.eval_on_selector_all("#screen-paint button", "els => els.filter(e => e.offsetParent).map(e => [e.id || e.className, e.offsetWidth, e.offsetHeight])")
    for name, w, h in buttons:
        assert w >= config.MIN_TOUCH_TARGET_PX and h >= config.MIN_TOUCH_TARGET_PX, (name, w, h)
    canvas = page.locator("#screen-paint canvas.paint-layer").bounding_box()
    assert abs(canvas["width"] / canvas["height"] - 1024 / 640) < 0.02, "picture keeps its proportions"


@pytest.mark.parametrize("viewport", [{"width": 1880, "height": 920}, {"width": 1366, "height": 1024},
                                      {"width": 1024, "height": 768}, {"width": 768, "height": 1024}])
def test_lines_align_with_paint_layer(app_page, viewport):
    """Line art and paint layer must cover exactly the same area in the right proportion, at any
    screen size – otherwise the paint bucket's borders do not match the visible lines."""
    page = app_page
    page.set_viewport_size(viewport)
    open_picture(page, "taenzerin")
    page.clock.run_for(100)
    boxes = page.evaluate("""() => {
        const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
        return { canvas: r('#screen-paint canvas.paint-layer'), lines: r('#screen-paint .line-art'),
                 ratio: document.querySelector('#screen-paint .line-art').getAttribute('preserveAspectRatio') };
    }""")
    canvas, lines = boxes["canvas"], boxes["lines"]
    assert all(abs(a - b) < 1 for a, b in zip(canvas, lines)), boxes
    assert abs(canvas[2] / canvas[3] - 1024 / 640) < 0.01, ("picture keeps its proportions", canvas)
    assert boxes["ratio"] == "none", "lines are always stretched exactly like the paint layer"
    size = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
    assert size[0] <= viewport["width"] + 1 and size[1] <= viewport["height"] + 1


def test_bucket_border_matches_visible_line(app_page):
    """Filling the tutu must stop at the drawn line: a pixel just outside the tutu outline stays empty."""
    page = app_page
    page.set_viewport_size({"width": 1880, "height": 920})
    open_picture(page, "taenzerin")
    pick(page, color="rot-1", tool="eimer")
    page.mouse.click(*to_screen(page, 512, 250))  # inside the body
    page.clock.run_for(100)
    assert pixel(page, 512, 250)[3] == 255
    assert pixel(page, 512, 192)[3] == 0, "neck area above the body outline stays white"
    assert pixel(page, 300, 250)[3] == 0, "background outside the dancer stays white"