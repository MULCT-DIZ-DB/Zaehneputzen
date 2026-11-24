// @ts-check
/**
 * Calm instrumental music and chimes generated with the Web Audio API
 * (original melody, no audio files, no lyrics). iOS only allows sound after a tap,
 * so `unlock()` must be called from a touch/click handler.
 * @module music
 */
import { MUSIC } from './config.js';

/**
 * Converts a MIDI note number to a frequency in Hz.
 * @param {number} midi MIDI note.
 * @returns {number}
 */
export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Builds the looping event list (melody notes + one chord per bar).
 * @returns {{events: {beat: number, kind: 'mel'|'chord', notes: number[], beats: number}[], loopBeats: number}}
 */
export function buildSong() {
  const events = [];
  let beat = 0;
  MUSIC.melody.forEach(([note, len]) => {
    if (note !== null) events.push({ beat, kind: /** @type {'mel'} */ ('mel'), notes: [note], beats: len });
    beat += len;
  });
  const loopBeats = beat;
  for (let bar = 0; bar * 4 < loopBeats; bar += 1) {
    events.push({ beat: bar * 4, kind: /** @type {'chord'} */ ('chord'), notes: MUSIC.chords[bar % MUSIC.chords.length], beats: 4 });
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, loopBeats };
}

/** Background music player with chimes. Fails silently where audio is unavailable. */
export class Music {
  constructor() {
    /** @type {AudioContext|null} */ this.ctx = null;
    /** @type {GainNode|null} */ this.master = null;
    /** @type {BiquadFilterNode|null} */ this.filter = null;
    this.enabled = true;
    this.volume = 1;
    this.song = buildSong();
    this.timerId = 0;
    this.nextIndex = 0;
    this.loopStart = 0;
  }

  /**
   * Creates/resumes the audio context. Call inside a tap handler.
   * @returns {void}
   */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = MUSIC.lowpassHz;
        this.master = this.ctx.createGain();
        this.filter.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applyVolume();
        const silent = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = silent;
        src.connect(this.ctx.destination);
        src.start(0);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  /**
   * Updates settings.
   * @param {{music: boolean, volume: number}} settings Parent settings.
   * @returns {void}
   */
  configure({ music, volume }) {
    this.enabled = music;
    this.volume = volume;
    this.applyVolume();
    if (!music) this.stop();
  }

  /** @returns {void} */
  applyVolume() {
    if (this.master && this.ctx) this.master.gain.setValueAtTime(MUSIC.masterGain * this.volume, this.ctx.currentTime);
  }

  /**
   * Plays one soft note (music-box or pad timbre).
   * @param {number} midi MIDI note.
   * @param {number} when Start time (AudioContext seconds).
   * @param {number} dur Length in seconds.
   * @param {'mel'|'pad'|'bass'|'chime'} kind Timbre.
   * @returns {void}
   */
  note(midi, when, dur, kind) {
    if (!this.ctx || !this.filter) return;
    const gains = { mel: MUSIC.melodyGain, pad: MUSIC.padGain, bass: MUSIC.bassGain, chime: MUSIC.chimeGain };
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = kind === 'pad' ? 'triangle' : 'sine';
    osc.frequency.value = midiToHz(midi);
    const peak = gains[kind];
    const attack = kind === 'pad' ? 0.6 : 0.008;
    const release = kind === 'pad' ? dur : Math.min(dur, 1.6);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);
    osc.connect(env);
    env.connect(this.filter);
    osc.start(when);
    osc.stop(when + attack + release + 0.05);
  }

  /**
   * Schedules all song events that fall into the look-ahead window.
   * @returns {void}
   */
  schedule() {
    if (!this.ctx) return;
    const spb = 60 / MUSIC.bpm;
    const { events, loopBeats } = this.song;
    const horizon = this.ctx.currentTime + MUSIC.lookAheadSec;
    for (;;) {
      if (this.nextIndex >= events.length) {
        this.nextIndex = 0;
        this.loopStart += loopBeats * spb;
      }
      const ev = events[this.nextIndex];
      const when = this.loopStart + ev.beat * spb;
      if (when > horizon) break;
      if (ev.kind === 'mel') this.note(ev.notes[0], when, ev.beats * spb, 'mel');
      else {
        ev.notes.forEach((n) => this.note(n, when, ev.beats * spb, 'pad'));
        this.note(ev.notes[0] - 12, when, ev.beats * spb, 'bass');
      }
      this.nextIndex += 1;
    }
  }

  /**
   * Starts the background loop (if music is enabled).
   * @returns {void}
   */
  start() {
    if (!this.enabled || !this.ctx || this.timerId) return;
    this.nextIndex = 0;
    this.loopStart = this.ctx.currentTime + 0.1;
    this.schedule();
    this.timerId = window.setInterval(() => this.schedule(), MUSIC.schedulerMs);
  }

  /** Stops the loop (already scheduled notes fade out). @returns {void} */
  stop() {
    if (this.timerId) window.clearInterval(this.timerId);
    this.timerId = 0;
  }

  /** Pauses all sound (e.g. app in background). @returns {void} */
  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  /** Continues after `suspend()`. @returns {void} */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /**
   * Plays a short sequence of bell notes (also when music is off: it signals the zone change).
   * @param {number[]} [notes] MIDI notes.
   * @returns {void}
   */
  chime(notes = MUSIC.chimeNotes) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    notes.forEach((n, i) => this.note(n, t + i * 0.14, 1.2, 'chime'));
  }

  /** Little fanfare at the end. @returns {void} */
  fanfare() {
    this.chime(MUSIC.fanfareNotes);
  }
}
