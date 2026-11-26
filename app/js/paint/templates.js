// @ts-check
/**
 * Colouring pictures as hand-drawn line art (picture size 1024 × 640). The same path data is
 * shown as an SVG overlay (lines always on top of the paint) and rasterised into a line mask
 * for the paint bucket.
 * @module paint/templates
 */
import { PAINT, PALETTE as C } from '../config.js';
import { svg, svgRoot } from '../dom.js';
import { sketchPath, sketchEllipse, sketchStar } from '../sketch.js';

/** @typedef {{x: number, y: number}} Point */

/**
 * Wobbly ellipse rotated by `deg` degrees.
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} rx Radius x.
 * @param {number} ry Radius y.
 * @param {number} deg Rotation.
 * @param {number} seed Seed.
 * @returns {string}
 */
function tiltedEllipse(cx, cy, rx, ry, deg, seed) {
  const t = (deg * Math.PI) / 180;
  const pts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return { x: cx + x * Math.cos(t) - y * Math.sin(t), y: cy + x * Math.sin(t) + y * Math.cos(t) };
  });
  return sketchPath(pts, { seed, wobble: 1.5 });
}

/**
 * Closed polygon (slightly wobbly).
 * @param {number[][]} pts Points [x, y].
 * @param {number} seed Seed.
 * @returns {string}
 */
const shape = (pts, seed) => sketchPath(pts.map(([x, y]) => ({ x, y })), { seed, wobble: 1.2 });

/**
 * Open line through points.
 * @param {number[][]} pts Points [x, y].
 * @param {number} seed Seed.
 * @returns {string}
 */
const line = (pts, seed) => sketchPath(pts.map(([x, y]) => ({ x, y })), { closed: false, seed, wobble: 1 });

/**
 * Flower: five petals, centre, stem and a leaf.
 * @param {number} x Centre x.
 * @param {number} y Centre y.
 * @param {number} seed Seed.
 * @returns {string[]}
 */
function flower(x, y, seed) {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return sketchEllipse(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 18, 18, seed + i);
  });
  return [...petals, sketchEllipse(x, y, 14, 14, seed + 9), line([[x, y + 40], [x - 6, y + 90], [x, y + 140]], seed + 10),
    tiltedEllipse(x + 24, y + 100, 24, 10, -30, seed + 11)];
}

/**
 * Sun with rays.
 * @param {number} x Centre x.
 * @param {number} y Centre y.
 * @param {number} r Radius.
 * @param {number} seed Seed.
 * @returns {string[]}
 */
function sun(x, y, r, seed) {
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5;
    return line([[x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12)], [x + Math.cos(a) * (r + 40), y + Math.sin(a) * (r + 40)]], seed + i);
  });
  return [sketchEllipse(x, y, r, r, seed + 20), ...rays];
}

/**
 * Cloud made of overlapping bumps.
 * @param {number} x Centre x.
 * @param {number} y Centre y.
 * @param {number} s Scale.
 * @param {number} seed Seed.
 * @returns {string[]}
 */
function cloud(x, y, s, seed) {
  return [sketchEllipse(x - 50 * s, y + 10 * s, 50 * s, 34 * s, seed), sketchEllipse(x + 50 * s, y + 10 * s, 54 * s, 36 * s, seed + 1),
    sketchEllipse(x, y - 16 * s, 60 * s, 46 * s, seed + 2)];
}

/** @returns {string[]} The dancer. */
function dancer() {
  return [
    sketchEllipse(512, 84, 24, 22, 1), shape([[512, 70], [470, 52], [476, 92]], 2), shape([[512, 70], [554, 52], [548, 92]], 3),
    sketchEllipse(512, 146, 48, 50, 4), sketchEllipse(493, 140, 5, 7, 5), sketchEllipse(531, 140, 5, 7, 6),
    line([[494, 166], [512, 176], [530, 166]], 7), line([[502, 194], [502, 208]], 8), line([[522, 194], [522, 208]], 9),
    shape([[468, 208], [556, 208], [542, 302], [482, 302]], 10),
    shape([[480, 296], [544, 296], [600, 352], [578, 344], [560, 362], [536, 346], [512, 364], [488, 346], [464, 362], [446, 344], [424, 352]], 11),
    shape([[470, 214], [428, 152], [396, 96], [414, 86], [446, 140], [486, 202]], 12), sketchEllipse(402, 86, 14, 14, 13),
    shape([[554, 214], [596, 152], [628, 96], [610, 86], [578, 140], [538, 202]], 14), sketchEllipse(622, 86, 14, 14, 15),
    shape([[492, 352], [478, 512], [500, 512], [508, 352]], 16), shape([[516, 352], [524, 512], [546, 512], [532, 352]], 17),
    sketchEllipse(484, 522, 26, 12, 18), sketchEllipse(540, 522, 26, 12, 19),
    line([[150, 560], [874, 560]], 20),
    sketchStar(220, 150, 46, 20, 5, 21), sketchStar(820, 190, 38, 16, 5, 22), sketchStar(760, 420, 28, 12, 5, 23),
    sketchStar(260, 420, 30, 13, 5, 24),
    sketchEllipse(330, 280, 18, 13, 25), line([[346, 280], [346, 220], [372, 232]], 26),
    sketchEllipse(700, 300, 18, 13, 27), line([[716, 300], [716, 240], [742, 252]], 28),
  ];
}

/** @returns {string[]} The ballet stage. */
function stage() {
  return [
    shape([[0, 60], [240, 60], [200, 320], [170, 600], [0, 600]], 31), line([[70, 80], [90, 330], [60, 590]], 32),
    line([[140, 80], [160, 330], [120, 590]], 33),
    shape([[1024, 60], [784, 60], [824, 320], [854, 600], [1024, 600]], 34), line([[954, 80], [934, 330], [964, 590]], 35),
    line([[884, 80], [864, 330], [904, 590]], 36),
    shape([[0, 0], [1024, 0], [1024, 70], [768, 110], [512, 90], [256, 110], [0, 70]], 37),
    line([[0, 520], [1024, 520]], 38), line([[170, 600], [854, 600]], 39),
    ...[300, 400, 512, 624, 724].map((x, i) => line([[x, 520], [x + (x - 512) * 0.3, 600]], 40 + i)),
    line([[330, 100], [240, 520]], 46), line([[420, 100], [470, 520]], 47), line([[694, 100], [784, 520]], 48), line([[604, 100], [554, 520]], 49),
    sketchEllipse(512, 300, 26, 28, 50), sketchEllipse(512, 266, 14, 12, 51),
    shape([[490, 330], [534, 330], [570, 420], [454, 420]], 52), line([[496, 420], [490, 500]], 53), line([[528, 420], [534, 500]], 54),
    line([[494, 340], [450, 290]], 55), line([[530, 340], [574, 290]], 56),
    sketchStar(130, 30, 18, 8, 5, 57), sketchStar(512, 40, 22, 9, 5, 58), sketchStar(894, 30, 18, 8, 5, 59),
  ];
}

/** @returns {string[]} The cat with a ball of yarn. */
function cat() {
  return [
    shape([[330, 200], [340, 90], [410, 165]], 61), shape([[530, 200], [520, 90], [450, 165]], 62),
    sketchEllipse(430, 250, 125, 105, 63), sketchEllipse(385, 238, 16, 22, 64), sketchEllipse(475, 238, 16, 22, 65),
    shape([[418, 282], [442, 282], [430, 296]], 66), line([[430, 296], [412, 314]], 67), line([[430, 296], [448, 314]], 68),
    line([[400, 290], [320, 278]], 69), line([[400, 300], [322, 310]], 70), line([[460, 290], [540, 278]], 71), line([[460, 300], [538, 310]], 72),
    sketchEllipse(440, 460, 155, 112, 73),
    shape([[588, 470], [690, 500], [720, 410], [690, 330], [716, 318], [752, 420], [722, 530], [596, 508]], 74),
    sketchEllipse(380, 560, 40, 22, 75), sketchEllipse(500, 560, 40, 22, 76),
    sketchEllipse(820, 500, 72, 72, 77), line([[770, 460], [860, 540]], 78), line([[760, 510], [840, 440]], 79),
    line([[790, 570], [880, 470]], 80), line([[748, 520], [680, 590], [600, 600]], 81),
  ];
}

/** @returns {string[]} Butterfly, flowers and sun. */
function butterfly() {
  return [
    tiltedEllipse(400, 210, 125, 90, -25, 91), tiltedEllipse(624, 210, 125, 90, 25, 92),
    tiltedEllipse(432, 340, 82, 62, 25, 93), tiltedEllipse(592, 340, 82, 62, -25, 94),
    sketchEllipse(512, 280, 20, 112, 95), sketchEllipse(512, 158, 24, 24, 96),
    line([[502, 138], [480, 100], [462, 84]], 97), line([[522, 138], [544, 100], [562, 84]], 98),
    sketchEllipse(458, 80, 9, 9, 99), sketchEllipse(566, 80, 9, 9, 100),
    sketchEllipse(380, 200, 28, 24, 101), sketchEllipse(644, 200, 28, 24, 102), sketchEllipse(430, 340, 20, 18, 103),
    sketchEllipse(594, 340, 20, 18, 104),
    ...flower(160, 470, 110), ...flower(880, 470, 120), ...flower(700, 520, 130),
    ...sun(90, 90, 46, 140),
  ];
}

/** @returns {string[]} Rainbow, clouds, sun and hills. */
function rainbow() {
  const arcs = [300, 260, 220, 180, 140].map((r, i) => line(
    Array.from({ length: 13 }, (_, k) => {
      const a = Math.PI + (k / 12) * Math.PI;
      return [512 + Math.cos(a) * r, 560 + Math.sin(a) * r];
    }), 150 + i));
  return [
    ...arcs, line([[0, 560], [1024, 560]], 160),
    ...cloud(200, 520, 1, 161), ...cloud(830, 520, 1.1, 165),
    ...sun(900, 110, 52, 170),
    line([[0, 600], [200, 585], [420, 600], [640, 584], [860, 600], [1024, 590]], 190),
    ...[[120, 610], [330, 615], [560, 612], [760, 616], [960, 611]].map(([x, y], i) => sketchStar(x, y, 10, 4, 5, 191 + i)),
  ];
}

/** Line art per picture and a point that lies inside an area (used to test the paint bucket). */
export const PICTURES = Object.freeze([
  { id: 'frei', paths: () => [], fillPoint: { x: 512, y: 320 } },
  { id: 'taenzerin', paths: dancer, fillPoint: { x: 512, y: 250 } },
  { id: 'buehne', paths: stage, fillPoint: { x: 100, y: 300 } },
  { id: 'katze', paths: cat, fillPoint: { x: 440, y: 470 } },
  { id: 'schmetterling', paths: butterfly, fillPoint: { x: 340, y: 160 } },
  { id: 'regenbogen', paths: rainbow, fillPoint: { x: 512, y: 280 } },
]);

/** Cache of computed path data per picture. @type {Map<string, string[]>} */
const cache = new Map();

/**
 * Path data of a picture (computed once).
 * @param {string} id Picture id.
 * @returns {string[]}
 */
export function picturePaths(id) {
  if (!cache.has(id)) {
    const pic = PICTURES.find((p) => p.id === id) || PICTURES[0];
    cache.set(id, pic.paths());
  }
  return /** @type {string[]} */ (cache.get(id));
}

/**
 * Line art as SVG (lines only, no fills).
 * @param {string} id Picture id.
 * @param {string} [cls] CSS class.
 * @returns {SVGElement}
 */
export function drawLineArt(id, cls = 'line-art') {
  return svgRoot(`0 0 ${PAINT.width} ${PAINT.height}`, cls, picturePaths(id).map((d) => svg('path', {
    d, fill: 'none', stroke: C.tinte, 'stroke-width': PAINT.lineWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  })));
}

/**
 * Rasterises the lines into a mask (1 = line) for the paint bucket.
 * @param {string} id Picture id.
 * @returns {Uint8Array}
 */
export function lineMask(id) {
  const { width: w, height: h } = PAINT;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  g.lineWidth = PAINT.lineWidth;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  picturePaths(id).forEach((d) => g.stroke(new Path2D(d)));
  const data = g.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) mask[i] = data[i * 4 + 3] > PAINT.lineThreshold ? 1 : 0;
  return mask;
}
