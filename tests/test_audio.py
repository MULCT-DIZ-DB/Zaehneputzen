"""Audio quality of the piano tones, rendered offline (no speakers needed).

Clipping (sample values beyond ±1) is what makes crackling noise; repeated taps on the
same key must replace the old tone instead of piling up. Runs in Chromium because the Windows
WebKit build used by Playwright has no Web Audio (Safari on the iPad does).
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
    return { peak, jump, voices: mu.voices.size };
}"""


def render(page, taps, seconds=2.5):
    """Renders piano taps [(lane, time_s), ...] and returns peak level, largest sample jump, voice count."""
    return page.evaluate(RENDER, {"taps": taps, "seconds": seconds})


def test_single_tone_is_clean(chromium_harness):
    res = render(chromium_harness, [(0, 0.05)])
    assert 0.05 < res["peak"] < 0.9
    assert res["jump"] < 0.2, "no clicks"


def test_all_keys_at_once_do_not_clip(chromium_harness):
    res = render(chromium_harness, [(lane, 0.05) for lane in range(8)])
    assert res["peak"] <= 1.0, res


def test_fast_repeats_on_one_key_do_not_pile_up(chromium_harness):
    taps = [(4, 0.05 + i * 0.08) for i in range(12)]
    res = render(chromium_harness, taps)
    assert res["peak"] <= 1.0, res
    assert res["jump"] < 0.3, "re-striking a key must not click"
    assert res["voices"] <= 1, "one voice per key"


def test_wild_tapping_on_all_keys_does_not_clip(chromium_harness):
    taps = [(i % 8, 0.02 + i * 0.03) for i in range(60)]
    res = render(chromium_harness, taps, seconds=3.5)
    assert res["peak"] <= 1.0, res
