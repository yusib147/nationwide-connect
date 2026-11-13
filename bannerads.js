/* Nationwide Media Connect — bannerads.js (2026-10-23 fix, Ibrahim's report).
   1) HOME RAIL: house banner slot + two advertiser slots after #ad-banner.
   2) UPDATES BAND: sponsored status-style band inside the Updates screen.
   3) MY BANNER ADS HUB: replaces the old single-submission page. Every
      banner payment is its own card (payment state, artwork state, live
      dates, days left, preview, the right next action), artwork uploads
      are bound to a CHOSEN payment, and "Buy another banner ad" starts a
      fresh ₦5,000 manual-transfer claim.
   Live ads come from /api/banner-live (service role) because admin_banners
   is RLS-locked and the browser client could never read it — that is why
   approved banners never appeared on the home page. */
;(function () {
  "use strict";
  var PRICE = "₦5,000";
  var WA = "09150951870";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { try { if (window.NM_toast) { window.NM_toast(m); return; } } catch (e) {} }
  function fmtDate(ts) { try { return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function daysLeft(until) { var d = Math.ceil((new Date(until).getTime() - Date.now()) / 864e5); return d < 0 ? 0 : d; }
  function isVid(url) { return /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url || "")); }

  /* ---------------- live ads feed ---------------- */
  var _adsPromise = null;
  function liveAds() {
    if (_adsPromise) return _adsPromise;
    _adsPromise = fetch("/api/banner-live", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j && j.ok && j.ads) || []; })
      .catch(function () { _adsPromise = null; return []; });
    return _adsPromise;
  }
  function mediaHtml(m, cls) {
    if (!m || !m.url) return "";
    var u = esc(m.url);
    /* Ad stage (eighth pass, Ibrahim's approved mockup 2026-10-24): a
       blurred copy of the creative as backdrop + the full creative
       contain-fitted in front — never cropped, never hidden, whatever
       the metadata timing does. fitStage frames EVERY creative in the
       same fixed 4:5 frame at the LISTING picture's width: the frame
       no longer takes the creative's own ratio (build m's 9:16/9:20
       towers were the disturbance he rejected). A SPONSORED tag rides
       on the frame; video creatives add a VIDEO chip. */
    if (m.kind === "video" || isVid(m.url)) {
      return '<span class="adfit adfit-stage adfit-vid ' + cls + '"><span class="adfit-in"><video class="adfit-bg" src="' + u + '" muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video><video class="adfit-m" src="' + u + '" muted loop playsinline preload="none" data-admain="1"></video></span><span class="ad-tag">Sponsored</span><span class="ad-vtag">\u25B6 Video</span></span>';
    }
    return '<span class="adfit adfit-stage ' + cls + '"><span class="adfit-in"><img class="adfit-bg" src="' + u + '" alt="" aria-hidden="true"><img class="adfit-m" src="' + u + '" alt="" loading="lazy"></span><span class="ad-tag">Sponsored</span></span>';
  }

  /* ---------- ad stages (rail + band): fixed 4:5 frame, contain over blur ---------- */
  /* The listing picture box, measured with a hidden probe using the home
     feed's own classes (.grid > .card > .card-photo), so ads match the
     listings at any viewport. Cached per viewport width. */
  var boxCache = { vw: 0, bw: 0, bh: 0 };
  function listingBox() {
    var vw = document.documentElement.clientWidth || window.innerWidth || 0;
    if (boxCache.bw && boxCache.vw === vw) { return boxCache; }
    var home = document.getElementById("screen-home") || document.body;
    var probe = document.createElement("div");
    probe.className = "grid";
    probe.setAttribute("style", "position:absolute;left:0;right:0;top:0;visibility:hidden;pointer-events:none;margin:0;z-index:-1");
    probe.innerHTML = '<div class="card"><div class="card-photo"></div></div><div class="card"><div class="card-photo"></div></div>';
    home.appendChild(probe);
    var ph = probe.querySelector(".card-photo");
    var bw = ph ? ph.clientWidth : 0;
    var bh = ph ? ph.clientHeight : 0;
    if (probe.parentNode) { probe.parentNode.removeChild(probe); }
    if (bw < 40) {
      /* Probe could not measure (home screen hidden at boot): fall back
         to the grid's own arithmetic — 2 columns, 14px page padding,
         14px gap — so the ad size never depends on the home screen
         being visible when the card is built. */
      var fw = Math.floor(((vw || 412) - 42) / 2);
      if (fw >= 40) { bw = fw; bh = fw; }
    }
    if (bw >= 40) { boxCache = { vw: vw, bw: bw, bh: bh || bw }; }
    return boxCache;
  }
  var fitJobs = [];
  var fitResizeArmed = false;
  function armFitResize() {
    if (fitResizeArmed) return;
    fitResizeArmed = true;
    var rto = null;
    window.addEventListener("resize", function () {
      clearTimeout(rto);
      rto = setTimeout(function () {
        for (var i = 0; i < fitJobs.length; i++) { try { fitJobs[i](); } catch (e) {} }
      }, 150);
    });
  }
  function fitStage(stage) {
    var media = stage.querySelector(".adfit-m");
    if (!media) return;
    var bg = stage.querySelector(".adfit-bg");
    var isVid = media.tagName === "VIDEO";
    /* FIXED 4:5 FRAME (eighth pass, Ibrahim's approved mockup
       2026-10-24): every stage is the same frame — width = the LISTING
       picture's width (see listingBox), height = width x 5/4 — whatever
       shape the advertiser uploaded. The creative contain-fits inside
       over its blurred copy, so the full creative shows at every
       moment and the frame height NEVER varies (build m let a 9:16
       video stand 185x329 and a 9:20 shot 185x411; those towers were
       the disturbance). Sizing no longer waits on metadata: it depends
       only on the listing box and the card width. */
    function apply() {
      var box = listingBox();
      if (!box.bw) return;
      var card = stage.parentElement;
      var cw = card ? card.clientWidth : 0;
      var w = box.bw;
      if (cw >= 40 && w > cw) { w = cw; }
      var h = Math.round(w * 5 / 4);
      stage.style.width = Math.round(w) + "px";
      stage.style.height = Math.round(h) + "px";
      try { stage.setAttribute("data-orient", "fixed45"); } catch (e) {}
    }
    function syncBg() {
      if (!bg || !isVid) return;
      try { if (Math.abs((bg.currentTime || 0) - (media.currentTime || 0)) > 0.4) { bg.currentTime = media.currentTime; } } catch (e) {}
    }
    if (isVid) {
      media.addEventListener("loadeddata", syncBg);
      media.addEventListener("canplay", syncBg);
    }
    /* The Updates screen can be hidden when the band renders: a stage
       whose card has no width yet is sized the moment it scrolls into
       view; a short poll covers screen switches that fire no event. */
    if (window.IntersectionObserver) {
      try {
        var io = new IntersectionObserver(function (es) {
          for (var i = 0; i < es.length; i++) { if (es[i].isIntersecting) { apply(); } }
        }, { threshold: 0.05 });
        io.observe(stage);
      } catch (e) {}
    }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      apply();
      if (stage.style.height || tries >= 48 || (tries > 4 && !document.contains(stage))) { clearInterval(iv); }
    }, 250);
    stage._nmFit = apply;
    fitJobs.push(apply);
    armFitResize();
    apply();
  }
  function wireFit(root) {
    var stages = (root || document).querySelectorAll(".adfit-stage");
    for (var i = 0; i < stages.length; i++) {
      if (!stages[i]._fitWired) { stages[i]._fitWired = true; fitStage(stages[i]); }
    }
  }
  function goAd(ad) {
    if (!ad) return;
    var link = String(ad.link_url || "").trim();
    var shop = String(ad.shop_url || "").trim();
    var target = link || shop;
    var m = target.match(/[?&]shop=([0-9a-f-]{36})/i);
    if (m && window.NM_openStore) { window.NM_openStore(m[1]); return; }
    if (ad.user_id && !link && window.NM_openStore) { window.NM_openStore(ad.user_id); return; }
    if (!target) { toast("This advertiser has not added a link yet."); return; }
    if (target.indexOf("/p/") === 0 || target.indexOf("/?") === 0) { window.location.href = target; return; }
    if (/^https?:\/\//i.test(target)) { window.open(target, "_blank", "noopener"); return; }
    if (target.charAt(0) === "/" && window.NM_show) { window.NM_show(target.replace(/^\//, "")); return; }
    window.location.href = target;
  }
  function openHub() { if (window.NM_openBannerSubmit) window.NM_openBannerSubmit(); }

  /* ---------------- home rail ---------------- */
  var railDone = false;
  var _railTrack = null, _bandTrack = null;
  function railPlaceholder() {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "nm-rail-card";
    b.setAttribute("data-adcard", "1");
    b.innerHTML = '<div class="nm-rail-ph"><div class="nm-rail-big">Your business here</div><div class="nm-rail-small">This space sits on the home page, in front of every buyer who visits.</div></div>' +
      '<div class="nm-rail-body"><div class="nm-rail-kick">Advertise</div><div class="nm-rail-title">' + PRICE + ' for 2 weeks</div><div class="nm-rail-sub">One payment. Your video or pictures live here for a full 2 weeks.</div><span class="nm-rail-cta">Advertise now</span></div>';
    b.addEventListener("click", openHub);
    return b;
  }
  /* Painters are reusable: the first paint comes from liveAds(), later
     repaints come from window.NM_setAdSpots when the live ad set changes
     (liverefresh.js). House card is never touched; ad cards and
     placeholders carry data-adcard so they can be swapped out cleanly.

     STABILITY CONTRACT (build n wave 2 — the blink fix): the old
     painters deleted every ad card and rebuilt them on EVERY call, so
     each liverefresh poll / focus return / realtime echo made the
     rail and band flash out and back in, restarting their videos.
     Painters now reconcile by data-adkey: a refresh carrying the same
     set of ads (any order) is a strict DOM no-op; when the set does
     change, surviving cards keep their exact DOM nodes (videos keep
     playing), only departed cards are removed and only new cards are
     built. */
  function reconcile(track, items, buildNode) {
    var nodes = track.querySelectorAll("[data-adkey]");
    var byKey = {}, curKeys = [];
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute("data-adkey");
      if (!byKey[k]) { byKey[k] = nodes[i]; curKeys.push(k); }
    }
    var wantKeys = items.map(function (it) { return it.key; });
    var setSame = curKeys.length === wantKeys.length && wantKeys.every(function (k) { return !!byKey[k]; });
    if (setSame) return false;
    for (var x = 0; x < curKeys.length; x++) {
      if (wantKeys.indexOf(curKeys[x]) < 0 && byKey[curKeys[x]].parentNode) byKey[curKeys[x]].parentNode.removeChild(byKey[curKeys[x]]);
    }
    items.forEach(function (it) {
      if (!byKey[it.key]) { var n = buildNode(it); if (n) track.appendChild(n); }
    });
    return true;
  }
  function paintRailAds(ads) {
    var track = _railTrack;
    if (!track) return;
    var items = [];
    ads.slice(0, 6).forEach(function (ad) { items.push({ key: gridAdKey(ad), ad: ad }); });
    var shown = Math.min(ads.length, 6);
    for (var i = shown; i < 2; i++) items.push({ key: "__ph" + i, ph: true });
    reconcile(track, items, function (it) {
      if (it.ph) { var p = railPlaceholder(); p.setAttribute("data-adkey", it.key); return p; }
      var ad = it.ad;
      var c = document.createElement("button");
      c.type = "button";
      c.className = "nm-rail-card";
      c.setAttribute("data-adcard", "1");
      c.setAttribute("data-adkey", it.key);
      var first = (ad.media && ad.media[0]) || null;
      c.innerHTML = (first ? mediaHtml(first, "nm-rail-media") : '<div class="nm-rail-ph"><div class="nm-rail-big">' + esc(ad.business || ad.title) + "</div></div>") +
        '<div class="nm-rail-body"><div class="nm-rail-kick">Sponsored</div><div class="nm-rail-title">' + esc(ad.title || ad.business || "Sponsored") + "</div>" +
        (ad.subtitle ? '<div class="nm-rail-sub">' + esc(ad.subtitle) + "</div>" : "") +
        '<span class="nm-rail-cta">View shop</span></div>';
      c.addEventListener("click", function () { goAd(ad); });
      return c;
    });
    wireFit(track);
  }
  function paintBandAds(ads) {
    var track = _bandTrack;
    if (!track) return;
    var items = [];
    if (!ads.length) items.push({ key: "__bandph", ph: true });
    else ads.slice(0, 8).forEach(function (ad) { items.push({ key: gridAdKey(ad), ad: ad }); });
    reconcile(track, items, function (it) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "nm-band-card";
      c.setAttribute("data-adkey", it.key);
      if (it.ph) {
        c.innerHTML = '<div class="nm-band-ph"><div class="nm-band-biz">Your business here</div><div class="nm-band-sub">Sponsored space on the home page and here in Updates.</div></div>' +
          '<div class="nm-band-body"><div class="nm-band-biz">Advertise on Nationwide</div><div class="nm-band-sub">' + PRICE + ' for 2 weeks \u00B7 video or pictures \u00B7 live after a quick review.</div><span class="nm-band-cta">Advertise now</span></div>';
        c.addEventListener("click", openHub);
        return c;
      }
      var ad = it.ad;
      var first = (ad.media && ad.media[0]) || null;
      c.innerHTML = (first ? mediaHtml(first, "nm-band-media") : '<div class="nm-band-ph"><div class="nm-band-biz">' + esc(ad.business || ad.title) + "</div></div>") +
        '<div class="nm-band-body"><div class="nm-band-biz">' + esc(ad.business || ad.title || "Sponsored") + "</div>" +
        (ad.subtitle || ad.title ? '<div class="nm-band-sub">' + esc(ad.subtitle || ad.title) + "</div>" : "") +
        '<span class="nm-band-cta">View shop</span></div>';
      c.addEventListener("click", function () { goAd(ad); });
      return c;
    });
    wireFit(track);
  }
  function renderRail() {
    if (railDone) return;
    var anchor = $("#ad-banner");
    var home = $("#screen-home");
    if (!anchor || !home) return;
    railDone = true;
    var rail = document.createElement("div");
    rail.className = "nm-rail";
    rail.id = "nm-ad-rail";
    rail.innerHTML = '<div class="nm-rail-head"><b>Featured businesses</b><span>Sponsored</span></div><div class="nm-rail-track" id="nm-rail-track"></div>';
    anchor.parentNode.insertBefore(rail, anchor.nextSibling);
    var track = rail.querySelector("#nm-rail-track");
    _railTrack = track;
    var house = document.createElement("button");
    house.type = "button";
    house.className = "nm-rail-card nm-rail-house";
    house.innerHTML = '<div class="nm-rail-ph"><div class="nm-rail-big">Nationwide <span style="color:var(--acc2)">Media Connect</span></div><div class="nm-rail-small">Nigeria\u2019s marketplace \u2014 buy and sell anything, right from your phone.</div></div>' +
      '<div class="nm-rail-body"><div class="nm-rail-kick">House</div><div class="nm-rail-title">Shop. Sell. Nationwide.</div><div class="nm-rail-sub">Phones, cars, fashion and more from real sellers near you.</div><span class="nm-rail-cta">Start selling</span></div>';
    house.addEventListener("click", function () { if (window.NM_show) window.NM_show("sell"); });
    track.appendChild(house);
    liveAds().then(paintRailAds);
  }

  /* ---------------- Updates sponsored band ---------------- */
  var bandDone = false;
  function renderBand() {
    if (bandDone) return;
    var scr = $("#screen-updates");
    if (!scr) return;
    bandDone = true;
    var band = document.createElement("div");
    band.className = "nm-band";
    band.id = "nm-sponsored-band";
    band.innerHTML = '<div class="nm-band-head"><b>Sponsored</b><span>Ads</span></div><div class="nm-band-track" id="nm-band-track"></div>';
    var rail = $("#upd-rail", scr);
    if (rail && rail.parentNode === scr) scr.insertBefore(band, rail.nextSibling);
    else scr.appendChild(band);
    var track = band.querySelector("#nm-band-track");
    _bandTrack = track;
    liveAds().then(paintBandAds);
  }

  /* Live refresh hook (liverefresh.js): repaint rail + band with a fresh
     ad set the moment it changes — newly approved ads appear and expired
     ones drop out, no reload. Also reseeds the cached liveAds() promise
     so any later first-paint uses the fresh set. */
  window.NM_setAdSpots = function (ads) {
    _adsPromise = Promise.resolve(ads || []);
    if (_railTrack) { try { paintRailAds(ads || []); } catch (e) {} }
    if (_bandTrack) { try { paintBandAds(ads || []); } catch (e) {} }
    try { setGridAds(ads || []); } catch (e) {}
  };

  /* ---------------- sponsored card inside the home grid (eighth pass) ---
     Ibrahim's approved mockup: ONE sponsored card living inside the
     default home feed, exactly a listing card's box (1:1 media area,
     portrait creative whole over its blurred copy, title / shop /
     View shop under it), inserted before the 5th listing card. It is
     deliberately NOT a .card and carries NO product data-id:
     homefeed.js counts .card[data-id] against the catalogue, caps the
     feed at 26 listings and reorders them; the ad must be invisible
     to all of that (never counted, never capped, never ranked). It
     stands down exactly when homefeed stands down — search text,
     Verified/Near-me pill on, ux filter-sheet filters on — and it
     only ever shows PAID ads: no live ads, no card (house ads never
     enter the grid). Ads are dealt from a shuffle-bag across feed
     renders so every live advertiser gets the slot in turn. */
  var gridAds = null;          /* null = feed not loaded yet */
  var gridBag = [];
  /* Persistent card nodes by ad key (build n wave 2): app re-renders
     wipe #home-grid's innerHTML, which detaches this card. The SAME
     node is re-inserted afterwards — never rebuilt — so its media
     (and a playing video's buffer) survive home re-renders instead
     of blinking out and reloading. */
  var gridNodes = {};
  var gridCurrentKey = null;   /* advertiser currently on show in the grid */
  function setGridAds(ads) {
    gridAds = (ads || []).filter(function (a) { return a && a.media && a.media[0] && a.media[0].url; });
    gridBag = [];
    syncGridAd();
  }
  function dealGridAd() {
    if (!gridAds || !gridAds.length) return null;
    if (!gridBag.length) {
      gridBag = gridAds.slice();
      for (var a = gridBag.length - 1; a > 0; a--) { var j = (Math.random() * (a + 1)) | 0; var t = gridBag[a]; gridBag[a] = gridBag[j]; gridBag[j] = t; }
    }
    return gridBag.shift();
  }
  function gridAdKey(ad) {
    var m = (ad && ad.media && ad.media[0]) || {};
    return String((ad && (ad.title || ad.business)) || "") + "|" + String(m.url || "");
  }
  function gridMediaHtml(m) {
    var u = esc(m.url);
    if (m.kind === "video" || isVid(m.url)) {
      return '<span class="adfit ad-grid-media"><span class="adfit-in"><video class="adfit-bg" src="' + u + '" muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video><video class="adfit-m" src="' + u + '" muted loop playsinline preload="none" data-admain="1"></video></span><span class="ad-tag">Sponsored</span><span class="ad-vtag">\u25B6 Video</span></span>';
    }
    return '<span class="adfit ad-grid-media"><span class="adfit-in"><img class="adfit-bg" src="' + u + '" alt="" aria-hidden="true"><img class="adfit-m" src="' + u + '" alt="" loading="lazy"></span><span class="ad-tag">Sponsored</span></span>';
  }
  function buildGridCard(ad) {
    var el = document.createElement("div");
    el.className = "ad-grid-card";
    el.setAttribute("data-adkey", gridAdKey(ad));
    var first = (ad.media && ad.media[0]) || null;
    el.innerHTML = (first ? gridMediaHtml(first) : "") +
      '<div class="ad-grid-body"><div class="ad-grid-title">' + esc(ad.title || ad.business || "Sponsored") + "</div>" +
      '<div class="ad-grid-shop">' + esc(ad.subtitle || ad.business || "") + "</div>" +
      '<span class="ad-grid-cta">View shop</span></div>';
    el.addEventListener("click", function () { goAd(ad); });
    return el;
  }
  /* catalogue rows for the stand-down check, session-cached like
     homefeed's own copy */
  var catCache = null, catAt = 0;
  function catRows() {
    var DB = window.NM_DB;
    if (!DB || typeof DB.listProducts !== "function") return Promise.resolve(null);
    if (catCache && Date.now() - catAt < 45000) return Promise.resolve(catCache);
    return DB.listProducts({ category: "", query: "" }).then(function (rows) {
      catCache = rows || [];
      catAt = Date.now();
      return catCache;
    }).catch(function () { return catCache; });
  }
  function lsIdSet(key) {
    try {
      var v = JSON.parse(localStorage.getItem("nc2_" + key) || "[]");
      var out = {};
      if (Array.isArray(v)) v.forEach(function (id) { out[String(id)] = 1; });
      return out;
    } catch (e) { return {}; }
  }
  var gridSyncBusy = false;
  function syncGridAd() {
    var grid = document.getElementById("home-grid");
    if (!grid) return;
    function dropEl(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
    function drop() { dropEl(grid.querySelector(".ad-grid-card")); }
    if (!gridAds || !gridAds.length) { drop(); return; }
    if (grid.querySelector(".skel-card")) { drop(); return; }   /* app still rendering */
    /* stand down whenever the feed is filtered (mirrors homefeed) */
    var inp = document.getElementById("home-search");
    if (inp && inp.value.trim()) { drop(); return; }
    if (document.querySelector("#filter-verified.on, #filter-near.on")) { drop(); return; }
    if (document.querySelector("#ux-home-fbar .ux-fbtn.on")) { drop(); return; }
    var cards0 = grid.querySelectorAll(".card[data-id]");
    if (!cards0.length) { drop(); return; }
    if (gridSyncBusy) return;
    gridSyncBusy = true;
    catRows().then(function (rows) {
      gridSyncBusy = false;
      var grid2 = document.getElementById("home-grid");
      if (!grid2 || grid2 !== grid) return;
      var cards = [].slice.call(grid2.querySelectorAll(".card[data-id]"));
      if (!rows || !cards.length) { dropEl(grid2.querySelector(".ad-grid-card")); return; }
      /* Every rendered card must belong to the unfiltered catalogue
         (minus the user's own hidden/stale lists, which app.js drops).
         A foreign id means a filter or saved search is driving the
         grid — stand down. (A rendered SUBSET is fine: homefeed may
         already have capped the default feed at 26.) */
      var hidden = lsIdSet("hidden"), stale = lsIdSet("stale");
      var expected = {};
      rows.forEach(function (r) { var k = String(r.id); if (!hidden[k] && !stale[k]) expected[k] = 1; });
      for (var i = 0; i < cards.length; i++) {
        if (!expected[String(cards[i].getAttribute("data-id"))]) { dropEl(grid2.querySelector(".ad-grid-card")); return; }
      }
      var cur = grid2.querySelector(".ad-grid-card");
      if (cur) {
        /* if its advertiser left the live set, swap it out */
        var still = false;
        for (var a = 0; a < gridAds.length; a++) { if (gridAdKey(gridAds[a]) === cur.getAttribute("data-adkey")) { still = true; break; } }
        if (!still) { dropEl(cur); cur = null; gridCurrentKey = null; }
        else gridCurrentKey = cur.getAttribute("data-adkey");
      }
      if (!cur) {
        /* Prefer the advertiser already on show (build n wave 2 soak
           fix): after an app re-render wipes the grid, the SAME ad's
           cached node goes back — no mid-session advertiser swap, no
           new node built. Deal a fresh ad only when there is no
           current one or it left the live set. */
        var ad = null;
        if (gridCurrentKey) {
          for (var b = 0; b < gridAds.length; b++) { if (gridAdKey(gridAds[b]) === gridCurrentKey) { ad = gridAds[b]; break; } }
        }
        if (!ad) ad = dealGridAd();
        if (!ad) return;
        var gk = gridAdKey(ad);
        gridCurrentKey = gk;
        cur = gridNodes[gk] || (gridNodes[gk] = buildGridCard(ad));
      }
      /* position ~5th card: before the 5th listing card, else at end.
         Move ONLY when actually misplaced — a same-place insertBefore
         would still detach/reattach the node for nothing. */
      var target = cards.length >= 5 ? cards[4] : null;
      var moved = false;
      if (target) {
        if (cur.parentNode !== grid2 || cur.nextElementSibling !== target) { grid2.insertBefore(cur, target); moved = true; }
      } else if (cur.parentNode !== grid2 || grid2.lastElementChild !== cur) { grid2.appendChild(cur); moved = true; }
      if (moved) {
        var gv = cur.querySelector("video.adfit-m");
        if (gv && gv.paused) { try { var pr = gv.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
      }
    }).catch(function () { gridSyncBusy = false; });
  }
  var gridPending = null;
  function scheduleGridSync() {
    clearTimeout(gridPending);
    /* If the card was just wiped by an app re-render, put it back
       almost immediately (30ms); otherwise debounce normally so
       render storms settle before the stand-down checks run. */
    var g = document.getElementById("home-grid");
    var missing = g && gridAds && gridAds.length && !g.querySelector(".ad-grid-card");
    gridPending = setTimeout(syncGridAd, missing ? 30 : 150);
  }
  (function initGridAd() {
    function observe(g) {
      try { new MutationObserver(scheduleGridSync).observe(g, { childList: true }); } catch (e) {}
    }
    var grid = document.getElementById("home-grid");
    if (grid && window.MutationObserver) { observe(grid); }
    else {
      var n = 0;
      var iv = setInterval(function () {
        var g2 = document.getElementById("home-grid");
        if (g2 && window.MutationObserver) { clearInterval(iv); observe(g2); scheduleGridSync(); }
        else if (++n > 40) { clearInterval(iv); }
      }, 700);
    }
    /* the ux filter sheet hides cards in place (no re-render): follow
       its apply/clear so the card leaves and returns with the feed */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.closest && (t.closest("#ux-f-apply") || t.closest("#ux-f-clear"))) { setTimeout(syncGridAd, 380); }
    }, true);
    liveAds().then(function (ads) { setGridAds(ads); });
    scheduleGridSync();
  })();

  function bootAds() {
    renderRail(); renderBand();
    if (railDone && bandDone) return;
    var n = 0;
    var iv = setInterval(function () { renderRail(); renderBand(); if ((railDone && bandDone) || ++n > 30) clearInterval(iv); }, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootAds); else bootAds();

  /* ================= My banner ads hub ================= */
  var BUCKET = "banner-artwork";
  var MAX_VIDEO_BYTES = 25 * 1024 * 1024;
  var MAX_PIC_BYTES = 5 * 1024 * 1024;
  var MAX_VIDEO_SECS = 20.5;

  function token() {
    var DB = window.NM_DB;
    if (!DB || !DB.client || !DB.client.auth) return Promise.resolve(null);
    return DB.client.auth.getSession().then(function (s) { return (s && s.data && s.data.session && s.data.session.access_token) || null; }).catch(function () { return null; });
  }
  function api(action, extra) {
    return token().then(function (tok) {
      if (!tok) throw new Error("not signed in");
      var body = { token: tok, action: action };
      for (var k in (extra || {})) body[k] = extra[k];
      return fetch("/api/banner-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
    });
  }
  function dbReady() {
    return new Promise(function (resolve) {
      var waited = 0;
      var iv = setInterval(function () {
        waited += 400;
        var DB = window.NM_DB;
        if (DB && DB.mode === "supabase" && DB.client) { clearInterval(iv); resolve(DB); }
        else if (waited >= 10000) { clearInterval(iv); resolve(null); }
      }, 400);
    });
  }
  function myUid() {
    try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; }
  }
  function mediaPreview(media) {
    return (media || []).map(function (m) {
      if (m.kind === "video") return '<video class="nm-ba-thumb" src="' + esc(m.url) + '" controls preload="metadata"></video>';
      return '<img class="nm-ba-thumb" src="' + esc(m.url) + '" alt="Banner artwork">';
    }).join("");
  }
  function stepsHtml(stepIdx) {
    var labels = ["Paid", "Artwork", "Review", "Live"];
    return '<div class="nm-ba-steps">' + labels.map(function (l, i) {
      var cls = i < stepIdx ? "done" : (i === stepIdx ? "now" : "");
      return '<div class="nm-ba-step ' + cls + '">' + l + "</div>";
    }).join("") + "</div>";
  }

  function openHubPage() {
    var old = document.getElementById("nm-bs-page"); if (old) old.remove();
    var old2 = document.getElementById("nm-ba-page"); if (old2) old2.remove();
    var page = document.createElement("div");
    page.className = "nm-ba-page";
    page.id = "nm-ba-page";
    page.innerHTML = '<div class="nm-ba-wrap"><div class="nm-ba-top"><button type="button" class="icon-btn" id="nm-ba-back" aria-label="Back">\u2039</button><h2>My banner ads</h2></div><div id="nm-ba-body"><div class="nm-ba-sec"><p class="nm-ba-sub">Loading\u2026</p></div></div></div>';
    document.body.appendChild(page);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    function close() { page.remove(); try { document.body.style.overflow = ""; } catch (e) {} }
    page.querySelector("#nm-ba-back").addEventListener("click", close);
    window.NM_closeBannerSubmit = close;
    renderHub(page, close);
  }
  window.NM_openBannerSubmit = openHubPage;

  function buyAnother() {
    if (window.NM_manualPay) {
      window.NM_manualPay("banner_30d", null);
    } else {
      toast("Please go back and try again in a moment.");
    }
  }

  function renderHub(page, close) {
    var host = page.querySelector("#nm-ba-body");
    host.innerHTML = '<div class="nm-ba-sec"><p class="nm-ba-sub">Loading your banner ads\u2026</p></div>';
    api("state", {}).then(function (j) {
      if (!j || !j.ok) {
        host.innerHTML = '<div class="nm-ba-sec"><h3>Sign in to see your banner ads</h3><p class="nm-ba-sub">Your banner bookings live on your account. Sign in, then open My banner ads again.</p></div>';
        return;
      }
      var out = "";
      out += '<div class="nm-ba-sec"><h3>Your business on the home page</h3>' +
        '<p class="nm-ba-sub">Every buyer who opens Nationwide Media Connect lands on the home page first. A banner ad puts your business there \u2014 and in the Sponsored band in Updates \u2014 for a full <b>2 weeks</b> from the day it goes live.</p>' +
        '<span class="nm-ba-price">' + PRICE + ' \u00B7 2 weeks \u00B7 video (max 20s) or 1\u20132 pictures</span>' +
        stepsHtml(0) +
        '<p class="nm-ba-sub">How it works: <b>1</b> Pay by transfer. <b>2</b> We confirm it. <b>3</b> Upload your artwork here. <b>4</b> We review it and it goes live for 2 weeks. You can hold more than one banner ad \u2014 each payment below is its own ad with its own artwork and its own 2 weeks.</p>' +
        '<button type="button" class="nm-ba-btn" id="nm-ba-buy">Buy a banner ad \u2014 ' + PRICE + '</button>' +
        '<p class="nm-ba-sub" style="margin-top:10px">Need help? WhatsApp us and quote your payment reference.</p>' +
        '<a class="nm-ba-wa" href="https://wa.me/2349150951870" target="_blank" rel="noopener">Chat ' + WA + ' on WhatsApp</a></div>';

      var pays = j.payments || [];
      var slots = j.slots || [];
      var slotByRef = {};
      slots.forEach(function (s) { slotByRef[s.payment_ref] = s; });
      var subByRef = {};
      (j.submissions || []).forEach(function (s) { if (!subByRef[s.payment_ref]) subByRef[s.payment_ref] = s; });

      if (!pays.length) {
        out += '<div class="nm-ba-sec"><h3>No banner ads yet</h3><p class="nm-ba-sub">When you buy a banner ad it appears here, and you follow it step by step: payment, artwork, review, live.</p></div>';
      }
      pays.forEach(function (p, idx) {
        var slot = slotByRef[p.reference] || null;
        var sub = slot ? slot.submission : (subByRef[p.reference] || null);
        var payState = p.status === "paid" ? "confirmed" : (p.status === "failed" ? "failed" : "pending");
        var artState = slot ? slot.state : (sub ? (sub.status === "pending" ? "in_review" : sub.status === "approved" ? "live" : "rejected") : "none");
        var stepIdx = 0, payChip = "", artChip = "", action = "", meta = "";
        if (payState === "confirmed") { payChip = '<span class="nm-ba-chip ok">Payment confirmed</span>'; stepIdx = 1; }
        else if (payState === "failed") { payChip = '<span class="nm-ba-chip bad">Payment not confirmed</span>'; }
        else { payChip = '<span class="nm-ba-chip warn">Payment under review</span>'; }
        if (artState === "in_review") { artChip = '<span class="nm-ba-chip warn">Artwork in review</span>'; stepIdx = 2; }
        else if (artState === "live") { artChip = '<span class="nm-ba-chip ok">Live now</span>'; stepIdx = 3; }
        else if (artState === "ended") { artChip = '<span class="nm-ba-chip">Finished</span>'; stepIdx = 4; }
        else if (artState === "rejected") { artChip = '<span class="nm-ba-chip bad">Artwork not approved</span>'; stepIdx = 1; }
        else if (payState === "confirmed") { artChip = '<span class="nm-ba-chip warn">Awaiting your artwork</span>'; }

        meta = '<p class="nm-ba-meta">Reference <b>' + esc(p.reference) + "</b> \u00B7 " + PRICE +
          (p.paid_at ? " \u00B7 paid " + fmtDate(p.paid_at) : " \u00B7 sent " + fmtDate(p.created_at)) + "</p>";
        if (sub) {
          meta += '<p class="nm-ba-meta">Artwork: <b>' + esc(sub.title || "Banner") + "</b>" + (sub.subtitle ? " \u00B7 " + esc(sub.subtitle) : "") + "</p>";
        }
        if (artState === "live" && sub) {
          var left = sub.live_until ? daysLeft(sub.live_until) : null;
          meta += '<p class="nm-ba-meta">Live from <b>' + fmtDate(sub.reviewed_at || sub.created_at) + "</b>" +
            (sub.live_until ? " until <b>" + fmtDate(sub.live_until) + "</b>" : "") +
            (left != null ? " \u00B7 <b>" + left + " day" + (left === 1 ? "" : "s") + " left</b>" : "") + "</p>";
        }
        if (payState === "pending") {
          action = '<p class="nm-ba-sub">We are confirming your transfer. This usually lands within a few hours, always within 24 hours. Once confirmed, you can upload your artwork right here.</p>';
        } else if (payState === "failed") {
          action = '<p class="nm-ba-sub">We could not confirm this transfer. If the money left your account, WhatsApp us your reference and receipt and we will sort it out. Otherwise you can pay again.</p><button type="button" class="nm-ba-btn" data-buy="1">Pay again \u2014 ' + PRICE + "</button>";
        } else if (artState === "awaiting_artwork" || artState === "none") {
          action = '<button type="button" class="nm-ba-btn" data-upload="' + esc(p.reference) + '">Upload artwork for this ad</button>';
        } else if (artState === "rejected") {
          action = '<p class="nm-ba-sub">This artwork was not approved. Your payment is still valid \u2014 send new artwork and we will review it again.</p><button type="button" class="nm-ba-btn" data-upload="' + esc(p.reference) + '">Send new artwork</button>';
        } else if (artState === "in_review") {
          action = '<p class="nm-ba-sub">Your artwork is with our team. It goes live for 2 weeks as soon as it is approved \u2014 you do not need to do anything else.</p>';
        } else if (artState === "live") {
          action = '<button type="button" class="nm-ba-btn ghost" data-viewlive="1">View my live ad</button>';
        } else if (artState === "ended") {
          action = '<p class="nm-ba-sub">This ad has finished its 2 weeks.</p><button type="button" class="nm-ba-btn" data-buy="1">Buy another banner ad \u2014 ' + PRICE + "</button>";
        }
        out += '<div class="nm-ba-sec"><h3>Banner ad ' + (pays.length > 1 ? "#" + (pays.length - idx) : "") + "</h3>" +
          '<div class="nm-ba-chips">' + payChip + artChip + "</div>" +
          stepsHtml(Math.min(stepIdx, 3)) + meta +
          (sub ? '<div class="nm-ba-thumbs">' + mediaPreview(sub.media) + "</div>" : "") +
          action + "</div>";
      });

      if (pays.length) {
        out += '<div class="nm-ba-sec"><h3>Want another spot?</h3><p class="nm-ba-sub">Each banner ad is separate: its own artwork, its own 2 weeks. Ads rotate on the home page and in Updates.</p><button type="button" class="nm-ba-btn" id="nm-ba-buy2">Buy another banner ad \u2014 ' + PRICE + "</button></div>";
      }
      host.innerHTML = out;
      var b1 = host.querySelector("#nm-ba-buy"); if (b1) b1.addEventListener("click", buyAnother);
      var b2 = host.querySelector("#nm-ba-buy2"); if (b2) b2.addEventListener("click", buyAnother);
      host.querySelectorAll("[data-buy]").forEach(function (b) { b.addEventListener("click", buyAnother); });
      host.querySelectorAll("[data-viewlive]").forEach(function (b) {
        b.addEventListener("click", function () {
          close();
          if (window.NM_show) window.NM_show("home");
          setTimeout(function () { var r = document.getElementById("nm-ad-rail"); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); }, 450);
        });
      });
      host.querySelectorAll("[data-upload]").forEach(function (b) {
        b.addEventListener("click", function () { renderUpload(page, close, b.getAttribute("data-upload")); });
      });
    }).catch(function () {
      host.innerHTML = '<div class="nm-ba-sec"><p class="nm-ba-sub">Could not load your banner ads right now. Check your connection and try again.</p></div>';
    });
  }

  function renderUpload(page, close, paymentRef) {
    var host = page.querySelector("#nm-ba-body");
    var uid = myUid();
    host.innerHTML = ""
      + '<div class="nm-ba-sec"><h3>Send artwork for this banner ad</h3>'
      + '<p class="nm-ba-sub">This artwork belongs to payment <b>' + esc(paymentRef) + '</b>. Send <b>one video of at most 20 seconds</b> OR <b>1 or 2 pictures</b>. Once approved, this ad goes live on the home page and in Updates for <b>2 weeks</b>.</p>'
      + '<p class="nm-ba-err" id="nm-ba-err" style="display:none"></p>'
      + '<input class="nm-ba-in" id="nm-ba-title" type="text" maxlength="80" placeholder="Business name *">'
      + '<input class="nm-ba-in" id="nm-ba-sub" type="text" maxlength="120" placeholder="One short line about your business (optional)">'
      + '<input class="nm-ba-in" id="nm-ba-link" type="text" placeholder="Tap opens\u2026 (we use your shop page if left empty)">'
      + (uid ? '<button type="button" class="nm-ba-btn ghost" id="nm-ba-shop" style="margin-bottom:10px">Use my shop page as the tap destination</button>' : "")
      + '<div class="nm-ba-mode"><button type="button" id="nm-ba-mv" class="on">\uD83C\uDFAC Video (max 20s)</button><button type="button" id="nm-ba-mp">\uD83D\uDDBC\uFE0F Pictures (1 or 2)</button></div>'
      + '<input class="nm-ba-in" id="nm-ba-file" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov">'
      + '<div class="nm-ba-thumbs" id="nm-ba-thumbs"></div>'
      + '<button type="button" class="nm-ba-btn" id="nm-ba-send" disabled>Send for review</button>'
      + '<button type="button" class="nm-ba-btn ghost" id="nm-ba-cancel" style="margin-top:8px">Back to my banner ads</button></div>'
      + '<div class="nm-ba-sec"><h3>No artwork ready?</h3><p class="nm-ba-sub">Send your video or pictures to our WhatsApp <b>' + WA + '</b> with your business name, one short line, and this payment reference, and we will handle it from there.</p></div>';
    var mode = "video";
    var files = [];
    var errEl = host.querySelector("#nm-ba-err");
    var sendBtn = host.querySelector("#nm-ba-send");
    var fileInput = host.querySelector("#nm-ba-file");
    var thumbs = host.querySelector("#nm-ba-thumbs");
    host.querySelector("#nm-ba-cancel").addEventListener("click", function () { renderHub(page, close); });
    var shopBtn = host.querySelector("#nm-ba-shop");
    if (shopBtn) shopBtn.addEventListener("click", function () { host.querySelector("#nm-ba-link").value = "/?shop=" + uid; toast("Your shop page is set as the tap destination."); });
    function showErr(m) { errEl.textContent = m; errEl.style.display = m ? "block" : "none"; }
    function setMode(m) {
      mode = m; files = [];
      host.querySelector("#nm-ba-mv").className = m === "video" ? "on" : "";
      host.querySelector("#nm-ba-mp").className = m === "pictures" ? "on" : "";
      fileInput.value = "";
      fileInput.accept = m === "video" ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
      fileInput.multiple = m === "pictures";
      thumbs.innerHTML = "";
      sendBtn.disabled = true;
      showErr("");
    }
    host.querySelector("#nm-ba-mv").addEventListener("click", function () { setMode("video"); });
    host.querySelector("#nm-ba-mp").addEventListener("click", function () { setMode("pictures"); });
    function videoDuration(file) {
      return new Promise(function (resolve, reject) {
        var url = null;
        try { url = URL.createObjectURL(file); } catch (e) { reject(new Error("Could not read this video.")); return; }
        var v = document.createElement("video");
        v.preload = "metadata";
        var done = false;
        function fin(ok, val) { if (done) return; done = true; try { URL.revokeObjectURL(url); } catch (e) {} if (ok) resolve(val); else reject(val); }
        v.onloadedmetadata = function () { var d = v.duration; if (!d || isNaN(d)) fin(false, new Error("Could not read this video.")); else fin(true, d); };
        v.onerror = function () { fin(false, new Error("Could not read this video.")); };
        setTimeout(function () { fin(false, new Error("Could not read this video.")); }, 15000);
        v.src = url;
      });
    }
    function videoExtOk(name, type) {
      var t = String(type || "").toLowerCase();
      if (t === "video/mp4" || t === "video/webm" || t === "video/quicktime") return true;
      return /\.(mp4|webm|mov)$/i.test(String(name || ""));
    }
    function picExtOk(name, type) {
      var t = String(type || "").toLowerCase();
      if (t === "image/jpeg" || t === "image/png" || t === "image/webp") return true;
      return /\.(jpe?g|png|webp)$/i.test(String(name || ""));
    }
    fileInput.addEventListener("change", function () {
      showErr("");
      var list = fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
      if (mode === "video") {
        if (list.length !== 1) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("Choose exactly one video."); return; }
        var f = list[0];
        if (!videoExtOk(f.name, f.type)) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("The video must be mp4, webm or mov."); return; }
        if (f.size > MAX_VIDEO_BYTES) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("The video is too large. Maximum is 25MB."); return; }
        sendBtn.disabled = true;
        videoDuration(f).then(function (d) {
          if (d > MAX_VIDEO_SECS) { files = []; thumbs.innerHTML = ""; showErr("This video is " + Math.round(d) + " seconds \u2014 the maximum is 20 seconds."); return; }
          files = [f];
          try { thumbs.innerHTML = '<video class="nm-ba-thumb" src="' + URL.createObjectURL(f) + '" controls preload="metadata"></video>'; } catch (e) {}
          sendBtn.disabled = false;
        }).catch(function (e) { files = []; thumbs.innerHTML = ""; showErr(e && e.message ? e.message : "Could not read this video."); });
      } else {
        if (list.length < 1 || list.length > 2) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("Choose 1 or 2 pictures."); return; }
        for (var i = 0; i < list.length; i++) {
          if (!picExtOk(list[i].name, list[i].type)) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("Pictures must be jpg, png or webp."); return; }
          if (list[i].size > MAX_PIC_BYTES) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("A picture is too large. Maximum is 5MB each."); return; }
        }
        files = list;
        thumbs.innerHTML = list.map(function (f2) {
          try { return '<img class="nm-ba-thumb" src="' + URL.createObjectURL(f2) + '" alt="preview">'; } catch (e) { return ""; }
        }).join("");
        sendBtn.disabled = false;
      }
    });
    sendBtn.addEventListener("click", function () {
      var title = host.querySelector("#nm-ba-title").value.trim();
      var subtitle = host.querySelector("#nm-ba-sub").value.trim();
      var link = host.querySelector("#nm-ba-link").value.trim();
      if (!title) { showErr("Please add your business name."); return; }
      if (link && !(/^https?:\/\//i.test(link) || link.charAt(0) === "/")) { showErr("The link must start with http://, https:// or /."); return; }
      if (!files.length) { showErr(mode === "video" ? "Choose your video first." : "Choose your picture(s) first."); return; }
      showErr("");
      sendBtn.disabled = true;
      sendBtn.textContent = "Uploading\u2026";
      var kind = mode === "video" ? "video" : "image";
      dbReady().then(function (DB) {
        if (!DB) throw new Error("Could not reach the server. Please try again.");
        return DB.client.auth.getSession().then(function (s) {
          var u = s && s.data && s.data.session && s.data.session.user;
          if (!u || !u.id) throw new Error("Please sign in again.");
          return { DB: DB, uid: u.id };
        });
      }).then(function (ctx) {
        var media = [];
        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            var safe = String(f.name || "file").replace(/[^a-zA-Z0-9._-]/g, "").slice(-60) || "file";
            var path = ctx.uid + "/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "-" + safe;
            return ctx.DB.client.storage.from(BUCKET).upload(path, f, {
              contentType: f.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
              upsert: false
            }).then(function (res) {
              if (res.error) throw res.error;
              var pub = ctx.DB.client.storage.from(BUCKET).getPublicUrl(path);
              media.push({ url: pub.data.publicUrl, kind: kind });
            });
          });
        });
        return chain.then(function () { return media; });
      }).then(function (media) {
        sendBtn.textContent = "Sending\u2026";
        return api("submit", { title: title, subtitle: subtitle, link_url: link, media: media, payment_ref: paymentRef });
      }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || "Could not send your artwork.");
        toast("Artwork sent for review. This ad goes live for 2 weeks once approved.");
        renderHub(page, close);
      }).catch(function (e) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send for review";
        showErr(e && e.message ? e.message : "Something went wrong. Please try again.");
      });
    });
  }
})();
