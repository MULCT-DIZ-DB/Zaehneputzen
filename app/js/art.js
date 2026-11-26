// @ts-check
/**
 * Hand-drawn SVG artwork: mouth with KAI surfaces, tooth cross-section, toothbrush, gift box, confetti, icon sprite.
 * Everything is built once; animations only touch transform/opacity via CSS classes.
 * @module art
 */
import { PALETTE as C, UI } from './config.js';
import { svg, svgRoot, inked } from './dom.js';
import { sketchPath, sketchEllipse, sketchStar, seeded } from './sketch.js';

/** Number of "sugar spots" per jaw that disappear while brushing. */
export const SPOTS_PER_JAW = 6;

/**
 * Brush position in the mouth drawing (viewBox 0 0 400 300) per KAI surface and jaw.
 * `up`: bristles point up (else down, towards the teeth).
 */
export const BRUSH_POSES = Object.freeze({
  kau: { unten: { x: 200, y: 190, up: false }, oben: { x: 200, y: 110, up: true } },
  // Outer surfaces are brushed with the mouth closed: the jaws move together (see style.css).
  aussen: { unten: { x: 200, y: 178, up: false }, oben: { x: 200, y: 114, up: true } },
  innen: { unten: { x: 200, y: 176, up: false }, oben: { x: 200, y: 124, up: true } },
});

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
 * One row of 8 teeth.
 * @param {boolean} upper Upper row?
 * @returns {SVGElement}
 */
function teethRow(upper) {
  return svg('g', { class: 'teeth' }, Array.from({ length: 8 }, (_, i) => {
    const { x, y } = toothCorner(i, upper);
    return inked(sketchRect(x, y, TOOTH_W, TOOTH_H, 100 + i + (upper ? 0 : 20)), C.weiss, { class: 'ink tooth' });
  }));
}

/**
 * Points along a tooth row at a given height inside the teeth (0 = edge towards the gum, 1 = biting edge).
 * @param {boolean} upper Upper row?
 * @param {number} share Position between gum side (0) and biting edge (1).
 * @param {number} [offset] Extra distance beyond that (towards the inside of the mouth).
 * @returns {{x: number, y: number}[]}
 */
function rowLine(upper, share, offset = 0) {
  return Array.from({ length: 8 }, (_, i) => {
    const c = toothCorner(i, upper);
    const y = upper ? c.y + TOOTH_H * share + offset : c.y + TOOTH_H * (1 - share) - offset;
    return { x: c.x + TOOTH_W / 2, y };
  });
}

/**
 * Highlight band along a tooth row for one KAI surface.
 * @param {boolean} upper Upper row?
 * @param {'kau'|'aussen'|'innen'} surface Surface.
 * @returns {SVGElement}
 */
function surfaceHighlight(upper, surface) {
  const shapes = { kau: [1, 0, 16], aussen: [0.5, 0, 40], innen: [1, 14, 18] };
  const [share, offset, width] = shapes[surface];
  return svg('path', {
    d: sketchPath(rowLine(upper, share, offset), { closed: false, wobble: 0.6, seed: upper ? 41 : 42 }),
    fill: 'none', stroke: C.butter, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    class: `hl hl-${surface}`,
  });
}

/**
 * Sugar spots on the tooth faces of one jaw (fade out with brushing progress).
 * @param {boolean} upper Upper row?
 * @returns {SVGElement}
 */
function jawSpots(upper) {
  const rnd = seeded(upper ? 500 : 501);
  const teeth = [0, 2, 3, 4, 5, 7];
  return svg('g', { class: 'spots' }, teeth.slice(0, SPOTS_PER_JAW).map((i, k) => {
    const c = toothCorner(i, upper);
    return svg('circle', {
      cx: Math.round(c.x + 8 + rnd() * 15), cy: Math.round(c.y + 12 + rnd() * 18),
      r: 4 + Math.round(rnd() * 3), fill: k % 2 ? C.butter : C.salbei, class: 'spot', 'data-k': k,
    });
  }));
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
 * One jaw: inner-side highlight (behind the teeth), teeth, sugar spots, chewing-edge and
 * outer-face highlights, and sparkles shown when the jaw is clean.
 * @param {boolean} upper Upper jaw?
 * @returns {SVGElement}
 */
function jaw(upper) {
  const mid = toothCorner(3, upper);
  const y = mid.y + TOOTH_H / 2;
  return svg('g', { class: `jaw jaw-${upper ? 'oben' : 'unten'}` }, [
    surfaceHighlight(upper, 'innen'),
    teethRow(upper),
    jawSpots(upper),
    surfaceHighlight(upper, 'aussen'),
    surfaceHighlight(upper, 'kau'),
    svg('g', { class: 'jaw-clean' }, [sparkle(110, y - 10, 10), sparkle(290, y + 6, 8), sparkle(200, y + (upper ? -16 : 16), 7)]),
  ]);
}

/**
 * Builds the mouth for KAI brushing: two jaws with surface highlights and the moving brush.
 * State is set from outside via `data-surface` / `data-jaw` on the root and classes on the jaws.
 * @returns {{root: SVGElement, jaws: {oben: SVGElement, unten: SVGElement}, brush: SVGElement,
 *   brushFlip: SVGElement, brushMotion: SVGElement}}
 */
export function drawMouth() {
  const lips = inked(sketchEllipse(200, 150, 188, 132, 1, 2), C.rosa, { 'stroke-width': 4 });
  const inner = inked(sketchEllipse(200, 150, 160, 106, 2, 2), C.mund, { class: 'ink mouth-inner' });
  const tongue = svg('path', { d: sketchEllipse(200, 198, 92, 36, 3, 2), fill: C.zunge, class: 'tongue' });
  const jaws = { unten: jaw(false), oben: jaw(true) };
  const brushMotion = svg('g', { class: 'brush-motion' }, [toothbrush()]);
  // brush-pos (where) > brush-flip (jaw) > brush-travel (along the whole row) > brush-motion (scrub/circles/wipe)
  const brushTravel = svg('g', { class: 'brush-travel' }, [brushMotion]);
  const brushFlip = svg('g', { class: 'brush-flip' }, [brushTravel]);
  const brush = svg('g', { class: 'brush-pos' }, [brushFlip]);
  const root = svgRoot('0 0 400 300', 'mouth', [lips, inner, tongue, jaws.unten, jaws.oben, brush]);
  return { root, jaws, brush, brushFlip, brushMotion };
}

/**
 * Cross-section of a molar showing the three KAI surfaces (for the brushing screen).
 * Set `data-face` (kau/aussen/innen) and `data-jaw` (unten/oben flips it) on the root.
 * @param {{outer: string, inner: string}} labels Side labels.
 * @returns {SVGElement}
 */
export function drawToothSection(labels) {
  const crown = 'M42 108 L42 58 Q42 34 56 36 Q63 24 70 34 Q77 24 84 36 Q98 34 98 58 L98 108 Z';
  const flip = svg('g', { class: 'ts-flip' }, [
    inked(sketchEllipse(70, 112, 50, 16, 61, 1), C.rosa),
    inked(crown, C.weiss),
    svg('path', { d: 'M42 58 Q42 34 56 36 Q63 24 70 34 Q77 24 84 36 Q98 34 98 58', class: 'face face-kau' }),
    svg('path', { d: 'M42 60 L42 104', class: 'face face-aussen' }),
    svg('path', { d: 'M98 60 L98 104', class: 'face face-innen' }),
  ]);
  return svgRoot('0 0 140 130', 'tooth-section', [
    flip,
    svg('text', { x: 18, y: 72, class: 'ts-label', 'text-anchor': 'middle' }, [document.createTextNode(labels.outer)]),
    svg('text', { x: 122, y: 72, class: 'ts-label', 'text-anchor': 'middle' }, [document.createTextNode(labels.inner)]),
  ]);
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
