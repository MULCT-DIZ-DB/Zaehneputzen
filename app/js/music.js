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
    /** @type {BaseAudioContext|null} */ this.ctx = null;
    /** @type {Map<number, {oscs: OscillatorNode[], env: GainNode}>} one sounding piano voice per key */
    this.voices = new Map();
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
        const context = new Ctor();
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
   * Builds the output chain on a context: soft low-pass → volume → limiter → speakers.
   * The limiter keeps many overlapping tones from clipping (crackling).
   * Also used with an OfflineAudioContext in the tests.
   * @param {BaseAudioContext} context Audio context.
   * @returns {void}
   */
  attach(context) {
    this.ctx = context;
    this.voices = new Map();
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = MUSIC.lowpassHz;
    this.master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = MUSIC.limiterThresholdDb;
    limiter.knee.value = 0;
    limiter.ratio.value = MUSIC.limiterRatio;
    limiter.attack.value = MUSIC.limiterAttackSec;
    limiter.release.value = MUSIC.limiterReleaseSec;
    this.filter.connect(this.master);
    this.master.connect(limiter);
    limiter.connect(context.destination);
    this.applyVolume();
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

  /**
   * Plays one piano tone right now (mini games). Works even when background music is off.
   * @param {number} midi MIDI note.
   * @param {number} durSec Length in seconds.
   * @returns {void}
   */
  tone(midi, durSec) {
    if (!this.ctx) return;
    this.toneAt(midi, this.ctx.currentTime + MUSIC.toneStartDelaySec, durSec);
  }

  /**
   * Schedules a soft piano tone: sine plus a quiet octave, short attack, natural decay.
   * A key that is still sounding is faded out quickly first (one voice per key),
   * so fast repeated taps never pile up or click.
   * @param {number} midi MIDI note.
   * @param {number} when Start time (context seconds).
   * @param {number} durSec Length in seconds.
   * @returns {void}
   */
  toneAt(midi, when, durSec) {
    if (!this.ctx || !this.filter) return;
    const old = this.voices.get(midi);
    if (old) {
      old.env.gain.setTargetAtTime(0, when, MUSIC.voiceFadeSec);
      old.oscs.forEach((o) => o.stop(when + MUSIC.voiceFadeSec * 8));
    }
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(MUSIC.pianoGain, when + MUSIC.pianoAttackSec);
    env.gain.setTargetAtTime(0, when + MUSIC.pianoAttackSec, durSec / 4);
    const base = this.ctx.createOscillator();
    base.type = 'sine';
    base.frequency.value = midiToHz(midi);
    const octave = this.ctx.createOscillator();
    octave.type = 'sine';
    octave.frequency.value = midiToHz(midi + 12);
    const octaveGain = this.ctx.createGain();
    octaveGain.gain.value = MUSIC.pianoOctaveGain;
    base.connect(env);
    octave.connect(octaveGain);
    octaveGain.connect(env);
    env.connect(this.filter);
    const voice = { oscs: [base, octave], env };
    this.voices.set(midi, voice);
    const end = when + durSec + MUSIC.pianoTailSec;
    voice.oscs.forEach((o) => { o.start(when); o.stop(end); });
    base.onended = () => { if (this.voices.get(midi) === voice) this.voices.delete(midi); };
  }
  /** Little fanfare at the end. @returns {void} */
  fanfare() {
    this.chime(MUSIC.fanfareNotes);
  }
}
