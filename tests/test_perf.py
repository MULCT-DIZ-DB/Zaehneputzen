"""Frame-time budget on the brushing screen with a slowed-down CPU (Chromium only, via CDP)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402

FRAME_SAMPLER = """(ms) => new Promise(resolve => {
    const times = []; let last = performance.now(); const end = last + ms;
    function frame(now) { times.push(now - last); last = now;
        if (now < end) requestAnimationFrame(frame); else resolve(times); }
    requestAnimationFrame(frame);
})"""


@pytest.fixture()
def chromium_page(playwright, base_url):
    """Launches a separate Chromium page (CPU throttling needs the Chrome DevTools Protocol)."""
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport=config.IPAD_LANDSCAPE, device_scale_factor=config.IPAD_SCALE_FACTOR,
                                  has_touch=True, locale="de-DE")
    page = context.new_page()
    yield page
    browser.close()


@pytest.mark.parametrize("screen", ["brush", "dress"])
def test_frame_time_under_budget(chromium_page, base_url, screen):
    page = chromium_page
    page.goto(f"{base_url}/index.html")
    page.wait_for_selector("#screen-start.active")
    cdp = page.context.new_cdp_session(page)
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": config.CPU_THROTTLE_RATE})
    if screen == "brush":
        page.click("#btn-start", force=True)  # breathing animation never "stable"
        page.wait_for_selector("#screen-brush.active", timeout=10000)
    else:
        page.click("#btn-dress")
        page.wait_for_selector("#screen-dress.active")
    page.wait_for_timeout(500)
    times = page.evaluate(FRAME_SAMPLER, config.PERF_SAMPLE_MS)[1:]
    avg = sum(times) / len(times)
    assert avg < config.MAX_AVG_FRAME_MS, f"avg {avg:.1f} ms over {len(times)} frames"
