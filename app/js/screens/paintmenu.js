// @ts-check
/**
 * Picture choice for the colouring game.
 * @module screens/paintmenu
 */
import { TEXT, PAINT } from '../config.js';
import { el } from '../dom.js';
import { drawLineArt } from '../paint/templates.js';
import { makeScreen } from './base.js';

/**
 * Creates the picture menu.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createPaintMenuScreen(ctx) {
  const { section, body } = makeScreen('paintmenu', { title: TEXT.paint, back: () => ctx.show('start') });
  const grid = el('div', { cls: 'paint-grid' }, PAINT.pictures.map((p) => el('button', {
    cls: 'btn paint-pick', attrs: { type: 'button', 'data-picture': p.id, 'aria-label': p.name },
    on: { click: () => ctx.show('paint', p.id) },
  }, [el('div', { cls: 'paint-thumb' }, [drawLineArt(p.id, 'line-art thumb-art')]), el('span', { text: p.name })])));
  body.append(el('p', { cls: 'game-status', text: TEXT.paintPick }), grid);
  return { name: 'paintmenu', el: section };
}
