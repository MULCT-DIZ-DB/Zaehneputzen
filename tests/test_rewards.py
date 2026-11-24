"""Tests for gift rules, streaks and the calendar in ``app/js/rewards.js``.

Dates are created inside the browser with local time (context time zone Europe/Berlin).
"""
import pytest

# Helper available in every snippet: d(y, mo, day, h) -> local Date (month 1-based); rng0 = always first.
PRE = """
const d = (y, mo, day, h = 8) => new Date(y, mo - 1, day, h, 0, 0);
const rng0 = () => 0;
const fresh = () => m.storage.defaultState();
"""


def run(js, body, arg=None):
    """Runs ``body`` with the shared helper prelude."""
    return js(PRE + body, arg)


def test_date_key_uses_local_date(js):
    res = run(js, "return [m.rewards.dateKey(d(2026,11,25,0)), m.rewards.dateKey(d(2026,1,5,23)),"
                  " m.rewards.dateKey(d(2028,2,29,12))];")
    assert res == ["2026-11-25", "2026-01-05", "2028-02-29"]


@pytest.mark.parametrize("hour,slot", [(0, "morgens"), (7, "morgens"), (13, "morgens"),
                                       (14, "abends"), (19, "abends"), (23, "abends")])
def test_slot_cutoff(js, hour, slot):
    assert run(js, "return m.rewards.slotFor(d(2026,11,24,arg));", hour) == slot


def test_completed_session_gives_sticker_and_marks_calendar(js):
    res = run(js, """
        const before = fresh();
        const { state, reward } = m.rewards.completeSession(before, { date: d(2026,11,24,7), completed: true, rng: rng0 });
        return [before.stickers.length, state.stickers, reward, state.calendar, state.sessions];
    """)
    before_len, stickers, reward, cal, sessions = res
    assert before_len == 0, "input state must not be mutated"
    assert stickers == [reward["sticker"]] and reward["sticker"]
    assert reward["slot"] == "morgens" and reward["outfit"] is None and reward["move"] is None
    assert cal == {"2026-11-24": {"morgens": True, "abends": False}}
    assert sessions == 1


def test_incomplete_session_gives_nothing(js):
    res = run(js, "return m.rewards.completeSession(fresh(), { date: d(2026,11,24), completed: false, rng: rng0 });")
    assert res["reward"] is None and res["state"]["stickers"] == [] and res["state"]["calendar"] == {}


def test_max_two_rewards_per_day(js):
    res = run(js, """
        let s = fresh(); const out = [];
        for (const h of [7, 8, 19, 20, 21]) {
            const r = m.rewards.completeSession(s, { date: d(2026,11,24,h), completed: true, rng: Math.random });
            s = r.state; out.push(r.reward === null ? null : r.reward.slot);
        }
        return [out, s.stickers.length, m.rewards.canReward(s, d(2026,11,24,22))];
    """)
    assert res == [["morgens", None, "abends", None, None], 2, False]


def test_stickers_never_duplicate(js):
    res = run(js, """
        let s = fresh(); const n = m.config.STICKERS.length;
        for (let i = 0; i < n; i++) {
            const day = new Date(2026, 0, 1 + Math.floor(i / 2), i % 2 ? 19 : 7);
            s = m.rewards.completeSession(s, { date: day, completed: true, rng: Math.random }).state;
        }
        return [s.stickers.length, new Set(s.stickers).size, n];
    """)
    assert res[0] == res[1] == res[2]


def test_full_album_does_not_crash(js):
    res = run(js, """
        const s = fresh(); s.stickers = m.config.STICKERS.map(x => x.id);
        const r = m.rewards.completeSession(s, { date: d(2026,11,24), completed: true, rng: rng0 });
        return [r.reward.sticker, r.state.stickers.length, r.state.sessions];
    """)
    assert res[0] is None and res[1] == len(run(js, "return m.config.STICKERS;")) and res[2] == 1


def test_pick_sticker_respects_rng(js):
    res = run(js, """
        const ids = m.config.STICKERS.map(x => x.id);
        return [m.rewards.pickSticker([], () => 0), m.rewards.pickSticker([], () => 0.9999),
                m.rewards.pickSticker(ids.slice(1), () => 0.5), ids[0], ids[ids.length - 1]];
    """)
    first, last, only_left, id0, id_last = res
    assert first == id0 and last == id_last and only_left == id0


def test_outfit_every_n_sessions(js):
    res = run(js, """
        let s = fresh(); const got = [];
        const every = m.config.REWARDS.outfitEverySessions;
        for (let i = 0; i < every * 2; i++) {
            const day = new Date(2026, 0, 1 + Math.floor(i / 2), i % 2 ? 19 : 7);
            const r = m.rewards.completeSession(s, { date: day, completed: true, rng: rng0 });
            s = r.state; if (r.reward.outfit) got.push([i + 1, r.reward.outfit]);
        }
        return [got, every, m.config.OUTFITS.slice(0, 2).map(o => o.id)];
    """)
    got, every, first_two = res
    assert got == [[every, first_two[0]], [every * 2, first_two[1]]]


def test_all_outfits_owned_no_crash(js):
    res = run(js, """
        const s = fresh(); s.outfits = m.config.OUTFITS.map(o => o.id);
        s.sessions = m.config.REWARDS.outfitEverySessions - 1;
        return m.rewards.completeSession(s, { date: d(2026,11,24), completed: true, rng: rng0 }).reward.outfit;
    """)
    assert res is None


def full_days(start_day, count, month=11, year=2026):
    """JS snippet marking ``count`` complete days ending with ``start_day + count - 1``."""
    return f"""
        for (let i = 0; i < {count}; i++) {{
            const k = m.rewards.dateKey(new Date({year}, {month - 1}, {start_day} + i, 12));
            cal[k] = {{ morgens: true, abends: true }};
        }}"""


def test_streak_counts_full_days(js):
    res = run(js, "const cal = {};" + full_days(20, 5) + """
        return [m.rewards.computeStreak(cal, d(2026,11,24,20)),
                m.rewards.computeStreak(cal, d(2026,11,25,8)),
                m.rewards.computeStreak(cal, d(2026,11,26,8))];""")
    assert res == [5, 5, 0], "today unfinished keeps yesterday's streak, a missed day resets"


def test_half_day_breaks_streak(js):
    res = run(js, "const cal = {};" + full_days(20, 5) + """
        cal['2026-11-22'] = { morgens: true, abends: false };
        return m.rewards.computeStreak(cal, d(2026,11,24,20));""")
    assert res == 2


def test_streak_over_month_and_year_end(js):
    res = run(js, "const cal = {};" + full_days(28, 6, month=12, year=2026) + """
        return m.rewards.computeStreak(cal, d(2027,1,2,20));""")
    assert res == 6


def test_streak_over_leap_day(js):
    res = run(js, "const cal = {};" + full_days(27, 4, month=2, year=2028) + """
        return [Object.keys(cal).sort(), m.rewards.computeStreak(cal, d(2028,3,1,20))];""")
    keys, streak = res
    assert "2028-02-29" in keys and streak == 4


def test_streak_over_daylight_saving_switch(js):
    """EU summer time starts 2026-03-29 (23-hour day) and ends 2026-10-25 (25-hour day)."""
    res = run(js, "const cal = {};" + full_days(27, 5, month=3) + full_days(23, 5, month=10) + """
        return [m.rewards.computeStreak(cal, d(2026,3,31,23)), m.rewards.computeStreak(cal, d(2026,10,27,0))];""")
    assert res == [5, 5]


def test_move_unlocked_at_streak_threshold(js):
    res = run(js, """
        let s = fresh(); const unlocked = [];
        const th = m.config.REWARDS.moveStreakThresholds[0];
        for (let day = 1; day <= th; day++) {
            for (const h of [7, 19]) {
                const r = m.rewards.completeSession(s, { date: d(2026,11,day,h), completed: true, rng: rng0 });
                s = r.state; if (r.reward.move) unlocked.push([day, h, r.reward.move, r.reward.streak]);
            }
        }
        return [unlocked, th, m.config.MOVES[1].id, s.moves];
    """)
    unlocked, th, second_move, moves = res
    assert unlocked == [[th, 19, second_move, th]]
    assert len(moves) == 2


def test_reward_reports_streak(js):
    res = run(js, "let s = fresh(); const cal = s.calendar;" + full_days(20, 2) + """
        return m.rewards.completeSession(s, { date: d(2026,11,22,7), completed: true, rng: rng0 }).reward.streak;""")
    assert res == 2
