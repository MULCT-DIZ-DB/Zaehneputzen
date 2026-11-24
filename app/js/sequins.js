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
export function insidePolygon(p, poly) {
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
 * Distance from a point to a line segment.
 * @param {Point} p Point.
 * @param {Point} a Segment start.
 * @param {Point} b Segment end.
 * @returns {number}
 */
function segmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Shortest distance from a point to the outline of a (closed) polygon.
 * @param {Point} p Point.
 * @param {Point[]} poly Polygon corners.
 * @returns {number}
 */
export function edgeDistance(p, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) best = Math.min(best, segmentDistance(p, poly[j], poly[i]));
  return best;
}

/**
 * Shortest distance from a point to an open polyline (e.g. the centre line of an arm).
 * @param {Point} p Point.
 * @param {Point[]} line Polyline points.
 * @returns {number}
 */
export function polylineDistance(p, line) {
  let best = Infinity;
  for (let i = 1; i < line.length; i += 1) best = Math.min(best, segmentDistance(p, line[i - 1], line[i]));
  return best;
}

/**
 * Samples a quadratic Bézier curve as a polyline.
 * @param {Point} p0 Start.
 * @param {Point} c Control point.
 * @param {Point} p1 End.
 * @param {number} [steps] Number of segments.
 * @returns {Point[]}
 */
export function quadraticPoints(p0, c, p1, steps = 12) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/**
 * @typedef {{kind: 'line', name: string, points: Point[], halfWidth: number} |
 *           {kind: 'area', name: string, points: Point[]}} Occluder
 */

/**
 * True if a sequin of radius `r` at `p` stays fully visible next to the occluders
 * (shapes drawn on top of it, like arms over a top), keeping an extra `gap`.
 * @param {Point} p Sequin centre.
 * @param {number} r Sequin radius.
 * @param {Occluder[]} occluders Covering shapes.
 * @param {number} [gap] Extra distance.
 * @returns {boolean}
 */
export function isUncovered(p, r, occluders, gap = 0) {
  return occluders.every((o) => (o.kind === 'line'
    ? polylineDistance(p, o.points) - o.halfWidth >= r + gap
    : !insidePolygon(p, o.points) && edgeDistance(p, o.points) >= r + gap));
}
/**
 * Places sequins on a staggered grid inside a polygon (like scales).
 * With a margin, only points at least that far from the outline are kept
 * (sequins right at the edge are hard to hit with a finger).
 * @param {Point[]} poly Outline of the clothing part.
 * @param {number} spacing Distance between sequins.
 * @param {number} [margin] Minimum distance from the outline.
 * @returns {Point[]}
 */
export function layoutInPolygon(poly, spacing, margin = 0) {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const points = [];
  let row = 0;
  for (let y = minY + margin; y <= maxY + 1e-9; y += spacing * 0.87, row += 1) {
    const offset = row % 2 ? spacing / 2 : 0;
    for (let x = minX + margin + offset; x <= maxX + 1e-9; x += spacing) {
      const p = { x, y };
      const onCorner = poly.some((c) => Math.hypot(c.x - x, c.y - y) < 1e-6);
      const inside = insidePolygon(p, poly) || (margin === 0 && onCorner);
      if (inside && (margin === 0 || edgeDistance(p, poly) >= margin)) points.push(p);
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
 * Shows the front side of every sequin.
 * @param {boolean[]} states Sequin states.
 * @returns {boolean[]}
 */
export function resetStates(states) {
  return states.map(() => false);
}

/**
 * Turns every sequin over (inverts the pattern).
 * @param {boolean[]} states Sequin states.
 * @returns {boolean[]}
 */
export function flipAll(states) {
  return states.map((s) => !s);
}
