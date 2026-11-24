// @ts-check
/**
 * Mini game „Zuckerjagd“: sugar bugs pop up on the teeth; tap them away.
 * @module screens/game-sugar
 */
import { TEXT, SUGAR } from '../config.js';
import { el, svg, clear, replayClass } from '../dom.js';
import { drawMouth, drawBug, TOOTH_CENTERS } from '../art.js';
import { lifetimeAt, spawnDelayAt, canSpawn, pickTooth } from '../games/sugarhunt.js';
import { makeGameScreen, playOpen } from './gamekit.js';
import { textButton } from './base.js';

/**
 * Creates the sugar hunt screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createSugarGameScreen(ctx) {
  let running = false;
  const kit = makeGameScreen(ctx, 'game-sugar', TEXT.sugarGame, {
    onExpire: () => { if (!running) kit.showTimeUp(); },
  });
  const mouth = drawMouth();
  mouth.brush.remove();
  const bugLayer = svg('g', { class: 'bug-layer' });
  mouth.root.append(bugLayer);
  const count = el('span', { cls: 'sugar-count', id: 'sugar-count', text: '0' });
  const bar = el('div', { cls: 'sugar-bar' }, [el('div', { cls: 'sugar-bar-fill' })]);
  const startBtn = textButton(TEXT.sugarStart, () => startRound(), 'btn-big btn-sugar-start', 'btn-sugar-start');
  const resultText = el('p', { cls: 'sugar-result-text' });
  const result = el('div', { cls: 'sugar-result', id: 'sugar-result' }, [resultText,
    textButton(TEXT.sugarAgain, () => startRound(), 'btn-big', 'btn-sugar-again')]);
  kit.body.append(
    el('div', { cls: 'sugar-top' }, [el('p', { cls: 'game-status', text: TEXT.sugarHint }), el('span', { cls: 'sugar-score' }, [count]), bar]),
    el('div', { cls: 'sugar-mouth' }, [mouth.root, startBtn, result]),
  );

  /** @type {Map<number, SVGElement>} tooth index → bug */ const bugs = new Map();
  /** @type {number[]} */ let timers = [];
  let score = 0;
  let startedAt = 0;

  /**
   * Runs `fn` after `ms` (cancelled when the round ends or the screen is left).
   * @param {number} ms Delay.
   * @param {() => void} fn Callback.
   * @returns {void}
   */
  const later = (ms, fn) => { timers.push(window.setTimeout(fn, ms)); };

  /**
   * Removes a bug from its tooth.
   * @param {number} tooth Tooth index.
   * @returns {void}
   */
  function removeBug(tooth) {
    const bug = bugs.get(tooth);
    if (bug) bug.remove();
    bugs.delete(tooth);
  }

  /**
   * Bug tapped: puff, sparkle, count.
   * @param {number} tooth Tooth index.
   * @returns {void}
   */
  function hitBug(tooth) {
    const bug = bugs.get(tooth);
    if (!bug || !running) return;
    bugs.delete(tooth);
    bug.classList.add('puff');
    later(SUGAR.puffMs, () => bug.remove());
    score += 1;
    count.textContent = String(score);
    replayClass(count, 'pop');
    ctx.music.chime([SUGAR.hitNotes[score % SUGAR.hitNotes.length]]);
  }

  /** Lets a new bug appear and schedules the next one. @returns {void} */
  function spawn() {
    if (!running) return;
    const elapsed = performance.now() - startedAt;
    if (canSpawn(bugs.size)) {
      const tooth = pickTooth(Math.random, [...bugs.keys()]);
      if (tooth !== null) {
        const c = TOOTH_CENTERS[tooth];
        const bug = svg('g', { class: 'bug', transform: `translate(${c.x} ${c.y})`, 'data-tooth': tooth },
          [svg('g', { class: 'bug-pop' }, [drawBug(SUGAR.bugRadius, SUGAR.hitRadius)])]);
        bug.addEventListener('pointerdown', (e) => { e.preventDefault(); hitBug(tooth); });
        bugLayer.append(bug);
        bugs.set(tooth, bug);
        later(lifetimeAt(elapsed), () => { if (bugs.get(tooth) === bug) removeBug(tooth); });
      }
    }
    later(spawnDelayAt(elapsed), spawn);
  }

  /** Clears bugs and timers. @returns {void} */
  function stopRound() {
    running = false;
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    [...bugs.keys()].forEach(removeBug);
    clear(bugLayer);
    bar.classList.remove('running');
  }

  /** Starts a 45-second round. @returns {void} */
  function startRound() {
    stopRound();
    if (!playOpen(ctx)) {
      kit.showTimeUp();
      return;
    }
    score = 0;
    count.textContent = '0';
    startBtn.hidden = true;
    result.hidden = true;
    running = true;
    startedAt = performance.now();
    bar.style.setProperty('--round', `${SUGAR.roundMs}ms`);
    replayClass(bar, 'running');
    later(SUGAR.startDelayMs, spawn);
    later(SUGAR.roundMs, endRound);
  }

  /** Shows the result and saves the personal best. @returns {void} */
  function endRound() {
    stopRound();
    const state = ctx.getState();
    const best = Math.max(state.gameStats.sugarBest, score);
    if (best !== state.gameStats.sugarBest) ctx.setState({ ...state, gameStats: { ...state.gameStats, sugarBest: best } });
    resultText.textContent = `${TEXT.sugarResultA} ${score} ${TEXT.sugarResultB} (${TEXT.best}: ${best})`;
    result.hidden = false;
    ctx.music.fanfare();
    kit.roundOver();
  }

  return {
    name: 'game-sugar',
    el: kit.section,
    enter() {
      stopRound();
      count.textContent = '0';
      startBtn.hidden = false;
      result.hidden = true;
      kit.startGuard();
      if (!playOpen(ctx)) kit.showTimeUp();
    },
    leave() {
      kit.stopGuard();
      stopRound();
    },
  };
}
