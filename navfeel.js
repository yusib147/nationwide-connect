/* ==========================================================================
   navfeel.js — page-feel layer (loaded last, pure overlay).
   Makes navigation feel like moving between real pages, Jiji-style:
   - a slim loadbar sweeps on every screen change
   - the incoming screen fades/rises in briefly
   - cold lists paint shimmer skeleton cards that swap out the moment
     real content lands (no artificial delays anywhere)
   - fresh listings (<24h, from the card's own real timestamp text)
     get a small NEW ribbon
   All DOM writes are guarded (no unconditional writes inside observers).
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------------- Loadbar ---------------- */
  var bar = null, tDone = null, tClean = null;
  function sweep() {
    if (!bar) { bar = document.createElement("div"); bar.id = "nv-bar"; document.body.appendChild(bar); }
    clearTimeout(tDone); clearTimeout(tClean);
    bar.classList.remove("nv-done");
    if (!bar.classList.contains("nv-run")) {
      bar.classList.remove("nv-run"); void bar.offsetWidth; bar.classList.add("nv-run");
    }
    tDone = setTimeout(function () { bar.classList.add("nv-done"); }, 430);
    tClean = setTimeout(function () { bar.classList.remove("nv-run"); bar.classList.remove("nv-done"); }, 1050);
  }

  /* ---------------- Skeletons ---------------- */
  var SKELN = { "home-grid": 6, "cat-grid": 6, "upd-grid": 4, "inbox-list": 4 };
  function skelCard(list) {
    var d = document.createElement("div");
    d.className = "nv-sk";
    d.innerHTML = list
      ? '<div class="nv-sk-av"></div><div class="nv-sk-lines"><i></i><i class="s"></i></div>'
      : '<div class="nv-sk-ph"></div><div class="nv-sk-lines"><i class="p"></i><i></i><i class="s"></i></div>';
    return d;
  }
  function maybeSkeleton(gid) {
    var g = document.getElementById(gid); if (!g) { return; }
    if (g.querySelector(".nv-sk")) { return; }
    for (var i = 0; i < g.children.length; i++) { if (!g.children[i].classList.contains("nv-sk")) { return; } }
    var list = gid === "inbox-list", n = SKELN[gid] || 4, made = [];
    for (var k = 0; k < n; k++) { var c = skelCard(list); g.appendChild(c); made.push(c); }
    var obs = new MutationObserver(function () {
      for (var j = 0; j < g.children.length; j++) {
        if (!g.children[j].classList.contains("nv-sk")) {
          made.forEach(function (m) { if (m.isConnected) { m.remove(); } });
          obs.disconnect(); return;
        }
      }
    });
    obs.observe(g, { childList: true });
    setTimeout(function () { made.forEach(function (m) { if (m.isConnected) { m.remove(); } }); obs.disconnect(); }, 5000);
  }

  /* ---------------- Fresh-listing ribbons (real timestamps only) -------- */
  var freshTimer = null;
  function badgeFresh(grid) {
    if (!grid) { return; }
    for (var i = 0; i < grid.children.length; i++) {
      var card = grid.children[i];
      if (!card.querySelector || card.classList.contains("nv-sk")) { continue; }
      var photo = card.querySelector(".card-photo");
      if (!photo || photo.querySelector(".nv-new")) { continue; }
      var meta = card.querySelector(".card-meta");
      var t = meta ? (meta.textContent || "") : "";
      if (/just now|\b[1-9]\d?\s?mins?\b|\b[1-9]\d?\s?h(ours?)?\b|\b[1-9]\d?\s?hrs?\b/i.test(t)) {
        var r = document.createElement("span");
        r.className = "nv-new"; r.textContent = "NEW";
        photo.appendChild(r);
      }
    }
  }
  function watchGrid(gid) {
    var g = document.getElementById(gid); if (!g || g._nvWatched) { return; }
    g._nvWatched = true;
    new MutationObserver(function () {
      clearTimeout(freshTimer);
      freshTimer = setTimeout(function () { badgeFresh(g); }, 350);
    }).observe(g, { childList: true });
    badgeFresh(g);
  }

  /* ---------------- Screen activation ---------------- */
  var activeId = null;
  var GRID_FOR = { "screen-home": "home-grid", "screen-category": "cat-grid", "screen-updates": "upd-grid", "screen-inbox": "inbox-list" };
  function onActivate(scr) {
    if (!scr || scr.id === activeId) { return; }
    activeId = scr.id;
    sweep();
    scr.classList.remove("nv-enter"); void scr.offsetWidth; scr.classList.add("nv-enter");
    var gid = GRID_FOR[scr.id];
    if (gid) { setTimeout(function () { maybeSkeleton(gid); }, 30); }
  }
  function watch() {
    var screens = document.querySelectorAll(".screen");
    if (!screens.length) { setTimeout(watch, 600); return; }
    screens.forEach(function (scr) {
      new MutationObserver(function () { if (scr.classList.contains("active")) { onActivate(scr); } })
        .observe(scr, { attributes: true, attributeFilter: ["class"] });
      if (scr.classList.contains("active")) { onActivate(scr); }
    });
    ["home-grid", "cat-grid"].forEach(watchGrid);
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", watch); }
  else { watch(); }
})();
