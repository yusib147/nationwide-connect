/* Nationwide Media Connect — advideo.js (v2, 2026-11-03 evening).
   Ibrahim's reports: (1) "the video ads lag a lot instead of them to
   play back normally" → v1 shipped the same morning; (2) "the video
   lag still happens" on his phone → this v2.

   v1 killed the structural waste: every ad stage used to run TWO
   autoplaying copies of the same video (foreground + live blurred
   backdrop), the same ad renders in up to four places at once, all
   preload="auto", never paused — up to 8 decoders for one 5s file.
   v1's guarantees stay: backdrop copies never play (frozen first
   frame), at most ONE foreground ad video plays at a time, everything
   pauses when the tab is hidden.

   WHAT v2 ADDS (the remaining phone lag):
   - HANDOVER PRELOAD: with v1, scrolling handed playback from one
     copy to the next only when the next became "most visible", and
     that copy then had to load the whole file from zero over a slow
     network — a buffering stutter at every hand-over. v2 quietly
     loads ONE neighbouring copy (paused) ahead of time, so the
     hand-over is instant.
   - ANTI-THRASH: v1 switched the winner to whichever copy had the
     highest visibility at that instant, so mid-scroll two copies
     could trade play/pause repeatedly. v2 keeps the current winner
     while it is still reasonably on screen; a challenger must be
     clearly dominant to take over.
   - BACKDROP DEFERRAL: backdrop copies no longer fetch even their
     metadata until their stage is near the viewport, so at page load
     the one playing video is not competing with four backdrop
     downloads of the same no-cache file.

   Registration is automatic for every video.adfit-m / video.adfit-bg,
   present or future (MutationObserver), so rotation scenes, rail/band
   reconciliations and liverefresh swaps are all covered. */
;(function () {
  "use strict";
  if (!window.IntersectionObserver) return; /* very old webview: leave as-is */

  var mains = [];            /* foreground videos, registration order */
  var ratios = new Map();    /* element -> last intersectionRatio */
  var winner = null;
  var arbTimer = null;

  function isBg(v) { return v.classList && v.classList.contains("adfit-bg"); }
  function isMain(v) { return v.classList && v.classList.contains("adfit-m"); }
  function stageOf(v) { try { return v.closest(".adfit,.ad-stage,.ad-grid-media"); } catch (e) { return null; } }
  function markReady(v) { var st = stageOf(v); if (st) { try { st.classList.add("adv-ready"); } catch (e) {} } }

  function freezeBg(v) {
    try {
      v.removeAttribute("autoplay");
      v.autoplay = false;
      if (!v.paused) v.pause();
    } catch (e) {}
  }

  /* Backdrops: fetch the first frame only when the stage nears view. */
  var bgIO = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var v = entries[i].target;
      if (entries[i].isIntersecting && !v._advBgLoaded) {
        v._advBgLoaded = true;
        try { v.preload = "metadata"; v.load(); } catch (e) {}
        try { bgIO.unobserve(v); } catch (e) {}
      }
    }
  }, { rootMargin: "700px 0px" });

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      ratios.set(entries[i].target, entries[i].intersectionRatio || 0);
    }
    scheduleArbitrate();
  }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });

  function register(v) {
    if (!v || v._advReg) return;
    v._advReg = true;
    if (isBg(v)) {
      try { v.preload = "none"; } catch (e) {}
      freezeBg(v);
      v.addEventListener("play", function () { freezeBg(v); });
      v.addEventListener("loadeddata", function () { freezeBg(v); markReady(v); });
      bgIO.observe(v);
      return;
    }
    if (!isMain(v)) return;
    try {
      v.removeAttribute("autoplay");
      v.autoplay = false;
      if (!v._advLoaded) v.preload = "none";
    } catch (e) {}
    v.addEventListener("canplay", function () { markReady(v); });
    v.addEventListener("loadeddata", function () { markReady(v); });
    mains.push(v);
    io.observe(v);
  }

  function rendered(v) {
    try { return document.contains(v) && !!v.getClientRects && v.getClientRects().length > 0; } catch (e) { return false; }
  }
  function startLoad(v) {
    if (v._advLoaded) return;
    v._advLoaded = true;
    try { v.preload = "auto"; v.load(); } catch (e) {}
  }

  function arbitrate() {
    arbTimer = null;
    for (var i = mains.length - 1; i >= 0; i--) {
      if (!document.contains(mains[i])) { try { io.unobserve(mains[i]); } catch (e) {} ratios.delete(mains[i]); mains.splice(i, 1); }
    }
    /* best candidate right now */
    var best = null, bestR = 0;
    for (var j = 0; j < mains.length; j++) {
      var v = mains[j];
      if (!rendered(v)) continue;
      var r = ratios.get(v) || 0;
      if (r > bestR) { bestR = r; best = v; }
    }
    /* anti-thrash: keep the current winner while it is still decently
       visible; a challenger must be clearly dominant to take over */
    var next = null;
    if (!document.hidden) {
      var cur = (winner && rendered(winner)) ? winner : null;
      var curR = cur ? (ratios.get(cur) || 0) : 0;
      if (cur && curR >= 0.3 && !(best && best !== cur && bestR >= 0.75 && curR < 0.45)) { next = cur; }
      else if (best && bestR >= 0.4) { next = best; }
    }
    winner = next;
    for (var k = 0; k < mains.length; k++) {
      var m = mains[k];
      if (m === next) {
        startLoad(m);
        try { if (m.paused) { var p = m.play(); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
      } else if (!m.paused) {
        try { m.pause(); } catch (e) {}
      }
    }
    /* handover preload: ONE neighbour, loaded but paused — the
       partially visible one if there is one, else the closest
       rendered copy within ~600px of the viewport */
    if (next) {
      var ahead = null, aheadR = 0.05;
      for (var a = 0; a < mains.length; a++) {
        var c = mains[a];
        if (c === next || !rendered(c)) continue;
        var cr = ratios.get(c) || 0;
        if (cr >= aheadR && (!ahead || cr > (ratios.get(ahead) || 0))) ahead = c;
      }
      if (!ahead) {
        var idx = mains.indexOf(next), bestDist = 600;
        for (var d = 0; d < mains.length; d++) {
          var o = mains[d];
          if (o === next || !rendered(o) || o._advLoaded) continue;
          try {
            var rc = o.getBoundingClientRect();
            var dist = rc.top >= 0 ? rc.top - window.innerHeight : -rc.bottom;
            if (dist < bestDist) { bestDist = dist; ahead = o; }
          } catch (e) {}
        }
      }
      if (ahead) { startLoad(ahead); try { if (!ahead.paused && ahead !== winner) ahead.pause(); } catch (e) {} }
    }
  }
  function scheduleArbitrate() {
    if (arbTimer) return;
    arbTimer = setTimeout(arbitrate, 60);
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === "VIDEO") register(root);
    var vs = root.querySelectorAll ? root.querySelectorAll("video.adfit-m,video.adfit-bg") : [];
    for (var i = 0; i < vs.length; i++) register(vs[i]);
  }

  scan(document.body || document.documentElement);

  try {
    new MutationObserver(function (muts) {
      var needArb = false;
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === "childList") {
          for (var a = 0; a < mu.addedNodes.length; a++) scan(mu.addedNodes[a]);
          if (mu.removedNodes.length) needArb = true;
        } else if (mu.type === "attributes") { needArb = true; }
      }
      scheduleArbitrate();
      if (needArb) setTimeout(arbitrate, 350);
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  } catch (e) {}

  document.addEventListener("visibilitychange", scheduleArbitrate);
  window.addEventListener("pageshow", scheduleArbitrate);
  window.addEventListener("resize", scheduleArbitrate);

  /* debug / verification surface */
  window.NM_adVideoState = function () {
    var playing = 0, loaded = 0;
    mains = mains.filter(function (v) { return document.contains(v); });
    for (var i = 0; i < mains.length; i++) { if (!mains[i].paused) playing++; if (mains[i]._advLoaded) loaded++; }
    var bgs = document.querySelectorAll("video.adfit-bg"), bgPlaying = 0, bgReady = 0;
    for (var b = 0; b < bgs.length; b++) { if (!bgs[b].paused) bgPlaying++; if (bgs[b].readyState > 0) bgReady++; }
    return { mains: mains.length, playing: playing, loaded: loaded, bgs: bgs.length, bgPlaying: bgPlaying, bgReady: bgReady, winner: winner ? (winner.currentSrc || winner.src || "") : "" };
  };
})();
