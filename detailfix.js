/* Nationwide Media Connect — detailfix.js (2026-10-26)
   Ibrahim's product-page order, parts 4 + 5:

   DECLUTTER — the detail page had accreted three layers of additions
   (app.js base render, uxfix pass, shopx pass) and several facts were
   shown two or three times. This module removes what is left after
   the uxfix fix (its condition chip + Ad ID line are gone; shopx's
   facts card is now the single home for Condition / Stock / Delivery
   / Ad ID):
   - the seller stats row repeated the verification tier as text
     ("✓ Gold verified") although the seller's name already carries
     the tier tick — the duplicate span is removed; the rating and
     the response-time badge stay.
   - a one-photo gallery rendered a dots row with a single dot —
     hidden (multi-photo galleries keep their thumbnails).
   - the gallery zoom-hint paragraph is hidden by detailfix.css
     (tap-to-zoom itself still works).

   WHATSAPP — a "Chat on WhatsApp" action in the sticky CTA row, next
   to Chat seller / Call, with semantics identical to the storefront2
   store-page and thread-menu buttons: shown ONLY when the seller has
   a phone, https://wa.me/<234-normalized> via DB.normalizePhone,
   opens in a new tab, no prefilled text, never on your own listing. */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function DB() { return window.NM_DB || null; }

  var WA_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function waDigits(phone) {
    var db = DB();
    if (db && typeof db.normalizePhone === "function") {
      try { var n = db.normalizePhone(phone); if (n) { return String(n).replace(/[^0-9]/g, ""); } } catch (e) {}
    }
    var d = String(phone || "").replace(/[^0-9]/g, "");
    if (d.charAt(0) === "0") { d = "234" + d.slice(1); }
    return d;
  }
  function waHref(phone) {
    var d = waDigits(phone);
    return d ? "https://wa.me/" + d : "";
  }

  /* ---------------- WhatsApp in the sticky CTA row ---------------- */
  var profCache = {};
  var waBusyFor = "";
  function paintWa(row, p, phone) {
    if (document.getElementById("df-wa")) { return; }
    var href = waHref(phone);
    if (!href) { return; }
    var a = document.createElement("a");
    a.id = "df-wa";
    a.className = "btn-secondary df-wa";
    a.setAttribute("data-pid", String(p.id));
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = '<span class="df-wa-ic">' + WA_SVG + "</span>WhatsApp";
    var call = row.querySelector("#ux-call-btn");
    if (call && call.nextSibling) { row.insertBefore(a, call.nextSibling); }
    else if (call) { row.appendChild(a); }
    else { row.appendChild(a); }
  }
  function ensureWa(body, p) {
    var row = body.querySelector(".chat-cta .cta-row");
    if (!row) { return; }
    var existing = document.getElementById("df-wa");
    if (existing && existing.getAttribute("data-pid") === String(p.id)) { return; }
    if (existing) { existing.remove(); }
    var db = DB();
    if (!db) { return; }
    var me = null;
    try { me = db.currentUserCache && db.currentUserCache(); } catch (e) {}
    if (me && p.sellerId && String(me.id) === String(p.sellerId)) { return; } /* own listing */
    if (p.sellerPhone) { paintWa(row, p, p.sellerPhone); return; }
    if (!p.sellerId || typeof db.getProfileById !== "function") { return; }
    var cached = profCache[p.sellerId];
    if (cached) { if (cached.phone) { paintWa(row, p, cached.phone); } return; }
    if (waBusyFor === String(p.sellerId)) { return; }
    waBusyFor = String(p.sellerId);
    db.getProfileById(p.sellerId).then(function (pr) {
      waBusyFor = "";
      if (pr) { profCache[p.sellerId] = pr; }
      var p2 = window.NM_detailProduct;
      if (pr && pr.phone && p2 && String(p2.id) === String(p.id)) {
        var b2 = document.getElementById("detail-body");
        var r2 = b2 && b2.querySelector(".chat-cta .cta-row");
        if (r2) { paintWa(r2, p, pr.phone); }
      }
    }).catch(function () { waBusyFor = ""; });
  }

  /* ---------------- declutter pass -------------------------------- */
  function pass() {
    try {
      var body = document.getElementById("detail-body");
      if (!body) { return; }
      var p = window.NM_detailProduct;
      if (!p || !p.id) { return; }
      /* Seller stats: drop the text span that repeats the tier the
         name-line tick already shows ("✓ Gold verified"). The rating
         span and the response-time badge (.resp-badge) stay. */
      var spans = body.querySelectorAll(".seller-stats span");
      for (var i = 0; i < spans.length; i++) {
        var sp = spans[i];
        if (!sp.classList.contains("resp-badge") && /verified/i.test(sp.textContent || "")) {
          sp.remove();
        }
      }
      /* One-photo gallery: a dots row with a single dot is noise. */
      var dots = body.querySelector(".gal-dots");
      if (dots && dots.querySelectorAll("span").length <= 1) { dots.classList.add("df-hide"); }
      ensureWa(body, p);
    } catch (e) {}
  }

  /* ---------------- wiring (same observer pattern as shopx) ------- */
  var armed = false;
  function arm() {
    if (armed) { return; }
    var body = document.getElementById("detail-body");
    if (!body) { return; }
    armed = true;
    var deb = null;
    new MutationObserver(function () {
      if (deb) { return; }
      deb = setTimeout(function () { deb = null; pass(); }, 150);
    }).observe(body, { childList: true, subtree: true });
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("#screen-detail")) {
        setTimeout(pass, 350);
      }
    });
    setTimeout(pass, 400);
    setTimeout(pass, 1200);
  }
  var bootTries = 0;
  var bootIv = setInterval(function () {
    arm();
    if (armed || ++bootTries > 40) { clearInterval(bootIv); }
  }, 400);
  arm();

  window.NM_detailFix = { pass: pass, waHref: waHref };
})();
