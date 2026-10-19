/* ===== Me sub-pages + floating Refer & Earn button (2026-10-17, Ibrahim's order) =====
   Every Me sub-menu becomes a mini selection listed under the name tag; each
   selection opens its own minimal page. Content is gathered fresh at the
   moment a page is opened (and put back when it closes), with a short loading
   animation while the page opens. Grow your business (the ₦5,000 home page
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
  + ".nm-me-row{min-height:44px}"
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
  + ".nm-prem-line{margin-top:2px;width:100%;border:0;background:transparent;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--muted);text-align:center;padding:8px 4px}"
  + "#nm-refer-fab{position:fixed;top:auto;bottom:calc(88px + env(safe-area-inset-bottom,0px));right:12px;z-index:99985;display:none;align-items:center;gap:6px;border:0;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;color:#fff;background:linear-gradient(135deg,#e8380d,#ff7a18);border-radius:999px;padding:8px 13px;min-height:44px;box-shadow:0 8px 20px rgba(232,56,13,.45);animation:nmFabDance 2.6s ease-in-out infinite}"
  + "#nm-refer-fab.show{display:flex}"
  + "#nm-refer-fab:active{transform:scale(.94)}"
  + "@keyframes nmFabDance{0%,100%{transform:rotate(-4deg) translateY(0)}25%{transform:rotate(4deg) translateY(-4px)}50%{transform:rotate(-3deg) translateY(0)}75%{transform:rotate(3deg) translateY(-3px)}}"
  + ".nm-mepage-body #me-favs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;overflow:visible;scroll-snap-type:none;padding:0}"
  + ".nm-mepage-body #me-favs>.card{flex:none;width:auto;min-width:0;scroll-snap-align:none}"
  + ".nm-mepage-body .mex-favctl{display:none}"
  + ".nm-banner{border-radius:18px;padding:18px 16px;color:#fff;margin-bottom:14px;position:relative;overflow:hidden}"
  + ".nm-banner .nm-b-ico{font-size:34px;line-height:1}"
  + ".nm-banner h3{margin:8px 0 6px;font-size:19px;font-weight:800;line-height:1.25}"
  + ".nm-banner p{margin:0;font-size:13.5px;line-height:1.5;opacity:.95}"
  + ".nm-banner ul{margin:10px 0 0;padding:0;list-style:none}"
  + ".nm-banner li{font-size:13px;font-weight:700;margin-top:6px}"
  + ".nm-banner li::before{content:'\\2713  '}"
  + ".nm-banner .nm-b-price{display:inline-block;margin-top:12px;background:rgba(255,255,255,.22);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:800}"
  + ".nm-banner .nm-b-next{margin-top:10px;font-size:12.5px;line-height:1.55;opacity:.95}"
  + ".nm-banner .nm-b-next b{font-weight:800}"
  + ".nm-banner-grow{background:linear-gradient(135deg,#0d7a3f,#1cab55 55%,#35c26e)}"
  + ".nm-banner-prem{background:linear-gradient(135deg,#e8380d,#ff7a18 60%,#ffa41c)}"
  + ".nm-banner::after{content:'';position:absolute;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.14);right:-60px;top:-70px;pointer-events:none}"
  + ".nm-mepage-body #me-advertise,.nm-mepage-body #me-premium{padding:14px;font-size:15px;font-weight:800;border-radius:14px}"
  + "@media (prefers-reduced-motion: reduce){#nm-refer-fab,.nm-me-refer,.nm-load-dots span,.nm-skel i{animation:none}}"
  + "@media (min-width:1024px){#nm-premium{align-items:center!important}#nm-premium>div{border-radius:20px!important}}"
  + ".nm-help{background:var(--chrome);border:1px solid var(--line-soft);border-radius:16px;padding:18px 16px;color:var(--ink)}"
  + ".nm-help h3{margin:0 0 4px;font-size:17px;font-weight:800}"
  + ".nm-help .nm-help-sec{margin:14px 0 0}"
  + ".nm-help .nm-help-sec:first-of-type{margin-top:10px}"
  + ".nm-help h4{margin:0 0 6px;font-size:14px;font-weight:800;color:var(--acc)}"
  + ".nm-help p{margin:6px 0;font-size:13.5px;line-height:1.55}"
  + ".nm-help ul{margin:6px 0 0;padding:0 0 0 18px;font-size:13.5px;line-height:1.6}"
  + ".nm-help .nm-help-wa{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:12px 18px;min-height:44px;border-radius:12px;background:#22c55e;color:#fff;font-weight:800;font-size:14px;text-decoration:none}";
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
    { key: "grow", title: "Grow your business", icon: "\u{1F4C8}", bannerCls: "nm-banner-grow",
      banner: '<div class="nm-b-ico">\u{1F4E3}</div><h3>Put your business on the home page</h3><p>Every buyer who opens Nationwide Media Connect lands on the home page first. Your banner sits in that space for 2 weeks, in front of everyone who visits.</p><ul><li>Your business in the home page banner space</li><li>Runs for a full 2 weeks</li><li>One payment, no daily posting stress</li></ul><span class="nm-b-price">\u20A65,000 \u00B7 2 weeks</span><p class="nm-b-next">After payment, upload your banner artwork right here: a <b>video of at most 20 seconds</b> or <b>1 or 2 pictures</b>. We review it, and it goes live for 2 weeks once approved.</p>',
      nodes: function () { return pickIds(["me-advertise"]); } },
    { key: "premium", title: "Get Premium", icon: "\u{1F451}", bannerCls: "nm-banner-prem",
      banner: '<div class="nm-b-ico">\u{1F451}</div><h3>Sell without limits</h3><p>A free account stops at 3 listings. Premium removes the cap completely, so everything you have for sale can be live at the same time.</p><ul><li>Unlimited listings</li><li>Launch promo: 2 months for \u20A61,000, with a free ad boost on your listings</li><li>Or 6 months for \u20A65,000, no renewing every few weeks</li></ul><span class="nm-b-price">\u20A61,000 \u00B7 2 months &nbsp;|&nbsp; \u20A65,000 \u00B7 6 months</span>',
      nodes: function () { return pickIds(["me-premium"]); } },
    { key: "help", title: "Help & safety", icon: "\u{1F6E1}\uFE0F",
      /* Static page: no gathered nodes. The nm-own class makes closePage
         remove the element from the slot, so open/close cycles leave
         #me-body exactly as found. */
      helpHtml: '<h3>Help &amp; safety</h3>'
        + '<div class="nm-help-sec"><h4>How selling works</h4>'
        + '<p>Listing an item is free: every account gets <b>3 free listings</b>. If you need more, <b>Premium</b> removes the cap completely.</p>'
        + '<ul><li>Tap <b>Sell an item</b> in the Me menu, add photos and a fair price.</li>'
        + '<li>Buyers message you in the app: keep the whole deal in the chat.</li>'
        + '<li>Meet in a public place and inspect the item before you pay.</li></ul></div>'
        + '<div class="nm-help-sec"><h4>How to stay safe</h4>'
        + '<ul><li>Meet in a <b>public place</b> and inspect the item before you pay.</li>'
        + '<li><b>Never pay in advance</b> for delivery, or to hold an item.</li>'
        + '<li>Keep chats inside the app: offers outside the app cannot be moderated.</li>'
        + '<li>Watch for pressure: rush, secrecy, extra fees, or OTP and bank-detail requests.</li></ul></div>'
        + '<div class="nm-help-sec"><h4>Need help?</h4>'
        + '<p>Message us on WhatsApp and a real person answers:</p>'
        + '<a class="nm-help-wa" href="https://wa.me/2349150951870" target="_blank" rel="noopener">Chat 09150951870 on WhatsApp</a></div>',
      nodes: function () { return []; } }
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
    /* Pages with a sales banner (Grow / Get Premium) get it on top. */
    if (pg.banner) {
      if (!pg._bannerEl) {
        var bd = document.createElement("div");
        bd.className = "nm-banner nm-own " + (pg.bannerCls || "");
        bd.innerHTML = pg.banner;
        pg._bannerEl = bd;
      }
      slot.insertBefore(pg._bannerEl, slot.firstChild);
    }
    /* Static content pages (Help & safety): built once, reused. The nm-own
       class makes closePage remove it from the slot on close. */
    if (pg.helpHtml) {
      if (!pg._helpEl) {
        var hd = document.createElement("div");
        hd.className = "nm-help nm-own";
        hd.innerHTML = pg.helpHtml;
        pg._helpEl = hd;
      }
      slot.insertBefore(pg._helpEl, slot.firstChild);
    }
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
        if (el.classList && (el.classList.contains("nm-empty-note") || el.classList.contains("nm-own"))) { el.remove(); return; }
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

  /* #79 — sellers always see where they stand: premium state or free quota */
  var premCache = { t: 0, s: null };
  function paintPremLine(menu) {
    var DB = window.NM_DB;
    if (!DB || !DB.premiumStatus) { return; }
    var render = function (s) {
      if (!s || !document.body.contains(menu)) { return; }
      var line = menu.querySelector(".nm-prem-line");
      if (!line) {
        line = document.createElement("button");
        line.type = "button";
        line.className = "nm-prem-line";
        line.addEventListener("click", function () { if (window.NM_showPremium) { window.NM_showPremium({}); } });
        menu.appendChild(line);
      }
      var txt;
      if (s.active) {
        var mm = null;
        try { mm = window.NM_int && window.NM_int.me ? window.NM_int.me() : null; } catch (e) {}
        var until = mm && mm.premium_until ? new Date(mm.premium_until) : null;
        txt = "\u{1F451} Premium active" + (until && !isNaN(until.getTime()) ? " until " + until.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
      } else {
        txt = s.count + " of " + s.limit + " free listings used. Tap for Premium";
      }
      if (line.textContent !== txt) { line.textContent = txt; }
    };
    if (premCache.s && Date.now() - premCache.t < 30000) { render(premCache.s); return; }
    DB.premiumStatus().then(function (s) { premCache = { t: Date.now(), s: s }; render(s); }).catch(function () {});
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
    ref.innerHTML = '<span class="nm-me-rico">\u{1F381}</span><span style="flex:1"><b>Refer &amp; Earn</b><span>Friend pays \u20A61,000 Premium, you earn \u20A6250 cash + \u20A6250 credit. Friend pays \u20A65,000, you earn \u20A6750 cash + \u20A6250 credit</span></span><span class="nm-me-chev">\u203A</span>';
    ref.addEventListener("click", goRefer);
    menu.appendChild(ref);
    var bn = document.createElement("button");
    bn.type = "button";
    bn.className = "nm-me-row";
    bn.innerHTML = '<span class="nm-me-ico">🖼️</span><b>My banner ads</b><span class="nm-me-chev">›</span>';
    bn.addEventListener("click", function () { if (window.NM_openBannerSubmit) { window.NM_openBannerSubmit(); } });
    menu.appendChild(bn);
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
    paintPremLine(menu);
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

/* ===== Site fixes pack (2026-10-17, Ibrahim's fix session) =====
   Backlog 88 (auth double-submit guards), 89 (password show/hide toggles),
   90 (OTP: typed 6th digit / Enter verifies), 117 (sell error scrolls into
   view), 118 (sell draft keeps the subcategory), 136 (premium state is
   re-checked against the server when Me opens, one guarded reload if the
   app is stale), plus a Me profile save hardening (blur first). Every
   feature is independent and failure-isolated. */
(function () {
  "use strict";
  if (window.__nmFixes) { return; }
  window.__nmFixes = 1;
  var st = document.createElement("style");
  st.id = "nm-fixes-style";
  st.textContent = ".finora-input{position:relative}"
    + ".finora-input input.nm-eye-in{padding-right:46px!important}"
    + ".nm-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1;padding:9px 7px;color:var(--muted);z-index:2}"
    + ".offer-btns button{padding:12px 10px;min-height:44px}"
    + ".sort-pill{padding:12px 16px!important;min-height:44px}"
    + ".report-link{padding:14px 8px}"
    + "#hero-dots span{cursor:pointer}"
    + "#thread-product{cursor:pointer}";
  document.head.appendChild(st);

  function onReady(fn) { if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", fn); } else { fn(); } }

  /* #89 — password visibility toggles */
  function addEyes() {
    try {
      ["login-pass", "signup-pass", "recover-pass", "recover-pass2"].forEach(function (id) {
        var inp = document.getElementById(id);
        if (!inp || inp.getAttribute("data-nm-eye")) { return; }
        var wrap = (inp.closest && (inp.closest(".finora-input") || inp.parentElement)) || inp.parentElement;
        if (!wrap) { return; }
        inp.setAttribute("data-nm-eye", "1");
        inp.classList.add("nm-eye-in");
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nm-eye";
        b.textContent = "\u{1F441}\uFE0F";
        b.setAttribute("aria-label", "Show password");
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () {
          var show = inp.type === "password";
          inp.type = show ? "text" : "password";
          b.setAttribute("aria-pressed", show ? "true" : "false");
          b.setAttribute("aria-label", show ? "Hide password" : "Show password");
          try { inp.focus(); } catch (e) {}
        });
        wrap.appendChild(b);
      });
    } catch (e) {}
  }

  /* #88 — double-submit guards on the auth forms */
  var guardTimers = {};
  function reenable(form) {
    if (!form) { return; }
    var btn = form.querySelector(".btn-primary");
    if (btn && btn.disabled) { btn.disabled = false; }
    if (guardTimers[form.id]) { clearTimeout(guardTimers[form.id]); guardTimers[form.id] = null; }
  }
  function reenableAll() { ["form-signup", "form-login", "form-forgot"].forEach(function (id) { reenable(document.getElementById(id)); }); }
  function armGuards() {
    try {
      ["form-signup", "form-login", "form-forgot"].forEach(function (id) {
        var f = document.getElementById(id);
        if (!f || f.getAttribute("data-nm-guard")) { return; }
        f.setAttribute("data-nm-guard", "1");
        f.addEventListener("submit", function () {
          var btn = f.querySelector(".btn-primary");
          if (btn && !btn.disabled) {
            btn.disabled = true;
            guardTimers[id] = setTimeout(function () { reenable(f); }, 8000);
          }
        });
      });
      ["auth-error", "otp-error", "recover-error"].forEach(function (eid) {
        var el = document.getElementById(eid);
        if (el && !el.getAttribute("data-nm-obs")) {
          el.setAttribute("data-nm-obs", "1");
          try { new MutationObserver(function () { if (!el.hidden) { reenableAll(); } }).observe(el, { attributes: true, attributeFilter: ["hidden"] }); } catch (e) {}
        }
      });
      document.querySelectorAll(".screen").forEach(function (s) {
        try { new MutationObserver(function () { if (s.classList.contains("active")) { reenableAll(); } }).observe(s, { attributes: true, attributeFilter: ["class"] }); } catch (e) {}
      });
    } catch (e) {}
  }

  /* #90 — OTP: typing the 6th digit, or pressing Enter, verifies */
  function armOtp() {
    try {
      var boxes = document.getElementById("otp-boxes");
      if (!boxes || boxes.getAttribute("data-nm-otp")) { return; }
      boxes.setAttribute("data-nm-otp", "1");
      boxes.addEventListener("input", function (e) {
        if (e.inputType && e.inputType !== "insertText") { return; }
        var inputs = boxes.querySelectorAll("input");
        if (inputs.length < 6 || e.target !== inputs[5] || !e.target.value) { return; }
        for (var i = 0; i < 6; i++) { if (!inputs[i].value) { return; } }
        var v = document.getElementById("otp-verify");
        if (v) { v.click(); }
      });
      boxes.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { var v = document.getElementById("otp-verify"); if (v) { v.click(); } }
      });
    } catch (e) {}
  }

  /* #133b — terms row: tapping the words toggles the box (deterministic JS,
     the legal buttons keep their own action). The labels' native activation
     is stripped so the JS toggle is the ONLY toggle, and the end state is
     enforced after any late synthetic click settles. */
  function armTerms() {
    try {
      document.querySelectorAll('.terms-check label[for="signup-terms"]').forEach(function (l) { l.removeAttribute("for"); });
    } catch (e) {}
    document.addEventListener("click", function (e) {
      try {
        var t = e.target;
        if (!t || !t.closest) { return; }
        var row = t.closest(".terms-check");
        if (!row) { return; }
        if (t.closest("[data-legal]") || t.id === "signup-terms") { return; }
        var box = document.getElementById("signup-terms");
        if (!box) { return; }
        e.preventDefault();
        var want = !box.checked;
        box.checked = want;
        try { if (window.__nmMeLog) { window.__nmMeLog.push("terms tap -> " + want); } } catch (err) {}
        setTimeout(function () {
          if (box.checked !== want) { box.checked = want; }
          try { box.dispatchEvent(new Event("change", { bubbles: true })); } catch (err) {}
        }, 80);
      } catch (err) {}
    }, true);
  }

  /* #117 — sell form: scroll the validation error into view */
  function armSellScroll() {
    try {
      var f = document.getElementById("sell-form");
      if (!f || f.getAttribute("data-nm-scroll")) { return; }
      f.setAttribute("data-nm-scroll", "1");
      f.addEventListener("submit", function () {
        setTimeout(function () {
          var err = document.getElementById("sell-error");
          if (err && !err.hidden && (err.textContent || "").trim()) {
            try { err.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
          }
        }, 350);
      });
    } catch (e) {}
  }

  /* #118 — sell draft: keep the subcategory across tab restarts */
  var SUBKEY = "nc_sell_subcat";
  var subAppliedFor = "";
  function armSubcat() {
    document.addEventListener("change", function (e) {
      if (e.target && e.target.id === "sell-subcategory") {
        try {
          var cat = document.getElementById("sell-category");
          localStorage.setItem(SUBKEY, JSON.stringify({ cat: cat ? cat.value : "", sub: e.target.value }));
        } catch (err) {}
      }
    }, true);
  }
  function applySubcat() {
    try {
      var scr = document.getElementById("screen-sell");
      if (!scr || !scr.classList.contains("active")) { subAppliedFor = ""; return; }
      var stamp = "";
      try { stamp = localStorage.getItem(SUBKEY) || ""; } catch (e) {}
      if (!stamp || stamp === subAppliedFor) { return; }
      var saved = null;
      try { saved = JSON.parse(stamp); } catch (e) { return; }
      if (!saved || !saved.sub) { subAppliedFor = stamp; return; }
      var mainDraft = null;
      try { mainDraft = localStorage.getItem("nc_sell_draft"); } catch (e) {}
      if (!mainDraft) { try { localStorage.removeItem(SUBKEY); } catch (e) {} subAppliedFor = stamp; return; }
      var cat = document.getElementById("sell-category"), sub = document.getElementById("sell-subcategory");
      if (!cat || !sub) { return; }
      if (saved.cat && cat.value !== saved.cat) { cat.value = saved.cat; }
      if (window.NM_fillSubcats) { try { window.NM_fillSubcats(cat.value); } catch (e) {} }
      for (var i = 0; i < sub.options.length; i++) {
        if (sub.options[i].value === saved.sub) { sub.value = saved.sub; break; }
      }
      subAppliedFor = stamp;
    } catch (e) {}
  }

  /* Me profile: blur the focused field before Save runs */
  function armMeSaveBlur() {
    document.addEventListener("click", function (e) {
      try {
        var t = e.target;
        if (!t || !t.closest) { return; }
        if (!t.closest("#me-sec-profile")) { return; }
        var btn = t.closest("button");
        if (btn && /save profile/i.test(btn.textContent || "") && document.activeElement && document.activeElement !== btn) {
          document.activeElement.blur();
        }
      } catch (err) {}
    }, true);
  }

  /* #136 — premium state: re-check against the server when Me opens */
  var lastPremCheck = 0;
  function checkPremium() {
    var now = Date.now();
    if (now - lastPremCheck < 5000) { return; }
    lastPremCheck = now;
    var DB = window.NM_DB;
    if (!DB || !DB.client || !DB.currentUser) { return; }
    DB.currentUser().then(function (u) {
      if (!u || !u.id) { return null; }
      return DB.client.from("profiles").select("verification_tier, premium_until").eq("id", u.id).maybeSingle();
    }).then(function (res) {
      if (!res || res.error || !res.data) { return; }
      var appMe = null;
      try { appMe = window.NM_int && window.NM_int.me ? window.NM_int.me() : null; } catch (e) {}
      if (!appMe || typeof appMe.verification_tier !== "string") { return; }
      var freshGold = res.data.verification_tier === "gold";
      var appGold = appMe.verification_tier === "gold";
      var freshUntil = res.data.premium_until || null;
      var appUntil = ("premium_until" in appMe) ? (appMe.premium_until || null) : freshUntil;
      if (freshGold === appGold && String(freshUntil) === String(appUntil)) { return; }
      try {
        var last = parseInt(sessionStorage.getItem("nm_prem_fix") || "0", 10);
        if (Date.now() - last < 60000) { return; }
        sessionStorage.setItem("nm_prem_fix", String(Date.now()));
      } catch (e) { return; }
      location.reload();
    }).catch(function () {});
  }

  /* #100 — the buyer hears the answer: post it into the chat thread */
  function wrapAnswerOffer() {
    try {
      var DB = window.NM_DB;
      if (!DB || DB.__nmAnswerWrapped || typeof DB.answerOffer !== "function" || !DB.client) { return; }
      DB.__nmAnswerWrapped = 1;
      var orig = DB.answerOffer;
      DB.answerOffer = function (offerId, status, counterAmount) {
        var pre = Promise.resolve(null);
        try {
          pre = DB.client.from("offers").select("buyer_id, product_id, amount").eq("id", offerId).maybeSingle()
            .then(function (r) { return r && r.data ? r.data : null; }).catch(function () { return null; });
        } catch (e) {}
        return pre.then(function (offer) {
          return orig(offerId, status, counterAmount).then(function (out) {
            try { notifyBuyer(offer, status, counterAmount); } catch (e) {}
            return out;
          });
        });
      };
      function notifyBuyer(offer, status, counterAmount) {
        if (!offer || !offer.buyer_id || !offer.product_id) { return; }
        var DB = window.NM_DB;
        DB.currentUser().then(function (me) {
          if (!me || !me.id) { return null; }
          return DB.client.from("conversations").select("id").eq("product_id", offer.product_id).eq("buyer_id", offer.buyer_id).eq("seller_id", me.id).maybeSingle();
        }).then(function (res) {
          if (!res || !res.data || !res.data.id) { return; }
          var amt = "\u20A6" + Number(offer.amount || 0).toLocaleString("en-NG");
          var txt = null;
          if (status === "accepted") { txt = "Offer accepted: " + amt + " \u2014 chat here to close the deal."; }
          else if (status === "declined") { txt = "Offer of " + amt + " was declined."; }
          else if (counterAmount) { txt = "Counter offer: \u20A6" + Number(counterAmount).toLocaleString("en-NG") + " (was " + amt + ")."; }
          if (txt && typeof DB.sendMessage === "function") {
            var p = DB.sendMessage(res.data.id, txt);
            if (p && p.catch) { p.catch(function () {}); }
          }
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* Disposable-email block on the signup form (2026-10-18 critique fix:
     trust holes). A modest list of well-known temp-mail providers.
     Capture-phase listener on document so it runs BEFORE the app's own
     signup handler and the ref-code listener; stopImmediatePropagation
     keeps the submit from firing any of them. This raises the bar only:
     it cannot stop plus-addressing or fresh disposable domains. */
  var DISPOSABLE_DOMAINS = ["mailinator.com", "guerrillamail.com", "10minutemail.com",
    "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "sharklasers.com",
    "getnada.com", "maildrop.cc", "dispostable.com", "fakeinbox.com", "mohmal.com",
    "emailondeck.com", "throwawaymail.com"];
  window.__nmDisposableBlocked = function (email) {
    var m = String(email || "").trim().toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/);
    if (!m) { return false; }
    var d = m[1];
    return DISPOSABLE_DOMAINS.some(function (x) { return d === x || d.slice(-(x.length + 1)) === "." + x; });
  };
  function armDisposable() {
    try {
      if (window.__nmDispArmed) { return; }
      window.__nmDispArmed = 1;
      document.addEventListener("submit", function (e) {
        try {
          var f = e.target;
          if (!f || f.id !== "form-signup") { return; }
          var inp = document.getElementById("signup-email");
          if (!inp || !window.__nmDisposableBlocked(inp.value)) { return; }
          e.preventDefault();
          e.stopImmediatePropagation();
          var err = document.getElementById("auth-error");
          if (err) {
            err.textContent = "Please use a permanent email address \u2014 disposable inboxes can't be used to sign up.";
            err.hidden = false;
          }
        } catch (err) {}
      }, true);
    } catch (e) {}
  }

  /* #118b — apply the saved subcategory the moment Sell opens, twice,
     so late form fills cannot leave the placeholder showing */
  var sellObs = null;
  function armSellObserver() {
    try {
      var scr = document.getElementById("screen-sell");
      if (!scr || sellObs) { return; }
      sellObs = new MutationObserver(function () {
        if (scr.classList.contains("active")) {
          subAppliedFor = "";
          applySubcat();
          setTimeout(function () { subAppliedFor = ""; applySubcat(); }, 600);
        }
      });
      sellObs.observe(scr, { attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
  }

  function tick() {
    var scr = document.getElementById("screen-me");
    if (scr && scr.classList.contains("active")) { checkPremium(); }
    applySubcat();
  }

  onReady(function () {
    addEyes();
    armGuards();
    armOtp();
    armSellScroll();
    armSubcat();
    armSellObserver();
    armTerms();
    armMeSaveBlur();
    armDisposable();
    wrapAnswerOffer();
    setTimeout(addEyes, 1500);
    setInterval(tick, 1200);
    if (/[?&]pay=return/.test(location.search)) { setTimeout(checkPremium, 3000); }
  });
})();

/* ===== auth tab wiring (PASS 4+5 audit 2026-10-18) =====
   The Log in / Sign up tabs on the auth screen had no click handlers, so the
   signup form could never be reached. Wire the tabs to toggle the forms. */
(function () {
  "use strict";
  function show(which) {
    var tl = document.getElementById("tab-login"), ts = document.getElementById("tab-signup");
    var fl = document.getElementById("form-login"), fs = document.getElementById("form-signup"), ff = document.getElementById("form-forgot");
    if (fl) { fl.hidden = which !== "login"; }
    if (fs) { fs.hidden = which !== "signup"; }
    if (ff) { ff.hidden = true; }
    if (tl) { tl.classList.toggle("active", which === "login"); }
    if (ts) { ts.classList.toggle("active", which === "signup"); }
    try { var er = document.getElementById("auth-error"); if (er) { er.hidden = true; } } catch (e) {}
  }
  window.NM_authTab = show;
  function wire() {
    var tl = document.getElementById("tab-login"), ts = document.getElementById("tab-signup");
    if (!tl || !ts || tl._nmTabWired) { return; }
    tl._nmTabWired = ts._nmTabWired = true;
    tl.addEventListener("click", function () { show("login"); });
    ts.addEventListener("click", function () { show("signup"); });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", wire); } else { wire(); }
  setTimeout(wire, 1500);
  setTimeout(wire, 4000);
})();
