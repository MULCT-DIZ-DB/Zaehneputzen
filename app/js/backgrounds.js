// @ts-check
/**
 * Hand-drawn brushing backgrounds (viewBox 0 0 1024 768, scaled to cover the screen).
 * Static drawings: rendered once per change, only a few stars twinkle.
 * @module backgrounds
 */
import { PALETTE as C, BACKGROUNDS } from './config.js';
import { svg, svgRoot, inked } from './dom.js';
import { sketchPath, sketchEllipse, sketchStar, seeded } from './sketch.js';
import { sparkle } from './art.js';

const W = 1024;
const H = 768;

/**
 * Full-size rectangle.
 * @param {string} fill Colour.
 * @param {number} [y] Top.
 * @param {number} [h] Height.
 * @param {Object<string, string|number>} [extra] Extra attributes.
 * @returns {SVGElement}
 */
function band(fill, y = 0, h = H, extra = {}) {
  return svg('rect', { x: 0, y, width: W, height: h, fill, ...extra });
}

/**
 * Rolling hill outline across the whole width.
 * @param {number} y Base height.
 * @param {number} amp Wave height.
 * @param {string} fill Colour.
 * @param {number} seed Seed.
 * @returns {SVGElement}
 */
function hill(y, amp, fill, seed) {
  const pts = [{ x: -40, y: H + 40 }];
  for (let x = -40; x <= W + 40; x += 128) pts.push({ x, y: y - Math.sin((x + seed * 50) / 170) * amp });
  pts.push({ x: W + 40, y: H + 40 });
  return inked(sketchPath(pts, { seed, wobble: 3 }), fill);
}

/**
 * Fluffy cloud.
 * @param {number} x Centre x.
 * @param {number} y Centre y.
 * @param {number} s Scale.
 * @param {number} seed Seed.
 * @returns {SVGElement}
 */
function cloud(x, y, s, seed) {
  return svg('g', {}, [
    inked(sketchEllipse(x - 40 * s, y + 8 * s, 42 * s, 28 * s, seed), C.weiss),
    inked(sketchEllipse(x + 40 * s, y + 8 * s, 46 * s, 30 * s, seed + 1), C.weiss),
    inked(sketchEllipse(x, y - 14 * s, 50 * s, 38 * s, seed + 2), C.weiss),
  ]);
}

/**
 * Small flower.
 * @param {number} x Centre x.
 * @param {number} y Centre y.
 * @param {string} color Petal colour.
 * @param {number} seed Seed.
 * @returns {SVGElement}
 */
function flower(x, y, color, seed) {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (i * 2 * Math.PI) / 5;
    return inked(sketchEllipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 7, seed + i, 0.6), color, { 'stroke-width': 2 });
  });
  return svg('g', {}, [svg('path', { d: `M${x} ${y + 8} L${x} ${y + 34}`, class: 'ink-line' }), ...petals,
    inked(sketchEllipse(x, y, 5, 5, seed + 9, 0.4), C.butter, { 'stroke-width': 2 })]);
}

/** Drawing factories per background id. */
const SCENES = {
  papier: () => [],
  ballettsaal: () => [
    band(C.creme),
    band(C.lavendel, 430, 200, { opacity: 0.45 }),
    ...[0, 1, 2, 3].map((i) => inked(sketchPath([{ x: 70 + i * 230, y: 90 }, { x: 260 + i * 230, y: 90 },
      { x: 260 + i * 230, y: 400 }, { x: 70 + i * 230, y: 400 }], { seed: 1100 + i, wobble: 1.5 }), C.himmel)),
    ...[0, 1, 2, 3].map((i) => svg('path', { d: `M${110 + i * 230} 360 L${200 + i * 230} 140`, stroke: C.weiss,
      'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.8 })),
    svg('path', { d: 'M0 470 L1024 470', class: 'ink-line', 'stroke-width': 9 }),
    ...[150, 500, 850].map((x) => svg('path', { d: `M${x} 470 L${x} 520`, class: 'ink-line', 'stroke-width': 6 })),
    band(C.holz, 630, 140),
    ...[0, 1, 2, 3, 4, 5].map((i) => svg('path', { d: `M${i * 190 + 40} 630 L${i * 190 - 60} 768`, class: 'ink-line thin', opacity: 0.6 })),
    svg('path', { d: 'M0 630 L1024 630', class: 'ink-line' }),
  ],
  blumenwiese: () => {
    const rnd = seeded(1200);
    const colors = [C.rosa, C.lavendel, C.butter, C.pfirsich];
    return [
      band(C.himmel),
      inked(sketchEllipse(880, 120, 62, 62, 1201, 2), C.butter),
      cloud(220, 130, 1, 1202), cloud(620, 90, 0.8, 1205),
      hill(520, 30, C.salbei, 1),
      hill(620, 22, C.wiese, 2),
      ...Array.from({ length: 14 }, (_, i) => flower(40 + i * 72 + rnd() * 30, 640 + rnd() * 80, colors[i % 4], 1210 + i * 10)),
    ];
  },
  sternenhimmel: () => {
    const rnd = seeded(1300);
    const stars = Array.from({ length: 26 }, (_, i) => inked(sketchStar(30 + rnd() * 964, 20 + rnd() * 420,
      7 + rnd() * 6, 3, 5, 1310 + i), C.butter, { 'stroke-width': 1.5 }));
    return [
      band(C.nacht),
      inked('M880 60 C820 70 790 140 820 190 C850 240 920 250 960 210 C900 214 860 170 868 120 C872 96 880 76 880 60 Z', C.butter),
      ...stars,
      svg('g', { class: 'twinkles' }, [sparkle(180, 120, 12, 'sparkle twinkle t0'), sparkle(520, 70, 10, 'sparkle twinkle t1'),
        sparkle(700, 300, 12, 'sparkle twinkle t2'), sparkle(330, 360, 9, 'sparkle twinkle t1')]),
      hill(600, 26, C.nachthuegel, 3),
      hill(680, 18, C.nachthuegel2, 4),
    ];
  },
  unterwasser: () => {
    const rnd = seeded(1400);
    return [
      band(C.himmel),
      band(C.wasser, 180, 588, { opacity: 0.6 }),
      band(C.petrol, 420, 348, { opacity: 0.35 }),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const x = 60 + i * 150;
        return svg('path', { d: `M${x} 768 Q${x - 30} 690 ${x} 620 Q${x + 30} 560 ${x} 500`, fill: 'none', stroke: C.salbei,
          'stroke-width': 14, 'stroke-linecap': 'round' });
      }),
      ...Array.from({ length: 12 }, (_, i) => svg('circle', { cx: 40 + rnd() * 944, cy: 200 + rnd() * 400, r: 6 + rnd() * 10,
        fill: 'none', stroke: C.weiss, 'stroke-width': 3, opacity: 0.85, 'data-i': i })),
      ...[[160, 300, C.rosa], [840, 380, C.butter], [700, 230, C.pfirsich]].map(([x, y, col], i) => svg('g', {}, [
        inked(sketchEllipse(Number(x), Number(y), 46, 26, 1420 + i), String(col)),
        inked(`M${Number(x) + 40} ${y} L${Number(x) + 76} ${Number(y) - 22} L${Number(x) + 76} ${Number(y) + 22} Z`, String(col)),
        svg('circle', { cx: Number(x) - 22, cy: Number(y) - 6, r: 4, fill: C.tinte }),
      ])),
      hill(720, 14, C.pfirsich, 5),
    ];
  },
  buehne: () => [
    band(C.buehnenwand),
    svg('path', { d: 'M260 0 L140 768 L420 768 Z', fill: C.butter, opacity: 0.22 }),
    svg('path', { d: 'M764 0 L604 768 L884 768 Z', fill: C.butter, opacity: 0.22 }),
    band(C.holz, 640, 128),
    svg('path', { d: 'M0 640 L1024 640', class: 'ink-line' }),
    inked(sketchPath([{ x: -10, y: -10 }, { x: 190, y: -10 }, { x: 150, y: 300 }, { x: 110, y: 700 }, { x: -10, y: 700 }],
      { seed: 1501, wobble: 2 }), C.rosa),
    inked(sketchPath([{ x: 1034, y: -10 }, { x: 834, y: -10 }, { x: 874, y: 300 }, { x: 914, y: 700 }, { x: 1034, y: 700 }],
      { seed: 1502, wobble: 2 }), C.rosa),
    ...[40, 90, 140, 884, 934, 984].map((x) => svg('path', { d: `M${x} 10 Q${x + 12} 340 ${x - 6} 690`, class: 'ink-line thin', opacity: 0.7 })),
    inked(sketchPath([{ x: -10, y: -10 }, { x: 1034, y: -10 }, { x: 1034, y: 70 }, { x: 512, y: 100 }, { x: -10, y: 70 }],
      { seed: 1503, wobble: 2 }), C.rosa),
  ],
  regenbogenland: () => [
    band(C.himmel),
    ...[[C.rosa, 430], [C.pfirsich, 395], [C.butter, 360], [C.salbei, 325], [C.petrol, 290], [C.lavendel, 255]].map(([col, r]) =>
      svg('path', { d: `M${512 - Number(r)} 700 A${r} ${r} 0 0 1 ${512 + Number(r)} 700`, fill: 'none', stroke: String(col),
        'stroke-width': 36 })),
    cloud(120, 620, 1.3, 1601), cloud(900, 610, 1.4, 1604),
    cloud(300, 120, 0.8, 1607), cloud(760, 160, 0.7, 1610),
    hill(700, 16, C.salbei, 6),
  ],
};

/**
 * Draws a background.
 * @param {string} id Background id (unknown ids fall back to the first one).
 * @param {string} [cls] CSS class.
 * @returns {SVGElement}
 */
export function drawBackground(id, cls = 'bg-art') {
  const make = SCENES[id] || SCENES[BACKGROUNDS[0].id];
  const root = svgRoot(`0 0 ${W} ${H}`, cls, make());
  root.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  return root;
}
