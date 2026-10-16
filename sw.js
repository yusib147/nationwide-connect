/* Nationwide Media Connect service worker: network-first, so the app is
   always current; the cache only answers when the network is unreachable. */
var CACHE = "nm-shell-v1";
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { if (k !== CACHE) { return caches.delete(k); } }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") { return; }
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf("/api/") === 0) { return; }
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
    return res;
  }).catch(function () { return caches.match(req); }));
});
