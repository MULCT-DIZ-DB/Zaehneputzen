// @ts-check
/**
 * Hand-drawn SVG artwork: mouth with zones, toothbrush, gift box, confetti, icon sprite.
 * Everything is built once; animations only touch transform/opacity via CSS classes.
 * @module art
 */
import { PALETTE as C, ZONES, UI } from './config.js';
import { svg, svgRoot, inked } from './dom.js';
import { sketchPath, sketchEllipse, sketchStar, seeded } from './sketch.js';

/** Zone centres in the mouth drawing (viewBox 0 0 400 300), same order as ZONES. */
export const ZONE_CENTERS = Object.freeze([
  { x: 125, y: 92 }, { x: 275, y: 92 }, { x: 125, y: 208 }, { x: 275, y: 208 },
]);

/** Number of "sugar spots" per zone that disappear while brushing. */
export const SPOTS_PER_ZONE = 4;

/**
 * Rounded, wobbly rectangle path.
 * @param {number} x Left.
 * @param {number} y Top.
 * @param {number} w Width.
 * @param {number} h Height.
 * @param {number} seed Seed.
 * @returns {string}
 */
export function sketchRect(x, y, w, h, seed) {
  const k = Math.min(w, h) * 0.3;
  return sketchPath([
    { x: x + k, y }, { x: x + w - k, y }, { x: x + w, y: y + k }, { x: x + w, y: y + h - k },
    { x: x + w - k, y: y + h }, { x: x + k, y: y + h }, { x, y: y + h - k }, { x, y: y + k },
  ], { seed, wobble: 0.8 });
}

/** Tooth size in mouth units. */
const TOOTH_W = 31;
const TOOTH_H = 42;

/**
 * Top-left corner of a tooth (8 per row, following the curve of the mouth).
 * @param {number} i Tooth index in its row (0–7).
 * @param {boolean} upper Upper row?
 * @returns {{x: number, y: number}}
 */
function toothCorner(i, upper) {
  const curve = (i - 3.5) ** 2 * 2.2;
  return { x: 64 + i * 34.5, y: upper ? 50 + curve : 208 - curve };
}

/** Centres of all 16 teeth (upper row left→right, then lower row) – used by the Zuckerjagd game. */
export const TOOTH_CENTERS = Object.freeze([true, false].flatMap((upper) => Array.from({ length: 8 }, (_, i) => {
  const c = toothCorner(i, upper);
  return { x: c.x + TOOTH_W / 2, y: c.y + TOOTH_H / 2 };
})));

/**
 * One row of teeth (8 teeth) split into two zones.
 * @param {boolean} upper Upper row?
 * @returns {SVGElement[]} One group per zone (left, right).
 */
function teethRow(upper) {
  const groups = [svg('g'), svg('g')];
  for (let i = 0; i < 8; i += 1) {
    const { x, y } = toothCorner(i, upper);
    const tooth = inked(sketchRect(x, y, TOOTH_W, TOOTH_H, 100 + i + (upper ? 0 : 20)), C.weiss, { class: 'ink tooth' });
    groups[i < 4 ? 0 : 1].append(tooth);
  }
  return groups;
}

/**
 * Sugar spots for one zone (fade out with brushing progress).
 * @param {number} zone Zone index.
 * @returns {SVGElement}
 */
function zoneSpots(zone) {
  const rnd = seeded(500 + zone);
  const c = ZONE_CENTERS[zone];
  const g = svg('g', { class: 'spots' });
  for (let k = 0; k < SPOTS_PER_ZONE; k += 1) {
    const color = k % 2 ? C.butter : C.salbei;
    g.append(svg('circle', {
      cx: Math.round(c.x - 50 + k * 30 + rnd() * 10), cy: Math.round(c.y - 8 + rnd() * 16),
      r: 4 + Math.round(rnd() * 3), fill: color, class: 'spot', 'data-k': k,
    }));
  }
  return g;
}

/**
 * Sparkle star used to show a clean zone.
 * @param {number} x Centre x.
 * @param {number} y Centre y.
 * @param {number} r Size.
 * @param {string} [cls] CSS class.
 * @returns {SVGElement}
 */
export function sparkle(x, y, r, cls = 'sparkle') {
  return svg('path', {
    d: `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`,
    fill: C.weiss, stroke: C.gold, 'stroke-width': 1.5, class: cls,
  });
}

/**
 * Hand-drawn toothbrush (head at 0,0, handle to the left, bristles up).
 * @returns {SVGElement}
 */
function toothbrush() {
  const bristles = svg('g');
  for (let i = 0; i < 6; i += 1) {
    bristles.append(inked(sketchRect(-26 + i * 9, -20, 6, 14, 300 + i), i % 2 ? C.petrol : C.weiss, { 'stroke-width': 2 }));
  }
  return svg('g', { class: 'brush-shape' }, [
    inked(sketchRect(-170, -6, 150, 18, 310), C.lavendel),
    inked(sketchRect(-32, -8, 64, 16, 311), C.weiss),
    bristles,
  ]);
}

/**
 * Builds the mouth with highlight, spots and sparkles per zone plus the moving brush.
 * @returns {{root: SVGElement, zones: SVGElement[], brush: SVGElement, brushFlip: SVGElement}}
 */
export function drawMouth() {
  const lips = inked(sketchEllipse(200, 150, 188, 132, 1, 2), C.rosa, { 'stroke-width': 4 });
  const inner = inked(sketchEllipse(200, 150, 160, 106, 2, 2), C.mund);
  const tongue = svg('path', { d: sketchEllipse(200, 198, 92, 36, 3, 2), fill: C.zunge });
  const [ul, ur] = teethRow(false);
  const [ol, or] = teethRow(true);
  const teeth = [ol, or, ul, ur];
  const zones = ZONES.map((z, i) => {
    const c = ZONE_CENTERS[i];
    return svg('g', { class: 'zone', 'data-zone': z.id }, [
      svg('path', { d: sketchEllipse(c.x, c.y + (i < 2 ? -6 : 6), 82, 40, 40 + i, 3), fill: C.butter, class: 'zone-hl' }),
      teeth[i],
      zoneSpots(i),
      svg('g', { class: 'zone-clean' }, [sparkle(c.x - 30, c.y - 14, 10), sparkle(c.x + 34, c.y + 8, 7)]),
    ]);
  });
  const brushFlip = svg('g', { class: 'brush-flip' }, [svg('g', { class: 'brush-scrub' }, [toothbrush()])]);
  const brush = svg('g', { class: 'brush-pos' }, [brushFlip]);
  const root = svgRoot('0 0 400 300', 'mouth', [lips, inner, tongue, ...zones, brush]);
  return { root, zones, brush, brushFlip };
}

/**
 * Gift box with a separate lid group for the opening animation.
 * @returns {SVGElement}
 */
export function drawGift() {
  const lid = svg('g', { class: 'gift-lid' }, [
    inked(sketchRect(30, 62, 140, 34, 701), C.lavendel),
    inked(sketchRect(90, 62, 20, 34, 702), C.butter),
    inked(sketchEllipse(80, 50, 22, 14, 703), C.butter),
    inked(sketchEllipse(120, 50, 22, 14, 704), C.butter),
  ]);
  return svgRoot('0 0 200 200', 'gift', [
    inked(sketchRect(40, 94, 120, 90, 705), C.rosa),
    inked(sketchRect(90, 94, 20, 90, 706), C.butter),
    lid,
  ]);
}

/**
 * Confetti pieces for the dance party. Delays are spread over one fall duration so that,
 * looping endlessly, they form a steady stream.
 * @param {number} count Number of pieces.
 * @returns {SVGElement[]} Small SVGs, each with its own CSS variables for path and delay.
 */
export function drawConfetti(count) {
  const colors = [C.rosa, C.lavendel, C.salbei, C.butter, C.petrol, C.pfirsich];
  const rnd = seeded(900);
  return Array.from({ length: count }, (_, i) => {
    const shape = i % 3 === 0
      ? inked(sketchStar(20, 20, 16, 7, 5, 910 + i), colors[i % colors.length], { 'stroke-width': 2 })
      : inked(sketchEllipse(20, 20, 9, 13, 920 + i), colors[i % colors.length], { 'stroke-width': 2 });
    const piece = svgRoot('0 0 40 40', 'confetti', [shape]);
    const dur = UI.confettiMinSec + rnd() * (UI.confettiMaxSec - UI.confettiMinSec);
    piece.setAttribute('style', `left:${Math.round(3 + rnd() * 94)}%;animation-duration:${dur.toFixed(2)}s;`
      + `animation-delay:${((i / count) * UI.confettiMaxSec).toFixed(2)}s;--drift:${Math.round((rnd() - 0.5) * 160)}px`);
    return piece;
  });
}

/**
 * Small stick-figure dancer for the pose pictograms (head, body, arms, legs).
 * @param {string} arms Path data of both arms.
 * @param {string} legs Path data of both legs.
 * @param {number} [dy] Vertical shift (e.g. a jump).
 * @returns {SVGElement[]}
 */
function poseFigure(arms, legs, dy = 0) {
  return [svg('g', { transform: `translate(0 ${dy})` }, [
    inked(sketchEllipse(24, 10, 5.5, 5.5, 32), C.haut, { 'stroke-width': 2 }),
    svg('path', { d: `M24 16 L24 31 ${arms} ${legs}`, class: 'ink-line', fill: 'none' }),
  ])];
}

/**
 * A cute sugar bug for „Zuckerjagd“ (centred at 0,0) with a larger invisible tap area.
 * @param {number} r Body radius.
 * @param {number} hitR Radius of the tap area.
 * @returns {SVGElement}
 */
export function drawBug(r, hitR) {
  const e = r * 0.32;
  return svg('g', { class: 'bug-shape' }, [
    svg('circle', { cx: 0, cy: 0, r: hitR, fill: C.weiss, opacity: 0.01 }),
    svg('path', { d: `M${-e} ${-r * 0.7} Q${-r * 0.7} ${-r * 1.5} ${-r} ${-r * 1.35} M${e} ${-r * 0.7} Q${r * 0.7} ${-r * 1.5} ${r} ${-r * 1.35}`,
      class: 'ink-line thin' }),
    inked(sketchEllipse(0, 0, r, r * 0.9, 33, 0.8), C.zucker),
    svg('circle', { cx: -r * 0.55, cy: r * 0.35, r: r * 0.16, fill: C.rosa }),
    svg('circle', { cx: r * 0.55, cy: r * 0.35, r: r * 0.16, fill: C.rosa }),
    svg('circle', { cx: -e, cy: -r * 0.15, r: r * 0.16, fill: C.tinte }),
    svg('circle', { cx: e, cy: -r * 0.15, r: r * 0.16, fill: C.tinte }),
    svg('path', { d: `M${-e} ${r * 0.3} Q0 ${r * 0.55} ${e} ${r * 0.3}`, class: 'ink-line thin' }),
  ]);
}

/** Icon drawings (viewBox 0 0 48 48) as factories, used once to build the sprite. */
const ICONS = {
  sonne: () => [inked(sketchEllipse(24, 24, 10, 10, 11), C.butter),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i * Math.PI) / 4;
      return svg('line', { x1: 24 + Math.cos(a) * 15, y1: 24 + Math.sin(a) * 15, x2: 24 + Math.cos(a) * 21,
        y2: 24 + Math.sin(a) * 21, class: 'ink-line' });
    })],
  mond: () => [inked('M30 6 C16 8 10 22 16 32 C22 42 36 42 42 34 C30 36 22 26 24 16 C25 11 27 8 30 6 Z', C.lavendel)],
  stern: () => [inked(sketchStar(24, 25, 19, 8, 5, 12), C.butter)],
  album: () => [inked(sketchRect(8, 6, 32, 36, 13), C.rosa), inked(sketchStar(24, 24, 9, 4, 5, 14), C.butter)],
  kalender: () => [inked(sketchRect(6, 10, 36, 32, 15), C.weiss), inked(sketchRect(6, 10, 36, 9, 16), C.salbei),
    inked(sketchEllipse(17, 31, 4, 4, 17), C.rosa), inked(sketchEllipse(31, 31, 4, 4, 18), C.lavendel)],
  kleid: () => [inked('M18 6 L30 6 L28 18 L40 42 L8 42 L20 18 Z', C.lavendel), inked(sketchEllipse(24, 6, 6, 3, 19), C.rosa)],
  eltern: () => [inked(sketchEllipse(24, 24, 14, 14, 20), C.grau), inked(sketchEllipse(24, 24, 5, 5, 21), C.creme)],
  bild: () => [inked(sketchRect(5, 9, 38, 30, 25), C.himmel), inked('M7 37 L18 24 L26 31 L32 25 L41 37 Z', C.salbei, { 'stroke-width': 2 }),
    inked(sketchEllipse(33, 17, 4, 4, 26), C.butter, { 'stroke-width': 2 })],
  pause: () => [inked(sketchRect(12, 8, 9, 32, 22), C.petrol), inked(sketchRect(27, 8, 9, 32, 23), C.petrol)],
  play: () => [inked('M14 8 L38 24 L14 40 Z', C.salbei)],
  kreuz: () => [svg('path', { d: 'M13 13 L35 35 M35 13 L13 35', fill: 'none', stroke: C.rot, 'stroke-width': 8, 'stroke-linecap': 'round' })],
  spiele: () => [inked(sketchRect(4, 14, 40, 24, 27), C.lavendel), svg('path', { d: 'M12 26 L20 26 M16 22 L16 30', class: 'ink-line' }),
    inked(sketchEllipse(31, 24, 3, 3, 28), C.rosa, { 'stroke-width': 2 }), inked(sketchEllipse(36, 29, 3, 3, 29), C.butter, { 'stroke-width': 2 })],
  klavier: () => [inked(sketchRect(4, 10, 40, 30, 30), C.weiss),
    svg('path', { d: 'M14 10 L14 40 M24 10 L24 40 M34 10 L34 40', class: 'ink-line thin' }),
    ...[11, 21, 31].map((x) => svg('rect', { x, y: 10, width: 6, height: 17, rx: 1.5, fill: C.tinte }))],
  zucker: () => [inked(sketchEllipse(24, 28, 14, 12, 31), C.zucker),
    svg('path', { d: 'M18 17 Q14 8 10 9 M30 17 Q34 8 38 9', class: 'ink-line thin' }),
    svg('circle', { cx: 19, cy: 26, r: 2.5, fill: C.tinte }), svg('circle', { cx: 29, cy: 26, r: 2.5, fill: C.tinte }),
    svg('path', { d: 'M19 33 Q24 36 29 33', class: 'ink-line thin' })],
  'pose-arme': () => poseFigure('M24 18 L13 5 M24 18 L35 5', 'M24 31 L17 44 M24 31 L31 44'),
  'pose-dreh': () => [...poseFigure('M24 18 L14 24 M24 18 L34 24', 'M24 31 L20 44 M24 31 L28 44'),
    svg('path', { d: 'M7 30 Q4 14 18 6 M41 18 Q44 34 30 42', class: 'ink-line thin' }),
    svg('path', { d: 'M15 3 L19 6 L15 10 M33 45 L29 42 L33 38', class: 'ink-line thin' })],
  'pose-hupf': () => [...poseFigure('M24 18 L13 12 M24 18 L35 12', 'M24 29 L15 34 M24 29 L33 34', -4),
    svg('path', { d: 'M12 42 L20 42 M28 42 L36 42 M18 46 L30 46', class: 'ink-line thin' })],
  'pose-welle': () => poseFigure('M24 18 Q18 12 12 18 Q8 22 4 16 M24 18 Q30 24 36 18 Q40 14 44 20', 'M24 31 L18 44 M24 31 L30 44'),
  zurueck: () => [svg('path', { d: 'M30 10 L14 24 L30 38', class: 'ink-line', fill: 'none' })],
  note: () => [inked(sketchEllipse(16, 36, 8, 6, 24), C.petrol), svg('path', { d: 'M23 36 L23 8 L36 14', class: 'ink-line', fill: 'none' })],
};

/**
 * Builds a hidden SVG sprite with all icons as symbols (`#i-<name>`).
 * @returns {SVGElement}
 */
export function buildIconSprite() {
  const symbols = Object.entries(ICONS).map(([name, make]) => svg('symbol', { id: `i-${name}`, viewBox: '0 0 48 48' }, make()));
  return svg('svg', { class: 'sprite', 'aria-hidden': 'true' }, symbols);
}

/**
 * Small SVG that references an icon from the sprite.
 * @param {keyof typeof ICONS} name Icon name.
 * @param {string} [cls] Extra CSS class.
 * @returns {SVGElement}
 */
export function icon(name, cls = '') {
  return svg('svg', { class: `icon ${cls}`.trim(), viewBox: '0 0 48 48', 'aria-hidden': 'true' }, [svg('use', { href: `#i-${name}` })]);
}
