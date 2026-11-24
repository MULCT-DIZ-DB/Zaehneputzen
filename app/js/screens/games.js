// @ts-check
/**
 * Games hub: the three mini games as big cards plus the remaining play time.
 * @module screens/games
 */
import { TEXT, GAMES } from '../config.js';
import { el } from '../dom.js';
import { icon } from '../art.js';
import { makeGameScreen, playLabel, playOpen } from './gamekit.js';

/** Hub cards: screen name, icon, title text key and personal-best key. */
const CARDS = [
  { game: 'dance', icon: 'pose-arme', title: 'danceGame', best: 'danceBest' },
  { game: 'piano', icon: 'klavier', title: 'pianoGame', best: '' },
  { game: 'sugar', icon: 'zucker', title: 'sugarGame', best: 'sugarBest' },
];

/**
 * Creates the games hub screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createGamesScreen(ctx) {
  const time = el('p', { cls: 'games-time', id: 'games-time' });
  const kit = makeGameScreen(ctx, 'games', TEXT.games, {
    back: () => ctx.show('start'),
    onExpire: () => kit.showTimeUp(),
  });
  const bests = new Map();
  const cards = CARDS.map((c) => {
    const best = el('span', { cls: 'game-best' });
    bests.set(c.game, { node: best, key: c.best });
    return el('button', {
      cls: 'btn game-card', id: `btn-game-${c.game}`, attrs: { type: 'button' },
      on: { click: () => { ctx.music.unlock(); ctx.show(`game-${c.game}`); } },
    }, [icon(/** @type {any} */ (c.icon), 'game-icon'), el('span', { cls: 'game-title', text: TEXT[c.title] }), best]);
  });
  kit.body.append(time, el('div', { cls: 'game-cards' }, cards));
  let tick = 0;

  return {
    name: 'games',
    el: kit.section,
    enter() {
      const stats = ctx.getState().gameStats;
      bests.forEach(({ node, key }) => {
        node.textContent = key && stats[key] > 0 ? `${TEXT.best}: ${stats[key]}` : '';
      });
      time.textContent = playLabel(ctx);
      kit.startGuard();
      if (!playOpen(ctx)) kit.showTimeUp();
      tick = window.setInterval(() => { time.textContent = playLabel(ctx); }, GAMES.checkMs);
    },
    leave() {
      kit.stopGuard();
      window.clearInterval(tick);
    },
  };
}
