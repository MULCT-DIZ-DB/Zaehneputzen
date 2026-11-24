// @ts-check
/**
 * Flip-sequin logic (pure): layout, fast grid lookup, stroke direction, encoding.
 * @module sequins
 */

/** @typedef {{x: number, y: number}} Point */
/** @typedef {{cell: number, cells: Map<string, number[]>, points: Point[]}} SequinIndex */

/**
 * Even-odd test whether a point lies inside a polygon.
 * @param {Point} p Point to test.
 * @param {Point[]} poly Polygon corners.
 * @returns {boolean}
 */
function insidePolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    const crosses = (a.y > p.y) !== (b.y > p.y) && p.x <= ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Places sequins on a staggered grid inside a polygon (like scales).
 * @param {Point[]} poly Outline of the clothing part.
 * @param {number} spacing Distance between sequins.
 * @returns {Point[]}
 */
export function layoutInPolygon(poly, spacing) {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const points = [];
  let row = 0;
  for (let y = minY; y <= maxY + 1e-9; y += spacing * 0.87, row += 1) {
    const offset = row % 2 ? spacing / 2 : 0;
    for (let x = minX + offset; x <= maxX + 1e-9; x += spacing) {
      const p = { x, y };
      if (insidePolygon(p, poly) || poly.some((c) => Math.hypot(c.x - x, c.y - y) < 1e-6)) points.push(p);
    }
  }
  return points;
}

/**
 * Cell key for the lookup grid.
 * @param {number} cx Cell column.
 * @param {number} cy Cell row.
 * @returns {string}
 */
const cellKey = (cx, cy) => `${cx},${cy}`;

/**
 * Builds a grid index so touches only check nearby sequins.
 * @param {Point[]} points Sequin centres.
 * @param {number} cell Cell size (about the touch radius).
 * @returns {SequinIndex}
 */
export function createIndex(points, cell) {
  const cells = new Map();
  points.forEach((p, i) => {
    const key = cellKey(Math.floor(p.x / cell), Math.floor(p.y / cell));
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(i);
  });
  return { cell, cells, points };
}

/**
 * Finds sequins within `radius` of a point.
 * @param {SequinIndex} index Grid index.
 * @param {number} x Touch x.
 * @param {number} y Touch y.
 * @param {number} radius Touch radius.
 * @returns {number[]} Sequin indices.
 */
export function hitTest(index, x, y, radius) {
  const found = [];
  const span = Math.ceil(radius / index.cell);
  const cx = Math.floor(x / index.cell);
  const cy = Math.floor(y / index.cell);
  for (let dx = -span; dx <= span; dx += 1) {
    for (let dy = -span; dy <= span; dy += 1) {
      (index.cells.get(cellKey(cx + dx, cy + dy)) || []).forEach((i) => {
        const p = index.points[i];
        if (Math.hypot(p.x - x, p.y - y) <= radius) found.push(i);
      });
    }
  }
  return found;
}

/**
 * Sequins to flip for a finger movement. Down/right shows the back colour,
 * up/left the front colour – like a real reversible sequin shirt.
 * @param {SequinIndex} index Grid index.
 * @param {boolean[]} states Current states (true = back side).
 * @param {Point} from Previous finger position.
 * @param {Point} to New finger position.
 * @param {number} radius Touch radius.
 * @returns {{i: number, value: boolean}[]} Only sequins that actually change.
 */
export function strokeFlips(index, states, from, to, radius) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return [];
  const value = Math.abs(dy) >= Math.abs(dx) ? dy > 0 : dx > 0;
  const steps = Math.max(1, Math.ceil(length / (radius / 2)));
  const touched = new Set();
  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    hitTest(index, from.x + dx * t, from.y + dy * t, radius).forEach((i) => touched.add(i));
  }
  return [...touched].filter((i) => states[i] !== value).map((i) => ({ i, value }));
}

/**
 * Encodes states as a compact "0101" string for saving.
 * @param {boolean[]} states Sequin states.
 * @returns {string}
 */
export function encodeStates(states) {
  return states.map((s) => (s ? '1' : '0')).join('');
}

/**
 * Decodes a saved string; missing or invalid characters become `false`.
 * @param {string} code Saved string.
 * @param {number} count Number of sequins.
 * @returns {boolean[]}
 */
export function decodeStates(code, count) {
  return Array.from({ length: count }, (_, i) => code.charAt(i) === '1');
}

/**
 * Turns every sequin over.
 * @param {boolean[]} states Sequin states.
 * @returns {boolean[]}
 */
export function flipAll(states) {
  return states.map((s) => !s);
}
