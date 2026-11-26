"""Tests for the flip-sequin logic in ``app/js/sequins.js`` and the sequin layout on the dancer."""

PRE = """
// 5 x 3 grid with 10px spacing: x = 0..40, y = 0..20
const pts = []; for (let y = 0; y <= 20; y += 10) for (let x = 0; x <= 40; x += 10) pts.push({ x, y });
const idx = m.sequins.createIndex(pts, 10);
const all = v => new Array(pts.length).fill(v);
const ids = changes => changes.map(c => c.i).sort((a, b) => a - b);
"""


def test_geometry(js):
    res = js(PRE + """
        const sq = [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}], tri = [{x:0,y:0},{x:100,y:0},{x:0,y:100}];
        const a = m.sequins.layoutInPolygon(sq, 10), b = m.sequins.layoutInPolygon(tri, 10);
        const margin = m.sequins.layoutInPolygon(sq, 10, 12);
        return [a.length, b.length, b.every(p => p.x + p.y <= 100 + 1e-9),
                margin.length, Math.min(...margin.map(p => m.sequins.edgeDistance(p, sq))),
                [[50, 50], [10, 50], [3, 2]].map(([x, y]) => m.sequins.edgeDistance({ x, y }, sq)),
                m.sequins.polylineDistance({x:5,y:3}, [{x:0,y:0},{x:10,y:0},{x:10,y:10}]),
                m.sequins.polylineDistance({x:-4,y:0}, [{x:0,y:0},{x:10,y:0}]),
                ids(m.sequins.hitTest(idx, 20, 10, 6).map(i => ({ i }))), m.sequins.hitTest(idx, 500, 500, 6)];
    """)
    square, tri, tri_inside, with_margin, min_dist, edge, poly1, poly2, hit, miss = res
    assert 80 <= square <= 130 and 0 < tri < square and tri_inside
    assert with_margin > 20 and min_dist >= 12, "no sequins close to the outline"
    assert edge == [50, 10, 2] and poly1 == 3 and poly2 == 4
    assert hit == [7] and miss == [], "touch finds only the sequins under the finger"


def test_stroke_directions(js):
    res = js(PRE + """
        const down = m.sequins.strokeFlips(idx, all(false), { x: 20, y: -5 }, { x: 20, y: 25 }, 6);
        const up = m.sequins.strokeFlips(idx, all(true), { x: 20, y: 25 }, { x: 20, y: -5 }, 6);
        const some = all(false); some[7] = true;
        const unchanged = m.sequins.strokeFlips(idx, some, { x: 20, y: -5 }, { x: 20, y: 25 }, 6);
        const right = m.sequins.strokeFlips(idx, all(false), { x: -5, y: 10 }, { x: 45, y: 10 }, 6);
        const left = m.sequins.strokeFlips(idx, all(true), { x: 45, y: 10 }, { x: -5, y: 10 }, 6);
        const none = m.sequins.strokeFlips(idx, all(false), { x: 20, y: 10 }, { x: 20, y: 10 }, 6);
        return [ids(down), down.every(c => c.value), ids(up), up.every(c => !c.value), ids(unchanged),
                ids(right), right.every(c => c.value), left.every(c => !c.value), none];
    """)
    assert res == [[2, 7, 12], True, [2, 7, 12], True, [2, 12], [5, 6, 7, 8, 9], True, True, []], \
        "down/right = back side, up/left = front, unchanged sequins not reported, no movement = nothing"


def test_pattern_helpers(js):
    res = js("""
        const s = [true, false, false, true, true];
        const enc = m.sequins.encodeStates(s);
        return [enc, m.sequins.decodeStates(enc, 5), m.sequins.decodeStates('', 3), m.sequins.decodeStates('1', 3),
                m.sequins.decodeStates('1x01', 4), m.sequins.flipAll([true, false, true]), m.sequins.resetStates([true, false, true])];
    """)
    assert res == ["10011", [True, False, False, True, True], [False] * 3, [True, False, False],
                   [True, False, False, True], [False, True, False], [False, False, False]]


def test_dancer_sequins_away_from_clothing_edges(js):
    """Real outfit patches: every sequin keeps the configured margin from the outline."""
    res = js("""
        const d = await import('./js/dancer.js');
        return Object.entries(d.SEQUIN_AREAS).map(([id, poly]) => [id, d.SEQUIN_POINTS[id].length,
            Math.min(...d.SEQUIN_POINTS[id].map(p => m.sequins.edgeDistance(p, poly)))]);
    """)
    margin = js("return m.config.SEQUINS.edgeMargin;")
    for outfit, count, min_dist in res:
        assert count >= 12, outfit  # top: only the part between the arms is visible
        assert min_dist >= margin - 1e-9, outfit


def test_sequins_not_covered_by_arms_or_top(js):
    """No sequin may be hidden under something drawn on top of it (arms over the top, top over the skirt)."""
    res = js("""
        const d = await import('./js/dancer.js');
        const r = m.config.SEQUINS.radius;
        const out = [];
        for (const [id, pts] of Object.entries(d.SEQUIN_POINTS)) {
            for (const p of pts) {
                for (const o of d.SEQUIN_OCCLUDERS[id]) {
                    const gap = o.kind === 'line'
                        ? m.sequins.polylineDistance(p, o.points) - o.halfWidth - r
                        : (m.sequins.insidePolygon(p, o.points) ? -1 : m.sequins.edgeDistance(p, o.points) - r);
                    if (gap < 0) out.push([id, p.x, p.y, o.name, gap]);
                }
            }
        }
        return [out, Object.keys(d.SEQUIN_OCCLUDERS).sort(), Object.keys(d.SEQUIN_POINTS).sort()];
    """)
    covered, occ_ids, seq_ids = res
    assert occ_ids == seq_ids, "every sequin outfit lists what covers it"
    assert covered == [], covered[:5]
