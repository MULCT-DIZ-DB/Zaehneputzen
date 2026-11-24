// @ts-check
/**
 * Reward screen: dance party with confetti, gift box, reveal of sticker/outfit/move.
 * @module screens/reward
 */
import { TEXT, UI, MOVES, OUTFITS, STICKERS, BACKGROUNDS } from '../config.js';
import { el, clear, replayClass } from '../dom.js';
import { drawGift, drawConfetti } from '../art.js';
import { drawDancer, drawOutfitPreview } from '../dancer.js';
import { drawSticker } from '../stickers.js';
import { drawBackground } from '../backgrounds.js';
import { makeScreen, textButton } from './base.js';
import { playOpen } from './gamekit.js';
import { sequinStatesOf } from './start.js';

/**
 * Picks the dance move for the party (a new move wins, else a random owned one).
 * @param {string[]} owned Owned move ids.
 * @param {string|null} fresh Newly unlocked move id.
 * @returns {string} CSS class of the move.
 */
function partyMove(owned, fresh) {
  const id = fresh || owned[Math.floor(Math.random() * owned.length)] || MOVES[0].id;
  const move = MOVES.find((m) => m.id === id) || MOVES[0];
  return move.css;
}

/**
 * One reveal card (picture + caption).
 * @param {string} caption Caption text.
 * @param {Element} picture Picture.
 * @param {string} [id] Element id.
 * @returns {HTMLElement}
 */
function card(caption, picture, id) {
  return el('div', { cls: 'reveal-card', id }, [picture, el('p', { text: caption })]);
}

/**
 * Creates the reward screen.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createRewardScreen(ctx) {
  const { section, body } = makeScreen('reward');
  const title = el('h1', { cls: 'reward-title', text: TEXT.done });
  const info = el('p', { cls: 'reward-info' });
  const party = el('div', { cls: 'party' });
  const confetti = el('div', { cls: 'confetti-layer' }, drawConfetti(UI.confettiCount));
  const gift = el('button', { cls: 'btn gift-box', id: 'gift-box', attrs: { type: 'button', 'aria-label': TEXT.giftTap } }, [drawGift()]);
  const giftHint = el('p', { cls: 'gift-hint', text: TEXT.giftTap });
  const reveals = el('div', { cls: 'reveals' });
  const next = textButton(TEXT.next, () => ctx.show('start'), 'btn-big', 'btn-reward-next');
  const games = textButton(TEXT.playTime, () => { ctx.music.unlock(); ctx.show('games'); }, 'btn-big btn-games', 'btn-games');
  /** Shows the next button and, while the play window is open, the play-time button. @returns {void} */
  const showButtons = () => { next.hidden = false; games.hidden = !playOpen(ctx); };
  body.append(confetti, el('div', { cls: 'reward-layout' }, [
    party,
    el('div', { cls: 'reward-panel' }, [title, info, gift, giftHint, reveals, el('div', { cls: 'reward-buttons' }, [next, games])]),
  ]));
  /** @type {import('../rewards.js').Reward|null} */ let reward = null;
  let openTimer = 0;

  /** Shows the gifts after the lid opened. @returns {void} */
  function reveal() {
    if (!reward) return;
    clear(reveals);
    const st = STICKERS.find((s) => s.id === reward.sticker);
    reveals.append(st
      ? card(`${TEXT.newSticker} ${st.name}${st.glitter ? ` (${TEXT.glitter})` : ''}`, drawSticker(st.id), 'reward-sticker')
      : card(TEXT.albumFull, drawSticker(STICKERS[0].id), 'reward-sticker'));
    const outfit = OUTFITS.find((o) => o.id === reward.outfit);
    if (outfit) reveals.append(card(`${TEXT.newOutfit} ${outfit.name}`, drawOutfitPreview(outfit.id)));
    const bg = BACKGROUNDS.find((b) => b.id === reward.background);
    if (bg) reveals.append(card(`${TEXT.newBackground} ${bg.name}`, drawBackground(bg.id, 'bg-art reveal-bg')));
    const move = MOVES.find((m) => m.id === reward.move);
    if (move) reveals.append(card(`${TEXT.newMove} ${move.name}`, el('span', { cls: 'move-badge', text: '♪' })));
    gift.hidden = true;
    giftHint.hidden = true;
    showButtons();
  }

  gift.addEventListener('click', () => {
    if (gift.classList.contains('open')) return;
    gift.classList.add('open');
    ctx.music.chime();
    openTimer = window.setTimeout(reveal, UI.giftOpenMs);
  });

  return {
    name: 'reward',
    el: section,
    /** @param {import('../rewards.js').Reward|null} data Gifts of this session. */
    enter(data) {
      reward = data || null;
      const state = ctx.getState();
      clear(party);
      clear(reveals);
      party.append(drawDancer({ wearing: state.wearing, sequinStates: sequinStatesOf(state),
        cls: partyMove(state.moves, reward ? reward.move : null) }));
      replayClass(confetti, 'fall');
      gift.classList.remove('open');
      gift.hidden = !reward;
      giftHint.hidden = !reward;
      next.hidden = true;
      games.hidden = true;
      if (!reward) showButtons();
      info.textContent = reward
        ? (reward.streak > 0 ? `★ ${reward.streak} ${TEXT.streak}` : '')
        : TEXT.noGiftNow;
    },
    leave() {
      window.clearTimeout(openTimer);
      confetti.classList.remove('fall');
    },
  };
}
