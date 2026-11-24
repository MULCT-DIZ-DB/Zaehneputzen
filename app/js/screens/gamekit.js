// @ts-check
/**
 * Shared building blocks for the mini game screens (DRY): play-time guard and
 * the friendly „Spielzeit vorbei“ overlay.
 * @module screens/gamekit
 */
import { TEXT, GAMES } from '../config.js';
import { el } from '../dom.js';
import { isPlayOpen, playMinutesLeft } from '../playtime.js';
import { makeScreen, textButton } from './base.js';

/**
 * True while the mini games may be played.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {boolean}
 */
export function playOpen(ctx) {
  return isPlayOpen(ctx.getState(), Date.now(), ctx.isDevMode());
}

/**
 * Label like „Spielzeit · 4 Min.“ (no minutes in developer mode).
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {string}
 */
export function playLabel(ctx) {
  const left = playMinutesLeft(ctx.getState(), Date.now(), ctx.isDevMode());
  return left === Infinity ? TEXT.playTime : `${TEXT.playTime} · ${TEXT.playLeft} ${left} ${TEXT.minutes}`;
}

/**
 * @typedef {Object} GameScreen
 * @property {HTMLElement} section Root section.
 * @property {HTMLElement} body Content area.
 * @property {() => void} startGuard Starts the once-per-second play-time check.
 * @property {() => void} stopGuard Stops the check.
 * @property {() => boolean} roundOver Call after a round: shows the overlay if time is up; returns true then.
 * @property {() => void} showTimeUp Shows the overlay right away.
 */

/**
 * Creates a mini game screen with back button, play-time guard and time-up overlay.
 * @param {import('./base.js').AppContext} ctx App context.
 * @param {string} name Screen name (id becomes `screen-<name>`).
 * @param {string} title Title shown in the header.
 * @param {{back?: () => void, onExpire?: () => void}} [opts] Back action (default: games hub);
 *   `onExpire` runs when time runs out while no round is in progress.
 * @returns {GameScreen}
 */
export function makeGameScreen(ctx, name, title, { back = () => ctx.show('games'), onExpire } = {}) {
  const { section, body } = makeScreen(name, { title, back });
  const box = el('div', { cls: 'timeup-box' }, [
    el('p', { text: TEXT.timeUp }),
    textButton(TEXT.toStart, () => ctx.show('start'), 'btn-big btn-timeup'),
  ]);
  box.hidden = true;
  section.append(box);
  let timer = 0;
  const showTimeUp = () => { box.hidden = false; };
  return {
    section,
    body,
    showTimeUp,
    startGuard() {
      window.clearInterval(timer);
      box.hidden = playOpen(ctx);
      timer = window.setInterval(() => {
        if (!playOpen(ctx) && onExpire) onExpire();
      }, GAMES.checkMs);
    },
    stopGuard() {
      window.clearInterval(timer);
      timer = 0;
    },
    roundOver() {
      if (playOpen(ctx)) return false;
      showTimeUp();
      return true;
    },
  };
}
