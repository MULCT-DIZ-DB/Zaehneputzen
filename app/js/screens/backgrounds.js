// @ts-check
/**
 * Background picker: unlocked backgrounds can be chosen for brushing, locked ones are greyed out.
 * @module screens/backgrounds
 */
import { TEXT, BACKGROUNDS } from '../config.js';
import { el, clear, replayClass } from '../dom.js';
import { drawBackground } from '../backgrounds.js';
import { makeScreen } from './base.js';

/**
 * Creates the background picker screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createBackgroundsScreen(ctx) {
  const { section, body } = makeScreen('backgrounds', { title: TEXT.backgrounds, back: () => ctx.show('start') });
  const grid = el('div', { cls: 'bg-grid' });
  body.append(grid);

  /**
   * Chooses a background if it is unlocked.
   * @param {string} id Background id.
   * @param {HTMLElement} tile Tapped tile.
   * @returns {void}
   */
  function choose(id, tile) {
    const state = ctx.getState();
    if (!state.backgrounds.includes(id)) {
      replayClass(tile, 'shake');
      return;
    }
    ctx.setState({ ...state, background: id });
    render();
  }

  /** Draws all tiles. @returns {void} */
  function render() {
    const state = ctx.getState();
    clear(grid);
    BACKGROUNDS.forEach((b) => {
      const owned = state.backgrounds.includes(b.id);
      const selected = state.background === b.id;
      const tile = el('button', {
        cls: `btn bg-tile${owned ? ' owned' : ''}${selected ? ' selected' : ''}`,
        attrs: { type: 'button', 'data-bg': b.id, 'aria-label': b.name },
      }, [el('div', { cls: 'bg-thumb' }, [drawBackground(b.id)]), el('span', { text: owned ? b.name : '?' })]);
      tile.addEventListener('click', () => choose(b.id, tile));
      grid.append(tile);
    });
  }

  return { name: 'backgrounds', el: section, enter: render };
}
