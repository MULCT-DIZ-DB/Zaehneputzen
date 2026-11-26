// @ts-check
/**
 * Colouring screen: picture (paint layer under the line art), colour wheel, tools
 * (pen, brush, spray, bucket, eraser), sizes, undo and clear. Paint mixes like real paint.
 * @module screens/paint
 */
import { TEXT, PAINT, PALETTE } from '../config.js';
import { el, svg, svgRoot, clear } from '../dom.js';
import { icon } from '../art.js';
import { createBuffer, applyDab, erase, spray, floodFill, render, createUndo, paletteColors, rybToRgb } from '../paint/engine.js';
import { drawLineArt, lineMask, picturePaths } from '../paint/templates.js';
import { deliverFile } from '../backup.js';
import { dateKey } from '../rewards.js';
import { loadPicture, savePicture } from '../paint/store.js';
import { makeScreen, textButton } from './base.js';

/** Colour wheel geometry (viewBox units): ring borders from the centre outwards. */
const WHEEL = { r: 130, rings: [130, 98, 66, 36] };

/**
 * Annular sector path (one field of the colour wheel).
 * @param {number} r0 Inner radius.
 * @param {number} r1 Outer radius.
 * @param {number} a0 Start angle (rad).
 * @param {number} a1 End angle (rad).
 * @returns {string}
 */
function sector(r0, r1, a0, a1) {
  const p = (r, a) => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}

/**
 * Colour wheel like a painter's colour circle: 12 hues, 3 rings, white in the centre.
 * @param {(id: string) => void} onPick Called with the colour id.
 * @returns {SVGElement}
 */
function colorWheel(onPick) {
  const step = (Math.PI * 2) / PAINT.hues.length;
  const fields = paletteColors().map((c) => {
    const [r, g, b] = rybToRgb(c.ryb);
    const d = c.ring < 0
      ? `M0 ${-WHEEL.rings[3]} A${WHEEL.rings[3]} ${WHEEL.rings[3]} 0 1 1 0 ${WHEEL.rings[3]} A${WHEEL.rings[3]} ${WHEEL.rings[3]} 0 1 1 0 ${-WHEEL.rings[3]} Z`
      : sector(WHEEL.rings[c.ring + 1], WHEEL.rings[c.ring], -Math.PI / 2 - step / 2 + c.hue * step, -Math.PI / 2 + step / 2 + c.hue * step);
    const seg = svg('path', { d, fill: `rgb(${r},${g},${b})`, class: 'wheel-seg', 'data-color': c.id });
    seg.addEventListener('pointerdown', (e) => { e.preventDefault(); onPick(c.id); });
    return seg;
  });
  return svgRoot(`${-WHEEL.r - 6} ${-WHEEL.r - 6} ${WHEEL.r * 2 + 12} ${WHEEL.r * 2 + 12}`, 'color-wheel', fields);
}

/**
 * Creates the colouring screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createPaintScreen(ctx) {
  const { section, body } = makeScreen('paint', { title: TEXT.paint, back: () => ctx.show('paintmenu') });
  const { width: W, height: H } = PAINT;
  const canvas = /** @type {HTMLCanvasElement} */ (el('canvas', { cls: 'paint-layer', attrs: { width: W, height: H } }));
  const g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const image = g.createImageData(W, H);
  const lineBox = el('div', { cls: 'line-box' });
  const stageEl = el('div', { cls: 'paint-stage' }, [canvas, lineBox]);
  const stageWrap = el('div', { cls: 'paint-stage-wrap' }, [stageEl]);
  const colors = new Map(paletteColors().map((c) => [c.id, c.ryb]));
  const wheel = colorWheel((id) => select('color', id));
  const toolBtns = PAINT.tools.map((t) => el('button', { cls: 'btn tool-btn', attrs: { type: 'button', 'data-tool': t.id, 'aria-label': t.name },
    on: { click: () => select('tool', t.id) } }, [icon(/** @type {any} */ (t.icon)), el('span', { text: t.name })]));
  const sizeBtns = PAINT.sizes.map((s) => el('button', { cls: 'btn size-btn', attrs: { type: 'button', 'data-size': s.id, 'aria-label': s.name },
    on: { click: () => select('size', s.id) } }, [el('span', { cls: 'size-dot', attrs: { style: `--dot: ${Math.round(8 * s.scale + 6)}px` } })]));
  const confirm = el('div', { cls: 'paint-confirm', id: 'paint-clear-confirm' }, [el('div', { cls: 'gate-card' }, [
    el('p', { cls: 'gate-title', text: TEXT.paintClearAsk }),
    el('div', { cls: 'gate-row' }, [
      textButton(TEXT.paintYes, () => { confirm.hidden = true; clearAll(); }, 'btn-danger', 'btn-paint-clear-yes'),
      textButton(TEXT.paintNo, () => { confirm.hidden = true; }, '', 'btn-paint-clear-no'),
    ]),
  ])]);
  confirm.hidden = true;
  const actions = el('div', { cls: 'paint-actions' }, [
    el('button', { cls: 'btn tool-btn', id: 'btn-paint-undo', attrs: { type: 'button', 'aria-label': TEXT.paintUndo },
      on: { click: () => undoStep() } }, [icon('rueckgaengig'), el('span', { text: TEXT.paintUndo })]),
    el('button', { cls: 'btn tool-btn', id: 'btn-paint-clear', attrs: { type: 'button', 'aria-label': TEXT.paintClear },
      on: { click: () => { confirm.hidden = false; } } }, [icon('muell'), el('span', { text: TEXT.paintClear })]),
    el('button', { cls: 'btn tool-btn', id: 'btn-paint-save', attrs: { type: 'button', 'aria-label': TEXT.paintSave },
      on: { click: () => { savePng(); } } }, [icon('speichern'), el('span', { text: TEXT.paintSave })]),
  ]);
  body.append(el('div', { cls: 'paint-layout' }, [stageWrap, el('div', { cls: 'paint-panel' }, [
    wheel, el('div', { cls: 'tool-row' }, toolBtns), el('div', { cls: 'size-row' }, sizeBtns), actions,
  ])]), confirm);

  /**
   * Sizes the picture to the largest area with the exact picture proportions that fits the free space.
   * @returns {void}
   */
  function fitStage() {
    const r = stageWrap.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const scale = Math.min(r.width / W, r.height / H);
    stageEl.style.width = `${Math.floor(W * scale)}px`;
    stageEl.style.height = `${Math.floor(H * scale)}px`;
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(fitStage).observe(stageWrap);
  window.addEventListener('resize', fitStage);

  let buf = createBuffer(W, H);
  let mask = new Uint8Array(W * H);
  const undo = createUndo();
  let picture = '';
  const current = { color: 'rot-1', tool: 'pinsel', size: 'mittel' };
  /** @type {{x0: number, y0: number, x1: number, y1: number}|null} */ let dirty = null;
  let frame = 0;
  let saveTimer = 0;
  /** @type {{x: number, y: number}|null} */ let last = null;
  let sprayLoop = 0;

  /**
   * Updates the selected colour, tool or size.
   * @param {'color'|'tool'|'size'} kind What to change.
   * @param {string} id New value.
   * @returns {void}
   */
  function select(kind, id) {
    current[kind] = id;
    if (kind === 'color' && current.tool === 'radierer') current.tool = 'pinsel';
    wheel.querySelectorAll('.wheel-seg').forEach((s) => s.classList.toggle('selected', s.getAttribute('data-color') === current.color));
    toolBtns.forEach((b) => b.classList.toggle('selected', b.dataset.tool === current.tool));
    sizeBtns.forEach((b) => b.classList.toggle('selected', b.dataset.size === current.size));
    const sel = wheel.querySelector('.wheel-seg.selected');
    if (sel) wheel.append(sel); // drawn last, so its outline is fully visible
  }

  /**
   * Marks an area for redrawing in the next animation frame.
   * @param {{x0: number, y0: number, x1: number, y1: number}|null} r Changed area.
   * @returns {void}
   */
  function markDirty(r) {
    if (!r) return;
    dirty = dirty ? { x0: Math.min(dirty.x0, r.x0), y0: Math.min(dirty.y0, r.y0), x1: Math.max(dirty.x1, r.x1), y1: Math.max(dirty.y1, r.y1) } : r;
    if (!frame) frame = window.requestAnimationFrame(flush);
  }

  /** Draws the changed area onto the canvas. @returns {void} */
  function flush() {
    frame = 0;
    if (!dirty) return;
    render(buf, image, dirty);
    g.putImageData(image, 0, 0, dirty.x0, dirty.y0, dirty.x1 - dirty.x0 + 1, dirty.y1 - dirty.y0 + 1);
    dirty = null;
  }

  /** Redraws the whole picture. @returns {void} */
  function redrawAll() {
    markDirty({ x0: 0, y0: 0, x1: W - 1, y1: H - 1 });
  }

  /**
   * Radius of the current tool and size.
   * @returns {number}
   */
  function radius() {
    const tool = PAINT.tools.find((t) => t.id === current.tool);
    const size = PAINT.sizes.find((s) => s.id === current.size);
    return (tool ? tool.radius : 10) * (size ? size.scale : 1);
  }

  /**
   * Applies the current tool at one point.
   * @param {number} x Picture x.
   * @param {number} y Picture y.
   * @returns {void}
   */
  function dab(x, y) {
    const ryb = /** @type {number[]} */ (colors.get(current.color));
    const r = radius();
    if (current.tool === 'radierer') markDirty(erase(buf, x, y, r));
    else if (current.tool === 'spray') markDirty(spray(buf, x, y, r, ryb, Math.random));
    else markDirty(applyDab(buf, x, y, r, ryb, { hard: current.tool === 'stift' }));
  }

  /**
   * Paints dabs along a line (no gaps in fast strokes).
   * @param {{x: number, y: number}} a From.
   * @param {{x: number, y: number}} b To.
   * @returns {void}
   */
  function strokeTo(a, b) {
    const step = Math.max(1, radius() * PAINT.dabSpacing);
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let i = 1; i <= n; i += 1) dab(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n);
  }

  /**
   * Pointer position in picture coordinates.
   * @param {PointerEvent} e Pointer event.
   * @returns {{x: number, y: number}}
   */
  function toPicture(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  /** Keeps spraying while the finger rests on the picture. @returns {void} */
  function sprayTick() {
    if (!last || current.tool !== 'spray') { sprayLoop = 0; return; }
    dab(last.x, last.y);
    sprayLoop = window.requestAnimationFrame(sprayTick);
  }

  stageEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { stageEl.setPointerCapture(e.pointerId); } catch { /* drawing still works inside the picture */ }
    const p = toPicture(e);
    undo.push(buf);
    if (current.tool === 'eimer') {
      markDirty(floodFill(buf, mask, p.x, p.y, /** @type {number[]} */ (colors.get(current.color))));
      scheduleSave();
      return;
    }
    last = p;
    dab(p.x, p.y);
    if (current.tool === 'spray' && !sprayLoop) sprayLoop = window.requestAnimationFrame(sprayTick);
  });
  stageEl.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = toPicture(e);
    if (current.tool === 'spray') dab(p.x, p.y);
    else strokeTo(last, p);
    last = p;
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => stageEl.addEventListener(ev, () => {
    if (last) scheduleSave();
    last = null;
  }));

  /** Saves a moment after the last stroke. @returns {void} */
  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, PAINT.saveDelayMs);
  }

  /** Saves right away (e.g. when leaving the screen). @returns {void} */
  function saveNow() {
    window.clearTimeout(saveTimer);
    if (!picture) return;
    const id = picture;
    savePicture(id, buf).then(() => { section.dataset.saved = id; });
  }

  /**
   * Hands the painting out as a PNG (white paper, paint, black lines on top): share sheet on the iPad
   * (e.g. 'Bild sichern' into Fotos), download elsewhere. File name: <picture>-<date>.png.
   * @returns {Promise<void>}
   */
  async function savePng() {
    if (!picture) return;
    flush();
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const o = /** @type {CanvasRenderingContext2D} */ (out.getContext('2d'));
    o.fillStyle = PALETTE.weiss;
    o.fillRect(0, 0, W, H);
    o.drawImage(canvas, 0, 0);
    o.strokeStyle = PALETTE.tinte;
    o.lineWidth = PAINT.lineWidth;
    o.lineCap = 'round';
    o.lineJoin = 'round';
    picturePaths(picture).forEach((d) => o.stroke(new Path2D(d)));
    const name = `${picture}-${dateKey(new Date())}.png`;
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (blob) await deliverFile(/** @type {Blob} */ (blob), name);
  }

  /** One step back. @returns {void} */
  function undoStep() {
    if (undo.pop(buf)) {
      redrawAll();
      scheduleSave();
    }
  }

  /** Removes all paint (after confirmation). @returns {void} */
  function clearAll() {
    undo.push(buf);
    buf.pig.fill(0);
    buf.cov.fill(0);
    redrawAll();
    scheduleSave();
  }

  return {
    name: 'paint',
    el: section,
    /** @param {string} id Picture id. */
    enter(id) {
      picture = PAINT.pictures.some((p) => p.id === id) ? id : PAINT.pictures[0].id;
      delete section.dataset.loaded;
      delete section.dataset.saved;
      const header = section.querySelector('.screen-header h1');
      const meta = PAINT.pictures.find((p) => p.id === picture);
      if (header && meta) header.textContent = meta.name;
      clear(lineBox);
      lineBox.append(drawLineArt(picture));
      window.requestAnimationFrame(fitStage);
      mask = lineMask(picture);
      buf = createBuffer(W, H);
      undo.clear();
      select('color', current.color);
      g.clearRect(0, 0, W, H);
      const wanted = picture;
      loadPicture(wanted).then((saved) => {
        if (picture !== wanted) return;
        if (saved && saved.pig.length === buf.pig.length) {
          buf.pig.set(saved.pig);
          buf.cov.set(saved.cov);
        }
        redrawAll();
        flush();
        section.dataset.loaded = wanted;
      });
    },
    leave() {
      last = null;
      window.cancelAnimationFrame(sprayLoop);
      sprayLoop = 0;
      saveNow();
      picture = '';
    },
  };
}
