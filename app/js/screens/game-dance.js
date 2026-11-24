// @ts-check
/**
 * Mini game „Tanzschritte merken“: the dancer shows poses, the child repeats them.
 * @module screens/game-dance
 */
import { TEXT, DANCE_GAME, PIANO } from '../config.js';
import { el, clear } from '../dom.js';
import { icon } from '../art.js';
import { drawDancer } from '../dancer.js';
import { makeSequence, checkTap, nextLength } from '../games/dancememory.js';
import { makeGameScreen, playOpen } from './gamekit.js';
import { sequinStatesOf } from './start.js';

/**
 * Creates the dance memory screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createDanceGameScreen(ctx) {
  const kit = makeGameScreen(ctx, 'game-dance', TEXT.danceGame);
  const status = el('p', { cls: 'game-status', id: 'dance-status' });
  const level = el('p', { cls: 'game-level', id: 'dance-level' });
  const stage = el('div', { cls: 'dance-game-stage' });
  const buttons = DANCE_GAME.poses.map((p) => el('button', {
    cls: 'btn pose-btn', attrs: { type: 'button', 'data-pose': p.id, 'aria-label': p.name },
    on: { click: () => tap(p.id) },
  }, [icon(/** @type {any} */ (p.icon), 'pose-icon'), el('span', { text: p.name })]));
  kit.body.append(el('div', { cls: 'dance-game-layout' }, [
    stage,
    el('div', { cls: 'dance-game-panel' }, [status, level, el('div', { cls: 'pose-grid' }, buttons)]),
  ]));

  /** @type {SVGElement|null} */ let dancer = null;
  /** @type {string[]} */ let sequence = [];
  let length = DANCE_GAME.startLength;
  let index = 0;
  /** @type {number[]} */ let timers = [];

  /**
   * Runs `fn` after `ms` (remembered so leaving the screen cancels it).
   * @param {number} ms Delay.
   * @param {() => void} fn Callback.
   * @returns {void}
   */
  const later = (ms, fn) => { timers.push(window.setTimeout(fn, ms)); };

  /**
   * Sets the game phase (also exposed as data attribute).
   * @param {'show'|'input'|'feedback'} phase Phase.
   * @returns {void}
   */
  function setPhase(phase) {
    kit.section.dataset.phase = phase;
    buttons.forEach((b) => b.classList.toggle('waiting', phase !== 'input'));
  }

  /**
   * Shows one pose on the dancer and its button for a moment, with its tone.
   * @param {string} id Pose id.
   * @param {number} ms Duration.
   * @returns {void}
   */
  function flashPose(id, ms) {
    const pose = DANCE_GAME.poses.find((p) => p.id === id);
    const button = buttons.find((b) => b.dataset.pose === id);
    if (!pose || !dancer || !button) return;
    DANCE_GAME.poses.forEach((p) => dancer.classList.remove(p.css));
    dancer.classList.add(pose.css);
    button.classList.add('lit');
    ctx.music.tone(pose.note, PIANO.toneSec);
    later(ms, () => { dancer.classList.remove(pose.css); button.classList.remove('lit'); });
  }

  /** Plays the current sequence, then lets the child repeat it. @returns {void} */
  function showSequence() {
    setPhase('show');
    index = 0;
    kit.section.dataset.sequence = sequence.join(',');
    status.textContent = TEXT.danceWatch;
    level.textContent = `${TEXT.danceSteps}: ${sequence.length}`;
    const step = DANCE_GAME.showMs + DANCE_GAME.gapMs;
    sequence.forEach((id, i) => later(DANCE_GAME.introMs + i * step, () => flashPose(id, DANCE_GAME.showMs)));
    later(DANCE_GAME.introMs + sequence.length * step, () => {
      setPhase('input');
      status.textContent = TEXT.danceYou;
    });
  }

  /** Starts a new, longer sequence. @returns {void} */
  function newRound() {
    sequence = makeSequence(length, Math.random);
    showSequence();
  }

  /**
   * Handles a tap on a pose button.
   * @param {string} id Tapped pose id.
   * @returns {void}
   */
  function tap(id) {
    if (kit.section.dataset.phase !== 'input') return;
    flashPose(id, DANCE_GAME.showMs / 2);
    const result = checkTap(sequence, index, id);
    if (result === 'next') {
      index += 1;
      return;
    }
    setPhase('feedback');
    if (result === 'wrong') {
      status.textContent = TEXT.danceAgain;
      if (!kit.roundOver()) later(DANCE_GAME.feedbackMs, showSequence);
      return;
    }
    const state = ctx.getState();
    if (sequence.length > state.gameStats.danceBest) {
      ctx.setState({ ...state, gameStats: { ...state.gameStats, danceBest: sequence.length } });
    }
    status.textContent = TEXT.danceGreat;
    ctx.music.chime();
    if (kit.roundOver()) return;
    length = nextLength(length);
    later(DANCE_GAME.feedbackMs, newRound);
  }

  return {
    name: 'game-dance',
    el: kit.section,
    enter() {
      const state = ctx.getState();
      clear(stage);
      dancer = drawDancer({ wearing: state.wearing, sequinStates: sequinStatesOf(state), cls: 'game-dancer' });
      stage.append(dancer);
      length = DANCE_GAME.startLength;
      kit.startGuard();
      if (!playOpen(ctx)) {
        kit.showTimeUp();
        return;
      }
      newRound();
    },
    leave() {
      kit.stopGuard();
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    },
  };
}
