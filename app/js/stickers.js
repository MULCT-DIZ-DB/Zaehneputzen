// @ts-check
/**
 * Hand-drawn sticker artwork (viewBox 0 0 100 100), one small factory per shape.
 * @module stickers
 */
import { PALETTE as C, STICKERS } from './config.js';
import { svg, svgRoot, inked } from './dom.js';
import { sketchPath, sketchEllipse, sketchStar } from './sketch.js';
import { twinkles } from './dancer.js';

/**
 * Shape factories. Each gets the main colour and a seed and returns SVG elements.
 * @type {Object<string, (c: string, s: number) => SVGElement[]>}
 */
const SHAPES = {
  stern: (c, s) => [inked(sketchStar(50, 53, 32, 14, 5, s), c)],
  herz: (c, s) => [inked(sketchPath([{ x: 50, y: 82 }, { x: 22, y: 56 }, { x: 22, y: 34 }, { x: 36, y: 24 },
    { x: 50, y: 36 }, { x: 64, y: 24 }, { x: 78, y: 34 }, { x: 78, y: 56 }], { seed: s }), c)],
  blume: (c, s) => [...[0, 1, 2, 3, 4].map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return inked(sketchEllipse(50 + Math.cos(a) * 18, 50 + Math.sin(a) * 18, 13, 13, s + i), c);
  }), inked(sketchEllipse(50, 50, 11, 11, s + 9), C.butter)],
  note: (c, s) => [inked(sketchEllipse(38, 70, 13, 10, s), c),
    svg('path', { d: 'M50 68 L50 20 Q66 26 70 42', class: 'ink-line thick', fill: 'none' })],
  schuh: (c, s) => [inked(sketchEllipse(52, 62, 30, 14, s), c), inked(sketchEllipse(60, 60, 12, 6, s + 1), C.weiss),
    svg('path', { d: 'M34 56 Q30 30 44 18 M40 56 Q54 34 62 22', class: 'ink-line', fill: 'none' })],
  schmetterling: (c, s) => [inked(sketchEllipse(32, 38, 17, 15, s), c), inked(sketchEllipse(68, 38, 17, 15, s + 1), c),
    inked(sketchEllipse(35, 66, 12, 11, s + 2), C.butter), inked(sketchEllipse(65, 66, 12, 11, s + 3), C.butter),
    inked(sketchEllipse(50, 52, 5, 24, s + 4), C.haar)],
  katze: (c, s) => [inked('M26 40 L30 14 L46 30 Z', c), inked('M74 40 L70 14 L54 30 Z', c),
    inked(sketchEllipse(50, 54, 28, 25, s), c), ...eyes(41, 59, 50),
    svg('path', { d: 'M46 60 Q50 64 54 60 M22 56 L36 58 M22 64 L36 62 M78 56 L64 58 M78 64 L64 62', class: 'ink-line thin', fill: 'none' })],
  hase: (c, s) => [inked(sketchEllipse(38, 26, 8, 22, s), c), inked(sketchEllipse(62, 26, 8, 22, s + 1), c),
    inked(sketchEllipse(50, 62, 26, 24, s + 2), c), ...eyes(42, 58, 58),
    svg('circle', { cx: 50, cy: 66, r: 3, fill: C.rosa })],
  mond: (c) => [inked('M60 14 C34 16 22 42 32 62 C42 82 68 86 82 70 C60 74 44 56 48 36 C50 26 54 18 60 14 Z', c)],
  sonne: (c, s) => [...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i * Math.PI) / 4;
    return svg('line', { x1: 50 + Math.cos(a) * 26, y1: 50 + Math.sin(a) * 26, x2: 50 + Math.cos(a) * 38,
      y2: 50 + Math.sin(a) * 38, class: 'ink-line thick' });
  }), inked(sketchEllipse(50, 50, 20, 20, s), c)],
  regenbogen: (c) => [[34, C.rosa], [26, C.butter], [18, c]].map(([r, col]) => svg('path', {
    d: `M${50 - Number(r)} 66 A${r} ${r} 0 0 1 ${50 + Number(r)} 66`, fill: 'none', stroke: String(col), 'stroke-width': 8,
    'stroke-linecap': 'round' })),
  krone: (c) => [inked('M20 72 L24 32 L38 50 L50 24 L62 50 L76 32 L80 72 Z', c),
    svg('circle', { cx: 50, cy: 60, r: 5, fill: C.rosa, class: 'ink' })],
  tutu: (c, s) => [inked(sketchPath([{ x: 38, y: 34 }, { x: 62, y: 34 }, { x: 86, y: 70 }, { x: 74, y: 64 },
    { x: 64, y: 74 }, { x: 50, y: 64 }, { x: 36, y: 74 }, { x: 26, y: 64 }, { x: 14, y: 70 }], { seed: s }), c),
  inked(sketchPath([{ x: 38, y: 26 }, { x: 62, y: 26 }, { x: 62, y: 36 }, { x: 38, y: 36 }], { seed: s + 1 }), C.weiss)],
  eis: (c, s) => [inked('M34 50 L66 50 L50 90 Z', C.pfirsich), inked(sketchEllipse(50, 40, 20, 18, s), c),
    svg('circle', { cx: 46, cy: 22, r: 5, fill: C.rosa, class: 'ink' })],
  vogel: (c, s) => [inked(sketchEllipse(48, 56, 28, 22, s), c), inked(sketchEllipse(44, 58, 14, 9, s + 1), C.weiss),
    inked('M74 50 L88 54 L74 60 Z', C.butter), svg('circle', { cx: 62, cy: 48, r: 3, fill: C.tinte })],
};

/**
 * Two dot eyes.
 * @param {number} x1 Left eye x.
 * @param {number} x2 Right eye x.
 * @param {number} y Eye height.
 * @returns {SVGElement[]}
 */
function eyes(x1, x2, y) {
  return [svg('circle', { cx: x1, cy: y - 10, r: 3, fill: C.tinte }), svg('circle', { cx: x2, cy: y - 10, r: 3, fill: C.tinte })];
}

/**
 * Draws a sticker with its die-cut white edge (and sparkles if it glitters).
 * @param {string} id Sticker id from the catalogue.
 * @param {{missing?: boolean}} [opts] `missing` draws a grey placeholder.
 * @returns {SVGElement}
 */
export function drawSticker(id, { missing = false } = {}) {
  const st = STICKERS.find((s) => s.id === id);
  if (!st) throw new Error(`Unbekannter Sticker: ${id}`);
  const seed = STICKERS.indexOf(st) * 7 + 1;
  const color = missing ? C.grau : C[st.color];
  const parts = [
    inked(sketchEllipse(50, 50, 46, 46, seed, 1.5), missing ? C.creme : C.weiss, { class: `ink backing${st.glitter && !missing ? ' glitter-edge' : ''}` }),
    svg('g', { class: missing ? 'missing-shape' : '' }, SHAPES[st.shape](color, seed)),
  ];
  if (st.glitter && !missing) parts.push(twinkles([{ x: 18, y: 20 }, { x: 84, y: 26 }, { x: 80, y: 82 }]));
  return svgRoot('0 0 100 100', 'sticker', parts);
}
