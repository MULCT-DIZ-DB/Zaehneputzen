// @ts-check
/**
 * Paint engine of the colouring game (pure, no DOM): every pixel stores pigment amounts
 * (red, yellow, blue: RYB) and a coverage value. Painting over a colour adds pigment like real
 * paint (red + blue = violet, yellow + blue = green); white paint covers, the eraser clears.
 * Colours are shown by converting RYB to RGB with a lookup table (fast on the iPad 5).
 * @module paint/engine
 */
import { PAINT } from '../config.js';

/** @typedef {{w: number, h: number, pig: Uint8Array, cov: Uint8Array}} PaintBuffer */
/** @typedef {{x0: number, y0: number, x1: number, y1: number}} Rect */
/** @typedef {[number, number, number]} Ryb */

/**
 * Creates an empty (unpainted) picture.
 * @param {number} w Width in pixels.
 * @param {number} h Height in pixels.
 * @returns {PaintBuffer}
 */
export function createBuffer(w, h) {
  return { w, h, pig: new Uint8Array(w * h * 3), cov: new Uint8Array(w * h) };
}

/**
 * Converts paint pigments to a screen colour: trilinear interpolation in the RYB colour cube.
 * @param {number[]} ryb Red, yellow, blue amounts (0…1).
 * @returns {number[]} [r, g, b] (0…255).
 */
export function rybToRgb(ryb) {
  const [r, y, b] = ryb;
  const c = PAINT.cube;
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k += 1) {
    const w = c.w[k] * (1 - r) * (1 - y) * (1 - b) + c.r[k] * r * (1 - y) * (1 - b) + c.y[k] * (1 - r) * y * (1 - b)
      + c.b[k] * (1 - r) * (1 - y) * b + c.ry[k] * r * y * (1 - b) + c.rb[k] * r * (1 - y) * b
      + c.yb[k] * (1 - r) * y * b + c.ryb[k] * r * y * b;
    out[k] = Math.round(w * 255);
  }
  return out;
}

/** Lookup table RYB (quantised) → RGB, built on first use. @type {Uint8Array|null} */
let lut = null;

/**
 * Builds (once) and returns the colour lookup table.
 * @returns {Uint8Array}
 */
function colourTable() {
  if (lut) return lut;
  const n = PAINT.lutLevels;
  lut = new Uint8Array(n * n * n * 3);
  for (let r = 0; r < n; r += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let b = 0; b < n; b += 1) {
        const rgb = rybToRgb([r / (n - 1), y / (n - 1), b / (n - 1)]);
        lut.set(rgb, ((r * n + y) * n + b) * 3);
      }
    }
  }
  return lut;
}

/**
 * All colours of the wheel: 12 hues × 3 rings, plus white in the centre.
 * @returns {{id: string, ryb: Ryb, hue: number, ring: number}[]}
 */
export function paletteColors() {
  const list = [];
  PAINT.rings.forEach((strength, ring) => {
    PAINT.hues.forEach((h, hue) => {
      list.push({ id: `${h.id}-${ring + 1}`, ryb: /** @type {Ryb} */ (h.ryb.map((v) => v * strength)), hue, ring });
    });
  });
  list.push({ id: 'weiss', ryb: /** @type {Ryb} */ ([0, 0, 0]), hue: -1, ring: -1 });
  return list;
}

/**
 * Clips a circle's bounding box to the picture.
 * @param {PaintBuffer} buf Picture.
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} r Radius.
 * @returns {Rect|null} Null if completely outside.
 */
function circleRect(buf, cx, cy, r) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(buf.w - 1, Math.ceil(cx + r));
  const y1 = Math.min(buf.h - 1, Math.ceil(cy + r));
  return x0 > x1 || y0 > y1 ? null : { x0, y0, x1, y1 };
}

/**
 * Applies paint to one pixel with strength `a` (0…1).
 * Colour: pigments are added (max per pigment, like layered paint). White: covers (removes pigment).
 * @param {PaintBuffer} buf Picture.
 * @param {number} i Pixel index.
 * @param {number[]} ryb Pigments (0…1).
 * @param {boolean} white True for white paint.
 * @param {number} a Strength.
 * @returns {void}
 */
function paintPixel(buf, i, ryb, white, a) {
  const p = i * 3;
  for (let k = 0; k < 3; k += 1) {
    buf.pig[p + k] = white ? Math.round(buf.pig[p + k] * (1 - a)) : Math.max(buf.pig[p + k], Math.round(ryb[k] * a * 255));
  }
  buf.cov[i] = Math.max(buf.cov[i], Math.round(a * 255));
}

/**
 * Paints one round dab (pen: hard edge; brush: soft edge).
 * @param {PaintBuffer} buf Picture.
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} r Radius.
 * @param {number[]} ryb Pigments (0…1); [0, 0, 0] is white.
 * @param {{hard: boolean}} opts Edge style.
 * @returns {Rect|null} Changed area.
 */
export function applyDab(buf, cx, cy, r, ryb, { hard }) {
  const rect = circleRect(buf, cx, cy, r);
  if (!rect) return null;
  const white = ryb.every((v) => v === 0);
  for (let y = rect.y0; y <= rect.y1; y += 1) {
    for (let x = rect.x0; x <= rect.x1; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r) continue;
      // pen: hard edge; brush: solid core (inner half), soft towards the edge
      const a = hard ? Math.min(1, r + 0.5 - d) : (d <= r * PAINT.brushCore ? 1 : 1 - ((d - r * PAINT.brushCore) / (r * (1 - PAINT.brushCore))) ** 2);
      if (a > 0) paintPixel(buf, y * buf.w + x, ryb, white, a);
    }
  }
  return rect;
}

/**
 * Removes paint in a round area (the paper shows again).
 * @param {PaintBuffer} buf Picture.
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} r Radius.
 * @returns {Rect|null} Changed area.
 */
export function erase(buf, cx, cy, r) {
  const rect = circleRect(buf, cx, cy, r);
  if (!rect) return null;
  for (let y = rect.y0; y <= rect.y1; y += 1) {
    for (let x = rect.x0; x <= rect.x1; x += 1) {
      const a = Math.min(1, r + 0.5 - Math.hypot(x - cx, y - cy));
      if (a <= 0) continue;
      const i = y * buf.w + x;
      buf.cov[i] = Math.round(buf.cov[i] * (1 - a));
      for (let k = 0; k < 3; k += 1) buf.pig[i * 3 + k] = Math.round(buf.pig[i * 3 + k] * (1 - a));
    }
  }
  return rect;
}

/**
 * Sprays small dots at random places inside a circle.
 * @param {PaintBuffer} buf Picture.
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} r Spray radius.
 * @param {number[]} ryb Pigments.
 * @param {() => number} rng Random numbers in [0, 1).
 * @param {number} [dots] Number of dots.
 * @returns {Rect|null} Changed area.
 */
export function spray(buf, cx, cy, r, ryb, rng, dots = PAINT.sprayDots) {
  const inner = Math.max(0, r - PAINT.sprayDotRadius);
  for (let n = 0; n < dots; n += 1) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * inner;
    applyDab(buf, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, PAINT.sprayDotRadius, ryb, { hard: true });
  }
  return circleRect(buf, cx, cy, r);
}

/**
 * Fills the area around a point up to the lines (`mask` = 1 on lines), and a few pixels
 * under the lines so no white gaps remain.
 * @param {PaintBuffer} buf Picture.
 * @param {Uint8Array} mask Line pixels (1) of the colouring picture.
 * @param {number} sx Start x.
 * @param {number} sy Start y.
 * @param {number[]} ryb Pigments.
 * @returns {Rect|null} Changed area (null if the start is on a line or outside).
 */
export function floodFill(buf, mask, sx, sy, ryb) {
  const { w, h } = buf;
  const x0 = Math.round(sx);
  const y0 = Math.round(sy);
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h || mask[y0 * w + x0]) return null;
  const seen = new Uint8Array(w * h);
  const stack = [y0 * w + x0];
  seen[y0 * w + x0] = 1;
  const white = ryb.every((v) => v === 0);
  const rect = { x0, y0, x1: x0, y1: y0 };
  /** @type {number[]} */ const region = [];
  while (stack.length) {
    const i = /** @type {number} */ (stack.pop());
    region.push(i);
    const x = i % w;
    const y = (i - x) / w;
    rect.x0 = Math.min(rect.x0, x); rect.x1 = Math.max(rect.x1, x);
    rect.y0 = Math.min(rect.y0, y); rect.y1 = Math.max(rect.y1, y);
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    next.forEach((j) => {
      if (j >= 0 && !seen[j] && !mask[j]) { seen[j] = 1; stack.push(j); }
    });
  }
  region.forEach((i) => paintPixel(buf, i, ryb, white, 1));
  growUnderLines(buf, mask, region, ryb, white);
  const g = PAINT.fillUnderLine;
  return { x0: Math.max(0, rect.x0 - g), y0: Math.max(0, rect.y0 - g), x1: Math.min(w - 1, rect.x1 + g), y1: Math.min(h - 1, rect.y1 + g) };
}

/**
 * Paints line pixels next to a filled region (up to PAINT.fillUnderLine away), hidden under the lines.
 * @param {PaintBuffer} buf Picture.
 * @param {Uint8Array} mask Line pixels.
 * @param {number[]} region Filled pixel indices.
 * @param {number[]} ryb Pigments.
 * @param {boolean} white White paint.
 * @returns {void}
 */
function growUnderLines(buf, mask, region, ryb, white) {
  const { w, h } = buf;
  const done = new Uint8Array(w * h);
  let frontier = region;
  for (let step = 0; step < PAINT.fillUnderLine; step += 1) {
    /** @type {number[]} */ const next = [];
    frontier.forEach((i) => {
      const x = i % w;
      const y = (i - x) / w;
      [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1].forEach((j) => {
        if (j >= 0 && mask[j] && !done[j]) { done[j] = 1; paintPixel(buf, j, ryb, white, 1); next.push(j); }
      });
    });
    frontier = next;
  }
}

/**
 * Writes the visible colours of an area into canvas pixels (RGBA; unpainted = transparent).
 * @param {PaintBuffer} buf Picture.
 * @param {{data: Uint8ClampedArray, width: number}} img Target pixels (whole picture size).
 * @param {Rect} rect Area to update.
 * @returns {void}
 */
export function render(buf, img, rect) {
  const table = colourTable();
  const n = PAINT.lutLevels;
  const q = (n - 1) / 255;
  for (let y = rect.y0; y <= rect.y1; y += 1) {
    for (let x = rect.x0; x <= rect.x1; x += 1) {
      const i = y * buf.w + x;
      const o = (y * img.width + x) * 4;
      const t = ((Math.round(buf.pig[i * 3] * q) * n + Math.round(buf.pig[i * 3 + 1] * q)) * n + Math.round(buf.pig[i * 3 + 2] * q)) * 3;
      img.data[o] = table[t];
      img.data[o + 1] = table[t + 1];
      img.data[o + 2] = table[t + 2];
      img.data[o + 3] = buf.cov[i];
    }
  }
}

/**
 * Undo history: snapshots of the picture before each stroke.
 * @param {number} [max] Number of steps kept.
 * @returns {{push: (b: PaintBuffer) => void, pop: (b: PaintBuffer) => boolean, size: () => number, clear: () => void}}
 */
export function createUndo(max = PAINT.undoSteps) {
  /** @type {{pig: Uint8Array, cov: Uint8Array}[]} */ let steps = [];
  return {
    push(b) {
      steps.push({ pig: b.pig.slice(), cov: b.cov.slice() });
      if (steps.length > max) steps.shift();
    },
    pop(b) {
      const s = steps.pop();
      if (!s) return false;
      b.pig.set(s.pig);
      b.cov.set(s.cov);
      return true;
    },
    size: () => steps.length,
    clear() { steps = []; },
  };
}
