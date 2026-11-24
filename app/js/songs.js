// @ts-check
/**
 * Song constants for the piano game: well-known public-domain children's melodies
 * in C major, written within the 8 piano keys C4–C5. Notes are [MIDI, beats].
 * @module songs
 */

const C = 60;
const D = 62;
const E = 64;
const F = 65;
const G = 67;
const A = 69;
const H = 71;
const C2 = 72;

/**
 * @typedef {Object} Song
 * @property {string} id
 * @property {string} name German title.
 * @property {number} bpm Slow tempo for small fingers.
 * @property {[number, number][]} notes Melody as [MIDI note, length in beats].
 */

/** @type {ReadonlyArray<Song>} */
export const SONGS = Object.freeze([
  {
    id: 'entchen',
    name: 'Alle meine Entchen',
    bpm: 70,
    notes: [
      [C, 1], [D, 1], [E, 1], [F, 1], [G, 2], [G, 2],
      [A, 1], [A, 1], [A, 1], [A, 1], [G, 4],
      [A, 1], [A, 1], [A, 1], [A, 1], [G, 4],
      [F, 1], [F, 1], [F, 1], [F, 1], [E, 2], [E, 2],
      [D, 1], [D, 1], [D, 1], [D, 1], [C, 4],
    ],
  },
  {
    id: 'freude',
    name: 'Ode an die Freude',
    bpm: 66,
    notes: [
      [E, 1], [E, 1], [F, 1], [G, 1], [G, 1], [F, 1], [E, 1], [D, 1],
      [C, 1], [C, 1], [D, 1], [E, 1], [E, 1.5], [D, 0.5], [D, 2],
      [E, 1], [E, 1], [F, 1], [G, 1], [G, 1], [F, 1], [E, 1], [D, 1],
      [C, 1], [C, 1], [D, 1], [E, 1], [D, 1.5], [C, 0.5], [C, 2],
    ],
  },
  {
    id: 'weihnachtsmann',
    name: 'Morgen kommt der Weihnachtsmann',
    bpm: 72,
    notes: [
      [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
      [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
      [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
      [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
      [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
      [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
    ],
  },
  {
    id: 'haenschen',
    name: 'Hänschen klein',
    bpm: 76,
    notes: [
      [G, 1], [E, 1], [E, 2], [F, 1], [D, 1], [D, 2], [C, 1], [D, 1], [E, 1], [F, 1], [G, 1], [G, 1], [G, 2],
      [G, 1], [E, 1], [E, 2], [F, 1], [D, 1], [D, 2], [C, 1], [E, 1], [G, 1], [G, 1], [C, 4],
      [D, 1], [D, 1], [D, 1], [D, 1], [D, 1], [E, 1], [F, 2],
      [E, 1], [E, 1], [E, 1], [E, 1], [E, 1], [F, 1], [G, 2],
      [G, 1], [E, 1], [E, 2], [F, 1], [D, 1], [D, 2], [C, 1], [E, 1], [G, 1], [G, 1], [C, 4],
    ],
  },
  {
    id: 'wiegenlied',
    name: 'Wiegenlied (Brahms)',
    bpm: 80,
    notes: [
      [E, 1], [E, 1], [G, 3], [E, 1], [E, 1], [G, 3],
      [E, 1], [G, 1], [C2, 2], [H, 2], [A, 2], [A, 2], [G, 2],
      [D, 1], [E, 1], [F, 2], [D, 2], [D, 1], [E, 1], [F, 3],
      [D, 1], [F, 1], [H, 1], [A, 1], [G, 2], [H, 2], [C2, 4],
    ],
  },
]);
