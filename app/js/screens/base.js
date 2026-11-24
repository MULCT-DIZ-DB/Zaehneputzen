// @ts-check
/**
 * Shared screen building blocks (DRY): section with optional header and back button.
 * @module screens/base
 */
import { TEXT } from '../config.js';
import { el } from '../dom.js';
import { icon } from '../art.js';

/** @typedef {import('../storage.js').State} State */

/**
 * @typedef {Object} AppContext
 * @property {() => State} getState Current state.
 * @property {(s: State) => void} setState Replaces and saves the state.
 * @property {(name: string, data?: any) => void} show Switches the screen.
 * @property {boolean} fast Debug fast mode (`?schnell=1`).
 * @property {import('../music.js').Music} music Sound.
 * @property {import('../wakelock.js').ScreenKeeper} keeper Screen-on helper.
 */

/**
 * @typedef {Object} Screen
 * @property {string} name Screen name.
 * @property {HTMLElement} el Root section.
 * @property {(data?: any) => void} [enter] Called when shown.
 * @property {() => void} [leave] Called when hidden.
 */

/**
 * Creates a screen section, optionally with a header (back button + title).
 * @param {string} name Screen name (id becomes `screen-<name>`).
 * @param {{title?: string, back?: () => void}} [opts] Header options.
 * @returns {{section: HTMLElement, body: HTMLElement, header: HTMLElement|null}}
 */
export function makeScreen(name, { title, back } = {}) {
  const body = el('div', { cls: 'screen-body' });
  let header = null;
  if (title !== undefined) {
    header = el('header', { cls: 'screen-header' }, [
      back ? iconButton('zurueck', TEXT.back, back, 'btn-back') : null,
      el('h1', { text: title }),
    ]);
  }
  const section = el('section', { cls: `screen screen-${name}`, id: `screen-${name}` }, [header, body]);
  return { section, body, header };
}

/**
 * Button with an icon and optional visible label.
 * @param {Parameters<typeof icon>[0]} iconName Icon from the sprite.
 * @param {string} label Accessible (and visible) label.
 * @param {() => void} onTap Tap handler.
 * @param {string} [cls] Extra classes.
 * @param {{id?: string, showLabel?: boolean}} [opts] Options.
 * @returns {HTMLElement}
 */
export function iconButton(iconName, label, onTap, cls = '', { id, showLabel = false } = {}) {
  return el('button', {
    cls: `btn btn-icon ${cls}`.trim(), id, attrs: { type: 'button', 'aria-label': label },
    on: { click: () => onTap() },
  }, [icon(iconName), showLabel ? el('span', { cls: 'btn-label', text: label }) : null]);
}

/**
 * Big text button.
 * @param {string} label Text.
 * @param {() => void} onTap Tap handler.
 * @param {string} [cls] Extra classes.
 * @param {string} [id] Element id.
 * @returns {HTMLElement}
 */
export function textButton(label, onTap, cls = '', id = undefined) {
  return el('button', { cls: `btn ${cls}`.trim(), id, text: label, attrs: { type: 'button' }, on: { click: () => onTap() } });
}

/**
 * German month and weekday names from the config texts.
 * @returns {{months: string[], weekdays: string[]}}
 */
export function calendarNames() {
  return { months: TEXT.months.split(' '), weekdays: TEXT.weekdays.split(' ') };
}
