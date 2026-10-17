/* ---------- premium UI: splash, hero carousel, ticker ---------- */
/* $ helper (app.js keeps its own inside its IIFE; premium.js needs a global one) */
var $ = window.$ || function (s) { return document.querySelector(s); };
function hideSplash() {
  var s = $("#splash");
  if (s) { setTimeout(function () { s.classList.add("hide"); }, 1100); }
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

/* ---------- video-style ad banner: 60s perfect loop ---------- */
function initAdBanner() {
  var wrap = $("#ad-scenes");
  if (!wrap || wrap.dataset.ncInit) { return; }
  wrap.dataset.ncInit = "1";
  var scenes = wrap.querySelectorAll(".ad-scene");
  var fill = $("#ad-progress-fill");
  if (!scenes.length || !fill) { return; }
  var SCENE_MS = 6000, total = scenes.length * SCENE_MS, idx = -1;
  function showScene(i) {
    for (var k = 0; k < scenes.length; k++) {
      scenes[k].classList.toggle("active", k === i);
    }
  }
  var reduce = reduceMotion();
  if (reduce) { showScene(0); fill.style.width = "100%"; return; }
  var start = Date.now();
  showScene(0); idx = 0;
  function tick() {
    var el = (Date.now() - start) % total;
    var i = Math.floor(el / SCENE_MS);
    if (i !== idx) { idx = i; showScene(i); }
    fill.style.width = (el / total * 100).toFixed(2) + "%";
  }
  var timer = setInterval(tick, 120);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { clearInterval(timer); timer = null; }
    else if (!timer) { start = Date.now() - idx * SCENE_MS; timer = setInterval(tick, 120); tick(); }
  });
  /* ad CTA uses the same nav hook as hero buttons */
  var banner = $("#ad-banner");
  if (banner) {
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hero-go]");
      if (b && typeof window.NM_show === "function") { window.NM_show(b.dataset.heroGo); }
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
