"""Tests for the flip-sequin logic in ``app/js/sequins.js``."""

PRE = """
// 5 x 3 grid with 10px spacing: x = 0..40, y = 0..20
const pts = []; for (let y = 0; y <= 20; y += 10) for (let x = 0; x <= 40; x += 10) pts.push({ x, y });
const idx = m.sequins.createIndex(pts, 10);
"""


def test_layout_inside_polygon(js):
    res = js("""
        const square = [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
        const tri = [{x:0,y:0},{x:100,y:0},{x:0,y:100}];
        const a = m.sequins.layoutInPolygon(square, 10), b = m.sequins.layoutInPolygon(tri, 10);
        const inside = b.every(p => p.x + p.y <= 100 + 1e-9);
        return [a.length, b.length > 0 && b.length < a.length, inside, typeof a[0].x];
    """)
    count, smaller, inside, typ = res
    assert 80 <= count <= 130 and smaller and inside and typ == "number"


def test_hit_test_finds_neighbours_only(js):
    res = js(PRE + "return [m.sequins.hitTest(idx, 20, 10, 6).sort((a,b)=>a-b), m.sequins.hitTest(idx, 500, 500, 6)];")
    assert res == [[7], []]


def test_downward_stroke_flips_to_back(js):
    res = js(PRE + """
        const states = new Array(pts.length).fill(false);
        return m.sequins.strokeFlips(idx, states, { x: 20, y: -5 }, { x: 20, y: 25 }, 6);
    """)
    assert sorted(c["i"] for c in res) == [2, 7, 12]
    assert all(c["value"] is True for c in res)


def test_upward_stroke_flips_back(js):
    res = js(PRE + """
        const states = new Array(pts.length).fill(true);
        return m.sequins.strokeFlips(idx, states, { x: 20, y: 25 }, { x: 20, y: -5 }, 6);
    """)
    assert sorted(c["i"] for c in res) == [2, 7, 12] and all(c["value"] is False for c in res)


def test_unchanged_sequins_not_reported(js):
    res = js(PRE + """
        const states = new Array(pts.length).fill(false); states[7] = true;
        return m.sequins.strokeFlips(idx, states, { x: 20, y: -5 }, { x: 20, y: 25 }, 6).map(c => c.i).sort((a,b)=>a-b);
    """)
    assert res == [2, 12]


def test_horizontal_stroke_uses_x_direction(js):
    res = js(PRE + """
        const states = new Array(pts.length).fill(false);
        const right = m.sequins.strokeFlips(idx, states, { x: -5, y: 10 }, { x: 45, y: 10 }, 6);
        const left = m.sequins.strokeFlips(idx, new Array(pts.length).fill(true), { x: 45, y: 10 }, { x: -5, y: 10 }, 6);
        return [right.map(c => c.i).sort((a,b)=>a-b), right.every(c => c.value), left.every(c => !c.value)];
    """)
    assert res == [[5, 6, 7, 8, 9], True, True]


def test_zero_length_stroke_is_ignored(js):
    res = js(PRE + "return m.sequins.strokeFlips(idx, new Array(pts.length).fill(false), {x:20,y:10}, {x:20,y:10}, 6);")
    assert res == []


def test_encode_decode_round_trip(js):
    res = js("""
        const s = [true, false, false, true, true];
        const enc = m.sequins.encodeStates(s);
        return [enc, m.sequins.decodeStates(enc, 5), m.sequins.decodeStates('', 3),
                m.sequins.decodeStates('1', 3), m.sequins.decodeStates('1x01', 4)];
    """)
    assert res == ["10011", [True, False, False, True, True], [False] * 3,
                   [True, False, False], [True, False, False, True]]


def test_flip_all(js):
    assert js("return m.sequins.flipAll([true, false, true]);") == [False, True, False]


def test_reset_shows_front(js):
    assert js("return m.sequins.resetStates([true, false, true]);") == [False, False, False]


def test_edge_distance(js):
    res = js("""
        const sq = [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
        return [m.sequins.edgeDistance({x:50,y:50}, sq), m.sequins.edgeDistance({x:10,y:50}, sq),
                m.sequins.edgeDistance({x:3,y:2}, sq)];
    """)
    assert res == [50, 10, 2]


def test_layout_keeps_margin_from_edges(js):
    res = js("""
        const sq = [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
        const pts = m.sequins.layoutInPolygon(sq, 10, 12);
        return [pts.length, Math.min(...pts.map(p => m.sequins.edgeDistance(p, sq)))];
    """)
    count, min_dist = res
    assert count > 20 and min_dist >= 12


def test_dancer_sequins_away_from_clothing_edges(js):
    """Real outfit patches: every sequin keeps the configured margin from the outline."""
    res = js("""
        const d = await import('./js/dancer.js');
        return Object.entries(d.SEQUIN_AREAS).map(([id, poly]) => [id, d.SEQUIN_POINTS[id].length,
            Math.min(...d.SEQUIN_POINTS[id].map(p => m.sequins.edgeDistance(p, poly)))]);
    """)
    margin = js("return m.config.SEQUINS.edgeMargin;")
    for outfit, count, min_dist in res:
        assert count >= 15, outfit
        assert min_dist >= margin - 1e-9, outfit