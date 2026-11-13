/* Nationwide Media Connect — postflow.js (2026-10-26)
   Ibrahim's order: tapping "Post item" used to leave a dead, static
   screen for the whole upload + save + scan gap (many seconds on a
   slow phone) — the only feedback was the submit button disabling.
   This module paints a proper loading state across the WHOLE gap and
   always resolves it:
     success  -> the item page (post preview) becomes active, or the
                 "Finishing up…" grace ends after the app's own
                 submitted toast (the scan kept the item off the
                 preview path — same end state as before, just no
                 longer a silent wait);
     failure  -> the app's existing #sell-error path shows, the form
                 stays exactly as the user left it, overlay lifts.
   How it knows: app.js validates synchronously inside its submit
   handler and disables the submit button ONLY once the post is truly
   in flight (validation failures return before that). So the overlay
   follows the button: shown once the button disables, held through
   the button's re-enable (which fires before the post-scan
   navigation), and dropped the moment the detail screen activates,
   an error paints, the user is routed elsewhere (e.g. auth), or a
   90s hard cap passes. The overlay covers the screen while visible,
   so double-taps and mid-post navigation are impossible. */
(function () {
  "use strict";

  var overlay = null, subEl = null, iv = null, scrObs = null;
  var startedAt = 0, disabledGoneAt = 0;

  function ensureOverlay() {
    if (overlay) { return overlay; }
    overlay = document.createElement("div");
    overlay.id = "nm-posting";
    overlay.hidden = true;
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML =
      '<div class="pf-card">' +
        '<div class="pf-spinner" aria-hidden="true"></div>' +
        '<div class="pf-title">Posting your listing\u2026</div>' +
        '<div class="pf-sub">Uploading your photos and saving your listing\u2026</div>' +
      "</div>";
    document.body.appendChild(overlay);
    subEl = overlay.querySelector(".pf-sub");
    return overlay;
  }
  function show(stage) {
    ensureOverlay();
    if (subEl) {
      subEl.textContent = stage === "finishing"
        ? "Finishing up\u2026"
        : "Uploading your photos and saving your listing\u2026";
    }
    overlay.hidden = false;
    watchScreens();
  }
  function stop() { if (iv) { clearInterval(iv); iv = null; } }
  function hide() {
    stop();
    if (scrObs) { try { scrObs.disconnect(); } catch (e) {} scrObs = null; }
    if (overlay) { overlay.hidden = true; }
  }
  /* Instant resolution on navigation: the 150ms tick below is the
     backstop, but the moment the detail screen (success) or the auth
     screen (login bounce) takes the .active class, the overlay lifts
     in the same mutation round — no visible overlap where the
     preview sits behind the spinner. */
  function watchScreens() {
    if (scrObs || !window.MutationObserver) { return; }
    scrObs = new MutationObserver(function () {
      var scr = activeScreen();
      if (scr && scr !== "screen-sell") { hide(); }
    });
    ["screen-detail", "screen-auth"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { try { scrObs.observe(el, { attributes: true, attributeFilter: ["class"] }); } catch (e) {} }
    });
  }

  function activeScreen() {
    var s = document.querySelector(".screen.active");
    return s ? s.id : "";
  }
  function errorShown() {
    var err = document.getElementById("sell-error");
    return !!(err && !err.hidden && (err.textContent || "").trim());
  }

  function tick() {
    if (errorShown()) { hide(); return; }
    var scr = activeScreen();
    if (scr === "screen-detail") { hide(); return; }        /* preview is up */
    if (scr && scr !== "screen-sell") { hide(); return; }   /* routed away (auth / nav) */
    var btn = document.querySelector("#sell-form .btn-primary");
    if (btn && btn.disabled) {
      if (overlay.hidden) { show("posting"); }
    } else {
      /* The app re-enables the button before the post-scan step has
         navigated to the preview — hold the overlay through a grace
         window so the wait never goes dead again mid-flow. */
      if (!disabledGoneAt) { disabledGoneAt = Date.now(); show("finishing"); }
      else if (Date.now() - disabledGoneAt > 12000) { hide(); return; }
    }
    if (Date.now() - startedAt > 90000) { hide(); }
  }

  document.addEventListener("submit", function (e) {
    if (!e.target || e.target.id !== "sell-form") { return; }
    /* Capture phase: this runs before the form's own handler. The
       handler validates synchronously and disables the button only
       for a real post, so a short beat later the button tells us
       whether anything is in flight. Validation failure -> the error
       box is painted and the button never disabled -> no overlay. */
    setTimeout(function () {
      var btn = document.querySelector("#sell-form .btn-primary");
      if (errorShown()) { return; }
      if (!btn || !btn.disabled) { return; }
      startedAt = Date.now();
      disabledGoneAt = 0;
      show("posting");
      stop();
      iv = setInterval(tick, 150);
    }, 60);
  }, true);

  window.NM_postflow = { hide: hide };
})();
