// @ts-check
/**
 * Sticker album: owned stickers in colour, missing ones as grey placeholders.
 * @module screens/album
 */
import { TEXT, STICKERS } from '../config.js';
import { el, clear, replayClass } from '../dom.js';
import { drawSticker } from '../stickers.js';
import { makeScreen } from './base.js';

/**
 * Creates the album screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createAlbumScreen(ctx) {
  const { section, body, header } = makeScreen('album', { title: TEXT.album, back: () => ctx.show('start') });
  const count = el('span', { cls: 'count' });
  if (header) header.append(count);
  const grid = el('div', { cls: 'album-grid' });
  body.append(grid);
  grid.addEventListener('click', (e) => {
    const slot = /** @type {HTMLElement} */ (e.target).closest('.sticker-slot.owned');
    if (slot) replayClass(slot, 'bounce');
  });

  return {
    name: 'album',
    el: section,
    enter() {
      const owned = new Set(ctx.getState().stickers);
      count.textContent = `${owned.size} / ${STICKERS.length} ${TEXT.stickersCount}`;
      clear(grid);
      STICKERS.forEach((s) => {
        const has = owned.has(s.id);
        grid.append(el('div', { cls: `sticker-slot${has ? ' owned' : ''}${has && s.glitter ? ' glitter' : ''}`,
          attrs: { 'aria-label': has ? s.name : '?' } }, [drawSticker(s.id, { missing: !has })]));
      });
    },
  };
}
