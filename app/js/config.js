// @ts-check
/**
 * All global constants of the app: timing, colours, catalogues, texts.
 * No other file may contain magic numbers or user-visible text.
 * @module config
 */

export const APP_NAME = 'Zahnputz-Tanz';
export const STORAGE_KEY = 'zahnputz-tanz';
export const SCHEMA_VERSION = 1;
export const MAX_NAME_LENGTH = 30;

/** Brushing timer settings (seconds). */
export const TIMER = Object.freeze({
  defaultTotalSec: 120,
  minTotalSec: 60,
  maxTotalSec: 150,
  stepSec: 15,
  fastTotalSec: 20,
  countdownSec: 3,
  fastCountdownSec: 1,
  /** Update interval of the brushing view (ms); visuals are CSS animations, so 10 Hz is enough. */
  tickMs: 100,
  /** How long the "Wechseln!" hint stays visible (ms). */
  switchHintMs: 2500,
});

/** Tooth surfaces of the KAI method with the brushing motion shown in the animation. */
export const SURFACES = Object.freeze({
  kau: { name: 'Kauflächen', how: 'hin und her schrubben', motion: 'motion-kau' },
  aussen: { name: 'Außenflächen', how: 'kleine Kreise', motion: 'motion-aussen' },
  innen: { name: 'Innenflächen', how: 'von Rot nach Weiß wischen', motion: 'motion-innen' },
});

/** Jaw names; „beide“ = lower first, upper in the second half of the step. */
export const JAWS = Object.freeze({ unten: 'unten', oben: 'oben', beide: 'unten und oben' });

/** Brushing plans after KAI (Kauflächen, Außenflächen, Innenflächen). */
export const BRUSH_PLANS = Object.freeze([
  { id: 'kai6', label: 'KAI in 6 Schritten (jede Fläche erst unten, dann oben)', steps: [
    { surface: 'kau', jaw: 'unten' }, { surface: 'kau', jaw: 'oben' },
    { surface: 'aussen', jaw: 'unten' }, { surface: 'aussen', jaw: 'oben' },
    { surface: 'innen', jaw: 'unten' }, { surface: 'innen', jaw: 'oben' },
  ] },
  { id: 'kai3', label: 'KAI in 3 Schritten (unten und oben zusammen)', steps: [
    { surface: 'kau', jaw: 'beide' }, { surface: 'aussen', jaw: 'beide' }, { surface: 'innen', jaw: 'beide' },
  ] },
]);

/** Gift rules. */
export const REWARDS = Object.freeze({
  /** Before this hour = "morgens", from this hour = "abends". */
  cutoffHour: 14,
  maxRewardsPerDay: 2,
  outfitEverySessions: 5,
  backgroundEverySessions: 4,
  /** Full days in a row needed for move 2, 3, 4 … (move 1 is free). */
  moveStreakThresholds: [3, 7, 14, 21, 30],
  /** Every n-th sticker of the catalogue is a glitter sticker. */
  glitterEvery: 4,
});

/** Muted, drawn-looking colours. */
export const PALETTE = Object.freeze({
  rosa: '#E8A9A0',
  salbei: '#A8C3A0',
  lavendel: '#B9A8D0',
  butter: '#EBD592',
  petrol: '#7FA7B5',
  pfirsich: '#F0C4A0',
  creme: '#F7F1E3',
  papier: '#FBF7EE',
  tinte: '#4A3F3A',
  grau: '#C9C1B6',
  silber: '#D9D6DE',
  gold: '#D8B56A',
  weiss: '#FFFDF8',
  haut: '#F3CFB3',
  haar: '#8A5A44',
  mund: '#9C6461',
  zunge: '#D98F8B',
  rot: '#C4655A',
  nacht: '#5A6582',
  himmel: '#D7E5E6',
  wasser: '#9DBFC4',
  holz: '#D9B99A',
  wiese: '#BCD3B2',
  nachthuegel: '#6F8576',
  nachthuegel2: '#7E9585',
  buehnenwand: '#8D7A9C',
  zucker: '#C9B6E4',
  tasteWeiss: '#FFFDF8',
});

/** Colours used for stickers (two per shape). */
const STICKER_COLORS = ['rosa', 'lavendel', 'salbei', 'butter', 'petrol', 'pfirsich'];

/** Sticker shapes with German display names. */
const STICKER_SHAPES = [
  ['stern', 'Stern'], ['herz', 'Herz'], ['blume', 'Blume'], ['note', 'Note'],
  ['schuh', 'Ballettschuh'], ['schmetterling', 'Schmetterling'], ['katze', 'Katze'],
  ['hase', 'Hase'], ['mond', 'Mond'], ['sonne', 'Sonne'], ['regenbogen', 'Regenbogen'],
  ['krone', 'Krone'], ['tutu', 'Tutu'], ['eis', 'Eis'], ['vogel', 'Vogel'],
];

/**
 * Builds the sticker catalogue: every shape in two colours, every n-th one glitters.
 * @returns {ReadonlyArray<{id: string, name: string, shape: string, color: string, glitter: boolean}>}
 */
function buildStickers() {
  const list = [];
  STICKER_SHAPES.forEach(([shape, name], i) => {
    for (let k = 0; k < 2; k += 1) {
      const color = STICKER_COLORS[(i * 2 + k) % STICKER_COLORS.length];
      const n = list.length + 1;
      list.push({ id: `${shape}-${color}`, name, shape, color, glitter: n % REWARDS.glitterEvery === 0 });
    }
  });
  return Object.freeze(list);
}

export const STICKERS = buildStickers();

/** Dancer layers that can be dressed. One item per slot. */
export const OUTFIT_SLOTS = Object.freeze(['kopf', 'haar', 'oberteil', 'rock', 'schuhe']);

/** Outfit pieces in unlock order. */
export const OUTFITS = Object.freeze([
  { id: 'tutu', name: 'Tutu', slot: 'rock', color: 'rosa', glitter: false, sequin: false },
  { id: 'haarschleife', name: 'Haarschleife', slot: 'haar', color: 'lavendel', glitter: false, sequin: false },
  { id: 'pailletten-rock', name: 'Pailletten-Rock', slot: 'rock', color: 'lavendel', glitter: false, sequin: true,
    sequinFront: '#B9A8D0', sequinBack: '#D9D6DE' },
  { id: 'ballettschuhe', name: 'Ballettschuhe', slot: 'schuhe', color: 'rosa', glitter: false, sequin: false },
  { id: 'glitzer-krone', name: 'Glitzer-Krone', slot: 'kopf', color: 'gold', glitter: true, sequin: false },
  { id: 'blumenkranz', name: 'Blumenkranz', slot: 'kopf', color: 'salbei', glitter: false, sequin: false },
  { id: 'pailletten-top', name: 'Pailletten-Top', slot: 'oberteil', color: 'rosa', glitter: false, sequin: true,
    sequinFront: '#E8A9A0', sequinBack: '#D8B56A' },
  { id: 'sternenrock', name: 'Sternenrock', slot: 'rock', color: 'petrol', glitter: false, sequin: false },
]);

/** Dance moves; the first one is owned from the start. */
export const MOVES = Object.freeze([
  { id: 'wiegen', name: 'Wiegen', css: 'move-wiegen' },
  { id: 'huepfer', name: 'Hüpfer', css: 'move-huepfer' },
  { id: 'pirouette', name: 'Pirouette', css: 'move-pirouette' },
  { id: 'arme-hoch', name: 'Arme hoch', css: 'move-arme-hoch' },
  { id: 'welle', name: 'Welle', css: 'move-welle' },
  { id: 'sternsprung', name: 'Sternsprung', css: 'move-sternsprung' },
]);

/** Brushing backgrounds in unlock order; the first one is owned from the start. */
export const BACKGROUNDS = Object.freeze([
  { id: 'papier', name: 'Papier' },
  { id: 'ballettsaal', name: 'Ballettsaal' },
  { id: 'blumenwiese', name: 'Blumenwiese' },
  { id: 'sternenhimmel', name: 'Sternenhimmel' },
  { id: 'unterwasser', name: 'Unterwasser' },
  { id: 'buehne', name: 'Bühne' },
  { id: 'regenbogenland', name: 'Regenbogenland' },
]);

/** Mini games: play window after brushing. */
export const GAMES = Object.freeze({
  defaultMinutes: 5,
  minMinutes: 0,
  maxMinutes: 15,
  /** How often running games check the remaining play time (ms). */
  checkMs: 1000,
});

/**
 * Audio engine modes. "stabil" asks the browser for larger audio buffers (latencyHint 'playback'):
 * a little more delay, but far fewer dropouts/crackles on older devices like the iPad 5.
 */
export const AUDIO_MODES = Object.freeze([
  { id: 'stabil', name: 'Stabil (empfohlen für ältere iPads)', latencyHint: 'playback' },
  { id: 'schnell', name: 'Schnell (geringste Verzögerung)', latencyHint: 'interactive' },
]);

/**
 * Colouring game. Colours are stored as paint pigments (red, yellow, blue amounts 0…1, RYB model),
 * so painting one colour over another mixes like real paint (red + blue = violet, yellow + blue = green).
 */
export const PAINT = Object.freeze({
  /** Fixed picture resolution (all pictures, independent of the screen). */
  width: 1024,
  height: 640,
  /** Colour wheel: 12 hues (clockwise from red) as RYB pigments; rings = pigment strength outside → inside. */
  hues: [
    { id: 'rot', ryb: [1, 0, 0] }, { id: 'rotorange', ryb: [1, 0.5, 0] }, { id: 'orange', ryb: [1, 1, 0] },
    { id: 'gelborange', ryb: [0.5, 1, 0] }, { id: 'gelb', ryb: [0, 1, 0] }, { id: 'gelbgruen', ryb: [0, 1, 0.5] },
    { id: 'gruen', ryb: [0, 1, 1] }, { id: 'blaugruen', ryb: [0, 0.5, 1] }, { id: 'blau', ryb: [0, 0, 1] },
    { id: 'blaulila', ryb: [0.5, 0, 1] }, { id: 'lila', ryb: [1, 0, 1] }, { id: 'rotlila', ryb: [1, 0, 0.5] },
  ],
  rings: [1, 0.6, 0.32],
  /** RYB cube corners as RGB (0…1): white, red, yellow, blue, orange, violet, green, all three (brown). */
  cube: {
    w: [1, 1, 1], r: [0.9, 0.16, 0.14], y: [1, 0.88, 0.2], b: [0.16, 0.36, 0.68],
    ry: [0.98, 0.52, 0.1], rb: [0.52, 0.16, 0.56], yb: [0.18, 0.62, 0.26], ryb: [0.24, 0.13, 0.06],
  },
  /** Steps per pigment channel in the colour lookup table (speed on the iPad 5). */
  lutLevels: 33,
  tools: [
    { id: 'stift', name: 'Stift', icon: 'wz-stift', radius: 5 },
    { id: 'pinsel', name: 'Pinsel', icon: 'wz-pinsel', radius: 18 },
    { id: 'spray', name: 'Spray', icon: 'wz-spray', radius: 28 },
    { id: 'eimer', name: 'Farbeimer', icon: 'wz-eimer', radius: 0 },
    { id: 'radierer', name: 'Radierer', icon: 'wz-radierer', radius: 20 },
  ],
  sizes: [{ id: 'klein', name: 'Klein', scale: 0.6 }, { id: 'mittel', name: 'Mittel', scale: 1 }, { id: 'gross', name: 'Groß', scale: 1.8 }],
  /** Distance between brush dabs along a stroke, as a share of the radius. */
  dabSpacing: 0.3,
  /** Brush: this share of the radius is fully opaque, the rest fades softly. */
  brushCore: 0.5,
  sprayDots: 14,
  sprayDotRadius: 1.6,
  /** Fill reaches this many pixels under the lines, so no white gaps stay at the edges. */
  fillUnderLine: 3,
  /** Pixels with more line-art opacity than this are borders for the paint bucket. */
  lineThreshold: 90,
  lineWidth: 5,
  undoSteps: 6,
  saveDelayMs: 600,
  /** Colouring pictures (line art in js/paint/templates.js). */
  pictures: [
    { id: 'frei', name: 'Freies Blatt' }, { id: 'taenzerin', name: 'Tänzerin' }, { id: 'buehne', name: 'Ballettbühne' },
    { id: 'katze', name: 'Katze' }, { id: 'schmetterling', name: 'Schmetterling' }, { id: 'regenbogen', name: 'Regenbogen' },
  ],
  dbName: 'zahnputz-tanz-bilder',
  dbStore: 'bilder',
});

/** Default parent settings. */
export const DEFAULT_SETTINGS = Object.freeze({
  totalSec: TIMER.defaultTotalSec,
  brushPlan: 'kai6',
  audioMode: 'stabil',
  /** Piano game tempo: 'langsam' | 'mittel' | 'normal'. */
  pianoTempo: 'langsam',
  music: true,
  volume: 0.6,
  /** Minutes of game time after each completed brushing (0 = games off). */
  playMinutes: GAMES.defaultMinutes,
});

/** Mini game „Tanzschritte merken“ (Simon-style memory). */
export const DANCE_GAME = Object.freeze({
  poses: [
    { id: 'arme-hoch', name: 'Arme hoch', css: 'move-arme-hoch', note: 72, icon: 'pose-arme' },
    { id: 'drehung', name: 'Drehung', css: 'move-pirouette', note: 67, icon: 'pose-dreh' },
    { id: 'huepfer', name: 'Hüpfer', css: 'move-huepfer', note: 64, icon: 'pose-hupf' },
    { id: 'welle', name: 'Welle', css: 'move-welle', note: 60, icon: 'pose-welle' },
  ],
  startLength: 2,
  maxLength: 8,
  /** Time each pose is shown, and the pause between poses (ms). */
  showMs: 1100,
  gapMs: 250,
  /** Pauses before showing a sequence and after feedback (ms). */
  introMs: 900,
  feedbackMs: 1500,
});

/** Mini game „Klavier“ (notes glide down to big piano keys). */
export const PIANO = Object.freeze({
  keys: [60, 62, 64, 65, 67, 69, 71, 72],
  keyNames: ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'C'],
  keyColors: ['rosa', 'pfirsich', 'butter', 'salbei', 'petrol', 'lavendel', 'rosa', 'pfirsich'],
  /** Delay before the first note reaches the line (ms). */
  leadInMs: 2500,
  /** Time a note needs from the top of its lane to the hit line (ms). */
  travelMs: 2400,
  /** Height of the target line above the bottom of the lane (share of the lane height). */
  hitLineShare: 0.16,
  /** Forgiving timing: a tap within ± this many ms of a note counts. */
  hitWindowMs: 350,
  /** Pause after the last note before the result appears (ms). */
  endDelayMs: 1500,
  /** Star thresholds: share of hit notes for 2 and 3 stars. */
  twoStars: 0.5,
  threeStars: 0.85,
  toneSec: 1.2,
  /** Notes keep falling this far past the hit line (share of the travel) before they disappear. */
  overshoot: 1.25,
  /** Tempo levels: langsam = each song's slow practice tempo; the others are a share of the real tempo. */
  tempos: [
    { id: 'langsam', name: 'Langsam', factor: null },
    { id: 'mittel', name: 'Mittel', factor: 0.85 },
    { id: 'normal', name: 'Normal', factor: 1 },
  ],
});

/** Mini game „Zuckerjagd“ (tap sugar bugs off the teeth). */
export const SUGAR = Object.freeze({
  roundMs: 45000,
  startDelayMs: 800,
  toothCount: 16,
  maxBugs: 3,
  startLifeMs: 1600,
  minLifeMs: 900,
  startSpawnMs: 1000,
  minSpawnMs: 550,
  /** Bug radius in mouth drawing units (≈ 70 px wide on the iPad). */
  bugRadius: 18,
  hitRadius: 26,
  puffMs: 400,
  /** Tones for a caught bug (cycled). */
  hitNotes: [84, 88, 91],
});

/** Calm instrumental music (Web Audio). */
export const MUSIC = Object.freeze({
  bpm: 68,
  /** Scheduler look-ahead (s) and wake-up interval (ms). */
  lookAheadSec: 0.4,
  schedulerMs: 120,
  masterGain: 0.35,
  melodyGain: 0.22,
  padGain: 0.05,
  bassGain: 0.09,
  chimeGain: 0.25,
  /**
   * Piano voice, pre-rendered once per note into a buffer and always played to its end
   * (no fades or cut-offs while sounding): peak level, attack, quiet octave overtone,
   * decay time constant as a share of the tone length, final fade to zero, silent tail.
   * Overlapping repeats of one key add up to at most about 1 / (1 - e^(-gap/decay)) tones;
   * the levels keep even very fast playing below clipping.
   */
  pianoPeak: 0.32,
  pianoAttackSec: 0.012,
  pianoOctaveGain: 0.18,
  pianoDecayShare: 0.2,
  pianoEndFadeSec: 0.04,
  pianoTailSec: 0.3,
  toneStartDelaySec: 0.005,
  lowpassHz: 2400,
  /** Chord roots (MIDI) for a 4-bar loop: C – Am – F – G. */
  chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
  /** Melody: [MIDI note or null for rest, length in beats] – 4 bars of 4 beats per chord, 2 rounds. */
  melody: [
    [72, 1], [76, 1], [79, 2], [76, 1], [74, 1], [72, 2],
    [69, 1], [72, 1], [76, 2], [74, 2], [null, 2],
    [69, 1], [72, 1], [77, 2], [76, 1], [74, 1], [72, 2],
    [71, 1], [74, 1], [79, 2], [77, 1], [76, 1], [74, 2],
    [72, 2], [79, 2], [76, 2], [72, 2],
    [69, 2], [72, 1], [74, 1], [76, 4],
    [77, 2], [76, 1], [74, 1], [72, 2], [69, 2],
    [71, 2], [74, 2], [72, 4],
  ],
  chimeNotes: [84, 88, 91],
  countdownNotes: [79, 72, 76],
  fanfareNotes: [72, 76, 79, 84, 88],
});

/** Flip sequin behaviour. */
export const SEQUINS = Object.freeze({
  spacing: 8.5,
  radius: 4,
  /** Sequins keep this distance (dancer units) from the clothing outline – edge sequins are hard to hit. */
  edgeMargin: 6.5,
  /** Extra distance to shapes drawn on top (arms, top over skirt) – covers outline and wobble. */
  coverGap: 1.5,
  /** Fingertip-sized touch radius (dancer units, ≈ 18 px on the iPad = ~36 px contact). Larger would flip the whole top. */
  touchRadius: 12,
  maxConcurrentFlips: 15,
  flipMs: 220,
});

/** Interaction timings (ms). */
export const UI = Object.freeze({
  parentHoldMs: 3000,
  giftOpenMs: 900,
  partyMs: 5000,
  /** Confetti keeps falling while the reward screen is open (pieces loop endlessly). */
  confettiCount: 16,
  confettiMinSec: 3.2,
  confettiMaxSec: 5.5,
});

/** Progress backup file (export/import). */
export const BACKUP = Object.freeze({
  kind: 'zahnputz-tanz-sicherung',
  filePrefix: 'zahnputz-tanz',
  mime: 'application/json',
  maxBytes: 1000000,
  revokeDelayMs: 10000,
  /** localStorage key remembering the session count at the last saved backup. */
  metaKey: 'zahnputz-tanz-letzte-sicherung',
  /** The start screen asks parents for a backup after this many new sessions (about 5 days). */
  remindAfterSessions: 10,
});

/** Developer mode gate: both factors are single digits. */
export const DEV = Object.freeze({
  minFactor: 2,
  maxFactor: 9,
});

/** All user-visible text (German). */
export const TEXT = Object.freeze({
  greeting: 'Hallo',
  ready: 'Bereit zum Zähneputzen?',
  start: 'Los geht’s!',
  album: 'Album',
  calendar: 'Kalender',
  dressUp: 'Anziehen',
  pause: 'Pause',
  resume: 'Weiter putzen',
  stop: 'Aufhören',
  paused: 'Pause',
  switchTo: 'Wechseln! Jetzt',
  brushNow: 'Drück jetzt den Knopf an deiner Zahnbürste!',
  go: 'Los!',
  done: 'Super geputzt!',
  parents: 'Eltern',
  parentsHint: 'Eltern-Bereich',
  gateTitle: 'Für Eltern: Bitte löse die Aufgabe.',
  gateCancel: 'Abbrechen',
  flipAll: 'Alle umdrehen',
  flipHint: 'Streich über die Pailletten!',
  resetSequins: 'Alle zurück',
  streak: 'Tage in Folge',
  noGiftNow: 'Geschenke gibt es wieder beim nächsten Zähneputzen.',
  next: 'Weiter',
  back: 'Zurück',
  giftTap: 'Tippe auf das Geschenk!',
  newSticker: 'Neuer Sticker:',
  newOutfit: 'Neues Kleidungsstück:',
  newMove: 'Neuer Tanzschritt:',
  albumFull: 'Dein Album ist voll – du bist ein Zahnputz-Star!',
  morning: 'morgens',
  evening: 'abends',
  nameLabel: 'Name des Kindes',
  totalLabel: 'Putzzeit',
  seconds: 'Sekunden',
  orderLabel: 'Putz-Reihenfolge',
  audioLabel: 'Klang (Klavier, Musik)',
  paint: 'Malen',
  paintPick: 'Was möchtest du malen?',
  paintUndo: 'Zurück',
  paintClear: 'Alles löschen',
  paintSave: 'Speichern',
  paintClearAsk: 'Das ganze Bild löschen?',
  paintYes: 'Ja, löschen',
  paintNo: 'Nein',
  toothOuter: 'außen',
  toothInner: 'innen',
  pianoTempoLabel: 'Tempo:',
  musicLabel: 'Musik',
  volumeLabel: 'Lautstärke',
  reset: 'Fortschritt löschen',
  resetConfirm: 'Wirklich alle Sticker, Kleider und den Kalender löschen?',
  close: 'Fertig',
  nothingToWear: 'Putz fleißig Zähne, dann bekommst du Kleider!',
  none: 'ohne',
  weekdays: 'Mo Di Mi Do Fr Sa So',
  months: 'Januar Februar März April Mai Juni Juli August September Oktober November Dezember',
  stickersCount: 'Sticker',
  glitter: 'Glitzer',
  moves: 'Tanzschritte',
  devMode: 'Entwicklermodus',
  devCheck: 'Prüfen',
  devWrong: 'Leider falsch – hier ist eine neue Aufgabe.',
  devActive: 'Entwicklermodus aktiv: alles ist freigeschaltet. Echter Fortschritt bleibt unverändert.',
  devOff: 'Ausschalten',
  devBadge: 'Entwickler',
  backgrounds: 'Hintergründe',
  newBackground: 'Neuer Hintergrund:',
  backupTitle: 'Sicherung',
  exportBtn: 'Fortschritt exportieren',
  importBtn: 'Fortschritt importieren',
  backupHint: 'Die Datei z. B. per AirDrop, Mail oder „Dateien“ auf das andere Gerät bringen und dort importieren.',
  importConfirm: 'Den Fortschritt auf diesem Gerät durch die Sicherung ersetzen?',
  importOk: 'Fortschritt geladen!',
  importBad: 'Diese Datei ist keine gültige Zahnputz-Tanz-Sicherung.',
  versionLabel: 'Version',
  versionFrom: 'vom',
  versionLocal: 'lokale Entwicklung',
  restoreBtn: 'Sicherung laden',
  backupReminder: 'Eltern: Fortschritt sichern (3 Sek. halten)',
  games: 'Spiele',
  playTime: 'Spielzeit',
  playLeft: 'noch',
  minutes: 'Min.',
  playOff: 'aus',
  playLabel: 'Spielzeit nach dem Putzen',
  timeUp: 'Spielzeit vorbei – bis zum nächsten Zähneputzen!',
  toStart: 'Zum Start',
  best: 'Rekord',
  danceGame: 'Tanzschritte merken',
  danceWatch: 'Schau gut zu!',
  danceYou: 'Jetzt du!',
  danceAgain: 'Nochmal! Schau noch einmal zu.',
  danceGreat: 'Super! Jetzt ein Schritt mehr.',
  danceSteps: 'Schritte',
  pianoGame: 'Klavier',
  pianoPick: 'Such dir ein Lied aus:',
  pianoFree: 'Frei spielen',
  pianoHits: 'Töne getroffen',
  pianoAgain: 'Nochmal',
  pianoOther: 'Anderes Lied',
  sugarGame: 'Zuckerjagd',
  sugarHint: 'Tippe die Zuckermonster weg!',
  sugarStart: 'Los!',
  sugarResultA: 'Du hast',
  sugarResultB: 'Zuckermonster weggeputzt!',
  sugarAgain: 'Nochmal',
  backupSafetyHint: 'Der Fortschritt liegt nur auf diesem Gerät. Beim Löschen der Website-Daten oder des Home-Bildschirm-Symbols geht er verloren – die Sicherung in „Dateien“/iCloud Drive speichern.',
});
