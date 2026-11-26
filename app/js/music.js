// @ts-check
/**
 * Calm instrumental music and chimes generated with the Web Audio API
 * (original melody, no audio files, no lyrics). iOS only allows sound after a tap,
 * so `unlock()` must be called from a touch/click handler.
 * @module music
 */
import { MUSIC, AUDIO_MODES } from './config.js';

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
  MUSIC.melody.forEach((entry) => {
    const [note, len] = /** @type {[number|null, number]} */ (entry);
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
    /** @type {BaseAudioContext|null} */ this.ctx = null;
    /** @type {Map<string, AudioBuffer>} pre-rendered piano tones */
    this.toneBuffers = new Map();
    /** @type {GainNode|null} */ this.master = null;
    /** @type {BiquadFilterNode|null} */ this.filter = null;
    this.enabled = true;
    this.volume = 1;
    /** Browser audio buffer size wish: 'playback' (stable) or 'interactive' (fast). */
    this.latencyHint = AUDIO_MODES[0].latencyHint;
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
      if (this.ctx && /** @type {AudioContext} */ (this.ctx).state === 'closed') this.ctx = null;
      if (!this.ctx) {
        const Ctor = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        if (!Ctor) return;
        let context;
        try {
          context = new Ctor({ latencyHint: /** @type {AudioContextLatencyCategory} */ (this.latencyHint) });
        } catch {
          context = new Ctor(); // older engines without options
        }
        this.attach(context);
        const silent = context.createBuffer(1, 1, 22050);
        const src = context.createBufferSource();
        src.buffer = silent;
        src.connect(context.destination);
        src.start(0);
      }
      const live = /** @type {AudioContext} */ (this.ctx);
      if (live.state === 'suspended') live.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  /**
   * Builds the output chain on a context: background music → soft low-pass → volume → speakers;
   * piano tones go straight to the volume stage. Also used with an OfflineAudioContext in the tests.
   * @param {BaseAudioContext} context Audio context.
   * @returns {void}
   */
  attach(context) {
    this.ctx = context;
    this.toneBuffers = new Map();
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = MUSIC.lowpassHz;
    this.master = context.createGain();
    this.filter.connect(this.master);
    this.master.connect(context.destination);
    this.applyVolume();
  }
  /**
   * Updates settings.
   * @param {{music: boolean, volume: number, audioMode?: string}} settings Parent settings.
   * @returns {void}
   */
  configure({ music, volume, audioMode }) {
    const mode = AUDIO_MODES.find((a) => a.id === audioMode) || AUDIO_MODES[0];
    if (mode.latencyHint !== this.latencyHint) {
      this.latencyHint = mode.latencyHint;
      this.close(); // the next tap builds an engine with the new buffer size
    }
    this.enabled = music;
    this.volume = volume;
    this.applyVolume();
    if (!music) this.stop();
  }

  /**
   * Shuts the audio engine down (it is rebuilt on the next unlock).
   * @returns {void}
   */
  close() {
    this.stop();
    const live = /** @type {AudioContext|null} */ (this.ctx);
    if (live && typeof live.close === 'function') live.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.filter = null;
    this.toneBuffers = new Map();
  }

  /** @returns {void} */
  applyVolume() {
    if (this.master && this.ctx) this.master.gain.setValueAtTime(MUSIC.masterGain * this.volume, this.ctx.currentTime);
  }

  /**
   * Plays one soft note (music-box, pad, bass or chime timbre).
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
    const live = /** @type {AudioContext|null} */ (this.ctx);
    if (live && live.state === 'running' && live.suspend) live.suspend().catch(() => {});
  }

  /** Continues after `suspend()`. @returns {void} */
  resume() {
    const live = /** @type {AudioContext|null} */ (this.ctx);
    if (live && live.state === 'suspended' && live.resume) live.resume().catch(() => {});
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

  /**
   * The audio clock as the page sees it (on iOS it can lag behind what is actually playing).
   * @returns {number} Seconds.
   */
  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * Plays one piano tone right now (mini games). Works even when background music is off.
   * @param {number} midi MIDI note.
   * @param {number} durSec Length in seconds.
   * @returns {void}
   */
  tone(midi, durSec) {
    if (!this.ctx) return;
    this.toneAt(midi, this.now() + MUSIC.toneStartDelaySec, durSec);
  }

  /**
   * Computes a piano tone once: sine plus a quiet octave, short attack, natural decay
   * and a smooth fade to exactly zero (no click at the end). Cached per note and length.
   * @param {number} midi MIDI note.
   * @param {number} durSec Tone length in seconds.
   * @returns {AudioBuffer}
   */
  toneBuffer(midi, durSec) {
    const key = `${midi}:${durSec}`;
    const cached = this.toneBuffers.get(key);
    if (cached) return cached;
    const ctx = /** @type {BaseAudioContext} */ (this.ctx);
    const rate = ctx.sampleRate;
    const n = Math.ceil((durSec + MUSIC.pianoTailSec) * rate);
    const buffer = ctx.createBuffer(1, n, rate);
    const data = buffer.getChannelData(0);
    const w = (2 * Math.PI * midiToHz(midi)) / rate;
    const attack = MUSIC.pianoAttackSec * rate;
    const tau = durSec * MUSIC.pianoDecayShare * rate;
    const fade = MUSIC.pianoEndFadeSec * rate;
    for (let i = 0; i < n; i += 1) {
      let env = i < attack ? i / attack : Math.exp(-(i - attack) / tau);
      if (i > n - fade) env *= (n - i) / fade;
      data[i] = MUSIC.pianoPeak * env * (Math.sin(w * i) + MUSIC.pianoOctaveGain * Math.sin(2 * w * i));
    }
    this.toneBuffers.set(key, buffer);
    return buffer;
  }

  /**
   * Schedules a piano tone. Every tone plays its pre-rendered buffer to the end (the fade to
   * zero is baked in): nothing is ever cut off or faded by automation while sounding, so there
   * is no moment where the signal could jump (crackle). Re-struck keys simply overlap like on a
   * real piano; the level is low enough that even fast repeats stay below clipping.
   * @param {number} midi MIDI note.
   * @param {number} when Start time (context seconds).
   * @param {number} durSec Length in seconds.
   * @returns {void}
   */
  toneAt(midi, when, durSec) {
    if (!this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.toneBuffer(midi, durSec);
    src.connect(this.master);
    src.start(Math.max(when, this.ctx.currentTime));
  }

  /** Little fanfare at the end. @returns {void} */
  fanfare() {
    this.chime(MUSIC.fanfareNotes);
  }
}
