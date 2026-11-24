// @ts-check
/**
 * Brushing screen: mouth with active zone, moving brush, unlockable background,
 * progress ring, zone change hint and pause.
 * @module screens/brush
 */
import { TEXT, TIMER, ZONES, ZONE_ORDERS } from '../config.js';
import { el, svg, svgRoot, replayClass, clear } from '../dom.js';
import { drawMouth, ZONE_CENTERS, SPOTS_PER_ZONE, icon } from '../art.js';
import { drawBackground } from '../backgrounds.js';
import { ZoneTimer, zoneWatcher } from '../timer.js';
import { completeSession } from '../rewards.js';
import { openPlayWindow } from '../playtime.js';
import { makeScreen, iconButton } from './base.js';

const RING_R = 44;
const RING_LEN = 2 * Math.PI * RING_R;

/**
 * Progress ring (one per zone) plus footprints for finished zones.
 * @returns {{root: HTMLElement, set: (zoneIndex: number, progress: number) => void}}
 */
function progressRing() {
  const arc = svg('circle', { cx: 50, cy: 50, r: RING_R, class: 'ring-arc', 'stroke-dasharray': RING_LEN.toFixed(1) });
  const ring = svgRoot('0 0 100 100', 'ring', [svg('circle', { cx: 50, cy: 50, r: RING_R, class: 'ring-bg' }), arc]);
  const steps = ZONES.map(() => el('span', { cls: 'step' }, [icon('stern')]));
  const root = el('div', { cls: 'progress' }, [ring, el('div', { cls: 'steps' }, steps)]);
  return {
    root,
    set(zoneIndex, progress) {
      arc.setAttribute('stroke-dashoffset', (RING_LEN * (1 - progress)).toFixed(1));
      steps.forEach((s, i) => s.classList.toggle('done', i < zoneIndex));
    },
  };
}

/**
 * Creates the brushing screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createBrushScreen(ctx) {
  const { section, body } = makeScreen('brush');
  const mouth = drawMouth();
  const label = el('div', { cls: 'zone-label', id: 'zone-label' });
  const hint = el('div', { cls: 'switch-hint', id: 'switch-hint' });
  const go = el('div', { cls: 'go-pop', text: TEXT.go });
  const ring = progressRing();
  const bgLayer = el('div', { cls: 'brush-bg' });
  const pauseBtn = el('button', { cls: 'btn btn-pause', id: 'btn-pause', attrs: { type: 'button', 'aria-label': TEXT.pause } },
    [icon('pause')]);
  const resumeBtn = el('button', { cls: 'btn btn-big btn-resume', id: 'btn-resume', attrs: { type: 'button' },
    on: { click: () => setPaused(false) } }, [icon('play'), el('span', { text: TEXT.resume })]);
  const stopBtn = iconButton('kreuz', TEXT.stop, () => finish(false), 'btn-stop', { id: 'btn-stop' });
  const pausedBox = el('div', { cls: 'paused-box' }, [stopBtn, el('p', { cls: 'paused-title', text: TEXT.paused }), resumeBtn]);
  section.prepend(bgLayer);
  body.append(el('div', { cls: 'brush-top' }, [label, ring.root]), el('div', { cls: 'mouth-wrap' }, [mouth.root]),
    hint, go, pausedBox, pauseBtn);

  /** @type {ZoneTimer|null} */ let timer = null;
  let order = ZONE_ORDERS[0].order;
  let tick = 0;
  let hintTimer = 0;
  let spotKey = '';
  let watch = zoneWatcher(() => {});

  /**
   * Shows which zone is active / done and moves the brush there.
   * @param {number} index Position in the brushing order.
   * @returns {void}
   */
  function showZone(index) {
    const zone = order[index];
    label.textContent = ZONES[zone].label;
    mouth.zones.forEach((g, z) => {
      g.classList.toggle('active', z === zone);
      g.classList.toggle('done', order.indexOf(z) < index);
    });
    const c = ZONE_CENTERS[zone];
    mouth.brush.style.transform = `translate(${c.x}px, ${c.y}px)`;
    mouth.brushFlip.style.transform = `scale(${zone % 2 ? -1 : 1}, ${zone < 2 ? 1 : -1})`;
  }

  /**
   * Hides sugar spots of the active zone with brushing progress.
   * @param {number} index Position in order.
   * @param {number} progress Zone progress 0…1.
   * @returns {void}
   */
  function updateSpots(index, progress) {
    const gone = Math.floor(progress * (SPOTS_PER_ZONE + 1));
    const key = `${index}:${gone}`;
    if (key === spotKey) return;
    spotKey = key;
    mouth.zones.forEach((g, z) => {
      const pos = order.indexOf(z);
      g.querySelectorAll('.spot').forEach((s, k) => {
        s.classList.toggle('gone', pos < index || (pos === index && k < gone));
      });
    });
  }

  /**
   * Zone change: chime, label pop and hint text.
   * @param {number} index New position in order.
   * @returns {void}
   */
  function onZoneChange(index) {
    showZone(index);
    ctx.music.chime();
    hint.textContent = `${TEXT.switchTo} ${ZONES[order[index]].label}!`;
    replayClass(hint, 'show');
    replayClass(label, 'pop');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.remove('show'), TIMER.switchHintMs);
  }

  /** Timer tick: update the view. @returns {void} */
  function frame() {
    if (!timer) return;
    const now = performance.now();
    const st = timer.state(now);
    watch(st.zoneIndex);
    updateSpots(st.zoneIndex, st.zoneProgress);
    ring.set(st.zoneIndex, st.zoneProgress);
    if (st.done) finish(true);
  }

  /**
   * Ends the session and moves to the reward screen (or back to start).
   * @param {boolean} completed True if the full time was brushed.
   * @returns {void}
   */
  function finish(completed) {
    stopLoop();
    timer = null;
    ctx.music.stop();
    ctx.keeper.disable();
    if (!completed) {
      ctx.show('start');
      return;
    }
    ctx.music.fanfare();
    const brushed = openPlayWindow(ctx.getState(), Date.now()); // games open after every completed brushing
    const result = completeSession(brushed, { date: new Date(), completed: true, rng: Math.random });
    ctx.setState(result.state);
    ctx.show('reward', result.reward);
  }

  /** @returns {void} */
  function stopLoop() {
    window.clearInterval(tick);
    tick = 0;
  }

  /**
   * Pauses or resumes.
   * @param {boolean} paused Desired state.
   * @returns {void}
   */
  function setPaused(paused) {
    if (!timer || timer.isPaused() === paused) return;
    const now = performance.now();
    section.classList.toggle('paused', paused);
    if (paused) {
      timer.pause(now);
      ctx.music.suspend();
    } else {
      timer.resume(now);
      ctx.music.resume();
    }
  }

  pauseBtn.addEventListener('click', () => setPaused(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') setPaused(true);
  });

  return {
    name: 'brush',
    el: section,
    enter() {
      const state = ctx.getState();
      const found = ZONE_ORDERS.find((o) => o.id === state.settings.zoneOrder);
      order = (found || ZONE_ORDERS[0]).order;
      const totalSec = ctx.fast ? TIMER.fastTotalSec : state.settings.totalSec;
      timer = new ZoneTimer({ totalMs: totalSec * 1000, zoneCount: ZONES.length });
      watch = zoneWatcher(onZoneChange);
      spotKey = '';
      section.classList.remove('paused');
      if (bgLayer.dataset.bg !== state.background) {
        clear(bgLayer);
        bgLayer.append(drawBackground(state.background));
        bgLayer.dataset.bg = state.background;
      }
      showZone(0);
      ring.set(0, 0);
      replayClass(go, 'show');
      timer.start(performance.now());
      ctx.music.start();
      tick = window.setInterval(frame, TIMER.tickMs);
    },
    leave() {
      stopLoop();
      window.clearTimeout(hintTimer);
      hint.classList.remove('show');
    },
  };
}
