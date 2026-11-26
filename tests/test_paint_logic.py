"""Pure logic of the colouring game: paint mixing (RYB), palette, tools, flood fill, undo."""
import pytest

PRE = """
const P = await import('./js/paint/engine.js');
const cfg = (await import('./js/config.js')).PAINT;
const rgbOf = (ryb) => P.rybToRgb(ryb);   // pigments 0..1 -> [r, g, b] 0..255
const buf = (w = 40, h = 30) => P.createBuffer(w, h);
const px = (b, x, y) => { const i = y * b.w + x; return { pig: [b.pig[i*3], b.pig[i*3+1], b.pig[i*3+2]], cov: b.cov[i] }; };
const RED = [1, 0, 0], YELLOW = [0, 1, 0], BLUE = [0, 0, 1], WHITE = [0, 0, 0];
"""


def run(js, body, arg=None):
    """Runs ``body`` with the paint helpers available."""
    return js(PRE + body, arg)


def test_ryb_colours_look_right(js):
    res = run(js, "return [rgbOf([0,0,0]), rgbOf(RED), rgbOf(YELLOW), rgbOf(BLUE), rgbOf([1,1,1])];")
    white, red, yellow, blue, all3 = res
    assert min(white) >= 235, "no pigment = white"
    assert red[0] > 180 and red[1] < 90 and red[2] < 90
    assert yellow[0] > 180 and yellow[1] > 180 and yellow[2] < 100
    assert blue[2] > blue[0] and blue[2] > 120
    assert max(all3) < 90, "all three = dark brown"


@pytest.mark.parametrize("a,b,check", [
    ("RED", "BLUE", "violet"), ("BLUE", "RED", "violet"), ("YELLOW", "BLUE", "green"),
    ("RED", "YELLOW", "orange"),
])
def test_painting_over_mixes_like_paint(js, a, b, check):
    res = run(js, f"""
        const b = buf();
        P.applyDab(b, 20, 15, 6, {a}, {{ hard: true }});
        P.applyDab(b, 20, 15, 6, {b}, {{ hard: true }});
        const p = px(b, 20, 15);
        return [rgbOf(p.pig.map(v => v / 255)), p.cov];
    """)
    (r, g, bl), cov = res
    assert cov == 255
    if check == "violet":
        assert r > g + 40 and bl > g + 40, (r, g, bl)
    if check == "green":
        assert g > r + 40 and g > bl, (r, g, bl)
    if check == "orange":
        assert r > g > bl and r - bl > 120, (r, g, bl)


def test_same_colour_twice_stays_the_same(js):
    res = run(js, """
        const b = buf();
        P.applyDab(b, 20, 15, 6, RED, { hard: true });
        const once = px(b, 20, 15).pig.join();
        P.applyDab(b, 20, 15, 6, RED, { hard: true });
        return [once, px(b, 20, 15).pig.join()];
    """)
    assert res[0] == res[1]


def test_white_covers_and_eraser_clears(js):
    res = run(js, """
        const b = buf();
        P.applyDab(b, 20, 15, 6, BLUE, { hard: true });
        P.applyDab(b, 20, 15, 6, WHITE, { hard: true });
        const white = px(b, 20, 15);
        P.applyDab(b, 20, 15, 6, RED, { hard: true });
        P.erase(b, 20, 15, 6);
        return [white, px(b, 20, 15)];
    """)
    white, erased = res
    assert white["pig"] == [0, 0, 0] and white["cov"] == 255, "white paint covers"
    assert erased["pig"] == [0, 0, 0] and erased["cov"] == 0, "eraser brings the paper back"


def test_dab_stays_inside_radius_and_brush_is_soft(js):
    res = run(js, """
        const hard = buf(), soft = buf();
        const rect = P.applyDab(hard, 20, 15, 5, RED, { hard: true });
        P.applyDab(soft, 20, 15, 8, RED, { hard: false });
        return [px(hard, 20, 15).cov, px(hard, 26, 15).cov, px(hard, 20, 21).cov,
                px(soft, 20, 15).pig[0], px(soft, 26, 15).pig[0], rect];
    """)
    center, outside_x, outside_y, soft_center, soft_edge, rect = res
    assert center == 255 and outside_x == 0 and outside_y == 0
    assert soft_center == 255 and 0 < soft_edge < soft_center, "soft brush fades towards its edge"
    assert rect["x0"] >= 14 and rect["x1"] <= 26 and rect["y0"] >= 9 and rect["y1"] <= 21


def test_dab_at_the_border_does_not_crash(js):
    res = run(js, "const b = buf(); P.applyDab(b, 0, 0, 6, RED, { hard: true }); P.applyDab(b, 39, 29, 6, RED, { hard: false });"
                  " P.erase(b, -3, 50, 6); return [px(b, 0, 0).cov, px(b, 39, 29).pig[0]];")
    assert res == [255, 255]


def test_spray_dots_within_radius(js):
    res = run(js, """
        const b = buf(80, 80);
        let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        P.spray(b, 40, 40, 15, BLUE, rng, 40);
        let painted = 0, outside = 0;
        for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) {
            if (px(b, x, y).cov > 0) { painted++; if (Math.hypot(x - 40, y - 40) > 18) outside++; }
        }
        return [painted, outside];
    """)
    painted, outside = res
    assert painted > 40 and outside == 0


def test_flood_fill_stays_inside_the_lines(js):
    res = run(js, """
        const w = 30, h = 30, b = buf(w, h);
        const mask = new Uint8Array(w * h);           // a closed square outline from 5..20
        for (let i = 5; i <= 20; i++) { mask[5*w+i] = mask[20*w+i] = mask[i*w+5] = mask[i*w+20] = 1; }
        P.floodFill(b, mask, 12, 12, YELLOW);
        const inside = px(b, 12, 12), under = px(b, 5, 12), outside = px(b, 2, 2), out2 = px(b, 25, 25);
        P.floodFill(b, mask, 2, 2, BLUE);
        return [inside, under, outside, out2, px(b, 25, 25), px(b, 12, 12)];
    """)
    inside, under_line, outside_before, out2_before, out2_after, inside_after = res
    assert inside["cov"] == 255 and inside["pig"][1] == 255
    assert under_line["cov"] > 0, "fill reaches under the line (no white gaps)"
    assert outside_before["cov"] == 0 and out2_before["cov"] == 0
    assert out2_after["pig"][2] == 255 and inside_after["pig"] == [0, 255, 0], "second fill only outside"


def test_undo_restores_previous_steps(js):
    res = run(js, """
        const b = buf(); const undo = P.createUndo(3);
        undo.push(b); P.applyDab(b, 10, 10, 4, RED, { hard: true });
        undo.push(b); P.applyDab(b, 10, 10, 4, BLUE, { hard: true });
        const afterTwo = px(b, 10, 10).pig.join();
        undo.pop(b); const afterUndo1 = px(b, 10, 10).pig.join();
        undo.pop(b); const afterUndo2 = px(b, 10, 10).cov;
        return [afterTwo, afterUndo1, afterUndo2, undo.pop(b), undo.size()];
    """)
    after_two, after_undo1, after_undo2, extra_pop, size = res
    assert after_two == "255,0,255" and after_undo1 == "255,0,0" and after_undo2 == 0
    assert extra_pop is False and size == 0


def test_undo_keeps_only_the_last_steps(js):
    res = run(js, "const b = buf(); const u = P.createUndo(3); for (let i = 0; i < 7; i++) u.push(b); return u.size();")
    assert res == 3


def test_palette_wheel(js):
    res = run(js, "return [cfg.hues.length, cfg.rings, P.paletteColors().map(c => [c.id, c.ryb])];")
    hues, rings, colors = res
    assert hues == 12 and len(rings) == 3 and rings[0] == 1
    assert len(colors) == 12 * 3 + 1
    ids = [c[0] for c in colors]
    assert len(set(ids)) == len(ids)
    assert colors[-1] == ["weiss", [0, 0, 0]], "white in the centre"
    for _, ryb in colors:
        assert all(0 <= v <= 1 for v in ryb)


def test_render_converts_buffer_to_pixels(js):
    res = run(js, """
        const b = buf(8, 8);
        P.applyDab(b, 4, 4, 2, RED, { hard: true });
        const img = { data: new Uint8ClampedArray(8 * 8 * 4), width: 8, height: 8 };
        P.render(b, img, { x0: 0, y0: 0, x1: 7, y1: 7 });
        const at = (x, y) => Array.from(img.data.slice((y * 8 + x) * 4, (y * 8 + x) * 4 + 4));
        return [at(4, 4), at(0, 0)];
    """)
    red, empty = res
    assert red[3] == 255 and red[0] > 180 and red[1] < 100
    assert empty[3] == 0, "unpainted paper stays transparent"
