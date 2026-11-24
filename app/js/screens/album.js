// @ts-check
/**
 * Sticker album: owned stickers in colour, missing ones as grey placeholders.
 * Tapping an owned sticker shows it big (about half the display); tapping again closes it.
 * @module screens/album
 */
import { TEXT, STICKERS } from '../config.js';
import { el, clear, replayClass } from '../dom.js';
import { drawSticker } from '../stickers.js';
import { makeScreen } from './base.js';

/**
 * Big sticker view on a dimmed backdrop.
 * @returns {{root: HTMLElement, open: (id: string) => void, close: () => void}}
 */
function stickerZoom() {
  const picture = el('div', { cls: 'zoom-sticker' });
  const caption = el('p', { cls: 'zoom-caption' });
  const root = el('div', { cls: 'zoom-overlay', id: 'sticker-zoom', attrs: { role: 'dialog' } }, [picture, caption]);
  root.hidden = true;
  const close = () => { root.hidden = true; };
  root.addEventListener('click', close);
  return {
    root,
    close,
    open(id) {
      const st = STICKERS.find((s) => s.id === id);
      if (!st) return;
      clear(picture);
      picture.append(drawSticker(id));
      caption.textContent = st.glitter ? `${st.name} (${TEXT.glitter})` : st.name;
      root.hidden = false;
      replayClass(picture, 'zoom-in');
    },
  };
}

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
  const zoom = stickerZoom();
  body.append(grid);
  section.append(zoom.root);
  grid.addEventListener('click', (e) => {
    const slot = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('.sticker-slot.owned'));
    if (!slot || !slot.dataset.id) return;
    replayClass(slot, 'bounce');
    zoom.open(slot.dataset.id);
  });

  return {
    name: 'album',
    el: section,
    enter() {
      zoom.close();
      const owned = new Set(ctx.getState().stickers);
      count.textContent = `${owned.size} / ${STICKERS.length} ${TEXT.stickersCount}`;
      clear(grid);
      STICKERS.forEach((s) => {
        const has = owned.has(s.id);
        grid.append(el('div', { cls: `sticker-slot${has ? ' owned' : ''}${has && s.glitter ? ' glitter' : ''}`,
          attrs: { 'aria-label': has ? s.name : '?', 'data-id': has ? s.id : '' } }, [drawSticker(s.id, { missing: !has })]));
      });
    },
    leave() {
      zoom.close();
    },
  };
}
