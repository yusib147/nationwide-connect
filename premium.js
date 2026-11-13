/* ---------- premium UI: splash, hero carousel, ticker ---------- */
/* $ helper (app.js keeps its own inside its IIFE; premium.js needs a global one) */
var $ = window.$ || function (s) { return document.querySelector(s); };
function hideSplash() {
  var s = $("#splash");
  if (!s) { return; }
  var t0 = Date.now();
  (function chk() {
    var ready = document.querySelector("#home-grid .card") || document.querySelector("#screen-auth.active");
    if (ready || Date.now() - t0 > 900) { s.classList.add("hide"); return; }
    setTimeout(chk, 120);
  })();
  setTimeout(function () { s.classList.add("hide"); }, 2500);
}
function initPremiumUI() {
  /* hero carousel auto-rotate */
  var track = $("#hero-track"), dotsWrap = $("#hero-dots");
  if (track && !track.dataset.ncInit) {
    track.dataset.ncInit = "1";
    var slides = track.children.length, idx = 0;
    var dots = dotsWrap ? dotsWrap.children : [];
    var heroHoldUntil = 0;
    function paintHero() {
      track.style.transform = "translateX(-" + (idx * 100) + "%)";
      for (var i = 0; i < dots.length; i++) { dots[i].className = i === idx ? "on" : ""; }
    }
    /* Hardened 2026-10-17 (backlog 82/83): no rotation for reduced-motion
       users, no ticks in background tabs, a touch holds the current slide,
       and the dots are tappable. */
    if (!reduceMotion()) {
      setInterval(function () {
        if (!document.body.contains(track)) { return; }
        if (document.hidden) { return; }
        if (Date.now() < heroHoldUntil) { return; }
        idx = (idx + 1) % slides;
        paintHero();
      }, 4500);
    }
    track.addEventListener("touchstart", function () { heroHoldUntil = Date.now() + 6000; }, { passive: true });
    track.addEventListener("touchend", function () { heroHoldUntil = Date.now() + 2500; }, { passive: true });
    if (dotsWrap) {
      dotsWrap.addEventListener("click", function (e) {
        var d = e.target && e.target.closest ? e.target.closest("span") : null;
        if (!d) { return; }
        var k = Array.prototype.indexOf.call(dots, d);
        if (k < 0) { return; }
        idx = k;
        paintHero();
        heroHoldUntil = Date.now() + 6000;
      });
    }
    /* hero CTA buttons navigate */
    track.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hero-go]");
      if (b && typeof window.NM_show === "function") { window.NM_show(b.dataset.heroGo); }
    });
  }
  /* ticker: duplicate content for a seamless loop */
  var tick = $("#ticker-track");
  if (tick && !tick.dataset.ncInit) {
    tick.dataset.ncInit = "1";
    tick.innerHTML += tick.innerHTML;
  }
  /* promo countdown: ends Sunday midnight local, then rolls to next week */
  var promo = $("#promo-strip");
  if (promo && !promo.dataset.ncInit) {
    promo.dataset.ncInit = "1";
    promo.hidden = false;
    var ph = $("#promo-h"), pm = $("#promo-m"), ps = $("#promo-s");
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tickPromo() {
      var now = new Date();
      var end = new Date(now);
      end.setDate(now.getDate() + ((7 - now.getDay()) % 7));
      end.setHours(23, 59, 59, 999);
      var diff = Math.max(0, end - now);
      var h = Math.floor(diff / 3600000), m = Math.floor(diff % 3600000 / 60000), s = Math.floor(diff % 60000 / 1000);
      if (ph) { ph.textContent = pad(h); pm.textContent = pad(m); ps.textContent = pad(s); }
    }
    tickPromo();
    setInterval(tickPromo, 1000);
    var go = $("#promo-go");
    if (go) { go.addEventListener("click", function () { if (typeof window.NM_show === "function") { window.NM_show("me"); } }); }
  }
  initAdBanner();
  initCounters();
  initSettings();
}


/* ---------- confetti celebration on auth success ---------- */
function reduceMotion() {
  try {
    if (localStorage.getItem("nm_reduce_motion") === "1") { return true; }
  } catch (e) {}
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function fireConfetti() {
  if (reduceMotion()) { return; }
  var c = document.getElementById("confetti-canvas");
  if (!c) {
    c = document.createElement("canvas");
    c.id = "confetti-canvas";
    document.body.appendChild(c);
  }
  var ctx = c.getContext("2d");
  c.width = window.innerWidth; c.height = window.innerHeight;
  var colors = ["#ff5a1f", "#ff9a3d", "#ffd166", "#00c8ff", "#2f6bff", "#ffffff"];
  var parts = [], n = 150;
  for (var i = 0; i < n; i++) {
    var left = i < n / 2;
    parts.push({
      x: left ? -12 : c.width + 12,
      y: c.height * (0.7 + Math.random() * 0.25),
      vx: (left ? 1 : -1) * (4 + Math.random() * 7),
      vy: -(7 + Math.random() * 8),
      s: 5 + Math.random() * 7,
      r: Math.random() * 6.28,
      vr: (Math.random() - .5) * .3,
      color: colors[(Math.random() * colors.length) | 0],
      circle: Math.random() < .3
    });
  }
  var frame = 0, max = 175;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    var alive = false;
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      p.vy += .22; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= .99;
      if (p.y < c.height + 24) {
        alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, Math.min(1, (max - frame) / 45));
        ctx.fillStyle = p.color;
        if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
        else { ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .62); }
        ctx.restore();
      }
    }
    if (alive && ++frame < max) { requestAnimationFrame(tick); }
    else { ctx.clearRect(0, 0, c.width, c.height); }
  })();
}

/* ---------- video-style ad banner: 60s perfect loop ----------
   Paid banners (admin_banners rows with is_active and in-date range) are
   fetched first and inserted as the leading scenes, so a buyer's paid home
   banner really rotates on the home page. When none are live, the site's
   own promo scenes play as before. */
function nmEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function nmPaidBannerScenes() {
  /* Returns a promise of admin_banners rows that are live right now.
     The supabase-js client loads async, so wait for it briefly. */
  return new Promise(function (resolve) {
    var done = false;
    function fin(rows) { if (!done) { done = true; resolve(rows || []); } }
    /* Primary source: /api/banner-live (service role). admin_banners is
       RLS-locked with no public policy, so the direct client query below
       ALWAYS returned empty and paid banners never showed. The endpoint
       is the real feed; the client query stays only as a fallback. */
    try {
      fetch("/api/banner-live").then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.ok && j.scenes && j.scenes.length) {
          fin(j.scenes.map(function (s) {
            return { title: s.title, subtitle: s.subtitle, image_url: s.media_url, link_url: s.link_url || s.shop_url || "", starts_at: s.starts_at, ends_at: s.ends_at, is_active: true, sort_order: 0 };
          }));
        }
      }).catch(function () {});
    } catch (e) {}
    var waited = 0;
    var iv = setInterval(function () {
      if (done) { clearInterval(iv); return; }
      waited += 500;
      var DB = null;
      try { DB = window.NM_DB; } catch (e) {}
      var ready = DB && DB.mode === "supabase" && DB.client;
      if (!ready && waited < 6000) { return; }
      clearInterval(iv);
      if (!ready) { fin([]); return; }
      try {
        DB.client.from("admin_banners").select("title,subtitle,image_url,link_url,starts_at,ends_at,is_active,sort_order").eq("is_active", true).order("sort_order", { ascending: true }).limit(20)
          .then(function (res) {
            if (res.error || !res.data) { fin([]); return; }
            var now = Date.now();
            var live = res.data.filter(function (b) {
              if (!b || !b.is_active) { return false; }
              if (b.starts_at && new Date(b.starts_at).getTime() > now) { return false; }
              if (b.ends_at && new Date(b.ends_at).getTime() < now) { return false; }
              return true;
            });
            fin(live);
          }, function () { fin([]); });
      } catch (e) { fin([]); }
    }, 500);
    setTimeout(function () { clearInterval(iv); fin([]); }, 8000);
  });
}
/* ---------- ad stage fit (eighth pass, Ibrahim's approved mockup 2026-10-24) ----------
   1) NEVER CROP, NEVER HIDE. The media is object-fit:contain at all times,
      centred over a blurred copy of itself (.adfit-bg). The full creative
      is visible from the first paint — so a zoomed/cropped frame is
      impossible by construction.
   2) ONE FIXED FRAME: 4:5 AT LISTING WIDTH. Build m framed the creative
      in its OWN ratio at listing width; a 9:16 video stood 185x329 and
      a 9:20 shot 185x411 — towers that disturbed the page, and he
      rejected them. His approved design: the frame is ALWAYS 4:5
      portrait at the listing picture's width (.grid > .card >
      .card-photo, 185px at a 412px phone, measured by nmListingBox) —
      185x231, the same height for every advertiser whatever shape they
      uploaded. Sizing depends only on the listing box, never on media
      metadata. Every paid scene stacks the same way: stage centred on
      top, text block BELOW it (SPONSORED / title / subtitle / View
      shop, centred) — the ad sits in the page like content, visible at
      the same time as everything else, never a disturbance. */
var nmFitJobs = [];
var nmFitResizeArmed = false;
function nmArmFitResize() {
  if (nmFitResizeArmed) { return; }
  nmFitResizeArmed = true;
  var rto = null;
  window.addEventListener("resize", function () {
    clearTimeout(rto);
    rto = setTimeout(function () {
      for (var i = 0; i < nmFitJobs.length; i++) { try { nmFitJobs[i](); } catch (e) {} }
    }, 150);
  });
}
function nmBannerAvailW() {
  var b = document.getElementById("ad-banner");
  var w = b ? b.clientWidth - 32 : 0; /* .ad-scene horizontal padding 16px x2 */
  return w >= 40 ? w : 0;
}
var nmBoxCache = { vw: 0, bw: 0, bh: 0 };
function nmListingBox() {
  var vw = document.documentElement.clientWidth || window.innerWidth || 0;
  if (nmBoxCache.bw && nmBoxCache.vw === vw) { return nmBoxCache; }
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
    /* Probe could not measure (home screen hidden at boot, e.g. behind
       the auth gate): fall back to the grid's own arithmetic — 2 columns,
       14px page padding, 14px gap — so the ad size NEVER depends on the
       home screen being visible when the scene is built. Without this,
       an unsized stage fell back to the full scene width (352px). */
    var fw = Math.floor(((vw || 412) - 42) / 2);
    if (fw >= 40) { bw = fw; bh = fw; }
  }
  if (bw >= 40) { nmBoxCache = { vw: vw, bw: bw, bh: bh || bw }; }
  return nmBoxCache;
}
function nmFitStage(stage, availFn) {
  var media = stage.querySelector(".adfit-m");
  if (!media) { return; }
  var bg = stage.querySelector(".adfit-bg");
  var isVid = media.tagName === "VIDEO";
  function apply() {
    var box = nmListingBox();
    if (!box.bw) { return; }
    var slot = availFn ? availFn() : 0;
    if (!slot || slot < 40) { slot = nmBannerAvailW(); }
    if (!slot || slot < 40) { slot = box.bw; }
    /* Fixed 4:5 frame at listing width (eighth pass): height is ALWAYS
       width x 5/4 — the creative's own ratio never reaches the frame. */
    var w = Math.min(slot, box.bw);
    var h = Math.round(w * 5 / 4);
    stage.style.width = Math.round(w) + "px";
    stage.style.height = Math.round(h) + "px";
    try { stage.setAttribute("data-orient", "fixed45"); } catch (e) {}
  }
  function syncBg() {
    if (!bg || !isVid) { return; }
    try { if (Math.abs((bg.currentTime || 0) - (media.currentTime || 0)) > 0.4) { bg.currentTime = media.currentTime; } } catch (e) {}
  }
  if (isVid) {
    media.addEventListener("loadeddata", syncBg);
    media.addEventListener("canplay", syncBg);
  }
  /* Scenes start display:none and the home screen itself may be hidden at
     boot: re-apply when the stage becomes visible, and poll briefly until
     a real width is measurable. */
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
  nmFitJobs.push(apply);
  nmArmFitResize();
  apply();
}
function nmPaidSceneEl(b) {
  var d = document.createElement("div");
  d.className = "ad-scene ad-paid";
  var media = "";
  var url = String(b.image_url || "");
  if (url) {
    var isVid = /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || /video/i.test(url);
    /* Stage = blurred copy of the creative as backdrop + the full creative
       contain-fitted in front (see nmFitStage): never cropped, ever. A
       SPONSORED tag rides on the frame; videos add a VIDEO chip. */
    if (isVid) {
      media = '<div class="ad-stage vid"><div class="adfit-in"><video class="adfit-bg" src="' + nmEsc(url) + '" muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video><video class="adfit-m" src="' + nmEsc(url) + '" muted loop playsinline preload="none" data-admain="1"></video></div><span class="ad-tag">Sponsored</span><span class="ad-vtag">\u25B6 Video</span></div>';
    } else {
      media = '<div class="ad-stage"><div class="adfit-in"><img class="adfit-bg" src="' + nmEsc(url) + '" alt="" aria-hidden="true"><img class="adfit-m" src="' + nmEsc(url) + '" alt="' + nmEsc(b.title || "Sponsored") + '"></div><span class="ad-tag">Sponsored</span></div>';
    }
  }
  var link = String(b.link_url || "").trim();
  if (link) { d.setAttribute("data-paid-link", link); }
  /* Scene layout (eighth pass, approved mockup): EVERY paid scene stacks
     the same way — the fixed 4:5 stage (sized by nmFitStage to the
     listing picture's width) centred on top, the text block BELOW it,
     centred: SPONSORED kicker, title, subtitle, View shop. (The DOM
     keeps text first; the stylesheet's order:-1 lifts the stage above
     it.) No beside-the-text arrangement at any orientation — one card,
     one height, everywhere. */
  d.innerHTML = '<div class="ad-txt"><div class="ad-kicker">Sponsored</div>' +
    '<div class="ad-title">' + nmEsc(b.title || "Sponsored") + "</div>" +
    (b.subtitle ? '<div class="ad-sub">' + nmEsc(b.subtitle) + "</div>" : "") +
    (link ? '<span class="ad-cta" style="display:inline-block">View shop</span>' : "") + "</div>" +
    media;
  var stg = d.querySelector(".ad-stage");
  if (stg) {
    nmFitStage(stg, function () {
      var a = nmBannerAvailW();
      var bx = nmListingBox();
      var cap = bx.bw || 185;
      return a ? Math.min(a, cap) : cap;
    });
  }
  return d;
}
function initAdBanner() {
  var wrap = $("#ad-scenes");
  if (!wrap || wrap.dataset.ncInit) { return; }
  wrap.dataset.ncInit = "1";
  var st = document.createElement("style");
  st.textContent = ".ad-stage{position:relative;border-radius:10px;overflow:hidden;margin:8px auto 2px;background:#0b0b10;width:100%}" +
    ".ad-stage{background-image:linear-gradient(100deg,rgba(255,255,255,.05) 40%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.05) 60%);background-size:200% 100%;animation:shimmer 1.3s infinite linear}" +
    ".adfit-in{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}" +
    ".adfit-bg{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:blur(18px) brightness(.55);transform:scale(1.18);display:block;pointer-events:none}" +
    ".adfit-m{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;display:block}" +
    ".ad-scene[data-paid-link]{cursor:pointer}.ad-scene[data-paid-link] .ad-cta{pointer-events:none}" +
    ".ad-scene[data-ad-placeholder]{cursor:pointer}" +
    /* Stacked card layout (eighth pass): EVERY paid scene is the same
       card — the fixed 4:5 stage (sized by nmFitStage) centred on top,
       the text block below it, centred. No orientation variants, no
       CSS aspect-ratio or max-height caps fighting the JS fit. */
    ".ad-scene.ad-paid.active{display:flex;flex-direction:column;align-items:center;gap:10px}" +
    ".ad-paid .ad-stage{order:-1;margin:0 auto;flex:none}" +
    ".ad-paid .ad-txt{flex:none;width:100%;text-align:center}" +
    ".ad-paid .ad-cta{margin-top:10px}";
  document.head.appendChild(st);
  /* Rotation (restructured 2026-10-23, Ibrahim's order):
     - No paid ads live: the house scenes rotate exactly as before.
     - Paid ads live: every round is exactly 3 frames — frame 1 is the
       Nationwide Media Connect house banner, frames 2 and 3 are advertiser
       ads dealt from a shuffle-bag: all live ads are shuffled, then dealt
       into the ad slots round by round, and the bag is only reshuffled
       after EVERY ad has appeared once, so no ad is preferred over another
       and none is skipped. If a round's two ad slots cannot both be filled
       (a single live ad, or an odd tail of the bag), the spare slot is the
       "Your business here" placeholder scene. Every frame shows for
       SCENE_MS (6s), so no frame ever exceeds the 10s cap.
     Generation counter: restarting the rotation retires the old timers. */
  var gen = 0;
  var SCENE_MS = 6000;
  var houseScenes = Array.prototype.slice.call(wrap.querySelectorAll(".ad-scene"));
  function showOnly(el) {
    var all = wrap.querySelectorAll(".ad-scene");
    for (var k = 0; k < all.length; k++) { all[k].classList.toggle("active", all[k] === el); }
  }
  function startRotation(nextFrame, cycleFrames) {
    var myGen = ++gen;
    function alive() { return myGen === gen; }
    var fill = $("#ad-progress-fill");
    if (!fill || !houseScenes.length) { return; }
    if (reduceMotion()) { showOnly(nextFrame()); fill.style.width = "100%"; return; }
    var pos = 0, frameStart = Date.now(), current = nextFrame();
    showOnly(current);
    var timer = null;
    function tick() {
      if (!alive()) { if (timer) { clearInterval(timer); timer = null; } return; }
      var now = Date.now(), el = now - frameStart;
      if (el >= SCENE_MS) {
        var steps = Math.floor(el / SCENE_MS);
        for (var s = 0; s < steps; s++) { current = nextFrame(); pos = (pos + 1) % cycleFrames; }
        frameStart += steps * SCENE_MS;
        showOnly(current);
        el = now - frameStart;
      }
      fill.style.width = Math.min(100, (pos * SCENE_MS + el) / (cycleFrames * SCENE_MS) * 100).toFixed(2) + "%";
    }
    function arm() { timer = setInterval(tick, 120); }
    arm();
    function onVis() {
      if (!alive()) { document.removeEventListener("visibilitychange", onVis); if (timer) { clearInterval(timer); timer = null; } return; }
      if (document.hidden) { if (timer) { clearInterval(timer); timer = null; } }
      else if (!timer) { frameStart = Date.now(); arm(); tick(); }
    }
    document.addEventListener("visibilitychange", onVis);
  }
  /* House-only rotation: the static house scenes in order (unchanged). */
  var hIdx = 0;
  function houseNextFrame() { var el = houseScenes[hIdx % houseScenes.length]; hIdx++; return el; }
  startRotation(houseNextFrame, Math.max(1, houseScenes.length));
  /* Paid banners: house + shuffle-bag rounds. The live set can be re-fed
     at any time via window.NM_setPaidScenes (liverefresh.js polls
     /api/banner-live and, once the realtime SQL is run, Supabase push):
     new ads are spliced into the remaining bag at a random position,
     removed ads drop out of the DOM and the bag, an emptied set falls
     back to the house-only rotation — the show is never restarted. */
  var houseEl = houseScenes[0];
  var paidState = { els: [], byKey: {}, queue: [], ph: null, live: false };
  function sceneKey(b) { return [b.image_url || "", b.title || "", b.link_url || ""].join("|"); }
  function makePlaceholder() {
    var ph = document.createElement("div");
    ph.className = "ad-scene ad-ph";
    ph.setAttribute("data-ad-placeholder", "1");
    ph.innerHTML = '<div class="ad-kicker">Advertise</div>' +
      '<div class="ad-title">Your business <em>here</em></div>' +
      '<div class="ad-sub">₦5,000 for 2 weeks on this home page. Tap to advertise.</div>' +
      '<span class="ad-cta" style="display:inline-block">Advertise now</span>';
    return ph;
  }
  function refill() {
    var bag = paidState.els.slice();
    for (var a = bag.length - 1; a > 0; a--) { var j = (Math.random() * (a + 1)) | 0; var t = bag[a]; bag[a] = bag[j]; bag[j] = t; }
    paidState.queue = [];
    while (bag.length) {
      paidState.queue.push(houseEl);
      paidState.queue.push(bag.shift());
      paidState.queue.push(bag.length ? bag.shift() : paidState.ph);
    }
  }
  function nextPaidFrame() { if (!paidState.queue.length) { refill(); } return paidState.queue.shift(); }
  function applyPaidScenes(paid) {
    paid = paid || [];
    /* Stability contract (build n wave 2): a refresh carrying the
       same live-ad set (same scene keys, any order) is a strict DOM
       no-op — the slot never tears down or repaints between identical
       polls, focus returns or realtime echoes. */
    var sig = paid.map(function (s) { return sceneKey(s); }).sort().join("\n");
    if (paidState.sig === sig) return;
    paidState.sig = sig;
    var seen = {}, i, k;
    for (i = 0; i < paid.length; i++) {
      k = sceneKey(paid[i]);
      seen[k] = 1;
      if (!paidState.byKey[k]) {
        try {
          var el = nmPaidSceneEl(paid[i]);
          el.setAttribute("data-ad-key", k);
          wrap.appendChild(el);
          paidState.els.push(el);
          paidState.byKey[k] = el;
          if (paidState.live) {
            var pos = paidState.queue.length ? ((Math.random() * (paidState.queue.length + 1)) | 0) : 0;
            paidState.queue.splice(pos, 0, el);
          }
        } catch (e) {}
      }
    }
    var removedShown = false;
    for (k in paidState.byKey) {
      if (!seen[k]) {
        var old = paidState.byKey[k];
        delete paidState.byKey[k];
        if (old.classList && old.classList.contains("active")) { removedShown = true; }
        paidState.els = paidState.els.filter(function (e2) { return e2 !== old; });
        paidState.queue = paidState.queue.filter(function (e2) { return e2 !== old; });
        if (old.parentNode) { old.parentNode.removeChild(old); }
      }
    }
    if (!paidState.live && paidState.els.length) {
      paidState.live = true;
      if (!paidState.ph) { paidState.ph = makePlaceholder(); wrap.appendChild(paidState.ph); }
      startRotation(nextPaidFrame, 3);
    } else if (paidState.live && !paidState.els.length) {
      paidState.live = false;
      paidState.queue = [];
      if (paidState.ph && paidState.ph.parentNode) { paidState.ph.parentNode.removeChild(paidState.ph); }
      paidState.ph = null;
      startRotation(houseNextFrame, Math.max(1, houseScenes.length));
    } else if (removedShown) {
      showOnly(houseEl);
    }
  }
  window.NM_setPaidScenes = applyPaidScenes;
  /* Paid banners arrive async: switch to house + shuffle-bag rounds. */
  nmPaidBannerScenes().then(function (paid) { applyPaidScenes(paid || []); });
  /* ad CTA uses the same nav hook as hero buttons; paid banners follow their link */
  var banner = $("#ad-banner");
  if (banner && !banner.dataset.ncPaidInit) {
    banner.dataset.ncPaidInit = "1";
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hero-go]");
      if (b && typeof window.NM_show === "function") { window.NM_show(b.dataset.heroGo); return; }
      var phEl = e.target.closest("[data-ad-placeholder]");
      if (phEl) {
        if (typeof window.NM_openBannerSubmit === "function") { window.NM_openBannerSubmit(); }
        else if (typeof window.NM_show === "function") { window.NM_show("me"); }
        return;
      }
      var sc = e.target.closest(".ad-scene[data-paid-link]");
      if (sc) {
        var link = sc.getAttribute("data-paid-link") || "";
        var shopM = link.match(/[?&]shop=([0-9a-f-]{36})/i);
        if (shopM && typeof window.NM_openStore === "function") { window.NM_openStore(shopM[1]); return; }
        if (/^\/(?!\/)/.test(link)) {
          if (link.indexOf("/p/") === 0 || link.indexOf("/?") === 0) { window.location.href = link; }
          else if (typeof window.NM_show === "function") { window.NM_show(link.replace(/^\//, "")); }
          else { window.location.href = link; }
        } else if (/^https?:\/\//i.test(link)) { window.open(link, "_blank", "noopener"); }
      }
    });
  }
}

/* ---------- real marketplace stats (no fake numbers) ---------- */
function initCounters() {
  var el1 = document.getElementById("stat-listings");
  var el2 = document.getElementById("stat-sellers");
  var el3 = document.getElementById("stat-cats");
  if (!el1 || !window.NM_DB) { return; }
  function animate(el, target) {
    var t0 = null;
    function step(t) {
      if (!t0) { t0 = t; }
      var pr = Math.min(1, (t - t0) / 1200);
      var eased = 1 - Math.pow(1 - pr, 3);
      el.textContent = Math.round(target * eased);
      if (pr < 1) { requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  }
  window.NM_DB.listProducts({}).then(function (list) {
    var sellers = {};
    for (var i = 0; i < list.length; i++) { if (list[i].sellerId) { sellers[list[i].sellerId] = 1; } }
    animate(el1, list.length);
    animate(el2, Object.keys(sellers).length);
  }).catch(function () { el1.textContent = "0"; el2.textContent = "0"; });
  if (window.NM_DB.listCategories) {
    window.NM_DB.listCategories().then(function (cats) {
      animate(el3, (cats || []).length);
    }).catch(function () { el3.textContent = "0"; });
  } else { el3.textContent = "0"; }
}

/* ---------- settings screen ---------- */
function initSettings() {
  var gear = document.getElementById("me-settings");
  if (gear && !gear.dataset.ncInit) {
    gear.dataset.ncInit = "1";
    gear.addEventListener("click", function () {
      if (typeof window.NM_show === "function") { window.NM_show("settings"); }
      syncSettingsUI();
    });
  }
  var back = document.getElementById("settings-back");
  if (back && !back.dataset.ncInit) {
    back.dataset.ncInit = "1";
    back.addEventListener("click", function () {
      if (typeof window.NM_show === "function") { window.NM_show("me"); }
    });
  }
  var dark = document.getElementById("set-dark");
  if (dark && !dark.dataset.ncInit) {
    dark.dataset.ncInit = "1";
    dark.addEventListener("change", function (e) {
      if (typeof window.NM_setTheme === "function") { window.NM_setTheme(e.target.checked ? "dark" : "light"); }
    });
  }
  var motion = document.getElementById("set-motion");
  if (motion && !motion.dataset.ncInit) {
    motion.dataset.ncInit = "1";
    try { motion.checked = localStorage.getItem("nm_reduce_motion") === "1"; } catch (e) {}
    motion.addEventListener("change", function (e) {
      try { localStorage.setItem("nm_reduce_motion", e.target.checked ? "1" : "0"); } catch (e2) {}
    });
  }
  var alerts = document.getElementById("set-alerts");
  if (alerts && !alerts.dataset.ncInit) {
    alerts.dataset.ncInit = "1";
    try { alerts.checked = localStorage.getItem("nm_alerts") !== "0"; } catch (e) {}
    alerts.addEventListener("change", function (e) {
      try { localStorage.setItem("nm_alerts", e.target.checked ? "1" : "0"); } catch (e2) {}
    });
  }
  var crv = document.getElementById("set-clear-rv");
  if (crv && !crv.dataset.ncInit) {
    crv.dataset.ncInit = "1";
    crv.addEventListener("click", function () {
      try { localStorage.removeItem("nm_recently_viewed"); } catch (e) {}
      if (typeof window.NM_toast === "function") { window.NM_toast("Recently viewed cleared."); }
    });
  }
  var cc = document.getElementById("set-clear-cache");
  if (cc && !cc.dataset.ncInit) {
    cc.dataset.ncInit = "1";
    cc.addEventListener("click", function () {
      try {
        var keep = ["nm_theme", "nm_reduce_motion", "nm_alerts"];
        var vals = {};
        keep.forEach(function (k) { vals[k] = localStorage.getItem(k); });
        localStorage.clear();
        keep.forEach(function (k) { if (vals[k] !== null) { localStorage.setItem(k, vals[k]); } });
      } catch (e) {}
      if (typeof window.NM_toast === "function") { window.NM_toast("Cache cleared."); }
    });
  }
  var lo = document.getElementById("set-logout");
  if (lo && !lo.dataset.ncInit) {
    lo.dataset.ncInit = "1";
    lo.addEventListener("click", function () {
      var btn = document.getElementById("me-logout");
      if (btn) { btn.click(); }
      else if (window.NM_DB && window.NM_DB.signOut) {
        window.NM_DB.signOut().then(function () {
          if (typeof window.NM_show === "function") { window.NM_show("auth"); }
        });
      }
    });
  }
}
function syncSettingsUI() {
  var dark = document.getElementById("set-dark");
  if (dark) { dark.checked = document.documentElement.getAttribute("data-theme") === "dark"; }
}

/* ---------- haptic feedback ---------- */
function haptic(ms) {
  try {
    if (navigator.vibrate && !reduceMotion()) { navigator.vibrate(ms || 10); }
  } catch (e) {}
}
/* light tap on primary actions */
document.addEventListener("click", function (e) {
  var t = e.target.closest(".btn-primary, .nav-btn, .card-fav, .chip");
  if (t) { haptic(8); }
}, { passive: true });

/* ---------- PWA install prompt ---------- */
(function () {
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    /* show install hint in settings after 30s if not installed */
    setTimeout(function () { maybeShowInstall(); }, 30000);
  });
  function maybeShowInstall() {
    if (!deferred) { return; }
    try {
      if (localStorage.getItem("nm_install_dismissed")) { return; }
      if (window.matchMedia("(display-mode: standalone)").matches) { return; }
    } catch (e) {}
    var bar = document.createElement("div");
    bar.className = "install-bar";
    bar.innerHTML = '<span><b>Get the app:</b> Add Nationwide Media Connect to your home screen</span>' +
      '<button class="install-go">Install</button><button class="install-x" aria-label="Dismiss">✕</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add("show"); });
    bar.querySelector(".install-go").addEventListener("click", function () {
      if (deferred) { deferred.prompt(); deferred = null; }
      bar.remove();
    });
    bar.querySelector(".install-x").addEventListener("click", function () {
      try { localStorage.setItem("nm_install_dismissed", "1"); } catch (e) {}
      bar.remove();
    });
  }
})();

/* ---------- offline detection ---------- */
(function () {
  function updateOnline() {
    var bar = document.getElementById("offline-bar");
    if (!navigator.onLine) {
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "offline-bar";
        bar.className = "offline-bar";
        bar.innerHTML = "You are offline. Some features may not work.";
        document.body.appendChild(bar);
        requestAnimationFrame(function () { bar.classList.add("show"); });
      }
    } else if (bar) {
      bar.classList.remove("show");
      setTimeout(function () { bar.remove(); }, 300);
    }
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();
})();
