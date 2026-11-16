/* Black Daily Deals: lets the site open fast and work like an app. Pages always try the network first so deals stay fresh. */
var CACHE = 'bdd-v1';
var CORE = ['index.html', 'assets/css/style.css', 'assets/js/app.js', 'assets/js/deals.js', 'assets/img/brand/emblem.png', 'assets/img/brand/cart.png', 'assets/img/brand/deal-of-the-day.png', 'assets/img/icons/icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== CACHE; }).map(function (x) { return caches.delete(x); })); })); self.clients.claim(); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return r; }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match('index.html'); }); }));
});
