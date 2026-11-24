/* Offline helper: network first (so edits show up right away), cached copy if the Wi-Fi drops. */
var CACHE = 'stem-escape-v1';
var FILES = ['./', 'index.html', 'css/style.css', 'fonts/fonts.css', 'fonts/Andika-400.woff2', 'fonts/Andika-700.woff2', 'fonts/Fredoka-var.ttf',
  'js/config.js', 'data/challenges.js', 'js/core.js', 'js/qrcode.js', 'js/store.js', 'js/send.js', 'js/puzzle.js', 'js/camera.js', 'js/app.js', 'art/i-love-stem.png', 'art/icon-180.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res;
  }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
});
