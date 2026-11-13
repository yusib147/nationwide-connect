/* Nationwide Media Connect — liverefresh.js (2026-10-23)
   Makes the storefront feel live, with no page reload:
   1) HOME + CATEGORY grids: product changes arrive over the Supabase
      realtime bus (NM_DB.onLive in supabase/client.js). The visible grid
      re-renders through the app's own render path, with the scroll
      anchored to the card the user was looking at — no yank to the top.
      While a sheet/modal is open, or the tab is hidden, the refresh is
      deferred and flushed when it is safe.
      (Category already re-rendered via app.js's own handler; here it only
      gets its scroll anchor preserved. Detail views are never touched —
      realtime badges/counts elsewhere already update on their own.)
   2) ADS: the top banner rotation, the home rail and the Updates band
      are fed by /api/banner-live, diffing the live ad set. Since
      realtime-upgrade.sql ran (2026-10-24), admin_banners is in the
      realtime publication with a public SELECT policy for live
      banners, so the nm-ads-live channel below is the primary trigger
      and ads are effectively instant. The fetch still runs on focus /
      visibility return, and a slow poll (visible tab only, 300s)
      remains purely as a safety net — it was 40s before the channel
      went live, and that constant polling wasted Supabase egress
      (2026-10-24 egress cuts). On a change, the repaint goes through
      window.NM_setPaidScenes (premium.js) and window.NM_setAdSpots
      (bannerads.js) — new ads join the rotation's shuffle-bag fairly,
      removed ads drop out, nothing restarts.
   Every handler is defensive: a failed refresh leaves the page as-is. */
;(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function screenActive(id) { var s = $(id); return !!(s && s.classList.contains("active")); }
  function overlayOpen() {
    try {
      var mr = $("modal-root");
      if (mr && mr.children.length) return true;
      if (document.querySelector(".nm-ba-page, .nm-bs-page")) return true;
      if (document.body && document.body.style.overflow === "hidden") return true;
    } catch (e) {}
    return false;
  }

  /* ---------------- product feeds ---------------- */
  function cardId(card) {
    if (!card) return null;
    var id = card.getAttribute("data-id") || card.getAttribute("data-simid");
    if (id) return id;
    var fav = card.querySelector("[data-fav]");
    return fav ? fav.getAttribute("data-fav") : null;
  }
  function gridSig(grid) {
    var cards = grid.querySelectorAll(".card");
    var first = cards.length ? cardId(cards[0]) : "";
    var last = cards.length ? cardId(cards[cards.length - 1]) : "";
    return cards.length + ":" + first + ":" + last + ":" + grid.innerHTML.length;
  }
  function captureAnchor(grid) {
    var cards = grid.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (r.bottom > 120 && r.top < (window.innerHeight || 800)) {
        return { id: cardId(cards[i]), top: r.top };
      }
    }
    return null;
  }
  function restoreAnchor(grid, anchor) {
    if (!anchor || !anchor.id) return;
    var cards = grid.querySelectorAll(".card");
    for (var i = 0; i < cards.length; i++) {
      if (cardId(cards[i]) === anchor.id) {
        var d = cards[i].getBoundingClientRect().top - anchor.top;
        if (d) { try { window.scrollBy(0, d); } catch (e) {} }
        return;
      }
    }
  }
  function watchGrid(grid, sig, anchor) {
    var tries = 20;
    var iv = setInterval(function () {
      tries--;
      var changed = false;
      try { changed = gridSig(grid) !== sig; } catch (e) {}
      if (changed || tries <= 0) {
        clearInterval(iv);
        if (changed) restoreAnchor(grid, anchor);
      }
    }, 160);
  }
  function refreshHome() {
    var grid = $("home-grid");
    if (!grid) return;
    var anchor = captureAnchor(grid);
    var sig = gridSig(grid);
    /* ne() in app.js re-renders #home-grid off the search input handler —
       the app's own path, so filters/query state are respected. */
    var inp = $("home-search");
    if (inp) { try { inp.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {} }
    watchGrid(grid, sig, anchor);
  }
  function refreshCategory() {
    /* app.js's own products handler already re-renders the category grid
       (se()); this only preserves the reader's place across that render. */
    var grid = $("cat-grid");
    if (!grid) return;
    var anchor = captureAnchor(grid);
    var sig = gridSig(grid);
    watchGrid(grid, sig, anchor);
  }

  var prodTimer = null, prodPending = false;
  function flushProducts() {
    if (document.hidden || overlayOpen()) { prodPending = true; return; }
    if (screenActive("screen-home")) refreshHome();
    else if (screenActive("screen-category")) refreshCategory();
  }
  function onProducts() {
    if (document.hidden || overlayOpen()) { prodPending = true; return; }
    if (prodTimer) clearTimeout(prodTimer);
    prodTimer = setTimeout(function () { prodTimer = null; flushProducts(); }, 900);
  }
  function registerProducts(tries) {
    var DB = window.NM_DB;
    if (DB && typeof DB.onLive === "function") {
      try { DB.onLive("products", onProducts); return; } catch (e) {}
    }
    if (tries > 0) setTimeout(function () { registerProducts(tries - 1); }, 800);
  }
  registerProducts(25);

  /* ---------------- ads ---------------- */
  var adsSig = null, adsBusy = false;
  function adsSignature(j) {
    /* Order-insensitive (build n wave 2): the API gives no ordering
       guarantee, and an order-only change used to re-fire applyAds,
       whose rail/band paints rebuilt the ad cards — the visible blink
       on the home feed. Same SET of ads, any order = same signature =
       strict no-op downstream. */
    var sc = (j && j.scenes) || [], ad = (j && j.ads) || [];
    return JSON.stringify([
      sc.map(function (s) { return [s.title || "", s.media_url || "", s.link_url || s.shop_url || "", s.ends_at || ""].join(""); }).sort(),
      ad.map(function (a) {
        return [a.title || "", (a.media || []).map(function (m) { return m.url; }).join(","), a.link_url || a.shop_url || ""].join("");
      }).sort()
    ]);
  }
  function scenesForPremium(j) {
    return ((j && j.scenes) || []).map(function (s) {
      return {
        title: s.title, subtitle: s.subtitle, image_url: s.media_url,
        link_url: s.link_url || s.shop_url || "",
        starts_at: s.starts_at, ends_at: s.ends_at, is_active: true, sort_order: 0
      };
    });
  }
  function applyAds(j) {
    try { if (typeof window.NM_setPaidScenes === "function") window.NM_setPaidScenes(scenesForPremium(j)); } catch (e) {}
    try { if (typeof window.NM_setAdSpots === "function") window.NM_setAdSpots((j && j.ads) || []); } catch (e) {}
  }
  function pollAds() {
    if (adsBusy) return;
    adsBusy = true;
    fetch("/api/banner-live?live=" + Date.now(), { headers: { "Accept": "application/json" }, cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        adsBusy = false;
        if (!j || !j.ok) return;
        var sig = adsSignature(j);
        if (adsSig === null) { adsSig = sig; applyAds(j); return; } /* hooks are idempotent */
        if (sig !== adsSig) { adsSig = sig; applyAds(j); }
      })
      .catch(function () { adsBusy = false; });
  }
  function bootAdsLive(tries) {
    var DB = window.NM_DB;
    if (DB && DB.client && typeof DB.client.channel === "function") {
      try {
        DB.client.channel("nm-ads-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "admin_banners" }, function () { pollAds(); })
          .subscribe();
      } catch (e) {}
      return;
    }
    if (tries > 0) setTimeout(function () { bootAdsLive(tries - 1); }, 1000);
  }
  setTimeout(pollAds, 4000);
  setInterval(function () { if (!document.hidden) pollAds(); }, 300000);
  bootAdsLive(30);

  /* ---------------- shared triggers ---------------- */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    if (prodPending) { prodPending = false; onProducts(); }
    pollAds();
  });
  window.addEventListener("focus", function () { pollAds(); });
})();
