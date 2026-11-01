/*
 * Lexique STE — service worker (cache d'abord, 100 % hors ligne).
 * À CHAQUE MODIFICATION d'un fichier de l'app (vocabulaire compris), incrémenter CACHE_VERSION.
 * La progression des élèves est dans localStorage : elle n'est jamais touchée par le cache.
 */
const CACHE_VERSION = 'lexique-ste-v1';

const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/textes.js',
  'js/vocabulaire.js',
  'js/moteur.js',
  'js/correcteur.js',
  'js/stockage.js',
  'js/sons.js',
  'js/app.js',
  'polices/SpaceGrotesk-500.woff2',
  'polices/SpaceGrotesk-700.woff2',
  'polices/Inter-400.woff2',
  'polices/Inter-600.woff2',
  'polices/NotoNaskhArabic-400.woff2',
  'polices/NotoNaskhArabic-700.woff2',
  'icones/icone.svg',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/icone-maskable-512.png',
  'icones/apple-touch-icon.png'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(FICHIERS)));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then((enCache) => {
      if (enCache) return enCache;
      return fetch(req).then((rep) => {
        if (rep && rep.ok && rep.type === 'basic') {
          const copie = rep.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copie));
        }
        return rep;
      }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : undefined));
    })
  );
});
