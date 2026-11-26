"""Pure logic of the three mini games (dance memory, piano, sugar hunt)."""

# ---------- Tanzschritte merken ----------


def test_dance_memory(js):
    res = js("""
        const seqs = [1, 2, 5, 8].map(n => Array.from({ length: 30 }, () => m.dancememory.makeSequence(n, Math.random)));
        const seq = ['welle', 'huepfer', 'welle'];
        const taps = [[0, 'welle'], [1, 'huepfer'], [2, 'welle'], [1, 'welle'], [5, 'welle']].map(([i, p]) => m.dancememory.checkTap(seq, i, p));
        return [m.config.DANCE_GAME, seqs, taps, [2, 3, 7, 8, 12].map(n => m.dancememory.nextLength(n))];
    """)
    cfg, seqs, taps, lengths = res
    ids = [p["id"] for p in cfg["poses"]]
    assert len(set(ids)) == 4 and all(p["name"] and p["css"].startswith("move-") for p in cfg["poses"])
    assert 1 <= cfg["startLength"] < cfg["maxLength"] == 8
    for n, group in zip([1, 2, 5, 8], seqs):
        assert all(len(s) == n and set(s) <= set(ids) for s in group), n
    assert taps == ["next", "next", "done", "wrong", "wrong"]
    assert lengths == [3, 4, 8, 8, 8], "grows by one, capped at 8"


# ---------- Klavier ----------


def test_piano_keys_and_songs(js):
    p, songs = js("return [m.config.PIANO, m.songs.SONGS];")
    assert p["keys"] == [60, 62, 64, 65, 67, 69, 71, 72]
    assert p["keyNames"] == ["C", "D", "E", "F", "G", "A", "H", "C"]
    assert p["hitWindowMs"] == 350 and p["travelMs"] > 1000
    assert len({s["id"] for s in songs}) == 5
    for s in songs:
        assert s["name"] and 40 <= s["bpm"] <= 90, s["id"]
        assert 90 <= s["originalBpm"] <= 140 and s["bpm"] < s["originalBpm"] * 0.75, s["id"]
        assert len(s["notes"]) >= 12 and all(midi in p["keys"] and beats > 0 for midi, beats in s["notes"]), s["id"]


def test_charts(js):
    charts, small, lead = js("""return [m.songs.SONGS.map(s => m.piano.buildChart(s)),
        m.piano.buildChart({ id: 't', name: 't', bpm: 60, notes: [[60, 1], [64, 2], [67, 1]] }), m.config.PIANO.leadInMs];""")
    for chart in charts:
        times = [n["timeMs"] for n in chart]
        assert times[0] == lead and times == sorted(times) and len(set(times)) == len(times)
        assert all(0 <= n["lane"] <= 7 for n in chart)
    assert [(n["lane"], n["timeMs"], n["midi"]) for n in small] == [(0, lead, 60), (2, lead + 1000, 64), (4, lead + 3000, 67)]


def test_tempo_levels(js):
    """langsam = practice tempo, mittel = 75–90 % of the real tempo, normal = real tempo."""
    res = js("""
        const P = m.config.PIANO;
        const s = m.songs.SONGS.find(x => x.id === 'entchen');
        const bpm = P.tempos.map(t => m.piano.bpmFor(s, t.id));
        const second = P.tempos.map(t => m.piano.buildChart(s, t.id)[1].timeMs - P.leadInMs);
        return [P.tempos.map(t => t.id), bpm, second, s.bpm, s.originalBpm, m.piano.bpmFor(s, 'quatsch')];
    """)
    ids, bpm, second, slow, original, unknown = res
    assert ids == ["langsam", "mittel", "normal"]
    assert bpm[0] == slow and bpm[2] == original and 0.75 * original <= bpm[1] <= 0.9 * original
    assert second == [round(60000 / b) for b in bpm]
    assert unknown == slow, "unknown tempo falls back to slow"


def test_hits_falling_and_stars(js):
    res = js("""
        const P = m.config.PIANO;
        const chart = [{ lane: 0, timeMs: 1000, midi: 60 }, { lane: 0, timeMs: 3000, midi: 60 }, { lane: 2, timeMs: 1000, midi: 64 }];
        const w = P.hitWindowMs;
        const j = (lane, t, hits = new Set()) => m.piano.judgeTap(chart, hits, lane, t);
        const judge = [j(0, 1000), j(0, 1000 - w), j(0, 1000 + w), j(0, 1000 + w + 1), j(1, 1000), j(2, 1100),
                       j(0, 1000, new Set([0])), j(0, 2900)];
        const t = 5000, f = x => m.piano.fallProgressMs(t, x);
        const fall = [f(t - P.travelMs), f(t - P.travelMs - 500), f(t), f(t - 1000), f(t + 99999)];
        const stars = [[0, 10], [5, 10], [10, 10], [9, 10], [0, 0]].map(([h, n]) => m.piano.starsFor(h, n));
        return [judge, fall, P.travelMs, P.travelMs * P.overshoot, stars];
    """)
    judge, fall, travel, full, stars = res
    assert judge == [0, 0, 0, None, None, 2, None, 1], "hit window edges, no double hit, nearest note"
    assert fall == [0, 0, travel, travel - 1000, full], "notes start at the top and are synced to the song clock"
    assert stars == [1, 2, 3, 3, 1], "always at least one star"


# ---------- Zuckerjagd ----------


def test_sugar_hunt_rules(js):
    res = js("""
        const S = m.config.SUGAR;
        const life = [0, S.roundMs / 2, S.roundMs, S.roundMs * 3].map(t => m.sugarhunt.lifetimeAt(t));
        const spawn = [m.sugarhunt.spawnDelayAt(0), m.sugarhunt.spawnDelayAt(S.roundMs)];
        const can = [0, 1, S.maxBugs - 1, S.maxBugs, S.maxBugs + 1].map(n => m.sugarhunt.canSpawn(n));
        const picks = Array.from({ length: 200 }, () => m.sugarhunt.pickTooth(Math.random, [0, 1, 2]));
        const all = Array.from({ length: S.toothCount }, (_, i) => i);
        return [S, life, spawn, can, picks, m.sugarhunt.pickTooth(Math.random, all)];
    """)
    s, life, spawn, can, picks, none_left = res
    assert life[0] == s["startLifeMs"] and life[0] > life[1] > life[2] == life[3] == s["minLifeMs"]
    assert spawn[0] > spawn[1] > 0, "bugs come faster towards the end"
    assert s["maxBugs"] == 3 and can == [True, True, True, False, False]
    assert all(p not in (0, 1, 2) and 0 <= p < s["toothCount"] for p in picks) and none_left is None
