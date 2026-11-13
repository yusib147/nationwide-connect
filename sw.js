/* Nationwide Media Connect service worker.
   v3 (2026-11-02): static assets (scripts, styles, images - all referenced
   with ?v= version tags) are served stale-while-revalidate: the cached copy
   answers instantly and a fresh copy is fetched in the background for the
   next visit. Pages stay network-first so the app shell is always current,
   and the cache still answers when the network is unreachable. */
var CACHE = "nm-shell-v3";
var ASSET = /\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)(?:\?.*)?$/;
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
  if (ASSET.test(url.pathname + url.search)) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) { c.put(req, res.clone()).catch(function () {}); }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
    return res;
  }).catch(function () { return caches.match(req); }));
});
