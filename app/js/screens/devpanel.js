// @ts-check
/**
 * Developer-mode panel inside the parent menu: multiplication gate and on/off.
 * @module screens/devpanel
 */
import { TEXT } from '../config.js';
import { el } from '../dom.js';
import { makeChallenge, checkAnswer } from '../devmode.js';
import { textButton } from './base.js';

/**
 * Creates the developer panel.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {{el: HTMLElement, refresh: () => void}}
 */
export function createDevPanel(ctx) {
  let challenge = makeChallenge(Math.random);
  const question = el('span', { cls: 'dev-question', id: 'dev-question' });
  const input = /** @type {HTMLInputElement} */ (el('input', { id: 'input-dev',
    attrs: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', 'aria-label': TEXT.devMode } }));
  const wrong = el('p', { cls: 'dev-wrong', id: 'dev-wrong', text: TEXT.devWrong });
  const gate = el('div', { cls: 'dev-gate' }, [
    el('div', { cls: 'dev-row' }, [question, input, textButton(TEXT.devCheck, check, 'btn-small', 'btn-dev-check')]),
    wrong,
  ]);
  const active = el('div', { cls: 'dev-active', id: 'dev-active' }, [
    el('p', { text: TEXT.devActive }),
    textButton(TEXT.devOff, () => { ctx.setDevMode(false); refresh(); }, 'btn-small', 'btn-dev-off'),
  ]);
  const open = textButton(TEXT.devMode, () => { gate.hidden = false; open.hidden = true; input.focus(); }, 'btn-small', 'btn-dev');
  const root = el('div', { cls: 'dev-panel' }, [open, gate, active]);

  /** Shows a fresh task. @returns {void} */
  function newChallenge() {
    challenge = makeChallenge(Math.random);
    question.textContent = `${challenge.a} × ${challenge.b} =`;
    question.dataset.a = String(challenge.a);
    question.dataset.b = String(challenge.b);
    input.value = '';
  }

  /** Validates the typed answer. @returns {void} */
  function check() {
    if (checkAnswer(challenge, input.value)) {
      ctx.setDevMode(true);
      refresh();
      return;
    }
    newChallenge();
    wrong.hidden = false;
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  /** Resets the panel to match the current mode. @returns {void} */
  function refresh() {
    const on = ctx.isDevMode();
    active.hidden = !on;
    open.hidden = on;
    gate.hidden = true;
    wrong.hidden = true;
    newChallenge();
  }

  return { el: root, refresh };
}
