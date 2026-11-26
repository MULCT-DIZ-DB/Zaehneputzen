"""Audio quality of the piano tones, rendered offline (no speakers needed).

Clipping (sample values beyond ±1) and sudden sample jumps (clicks) are what make crackling
noise. Every tone plays its pre-rendered buffer to the end – nothing is faded or cut off while
sounding – so repeated taps simply overlap. Runs in Chromium because the Windows WebKit build
used by Playwright has no Web Audio (Safari on the iPad does).
"""

RENDER = """async (arg) => {
    const { Music } = await import('./js/music.js');
    const { PIANO } = await import('./js/config.js');
    const rate = 44100;
    const off = new OfflineAudioContext(1, Math.round(rate * arg.seconds), rate);
    const mu = new Music();
    mu.attach(off);
    mu.volume = 1; mu.applyVolume();
    arg.taps.forEach(([lane, at]) => mu.toneAt(PIANO.keys[lane], at, PIANO.toneSec));
    const buf = await off.startRendering();
    const data = buf.getChannelData(0);
    let peak = 0, jump = 0;
    for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        if (i) jump = Math.max(jump, Math.abs(data[i] - data[i - 1]));
    }
    return { peak, jump };
}"""

#: A clean tone at this level changes by far less than this between samples; clicks jump more.
CLICK_JUMP = 0.05


def render(page, taps, seconds=2.5):
    """Renders piano taps [(lane, time_s), ...] at full volume and returns peak level and largest sample jump."""
    return page.evaluate(RENDER, {"taps": taps, "seconds": seconds})


def clean(res):
    """True if the rendered audio neither clips nor clicks."""
    return res["peak"] <= 1.0 and res["jump"] < CLICK_JUMP


def test_single_tone_is_clean(chromium_harness):
    res = render(chromium_harness, [(0, 0.05)])
    assert 0.05 < res["peak"] < 0.9 and clean(res), res


def test_all_keys_at_once(chromium_harness):
    res = render(chromium_harness, [(lane, 0.05) for lane in range(8)])
    assert clean(res), res


def test_fast_repeats_on_one_key(chromium_harness):
    """The reported case: one key hit again and again, very fast (12 times per second)."""
    for lane in (0, 4, 7):
        res = render(chromium_harness, [(lane, 0.05 + i * 0.083) for i in range(24)], seconds=3.5)
        assert clean(res), (lane, res)


def test_fast_sliding_free_play(chromium_harness):
    """Sliding back and forth over the keys very fast (a tone every 25 ms)."""
    lanes = list(range(8)) + list(range(7, -1, -1))
    taps = [(lanes[i % len(lanes)], 0.02 + i * 0.025) for i in range(120)]
    res = render(chromium_harness, taps, seconds=4.5)
    assert clean(res), res


STALE_CLOCK = """async (arg) => {
    const { Music } = await import('./js/music.js');
    const { PIANO } = await import('./js/config.js');
    const rate = 44100;
    const off = new OfflineAudioContext(1, rate * 2, rate);
    const mu = new Music();
    mu.configure({ music: true, volume: 1, audioMode: arg.mode });
    mu.attach(off);
    // The page sees an audio clock that lags behind the sound being rendered (like iOS with big buffers).
    mu.now = () => Math.max(0, off.currentTime - arg.lag);
    for (let k = 0; k < 14; k++) {
        off.suspend(0.1 + k * 0.07).then(() => { mu.tone(PIANO.keys[4], PIANO.toneSec); off.resume(); });
    }
    const buf = await off.startRendering();
    const data = buf.getChannelData(0);
    let jump = 0, peak = 0;
    for (let i = 1; i < data.length; i++) {
        jump = Math.max(jump, Math.abs(data[i] - data[i - 1]));
        peak = Math.max(peak, Math.abs(data[i]));
    }
    return { jump, peak };
}"""


def test_fast_repeats_with_lagging_audio_clock(chromium_harness):
    """Re-striking one key quickly stays click-free even if the page's audio clock lags behind
    playback by tens of milliseconds (as can happen on the iPad)."""
    for mode, lag in (("stabil", 0.04), ("schnell", 0.015)):
        res = chromium_harness.evaluate(STALE_CLOCK, {"lag": lag, "mode": mode})
        assert clean(res), (mode, res)


def test_audio_mode_recreates_context(chromium_harness):
    """Switching between stable and fast audio closes the old audio engine; the next tap builds a new one."""
    res = chromium_harness.evaluate("""async () => {
        const { Music } = await import('./js/music.js');
        const mu = new Music();
        mu.configure({ music: true, volume: 0.5, audioMode: 'schnell' });
        mu.unlock();
        const first = mu.ctx, hint1 = mu.latencyHint;
        mu.configure({ music: true, volume: 0.5, audioMode: 'schnell' });
        const same = mu.ctx === first;
        mu.configure({ music: true, volume: 0.5, audioMode: 'stabil' });
        const cleared = mu.ctx === null;
        mu.unlock();
        return [hint1, same, cleared, mu.latencyHint, mu.ctx !== null && mu.ctx !== first];
    }""")
    assert res == ["interactive", True, True, "playback", True]
