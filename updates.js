/* Nationwide Media Connect — Follows + Status (Updates screen) UI layer. Depends on supabase/client.js (DB) and app.js. */
(function () {
  "use strict";
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (e) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[e]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); return; } catch (e) {} } alert(m); }
  function me() { try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; } }
  function rel(t) {
    if (window.NM_DB && window.NM_DB.relTime) { try { return window.NM_DB.relTime(t); } catch (e) {} }
    var m = Math.floor((Date.now() - new Date(t).getTime()) / 6e4);
    if (m < 1) { return "Just now"; } if (m < 60) { return m + "m ago"; }
    var h = Math.floor(m / 60); if (h < 24) { return h + "h ago"; }
    return Math.floor(h / 24) + "d ago";
  }
  function ava(p, cls) {
    var nm = (p && (p.display_name || p.name)) || "S";
    if (p && p.avatar_url) { return '<img src="' + esc(p.avatar_url) + '" alt="">'; }
    return '<span class="' + (cls || "") + '">' + esc(String(nm).trim().charAt(0).toUpperCase() || "S") + "</span>";
  }

  /* Orange chat palette: light = orange + milk, dark = orange + warm dark. */
  (function () {
    var TILE_L = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'%3E%3Cg fill='none' stroke='%23e8380d' stroke-opacity='.16' stroke-width='1.3'%3E%3Ccircle cx='26' cy='26' r='8'/%3E%3Ccircle cx='92' cy='70' r='11'/%3E%3Ccircle cx='48' cy='104' r='5'/%3E%3Cpath d='M104 18h12M110 12v12'/%3E%3Cpath d='M14 74h9M18.5 69.5v9'/%3E%3C/g%3E%3C/svg%3E\")";
    var TILE_D = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'%3E%3Cg fill='none' stroke='%23ff5a1f' stroke-opacity='.28' stroke-width='1.3'%3E%3Ccircle cx='26' cy='26' r='8'/%3E%3Ccircle cx='92' cy='70' r='11'/%3E%3Ccircle cx='48' cy='104' r='5'/%3E%3Cpath d='M104 18h12M110 12v12'/%3E%3Cpath d='M14 74h9M18.5 69.5v9'/%3E%3C/g%3E%3C/svg%3E\")";
    function pal(P, L, bg) {
      var r = [];
      if (bg) { r.push(P + "{background-color:" + (L ? "#fdf4e7" : "#17100a") + "!important;background-image:" + (L ? TILE_L : TILE_D) + "!important}"); }
      r.push(P + " .wa-header{background:" + (L ? "#fffaf1" : "#221910") + ";color:" + (L ? "#221709" : "#f7ecdc") + ";box-shadow:" + (L ? "0 1px 0 rgba(232,56,13,.16),0 2px 10px rgba(120,72,20,.07)" : "0 1px 0 rgba(255,90,31,.18),0 2px 10px rgba(0,0,0,.35)") + "}");
      r.push(P + " .wa-product-strip{background:" + (L ? "rgba(255,250,241,.96)" : "rgba(34,24,14,.96)") + ";color:" + (L ? "#241a10" : "#f5ead8") + ";border-bottom:1px solid " + (L ? "#f3e3c8" : "#3a2b17") + "}");
      r.push(P + " .wa-product-price{color:" + (L ? "#e8380d" : "#ff8a3d") + "}");
      r.push(P + " .msg.them," + P + " .msg.in{background:" + (L ? "#ffffff" : "#2b2013") + ";color:" + (L ? "#241a10" : "#f5ead8") + ";border:1px solid " + (L ? "#f1e2c8" : "#3a2b17") + "}");
      r.push(P + " .msg.them::before," + P + " .msg.in::before{border-top-color:" + (L ? "#ffffff" : "#2b2013") + ";border-right-color:" + (L ? "#ffffff" : "#2b2013") + "}");
      r.push(P + " .msg-day{background:" + (L ? "#ffe9c9" : "#2b2013") + ";color:" + (L ? "#96500f" : "#ffbe82") + "}");
      r.push(P + " .msg.sys{background:" + (L ? "#ffe9c9" : "#2b2013") + ";color:" + (L ? "#96500f" : "#ffbe82") + "}");
      r.push(P + " .quick-replies button{border-color:" + (L ? "#e8380d" : "#ff5a1f") + ";color:" + (L ? "#d63a0c" : "#ff8a3d") + ";background:" + (L ? "rgba(255,255,255,.65)" : "transparent") + "}");
      r.push(P + " .wa-inputbar #thread-input{background:" + (L ? "#ffffff" : "#2b2013") + ";color:" + (L ? "#241a10" : "#f5ead8") + ";border:1px solid " + (L ? "#eed9b8" : "#3d2c17") + "}");
      r.push(P + " .wa-inputbar #thread-input::placeholder{color:" + (L ? "#b09468" : "#a98f68") + "}");
      r.push(P + " .wa-attach," + P + " .wa-camera{color:" + (L ? "#c07a2e" : "#e0a458") + "}");
      return r.join("\n");
    }
    var T = "#screen-thread.wa-thread";
    var css = [
      'html[data-theme="light"]:has(#screen-thread.active){background:#fdf4e7}',
      'html[data-theme="dark"]:has(#screen-thread.active){background:#17100a}',
      'html:has(#screen-thread.active[data-chat-theme="wa-dark"]){background:#17100a}',
      'html:has(#screen-thread.active[data-chat-theme="wa-light"]){background:#fdf4e7}',
      'html:has(#screen-thread.active[data-chat-theme="sand"]){background:#f5e7cc}',
      "#screen-thread .wa-avatar-fallback{background:#e8380d}",
      "#screen-thread .msg.me,#screen-thread .msg.out{background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff}",
      "#screen-thread .msg.me::before,#screen-thread .msg.out::before{border-top-color:#e8380d;border-left-color:#e8380d}",
      "#screen-thread .wa-inputbar .wa-send{background:linear-gradient(135deg,#ff5a1f,#e8380d)}",
      pal('html[data-theme="light"] ' + T + ":not([data-chat-theme])", true, true),
      pal('html[data-theme="dark"] ' + T + ":not([data-chat-theme])", false, true),
      pal(T + '[data-chat-theme="wa-light"]', true, true),
      pal(T + '[data-chat-theme="sand"]', true, true),
      T + '[data-chat-theme="sand"]{background-color:#f5e7cc!important}',
      T + '[data-chat-theme="sand"] .wa-header{background:#faf0dc}',
      T + '[data-chat-theme="sand"] .wa-product-strip{background:rgba(250,240,220,.96)}',
      pal(T + '[data-chat-theme="wa-dark"]', false, true),
      pal(T + '[data-chat-theme="forest"]', false, false),
      pal(T + '[data-chat-theme="navy"]', false, false),
      pal(T + '[data-chat-theme="charcoal"]', false, false),
      pal(T + '[data-chat-theme="plum"]', false, false),
      pal(T + '[data-chat-theme="ember"]', false, false)
    ].join("\n") + "\n" + `#status-root .stc2{position:absolute;inset:0;display:flex;flex-direction:column;overflow-y:auto;padding:calc(10px + env(safe-area-inset-top)) 16px calc(14px + env(safe-area-inset-bottom))}
html[data-theme="light"] #status-root .stc2{background:#fff8ee;color:#241a10}
html[data-theme="dark"] #status-root .stc2{background:#171008;color:#f5ead8}
#status-root .stc2-hd{display:flex;align-items:center;gap:12px}
#status-root .stc2-x{background:none;border:0;color:inherit;font-size:27px;line-height:1;padding:6px 8px;cursor:pointer}
#status-root .stc2-hd h3{font-size:19px;margin:0;font-weight:700}
#status-root .stc2-sub{margin:16px 0 12px;font-size:15px;font-weight:600;opacity:.85}
#status-root .stc2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 12px;justify-items:center}
#status-root .stc2-cam{width:100%;max-width:112px;aspect-ratio:1;border:0;border-radius:18px;background:#241a10;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit}
#status-root .stc2-cam svg{stroke:#ff5a1f}
html[data-theme="dark"] #status-root .stc2-cam{background:#2b2013}
#status-root .stc2-cell{position:relative;width:100%;max-width:112px;aspect-ratio:1}
#status-root .stc2-round{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:#3a2b17}
#status-root .stc2-round img,#status-root .stc2-round video{width:100%;height:100%;object-fit:cover}
#status-root .stc2-rm{position:absolute;top:-3px;right:-3px;z-index:2;width:26px;height:26px;border-radius:50%;background:#e8380d;color:#fff;border:0;font-size:14px;line-height:1;cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,.35)}
#status-root .stc2-dur{position:absolute;left:50%;bottom:7px;transform:translateX(-50%);background:rgba(0,0,0,.66);color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;z-index:2}
#status-root .stc2-add{width:100%;max-width:112px;aspect-ratio:1;border-radius:50%;border:2px dashed rgba(232,56,13,.55);background:transparent;color:#e8380d;font-size:28px;cursor:pointer}
#status-root .stc2-hint{font-size:12.5px;opacity:.65;margin:16px 0 0;line-height:1.5}
#status-root .stc2 .stc-bar i{background:linear-gradient(90deg,#ff5a1f,#e8380d)}
#status-root .stc2-bt{display:flex;gap:10px;margin-top:14px}
#status-root .stc2-pv{flex:0 0 auto;background:transparent;border:1.5px solid #e8380d;color:#e8380d;border-radius:12px;font-weight:700;padding:14px 18px;font-size:15px;cursor:pointer;font-family:inherit}
#status-root .stc2-pv:disabled{opacity:.45}
#status-root .stc2 .stc-post{background:linear-gradient(135deg,#ff5a1f,#e8380d)}
.stv-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:2;color:#fff;background:#000}
.stv-ring{width:52px;height:52px;border-radius:50%;border:3.5px solid rgba(255,255,255,.16);border-top-color:#ff5a1f;animation:stvspin .8s linear infinite}
@keyframes stvspin{to{transform:rotate(360deg)}}
.stv-load-t{font-size:13px;letter-spacing:.4px;opacity:.85}
.stv-md img,.stv-md video{animation:stvin .25s ease}
@keyframes stvin{from{opacity:0}to{opacity:1}}
.stv-nm{cursor:pointer}
.upd-sec{margin:4px 0 20px}
.upd-sec-hd{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;padding:8px 2px;cursor:pointer;color:var(--ink);font-family:inherit;text-align:left}
.upd-sec-av{width:42px;height:42px;border-radius:50%;overflow:hidden;background:var(--chrome2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;flex:none;color:var(--ink)}
.upd-sec-av img{width:100%;height:100%;object-fit:cover}
.upd-sec-mid{flex:1;min-width:0}
.upd-sec-nm{font-weight:800;font-size:15.5px;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.upd-sec-sub{font-size:12.5px;color:var(--muted);margin-top:1px}
.upd-sec-go{color:var(--acc);font-weight:700;font-size:13px;flex:none}
`;
    var st = document.createElement("style");
    st.id = "nm-orange-ui";
    st.textContent = css;
    document.head.appendChild(st);
  })();

  /* Chat-header guard: thread screen is viewport-fixed; body scroll locks while a thread is open so the seller header cannot scroll away. */
  (function () {
    function sync() {
      var th = document.getElementById("screen-thread");
      var on = !!(th && th.classList.contains("active"));
      document.body.style.overflow = on ? "hidden" : "";
      document.documentElement.style.overflow = on ? "hidden" : "";
      if (on) { try { window.scrollTo(0, 0); } catch (e) {} }
    }
    function arm() {
      var th = document.getElementById("screen-thread");
      if (!th) { setTimeout(arm, 600); return; }
      try { new MutationObserver(sync).observe(th, { attributes: true, attributeFilter: ["class"] }); } catch (e) {}
      sync();
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", arm); } else { arm(); }
  })();

  /* Chat theme normalizer: when the person has NOT picked a chat wallpaper,
     the chat follows the app theme (light app -> Orange light chat, dark app
     -> Orange dark chat) — that is the default look. A wallpaper the person
     picked in Chat wallpaper settings is saved (nc2_chat_theme) and is never
     overridden here, which is what makes the picker visibly work again. */
  (function () {
    function savedTheme() { try { return localStorage.getItem("nc2_chat_theme"); } catch (e) { return null; } }
    function norm() {
      var th = document.getElementById("screen-thread"); if (!th) { return; }
      if (savedTheme()) { return; }
      var want = document.documentElement.getAttribute("data-theme") === "dark" ? "wa-dark" : "wa-light";
      if (th.getAttribute("data-chat-theme") !== want) { th.setAttribute("data-chat-theme", want); }
    }
    function arm() {
      var th = document.getElementById("screen-thread");
      if (!th) { setTimeout(arm, 600); return; }
      try { new MutationObserver(norm).observe(th, { attributes: true, attributeFilter: ["data-chat-theme"] }); } catch (e) {}
      try { new MutationObserver(norm).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) {}
      norm();
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", arm); } else { arm(); }
  })();

  /* Updates listings: per-seller sections, independent latest-5 carousels (reference styling in extras.js nm-upd-ref). */
  (function () {
    var css = `
.upd-rows{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 4px;scrollbar-width:none}
.upd-rows::-webkit-scrollbar{display:none}
.upd-ctl{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 2px}
.upd-navb{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--chrome);color:var(--ink);font-size:18px;font-weight:800;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;flex:none}
.upd-navb.next{border-color:rgba(232,56,13,.55);color:var(--acc)}
.upd-navb.off{opacity:.35}
.upd-dots{display:flex;gap:6px;align-items:center}
.upd-dot{width:7px;height:7px;border-radius:99px;background:var(--faint)}
.upd-dot.on{background:var(--acc)}
@media (min-width:560px){.upd-row{flex-basis:180px}}
.upd-row{display:flex;flex-direction:column;align-items:stretch;background:var(--chrome);border:1px solid var(--line-soft);border-radius:14px;padding:0;overflow:hidden;cursor:pointer;text-align:left;flex:0 0 calc((100% - 16px)/3);scroll-snap-align:start;font-family:inherit;color:var(--ink);box-sizing:border-box;box-shadow:var(--shadow-card)}
.upd-row:active{transform:scale(.99)}
.upd-row-img{position:relative;width:100%;height:auto;aspect-ratio:4/3;border-radius:0;overflow:hidden;flex:none;background:var(--chrome2)}
.upd-row-img img{width:100%;height:100%;object-fit:cover;display:block}
.upd-row-fb{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;color:var(--muted)}
.upd-row-badge{position:absolute;left:0;top:0;background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;font-size:8.5px;font-weight:800;letter-spacing:.4px;padding:3px 6px;border-radius:0 0 8px 0}
.upd-row-badge.feat{background:linear-gradient(135deg,#f5b921,#e8930c);color:#241a00}
.upd-row-main{flex:1;min-width:0;padding:8px 9px 10px}
.upd-row-main>.upd-row-price,.upd-row-main>.upd-row-meta{display:block}
.upd-row-price{font-size:14px;font-weight:800;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.upd-row-price small{font-size:11.5px;color:var(--muted);font-weight:600}
.upd-row-title{font-size:12.5px;font-weight:600;line-height:1.3;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.upd-row-meta{font-size:11px;color:var(--muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.upd-row-go{display:none}
.pv-capwrap{position:absolute;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:4}
.pv-cap{width:100%;box-sizing:border-box;background:rgba(10,10,12,.72);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:12px 14px;font-size:14.5px;font-family:inherit;outline:none}
.pv-cap::placeholder{color:rgba(255,255,255,.65)}
`;
    var st = document.createElement("style");
    st.id = "nm-upd-rows";
    st.textContent = css;
    document.head.appendChild(st);
  })();

  /* ---------------- Follow buttons ---------------- */
  function paintFollowButtons(sellerId, following) {
    document.querySelectorAll('[data-fbtn="' + sellerId + '"]').forEach(function (b) {
      b.textContent = following ? "Following" : "Follow";
      b.classList.toggle("on", !!following);
    });
  }
  var _ftBusy = {};
  window.NM_followToggle = function (sellerId) {
    var DB = window.NM_DB; if (!DB || _ftBusy[sellerId]) { return; }
    _ftBusy[sellerId] = 1;
    DB.isFollowing(sellerId).then(function (f) {
      return (f ? DB.unfollowSeller(sellerId) : DB.followSeller(sellerId)).then(function (r) {
        paintFollowButtons(sellerId, r.following);
        DB.followerCount(sellerId).then(function (n) {
          document.querySelectorAll('[data-fcount="' + sellerId + '"]').forEach(function (el) { el.textContent = String(n); });
        });
        toast(r.following ? "Following. You will see their status and new listings in Updates." : "Unfollowed.");
        NM_updatesOpen(true);
      });
    }).catch(function (e) { toast((e && e.message) || "Could not update follow."); }).then(function () { _ftBusy[sellerId] = 0; });
  };
  /* Item-page bar: fills [data-fbar="sellerId"] (never shown for own listings). */
  window.NM_followBar = function (sellerId) {
    var DB = window.NM_DB, my = me(); if (!DB || !sellerId || String(my) === String(sellerId)) { return; }
    var nm = (window.NM_detailProduct && window.NM_detailProduct.sellerName) || cleanSellerName($("#detail-seller .seller-name")) || "this seller";
    DB.isFollowing(sellerId).then(function (f) {
      DB.followerCount(sellerId).then(function (n) {
        DB.isBlocked(sellerId).then(function (b) {
          document.querySelectorAll('[data-fbar="' + sellerId + '"]').forEach(function (bar) {
            bar.innerHTML = '<button class="follow-btn' + (f ? " on" : "") + '" data-fbtn="' + esc(sellerId) + '" onclick="NM_followToggle(\'' + esc(sellerId) + '\')">' + (f ? "Following" : "Follow") + '</button>' +
              (n > 0 ? '<span class="fc"><b data-fcount="' + esc(sellerId) + '">' + n + "</b> followers</span>" : "") +
              '<button class="block-btn block-compact block-right" data-bbtn="' + esc(sellerId) + '" data-bname="' + esc(nm) + '" onclick="NM_blockToggle(this.getAttribute(\'data-bbtn\'),this.getAttribute(\'data-bname\'))">' + (b ? "Unblock" : "Block") + "</button>";
          });
          /* Proximity awareness: show how far this seller is from the viewer. */
          var addDist = function () {
            var loc0 = myLoc(); if (!loc0) { return; }
            sellerCoords([String(sellerId)]).then(function (map) {
              var c = map[String(sellerId)];
              if (!c || c.lat == null || c.lng == null) { return; }
              var d = havKm(loc0, c); if (d == null) { return; }
              document.querySelectorAll('[data-fbar="' + sellerId + '"]').forEach(function (bar) {
                if (bar.querySelector(".fc-dist")) { return; }
                var s = document.createElement("span");
                s.className = "fc fc-dist";
                s.textContent = "📍 " + fmtKm(d) + " away";
                bar.appendChild(s);
              });
            }).catch(function () {});
          };
          if (myLoc()) { addDist(); } else { syncLocFromProfile().then(addDist); }
        });
      });
    }).catch(function () {});
  };
  /* Seller screen: #store-follow button + [data-followers] stat. */
  window.NM_followUI = function (sellerId) {
    var DB = window.NM_DB, my = me(); if (!DB || !sellerId) { return; }
    var box = $("#store-follow");
    if (!box) {
      var meta = $("#seller-body .store-meta");
      if (meta) { box = document.createElement("div"); box.id = "store-follow"; meta.after(box); }
    }
    var mine = String(my) === String(sellerId);
    var nm = cleanSellerName($("#seller-body .store-name")) || "this seller";
    function fill(f, n, b) {
      if (box) {
        box.innerHTML = mine ? "" : '<button class="follow-btn' + (f ? " on" : "") + '" data-fbtn="' + esc(sellerId) + '" onclick="NM_followToggle(\'' + esc(sellerId) + '\')">' + (f ? "Following" : "Follow") + "</button>" +
          '<button class="block-btn' + (b ? " on" : "") + '" data-bbtn="' + esc(sellerId) + '" data-bname="' + esc(nm) + '" onclick="NM_blockToggle(this.getAttribute(\'data-bbtn\'),this.getAttribute(\'data-bname\'))">' + (b ? "Unblock" : "Block") + "</button>";
      }
      document.querySelectorAll("[data-followers]").forEach(function (el) { el.textContent = String(n); });
    }
    DB.isFollowing(sellerId).then(function (f) {
      DB.followerCount(sellerId).then(function (n) {
        DB.isBlocked(sellerId).then(function (b) { fill(f, n, b); }).catch(function () { fill(f, n, false); });
      });
    }).catch(function () { fill(false, 0, false); });
    /* Proximity awareness on the seller screen (the item-page seller screen
       and NM_openStore share #seller-body): append the distance to the meta
       line when it is not already there. */
    if (!mine) {
      var paintMetaDist = function () {
        var loc0 = myLoc(); if (!loc0) { return; }
        sellerCoords([String(sellerId)]).then(function (map) {
          var c = map[String(sellerId)];
          if (!c || c.lat == null || c.lng == null) { return; }
          var d = havKm(loc0, c); if (d == null) { return; }
          var meta = $("#seller-body .store-meta");
          if (!meta || meta.querySelector(".meta-dist") || meta.textContent.indexOf("📍") >= 0) { return; }
          var s = document.createElement("span");
          s.className = "meta-dist";
          s.textContent = " · 📍 " + fmtKm(d) + " from you";
          meta.appendChild(s);
        }).catch(function () {});
      };
      if (myLoc()) { paintMetaDist(); } else { syncLocFromProfile().then(paintMetaDist); }
    }
  };

  /* ---------------- Block buttons (item page + seller screen) ---------------- */
  function cleanSellerName(el) {
    if (!el) { return ""; }
    try {
      var c = el.cloneNode(true);
      c.querySelectorAll(".vtick").forEach(function (v) { v.remove(); });
      return (c.textContent || "").replace(/\s+/g, " ").trim();
    } catch (e) { return ""; }
  }
  function paintBlockButtons(sellerId, blocked) {
    document.querySelectorAll('[data-bbtn="' + sellerId + '"]').forEach(function (b) {
      b.textContent = blocked ? "Unblock" : "Block";
      b.classList.toggle("on", !!blocked);
    });
  }
  /* Repaint all block buttons for a seller from current server state. */
  window.NM_blockUI = function (sellerId) {
    var DB = window.NM_DB; if (!DB || !sellerId) { return; }
    DB.isBlocked(sellerId).then(function (b) { paintBlockButtons(sellerId, b); }).catch(function () {});
  };
  var _btBusy = {};
  /* Delegated capture: every [data-bbtn] opens the same confirm sheet as the thread block. */
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-bbtn]") : null;
    if (!b) { return; }
    ev.stopPropagation();
    ev.preventDefault();
    window.NM_blockToggle(b.getAttribute("data-bbtn"), b.getAttribute("data-bname") || "this seller");
  }, true);

  /* ---------------- Sell-form subcategory (delegated; survives re-renders) ----------------
     The category select is populated by app.js; the first (default) option fires no
     change event, so the inline index.html wiring can leave the subcategory disabled.
     This fills it right after populate, on every user change, and after draft restore. */
  window.NM_fillSubcats = function (v) {
    try {
      var s = document.querySelector("#sell-subcategory"); if (!s) { return; }
      var n = (window.NM_SUBCATS || {})[v] || [];
      s.disabled = !n.length;
      s.innerHTML = n.length
        ? '<option value="">Choose subcategory (optional)</option>' + n.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("")
        : '<option value="">Select a category first</option>';
    } catch (e) {}
  };
  document.addEventListener("change", function (ev) {
    var t = ev.target; if (t && t.id === "sell-category" && window.NM_fillSubcats) { window.NM_fillSubcats(t.value); }
  });
  try { var _sc = document.querySelector("#sell-category"); if (_sc && _sc.value) { window.NM_fillSubcats(_sc.value); } } catch (e) {}

  /* ---------------- Updates screen ---------------- */
  var _rtBound = false;
  function viewedMap() { try { return JSON.parse(localStorage.getItem("nm_viewed_status") || "{}"); } catch (e) { return {}; } }
  function markViewed(statusId) {
    try { var m = viewedMap(); m[statusId] = 1; localStorage.setItem("nm_viewed_status", JSON.stringify(m)); } catch (e) {}
  }

  /* Render when the Updates tab is opened (the tab button + screen exist in index.html). */
  try {
    var _scr = document.getElementById("screen-updates");
    if (_scr && window.MutationObserver) {
      new MutationObserver(function () {
        if (_scr.classList.contains("active")) { window.NM_updatesOpen(); }
      }).observe(_scr, { attributes: true, attributeFilter: ["class"] });
    }
  } catch (e) {}

  window.NM_updatesOpen = function (soft) {
    var DB = window.NM_DB; if (!DB) { return; }
    if (!_rtBound) {
      _rtBound = true;
      try {
        DB.onLive("statuses", function () { if ($("#screen-updates") && $("#screen-updates").classList.contains("active")) { NM_updatesOpen(true); } });
        DB.onLive("products", function () { if ($("#screen-updates") && $("#screen-updates").classList.contains("active")) { NM_updatesOpen(true); } });
      } catch (e) {}
    }
    var rail = $("#upd-rail"), grid = $("#upd-grid"), empty = $("#upd-empty");
    if (!rail) { return; }
    var my = me();
    if (!my) {
      rail.innerHTML = "";
      if (grid) { grid.innerHTML = ""; }
      if (empty) { empty.hidden = false; empty.innerHTML = "<h3>Log in to see updates</h3><p>Follow sellers and their status and newest listings will appear here.</p>"; }
      return;
    }
    DB.followingProfiles().then(function (profiles) {
      var ids = profiles.map(function (p) { return p.id; });
      var all = ids.concat([my]);
      return DB.listStatuses(all).then(function (rows) {
        var byUser = {};
        rows.forEach(function (r) { (byUser[r.user_id] = byUser[r.user_id] || []).push(r); });
        renderRail(profiles, byUser, my);
        return DB.listProducts({}).then(function (prods) {
          var mine = prods.filter(function (p) { return ids.indexOf(p.sellerId) >= 0; });
          renderListings(mine, profiles, grid, empty);
        });
      });
    }).catch(function () {
      if (empty) { empty.hidden = false; empty.innerHTML = "<h3>Could not load updates</h3><p>Check your connection and try again.</p>"; }
    });
  };

  function renderRail(profiles, byUser, my) {
    var rail = $("#upd-rail"); if (!rail) { return; }
    var seen = viewedMap(), html = "";
    var myRows = (byUser[my] || []).slice().sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    var myUnseen = myRows.some(function (r) { return !seen[r.id]; });
    html += '<span class="upd-mine-wrap"><button class="upd-it" id="upd-mine"><span class="upd-c' + (myRows.length && myUnseen ? " unseen" : "") + '"><span class="upd-in" id="upd-mine-av"></span></span><span class="upd-nm">My status</span></button>' +
      '<button class="upd-plus" id="upd-plus" aria-label="Add to your status">+</button></span>';
    profiles.forEach(function (p) {
      var rows = (byUser[p.id] || []).slice().sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
      if (!rows.length) { return; }
      var unseen = rows.some(function (r) { return !seen[r.id]; });
      html += '<button class="upd-it" data-ustat="' + esc(p.id) + '"><span class="upd-c' + (unseen ? " unseen" : "") + '"><span class="upd-in">' + ava(p) + '</span></span><span class="upd-nm">' + esc(p.display_name || "Seller") + "</span></button>";
    });
    rail.innerHTML = html;
    var mineBtn = $("#upd-mine");
    if (mineBtn) { mineBtn.addEventListener("click", function () { myRows.length ? NM_statusViewer(my, myRows) : NM_statusComposer(); }); }
    var plus = $("#upd-plus");
    if (plus) { plus.addEventListener("click", function () { NM_statusComposer(); }); }
    rail.querySelectorAll("[data-ustat]").forEach(function (b) {
      b.addEventListener("click", function () {
        var uid = b.getAttribute("data-ustat");
        var rows = (byUser[uid] || []).slice().sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        if (rows.length) { NM_statusViewer(uid, rows); }
      });
    });
    var DB = window.NM_DB;
    if (DB && my) {
      DB.getProfileById ? DB.getProfileById(my).then(function (pr) {
        var el = $("#upd-mine-av"); if (el && pr) { el.innerHTML = ava(pr); }
      }).catch(function () {}) : null;
    }
    window._nmStatusByUser = byUser;
  }

  /* (grouping helper — see Updates listings note above) */
  function renderListings(items, profiles, grid, empty) {
    if (!grid) { return; }
    if (!profiles || !profiles.length) {
      grid.innerHTML = "";
      if (empty) { empty.hidden = false; empty.innerHTML = "<h3>Follow sellers to see their updates</h3><p>When you follow a seller, their status and newest listings show up here.</p>"; }
      return;
    }
    var bySeller = {};
    (items || []).forEach(function (p) { (bySeller[p.sellerId] = bySeller[p.sellerId] || []).push(p); });
    var secs = profiles.map(function (pr) {
      var rows = (bySeller[pr.id] || []).slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      return { pr: pr, rows: rows, latest: rows.length ? (rows[0].at || 0) : 0 };
    }).filter(function (s) { return s.rows.length; })
      .sort(function (a, b) { return b.latest - a.latest; });
    if (!secs.length) {
      grid.innerHTML = "";
      if (empty) { empty.hidden = false; empty.innerHTML = "<h3>No new listings yet</h3><p>Sellers you follow have not posted anything new.</p>"; }
      return;
    }
    if (empty) { empty.hidden = true; }
    function rowHtml(p) {
      var img = (p.images && p.images[0]) || "";
      var badge = p.featured
        ? '<span class="upd-row-badge feat">FEATURED</span>'
        : (p.bumpAt ? '<span class="upd-row-badge">PROMOTED</span>' : "");
      var thumb = img
        ? '<img src="' + esc(img) + '" alt="" loading="lazy">'
        : '<span class="upd-row-fb">' + esc(String(p.title || "S").trim().charAt(0).toUpperCase() || "S") + "</span>";
      var metaParts = [p.condition, p.location, rel(new Date(p.at || Date.now()).toISOString())];
      if (p.distKm != null) { metaParts.push("\uD83D\uDCCD " + fmtKm(p.distKm) + " away"); }
      var meta = metaParts.filter(Boolean).join(" \u00B7 ");
      return '<button class="upd-row" data-upd="' + esc(p.id) + '">' +
        '<span class="upd-row-img">' + thumb + badge + "</span>" +
        '<span class="upd-row-main"><span class="upd-row-price">\u20A6' + Number(p.price || 0).toLocaleString("en-NG") +
        (p.priceSuffix ? ' <small>' + esc(p.priceSuffix) + "</small>" : "") + "</span>" +
        '<span class="upd-row-title">' + esc(p.title || "") + "</span>" +
        '<span class="upd-row-meta">' + esc(meta) + "</span></span>" +
        '<span class="upd-row-go">\u203A</span></button>';
    }
    grid.innerHTML = secs.map(function (s) {
      var top = s.rows.slice(0, 5);
      var cards = top.map(rowHtml).join("");
      var dots = top.map(function (_, di) { return '<span class="upd-dot' + (di === 0 ? " on" : "") + '"></span>'; }).join("");
      return '<div class="upd-sec"><button class="upd-sec-hd" data-store="' + esc(s.pr.id) + '">' +
        '<span class="upd-sec-av">' + ava(s.pr) + '</span>' +
        '<span class="upd-sec-mid"><span class="upd-sec-nm">' + esc(s.pr.display_name || "Seller") + '</span>' +
        '<span class="upd-sec-sub">' + s.rows.length + (s.rows.length === 1 ? " listing" : " listings") + " \u00B7 latest 5</span></span>" +
        '<span class="upd-sec-go">Store \u203A</span></button>' +
        '<div class="upd-rows">' + cards + "</div>" +
        (top.length > 3 ? '<div class="upd-ctl"><button class="upd-navb prev off" data-pdir="-1" aria-label="Previous products">\u2039</button>' +
        '<span class="upd-dots">' + dots + "</span>" +
        '<button class="upd-navb next" data-pdir="1" aria-label="Next products">\u203A</button></div>' : "") + "</div>";
    }).join("");
    grid.querySelectorAll("[data-store]").forEach(function (b) {
      b.addEventListener("click", function () { window.NM_openStore(b.getAttribute("data-store")); });
    });
    grid.querySelectorAll("[data-upd]").forEach(function (c) {
      c.addEventListener("click", function () { if (window.NM_openDetail) { window.NM_openDetail(c.getAttribute("data-upd")); } });
    });
    grid.querySelectorAll(".upd-sec").forEach(function (sec) {
      var car = sec.querySelector(".upd-rows");
      if (!car) { return; }
      var dots = sec.querySelectorAll(".upd-dot");
      var prev = sec.querySelector(".upd-navb.prev");
      var next = sec.querySelector(".upd-navb.next");
      function step() { var c = car.querySelector(".upd-row"); return c ? c.getBoundingClientRect().width + 8 : 120; }
      function paint() {
        var i = Math.round(car.scrollLeft / step());
        if (i < 0) { i = 0; }
        if (i > dots.length - 1) { i = dots.length - 1; }
        dots.forEach(function (d, j) { d.classList.toggle("on", j === i); });
        if (prev) { prev.classList.toggle("off", car.scrollLeft <= 4); }
        if (next) { next.classList.toggle("off", car.scrollLeft >= car.scrollWidth - car.clientWidth - 4); }
      }
      car.addEventListener("scroll", function () { window.requestAnimationFrame(paint); }, { passive: true });
      sec.querySelectorAll(".upd-navb").forEach(function (b) {
        b.addEventListener("click", function () { car.scrollBy({ left: Number(b.getAttribute("data-pdir")) * step(), behavior: "smooth" }); });
      });
      paint();
    });
  }

  /* Open a seller's marketplace store (the #screen-seller shop view), rendered
     here from the same live data the item-page seller card uses. */
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
            ? '<div class="seller-ava"><img class="avatar-img" src="' + esc(pr.avatar_url) + '" alt=""></div>'
            : '<div class="seller-ava">' + esc(String(nm).trim().charAt(0).toUpperCase() || "S") + "</div>";
          var tier = pr && pr.verification_tier;
          var since = pr && pr.created_at ? new Date(pr.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "recently";
          var tick = tier ? ' <span class="vtick wa-fixed wa-' + esc(tier) + '">✓</span>' : "";
          var render = function (respLabel) {
            if (!body) { return; }
            body.innerHTML = '<div class="store-hero">' + avaH + '<div class="store-name">' + esc(nm) + tick + '</div><div class="store-pres" id="seller-pres" hidden></div>' +
              '<div class="store-meta">Member since ' + esc(since) + (tier ? " · " + esc(tier) + " verified" : "") + (rows.length && rows[0].distKm != null ? " · 📍 " + fmtKm(rows[0].distKm) + " from you" : "") + '</div>' +
              '<div class="store-stats"><div class="store-stat"><b>' + rows.length + '</b><span>Listings</span></div>' +
              '<div class="store-stat"><b style="font-size:12px">' + esc(respLabel || "New seller") + '</b><span>Response</span></div>' +
              '<div class="store-stat"><b data-followers>—</b><span>Followers</span></div></div></div>' +
              '<div class="section-head">All listings</div><div class="grid" id="seller-grid">' +
              (window.NM_card ? rows.map(function (p, i) { return window.NM_card(p, {}, i); }).join("") : "") + "</div>" +
              (rows.length ? "" : '<div class="empty"><h3>No active listings</h3><p>This seller has nothing listed right now.</p></div>');
            var g = $("#seller-grid");
            if (g && window.NM_cardBind) { try { window.NM_cardBind(g); } catch (e) {} }
            if (DB.presenceBadge) { try { DB.presenceBadge(sellerId, "seller-pres"); } catch (e) {} }
            if (window.NM_followUI) { window.NM_followUI(sellerId); }
          };
          if (DB.sellerMessageStats && DB.replySpeedLabel) {
            DB.sellerMessageStats(sellerId).then(function (st) { render(DB.replySpeedLabel(st)); }).catch(function () { render("New seller"); });
          } else { render("New seller"); }
        });
      });
    }).catch(function () { toast("Could not open that store."); });
  };

  /* ---------------- Status composer ---------------- */
  var _picked = [];
  window.NM_statusComposer = function (keep, capVal) {
    var root = $("#status-root"); if (!root) { return; }
    if (!keep) { _picked = []; }
    root.innerHTML = '<div class="stc2">' +
      '<div class="stc2-hd"><button class="stc2-x" id="stc-cancel" aria-label="Close">×</button><h3>Add status</h3></div>' +
      '<div class="stc2-sub">Recents ▾</div>' +
      '<div class="stc2-grid" id="stc-grid"></div>' +
      '<p class="stc2-hint">Up to 5 pictures, or one video of up to 1 minute. Your status is visible to your followers for 24 hours. Add a caption to each item in Preview.</p>' +
      '<div class="stc-bar" id="stc-bar"><i></i></div>' +
      '<div class="stc2-bt"><button class="stc2-pv" id="stc-preview" disabled>Preview</button><button class="stc-post" id="stc-post">Post status</button></div>' +
      '<input type="file" id="stc-file" accept="image/*,video/*" multiple hidden></div>';
    root.classList.add("on");
    
    $("#stc-cancel").addEventListener("click", NM_statusClose);
    $("#stc-file").addEventListener("change", onPick);
    $("#stc-post").addEventListener("click", onPost);
    $("#stc-preview").addEventListener("click", function () { window.NM_statusPreview(); });
    drawPicked();
  };
  function onPick(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    if (!files.length) { return; }
    var vids = files.filter(function (f) { return /^video\//.test(f.type); });
    if (vids.length > 1 || (vids.length === 1 && files.length > 1)) { toast("Post one video or up to 5 pictures."); return; }
    if (vids.length === 1) {
      var v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = function () {
        URL.revokeObjectURL(v.src);
        if (v.duration && v.duration > 60.5) { toast("Video must be 1 minute or less."); return; }
        _picked = [{ file: files[0], kind: "video", dur: v.duration || 0 }];
        drawPicked();
      };
      v.onerror = function () { toast("Could not read that video."); };
      v.src = URL.createObjectURL(files[0]);
      return;
    }
    var imgs = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) { toast("Pick a photo or video."); return; }
    var cur = (_picked.length && _picked[0].kind === "image") ? _picked : [];
    var room = 5 - cur.length;
    if (room <= 0) { toast("Up to 5 pictures."); return; }
    if (imgs.length > room) { toast("Up to 5 pictures."); imgs = imgs.slice(0, room); }
    _picked = cur.concat(imgs.map(function (f) { return { file: f, kind: "image" }; }));
    drawPicked();
  }
  function drawPicked() {
    var g = $("#stc-grid"); if (!g) { return; }
    var cam = '<button class="stc2-cam" id="stc-cam"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h2.4l2-2.6h7.2L17.6 8H20a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13" r="3.6"/></svg><span>Camera</span></button>';
    var cells = _picked.map(function (p, i) {
      var src = URL.createObjectURL(p.file);
      var media = p.kind === "video" ? '<video src="' + src + '" muted playsinline></video>' : '<img src="' + src + '" alt="">';
      var dur = p.kind === "video" && p.dur ? '<span class="stc2-dur">▶ ' + Math.round(p.dur) + "s</span>" : "";
      return '<div class="stc2-cell"><div class="stc2-round">' + media + "</div>" + dur + '<button class="stc2-rm" data-rm="' + i + '" aria-label="Remove">×</button></div>';
    }).join("");
    var canAdd = _picked.length && _picked[0].kind === "image" && _picked.length < 5;
    g.innerHTML = cam + cells + (canAdd ? '<button class="stc2-add" id="stc-add" aria-label="Add more">+</button>' : "");
    var f = $("#stc-file");
    var camB = $("#stc-cam"); if (camB && f) { camB.addEventListener("click", function () { f.click(); }); }
    var addB = $("#stc-add"); if (addB && f) { addB.addEventListener("click", function () { f.click(); }); }
    g.querySelectorAll("[data-rm]").forEach(function (b) {
      b.addEventListener("click", function () { _picked.splice(+b.getAttribute("data-rm"), 1); drawPicked(); });
    });
    var pv = $("#stc-preview"); if (pv) { pv.disabled = !_picked.length; }
  }

  /* Shared status-media mounter: shows the branded loader until the media is
     actually ready, then reveals it (used by the viewer and the preview). */
  function mountStatusMedia(md, item, onReady, onFail, wireVideo) {
    if (!md) { return; }
    var load = document.createElement("div");
    load.className = "stv-load";
    load.innerHTML = '<div class="stv-ring"></div><div class="stv-load-t">Loading…</div>';
    md.appendChild(load);
    var done = false;
    function ready(d) { if (done) { return; } done = true; if (load.parentNode) { load.remove(); } onReady(d || 0); }
    function fail() { if (done) { return; } done = true; if (load.parentNode) { load.remove(); } onFail(); }
    if (item.kind === "video") {
      var v = document.createElement("video");
      v.src = item.url; v.playsInline = true; v.controls = false; v.preload = "auto";
      v.oncanplay = function () { ready(v.duration || 0); v.play().catch(function () {}); };
      v.onerror = function () { fail(); };
      if (wireVideo) { wireVideo(v); }
      md.appendChild(v);
    } else {
      var probe = new Image();
      probe.onload = function () {
        var el = document.createElement("img");
        el.src = item.url; el.alt = "";
        md.appendChild(el);
        ready(0);
      };
      probe.onerror = function () { fail(); };
      probe.src = item.url;
    }
  }

  /* Preview the picked status exactly as followers will see it, before posting. */
  window.NM_statusPreview = function () {
    if (!_picked.length) { return; }
    var root = $("#status-root"); if (!root) { return; }
    var rows = _picked.map(function (p) { return { kind: p.kind, url: URL.createObjectURL(p.file) }; });
    var idx = 0, timer = null, seq = 0, capFocus = false, wantNext = false, ready = false;
    function segs() {
      return rows.map(function (r, i) { return '<div class="stv-seg' + (i < idx ? " done" : "") + '"><i></i></div>'; }).join("");
    }
    function back() { clearTimeout(timer); seq++; window.NM_statusComposer(true); }
    function show() {
      if (idx >= rows.length) { back(); return; }
      var mySeq = ++seq;
      var r = rows[idx];
      ready = false; wantNext = false;
      root.innerHTML = '<div class="stv"><div class="stv-segs">' + segs() + "</div>" +
        '<div class="stv-hd"><span class="stv-av" id="pv-av"></span><div><div class="stv-nm">Your status</div><div class="stv-tm">Preview</div></div>' +
        '<button class="stv-x" id="pv-x">×</button></div>' +
        '<div class="stv-md" id="pv-md"></div>' +
        '<div class="pv-capwrap"><input type="text" class="pv-cap" id="pv-cap" maxlength="300" placeholder="Add a caption for this item" value="' + esc(_picked[idx].cap || "") + '"></div>' +
        '<button class="stv-tap l" id="pv-prev" aria-label="Previous photo">‹</button><button class="stv-tap r" id="pv-next" aria-label="Next photo">›</button></div>';
      root.classList.add("on");
      var my = me(), DB = window.NM_DB;
      if (DB && DB.getProfileById && my) { DB.getProfileById(my).then(function (p) { var el = $("#pv-av"); if (el && p) { el.innerHTML = ava(p); } }).catch(function () {}); }
      var segEls = root.querySelectorAll(".stv-seg");
      function fill(i, secs, done) {
        var s = segEls[i]; if (!s) { return; }
        s.classList.toggle("done", !!done);
        s.firstChild.style.transition = done ? "" : "width " + secs + "s linear";
        s.firstChild.style.width = done ? "100%" : "0";
        if (!done) { requestAnimationFrame(function () { s.firstChild.style.width = "100%"; }); }
      }
      function next() { clearTimeout(timer); seq++; idx++; show(); }
      function armImage() {
        fill(idx, 5, false);
        if (idx >= rows.length - 1) { return; }
        timer = setTimeout(function () { fill(idx, 0, true); next(); }, 5000);
      }
      mountStatusMedia($("#pv-md"), r, function (dur) {
        if (mySeq !== seq) { return; }
        ready = true;
        if (r.kind === "video") { fill(idx, Math.max(1, dur || 5), false); }
        else if (!capFocus) { armImage(); }
      }, function () { if (mySeq === seq) { next(); } }, function (v) {
        v.onended = function () { if (mySeq !== seq) { return; } if (capFocus) { wantNext = true; } else if (idx < rows.length - 1) { fill(idx, 0, true); next(); } };
      });
      var capEl = $("#pv-cap");
      if (capEl) {
        capEl.addEventListener("click", function (e) { e.stopPropagation(); });
        capEl.addEventListener("input", function () { _picked[idx].cap = capEl.value; });
        capEl.addEventListener("focus", function () { capFocus = true; clearTimeout(timer); });
        capEl.addEventListener("blur", function () {
          capFocus = false;
          _picked[idx].cap = capEl.value;
          if (wantNext) { wantNext = false; fill(idx, 0, true); next(); return; }
          if (ready && r.kind !== "video") { armImage(); }
        });
      }
      $("#pv-x").addEventListener("click", back);
      $("#pv-prev").addEventListener("click", function (e) { e.stopPropagation(); if (idx > 0) { clearTimeout(timer); seq++; idx--; show(); } });
      $("#pv-next").addEventListener("click", function (e) { e.stopPropagation(); next(); });
    }
    show();
  };

  function onPost() {
    var DB = window.NM_DB; if (!DB || !_picked.length) { toast("Pick a photo or video first."); return; }
    var btn = $("#stc-post"), bar = $("#stc-bar");
    if (btn) { btn.disabled = true; btn.textContent = "Posting…"; }
    if (bar) { bar.classList.add("on"); bar.firstChild.style.width = "40%"; }
    DB.postStatus(_picked, _picked.map(function (p) { return p.cap || ""; })).then(function () {
      if (bar) { bar.firstChild.style.width = "100%"; }
      toast("Status posted.");
      NM_statusClose();
      NM_updatesOpen(true);
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Post"; }
      if (bar) { bar.classList.remove("on"); }
      toast((e && e.message) || "Could not post status. Check your connection.");
    });
  }
  window.NM_statusClose = function () {
    var root = $("#status-root"); if (!root) { return; }
    try { var v = root.querySelector("video"); if (v) { v.pause(); } } catch (e) {}
    root.classList.remove("on"); root.innerHTML = "";
    if (window._nmViewerTimer) { clearTimeout(window._nmViewerTimer); window._nmViewerTimer = null; }
  };

  /* ---------------- Status viewer ---------------- */
  window.NM_statusViewer = function (userId, rows) {
    var root = $("#status-root"); if (!root || !rows || !rows.length) { return; }
    var my = me(), own = String(my) === String(userId);
    /* Every media item in every status row gets its own segment and its own
       caption (captions[] aligned with media_urls; the legacy single caption
       belongs to the first item of its row). */
    var items = [];
    rows.forEach(function (r) {
      (r.media_urls || []).forEach(function (u, mi) {
        items.push({ row: r, url: u, kind: r.kind, cap: (r.captions && r.captions[mi]) || (mi === 0 ? (r.caption || "") : "") });
      });
    });
    if (!items.length) { return; }
    var idx = 0, timer = null, seq = 0;
    function seg() {
      return items.map(function (it, i) {
        return '<div class="stv-seg' + (i < idx ? " done" : "") + '" data-seg="' + i + '"><i></i></div>';
      }).join("");
    }
    function show() {
      if (idx >= items.length) { NM_statusClose(); NM_updatesOpen(true); return; }
      var it = items[idx], r = it.row;
      markViewed(r.id);
      var nm = r._nm || "Seller";
      root.innerHTML = '<div class="stv"><div class="stv-segs">' + seg() + '</div>' +
        '<div class="stv-hd"><span class="stv-av" id="stv-av"></span><div><div class="stv-nm">' + esc(nm) + '</div><div class="stv-tm">' + esc(rel(r.created_at)) + '</div></div>' +
        '<button class="stv-x" id="stv-x">×</button></div>' +
        '<div class="stv-md" id="stv-md"></div>' +
        (it.cap ? '<div class="stv-cp">' + esc(it.cap) + "</div>" : "") +
        (own ? '<button class="stv-del" id="stv-del">Delete status</button>' : "") +
        '<button class="stv-tap l" id="stv-prev" aria-label="Previous">‹</button><button class="stv-tap r" id="stv-next" aria-label="Next">›</button></div>';
      root.classList.add("on");
      var DB = window.NM_DB;
      if (DB && DB.getProfileById) { DB.getProfileById(userId).then(function (p) { var el = $("#stv-av"); if (el && p) { el.innerHTML = ava(p); } }).catch(function () {}); }
      var md = $("#stv-md");
      clearTimeout(timer);
      var mySeq = ++seq;
      var segs = root.querySelectorAll(".stv-seg");
      function fill(i, pct, done) {
        var s = segs[i]; if (!s) { return; }
        s.classList.toggle("done", !!done);
        s.firstChild.style.transition = done ? "" : "width " + pct + "s linear";
        s.firstChild.style.width = done ? "100%" : "0";
        if (!done) { requestAnimationFrame(function () { s.firstChild.style.width = "100%"; }); }
      }
      /* The branded loader shows until the media is actually ready; only then
         does the progress segment start, so the full picture/video is seen. */
      mountStatusMedia(md, { kind: it.kind, url: it.url }, function (dur) {
        if (mySeq !== seq) { return; }
        if (it.kind === "video") { fill(idx, Math.max(1, dur || 5), false); }
        else {
          fill(idx, 5, false);
          timer = setTimeout(function () { fill(idx, 0, true); next(); }, 5000);
          window._nmViewerTimer = timer;
        }
      }, function () { if (mySeq === seq) { next(); } }, function (v) {
        v.onended = function () { if (mySeq === seq) { fill(idx, 0, true); next(); } };
      });
      /* Preload the next item in the background so moving on feels instant. */
      var nx = items[idx + 1];
      if (nx) {
        if (nx.kind === "video") { var pvd = document.createElement("video"); pvd.preload = "metadata"; pvd.muted = true; pvd.src = nx.url; }
        else { var pim = new Image(); pim.src = nx.url; }
      }
      $("#stv-x").addEventListener("click", function () { NM_statusClose(); NM_updatesOpen(true); });
      $("#stv-prev").addEventListener("click", function (e) { e.stopPropagation(); if (idx > 0) { idx--; show(); } });
      $("#stv-next").addEventListener("click", function (e) { e.stopPropagation(); next(); });
      if (!own) {
        var goStore = function () { NM_statusClose(); window.NM_openStore(userId); };
        var nmEl = root.querySelector(".stv-nm");
        if (nmEl) { nmEl.addEventListener("click", function (e) { e.stopPropagation(); goStore(); }); }
        var avEl = $("#stv-av");
        if (avEl) { avEl.addEventListener("click", function (e) { e.stopPropagation(); goStore(); }); }
      }
      var del = $("#stv-del");
      if (del) {
        var delArmed = false, delTimer = null;
        del.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!DB) { toast("Could not delete. Reopen the app and try again."); return; }
          if (!delArmed) {
            delArmed = true;
            try { clearTimeout(timer); } catch (x) {}
            del.textContent = "Tap again to confirm delete";
            del.classList.add("arm");
            clearTimeout(delTimer);
            delTimer = setTimeout(function () {
              delArmed = false;
              var d = $("#stv-del");
              if (d) { d.textContent = "Delete status"; d.classList.remove("arm"); }
            }, 5000);
            return;
          }
          clearTimeout(delTimer);
          del.disabled = true;
          del.textContent = "Deleting…";
          DB.deleteStatus(r.id).then(function () {
            toast("Status deleted");
            NM_statusClose();
            NM_updatesOpen(true);
          }).catch(function (er) {
            toast((er && er.message) || "Could not delete. Check your connection and try again.");
            var d = $("#stv-del");
            if (d) { d.disabled = false; d.textContent = "Delete status"; d.classList.remove("arm"); }
            delArmed = false;
          });
        });
      }
      function next() { clearTimeout(timer); fill(idx, 0, true); idx++; show(); }
    }
    /* resolve display names once */
    var DB = window.NM_DB;
    if (DB && DB.getProfileById) {
      DB.getProfileById(userId).then(function (p) {
        var nm = (p && p.display_name) || "Seller";
        rows.forEach(function (r) { r._nm = nm; });
        show();
      }).catch(function () { show(); });
    } else { show(); }
  };

  /* Theme pack: LIGHT CLEAN + OLED BLACK (Ibrahim's reference images 2026-10-16):
     light = white cards, soft shadow, black text; dark = pure black, near-black
     cards, white text, orange accents + Sell-button glow. Auth screens included. */
  (function () {
    var css = `
html[data-theme="light"]{--bg:#ffffff;--chrome2:#f6f6f8;--line:#ececf0;--line-soft:#f1f1f4;--input:#f4f4f7;--shadow-card:0 10px 30px rgba(16,24,40,.07);--shadow:0 18px 44px rgba(16,24,40,.13)}
html[data-theme="light"] .card{border-radius:20px}
html[data-theme="dark"]{--bg:#000000;--chrome:#0a0a0b;--chrome2:#131315;--ink:#f7f7f8;--muted:#a7a7ae;--faint:#6f6f76;--line:#232326;--line-soft:#17171a;--input:#131315;--input-ink:#f7f7f8;--card:#101012;--card-ink:#f7f7f8;--card-mut:#9a9aa4;--nav-bg:rgba(0,0,0,.97);--shadow-card:0 10px 28px rgba(0,0,0,.65);--shadow:0 18px 44px rgba(0,0,0,.7)}
html[data-theme="dark"] .card{border:1px solid #1c1c1f;border-radius:20px}
html[data-theme="dark"] .nav-sell-plus{box-shadow:0 0 26px rgba(232,56,13,.5)}
html[data-theme="dark"] #screen-auth,html[data-theme="dark"] #screen-recover,html[data-theme="dark"] #screen-otp{background:#000000}
html[data-theme="dark"] .finora-title{color:#f7f7f8}
html[data-theme="dark"] .finora-sub{color:#a7a7ae}
html[data-theme="dark"] .finora-label{color:#c9c9cf}
html[data-theme="dark"] .finora-input{background:#131315;border-color:#26262b}
html[data-theme="dark"] .finora-input input{color:#f7f7f8}
html[data-theme="dark"] .finora-input input::placeholder{color:#5c5c63}
html[data-theme="dark"] .finora-input svg{color:#6f6f76}
html[data-theme="dark"] .auth-tabs{background:#131315}
html[data-theme="dark"] .auth-tab{color:#a7a7ae}
html[data-theme="dark"] .auth-tab.active{background:#26262b;color:#ffffff;box-shadow:none}
html[data-theme="dark"] .finora-or{color:#6f6f76}
html[data-theme="dark"] .finora-or::before,html[data-theme="dark"] .finora-or::after{background:#232326}
html[data-theme="dark"] .phone-mode{color:#a7a7ae}
html[data-theme="dark"] .auth-note{color:#6f6f76}
html[data-theme="dark"] .trust-row span{color:#a7a7ae}
html[data-theme="dark"] .finora-device{background:rgba(28,171,85,.1);border-color:rgba(28,171,85,.35);color:#57d992}
html[data-theme="dark"] #screen-auth .auth-error,html[data-theme="dark"] #screen-recover .auth-error,html[data-theme="dark"] #screen-otp .auth-error{background:rgba(179,38,30,.16);color:#ffb3ad;border-color:rgba(179,38,30,.4)}
html[data-theme="dark"] .finora-logo{border-color:rgba(255,255,255,.08)}
`;
    var st = document.createElement("style");
    st.id = "nm-theme-pack";
    st.textContent = css;
    document.head.appendChild(st);
  })();

  /* Location (Ibrahim 2026-10-16): the dial button by home search opens the
     Location range sheet. Turning location on stamps + saves the position to
     the profile; feeds filter by seller distance; km shown across the app. */
  var NM_LOC_KEY = "nm_my_loc", NM_RANGE_KEY = "nm_range_km";
  var _sellerCoords = {};
  function myLoc() { try { var v = JSON.parse(localStorage.getItem(NM_LOC_KEY) || "null"); return (v && isFinite(v.lat) && isFinite(v.lng)) ? v : null; } catch (e) { return null; } }
  function rangeKm() { var n = Number(localStorage.getItem(NM_RANGE_KEY) || 0); return isFinite(n) && n > 0 ? n : 0; }
  function havKm(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) { return null; }
    var dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180;
    var s = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * 6371 * Math.asin(Math.sqrt(s));
  }
  function fmtKm(d) { if (d == null || !isFinite(d)) { return ""; } return d < 1 ? Math.round(d * 1000) + " m" : (d < 10 ? d.toFixed(1) : String(Math.round(d))) + " km"; }
  window.NM_myLoc = myLoc; window.NM_fmtKm = fmtKm; window.NM_havKm = havKm;

  function saveMyLoc(lat, lng) {
    lat = Math.round(lat * 100) / 100; lng = Math.round(lng * 100) / 100;
    var rec = { lat: lat, lng: lng, at: Date.now() };
    try { localStorage.setItem(NM_LOC_KEY, JSON.stringify(rec)); } catch (e) {}
    var DB = window.NM_DB, my = me();
    if (DB && DB.client && my) {
      try {
        DB.client.from("profiles").update({ lat: lat, lng: lng, loc_updated_at: new Date().toISOString() }).eq("id", my)
          .then(function () {}).catch(function () {});
      } catch (e) {}
    }
    return rec;
  }
  window.NM_saveMyLoc = saveMyLoc;

  function clearMyLoc() {
    try { localStorage.removeItem(NM_LOC_KEY); localStorage.setItem(NM_RANGE_KEY, "0"); } catch (e) {}
    var DB = window.NM_DB, my = me();
    if (DB && DB.client && my) {
      try {
        DB.client.from("profiles").update({ lat: null, lng: null, loc_updated_at: null }).eq("id", my)
          .then(function () {}).catch(function () {});
      } catch (e) {}
    }
  }

  /* Whenever the site successfully reads the person's position (for example
     the existing "Near me" chip), stamp and save it automatically. */
  (function () {
    if (!navigator.geolocation || navigator.geolocation.__nmWrapped) { return; }
    var orig = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = function (ok, err, opts) {
      return orig(function (pos) {
        try {
          var la = pos.coords.latitude, lo = pos.coords.longitude, cur = myLoc();
          if (!cur || havKm(cur, { lat: la, lng: lo }) > 0.1 || Date.now() - (cur.at || 0) > 36e5) { saveMyLoc(la, lo); }
        } catch (e) {}
        if (ok) { ok(pos); }
      }, err, opts);
    };
    navigator.geolocation.__nmWrapped = true;
  })();

  /* Sync my saved location down from my profile. Runs at boot AND lazily on
     first use — at script-load time the session may not be restored yet, so
     a boot-only sync silently misses (found in QA 2026-10-16: the sheet said
     "Location is off" for an account that had a saved location). */
  var _locSyncedFor = null;
  function syncLocFromProfile() {
    var DB = window.NM_DB, my = me();
    if (!DB || !DB.client || !my) { return Promise.resolve(false); }
    if (_locSyncedFor === my) { return Promise.resolve(true); }
    _locSyncedFor = my;
    try {
      return DB.client.from("profiles").select("lat,lng,loc_updated_at").eq("id", my).maybeSingle()
        .then(function (r) {
          var d = r && r.data; if (!d || d.lat == null || d.lng == null) { return false; }
          var cur = myLoc(), srvAt = d.loc_updated_at ? Date.parse(d.loc_updated_at) : 0;
          if (!cur || srvAt > (cur.at || 0)) { try { localStorage.setItem(NM_LOC_KEY, JSON.stringify({ lat: d.lat, lng: d.lng, at: srvAt || Date.now() })); } catch (e) {} }
          return true;
        }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }
  window.NM_syncLoc = syncLocFromProfile;
  syncLocFromProfile();

  function sellerCoords(ids) {
    var DB = window.NM_DB, now = Date.now(), need = [];
    (ids || []).forEach(function (id) { var c = _sellerCoords[id]; if (!c || now - c.at > 3e5) { need.push(id); } });
    if (!need.length || !DB || !DB.client) { return Promise.resolve(_sellerCoords); }
    return DB.client.from("profiles").select("id,lat,lng").in("id", need)
      .then(function (r) {
        (r && r.data || []).forEach(function (p) { _sellerCoords[p.id] = { lat: p.lat, lng: p.lng, at: now }; });
        need.forEach(function (id) { if (!_sellerCoords[id]) { _sellerCoords[id] = { lat: null, lng: null, at: now }; } });
        return _sellerCoords;
      }).catch(function () { return _sellerCoords; });
  }
  window.NM_sellerCoords = sellerCoords;

  /* Attach real distances to product rows (the home/category cards already
     render "· N km away" when a row carries _dist) and apply the saved range
     on the discovery screens only — never inside a seller's store, the item
     page, Updates or chats, where the person chose what to look at. */
  (function () {
    var DB = window.NM_DB; if (!DB || !DB.listProducts || DB.__nmLocWrapped) { return; }
    DB.__nmLocWrapped = true;
    var orig = DB.listProducts.bind(DB);
    function enrichRows(rows) {
      var loc = myLoc(); if (!loc || !rows || !rows.length) { return Promise.resolve(rows); }
      var ids = [];
      rows.forEach(function (p) { if (p.sellerId && ids.indexOf(String(p.sellerId)) < 0) { ids.push(String(p.sellerId)); } });
      if (!ids.length) { return Promise.resolve(rows); }
      return sellerCoords(ids).then(function (map) {
        rows.forEach(function (p) {
          var c = map[String(p.sellerId)];
          if (c && c.lat != null && c.lng != null) { var d = havKm(loc, c); if (d != null) { p.distKm = d; p._dist = d; } }
        });
        if (window.NM_locFallback) { window.NM_locFallback(rows, loc); }
        var rk = rangeKm();
        if (rk > 0) {
          var act = document.querySelector(".screen.active"), aid = act ? act.id : "";
          if (aid === "screen-home" || aid === "screen-category" || aid.indexOf("search") >= 0) {
            rows = rows.filter(function (p) { return p.distKm != null && p.distKm <= rk; });
          }
        }
        return rows;
      });
    }
    DB.listProducts = function (filter) {
      return orig(filter).then(function (rows) {
        if (!myLoc()) { return syncLocFromProfile().then(function () { return enrichRows(rows); }); }
        return enrichRows(rows);
      });
    };
  })();

  /* The location-range sheet, opened from the sliders button beside search. */
  (function () {
    var css = `
#nm-loc-root{position:fixed;inset:0;z-index:2100;display:none;background:rgba(10,6,3,.55)}
#nm-loc-root.on{display:block}
.loc-sh{position:absolute;left:0;right:0;bottom:0;border-radius:22px 22px 0 0;padding:16px 18px calc(18px + env(safe-area-inset-bottom));max-height:88dvh;overflow-y:auto;box-sizing:border-box}
html[data-theme="light"] .loc-sh{background:#fff8ee;color:#241a10}
html[data-theme="dark"] .loc-sh{background:#1d130a;color:#f5ead8}
.loc-hd{display:flex;align-items:center;gap:10px}
.loc-hd h3{margin:0;font-size:18px}
.loc-x{background:none;border:0;color:inherit;font-size:26px;line-height:1;padding:6px 8px;cursor:pointer}
.loc-status{margin-top:10px;display:flex;flex-direction:column;gap:3px}
.loc-status b{font-size:15px}
.loc-status span{font-size:13px;opacity:.75;line-height:1.5}
.loc-bt{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.loc-btn{border-radius:12px;padding:12px 16px;font-weight:700;font-size:14px;border:0;cursor:pointer;font-family:inherit}
.loc-btn.primary{background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;flex:1}
.loc-btn.ghost{background:transparent;border:1.5px solid #e8380d;color:#e8380d}
.loc-btn.danger{background:transparent;border:1.5px solid #e5484d;color:#e5484d}
.loc-btn:disabled{opacity:.6}
.loc-sub{margin:18px 0 10px;font-weight:700;font-size:14.5px}
.loc-ranges{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.loc-range{padding:12px 6px;border-radius:12px;border:1.5px solid rgba(232,56,13,.4);background:transparent;color:inherit;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}
.loc-range.on{background:linear-gradient(135deg,#ff5a1f,#e8380d);color:#fff;border-color:transparent}
.loc-note{font-size:12.5px;opacity:.65;line-height:1.5;margin:14px 0 0}
.loc-dot{position:absolute;top:5px;right:5px;width:9px;height:9px;border-radius:50%;background:#e8380d}
`;
    var st = document.createElement("style");
    st.id = "nm-loc-ui";
    st.textContent = css;
    document.head.appendChild(st);
  })();

  function paintDial() {
    var b = document.querySelector(".sz-filter"); if (!b) { return; }
    var d = document.getElementById("nm-loc-dot");
    if (rangeKm() > 0) {
      if (!d) { d = document.createElement("span"); d.id = "nm-loc-dot"; d.className = "loc-dot"; b.style.position = "relative"; b.appendChild(d); }
    } else if (d) { d.remove(); }
  }

  function locSheet() {
    var root = document.getElementById("nm-loc-root");
    if (!root) { root = document.createElement("div"); root.id = "nm-loc-root"; document.body.appendChild(root); }
    if (!_locSyncedFor) {
      syncLocFromProfile().then(function () {
        var r2 = document.getElementById("nm-loc-root");
        if (r2 && r2.classList.contains("on")) { locSheet(); }
      });
    }
    var loc = myLoc(), rk = rangeKm();
    var ranges = [0, 5, 10, 25, 50, 100];
    root.innerHTML = '<div class="loc-sh">' +
      '<div class="loc-hd"><button class="loc-x" id="loc-x" aria-label="Close">×</button><h3>Location range</h3></div>' +
      '<div class="loc-status">' + (loc
        ? "<b>Your location is on</b><span>Saved " + esc(rel(loc.at)) + ". Listings can show how far they are from you in kilometres, and people can tell how close you are to them.</span>"
        : "<b>Location is off</b><span>Turn on location and the site will stamp and save your position to your account. You will see how far listings are from you in kilometres, and buyers and sellers get proximity awareness.</span>") + "</div>" +
      '<div class="loc-bt">' + (loc
        ? '<button class="loc-btn ghost" id="loc-update">Update my location</button><button class="loc-btn danger" id="loc-off">Turn off</button>'
        : '<button class="loc-btn primary" id="loc-on">Turn on location</button>') + "</div>" +
      '<div class="loc-sub">Show listings within</div>' +
      '<div class="loc-ranges">' + ranges.map(function (r) {
        return '<button class="loc-range' + (rk === r ? " on" : "") + '" data-range="' + r + '">' + (r === 0 ? "Anywhere" : r + " km") + "</button>";
      }).join("") + "</div>" +
      '<p class="loc-note">The range uses each seller\u2019s saved location. Sellers who have not turned on location are placed by the state on their listing. Distances are approximate, based on the seller\u2019s saved position.</p>' +
      "</div>";
    root.classList.add("on");
    function close() { root.classList.remove("on"); }
    root.onclick = function (e) { if (e.target === root) { close(); } };
    $("#loc-x").addEventListener("click", close);
    function turnOn(btn) {
      if (!navigator.geolocation) { toast("This device cannot share location."); return; }
      btn.disabled = true; btn.textContent = "Getting your location…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        saveMyLoc(pos.coords.latitude, pos.coords.longitude);
        toast("Location saved.");
        paintDial();
        locSheet();
      }, function () {
        btn.disabled = false; btn.textContent = loc ? "Update my location" : "Turn on location";
        toast("Location was not allowed. Check your browser or phone location settings and try again.");
      }, { timeout: 12000, maximumAge: 6e5 });
    }
    var onB = $("#loc-on"), upB = $("#loc-update"), offB = $("#loc-off");
    if (onB) { onB.addEventListener("click", function () { turnOn(onB); }); }
    if (upB) { upB.addEventListener("click", function () { turnOn(upB); }); }
    if (offB) {
      offB.addEventListener("click", function () {
        clearMyLoc(); paintDial(); close();
        toast("Location turned off and removed.");
        if (window.NM_goHome) { window.NM_goHome(); }
      });
    }
    root.querySelectorAll("[data-range]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = Number(b.getAttribute("data-range"));
        if (r > 0 && !myLoc()) {
          toast("Turn on location first, so distance can be measured.");
          var t = $("#loc-on") || $("#loc-update");
          if (t) { turnOn(t); }
          return;
        }
        try { localStorage.setItem(NM_RANGE_KEY, String(r)); } catch (e) {}
        paintDial(); close();
        toast(r > 0 ? "Showing listings within " + r + " km of you." : "Showing listings anywhere.");
        if (window.NM_goHome) { window.NM_goHome(); }
      });
    });
  }
  window.NM_locSheet = locSheet;
  /* Shared internals for extras.js. */
  window.NM_int = { esc: esc, me: me, rel: rel, toast: toast, ava: ava, fmtKm: fmtKm, havKm: havKm, myLoc: myLoc, sellerCoords: sellerCoords, syncLoc: syncLocFromProfile };

  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest(".sz-filter") : null;
    if (b) { e.preventDefault(); e.stopPropagation(); locSheet(); }
  }, true);
  setTimeout(paintDial, 1200);
})();

/* ============ Nationwide Media Connect — Reports, Blocks, Notifications, Loadbar ============
   Depends on: supabase/client.js (DB.blockUser/unblockUser/isBlocked/blockedIds,
   DB.fileChatReport, DB.listNotifications, DB.premiumStatus, DB.followingProfiles,
   DB.listStatuses, DB.listProducts, DB.onLive) and app.js (NM_show, NM_toast, NM_card). */
(function () {
  "use strict";
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>\"']/g, function (e) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[e]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); return; } catch (e) {} } alert(m); }
  function me() { try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; } }
  function rel(t) {
    if (window.NM_DB && window.NM_DB.relTime) { try { return window.NM_DB.relTime(t); } catch (e) {} }
    var m = Math.floor((Date.now() - new Date(t).getTime()) / 6e4);
    if (m < 1) { return "Just now"; } if (m < 60) { return m + "m ago"; }
    var h = Math.floor(m / 60); if (h < 24) { return h + "h ago"; }
    return Math.floor(h / 24) + "d ago";
  }
  function peerOf(c) {
    var my = me();
    var pid = (my && c.buyerId && String(my) === String(c.buyerId)) ? c.sellerId : (c.buyerId || null);
    if (!pid) { pid = c.sellerId || c.buyerId || null; }
    return { id: pid, name: c.otherName || "this user" };
  }
  function syncLocalBlocked(ids) {
    try { localStorage.setItem("nc2_blocked", JSON.stringify(ids || [])); } catch (e) {}
  }

  /* ---------------- Report sheet ---------------- */
  var REPORT_REASONS = ["Spam", "Scam or Fraud", "Abusive behaviour", "Fake listing", "Wrong category", "Inappropriate content", "Other"];
  /* Capture the thread menu's Report item before the inline handler (its #report-sheet does not exist). */
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('#thread-menu-pop [data-act="report"]') : null;
    if (!b) { return; }
    ev.stopPropagation();
    ev.preventDefault();
    try { var _pop = document.getElementById("thread-menu-pop"); if (_pop) { _pop.hidden = true; } } catch (x) {}
    var c = window.NM_threadConvo;
    if (!c || !c.id) { toast("Open a chat first."); return; }
    var p = peerOf(c);
    if (!p.id) { toast("Could not identify this chat."); return; }
    window.NM_reportOpen({ convoId: c.id, productId: c.productId || null, peerId: p.id, peerName: p.name });
  }, true);

  window.NM_reportOpen = function (opts) {
    var root = $("#nm-report-sheet"); if (!root) { return; }
    root.hidden = false;
    root.innerHTML = '<div class="rps"><h3>Report ' + esc(opts.peerName) + '</h3>' +
      '<p class="rps-sub">Why are you reporting this user? Our team reviews every report.</p>' +
      '<div class="rps-reasons" id="rps-reasons">' +
      REPORT_REASONS.map(function (r) { return '<button data-rsn="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") +
      '</div><textarea id="rps-note" maxlength="500" placeholder="Add details (optional)"></textarea>' +
      '<div class="rps-err" id="rps-err" hidden></div>' +
      '<div class="rps-bt"><button class="rps-no" id="rps-cancel">Cancel</button>' +
      '<button class="rps-post" id="rps-post" disabled>Send report</button></div></div>';
    root.classList.add("on");
    var chosen = null, err = $("#rps-err"), post = $("#rps-post");
    root.querySelectorAll("[data-rsn]").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll("[data-rsn]").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        chosen = b.getAttribute("data-rsn");
        post.disabled = false;
        err.hidden = true;
      });
    });
    $("#rps-cancel").addEventListener("click", window.NM_reportClose);
    post.addEventListener("click", function () {
      if (!chosen || post.disabled) { return; }
      post.disabled = true;
      post.textContent = "Sending\u2026";
      err.hidden = true;
      var note = ($("#rps-note") || {}).value || "";
      window.NM_DB.fileChatReport({ convoId: opts.convoId, productId: opts.productId, peerName: opts.peerName, reason: chosen, note: note })
        .then(function () {
          root.innerHTML = '<div class="rps"><div class="rps-okline">\u2713 Report received</div><h3>Thank you</h3>' +
            '<p class="rps-sub">Thank you. Our team will review this conversation. You will get feedback in Notifications.</p>' +
            '<button class="rps-post" id="rps-done">Done</button></div>';
          $("#rps-done").addEventListener("click", window.NM_reportClose);
          toast("Report sent. Thank you.");
        })
        .catch(function (e) {
          post.disabled = false;
          post.textContent = "Send report";
          err.textContent = (e && e.message) || "Could not send the report. Check your connection and try again.";
          err.hidden = false;
        });
    });
  };
  window.NM_reportClose = function () {
    var root = $("#nm-report-sheet");
    if (root) { root.classList.remove("on"); root.innerHTML = ""; try { root.hidden = true; } catch (e) {} }
  };

  /* ---------------- Block / unblock ---------------- */
  function blockConfirmSheet(peerName, isBlocked, onYes, onCancel) {
    var root = $("#nm-report-sheet"); if (!root) { return; }
    root.hidden = false;
    root.innerHTML = '<div class="rps"><h3>' + (isBlocked ? "Unblock " : "Block ") + esc(peerName) + "?</h3>" +
      '<p class="rps-sub">' + (isBlocked
        ? "You will see their chats, listings and statuses again."
        : "They won't be able to message you, and you won't see their listings or statuses.") + "</p>" +
      '<div class="rps-bt"><button class="rps-no" id="rps-cancel">Cancel</button>' +
      '<button class="rps-post rps-danger" id="rps-yes">' + (isBlocked ? "Unblock" : "Block") + "</button></div></div>";
    root.classList.add("on");
    $("#rps-cancel").addEventListener("click", function () { try { if (onCancel) { onCancel(); } } catch (e) {} window.NM_reportClose(); });
    var yes = $("#rps-yes");
    yes.addEventListener("click", function () {
      yes.disabled = true;
      yes.textContent = (isBlocked ? "Unblocking\u2026" : "Blocking\u2026");
      onYes();
    });
  }
  var _btBusy = {};
  window.NM_blockToggle = function (peerId, peerName) {
    var DB = window.NM_DB;
    if (!DB || !peerId) { toast("Could not update block."); return; }
    if (_btBusy[peerId]) { return; }
    _btBusy[peerId] = 1;
    peerName = peerName || "this user";
    function done() { _btBusy[peerId] = 0; }
    DB.isBlocked(peerId).then(function (blocked) {
      blockConfirmSheet(peerName, blocked, function () {
        (blocked ? DB.unblockUser(peerId) : DB.blockUser(peerId)).then(function () {
          return DB.blockedIds(true);
        }).then(function (ids) {
          syncLocalBlocked(ids);
          try { var _pop = document.getElementById("thread-menu-pop"); if (_pop) { _pop._built = false; } } catch (x) {}
          window.NM_reportClose();
          toast(blocked ? ("Unblocked " + peerName + ".") : ("Blocked " + peerName + ". You won't see their chats or listings."));
          if (window.NM_blockUI) { try { window.NM_blockUI(peerId); } catch (e) {} }
          if (!blocked) {
            /* Leave the thread: their conversation disappears from the inbox. */
            if (window.NM_show) { try { window.NM_show("inbox"); } catch (e) {} }
          } else {
            refreshThreadBlockUI();
          }
          refreshDetailBlockUI();
          paintBlockedRow();
          /* Seller screen: re-render the Follow/Block row in the new state. */
          try { if ($("#seller-body .store-meta")) { window.NM_followUI(peerId); } } catch (e) {}
          done();
        }).catch(function (e) {
          window.NM_reportClose();
          toast((e && e.message) || "Could not update block. Check your connection.");
          done();
        });
      }, done);
    }).catch(function () { toast("Could not check block status."); done(); });
  };
  /* Capture the thread menu's Block item (inline handler is localStorage-only). */
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('#thread-menu-pop [data-act="block"]') : null;
    if (!b) { return; }
    ev.stopPropagation();
    ev.preventDefault();
    try { var _pop2 = document.getElementById("thread-menu-pop"); if (_pop2) { _pop2.hidden = true; } } catch (x) {}
    var c = window.NM_threadConvo;
    if (!c || !c.id) { toast("Open a chat first."); return; }
    var p = peerOf(c);
    if (!p.id) { toast("Cannot block this chat."); return; }
    window.NM_blockToggle(p.id, p.name);
  }, true);
  /* The thread's own Unblock button (shown on the blocked banner). */
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("#thread-unblock") : null;
    if (!b) { return; }
    ev.stopPropagation();
    ev.preventDefault();
    var c = window.NM_threadConvo;
    if (!c || !c.id) { return; }
    var p = peerOf(c);
    if (!p.id) { return; }
    window.NM_blockToggle(p.id, p.name);
  }, true);
  function refreshThreadBlockUI() {
    try {
      var c = window.NM_threadConvo; if (!c) { return; }
      var p = peerOf(c); if (!p.id) { return; }
      window.NM_DB.isBlocked(p.id).then(function (blocked) {
        var banner = $("#thread-blocked"), form = $("#thread-form"), qr = $("#quick-replies");
        var nm = banner && banner.querySelector(".tb-name");
        if (banner) { banner.hidden = !blocked; }
        if (nm) { nm.textContent = p.name; }
        if (form) { form.style.display = blocked ? "none" : ""; }
        if (qr) { qr.style.display = blocked ? "none" : ""; }
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------------- Blocked seller on the item page ---------------- */
  function refreshDetailBlockUI() {
    try {
      var prod = window.NM_detailProduct;
      var body = $("#detail-body");
      if (!prod || !body || !prod.sellerId) { return; }
      var my = me();
      if (String(my) === String(prod.sellerId)) { return; }
      window.NM_DB.isBlocked(prod.sellerId).then(function (blocked) {
        var chatBtn = $("#detail-chat");
        var old = $("#d-blocked-note");
        if (old) { old.remove(); }
        if (chatBtn) {
          if (blocked) {
            chatBtn.disabled = true;
            chatBtn.textContent = "You blocked this seller";
            chatBtn.classList.add("is-blocked");
          } else {
            chatBtn.disabled = false;
            chatBtn.classList.remove("is-blocked");
            if (/blocked/i.test(chatBtn.textContent)) { chatBtn.textContent = "Chat seller"; }
          }
        }
        /* Legacy stopgap control removed: the follow bar carries Block/Unblock now. */
        var legacy = $("#d-unblock");
        if (legacy) { legacy.remove(); }
      }).catch(function () {});
    } catch (e) {}
  }
  /* Re-check whenever the detail page re-renders. */
  try {
    var _dbody = $("#detail-body");
    if (_dbody && window.MutationObserver) {
      var _ddeb = null;
      new MutationObserver(function () {
        clearTimeout(_ddeb);
        _ddeb = setTimeout(refreshDetailBlockUI, 350);
      }).observe(_dbody, { childList: true, subtree: true });
    }
  } catch (e) {}

  /* ---------------- Blocked users row on the Me screen ---------------- */
  function paintBlockedRow() {
    try {
      var body = $("#me-body"); if (!body) { return; }
      var old = $("#me-blocked-sec"); if (old) { old.remove(); }
      var DB = window.NM_DB; if (!DB) { return; }
      DB.blockedIds().then(function (ids) {
        var sec = document.createElement("div");
        sec.id = "me-blocked-sec";
        sec.className = "me-sec";
        if (!ids.length) {
          sec.innerHTML = '<button class="me-row" id="me-blocked-toggle"><span>Blocked users</span><span class="me-row-sub">0</span></button><div id="me-blocked-list" hidden></div>';
        } else {
          sec.innerHTML = '<button class="me-row" id="me-blocked-toggle"><span>Blocked users</span><span class="me-row-sub">' + ids.length + "</span></button>" +
            '<div id="me-blocked-list" hidden><div class="me-blocked-loading">Loading\u2026</div></div>';
        }
        body.appendChild(sec);
        $("#me-blocked-toggle").addEventListener("click", function () {
          var l = $("#me-blocked-list");
          if (l) { l.hidden = !l.hidden; }
        });
        if (ids.length) {
          DB.client.from("profiles").select("id,display_name,avatar_url").in("id", ids).then(function (res) {
            var l = $("#me-blocked-list"); if (!l) { return; }
            var rows = (res && res.data) || [];
            if (!rows.length) { l.innerHTML = '<div class="me-blocked-empty">Could not load names.</div>'; return; }
            l.innerHTML = rows.map(function (p) {
              var nm = (p.display_name || "User");
              var av = p.avatar_url ? '<img src="' + esc(p.avatar_url) + '" alt="">' : '<span class="me-b-av">' + esc(nm.trim().charAt(0).toUpperCase()) + "</span>";
              return '<div class="me-b-row"><span class="me-b-avw">' + av + '</span><span class="me-b-nm">' + esc(nm) + '</span>' +
                '<button class="mini-btn" data-unblock="' + esc(p.id) + '" data-uname="' + esc(nm) + '">Unblock</button></div>';
            }).join("");
            l.querySelectorAll("[data-unblock]").forEach(function (btn) {
              btn.addEventListener("click", function () {
                btn.disabled = true;
                btn.textContent = "Unblocking\u2026";
                window.NM_blockToggle(btn.getAttribute("data-unblock"), btn.getAttribute("data-uname"));
              });
            });
          }).catch(function () {
            var l = $("#me-blocked-list");
            if (l) { l.innerHTML = '<div class="me-blocked-empty">Could not load. Check your connection.</div>'; }
          });
        }
      }).catch(function () {});
    } catch (e) {}
  }
  window.NM_paintBlockedRow = paintBlockedRow;
  try {
    var _meb = $("#me-body");
    if (_meb && window.MutationObserver) {
      var _mebDeb = null;
      new MutationObserver(function () {
        clearTimeout(_mebDeb);
        _mebDeb = setTimeout(function () {
          var meScr = $("#screen-me");
          if (meScr && meScr.classList.contains("active") && !$("#me-blocked-sec")) { paintBlockedRow(); }
        }, 500);
      }).observe(_meb, { childList: true, subtree: true });
    }
  } catch (e) {}

  /* ---------------- Updates + notifications: hide blocked sellers' statuses ----------------
     Filtered at the data layer so the rail, viewer and derived notification items
     never see them. */
  (function () {
    var DB = window.NM_DB;
    if (DB && DB.listStatuses && !DB.listStatuses._blkWrapped) {
      var orig = DB.listStatuses.bind(DB);
      DB.listStatuses = function (userIds) {
        return orig(userIds).then(function (rows) {
          return DB.blockedIds().then(function (ids) {
            if (!ids.length) { return rows; }
            return (rows || []).filter(function (r) { return ids.indexOf(String(r.user_id)) < 0; });
          }, function () { return rows; });
        });
      };
      DB.listStatuses._blkWrapped = true;
    }
  })();

  /* ---------------- Notifications screen ---------------- */
  var _notifBound = false;
  function notifSeen() { try { return Number(localStorage.getItem("nm_notif_seen") || 0); } catch (e) { return 0; } }
  function markNotifsSeen() { try { localStorage.setItem("nm_notif_seen", String(Date.now())); } catch (e) {} }
  function bindNotifLive() {
    if (_notifBound) { return; }
    _notifBound = true;
    try {
      var DB = window.NM_DB; if (!DB || !DB.onLive) { return; }
      DB.onLive("notifications", function () {
        window.NM_notifBadge(true);
        var ns = document.getElementById("screen-notifs");
        if (ns && ns.classList.contains("active")) { window.NM_notifsOpen(); }
      });
      DB.onLive("statuses", function () { window.NM_notifBadge(true); });
      DB.onLive("products", function () { window.NM_notifBadge(true); });
    } catch (e) {}
  }
  try {
    var _ns = document.getElementById("screen-notifs");
    if (_ns && window.MutationObserver) {
      new MutationObserver(function () {
        if (_ns.classList.contains("active")) { window.NM_notifsOpen(); }
      }).observe(_ns, { attributes: true, attributeFilter: ["class"] });
    }
  } catch (e) {}

  function kindIcon(kind) {
    var cls = "nt-ic", glyph = "\u2022";
    if (kind === "report_feedback") { cls += " nt-ic-report"; glyph = "\u2713"; }
    else if (kind === "announcement") { cls += " nt-ic-ann"; glyph = "\u25c8"; }
    else if (kind === "status") { cls += " nt-ic-status"; glyph = "\u25cb"; }
    else if (kind === "listing") { cls += " nt-ic-list"; glyph = "\u25a3"; }
    else if (kind === "premium") { cls += " nt-ic-prem"; glyph = "\u2666"; }
    return '<span class="' + cls + '">' + glyph + "</span>";
  }
  function collectNotifs() {
    var DB = window.NM_DB;
    var out = [];
    var seen = notifSeen();
    function push(kind, title, body, at, go) {
      out.push({ kind: kind, title: title, body: body, at: at, go: go, fresh: (at || 0) > seen });
    }
    return DB.listNotifications().then(function (rows) {
      (rows || []).forEach(function (r) {
        push(r.kind || "announcement", r.title || "Notification", r.body || "", Date.parse(r.created_at) || 0, null);
      });
      return DB.followingProfiles().catch(function () { return []; });
    }).then(function (profiles) {
      var ids = (profiles || []).map(function (p) { return p.id; });
      if (!ids.length) { return { items: out, profiles: profiles }; }
      var week = Date.now() - 7 * 864e5;
      return DB.listStatuses(ids).then(function (st) {
        (st || []).forEach(function (r) {
          var at = Date.parse(r.created_at) || 0;
          if (at < week) { return; }
          var p = null;
          (profiles || []).forEach(function (x) { if (String(x.id) === String(r.user_id)) { p = x; } });
          push("status", (p ? (p.display_name || "A seller") : "A seller") + " posted a status", "", at, { screen: "updates" });
        });
        return DB.listProducts({}).catch(function () { return []; });
      }).then(function (prods) {
        (prods || []).forEach(function (p) {
          if (ids.indexOf(p.sellerId) < 0) { return; }
          var at = p.at || 0;
          if (at < week) { return; }
          push("listing", (p.sellerName || "A seller") + " listed " + (p.title || "an item"), "", at, { product: p.id });
        });
        return { items: out, profiles: profiles };
      });
    }).then(function (r) {
      return DB.premiumStatus().catch(function () { return null; }).then(function (ps) {
        if (ps && !ps.demo && ps.until) {
          var until = Date.parse(ps.until) || 0, now = Date.now();
          var days = Math.ceil((until - now) / 864e5);
          if (days >= 0 && days <= 7) {
            push("premium", "Your Premium expires " + (days === 0 ? "today" : "in " + days + " day" + (days === 1 ? "" : "s")), "Renew to keep unlimited listings.", until, { premium: 1 });
          } else if (days < 0 && days >= -7) {
            push("premium", "Your Premium has expired", "Renew to keep unlimited listings.", now, { premium: 1 });
          }
        }
        r.items.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        return r.items;
      });
    });
  }
  window.NM_notifsOpen = function () {
    var DB = window.NM_DB; if (!DB) { return; }
    var body = $("#notifs-body"); if (!body) { return; }
    body.innerHTML = '<div class="nt-loading"><span class="nt-spin"></span>Loading notifications\u2026</div>';
    bindNotifLive();
    collectNotifs().then(function (items) {
      markNotifsSeen();
      window.NM_notifBadge(true);
      if (!items.length) {
        body.innerHTML = '<div class="nt-empty"><div class="nt-empty-ic">\u25cb</div><h3>No notifications yet</h3><p>Follow sellers to hear about their new listings and statuses. Report updates and announcements appear here too.</p></div>';
        return;
      }
      body.innerHTML = items.map(function (n, i) {
        var inner = kindIcon(n.kind) +
          '<span class="nt-tx"><b>' + esc(n.title) + "</b>" + (n.body ? "<span>" + esc(n.body) + "</span>" : "") +
          '<em>' + esc(rel(new Date(n.at || Date.now()).toISOString())) + "</em></span>" +
          (n.fresh ? '<i class="nt-dot"></i>' : "");
        if (!n.go) { return '<div class="nt-row nt-static' + (n.fresh ? " fresh" : "") + '">' + inner + "</div>"; }
        return '<button class="nt-row' + (n.fresh ? " fresh" : "") + '" data-ni="' + i + '">' + inner + "</button>";
      }).join("");
      window._nmNotifItems = items;
      body.querySelectorAll("[data-ni]").forEach(function (b) {
        b.addEventListener("click", function () {
          var n = (window._nmNotifItems || [])[+b.getAttribute("data-ni")];
          if (!n || !n.go) { return; }
          if (n.go.screen === "updates" && window.NM_show) { window.NM_show("updates"); }
          else if (n.go.product && window.NM_openDetail) { window.NM_openDetail(n.go.product); }
          else if (n.go.premium && window.NM_showPremium) { window.NM_showPremium({}); }
        });
      });
    }).catch(function () {
      body.innerHTML = '<div class="nt-empty"><h3>Could not load notifications</h3><p>Check your connection and try again.</p><button class="btn-primary" onclick="window.NM_notifsOpen()" style="margin-top:14px">Try again</button></div>';
    });
  };
  var _badgeBusy = false, _badgeQueued = false, _badgeAt = 0;
  window.NM_notifBadge = function (force) {
    try {
      var badge = $("#notif-badge"); if (!badge) { return; }
      if (!me()) { badge.hidden = true; return; }
      var now = Date.now();
      if (!force && now - _badgeAt < 6000) { return; }
      _badgeAt = now;
      if (_badgeBusy) { _badgeQueued = true; return; }
      _badgeBusy = true;
      collectNotifs().then(function (items) {
        var n = items.filter(function (x) { return x.fresh; }).length;
        if (n > 0) { badge.hidden = false; badge.textContent = n > 99 ? "99+" : String(n); }
        else { badge.hidden = true; }
      }).catch(function () {}).then(function () {
        _badgeBusy = false;
        if (_badgeQueued) { _badgeQueued = false; window.NM_notifBadge(); }
      });
    } catch (e) {}
  };
  /* Badge triggers: boot (now + 4s prime), login/home render, tab return, realtime. */
  try {
    bindNotifLive();
    if (me()) { window.NM_notifBadge(true); }
    setTimeout(function () { if (me()) { window.NM_notifBadge(true); } }, 4000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden && me()) { window.NM_notifBadge(); } });
    var _sh = document.getElementById("screen-home");
    if (_sh && window.MutationObserver) {
      new MutationObserver(function () {
        if (_sh.classList.contains("active") && me()) { window.NM_notifBadge(); }
      }).observe(_sh, { attributes: true, attributeFilter: ["class"] });
    }
  } catch (e) {}

  /* ---------------- Global top loadbar ---------------- */
  var _lbT = null;
  window.NM_loadbarStart = function () {
    var b = $("#nm-loadbar"); if (!b) { return; }
    b.classList.remove("done"); b.classList.add("on");
    clearTimeout(_lbT);
    _lbT = setTimeout(window.NM_loadbarDone, 5000);
  };
  window.NM_loadbarDone = function () {
    var b = $("#nm-loadbar"); if (!b) { return; }
    clearTimeout(_lbT);
    b.classList.add("done");
    setTimeout(function () { b.classList.remove("on"); b.classList.remove("done"); }, 450);
  };
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest("[data-go]") : null;
    if (!t) { return; }
    var go = t.getAttribute("data-go");
    window.NM_loadbarStart();
    var scr = document.getElementById("screen-" + go);
    var finished = false;
    function done() { if (!finished) { finished = true; window.NM_loadbarDone(); } try { obs.disconnect(); } catch (e) {} }
    var obs = null, deb = null;
    if (scr && window.MutationObserver) {
      obs = new MutationObserver(function () {
        clearTimeout(deb);
        deb = setTimeout(done, 700);
      });
      obs.observe(scr, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
    setTimeout(done, 1200);
  }, true);

  /* ---------------- Action-button pending states ---------------- */
  /* Follow buttons: disable while the toggle is in flight. */
  var _origFollowToggle = window.NM_followToggle;
  if (_origFollowToggle && !window.NM_followToggle._busyWrapped) {
    window.NM_followToggle = function (sellerId) {
      var btns = document.querySelectorAll('[data-fbtn="' + sellerId + '"]');
      btns.forEach(function (b) { b.disabled = true; b.classList.add("busy"); });
      window.NM_loadbarStart();
      try {
        _origFollowToggle(sellerId);
      } finally {
        setTimeout(function () {
          btns.forEach(function (b) { b.disabled = false; b.classList.remove("busy"); });
          window.NM_loadbarDone();
        }, 1500);
      }
    };
    window.NM_followToggle._busyWrapped = true;
  }
  /* Payment starts: honest feedback while the checkout initializes. */
  (function () {
    var DB = window.NM_DB;
    if (DB && DB.startPayment && !DB.startPayment._nmWrapped) {
      var orig = DB.startPayment.bind(DB);
      DB.startPayment = function (plan, targetId) {
        window.NM_loadbarStart();
        toast("Opening secure checkout\u2026");
        return orig(plan, targetId).then(function (r) { return r; }, function (e) {
          window.NM_loadbarDone();
          toast((e && e.message) || "Could not start payment. Check your connection.");
          throw e;
        });
      };
      DB.startPayment._nmWrapped = true;
    }
  })();

  /* Boot: sync server blocks into localStorage so the inline thread UI stays truthful. */
  try {
    setTimeout(function () {
      var DB = window.NM_DB;
      if (DB && me()) { DB.blockedIds().then(syncLocalBlocked).catch(function () {}); }
    }, 3500);
  } catch (e) {}

  /* ---------------- Home header avatar (replaces the generic person icon) ---------------- */
  window.NM_paintHomeAvatar = function () {
    try {
      var img = $("#home-avatar"), fb = $("#home-avatar-fb");
      if (!img) { return; }
      var u = null;
      try { u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); } catch (e) {}
      var url = u && (u.avatar_url || u.avatarUrl);
      var nm = (u && (u.display_name || u.name || u.email || "?")) || "?";
      if (url) {
        img.src = url; img.hidden = false;
        if (fb) { fb.hidden = true; }
      } else {
        img.hidden = true;
        if (fb) { fb.hidden = false; fb.textContent = String(nm).trim().charAt(0).toUpperCase() || "?"; }
      }
    } catch (e) {}
  };
  try {
    var _home = $("#screen-home");
    if (_home && window.MutationObserver) {
      new MutationObserver(function () {
        if (_home.classList.contains("active")) { window.NM_paintHomeAvatar(); }
      }).observe(_home, { attributes: true, attributeFilter: ["class"] });
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", window.NM_paintHomeAvatar); }
    else { window.NM_paintHomeAvatar(); }
  } catch (e) {}
})();
