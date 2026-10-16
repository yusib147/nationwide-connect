/* ===== nm-reviews v2: seller feedback, Jiji model (2026-10-16) =====
   Feedback belongs to the SELLER, not the product: it shows on every item
   page and in the seller's store. "Leave feedback" uses smiley ratings and
   asks the buyer to confirm they contacted or dealt with the seller
   (auto-confirmed when they have chatted with the seller in the app).
   Feedback publishes at once; the status column leaves room for an admin
   moderation queue later. */
;(function () {
  "use strict";
  var DB = window.NM_DB;
  if (!DB) return;
  function SB() { return window.NM_DB && window.NM_DB.client; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function toast(m) { try { if (window.NM_toast) { window.NM_toast(m); return; } } catch (e) {} try { alert(m); } catch (e) {} }
  var FACES = ["", "😠", "😕", "😐", "🙂", "😍"];
  var FACE_LB = ["", "Very bad", "Bad", "Okay", "Good", "Excellent"];
  function starsStr(avg) {
    var full = Math.round(avg || 0), out = "";
    for (var i = 1; i <= 5; i++) out += '<span class="' + (i <= full ? "on" : "off") + '">★</span>';
    return '<span class="nm-rev-stars">' + out + "</span>";
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function avgOf(list) { if (!list.length) return 0; var s = 0; list.forEach(function (r) { s += Number(r.rating) || 0; }); return s / list.length; }
  function fetchSellerReviews(sid) {
    return SB().from("reviews").select("*").eq("seller_id", sid).eq("status", "active").order("created_at", { ascending: false }).limit(40)
      .then(function (r) { return (r && r.data) || []; });
  }
  function me() { return DB.currentUser ? DB.currentUser().catch(function () { return null; }) : Promise.resolve(null); }
  function myName(u) {
    if (u && (u.name || u.display_name)) return u.name || u.display_name;
    try { var c = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); if (c && (c.name || c.display_name)) return c.name || c.display_name; } catch (e) {}
    return "Buyer";
  }
  try {
    var css = ""
      + ".nm-rev-block{margin-top:20px;border-top:1px solid var(--line-soft);padding-top:16px}"
      + ".nm-rev-hd{display:flex;align-items:center;gap:9px;flex-wrap:wrap}"
      + ".nm-rev-hd h3{margin:0;font-size:16px;font-weight:800;color:var(--ink)}"
      + ".nm-rev-stars{font-size:15px;letter-spacing:1.5px;line-height:1}"
      + ".nm-rev-stars .on{color:#f59e0b}.nm-rev-stars .off{color:var(--line)}"
      + ".nm-rev-count{font-size:13px;color:var(--muted);font-weight:600}"
      + ".nm-rev-btn{margin-left:auto;border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:9px 18px;font-weight:700;font-size:13.5px;cursor:pointer}"
      + ".nm-rev-btn:active{transform:scale(.97)}"
      + ".nm-rev-note{font-size:13.5px;color:var(--muted);margin-top:8px;line-height:1.5}"
      + ".nm-rev-item{padding:13px 0;border-bottom:1px solid var(--line-soft)}"
      + ".nm-rev-item:last-child{border-bottom:0}"
      + ".nm-rev-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}"
      + ".nm-rev-face{font-size:17px;line-height:1}"
      + ".nm-rev-name{font-weight:800;font-size:14px;color:var(--ink)}"
      + ".nm-rev-date{font-size:12px;color:var(--faint);font-weight:600}"
      + ".nm-rev-prod{font-size:12px;color:var(--acc2);font-weight:700}"
      + ".nm-rev-cmt{font-size:14px;line-height:1.55;color:var(--ink);margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere}"
      + ".nm-rev-mine{font-size:11px;font-weight:800;color:var(--acc2);border:1px solid var(--acc2);border-radius:999px;padding:1px 8px}"
      + ".nm-rev-form{margin-top:16px;border-top:1px solid var(--line-soft);padding-top:14px}"
      + ".nm-rev-form h4{margin:0 0 8px;font-size:14.5px;font-weight:800;color:var(--ink)}"
      + ".nm-rev-pick{display:flex;gap:6px;margin-bottom:4px}"
      + ".nm-rev-pick button{background:var(--card);border:1.5px solid var(--line);border-radius:14px;font-size:27px;line-height:1.25;padding:4px 9px;cursor:pointer}"
      + ".nm-rev-pick button.on{border-color:#f59e0b;background:rgba(245,158,11,.13);transform:scale(1.07)}"
      + ".nm-rev-facelb{font-size:12.5px;font-weight:700;color:var(--muted);min-height:16px;margin-bottom:8px}"
      + ".nm-rev-ta{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);padding:11px 13px;font-size:14px;font-family:inherit;min-height:74px;resize:vertical}"
      + ".nm-rev-ta:focus{outline:0;border-color:var(--acc2)}"
      + ".nm-rev-confirm{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;font-weight:600;color:var(--ink);margin-top:12px;line-height:1.45;cursor:pointer}"
      + ".nm-rev-confirm input{width:18px;height:18px;margin-top:1px;flex:none;accent-color:#e8380d}"
      + ".nm-rev-actions{display:flex;gap:10px;margin-top:12px}"
      + ".nm-rev-post{flex:1;border:0;border-radius:999px;background:var(--acc-grad);color:#fff;font-weight:800;font-size:14.5px;padding:13px;cursor:pointer}"
      + ".nm-rev-post[disabled]{opacity:.55}"
      + ".nm-rev-del{border:1.5px solid var(--line);background:none;color:#e02424;border-radius:999px;font-weight:700;padding:12px 18px;cursor:pointer}"
      + ".nm-rev-store{margin:16px 14px 4px;background:var(--card);border:1px solid var(--line-soft);border-radius:20px;padding:16px 18px;box-shadow:var(--shadow-card)}"
      + ".nm-rev-store h3{margin:0;font-size:16px;font-weight:800;color:var(--ink)}";
    var st = document.createElement("style");
    st.id = "nm-reviews-css";
    st.textContent = css;
    document.head.appendChild(st);
  } catch (e) {}

  function itemHtml(r, uid, titles) {
    var mine = uid && String(r.buyer_id) === String(uid);
    return '<div class="nm-rev-item"><div class="nm-rev-top"><span class="nm-rev-face">' + (FACES[Number(r.rating)] || "") + '</span><span class="nm-rev-name">' + esc(r.buyer_name || "Buyer") + "</span>"
      + starsStr(r.rating)
      + (mine ? '<span class="nm-rev-mine">Your feedback</span>' : "")
      + '<span class="nm-rev-date">' + esc(fmtDate(r.created_at)) + "</span></div>"
      + (titles && r.product_id && titles[r.product_id] ? '<div class="nm-rev-prod">On: ' + esc(titles[r.product_id]) + "</div>" : "")
      + (r.comment ? '<div class="nm-rev-cmt">' + esc(r.comment) + "</div>" : "")
      + "</div>";
  }
  function titlesFor(list) {
    var ids = [];
    list.forEach(function (r) { if (r.product_id && ids.indexOf(r.product_id) < 0) ids.push(r.product_id); });
    if (!ids.length) return Promise.resolve({});
    return SB().from("products").select("id,title").in("id", ids).then(function (pr) {
      var t = {}; ((pr && pr.data) || []).forEach(function (p) { t[p.id] = p.title; }); return t;
    }).catch(function () { return {}; });
  }
  function openFeedback(o) {
    var old = document.getElementById("nm-rev-scrim");
    if (old) old.remove();
    var scrim = document.createElement("div");
    scrim.className = "sheet-scrim";
    scrim.id = "nm-rev-scrim";
    scrim.innerHTML = '<div class="sheet" role="dialog" aria-label="Seller feedback"><div class="sheet-head"><h3>Feedback' + (o.sellerName ? " for " + esc(o.sellerName) : "") + '</h3><button type="button" class="icon-btn" id="nm-rev-x" aria-label="Close">✕</button></div><div id="nm-rev-main"><p class="nm-rev-note">Loading feedback…</p></div></div>';
    document.body.appendChild(scrim);
    function close() { scrim.remove(); }
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    scrim.querySelector("#nm-rev-x").addEventListener("click", close);
    var main = scrim.querySelector("#nm-rev-main");
    Promise.all([fetchSellerReviews(o.sellerId), me()]).then(function (res) {
      var list = res[0], u = res[1], uid = u && u.id;
      return titlesFor(list).then(function (titles) { return { list: list, uid: uid, u: u, titles: titles }; });
    }).then(function (ctx) {
      var list = ctx.list, uid = ctx.uid, titles = ctx.titles;
      var mine = null;
      list.forEach(function (r) {
        if (!uid || String(r.buyer_id) !== String(uid)) return;
        if (o.product && String(r.product_id) === String(o.product.id)) mine = r;
        if (!o.product && !r.product_id && !mine) mine = r;
      });
      var html = '<div class="nm-rev-hd">' + starsStr(avgOf(list)) + '<span class="nm-rev-count">' + (list.length ? (avgOf(list).toFixed(1) + " · " + list.length + (list.length === 1 ? " review" : " reviews")) : "No feedback yet") + "</span></div>";
      html += list.length ? list.map(function (r) { return itemHtml(r, uid, titles); }).join("") : '<p class="nm-rev-note">No one has left feedback for this seller yet.</p>';
      var isOwn = uid && String(o.sellerId) === String(uid);
      if (!uid) {
        html += '<p class="nm-rev-note">Log in to leave feedback.</p>';
      } else if (isOwn) {
        html += '<p class="nm-rev-note">Buyers leave feedback about you here after dealing with you.</p>';
      } else {
        html += '<div class="nm-rev-form"><h4>' + (mine ? "Your feedback" : "Leave feedback") + '</h4><div class="nm-rev-pick" id="nm-rev-pick">'
          + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-v="' + n + '" aria-label="' + FACE_LB[n] + '">' + FACES[n] + "</button>"; }).join("")
          + '</div><div class="nm-rev-facelb" id="nm-rev-facelb"></div>'
          + '<textarea class="nm-rev-ta" id="nm-rev-ta" placeholder="How was the communication? Were you happy with the item and the delivery?">' + esc(mine ? mine.comment || "" : "") + "</textarea>"
          + '<label class="nm-rev-confirm"><input type="checkbox" id="nm-rev-confirm"><span>I have contacted or dealt with this seller</span></label>'
          + '<div class="nm-rev-actions"><button type="button" class="nm-rev-post" id="nm-rev-post">' + (mine ? "Update feedback" : "Send feedback") + "</button>"
          + (mine ? '<button type="button" class="nm-rev-del" id="nm-rev-del">Delete</button>' : "")
          + "</div></div>";
      }
      main.innerHTML = html;
      var pick = main.querySelector("#nm-rev-pick");
      if (!pick) return;
      var sel = mine ? Number(mine.rating) || 0 : 0;
      var lb = main.querySelector("#nm-rev-facelb");
      var paint = function () {
        pick.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", Number(b.getAttribute("data-v")) <= sel && Number(b.getAttribute("data-v")) === sel); });
        if (lb) lb.textContent = sel ? FACE_LB[sel] : "Tap a face to rate your experience";
      };
      paint();
      pick.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-v]");
        if (b) { sel = Number(b.getAttribute("data-v")); paint(); }
      });
      var confirmBox = main.querySelector("#nm-rev-confirm");
      try {
        SB().from("conversations").select("id").eq("seller_id", o.sellerId).eq("buyer_id", uid).limit(1).then(function (r) {
          if (r && r.data && r.data.length && confirmBox) { confirmBox.checked = true; }
        }).catch(function () {});
      } catch (e) {}
      var postBtn = main.querySelector("#nm-rev-post");
      postBtn.addEventListener("click", function () {
        if (!sel) { toast("Please tap a face to rate your experience first."); return; }
        if (confirmBox && !confirmBox.checked) { toast("Please confirm you have contacted or dealt with this seller."); return; }
        postBtn.disabled = true;
        var done = function (r) {
          postBtn.disabled = false;
          if (r && r.error) { toast("Could not save your feedback. Please try again."); return; }
          toast(mine ? "Feedback updated. Thank you." : "Feedback sent. Thank you.");
          close();
          refreshBlocks(o.sellerId);
        };
        var payload = { rating: sel, comment: (main.querySelector("#nm-rev-ta").value || "").trim(), buyer_name: myName(ctx.u) };
        if (mine) {
          SB().from("reviews").update(payload).eq("id", mine.id).then(done).catch(function () { done({ error: 1 }); });
        } else if (o.product) {
          var row = { product_id: o.product.id, seller_id: o.sellerId, buyer_id: uid, status: "active" };
          for (var k in payload) row[k] = payload[k];
          SB().from("reviews").upsert(row, { onConflict: "product_id,buyer_id" }).then(done).catch(function () { done({ error: 1 }); });
        } else {
          var row2 = { product_id: null, seller_id: o.sellerId, buyer_id: uid, status: "active" };
          for (var k2 in payload) row2[k2] = payload[k2];
          SB().from("reviews").insert(row2).then(done).catch(function () { done({ error: 1 }); });
        }
      });
      var delBtn = main.querySelector("#nm-rev-del");
      if (delBtn) delBtn.addEventListener("click", function () {
        delBtn.disabled = true;
        SB().from("reviews").delete().eq("id", mine.id).then(function (r) {
          delBtn.disabled = false;
          if (r && r.error) { toast("Could not delete your feedback. Please try again."); return; }
          toast("Feedback deleted.");
          close();
          refreshBlocks(o.sellerId);
        }).catch(function () { delBtn.disabled = false; });
      });
    }).catch(function () { main.innerHTML = '<p class="nm-rev-note">Could not load feedback. Please try again.</p>'; });
  }
  window.NM_openFeedback = openFeedback;

  function summaryInto(el, list) {
    if (!el) return;
    el.innerHTML = "";
    var holder = document.createElement("span");
    holder.innerHTML = starsStr(avgOf(list));
    el.appendChild(holder.firstChild);
    el.appendChild(document.createTextNode(list.length ? " " + avgOf(list).toFixed(1) + " · " + list.length + (list.length === 1 ? " review" : " reviews") : " No feedback yet"));
  }
  function refreshBlocks(sid) {
    injectDetailBlock(true);
    if (window.__nmRevStoreSid) injectStoreReviews(window.__nmRevStoreSid, true);
  }
  function injectDetailBlock(force) {
    var prod = window.NM_detailProduct;
    var host = document.querySelector("#detail-body .detail-body");
    if (!prod || !prod.id || !prod.sellerId || !host) return;
    var existing = document.getElementById("nm-rev-block");
    if (existing && !force && existing.getAttribute("data-sid") === String(prod.sellerId)) return;
    if (existing) existing.remove();
    var block = document.createElement("div");
    block.className = "nm-rev-block";
    block.id = "nm-rev-block";
    block.setAttribute("data-sid", String(prod.sellerId));
    block.innerHTML = '<div class="nm-rev-hd"><h3>Seller feedback</h3><span class="nm-rev-count" id="nm-rev-sum">Loading…</span><button type="button" class="nm-rev-btn" id="nm-rev-open">Leave feedback</button></div><p class="nm-rev-note" id="nm-rev-first"></p>';
    host.appendChild(block);
    block.querySelector("#nm-rev-open").addEventListener("click", function () {
      openFeedback({ sellerId: prod.sellerId, sellerName: prod.sellerName || "", product: prod });
    });
    fetchSellerReviews(prod.sellerId).then(function (list) {
      summaryInto(document.getElementById("nm-rev-sum"), list);
      var first = document.getElementById("nm-rev-first");
      if (first) first.textContent = list.length ? "" : "Dealt with this seller? Be the first to leave feedback about your experience.";
    }).catch(function () {
      var sum = document.getElementById("nm-rev-sum");
      if (sum) sum.textContent = "";
    });
  }
  function injectStoreReviews(sid, force) {
    var screen = document.getElementById("screen-seller");
    if (!screen || !screen.classList.contains("active")) return;
    var prev = document.getElementById("nm-rev-store");
    if (prev && prev.getAttribute("data-sid") === String(sid) && !force) return;
    if (prev) prev.remove();
    var grid = document.getElementById("store2-grid");
    if (!grid || !grid.parentNode) return;
    window.__nmRevStoreSid = sid;
    var box = document.createElement("div");
    box.className = "nm-rev-store";
    box.id = "nm-rev-store";
    box.setAttribute("data-sid", String(sid));
    box.innerHTML = '<div class="nm-rev-hd"><h3>Feedback</h3><span class="nm-rev-count" id="nm-rev-store-sum">Loading…</span><button type="button" class="nm-rev-btn" id="nm-rev-store-open">Leave feedback</button></div><div id="nm-rev-store-list"></div>';
    grid.parentNode.insertBefore(box, grid);
    box.querySelector("#nm-rev-store-open").addEventListener("click", function () {
      var nm = "";
      try { var h = screen.querySelector(".store2-name, .seller-name, h2"); if (h) nm = h.textContent.trim(); } catch (e) {}
      openFeedback({ sellerId: sid, sellerName: nm, product: null });
    });
    fetchSellerReviews(sid).then(function (list) {
      if (!document.getElementById("nm-rev-store")) return;
      summaryInto(document.getElementById("nm-rev-store-sum"), list);
      var host = document.getElementById("nm-rev-store-list");
      if (!host) return;
      if (!list.length) { host.innerHTML = '<p class="nm-rev-note">This seller has no feedback yet.</p>'; return; }
      titlesFor(list.slice(0, 5)).then(function (titles) {
        host.innerHTML = list.slice(0, 5).map(function (r) { return itemHtml(r, null, titles); }).join("");
      });
    }).catch(function () {
      var host = document.getElementById("nm-rev-store-list");
      if (host) host.innerHTML = '<p class="nm-rev-note">Could not load feedback.</p>';
    });
  }
  var _revInitDone = false;
  function initReviews() {
    if (_revInitDone || !SB()) return;
    _revInitDone = true;
    try {
      var dbody = document.getElementById("detail-body");
      if (dbody && window.MutationObserver) {
        new MutationObserver(function () { injectDetailBlock(false); }).observe(dbody, { childList: true });
      }
      setTimeout(function () { injectDetailBlock(false); }, 1500);
    } catch (e) {}
    try {
      var origStore = window.NM_openStore;
      if (typeof origStore === "function" && !origStore._nmRevWrapped) {
        var wrapped = function (sid) {
          var r = origStore.apply(this, arguments);
          var tries = 0;
          var iv = setInterval(function () {
            tries++;
            injectStoreReviews(sid, false);
            if (document.getElementById("nm-rev-store") || tries > 24) clearInterval(iv);
          }, 250);
          return r;
        };
        wrapped._nmRevWrapped = true;
        window.NM_openStore = wrapped;
      }
    } catch (e) {}
  }
  var _revWait = setInterval(function () { initReviews(); if (_revInitDone) clearInterval(_revWait); }, 300);
  initReviews();
  setTimeout(function () { clearInterval(_revWait); }, 20000);
})();
