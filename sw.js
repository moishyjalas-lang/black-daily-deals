/* EBF Daily Deals — service worker.
   Chrome will not offer to install a site without one. This stays
   deliberately thin: it serves the shell from cache only when the
   network fails, so deals are never shown from a stale cache. */

const SHELL = 'ebf-shell-v1';
const FALLBACK = '/index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll([FALLBACK])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  /* Network first, always. Prices and deals must never come from cache.
     The cached shell is only a lifeline when the network is gone. */
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match(FALLBACK) : undefined)))
  );
});
