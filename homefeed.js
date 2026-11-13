/* Nationwide Media Connect — homefeed.js (2026-10-23)
   Personalises the DEFAULT home feed and kills scroll-tap accidents.

   1) FEED LOGIC (Ibrahim's spec): the default (unfiltered) home grid
      shows at most 26 listings. Order of priority:
        a) promoted listings first — promoted items in the user's
           favourite categories ahead of other promoted items;
        b) listings in the categories the user searches / views most;
        c) listings from sellers the user follows, interleaved in;
        d) the general catalogue — admin-featured and paid-bump items
           keep their deterministic head start, the rest rotates.
      The non-pinned fill is shuffled with a per-session seed, so a
      returning user does not see the same 26 every session. The
      behaviour profile (categories searched / viewed) is a lightweight
      counter kept in localStorage on this device only — no server
      writes. This module STANDS DOWN completely whenever the feed is
      filtered: search text present, Verified/Near-me pills on, or the
      rendered set differs from the unfiltered catalogue (category
      filter, saved search, etc.) — the app's own rendering then rules.
      Category screens and every other sort are untouched.

   2) ACCIDENTAL-CLICK GUARD: a tap that was really a scroll gesture
      (pointer moved > 10px, or the page scrolled during the gesture)
      must not open the product it lands on. The last gesture is
      recorded from pointer/touch events; a capture-phase click
      listener on product cards (.card[data-id], every grid that uses
      the shared card renderer) suppresses exactly that one click.
      Clean taps, keyboard clicks (no coordinates) and programmatic
      clicks pass untouched.

   Implementation: the home renderer ne() in app.js is IIFE-private,
   so instead of patching it, this module watches #home-grid renders,
   fetches the same rows ne() used (NM_DB.listProducts, session-cached),
   computes the ranking with the pure hfRank() below, reorders the
   card DOM nodes and detaches overflow cards past the cap. Overflow
   cards return on the next app render / next session's rotation. */
;(function () {
  "use strict";

  var CAP = 26;
  var LS_KEY = "nm_homefeed_profile_v1";
  var SS_KEY = "nm_homefeed_seed_v1";

  /* ================= pure logic (unit-tested by harness) ================= */

  function hfMulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hfShuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Favourite categories from the behaviour profile: combined score
     (searches weigh double — an explicit search is a stronger signal
     than a view), top 2 win. Deterministic tie-breaks. */
  function hfFavCats(profile) {
    var search = (profile && profile.search) || {};
    var view = (profile && profile.view) || {};
    var slugs = {};
    Object.keys(search).forEach(function (s) { slugs[s] = 1; });
    Object.keys(view).forEach(function (s) { slugs[s] = 1; });
    var scored = Object.keys(slugs).map(function (s) {
      return { slug: s, score: 2 * (search[s] || 0) + (view[s] || 0), srch: search[s] || 0 };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.srch !== a.srch) return b.srch - a.srch;
      return a.slug < b.slug ? -1 : 1;
    });
    return scored.slice(0, 2).map(function (x) { return x.slug; });
  }

  /* Interleave two lists at a 3:1 ratio (favourites dominate, followed
     sellers keep appearing); remainders append in order. */
  function hfInterleave(fav, fol) {
    var out = [], i = 0, j = 0;
    while (i < fav.length || j < fol.length) {
      for (var k = 0; k < 3 && i < fav.length; k++) out.push(fav[i++]);
      if (j < fol.length) out.push(fol[j++]);
      if (i >= fav.length) { while (j < fol.length) out.push(fol[j++]); }
      if (j >= fol.length) { while (i < fav.length) out.push(fav[i++]); }
    }
    return out;
  }

  /* The ranking. rows: mapped product rows (id, category slug,
     sellerId, promotedUntil, featured, bumpAt, at). opts: favCats,
     follows (array of seller ids), seed, cap, now.
     Returns at most cap rows, in display order. */
  function hfRank(rows, opts) {
    opts = opts || {};
    var cap = opts.cap || CAP;
    var now = opts.now || Date.now();
    var favCats = opts.favCats || [];
    var follows = {};
    (opts.follows || []).forEach(function (id) { follows[String(id)] = 1; });
    var rand = hfMulberry32((opts.seed || 1) >>> 0);
    function favIdx(r) { var i = favCats.indexOf(r.category); return i < 0 ? 99 : i; }
    var promoted = [], rest = [];
    (rows || []).forEach(function (r) {
      if (r.promotedUntil && r.promotedUntil > now) promoted.push(r); else rest.push(r);
    });
    promoted.sort(function (a, b) {
      var fa = favIdx(a), fb = favIdx(b);
      if (fa !== fb) return fa - fb;
      return (b.promotedUntil || 0) - (a.promotedUntil || 0);
    });
    var fav = [], fol = [], gen = [];
    rest.forEach(function (r) {
      if (favIdx(r) < 99) fav.push(r);
      else if (r.sellerId && follows[String(r.sellerId)]) fol.push(r);
      else gen.push(r);
    });
    var favOrdered = [];
    favCats.forEach(function (slug) {
      favOrdered = favOrdered.concat(hfShuffle(fav.filter(function (r) { return r.category === slug; }), rand));
    });
    fol = hfShuffle(fol, rand);
    var gFeat = [], gBump = [], gRest = [];
    gen.forEach(function (r) {
      if (r.featured) gFeat.push(r);
      else if (r.bumpAt) gBump.push(r);
      else gRest.push(r);
    });
    gFeat.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    gBump.sort(function (a, b) { return (b.bumpAt || 0) - (a.bumpAt || 0); });
    gRest = hfShuffle(gRest, rand);
    return promoted.concat(hfInterleave(favOrdered, fol), gFeat, gBump, gRest).slice(0, cap);
  }

  /* Click-guard decision. g: last gesture {moved, t}. info: the click's
     coordinates + time. Keyboard / assistive clicks carry (0,0) and
     always pass; a stale gesture (>1.5s old) never suppresses. */
  function hfShouldSuppress(g, info) {
    if (!g || !g.moved) return false;
    if (!info || (info.x === 0 && info.y === 0)) return false;
    if (info.now - g.t > 1500) return false;
    return true;
  }

  /* ================= behaviour profile ================= */

  var profile = { search: {}, view: {} };
  function loadProfile() {
    try {
      var j = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (j && typeof j === "object") { profile.search = j.search || {}; profile.view = j.view || {}; }
    } catch (e) {}
  }
  function saveProfile() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch (e) {}
  }
  function bump(kind, slug) {
    if (!slug || !profile[kind]) return;
    profile[kind][slug] = (profile[kind][slug] || 0) + 1;
    var mx = 0, k;
    for (k in profile[kind]) mx = Math.max(mx, profile[kind][k]);
    if (mx > 400) { /* gentle decay so tastes can drift over time */
      for (k in profile.search) profile.search[k] = Math.floor(profile.search[k] / 2);
      for (k in profile.view) profile.view[k] = Math.floor(profile.view[k] / 2);
    }
    saveProfile();
  }
  loadProfile();

  function sessionSeed() {
    try {
      var v = sessionStorage.getItem(SS_KEY);
      if (v) return parseInt(v, 10) || 1;
      var s = Math.floor(Math.random() * 2147483646) + 1;
      sessionStorage.setItem(SS_KEY, String(s));
      return s;
    } catch (e) { return 987654321; }
  }

  /* ---- search text -> category ---- */
  var CAT_NAMES = {
    vehicles: "Vehicles", phones: "Phones and Tablets", electronics: "Electronics",
    furniture: "Furniture", fashion: "Fashion", property: "Property",
    food: "Food, Drinks & Catering", agriculture: "Agriculture & Animals",
    health: "Health & Wellness", jobs: "Jobs & Careers", babies: "Babies & Kids",
    building: "Building & Construction", arts: "Arts & Crafts",
    spiritual: "Religion & Spiritual", services: "Services"
  };
  var catTokens = null;
  function addTok(toks, w) {
    if (w.length >= 4) toks[w] = 1;
    if (w.length >= 5 && w.charAt(w.length - 1) === "s") toks[w.slice(0, -1)] = 1;
  }
  function buildTokens() {
    catTokens = {};
    Object.keys(CAT_NAMES).forEach(function (slug) {
      var toks = {};
      toks[slug] = 1;
      toks[CAT_NAMES[slug].toLowerCase()] = 1;
      CAT_NAMES[slug].toLowerCase().split(/[^a-z]+/).forEach(function (w) { addTok(toks, w); });
      var subs = (window.NM_SUBCATS && window.NM_SUBCATS[slug]) || [];
      subs.forEach(function (sn) {
        var low = String(sn).toLowerCase();
        toks[low] = 1;
        low.split(/[^a-z]+/).forEach(function (w) { addTok(toks, w); });
      });
      catTokens[slug] = Object.keys(toks);
    });
  }
  function categorize(q) {
    var text = " " + String(q || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";
    if (text.trim().length < 3) return null;
    if (!catTokens) buildTokens();
    var best = null, bestLen = 0;
    Object.keys(catTokens).forEach(function (slug) {
      catTokens[slug].forEach(function (tok) {
        if (tok.length >= 3 && tok.length > bestLen && text.indexOf(tok) >= 0) { best = slug; bestLen = tok.length; }
      });
    });
    return best;
  }

  /* ---- hooks: searches, category opens, product views ---- */
  var lastSearchVal = "";
  function hookSearch() {
    var inp = document.getElementById("home-search");
    if (!inp || inp.__hfHooked) return;
    inp.__hfHooked = true;
    var deb = null;
    inp.addEventListener("input", function () {
      clearTimeout(deb);
      deb = setTimeout(function () {
        var v = inp.value.trim();
        if (v.length >= 3 && v !== lastSearchVal) {
          lastSearchVal = v;
          var slug = categorize(v);
          if (slug) bump("search", slug);
        }
      }, 900);
    });
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    var el = t && t.closest ? (t.closest("[data-cat]") || t.closest("[data-empty-cat]")) : null;
    if (!el) return;
    var slug = el.getAttribute("data-cat") || el.getAttribute("data-empty-cat");
    if (slug && CAT_NAMES[slug]) bump("search", slug);
  }, false);

  var rowByIdCache = {};
  var viewInFlight = {};
  function recordView(id) {
    if (id == null || id === "") return;
    var key = String(id);
    var row = rowByIdCache[key];
    if (row) { bump("view", row.category); return; }
    var DB = window.NM_DB;
    if (DB && typeof DB._getProduct === "function" && !viewInFlight[key]) {
      viewInFlight[key] = 1;
      DB._getProduct(id).then(function (r) {
        delete viewInFlight[key];
        if (r && r.category) { rowByIdCache[key] = r; bump("view", r.category); }
      }).catch(function () { delete viewInFlight[key]; });
    }
  }
  function wrapOpen(name) {
    try {
      var orig = window[name];
      if (typeof orig !== "function" || orig.__hfWrapped) return;
      var wrapped = function (id) {
        try { recordView(id); } catch (e) {}
        return orig.apply(this, arguments);
      };
      wrapped.__hfWrapped = true;
      window[name] = wrapped;
    } catch (e) {}
  }
  var wrapTries = 0;
  var wrapIv = setInterval(function () {
    wrapOpen("NM_openDetail");
    wrapOpen("NM_openProduct");
    hookSearch();
    if (++wrapTries > 40) clearInterval(wrapIv);
  }, 500);
  wrapOpen("NM_openDetail"); wrapOpen("NM_openProduct"); hookSearch();

  /* ================= rows + follows (session-cached) ================= */

  var rowsCache = null, rowsAt = 0;
  function getRows() {
    var DB = window.NM_DB;
    if (!DB || typeof DB.listProducts !== "function") return Promise.resolve(null);
    if (rowsCache && Date.now() - rowsAt < 45000) return Promise.resolve(rowsCache);
    return DB.listProducts({ category: "", query: "" }).then(function (rows) {
      rowsCache = rows || [];
      rowsAt = Date.now();
      rowsCache.forEach(function (r) { rowByIdCache[String(r.id)] = r; });
      return rowsCache;
    }).catch(function () { return rowsCache; });
  }
  var folCache = null, folAt = 0;
  function getFollows() {
    var DB = window.NM_DB;
    if (!DB || typeof DB.followingIds !== "function") return Promise.resolve([]);
    if (folCache && Date.now() - folAt < 60000) return Promise.resolve(folCache);
    return DB.followingIds().then(function (ids) {
      folCache = (ids || []).map(String);
      folAt = Date.now();
      return folCache;
    }).catch(function () { return folCache || []; });
  }
  function registerLive(tries) {
    var DB = window.NM_DB;
    if (DB && typeof DB.onLive === "function") {
      try { DB.onLive("products", function () { rowsCache = null; rowsAt = 0; }); } catch (e) {}
      try { DB.onLive("follows", function () { folCache = null; folAt = 0; }); } catch (e) {}
      return;
    }
    if (tries > 0) setTimeout(function () { registerLive(tries - 1); }, 800);
  }
  registerLive(25);

  /* ================= home feed processing ================= */

  var held = [];          /* overflow cards of the current render generation */
  var appliedSig = null;  /* id sequence of the arrangement we produced */
  var processing = false;
  var genCounter = 0;

  function lsIdSet(key) {
    try {
      var v = JSON.parse(localStorage.getItem("nc2_" + key) || "[]");
      var out = {};
      if (Array.isArray(v)) v.forEach(function (id) { out[String(id)] = 1; });
      return out;
    } catch (e) { return {}; }
  }
  function cardIds(grid) {
    return [].slice.call(grid.querySelectorAll(".card[data-id]")).map(function (c) {
      return c.getAttribute("data-id");
    });
  }
  function overlayOpen() {
    try {
      var mr = document.getElementById("modal-root");
      if (mr && mr.children.length) return true;
      if (document.querySelector(".nm-ba-page, .nm-bs-page")) return true;
      if (document.body && document.body.style.overflow === "hidden") return true;
    } catch (e) {}
    return false;
  }

  function processHome() {
    var grid = document.getElementById("home-grid");
    if (!grid) return;
    if (grid.querySelector(".skel-card")) return;      /* app still rendering */
    var ids = cardIds(grid);
    if (!ids.length) return;
    if (ids.join(",") === appliedSig) return;          /* our own arrangement */
    if (overlayOpen()) { setTimeout(processHome, 700); return; }
    /* stand down whenever the feed is filtered */
    var inp = document.getElementById("home-search");
    if (inp && inp.value.trim()) return;
    if (document.querySelector("#filter-verified.on, #filter-near.on")) return;
    if (document.querySelector("#ux-home-fbar .ux-fbtn.on")) return;
    if (processing) return;
    processing = true;
    var myGen = ++genCounter;
    var sigAtStart = ids.join(",");
    Promise.all([getRows(), getFollows()]).then(function (res) {
      processing = false;
      if (myGen !== genCounter) return;
      var rows = res[0];
      if (!rows) return;
      var grid2 = document.getElementById("home-grid");
      if (!grid2 || grid2 !== grid) return;
      var ids2 = cardIds(grid2);
      if (ids2.join(",") !== sigAtStart) return;      /* re-rendered under us */
      /* The rendered set must be EXACTLY the unfiltered catalogue minus
         the user's own hidden/stale lists (which app.js's Z() drops).
         Anything else means a filter is active — stand down. */
      var hidden = lsIdSet("hidden"), stale = lsIdSet("stale");
      var expected = {};
      rows.forEach(function (r) {
        var k = String(r.id);
        if (!hidden[k] && !stale[k]) expected[k] = 1;
      });
      var expCount = Object.keys(expected).length;
      if (ids2.length !== expCount) return;
      for (var i = 0; i < ids2.length; i++) { if (!expected[String(ids2[i])]) return; }
      /* rank + reorder + cap */
      var ordered = hfRank(rows.filter(function (r) { return !!expected[String(r.id)]; }), {
        favCats: hfFavCats(profile),
        follows: res[1] || [],
        seed: sessionSeed(),
        cap: CAP,
        now: Date.now()
      });
      var keep = {}, rankPos = {};
      ordered.forEach(function (r, i) { keep[String(r.id)] = 1; rankPos[String(r.id)] = i; });
      var cards = [].slice.call(grid2.querySelectorAll(".card[data-id]"));
      cards.sort(function (a, b) {
        return (rankPos[a.getAttribute("data-id")] || 0) - (rankPos[b.getAttribute("data-id")] || 0);
      });
      held = [];
      var frag = document.createDocumentFragment();
      cards.forEach(function (card) {
        if (keep[card.getAttribute("data-id")]) frag.appendChild(card);
        else held.push(card);
      });
      grid2.appendChild(frag);
      appliedSig = cardIds(grid2).join(",");
    }).catch(function () { processing = false; });
  }

  /* The uxfix filter sheet filters by hiding cards in place. If the
     user applies or clears sheet filters after we capped the grid,
     hand the held cards back FIRST (capture phase, before the sheet's
     own handlers run) so its filtering sees the full grid again —
     personalisation stands down while sheet filters rule. Held cards
     are only valid for the render generation that produced them. */
  function restoreHeld() {
    if (!held.length) return;
    var grid = document.getElementById("home-grid");
    if (grid && appliedSig && cardIds(grid).join(",") === appliedSig) {
      held.forEach(function (c) { grid.appendChild(c); });
    }
    held = [];
    appliedSig = null;
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && (t.closest("#ux-f-apply") || t.closest("#ux-f-clear"))) restoreHeld();
  }, true);

  var pendingT = null;
  function scheduleProcess() {
    clearTimeout(pendingT);
    pendingT = setTimeout(processHome, 280);
  }
  var grid0 = document.getElementById("home-grid");
  if (grid0 && window.MutationObserver) {
    try { new MutationObserver(scheduleProcess).observe(grid0, { childList: true }); } catch (e) {}
  }
  scheduleProcess();
  setTimeout(processHome, 1500);
  setTimeout(processHome, 3500);

  /* ================= accidental-click guard (all product cards) ================= */

  var gesture = null;
  function gStart(x, y) {
    gesture = { x: x, y: y, t: Date.now(), moved: false, sy: window.scrollY || 0 };
  }
  function gMove(x, y) {
    if (!gesture) return;
    var dx = x - gesture.x, dy = y - gesture.y;
    if (dx * dx + dy * dy > 100) gesture.moved = true;   /* > 10px */
  }
  if (window.PointerEvent) {
    document.addEventListener("pointerdown", function (e) { gStart(e.clientX, e.clientY); }, { capture: true, passive: true });
    document.addEventListener("pointermove", function (e) { gMove(e.clientX, e.clientY); }, { capture: true, passive: true });
    document.addEventListener("pointercancel", function () { gesture = null; }, true);
  } else if ("ontouchstart" in window) {
    document.addEventListener("touchstart", function (e) {
      var t = e.touches && e.touches[0];
      if (t) gStart(t.clientX, t.clientY);
    }, { capture: true, passive: true });
    document.addEventListener("touchmove", function (e) {
      var t = e.touches && e.touches[0];
      if (t) gMove(t.clientX, t.clientY);
    }, { capture: true, passive: true });
    document.addEventListener("touchcancel", function () { gesture = null; }, true);
  }
  /* a gesture that actually scrolled the page counts as moved even if
     the finger itself barely travelled (momentum / container scroll) */
  window.addEventListener("scroll", function () {
    if (gesture && Math.abs((window.scrollY || 0) - gesture.sy) > 4) gesture.moved = true;
  }, { capture: true, passive: true });

  document.addEventListener("click", function (e) {
    var t = e.target;
    var card = t && t.closest ? t.closest(".card[data-id]") : null;
    if (!card) return;
    if (hfShouldSuppress(gesture, { x: e.clientX || 0, y: e.clientY || 0, now: Date.now() })) {
      e.preventDefault();
      e.stopPropagation();
      gesture = null;   /* consume: suppress exactly one click */
    }
  }, true);
})();
