"""Tests for the pure zone timer in ``app/js/timer.js`` (time is passed in explicitly)."""
import pytest

SETUP = "const T = new m.timer.ZoneTimer({ totalMs: arg.total, zoneCount: 4 });"


def test_zone_boundaries_for_two_minutes(js):
    assert js("return m.timer.zoneBoundaries(120000, 4);") == [30000, 60000, 90000, 120000]


@pytest.mark.parametrize("total", [60000, 150000, 125000, 1000])
def test_boundaries_cover_total_and_increase(js, total):
    b = js("return m.timer.zoneBoundaries(arg, 4);", total)
    assert len(b) == 4 and b[-1] == total
    assert all(isinstance(x, int) for x in b)
    assert b == sorted(b) and len(set(b)) == 4


def test_not_divisible_total_distributes_remainder(js):
    b = js("return m.timer.zoneBoundaries(arg, 4);", 125000)
    lengths = [b[0]] + [b[i] - b[i - 1] for i in range(1, 4)]
    assert max(lengths) - min(lengths) <= 1


@pytest.mark.parametrize("bad", [0, -5, float("nan")])
def test_invalid_total_raises(js, bad):
    msg = js("try { new m.timer.ZoneTimer({ totalMs: arg, zoneCount: 4 }); return 'ok'; }"
             " catch (e) { return e instanceof RangeError ? 'range' : String(e); }", bad)
    assert msg == "range"


def test_zone_changes_exactly_at_30_60_90(js):
    res = js(SETUP + """
        T.start(1000);
        return [0, 29999, 30000, 59999, 60000, 89999, 90000, 119999].map(t => T.state(1000 + t).zoneIndex);
    """, {"total": 120000})
    assert res == [0, 0, 1, 1, 2, 2, 3, 3]


def test_done_at_end_and_progress_clamped(js):
    res = js(SETUP + """
        T.start(0);
        const a = T.state(120000), b = T.state(500000);
        return [a.done, a.zoneIndex, a.totalProgress, b.done, b.totalProgress, b.elapsedMs];
    """, {"total": 120000})
    assert res == [True, 3, 1, True, 1, 120000]


def test_state_types(js):
    s = js(SETUP + "T.start(0); return T.state(45000);", {"total": 120000})
    assert s == {"elapsedMs": 45000, "zoneIndex": 1, "zoneProgress": 0.5,
                 "totalProgress": 0.375, "running": True, "done": False}


def test_not_started_state(js):
    s = js(SETUP + "return T.state(99999);", {"total": 120000})
    assert s["elapsedMs"] == 0 and s["running"] is False and s["done"] is False


def test_pause_and_resume_freezes_time(js):
    res = js(SETUP + """
        T.start(0);
        T.pause(10000);
        const paused = T.state(50000);
        T.resume(50000);
        const after = T.state(70000);
        return [paused.elapsedMs, paused.running, after.elapsedMs, after.zoneIndex];
    """, {"total": 120000})
    assert res == [10000, False, 30000, 1]


def test_pause_exactly_at_zone_change(js):
    res = js(SETUP + """
        T.start(0); T.pause(30000);
        const p = T.state(31000); T.resume(40000);
        return [p.zoneIndex, p.zoneProgress, T.state(40000).zoneIndex];
    """, {"total": 120000})
    assert res == [1, 0, 1]


def test_double_pause_and_resume_are_harmless(js):
    res = js(SETUP + """
        T.start(0); T.pause(5000); T.pause(8000); T.resume(10000); T.resume(12000);
        return T.state(20000).elapsedMs;
    """, {"total": 120000})
    assert res == 15000


def test_no_drift_with_irregular_frames(js):
    """Many uneven ticks must not add up rounding errors."""
    res = js(SETUP + """
        T.start(0); let t = 0;
        while (t < 120000) { t += 16.7 + (t % 7); T.state(t); }
        return [T.state(119999).zoneIndex, T.state(119999).done, T.state(120000).done];
    """, {"total": 120000})
    assert res == [3, False, True]


def test_zone_changed_helper(js):
    res = js("""
        const seen = [];
        const w = m.timer.zoneWatcher(i => seen.push(i));
        [0,0,1,1,1,2,3,3].forEach(i => w(i));
        return seen;
    """)
    assert res == [1, 2, 3]
