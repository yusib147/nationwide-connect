/* Nationwide Media Connect — performance diet (2026-11-02).
   Loaded FIRST (right after config.js) so every later file registers its
   timers through the diet:
   1. Any setInterval faster than 500ms is slowed to 500ms. The app is built
      from watcher loops that poll the DOM up to 8x per second; on a low-end
      phone that storm is the lag. The watchers are idempotent reconciliation
      loops, so twice per second is plenty.
   2. Fast watchers (under 5s) skip their tick while the tab is hidden.
      Nothing visible is missed; they resume on the next tick when the user
      returns. Long timers (session refresh and friends) are untouched.
   Behaviour of every feature is unchanged while the app is on screen. */
(function () {
  "use strict";
  if (window.__nmPerfDiet) return;
  window.__nmPerfDiet = true;
  var rawInterval = window.setInterval;
  var FLOOR = 500;
  var HIDDEN_SKIP_UNDER = 5000;
  window.setInterval = function (fn, delay) {
    var d = Number(delay) || 0;
    if (d < FLOOR) d = FLOOR;
    if (typeof fn !== "function") {
      return rawInterval.call(window, fn, d);
    }
    var args = Array.prototype.slice.call(arguments, 2);
    var wrapped = function () {
      if (document.hidden && d < HIDDEN_SKIP_UNDER) return;
      return fn.apply(window, args);
    };
    return rawInterval.call(window, wrapped, d);
  };
})();
