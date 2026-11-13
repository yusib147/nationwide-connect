/* Nationwide Media Connect — sellerscope.js (2026-11-02, Ibrahim's order)
   Seller-store scope tools, layered additively over whichever seller
   screen renders into #seller-body (the extras store2 grid, or the
   app.js seller grid). Nothing about the existing store layout changes;
   this module only adds, directly above and below the listings grid:

   1) RELATED STRIP — when the visitor arrived from a product (the
      detail page's current product belongs to this seller), the seller's
      OTHER goods in that same category are shown first, in a strip
      labelled "Related to the item you viewed".
   2) CATEGORY CHIPS — when the seller sells in more than one category,
      a chip per category (with counts) filters the grid in place.
   3) SEE ALL — the grid initially shows the first 6 matching listings
      (the item the visitor came from is always kept visible); a
      "See all N listings" button under the grid expands it, and
      "Show less" collapses it again.

   State is keyed to the exact set of product ids in the grid, so sort
   repaints and subcategory regrouping re-apply the current filter
   instead of resetting it, while a different seller starts fresh.
   Group headers inserted by shopx are hidden when every row under
   them is hidden. Any failure leaves the store exactly as it was. */
;(function () {
  "use strict";

  var CAP = 6;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>\"']/g, function (e) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[e]; }); }
  function ngn(n) { return "\u20A6" + Number(n || 0).toLocaleString("en-NG"); }
  function catOf(p) { return (p && (p.categoryName || p.category)) || "Other"; }

  var state = null;
  var poolCache = { at: 0, rows: null };
  function pool() {
    if (poolCache.rows && Date.now() - poolCache.at < 60000) return Promise.resolve(poolCache.rows);
    if (!window.NM_DB || !window.NM_DB.listProducts) return Promise.resolve([]);
    return window.NM_DB.listProducts({}).then(function (rows) {
      poolCache = { at: Date.now(), rows: rows || [] };
      return poolCache.rows;
    }).catch(function () { return poolCache.rows || []; });
  }

  function gridEl() {
    return $("#seller-body #store2-grid") || $("#seller-body #seller-grid");
  }
  function rowId(el) { return el.getAttribute("data-srow") || el.getAttribute("data-id"); }
  function rowEls(grid) {
    return Array.prototype.slice.call(grid.children).filter(function (el) {
      return !!(el.getAttribute && (el.getAttribute("data-srow") || el.getAttribute("data-id")));
    });
  }

  function ensure() {
    var grid = gridEl();
    if (!grid) { state = null; return; }
    var rows = rowEls(grid);
    if (!rows.length) return;
    var ids = rows.map(rowId).filter(Boolean);
    if (!ids.length) return;
    var setKey = ids.slice().sort().join(",");
    if (state && state.setKey === setKey && state.grid === grid) { apply(grid); return; }
    pool().then(function (all) {
      if (gridEl() !== grid) return;
      var byId = {};
      (all || []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
      var sellerId = null;
      for (var i = 0; i < ids.length; i++) {
        var pr = byId[ids[i]];
        if (pr && pr.sellerId) { sellerId = String(pr.sellerId); break; }
      }
      var originCat = "", originId = "";
      var origin = window.NM_detailProduct;
      if (origin && sellerId && String(origin.sellerId || "") === sellerId) {
        originCat = catOf(byId[origin.id] || origin);
        originId = String(origin.id);
      }
      state = {
        setKey: setKey, grid: grid, sellerId: sellerId, byId: byId,
        filter: "", expanded: false, originCat: originCat, originId: originId
      };
      buildBar(grid, rows);
      apply(grid);
    }).catch(function () {});
  }

  function buildBar(grid, rows) {
    var body = $("#seller-body"); if (!body) return;
    $$(".ssc-wrap", body).forEach(function (n) { n.remove(); });
    $$(".ssc-more", body).forEach(function (n) { n.remove(); });

    var prods = rows.map(function (el) { return state.byId[rowId(el)]; }).filter(Boolean);
    var cats = [], counts = {};
    prods.forEach(function (p) {
      var c = catOf(p);
      if (!counts[c]) { counts[c] = 0; cats.push(c); }
      counts[c]++;
    });

    var html = "";
    if (state.originCat && state.originId) {
      var rel = prods.filter(function (p) {
        return catOf(p) === state.originCat && String(p.id) !== state.originId;
      });
      if (rel.length) {
        html += '<div class="ssc-rel"><div class="ssc-rel-hd">Related to the item you viewed</div><div class="ssc-rel-row">' +
          rel.slice(0, 10).map(function (p) {
            var img = p.images && p.images[0] ? p.images[0] : "";
            return '<button type="button" class="ssc-mini" data-ssc-open="' + esc(p.id) + '">' +
              (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<span class="ssc-mini-noimg"></span>') +
              '<span class="ssc-mini-t">' + esc(p.title || "Item") + '</span>' +
              '<span class="ssc-mini-p">' + ngn(p.price) + '</span></button>';
          }).join("") + "</div></div>";
      }
    }
    if (cats.length >= 2) {
      html += '<div class="ssc-chips"><button type="button" class="ssc-chip on" data-ssc-cat="">All (' + prods.length + ")</button>" +
        cats.map(function (c) {
          return '<button type="button" class="ssc-chip" data-ssc-cat="' + esc(c) + '">' + esc(c) + " (" + counts[c] + ")</button>";
        }).join("") + "</div>";
    }
    if (html) {
      var wrap = document.createElement("div");
      wrap.className = "ssc-wrap";
      wrap.innerHTML = html;
      grid.parentNode.insertBefore(wrap, grid);
      $$(".ssc-chip", wrap).forEach(function (ch) {
        ch.addEventListener("click", function () {
          state.filter = ch.getAttribute("data-ssc-cat") || "";
          state.expanded = false;
          apply(grid);
        });
      });
      $$(".ssc-mini", wrap).forEach(function (m) {
        m.addEventListener("click", function () {
          if (window.NM_openDetail) window.NM_openDetail(m.getAttribute("data-ssc-open"));
        });
      });
    }
    var more = document.createElement("div");
    more.className = "ssc-more";
    more.style.display = "none";
    more.innerHTML = '<button type="button" class="ssc-seeall">See all listings</button>';
    grid.parentNode.insertBefore(more, grid.nextSibling);
    $(".ssc-seeall", more).addEventListener("click", function () {
      state.expanded = !state.expanded;
      apply(grid);
      if (!state.expanded && grid.scrollIntoView) {
        try { grid.scrollIntoView({ block: "start" }); } catch (e) {}
      }
    });
  }

  function apply(grid) {
    if (!state || state.grid !== grid) return;
    var rows = rowEls(grid);
    var match = 0, shown = 0;
    rows.forEach(function (el) {
      var id = rowId(el);
      var p = state.byId[id];
      var ok = !state.filter || (p && catOf(p) === state.filter);
      if (ok) match++;
      var isOrigin = state.originId && String(id) === state.originId;
      var vis = ok && (isOrigin || state.expanded || shown < CAP);
      if (vis && !isOrigin) shown++;
      el.style.display = vis ? "" : "none";
    });
    /* Hide shopx subcategory group headers whose whole group is hidden. */
    var hdr = null, hdrVis = false;
    function flush() { if (hdr) hdr.style.display = hdrVis ? "" : "none"; }
    Array.prototype.slice.call(grid.children).forEach(function (el) {
      if (el.classList && el.classList.contains("shx-group-hd")) { flush(); hdr = el; hdrVis = false; }
      else if ((el.getAttribute("data-srow") || el.getAttribute("data-id")) && el.style.display !== "none") { hdrVis = true; }
    });
    flush();
    var more = $("#seller-body .ssc-more"), btn = $("#seller-body .ssc-seeall");
    if (more && btn) {
      if (match > CAP) {
        more.style.display = "";
        btn.textContent = state.expanded ? "Show less" : "See all " + match + " listings";
      } else {
        more.style.display = "none";
      }
    }
    $$("#seller-body .ssc-chip").forEach(function (ch) {
      ch.classList.toggle("on", (ch.getAttribute("data-ssc-cat") || "") === state.filter);
    });
  }

  var sched = null;
  function schedule() {
    if (sched) return;
    sched = setTimeout(function () { sched = null; try { ensure(); } catch (e) {} }, 160);
  }
  function wire() {
    var body = $("#seller-body");
    if (body && window.MutationObserver && !body.__sscObs) {
      body.__sscObs = true;
      new MutationObserver(schedule).observe(body, { childList: true, subtree: true });
    }
  }
  wire();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  setInterval(function () { wire(); schedule(); }, 2500);
})();
