/* Nationwide Media Connect — storefront2.js (2026-10-25)
   Ibrahim's three-feature order, part 2 + 3:

   CHANGE 2 — product taps open the SELLER'S store page, with the tapped
   product scrolled into view and glow-highlighted. The item page itself
   stays one tap away: tapping the product's row on the store page opens
   it, and opens that start on the item page (Similar items, error retry)
   still go straight to the item page. Deep links (/?item=, which is also
   where /p/ preview pages send people) land on the store + highlight too.

   CHANGE 3 — "Chat on WhatsApp" (a) inside the conversation menu and
   (b) on the seller store page, shown only when the other party has a
   phone number on their profile.

   Placement matters: index.html loads this file BEFORE homefeed.js on
   purpose. homefeed wraps NM_openDetail/NM_openProduct to record product
   views for feed ranking; its wrapper composes on top of this one, so
   view recording keeps working for every tap, whichever route the tap
   takes. */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function cssEsc(s) { return String(s == null ? "" : s).replace(/["\\]/g, "\\$&"); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); } catch (e) {} } }
  function DB() { return window.NM_DB || null; }

  var WA_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function waDigits(phone) {
    var db = DB();
    if (db && typeof db.normalizePhone === "function") {
      try { var n = db.normalizePhone(phone); if (n) { return String(n).replace(/[^0-9]/g, ""); } } catch (e) {}
    }
    var d = String(phone || "").replace(/[^0-9]/g, "");
    if (d.charAt(0) === "0") { d = "234" + d.slice(1); }
    return d;
  }
  function waHref(phone) {
    var d = waDigits(phone);
    return d ? "https://wa.me/" + d : "";
  }

  /* ================= product lookup (short-lived cache) ================= */
  var rowsCache = null, rowsAt = 0;
  function allProducts() {
    var db = DB();
    if (!db || typeof db.listProducts !== "function") { return Promise.resolve(null); }
    if (rowsCache && Date.now() - rowsAt < 45000) { return Promise.resolve(rowsCache); }
    return db.listProducts({}).then(function (rows) {
      rowsCache = rows || null; rowsAt = Date.now();
      return rowsCache;
    }).catch(function () { return null; });
  }
  function findProduct(id) {
    if (window.NM_detailProduct && String(window.NM_detailProduct.id) === String(id)) {
      return Promise.resolve(window.NM_detailProduct);
    }
    return allProducts().then(function (rows) {
      if (!rows) { return null; }
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === String(id)) { return rows[i]; }
      }
      return null;
    });
  }

  function activeScreen() {
    var s = $(".screen.active");
    return s ? s.id : "";
  }
  function reduceMotion() {
    try { if (localStorage.getItem("nm_reduce_motion") === "1") { return true; } } catch (e) {}
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  /* ================= glow highlight on the store grid =================
     Render-aware (2026-10-26 fix): the old version raced a fixed 6s
     polling budget and a 3s glow that started on a timer — on a slow
     phone the store grid often rendered after the budget expired, or
     the glow burned itself out during the smooth scroll, so the user
     never saw it. Now the highlight ARMS and stays until the user
     interacts (tap / scroll / key) or a generous 15s passes; it is
     re-applied whenever the row node appears or is replaced (the
     shopx regrouper rebuilds rows), and scrolling happens only once
     the row actually has layout. */
  var glow = null; /* {pid, until, node, iv, mo, off} */
  function endGlow() {
    if (!glow) { return; }
    if (glow.iv) { clearInterval(glow.iv); }
    if (glow.mo) { try { glow.mo.disconnect(); } catch (e) {} }
    if (glow.off) {
      ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (ev) {
        document.removeEventListener(ev, glow.off, true);
      });
    }
    var rows = document.querySelectorAll("#store2-grid .sf-glow, #store2-grid .sf-glow-still");
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove("sf-glow");
      rows[i].classList.remove("sf-glow-still");
    }
    glow = null;
  }
  function applyGlow() {
    if (!glow) { return; }
    if (Date.now() > glow.until) { endGlow(); return; }
    var row = document.querySelector('#store2-grid [data-srow="' + cssEsc(glow.pid) + '"]');
    if (!row) { return; }
    if (row !== glow.node) {
      glow.node = row;
      if (row.offsetHeight > 0) {
        try { row.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" }); } catch (e) {
          try { row.scrollIntoView(); } catch (e2) {}
        }
      }
    }
    row.classList.add(reduceMotion() ? "sf-glow-still" : "sf-glow");
  }
  function highlight(pid) {
    endGlow();
    glow = { pid: String(pid), until: Date.now() + 15000, node: null, iv: null, mo: null, off: null };
    glow.off = function () { endGlow(); };
    ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (ev) {
      document.addEventListener(ev, glow.off, true);
    });
    glow.iv = setInterval(applyGlow, 200);
    var sb = document.getElementById("seller-body");
    if (sb && window.MutationObserver) {
      glow.mo = new MutationObserver(function () { applyGlow(); });
      try { glow.mo.observe(sb, { childList: true, subtree: true }); } catch (e) {}
    }
    applyGlow();
  }

  function goStore(p, orig, id) {
    if (typeof window.NM_openStore === "function" && p.sellerId) {
      window.NM_openStore(p.sellerId);
      highlight(p.id);
    } else if (typeof orig === "function") {
      orig(id);
    }
  }

  /* ================= CHANGE 2: route product opens to the store ========= */
  function route(id, orig) {
    if (!id || typeof orig !== "function") { return; }
    var scr = activeScreen();
    /* Item page already open: Similar items, error retry and other
       detail-internal opens stay on the item page. */
    if (scr === "screen-detail") { orig(id); return; }
    if (scr === "screen-seller") {
      /* A tap on the store's own rows (or anything while the tapped
         product is right there in the open store) opens the item page. */
      var row = document.querySelector('#store2-grid [data-srow="' + cssEsc(id) + '"]');
      if (row) { orig(id); return; }
    }
    findProduct(id).then(function (p) {
      if (!p || !p.sellerId) { orig(id); return; }
      if (scr === "screen-seller" && lastSellerId && String(lastSellerId) === String(p.sellerId)) {
        orig(id); return;
      }
      goStore(p, orig, id);
    }).catch(function () { orig(id); });
  }

  /* Install-once semantics: other modules (homefeed) wrap these globals
     after us to record views. Checking the CURRENT top function's flags
     would make us wrap again every time they do, stacking layers — so
     installation is tracked here, in module state, not on the function. */
  var installed = { openDetail: false, openProduct: false, openStore: false };
  function wrapOpen(name, key) {
    if (installed[key]) { return; }
    var orig = window[name];
    if (typeof orig !== "function") { return; }
    var wrapped = function (id) { route(id, orig); };
    wrapped.__sf2 = true;
    window[name] = wrapped;
    installed[key] = true;
  }

  /* ================= CHANGE 3b: WhatsApp on the seller store ============ */
  var lastSellerId = null;
  var profCache = {};
  function sellerProfile(sid) {
    if (!sid) { return Promise.resolve(null); }
    if (profCache[sid]) { return Promise.resolve(profCache[sid]); }
    var db = DB();
    if (!db || typeof db.getProfileById !== "function") { return Promise.resolve(null); }
    return db.getProfileById(sid).then(function (pr) {
      if (pr) { profCache[sid] = pr; }
      return pr;
    }).catch(function () { return null; });
  }

  function injectStoreWa() {
    var acts = $("#seller-body .store2-acts");
    if (!acts || !lastSellerId) { return; }
    if (acts.querySelector(".sf-wa")) { return; }
    var sid = String(lastSellerId);
    var db = DB();
    if (db && typeof db.currentUser === "function") {
      /* Do not offer "chat with yourself" on your own store. */
      db.currentUser().then(function (u) {
        if (u && String(u.id) === sid) { return; }
        paintStoreWa(acts, sid);
      }).catch(function () { paintStoreWa(acts, sid); });
    } else {
      paintStoreWa(acts, sid);
    }
  }
  function paintStoreWa(acts, sid) {
    if (!acts.isConnected || acts.querySelector(".sf-wa")) { return; }
    sellerProfile(sid).then(function (pr) {
      var href = pr && pr.phone ? waHref(pr.phone) : "";
      if (!href) { return; } /* no phone on the profile: no button, per spec */
      if (!acts.isConnected || acts.querySelector(".sf-wa")) { return; }
      var a = document.createElement("a");
      a.className = "store2-act sf-wa";
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = '<span class="sf-wa-ic">' + WA_SVG + "</span>WhatsApp";
      var chat = acts.querySelector("#store-chat");
      if (chat && chat.nextSibling) { acts.insertBefore(a, chat.nextSibling); }
      else if (chat) { acts.appendChild(a); }
      else { acts.insertBefore(a, acts.firstChild); }
    });
  }

  function wrapStore() {
    if (installed.openStore) { return; }
    var orig = window.NM_openStore;
    if (typeof orig !== "function") { return; }
    var wrapped = function (sellerId) {
      lastSellerId = sellerId || lastSellerId;
      var r = orig.apply(this, arguments);
      var n = 0;
      var iv = setInterval(function () {
        injectStoreWa();
        if (++n > 24 || $("#seller-body .sf-wa")) { clearInterval(iv); }
      }, 250);
      return r;
    };
    wrapped.__sf2 = true;
    window.NM_openStore = wrapped;
    installed.openStore = true;
  }

  /* ================= CHANGE 3a: WhatsApp in the conversation menu ======= */
  function myId() {
    try {
      var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null");
      return u && (u.id || u.user_id) || null;
    } catch (e) { return null; }
  }
  function peerFromConvo() {
    var c = window.NM_threadConvo;
    if (!c) { return null; }
    var me = myId();
    var isBuyer = me && c.buyerId && String(me) === String(c.buyerId);
    var isSeller = me && c.sellerId && String(me) === String(c.sellerId);
    return {
      id: isBuyer ? c.sellerId : isSeller ? c.buyerId : (c.sellerId || c.buyerId),
      phone: isBuyer ? (c.sellerPhone || "") : isSeller ? (c.buyerPhone || "") : (c.sellerPhone || c.buyerPhone || "")
    };
  }
  function ensureThreadWa() {
    var pop = $("#thread-menu-pop");
    if (!pop || pop.querySelector(".sf-wa-item")) { return; }
    if (!pop.querySelector("[data-act]")) { return; } /* menu not built yet */
    var peer = peerFromConvo();
    if (!peer || !peer.id) { return; }
    function paint(phone) {
      var href = phone ? waHref(phone) : "";
      if (!href || pop.querySelector(".sf-wa-item")) { return; }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sf-wa-item";
      b.innerHTML = '<span class="mi" style="color:#25d366">' + WA_SVG + "</span>Chat on WhatsApp";
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        pop.hidden = true;
        window.open(href, "_blank", "noopener");
      });
      var first = pop.querySelector("[data-act]");
      if (first && first.nextSibling) { pop.insertBefore(b, first.nextSibling); }
      else { pop.appendChild(b); }
    }
    if (peer.phone) { paint(peer.phone); return; }
    /* Convo snapshot had no phone: check the profile itself. */
    sellerProfile(String(peer.id)).then(function (pr) { paint(pr && pr.phone); });
  }

  /* ================= deep links: /?item= lands on store + glow ========= */
  var deepId = null;
  try { deepId = new URLSearchParams(window.location.search).get("item"); } catch (e) {}
  function watchDeepLink() {
    if (!deepId) { return; }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var dp = window.NM_detailProduct;
      if (dp && String(dp.id) === String(deepId) && activeScreen() === "screen-detail") {
        clearInterval(iv);
        findProduct(deepId).then(function (p) {
          if (p && p.sellerId && typeof window.NM_openStore === "function") {
            window.NM_openStore(p.sellerId);
            highlight(p.id);
          }
        });
      } else if (tries > 45) {
        clearInterval(iv);
      }
    }, 400);
  }

  /* ============ card-tap routing (2026-10-26 live bug fix) ============
     Root cause of "tapping a product opens the product page, not the
     seller's store": the shared card renderer in app.js binds card
     clicks straight to its INTERNAL detail opener (he), never to the
     window.NM_openDetail global this module wraps. Every grid that
     uses that renderer (home, category, search, favourites, recently
     viewed, price-drop alerts) therefore bypassed the store routing
     entirely; only surfaces that call the global (updates band,
     notifications, store rows, thread strip) ever routed. Fix: a
     capture-phase tap interceptor on <body> that forwards plain card
     taps to window.NM_openDetail (whose route() above then decides,
     exactly as designed). It is registered on body — NOT document —
     so homefeed's accidental-click guard (a document-level capture
     listener that stopPropagation()s scroll taps) still runs first
     and still suppresses fling taps before they can reach us.
     Pass-throughs preserve today's behaviour exactly: taps on buttons
     / links / form controls inside a card (favourite heart, Promote,
     Delete, ...), and any tap while the detail or seller screen is
     active (similar items and the store's own grid keep their direct
     in-place open). */
  var tapWired = false;
  function wireCardTaps() {
    if (tapWired || !document.body) { return; }
    tapWired = true;
    document.body.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) { return; }
      if (t.closest("button, a, input, select, textarea, label, [data-fav]")) { return; }
      var card = t.closest(".card[data-id], .rv-item[data-id], .alert-row[data-id]");
      if (!card) { return; }
      var scr = activeScreen();
      if (scr === "screen-detail" || scr === "screen-seller") { return; }
      var id = card.getAttribute("data-id");
      if (!id || typeof window.NM_openDetail !== "function") { return; }
      e.preventDefault();
      e.stopPropagation();
      window.NM_openDetail(id);
    }, true);
  }

  /* ================= wiring ================= */
  function wire() {
    wrapOpen("NM_openDetail", "openDetail");
    wrapOpen("NM_openProduct", "openProduct");
    wrapStore();
    wireCardTaps();

    var pop = $("#thread-menu-pop");
    if (pop && window.MutationObserver && !pop.__sf2Obs) {
      pop.__sf2Obs = true;
      var mo = new MutationObserver(function () { ensureThreadWa(); });
      mo.observe(pop, { attributes: true, attributeFilter: ["hidden"], childList: true });
    }
    var sb = $("#seller-body");
    if (sb && window.MutationObserver && !sb.__sf2Obs) {
      sb.__sf2Obs = true;
      var deb = null;
      var mo2 = new MutationObserver(function () {
        if (deb) { return; }
        deb = setTimeout(function () { deb = null; injectStoreWa(); }, 120);
      });
      mo2.observe(sb, { childList: true, subtree: true });
    }
  }

  var tries = 0;
  var iv = setInterval(function () {
    wire();
    if ((installed.openDetail && installed.openStore) || ++tries > 40) {
      clearInterval(iv);
    }
  }, 400);
  wire();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchDeepLink);
  } else {
    watchDeepLink();
  }

  /* Small public surface for tests + future modules. */
  window.NM_sf2 = { highlight: highlight, waHref: waHref, peerFromConvo: peerFromConvo };
})();
