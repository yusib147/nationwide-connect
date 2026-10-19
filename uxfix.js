/* uxfix.js — overnight critique fixes 2026-10-19. Loaded last.
   Rules honoured: no unconditional DOM writes inside observers (the Oct 16
   freeze lesson); every module is independent and failure-isolated; frozen
   contracts (nav shape, prices, OTP, themes, chat) are untouched. */
;(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DB = function () { return window.NM_DB || null; };
  var mqDesk = window.matchMedia("(min-width: 1024px)");
  function toast(msg) {
    try {
      var t = $("#toast"); if (!t) return;
      t.textContent = msg; t.hidden = false;
      clearTimeout(t._uxh); t._uxh = setTimeout(function () { t.hidden = true; }, 2600);
    } catch (e) {}
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function activeScreen() { var s = $(".screen.active"); return s ? s.id.replace("screen-", "") : ""; }
  function debounce(fn, ms) { var h = null; return function () { clearTimeout(h); h = setTimeout(fn, ms); }; }

  /* ================= filters engine (M6, M25, D19) ================= */
  var filters = { home: { min: "", max: "", cond: "", state: "" }, cat: { min: "", max: "", cond: "", state: "" } };
  function cardData(card) {
    var priceEl = $(".card-price", card), price = null;
    if (priceEl) { var m = /([\d,]{2,})/.exec(priceEl.textContent.replace(/[^\d,]/g, " ")); if (m) price = parseInt(m[1].replace(/,/g, ""), 10); }
    var condEl = $(".card-cond", card);
    var metaEl = $(".card-meta", card);
    return { price: price, cond: condEl ? condEl.textContent.trim() : "", loc: metaEl ? metaEl.textContent.split("·")[0].trim() : "" };
  }
  function locMatches(loc, state) {
    if (!state) return true;
    var l = (loc || "").toLowerCase(), s = state.toLowerCase();
    if (l.indexOf(s) >= 0) return true;
    if ((s.indexOf("capital") >= 0 || s === "fct") && l.indexOf("abuja") >= 0) return true;
    if (s === "abuja" && l.indexOf("abuja") >= 0) return true;
    return false;
  }
  function applyFilters(ctx) {
    var f = filters[ctx]; if (!f) return;
    var grid = ctx === "home" ? $("#home-grid") : $("#cat-grid"); if (!grid) return;
    var active = f.min !== "" || f.max !== "" || f.cond || f.state;
    var cards = $$(".card", grid), shown = 0;
    cards.forEach(function (card) {
      var show = true;
      if (active) {
        var d = cardData(card);
        if (f.min !== "" && (d.price == null || d.price < Number(f.min))) show = false;
        if (f.max !== "" && (d.price == null || d.price > Number(f.max))) show = false;
        if (f.cond && d.cond && d.cond.toLowerCase() !== f.cond.toLowerCase()) show = false;
        if (f.state && !locMatches(d.loc, f.state)) show = false;
      }
      var want = show ? "" : "none";
      if (card.style.display !== want) card.style.display = want;
      if (show) shown++;
    });
    var bar = ctx === "home" ? $("#ux-home-fbar") : $("#ux-cat-fbar");
    if (bar) {
      bar.querySelector(".ux-fbtn").classList.toggle("on", !!active);
      var c = bar.querySelector(".ux-fcount");
      var txt = active ? (shown + " of " + cards.length + " items match") : "";
      if (c && c.textContent !== txt) c.textContent = txt;
      var clr = bar.querySelector(".ux-fclear");
      if (clr && clr.style.display !== (active ? "" : "none")) clr.style.display = active ? "" : "none";
    }
    syncBars();
  }
  function condOptions() {
    var out = ['<option value="">Any condition</option>'];
    $$("#sell-condition option").forEach(function (o) { if (o.value) out.push('<option value="' + esc(o.value) + '">' + esc(o.textContent) + "</option>"); });
    return out.join("");
  }
  function stateOptions() {
    var out = ['<option value="">Anywhere in Nigeria</option>'];
    $$("#sell-location option").forEach(function (o) { var v = o.value || o.textContent; if (v) out.push('<option value="' + esc(v) + '">' + esc(o.textContent) + "</option>"); });
    return out.join("");
  }
  var sheetCtx = "cat";
  function openFilterSheet(ctx) {
    sheetCtx = ctx;
    closeSheet();
    var f = filters[ctx];
    var scrim = document.createElement("div");
    scrim.className = "ux-scrim"; scrim.id = "ux-scrim";
    var toggles = "";
    if (ctx === "home") {
      toggles = '<div class="ux-sec">Quick filters</div><div class="ux-toggles">'
        + '<button type="button" class="filter-pill" id="ux-t-verified">Verified only</button>'
        + '<button type="button" class="filter-pill" id="ux-t-near">Near me</button></div>';
    }
    scrim.innerHTML = '<div class="ux-sheet" role="dialog" aria-label="Filters">'
      + "<h3>Filters</h3><p class=\"ux-sub\">Narrow the items you are seeing.</p>"
      + toggles
      + '<div class="ux-sec">Price (₦)</div><div class="ux-row2">'
      + '<label>Min<input id="ux-f-min" type="number" inputmode="numeric" placeholder="0" value="' + esc(f.min) + '"></label>'
      + '<label>Max<input id="ux-f-max" type="number" inputmode="numeric" placeholder="Any" value="' + esc(f.max) + '"></label></div>'
      + '<div class="ux-sec">Condition</div><label><select id="ux-f-cond">' + condOptions() + "</select></label>"
      + '<div class="ux-sec">Location</div><label><select id="ux-f-state">' + stateOptions() + "</select></label>"
      + '<div class="ux-actions"><button type="button" class="btn-secondary" id="ux-f-clear">Clear all</button>'
      + '<button type="button" class="btn-primary" id="ux-f-apply">Show results</button></div>'
      + '<p class="ux-count" id="ux-f-count"></p></div>';
    document.body.appendChild(scrim);
    $("#ux-f-cond").value = f.cond; $("#ux-f-state").value = f.state;
    function syncCount() {
      var g = ctx === "home" ? $("#home-grid") : $("#cat-grid");
      $("#ux-f-count").textContent = g ? $$(".card", g).filter(function (c) { return c.style.display !== "none"; }).length + " items currently shown" : "";
    }
    function grab() {
      f.min = $("#ux-f-min").value; f.max = $("#ux-f-max").value;
      f.cond = $("#ux-f-cond").value; f.state = $("#ux-f-state").value;
      applyFilters(ctx); syncCount();
    }
    ["ux-f-min", "ux-f-max", "ux-f-cond", "ux-f-state"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.addEventListener("input", grab);
    });
    syncCount();
    var tv = $("#ux-t-verified"), tn = $("#ux-t-near");
    if (tv) {
      var rv = $("#filter-verified"); if (rv && rv.classList.contains("on")) tv.classList.add("on");
      tv.addEventListener("click", function () { var r = $("#filter-verified"); if (r) r.click(); tv.classList.toggle("on", !!(r && r.classList.contains("on"))); });
    }
    if (tn) {
      var rn = $("#filter-near"); if (rn && rn.classList.contains("on")) tn.classList.add("on");
      tn.addEventListener("click", function () { var r = $("#filter-near"); if (r) r.click(); tn.classList.toggle("on", !!(r && r.classList.contains("on"))); });
    }
    $("#ux-f-apply").addEventListener("click", function () { grab(); closeSheet(); });
    $("#ux-f-clear").addEventListener("click", function () {
      filters[ctx] = { min: "", max: "", cond: "", state: "" }; f = filters[ctx];
      $("#ux-f-min").value = ""; $("#ux-f-max").value = ""; $("#ux-f-cond").value = ""; $("#ux-f-state").value = "";
      applyFilters(ctx); syncCount();
    });
    scrim.addEventListener("click", function (e) { if (e.target === scrim) closeSheet(); });
  }
  function closeSheet() { var s = $("#ux-scrim"); if (s) s.remove(); }
  function makeFilterBar(id, ctx, beforeEl) {
    if (document.getElementById(id) || !beforeEl || !beforeEl.parentNode) return;
    var bar = document.createElement("div");
    bar.className = "ux-filterbar"; bar.id = id;
    bar.innerHTML = '<button type="button" class="ux-fbtn">⛃ Filters</button><span class="ux-fcount"></span>'
      + '<button type="button" class="ux-fbtn ux-fclear" style="display:none">Clear</button>';
    beforeEl.parentNode.insertBefore(bar, beforeEl);
    bar.querySelector(".ux-fbtn").addEventListener("click", function () { openFilterSheet(ctx); });
    bar.querySelector(".ux-fclear").addEventListener("click", function () {
      filters[ctx] = { min: "", max: "", cond: "", state: "" }; applyFilters(ctx);
    });
  }
  function syncBars() {
    try {
      var cb = $("#ux-cat-fbar"), head = $("#cat-results-head");
      if (cb) { var want = head && !head.hidden ? "" : "none"; if (cb.style.display !== want) cb.style.display = want; }
      var hb = $("#ux-home-fbar"), grid = $("#home-grid");
      if (hb) { var want2 = grid && !grid.hidden ? "" : "none"; if (hb.style.display !== want2) hb.style.display = want2; }
    } catch (e) {}
  }
  try {
    var catGridObs = new MutationObserver(debounce(function () { applyFilters("cat"); }, 250));
    var cg = $("#cat-grid"); if (cg) catGridObs.observe(cg, { childList: true });
    var homeGridObs = new MutationObserver(debounce(function () { applyFilters("home"); }, 400));
    var hg = $("#home-grid"); if (hg) homeGridObs.observe(hg, { childList: true });
  } catch (e) {}

  /* ================= empty search (M21, D21) ================= */
  var CATS15 = [["vehicles", "Vehicles"], ["phones-tablets", "Phones and Tablets"], ["electronics", "Electronics"], ["furniture", "Furniture"], ["fashion", "Fashion"], ["property", "Property"], ["services", "Services"], ["food-drinks-catering", "Food Drinks & Catering"], ["agriculture-animals", "Agriculture & Animals"], ["health-wellness", "Health & Wellness"], ["jobs-careers", "Jobs & Careers"], ["babies-kids", "Babies & Kids"], ["building-construction", "Building & Construction"], ["arts-crafts", "Arts & Crafts"], ["religion-spiritual", "Religion & Spiritual"]];
  function upgradeEmpty() {
    try {
      var empty = $("#home-empty"); if (!empty || empty.hidden) return;
      var chips = $("#empty-chips");
      if (chips && chips.children.length < 15) {
        chips.innerHTML = CATS15.map(function (c) { return '<button type="button" class="chip" data-empty-cat="' + c[0] + '">' + c[1] + "</button>"; }).join("");
      }
      if (!$("#ux-popular") && DB()) {
        DB().listProducts({}).then(function (ps) {
          if (!ps || !ps.length || $("#ux-popular") || empty.hidden) return;
          var wrap = document.createElement("div");
          wrap.id = "ux-popular"; wrap.style.cssText = "padding:6px 14px 4px";
          wrap.innerHTML = '<h3 style="font-size:15px;font-weight:800;margin:8px 0 10px">Popular right now</h3><div class="grid" style="padding:0">'
            + ps.slice(0, 4).map(function (p) {
              var img = p.photos && p.photos[0] ? '<img src="' + esc(p.photos[0]) + '" alt="" loading="lazy">' : "";
              return '<article class="card" data-ux-pop="' + esc(p.id) + '"><div class="card-photo">' + img + "</div>"
                + '<div class="card-body"><div class="card-price">' + esc(p.priceText || "") + '</div>'
                + '<h3 class="card-title">' + esc(p.title || "") + '</h3><p class="card-meta">' + esc(p.location || "") + "</p></div></article>";
            }).join("") + "</div>";
          empty.parentNode.insertBefore(wrap, empty.nextSibling);
          $$("[data-ux-pop]", wrap).forEach(function (c) {
            c.addEventListener("click", function () { if (window.NM_openDetail) window.NM_openDetail(c.getAttribute("data-ux-pop")); });
          });
        }).catch(function () {});
      }
    } catch (e) {}
  }
  try {
    var emptyObs = new MutationObserver(debounce(function () {
      var empty = $("#home-empty");
      if (empty && !empty.hidden) upgradeEmpty();
      var pop = $("#ux-popular");
      if (pop && empty && empty.hidden) pop.remove();
    }, 300));
    var he = $("#home-empty"); if (he) emptyObs.observe(he, { attributes: true, attributeFilter: ["hidden"] });
  } catch (e) {}

  /* ================= search stale-state guard (M22, D22) ================= */
  try {
    var sInput = $("#home-search"), sTries = 0;
    if (sInput) {
      var guardSearch = debounce(function () {
        var v = sInput.value.trim();
        var count = $("#home-count"), empty = $("#home-empty");
        var stale = false;
        if (count && count.textContent) {
          var m = /for "([^"]*)"/.exec(count.textContent);
          if (m && m[1] !== v) stale = true;
          if (!v && /results? for/.test(count.textContent)) stale = true;
        }
        if (!v && empty && !empty.hidden) stale = true;
        if (stale && sTries < 3) {
          sTries++;
          sInput.dispatchEvent(new Event("input", { bubbles: true }));
          sInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          setTimeout(guardSearch, 700);
        } else { sTries = 0; }
      }, 500);
      sInput.addEventListener("input", guardSearch);
      sInput.addEventListener("search", guardSearch);
    }
  } catch (e) {}

  /* ================= category counts (M23, D6) + subcats (M24, D7) ================= */
  function fillCounts() {
    try {
      if (!DB()) return;
      DB().listProducts({}).then(function (ps) {
        var byCat = {};
        (ps || []).forEach(function (p) { byCat[p.category] = (byCat[p.category] || 0) + 1; });
        $$("#cat-list .cat-row").forEach(function (row) {
          var id = row.getAttribute("data-cat"); if (!id) return;
          var c = $(".cat-count", row); if (!c) return;
          var want = (byCat[id] || 0) + " ads";
          if (c.textContent !== want) c.textContent = want;
        });
        var subHead = $("#cat-subcats .subcat-row.all");
        if (subHead && activeScreen() === "category") {
          var cat = null;
          $$("#cat-subcats .subcat-row").forEach(function (r) { if (r.getAttribute("data-cat")) cat = r.getAttribute("data-cat"); });
          if (cat) {
            var bySub = {}, total = 0;
            (ps || []).forEach(function (p) { if (p.category === cat) { total++; if (p.subcategory) bySub[p.subcategory] = (bySub[p.subcategory] || 0) + 1; } });
            $$("#cat-subcats [data-count-sub]").forEach(function (el) {
              var s = el.getAttribute("data-count-sub"); var n = bySub[s] || 0;
              var want = n === 0 ? "0 ads" : n + (n === 1 ? " ad" : " ads");
              if (el.textContent !== want) el.textContent = want;
            });
            var allEl = $("[data-count-all]");
            var wantAll = total + (total === 1 ? " item" : " items");
            if (allEl && allEl.textContent !== wantAll) allEl.textContent = wantAll;
          }
        }
      }).catch(function () {});
    } catch (e) {}
  }

  /* ================= stats band (M20) ================= */
  function checkStats() {
    try {
      var n = $("#stat-listings"); if (!n) return;
      var v = parseInt(String(n.textContent).replace(/[^\d]/g, ""), 10);
      var band = $(".stats-band");
      if (band && !isNaN(v) && v > 0 && v < 100 && band.style.display !== "none") band.style.display = "none";
    } catch (e) {}
  }

  /* ================= recently viewed clear (M27) ================= */
  function addRvClear() {
    try {
      var wrap = $("#rv-wrap"); if (!wrap || wrap.hidden || $("#ux-rv-clear")) return;
      var b = document.createElement("button");
      b.type = "button"; b.id = "ux-rv-clear"; b.className = "rv-clear"; b.textContent = "Clear";
      b.style.cssText = "float:right;margin:2px 14px 0 0";
      b.addEventListener("click", function () {
        try { localStorage.removeItem("nc2_recently_viewed"); } catch (e) {}
        wrap.hidden = true; toast("Recently viewed cleared");
      });
      wrap.insertBefore(b, wrap.firstChild);
    } catch (e) {}
  }

  /* ================= detail page (M12–M15, D3, D14–D20) ================= */
  function favs() { try { return JSON.parse(localStorage.getItem("nc2_favs") || "[]"); } catch (e) { return []; } }
  function setFav(id, on) {
    var f = favs(), i = f.indexOf(id);
    if (on && i < 0) f.push(id); if (!on && i >= 0) f.splice(i, 1);
    try { localStorage.setItem("nc2_favs", JSON.stringify(f)); } catch (e) {}
    $$("[data-fav]").forEach(function (b) {
      if (b.getAttribute("data-fav") === id) {
        b.classList.toggle("on", on);
        var svg = b.querySelector("svg"); if (svg) svg.setAttribute("fill", on ? "currentColor" : "none");
      }
    });
  }
  var detailDoneFor = "";
  function detailPass() {
    try {
      var p = window.NM_detailProduct; if (!p || !p.id) return;
      var body = $("#detail-body"); if (!body) return;
      var mine = DB() && DB().currentUserCache && DB().currentUserCache() && DB().currentUserCache().id === p.sellerId;
      /* M12/D15: clearer ping label */
      var ping = $("#d-ping");
      if (ping && ping.textContent.indexOf("Check availability") < 0) ping.innerHTML = "✓ Check availability";
      /* M14/D14 + D18: split condition out of the meta line; add Ad ID + date */
      var meta = $(".detail-meta", body);
      if (meta && detailDoneFor !== p.id) {
        detailDoneFor = p.id;
        var parts = meta.textContent.split("·").map(function (s) { return s.trim(); });
        var conds = ["new", "used", "refurbished", "for parts", "like new"];
        if (parts.length >= 3 && conds.indexOf((parts[1] || "").toLowerCase()) >= 0) {
          var cond = parts[1];
          meta.textContent = parts[0] + " · " + parts.slice(2).join(" · ");
          var chip = document.createElement("div");
          chip.className = "ux-cond-chip"; chip.innerHTML = "<i>Condition</i> " + esc(cond);
          meta.parentNode.insertBefore(chip, meta.nextSibling);
          var adid = document.createElement("div");
          adid.className = "ux-adid";
          var when = p.at ? new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
          adid.textContent = "Ad ID " + String(p.id).slice(0, 8).toUpperCase() + (when ? " · Posted " + when : "");
          chip.parentNode.insertBefore(adid, chip.nextSibling);
        }
      }
      /* M13/D16: call the seller */
      var ctaRow = $(".cta-row", body);
      if (ctaRow && p.sellerPhone && !mine && !$("#ux-call-btn")) {
        var a = document.createElement("a");
        a.id = "ux-call-btn"; a.className = "btn-secondary ux-call-btn";
        a.href = "tel:" + String(p.sellerPhone).replace(/[^+\d]/g, "");
        a.innerHTML = "📞 Call";
        ctaRow.appendChild(a);
      }
      /* D17: save from the item page */
      var actRow = $(".action-row", body);
      if (actRow && !$("#ux-d-save")) {
        var on = favs().indexOf(p.id) >= 0;
        var sb = document.createElement("button");
        sb.type = "button"; sb.className = "action-btn"; sb.id = "ux-d-save";
        sb.innerHTML = (on ? "♥ Saved" : "♡ Save");
        sb.addEventListener("click", function () {
          var now = favs().indexOf(p.id) < 0;
          setFav(p.id, now);
          sb.innerHTML = now ? "♥ Saved" : "♡ Save";
          toast(now ? "Saved to favorites" : "Removed from favorites");
        });
        actRow.appendChild(sb);
      } else {
        var sb2 = $("#ux-d-save");
        if (sb2) { var on2 = favs().indexOf(p.id) >= 0; var want = on2 ? "♥ Saved" : "♡ Save"; if (sb2.innerHTML !== want) sb2.innerHTML = want; }
      }
      /* D3: zoom wording follows the pointer */
      var hint = $(".gal-zoom-hint", body);
      if (hint && window.matchMedia("(pointer: fine)").matches && /Tap/.test(hint.textContent)) {
        hint.textContent = hint.textContent.replace(/Tap/g, "Click");
      }
      /* D19: owner controls become a proper panel */
      var del = $("#d-detail-del");
      if (del && !$("#ux-ownerbox")) {
        var box = document.createElement("div");
        box.className = "ux-ownerbox"; box.id = "ux-ownerbox";
        box.innerHTML = "<b>This is your listing</b><div class=\"ux-ob-row\">"
          + '<button type="button" class="ux-ob-manage">Manage in My listings</button>'
          + '<button type="button" class="ux-ob-del">Delete listing</button></div>';
        var anchor = $(".chat-cta", body) || body.lastElementChild;
        if (anchor && anchor.parentNode === body) body.insertBefore(box, anchor); else body.appendChild(box);
        del.style.display = "none";
        /* Do NOT proxy to the hidden button: its handler leans on the native
           confirm() dialog, which app webviews can swallow silently. Use the
           two-tap confirm (same pattern as status delete) + the DB call. */
        var delBtn = box.querySelector(".ux-ob-del");
        delBtn.addEventListener("click", function () {
          if (delBtn.getAttribute("data-arm") === "1") {
            delBtn.disabled = true; delBtn.textContent = "Deleting\u2026";
            DB().deleteProduct(p.id).then(function () {
              toast("Listing deleted.");
              window.NM_detailProduct = null;
              if (window.NM_show) { try { NM_show("me"); } catch (e) {} }
            }).catch(function (err) {
              delBtn.disabled = false; delBtn.removeAttribute("data-arm"); delBtn.textContent = "Delete listing";
              toast((err && err.message) || "Could not delete.");
            });
          } else {
            delBtn.setAttribute("data-arm", "1");
            delBtn.textContent = "Tap again to confirm delete";
            setTimeout(function () { if (delBtn.isConnected) { delBtn.removeAttribute("data-arm"); delBtn.textContent = "Delete listing"; } }, 12000);
          }
        });
        box.querySelector(".ux-ob-manage").addEventListener("click", function () {
          if (window.NM_show) window.NM_show("me");
          toast("Your listings live under Me → My listings");
        });
      }
      /* D20: a similar-items block that never loads removes itself */
      setTimeout(function () {
        var sw = $("#similar-wrap");
        if (sw && activeScreen() === "detail" && !sw.querySelector("[data-simid]")) sw.remove();
      }, 6000);
    } catch (e) {}
  }

  /* ================= chat: safety per conversation (M15) + names (M16) ================= */
  function fixNameText(el) {
    if (!el) return;
    var t = (el.textContent || "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      var nice = t.split("@")[0].replace(/[._-]+/g, " ").trim();
      nice = nice ? nice.charAt(0).toUpperCase() + nice.slice(1) : "Member";
      if (el.textContent !== nice) el.textContent = nice;
    }
  }
  function nameGuard() {
    try {
      $$("#inbox-list .convo-name").forEach(fixNameText);
      fixNameText($("#thread-name"));
      $$("#contact-body .c-name").forEach(fixNameText);
    } catch (e) {}
  }
  var lastThreadKey = "";
  function threadPass() {
    try {
      nameGuard();
      var cid = window.NM_threadConvo && window.NM_threadConvo.id ? window.NM_threadConvo.id : "";
      var key = cid || "t";
      if (key !== lastThreadKey) {
        lastThreadKey = key;
        var seen = false;
        try { seen = sessionStorage.getItem("ux_safety_" + key) === "1"; } catch (e) {}
        if (!seen) { try { localStorage.removeItem("nc2_safety_dismissed"); } catch (e) {} }
      }
      var x = $("#chat-safety-x");
      if (x && !x._uxBound) {
        x._uxBound = true;
        x.addEventListener("click", function () {
          try { sessionStorage.setItem("ux_safety_" + (lastThreadKey || "t"), "1"); } catch (e) {}
        });
      }
    } catch (e) {}
  }

  /* ================= updates suggestions (M26, D27) ================= */
  function updatesPass() {
    try {
      if ($("#ux-suggest") || !DB()) return;
      var empty = $("#upd-empty");
      if (!empty || empty.hidden) return;
      DB().listProducts({}).then(function (ps) {
        if (!ps || !ps.length || $("#ux-suggest")) return;
        var bySeller = {};
        ps.forEach(function (p) {
          if (!p.sellerId) return;
          if (!bySeller[p.sellerId]) bySeller[p.sellerId] = { id: p.sellerId, name: p.sellerName || "Seller", avatar: p.sellerAvatar || "", n: 0, loc: p.location || "" };
          bySeller[p.sellerId].n++;
        });
        var sellers = Object.keys(bySeller).map(function (k) { return bySeller[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
        if (!sellers.length) return;
        var host = document.createElement("div");
        host.className = "ux-suggest"; host.id = "ux-suggest";
        host.innerHTML = "<h3>Sellers you may know</h3><p>Follow a seller and their new listings and statuses show up here.</p>"
          + sellers.map(function (s) {
            var av = s.avatar ? '<img src="' + esc(s.avatar) + '" alt="">' : '<span class="ux-sug-fb">' + esc((s.name || "S").charAt(0).toUpperCase()) + "</span>";
            return '<div class="ux-sug-row">' + av + '<div class="ux-sug-tx"><b>' + esc(s.name) + "</b><span>" + s.n + (s.n === 1 ? " listing" : " listings") + (s.loc ? " · " + esc(s.loc) : "") + '</span></div>'
              + '<button type="button" class="btn-secondary" data-ux-follow="' + esc(s.id) + '">Follow</button></div>';
          }).join("");
        var anchor = $("#upd-listings") || empty;
        anchor.parentNode.insertBefore(host, anchor);
        DB().followingIds().then(function (ids) {
          $$("[data-ux-follow]", host).forEach(function (b) {
            if (ids.indexOf(b.getAttribute("data-ux-follow")) >= 0) { b.textContent = "Following"; b.disabled = true; }
          });
        }).catch(function () {});
        $$("[data-ux-follow]", host).forEach(function (b) {
          b.addEventListener("click", function () {
            var id = b.getAttribute("data-ux-follow");
            b.disabled = true; b.textContent = "Following…";
            DB().followSeller(id).then(function () { b.textContent = "Following"; toast("You are now following this seller"); })
              .catch(function () { b.disabled = false; b.textContent = "Follow"; toast("Please sign in to follow sellers"); });
          });
        });
      }).catch(function () {});
    } catch (e) {}
  }

  /* ================= notifications grouping (D26) ================= */
  function notifPass() {
    try {
      var host = $("#notifs-body"); if (!host || host.dataset.uxGrouped) return;
      var rows = $$(".nt-row", host); if (!rows.length) return;
      host.dataset.uxGrouped = "1";
      var lastGroup = "";
      rows.forEach(function (r) {
        var em = r.querySelector("em"); var t = em ? em.textContent : "";
        var g = /ago|now/i.test(t) && (/h ago|m ago|min|now|Just/i.test(t)) ? "Today" : (/[1-6]d ago/.test(t) ? "This week" : "Earlier");
        if (g !== lastGroup) {
          lastGroup = g;
          var h = document.createElement("div");
          h.className = "nt-group-h"; h.textContent = g;
          r.parentNode.insertBefore(h, r);
        }
      });
    } catch (e) {}
  }

  /* ================= sell form (M7 hint, M10 restore, M30) ================= */
  function fmtN(n) { return "₦" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function sellPass() {
    try {
      var form = $("#sell-form"); if (!form) return;
      var price = $("#sell-price");
      if (price && !price._uxHint) {
        price._uxHint = true;
        var hint = price.closest("label") ? price.closest("label").querySelector(".field-hint") : null;
        var def = hint ? hint.textContent : "";
        price.addEventListener("input", function () {
          if (!hint) return;
          var digits = price.value.replace(/[^\d]/g, "");
          var want = digits ? "Buyers will see: " + fmtN(digits) + " · Fair prices sell faster — check similar listings first." : def;
          if (hint.textContent !== want) hint.textContent = want;
        });
      }
      /* M10: restored drafts re-fire input so counters and the meter wake up */
      setTimeout(function () {
        ["sell-title", "sell-price", "sell-desc"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.value) el.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }, 350);
      /* M30: photos move up under the title */
      var picker = $(".photo-picker", form);
      var titleLabel = null;
      $$("label", form).forEach(function (l) { if (!titleLabel && $("#sell-title", l)) titleLabel = l; });
      if (picker && titleLabel && picker.previousElementSibling !== titleLabel && titleLabel.parentNode === form) {
        form.insertBefore(picker, titleLabel.nextSibling);
      }
      /* Duplicate Post item button removed 2026-10-19 at Ibrahim's order:
         the form's own submit button is the only Post item button. */
    } catch (e) {}
  }

  /* ================= desktop: sidebar persistence (D29) ================= */
  function navFix() {
    try {
      var nav = $("#bottomnav"); if (!nav) return;
      if (!mqDesk.matches) return;
      var s = activeScreen();
      if (s === "auth" || s === "otp" || s === "recover") return;
      if (nav.style.display === "none") nav.style.display = "flex";
    } catch (e) {}
  }
  setInterval(navFix, 1500);

  /* Feedback gap: marking an item sold succeeded silently (errors had a
     toast, success had none). Wrap once and confirm every success. */
  function wrapSold() {
    try {
      var D = DB(); if (!D || !D.markProductSold || D.markProductSold._ux) return;
      var orig = D.markProductSold;
      var w = function (id) { return orig.call(D, id).then(function (r) { toast("Marked as sold. \uD83C\uDF89"); return r; }); };
      w._ux = true; D.markProductSold = w;
    } catch (e) {}
  }
  setInterval(wrapSold, 2000);

  /* ================= desktop: two-pane chat (D28) ================= */
  function fmtWhen(ts) {
    try {
      var d = new Date(ts), now = new Date();
      if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch (e) { return ""; }
  }
  function threadRailPass() {
    try {
      var screen = $("#screen-thread"); if (!screen) return;
      if (!mqDesk.matches) { screen.classList.remove("nm-twopane"); var old = $("#ux-thread-rail"); if (old) old.remove(); return; }
      if (!DB()) return;
      DB().listConversations().then(function (cs) {
        if (activeScreen() !== "thread") return;
        screen.classList.add("nm-twopane");
        var rail = $("#ux-thread-rail");
        if (!rail) {
          rail = document.createElement("div");
          rail.className = "nm-thread-rail"; rail.id = "ux-thread-rail";
          screen.appendChild(rail);
        }
        var cur = window.NM_threadConvo && window.NM_threadConvo.id;
        var html = '<div class="nm-tr-head">Chats</div><div class="nm-tr-list">'
          + (cs || []).map(function (c) {
            var nm = c.otherName || "Member";
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nm)) nm = nm.split("@")[0];
            var av = c.otherAvatar ? '<span class="convo-ava"><img class="avatar-img" src="' + esc(c.otherAvatar) + '" alt=""></span>' : '<span class="convo-ava"><span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:800">' + esc(nm.charAt(0).toUpperCase()) + "</span></span>";
            var lastText = (c.messages && c.messages[0] && c.messages[0].text) || "";
            return '<button type="button" class="convo" data-ux-convo="' + esc(c.id) + '"' + (c.id === cur ? ' style="background:var(--acc-soft)"' : "") + ">" + av
              + '<span class="convo-main"><span class="convo-top"><span class="convo-name">' + esc(nm) + '</span><span class="convo-time">' + esc(fmtWhen(c.updatedAt)) + '</span></span>'
              + '<span class="convo-sub">' + esc(lastText) + "</span></span></button>";
          }).join("") + "</div>";
        if (rail.innerHTML !== html) {
          rail.innerHTML = html;
          $$("[data-ux-convo]", rail).forEach(function (b) {
            b.addEventListener("click", function () { if (window.NM_openThread) window.NM_openThread(b.getAttribute("data-ux-convo")); });
          });
        }
      }).catch(function () {});
    } catch (e) {}
  }

  /* ================= desktop: footer (D30) ================= */
  function footerPass() {
    try {
      var s = activeScreen();
      var okScreens = ["home", "category", "me", "updates", "inbox"];
      var old = $("#ux-footer"); if (old) old.remove();
      if (!mqDesk.matches || okScreens.indexOf(s) < 0) return;
      var host = $("#screen-" + s); if (!host) return;
      var f = document.createElement("div");
      f.className = "nm-footer"; f.id = "ux-footer";
      f.innerHTML = "<b>Nationwide Media Connect</b><span>Buy and sell across Nigeria, safely in the app.</span>"
        + '<button type="button" data-ux-go="category">Browse categories</button>'
        + '<button type="button" data-ux-go="sell">Sell an item</button>'
        + '<button type="button" data-legal="privacy">Privacy</button>'
        + '<button type="button" data-legal="terms">Terms</button>'
        + '<a href="https://wa.me/2349150951870" target="_blank" rel="noopener">Support on WhatsApp: 0915 095 1870</a>';
      host.appendChild(f);
      $$("[data-ux-go]", f).forEach(function (b) {
        b.addEventListener("click", function () {
          var navBtn = $('#bottomnav [data-go="' + b.getAttribute("data-ux-go") + '"]');
          if (navBtn) navBtn.click();
        });
      });
    } catch (e) {}
  }

  /* ================= desktop: install banner wording (D11) ================= */
  function instPass() {
    try {
      var el = $("#nm-inst"); if (!el || !mqDesk.matches) return;
      var t2 = $(".t2", el);
      if (t2 && t2.textContent.indexOf("home screen") >= 0) {
        t2.textContent = "Install Nationwide Media Connect for quick access, right from your browser.";
      }
      var t1 = $(".t1", el);
      if (t1 && t1.textContent === "Install our app") t1.textContent = "Install Nationwide Media Connect";
    } catch (e) {}
  }

  /* ================= routing ================= */
  var lastScreen = "";
  function route() {
    var s = activeScreen();
    navFix(); instPass(); syncBars();
    if (s === lastScreen && s !== "detail" && s !== "thread") return;
    lastScreen = s;
    if (s === "category") { fillCounts(); makeFilterBar("ux-cat-fbar", "cat", $("#cat-grid")); setTimeout(fillCounts, 1600); }
    if (s === "home") { checkStats(); addRvClear(); makeFilterBar("ux-home-fbar", "home", $("#home-grid")); setTimeout(checkStats, 1500); }
    if (s === "detail") { detailDoneFor = ""; setTimeout(detailPass, 60); setTimeout(detailPass, 900); }
    if (s === "thread") { threadPass(); threadRailPass(); setTimeout(threadPass, 800); setTimeout(threadRailPass, 1200); }
    if (s === "inbox") nameGuard();
    if (s === "updates") setTimeout(updatesPass, 400);
    if (s === "notifs") setTimeout(notifPass, 300);
    if (s === "sell") setTimeout(sellPass, 120);
    footerPass();
  }
  try {
    var appObs = new MutationObserver(debounce(route, 120));
    var app = $("#app"); if (app) appObs.observe(app, { attributes: true, attributeFilter: ["class"], subtree: true });
    var detailObs = new MutationObserver(debounce(function () { if (activeScreen() === "detail") detailPass(); }, 350));
    var dbEl = $("#detail-body"); if (dbEl) detailObs.observe(dbEl, { childList: true, subtree: true });
    var inboxObs = new MutationObserver(debounce(function () { nameGuard(); if (activeScreen() === "thread") threadPass(); }, 400));
    var ib = $("#inbox-list"); if (ib) inboxObs.observe(ib, { childList: true });
    var bodyObs = new MutationObserver(debounce(instPass, 300));
    bodyObs.observe(document.body, { childList: true });
    var barObs = new MutationObserver(debounce(syncBars, 150));
    var rh = $("#cat-results-head"); if (rh) barObs.observe(rh, { attributes: true, attributeFilter: ["hidden"] });
    var hgEl = $("#home-grid"); if (hgEl) barObs.observe(hgEl, { attributes: true, attributeFilter: ["hidden"] });
    var subObs = new MutationObserver(debounce(fillCounts, 600));
    var scEl = $("#cat-subcats");
    if (scEl) subObs.observe(scEl, { attributes: true, attributeFilter: ["hidden"], childList: true });
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("#cat-list .cat-row")) setTimeout(fillCounts, 1300);
    });
    window.addEventListener("resize", debounce(function () { navFix(); threadRailPass(); footerPass(); }, 300));
    route();
    setTimeout(route, 1200);
  } catch (e) {}
})();
