"""Audio quality of the piano tones, rendered offline (no speakers needed).

Clipping (sample values beyond ±1) and sudden sample jumps (clicks) are what make crackling
noise. Repeated taps on one key must replace the old tone, and fast playing must stay within a
fixed number of voices. Runs in Chromium because the Windows WebKit build used by Playwright has
no Web Audio (Safari on the iPad does).
"""

RENDER = """async (arg) => {
    const { Music } = await import('./js/music.js');
    const { PIANO, MUSIC } = await import('./js/config.js');
    const rate = 44100;
    const off = new OfflineAudioContext(1, Math.round(rate * arg.seconds), rate);
    const mu = new Music();
    mu.attach(off);
    mu.volume = 1; mu.applyVolume();
    let maxActive = 0;
    arg.taps.forEach(([lane, at]) => { mu.toneAt(PIANO.keys[lane], at, PIANO.toneSec); maxActive = Math.max(maxActive, mu.activeVoices()); });
    const buf = await off.startRendering();
    const data = buf.getChannelData(0);
    let peak = 0, jump = 0;
    for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        if (i) jump = Math.max(jump, Math.abs(data[i] - data[i - 1]));
    }
    return { peak, jump, maxActive, maxVoices: MUSIC.maxVoices, sameKey: mu.voicesFor(PIANO.keys[4]) };
}"""

#: A clean sine tone at this level changes by far less than this between samples; clicks jump more.
CLICK_JUMP = 0.05


def render(page, taps, seconds=2.5):
    """Renders piano taps [(lane, time_s), ...] and returns peak, largest sample jump and voice counts."""
    return page.evaluate(RENDER, {"taps": taps, "seconds": seconds})


def test_single_tone_is_clean(chromium_harness):
    res = render(chromium_harness, [(0, 0.05)])
    assert 0.05 < res["peak"] < 0.9
    assert res["jump"] < CLICK_JUMP, res


def test_all_keys_at_once_do_not_clip(chromium_harness):
    res = render(chromium_harness, [(lane, 0.05) for lane in range(8)])
    assert res["peak"] <= 1.0 and res["jump"] < CLICK_JUMP, res


def test_fast_repeats_on_one_key(chromium_harness):
    taps = [(4, 0.05 + i * 0.08) for i in range(12)]
    res = render(chromium_harness, taps)
    assert res["peak"] <= 1.0 and res["jump"] < CLICK_JUMP, res
    assert res["sameKey"] <= 1, "one voice per key"


def test_fast_sliding_free_play(chromium_harness):
    """Sliding back and forth over the keys very fast (a tone every 25 ms)."""
    lanes = list(range(8)) + list(range(7, -1, -1))
    taps = [(lanes[i % len(lanes)], 0.02 + i * 0.025) for i in range(120)]
    res = render(chromium_harness, taps, seconds=4.5)
    assert res["peak"] <= 1.0 and res["jump"] < CLICK_JUMP, res
    assert res["maxActive"] <= res["maxVoices"], res


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