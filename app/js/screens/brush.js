// @ts-check
/**
 * Brushing screen after KAI: mouth with the active surface and jaw, brush with the matching
 * motion (back and forth / small circles / red-to-white), tooth cross-section, unlockable
 * background, progress ring, switch hint and pause.
 * @module screens/brush
 */
import { TEXT, TIMER, SURFACES } from '../config.js';
import { el, svg, svgRoot, replayClass, clear } from '../dom.js';
import { drawMouth, drawToothSection, BRUSH_POSES, SPOTS_PER_JAW, icon } from '../art.js';
import { drawBackground } from '../backgrounds.js';
import { ZoneTimer, zoneWatcher } from '../timer.js';
import { completeSession } from '../rewards.js';
import { openPlayWindow } from '../playtime.js';
import { planSteps, stepLabel, jawAt, jawProgress } from '../kai.js';
import { makeScreen, iconButton } from './base.js';

const RING_R = 44;
const RING_LEN = 2 * Math.PI * RING_R;
/** @type {('unten'|'oben')[]} */
const JAW_IDS = ['unten', 'oben'];

/**
 * Progress ring for the current step plus one star per step.
 * @returns {{root: HTMLElement, setCount: (n: number) => void, set: (index: number, progress: number) => void}}
 */
function progressRing() {
  const arc = svg('circle', { cx: 50, cy: 50, r: RING_R, class: 'ring-arc', 'stroke-dasharray': RING_LEN.toFixed(1) });
  const ring = svgRoot('0 0 100 100', 'ring', [svg('circle', { cx: 50, cy: 50, r: RING_R, class: 'ring-bg' }), arc]);
  const starBox = el('div', { cls: 'steps' });
  /** @type {HTMLElement[]} */ let stars = [];
  return {
    root: el('div', { cls: 'progress' }, [ring, starBox]),
    setCount(n) {
      clear(starBox);
      stars = Array.from({ length: n }, () => el('span', { cls: 'step' }, [icon('stern')]));
      starBox.append(...stars);
    },
    set(index, progress) {
      arc.setAttribute('stroke-dashoffset', (RING_LEN * (1 - progress)).toFixed(1));
      stars.forEach((s, i) => s.classList.toggle('done', i < index));
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
  const tooth = drawToothSection({ outer: TEXT.toothOuter, inner: TEXT.toothInner });
  const label = el('div', { cls: 'zone-label', id: 'zone-label' });
  const how = el('div', { cls: 'zone-how', id: 'zone-how' });
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
  body.append(
    el('div', { cls: 'brush-top' }, [tooth, el('div', { cls: 'zone-text' }, [label, how]), ring.root]),
    el('div', { cls: 'mouth-wrap' }, [mouth.root]),
    hint, go, pausedBox, pauseBtn,
  );

  /** @type {ZoneTimer|null} */ let timer = null;
  /** @type {import('../kai.js').Step[]} */ let steps = planSteps('');
  let tick = 0;
  let hintTimer = 0;
  let viewKey = '';
  let spotKey = '';
  let watch = zoneWatcher(() => {});

  /**
   * Shows the active surface and jaw: highlights, brush position and motion, tooth section.
   * Only touches the DOM when something changed (the jaw changes mid-step in 3-step mode).
   * @param {number} index Current step.
   * @param {number} progress Progress inside the step.
   * @returns {void}
   */
  function showStep(index, progress) {
    const step = steps[index];
    const jaw = jawAt(step, progress);
    const key = `${index}:${jaw}`;
    if (key === viewKey) return;
    viewKey = key;
    label.textContent = stepLabel(step);
    how.textContent = SURFACES[step.surface].how;
    mouth.root.dataset.surface = step.surface;
    mouth.root.dataset.jaw = jaw;
    tooth.dataset.face = step.surface;
    tooth.dataset.jaw = jaw;
    JAW_IDS.forEach((j) => mouth.jaws[j].classList.toggle('active', j === jaw));
    mouth.root.insertBefore(mouth.jaws[jaw], mouth.brush); // active jaw in front (matters when the mouth is closed)
    const pose = BRUSH_POSES[step.surface][jaw];
    mouth.brush.style.transform = `translate(${pose.x}px, ${pose.y}px)`;
    mouth.brushFlip.style.transform = `scale(1, ${pose.up ? 1 : -1})`;
    mouth.brushMotion.setAttribute('class', `brush-motion ${SURFACES[step.surface].motion}`);
  }

  /**
   * Sugar spots disappear and sparkles appear as each jaw gets clean.
   * @param {number} index Current step.
   * @param {number} progress Progress inside the step.
   * @returns {void}
   */
  function updateSpots(index, progress) {
    const gone = JAW_IDS.map((j) => Math.floor(jawProgress(steps, index, progress, j) * (SPOTS_PER_JAW + 1)));
    const key = gone.join(':');
    if (key === spotKey) return;
    spotKey = key;
    JAW_IDS.forEach((j, n) => {
      mouth.jaws[j].querySelectorAll('.spot').forEach((s, k) => s.classList.toggle('gone', k < gone[n]));
      mouth.jaws[j].classList.toggle('done', gone[n] > SPOTS_PER_JAW);
    });
  }

  /**
   * Step change: chime, label pop and hint text.
   * @param {number} index New step.
   * @returns {void}
   */
  function onStepChange(index) {
    ctx.music.chime();
    hint.textContent = `${TEXT.switchTo} ${stepLabel(steps[index])}!`;
    replayClass(hint, 'show');
    replayClass(label, 'pop');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.remove('show'), TIMER.switchHintMs);
  }

  /** Timer tick: update the view. @returns {void} */
  function frame() {
    if (!timer) return;
    const st = timer.state(performance.now());
    watch(st.zoneIndex);
    showStep(st.zoneIndex, st.zoneProgress);
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
      steps = planSteps(state.settings.brushPlan);
      const totalSec = ctx.fast ? TIMER.fastTotalSec : state.settings.totalSec;
      timer = new ZoneTimer({ totalMs: totalSec * 1000, zoneCount: steps.length });
      watch = zoneWatcher(onStepChange);
      viewKey = '';
      spotKey = '';
      section.classList.remove('paused');
      if (bgLayer.dataset.bg !== state.background) {
        clear(bgLayer);
        bgLayer.append(drawBackground(state.background));
        bgLayer.dataset.bg = state.background;
      }
      ring.setCount(steps.length);
      showStep(0, 0);
      updateSpots(0, 0);
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
