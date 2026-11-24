// @ts-check
/**
 * Reusable "adults only" gate: a multiplication with two single-digit factors
 * (used for the parent menu and the developer mode).
 * @module screens/mathgate
 */
import { TEXT } from '../config.js';
import { el } from '../dom.js';
import { makeChallenge, checkAnswer } from '../devmode.js';
import { textButton } from './base.js';

/**
 * @typedef {Object} MathGate
 * @property {HTMLElement} el Root element.
 * @property {() => void} reset Shows a fresh task and clears the input.
 * @property {() => void} focus Focuses the answer field.
 */

/**
 * Creates a gate. Element ids: `<prefix>-question` (with data-a/data-b), `input-<prefix>`,
 * `btn-<prefix>-check`, `<prefix>-wrong`.
 * @param {string} prefix Id prefix.
 * @param {() => void} onSolved Called after a correct answer.
 * @returns {MathGate}
 */
export function createMathGate(prefix, onSolved) {
  let challenge = makeChallenge(Math.random);
  const question = el('span', { cls: 'gate-question', id: `${prefix}-question` });
  const input = /** @type {HTMLInputElement} */ (el('input', { id: `input-${prefix}`, cls: 'gate-input',
    attrs: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', 'aria-label': TEXT.gateTitle } }));
  const wrong = el('p', { cls: 'gate-wrong', id: `${prefix}-wrong`, text: TEXT.devWrong });

  /** Shows a fresh task. @returns {void} */
  function reset() {
    challenge = makeChallenge(Math.random);
    question.textContent = `${challenge.a} × ${challenge.b} =`;
    question.dataset.a = String(challenge.a);
    question.dataset.b = String(challenge.b);
    input.value = '';
    wrong.hidden = true;
  }

  /** Checks the typed answer. @returns {void} */
  function check() {
    if (checkAnswer(challenge, input.value)) {
      reset();
      onSolved();
      return;
    }
    reset();
    wrong.hidden = false;
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
  const root = el('div', { cls: 'math-gate' }, [
    el('div', { cls: 'gate-row' }, [question, input, textButton(TEXT.devCheck, check, 'btn-small', `btn-${prefix}-check`)]),
    wrong,
  ]);
  reset();
  return { el: root, reset, focus: () => input.focus() };
}
