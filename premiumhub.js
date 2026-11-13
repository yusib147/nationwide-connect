/* Nationwide Media Connect — premiumhub.js (2026-10-25)
   The Premium experience layer, added as a NEW module because supabase/
   client.js and updates.js are at the deploy size ceiling.

   What it does:
   1. Fixes stale gold badges: wraps NM_DB.getTier so a gold tier whose
      premium_until has passed reads as bronze. (getTier only ever read
      verification_tier, and nothing clears gold in the DB on expiry, so
      expired Premium users kept the gold tick forever. The listing gate
      already used premium_until correctly; badges did not.)
   2. Premium status card in Me with five honest states: never / active /
      expiring (<=7 days) / expired / permanent (gold, no expiry). Remaining
      time and expiry come from profiles via NM_DB.premiumStatus(). A term
      progress bar is shown ONLY when the current term's start can be
      derived from the buyer's own latest paid Premium payment on record
      (via the existing /api/pay-manual "mine" path); otherwise remaining
      time + expiry only. No dates are ever invented.
   3. A state-aware plan sheet (NM_openPremiumPlans): per-month pricing,
      promo / best-value badges, benefits, and the exact new expiry each
      plan produces, computed with the SAME stacking rule the server uses
      in api/_paylib.js fulfill() (base = max(now, premium_until), then
      calendar months via setMonth). Paying calls NM_DB.startPayment, the
      one existing funnel (wallet credit, then the manual transfer sheet).
   4. A Premium Centre page (NM_openPremiumCentre): status, benefits, plan
      comparison, how manual-transfer activation works, Premium payment
      history from the same "mine" path.
   5. A one-time welcome sheet the first time Premium activates: only on a
      transition this device actually witnessed (previous stored state was
      free/expired, now active, <=1 paid Premium payment on record).
   6. Notification tap wiring for the server-side Premium expiry notices
      (kind "premium", inserted daily by the server cron check): stored
      rows render static in updates.js, so this module makes those rows
      tappable into the Premium Centre and hides the duplicate client-side
      synthetic row when the durable server row is present. */
;(function () {
  "use strict";

  var PLANS = [
    { key: "premium_1m", months: 2, kobo: 100000, badge: "Launch promo",
      name: "Premium · Launch promo", term: "2 months",
      perk: "Includes a free ad boost for the listings you already have live." },
    { key: "premium_6m", months: 6, kobo: 500000, badge: "Best value",
      name: "Premium · 6 months", term: "6 months",
      perk: "One payment and no renewing again for half a year." }
  ];
  var PLAN_MONTHS = { premium_1m: 2, premium_promo_2m: 2, premium_6m: 6 };
  var BENEFITS = [
    "Unlimited listings — the free plan stops at 3",
    "The gold badge next to your name, everywhere you sell",
    "No listing cap while you stock up or run a sale"
  ];
  var SUPPORT_WA = "09150951870";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function naira(kobo) { return "₦" + Math.round(kobo / 100).toLocaleString("en-NG"); }
  function perMonth(kobo, months) { return "₦" + Math.round(kobo / 100 / months).toLocaleString("en-NG") + "/month"; }
  function fmtDate(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function fmtDateShort(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  function addMonths(d, n) { var x = new Date(d.getTime()); x.setMonth(x.getMonth() + n); return x; }
  function toast(msg, ok) { if (window.NM_payToast) window.NM_payToast(msg, ok ? 1 : 0); else if (window.NM_toast) window.NM_toast(msg); }

  /* ---------------- state ----------------
     Mirrors the server truth: premiumStatus()._premiumActive uses
     premium_until first (active iff in the future), then gold-with-NULL-
     until as permanent. */
  function computeState(st) {
    var now = new Date();
    var until = st && st.until ? new Date(st.until) : null;
    if (until && isNaN(until.getTime())) until = null;
    if (until && until > now) {
      var days = Math.ceil((until.getTime() - now.getTime()) / 864e5);
      return { kind: days <= 7 ? "expiring" : "active", until: until, days: days, active: true };
    }
    if (!until && st && st.tier === "gold") return { kind: "permanent", until: null, days: null, active: true };
    if (until) return { kind: "expired", until: until, days: null, active: false };
    return { kind: "never", until: null, days: null, active: false };
  }
  function humanLeft(until) {
    var now = new Date();
    var totalDays = Math.round((until.getTime() - now.getTime()) / 864e5);
    if (totalDays <= 0) return "Expires today";
    if (totalDays === 1) return "1 day left";
    if (totalDays < 31) return totalDays + " days left";
    var m = (until.getFullYear() - now.getFullYear()) * 12 + (until.getMonth() - now.getMonth());
    var anchor = addMonths(now, m);
    if (anchor > until) { m -= 1; anchor = addMonths(now, m); }
    var days = Math.round((until.getTime() - anchor.getTime()) / 864e5);
    if (m <= 0) return totalDays + " days left";
    return m + (m === 1 ? " month" : " months") + (days > 0 ? " " + days + (days === 1 ? " day" : " days") : "") + " left";
  }
  /* The exact date a purchase would produce — same rule as fulfill(). */
  function extendsTo(state, months) {
    var base = new Date();
    if (state && state.until && state.until > base) base = state.until;
    return addMonths(base, months);
  }

  /* ---------------- data ---------------- */
  var cache = { t: 0, st: null, state: null, mine: null, uid: null };
  function fetchStatus() {
    var DB = window.NM_DB;
    if (!DB || !DB.premiumStatus) return Promise.resolve(null);
    return DB.premiumStatus().catch(function () { return null; });
  }
  function fetchUid() {
    var DB = window.NM_DB;
    if (!DB || !DB.currentUser) return Promise.resolve(null);
    return DB.currentUser().then(function (u) { return u && u.id ? u.id : null; }).catch(function () { return null; });
  }
  function fetchMine() {
    var DB = window.NM_DB;
    if (!DB || !DB.client || !DB.client.auth) return Promise.resolve([]);
    return DB.client.auth.getSession().then(function (s) {
      var tok = s && s.data && s.data.session && s.data.session.access_token;
      if (!tok) return [];
      return fetch("/api/pay-manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mine", token: tok }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { return (j && j.payments) || []; })
        .catch(function () { return []; });
    }).catch(function () { return []; });
  }
  function loadAll(force) {
    if (!force && cache.st && Date.now() - cache.t < 30000) return Promise.resolve(cache);
    return Promise.all([fetchStatus(), fetchMine(), fetchUid()]).then(function (rs) {
      if (rs[0]) {
        cache.st = rs[0]; cache.state = computeState(rs[0]);
        cache.mine = rs[1] || []; cache.uid = rs[2]; cache.t = Date.now();
        checkWelcome();
      }
      return cache;
    });
  }
  function premiumPayments() {
    return (cache.mine || []).filter(function (x) { return x && x.purpose === "premium"; });
  }
  function paidPremiumPayments() {
    return premiumPayments().filter(function (x) { return x.status === "paid"; });
  }
  /* Progress segment: ONLY when the latest paid Premium payment's plan
     length lands the segment start right at that payment (within slack).
     Stacked terms and admin grants return null — no bar, no fake dates. */
  function deriveSegment() {
    var state = cache.state;
    if (!state || !state.until || !state.active) return null;
    var paid = paidPremiumPayments().slice().sort(function (a, b) { return Date.parse(b.created_at) - Date.parse(a.created_at); });
    if (!paid.length) return null;
    var months = PLAN_MONTHS[paid[0].plan];
    if (!months) return null;
    var end = state.until;
    var start = addMonths(end, -months);
    var paidAt = new Date(paid[0].created_at);
    if (isNaN(paidAt.getTime())) return null;
    if (start.getTime() < paidAt.getTime() - 2 * 864e5) return null;
    if (start.getTime() > paidAt.getTime() + 45 * 864e5) return null;
    if (start.getTime() > Date.now()) start = paidAt;
    if (start.getTime() >= end.getTime()) return null;
    var pct = Math.max(0, Math.min(100, Math.round((Date.now() - start.getTime()) / (end.getTime() - start.getTime()) * 100)));
    return { start: start, end: end, pct: pct };
  }

  /* ---------------- first-time welcome ---------------- */
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function checkWelcome() {
    var uid = cache.uid, state = cache.state;
    if (!uid || !state) return;
    var key = "nm_phub_state_" + uid;
    var rec = lsGet(key);
    if (!rec) { lsSet(key, { seen: state.kind, welcomed: !!state.active }); return; }
    var wasOff = rec.seen === "never" || rec.seen === "expired";
    if (wasOff && state.active && !rec.welcomed && paidPremiumPayments().length <= 1) {
      rec.welcomed = true; rec.seen = state.kind; lsSet(key, rec);
      setTimeout(openWelcome, 600);
      return;
    }
    if (rec.seen !== state.kind) { rec.seen = state.kind; lsSet(key, rec); }
  }
  function openWelcome() {
    if (document.getElementById("phub-welcome")) return;
    var state = cache.state;
    var scrim = document.createElement("div");
    scrim.className = "phub-scrim"; scrim.id = "phub-welcome";
    scrim.innerHTML =
      '<div class="phub-sheet center" role="dialog" aria-label="Welcome to Premium">' +
      '<div class="phub-welcome-ico">👑</div>' +
      "<h3 style='margin:0;font-size:20px;font-weight:800'>You\u2019re Premium</h3>" +
      '<p class="phub-sub" style="margin-top:6px">Your gold membership is live. Here is what you just unlocked:</p>' +
      '<ul class="phub-benefits">' + BENEFITS.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
      (state && state.until ? '<p class="phub-until" style="margin-top:10px">Premium until <b>' + esc(fmtDate(state.until)) + "</b> · " + esc(humanLeft(state.until)) + "</p>" : "") +
      '<button type="button" class="phub-cta-full" id="phub-welcome-x">Start selling</button></div>';
    document.body.appendChild(scrim);
    function close() { scrim.remove(); }
    scrim.querySelector("#phub-welcome-x").addEventListener("click", close);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
  }

  /* ---------------- Me status card ---------------- */
  function warnHiddenToday(uid) {
    var rec = lsGet("nm_phub_warn_" + uid);
    return rec && rec.day === new Date().toDateString();
  }
  function cardHTML(state, st) {
    var seg = deriveSegment();
    var head = '<div class="phub-top"><span class="phub-crown">👑</span><div>';
    var mid = "", actions = "";
    if (state.kind === "never") {
      mid = head + '<div class="phub-title">Go Premium</div><div class="phub-sub">You are on the free plan · ' + (st ? st.count : 0) + " of " + (st ? st.limit : 3) + ' listings used</div></div></div>' +
        '<ul class="phub-benefits">' + BENEFITS.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
        '<div class="phub-until" style="margin-top:8px"><b style="color:var(--ink)">₦1,000</b> for 2 months · <b style="color:var(--ink)">₦5,000</b> for 6 months</div>';
      actions = '<button type="button" class="phub-btn" data-act="plans">See Premium plans</button><button type="button" class="phub-btn ghost" data-act="centre">Details</button>';
    } else if (state.kind === "active" || state.kind === "expiring") {
      mid = head + '<div class="phub-title">Premium active</div><div class="phub-sub">Gold member · unlimited listings</div></div></div>' +
        '<div class="phub-big"><span class="phub-gold">' + esc(humanLeft(state.until)) + "</span></div>" +
        '<div class="phub-until">Premium until <b>' + esc(fmtDate(state.until)) + "</b></div>" +
        (seg ? '<div class="phub-bar"><i style="width:' + seg.pct + '%"></i></div><div class="phub-barlab">Current term: ' + esc(fmtDateShort(seg.start)) + " → " + esc(fmtDateShort(seg.end)) + "</div>" : "") +
        (state.kind === "expiring" && !warnHiddenToday(cache.uid)
          ? '<div class="phub-warn"><span>Your Premium ends in ' + state.days + (state.days === 1 ? " day" : " days") + ". Renew now to keep unlimited listings and your gold badge.</span><button type=\"button\" data-act=\"warnx\" aria-label=\"Dismiss for today\">✕</button></div>" : "");
      actions = '<button type="button" class="phub-btn" data-act="plans">Extend Premium</button><button type="button" class="phub-btn ghost" data-act="centre">Premium centre</button>';
    } else if (state.kind === "expired") {
      mid = head + '<div class="phub-title">Premium ended</div><div class="phub-sub">You are back on the free plan · ' + (st ? st.limit : 3) + ' listings</div></div></div>' +
        '<div class="phub-big">Ended ' + esc(fmtDateShort(state.until)) + "</div>" +
        '<div class="phub-until">Renew to post unlimited listings again and get your gold badge back.</div>';
      actions = '<button type="button" class="phub-btn" data-act="plans">Renew Premium</button><button type="button" class="phub-btn ghost" data-act="centre">Premium centre</button>';
    } else { /* permanent */
      mid = head + '<div class="phub-title">Premium · no expiry</div><div class="phub-sub">Gold member · unlimited listings</div></div></div>' +
        '<div class="phub-big"><span class="phub-gold">Premium forever</span></div>' +
        '<div class="phub-until">Your gold membership has no end date. There is nothing to renew.</div>';
      actions = '<button type="button" class="phub-btn ghost" data-act="centre" style="flex:1">Premium centre</button>';
    }
    return mid + '<div class="phub-actions">' + actions + "</div>";
  }
  var lastSig = "";
  function paintCard() {
    var body = document.getElementById("me-body");
    if (!body) return;
    var top = body.querySelector(".me-top");
    if (!top) return;
    loadAll(false).then(function () {
      if (!cache.state) return;
      var sig = cache.state.kind + "|" + (cache.st && cache.st.until || "") + "|" + (cache.st && cache.st.count || 0) + "|" + warnHiddenToday(cache.uid);
      var card = document.getElementById("phub-card");
      if (card && sig === lastSig && body.contains(card)) return;
      lastSig = sig;
      if (!card) {
        card = document.createElement("div");
        card.id = "phub-card";
        card.addEventListener("click", function (e) {
          var b = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
          if (!b) return;
          var act = b.getAttribute("data-act");
          if (act === "plans") openPlans();
          else if (act === "centre") openCentre();
          else if (act === "warnx") {
            lsSet("nm_phub_warn_" + cache.uid, { day: new Date().toDateString() });
            lastSig = ""; paintCard();
          }
        });
      }
      card.className = "phub-card" + (cache.state.kind === "expiring" ? " urgent" : cache.state.kind === "expired" ? " expired" : "");
      card.innerHTML = cardHTML(cache.state, cache.st);
      if (!body.contains(card)) {
        if (top.nextSibling) body.insertBefore(card, top.nextSibling); else body.appendChild(card);
      }
    });
  }

  /* ---------------- Me menu row ---------------- */
  function rowSub(state, st) {
    if (!state) return "Unlimited listings from ₦1,000";
    if (state.kind === "active") return "Active · " + humanLeft(state.until);
    if (state.kind === "expiring") return "Ends in " + state.days + (state.days === 1 ? " day" : " days") + " · renew now";
    if (state.kind === "expired") return "Ended " + fmtDateShort(state.until) + " · renew";
    if (state.kind === "permanent") return "Active · no expiry";
    return "Unlimited listings from ₦1,000";
  }
  function injectRow() {
    var menu = document.querySelector(".nm-me-menu");
    if (!menu) return;
    loadAll(false).then(function () {
      var sub = rowSub(cache.state, cache.st);
      var row = document.getElementById("nm-phub-row");
      if (row) {
        var s = row.querySelector(".phub-rowsub");
        if (s && s.textContent !== sub) s.textContent = sub;
        return;
      }
      row = document.createElement("button");
      row.type = "button";
      row.className = "nm-me-row";
      row.id = "nm-phub-row";
      row.innerHTML = '<span class="nm-me-ico">👑</span><span style="flex:1;text-align:left"><b>Premium</b><span class="phub-rowsub" style="display:block;font-size:12px;color:var(--card-mut,#6d6d78);font-weight:500">' + esc(sub) + '</span></span><span class="nm-me-chev">›</span>';
      row.addEventListener("click", function () { openCentre(); });
      var firstRow = menu.querySelector(".nm-me-row");
      if (firstRow) menu.insertBefore(row, firstRow); else menu.appendChild(row);
    });
  }

  /* ---------------- plan sheet ---------------- */
  var sheetEl = null;
  function closePlans() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
  function planCardHTML(p, state) {
    var ext = "";
    if (state && state.active && state.until) {
      ext = '<span class="phub-plan-extends">Extends your Premium to ' + esc(fmtDate(extendsTo(state, p.months))) + "</span>";
    } else if (state && state.kind !== "permanent") {
      ext = '<span class="phub-plan-extends">Runs until ' + esc(fmtDate(extendsTo(state, p.months))) + "</span>";
    }
    return '<button type="button" class="phub-plan' + (p.badge === "Best value" ? " hot" : "") + '" data-plan="' + p.key + '">' +
      '<span class="phub-plan-badge">' + esc(p.badge) + "</span>" +
      '<span class="phub-plan-row"><span class="phub-plan-name">' + esc(p.name) + '</span><span class="phub-plan-price">' + naira(p.kobo) + "</span></span>" +
      '<span class="phub-plan-per">' + esc(p.term) + " · " + perMonth(p.kobo, p.months) + "</span>" +
      '<span class="phub-plan-perk">' + esc(p.perk) + "</span>" + ext + "</button>";
  }
  function statusLineHTML(state, st) {
    if (!state) return "";
    if (state.kind === "active" || state.kind === "expiring") {
      return "👑 <b>Premium active</b> until <b>" + esc(fmtDate(state.until)) + "</b> · " + esc(humanLeft(state.until)) + ". Buying a plan adds its months on top — you never lose paid time.";
    }
    if (state.kind === "expired") {
      return "Your Premium ended on <b>" + esc(fmtDate(state.until)) + "</b>. Renew below and your gold badge and unlimited listings come straight back.";
    }
    if (state.kind === "permanent") {
      return "👑 You have <b>Premium with no expiry</b>. There is nothing to buy or renew.";
    }
    return "You are on the <b>free plan</b> (" + (st ? st.count : 0) + " of " + (st ? st.limit : 3) + " listings used). Premium removes the cap completely.";
  }
  function openPlans() {
    closePlans();
    loadAll(true).then(function () {
      closePlans();
      var state = cache.state, st = cache.st;
      sheetEl = document.createElement("div");
      sheetEl.className = "phub-scrim"; sheetEl.id = "phub-plans";
      var plansHtml = state && state.kind === "permanent" ? "" :
        '<div class="phub-plans">' + PLANS.map(function (p) { return planCardHTML(p, state); }).join("") + "</div>";
      sheetEl.innerHTML =
        '<div class="phub-sheet" role="dialog" aria-label="Premium plans">' +
        '<div class="phub-sheet-head"><span class="phub-crown">👑</span><div><h3>Premium plans</h3>' +
        '<div class="phub-sub">Unlimited listings and the gold badge.</div></div>' +
        '<button type="button" class="phub-x" aria-label="Close">✕</button></div>' +
        '<div class="phub-statusline">' + statusLineHTML(state, st) + "</div>" +
        '<ul class="phub-benefits">' + BENEFITS.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
        plansHtml +
        '<div class="phub-err" id="phub-plans-err"></div>' +
        '<p class="phub-note">Tap a plan to pay by bank transfer. You send the exact amount, tell us the name on the transfer, and we confirm and switch your Premium on — most confirmations land within a few hours, always within 24 hours. If you have wallet credit that covers a plan, it is offered first.</p>' +
        "</div>";
      document.body.appendChild(sheetEl);
      sheetEl.querySelector(".phub-x").addEventListener("click", closePlans);
      sheetEl.addEventListener("click", function (e) { if (e.target === sheetEl) closePlans(); });
      Array.prototype.forEach.call(sheetEl.querySelectorAll("[data-plan]"), function (btn) {
        btn.addEventListener("click", function () {
          var plan = btn.getAttribute("data-plan");
          btn.disabled = true;
          var DB = window.NM_DB;
          if (!DB || !DB.startPayment) { btn.disabled = false; return; }
          closePlans();
          DB.startPayment(plan).then(function () {
            cache.t = 0; lastSig = ""; paintCard();
          }).catch(function (err) {
            toast((err && err.message) || "Payment could not start.", 0);
          });
        });
      });
    });
  }
  window.NM_openPremiumPlans = openPlans;

  /* ---------------- Premium Centre page ---------------- */
  var pageEl = null;
  function closeCentre() {
    if (pageEl) { pageEl.remove(); pageEl = null; }
    try { document.body.style.overflow = ""; } catch (e) {}
  }
  function histHTML() {
    var rows = premiumPayments();
    if (!rows.length) return '<div class="phub-empty">No Premium payments yet. When you pay for Premium by transfer, it will show here with its status.</div>';
    var labels = { premium_1m: "Premium · Launch promo (2 months)", premium_promo_2m: "Premium · Launch promo (2 months)", premium_6m: "Premium · 6 months" };
    return rows.slice(0, 10).map(function (x) {
      var chip = x.status === "paid" ? '<span class="phub-chip ok">Confirmed</span>'
        : x.status === "failed" ? '<span class="phub-chip bad">Not confirmed</span>'
        : '<span class="phub-chip wait">Under review</span>';
      var d = new Date(x.created_at);
      return '<div class="phub-hist-row"><div><b>' + esc(labels[x.plan] || "Premium") + "</b><small>" +
        esc(isNaN(d.getTime()) ? "" : fmtDateShort(d)) + " · " + naira(x.amount_kobo || 0) + " · " + esc(x.reference || "") + "</small></div>" + chip + "</div>";
    }).join("");
  }
  function openCentre() {
    closeCentre();
    loadAll(true).then(function () {
      closeCentre();
      var state = cache.state, st = cache.st;
      pageEl = document.createElement("div");
      pageEl.className = "phub-page"; pageEl.id = "phub-page";
      pageEl.innerHTML =
        '<div class="phub-page-wrap"><div class="phub-page-top">' +
        '<button type="button" class="icon-btn" id="phub-back" aria-label="Back">‹</button><h2>Premium centre</h2></div>' +
        '<div class="phub-page-body">' +
        '<div class="phub-card" id="phub-centre-card"></div>' +
        '<div class="phub-sec"><h3>What Premium gives you</h3>' +
        '<ul class="phub-benefits">' + BENEFITS.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
        "<p>The free plan lets every seller keep 3 listings live. Premium removes that cap for as long as it runs, and your name carries the gold badge buyers look for.</p></div>" +
        (state && state.kind === "permanent" ? "" :
          '<div class="phub-sec"><h3>' + (state && state.active ? "Extend your Premium" : "Compare plans") + '</h3><div class="phub-plans">' +
          PLANS.map(function (p) { return planCardHTML(p, state); }).join("") + "</div>" +
          '<p style="margin-top:10px">Buying while Premium is active adds the months on top of your current expiry — paid time is never lost.</p></div>') +
        '<div class="phub-sec"><h3>How activation works</h3><ol>' +
        "<li>Choose a plan and transfer the exact amount to the OPay account shown on the payment screen.</li>" +
        "<li>Enter the name on your transfer in the app so we can match your payment.</li>" +
        "<li>We confirm it and your Premium switches on: gold badge, unlimited listings. Most confirmations land within a few hours, always within 24 hours.</li></ol>" +
        '<p>Need help? WhatsApp us on <a class="phub-wa" href="https://wa.me/2349150951870" target="_blank" rel="noopener">' + SUPPORT_WA + "</a>.</p></div>" +
        '<div class="phub-sec"><h3>Your Premium payments</h3>' + histHTML() + "</div>" +
        "</div></div>";
      document.body.appendChild(pageEl);
      try { document.body.style.overflow = "hidden"; } catch (e) {}
      var cc = pageEl.querySelector("#phub-centre-card");
      cc.className = "phub-card" + (state && state.kind === "expiring" ? " urgent" : state && state.kind === "expired" ? " expired" : "");
      cc.innerHTML = cardHTML(state || { kind: "never" }, st);
      var selfBtn = cc.querySelector('[data-act="centre"]');
      if (selfBtn) selfBtn.remove();
      var acts = cc.querySelector(".phub-actions");
      if (acts && !acts.children.length) acts.remove();
      pageEl.querySelector("#phub-back").addEventListener("click", closeCentre);
      Array.prototype.forEach.call(pageEl.querySelectorAll("[data-act]"), function (b) {
        b.addEventListener("click", function () {
          var act = b.getAttribute("data-act");
          if (act === "plans") { closeCentre(); openPlans(); }
          else if (act === "warnx") { lsSet("nm_phub_warn_" + cache.uid, { day: new Date().toDateString() }); closeCentre(); openCentre(); }
        });
      });
      Array.prototype.forEach.call(pageEl.querySelectorAll("[data-plan]"), function (btn) {
        btn.addEventListener("click", function () {
          var DB = window.NM_DB;
          if (!DB || !DB.startPayment) return;
          btn.disabled = true;
          closeCentre();
          DB.startPayment(btn.getAttribute("data-plan")).then(function () { cache.t = 0; lastSig = ""; paintCard(); })
            .catch(function (err) { toast((err && err.message) || "Payment could not start.", 0); });
        });
      });
    });
  }
  window.NM_openPremiumCentre = openCentre;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (sheetEl) closePlans(); else if (pageEl) closeCentre();
  });

  /* ---------------- stale-gold badge fix (getTier wrap) ---------------- */
  function wrapGetTier() {
    var DB = window.NM_DB;
    if (!DB || !DB.getTier || DB.getTier._phubWrapped) return;
    if (!DB.client || (DB.mode && DB.mode !== "supabase")) return;
    var orig = DB.getTier.bind(DB);
    var tc = {};
    var wrapped = function (uid) {
      if (!uid) return orig(uid);
      var c = tc[uid];
      if (c && Date.now() - c.t < 30000) return Promise.resolve(c.v);
      return DB.client.from("profiles").select("verification_tier,premium_until").eq("id", uid).maybeSingle()
        .then(function (res) {
          if (!res || res.error || !res.data) return orig(uid);
          var t = res.data.verification_tier || null;
          if (t === "gold" && res.data.premium_until && new Date(res.data.premium_until) <= new Date()) t = "bronze";
          tc[uid] = { t: Date.now(), v: t };
          return t;
        }).catch(function () { return orig(uid); });
    };
    wrapped._phubWrapped = true;
    DB.getTier = wrapped;
  }

  /* ---------------- notification rows (server expiry notices) ------------
     Stored rows render as .nt-row.nt-static with no tap behaviour. The
     server notices are recognisable by the gold-badge wording in the body.
     Make them open the Premium Centre; when one is present, hide the
     client-side synthetic premium row (a button) so the user sees one
     notice, not two. Never writes to the DOM when nothing matches. */
  function wireNotifRows() {
    var body = document.getElementById("notifs-body");
    if (!body) return;
    var serverRow = null, synthRow = null;
    Array.prototype.forEach.call(body.querySelectorAll(".nt-row"), function (row) {
      var txt = row.textContent || "";
      var isPremium = /Premium/.test(txt) && (/gold badge/.test(txt) || /Premium benefits/.test(txt));
      if (row.classList.contains("nt-static") && isPremium) serverRow = row;
      else if (!row.classList.contains("nt-static") && /Your Premium (expires|has expired)/.test(txt)) synthRow = row;
    });
    if (serverRow) {
      if (synthRow && synthRow.style.display !== "none") synthRow.style.display = "none";
      if (!serverRow._phubWired) {
        serverRow._phubWired = true;
        serverRow.style.cursor = "pointer";
        serverRow.addEventListener("click", function () { openCentre(); });
      }
    }
  }

  /* ---------------- boot / paint triggers ---------------- */
  function tick() {
    wrapGetTier();
    var scr = document.getElementById("screen-me");
    if (scr && scr.classList.contains("active")) { paintCard(); injectRow(); }
    wireNotifRows();
  }
  setInterval(tick, 1600);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();

  /* Public surface (also used by the harness and future wiring). */
  window.NM_premium = { open: openCentre, plans: openPlans, refresh: function () { cache.t = 0; lastSig = ""; return loadAll(true).then(function () { paintCard(); }); }, _state: function () { return cache.state; } };
})();
