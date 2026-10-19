/* shopx.js — Mini-shops, simple inventory, cross-posting (Ibrahim, 2026-10-19).
   Augments existing screens without editing their files:
   - Store: cover photo, business hours + location line, status highlights,
     shareable shop link (?shop=<id>), owner "Edit shop" sheet, and the
     catalogue regrouped under subcategory headings.
   - Sell form: quantity + delivery fields flow into DB.createProduct.
   - Item page: stock line ("Only X left" / "Out of stock"), delivery line,
     owner stock stepper, and a Share & promote sheet (post as status,
     WhatsApp, copy link, share image). Product links use ?item=<id>. */
(function () {
  "use strict";
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (e) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[e]; }); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); return; } catch (e) {} } }
  function me() { try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; } }
  function DB() { return window.NM_DB; }
  function ngn(n) { return "\u20A6" + Number(n || 0).toLocaleString("en-NG"); }
  function isUuid(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || "")); }
  function itemLink(id) { return location.origin + location.pathname + "?item=" + id; }
  function shopLink(id) { return location.origin + location.pathname + "?shop=" + id; }
  function shareOut(title, text, url) {
    if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
    copyText(url); toast("Link copied \u2014 paste it anywhere.");
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () {}, function () { legacyCopy(t); }); }
    else { legacyCopy(t); }
  }
  function legacyCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }

  /* ---------------- Sell form: quantity + delivery into createProduct --- */
  function wrapCreate() {
    var D = DB(); if (!D) { return false; }
    if (D._shxCreate) { return true; }
    var orig = D.createProduct;
    D.createProduct = function (data) {
      try {
        var q = $("#sell-qty"); if (q && q.value !== "") { data.quantity = q.value; }
        var d = $("#sell-delivery"); if (d && d.value) { data.delivery = d.value; }
      } catch (e) {}
      return orig.call(D, data).then(function (row) {
        /* Listings go live instantly (auto-approve): tell the seller clearly
           and show them the live item. The old flow waited on a scan verdict
           that no longer exists, so posting felt like it gave no feedback. */
        try {
          var title = String((row && row.title) || (data && data.title) || "Your item");
          if (title.length > 42) { title = title.slice(0, 42) + "\u2026"; }
          setTimeout(function () { toast("\uD83C\uDF89 Your item is live: " + title); }, 1000);
          if (row && row.id) { setTimeout(function () { if (window.NM_openDetail) { NM_openDetail(row.id); } }, 2200); }
        } catch (e) {}
        return row;
      }, function (err) {
        var msg = (err && err.message) || "";
        /* The free-listing cap already shows its own upgrade modal — do not
           double up. Toast only where the app would otherwise stay silent. */
        if (!/free listings/i.test(msg)) {
          toast("Could not post your item. Check your connection and try again.");
        }
        throw err;
      });
    };
    D._shxCreate = true;
    return true;
  }

  /* ---------------- Deep links: ?shop= / ?item= ------------------------- */
  function deepLink() {
    var qs; try { qs = new URLSearchParams(location.search); } catch (e) { return; }
    var item = qs.get("item"), shop = qs.get("shop");
    if (!isUuid(item)) { item = null; }
    if (!isUuid(shop)) { shop = null; }
    if (!shop) { return; }   /* ?item= is handled natively by app.js */
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (shop && window.NM_openStore) { clearInterval(iv); try { NM_openStore(shop); } catch (e) {} }
      if (tries > 24) { clearInterval(iv); }
    }, 500);
  }

  /* ---------------- Share image card ------------------------------------ */
  function wrapText(g, text, x, y, maxW, lh, maxLines) {
    var words = String(text || "").split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else { cur = t; }
    });
    if (cur) { lines.push(cur); }
    lines = lines.slice(0, maxLines);
    lines.forEach(function (ln, i) { g.fillText(ln, x, y + i * lh); });
    return lines.length;
  }
  function cardBlob(p, sellerName) {
    return new Promise(function (resolve) {
      var cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1080;
      var g = cv.getContext("2d");
      g.fillStyle = "#101012"; g.fillRect(0, 0, 1080, 1080);
      function texts() {
        g.fillStyle = "#ffffff";
        g.font = "800 46px system-ui, sans-serif";
        var used = wrapText(g, p.title || "Item for sale", 56, 800, 968, 56, 2);
        g.fillStyle = "#ff6a3d";
        g.font = "900 72px system-ui, sans-serif";
        g.fillText(ngn(p.price) + (p.priceSuffix ? " " + p.priceSuffix : ""), 56, 800 + used * 56 + 62);
        g.fillStyle = "rgba(255,255,255,.65)";
        g.font = "600 30px system-ui, sans-serif";
        g.fillText((sellerName || "Seller") + (p.location ? " \u00B7 " + p.location : ""), 56, 985);
        g.fillStyle = "#e8380d"; g.fillRect(0, 1016, 1080, 64);
        g.fillStyle = "#ffffff"; g.font = "800 30px system-ui, sans-serif";
        g.fillText("Nationwide Media Connect \u2014 chat to buy", 56, 1058);
        if (cv.toBlob) { cv.toBlob(function (b) { resolve(b); }, "image/png"); } else { resolve(null); }
      }
      var url = p.images && p.images[0];
      if (url) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          var s = Math.max(1080 / img.width, 700 / img.height);
          var w = img.width * s, h = img.height * s;
          try { g.drawImage(img, (1080 - w) / 2, (700 - h) / 2, w, h); } catch (e) {}
          g.fillStyle = "rgba(16,16,18,.25)"; g.fillRect(0, 680, 1080, 20);
          texts();
        };
        img.onerror = function () { texts(); };
        img.src = url;
      } else { texts(); }
    });
  }

  /* ---------------- Cross-post sheet ------------------------------------ */
  function closeSheet() { var o = $("#shx-sheet-ov"); if (o) { o.remove(); } }
  function openShareSheet(p) {
    var D = DB(), my = me();
    var own = my && String(my) === String(p.sellerId);
    closeSheet();
    var ov = document.createElement("div");
    ov.className = "shx-ov"; ov.id = "shx-sheet-ov";
    ov.innerHTML = '<div class="shx-sheet"><div class="shx-sheet-hd"><b>Share &amp; promote</b><button class="shx-x" id="shx-x" aria-label="Close">\u00D7</button></div>' +
      '<div class="shx-prod">' + ((p.images && p.images[0]) ? '<img src="' + esc(p.images[0]) + '" alt="">' : "") +
      '<span><b>' + esc(p.title || "") + '</b><i>' + ngn(p.price) + '</i></span></div>' +
      (own ? '<button class="shx-act" id="shx-a-status">\uD83D\uDCF8 Post as status <span>Public, with this item tagged</span></button>' : "") +
      '<button class="shx-act" id="shx-a-wa">\uD83D\uDCAC Share on WhatsApp</button>' +
      '<button class="shx-act" id="shx-a-copy">\uD83D\uDD17 Copy product link</button>' +
      '<button class="shx-act" id="shx-a-img">\uD83D\uDDBC Download share image</button>' +
      '<p class="shx-note">The product link opens this item directly in the app, so customers from WhatsApp or Facebook land straight on it.</p></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) { closeSheet(); } });
    $("#shx-x").addEventListener("click", closeSheet);
    var link = itemLink(p.id);
    $("#shx-a-wa").addEventListener("click", function () {
      var txt = (p.title || "Item") + " \u2014 " + ngn(p.price) + (p.location ? " (" + p.location + ")" : "") + "\nSee it and chat with the seller here:";
      window.open("https://wa.me/?text=" + encodeURIComponent(txt + "\n" + link), "_blank");
    });
    $("#shx-a-copy").addEventListener("click", function () { copyText(link); toast("Product link copied."); });
    $("#shx-a-img").addEventListener("click", function () {
      var b = this; b.disabled = true; b.textContent = "Making image\u2026";
      cardBlob(p, p.sellerName).then(function (blob) {
        b.disabled = false; b.innerHTML = "\uD83D\uDDBC Download share image";
        if (!blob) { toast("Could not make the image on this phone."); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "nationwide-" + String(p.id).slice(0, 8) + ".png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      });
    });
    var st = $("#shx-a-status");
    if (st) {
      st.addEventListener("click", function () {
        st.disabled = true; st.innerHTML = "Posting\u2026";
        postAsStatus(p).then(function () {
          toast("Posted to your status \u2014 it is live in Discover too.");
          closeSheet();
        }).catch(function (e) {
          st.disabled = false; st.innerHTML = "\uD83D\uDCF8 Post as status <span>Public, with this item tagged</span>";
          toast((e && e.message) || "Could not post status.");
        });
      });
    }
  }
  function postAsStatus(p) {
    var D = DB(), my = me();
    if (!D || !D.client || !my) { return Promise.reject(new Error("Log in first.")); }
    var cap = (String(p.title || "For sale") + " \u2014 " + ngn(p.price) + (p.location ? " \u00B7 " + p.location : "")).slice(0, 300);
    function insert(url) {
      return D.client.from("statuses").insert({
        user_id: my, kind: "image", media_urls: [url], caption: cap, captions: [cap],
        product_id: p.id, visibility: "public"
      }).then(function (res) { if (res.error) { throw res.error; } return true; });
    }
    if (p.images && p.images[0]) { return insert(p.images[0]); }
    return cardBlob(p, p.sellerName).then(function (blob) {
      if (!blob) { throw new Error("No photo on this item to post."); }
      var path = my + "/card-" + Date.now() + ".png";
      return D.client.storage.from("status-media").upload(path, blob, { upsert: false }).then(function (res) {
        if (res.error) { throw res.error; }
        var url = D.client.storage.from("status-media").getPublicUrl(path).data.publicUrl;
        return insert(url);
      });
    });
  }
  window.NM_shareProduct = openShareSheet;

  /* ---------------- Item page: one tidy facts card + one Share --------- */
  function factRow(label, valueHtml) {
    return '<div class="shx-fact"><span class="shx-fl">' + label + '</span><span class="shx-fv">' + valueHtml + "</span></div>";
  }
  function ensureShareRow(body, p) {
    var row = $(".action-row", body); if (!row) { return; }
    if (!$("#shx-share", body)) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "action-btn"; b.id = "shx-share";
      b.innerHTML = "\uD83D\uDD17 Share";
      b.addEventListener("click", function () { openShareSheet(p); });
      row.appendChild(b);
    }
    var ns = $("#d-share", body); if (ns) { ns.style.display = "none"; }  /* one Share only: the sheet */
  }
  function detailPass() {
    var p = window.NM_detailProduct; if (!p || !p.id) { return; }
    var body = $("#detail-body"); if (!body) { return; }
    var my = me(), own = my && String(my) === String(p.sellerId);
    var scrEl = $("#screen-detail"); if (scrEl) { scrEl.classList.toggle("shx-own", !!own); }
    ensureShareRow(body, p);
    var existing = $("#shx-detail-card");
    if (existing && existing.getAttribute("data-pid") === String(p.id)) { return; }
    if (existing) { existing.remove(); }
    var meta = $(".detail-meta", body);
    var actRow = $(".action-row", body);
    var anchor = meta || actRow; if (!anchor) { return; }
    var qty = (p.quantity == null ? 1 : Number(p.quantity));
    var sold = (p.status || "active") !== "active";
    var noStock = p.category === "services" || p.category === "jobs-careers";
    var stepper = '<span class="shx-stepper"><button type="button" id="shx-qminus" aria-label="Reduce stock">\u2212</button>' +
      '<b id="shx-qval">' + qty + '</b><button type="button" id="shx-qplus" aria-label="Add stock">+</button></span>';
    var rows = "";
    if (p.condition) { rows += factRow("Condition", esc(p.condition)); }
    if (sold) { rows += factRow("Status", '<b class="shx-out">Sold</b>'); }
    else if (!noStock) {
      var sv = qty === 0 ? '<b class="shx-out">Out of stock</b>'
        : qty <= 3 ? '<b class="shx-low">\uD83D\uDD25 Only ' + qty + " left</b>"
        : "\u2713 In stock \u00B7 " + qty + " available";
      rows += factRow("Stock", own ? sv + " " + stepper : sv);
    } else if (own) { rows += factRow("Stock", stepper); }
    if (p.delivery) { rows += factRow("Delivery", esc(p.delivery)); }
    var when = p.at ? new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
    rows += factRow("Ad ID", String(p.id).slice(0, 8).toUpperCase() + (when ? " \u00B7 Posted " + when : ""));
    if (!rows) { return; }
    var card = document.createElement("div");
    card.className = "shx-facts"; card.id = "shx-detail-card";
    card.setAttribute("data-pid", String(p.id));
    card.innerHTML = rows;
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    /* Owner view: the seller gets an identity card + seller controls, and
       the buyer CTAs are hidden by the .shx-own class on the screen. */
    var oc = $("#shx-owncard");
    if (oc && (oc.getAttribute("data-pid") !== String(p.id) || !own)) { oc.remove(); oc = null; }
    if (own && !oc) {
      oc = document.createElement("div");
      oc.className = "shx-owncard"; oc.id = "shx-owncard"; oc.setAttribute("data-pid", String(p.id));
      var pill = sold ? "\uD83D\uDD34 Sold" : (qty === 0 ? "\uD83D\uDFE1 Out of stock" : "\uD83D\uDFE2 Active");
      oc.innerHTML = '<div class="shx-oc-head">\uD83D\uDC51 This is your product</div>'
        + '<div class="shx-oc-sub">You are the seller. Buyers see a Chat button on this page; you see your seller controls.</div>'
        + '<div class="shx-oc-stats"><span>\uD83D\uDC41 ' + Number(p.views || 0) + ' views</span><span>\uD83D\uDCE6 Stock: ' + qty + '</span><span>' + pill + '</span></div>'
        + '<div class="shx-oc-row"><button type="button" class="shx-oc-btn shx-oc-primary" data-act="share">\uD83D\uDD17 Share &amp; promote</button>'
        + '<button type="button" class="shx-oc-btn" data-act="sold">' + (sold ? "\u21A9 Back in stock" : "\u2713 Mark as sold") + '</button>'
        + '<button type="button" class="shx-oc-btn" data-act="mine">\uD83D\uDCCB My listings</button></div>';
      anchor.parentNode.insertBefore(oc, card);
      oc.addEventListener("click", function (e) {
        var b = e.target && e.target.closest ? e.target.closest("[data-act]") : null; if (!b) { return; }
        var act = b.getAttribute("data-act");
        if (act === "share") { if (window.NM_shareProduct) { window.NM_shareProduct(p); } return; }
        if (act === "mine") { if (window.NM_show) { window.NM_show("me"); } return; }
        if (act === "sold") {
          b.disabled = true;
          var rebuild = function () { var f1 = $("#shx-detail-card"); if (f1) { f1.remove(); } var o2 = $("#shx-owncard"); if (o2) { o2.remove(); } detailPass(); };
          if (sold) {
            DB().client.from("products").update({ status: "active" }).eq("id", p.id).eq("seller_id", my).then(function (res) {
              if (res.error) { b.disabled = false; toast("Could not update. Try again."); return; }
              p.status = "active"; toast("Back on sale. \uD83C\uDF89"); rebuild();
            }, function () { b.disabled = false; toast("Could not update. Try again."); });
          } else {
            DB().markProductSold(p.id).then(function () { p.status = "sold"; rebuild(); },
              function () { b.disabled = false; });
          }
        }
      });
    }
    if (own) {
      var busy = false;
      function setQty(n) {
        if (busy || n < 0) { return; }
        busy = true;
        DB().client.from("products").update({ quantity: n }).eq("id", p.id).eq("seller_id", my)
          .then(function (res) {
            busy = false;
            if (res.error) { toast("Could not update stock."); return; }
            p.quantity = n;
            var c = $("#shx-detail-card"); if (c) { c.remove(); }
            detailPass();
            toast(n === 0 ? "Marked out of stock." : "Stock updated: " + n);
          }, function () { busy = false; toast("Could not update stock."); });
      }
      var qm = $("#shx-qminus"), qp = $("#shx-qplus");
      if (qm) { qm.addEventListener("click", function () { setQty(Math.max(0, (p.quantity == null ? 1 : Number(p.quantity)) - 1)); }); }
      if (qp) { qp.addEventListener("click", function () { setQty((p.quantity == null ? 1 : Number(p.quantity)) + 1); }); }
    }
  }
  function armDetail() {
    var body = $("#detail-body");
    if (!body || body._shxObs) { return; }
    body._shxObs = true;
    new MutationObserver(function () { setTimeout(detailPass, 60); }).observe(body, { childList: true, subtree: true });
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("#screen-detail")) { setTimeout(detailPass, 350); }
    });
  }

  /* ---------------- Store augmentation ----------------------------------- */
  var _shopSeller = null, _shopSubMap = null;
  function wrapStore() {
    if (!window.NM_openStore || window.NM_openStore._shx) { return; }
    var orig = window.NM_openStore;
    var w = function (sellerId) {
      _shopSeller = String(sellerId); _shopSubMap = null;
      var r = orig.apply(null, arguments);
      setTimeout(function () { augmentStore(sellerId); }, 800);
      setTimeout(function () { augmentStore(sellerId); }, 2000);
      return r;
    };
    w._shx = true;
    window.NM_openStore = w;
  }
  function regroupGrid(grid) {
    if (!_shopSubMap || !grid || grid.querySelector(".shx-group-hd")) { return; }
    var rows = $$(".store-row", grid);
    if (rows.length < 4) { return; }
    var groups = {}, order = [];
    rows.forEach(function (r) {
      var sub = _shopSubMap[r.getAttribute("data-srow")] || "Other items";
      if (!groups[sub]) { groups[sub] = []; order.push(sub); }
      groups[sub].push(r);
    });
    if (order.length < 2) { return; }
    var frag = document.createDocumentFragment();
    order.forEach(function (sub) {
      var hd = document.createElement("div");
      hd.className = "shx-group-hd";
      hd.textContent = sub + " \u00B7 " + groups[sub].length + (groups[sub].length === 1 ? " item" : " items");
      frag.appendChild(hd);
      groups[sub].forEach(function (r) { frag.appendChild(r); });
    });
    grid.appendChild(frag);
  }
  function armGrid(grid) {
    if (!grid || grid._shxObs) { return; }
    grid._shxObs = true;
    new MutationObserver(function () { regroupGrid(grid); }).observe(grid, { childList: true });
  }
  function augmentStore(sellerId) {
    var body = $("#seller-body"); if (!body) { return; }
    var store = $(".store2", body); if (!store) { return; }
    if (store.getAttribute("data-shx") === String(sellerId)) { armGrid($("#store2-grid")); regroupGrid($("#store2-grid")); return; }
    store.setAttribute("data-shx", String(sellerId));
    var D = DB(); if (!D) { return; }
    var my = me(), own = my && String(my) === String(sellerId);
    Promise.all([
      D.getProfileById(sellerId).catch(function () { return null; }),
      D.listProducts({}).catch(function () { return []; }),
      D.listStatuses([sellerId]).catch(function () { return []; })
    ]).then(function (res) {
      var pr = res[0] || {}, all = res[1] || [], statuses = res[2] || [];
      var rows = all.filter(function (p) { return String(p.sellerId) === String(sellerId); });
      _shopSubMap = {};
      rows.forEach(function (p) { _shopSubMap[p.id] = p.subcategory || ""; });
      /* cover */
      var newestImg = "";
      rows.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).some(function (p) {
        if (p.images && p.images[0]) { newestImg = p.images[0]; return true; } return false;
      });
      var coverUrl = pr.cover_url || newestImg;
      var cover = document.createElement("div");
      cover.className = "shx-cover" + (coverUrl ? "" : " grad");
      cover.innerHTML = (coverUrl ? '<img src="' + esc(coverUrl) + '" alt="">' : "") +
        '<span class="shx-cover-tag">\uD83C\uDFEA Shop</span>';
      store.insertBefore(cover, store.firstChild);
      /* info line: hours + location */
      var loc = [pr.lga, pr.state].filter(Boolean).join(", ") || pr.address || "";
      if (pr.business_hours || loc) {
        var info = document.createElement("div");
        info.className = "shx-infoline";
        info.innerHTML = (pr.business_hours ? '<span>\uD83D\uDD50 ' + esc(pr.business_hours) + "</span>" : "") +
          (loc ? '<span>\uD83D\uDCCD ' + esc(loc) + "</span>" : "");
        var stats = $(".store2-stats", store);
        if (stats) { stats.parentNode.insertBefore(info, stats); }
      }
      /* share / edit row */
      var shareRow = document.createElement("div");
      shareRow.className = "shx-sharerow";
      shareRow.innerHTML = '<button type="button" class="shx-sharebtn" id="shx-share-shop">\uD83D\uDD17 ' + (own ? "Share my shop" : "Share this shop") + "</button>" +
        (own ? '<button type="button" class="shx-editbtn" id="shx-edit-shop">\u270F\uFE0F Edit shop</button>' : "");
      var stats2 = $(".store2-stats", store);
      if (stats2) { stats2.parentNode.insertBefore(shareRow, stats2.nextSibling); } else { store.appendChild(shareRow); }
      $("#shx-share-shop").addEventListener("click", function () {
        shareOut(pr.display_name || "Shop", "Check out this shop on Nationwide Media Connect:", shopLink(sellerId));
      });
      var eb = $("#shx-edit-shop");
      if (eb) { eb.addEventListener("click", function () { openEditShop(pr, sellerId); }); }
      /* status highlights */
      if (statuses.length && window.NM_statusViewer) {
        var asc = statuses.slice().sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        var latest = asc[asc.length - 1];
        var thumb = (latest.media_urls && latest.media_urls[0]) || "";
        var hi = document.createElement("div");
        hi.className = "shx-high";
        hi.innerHTML = '<h4>Status highlights</h4><button type="button" class="shx-high-it" id="shx-high-it">' +
          '<span class="shx-high-c">' + (thumb ? '<img src="' + esc(thumb) + '" alt="">' : "<span>\uD83D\uDCF8</span>") + '</span>' +
          '<span class="shx-high-t">' + statuses.length + (statuses.length === 1 ? " status" : " statuses") + " live now \u00B7 tap to view</span></button>";
        var head = $(".store2-head", store);
        if (head) { head.parentNode.insertBefore(hi, head); }
        $("#shx-high-it").addEventListener("click", function () { NM_statusViewer(sellerId, asc); });
      }
      armGrid($("#store2-grid"));
      regroupGrid($("#store2-grid"));
    }).catch(function () {});
  }

  /* ---------------- Edit shop sheet -------------------------------------- */
  function openEditShop(pr, sellerId) {
    closeSheet();
    var ov = document.createElement("div");
    ov.className = "shx-ov"; ov.id = "shx-sheet-ov";
    ov.innerHTML = '<div class="shx-sheet"><div class="shx-sheet-hd"><b>Edit your shop</b><button class="shx-x" id="shx-x" aria-label="Close">\u00D7</button></div>' +
      '<label class="shx-fld">Cover photo<input type="file" id="shx-cover-file" accept="image/*"><span class="shx-fhint">Shown at the top of your shop. If you skip it, your newest listing photo is used.</span></label>' +
      '<label class="shx-fld">About your shop<textarea id="shx-bio" rows="3" maxlength="300" placeholder="What you sell, where you are, why buyers trust you">' + esc(pr.bio || "") + '</textarea></label>' +
      '<label class="shx-fld">Business hours<input type="text" id="shx-hours" maxlength="80" placeholder="e.g. Mon to Sat \u00B7 8am to 6pm" value="' + esc(pr.business_hours || "") + '"></label>' +
      '<button class="shx-save" id="shx-save-shop">Save shop</button></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) { closeSheet(); } });
    $("#shx-x").addEventListener("click", closeSheet);
    $("#shx-save-shop").addEventListener("click", function () {
      var btn = this; btn.disabled = true; btn.textContent = "Saving\u2026";
      var D = DB(), my = me();
      var upd = { bio: $("#shx-bio").value.trim(), business_hours: $("#shx-hours").value.trim() };
      var file = $("#shx-cover-file").files && $("#shx-cover-file").files[0];
      var chain = Promise.resolve();
      if (file) {
        var path = my + "/cover-" + Date.now() + ".jpg";
        chain = D.client.storage.from("status-media").upload(path, file, { upsert: false }).then(function (res) {
          if (res.error) { throw res.error; }
          upd.cover_url = D.client.storage.from("status-media").getPublicUrl(path).data.publicUrl;
        });
      }
      chain.then(function () {
        return D.client.from("profiles").update(upd).eq("id", my);
      }).then(function (res) {
        if (res && res.error) { throw res.error; }
        toast("Shop updated.");
        closeSheet();
        if (window.NM_openStore) { NM_openStore(sellerId); }
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Save shop";
        toast("Could not save. Check your connection and try again.");
      });
    });
  }

  /* ---------------- init --------------------------------------------------- */
  function init() {
    wrapCreate();
    wrapStore();
    armDetail();
    return true;
  }
  var tries = 0;
  var iv = setInterval(function () {
    init();
    if (window.NM_openStore && window.NM_openStore._shx && DB() && DB()._shxCreate) { clearInterval(iv); }
    if (++tries > 40) { clearInterval(iv); }
  }, 500);
  deepLink();
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();
