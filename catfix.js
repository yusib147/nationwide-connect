/* Nationwide Media Connect — catfix.js (2026-11-05, overnight bug scan,
   rotation #2: core storefront navigation and discovery).
   Two category-results repairs that live here because app.js is frozen
   tonight (never edit it):

   1) SORT PILLS ARE DEAD TAPS. app.js oe() wires the #cat-sort pills
      with `i.document.querySelectorAll(...)` where i is the #cat-list
      ELEMENT, so the call throws (an Element has no .document) and the
      pills never get a listener anywhere else in the tree — tapping
      Newest / Price up / Price down does nothing, and the throw leaves
      a console error on the first directory render. This module wires
      the pills itself and sorts the rendered #cat-grid cards in place,
      matching se()'s intended sorts (plo = price ascending, phi = price
      descending, new = the render's own promoted-then-newest order,
      restored from the render). Card click/fav listeners survive:
      nodes are moved, never rebuilt.

   2) CATEGORY RESULTS NEVER LIVE-REFRESH. app.js's onLive("products")
      handler compares the current screen against `q` — but q is the
      TAB ARRAY, not the current screen (that is U) — so the comparison
      is always false and category results never re-render on a live
      product change (home is covered by liverefresh.js; category is
      not). This module registers its own products listener (client.js
      multiplexes every listener onto one channel per user, so this
      adds no new channel and no new egress) and, when category results
      are visible, re-renders them through the app's own public
      NM_goCategory(slug), leaving the subcategory filter (NM_subcat)
      untouched. Scroll position is preserved by scrollrest.js and
      liverefresh.js anchors.

   The underlying app.js typos (i.document, q-vs-U) are left in place
   per tonight's frozen-file rule and logged for a future approved
   one-token edit; the user-visible behaviour is restored here. */
;(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) {
    try { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
    catch (e) { return []; }
  }

  /* ---------------- 1) sort pills ---------------- */

  function grid() { return document.getElementById("cat-grid"); }

  function cardPrice(card) {
    try {
      var el = card.querySelector ? card.querySelector(".card-price") : null;
      var txt = el ? (el.textContent || "") : (card.textContent || "");
      var m = txt.match(/[\d,]+/);
      return m ? parseInt(m[0].replace(/,/g, ""), 10) || 0 : 0;
    } catch (e) { return 0; }
  }

  function cardIds() {
    var g = grid();
    if (!g) return [];
    return $$(".card[data-id]", g).map(function (c) { return c.getAttribute("data-id"); });
  }

  var originalOrder = [];
  var lastSetKey = null;

  function activeSort() {
    var pills = $$("#cat-sort .sort-pill");
    for (var i = 0; i < pills.length; i++) {
      if (pills[i].classList && pills[i].classList.contains("on")) {
        return pills[i].getAttribute("data-sort") || "new";
      }
    }
    return "new";
  }

  function applySort(sort) {
    var g = grid();
    if (!g) return;
    var cards = $$(".card[data-id]", g);
    if (cards.length < 2) return;
    var frag = document.createDocumentFragment();
    if (sort === "new") {
      var pos = {};
      originalOrder.forEach(function (id, i) { pos[id] = i; });
      cards.sort(function (a, b) {
        var pa = pos[a.getAttribute("data-id")], pb = pos[b.getAttribute("data-id")];
        if (pa === undefined) pa = 9999;
        if (pb === undefined) pb = 9999;
        return pa - pb;
      });
    } else {
      var indexed = cards.map(function (c, i) {
        var oi = originalOrder.indexOf(c.getAttribute("data-id"));
        return { el: c, price: cardPrice(c), oi: oi < 0 ? i : oi };
      });
      indexed.sort(function (a, b) {
        if (a.price !== b.price) {
          return sort === "plo" ? a.price - b.price : b.price - a.price;
        }
        return a.oi - b.oi;
      });
      cards = indexed.map(function (x) { return x.el; });
    }
    cards.forEach(function (c) { frag.appendChild(c); });
    g.appendChild(frag);
  }

  /* A fresh render changes the SET of ids; our own reorder never does,
     so this records the render order and re-applies the active sort
     without ever looping on our own moves. */
  function onGridMutated() {
    var ids = cardIds();
    if (!ids.length) { return; }
    var key = ids.slice().sort().join(",");
    if (key === lastSetKey) { return; }
    lastSetKey = key;
    originalOrder = ids.slice();
    var s = activeSort();
    if (s !== "new") { applySort(s); }
  }

  function armGrid() {
    var g = grid();
    if (!g) { return false; }
    if (g.__catFixArmed) { return true; }
    g.__catFixArmed = true;
    onGridMutated();
    if (window.MutationObserver) {
      try {
        new MutationObserver(function () { onGridMutated(); })
          .observe(g, { childList: true });
      } catch (e) {}
    }
    return true;
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var pill = t && t.closest ? t.closest("#cat-sort .sort-pill") : null;
    if (!pill) { return; }
    var sort = pill.getAttribute("data-sort") || "new";
    $$("#cat-sort .sort-pill").forEach(function (p) {
      if (p.classList) { p.classList.toggle("on", p === pill); }
    });
    armGrid();
    applySort(sort);
  });

  /* ---------------- 2) category live refresh ---------------- */

  var CAT_BY_NAME = {
    "Vehicles": "vehicles", "Phones and Tablets": "phones",
    "Electronics": "electronics", "Furniture": "furniture",
    "Fashion": "fashion", "Property": "property",
    "Food, Drinks & Catering": "food",
    "Agriculture & Animals": "agriculture",
    "Health & Wellness": "health", "Jobs & Careers": "jobs",
    "Babies & Kids": "babies",
    "Building & Construction": "building", "Arts & Crafts": "arts",
    "Religion & Spiritual": "spiritual", "Services": "services"
  };

  function currentCatSlug() {
    var title = document.getElementById("cat-results-title");
    if (!title) { return null; }
    var txt = (title.textContent || "").split("›")[0].trim();
    return CAT_BY_NAME[txt] || null;
  }

  function resultsVisible() {
    var scr = document.getElementById("screen-category");
    if (!scr || !scr.classList.contains("active")) { return false; }
    var head = document.getElementById("cat-results-head");
    if (!head || head.hidden) { return false; }
    return !!grid();
  }

  function overlayOpen() {
    try {
      var mr = document.getElementById("modal-root");
      if (mr && mr.children.length) { return true; }
      if (document.getElementById("ux-scrim")) { return true; }
      if (document.querySelector(".nm-ba-page, .nm-bs-page")) { return true; }
      if (document.body && document.body.style.overflow === "hidden") { return true; }
    } catch (e) {}
    return false;
  }

  var liveTimer = null, liveRetries = 0;
  function fireLiveRefresh() {
    liveTimer = null;
    if (document.hidden || !resultsVisible()) { return; }
    if (overlayOpen()) {
      if (liveRetries < 3) {
        liveRetries++;
        liveTimer = setTimeout(fireLiveRefresh, 3000);
      }
      return;
    }
    liveRetries = 0;
    var slug = currentCatSlug();
    if (slug && typeof window.NM_goCategory === "function") {
      try { window.NM_goCategory(slug); } catch (e) {}
    }
  }
  function onLiveProducts() {
    if (liveTimer) { clearTimeout(liveTimer); }
    liveRetries = 0;
    liveTimer = setTimeout(fireLiveRefresh, 1000);
  }

  var liveRegistered = false, liveTries = 0;
  function registerLive() {
    if (liveRegistered) { return; }
    var DB = window.NM_DB;
    if (DB && typeof DB.onLive === "function") {
      try { DB.onLive("products", onLiveProducts); liveRegistered = true; return; }
      catch (e) {}
    }
    if (++liveTries < 25) { setTimeout(registerLive, 800); }
  }

  /* ---------------- boot ---------------- */

  armGrid();
  var armTries = 0;
  var armIv = setInterval(function () {
    if (armGrid() || ++armTries > 40) { clearInterval(armIv); }
  }, 500);
  registerLive();

  window.NM_catFix = {
    applySort: applySort, activeSort: activeSort,
    currentCatSlug: currentCatSlug, resultsVisible: resultsVisible
  };
})();
