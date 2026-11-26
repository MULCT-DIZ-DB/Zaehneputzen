"""Tests for the pure step timer in ``app/js/timer.js`` (time is passed in explicitly)."""
import math

SETUP = "const T = new m.timer.ZoneTimer({ totalMs: arg.total, zoneCount: 4 });"


def test_zone_boundaries(js):
    assert js("return m.timer.zoneBoundaries(120000, 4);") == [30000, 60000, 90000, 120000]
    for total in (60000, 150000, 125000, 1000):
        b = js("return m.timer.zoneBoundaries(arg, 4);", total)
        lengths = [b[0]] + [b[i] - b[i - 1] for i in range(1, 4)]
        assert b[-1] == total and all(isinstance(x, int) for x in b) and b == sorted(b), total
        assert max(lengths) - min(lengths) <= 1, "remainder spread evenly"


def test_invalid_total_raises(js):
    for bad in (0, -5, math.nan):
        msg = js("try { new m.timer.ZoneTimer({ totalMs: arg, zoneCount: 4 }); return 'ok'; }"
                 " catch (e) { return e instanceof RangeError ? 'range' : String(e); }", bad)
        assert msg == "range", bad


def test_zone_changes_and_end(js):
    res = js(SETUP + """
        const before = T.state(99999);
        T.start(1000);
        const zones = [0, 29999, 30000, 59999, 60000, 89999, 90000, 119999].map(t => T.state(1000 + t).zoneIndex);
        const mid = T.state(1000 + 45000), end = T.state(1000 + 120000), late = T.state(1000 + 500000);
        return [before.elapsedMs, before.running, zones, mid, [end.done, end.zoneIndex, end.totalProgress],
                [late.done, late.totalProgress, late.elapsedMs]];
    """, {"total": 120000})
    before_elapsed, before_running, zones, mid, end, late = res
    assert before_elapsed == 0 and before_running is False, "not started yet"
    assert zones == [0, 0, 1, 1, 2, 2, 3, 3], "changes exactly at 30/60/90 s"
    assert mid == {"elapsedMs": 45000, "zoneIndex": 1, "zoneProgress": 0.5, "totalProgress": 0.375,
                   "running": True, "done": False}
    assert end == [True, 3, 1] and late == [True, 1, 120000], "progress clamped after the end"


def test_pause_and_resume(js):
    res = js(SETUP + """
        T.start(0); T.pause(10000);
        const paused = T.state(50000);
        T.resume(50000);
        const after = T.state(70000);
        const U = new m.timer.ZoneTimer({ totalMs: 120000, zoneCount: 4 });
        U.start(0); U.pause(30000);                       // pause exactly at a zone change
        const atEdge = U.state(31000); U.resume(40000);
        const V = new m.timer.ZoneTimer({ totalMs: 120000, zoneCount: 4 });
        V.start(0); V.pause(5000); V.pause(8000); V.resume(10000); V.resume(12000);  // double calls are harmless
        return [paused.elapsedMs, paused.running, after.elapsedMs, after.zoneIndex,
                atEdge.zoneIndex, atEdge.zoneProgress, U.state(40000).zoneIndex, V.state(20000).elapsedMs];
    """, {"total": 120000})
    assert res == [10000, False, 30000, 1, 1, 0, 1, 15000]


def test_no_drift_with_irregular_frames(js):
    """Many uneven ticks must not add up rounding errors."""
    res = js(SETUP + """
        T.start(0); let t = 0;
        while (t < 120000) { t += 16.7 + (t % 7); T.state(t); }
        return [T.state(119999).zoneIndex, T.state(119999).done, T.state(120000).done];
    """, {"total": 120000})
    assert res == [3, False, True]


def test_zone_watcher(js):
    res = js("""
        const seen = [];
        const w = m.timer.zoneWatcher(i => seen.push(i));
        [0,0,1,1,1,2,3,3].forEach(i => w(i));
        return seen;
    """)
    assert res == [1, 2, 3]
