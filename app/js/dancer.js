// @ts-check
/**
 * The dancer character (an original drawing for this app) with outfit layers
 * and flip-sequin areas. ViewBox 0 0 200 340.
 * @module dancer
 */
import { PALETTE as C, OUTFITS, SEQUINS } from './config.js';
import { svg, svgRoot, inked } from './dom.js';
import { sketchPath, sketchEllipse, sketchStar } from './sketch.js';
import { layoutInPolygon } from './sequins.js';
import { sparkle } from './art.js';

/** @typedef {{x: number, y: number}} Point */

/** Outlines of sequin areas, in dancer coordinates. */
export const SEQUIN_AREAS = Object.freeze({
  'pailletten-rock': [{ x: 82, y: 160 }, { x: 118, y: 160 }, { x: 142, y: 208 }, { x: 58, y: 208 }],
  'pailletten-top': [{ x: 80, y: 104 }, { x: 120, y: 104 }, { x: 116, y: 160 }, { x: 84, y: 160 }],
});

/** Sequin positions per outfit, computed once. */
export const SEQUIN_POINTS = Object.freeze(Object.fromEntries(
  Object.entries(SEQUIN_AREAS).map(([id, poly]) => [id, layoutInPolygon(inset(poly, SEQUINS.radius), SEQUINS.spacing)]),
));

/**
 * Shrinks a polygon towards its centre so sequins stay inside the outline.
 * @param {Point[]} poly Polygon.
 * @param {number} by Distance.
 * @returns {Point[]}
 */
function inset(poly, by) {
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  return poly.map((p) => {
    const d = Math.hypot(p.x - cx, p.y - cy) || 1;
    return { x: p.x - ((p.x - cx) / d) * by, y: p.y - ((p.y - cy) / d) * by };
  });
}

/**
 * A limb drawn as a dark outline stroke with a skin-coloured stroke on top.
 * @param {string} d Path data.
 * @param {string} [color] Fill colour of the limb.
 * @returns {SVGElement[]}
 */
function limb(d, color = C.haut) {
  return [
    svg('path', { d, fill: 'none', stroke: C.tinte, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    svg('path', { d, fill: 'none', stroke: color, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  ];
}

/**
 * Twinkling sparkles for glitter items.
 * @param {Point[]} spots Sparkle positions.
 * @returns {SVGElement}
 */
export function twinkles(spots) {
  return svg('g', { class: 'twinkles' }, spots.map((p, i) => sparkle(p.x, p.y, 6, `sparkle twinkle t${i % 3}`)));
}

/**
 * Group of sequins for an outfit; every sequin knows its index.
 * @param {string} id Outfit id.
 * @param {boolean[]} states Current sequin states (true = back side).
 * @returns {SVGElement}
 */
function sequinPatch(id, states) {
  const item = OUTFITS.find((o) => o.id === id);
  const pts = SEQUIN_POINTS[id];
  const g = svg('g', { class: 'sequin-patch', 'data-outfit': id });
  pts.forEach((p, i) => {
    g.append(svg('circle', {
      cx: Math.round(p.x * 10) / 10, cy: Math.round(p.y * 10) / 10, r: SEQUINS.radius, class: 'sq', 'data-i': i,
      fill: states[i] ? item.sequinBack : item.sequinFront,
    }));
  });
  return g;
}

/** Drawings of the outfit pieces. Each returns the layer content. */
const OUTFIT_ART = {
  tutu: () => [
    inked(sketchPath(zigzag(58, 142, 165, 200, 9), { seed: 61, wobble: 0.6 }), C.rosa),
    inked(sketchPath(zigzag(66, 134, 160, 188, 7), { seed: 62, wobble: 0.6 }), C.pfirsich),
  ],
  'pailletten-rock': (s) => [inked(sketchPath(SEQUIN_AREAS['pailletten-rock'], { seed: 63, wobble: 0.6 }), C.lavendel),
    sequinPatch('pailletten-rock', s)],
  sternenrock: () => [inked(sketchPath([{ x: 84, y: 160 }, { x: 116, y: 160 }, { x: 138, y: 210 }, { x: 62, y: 210 }],
    { seed: 64, wobble: 0.6 }), C.petrol),
  ...[[86, 190], [104, 178], [120, 196], [98, 200]].map(([x, y], i) => inked(sketchStar(x, y, 6, 2.6, 5, 65 + i), C.butter, { 'stroke-width': 1.5 }))],
  'pailletten-top': (s) => [inked(sketchPath(SEQUIN_AREAS['pailletten-top'], { seed: 66, wobble: 0.6 }), C.rosa),
    sequinPatch('pailletten-top', s)],
  haarschleife: () => [
    inked('M100 22 L80 10 L82 34 Z', C.lavendel), inked('M100 22 L120 10 L118 34 Z', C.lavendel),
    inked(sketchEllipse(100, 22, 6, 6, 67), C.rosa)],
  'glitzer-krone': () => [inked('M74 36 L78 14 L89 28 L100 8 L111 28 L122 14 L126 36 Z', C.gold),
    twinkles([{ x: 80, y: 18 }, { x: 100, y: 12 }, { x: 121, y: 20 }])],
  blumenkranz: () => [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = Math.PI + (i * Math.PI) / 6;
    return inked(sketchEllipse(100 + Math.cos(a) * 36, 58 + Math.sin(a) * 34, 7, 7, 68 + i), i % 2 ? C.rosa : C.butter, { 'stroke-width': 2 });
  }),
  ballettschuhe: () => [
    inked(sketchEllipse(86, 306, 13, 7, 75), C.rosa), inked(sketchEllipse(114, 306, 13, 7, 76), C.rosa),
    svg('path', { d: 'M82 296 L92 284 M92 296 L82 284 M110 296 L120 284 M120 296 L110 284', class: 'ink-line thin', fill: 'none' }),
  ],
};

/**
 * Zigzag skirt outline (tutu).
 * @param {number} x0 Left.
 * @param {number} x1 Right.
 * @param {number} top Waist height.
 * @param {number} bottom Hem height.
 * @param {number} teeth Number of zigzags.
 * @returns {Point[]}
 */
function zigzag(x0, x1, top, bottom, teeth) {
  const pts = [{ x: 100 - 18, y: top }, { x: 100 + 18, y: top }];
  for (let i = teeth; i >= 0; i -= 1) {
    const x = x0 + ((x1 - x0) * i) / teeth;
    pts.push({ x, y: i % 2 ? bottom - 9 : bottom });
  }
  return pts;
}

/** Default clothes when a slot is empty. */
const DEFAULT_ART = {
  oberteil: () => [inked(sketchPath([{ x: 80, y: 104 }, { x: 120, y: 104 }, { x: 116, y: 162 }, { x: 84, y: 162 }],
    { seed: 80, wobble: 0.6 }), C.salbei)],
  rock: () => [inked(sketchPath([{ x: 84, y: 158 }, { x: 116, y: 158 }, { x: 128, y: 196 }, { x: 72, y: 196 }],
    { seed: 81, wobble: 0.6 }), C.salbei)],
  schuhe: () => [inked(sketchEllipse(86, 306, 11, 6, 82), C.haut), inked(sketchEllipse(114, 306, 11, 6, 83), C.haut)],
  kopf: () => [],
  haar: () => [],
};

/**
 * Draws one clothing slot (worn item or default).
 * @param {string} slot Slot name.
 * @param {string[]} wearing Worn outfit ids.
 * @param {Object<string, boolean[]>} sequinStates States per sequin outfit.
 * @returns {SVGElement}
 */
function slotLayer(slot, wearing, sequinStates) {
  const item = OUTFITS.find((o) => o.slot === slot && wearing.includes(o.id));
  const content = item ? OUTFIT_ART[item.id](sequinStates[item.id] || []) : DEFAULT_ART[slot]();
  return svg('g', { class: `slot slot-${slot}`, 'data-item': item ? item.id : '' }, content);
}

/**
 * Head with face and hair.
 * @returns {SVGElement[]}
 */
function head() {
  return [
    inked(sketchEllipse(100, 24, 15, 13, 90), C.haar),
    inked(sketchEllipse(100, 62, 32, 34, 91), C.haut),
    inked('M68 58 C68 30 132 30 132 58 C122 42 78 42 68 58 Z', C.haar),
    svg('ellipse', { cx: 88, cy: 66, rx: 3.5, ry: 4.5, fill: C.tinte, class: 'eye' }),
    svg('ellipse', { cx: 112, cy: 66, rx: 3.5, ry: 4.5, fill: C.tinte, class: 'eye' }),
    svg('circle', { cx: 80, cy: 78, r: 6, fill: C.rosa, opacity: 0.7 }),
    svg('circle', { cx: 120, cy: 78, r: 6, fill: C.rosa, opacity: 0.7 }),
    svg('path', { d: 'M90 82 Q100 92 110 82', class: 'ink-line', fill: 'none' }),
  ];
}

/**
 * Small toothbrush held in the right hand while brushing.
 * @returns {SVGElement}
 */
function handBrush() {
  return svg('g', { class: 'hand-brush' }, [
    inked('M136 104 L156 140 L150 143 L130 107 Z', C.lavendel, { 'stroke-width': 2 }),
    inked(sketchEllipse(131, 101, 7, 5, 95), C.weiss, { 'stroke-width': 2 }),
  ]);
}

/**
 * Draws the dancer with her outfit.
 * @param {{wearing: string[], sequinStates?: Object<string, boolean[]>, brushing?: boolean, cls?: string}} opts Options.
 * @returns {SVGElement}
 */
export function drawDancer({ wearing, sequinStates = {}, brushing = false, cls = '' }) {
  const legs = svg('g', { class: 'legs' }, [...limb('M90 196 L86 300'), ...limb('M110 196 L114 300')]);
  const armL = svg('g', { class: 'arm arm-l' }, limb('M82 110 Q62 136 56 168'));
  const armR = svg('g', { class: 'arm arm-r' }, brushing
    ? [...limb('M118 110 Q150 130 140 112'), handBrush()]
    : limb('M118 110 Q138 136 144 168'));
  const body = svg('g', { class: 'body' }, [
    legs,
    slotLayer('schuhe', wearing, sequinStates),
    ...limb('M100 92 L100 106'),
    slotLayer('rock', wearing, sequinStates),
    slotLayer('oberteil', wearing, sequinStates),
    armL,
    armR,
    svg('g', { class: 'head' }, [...head(), slotLayer('haar', wearing, sequinStates), slotLayer('kopf', wearing, sequinStates)]),
  ]);
  return svgRoot('0 0 200 340', `dancer ${cls}`.trim(), [body]);
}

/**
 * Small preview of a single outfit piece (for the dress-up wardrobe).
 * @param {string} id Outfit id.
 * @param {boolean[]} [states] Sequin states.
 * @returns {SVGElement}
 */
export function drawOutfitPreview(id, states = []) {
  const boxes = { rock: '50 150 100 70', oberteil: '66 96 68 72', kopf: '62 2 76 70', haar: '72 2 56 40', schuhe: '66 270 68 50' };
  const item = OUTFITS.find((o) => o.id === id);
  return svgRoot(boxes[item.slot], 'outfit-preview', OUTFIT_ART[id](states));
}
