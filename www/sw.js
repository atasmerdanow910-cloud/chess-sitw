// Offline cache for the web/PWA build. Bump VERSION when files change.
const VERSION = 'strelka-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'css/fonts.css', 'js/game.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/unbounded-cyrillic-600-normal.woff2', 'fonts/unbounded-cyrillic-800-normal.woff2', 'fonts/unbounded-latin-600-normal.woff2', 'fonts/unbounded-latin-800-normal.woff2',
  'fonts/manrope-cyrillic-500-normal.woff2', 'fonts/manrope-cyrillic-700-normal.woff2', 'fonts/manrope-cyrillic-800-normal.woff2',
  'fonts/manrope-latin-500-normal.woff2', 'fonts/manrope-latin-700-normal.woff2', 'fonts/manrope-latin-800-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
