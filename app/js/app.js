// @ts-check
/**
 * App entry: loads the state, builds all screens and switches between them.
 * @module app
 */
import { loadState, saveState } from './storage.js';
import { requestPersistentStorage } from './backup.js';
import { buildIconSprite } from './art.js';
import { unlockAll, persistable } from './devmode.js';
import { Music } from './music.js';
import { ScreenKeeper } from './wakelock.js';
import { createStartScreen } from './screens/start.js';
import { createCountdownScreen } from './screens/countdown.js';
import { createBrushScreen } from './screens/brush.js';
import { createRewardScreen } from './screens/reward.js';
import { createAlbumScreen } from './screens/album.js';
import { createDressScreen } from './screens/dress.js';
import { createCalendarScreen } from './screens/calendar.js';
import { createParentsScreen } from './screens/parents.js';
import { createBackgroundsScreen } from './screens/backgrounds.js';

/** Query parameter for the short debug/test mode. */
const FAST_PARAM = 'schnell';

/** Screen factories in display order. */
const FACTORIES = [
  createStartScreen, createCountdownScreen, createBrushScreen, createRewardScreen,
  createAlbumScreen, createDressScreen, createCalendarScreen, createBackgroundsScreen, createParentsScreen,
];

/**
 * Registers the offline service worker (only on real hosting, not in local tests).
 * @param {boolean} fast Fast/test mode.
 * @returns {void}
 */
function registerServiceWorker(fast) {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (fast || local || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/**
 * Starts the app inside `#app`.
 * @returns {void}
 */
function boot() {
  const root = document.getElementById('app');
  if (!root) return;
  const fast = new URLSearchParams(location.search).has(FAST_PARAM);
  let state = loadState();
  let devMode = false;
  const music = new Music();
  music.configure(state.settings);
  /** @type {Map<string, import('./screens/base.js').Screen>} */
  const screens = new Map();
  /** @type {import('./screens/base.js').Screen|null} */
  let current = null;

  /** @type {import('./screens/base.js').AppContext} */
  const ctx = {
    getState: () => (devMode ? unlockAll(state) : state),
    setState: (next) => {
      state = devMode ? persistable(state, next) : next;
      saveState(state);
    },
    getSavedState: () => state,
    isDevMode: () => devMode,
    setDevMode: (on) => { devMode = on; },
    show: (name, data) => {
      const next = screens.get(name);
      if (!next) throw new Error(`Unbekannter Bildschirm: ${name}`);
      if (current && current.leave) current.leave();
      if (current) current.el.classList.remove('active');
      current = next;
      if (next.enter) next.enter(data);
      next.el.classList.add('active');
    },
    fast,
    music,
    keeper: new ScreenKeeper(),
  };

  document.body.prepend(buildIconSprite());
  FACTORIES.forEach((make) => {
    const screen = make(ctx);
    screens.set(screen.name, screen);
    root.append(screen.el);
  });
  ctx.show('start');
  registerServiceWorker(fast);
  requestPersistentStorage();
}

boot();
