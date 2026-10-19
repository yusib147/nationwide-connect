/* statusx.js — Status discovery + product tags (Ibrahim's option C, 2026-10-19).
   Builds on updates.js without editing it:
   - Composer: "Tag a listing" picker + "Show in Discover" toggle, passed to
     DB.postStatus via a wrapper (product_id + visibility columns).
   - Viewer: a product chip on tagged statuses (tap = listing, Chat = thread).
   - Updates: a Discover rail — public statuses from sellers you do NOT follow.
   - Home: a status row at the top of the feed (mine + followed + discover).
   Privacy: statuses default to followers-only in the DB; the composer toggle
   (default ON) is what makes a new status public/discoverable. */
(function () {
  "use strict";
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (e) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[e]; }); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); return; } catch (e) {} } }
  function me() { try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; } }
  function DB() { return window.NM_DB; }
  function ngn(n) { return "\u20A6" + Number(n || 0).toLocaleString("en-NG"); }
  function avaHtml(p) {
    if (p && p.avatar_url) { return '<img src="' + esc(p.avatar_url) + '" alt="">'; }
    var nm = (p && p.display_name) || "Seller";
    return "<span>" + esc(String(nm).trim().charAt(0).toUpperCase() || "S") + "</span>";
  }

  var _tag = null;   /* {id,title,price,img} chosen in the composer */
  var _viz = true;   /* Discover visibility for the next post */
  var _prodCache = {};
  var _viewRows = null;

  /* ---------------- postStatus wrapper: attach tag + visibility -------- */
  function wrapPost() {
    var D = DB(); if (!D || D._stxPost) { return !!D; }
    var orig = D.postStatus;
    D.postStatus = function (files, caps) {
      var opts = { product_id: _tag ? _tag.id : null, visibility: _viz ? "public" : "followers" };
      return orig.call(D, files, caps, opts);
    };
    D._stxPost = true;
    return true;
  }

  /* ---------------- Composer: tag picker + Discover toggle -------------- */
  function paintTagBtn() {
    var b = $("#stx-tagbtn"); if (!b) { return; }
    if (_tag) {
      b.classList.add("has");
      b.innerHTML = (_tag.img ? '<img src="' + esc(_tag.img) + '" alt="">' : '<span class="stx-tfb">\uD83C\uDFF7</span>') +
        '<span class="stx-tmain"><b>' + esc(_tag.title) + '</b><i>' + ngn(_tag.price) + ' \u00B7 tap to change</i></span>' +
        '<span class="stx-tx" id="stx-tagclear" aria-label="Remove tag">\u00D7</span>';
      var x = $("#stx-tagclear");
      if (x) { x.addEventListener("click", function (e) { e.stopPropagation(); _tag = null; paintTagBtn(); }); }
    } else {
      b.classList.remove("has");
      b.innerHTML = '<span class="stx-tfb">\uD83C\uDFF7</span><span class="stx-tmain"><b>Tag a listing</b><i>Optional \u2014 viewers can open the item and chat about it</i></span>';
    }
  }
  function augmentComposer() {
    var root = $("#status-root"); if (!root) { return; }
    if (!$("#stc-grid", root) || $("#stx-controls", root)) { return; }
    var hint = $(".stc2-hint", root); if (!hint) { return; }
    var box = document.createElement("div");
    box.className = "stx-controls"; box.id = "stx-controls";
    box.innerHTML = '<button class="stx-tagbtn" id="stx-tagbtn" type="button"></button>' +
      '<label class="stx-viz"><input type="checkbox" id="stx-viz"' + (_viz ? " checked" : "") + '><span><b>Show in Discover</b> \u2014 buyers beyond your followers can find this status and the tagged item</span></label>';
    hint.parentNode.insertBefore(box, hint);
    paintTagBtn();
    $("#stx-tagbtn").addEventListener("click", function (e) { if (e.target.id !== "stx-tagclear") { openPicker(); } });
    $("#stx-viz").addEventListener("change", function () { _viz = this.checked; });
  }
  function openPicker() {
    var D = DB(), my = me(); if (!D || !my) { return; }
    closePicker();
    var ov = document.createElement("div");
    ov.className = "stx-sheet-ov"; ov.id = "stx-sheet-ov";
    ov.innerHTML = '<div class="stx-sheet"><div class="stx-sheet-hd"><b>Tag a listing</b><button class="stx-sheet-x" id="stx-sheet-x" aria-label="Close">\u00D7</button></div>' +
      '<div class="stx-sheet-list" id="stx-sheet-list"><p class="stx-sheet-load">Loading your listings\u2026</p></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) { closePicker(); } });
    $("#stx-sheet-x").addEventListener("click", closePicker);
    D.listProducts({}).then(function (prods) {
      var list = $("#stx-sheet-list"); if (!list) { return; }
      var mine = (prods || []).filter(function (p) { return String(p.sellerId) === String(my) && (p.status || "active") === "active"; });
      if (!mine.length) {
        list.innerHTML = '<p class="stx-sheet-load">You have no active listings to tag yet. Post an item first, then tag it in your status so buyers can open it and chat.</p>';
        return;
      }
      list.innerHTML = mine.map(function (p) {
        var img = (p.images && p.images[0]) || "";
        return '<button class="stx-prow" data-pid="' + esc(p.id) + '">' +
          (img ? '<img src="' + esc(img) + '" alt="">' : '<span class="stx-pfb">' + esc(String(p.title || "I").charAt(0).toUpperCase()) + '</span>') +
          '<span class="stx-pmain"><b>' + esc(p.title || "") + '</b><i>' + ngn(p.price) + '</i></span><span class="stx-pgo">\u203A</span></button>';
      }).join("");
      list.querySelectorAll("[data-pid]").forEach(function (b) {
        b.addEventListener("click", function () {
          var p = mine.filter(function (x) { return String(x.id) === b.getAttribute("data-pid"); })[0];
          if (p) { _tag = { id: p.id, title: p.title, price: p.price, img: (p.images && p.images[0]) || "" }; }
          closePicker(); paintTagBtn();
        });
      });
    }).catch(function () {
      var list = $("#stx-sheet-list"); if (list) { list.innerHTML = '<p class="stx-sheet-load">Could not load your listings. Check your connection and try again.</p>'; }
    });
  }
  function closePicker() { var ov = $("#stx-sheet-ov"); if (ov) { ov.remove(); } }
  function wrapComposer() {
    if (!window.NM_statusComposer || window.NM_statusComposer._stx) { return; }
    var orig = window.NM_statusComposer;
    var wrapped = function (keep, capVal) {
      var r = orig.apply(null, arguments);
      if (!keep) { _tag = null; _viz = true; }
      setTimeout(augmentComposer, 30);
      return r;
    };
    wrapped._stx = true;
    window.NM_statusComposer = wrapped;
  }

  /* ---------------- Viewer: product chip + Chat ------------------------- */
  function productOf(pid) {
    if (_prodCache[pid]) { return _prodCache[pid]; }
    var D = DB();
    _prodCache[pid] = D._getProduct(pid).then(function (p) { return p; }, function () { return null; });
    return _prodCache[pid];
  }
  function injectChip(stv, row) {
    var D = DB(); if (!D) { return; }
    productOf(row.product_id).then(function (p) {
      if (!p || !document.body.contains(stv)) { return; }
      if (document.querySelector("#status-root .stx-chip")) { return; }
      var own = String(me()) === String(row.user_id);
      var sold = (p.status || "active") !== "active" || p.quantity === 0;
      var chip = document.createElement("div");
      chip.className = "stx-chip" + (sold ? " sold" : "");
      chip.innerHTML = '<button class="stx-cgo-btn" type="button" aria-label="Open item">' +
        ((p.images && p.images[0]) ? '<img src="' + esc(p.images[0]) + '" alt="">' : '<span class="stx-cfb">\uD83D\uDECD</span>') +
        '<span class="stx-cmain"><span class="stx-ct">' + esc(p.title || "") + '</span>' +
        '<span class="stx-cp">' + (sold ? "SOLD \u2014 no longer available" : ngn(p.price) + (p.priceSuffix ? " " + esc(p.priceSuffix) : "")) + '</span></span>' +
        '<span class="stx-cgo">\u203A</span></button>' +
        (!sold && !own ? '<button class="stx-cchat" type="button">Chat</button>' : "");
      chip.querySelector(".stx-cgo-btn").addEventListener("click", function (e) {
        e.stopPropagation(); e.preventDefault();
        if (sold) { if (window.NM_toast) { NM_toast("This item has been sold"); } return; }
        var pid = row.product_id;
        if (window._nmViewerTimer) { clearTimeout(window._nmViewerTimer); window._nmViewerTimer = null; }
        if (window.NM_toast) { NM_toast("Opening item\u2026"); }
        if (window.NM_statusClose) { NM_statusClose(); }
        var openIt = function () { if (window.NM_openDetail) { NM_openDetail(pid); } };
        openIt(); setTimeout(openIt, 400);
      }, true);
      var cb = chip.querySelector(".stx-cchat");
      if (cb) {
        cb.addEventListener("click", function (e) {
          e.stopPropagation();
          cb.disabled = true; cb.textContent = "Opening\u2026";
          D.openConversation(row.product_id).then(function (cid) {
            if (window.NM_statusClose) { NM_statusClose(); }
            if (window.NM_openThread) { NM_openThread(cid); }
          }).catch(function (err) {
            cb.disabled = false; cb.textContent = "Chat";
            toast((err && err.message) || "Could not open chat.");
          });
        });
      }
      var host = stv.parentNode || stv;   /* #status-root: sits above the viewer's tap zones */
      host.appendChild(chip);
    });
  }
  function tryInjectChip() {
    var root = $("#status-root"); if (!root) { return; }
    var stv = $(".stv", root); if (!stv) { return; }
    if (!$("#stv-md", stv)) { return; }              /* viewer only, not the composer preview */
    if (document.querySelector("#status-root .stx-chip")) { return; }
    if (!_viewRows || !_viewRows.length) { return; }
    var idx = stv.querySelectorAll(".stv-seg.done").length;
    var flat = [];
    _viewRows.forEach(function (r) { (r.media_urls || []).forEach(function () { flat.push(r); }); });
    var row = flat[idx];
    if (row && row.product_id) { injectChip(stv, row); }
  }
  function wrapViewer() {
    if (!window.NM_statusViewer || window.NM_statusViewer._stx) { return; }
    var orig = window.NM_statusViewer;
    var wrapped = function (userId, rows) { _viewRows = rows || []; return orig.apply(null, arguments); };
    wrapped._stx = true;
    window.NM_statusViewer = wrapped;
  }
  function armViewerObserver() {
    var root = $("#status-root");
    if (!root || root._stxObs) { return; }
    root._stxObs = true;
    new MutationObserver(function () { tryInjectChip(); }).observe(root, { childList: true });
  }
  /* The viewer's invisible prev/next tap zones can swallow taps meant for
     the product chip. Capture-phase delegation by coordinates makes the
     chip (and its Chat button) reliably tappable. */
  var _chipNavBusy = false;
  document.addEventListener("click", function (ev) {
    if (_chipNavBusy) { return; }
    var root = $("#status-root"); if (!root || !root.classList.contains("on")) { return; }
    var chip = root.querySelector(".stx-chip"); if (!chip) { return; }
    var x = ev.clientX, y = ev.clientY; if (!x && !y) { return; }
    var r = chip.getBoundingClientRect(); if (!r.width) { return; }
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) { return; }
    ev.stopPropagation(); ev.preventDefault();
    _chipNavBusy = true; setTimeout(function () { _chipNavBusy = false; }, 600);
    var cb = chip.querySelector(".stx-cchat");
    if (cb) {
      var cr = cb.getBoundingClientRect();
      if (x >= cr.left && x <= cr.right && y >= cr.top && y <= cr.bottom) { cb.click(); return; }
    }
    var gb = chip.querySelector(".stx-cgo-btn"); (gb || chip).click();
  }, true);

  /* ---------------- Discover data --------------------------------------- */
  function discoverRows() {
    var D = DB(); if (!D || !D.client) { return Promise.resolve([]); }
    return D.client.from("statuses").select(D._statusCols || "id,user_id,kind,media_urls,caption,captions,created_at,expires_at,product_id,visibility")
      .eq("visibility", "public").gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(100)
      .then(function (res) { return res.error ? [] : (res.data || []); }, function () { return []; });
  }
  function groupByUser(rows) {
    var by = {};
    rows.forEach(function (r) { (by[r.user_id] = by[r.user_id] || []).push(r); });
    Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); }); });
    return by;
  }
  function railButtons(uids, byUser, profiles) {
    return uids.map(function (uid) {
      var p = profiles[uid] || {};
      var rows = byUser[uid] || [];
      var tagged = rows.some(function (r) { return r.product_id; });
      return '<button class="upd-it" data-stx-view="' + esc(uid) + '"><span class="upd-c unseen"><span class="upd-in">' + avaHtml(p) + '</span></span>' +
        '<span class="upd-nm">' + esc(p.display_name || "Seller") + (tagged ? ' <span class="stx-tagdot" title="Has tagged items">\uD83C\uDFF7</span>' : "") + '</span></button>';
    }).join("");
  }
  function wireRail(scope, byUser) {
    scope.querySelectorAll("[data-stx-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        var uid = b.getAttribute("data-stx-view");
        var rows = byUser[uid] || [];
        if (rows.length && window.NM_statusViewer) { NM_statusViewer(uid, rows); }
      });
    });
  }
  function profilesFor(uids) {
    var D = DB(), out = {};
    return Promise.all(uids.map(function (uid) {
      return D.getProfileById(uid).then(function (p) { if (p) { out[uid] = p; } }).catch(function () {});
    })).then(function () { return out; });
  }

  /* ---------------- Updates: Discover rail ------------------------------ */
  function renderDiscover() {
    var grid = $("#upd-grid"); if (!grid) { return; }
    var my = me(), D = DB();
    var old = $("#stx-discover"); if (old) { old.remove(); }
    if (!my || !D) { return; }
    Promise.all([D.followingProfiles(), discoverRows()]).then(function (res) {
      var profs = res[0] || [], rows = res[1] || [];
      var fol = {}; profs.forEach(function (p) { fol[p.id] = 1; });
      var byUser = groupByUser(rows.filter(function (r) { return String(r.user_id) !== String(my) && !fol[r.user_id]; }));
      var uids = Object.keys(byUser).slice(0, 20);
      if (!uids.length) { return; }
      return profilesFor(uids).then(function (profiles) {
        if (!$("#upd-grid")) { return; }
        var old2 = $("#stx-discover"); if (old2) { old2.remove(); }
        var sec = document.createElement("div");
        sec.className = "stx-disc"; sec.id = "stx-discover";
        sec.innerHTML = '<div class="stx-disc-hd"><h3>Discover</h3><p>Public statuses from sellers across the marketplace. Tap one to view \u2014 tag \uD83C\uDFF7 means an item is attached.</p></div>' +
          '<div class="stx-rail">' + railButtons(uids, byUser, profiles) + '</div>';
        grid.parentNode.insertBefore(sec, grid);
        wireRail(sec, byUser);
      });
    }).catch(function () {});
  }
  function wrapUpdates() {
    if (!window.NM_updatesOpen || window.NM_updatesOpen._stx) { return; }
    var orig = window.NM_updatesOpen;
    var wrapped = function () {
      var r = orig.apply(null, arguments);
      setTimeout(renderDiscover, 500);
      setTimeout(renderHomeRow, 500);
      return r;
    };
    wrapped._stx = true;
    window.NM_updatesOpen = wrapped;
  }

  /* ---------------- Home status row -------------------------------------- */
  var _homeBusy = false, _homeAt = 0;
  function renderHomeRow() {
    var home = $("#screen-home"); if (!home) { return; }
    var anchor = $("#home-sec-head", home); if (!anchor) { return; }
    var my = me(), D = DB();
    if (!my || !D) { var o = $("#stx-homerow"); if (o) { o.remove(); } return; }
    if (_homeBusy || Date.now() - _homeAt < 12000) { return; }
    _homeBusy = true;
    Promise.all([D.followingProfiles(), discoverRows()]).then(function (res) {
      var profs = res[0] || [], dRows = res[1] || [];
      var folIds = profs.map(function (p) { return p.id; });
      return D.listStatuses(folIds.concat([my])).then(function (rows) {
        _homeAt = Date.now();
        var byUser = groupByUser(rows);
        var fol = {}; folIds.forEach(function (id) { fol[id] = 1; });
        var dBy = groupByUser(dRows.filter(function (r) { return String(r.user_id) !== String(my) && !fol[r.user_id]; }));
        Object.keys(dBy).forEach(function (k) { byUser[k] = dBy[k]; });
        var profMap = {}; profs.forEach(function (p) { profMap[p.id] = p; });
        var folUids = folIds.filter(function (id) { return (byUser[id] || []).length; });
        var dUids = Object.keys(dBy).slice(0, Math.max(0, 12 - folUids.length));
        var needProfiles = dUids.filter(function (u) { return !profMap[u]; });
        return profilesFor(needProfiles).then(function (extra) {
          Object.keys(extra).forEach(function (k) { profMap[k] = extra[k]; });
          var old = $("#stx-homerow"); if (old) { old.remove(); }
          if (!$("#screen-home")) { return; }
          var myRows = byUser[my] || [];
          var wrap = document.createElement("div");
          wrap.className = "stx-homerow"; wrap.id = "stx-homerow";
          var html = '<span class="upd-mine-wrap"><button class="upd-it" id="stx-home-mine"><span class="upd-c' + (myRows.length ? " unseen" : "") + '"><span class="upd-in" id="stx-home-mine-av"></span></span><span class="upd-nm">My status</span></button>' +
            '<button class="upd-plus" id="stx-home-plus" aria-label="Add to your status">+</button></span>';
          html += railButtons(folUids.concat(dUids), byUser, profMap);
          html += '<button class="upd-it" id="stx-home-all"><span class="upd-c"><span class="upd-in"><span>\u203A</span></span></span><span class="upd-nm">See all</span></button>';
          wrap.innerHTML = '<div class="stx-rail">' + html + '</div>';
          anchor.parentNode.insertBefore(wrap, anchor);
          if (D.getProfileById) { D.getProfileById(my).then(function (p) { var el = $("#stx-home-mine-av"); if (el && p) { el.innerHTML = avaHtml(p); } }).catch(function () {}); }
          var mineBtn = $("#stx-home-mine");
          if (mineBtn) { mineBtn.addEventListener("click", function () { myRows.length ? NM_statusViewer(my, myRows) : NM_statusComposer(); }); }
          var plus = $("#stx-home-plus");
          if (plus) { plus.addEventListener("click", function () { NM_statusComposer(); }); }
          var all = $("#stx-home-all");
          if (all) { all.addEventListener("click", function () { var b = document.querySelector('[data-go="updates"]'); if (b) { b.click(); } }); }
          wireRail(wrap, byUser);
        });
      });
    }).catch(function () {}).then(function () { _homeBusy = false; });
  }
  function armHomeObserver() {
    var home = $("#screen-home");
    if (!home || home._stxObs) { return; }
    home._stxObs = true;
    new MutationObserver(function () {
      if (home.classList.contains("active")) { renderHomeRow(); }
    }).observe(home, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------------- init -------------------------------------------------- */
  function init() {
    var ok = wrapPost();
    wrapComposer(); wrapViewer(); wrapUpdates();
    armViewerObserver(); armHomeObserver();
    if ($("#screen-home") && $("#screen-home").classList.contains("active")) { renderHomeRow(); }
    return ok;
  }
  var tries = 0;
  var iv = setInterval(function () { if (init() || ++tries > 40) { clearInterval(iv); } }, 500);
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", function () { init(); }); } else { init(); }
})();
