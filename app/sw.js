/**
 * Offline service worker: network first (always fresh when online),
 * cached copy when offline. Service workers cannot import the app's ES modules
 * on iOS 16, so its own constants live here.
 */
const CACHE_NAME = 'zahnputz-tanz';
const NETWORK_TIMEOUT_MS = 3000;
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './fonts/PatrickHand-Regular.ttf',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './js/app.js', './js/config.js', './js/dom.js', './js/sketch.js', './js/art.js', './js/dancer.js', './js/stickers.js',
  './js/timer.js', './js/storage.js', './js/rewards.js', './js/sequins.js', './js/music.js', './js/wakelock.js', './js/devmode.js', './js/backup.js', './js/backgrounds.js',
  './js/screens/base.js', './js/screens/start.js', './js/screens/countdown.js', './js/screens/brush.js',
  './js/screens/reward.js', './js/screens/album.js', './js/screens/dress.js', './js/screens/calendar.js',
  './js/screens/parents.js', './js/screens/devpanel.js', './js/screens/backuppanel.js', './js/screens/backgrounds.js',
];

/**
 * Stores all app files when the worker is installed.
 * @param {ExtendableEvent} event Install event.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

/**
 * Takes control of open pages right away.
 * @param {ExtendableEvent} event Activate event.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Fetches from the network with a timeout and updates the cache.
 * @param {Request} request Request.
 * @returns {Promise<Response>}
 */
function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(request).then((response) => {
      clearTimeout(timer);
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      resolve(response);
    }, (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Network first, cache as fallback.
 * @param {FetchEvent} event Fetch event.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(fromNetwork(event.request).catch(() => caches.match(event.request, { ignoreSearch: true })
    .then((hit) => hit || caches.match('./index.html'))));
});
