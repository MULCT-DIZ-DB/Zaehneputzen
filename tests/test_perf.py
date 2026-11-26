"""Frame-time budget on the brushing screen with a slowed-down CPU (Chromium only, via CDP)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402
import pytest  # noqa: E402

#: Measured alone after the parallel run: other tests running at the same time would distort frame times.
pytestmark = pytest.mark.perf

FRAME_SAMPLER = """(ms) => new Promise(resolve => {
    const times = []; let last = performance.now(); const end = last + ms;
    function frame(now) { times.push(now - last); last = now;
        if (now < end) requestAnimationFrame(frame); else resolve(times); }
    requestAnimationFrame(frame);
})"""


def open_game(page, game):
    """Opens the games hub (play window pre-opened in storage) and starts a game round."""
    page.click("#btn-games-start")
    page.click(f"#btn-game-{game}")
    if game == "piano":
        page.click(".song-btn[data-song='entchen']")
        page.wait_for_timeout(900)  # notes are falling now
    else:
        page.click("#btn-sugar-start")
        page.wait_for_timeout(1200)  # bugs are popping up now


def test_frame_time_under_budget(chromium_page, base_url):
    """Brushing, dress-up, piano and sugar hunt each stay within the frame budget at 4× slower CPU."""
    page = chromium_page
    page.goto(f"{base_url}/index.html")
    page.evaluate("localStorage.setItem('zahnputz-tanz', JSON.stringify({ playUntil: Date.now() + 600000 }))")
    cdp = page.context.new_cdp_session(page)
    results = {}
    for screen in ("brush", "dress", "piano", "sugar"):
        page.goto(f"{base_url}/index.html")
        page.wait_for_selector("#screen-start.active")
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": config.CPU_THROTTLE_RATE})
        if screen == "brush":
            page.click("#btn-start", force=True)  # breathing animation never "stable"
            page.wait_for_selector("#screen-brush.active", timeout=10000)
        elif screen == "dress":
            page.click("#btn-dress")
            page.wait_for_selector("#screen-dress.active")
        else:
            open_game(page, screen)
        page.wait_for_timeout(300)
        times = page.evaluate(FRAME_SAMPLER, config.PERF_SAMPLE_MS)[1:]
        results[screen] = sum(times) / len(times)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    slow = {s: round(v, 1) for s, v in results.items() if v >= config.MAX_AVG_FRAME_MS}
    assert not slow, f"average frame time too high (ms): {slow}"
