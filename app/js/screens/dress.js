// @ts-check
/**
 * Dress-up screen: choose outfit pieces and stroke the flip sequins.
 * @module screens/dress
 */
import { TEXT, OUTFITS, OUTFIT_SLOTS, SEQUINS, MOVES } from '../config.js';
import { el, clear } from '../dom.js';
import { drawDancer, drawOutfitPreview, SEQUIN_POINTS } from '../dancer.js';
import { createIndex, strokeFlips, encodeStates, flipAll, resetStates } from '../sequins.js';
import { makeScreen, textButton } from './base.js';
import { sequinStatesOf } from './start.js';

/** Grid lookup indices per sequin outfit (built once). */
const INDICES = Object.fromEntries(Object.entries(SEQUIN_POINTS)
  .map(([id, pts]) => [id, createIndex(pts, SEQUINS.touchRadius)]));

/**
 * Converts a pointer position to SVG user coordinates.
 * @param {SVGSVGElement} root SVG root.
 * @param {PointerEvent} e Pointer event.
 * @param {DOMMatrix} inverse Cached inverse screen matrix.
 * @returns {{x: number, y: number}}
 */
function toSvg(root, e, inverse) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse);
  return { x: p.x, y: p.y };
}

/**
 * Creates the dress-up screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createDressScreen(ctx) {
  const { section, body } = makeScreen('dress', { title: TEXT.dressUp, back: () => ctx.show('start') });
  const stage = el('div', { cls: 'dress-stage' });
  const wardrobe = el('div', { cls: 'wardrobe' });
  const flipHint = el('p', { cls: 'flip-hint', text: TEXT.flipHint });
  const sequinButtons = el('div', { cls: 'sequin-buttons' }, [
    textButton(TEXT.flipAll, () => changeAll(flipAll), 'btn-small', 'btn-flip-all'),
    textButton(TEXT.resetSequins, () => changeAll(resetStates), 'btn-small', 'btn-sequins-reset'),
  ]);
  body.append(el('div', { cls: 'dress-layout' }, [el('div', { cls: 'dress-left' }, [stage, flipHint, sequinButtons]), wardrobe]));

  /** @type {Object<string, boolean[]>} */ let states = {};
  /** @type {SVGElement|null} */ let dancerSvg = null;
  let currentMove = '';
  let animating = 0;

  /** @returns {string[]} Worn sequin outfit ids. */
  const wornSequins = () => ctx.getState().wearing.filter((id) => SEQUIN_POINTS[id]);

  /** Saves sequin states. @returns {void} */
  function saveSequins() {
    const state = ctx.getState();
    const sequins = { ...state.sequins };
    Object.entries(states).forEach(([id, s]) => { sequins[id] = encodeStates(s); });
    ctx.setState({ ...state, sequins });
  }

  /**
   * Changes one sequin colour, animated if not too many flips run already.
   * @param {SVGElement} node Sequin circle.
   * @param {string} color New colour.
   * @returns {void}
   */
  function flipNode(node, color) {
    if (animating >= SEQUINS.maxConcurrentFlips) {
      node.setAttribute('fill', color);
      return;
    }
    animating += 1;
    node.classList.add('flip');
    window.setTimeout(() => node.setAttribute('fill', color), SEQUINS.flipMs / 2);
    window.setTimeout(() => { node.classList.remove('flip'); animating -= 1; }, SEQUINS.flipMs);
  }

  /**
   * Applies flips for one outfit.
   * @param {string} id Outfit id.
   * @param {{i: number, value: boolean}[]} changes Changes.
   * @returns {void}
   */
  function applyFlips(id, changes) {
    const item = OUTFITS.find((o) => o.id === id);
    const patch = stage.querySelector(`.sequin-patch[data-outfit="${id}"]`);
    if (!item || !patch) return;
    const nodes = patch.querySelectorAll('.sq');
    changes.forEach(({ i, value }) => {
      states[id][i] = value;
      flipNode(/** @type {SVGElement} */ (nodes[i]), value ? item.sequinBack : item.sequinFront);
    });
  }

  /**
   * Applies a whole-pattern change to all worn sequin outfits ("Alle umdrehen" / "Alle zurück").
   * @param {(states: boolean[]) => boolean[]} transform Pure function from sequins.js.
   * @returns {void}
   */
  function changeAll(transform) {
    wornSequins().forEach((id) => {
      const next = transform(states[id]);
      applyFlips(id, next.map((value, i) => ({ i, value })).filter(({ i, value }) => states[id][i] !== value));
    });
    saveSequins();
  }

  /** Pointer handling for stroking sequins. @returns {void} */
  function bindStroke(/** @type {SVGSVGElement} */ root) {
    /** @type {DOMMatrix|null} */ let inverse = null;
    /** @type {{x: number, y: number}|null} */ let last = null;
    root.addEventListener('pointerdown', (e) => {
      const m = root.getScreenCTM();
      inverse = m ? m.inverse() : null;
      last = inverse ? toSvg(root, e, inverse) : null;
      try {
        root.setPointerCapture(e.pointerId); // the stroke continues when the finger leaves the dancer
      } catch {
        /* capture not supported – stroke still works inside the dancer */
      }
    });
    root.addEventListener('pointermove', (e) => {
      if (!last || !inverse) return;
      const p = toSvg(root, e, inverse);
      wornSequins().forEach((id) => applyFlips(id, strokeFlips(INDICES[id], states[id], last, p, SEQUINS.touchRadius)));
      last = p;
    });
    const end = () => { if (last) saveSequins(); last = null; };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => root.addEventListener(ev, end));
  }

  /** Redraws dancer and wardrobe. @returns {void} */
  function render() {
    const state = ctx.getState();
    states = sequinStatesOf(state);
    clear(stage);
    const dancer = /** @type {SVGSVGElement} */ (drawDancer({ wearing: state.wearing, sequinStates: states, cls: 'dress-dancer' }));
    stage.append(dancer);
    dancerSvg = dancer;
    if (currentMove) dancer.classList.add(currentMove);
    bindStroke(dancer);
    const hasSequins = wornSequins().length > 0;
    flipHint.hidden = !hasSequins;
    sequinButtons.hidden = !hasSequins;
    renderWardrobe(state);
  }

  /**
   * Wardrobe: one row per slot with the owned pieces.
   * @param {import('../storage.js').State} state State.
   * @returns {void}
   */
  function renderWardrobe(state) {
    clear(wardrobe);
    wardrobe.append(movesRow(state));
    if (state.outfits.length === 0) {
      wardrobe.append(el('p', { cls: 'empty', text: TEXT.nothingToWear }));
      return;
    }
    OUTFIT_SLOTS.forEach((slot) => {
      const items = OUTFITS.filter((o) => o.slot === slot && state.outfits.includes(o.id));
      if (items.length === 0) return;
      wardrobe.append(el('div', { cls: 'wardrobe-row' }, items.map((o) => {
        const worn = state.wearing.includes(o.id);
        return el('button', { cls: `btn wardrobe-item${worn ? ' worn' : ''}${o.sequin || o.glitter ? ' glitter' : ''}`,
          attrs: { type: 'button', 'aria-label': o.name, 'data-outfit': o.id },
          on: { click: () => toggle(o.id) } }, [drawOutfitPreview(o.id, states[o.id]), el('span', { text: o.name })]);
      })));
    });
  }

  /**
   * Row of owned dance moves; tapping one lets the dancer perform it (tap again to stop).
   * @param {import('../storage.js').State} state State.
   * @returns {HTMLElement}
   */
  function movesRow(state) {
    const owned = MOVES.filter((m) => state.moves.includes(m.id));
    return el('div', { cls: 'moves-row' }, [el('h2', { cls: 'moves-title', text: TEXT.moves }), ...owned.map((m) => el('button', {
      cls: `btn btn-small move-item${currentMove === m.css ? ' worn' : ''}`, text: m.name,
      attrs: { type: 'button', 'data-move': m.id }, on: { click: () => playMove(m.css) } }))]);
  }

  /**
   * Starts or stops a dance move on the dancer.
   * @param {string} css Move CSS class.
   * @returns {void}
   */
  function playMove(css) {
    if (dancerSvg && currentMove) dancerSvg.classList.remove(currentMove);
    currentMove = currentMove === css ? '' : css;
    if (dancerSvg && currentMove) dancerSvg.classList.add(currentMove);
    renderWardrobe(ctx.getState());
  }

  /**
   * Puts an item on (replacing the slot) or takes it off.
   * @param {string} id Outfit id.
   * @returns {void}
   */
  function toggle(id) {
    const state = ctx.getState();
    const item = OUTFITS.find((o) => o.id === id);
    if (!item) return;
    const others = state.wearing.filter((w) => OUTFITS.find((o) => o.id === w)?.slot !== item.slot);
    const wearing = state.wearing.includes(id) ? others : [...others, id];
    ctx.setState({ ...state, wearing });
    render();
  }

  return { name: 'dress', el: section, enter() { currentMove = ''; render(); } };
}
