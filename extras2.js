/* ===== Me sub-pages + floating Refer & Earn button (2026-10-17, Ibrahim's order) =====
   Every Me sub-menu becomes a mini selection listed under the name tag; each
   selection opens its own minimal page. Content is gathered fresh at the
   moment a page is opened (and put back when it closes), with a short loading
   animation while the page opens. Grow your business (the ₦10,000 home page
   banner payment) and Get Premium are separate selections. Refer & Earn is
   emphasized in the list and gets a floating, dancing button at the top bar
   on every main menu. */
(function () {
  "use strict";
  if (document.getElementById("nm-me-pages")) { return; }
  var css = ""
  + "#screen-me .me-tiles,#screen-me .me-quickstats{display:none!important}"
  + "#nm-refer-card{display:none!important}"
  + ".nm-src-hidden{display:none!important}"
  + ".nm-me-menu{display:flex;flex-direction:column;gap:8px;margin:12px 0 6px}"
  + ".nm-me-refer{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;cursor:pointer;font-family:inherit;color:#fff;background:linear-gradient(135deg,#e8380d,#ff7a18);border-radius:16px;padding:14px;box-shadow:0 8px 22px rgba(232,56,13,.35);animation:nmReferPulse 2.8s ease-in-out infinite}"
  + ".nm-me-refer .nm-me-rico{width:42px;height:42px;flex:none;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:21px}"
  + ".nm-me-refer b{display:block;font-size:15.5px;font-weight:800;line-height:1.2}"
  + ".nm-me-refer span{display:block;font-size:12px;opacity:.93;margin-top:2px;line-height:1.35}"
  + ".nm-me-refer .nm-me-chev{margin-left:auto;font-size:22px;font-weight:800;opacity:.9}"
  + "@keyframes nmReferPulse{0%,100%{box-shadow:0 8px 22px rgba(232,56,13,.35)}50%{box-shadow:0 8px 30px rgba(232,56,13,.6)}}"
  + ".nm-me-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font-family:inherit;cursor:pointer;color:var(--ink);background:var(--chrome);border:1px solid var(--line-soft);border-radius:14px;padding:11px 14px;box-shadow:var(--shadow-card)}"
  + ".nm-me-row .nm-me-ico{width:34px;height:34px;flex:none;border-radius:10px;background:rgba(232,56,13,.12);display:flex;align-items:center;justify-content:center;font-size:17px}"
  + ".nm-me-row b{flex:1;font-size:14px;font-weight:700}"
  + ".nm-me-row .nm-me-chev{color:var(--muted);font-size:19px;font-weight:800}"
  + ".nm-me-badge{min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:var(--acc);color:#fff;font-size:11px;font-weight:800;display:none;align-items:center;justify-content:center}"
  + ".nm-mepage{position:fixed;inset:0;z-index:99980;background:var(--bg);display:none}"
  + ".nm-mepage.open{display:block}"
  + ".nm-mepage-wrap{height:100%;display:flex;flex-direction:column;max-width:880px;margin:0 auto;background:var(--bg)}"
  + ".nm-mepage-top{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--chrome);border-bottom:1px solid var(--line-soft)}"
  + ".nm-mepage-top h2{font-size:16.5px;font-weight:800;color:var(--ink);margin:0}"
  + ".nm-mepage-body{flex:1;overflow-y:auto;padding:14px 14px 30px;-webkit-overflow-scrolling:touch}"
  + ".nm-mepage-body .me-section{margin:0 0 10px}"
  + ".nm-mepage-body .me-sec-head{pointer-events:none}"
  + ".nm-mepage-body .me-sec-chev{display:none}"
  + ".nm-mepage-body #ss-add{display:block;margin:12px auto 0}"
  + ".nm-mepage-body #me-advertise,.nm-mepage-body #me-premium{width:100%}"
  + ".nm-load{padding:30px 6px 8px;text-align:center}"
  + ".nm-load-dots{display:flex;gap:7px;justify-content:center}"
  + ".nm-load-dots span{width:10px;height:10px;border-radius:50%;background:var(--acc);animation:nmLoadBounce 1s ease-in-out infinite}"
  + ".nm-load-dots span:nth-child(2){animation-delay:.15s}"
  + ".nm-load-dots span:nth-child(3){animation-delay:.3s}"
  + "@keyframes nmLoadBounce{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-7px);opacity:1}}"
  + ".nm-load-txt{margin-top:10px;font-size:13px;font-weight:700;color:var(--muted)}"
  + ".nm-skel{margin-top:20px;display:flex;flex-direction:column;gap:10px}"
  + ".nm-skel i{display:block;height:64px;border-radius:14px;background:linear-gradient(90deg,var(--line-soft) 25%,rgba(127,127,127,.16) 50%,var(--line-soft) 75%);background-size:200% 100%;animation:nmShimmer 1.15s linear infinite}"
  + "@keyframes nmShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}"
  + ".nm-empty-note{padding:26px 12px;text-align:center;color:var(--muted);font-size:13.5px;line-height:1.5}"
  + "#nm-refer-fab{position:fixed;top:calc(env(safe-area-inset-top,0px) + 58px);right:10px;z-index:99985;display:none;align-items:center;gap:6px;border:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;color:#fff;background:linear-gradient(135deg,#e8380d,#ff7a18);border-radius:999px;padding:8px 13px;box-shadow:0 8px 20px rgba(232,56,13,.45);animation:nmFabDance 2.6s ease-in-out infinite}"
  + "#nm-refer-fab.show{display:flex}"
  + "#nm-refer-fab:active{transform:scale(.94)}"
  + "@keyframes nmFabDance{0%,100%{transform:rotate(-4deg) translateY(0)}25%{transform:rotate(4deg) translateY(-4px)}50%{transform:rotate(-3deg) translateY(0)}75%{transform:rotate(3deg) translateY(-3px)}}"
  + "@media (prefers-reduced-motion: reduce){#nm-refer-fab,.nm-me-refer,.nm-load-dots span,.nm-skel i{animation:none}}";
  var st = document.createElement("style");
  st.id = "nm-me-pages";
  st.textContent = css;
  document.head.appendChild(st);

  /* Self-diagnostic: every transform / page open is logged.
     Open the site with ?medbg=1 to see the log on screen. */
  var __log = [];
  function LOG(m) {
    try {
      __log.push(new Date().toISOString().slice(11, 19) + " " + m);
      if (__log.length > 40) { __log.shift(); }
      window.__nmMeLog = __log;
      var dbg = document.getElementById("nm-me-dbg");
      if (dbg) { var t = __log.join("\n"); if (dbg.textContent !== t) { dbg.textContent = t; } }
    } catch (e) {}
  }
  if (/[?&]medbg=1/.test(location.search)) {
    var dbgEl = document.createElement("div");
    dbgEl.id = "nm-me-dbg";
    dbgEl.setAttribute("style", "position:fixed;left:6px;bottom:6px;z-index:99999;max-width:92vw;max-height:42vh;overflow:auto;background:#fff;color:#111;font:10px/1.5 monospace;padding:6px 8px;border:2px solid #e8380d;border-radius:8px;white-space:pre-wrap");
    dbgEl.textContent = "nm-me debug";
    document.body.appendChild(dbgEl);
  }
  LOG("module loaded (v2 gather-on-open)");

  function pickIds(ids) { var out = []; ids.forEach(function (id) { var el = document.getElementById(id); if (el) { out.push(el); } }); return out; }
  function hideEl(el) { if (el) { el.style.display = "none"; } }
  function openDetails(els) { els.forEach(function (el) { try { el.open = true; } catch (e) {} }); }

  var PAGES = [
    { key: "listings", title: "My listings", icon: "\u{1F4E6}", badge: "me-count",
      nodes: function () { var w = document.getElementById("mex-listings-wrap"); if (w) { w.classList.remove("mex-closed"); return [w]; } return pickIds(["me-grid", "me-empty"]); } },
    { key: "favorites", title: "Favorites", icon: "\u2764\uFE0F", badge: "me-favcount",
      nodes: function () { var out = pickIds(["me-favs"]); var ctl = document.querySelector(".mex-favctl"); if (ctl) { out.push(ctl); } return out; } },
    { key: "searches", title: "Saved searches", icon: "\u{1F50D}",
      nodes: function () { return pickIds(["ss-list", "ss-add"]); } },
    { key: "offers", title: "Offers on my items", icon: "\u{1F91D}", badge: "me-offerct",
      nodes: function () { return pickIds(["offer-list"]); } },
    { key: "verify", title: "Verification", icon: "\u2705",
      nodes: function () { return pickIds(["me-sec-verify"]); }, prep: openDetails },
    { key: "profile", title: "Edit profile", icon: "\u270F\uFE0F",
      nodes: function () { return pickIds(["me-sec-profile"]); }, prep: openDetails },
    { key: "grow", title: "Grow your business", icon: "\u{1F4C8}",
      nodes: function () { return pickIds(["me-advertise"]); } },
    { key: "premium", title: "Get Premium", icon: "\u{1F451}",
      nodes: function () { return pickIds(["me-premium"]); } }
  ];

  /* ---------- page overlay ---------- */
  var pageEl = null, pageBody = null, pageTitle = null, loaderEl = null;
  var slots = {};
  function ensurePage() {
    if (pageEl) { return; }
    pageEl = document.createElement("div");
    pageEl.className = "nm-mepage";
    pageEl.id = "nm-mepage";
    pageEl.innerHTML = '<div class="nm-mepage-wrap"><div class="nm-mepage-top"><button type="button" class="icon-btn" id="nm-mepage-back" aria-label="Back">\u2039</button><h2 id="nm-mepage-title">Page</h2></div><div class="nm-mepage-body" id="nm-mepage-body"></div></div>';
    document.body.appendChild(pageEl);
    pageBody = pageEl.querySelector("#nm-mepage-body");
    pageTitle = pageEl.querySelector("#nm-mepage-title");
    loaderEl = document.createElement("div");
    loaderEl.className = "nm-load";
    loaderEl.innerHTML = '<div class="nm-load-dots"><span></span><span></span><span></span></div><div class="nm-load-txt">Loading\u2026</div><div class="nm-skel"><i></i><i></i><i></i></div>';
    loaderEl.style.display = "none";
    pageBody.appendChild(loaderEl);
    PAGES.forEach(function (pg) {
      var slot = document.createElement("div");
      slot.className = "nm-mepage-slot";
      slot.setAttribute("data-page", pg.key);
      slot.style.display = "none";
      pageBody.appendChild(slot);
      slots[pg.key] = slot;
    });
    pageEl.querySelector("#nm-mepage-back").addEventListener("click", closePage);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pageEl.classList.contains("open")) { closePage(); } });
  }

  var curPage = null, openSeq = 0;
  function openPage(pg) {
    ensurePage();
    var seq = ++openSeq;
    curPage = pg;
    pageTitle.textContent = pg.title;
    pageEl.classList.add("open");
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    PAGES.forEach(function (p2) { if (slots[p2.key]) { slots[p2.key].style.display = "none"; } });
    var slot = slots[pg.key];
    /* Gather this page's content fresh, right now. Nodes remember where
       they came from so closePage can put them back. */
    var els = [];
    try { els = pg.nodes() || []; } catch (e) { LOG("open " + pg.key + ": nodes() error " + (e && e.message)); }
    els.forEach(function (el) {
      if (!slot.contains(el)) {
        if (el.parentNode) { el.__nmHome = { p: el.parentNode, n: el.nextSibling }; }
        slot.appendChild(el);
      }
      el.classList.remove("nm-src-hidden");
      if (el.style && el.style.display === "none" && el.id !== "me-empty") { el.style.display = ""; }
    });
    if (pg.prep) { try { pg.prep(els); } catch (e) {} }
    /* A friendly note when there is genuinely nothing to show. */
    var note = slot.querySelector(".nm-empty-note");
    var hasContent = slot.children.length > 0 && (slot.textContent.trim() !== "" || !!slot.querySelector("img,button,input,select,textarea,.card"));
    if (!hasContent && els.length === 0) {
      if (!note) { note = document.createElement("div"); note.className = "nm-empty-note"; note.textContent = "Nothing here yet."; slot.appendChild(note); }
    } else if (note) { note.remove(); }
    LOG("open " + pg.key + ": gathered " + els.length + " node(s): " + els.map(function (el) { return el.id || el.className; }).join(", "));
    /* Loading animation, then the content. */
    loaderEl.style.display = "";
    slot.style.display = "none";
    pageBody.scrollTop = 0;
    setTimeout(function () {
      if (seq !== openSeq || !pageEl.classList.contains("open") || curPage !== pg) { return; }
      loaderEl.style.display = "none";
      slot.style.display = "";
      pageBody.scrollTop = 0;
    }, 500);
  }

  function closePage() {
    if (!pageEl) { return; }
    openSeq++;
    loaderEl.style.display = "none";
    /* Put the open page's content back where it came from. */
    if (curPage && slots[curPage.key]) {
      var slot = slots[curPage.key];
      Array.prototype.slice.call(slot.children).forEach(function (el) {
        if (el.classList && el.classList.contains("nm-empty-note")) { el.remove(); return; }
        var home = el.__nmHome;
        if (home && home.p && document.contains(home.p)) {
          if (home.n && home.n.parentNode === home.p) { home.p.insertBefore(el, home.n); } else { home.p.appendChild(el); }
        } else if (el.id && document.getElementById(el.id) !== el) {
          el.remove(); /* a fresher copy exists after a re-render */
          return;
        } else {
          var body = document.getElementById("me-body");
          if (body) { body.appendChild(el); }
        }
        el.classList.add("nm-src-hidden");
      });
      slot.style.display = "none";
    }
    curPage = null;
    pageEl.classList.remove("open");
    try { document.body.style.overflow = ""; } catch (e) {}
    LOG("page closed, content restored");
    setTimeout(transform, 60);
  }
  window.NM_closeMePage = closePage;

  function goRefer() {
    var open = function () { if (window.NM_openRefer) { window.NM_openRefer(); } };
    var DB = window.NM_DB;
    if (DB && DB.currentUser) {
      DB.currentUser().then(function (u) {
        if (u && u.id) { open(); }
        else if (window.NM_show) { window.NM_show("auth"); }
      }).catch(function () { open(); });
    } else { open(); }
  }
  window.NM_goRefer = goRefer;

  function syncBadges(menu) {
    PAGES.forEach(function (pg) {
      if (!pg.badge) { return; }
      var src = document.getElementById(pg.badge);
      var b = menu.querySelector('[data-badge-for="' + pg.key + '"]');
      if (!src || !b) { return; }
      var v = (src.textContent || "").trim();
      if (b.textContent !== v) { b.textContent = v; }
      var disp = (v && v !== "0") ? "inline-flex" : "none";
      if (b.style.display !== disp) { b.style.display = disp; }
    });
  }

  /* Hide the original in-place sections on the Me screen; their content now
     lives behind the selections. The nodes stay in the document (hidden) so
     the app's own rendering keeps working, and each page gathers them live. */
  function hideSources() {
    ["me-sec-listings", "me-sec-favs", "me-sec-searches", "me-sec-offers"].forEach(function (id) { hideEl(document.getElementById(id)); });
    ["mex-acc", "mex-favgroup"].forEach(function (id) { var el = document.getElementById(id); if (el) { el.classList.add("nm-src-hidden"); } });
    ["me-sec-verify", "me-sec-profile", "offer-list", "ss-list", "ss-add", "me-favs"].forEach(function (id) { var el = document.getElementById(id); if (el) { el.classList.add("nm-src-hidden"); } });
    var ctl = document.querySelector(".mex-favctl"); if (ctl) { ctl.classList.add("nm-src-hidden"); }
    var prem = document.getElementById("me-premium");
    if (prem) {
      var card = prem.closest ? prem.closest(".me-card") : null;
      if (card) {
        card.classList.add("nm-src-hidden");
        var head = card.previousElementSibling;
        if (head && head.classList.contains("section-head")) { hideEl(head); }
      }
    }
  }

  var badgeObs = null;
  function transform() {
    try { transformInner(); } catch (e) { LOG("transform error: " + (e && e.message ? e.message : e)); }
  }
  function transformInner() {
    var body = document.getElementById("me-body");
    if (!body) { LOG("skip: no me-body"); return; }
    if (pageEl && pageEl.classList.contains("open")) { return; }
    if (!body.querySelector(".me-top")) { LOG("skip: me not rendered yet"); return; }
    ensurePage();
    hideSources();
    if (body.querySelector(".nm-me-menu")) { return; }
    LOG("transform running");
    var menu = document.createElement("div");
    menu.className = "nm-me-menu";
    var ref = document.createElement("button");
    ref.type = "button";
    ref.className = "nm-me-refer";
    ref.innerHTML = '<span class="nm-me-rico">\u{1F381}</span><span style="flex:1"><b>Refer &amp; Earn</b><span>Earn up to \u20A61,000 for every friend who goes Premium</span></span><span class="nm-me-chev">\u203A</span>';
    ref.addEventListener("click", goRefer);
    menu.appendChild(ref);
    PAGES.forEach(function (pg) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "nm-me-row";
      row.innerHTML = '<span class="nm-me-ico">' + pg.icon + '</span><b>' + pg.title + '</b>' + (pg.badge ? '<span class="nm-me-badge" data-badge-for="' + pg.key + '"></span>' : '') + '<span class="nm-me-chev">\u203A</span>';
      row.addEventListener("click", function () { openPage(pg); });
      menu.appendChild(row);
    });
    var sell = document.createElement("button");
    sell.type = "button";
    sell.className = "nm-me-row";
    sell.innerHTML = '<span class="nm-me-ico">\u2795</span><b>Sell an item</b><span class="nm-me-chev">\u203A</span>';
    sell.addEventListener("click", function () { if (window.NM_goSell) { window.NM_goSell(); } else if (window.NM_show) { window.NM_show("sell"); } });
    menu.appendChild(sell);
    var hero = body.querySelector(".me-top") || body.firstElementChild;
    if (hero && hero.parentNode === body) { body.insertBefore(menu, hero.nextSibling); }
    else { body.insertBefore(menu, body.firstChild); }
    syncBadges(menu);
    try {
      if (badgeObs) { badgeObs.disconnect(); }
      badgeObs = new MutationObserver(function () { syncBadges(menu); });
      badgeObs.observe(body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    LOG("transform done: menu inserted");
  }

  /* ---------- floating Refer & Earn button on the main menus ---------- */
  var fab = document.createElement("button");
  fab.type = "button";
  fab.id = "nm-refer-fab";
  fab.innerHTML = "\u{1F381} Refer &amp; Earn";
  fab.setAttribute("aria-label", "Refer and Earn");
  fab.addEventListener("click", goRefer);
  document.body.appendChild(fab);
  var MAIN_SCREENS = { "screen-home": 1, "screen-category": 1, "screen-updates": 1, "screen-inbox": 1, "screen-me": 1, "screen-sell": 1 };
  function fabTick() {
    var show = false;
    var act = document.querySelector(".screen.active");
    if (act && MAIN_SCREENS[act.id] && !document.getElementById("nm-refer-page") && !(pageEl && pageEl.classList.contains("open"))) { show = true; }
    fab.classList.toggle("show", show);
  }
  setInterval(fabTick, 700);
  /* Failsafe: if the Me screen is showing and the menu is not there yet,
     build it — whatever trigger was missed. */
  setInterval(function () {
    var body = document.getElementById("me-body");
    if (!body || body.querySelector(".nm-me-menu")) { return; }
    if (pageEl && pageEl.classList.contains("open")) { return; }
    var scr = document.getElementById("screen-me");
    if ((scr && scr.classList.contains("active")) || body.querySelector(".me-top")) { transform(); }
  }, 1200);

  function boot() {
    var body = document.getElementById("me-body");
    if (!body) { setTimeout(boot, 700); return; }
    try { new MutationObserver(function () { setTimeout(transform, 120); }).observe(body, { childList: true }); } catch (e) {}
    setTimeout(transform, 120);
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); } else { boot(); }
})();
