// @ts-check
/**
 * Hand-drawn look: turns clean shapes into slightly wobbly SVG paths.
 * Paths are computed once at start-up (deterministic via a seed), never per frame.
 * @module sketch
 */

/** @typedef {{x: number, y: number}} Point */

/**
 * Small deterministic random number generator (mulberry32).
 * @param {number} seed Any integer.
 * @returns {() => number} Function returning numbers in [0, 1).
 */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rounds to one decimal to keep SVG strings short.
 * @param {number} n Number.
 * @returns {number}
 */
const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Smooth path through points (Catmull-Rom → cubic Bézier) with a little jitter.
 * @param {Point[]} points Corner points.
 * @param {{closed?: boolean, wobble?: number, seed?: number}} [opts] Options.
 * @returns {string} SVG path data.
 */
export function sketchPath(points, { closed = true, wobble = 1.2, seed = 1 } = {}) {
  const rnd = seeded(seed);
  const p = points.map((pt) => ({ x: pt.x + (rnd() - 0.5) * wobble * 2, y: pt.y + (rnd() - 0.5) * wobble * 2 }));
  const n = p.length;
  const at = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(p[0].x)} ${r1(p[0].y)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(p2.x)} ${r1(p2.y)}`;
  }
  return closed ? `${d} Z` : d;
}

/**
 * Wobbly ellipse.
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} rx Radius x.
 * @param {number} ry Radius y.
 * @param {number} [seed] Seed for the wobble.
 * @param {number} [wobble] Wobble strength.
 * @returns {string} SVG path data.
 */
export function sketchEllipse(cx, cy, rx, ry, seed = 1, wobble = 1.2) {
  const steps = 10;
  const pts = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
  return sketchPath(pts, { seed, wobble });
}

/**
 * Wobbly star (n points).
 * @param {number} cx Centre x.
 * @param {number} cy Centre y.
 * @param {number} outer Outer radius.
 * @param {number} inner Inner radius.
 * @param {number} [spikes] Number of points.
 * @param {number} [seed] Seed.
 * @returns {string} SVG path data with straight-ish edges.
 */
export function sketchStar(cx, cy, outer, inner, spikes = 5, seed = 1) {
  const rnd = seeded(seed);
  let d = '';
  for (let i = 0; i < spikes * 2; i += 1) {
    const rad = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const x = cx + Math.cos(a) * rad + (rnd() - 0.5) * 1.5;
    const y = cy + Math.sin(a) * rad + (rnd() - 0.5) * 1.5;
    d += `${i ? ' L' : 'M'}${r1(x)} ${r1(y)}`;
  }
  return `${d} Z`;
}
