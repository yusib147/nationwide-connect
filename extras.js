/* Nationwide Media Connect — extras.js
   Overflow module home (updates.js reached the deploy size ceiling).
   Seller store screen rebuilt to Ibrahim's reference layout (2026-10-16):
   hero with Following/Block pills, stats card (Listings / Positive feedback /
   Days on platform), a Chat / View profile / Report action row, a Newest
   sort control, and rich listing rows (photo, PROMOTED/FEATURED badge,
   favourite heart, orange price, title, location + time + distance meta,
   seller-tier pill). Every button is wired and working. */
(function () {
  "use strict";
  var I = window.NM_int || {};
  function $(s, r) { return (r || document).querySelector(s); }
  var esc = I.esc || function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var me = I.me || function () { return null; };
  var rel = I.rel || function (t) { return ""; };
  var toast = I.toast || function () {};
  var fmtKm = I.fmtKm || function () { return ""; };

  /* ---------------- Styles ---------------- */
  (function () {
    var css = `
.store2{padding:18px 16px 30px}
.store2-hero{display:flex;gap:14px;align-items:flex-start}
.store2-hero .seller-ava{width:78px;height:78px;border-radius:50%;font-size:30px;border:3px solid var(--acc);flex:none;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--chrome2);color:var(--ink);font-weight:800}
.store2-hero .seller-ava img{width:100%;height:100%;object-fit:cover}
.store2-id{flex:1;min-width:0;padding-top:2px}
.store2-id .store-name{font-size:20px}
.store2-tier{font-size:13px;color:var(--muted);font-weight:600;margin-top:3px}
.store2-actions{display:flex;flex-direction:column;gap:9px;width:118px;flex:none}
.store2-actions .follow-btn{background:var(--acc-grad);color:#fff;border:0;border-radius:999px;padding:11px 8px;font-weight:800;font-size:14px;width:100%;cursor:pointer;font-family:inherit}
.store2-actions .block-btn{background:transparent;border:1.5px solid rgba(232,56,13,.55);color:var(--acc2);border-radius:999px;padding:10px 8px;font-weight:700;font-size:14px;width:100%;cursor:pointer;font-family:inherit}
.store2-actions .block-btn.on{background:var(--acc-grad);color:#fff;border-color:transparent}
.store2-bio{margin-top:14px;background:var(--chrome);border:1px solid var(--line-soft);border-radius:18px;padding:14px 16px}
.store2-bio h4{margin:0 0 6px;font-size:14.5px}
.store2-bio p{margin:0;font-size:13.5px;line-height:1.55;color:var(--muted);white-space:pre-line}
.prof-bio{margin-top:14px}
.prof-bio h4{margin:0 0 6px;font-size:14.5px}
.prof-bio p{margin:0;font-size:13.5px;line-height:1.55;opacity:.85;white-space:pre-line}
.store2-stats{display:flex;background:var(--chrome);border:1px solid var(--line-soft);border-radius:18px;padding:16px 6px;margin-top:18px}
.store2-stat{flex:1;text-align:center;min-width:0}
.store2-stat+.store2-stat{border-left:1px solid var(--line-soft)}
.store2-stat b{display:block;font-size:19px;color:var(--ink)}
.store2-stat span{font-size:12px;color:var(--muted)}
.store2-acts{display:flex;gap:10px;margin-top:14px}
.store2-act{flex:1;background:var(--chrome);border:1px solid var(--line-soft);color:var(--ink);border-radius:14px;padding:13px 4px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit}
.store2-act:disabled{opacity:.6}
.store2-head{display:flex;align-items:center;justify-content:space-between;margin:22px 0 12px;position:relative}
.store2-head h3{margin:0;font-size:19px;color:var(--ink)}
.store2-sort{background:var(--chrome);border:1px solid var(--line-soft);color:var(--ink);border-radius:999px;padding:8px 14px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit}
.store2-sortmenu{position:absolute;right:0;top:46px;z-index:6;background:var(--chrome);border:1px solid var(--line-soft);border-radius:14px;box-shadow:var(--shadow);padding:6px;min-width:180px}
.store2-sortmenu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--ink);padding:11px 12px;font-weight:600;font-size:14px;border-radius:9px;cursor:pointer;font-family:inherit}
.store2-sortmenu button.on{color:var(--acc2)}
.store2-grid{display:flex;flex-direction:column;gap:12px}
.store-row{display:flex;gap:12px;background:var(--chrome);border:1px solid var(--line-soft);border-radius:18px;padding:10px;cursor:pointer;align-items:center}
.store-row-ph{position:relative;width:96px;height:96px;flex:none;border-radius:12px;overflow:hidden;background:var(--chrome2)}
.store-row-ph img{width:100%;height:100%;object-fit:cover;display:block}
.store-fav{position:absolute;top:6px;right:6px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(0,0,0,.38);color:#fff;font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2}
.store-fav.on{color:#ff5a1f;background:rgba(0,0,0,.55)}
.store-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.store-tier{align-self:flex-start;background:var(--chrome2);color:var(--muted);border-radius:999px;padding:4px 10px;font-size:11.5px;font-weight:700;margin-top:4px}
#nm-prof-root,#nm-srep-root{position:fixed;inset:0;z-index:2100;display:none;background:rgba(10,6,3,.55)}
#nm-prof-root.on,#nm-srep-root.on{display:block}
.sheet2{position:absolute;left:0;right:0;bottom:0;border-radius:22px 22px 0 0;padding:16px 18px calc(18px + env(safe-area-inset-bottom));max-height:88dvh;overflow-y:auto;box-sizing:border-box}
html[data-theme="light"] .sheet2{background:#fff8ee;color:#241a10}
html[data-theme="dark"] .sheet2{background:#1d130a;color:#f5ead8}
.sheet2-hd{display:flex;align-items:center;gap:10px}
.sheet2-hd h3{margin:0;font-size:18px}
.sheet2-x{background:none;border:0;color:inherit;font-size:26px;line-height:1;padding:6px 8px;cursor:pointer}
.prof-ava{width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--chrome2);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;border:3px solid var(--acc);flex:none}
.prof-ava img{width:100%;height:100%;object-fit:cover}
.prof-rows{margin-top:14px;display:flex;flex-direction:column}
.prof-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--line-soft);font-size:14px}
.prof-row span{opacity:.65}
.prof-row b{text-align:right}
.srep-opts{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.srep-opt{text-align:left;background:transparent;border:1.5px solid rgba(232,56,13,.35);color:inherit;border-radius:12px;padding:12px 14px;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit}
.srep-opt.on{background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;border-color:transparent}
.srep-note{width:100%;box-sizing:border-box;margin-top:12px;border-radius:12px;border:1.5px solid rgba(232,56,13,.35);background:transparent;color:inherit;padding:12px 14px;font-size:14.5px;font-family:inherit}
.srep-send{width:100%;margin-top:14px;background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;border:0;border-radius:12px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit}
.srep-send:disabled{opacity:.6}
.srep-ok{text-align:center;padding:18px 0 8px}
.srep-ok .big{font-size:34px}
.srep-ok p{line-height:1.55;opacity:.85}
`;
    var st = document.createElement("style");
    st.id = "nm-store-ui";
    st.textContent = css;
    document.head.appendChild(st);
  })();

  /* ---------------- Helpers ---------------- */
  function cap(s) { s = String(s || ""); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function storeDays(created) {
    if (!created) { return null; }
    var d = Math.floor((Date.now() - new Date(created).getTime()) / 864e5);
    return d < 0 ? 0 : d;
  }
  /* Same ratings source the app itself uses for its Rating stat
     (localStorage "ratings": {sellerId: {total, count}} on a 5-star scale). */
  function feedbackPct(sellerId) {
    try {
      var raw = localStorage.getItem("ratings");
      var map = raw ? JSON.parse(raw) : null;
      var t = map && map[sellerId];
      if (t && t.count) { return Math.round((t.total / t.count) / 5 * 100) + "%"; }
    } catch (e) {}
    return "New";
  }
  var SORT_LABEL = { new: "Newest", lo: "Price ↑", hi: "Price ↓" };
  var _ctx = null; /* {sellerId, prof, rows, sort, tierLabel, name} */

  function sortedRows() {
    if (!_ctx) { return []; }
    var r = _ctx.rows.slice();
    if (_ctx.sort === "lo") { r.sort(function (a, b) { return (a.price || 0) - (b.price || 0); }); }
    else if (_ctx.sort === "hi") { r.sort(function (a, b) { return (b.price || 0) - (a.price || 0); }); }
    else { r.sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); }
    return r;
  }

  function storeRow(p) {
    var img = p.images && p.images[0] ? p.images[0] : "";
    var badge = p.featured ? '<span class="upd-badge feat">FEATURED</span>' : (p.bumpAt ? '<span class="upd-badge">PROMOTED</span>' : "");
    var meta = [];
    if (p.location) { meta.push("📍 " + p.location); }
    meta.push(rel(new Date(p.at || Date.now()).toISOString()));
    if (p.distKm != null) { meta.push(fmtKm(p.distKm) + " away"); }
    return '<div class="store-row" data-srow="' + esc(p.id) + '">' +
      '<div class="store-row-ph">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : "") + badge +
      '<button class="store-fav" data-fav="' + esc(p.id) + '" aria-label="Save listing">♥</button></div>' +
      '<div class="store-row-main"><span class="upd-row-price">₦' + Number(p.price || 0).toLocaleString("en-NG") + esc(p.priceSuffix || "") + "</span>" +
      '<span class="upd-row-title">' + esc(p.title || "Listing") + "</span>" +
      '<span class="upd-row-meta">' + esc(meta.join(" · ")) + "</span>" +
      (_ctx.tierLabel ? '<span class="store-tier">✓ ' + esc(_ctx.tierLabel) + " seller</span>" : "") + "</div>" +
      '<span class="upd-row-chev">›</span></div>';
  }

  function paintStoreFavs() {
    var DB = window.NM_DB, my = me();
    if (!DB || !DB.client || !my) { return; }
    DB.client.from("favorites").select("product_id").eq("user_id", my)
      .then(function (r) {
        var ids = {};
        (r && r.data || []).forEach(function (f) { ids[String(f.product_id)] = 1; });
        document.querySelectorAll("#store2-grid [data-fav]").forEach(function (b) {
          b.classList.toggle("on", !!ids[b.getAttribute("data-fav")]);
        });
      }).catch(function () {});
  }

  function paintStoreGrid() {
    var g = $("#store2-grid"); if (!g || !_ctx) { return; }
    var rows = sortedRows();
    g.innerHTML = rows.length ? rows.map(storeRow).join("") : '<div class="empty"><h3>No active listings</h3><p>This seller has nothing listed right now.</p></div>';
    paintStoreFavs();
  }

  /* ---------------- View profile sheet ---------------- */
  function profileSheet() {
    if (!_ctx) { return; }
    var DB = window.NM_DB, pr = _ctx.prof || {}, sellerId = _ctx.sellerId;
    var root = document.getElementById("nm-prof-root");
    if (!root) { root = document.createElement("div"); root.id = "nm-prof-root"; document.body.appendChild(root); }
    var days = storeDays(pr.created_at);
    var since = pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";
    var newest = sortedRows()[0];
    root.innerHTML = '<div class="sheet2">' +
      '<div class="sheet2-hd"><button class="sheet2-x" id="prof-x" aria-label="Close">×</button><h3>Seller profile</h3></div>' +
      '<div style="display:flex;gap:13px;align-items:center;margin-top:10px">' +
      '<div class="prof-ava">' + (pr.avatar_url ? '<img src="' + esc(pr.avatar_url) + '" alt="">' : esc(String(_ctx.name || "S").trim().charAt(0).toUpperCase())) + "</div>" +
      "<div><div style=\"font-size:18px;font-weight:800\">" + esc(_ctx.name) + "</div>" +
      (_ctx.tierLabel ? '<div style="font-size:13px;opacity:.7;font-weight:600">✓ ' + esc(_ctx.tierLabel) + " verified</div>" : "") +
      '<div class="store-pres" id="prof-pres" hidden></div></div></div>' +
      '<div class="prof-rows">' +
      '<div class="prof-row"><span>Member since</span><b>' + esc(since) + "</b></div>" +
      '<div class="prof-row"><span>Days on platform</span><b>' + (days == null ? "—" : days) + "</b></div>" +
      '<div class="prof-row"><span>Listings</span><b>' + _ctx.rows.length + "</b></div>" +
      '<div class="prof-row"><span>Followers</span><b id="prof-fol">…</b></div>' +
      '<div class="prof-row"><span>Response</span><b id="prof-resp">…</b></div>' +
      (newest && newest.location ? '<div class="prof-row"><span>Sells from</span><b>' + esc(newest.location) + "</b></div>" : "") +
      "</div>" +
      (pr && pr.bio ? '<div class="prof-bio"><h4>About</h4><p>' + esc(pr.bio) + "</p></div>" : "") +
      "</div>";
    root.classList.add("on");
    root.onclick = function (e) { if (e.target === root) { root.classList.remove("on"); } };
    $("#prof-x").addEventListener("click", function () { root.classList.remove("on"); });
    if (DB) {
      if (DB.followerCount) { DB.followerCount(sellerId).then(function (n) { var el = $("#prof-fol"); if (el) { el.textContent = String(n); } }).catch(function () {}); }
      if (DB.presenceBadge) { try { DB.presenceBadge(sellerId, "prof-pres"); } catch (e) {} }
      if (DB.sellerMessageStats && DB.replySpeedLabel) {
        DB.sellerMessageStats(sellerId).then(function (st) { var el = $("#prof-resp"); if (el) { el.textContent = DB.replySpeedLabel(st) || "New seller"; } })
          .catch(function () { var el = $("#prof-resp"); if (el) { el.textContent = "New seller"; } });
      } else { var el2 = $("#prof-resp"); if (el2) { el2.textContent = "New seller"; } }
    }
  }

  /* ---------------- Report seller sheet ---------------- */
  var SREP_REASONS = ["Spam", "Scam or Fraud", "Abusive behaviour", "Fake listing", "Wrong category", "Inappropriate content", "Other"];
  function reportSheet() {
    if (!_ctx) { return; }
    var DB = window.NM_DB, sellerId = _ctx.sellerId;
    if (!me()) { toast("Log in to report."); return; }
    var root = document.getElementById("nm-srep-root");
    if (!root) { root = document.createElement("div"); root.id = "nm-srep-root"; document.body.appendChild(root); }
    var picked = "";
    root.innerHTML = '<div class="sheet2">' +
      '<div class="sheet2-hd"><button class="sheet2-x" id="srep-x" aria-label="Close">×</button><h3>Report ' + esc(_ctx.name) + "</h3></div>" +
      '<div id="srep-body"><div class="srep-opts">' +
      SREP_REASONS.map(function (r) { return '<button class="srep-opt" data-r="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") +
      '</div><textarea class="srep-note" id="srep-note" rows="2" maxlength="500" placeholder="Anything else we should know? (optional)"></textarea>' +
      '<button class="srep-send" id="srep-send" disabled>Send report</button></div></div>';
    root.classList.add("on");
    root.onclick = function (e) { if (e.target === root) { root.classList.remove("on"); } };
    $("#srep-x").addEventListener("click", function () { root.classList.remove("on"); });
    root.querySelectorAll("[data-r]").forEach(function (b) {
      b.addEventListener("click", function () {
        picked = b.getAttribute("data-r");
        root.querySelectorAll("[data-r]").forEach(function (x) { x.classList.toggle("on", x === b); });
        $("#srep-send").disabled = false;
      });
    });
    $("#srep-send").addEventListener("click", function () {
      if (!picked || !DB || !DB.client) { return; }
      var btn = $("#srep-send");
      btn.disabled = true; btn.textContent = "Sending…";
      var note = ($("#srep-note") || {}).value || "";
      var reason = "seller:" + sellerId + " | " + _ctx.name + " | " + picked + (note ? " | note:" + String(note).slice(0, 500) : "");
      DB.client.from("reports").insert({ reporter_id: me(), product_id: null, reason: reason })
        .then(function (res) {
          if (res && res.error) { throw res.error; }
          var body = $("#srep-body");
          if (body) {
            body.innerHTML = '<div class="srep-ok"><div class="big">✓</div><h3 style="margin:8px 0 4px">Report received</h3>' +
              "<p>Thank you. Our team will review this seller. You will get feedback in Notifications.</p>" +
              '<button class="srep-send" id="srep-done">Done</button></div>';
            $("#srep-done").addEventListener("click", function () { root.classList.remove("on"); });
          }
          toast("Report sent. Thank you.");
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = "Send report";
          toast("Could not send the report. Check your connection and try again.");
        });
    });
  }

  /* ---------------- The store screen ---------------- */
  window.NM_openStore = function (sellerId) {
    var DB = window.NM_DB; if (!DB || !sellerId) { return; }
    if (window.NM_show) { window.NM_show("seller"); }
    var body = $("#seller-body");
    if (body) { body.innerHTML = '<div class="chat-load" style="padding:34px 0"><div class="chat-load-dots"><span></span><span></span><span></span></div><div class="chat-load-txt">Opening store…</div></div>'; }
    DB.getProfileById(sellerId).then(function (pr) {
      return DB.listProducts({}).then(function (all) {
        return DB.blockedIds().then(function (bids) {
          var rows = (all || []).filter(function (p) { return String(p.sellerId) === String(sellerId) && bids.indexOf(String(p.sellerId)) < 0; });
          var nm = (pr && pr.display_name) || "Seller";
          var avaH = pr && pr.avatar_url
            ? '<div class="seller-ava"><img src="' + esc(pr.avatar_url) + '" alt=""></div>'
            : '<div class="seller-ava">' + esc(String(nm).trim().charAt(0).toUpperCase() || "S") + "</div>";
          var tier = pr && pr.verification_tier;
          var since = pr && pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "recently";
          var tick = tier ? ' <span class="vtick wa-fixed wa-' + esc(tier) + '">✓</span>' : "";
          var days = storeDays(pr && pr.created_at);
          _ctx = { sellerId: String(sellerId), prof: pr || {}, rows: rows, sort: "new", tierLabel: tier ? cap(tier) : "", name: nm };
          var mine = String(me() || "") === String(sellerId);
          var dist = rows.length && rows[0].distKm != null ? " · 📍 " + fmtKm(rows[0].distKm) + " from you" : "";
          if (!body) { return; }
          body.innerHTML = '<div class="store2">' +
            '<div class="store2-hero">' + avaH +
            '<div class="store2-id"><div class="store-name">' + esc(nm) + tick + "</div>" +
            '<div class="store-meta">Member since ' + esc(since) + dist + "</div>" +
            (tier ? '<div class="store2-tier">🛡 ' + esc(cap(tier)) + " verified</div>" : "") +
            '<div class="store-pres" id="seller-pres" hidden></div></div>' +
            (mine ? "" : '<div id="store-follow" class="store2-actions"></div>') +
            "</div>" +
            '<div class="store2-stats">' +
            '<div class="store2-stat"><b>' + rows.length + "</b><span>Listings</span></div>" +
            '<div class="store2-stat"><b>' + feedbackPct(sellerId) + "</b><span>Positive feedback</span></div>" +
            '<div class="store2-stat"><b>' + (days == null ? "—" : days) + "</b><span>Days on platform</span></div>" +
            "</div>" +
            (pr && pr.bio ? '<div class="store2-bio"><h4>About this seller</h4><p>' + esc(pr.bio) + "</p></div>" : "") +
            (mine ? "" : '<div class="store2-acts">' +
              '<button class="store2-act" id="store-chat">💬 Chat</button>' +
              '<button class="store2-act" id="store-profile">👤 View profile</button>' +
              '<button class="store2-act" id="store-report">🚩 Report</button></div>') +
            '<div class="store2-head"><h3>All listings</h3>' +
            '<button class="store2-sort" id="store-sort">Newest ⌄</button>' +
            '<div class="store2-sortmenu" id="store-sortmenu" hidden>' +
            '<button data-sort="new">Newest</button><button data-sort="lo">Price: low to high</button><button data-sort="hi">Price: high to low</button></div></div>' +
            '<div class="store2-grid" id="store2-grid"></div>' +
            "</div>";
          paintStoreGrid();
          if (DB.presenceBadge) { try { DB.presenceBadge(sellerId, "seller-pres"); } catch (e) {} }
          if (window.NM_followUI) { window.NM_followUI(sellerId); }

          var sortB = $("#store-sort"), menu = $("#store-sortmenu");
          if (sortB && menu) {
            var paintMenu = function () { menu.querySelectorAll("[data-sort]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-sort") === _ctx.sort); }); };
            paintMenu();
            sortB.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; });
            document.addEventListener("click", function () { if (!menu.hidden) { menu.hidden = true; } });
            menu.querySelectorAll("[data-sort]").forEach(function (b) {
              b.addEventListener("click", function () {
                _ctx.sort = b.getAttribute("data-sort");
                sortB.textContent = SORT_LABEL[_ctx.sort] + " ⌄";
                menu.hidden = true;
                paintMenu();
                paintStoreGrid();
              });
            });
          }
          var chatB = $("#store-chat");
          if (chatB) {
            chatB.addEventListener("click", function () {
              if (!me()) { toast("Log in to chat with sellers."); return; }
              var list = sortedRows();
              if (!list.length) { toast("This seller has no listings to chat about yet."); return; }
              DB.isBlocked(sellerId).then(function (blocked) {
                if (blocked) { toast("You blocked this seller. Unblock them to chat."); return; }
                chatB.disabled = true; chatB.textContent = "Opening chat…";
                DB.openConversation(list[0].id).then(function (cid) {
                  if (window.NM_openThread) { window.NM_openThread(cid); }
                  chatB.disabled = false; chatB.textContent = "💬 Chat";
                }).catch(function (e) {
                  chatB.disabled = false; chatB.textContent = "💬 Chat";
                  toast(e && e.message ? e.message : "Could not open the chat.");
                });
              }).catch(function () { toast("Could not open the chat."); });
            });
          }
          var profB = $("#store-profile");
          if (profB) { profB.addEventListener("click", profileSheet); }
          var repB = $("#store-report");
          if (repB) { repB.addEventListener("click", reportSheet); }
        });
      });
    }).catch(function () { toast("Could not open that store."); });
  };

  /* Row taps + favourite hearts (delegated, scoped to this grid only). */
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) { return; }
    var fav = e.target.closest("#store2-grid [data-fav]");
    if (fav) {
      e.preventDefault(); e.stopPropagation();
      var DB = window.NM_DB; if (!DB || !DB.toggleFavorite) { return; }
      DB.toggleFavorite(fav.getAttribute("data-fav"))
        .then(function () { fav.classList.toggle("on"); toast(fav.classList.contains("on") ? "Saved to your list." : "Removed from Saved."); })
        .catch(function () { toast("Could not update Saved."); });
      return;
    }
    var row = e.target.closest("#store2-grid .store-row");
    if (row && window.NM_openDetail) { window.NM_openDetail(row.getAttribute("data-srow")); }
  }, true);

  /* Item page: tapping the seller card opens this store (the reference
     layout), not the older seller screen. Buttons inside the card (Follow /
     Block bars) keep their own behaviour. */
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) { return; }
    var card = e.target.closest("#detail-seller");
    if (!card) { return; }
    if (e.target.closest("button, a, [data-fbar]")) { return; }
    var p = window.NM_detailProduct;
    if (p && p.sellerId) {
      e.preventDefault(); e.stopPropagation();
      window.NM_openStore(p.sellerId);
    }
  }, true);
})();

/* ================= Me page — Ibrahim's reference design (2026-10-16) =================
   Grouped cards, coloured icon chips, gradient hero, expandable Favorites group
   with a Saved searches subgroup. Light = tinted backdrop + white cards;
   Dark = OLED black + orange glow on the hero and the Favorites group. */
(function () {
  "use strict";
  var SVG = {
    shield: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l7 3v5c0 4.6-3 7.7-7 9.2C8 18.7 5 15.6 5 11V6l7-3z'/><path d='M9 11.5l2 2 4-4'/></svg>",
    person: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e8380d' stroke-width='2' stroke-linecap='round'><circle cx='12' cy='8' r='3.6'/><path d='M5 20c.8-3.4 3.6-5 7-5s6.2 1.6 7 5'/></svg>",
    heart: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>",
    search: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e8380d' stroke-width='2.2' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='M20 20l-3.5-3.5'/></svg>",
    grid: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'><path d='M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'/></svg>",
    tag: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'><path d='M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z'/></svg>"
  };
  var css = ""
  + "html[data-theme='light'] #screen-me{background:#edf0f6}"
  + "#me-body{padding-bottom:28px}"
  + "#me-body .me-top{background:transparent;padding:0;border-radius:0}"
  + "#me-body .me-top-main{margin:12px 14px 0;padding:16px;border-radius:22px;position:relative}"
  + "html[data-theme='light'] #me-body .me-top-main{background:linear-gradient(120deg,#ffe9c9,#ffd7a8);box-shadow:0 12px 28px rgba(232,90,20,.16)}"
  + "html[data-theme='dark'] #me-body .me-top-main{background:linear-gradient(120deg,#2b1509,#160c05);border:1px solid rgba(255,122,26,.45);box-shadow:0 0 24px rgba(232,56,13,.28),inset 0 0 32px rgba(232,56,13,.10)}"
  + "#me-body .me-avatar{box-shadow:0 0 0 2px #fff,0 0 0 4.5px #ff7a1a}"
  + "html[data-theme='light'] #me-body .me-name{color:#221607}"
  + "html[data-theme='light'] #me-body .me-contact,html[data-theme='light'] #me-body .me-detail{color:rgba(60,35,10,.62)}"
  + "#me-body .me-avatar-btn{border:0;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:5px}"
  + "html[data-theme='light'] #me-body .me-avatar-btn{background:rgba(255,255,255,.55);color:#b34700}"
  + "html[data-theme='dark'] #me-body .me-avatar-btn{background:rgba(255,255,255,.08);color:#ffb27a}"
  + ".mex-chev{margin-left:auto;font-size:27px;line-height:1;color:var(--muted);cursor:pointer;padding:8px 2px;flex:none}"
  + "html[data-theme='light'] .mex-chev{color:rgba(60,35,10,.45)}"
  + "#me-body .me-quickstats{margin:12px 14px 0;background:var(--chrome);border:1px solid var(--line-soft);border-radius:18px;padding:6px 0;gap:0;box-shadow:var(--shadow-card)}"
  + "#me-body .me-qstat{background:transparent;border:0;border-radius:0;padding:10px 8px}"
  + "#me-body .me-qstat + .me-qstat{border-left:1px solid var(--line-soft)}"
  + "#me-body .me-qstat b{color:var(--ink)}"
  + "#me-body .me-qstat span{color:var(--muted)}"
  + "#me-body .me-tiles{padding:12px 14px 2px;gap:10px}"
  + "#me-body .me-tile{border-radius:18px;padding:13px 14px;box-shadow:var(--shadow-card)}"
  + "#me-body .me-tile::after{content:'\\203A';margin-left:auto;color:var(--faint);font-size:21px;line-height:1}"
  + "#me-body .me-tile-ico{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:none}"
  + "#me-body .me-tile:nth-child(1) .me-tile-ico{background:var(--acc-grad);color:#fff}"
  + "#me-body .me-tile:nth-child(2) .me-tile-ico{background:rgba(59,130,246,.15);color:#3b82f6}"
  + "#me-body .me-tile:nth-child(3) .me-tile-ico{background:rgba(236,72,153,.14);color:#ec4899}"
  + "#me-body .me-tile:nth-child(4) .me-tile-ico{background:rgba(16,185,129,.14);color:#10b981}"
  + "#me-body .me-section{border-radius:20px;margin:12px 14px;box-shadow:var(--shadow-card)}"
  + "#me-body .me-sec-head{gap:11px;align-items:center}"
  + "#me-body .me-sec-head::before{content:'';width:38px;height:38px;border-radius:11px;flex:none;background-repeat:no-repeat;background-position:center;background-size:20px}"
  + "#me-sec-verify .me-sec-head::before{background-color:rgba(59,130,246,.13);background-image:url(\"" + SVG.shield + "\")}"
  + "#me-sec-profile .me-sec-head::before{background-color:rgba(232,56,13,.11);background-image:url(\"" + SVG.person + "\")}"
  + "#me-body details[open ] .me-sec-chev{transform:rotate(90deg)}"
  + "#me-body .me-sec-chev{transition:transform .2s}"
  + "#me-body .profile-form{display:flex;flex-direction:column;gap:13px}"
  + "#me-body .profile-form label{font-size:12px;color:var(--muted);font-weight:700;display:block}"
  + "#me-body .profile-form input{display:block;width:100%;background:transparent;border:0;border-bottom:1px solid var(--line-soft);border-radius:0;padding:7px 0 9px;font-size:14.5px;color:var(--ink);font-family:inherit;margin-top:2px}"
  + "#me-body .profile-form input:focus{outline:none;border-bottom-color:var(--brand)}"
  + "#me-body .theme-row{display:flex;align-items:center;gap:11px;padding-top:13px;font-weight:700;font-size:14px;color:var(--ink)}"
  + "#me-body .theme-row::before{content:'\\1F319';width:38px;height:38px;border-radius:11px;background:rgba(232,56,13,.12);display:inline-flex;align-items:center;justify-content:center;font-size:16px;flex:none}"
  + "#me-body .theme-row .switch{margin-left:auto}"
  + "#me-body .section-head{align-items:center;padding:16px 16px 8px;font-size:15px;font-weight:800;color:var(--ink)}"
  + "#me-body .section-head::before{content:'';width:38px;height:38px;border-radius:11px;flex:none;background-repeat:no-repeat;background-position:center;background-size:20px}"
  + "#me-sec-favs::before{background-color:rgba(236,72,153,.13);background-image:url(\"" + SVG.heart + "\")}"
  + "#me-sec-searches::before{background-color:rgba(232,56,13,.11);background-image:url(\"" + SVG.search + "\")}"
  + "#me-sec-offers::before{background-color:rgba(16,185,129,.13);background-image:url(\"" + SVG.tag + "\")}"
  + "#me-sec-listings::before{background-color:rgba(59,130,246,.13);background-image:url(\"" + SVG.grid + "\")}"
  + ".mex-favgroup{margin:14px;padding:14px;border-radius:22px;background:var(--chrome);border:1px solid var(--line-soft);box-shadow:var(--shadow-card)}"
  + "html[data-theme='light'] .mex-favgroup{border-color:#ffd9b0}"
  + "html[data-theme='dark'] .mex-favgroup{border-color:rgba(255,122,26,.5);box-shadow:0 0 22px rgba(232,56,13,.25);background:#0d0f14}"
  + ".mex-favgroup .section-head{padding:2px 2px 8px;cursor:pointer}"
  + ".mex-favgroup #me-favs{padding:2px 0 4px}"
  + ".mex-favgroup.mex-closed #me-favs,.mex-favgroup.mex-closed .mex-ssgroup{display:none}"
  + ".mex-ssgroup{margin-top:10px;border-radius:18px;padding:12px}"
  + "html[data-theme='light'] .mex-ssgroup{background:#f4f6fb;border:1px solid #e6eaf2}"
  + "html[data-theme='dark'] .mex-ssgroup{background:#12151d;border:1px solid #1e2431}"
  + ".mex-ssgroup.mex-closed #ss-list,.mex-ssgroup.mex-closed .mex-ssadd{display:none}"
  + ".mex-ssgroup #ss-list{margin:0;padding:0;background:transparent;border:0;box-shadow:none;border-radius:0}"
  + ".mex-ssgroup .ss-row{background:var(--chrome);border:1px solid var(--line-soft);border-radius:14px;padding:11px 12px;margin-top:8px}"
  + "html[data-theme='dark'] .mex-ssgroup .ss-row{background:#171b24}"
  + ".mex-ssgroup .ss-q{font-weight:700;font-size:13.5px}"
  + "#ss-list span.ss-new{background:var(--acc-grad);color:#fff;border-radius:999px;padding:1px 7px;font-size:10.5px;font-weight:800;margin-left:6px;display:inline-block}"
  + ".mex-ssadd{display:block;width:100%;margin-top:12px;background:var(--acc-grad);color:#fff;border:0;border-radius:14px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;text-align:center}"
  + ".mex-ssbadge{background:var(--acc-grad);color:#fff;font-size:11px;font-weight:800;border-radius:999px;padding:1px 8px}"
  + ".mex-caret{margin-left:auto;color:var(--muted);font-size:15px;transition:transform .2s;flex:none}"
  + ".mex-closed > .section-head .mex-caret{transform:rotate(180deg)}"
  + "#me-body .me-card{border-radius:20px;box-shadow:var(--shadow-card)}"
  + "#me-advertise{background:rgba(232,56,13,.10);color:var(--brand);border:1px solid rgba(232,56,13,.25);border-radius:12px;padding:12px}"
  + "#me-premium{background:var(--acc-grad);color:#fff;border:0;border-radius:12px;padding:12px}"
  + "#me-blocked-sec{margin:12px 14px;background:var(--chrome);border:1px solid var(--line-soft);border-radius:20px;padding:4px 14px;box-shadow:var(--shadow-card)}"
  + "#me-alerts .alert-row{margin:10px 14px 0;border-radius:16px}"
  /* the grouped-card language across the site */
  + "html[data-theme='light']{--bg:#edf0f6}"
  + ".settings-group{border-radius:20px}"
  + ".settings-btn{border-radius:14px}"
  + ".me-mini{width:44px;height:44px;font-size:17px}"
  + ".me-mini svg{width:22px;height:22px}"
  + "#me-body .me-avatar{width:86px;height:86px;font-size:34px}"
  + ".mex-hidden{display:none!important}"
  + "#mex-listings-wrap{margin:12px 14px 0}"
  + "#mex-listings-wrap #me-grid{padding:0}"
  + "#mex-listings-wrap #me-empty{margin:0}"
  + "#mex-listings-wrap.mex-closed{display:none}"
  + "#mex-acc .mex-favgroup{margin-top:12px}"
  + "#screen-home #home-avatar-btn{display:none}"
  + ".mex-mystats{display:flex;background:var(--chrome);border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-card);margin-bottom:10px}"
  + ".mex-mystat{flex:1;text-align:center;padding:11px 4px}"
  + ".mex-mystat + .mex-mystat{border-left:1px solid var(--line-soft)}"
  + ".mex-mystat b{display:block;font-size:16.5px;font-weight:800;color:var(--ink)}"
  + ".mex-mystat span{font-size:11px;color:var(--muted);font-weight:600}"
  + ".mex-storebtn{display:block;width:100%;margin:0 0 12px;background:var(--chrome);border:1px solid var(--line-soft);color:var(--ink);border-radius:14px;padding:12px;font-size:13.5px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:var(--shadow-card)}"
  + "#mex-listings-wrap #me-grid{display:flex;flex-direction:column;gap:10px}"
  + "#mex-listings-wrap #me-grid .card{display:flex;align-items:stretch;border:1px solid var(--line-soft)}"
  + "#mex-listings-wrap #me-grid .card-photo{width:96px;height:96px;flex:none}"
  + "#mex-listings-wrap #me-grid .card-photo img{width:100%;height:100%;object-fit:cover}"
  + "#mex-listings-wrap #me-grid .card-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}"
  + "#mex-listings-wrap #me-grid .card-fav{left:58px;right:auto;top:6px}"
  + "#mex-listings-wrap #me-grid > div:not(.card){width:100%;margin:0 0 2px!important}";
  var st = document.createElement("style");
  st.id = "nm-me-ui";
  st.textContent = css;
  document.head.appendChild(st);

  function decorate() {
    var body = document.getElementById("me-body");
    if (!body || body.querySelector(".mex-chev")) { return; }
    var main = body.querySelector(".me-top-main");
    if (!main) { return; }
    var ch = document.createElement("span");
    ch.className = "mex-chev";
    ch.textContent = "›";
    ch.setAttribute("aria-label", "Edit profile");
    ch.addEventListener("click", function () {
      var d = document.getElementById("me-sec-profile");
      if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    main.appendChild(ch);
    /* Member since — from the real profile row, only when present. */
    try {
      var contact = body.querySelector(".me-contact");
      var DB = window.NM_DB;
      if (contact && DB && DB.client) {
        DB.currentUser().then(function (u) {
          if (!u || !u.id) { return; }
          DB.client.from("profiles").select("created_at").eq("id", u.id).single().then(function (res) {
            var row = res && res.data;
            if (!row || !row.created_at || !contact.parentNode) { return; }
            if (body.querySelector(".mex-since")) { return; }
            var dt = new Date(row.created_at);
            var div = document.createElement("div");
            div.className = "me-detail mex-since";
            div.textContent = "Member since " + dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
            contact.parentNode.insertBefore(div, contact.nextSibling);
          }).catch(function () {});
        }).catch(function () {});
      }
    } catch (e) {}
    var prof = document.getElementById("me-sec-profile");
    if (prof) { prof.open = true; }
    var favHead = document.getElementById("me-sec-favs");
    var favs = document.getElementById("me-favs");
    var ssHead = document.getElementById("me-sec-searches");
    var ssList = document.getElementById("ss-list");
    if (favHead && favs && ssHead && ssList) {
      var grp = document.createElement("div");
      grp.className = "mex-favgroup";
      grp.id = "mex-favgroup";
      favHead.parentNode.insertBefore(grp, favHead);
      grp.appendChild(favHead);
      grp.appendChild(favs);
      var sub = document.createElement("div");
      sub.className = "mex-ssgroup";
      grp.appendChild(sub);
      sub.appendChild(ssHead);
      sub.appendChild(ssList);
      var add = document.getElementById("ss-add");
      if (add) {
        sub.appendChild(add);
        add.classList.add("mex-ssadd");
        add.textContent = "+ Save new search";
      }
      var fb = document.createElement("span");
      fb.className = "mex-caret";
      fb.textContent = "⌃";
      favHead.appendChild(fb);
      var sb = document.createElement("span");
      sb.className = "mex-ssbadge";
      ssHead.appendChild(sb);
      var sc = document.createElement("span");
      sc.className = "mex-caret";
      sc.textContent = "⌃";
      ssHead.appendChild(sc);
      var updBadge = function () {
        var n = ssList.querySelectorAll(".ss-row").length;
        sb.textContent = n;
        sb.style.display = n ? "" : "none";
      };
      updBadge();
      try { new MutationObserver(updBadge).observe(ssList, { childList: true, subtree: true }); } catch (e) {}
      favHead.addEventListener("click", function () { grp.classList.toggle("mex-closed"); });
      ssHead.addEventListener("click", function () { sub.classList.toggle("mex-closed"); });
    }
    /* The top tiles are the single entry point: the My listings and Favorites
       content panels sit directly under the tiles — no duplicated sections
       further down the page. */
    var tiles = body.querySelector(".me-tiles");
    var listHead = document.getElementById("me-sec-listings");
    var grid = document.getElementById("me-grid");
    var empty = document.getElementById("me-empty");
    var grpEl = document.getElementById("mex-favgroup");
    if (tiles && grpEl && tiles.parentNode) {
      var acc = document.createElement("div");
      acc.id = "mex-acc";
      tiles.parentNode.insertBefore(acc, tiles.nextSibling);
      var lw = document.createElement("div");
      lw.id = "mex-listings-wrap";
      if (grid) { lw.appendChild(grid); }
      if (empty) { lw.appendChild(empty); }
      try {
        var DB2 = window.NM_DB;
        var stats = document.createElement("div");
        stats.className = "mex-mystats";
        stats.innerHTML = '<div class="mex-mystat"><b data-ms="listings">\u2013</b><span>Listings</span></div><div class="mex-mystat"><b data-ms="followers">\u2013</b><span>Followers</span></div><div class="mex-mystat"><b data-ms="following">\u2013</b><span>Following</span></div>';
        lw.insertBefore(stats, lw.firstChild);
        var storeBtn = document.createElement("button");
        storeBtn.className = "mex-storebtn";
        storeBtn.textContent = "View my store \u203A";
        storeBtn.addEventListener("click", function () {
          if (!DB2 || !DB2.currentUser) { return; }
          DB2.currentUser().then(function (u) {
            if (u && u.id && window.NM_openStore) { window.NM_openStore(u.id); }
          }).catch(function () {});
        });
        lw.insertBefore(storeBtn, stats.nextSibling);
        if (DB2 && DB2.currentUser) {
          DB2.currentUser().then(function (u) {
            if (!u || !u.id) { return; }
            var set = function (k, v) {
              var el = stats.querySelector('[data-ms="' + k + '"]');
              if (el) { el.textContent = v; }
            };
            if (DB2.listMyProducts) { DB2.listMyProducts().then(function (rows) { set("listings", rows.length); }).catch(function () {}); }
            if (DB2.followerCount) { DB2.followerCount(u.id).then(function (n) { set("followers", n); }).catch(function () {}); }
            if (DB2.followingIds) { DB2.followingIds().then(function (ids) { set("following", ids.length); }).catch(function () {}); }
          }).catch(function () {});
        }
      } catch (e) {}
      acc.appendChild(lw);
      acc.appendChild(grpEl);
      if (listHead) { listHead.classList.add("mex-hidden"); }
      var tileBtns = tiles.querySelectorAll(".me-tile");
      if (tileBtns[1]) {
        tileBtns[1].addEventListener("click", function () {
          var closed = lw.classList.toggle("mex-closed");
          if (!closed) { setTimeout(function () { lw.scrollIntoView({ behavior: "smooth", block: "start" }); }, 30); }
        });
      }
      if (tileBtns[2]) {
        tileBtns[2].addEventListener("click", function () {
          grpEl.classList.remove("mex-closed");
          setTimeout(function () { grpEl.scrollIntoView({ behavior: "smooth", block: "start" }); }, 30);
        });
      }
      var qstat = body.querySelector('.me-qstat[data-scroll="me-sec-listings"]');
      if (qstat) {
        qstat.addEventListener("click", function () {
          lw.classList.remove("mex-closed");
          setTimeout(function () { lw.scrollIntoView({ behavior: "smooth", block: "start" }); }, 30);
        });
      }
      if (tileBtns[3]) {
        tileBtns[3].addEventListener("click", function () {
          grpEl.classList.remove("mex-closed");
          var sub2 = grpEl.querySelector(".mex-ssgroup");
          if (sub2) {
            sub2.classList.remove("mex-closed");
            setTimeout(function () { sub2.scrollIntoView({ behavior: "smooth", block: "center" }); }, 30);
          }
        });
      }
    }
  }
  function boot() {
    var body = document.getElementById("me-body");
    if (!body) { setTimeout(boot, 700); return; }
    try {
      new MutationObserver(function () { setTimeout(decorate, 40); }).observe(body, { childList: true });
    } catch (e) {}
    decorate();
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); } else { boot(); }
})();


/* ===== Me favorites carousel: side-scroll + arrows + dots (2026-10-16) ===== */
(function () {
  "use strict";
  if (document.getElementById("nm-fav-car")) { return; }
  var st = document.createElement("style");
  st.id = "nm-fav-car";
  st.textContent =
    "#me-favs{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px 2px 4px}"
    + "#me-favs::-webkit-scrollbar{display:none}"
    + "#me-favs>.card{flex:0 0 calc((100% - 16px)/3);scroll-snap-align:start}"
    + "#me-favs .card-photo{height:auto;aspect-ratio:4/3}"
    + "#me-favs .card-fav{width:26px;height:26px}"
    + "#me-favs .card-fav svg{width:13px;height:13px}"
    + "@media (min-width:560px){#me-favs>.card{flex-basis:180px}}"
    + ".mex-favctl{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 2px}"
    + ".mex-favctl .upd-navb{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--chrome);color:var(--ink);font-size:18px;font-weight:800;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;flex:none}"
    + ".mex-favctl .upd-navb.next{border-color:rgba(232,56,13,.55);color:var(--acc)}"
    + ".mex-favctl .upd-navb.off{opacity:.35}"
    + ".mex-favdots{display:flex;gap:6px;align-items:center}"
    + ".mex-favdot{width:7px;height:7px;border-radius:99px;background:var(--faint)}"
    + ".mex-favdot.on{background:var(--acc)}";
  document.head.appendChild(st);
  function build() {
    var strip = document.getElementById("me-favs");
    if (!strip || !strip.parentNode) { return; }
    var cards = strip.querySelectorAll(".card");
    var fc = document.getElementById("me-favcount");
    if (fc && cards.length && fc.textContent !== String(cards.length)) { fc.textContent = String(cards.length); }
    var ctl = strip.parentNode.querySelector(":scope > .mex-favctl");
    if (!cards.length) { if (ctl) { ctl.remove(); } return; }
    if (!ctl) {
      ctl = document.createElement("div");
      ctl.className = "mex-favctl";
      ctl.innerHTML = '<button class="upd-navb prev" aria-label="Previous favorites">‹</button><span class="mex-favdots"></span><button class="upd-navb next" aria-label="Next favorites">›</button>';
      strip.parentNode.insertBefore(ctl, strip.nextSibling);
      ctl.querySelector(".prev").addEventListener("click", function () { strip.scrollBy({ left: -step(), behavior: "smooth" }); });
      ctl.querySelector(".next").addEventListener("click", function () { strip.scrollBy({ left: step(), behavior: "smooth" }); });
      strip.addEventListener("scroll", function () { window.requestAnimationFrame(paint); }, { passive: true });
    }
    function step() { var c = strip.querySelector(".card"); return c ? c.getBoundingClientRect().width + 8 : 120; }
    function paint() {
      var pos = Math.max(1, cards.length - 2);
      var dotsEl = ctl.querySelector(".mex-favdots");
      if (dotsEl.childElementCount !== pos) {
        dotsEl.innerHTML = "";
        for (var i = 0; i < pos; i++) { var d = document.createElement("span"); d.className = "mex-favdot"; dotsEl.appendChild(d); }
      }
      var idx = Math.round(strip.scrollLeft / step());
      if (idx < 0) { idx = 0; }
      if (idx > pos - 1) { idx = pos - 1; }
      dotsEl.querySelectorAll(".mex-favdot").forEach(function (d, j) { d.classList.toggle("on", j === idx); });
      ctl.querySelector(".prev").classList.toggle("off", strip.scrollLeft <= 4);
      ctl.querySelector(".next").classList.toggle("off", strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 4);
      ctl.style.display = (strip.scrollWidth - strip.clientWidth > 4) ? "" : "none";
    }
    paint();
  }
  new MutationObserver(build).observe(document.body, { childList: true, subtree: true });
  build();
})();

/* ===== Updates followed-sellers menu: exact reference layout (2026-10-16) ===== */
(function () {
  "use strict";
  if (document.getElementById("nm-upd-ref")) { return; }
  var st = document.createElement("style");
  st.id = "nm-upd-ref";
  st.textContent =
    "#screen-updates #upd-listings{padding:0 16px 22px}"
    + "#screen-updates #upd-grid{display:block;padding:0;margin:0}"
    + "#screen-updates #upd-grid>.upd-sec{margin:0 0 16px;padding:0 0 16px;background:transparent;border-bottom:1px solid var(--line-soft);font-size:14px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--ink)}"
    + "#screen-updates #upd-grid>.upd-sec:last-child{margin-bottom:0;padding-bottom:0;border-bottom:0}"
    + "html[data-theme=\"dark\"] #screen-updates{background:#050b14}"
    + "html[data-theme=\"dark\"] #screen-updates .topbar{background:#050b14;border-bottom-color:#1c2a3d;box-shadow:none}"
    + "html[data-theme=\"dark\"] #screen-updates #upd-grid>.upd-sec{border-bottom-color:#223149}"
    + "#screen-updates .upd-sec-hd{gap:12px;padding:2px 0 10px;text-transform:none}"
    + "#screen-updates .upd-sec-av{width:44px;height:44px;font-size:18px}"
    + "#screen-updates .upd-sec-nm{font-size:16px;font-weight:800;letter-spacing:-.1px;text-transform:none}"
    + "#screen-updates .upd-sec-sub{font-size:12.5px;letter-spacing:0;text-transform:none}"
    + "#screen-updates .upd-sec-go{font-size:13.5px;font-weight:800}"
    + "#screen-updates .upd-rows{gap:10px;padding:0}"
    + "#screen-updates .upd-row{flex-basis:calc((100% - 20px)/3);border-radius:14px;background:#ffffff;border-color:#d9e2ec;box-shadow:none}"
    + "html[data-theme=\"dark\"] #screen-updates .upd-row{background:#101927;border-color:#2a3a4e;box-shadow:none}"
    + "#screen-updates .upd-row-img{aspect-ratio:1.37}"
    + "#screen-updates .upd-row-main{padding:9px 10px 11px}"
    + "#screen-updates .upd-row-price{font-size:14.5px;letter-spacing:-.1px}"
    + "#screen-updates .upd-row-title{font-size:12.5px;line-height:1.35;min-height:34px}"
    + "#screen-updates .upd-row-meta{font-size:11px;margin-top:5px}"
    + "html[data-theme=\"dark\"] #screen-updates .upd-row-meta{color:#8fa1b3}"
    + "#screen-updates .upd-row-badge{display:none}"
    + "#screen-updates .upd-ctl{margin-top:12px;padding:0}"
    + "#screen-updates .upd-navb{width:40px;height:40px;border-color:#cbd5e1;font-size:20px;box-shadow:none}"
    + "html[data-theme=\"dark\"] #screen-updates .upd-navb{border-color:#334155;background:#0d141f;color:#e6eef6}"
    + "#screen-updates .upd-navb.next{border:1.5px solid rgba(232,56,13,.75);color:var(--acc)}"
    + "#screen-updates .upd-dots{gap:7px}"
    + "#screen-updates .upd-dot{background:#b6c2cf}"
    + "html[data-theme=\"dark\"] #screen-updates .upd-dot{background:#3b4a5f}"
    + "#screen-updates .upd-dot.on{background:var(--acc)}"
    + "@media (min-width:560px){#screen-updates .upd-row{flex-basis:180px}}";
  document.head.appendChild(st);
})();

/* ===== Seller bio: edit in Me (max 350 words), shown on the seller page (2026-10-16) ===== */
(function () {
  "use strict";
  var MAXW = 350;
  function words(v) { var t = String(v || "").trim(); return t ? t.split(/\s+/).length : 0; }
  function toast(m) { if (window.NM_int && window.NM_int.toast) { window.NM_int.toast(m); } }
  var st = document.createElement("style");
  st.id = "nm-bio-ui";
  st.textContent =
    ".mex-bio{margin:2px 0 12px}"
    + ".mex-bio-hd{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:700;color:var(--muted);margin-bottom:2px}"
    + ".mex-bio-ct{font-size:11.5px;font-weight:600}"
    + ".mex-bio-ct.over{color:#e5484d;font-weight:800}"
    + "#mex-bio-ta{width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--ink);font:inherit;font-size:14.5px;line-height:1.5;padding:8px 2px;resize:vertical;outline:none}"
    + "#mex-bio-ta:focus{border-bottom-color:var(--acc)}";
  document.head.appendChild(st);
  function paint(ta, ct) { var n = words(ta.value); ct.textContent = n + " / " + MAXW + " words"; ct.classList.toggle("over", n > MAXW); }
  function enhance() {
    var form = document.getElementById("profile-form");
    if (!form || document.getElementById("mex-bio-ta")) { return; }
    var save = document.getElementById("pf-save");
    if (!save) { return; }
    var DB = window.NM_DB;
    if (!DB || !DB.client || !DB.currentUser) { return; }
    var wrap = document.createElement("div");
    wrap.className = "mex-bio";
    wrap.innerHTML = '<div class="mex-bio-hd"><span>Bio</span><span class="mex-bio-ct">0 / ' + MAXW + ' words</span></div>' +
      '<textarea id="mex-bio-ta" rows="4" placeholder="Tell buyers about yourself and what you sell. This shows on your seller page."></textarea>';
    form.insertBefore(wrap, save);
    var ta = wrap.querySelector("textarea"), ct = wrap.querySelector(".mex-bio-ct");
    ta.addEventListener("input", function () { paint(ta, ct); });
    DB.currentUser().then(function (u) {
      if (!u || !u.id) { return; }
      DB.client.from("profiles").select("bio").eq("id", u.id).maybeSingle().then(function (res) {
        if (res && res.data && document.getElementById("mex-bio-ta") === ta) { ta.value = res.data.bio || ""; paint(ta, ct); }
      }).catch(function () {});
      save.addEventListener("click", function () {
        if (words(ta.value) > MAXW) { toast("Your bio is over " + MAXW + " words. Shorten it and save again."); return; }
        DB.client.from("profiles").update({ bio: ta.value }).eq("id", u.id).then(function (res) {
          if (res && res.error) { toast("Could not save your bio. Check your connection."); }
        }).catch(function () { toast("Could not save your bio. Check your connection."); });
      });
    }).catch(function () {});
  }
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();

/* ===== Install-the-app prompt + service worker (2026-10-16, hardened) ===== */
(function () {
  "use strict";
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("/sw.js").catch(function () {}); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var standalone = false;
  try { standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch (e) {}
  if (standalone) { lsSet("nm_inst_done", "1"); return; }
  if (lsGet("nm_inst_done")) { return; }
  if (Number(lsGet("nm_inst_hide_until") || 0) > Date.now()) { return; }
  var deferred = null, installed = false;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", function () { installed = true; lsSet("nm_inst_done", "1"); hide(); });
  /* Android Chrome can report this same site's web app when it is already
     installed (via the manifest's related_applications). If it is on the
     device, the prompt never shows again. */
  if (navigator.getInstalledRelatedApps) {
    try {
      navigator.getInstalledRelatedApps().then(function (apps) {
        if (apps && apps.length) { installed = true; lsSet("nm_inst_done", "1"); hide(); }
      }).catch(function () {});
    } catch (e) {}
  }
  var st = document.createElement("style");
  st.id = "nm-inst-ui";
  st.textContent =
    "#nm-inst{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:1500;display:flex;gap:12px;align-items:center;background:var(--chrome);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:12px 14px;box-shadow:0 18px 44px rgba(0,0,0,.35);transform:translateY(160%);transition:transform .45s cubic-bezier(.2,.9,.25,1);max-width:520px;margin:0 auto}"
    + "#nm-inst.on{transform:none}"
    + "#nm-inst img{width:46px;height:46px;border-radius:12px;flex:none}"
    + "#nm-inst .t1{font-weight:800;font-size:14.5px}"
    + "#nm-inst .t2{font-size:12px;color:var(--muted);margin-top:1px;line-height:1.4}"
    + "#nm-inst-go{margin-left:auto;flex:none;background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;border:0;border-radius:999px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}"
    + "#nm-inst-x{flex:none;background:none;border:0;color:var(--muted);font-size:20px;line-height:1;padding:4px;cursor:pointer}"
    + "#nm-ios{position:fixed;inset:0;z-index:2200;display:none;background:rgba(8,5,2,.55)}"
    + "#nm-ios.on{display:block}"
    + "#nm-ios .sh{position:absolute;left:0;right:0;bottom:0;background:var(--chrome);color:var(--ink);border-radius:22px 22px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom));text-align:center;max-width:520px;margin:0 auto}"
    + "#nm-ios img{width:64px;height:64px;border-radius:16px}"
    + "#nm-ios h3{margin:10px 0 4px;font-size:17px}"
    + "#nm-ios p{margin:6px 0;font-size:13.5px;color:var(--muted);line-height:1.6}"
    + "#nm-ios b{color:var(--ink)}"
    + "#nm-ios-x{position:absolute;top:8px;right:12px;background:none;border:0;color:var(--muted);font-size:26px;line-height:1;padding:8px;cursor:pointer}"
    + "#nm-ios-ok{margin-top:12px;width:100%;background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;border:0;border-radius:14px;padding:13px;font-weight:800;font-size:14.5px;cursor:pointer;font-family:inherit}";
  document.head.appendChild(st);
  var el = null, hideTimer = null;
  function snooze(days) { lsSet("nm_inst_hide_until", String(Date.now() + days * 864e5)); }
  function hide() {
    if (!el) { return; }
    var e2 = el; el = null;
    e2.classList.remove("on");
    setTimeout(function () { if (e2.parentNode) { e2.parentNode.removeChild(e2); } }, 480);
  }
  function sheet(title, bodyHtml) {
    var r = document.getElementById("nm-ios");
    if (!r) { r = document.createElement("div"); r.id = "nm-ios"; document.body.appendChild(r); }
    r.innerHTML = '<div class="sh"><button id="nm-ios-x" aria-label="Close">×</button><img src="assets/apple-touch-icon.png" alt=""><h3>' + title + "</h3>" + bodyHtml + '<button id="nm-ios-ok">Got it</button></div>';
    r.classList.add("on");
    r.onclick = function (e) { if (e.target === r) { r.classList.remove("on"); } };
    document.getElementById("nm-ios-x").addEventListener("click", function () { r.classList.remove("on"); });
    document.getElementById("nm-ios-ok").addEventListener("click", function () { r.classList.remove("on"); snooze(30); });
  }
  function menuSheet() {
    sheet("Install Nationwide Media Connect", "<p>Open the <b>⋮ menu</b> in your browser, then tap <b>Install app</b> or <b>Add to Home screen</b>. The app icon will be the Nationwide Media Connect logo.</p>");
  }
  function onInstallTap() {
    clearTimeout(hideTimer);
    var d = deferred; deferred = null;
    hide(); /* the banner always leaves the screen first, whatever Chrome does next */
    if (!d) {
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        sheet("Install Nationwide Media Connect", "<p>On iPhone, Apple asks you to finish from the Share menu. It takes a few seconds, and the app icon will be the Nationwide Media Connect logo.</p><p>1. Tap the <b>Share</b> icon in Safari.<br>2. Tap <b>Add to Home Screen</b>.<br>3. Tap <b>Add</b>.</p>");
      } else { menuSheet(); }
      return;
    }
    var settled = false, race = null;
    function fallback() { if (!settled) { settled = true; menuSheet(); } }
    try {
      d.prompt();
      race = setTimeout(fallback, 3000);
      d.userChoice.then(function (c) {
        settled = true; clearTimeout(race);
        if (c && c.outcome === "accepted") { lsSet("nm_inst_done", "1"); }
        else { snooze(7); }
      }).catch(function () { clearTimeout(race); fallback(); });
    } catch (e) { fallback(); }
  }
  function show() {
    if (installed || lsGet("nm_inst_done")) { return; }
    var sr = document.getElementById("status-root");
    if ((sr && sr.classList.contains("on")) || el) { return; }
    el = document.createElement("div");
    el.id = "nm-inst";
    el.innerHTML = '<img src="assets/apple-touch-icon.png" alt=""><div><div class="t1">Install our app</div><div class="t2">Add Nationwide Media Connect to your home screen for quick access.</div></div><button id="nm-inst-go">Install now</button><button id="nm-inst-x" aria-label="Dismiss">×</button>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (el) { el.classList.add("on"); } }); });
    hideTimer = setTimeout(hide, 5000);
    document.getElementById("nm-inst-x").addEventListener("click", function () { clearTimeout(hideTimer); snooze(30); hide(); });
    document.getElementById("nm-inst-go").addEventListener("click", onInstallTap);
  }
  setTimeout(show, 1200);
})();

/* ---------- visible prev/next arrows on status preview + viewer tap zones (nm-tap-arrows) ---------- */
(function () {
  var st = document.createElement("style"); st.id = "nm-tap-arrows";
  st.textContent = ".stv-tap{display:flex!important;align-items:center;justify-content:center;font-size:36px;line-height:1;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.8);background:transparent;border:0;padding:0;cursor:pointer;opacity:.85}";
  document.head.appendChild(st);
})();

/* ---------- Notifications: new products matching your most-searched things (nm-notif-search) ----------
   Tracks what each user searches on this phone (counts per term in localStorage),
   derives the top repeated searches, and surfaces recent products matching them
   inside the Notifications screen, with the bell badge raised to include them.
   Followed-seller listing alerts already come from updates.js collectNotifs();
   products already listed there are not duplicated here. */
(function () {
  "use strict";
  var DB = window.NM_DB; if (!DB) { return; }
  var SKEY = "nm_search_stats";
  function stats() { try { return JSON.parse(localStorage.getItem(SKEY) || "{}"); } catch (e) { return {}; } }
  function record(term) {
    term = (term || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (term.length < 3) { return; }
    var now = Date.now();
    if (record._t === term && now - record._at < 3000) { return; }
    record._t = term; record._at = now;
    try {
      var o = stats(); var e = o[term] || { c: 0, t: 0 }; e.c += 1; e.t = now; o[term] = e;
      localStorage.setItem(SKEY, JSON.stringify(o));
    } catch (err) {}
    cache = null;
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target && ev.target.id === "home-search") { record(ev.target.value); }
  }, true);
  document.addEventListener("search", function (ev) {
    if (ev.target && ev.target.id === "home-search") { record(ev.target.value); }
  }, true);
  function topTerms() {
    var o = stats();
    return Object.keys(o).filter(function (k) { return o[k].c >= 2; })
      .sort(function (a, b) { return (o[b].c - o[a].c) || (o[b].t - o[a].t); }).slice(0, 3);
  }
  function matchesTerm(p, term) {
    var title = (p.title || "").toLowerCase();
    return term.split(" ").filter(function (w) { return w.length >= 3; })
      .some(function (w) { return title.indexOf(w) >= 0; });
  }
  var cache = null, cacheAt = 0;
  function searchItems() {
    if (cache && Date.now() - cacheAt < 60000) { return Promise.resolve(cache); }
    var terms = topTerms();
    if (!terms.length) { cache = []; cacheAt = Date.now(); return Promise.resolve(cache); }
    return DB.listProducts({}).then(function (prods) {
      var INT = window.NM_int || {};
      var meId = INT.me ? INT.me() : null;
      var since = Date.now() - 14 * 864e5;
      var taken = {};
      (window._nmNotifItems || []).forEach(function (n) { if (n.go && n.go.product) { taken[String(n.go.product)] = 1; } });
      var out = [];
      (prods || []).forEach(function (p) {
        if (taken[String(p.id)]) { return; }
        if (meId && String(p.sellerId) === String(meId)) { return; }
        if (!p.at || p.at < since) { return; }
        for (var i = 0; i < terms.length; i++) {
          if (matchesTerm(p, terms[i])) { out.push({ product: p, term: terms[i] }); break; }
        }
      });
      out.sort(function (a, b) { return (b.product.at || 0) - (a.product.at || 0); });
      cache = out.slice(0, 6); cacheAt = Date.now();
      return cache;
    }).catch(function () { return []; });
  }
  function seenAt() { try { return Number(localStorage.getItem("nm_notif_seen") || 0); } catch (e) { return 0; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inject() {
    var body = document.getElementById("notifs-body");
    if (!body || body.querySelector("[data-nsx]") || body.querySelector(".nt-loading")) { return; }
    searchItems().then(function (items) {
      if (!items.length) { return; }
      if (!document.body.contains(body) || body.querySelector("[data-nsx]")) { return; }
      var INT = window.NM_int || {};
      var seen = seenAt();
      var empty = body.querySelector(".nt-empty");
      if (empty) { empty.style.display = "none"; }
      var html = '<div data-nsx="1" style="margin:14px 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)">Matching your searches</div>';
      items.forEach(function (x) {
        var p = x.product;
        var fresh = (p.at || 0) > seen;
        html += '<button class="nt-row' + (fresh ? " fresh" : "") + '" data-nsx-pid="' + esc(p.id) + '">' +
          '<span class="nt-ic nt-ic-list">▣</span><span class="nt-tx"><b>New match for your search “' + esc(x.term) + '”</b>' +
          '<span>' + esc(p.title || "Item") + (p.price ? ' — ₦' + Number(p.price).toLocaleString("en-NG") : "") + '</span>' +
          '<em>' + esc(INT.rel ? INT.rel(new Date(p.at || Date.now()).toISOString()) : "") + '</em></span>' +
          (fresh ? '<i class="nt-dot"></i>' : "") + '</button>';
      });
      body.insertAdjacentHTML("beforeend", html);
      body.querySelectorAll("[data-nsx-pid]").forEach(function (b) {
        b.addEventListener("click", function () { if (window.NM_openDetail) { window.NM_openDetail(b.getAttribute("data-nsx-pid")); } });
      });
    }).catch(function () {});
  }
  try {
    var nb = document.getElementById("notifs-body");
    if (nb && window.MutationObserver) {
      new MutationObserver(function () { inject(); }).observe(nb, { childList: true });
    }
  } catch (e) {}
  /* Bell badge: raise it to include unseen search matches. Track the count
     updates.js itself set (writes flagged so our own writes are not mistaken
     for a new base), then write only when the combined total differs. */
  var baseCount = 0, writing = false;
  try {
    var badge = document.getElementById("notif-badge");
    if (badge && window.MutationObserver) {
      new MutationObserver(function () {
        if (writing) { return; }
        baseCount = badge.hidden ? 0 : (parseInt(badge.textContent, 10) || 0);
      }).observe(badge, { childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
    }
  } catch (e) {}
  function adjustBadge() {
    var badge = document.getElementById("notif-badge"); if (!badge) { return; }
    searchItems().then(function (items) {
      var extra = items.filter(function (x) { return (x.product.at || 0) > seenAt(); }).length;
      var total = baseCount + extra;
      var cur = badge.hidden ? 0 : (parseInt(badge.textContent, 10) || 0);
      if (total > 0 && cur !== total) {
        writing = true;
        badge.hidden = false;
        badge.textContent = total > 99 ? "99+" : String(total);
        setTimeout(function () { writing = false; }, 0);
      }
    }).catch(function () {});
  }
  if (typeof window.NM_notifBadge === "function") {
    var orig = window.NM_notifBadge;
    window.NM_notifBadge = function () {
      var r = orig.apply(this, arguments);
      setTimeout(adjustBadge, 900);
      return r;
    };
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { setTimeout(adjustBadge, 900); } });
})();

/* ---------- Instant favourite-heart sync (nm-fav-sync) ----------
   app.js used to re-render the whole home feed (skeleton flash) on every
   favourite tap just to redraw the heart. NM_favSync flips every matching
   heart button in place instead: filled heart + .on when saved. */
window.NM_favSync = function (id, on) {
  try {
    document.querySelectorAll('[data-fav="' + id + '"]').forEach(function (b) {
      b.classList.toggle("on", !!on);
      b.innerHTML = on ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    });
  } catch (err) {}
};

/* ---------- Payment-return affirmation (nm-pay-affirm) ----------
   After Paystack sends the buyer back to /?pay=return the app used to land
   silently, even though the payment had succeeded. Verify the reference with
   the server and affirm the exact benefit that was bought. */
(function () {
  "use strict";
  var DB = window.NM_DB; if (!DB || !DB.verifyPayment) { return; }
  var qs; try { qs = new URLSearchParams(window.location.search); } catch (e) { return; }
  if (qs.get("pay") !== "return") { return; }
  var ref = qs.get("reference") || qs.get("trxref");
  try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
  var INT = window.NM_int || {};
  function say(msg) {
    var tries = 0;
    (function attempt() {
      if (INT.toast) { INT.toast(msg); return; }
      if (++tries < 10) { setTimeout(attempt, 600); }
    })();
  }
  if (!ref) { return; }
  var tries = 0;
  (function verify() {
    DB.verifyPayment(ref).then(function (r) {
      if (r && r.ok && (r.status === "success" || r.status === "fulfilled" || r.status === "paid")) {
        var plan = r.plan || r.purpose || "";
        if (plan.indexOf("premium") >= 0) { say("Payment confirmed. Your Premium is now active."); }
        else if (plan.indexOf("bump") >= 0) { say("Payment confirmed. Your listing has been promoted to the top."); }
        else if (plan.indexOf("featured") >= 0) { say("Payment confirmed. Your listing is now Featured."); }
        else if (plan.indexOf("banner") >= 0) { say("Payment confirmed. Your banner request has been received."); }
        else { say("Payment confirmed. Thank you."); }
        if (window.NM_notifBadge) { try { window.NM_notifBadge(true); } catch (e) {} }
      } else if (r && r.ok) {
        if (++tries < 3) { setTimeout(verify, 2500); }
        else { say("Payment received. We are confirming it now, your benefit will appear shortly."); }
      }
    }).catch(function () { if (++tries < 3) { setTimeout(verify, 2500); } });
  })();
})();

/* ===== nm-desktop: standard PC layout (sidebar + wide content) and tablet tier ===== */
;(function () {
  "use strict";
  try {
    if (document.getElementById("nm-desktop-css")) return;
    var css = ""
      + ".nm-desk-brand{display:none}"
      + "@media (min-width:768px) and (max-width:1023.98px){"
      + "#app{max-width:880px}"
      + "#bottomnav{max-width:880px}"
      + ".grid{grid-template-columns:repeat(3,1fr)}"
      + "#detail-body{max-width:780px;margin:0 auto}"
      + ".sell-form{max-width:700px;margin:0 auto;width:100%}"
      + "}"
      + "@media (min-width:1024px){"
      + "#app{max-width:none;margin:0;padding-left:238px}"
      + ".screen{max-width:1240px;margin:0 auto;padding-bottom:44px}"
      + "#screen-inbox{max-width:920px}"
      + "#screen-notifs{max-width:840px}"
      + "#screen-settings{max-width:840px}"
      + "#screen-me{max-width:940px}"
      + "#screen-seller{max-width:1100px}"
      + "#screen-thread{max-width:1060px;margin-left:auto;margin-right:auto}"
      + "#thread-msgs .msg{max-width:640px}"
      + "#bottomnav{left:0;top:0;bottom:0;transform:none;width:238px;max-width:238px;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:4px;padding:18px 14px 16px;border-top:0;border-right:1px solid var(--line-soft)}"
      + ".nm-desk-brand{display:flex;align-items:center;gap:11px;padding:2px 8px 18px}"
      + ".nm-desk-brand img{width:42px;height:42px;border-radius:12px;flex:none;display:block}"
      + ".nm-desk-brand .nm-db-t{font-size:15px;font-weight:800;line-height:1.2;color:var(--ink);letter-spacing:-.2px}"
      + ".nm-desk-brand .nm-db-s{font-size:11px;font-weight:600;color:var(--faint);margin-top:1px}"
      + "#bottomnav .nav-btn{flex:none;flex-direction:row;align-items:center;gap:13px;padding:12px 14px;font-size:14.5px;font-weight:700;border-radius:14px;text-align:left;width:100%}"
      + "#bottomnav .nav-btn.active{background:var(--acc-soft)}"
      + "#bottomnav .nav-badge{position:absolute;right:14px;top:50%;transform:translateY(-50%)}"
      + "#bottomnav .nav-sell{background:var(--acc-grad);color:#fff;margin-top:10px;justify-content:center}"
      + "#bottomnav .nav-sell .nav-sell-plus{position:static;width:auto;height:auto;margin:0;background:none;box-shadow:none;transform:none;font-size:19px;line-height:1}"
      + "#bottomnav .nav-sell.active{background:var(--acc-grad);color:#fff;box-shadow:0 6px 18px rgba(232,56,13,.35)}"
      + ".grid{grid-template-columns:repeat(auto-fill,minmax(218px,1fr));gap:18px;padding:0 22px}"
      + "#cat-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px;padding:16px 22px}"
      + "#cat-list .cat-row{border:1px solid var(--line-soft);border-radius:16px;padding:14px 16px}"
      + "#cat-subcats{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px;padding:16px 22px}"
      + "#cat-subcats .subcat-head{grid-column:1/-1}"
      + "#cat-subcats .subcat-row{border:1px solid var(--line-soft);border-radius:16px}"
      + "#detail-body{display:grid;grid-template-columns:minmax(0,1.04fr) minmax(0,.96fr);column-gap:34px;padding:10px 26px 0;align-items:start}"
      + "#detail-body .gal-wrap{grid-column:1;grid-row:1}"
      + "#detail-body>.detail-photo{grid-column:1;grid-row:1/span 3}"
      + "#detail-body .gal-thumbs,#detail-body .gal-dots{grid-column:1;grid-row:2;margin-top:10px}"
      + "#detail-body .gal-zoom-hint{grid-column:1;grid-row:3}"
      + "#detail-body .detail-body{grid-column:2;grid-row:1/span 3;padding:0}"
      + "#detail-body>*:not(.gal-wrap):not(.gal-thumbs):not(.gal-dots):not(.gal-zoom-hint):not(.detail-body):not(.detail-photo){grid-column:1/-1}"
      + "#upd-listings .upd-it{flex:0 0 212px;max-width:212px}"
      + "#screen-me .me-tiles{grid-template-columns:repeat(4,1fr)}"
      + ".sell-form{max-width:780px;margin:0 auto;width:100%}"
      + ".sheet-scrim{align-items:center;padding:24px}"
      + ".sheet{border-radius:22px;max-width:560px}"
      + ".modal{max-width:440px}"
      + ".finora-page{margin-top:4vh;border:1px solid var(--line-soft);border-radius:26px;box-shadow:0 24px 70px rgba(2,6,23,.12)}"
      + "#nm-inst{max-width:430px;left:auto;right:22px}"
      + "#nm-loadbar{left:238px}"
      + "#nm-loc-root .loc-sh{left:50%;right:auto;bottom:auto;top:50%;transform:translate(-50%,-50%);width:min(520px,94vw);border-radius:22px}"
      + "}";
    var st = document.createElement("style");
    st.id = "nm-desktop-css";
    st.textContent = css;
    document.head.appendChild(st);
    var nav = document.getElementById("bottomnav");
    if (nav && !nav.querySelector(".nm-desk-brand")) {
      var b = document.createElement("div");
      b.className = "nm-desk-brand";
      b.innerHTML = '<img src="assets/icon-512.png" alt=""><div><div class="nm-db-t">Nationwide</div><div class="nm-db-s">Media Connect</div></div>';
      nav.insertBefore(b, nav.firstChild);
    }
  } catch (e) {}
})();

/* ===== nm-loc2: location coverage fixes (Ibrahim 2026-10-16) =====
   1) Every listing gets an approximate position from the state on it, so
      distance + range work even when the seller never turned GPS on.
   2) When a range is active, discovery feeds sort nearest first.
   3) The location sheet gains a "pick your city" fallback (no GPS needed).
   GPS positions themselves are rounded to ~1 km in updates.js saveMyLoc. */
;(function () {
  "use strict";
  var RAW = "Lagos:6.5244,3.3792|Abuja:9.0579,7.4951|FCT:9.0579,7.4951|Rivers:4.8156,7.0498|Port Harcourt:4.8156,7.0498|Oyo:7.3775,3.947|Ibadan:7.3775,3.947|Kano:12.0022,8.5919|Enugu:6.4527,7.5106|Abia:5.532,7.486|Adamawa:9.2069,12.4589|Akwa Ibom:4.9057,7.9489|Anambra:6.2069,7.074|Bauchi:10.3158,9.8442|Bayelsa:4.9243,6.2642|Benue:7.7264,8.536|Borno:11.8311,13.151|Cross River:4.9757,8.3417|Delta:6.2059,6.6959|Ebonyi:6.3249,8.1137|Edo:6.335,5.6037|Ekiti:7.6216,5.2209|Gombe:10.2897,11.167|Imo:5.484,7.0355|Jigawa:11.7593,9.3393|Kaduna:10.5222,7.4383|Katsina:12.9908,7.6018|Kebbi:12.45,4.2|Kogi:7.7964,6.7405|Kwara:8.537,4.5444|Nasarawa:8.494,8.513|Niger:9.6139,6.5569|Ogun:7.1608,3.3483|Ondo:7.2508,5.2103|Osun:7.7667,4.5667|Plateau:9.9285,8.8921|Sokoto:13.0627,5.2432|Taraba:8.8938,11.3608|Yobe:11.747,11.9666|Zamfara:12.1222,6.2236";
  var TABLE = {};
  RAW.split("|").forEach(function (part) {
    var kv = part.split(":"), ll = (kv[1] || "").split(",");
    if (ll.length === 2) { TABLE[kv[0].toLowerCase()] = { lat: parseFloat(ll[0]), lng: parseFloat(ll[1]) }; }
  });
  var STATES = ["Lagos", "Abuja (FCT)", "Rivers", "Oyo", "Kano", "Enugu", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Gombe", "Imo", "Jigawa", "Kaduna", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Plateau", "Sokoto", "Taraba", "Yobe", "Zamfara"];
  function stateCoord(name) {
    if (!name) { return null; }
    var parts = String(name).split(",");
    for (var i = parts.length - 1; i >= 0; i--) {
      var k = parts[i].toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
      if (k === "fct") { k = "abuja"; }
      if (TABLE[k]) { return TABLE[k]; }
    }
    return null;
  }
  window.NM_stateCoord = stateCoord;

  /* Called by the updates.js listProducts wrapper after seller-GPS distances
     are attached: fill the gaps from each listing's state, then, when a range
     is active on a discovery screen, order nearest first. */
  window.NM_locFallback = function (rows, loc) {
    try {
      if (!rows || !rows.length || !loc || !window.NM_int) { return; }
      var hav = window.NM_int.havKm;
      rows.forEach(function (p) {
        if (p.distKm != null) { return; }
        var c = stateCoord(p.location);
        if (c) { var d = hav(loc, c); if (d != null) { p.distKm = d; p._dist = d; p._approxLoc = true; } }
      });
      var rk = 0;
      try { rk = Number(localStorage.getItem("nm_range_km") || 0) || 0; } catch (e) {}
      if (rk > 0) {
        var act = document.querySelector(".screen.active"), aid = act ? act.id : "";
        if (aid === "screen-home" || aid === "screen-category" || aid.indexOf("search") >= 0) {
          rows.sort(function (a, b) {
            var da = a.distKm == null ? 1e9 : a.distKm, db = b.distKm == null ? 1e9 : b.distKm;
            return da - db;
          });
        }
      }
    } catch (e) {}
  };

  /* City picker inside the location sheet (GPS-free fallback). */
  try {
    var st = document.createElement("style");
    st.id = "nm-loc2-css";
    st.textContent = ".nm-city-row{display:flex;gap:10px;margin-top:4px}.nm-city-sel{flex:1;min-width:0;padding:12px;border-radius:12px;border:1.5px solid rgba(232,56,13,.4);background:transparent;color:inherit;font-family:inherit;font-size:14px;font-weight:600}.nm-city-sel option{color:#241a10}";
    document.head.appendChild(st);
  } catch (e) {}
  function injectCityPicker() {
    var root = document.getElementById("nm-loc-root");
    if (!root || !root.classList.contains("on")) { return; }
    var sh = root.querySelector(".loc-sh");
    if (!sh || sh.querySelector("#nm-city-block")) { return; }
    var note = sh.querySelector(".loc-note");
    var block = document.createElement("div");
    block.id = "nm-city-block";
    if (window.NM_LGA && window.NM_LGA_STATES) {
      block.innerHTML = '<div class="loc-sub">Or pick your state and LGA</div>'
        + '<div class="nm-city-row"><select class="nm-city-sel" id="nm-pk-state" aria-label="Pick your state"><option value="">Select state</option>'
        + window.NM_LGA_STATES.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("")
        + '</select></div>'
        + '<div class="nm-city-row" style="margin-top:8px"><input class="nm-city-sel" id="nm-pk-q" type="search" placeholder="Search your LGA" aria-label="Search your LGA"></div>'
        + '<div class="nm-city-row" style="margin-top:8px"><select class="nm-city-sel" id="nm-pk-lga" aria-label="Pick your LGA" disabled><option value="">Select state first</option></select>'
        + '<button type="button" class="loc-btn ghost" id="nm-city-go">Use</button></div>'
        + '<p class="loc-note" style="margin-top:8px">No GPS needed. Your position is set from the centre of your LGA and saved approximately to your account.</p>';
    } else {
      block.innerHTML = '<div class="loc-sub">Or pick your city</div><div class="nm-city-row"><select class="nm-city-sel" id="nm-city-sel" aria-label="Pick your city">'
        + STATES.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("")
        + '</select><button type="button" class="loc-btn ghost" id="nm-city-go">Use city</button></div>'
        + '<p class="loc-note" style="margin-top:8px">No GPS needed. Distances are measured from the centre of the city you pick, and your approximate position is saved to your account.</p>';
    }
    if (note) { sh.insertBefore(block, note); } else { sh.appendChild(block); }
    var stSel = block.querySelector("#nm-pk-state"), lgSel = block.querySelector("#nm-pk-lga"), qSel = block.querySelector("#nm-pk-q");
    function fillLga() {
      var full = (window.NM_LGA && window.NM_LGA[stSel.value]) || [];
      var q = qSel ? qSel.value.trim().toLowerCase() : "";
      var list = q ? full.filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; }) : full;
      var cur = lgSel.value;
      lgSel.innerHTML = '<option value="">Select LGA</option>' + list.map(function (n) { return '<option value="' + n + '">' + n + "</option>"; }).join("");
      if (cur && list.indexOf(cur) >= 0) { lgSel.value = cur; }
      lgSel.disabled = !full.length;
    }
    if (stSel && lgSel) {
      stSel.addEventListener("change", fillLga);
      if (qSel) { qSel.addEventListener("input", fillLga); }
    }
    block.querySelector("#nm-city-go").addEventListener("click", function () {
      var c = null;
      if (stSel && lgSel) {
        if (!stSel.value || !lgSel.value) { if (window.NM_int) { window.NM_int.toast("Please choose your state and LGA first."); } return; }
        c = (window.NM_lgaCoord && window.NM_lgaCoord(stSel.value, lgSel.value)) || stateCoord(stSel.value);
      } else {
        var sel = block.querySelector("#nm-city-sel");
        c = stateCoord(sel ? sel.value : "");
      }
      if (!c) { return; }
      if (window.NM_saveMyLoc) { window.NM_saveMyLoc(c.lat, c.lng); }
      if (window.NM_int) { window.NM_int.toast("Location saved."); }
      if (window.NM_locSheet) { window.NM_locSheet(); }
    });
  }

  try {
    if (window.MutationObserver) {
      new MutationObserver(function () { injectCityPicker(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
  } catch (e) {}
})();
