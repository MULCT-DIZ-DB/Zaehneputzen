// @ts-check
/**
 * Countdown 3-2-1 so the child can press the brush button in sync with the app.
 * @module screens/countdown
 */
import { TEXT, TIMER, MUSIC } from '../config.js';
import { el, replayClass } from '../dom.js';
import { makeScreen } from './base.js';

/**
 * Creates the countdown screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createCountdownScreen(ctx) {
  const { section, body } = makeScreen('countdown');
  const number = el('div', { cls: 'countdown-number', id: 'countdown-number' });
  body.append(el('div', { cls: 'countdown-wrap' }, [number, el('p', { cls: 'countdown-hint', text: TEXT.brushNow })]));
  let timer = 0;

  /**
   * Shows the next number or moves on to brushing.
   * @param {number} n Number to show.
   * @returns {void}
   */
  function step(n) {
    if (n <= 0) {
      ctx.show('brush');
      return;
    }
    number.textContent = String(n);
    replayClass(number, 'pop');
    ctx.music.chime([MUSIC.countdownNotes[n % MUSIC.countdownNotes.length]]);
    timer = window.setTimeout(() => step(n - 1), 1000);
  }

  return {
    name: 'countdown',
    el: section,
    enter() {
      step(ctx.fast ? TIMER.fastCountdownSec : TIMER.countdownSec);
    },
    leave() {
      window.clearTimeout(timer);
    },
  };
}
