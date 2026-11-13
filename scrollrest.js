/* Nationwide Media Connect — scrollrest.js (2026-11-03, Ibrahim's order)
   Back-to-feed scroll restoration.

   The problem: the app's screen switcher scrolls to the top on EVERY
   screen change, so opening a product from the home feed and coming
   back always lands at the very top of the feed, losing the exact
   place the shopper stopped at.

   The fix, without touching the switcher: while a listing screen
   (home, category results) is active, remember where the shopper is —
   the scroll position plus the card sitting at the top of the screen
   (the "anchor") and its exact offset. When that screen becomes
   active again, put the anchor card back at the same offset (falling
   back to the raw scroll position when the card is gone). Anchoring
   to a card survives feed repaints and reshuffles that a raw pixel
   position would not.

   Restoration runs as a short burst of attempts over ~1.6s because
   the feed repaints after the screen shows; any touch, wheel or key
   from the shopper cancels it instantly. Snapshots clear on the
   auth screens and expire after 30 minutes. */
;(function () {
  "use strict";

  var TRACKED = { "screen-home": true, "screen-category": true };
  var snaps = {};
  var lastActive = null;
  var timers = [];

  function activeScreen() {
    var s = document.querySelector(".screen.active");
    return s ? s.id : null;
  }
  function gridFor(screenId) {
    var scr = document.getElementById(screenId);
    if (!scr) return null;
    if (screenId === "screen-home") return scr.querySelector("#home-grid") || scr.querySelector(".grid");
    return scr.querySelector("#cat-grid") || scr.querySelector(".grid");
  }
  function findCard(grid, id) {
    if (!grid || !id) return null;
    var cards = grid.querySelectorAll(".card[data-id]");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-id") === id) return cards[i];
    }
    return null;
  }

  function snapshot(screenId) {
    var y = window.scrollY || window.pageYOffset || 0;
    if (y <= 4) { snaps[screenId] = null; return; }
    var anchorId = null, delta = 0;
    var grid = gridFor(screenId);
    if (grid) {
      var cards = grid.querySelectorAll(".card[data-id]");
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        if (r.bottom > 72) { anchorId = cards[i].getAttribute("data-id"); delta = r.top; break; }
      }
    }
    snaps[screenId] = { y: y, anchorId: anchorId, delta: delta, at: Date.now() };
  }

  function cancelRestore() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
  }
  function startRestore(screenId, snap) {
    cancelRestore();
    var delays = [0, 80, 200, 400, 700, 1100, 1600, 2400, 3400];
    delays.forEach(function (d) {
      timers.push(setTimeout(function () { attempt(screenId, snap); }, d));
    });
  }
  function attempt(screenId, snap) {
    if (activeScreen() !== screenId) { cancelRestore(); return; }
    var grid = gridFor(screenId);
    var anchor = findCard(grid, snap.anchorId);
    var target;
    if (anchor) {
      target = (window.scrollY || 0) + anchor.getBoundingClientRect().top - snap.delta;
    } else {
      target = snap.y;
      var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (target > maxScroll) return; /* feed not painted yet; a later attempt will land it */
    }
    if (target < 0) target = 0;
    window.scrollTo(0, target);
  }

  /* Snapshot whenever the shopper taps anything inside a tracked
     screen (capture phase: runs before the app's own tap handlers
     navigate away), and whenever a product opens programmatically. */
  document.addEventListener("click", function () {
    var cur = activeScreen();
    if (cur && TRACKED[cur]) { try { snapshot(cur); } catch (e) {} }
  }, true);
  ["wheel", "touchmove", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function () { if (timers.length) cancelRestore(); }, { passive: true, capture: true });
  });

  var wrappedOpen = false;
  function wrapOpen() {
    if (wrappedOpen) return;
    ["NM_openDetail", "NM_openProduct"].forEach(function (name) {
      var orig = window[name];
      if (typeof orig !== "function" || orig.__srWrapped) return;
      var w = function () {
        var cur = activeScreen();
        if (cur && TRACKED[cur]) { try { snapshot(cur); } catch (e) {} }
        return orig.apply(this, arguments);
      };
      w.__srWrapped = true;
      window[name] = w;
      wrappedOpen = true;
    });
  }

  /* Watch screen activations directly (class changes), so every
     return path — back button, bottom nav, hardware back — restores,
     not just the ones that go through NM_show. */
  function onActiveChange() {
    var cur = activeScreen();
    if (cur === lastActive) return;
    var prev = lastActive;
    lastActive = cur;
    if (!cur) return;
    if (cur === "screen-auth" || cur === "screen-otp" || cur === "screen-recover") { snaps = {}; return; }
    if (TRACKED[cur] && prev && prev !== cur) {
      var snap = snaps[cur];
      if (snap && Date.now() - snap.at < 30 * 60 * 1000) startRestore(cur, snap);
    }
  }
  function wire() {
    wrapOpen();
    if (window.MutationObserver && !document.body.__srObs) {
      document.body.__srObs = true;
      new MutationObserver(onActiveChange).observe(document.body, {
        attributes: true, attributeFilter: ["class"], subtree: true
      });
    }
    onActiveChange();
  }
  lastActive = activeScreen();
  wire();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  setInterval(function () { wire(); onActiveChange(); }, 2500);
})();
