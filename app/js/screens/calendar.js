// @ts-check
/**
 * Calendar screen: month grid with morning (sun) and evening (moon) marks.
 * @module screens/calendar
 */
import { TEXT } from '../config.js';
import { el, clear } from '../dom.js';
import { icon } from '../art.js';
import { dateKey, computeStreak } from '../rewards.js';
import { makeScreen, iconButton, calendarNames } from './base.js';

/**
 * Creates the calendar screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createCalendarScreen(ctx) {
  const { section, body } = makeScreen('calendar', { title: TEXT.calendar, back: () => ctx.show('start') });
  const { months, weekdays } = calendarNames();
  const monthTitle = el('h2', { cls: 'month-title' });
  const grid = el('div', { cls: 'cal-grid' });
  const streak = el('p', { cls: 'streak-badge' });
  let shown = new Date();
  const go = (delta) => { shown = new Date(shown.getFullYear(), shown.getMonth() + delta, 1); render(); };
  body.append(el('div', { cls: 'cal-nav' }, [
    iconButton('zurueck', TEXT.back, () => go(-1), 'btn-prev'),
    monthTitle,
    iconButton('zurueck', TEXT.next, () => go(1), 'btn-next'),
  ]), grid, streak);

  /** Draws the shown month. @returns {void} */
  function render() {
    const { calendar } = ctx.getState();
    const year = shown.getFullYear();
    const month = shown.getMonth();
    const today = dateKey(new Date());
    monthTitle.textContent = `${months[month]} ${year}`;
    clear(grid);
    weekdays.forEach((w) => grid.append(el('div', { cls: 'cal-head', text: w })));
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i += 1) grid.append(el('div', { cls: 'cal-empty' }));
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d += 1) {
      const key = dateKey(new Date(year, month, d, 12));
      const entry = calendar[key] || { morgens: false, abends: false };
      grid.append(el('div', { cls: `cal-day${key === today ? ' today' : ''}${entry.morgens && entry.abends ? ' full' : ''}` }, [
        el('span', { cls: 'cal-num', text: String(d) }),
        el('span', { cls: 'cal-marks' }, [
          icon('sonne', entry.morgens ? 'on' : 'off'),
          icon('mond', entry.abends ? 'on' : 'off'),
        ]),
      ]));
    }
    const streakDays = computeStreak(calendar, new Date());
    streak.textContent = streakDays > 0 ? `★ ${streakDays} ${TEXT.streak}` : '';
  }

  return {
    name: 'calendar',
    el: section,
    enter() {
      shown = new Date();
      render();
    },
  };
}
