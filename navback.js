/* ==========================================================================
   navback.js — back-navigation layer (loaded last, pure overlay module).
   Ibrahim's order (2026-10-24): (1) the phone/browser BACK button must walk
   back through the app's own layers instead of leaving the app or doing
   nothing; (2) every layer needs a visible back/close control because
   iPhones have no back button — the full-screen product photo viewer was
   the named example.

   How it works:
   - An in-app layer stack is kept in sync with the History API. Opening a
     layer (a non-tab screen such as product detail, or a registered
     overlay such as the photo viewer, sheets, sub-pages) pushes one
     history entry. popstate closes exactly the TOPMOST layer and lands on
     the previous place: photo viewer -> product, product -> the screen the
     user came from, sub-page -> its parent.
   - Layers closed by their own controls are detected by a DOM scanner;
     the matching history entry is consumed with history.go() so the two
     stacks never drift (no double-close, no loops).
   - Tab screens (home, category, inbox, updates, me) and the auth screen
     are ROOTS: reaching one resets the stack, so back at the true root is
     the platform default — the user is never trapped in the app.
   - The suspension veil (#nm-lockveil) and the account gate are NOT
     registered layers and are never touched: back can never shake them.
   - Visible-control fixes shipped here: a guaranteed 48px high-contrast
     back button inside the photo viewer (the app's own close is 42px at
     14% white — effectively invisible on bright photos), an x button for
     the filter sheet (which had none), an x for the side drawer, and
     >=44px tap targets for the existing back/close controls.
   Nothing in the app's own files is modified by this module at runtime
   beyond those injected buttons/styles.
   ========================================================================== */
(function () {
  "use strict";

  var $ = function (s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } };
  var $$ = function (s, r) { try { return Array.prototype.slice.call((r || document).querySelectorAll(s)); } catch (e) { return []; } };

  var TOKEN = "nb1";
  var GEN = "g" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  var TAB_ROOTS = { home: 1, category: 1, inbox: 1, updates: 1, me: 1 };

  var stack = [];          /* [0] = base screen; the rest are open layers */
  var histPos = 0;         /* our depth the browser currently sits on */
  var resetCtr = 0;        /* bumped on every stack reset; states carry it */
  var applying = false;    /* true while a popstate-driven close/nav runs */
  var syncExpected = 0;    /* popstates we triggered ourselves (bookkeeping) */
  var pendingRootScr = null;
  var lastScreen = null;
  var scanTimer = null;

  function depth() { return stack.length - 1; }

  function currentScreen() {
    var el = $(".screen.active");
    if (!el || !el.id) { return null; }
    return el.id.indexOf("screen-") === 0 ? el.id.slice(7) : el.id;
  }

  function makeState(d, entry) {
    return {
      nb: TOKEN, gen: GEN, rs: resetCtr, d: d,
      scr: entry && entry.kind === "screen" ? entry.screen : null,
      ov: entry && entry.kind === "ov" ? entry.key : null
    };
  }

  function pushLayer(entry) {
    stack.push(entry);
    try { history.pushState(makeState(depth(), entry), ""); } catch (e) {}
    histPos = depth();
  }

  function writeRootState(scr) {
    try { history.replaceState({ nb: TOKEN, gen: GEN, rs: resetCtr, d: 0, scr: scr, ov: null }, ""); } catch (e) {}
  }

  /* Move the browser back to targetDepth without treating the resulting
     popstate as a user back press. */
  function syncGoTo(target) {
    if (histPos <= target) { histPos = target; return; }
    var k = histPos - target;
    histPos = target;
    syncExpected++;
    try { history.go(-k); } catch (e) {}
  }

  function resetStack(scr) {
    stack = [{ kind: "screen", screen: scr }];
    resetCtr++;
    lastScreen = scr;
    if (histPos > 0) { pendingRootScr = scr; syncGoTo(0); }
    else { writeRootState(scr); }
  }

  function nearestScreen() {
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].kind === "screen" && !stack[i].dead) { return stack[i].screen; }
    }
    return "home";
  }

  function gotoScreen(name) {
    if (!name || currentScreen() === name) { lastScreen = name; return; }
    applying = true;
    try { if (window.NM_show) { window.NM_show(name); } } catch (e) {}
    applying = false;
    lastScreen = name;
  }

  /* ------------------------- overlay registry ------------------------- */
  function clickEl(el) { if (el) { try { el.click(); return true; } catch (e) {} } return false; }

  var OVERLAYS = [
    { key: "drawer",
      probe: function () { var d = $("#sz-drawer"); return !!(d && !d.hidden); },
      close: function () { if (!clickEl($("#sz-scrim"))) { var d = $("#sz-drawer"), s = $("#sz-scrim"); if (d) { d.hidden = true; } if (s) { s.hidden = true; } } } },
    { key: "sheet-contact",
      probe: function () { var e = $("#contact-sheet"); return !!(e && !e.hidden); },
      close: function () { var e = $("#contact-sheet"); if (e && !clickEl($("[data-close-sheet]", e))) { e.hidden = true; } } },
    { key: "sheet-report",
      probe: function () { var e = $("#report-sheet"); return !!(e && !e.hidden); },
      close: function () { var e = $("#report-sheet"); if (e && !clickEl($("[data-close-sheet]", e))) { e.hidden = true; } } },
    { key: "sheet-theme",
      probe: function () { var e = $("#theme-sheet"); return !!(e && !e.hidden); },
      close: function () { var e = $("#theme-sheet"); if (e && !clickEl($("[data-close-sheet]", e))) { e.hidden = true; } } },
    { key: "report2",
      probe: function () { var e = $("#nm-report-sheet"); return !!(e && !e.hidden && e.childNodes.length); },
      close: function () {
          if (window.NM_reportClose) { try { window.NM_reportClose(); return; } catch (e) {} }
          if (!clickEl($("#rps-cancel"))) { var r = $("#nm-report-sheet"); if (r) { r.hidden = true; } } } },
    { key: "locsheet",
      probe: function () { var e = $("#nm-loc-root"); return !!(e && e.classList.contains("on")); },
      close: function () { var e = $("#nm-loc-root"); if (e && !clickEl($("#loc-x", e))) { e.classList.remove("on"); } } },
    { key: "uxfilter",
      probe: function () { return !!$("#ux-scrim"); },
      close: function () { var e = $("#ux-scrim"); if (e) { e.remove(); } } },
    { key: "modal",
      probe: function () { var e = $("#modal-root"); return !!(e && e.childNodes.length); },
      close: function () { var e = $("#modal-root"); if (e) { e.innerHTML = ""; } } },
    { key: "profsheet",
      probe: function () { var e = $("#nm-prof-root"); return !!(e && e.classList.contains("on")); },
      close: function () { var e = $("#nm-prof-root"); if (e && !clickEl($(".sheet2-x", e))) { e.classList.remove("on"); } } },
    { key: "srepsheet",
      probe: function () { var e = $("#nm-srep-root"); return !!(e && e.classList.contains("on")); },
      close: function () { var e = $("#nm-srep-root"); if (e && !clickEl($(".sheet2-x", e))) { e.classList.remove("on"); } } },
    { key: "mepage",
      probe: function () { var e = $("#nm-mepage"); return !!(e && e.classList.contains("open")); },
      close: function () {
          if (!clickEl($("#nm-mepage-back")) && window.NM_closeMePage) { try { window.NM_closeMePage(); } catch (e) {} } } },
    { key: "bannerhub",
      probe: function () { return !!$(".nm-ba-page"); },
      close: function () { clickEl($("#nm-ba-back")); } },
    { key: "bannersub",
      probe: function () { return !!$(".nm-bs-page"); },
      close: function () {
          if (window.NM_closeBannerSubmit) { try { window.NM_closeBannerSubmit(); return; } catch (e) {} }
          clickEl($(".nm-bs-page .nm-bs-top button")); } },
    { key: "hvpage",
      probe: function () { return !!$(".nm-hv-page"); },
      close: function () { clickEl($("#nm-hv-back")); } },
    { key: "premium",
      probe: function () { return !!$("#nm-premium"); },
      close: function () { clickEl($("#nm-premium-close")); } },
    { key: "paymanual",
      probe: function () { return !!$("#pm-scrim"); },
      close: function () { clickEl($("#pm-scrim .pm-x")); } },
    /* Rotation #5 (2026-11-05): the Premium Centre, plan sheet, welcome
       sheet, Refer dashboard and photo sheet had no registry entry, so
       browser Back never closed them — it navigated underneath (or, at
       a tab root, out of the app) while the full-screen overlay stayed
       open. Each close below clicks the overlay's own close control, so
       its own cleanup runs (body overflow restore, card re-render).
       Deliberately NOT registered: the wallet-pay choice sheet
       (#nm-ref-scrim) — its X proceeds to the card/transfer payment
       path, so a Back press must never click it. */
    { key: "phubpage",
      probe: function () { return !!$("#phub-page"); },
      close: function () { clickEl($("#phub-back")); } },
    { key: "phubplans",
      probe: function () { return !!$("#phub-plans"); },
      close: function () { clickEl($("#phub-plans .phub-x")); } },
    { key: "phubwelcome",
      probe: function () { return !!$("#phub-welcome"); },
      close: function () { clickEl($("#phub-welcome-x")); } },
    { key: "cmpage",
      probe: function () { return !!$("#nm-cmp-page"); },
      close: function () { clickEl($("#nm-cmp-back")); } },
    { key: "refpage",
      probe: function () { return !!$("#nm-refer-page"); },
      close: function () { clickEl($("#nm-ref-back")); } },
    { key: "photosheet",
      probe: function () { return !!$("#nm-photo-sheet"); },
      close: function () { clickEl($("#nm-photo-sheet [data-close]")); } },
    { key: "sharex",
      probe: function () { return !!$("#shx-sheet-ov"); },
      close: function () { clickEl($(".shx-x")); } },
    { key: "statusx",
      probe: function () { return !!$("#stx-sheet-ov"); },
      close: function () { clickEl($("#stx-sheet-x")); } },
    { key: "status", /* #status-root hosts viewer / composer / preview states */
      probe: function () {
        var root = $("#status-root");
        if (!root || !root.childNodes.length) { return false; }
        if ($("#pv-md", root)) { return "preview"; }
        if ($(".stc2", root)) { return "composer"; }
        return "viewer";
      },
      close: function (sub) {
        if (sub === "preview" && clickEl($("#pv-x"))) { return; }
        if (sub === "composer" && clickEl($("#stc-cancel"))) { return; }
        if (window.NM_statusClose) { try { window.NM_statusClose(); return; } catch (e) {} }
        var root = $("#status-root"); if (root) { root.innerHTML = ""; root.classList.remove("on"); } } },
    { key: "chatimg",
      probe: function () { var e = $("#chat-img-viewer"); return !!(e && !e.hidden); },
      close: function () {
          if (!clickEl($("#chat-img-x"))) { var v = $("#chat-img-viewer"); if (v) { v.hidden = true; } document.body.style.overflow = ""; } } },
    { key: "hvplayer",
      probe: function () { return !!$(".nm-hv-player"); },
      close: function () { clickEl($(".nm-hv-player-x")); } },
    { key: "fs",
      probe: function () { return !!$("#fs-viewer"); },
      close: function () {
          if (!clickEl($("#fs-close"))) { var r = $("#fs-root"); if (r) { r.innerHTML = ""; } } } }
  ];

  function defFor(key) {
    var base = key.split(":")[0];
    for (var i = 0; i < OVERLAYS.length; i++) { if (OVERLAYS[i].key === base) { return OVERLAYS[i]; } }
    return null;
  }

  function closeOverlay(fullKey) {
    var def = defFor(fullKey);
    if (!def) { return; }
    var sub = fullKey.indexOf(":") > -1 ? fullKey.split(":")[1] : null;
    applying = true;
    try { def.close(sub); } catch (e) {}
    applying = false;
  }

  function isOpenKey(fullKey) {
    var def = defFor(fullKey);
    if (!def) { return false; }
    var p = false;
    try { p = def.probe(); } catch (e) {}
    if (!p) { return false; }
    if (def.key === "status") { return ("status:" + p) === fullKey; }
    return true;
  }

  /* --------------------------- stack engine --------------------------- */
  /* Close layers until the stack depth is d. At most ONE live layer is
     closed per call (one back press = one layer); tombstones are free. */
  function reconcileTo(d) {
    var closedReal = false, poppedScreen = false, poppedThread = false;
    while (stack.length - 1 > d) {
      var top = stack[stack.length - 1];
      if (top.dead) { stack.pop(); continue; }
      if (closedReal) { break; }
      stack.pop();
      closedReal = true;
      if (top.kind === "ov") { closeOverlay(top.key); }
      else { poppedScreen = true; if (top.screen === "thread") { poppedThread = true; } }
    }
    if (poppedScreen) {
      var target = nearestScreen();
      if (poppedThread) {
        /* Browser-Back out of a chat: the app's own #thread-back handler
           is the ONLY code that stops the 5s message poll (ge()) and
           clears the open-thread id (ve). A plain screen switch leaves
           both running, so the hidden thread keeps fetching and
           re-rendering every 5s until the next chat open, logout or
           reload — and its read-receipt hook can mark messages read
           while the user is elsewhere. Route the pop through that
           handler, then land on the screen the stack says we came
           from (inbox when the chat opened from inbox, detail when it
           opened from the item page) — the handler alone would always
           land on inbox. The handler's own inbox render is harmless
           when the destination is detail: leaving inbox clears the
           inbox poll again, and the detail body persists. */
        if (clickEl($("#thread-back"))) {
          if (target && target !== currentScreen()) { gotoScreen(target); }
        } else {
          gotoScreen(target);
        }
      } else {
        gotoScreen(target);
      }
    }
    if (closedReal || poppedScreen) { scheduleScan(60); }
  }

  function onPopstate(e) {
    var st = null;
    try { st = e.state; } catch (err) {}
    var valid = !!(st && st.nb === TOKEN && st.gen === GEN);
    if (syncExpected > 0) {
      syncExpected--;
      histPos = valid ? st.d : 0;
      if (pendingRootScr != null && histPos === 0) { writeRootState(pendingRootScr); pendingRootScr = null; }
      if (valid && st.rs === resetCtr) { reconcileTo(st.d); }
      scheduleScan(40);
      return;
    }
    if (!valid || st.rs !== resetCtr) {
      /* Foreign state or a state from before the last root reset: the
         browser is at (or below) our root. Close the topmost layer and
         otherwise leave the platform default alone. */
      histPos = 0;
      reconcileTo(0);
      return;
    }
    histPos = st.d;
    if (st.d > depth()) {
      /* Forward press into an already-closed layer: screens can be
         re-shown (their DOM persists); overlays cannot be rebuilt. */
      if (st.scr && !TAB_ROOTS[st.scr] && st.scr !== "auth" && st.scr !== currentScreen()) {
        stack.push({ kind: "screen", screen: st.scr });
        gotoScreen(st.scr);
      }
      scheduleScan(40);
      return;
    }
    reconcileTo(st.d);
  }

  function topLiveIndex() {
    for (var i = stack.length - 1; i >= 1; i--) { if (!stack[i].dead) { return i; } }
    return 0;
  }

  function handleScreen(ns) {
    if (!ns || ns === lastScreen) { return; }
    lastScreen = ns;
    if (ns === "auth" || TAB_ROOTS[ns]) {
      if (!(stack.length === 1 && stack[0].screen === ns)) { resetStack(ns); }
      return;
    }
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].kind === "screen" && stack[i].screen === ns && !stack[i].dead) {
        if (i < stack.length - 1) { stack.length = i + 1; syncGoTo(i); }
        return;
      }
    }
    pushLayer({ kind: "screen", screen: ns });
  }

  function scanOverlays() {
    var open = []; /* [{fullKey}] in registry order (low layer first) */
    for (var i = 0; i < OVERLAYS.length; i++) {
      var def = OVERLAYS[i], p = false;
      try { p = def.probe(); } catch (e) {}
      if (p) { open.push({ fullKey: def.key === "status" ? "status:" + p : def.key }); }
    }
    var openSet = {};
    open.forEach(function (o) { openSet[o.fullKey] = 1; });

    /* Sub-state retag: an overlay whose internal state changed (the status
       root moving composer <-> preview <-> viewer) is the SAME layer, not a
       close plus an open. Treating it as a close fired a history sync whose
       popstate then closed the state that had just opened — the "preview
       exits the instant you tap it" bug (reproduced 2026-11-04: preview
       painted, then was closed back to the composer within ~160ms). */
    (function () {
      var ti0 = topLiveIndex();
      if (ti0 < 1) { return; }
      var top0 = stack[ti0];
      if (!top0 || top0.kind !== "ov" || top0.dead || top0.key.indexOf(":") < 0) { return; }
      if (openSet[top0.key]) { return; }
      var base = top0.key.split(":")[0] + ":";
      for (var kk in openSet) { if (kk.indexOf(base) === 0) { top0.key = kk; return; } }
    })();

    /* closes: walk the live entries; an overlay that vanished while buried
       becomes a tombstone, while it is on top it is an own-close. */
    var guard = 0;
    while (guard++ < 6) {
      var ti = topLiveIndex();
      if (ti < 1) { break; }
      var top = stack[ti];
      if (top.kind !== "ov" || openSet[top.key]) { break; }
      /* topmost live layer is an overlay that is no longer open */
      stack.length = ti; /* pop it (and tombstones above, already skipped) */
      syncGoTo(stack.length - 1);
    }
    for (var j = 1; j < stack.length; j++) {
      var en = stack[j];
      if (en.kind === "ov" && !en.dead && !openSet[en.key]) { en.dead = true; }
    }
    /* opens: anything visibly open with no live entry joins the stack */
    if (currentScreen() !== "auth") {
      open.forEach(function (o) {
        var represented = false;
        for (var k = 1; k < stack.length; k++) {
          if (stack[k].kind === "ov" && stack[k].key === o.fullKey && !stack[k].dead) { represented = true; break; }
        }
        if (!represented) { pushLayer({ kind: "ov", key: o.fullKey }); }
      });
    }
  }

  /* ------------------ visible-control reinforcements ------------------ */
  function injectFsBack() {
    var v = $("#fs-viewer");
    if (!v || $("#nb-fs-back", v)) { return; }
    var b = document.createElement("button");
    b.type = "button";
    b.id = "nb-fs-back";
    b.setAttribute("aria-label", "Back");
    b.textContent = "‹";
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var c = $("#fs-close");
      if (c) { c.click(); } else { var r = $("#fs-root"); if (r) { r.innerHTML = ""; } }
    });
    v.appendChild(b);
  }

  function injectSheetX() {
    var scrim = $("#ux-scrim");
    if (!scrim) { return; }
    var sheet = $(".ux-sheet", scrim);
    if (!sheet || $(".nb-x", sheet)) { return; }
    var b = document.createElement("button");
    b.type = "button";
    b.className = "nb-x nb-xa";
    b.setAttribute("aria-label", "Close");
    b.textContent = "×";
    b.addEventListener("click", function () { var s = $("#ux-scrim"); if (s) { s.remove(); } });
    sheet.appendChild(b);
  }

  function injectDrawerX() {
    var head = $(".sz-drawer-head");
    if (!head || $(".nb-x", head)) { return; }
    var b = document.createElement("button");
    b.type = "button";
    b.className = "nb-x nb-xm";
    b.setAttribute("aria-label", "Close menu");
    b.textContent = "×";
    b.addEventListener("click", function () { var s = $("#sz-scrim"); if (s) { s.click(); } });
    head.appendChild(b);
  }

  function scan() {
    if (applying) { return; }
    handleScreen(currentScreen());
    scanOverlays();
    injectFsBack();
    injectSheetX();
    injectDrawerX();
  }

  function scheduleScan(ms) {
    if (scanTimer) { return; }
    scanTimer = setTimeout(function () { scanTimer = null; scan(); }, ms || 60);
  }

  /* ------------------------------ CSS ------------------------------ */
  function injectCSS() {
    if ($("#nb-css")) { return; }
    var st = document.createElement("style");
    st.id = "nb-css";
    st.textContent =
      "#nb-fs-back{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:12px;width:48px;height:48px;border-radius:50%;border:1.5px solid rgba(255,255,255,.7);background:rgba(0,0,0,.55);color:#fff;font-size:32px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:3;padding:0 0 4px 0}" +
      ".fs-close{width:48px!important;height:48px!important;background:rgba(0,0,0,.55)!important;border:1.5px solid rgba(255,255,255,.65);font-size:24px!important}" +
      ".img-viewer-x{width:46px!important;height:46px!important;background:rgba(0,0,0,.55);border:1.5px solid rgba(255,255,255,.65)}" +
      ".pm-x{width:44px!important;height:44px!important}" +
      ".nm-hv-player-x{width:44px!important;height:44px!important}" +
      ".sheet-x{width:44px!important;height:44px!important}" +
      ".icon-btn{min-width:44px;min-height:44px}" +
      ".wa-back{min-width:44px;min-height:44px}" +
      ".loc-x,.stc2-x,.stv-x,.shx-x,.stx-sheet-x,.sheet2-x{min-width:44px;min-height:44px}" +
      ".otp-back-btn,.legal-back{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}" +
      "#nm-ba-back,#nm-hv-back,#nm-mepage-back{min-width:44px;min-height:44px}" +
      ".fs-nav{min-width:44px;min-height:44px}" +
      ".ux-sheet{position:relative}" +
      ".nb-x{width:44px;height:44px;border-radius:50%;border:0;background:rgba(127,127,127,.20);color:inherit;font-size:20px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0}" +
      ".nb-xa{position:absolute;top:10px;right:12px;z-index:5}" +
      ".nb-xm{margin-left:auto}";
    (document.head || document.body).appendChild(st);
  }

  /* ------------- intercept mis-targeted in-app back buttons ------------- */
  /* #detail-back always goes home and #seller-back always goes to detail,
     even when the user arrived from somewhere else; #sell-back always goes
     home. When our stack covers the layer, route the tap through the real
     history so the user lands on the place they actually came from. */
  var BTN_SCREEN = { "detail-back": "detail", "seller-back": "seller", "sell-back": "sell" };
  function onBackBtnClick(e) {
    var t = e.target;
    if (!t || !t.closest) { return; }
    var btn = t.closest("#detail-back,#seller-back,#sell-back");
    if (!btn) { return; }
    var ti = topLiveIndex();
    if (ti < 1 || histPos < 1) { return; }
    var top = stack[ti];
    if (top.kind === "screen" && top.screen === BTN_SCREEN[btn.id]) {
      e.preventDefault();
      e.stopPropagation();
      try { history.back(); } catch (err) {}
    }
  }

  function onKey(e) {
    if (e.key !== "Escape" || histPos < 1) { return; }
    var ti = topLiveIndex();
    if (ti >= 1 && stack[ti].kind === "ov") {
      try { history.back(); } catch (err) {}
    }
  }

  /* ------------------------------ init ------------------------------ */
  function init() {
    injectCSS();
    var scr = currentScreen() || "auth";
    stack = [{ kind: "screen", screen: scr }];
    lastScreen = scr;
    writeRootState(scr);
    window.addEventListener("popstate", onPopstate);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onBackBtnClick, true);
    if (window.MutationObserver && document.body) {
      var mo = new MutationObserver(function () { scheduleScan(60); });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    }
    setInterval(scan, 900);
    scan();
    window.NM_navBack = {
      stack: function () { return stack.map(function (x) { return (x.kind === "ov" ? x.key : "screen:" + x.screen) + (x.dead ? " (closed)" : ""); }); },
      scan: scan
    };
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); }
  else { init(); }
})();
