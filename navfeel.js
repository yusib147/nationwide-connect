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
  function badgePromo(grid) {
    var map = window.NM_PROMOTED; if (!map) { return; }
    for (var i = 0; i < grid.children.length; i++) {
      var card = grid.children[i];
      if (!card.getAttribute || card.classList.contains("nv-sk")) { continue; }
      var id = card.getAttribute("data-id");
      if (!id || !map[id]) { continue; }
      var photo = card.querySelector(".card-photo");
      if (!photo || photo.querySelector(".nv-promo")) { continue; }
      var r = document.createElement("span");
      r.className = "nv-promo"; r.textContent = "\uD83D\uDE80 PROMOTED";
      photo.appendChild(r);
    }
  }
  function watchGrid(gid) {
    var g = document.getElementById(gid); if (!g || g._nvWatched) { return; }
    g._nvWatched = true;
    new MutationObserver(function () {
      clearTimeout(freshTimer);
      freshTimer = setTimeout(function () { badgeFresh(g); badgePromo(g); }, 350);
    }).observe(g, { childList: true });
    badgeFresh(g); badgePromo(g);
  }

  /* ---------------- Screen activation ---------------- */
  var activeId = null;
  var GRID_FOR = { "screen-home": "home-grid", "screen-category": "cat-grid", "screen-updates": "upd-grid", "screen-inbox": "inbox-list" };
  function onActivate(scr) {
    if (!scr || scr.id === activeId) { return; }
    activeId = scr.id;
    sweep();
    cascade(scr);
    var gid = GRID_FOR[scr.id];
    if (gid) { setTimeout(function () { maybeSkeleton(gid); }, 30); }
  }
  /* The drop-list cascade: every content block on the screen settles in
     from the top down, in order, each time the screen is entered. */
  var UNWRAP_SEL = "[id$='-body'],[id$='-list'],[id$='-grid'],.screen-scroll,.scroll";
  function cascade(scr) {
    var blocks = [];
    function pushKids(el) {
      for (var i = 0; i < el.children.length; i++) {
        var k = el.children[i];
        if (k.nodeType !== 1 || k.hidden || k.classList.contains("seo-h1")) { continue; }
        if (k.id && /-grid$/.test(k.id)) { continue; } /* grids cascade their own cards */
        if (k.matches && k.matches(UNWRAP_SEL) && k.children.length > 1 && blocks.length < 4) { pushKids(k); }
        else { blocks.push(k); }
        if (blocks.length >= 10) { return; }
      }
    }
    pushKids(scr);
    blocks.forEach(function (b) { b.classList.remove("nv-blk"); });
    void scr.offsetWidth; /* one reflow for the whole cascade, not one per block */
    blocks.forEach(function (b, i) {
      b.style.animationDelay = Math.min(i * 35, 315) + "ms";
      b.classList.add("nv-blk");
    });
    setTimeout(function () {
      blocks.forEach(function (b) { b.classList.remove("nv-blk"); b.style.animationDelay = ""; });
    }, 1000);
  }
  /* Every menu, sheet and dialog: when it becomes visible, its contents
     pop in one after another, top to bottom (Ibrahim, Oct 20). Panels are
     mostly static elements shown/hidden by the app, so each panel gets
     its own tiny attribute watcher that replays the cascade on open —
     no full-page mutation scanning (that was the lag). */
  var PANEL_SEL = ".modal,.sheet,.sheet2,.shx-sheet,.stx-sheet,.store2-sortmenu,.photo-picker,[role='dialog']";
  function panelVisible(p) {
    if (p.hidden) { return false; }
    var cs = getComputedStyle(p);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }
  function playDrop(p) {
    p.classList.remove("nv-drop"); void p.offsetWidth; p.classList.add("nv-drop");
  }
  function registerPanel(p, playNow) {
    if (!p) { return; }
    if (p._nvPanel) { if (playNow) { playDrop(p); } return; }
    p._nvPanel = true;
    var was = false, lastPlay = 0;
    try { was = panelVisible(p); } catch (e) {}
    new MutationObserver(function () {
      var now = false;
      try { now = panelVisible(p); } catch (e) { return; }
      if (now && !was && Date.now() - lastPlay > 450) { lastPlay = Date.now(); playDrop(p); }
      was = now;
    }).observe(p, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    if (playNow || was) { playDrop(p); }
  }
  function scanPanels(root, playNow) {
    if (!root || root.nodeType !== 1) { return; }
    try {
      if (root.matches && root.matches(PANEL_SEL)) { registerPanel(root, playNow); }
      if (root.querySelectorAll) { root.querySelectorAll(PANEL_SEL).forEach(function (p) { registerPanel(p, playNow); }); }
    } catch (e) {}
  }
  function watchOverlays() {
    if (!document.body || document.body._nvDropObs) { return; }
    document.body._nvDropObs = true;
    scanPanels(document.body);
    var pending = [], queued = false;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) { return; }
          var cn = typeof n.className === "string" ? n.className : "";
          /* only plausible panel containers get a subtree scan */
          if (n.parentNode === document.body || /sheet|modal|dialog|picker|menu/.test(cn)) { pending.push(n); }
          else if (n.matches && n.matches(PANEL_SEL)) { registerPanel(n); }
        });
      });
      if (pending.length && !queued) {
        queued = true;
        requestAnimationFrame(function () {
          var batch = pending; pending = []; queued = false;
          batch.forEach(function (n) { scanPanels(n, true); });
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* Press feedback that always fires: a class driven by pointer events,
     so every button, card and bar visibly dips when pressed. */
  var PRESS_SEL = "button,[role='button'],.btn-primary,.btn-secondary,.chip,.mini-btn,.pill,.sort-pill,.link-btn,.nav-btn,.shx-act,.card,.cat-row,.convo,.chat-cta";
  function watchPress() {
    if (document.body._nvPress) { return; }
    document.body._nvPress = true;
    document.addEventListener("pointerdown", function (e) {
      try {
        var t = e.target && e.target.closest ? e.target.closest(PRESS_SEL) : null;
        if (!t) { return; }
        var big = t.classList.contains("card") || t.classList.contains("cat-row") || t.classList.contains("convo") || t.classList.contains("chat-cta");
        /* inline !important: beats every stylesheet layer and entrance animation */
        t.style.setProperty("transition", "transform .15s ease-out, filter .15s ease-out", "important");
        t.style.setProperty("transform", big ? "scale(.955)" : "scale(.9)", "important");
        t.style.setProperty("filter", "brightness(.93)", "important");
        t.classList.add("nv-pressing");
        var clear = function () {
          t.style.removeProperty("transform");
          t.style.removeProperty("filter");
          t.classList.remove("nv-pressing");
          setTimeout(function () { t.style.removeProperty("transition"); }, 180);
          document.removeEventListener("pointerup", clear);
          document.removeEventListener("pointercancel", clear);
        };
        document.addEventListener("pointerup", clear);
        document.addEventListener("pointercancel", clear);
        setTimeout(clear, 2500);
      } catch (err) {}
    }, true);
  }

  function watch() {
    try { watchOverlays(); } catch (e) {}
    try { watchPress(); } catch (e) {}
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
