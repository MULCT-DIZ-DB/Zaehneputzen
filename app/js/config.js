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
  zoneCount: 4,
  fastTotalSec: 20,
  countdownSec: 3,
  fastCountdownSec: 1,
  /** Update interval of the brushing view (ms); visuals are CSS animations, so 10 Hz is enough. */
  tickMs: 100,
  /** How long the "Wechseln!" hint stays visible (ms). */
  switchHintMs: 2500,
});

/** Mouth zones (index order is the drawing order, not the brushing order). */
export const ZONES = Object.freeze([
  { id: 'ol', label: 'oben links' },
  { id: 'or', label: 'oben rechts' },
  { id: 'ul', label: 'unten links' },
  { id: 'ur', label: 'unten rechts' },
]);

/** Selectable brushing orders (indices into ZONES). */
export const ZONE_ORDERS = Object.freeze([
  { id: 'standard', label: 'oben links → oben rechts → unten links → unten rechts', order: [0, 1, 2, 3] },
  { id: 'kreis', label: 'im Kreis: oben links → oben rechts → unten rechts → unten links', order: [0, 1, 3, 2] },
  { id: 'rechts', label: 'oben rechts → oben links → unten links → unten rechts', order: [1, 0, 2, 3] },
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

/** Default parent settings. */
export const DEFAULT_SETTINGS = Object.freeze({
  totalSec: TIMER.defaultTotalSec,
  zoneOrder: 'standard',
  music: true,
  volume: 0.6,
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
  parentsHint: 'Für Eltern: 3 Sekunden gedrückt halten',
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
  orderLabel: 'Reihenfolge',
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
});
