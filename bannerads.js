/* Nationwide Media Connect — bannerads.js (2026-10-23 fix, Ibrahim's report).
   1) HOME RAIL: house banner slot + two advertiser slots after #ad-banner.
   2) UPDATES BAND: sponsored status-style band inside the Updates screen.
   3) MY BANNER ADS HUB: replaces the old single-submission page. Every
      banner payment is its own card (payment state, artwork state, live
      dates, days left, preview, the right next action), artwork uploads
      are bound to a CHOSEN payment, and "Buy another banner ad" starts a
      fresh ₦5,000 manual-transfer claim.
   Live ads come from /api/banner-live (service role) because admin_banners
   is RLS-locked and the browser client could never read it — that is why
   approved banners never appeared on the home page. */
;(function () {
  "use strict";
  var PRICE = "₦5,000";
  var WA = "09150951870";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { try { if (window.NM_toast) { window.NM_toast(m); return; } } catch (e) {} }
  function fmtDate(ts) { try { return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function daysLeft(until) { var d = Math.ceil((new Date(until).getTime() - Date.now()) / 864e5); return d < 0 ? 0 : d; }
  function isVid(url) { return /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url || "")); }

  /* ---------------- live ads feed ---------------- */
  var _adsPromise = null;
  function liveAds() {
    if (_adsPromise) return _adsPromise;
    _adsPromise = fetch("/api/banner-live", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j && j.ok && j.ads) || []; })
      .catch(function () { _adsPromise = null; return []; });
    return _adsPromise;
  }
  function mediaHtml(m, cls) {
    if (!m || !m.url) return "";
    if (m.kind === "video" || isVid(m.url)) return '<video class="' + cls + '" src="' + esc(m.url) + '" muted loop playsinline autoplay preload="metadata"></video>';
    return '<img class="' + cls + '" src="' + esc(m.url) + '" alt="" loading="lazy">';
  }
  function goAd(ad) {
    if (!ad) return;
    var link = String(ad.link_url || "").trim();
    var shop = String(ad.shop_url || "").trim();
    var target = link || shop;
    var m = target.match(/[?&]shop=([0-9a-f-]{36})/i);
    if (m && window.NM_openStore) { window.NM_openStore(m[1]); return; }
    if (ad.user_id && !link && window.NM_openStore) { window.NM_openStore(ad.user_id); return; }
    if (!target) { toast("This advertiser has not added a link yet."); return; }
    if (target.indexOf("/p/") === 0 || target.indexOf("/?") === 0) { window.location.href = target; return; }
    if (/^https?:\/\//i.test(target)) { window.open(target, "_blank", "noopener"); return; }
    if (target.charAt(0) === "/" && window.NM_show) { window.NM_show(target.replace(/^\//, "")); return; }
    window.location.href = target;
  }
  function openHub() { if (window.NM_openBannerSubmit) window.NM_openBannerSubmit(); }

  /* ---------------- home rail ---------------- */
  var railDone = false;
  function renderRail() {
    if (railDone) return;
    var anchor = $("#ad-banner");
    var home = $("#screen-home");
    if (!anchor || !home) return;
    railDone = true;
    var rail = document.createElement("div");
    rail.className = "nm-rail";
    rail.id = "nm-ad-rail";
    rail.innerHTML = '<div class="nm-rail-head"><b>Featured businesses</b><span>Sponsored</span></div><div class="nm-rail-track" id="nm-rail-track"></div>';
    anchor.parentNode.insertBefore(rail, anchor.nextSibling);
    var track = rail.querySelector("#nm-rail-track");
    var house = document.createElement("button");
    house.type = "button";
    house.className = "nm-rail-card nm-rail-house";
    house.innerHTML = '<div class="nm-rail-ph"><div class="nm-rail-big">Nationwide <span style="color:var(--acc2)">Media Connect</span></div><div class="nm-rail-small">Nigeria\u2019s marketplace \u2014 buy and sell anything, right from your phone.</div></div>' +
      '<div class="nm-rail-body"><div class="nm-rail-kick">House</div><div class="nm-rail-title">Shop. Sell. Nationwide.</div><div class="nm-rail-sub">Phones, cars, fashion and more from real sellers near you.</div><span class="nm-rail-cta">Start selling</span></div>';
    house.addEventListener("click", function () { if (window.NM_show) window.NM_show("sell"); });
    track.appendChild(house);
    function placeholder() {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "nm-rail-card";
      b.innerHTML = '<div class="nm-rail-ph"><div class="nm-rail-big">Your business here</div><div class="nm-rail-small">This space sits on the home page, in front of every buyer who visits.</div></div>' +
        '<div class="nm-rail-body"><div class="nm-rail-kick">Advertise</div><div class="nm-rail-title">' + PRICE + ' for 2 weeks</div><div class="nm-rail-sub">One payment. Your video or pictures live here for a full 2 weeks.</div><span class="nm-rail-cta">Advertise now</span></div>';
      b.addEventListener("click", openHub);
      return b;
    }
    liveAds().then(function (ads) {
      ads.slice(0, 6).forEach(function (ad) {
        var c = document.createElement("button");
        c.type = "button";
        c.className = "nm-rail-card";
        var first = (ad.media && ad.media[0]) || null;
        c.innerHTML = (first ? mediaHtml(first, "nm-rail-media") : '<div class="nm-rail-ph"><div class="nm-rail-big">' + esc(ad.business || ad.title) + "</div></div>") +
          '<div class="nm-rail-body"><div class="nm-rail-kick">Sponsored</div><div class="nm-rail-title">' + esc(ad.title || ad.business || "Sponsored") + "</div>" +
          (ad.subtitle ? '<div class="nm-rail-sub">' + esc(ad.subtitle) + "</div>" : "") +
          '<span class="nm-rail-cta">Visit shop</span></div>';
        c.addEventListener("click", function () { goAd(ad); });
        track.appendChild(c);
      });
      var shown = Math.min(ads.length, 6);
      for (var i = shown; i < 2; i++) track.appendChild(placeholder());
    });
  }

  /* ---------------- Updates sponsored band ---------------- */
  var bandDone = false;
  function renderBand() {
    if (bandDone) return;
    var scr = $("#screen-updates");
    if (!scr) return;
    bandDone = true;
    var band = document.createElement("div");
    band.className = "nm-band";
    band.id = "nm-sponsored-band";
    band.innerHTML = '<div class="nm-band-head"><b>Sponsored</b><span>Ads</span></div><div class="nm-band-track" id="nm-band-track"></div>';
    var rail = $("#upd-rail", scr);
    if (rail && rail.parentNode === scr) scr.insertBefore(band, rail.nextSibling);
    else scr.appendChild(band);
    var track = band.querySelector("#nm-band-track");
    liveAds().then(function (ads) {
      if (!ads.length) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nm-band-card";
        b.innerHTML = '<div class="nm-band-ph"><div class="nm-band-biz">Your business here</div><div class="nm-band-sub">Sponsored space on the home page and here in Updates.</div></div>' +
          '<div class="nm-band-body"><div class="nm-band-biz">Advertise on Nationwide</div><div class="nm-band-sub">' + PRICE + ' for 2 weeks \u00B7 video or pictures \u00B7 live after a quick review.</div><span class="nm-band-cta">Advertise now</span></div>';
        b.addEventListener("click", openHub);
        track.appendChild(b);
        return;
      }
      ads.slice(0, 8).forEach(function (ad) {
        var c = document.createElement("button");
        c.type = "button";
        c.className = "nm-band-card";
        var first = (ad.media && ad.media[0]) || null;
        c.innerHTML = (first ? mediaHtml(first, "nm-band-media") : '<div class="nm-band-ph"><div class="nm-band-biz">' + esc(ad.business || ad.title) + "</div></div>") +
          '<div class="nm-band-body"><div class="nm-band-biz">' + esc(ad.business || ad.title || "Sponsored") + "</div>" +
          (ad.subtitle || ad.title ? '<div class="nm-band-sub">' + esc(ad.subtitle || ad.title) + "</div>" : "") +
          '<span class="nm-band-cta">Visit shop \u203A</span></div>';
        c.addEventListener("click", function () { goAd(ad); });
        track.appendChild(c);
      });
    });
  }

  function bootAds() {
    renderRail(); renderBand();
    if (railDone && bandDone) return;
    var n = 0;
    var iv = setInterval(function () { renderRail(); renderBand(); if ((railDone && bandDone) || ++n > 30) clearInterval(iv); }, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootAds); else bootAds();

  /* ================= My banner ads hub ================= */
  var BUCKET = "banner-artwork";
  var MAX_VIDEO_BYTES = 25 * 1024 * 1024;
  var MAX_PIC_BYTES = 5 * 1024 * 1024;
  var MAX_VIDEO_SECS = 20.5;

  function token() {
    var DB = window.NM_DB;
    if (!DB || !DB.client || !DB.client.auth) return Promise.resolve(null);
    return DB.client.auth.getSession().then(function (s) { return (s && s.data && s.data.session && s.data.session.access_token) || null; }).catch(function () { return null; });
  }
  function api(action, extra) {
    return token().then(function (tok) {
      if (!tok) throw new Error("not signed in");
      var body = { token: tok, action: action };
      for (var k in (extra || {})) body[k] = extra[k];
      return fetch("/api/banner-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
    });
  }
  function dbReady() {
    return new Promise(function (resolve) {
      var waited = 0;
      var iv = setInterval(function () {
        waited += 400;
        var DB = window.NM_DB;
        if (DB && DB.mode === "supabase" && DB.client) { clearInterval(iv); resolve(DB); }
        else if (waited >= 10000) { clearInterval(iv); resolve(null); }
      }, 400);
    });
  }
  function myUid() {
    try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; }
  }
  function mediaPreview(media) {
    return (media || []).map(function (m) {
      if (m.kind === "video") return '<video class="nm-ba-thumb" src="' + esc(m.url) + '" controls preload="metadata"></video>';
      return '<img class="nm-ba-thumb" src="' + esc(m.url) + '" alt="Banner artwork">';
    }).join("");
  }
  function stepsHtml(stepIdx) {
    var labels = ["Paid", "Artwork", "Review", "Live"];
    return '<div class="nm-ba-steps">' + labels.map(function (l, i) {
      var cls = i < stepIdx ? "done" : (i === stepIdx ? "now" : "");
      return '<div class="nm-ba-step ' + cls + '">' + l + "</div>";
    }).join("") + "</div>";
  }

  function openHubPage() {
    var old = document.getElementById("nm-bs-page"); if (old) old.remove();
    var old2 = document.getElementById("nm-ba-page"); if (old2) old2.remove();
    var page = document.createElement("div");
    page.className = "nm-ba-page";
    page.id = "nm-ba-page";
    page.innerHTML = '<div class="nm-ba-wrap"><div class="nm-ba-top"><button type="button" class="icon-btn" id="nm-ba-back" aria-label="Back">\u2039</button><h2>My banner ads</h2></div><div id="nm-ba-body"><div class="nm-ba-sec"><p class="nm-ba-sub">Loading\u2026</p></div></div></div>';
    document.body.appendChild(page);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    function close() { page.remove(); try { document.body.style.overflow = ""; } catch (e) {} }
    page.querySelector("#nm-ba-back").addEventListener("click", close);
    window.NM_closeBannerSubmit = close;
    renderHub(page, close);
  }
  window.NM_openBannerSubmit = openHubPage;

  function buyAnother() {
    if (window.NM_manualPay) {
      window.NM_manualPay("banner_30d", null);
    } else {
      toast("Please go back and try again in a moment.");
    }
  }

  function renderHub(page, close) {
    var host = page.querySelector("#nm-ba-body");
    host.innerHTML = '<div class="nm-ba-sec"><p class="nm-ba-sub">Loading your banner ads\u2026</p></div>';
    api("state", {}).then(function (j) {
      if (!j || !j.ok) {
        host.innerHTML = '<div class="nm-ba-sec"><h3>Sign in to see your banner ads</h3><p class="nm-ba-sub">Your banner bookings live on your account. Sign in, then open My banner ads again.</p></div>';
        return;
      }
      var out = "";
      out += '<div class="nm-ba-sec"><h3>Your business on the home page</h3>' +
        '<p class="nm-ba-sub">Every buyer who opens Nationwide Media Connect lands on the home page first. A banner ad puts your business there \u2014 and in the Sponsored band in Updates \u2014 for a full <b>2 weeks</b> from the day it goes live.</p>' +
        '<span class="nm-ba-price">' + PRICE + ' \u00B7 2 weeks \u00B7 video (max 20s) or 1\u20132 pictures</span>' +
        stepsHtml(0) +
        '<p class="nm-ba-sub">How it works: <b>1</b> Pay by transfer. <b>2</b> We confirm it. <b>3</b> Upload your artwork here. <b>4</b> We review it and it goes live for 2 weeks. You can hold more than one banner ad \u2014 each payment below is its own ad with its own artwork and its own 2 weeks.</p>' +
        '<button type="button" class="nm-ba-btn" id="nm-ba-buy">Buy a banner ad \u2014 ' + PRICE + '</button>' +
        '<p class="nm-ba-sub" style="margin-top:10px">Need help? WhatsApp us and quote your payment reference.</p>' +
        '<a class="nm-ba-wa" href="https://wa.me/2349150951870" target="_blank" rel="noopener">Chat ' + WA + ' on WhatsApp</a></div>';

      var pays = j.payments || [];
      var slots = j.slots || [];
      var slotByRef = {};
      slots.forEach(function (s) { slotByRef[s.payment_ref] = s; });
      var subByRef = {};
      (j.submissions || []).forEach(function (s) { if (!subByRef[s.payment_ref]) subByRef[s.payment_ref] = s; });

      if (!pays.length) {
        out += '<div class="nm-ba-sec"><h3>No banner ads yet</h3><p class="nm-ba-sub">When you buy a banner ad it appears here, and you follow it step by step: payment, artwork, review, live.</p></div>';
      }
      pays.forEach(function (p, idx) {
        var slot = slotByRef[p.reference] || null;
        var sub = slot ? slot.submission : (subByRef[p.reference] || null);
        var payState = p.status === "paid" ? "confirmed" : (p.status === "failed" ? "failed" : "pending");
        var artState = slot ? slot.state : (sub ? (sub.status === "pending" ? "in_review" : sub.status === "approved" ? "live" : "rejected") : "none");
        var stepIdx = 0, payChip = "", artChip = "", action = "", meta = "";
        if (payState === "confirmed") { payChip = '<span class="nm-ba-chip ok">Payment confirmed</span>'; stepIdx = 1; }
        else if (payState === "failed") { payChip = '<span class="nm-ba-chip bad">Payment not confirmed</span>'; }
        else { payChip = '<span class="nm-ba-chip warn">Payment under review</span>'; }
        if (artState === "in_review") { artChip = '<span class="nm-ba-chip warn">Artwork in review</span>'; stepIdx = 2; }
        else if (artState === "live") { artChip = '<span class="nm-ba-chip ok">Live now</span>'; stepIdx = 3; }
        else if (artState === "ended") { artChip = '<span class="nm-ba-chip">Finished</span>'; stepIdx = 4; }
        else if (artState === "rejected") { artChip = '<span class="nm-ba-chip bad">Artwork not approved</span>'; stepIdx = 1; }
        else if (payState === "confirmed") { artChip = '<span class="nm-ba-chip warn">Awaiting your artwork</span>'; }

        meta = '<p class="nm-ba-meta">Reference <b>' + esc(p.reference) + "</b> \u00B7 " + PRICE +
          (p.paid_at ? " \u00B7 paid " + fmtDate(p.paid_at) : " \u00B7 sent " + fmtDate(p.created_at)) + "</p>";
        if (sub) {
          meta += '<p class="nm-ba-meta">Artwork: <b>' + esc(sub.title || "Banner") + "</b>" + (sub.subtitle ? " \u00B7 " + esc(sub.subtitle) : "") + "</p>";
        }
        if (artState === "live" && sub) {
          var left = sub.live_until ? daysLeft(sub.live_until) : null;
          meta += '<p class="nm-ba-meta">Live from <b>' + fmtDate(sub.reviewed_at || sub.created_at) + "</b>" +
            (sub.live_until ? " until <b>" + fmtDate(sub.live_until) + "</b>" : "") +
            (left != null ? " \u00B7 <b>" + left + " day" + (left === 1 ? "" : "s") + " left</b>" : "") + "</p>";
        }
        if (payState === "pending") {
          action = '<p class="nm-ba-sub">We are confirming your transfer. This usually lands within a few hours, always within 24 hours. Once confirmed, you can upload your artwork right here.</p>';
        } else if (payState === "failed") {
          action = '<p class="nm-ba-sub">We could not confirm this transfer. If the money left your account, WhatsApp us your reference and receipt and we will sort it out. Otherwise you can pay again.</p><button type="button" class="nm-ba-btn" data-buy="1">Pay again \u2014 ' + PRICE + "</button>";
        } else if (artState === "awaiting_artwork" || artState === "none") {
          action = '<button type="button" class="nm-ba-btn" data-upload="' + esc(p.reference) + '">Upload artwork for this ad</button>';
        } else if (artState === "rejected") {
          action = '<p class="nm-ba-sub">This artwork was not approved. Your payment is still valid \u2014 send new artwork and we will review it again.</p><button type="button" class="nm-ba-btn" data-upload="' + esc(p.reference) + '">Send new artwork</button>';
        } else if (artState === "in_review") {
          action = '<p class="nm-ba-sub">Your artwork is with our team. It goes live for 2 weeks as soon as it is approved \u2014 you do not need to do anything else.</p>';
        } else if (artState === "live") {
          action = '<button type="button" class="nm-ba-btn ghost" data-viewlive="1">View my live ad</button>';
        } else if (artState === "ended") {
          action = '<p class="nm-ba-sub">This ad has finished its 2 weeks.</p><button type="button" class="nm-ba-btn" data-buy="1">Buy another banner ad \u2014 ' + PRICE + "</button>";
        }
        out += '<div class="nm-ba-sec"><h3>Banner ad ' + (pays.length > 1 ? "#" + (pays.length - idx) : "") + "</h3>" +
          '<div class="nm-ba-chips">' + payChip + artChip + "</div>" +
          stepsHtml(Math.min(stepIdx, 3)) + meta +
          (sub ? '<div class="nm-ba-thumbs">' + mediaPreview(sub.media) + "</div>" : "") +
          action + "</div>";
      });

      if (pays.length) {
        out += '<div class="nm-ba-sec"><h3>Want another spot?</h3><p class="nm-ba-sub">Each banner ad is separate: its own artwork, its own 2 weeks. Ads rotate on the home page and in Updates.</p><button type="button" class="nm-ba-btn" id="nm-ba-buy2">Buy another banner ad \u2014 ' + PRICE + "</button></div>";
      }
      host.innerHTML = out;
      var b1 = host.querySelector("#nm-ba-buy"); if (b1) b1.addEventListener("click", buyAnother);
      var b2 = host.querySelector("#nm-ba-buy2"); if (b2) b2.addEventListener("click", buyAnother);
      host.querySelectorAll("[data-buy]").forEach(function (b) { b.addEventListener("click", buyAnother); });
      host.querySelectorAll("[data-viewlive]").forEach(function (b) {
        b.addEventListener("click", function () {
          close();
          if (window.NM_show) window.NM_show("home");
          setTimeout(function () { var r = document.getElementById("nm-ad-rail"); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); }, 450);
        });
      });
      host.querySelectorAll("[data-upload]").forEach(function (b) {
        b.addEventListener("click", function () { renderUpload(page, close, b.getAttribute("data-upload")); });
      });
    }).catch(function () {
      host.innerHTML = '<div class="nm-ba-sec"><p class="nm-ba-sub">Could not load your banner ads right now. Check your connection and try again.</p></div>';
    });
  }

  function renderUpload(page, close, paymentRef) {
    var host = page.querySelector("#nm-ba-body");
    var uid = myUid();
    host.innerHTML = ""
      + '<div class="nm-ba-sec"><h3>Send artwork for this banner ad</h3>'
      + '<p class="nm-ba-sub">This artwork belongs to payment <b>' + esc(paymentRef) + '</b>. Send <b>one video of at most 20 seconds</b> OR <b>1 or 2 pictures</b>. Once approved, this ad goes live on the home page and in Updates for <b>2 weeks</b>.</p>'
      + '<p class="nm-ba-err" id="nm-ba-err" style="display:none"></p>'
      + '<input class="nm-ba-in" id="nm-ba-title" type="text" maxlength="80" placeholder="Business name *">'
      + '<input class="nm-ba-in" id="nm-ba-sub" type="text" maxlength="120" placeholder="One short line about your business (optional)">'
      + '<input class="nm-ba-in" id="nm-ba-link" type="text" placeholder="Tap opens\u2026 (we use your shop page if left empty)">'
      + (uid ? '<button type="button" class="nm-ba-btn ghost" id="nm-ba-shop" style="margin-bottom:10px">Use my shop page as the tap destination</button>' : "")
      + '<div class="nm-ba-mode"><button type="button" id="nm-ba-mv" class="on">\uD83C\uDFAC Video (max 20s)</button><button type="button" id="nm-ba-mp">\uD83D\uDDBC\uFE0F Pictures (1 or 2)</button></div>'
      + '<input class="nm-ba-in" id="nm-ba-file" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov">'
      + '<div class="nm-ba-thumbs" id="nm-ba-thumbs"></div>'
      + '<button type="button" class="nm-ba-btn" id="nm-ba-send" disabled>Send for review</button>'
      + '<button type="button" class="nm-ba-btn ghost" id="nm-ba-cancel" style="margin-top:8px">Back to my banner ads</button></div>'
      + '<div class="nm-ba-sec"><h3>No artwork ready?</h3><p class="nm-ba-sub">Send your video or pictures to our WhatsApp <b>' + WA + '</b> with your business name, one short line, and this payment reference, and we will handle it from there.</p></div>';
    var mode = "video";
    var files = [];
    var errEl = host.querySelector("#nm-ba-err");
    var sendBtn = host.querySelector("#nm-ba-send");
    var fileInput = host.querySelector("#nm-ba-file");
    var thumbs = host.querySelector("#nm-ba-thumbs");
    host.querySelector("#nm-ba-cancel").addEventListener("click", function () { renderHub(page, close); });
    var shopBtn = host.querySelector("#nm-ba-shop");
    if (shopBtn) shopBtn.addEventListener("click", function () { host.querySelector("#nm-ba-link").value = "/?shop=" + uid; toast("Your shop page is set as the tap destination."); });
    function showErr(m) { errEl.textContent = m; errEl.style.display = m ? "block" : "none"; }
    function setMode(m) {
      mode = m; files = [];
      host.querySelector("#nm-ba-mv").className = m === "video" ? "on" : "";
      host.querySelector("#nm-ba-mp").className = m === "pictures" ? "on" : "";
      fileInput.value = "";
      fileInput.accept = m === "video" ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
      fileInput.multiple = m === "pictures";
      thumbs.innerHTML = "";
      sendBtn.disabled = true;
      showErr("");
    }
    host.querySelector("#nm-ba-mv").addEventListener("click", function () { setMode("video"); });
    host.querySelector("#nm-ba-mp").addEventListener("click", function () { setMode("pictures"); });
    function videoDuration(file) {
      return new Promise(function (resolve, reject) {
        var url = null;
        try { url = URL.createObjectURL(file); } catch (e) { reject(new Error("Could not read this video.")); return; }
        var v = document.createElement("video");
        v.preload = "metadata";
        var done = false;
        function fin(ok, val) { if (done) return; done = true; try { URL.revokeObjectURL(url); } catch (e) {} if (ok) resolve(val); else reject(val); }
        v.onloadedmetadata = function () { var d = v.duration; if (!d || isNaN(d)) fin(false, new Error("Could not read this video.")); else fin(true, d); };
        v.onerror = function () { fin(false, new Error("Could not read this video.")); };
        setTimeout(function () { fin(false, new Error("Could not read this video.")); }, 15000);
        v.src = url;
      });
    }
    function videoExtOk(name, type) {
      var t = String(type || "").toLowerCase();
      if (t === "video/mp4" || t === "video/webm" || t === "video/quicktime") return true;
      return /\.(mp4|webm|mov)$/i.test(String(name || ""));
    }
    function picExtOk(name, type) {
      var t = String(type || "").toLowerCase();
      if (t === "image/jpeg" || t === "image/png" || t === "image/webp") return true;
      return /\.(jpe?g|png|webp)$/i.test(String(name || ""));
    }
    fileInput.addEventListener("change", function () {
      showErr("");
      var list = fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
      if (mode === "video") {
        if (list.length !== 1) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("Choose exactly one video."); return; }
        var f = list[0];
        if (!videoExtOk(f.name, f.type)) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("The video must be mp4, webm or mov."); return; }
        if (f.size > MAX_VIDEO_BYTES) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("The video is too large. Maximum is 25MB."); return; }
        sendBtn.disabled = true;
        videoDuration(f).then(function (d) {
          if (d > MAX_VIDEO_SECS) { files = []; thumbs.innerHTML = ""; showErr("This video is " + Math.round(d) + " seconds \u2014 the maximum is 20 seconds."); return; }
          files = [f];
          try { thumbs.innerHTML = '<video class="nm-ba-thumb" src="' + URL.createObjectURL(f) + '" controls preload="metadata"></video>'; } catch (e) {}
          sendBtn.disabled = false;
        }).catch(function (e) { files = []; thumbs.innerHTML = ""; showErr(e && e.message ? e.message : "Could not read this video."); });
      } else {
        if (list.length < 1 || list.length > 2) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("Choose 1 or 2 pictures."); return; }
        for (var i = 0; i < list.length; i++) {
          if (!picExtOk(list[i].name, list[i].type)) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("Pictures must be jpg, png or webp."); return; }
          if (list[i].size > MAX_PIC_BYTES) { files = []; thumbs.innerHTML = ""; sendBtn.disabled = true; showErr("A picture is too large. Maximum is 5MB each."); return; }
        }
        files = list;
        thumbs.innerHTML = list.map(function (f2) {
          try { return '<img class="nm-ba-thumb" src="' + URL.createObjectURL(f2) + '" alt="preview">'; } catch (e) { return ""; }
        }).join("");
        sendBtn.disabled = false;
      }
    });
    sendBtn.addEventListener("click", function () {
      var title = host.querySelector("#nm-ba-title").value.trim();
      var subtitle = host.querySelector("#nm-ba-sub").value.trim();
      var link = host.querySelector("#nm-ba-link").value.trim();
      if (!title) { showErr("Please add your business name."); return; }
      if (link && !(/^https?:\/\//i.test(link) || link.charAt(0) === "/")) { showErr("The link must start with http://, https:// or /."); return; }
      if (!files.length) { showErr(mode === "video" ? "Choose your video first." : "Choose your picture(s) first."); return; }
      showErr("");
      sendBtn.disabled = true;
      sendBtn.textContent = "Uploading\u2026";
      var kind = mode === "video" ? "video" : "image";
      dbReady().then(function (DB) {
        if (!DB) throw new Error("Could not reach the server. Please try again.");
        return DB.client.auth.getSession().then(function (s) {
          var u = s && s.data && s.data.session && s.data.session.user;
          if (!u || !u.id) throw new Error("Please sign in again.");
          return { DB: DB, uid: u.id };
        });
      }).then(function (ctx) {
        var media = [];
        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            var safe = String(f.name || "file").replace(/[^a-zA-Z0-9._-]/g, "").slice(-60) || "file";
            var path = ctx.uid + "/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "-" + safe;
            return ctx.DB.client.storage.from(BUCKET).upload(path, f, {
              contentType: f.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
              upsert: false
            }).then(function (res) {
              if (res.error) throw res.error;
              var pub = ctx.DB.client.storage.from(BUCKET).getPublicUrl(path);
              media.push({ url: pub.data.publicUrl, kind: kind });
            });
          });
        });
        return chain.then(function () { return media; });
      }).then(function (media) {
        sendBtn.textContent = "Sending\u2026";
        return api("submit", { title: title, subtitle: subtitle, link_url: link, media: media, payment_ref: paymentRef });
      }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || "Could not send your artwork.");
        toast("Artwork sent for review. This ad goes live for 2 weeks once approved.");
        renderHub(page, close);
      }).catch(function (e) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send for review";
        showErr(e && e.message ? e.message : "Something went wrong. Please try again.");
      });
    });
  }
})();
