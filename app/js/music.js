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
    /** @type {{midi: number, src: AudioBufferSourceNode, gain: GainNode, end: number, stolen: boolean}[]} sounding piano voices */
    this.live = [];
    /** @type {Map<string, AudioBuffer>} pre-rendered piano tones */
    this.toneBuffers = new Map();
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
   * Builds the output chain on a context: background music → soft low-pass → volume → speakers;
   * piano tones go straight to the volume stage. Also used with an OfflineAudioContext in the tests.
   * @param {BaseAudioContext} context Audio context.
   * @returns {void}
   */
  attach(context) {
    this.ctx = context;
    this.live = [];
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
    const tau = (durSec / 4) * rate;
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
   * Fades a sounding voice out quickly (re-strike or voice limit).
   * @param {{src: AudioBufferSourceNode, gain: GainNode, end: number, stolen: boolean}} voice Voice.
   * @param {number} when Context time.
   * @returns {void}
   */
  fadeVoice(voice, when) {
    voice.stolen = true;
    voice.gain.gain.setTargetAtTime(0, when, MUSIC.voiceFadeSec);
    voice.end = Math.min(voice.end, when + MUSIC.voiceFadeSec * 4);
    voice.src.stop(voice.end);
  }

  /**
   * Schedules a piano tone. One voice per key (a re-struck key fades its old tone) and at
   * most `MUSIC.maxVoices` at once (the oldest fades) – cheap for the iPad and never clipping.
   * @param {number} midi MIDI note.
   * @param {number} when Start time (context seconds).
   * @param {number} durSec Length in seconds.
   * @returns {void}
   */
  toneAt(midi, when, durSec) {
    if (!this.ctx || !this.master) return;
    this.live = this.live.filter((v) => v.end > when);
    this.live.filter((v) => v.midi === midi && !v.stolen).forEach((v) => this.fadeVoice(v, when));
    const sounding = this.live.filter((v) => !v.stolen);
    while (sounding.length >= MUSIC.maxVoices) this.fadeVoice(/** @type {any} */ (sounding.shift()), when);
    const buffer = this.toneBuffer(midi, durSec);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    src.connect(gain);
    gain.connect(this.master);
    src.start(when);
    const voice = { midi, src, gain, end: when + buffer.duration, stolen: false };
    src.onended = () => { this.live = this.live.filter((v) => v !== voice); };
    this.live.push(voice);
  }

  /**
   * Number of piano tones currently sounding (not counting ones that are fading out).
   * @returns {number}
   */
  activeVoices() {
    return this.live.filter((v) => !v.stolen).length;
  }

  /**
   * Number of sounding (not fading) voices of one key.
   * @param {number} midi MIDI note.
   * @returns {number}
   */
  voicesFor(midi) {
    return this.live.filter((v) => v.midi === midi && !v.stolen).length;
  }
  /** Little fanfare at the end. @returns {void} */
  fanfare() {
    this.chime(MUSIC.fanfareNotes);
  }
}
