// @ts-check
/**
 * Mini game „Klavier“: notes glide down to 8 big piano keys; tap the key when a note
 * reaches the line. Falling is a transform-only Web Animation synced to the song clock
 * (no per-frame script); hits are judged by time. Also a free-play mode.
 * @module screens/game-piano
 */
import { TEXT, PIANO, PALETTE } from '../config.js';
import { el, clear, replayClass } from '../dom.js';
import { SONGS } from '../songs.js';
import { buildChart, judgeTap, starsFor, fallProgressMs } from '../games/piano.js';
import { makeGameScreen, playOpen } from './gamekit.js';
import { textButton } from './base.js';

/**
 * Creates the piano screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createPianoGameScreen(ctx) {
  /** @type {'menu'|'song'|'free'|'result'} */ let mode = 'menu';
  const kit = makeGameScreen(ctx, 'game-piano', TEXT.pianoGame, {
    onExpire: () => { if (mode !== 'song') kit.showTimeUp(); },
  });
  const hitsText = el('p', { cls: 'game-status', id: 'piano-hits' });
  const lanes = el('div', { cls: 'piano-lanes' }, PIANO.keys.map((_, i) => el('div', { cls: 'piano-lane',
    attrs: { 'data-lane': i, style: `--key-color: ${PALETTE[PIANO.keyColors[i]]}` } })));
  const keys = PIANO.keys.map((midi, lane) => el('button', {
    cls: 'btn piano-key', attrs: { type: 'button', 'data-lane': lane, 'aria-label': PIANO.keyNames[lane],
      style: `--key-color: ${PALETTE[PIANO.keyColors[lane]]}` },
  }, [el('span', { text: PIANO.keyNames[lane] })]));
  const resultText = el('p', { cls: 'piano-stars' });
  const result = el('div', { cls: 'piano-result', id: 'piano-result' }, [resultText, el('div', { cls: 'piano-result-buttons' }, [
    textButton(TEXT.pianoAgain, () => song && startSong(song), 'btn-big', 'btn-piano-again'),
    textButton(TEXT.pianoOther, () => showMenu(), 'btn-big', 'btn-piano-other'),
  ])]);
  const menu = el('div', { cls: 'piano-menu' }, [
    el('p', { cls: 'game-status', text: TEXT.pianoPick }),
    el('div', { cls: 'song-list' }, [
      ...SONGS.map((s) => textButton(s.name, () => startSong(s), 'song-btn')),
      textButton(TEXT.pianoFree, () => startFree(), 'song-btn btn-free', 'btn-piano-free'),
    ]),
  ]);
  menu.querySelectorAll('.song-btn:not(.btn-free)').forEach((b, i) => b.setAttribute('data-song', SONGS[i].id));
  const play = el('div', { cls: 'piano-play' }, [hitsText, lanes, el('div', { cls: 'piano-keys' }, keys), result]);
  kit.body.append(menu, play);

  /** @type {import('../songs.js').Song|null} */ let song = null;
  /** @type {import('../games/piano.js').ChartNote[]} */ let chart = [];
  /** @type {Set<number>} */ let hits = new Set();
  /** @type {Map<number, HTMLElement>} */ const noteEls = new Map();
  /** @type {number[]} */ let timers = [];
  let startedAt = 0;

  /** Cancels running timers and removes falling notes. @returns {void} */
  function stopSong() {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    noteEls.clear();
    kit.body.querySelectorAll('.piano-note').forEach((n) => n.remove());
  }

  /**
   * Switches between menu, song, free play and result view.
   * @param {'menu'|'song'|'free'|'result'} next Mode.
   * @returns {void}
   */
  function setMode(next) {
    mode = next;
    menu.hidden = next !== 'menu';
    play.hidden = next === 'menu';
    result.hidden = next !== 'result';
    hitsText.hidden = next === 'free';
  }

  /** Shows the song menu. @returns {void} */
  function showMenu() {
    stopSong();
    setMode('menu');
    if (!playOpen(ctx)) kit.showTimeUp();
  }

  /** Free play: just the keys. @returns {void} */
  function startFree() {
    stopSong();
    setMode('free');
  }

  /**
   * Lets one note fall in its lane. The animation is synced to the song clock: if the
   * spawn timer fired late (busy iPad), the note starts further down, so it always
   * crosses the line exactly at its hit time. The lane height is measured now, so a
   * rotation during the song is handled.
   * @param {number} i Chart index.
   * @returns {void}
   */
  function spawnNote(i) {
    const n = chart[i];
    const total = PIANO.travelMs * PIANO.overshoot;
    const fallPx = lanes.clientHeight * PIANO.overshoot;
    const note = el('div', { cls: 'piano-note', attrs: { 'data-i': i, style: `--key-color: ${PALETTE[PIANO.keyColors[n.lane]]}` } });
    lanes.children[n.lane].append(note);
    noteEls.set(i, note);
    const late = fallProgressMs(n.timeMs, performance.now() - startedAt);
    const anim = note.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${Math.round(fallPx)}px)` }],
      { duration: total, easing: 'linear', fill: 'forwards' });
    anim.currentTime = late;
    timers.push(window.setTimeout(() => { note.remove(); noteEls.delete(i); }, Math.max(0, total - late)));
    timers.push(window.setTimeout(() => { if (!hits.has(i)) note.classList.add('missed'); },
      Math.max(0, PIANO.travelMs + PIANO.hitWindowMs + 1 - late)));
  }

  /**
   * Starts a song.
   * @param {import('../songs.js').Song} s Song.
   * @returns {void}
   */
  function startSong(s) {
    stopSong();
    song = s;
    chart = buildChart(s);
    hits = new Set();
    setMode('song');
    hitsText.textContent = `0 / ${chart.length} ${TEXT.pianoHits}`;
    startedAt = performance.now();
    chart.forEach((n, i) => timers.push(window.setTimeout(() => spawnNote(i), Math.max(0, n.timeMs - PIANO.travelMs))));
    const end = chart[chart.length - 1].timeMs + PIANO.endDelayMs;
    timers.push(window.setTimeout(finishSong, end));
  }

  /** Shows the stars at the end of a song. @returns {void} */
  function finishSong() {
    stopSong();
    const stars = starsFor(hits.size, chart.length);
    resultText.textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${hits.size} / ${chart.length} ${TEXT.pianoHits}`;
    setMode('result');
    ctx.music.fanfare();
    kit.roundOver();
  }

  /**
   * Key pressed: play the tone, and in a song check for a hit.
   * @param {number} lane Key index.
   * @returns {void}
   */
  function press(lane) {
    const midi = PIANO.keys[lane];
    ctx.music.tone(midi, PIANO.toneSec);
    kit.section.dataset.last = String(midi);
    replayClass(keys[lane], 'pressed');
    replayClass(lanes.children[lane], 'touched');
    if (mode !== 'song') return;
    const i = judgeTap(chart, hits, lane, performance.now() - startedAt);
    if (i === null) return;
    hits.add(i);
    hitsText.textContent = `${hits.size} / ${chart.length} ${TEXT.pianoHits}`;
    const note = noteEls.get(i);
    if (note) note.classList.add('hit');
    replayClass(lanes.children[lane], 'sparkle-lane');
  }

  keys.forEach((k, lane) => k.addEventListener('pointerdown', (e) => { e.preventDefault(); press(lane); }));

  return {
    name: 'game-piano',
    el: kit.section,
    enter() {
      kit.startGuard();
      clear(resultText);
      showMenu();
    },
    leave() {
      kit.stopGuard();
      stopSong();
    },
  };
}
