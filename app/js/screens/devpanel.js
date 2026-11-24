// @ts-check
/**
 * Developer-mode panel inside the parent menu: multiplication gate and on/off.
 * @module screens/devpanel
 */
import { TEXT } from '../config.js';
import { el } from '../dom.js';
import { textButton } from './base.js';
import { createMathGate } from './mathgate.js';

/**
 * Creates the developer panel.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {{el: HTMLElement, refresh: () => void}}
 */
export function createDevPanel(ctx) {
  const gate = createMathGate('dev', () => { ctx.setDevMode(true); refresh(); });
  gate.el.classList.add('dev-gate');
  const active = el('div', { cls: 'dev-active', id: 'dev-active' }, [
    el('p', { text: TEXT.devActive }),
    textButton(TEXT.devOff, () => { ctx.setDevMode(false); refresh(); }, 'btn-small', 'btn-dev-off'),
  ]);
  const open = textButton(TEXT.devMode, () => { gate.el.hidden = false; open.hidden = true; gate.focus(); }, 'btn-small', 'btn-dev');
  const root = el('div', { cls: 'dev-panel' }, [open, gate.el, active]);

  /** Resets the panel to match the current mode. @returns {void} */
  function refresh() {
    const on = ctx.isDevMode();
    active.hidden = !on;
    open.hidden = on;
    gate.el.hidden = true;
    gate.reset();
  }

  return { el: root, refresh };
}
