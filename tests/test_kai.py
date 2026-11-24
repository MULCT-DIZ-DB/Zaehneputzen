"""Brushing after KAI (Kauflächen, Außenflächen, Innenflächen): steps, animation state, settings."""
from test_ui import active_screen, fast_countdown_ms, fast_total_ms, open_parents

MOUTH = "#screen-brush svg.mouth"


def start_brushing(page):
    """Starts brushing (fast mode) and returns once the brushing screen is active."""
    page.click("#btn-start")
    page.clock.run_for(fast_countdown_ms(page) + 100)
    assert active_screen(page) == "screen-brush"


def state(page):
    """Current animation state of the brushing screen."""
    return page.evaluate(f"""() => {{
        const m = document.querySelector('{MOUTH}');
        const motion = document.querySelector('#screen-brush .brush-motion');
        const tooth = document.querySelector('#screen-brush svg.tooth-section');
        const spots = jaw => [...m.querySelectorAll(`.jaw-${{jaw}} .spot`)].filter(s => s.classList.contains('gone')).length;
        return {{ surface: m.dataset.surface, jaw: m.dataset.jaw, motion: motion.getAttribute('class'),
                 face: tooth.dataset.face, toothJaw: tooth.dataset.jaw, how: document.querySelector('#zone-how').textContent,
                 stars: document.querySelectorAll('#screen-brush .step').length,
                 goneUnten: spots('unten'), goneOben: spots('oben') }};
    }}""")


def test_six_steps_animation(app_page):
    page = app_page
    start_brushing(page)
    s = state(page)
    assert (s["surface"], s["jaw"], s["face"], s["toothJaw"]) == ("kau", "unten", "kau", "unten")
    assert "motion-kau" in s["motion"] and s["how"] == "hin und her schrubben"
    assert s["stars"] == 6
    assert s["goneUnten"] == 0 and s["goneOben"] == 0
    step = fast_total_ms(page) / 6
    page.clock.run_for(int(step) + 50)  # now: Kauflächen oben
    s = state(page)
    assert (s["surface"], s["jaw"]) == ("kau", "oben")
    assert s["goneUnten"] > 0 and s["goneOben"] == 0, "lower jaw got cleaner first"
    page.clock.run_for(int(step))  # Außenflächen unten
    s = state(page)
    assert (s["surface"], s["jaw"], s["face"]) == ("aussen", "unten", "aussen")
    assert "motion-aussen" in s["motion"] and s["how"] == "kleine Kreise"
    page.clock.run_for(int(step) * 2)  # Innenflächen unten
    s = state(page)
    assert (s["surface"], s["jaw"]) == ("innen", "unten")
    assert "motion-innen" in s["motion"] and "Rot nach Weiß" in s["how"]
    assert not page.console_errors, page.console_errors


def choose_plan(page, plan_id):
    """Selects a brushing plan in the parent menu."""
    open_parents(page)
    page.select_option("#select-order", plan_id)
    page.click("#btn-parents-close")


def test_three_steps_lower_then_upper(app_page):
    page = app_page
    choose_plan(page, "kai3")
    start_brushing(page)
    assert page.inner_text("#zone-label") == "Kauflächen unten und oben"
    s = state(page)
    assert s["stars"] == 3 and (s["surface"], s["jaw"]) == ("kau", "unten")
    step = fast_total_ms(page) / 3
    page.clock.run_for(int(step * 0.6))
    s = state(page)
    assert (s["surface"], s["jaw"]) == ("kau", "oben"), "second half of a step: upper jaw"
    page.clock.run_for(int(step * 0.5))
    s = state(page)
    assert (s["surface"], s["jaw"]) == ("aussen", "unten")


def test_plan_saved_and_listed(app_page):
    page = app_page
    open_parents(page)
    options = page.eval_on_selector_all("#select-order option", "os => os.map(o => [o.value, o.textContent])")
    assert [o[0] for o in options] == ["kai6", "kai3"]
    assert page.input_value("#select-order") == "kai6"
    page.select_option("#select-order", "kai3")
    saved = page.evaluate("JSON.parse(localStorage.getItem('zahnputz-tanz')).settings.brushPlan")
    assert saved == "kai3"


def test_kai_logic(js):
    res = js("""
        const six = m.kai.planSteps('kai6'), three = m.kai.planSteps('kai3');
        return [six.length, three.length, m.kai.planSteps('alt').length,
                m.kai.stepLabel(six[2]), m.kai.stepLabel(three[0]),
                m.kai.jawAt(three[0], 0.49), m.kai.jawAt(three[0], 0.5), m.kai.jawAt(six[1], 0.1),
                m.kai.jawProgress(six, 0, 0.5, 'unten'), m.kai.jawProgress(six, 0, 0.5, 'oben'),
                m.kai.jawProgress(six, 2, 0, 'unten'), m.kai.jawProgress(six, 5, 1, 'oben'),
                m.kai.jawProgress(three, 0, 0.5, 'unten'), m.kai.jawProgress(three, 0, 0.5, 'oben'),
                m.kai.jawProgress(three, 2, 1, 'oben')];
    """)
    assert res[:3] == [6, 3, 6], "unknown plan falls back to KAI 6"
    assert res[3:5] == ["Außenflächen unten", "Kauflächen unten und oben"]
    assert res[5:8] == ["unten", "oben", "oben"]
    lower_half, upper_none, lower_third, upper_full, three_lower, three_upper, three_full = res[8:]
    assert abs(lower_half - 1 / 6) < 1e-9 and upper_none == 0
    assert abs(lower_third - 1 / 3) < 1e-9 and upper_full == 1
    assert abs(three_lower - 1 / 3) < 1e-9 and three_upper == 0 and three_full == 1

def mouth_shape(page):
    """Transforms of the jaws, inner mouth and tongue opacity (closed mouth = jaws moved together)."""
    return page.evaluate(f"""() => {{
        const m = document.querySelector('{MOUTH}');
        const t = sel => getComputedStyle(m.querySelector(sel)).transform;
        return {{ upper: t('.jaw-oben'), lower: t('.jaw-unten'), inner: t('.mouth-inner'),
                 tongue: getComputedStyle(m.querySelector('.tongue')).opacity }};
    }}""")


def test_mouth_closes_for_outer_surfaces(app_page):
    page = app_page
    start_brushing(page)
    open_shape = mouth_shape(page)
    assert open_shape["upper"] == "none" and open_shape["lower"] == "none", "open mouth for Kauflächen"
    step = fast_total_ms(page) / 6
    page.clock.run_for(int(step * 2) + 50)  # Außenflächen unten
    assert state(page)["surface"] == "aussen"
    page.wait_for_timeout(800)  # let the closing transition finish (real time)
    closed = mouth_shape(page)
    assert closed["upper"] != "none" and closed["lower"] != "none", "jaws moved together"
    assert closed["inner"] != "none" and float(closed["tongue"]) < 0.05, "mouth closed, tongue hidden"
    page.clock.run_for(int(step * 2))  # Innenflächen: open again
    page.wait_for_timeout(800)
    assert mouth_shape(page)["upper"] == "none"