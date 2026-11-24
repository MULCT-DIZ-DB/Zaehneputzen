"""Pure logic of the three mini games (dance memory, piano, sugar hunt)."""
import pytest

# ---------- Tanzschritte merken ----------


def test_dance_config(js):
    d = js("return m.config.DANCE_GAME;")
    ids = [p["id"] for p in d["poses"]]
    assert len(ids) == 4 and len(set(ids)) == 4
    for p in d["poses"]:
        assert p["name"] and p["css"].startswith("move-") and isinstance(p["note"], int)
    assert 1 <= d["startLength"] < d["maxLength"] == 8


@pytest.mark.parametrize("length", [1, 2, 5, 8])
def test_sequence_length_and_poses(js, length):
    res = js("""
        const out = [];
        for (let i = 0; i < 50; i++) out.push(m.dancememory.makeSequence(arg, Math.random));
        return [out, m.config.DANCE_GAME.poses.map(p => p.id)];
    """, length)
    seqs, ids = res
    for s in seqs:
        assert len(s) == length and set(s) <= set(ids)


def test_check_tap_paths(js):
    res = js("""
        const seq = ['welle', 'huepfer', 'welle'];
        return [m.dancememory.checkTap(seq, 0, 'welle'), m.dancememory.checkTap(seq, 1, 'huepfer'),
                m.dancememory.checkTap(seq, 2, 'welle'), m.dancememory.checkTap(seq, 1, 'welle'),
                m.dancememory.checkTap(seq, 5, 'welle')];
    """)
    assert res == ["next", "next", "done", "wrong", "wrong"]


def test_next_length_capped(js):
    res = js("return [2, 3, 7, 8, 12].map(n => m.dancememory.nextLength(n));")
    assert res == [3, 4, 8, 8, 8]


# ---------- Klavier ----------


def test_piano_keys(js):
    p = js("return m.config.PIANO;")
    assert p["keys"] == [60, 62, 64, 65, 67, 69, 71, 72]
    assert p["keyNames"] == ["C", "D", "E", "F", "G", "A", "H", "C"]
    assert p["hitWindowMs"] == 350 and p["travelMs"] > 1000


def test_songs_only_use_the_keys(js):
    res = js("return [m.songs.SONGS, m.config.PIANO.keys];")
    songs, keys = res
    assert len(songs) == 5
    assert len({s["id"] for s in songs}) == 5
    for s in songs:
        assert s["name"] and 40 <= s["bpm"] <= 90, s["id"]
        assert len(s["notes"]) >= 12, s["id"]
        for midi, beats in s["notes"]:
            assert midi in keys and beats > 0, (s["id"], midi)


def test_chart_times_increase(js):
    res = js("return m.songs.SONGS.map(s => m.piano.buildChart(s));")
    lead = js("return m.config.PIANO.leadInMs;")
    for chart in res:
        times = [n["timeMs"] for n in chart]
        assert times[0] == lead
        assert times == sorted(times) and len(set(times)) == len(times)
        assert all(0 <= n["lane"] <= 7 for n in chart)


def test_chart_timing_from_bpm(js):
    res = js("return m.piano.buildChart({ id: 't', name: 't', bpm: 60, notes: [[60, 1], [64, 2], [67, 1]] });")
    lead = js("return m.config.PIANO.leadInMs;")
    assert [(n["lane"], n["timeMs"], n["midi"]) for n in res] == [(0, lead, 60), (2, lead + 1000, 64), (4, lead + 3000, 67)]


def test_hit_window_edges(js):
    res = js("""
        const chart = [{ lane: 0, timeMs: 1000, midi: 60 }, { lane: 0, timeMs: 3000, midi: 60 }, { lane: 2, timeMs: 1000, midi: 64 }];
        const w = m.config.PIANO.hitWindowMs;
        const j = (lane, t, hits = new Set()) => m.piano.judgeTap(chart, hits, lane, t);
        const hits = new Set([0]);
        return [j(0, 1000), j(0, 1000 - w), j(0, 1000 + w), j(0, 1000 + w + 1), j(1, 1000), j(2, 1100),
                j(0, 1000, hits), j(0, 2900)];
    """)
    assert res == [0, 0, 0, None, None, 2, None, 1]


@pytest.mark.parametrize("hit,total,stars", [(0, 10, 1), (5, 10, 2), (10, 10, 3), (9, 10, 3), (0, 0, 1)])
def test_stars(js, hit, total, stars):
    assert js("return m.piano.starsFor(arg[0], arg[1]);", [hit, total]) == stars


# ---------- Zuckerjagd ----------


def test_lifetime_shrinks_to_minimum(js):
    res = js("""
        const S = m.config.SUGAR;
        return [m.sugarhunt.lifetimeAt(0), m.sugarhunt.lifetimeAt(S.roundMs / 2), m.sugarhunt.lifetimeAt(S.roundMs),
                m.sugarhunt.lifetimeAt(S.roundMs * 3), S.startLifeMs, S.minLifeMs];
    """)
    start, mid, end, late, start_cfg, min_cfg = res
    assert start == start_cfg and end == min_cfg and late == min_cfg
    assert start > mid > end


def test_spawn_delay_shrinks(js):
    res = js("const S = m.config.SUGAR; return [m.sugarhunt.spawnDelayAt(0), m.sugarhunt.spawnDelayAt(S.roundMs)];")
    assert res[0] > res[1] > 0


def test_max_bugs_and_free_teeth(js):
    res = js("""
        const S = m.config.SUGAR;
        const can = [0, 1, S.maxBugs - 1, S.maxBugs, S.maxBugs + 1].map(n => m.sugarhunt.canSpawn(n));
        const picks = [];
        for (let i = 0; i < 200; i++) picks.push(m.sugarhunt.pickTooth(Math.random, [0, 1, 2]));
        const all = Array.from({ length: S.toothCount }, (_, i) => i);
        return [can, picks, m.sugarhunt.pickTooth(Math.random, all), S.toothCount, S.maxBugs];
    """)
    can, picks, none_left, tooth_count, max_bugs = res
    assert max_bugs == 3 and can == [True, True, True, False, False]
    assert all(p not in (0, 1, 2) and 0 <= p < tooth_count for p in picks)
    assert none_left is None
