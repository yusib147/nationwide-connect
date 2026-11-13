/* Nationwide Media Connect — Launch 100 (2026-11-12, Ibrahim's order).
   Launch offer: the first 100 NEW signups (from 2026-11-12) post
   unlimited listings free. The database does the real work:
   - public.launch_promo holds the counter (target 100, claimed N).
   - A BEFORE INSERT trigger on profiles claims a spot atomically and
     sets profiles.launch_free = true for the first 100.
   - The database listing gate (trg_free_listing_limit) exempts
     launch_free sellers, so the paywall returns by itself for
     everyone else the moment the quota is full.
   This file is the storefront half:
   1) GATE PATCH — NM_DB._premiumGate is wrapped: launch_free users
      skip the "3 free listings" premium sheet when posting. Fail
      safe: any error falls back to the original gate untouched.
   2) BANNERS — promo strips with a live spots-left counter on Home
      (after the hero + mid page), on the Sign up form and on the
      Sell screen. They remove themselves when the spots run out.
      Launch members see a green member strip on Sell instead. */
;(function () {
  "use strict";

  var promoCache = { at: 0, row: null };
  var freeCache = { at: 0, uid: null, val: false };

  function DB() { return window.NM_DB || null; }
  function sb() { var d = DB(); return (d && d.client) ? d.client : null; }

  function getPromo() {
    var now = Date.now();
    if (promoCache.row !== null && now - promoCache.at < 60000) {
      return Promise.resolve(promoCache.row);
    }
    var c = sb();
    if (!c) { return Promise.resolve(null); }
    return c.from("launch_promo").select("target,claimed,active")
      .eq("id", 1).maybeSingle()
      .then(function (res) {
        if (res && !res.error && res.data) {
          promoCache = { at: Date.now(), row: res.data };
          return res.data;
        }
        return null;
      })
      .catch(function () { return null; });
  }

  function currentUserFree() {
    var d = DB(), c = sb();
    if (!d || !c || typeof d._sbUser !== "function") { return Promise.resolve(false); }
    return d._sbUser().then(function (u) {
      if (!u) { return false; }
      var now = Date.now();
      if (freeCache.uid === u.id && now - freeCache.at < 60000) {
        return freeCache.val;
      }
      return c.from("profiles").select("launch_free").eq("id", u.id).maybeSingle()
        .then(function (res) {
          var val = !!(res && !res.error && res.data && res.data.launch_free);
          freeCache = { at: Date.now(), uid: u.id, val: val };
          return val;
        })
        .catch(function () { return false; });
    }).catch(function () { return false; });
  }

  /* ---------------- 1) gate patch ---------------- */
  function patchGate() {
    var d = DB();
    if (!d || d._launch100Patched || typeof d._premiumGate !== "function") { return false; }
    d._launch100Patched = true;
    var orig = d._premiumGate;
    d._premiumGate = function () {
      var args = arguments, self = this;
      return currentUserFree().then(function (free) {
        if (free) { return undefined; }
        return orig.apply(self, args);
      }).catch(function () {
        return orig.apply(self, args);
      });
    };
    return true;
  }

  /* ---------------- 2) banners ---------------- */
  function esc(n) { return String(n == null ? "" : n); }

  function stripHtml(state) {
    if (state.member) {
      return '<div class="launch100-kicker">Launch member</div>' +
        '<div class="launch100-title">You are in. Posting is unlimited and free.</div>' +
        '<div class="launch100-sub">You claimed one of the first 100 launch spots, so you can post as many listings as you want. No payment, no listing limit.</div>' +
        '<span class="launch100-pill">Unlimited free posting</span>';
    }
    var left = Math.max(0, state.target - state.claimed);
    return '<div class="launch100-kicker">Launch offer</div>' +
      '<div class="launch100-title">First 100 signups post FREE, unlimited listings</div>' +
      '<div class="launch100-sub">Sign up now and post as many items as you want. No payment needed. When the 100 spots finish, the normal 3 free listings return.</div>' +
      '<div class="launch100-bar"><div class="launch100-fill" style="width:' +
        Math.min(100, Math.round((state.claimed / Math.max(1, state.target)) * 100)) + '%"></div></div>' +
      '<span class="launch100-pill">' + esc(left) + ' of ' + esc(state.target) + ' spots left</span>';
  }

  function placeStrips(state) {
    var spotsOpen = state.active && (state.target - state.claimed) > 0;
    var showPromo = spotsOpen && !state.member;
    var spots = [
      { id: "launch100-home-hero", host: function () { return document.getElementById("hero"); }, mode: "after", form: false },
      { id: "launch100-home-mid", host: function () { return document.getElementById("ad-banner"); }, mode: "before", form: false },
      { id: "launch100-signup", host: function () { return document.getElementById("form-signup"); }, mode: "prepend", form: true },
      { id: "launch100-sell", host: function () { return document.getElementById("sell-form"); }, mode: "prepend", form: true }
    ];
    spots.forEach(function (s) {
      var el = document.getElementById(s.id);
      var isSell = s.id === "launch100-sell";
      var want = isSell ? (state.member || showPromo) : showPromo;
      if (!want) { if (el) { el.remove(); } return; }
      if (!el) {
        var host = s.host();
        if (!host || !host.parentNode) { return; }
        el = document.createElement("div");
        el.id = s.id;
        el.className = "launch100" + (s.form ? (isSell ? " in-sell" : " in-form") : "") + (state.member && isSell ? " member" : "");
        if (s.mode === "after") { host.parentNode.insertBefore(el, host.nextSibling); }
        else if (s.mode === "before") { host.parentNode.insertBefore(el, host); }
        else { host.insertBefore(el, host.firstChild); }
      }
      el.className = "launch100" + (s.form ? (isSell ? " in-sell" : " in-form") : "") + (state.member && isSell ? " member" : "");
      el.innerHTML = stripHtml(isSell && state.member ? { member: true } : state);
    });
  }

  function render() {
    return Promise.all([getPromo(), currentUserFree()]).then(function (rs) {
      var promo = rs[0], member = rs[1];
      if (!promo && !member) {
        placeStrips({ active: false, target: 100, claimed: 100, member: false });
        return;
      }
      var state = {
        active: !promo || promo.active !== false,
        target: promo ? (promo.target || 100) : 100,
        claimed: promo ? (promo.claimed || 0) : 0,
        member: member
      };
      placeStrips(state);
    }).catch(function () {});
  }

  function boot() {
    var tries = 0;
    (function wait() {
      tries++;
      if (sb() && patchGate()) {
        render();
        setInterval(function () { if (!document.hidden) { render(); } }, 120000);
        return;
      }
      if (tries < 40) { setTimeout(wait, 250); }
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
