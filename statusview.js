/* statusview.js — WhatsApp-style status experience (2026-11-04, v2).
   Layered over updates.js WITHOUT editing it (updates.js sits at the deploy
   size ceiling). v1 replaced only the viewer; Ibrahim still hit add/preview
   trouble, so v2 owns the composer and preview too. Every defect below was
   verified in the original code before fixing:
   ADD:
   1. The file input's value was never reset, so removing a photo and picking
      the SAME photo again fired no change event — a dead tap.
   2. Files were classified by MIME type only; Android gallery/file-manager
      picks often arrive with an empty or generic type and were rejected
      with "Pick a photo or video" even when perfectly valid.
   3. Undecodable photos (e.g. HEIC) entered the grid as broken cells.
   4. Video duration of Infinity (some phone recorders) was falsely rejected
      as "over 1 minute"; a metadata load that never finished hung silently.
   5. No size guard: a >50 MB video was accepted, uploaded for minutes, then
      failed at the storage limit.
   6. Every grid redraw minted fresh object URLs and never revoked them.
   7. The "Camera" tile opened the gallery picker (no capture attribute).
   8. The post bar sat at a static 40% for the whole upload.
   PREVIEW:
   9. Any media error auto-skipped; on the last/only item the preview closed
      itself with no explanation ("preview doesn't work").
   VIEWER (v1):
   10. The old viewer painted nothing until the profile fetch returned
       (1.31s of dead screen at a 1.2s delay), and its tap zones rendered as
       permanent white chevron overlays (extras.js nm-tap-arrows).
   Fixes: a hardened pick pipeline (extension fallback classification,
   decode-validate + convert oversized/HEIC/PNG images at pick time so what
   you preview is exactly what posts, video probe with timeout + Infinity
   handling + 45 MB guard, input reset, per-item object URLs revoked on
   remove), a true camera input, an honest posting indicator with elapsed
   seconds, a preview that shows an error card instead of vanishing, and the
   v1 WhatsApp viewer (instant paint, loading screen, rAF progress synced to
   the media, invisible tap zones, hold to pause, swipe down to close).
   Contracts kept: composer DOM classes/ids (.stc2, #stc-grid, .stc2-hint,
   #stc-file, #stc-preview, #stc-post, #stc-bar) so statusx.js tag/Discover
   augmentation keeps working and posts still flow through its DB.postStatus
   wrapper; viewer DOM contract (.stv, #stv-md, .stv-seg .done, .stv-av,
   .stv-nm, .stv-cp, #stv-del) for the statusx product chip; viewed-marking
   uses the same nm_viewed_status key. */
(function () {
  "use strict";
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (e) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[e]; }); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); return; } catch (e) {} } }
  function me() { try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); return (u && (u.id || u.user_id)) || null; } catch (e) { return null; } }
  function rel(t) {
    if (window.NM_DB && window.NM_DB.relTime) { try { return window.NM_DB.relTime(t); } catch (e) {} }
    var m = Math.floor((Date.now() - new Date(t).getTime()) / 6e4);
    if (m < 1) { return "Just now"; } if (m < 60) { return m + "m ago"; }
    var h = Math.floor(m / 60); if (h < 24) { return h + "h ago"; }
    return Math.floor(h / 24) + "d ago";
  }
  function avaHtml(p) {
    if (p && p.avatar_url) { return '<img src="' + esc(p.avatar_url) + '" alt="">'; }
    var nm = (p && p.display_name) || "Seller";
    return "<span>" + esc(String(nm).trim().charAt(0).toUpperCase() || "S") + "</span>";
  }
  function markViewed(id) {
    try { var m = JSON.parse(localStorage.getItem("nm_viewed_status") || "{}"); m[id] = 1; localStorage.setItem("nm_viewed_status", JSON.stringify(m)); } catch (e) {}
  }
  function DB() { return window.NM_DB; }

  /* ================= pick pipeline ================= */
  var IMG_EXT = { jpg: 1, jpeg: 1, png: 1, webp: 1, gif: 1, bmp: 1, heic: 1, heif: 1, avif: 1 };
  var VID_EXT = { mp4: 1, mov: 1, webm: 1, "3gp": 1, mkv: 1, avi: 1, m4v: 1 };
  var MAX_VIDEO_BYTES = 45 * 1024 * 1024;
  function extOf(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
  function kindOf(f) {
    var t = (f.type || "").toLowerCase(), e = extOf(f.name);
    if (t.indexOf("video/") === 0) { return "video"; }
    if (t.indexOf("image/") === 0) { return "image"; }
    if (VID_EXT[e]) { return "video"; }
    if (IMG_EXT[e]) { return "image"; }
    return null;
  }
  var _webpOk = null;
  function webpOk() {
    if (_webpOk === null) {
      try { _webpOk = document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0; }
      catch (e) { _webpOk = false; }
    }
    return _webpOk;
  }
  function prepImage(f) {
    /* Decode-validate the photo NOW (not at preview/post time) and convert
       it when that helps: HEIC that this phone can decode becomes JPEG/WebP
       (stored HEIC renders nowhere else), oversized or >1600px images are
       re-encoded smaller so preview, upload and display all use the exact
       same file. Returns {file} or null when the photo cannot be decoded. */
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(f);
      var im = new Image();
      var done = false;
      function fin(v) { if (done) { return; } done = true; try { URL.revokeObjectURL(url); } catch (e) {} resolve(v); }
      im.onload = function () {
        var w = im.naturalWidth || 0, h = im.naturalHeight || 0;
        var isHeic = /heic|heif/i.test(f.type || "") || /\.hei[cf]$/i.test(f.name || "");
        var need = isHeic || f.size > 1500000 || Math.max(w, h) > 1600;
        if (!need || !w || !h) { fin({ file: f }); return; }
        try {
          var scale = Math.min(1, 1600 / Math.max(w, h));
          var cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(w * scale));
          cv.height = Math.max(1, Math.round(h * scale));
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          var outType = (/png/i.test(f.type || "") && webpOk()) ? "image/webp" : "image/jpeg";
          cv.toBlob(function (b) {
            if (!b) { fin({ file: f }); return; }
            if (b.size < f.size || isHeic) {
              var base = String(f.name || "photo").replace(/\.[^.]+$/, "") || "photo";
              var nf = null;
              try { nf = new File([b], base + (outType === "image/webp" ? ".webp" : ".jpg"), { type: outType }); } catch (e) { nf = b; }
              fin({ file: nf });
            } else { fin({ file: f }); }
          }, outType, 0.85);
        } catch (e) { fin({ file: f }); }
      };
      im.onerror = function () { fin(null); };
      im.src = url;
    });
  }
  function probeVideo(f) {
    /* Resolves {dur} (dur may be non-finite — some recorders report
       Infinity), or null on error/timeout instead of hanging forever. */
    return new Promise(function (resolve) {
      var v = document.createElement("video");
      v.preload = "metadata"; v.muted = true;
      var url = URL.createObjectURL(f);
      var done = false;
      var to = setTimeout(function () { fin(null); }, 9000);
      function fin(val) { if (done) { return; } done = true; clearTimeout(to); try { URL.revokeObjectURL(url); } catch (e) {} resolve(val); }
      v.onloadedmetadata = function () { fin({ dur: v.duration }); };
      v.onerror = function () { fin(null); };
      v.src = url;
    });
  }

  /* ================= composer ================= */
  var C = { items: [], posting: false };
  function revoke(it) { if (it && it.url) { try { URL.revokeObjectURL(it.url); } catch (e) {} it.url = null; } }
  function clearPicks() { C.items.forEach(revoke); C.items = []; }
  function showPrep() {
    var root = $("#status-root"); if (!root) { return; }
    var c2 = $(".stc2", root); if (!c2) { return; }
    var el = $("#sv-prep", root);
    if (!el) {
      el = document.createElement("div");
      el.id = "sv-prep"; el.className = "sv-prep";
      el.innerHTML = '<span class="sv-ring sm"></span><span>Preparing your media…</span>';
      c2.appendChild(el);
    }
    el.hidden = false;
  }
  function hidePrep() { var el = $("#sv-prep"); if (el) { el.hidden = true; } }

  function composer(keep) {
    var root = $("#status-root"); if (!root) { return; }
    if (!keep) { clearPicks(); }
    root.innerHTML = '<div class="stc2">' +
      '<div class="stc2-hd"><button class="stc2-x" id="stc-cancel" aria-label="Close">×</button><h3>Add status</h3></div>' +
      '<div class="stc2-sub">Recents ▾</div>' +
      '<div class="stc2-grid" id="stc-grid"></div>' +
      '<p class="stc2-hint">Up to 5 pictures, or one video of up to 1 minute. Your status is visible to your followers for 24 hours. Add a caption to each item in Preview.</p>' +
      '<div class="stc-bar" id="stc-bar"><i></i></div>' +
      '<div class="stc2-bt"><button class="stc2-pv" id="stc-preview" disabled>Preview</button><button class="stc-post" id="stc-post">Post status</button></div>' +
      '<input type="file" id="stc-file" accept="image/*,video/*" multiple hidden>' +
      '<input type="file" id="stc-file-cam" accept="image/*,video/*" capture="environment" hidden></div>';
    root.classList.add("on");
    $("#stc-cancel").addEventListener("click", function () { window.NM_statusClose(); });
    $("#stc-file").addEventListener("change", onPick);
    $("#stc-file-cam").addEventListener("change", onPick);
    $("#stc-post").addEventListener("click", onPost);
    $("#stc-preview").addEventListener("click", function () { window.NM_statusPreview(); });
    drawPicks();
  }
  function onPick(e) {
    var input = e.target;
    var files = Array.prototype.slice.call(input.files || []);
    input.value = "";   /* FIX 1: the same file can be picked again later */
    if (!files.length) { return; }
    var kinds = files.map(kindOf);
    if (kinds.some(function (k) { return !k; })) { toast("That file type can't be posted as a status."); return; }
    var vids = files.filter(function (f, i) { return kinds[i] === "video"; });
    var imgs = files.filter(function (f, i) { return kinds[i] === "image"; });
    if (vids.length > 1 || (vids.length === 1 && files.length > 1)) { toast("Post one video or up to 5 pictures."); return; }
    if (vids.length === 1) {
      var vf = vids[0];
      if (vf.size > MAX_VIDEO_BYTES) { toast("That video is too large to post (about 45 MB max). Trim it and try again."); return; }
      showPrep();
      probeVideo(vf).then(function (r) {
        hidePrep();
        if (!r) { toast("That video could not be read on this phone. Try an MP4 video."); return; }
        if (r.dur && isFinite(r.dur) && r.dur > 60.5) { toast("Video must be 1 minute or less."); return; }
        clearPicks();
        C.items = [{ file: vf, kind: "video", dur: isFinite(r.dur) ? r.dur : 0, url: URL.createObjectURL(vf), cap: "" }];
        drawPicks();
      });
      return;
    }
    var hadVideo = C.items.length && C.items[0].kind === "video";
    var cur = hadVideo ? [] : C.items;
    var room = 5 - cur.length;
    if (room <= 0) { toast("Up to 5 pictures."); return; }
    if (imgs.length > room) { toast("Up to 5 pictures."); imgs = imgs.slice(0, room); }
    showPrep();
    var chain = Promise.resolve(), added = [], failed = 0;
    imgs.forEach(function (f) {
      chain = chain.then(function () {
        return prepImage(f).then(function (r) {
          if (r) { added.push({ file: r.file, kind: "image", url: URL.createObjectURL(r.file), cap: "" }); }
          else { failed++; }
        });
      });
    });
    chain.then(function () {
      hidePrep();
      if (failed && !added.length) {
        toast("Those photos could not be read on this phone. HEIC photos are not supported yet — set your camera to JPEG or pick other photos.");
        return;
      }
      if (failed) { toast(failed + (failed === 1 ? " photo" : " photos") + " could not be read and was skipped."); }
      if (added.length) {
        if (hadVideo) { clearPicks(); }
        C.items = cur.concat(added);
        drawPicks();
      }
    });
  }
  function drawPicks() {
    var g = $("#stc-grid"); if (!g) { return; }
    var cam = '<button class="stc2-cam" id="stc-cam"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h2.4l2-2.6h7.2L17.6 8H20a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13" r="3.6"/></svg><span>Camera</span></button>';
    var cells = C.items.map(function (p, i) {
      var media = p.kind === "video"
        ? '<video src="' + p.url + '" muted playsinline preload="metadata"></video>'
        : '<img src="' + p.url + '" alt="">';
      var dur = p.kind === "video" ? '<span class="stc2-dur">▶ ' + (p.dur ? Math.round(p.dur) + "s" : "video") + "</span>" : "";
      return '<div class="stc2-cell"><div class="stc2-round">' + media + "</div>" + dur +
        '<button class="stc2-rm" data-rm="' + i + '" aria-label="Remove">×</button></div>';
    }).join("");
    var canAdd = C.items.length && C.items[0].kind === "image" && C.items.length < 5;
    g.innerHTML = cam + cells + (canAdd ? '<button class="stc2-add" id="stc-add" aria-label="Add more">+</button>' : "");
    var f = $("#stc-file"), fc = $("#stc-file-cam");
    var camB = $("#stc-cam"); if (camB && fc) { camB.addEventListener("click", function () { fc.click(); }); }
    var addB = $("#stc-add"); if (addB && f) { addB.addEventListener("click", function () { f.click(); }); }
    g.querySelectorAll("[data-rm]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-rm");
        if (C.items[i]) { revoke(C.items[i]); C.items.splice(i, 1); }
        drawPicks();
      });
    });
    var pv = $("#stc-preview"); if (pv) { pv.disabled = !C.items.length; }
  }
  function onPost() {
    var D = DB(); if (!D || !C.items.length) { toast("Pick a photo or video first."); return; }
    if (C.posting) { return; }
    C.posting = true;
    var btn = $("#stc-post"), bar = $("#stc-bar");
    var t0 = Date.now();
    if (btn) { btn.disabled = true; btn.textContent = "Posting…"; }
    if (bar) { bar.classList.add("on"); }
    var secIv = setInterval(function () {
      var b = $("#stc-post");
      if (b && C.posting) { b.textContent = "Posting… " + Math.floor((Date.now() - t0) / 1000) + "s"; }
    }, 1000);
    D.postStatus(C.items, C.items.map(function (p) { return p.cap || ""; })).then(function () {
      clearInterval(secIv);
      C.posting = false;
      toast("Status posted.");
      clearPicks();
      window.NM_statusClose();
      if (window.NM_updatesOpen) { window.NM_updatesOpen(true); }
    }).catch(function (e) {
      clearInterval(secIv);
      C.posting = false;
      var b = $("#stc-post"); if (b) { b.disabled = false; b.textContent = "Post status"; }
      var br = $("#stc-bar"); if (br) { br.classList.remove("on"); }
      toast((e && e.message) || "Could not post status. Check your connection.");
    });
  }

  /* ================= preview ================= */
  var P = null;
  function teardownPreview() {
    if (!P) { return; }
    P.dead = true;
    if (P.raf) { cancelAnimationFrame(P.raf); }
    if (P.loadTimer) { clearTimeout(P.loadTimer); }
    if (P.vid) { try { P.vid.pause(); } catch (e) {} }
    P = null;
  }
  function pvSegsHtml() {
    return C.items.map(function (p, i) {
      return '<div class="stv-seg' + (i < P.idx ? " done" : "") + '"><i style="width:' + (i < P.idx ? "100" : "0") + '%"></i></div>';
    }).join("");
  }
  function pvSetSeg(i, pct) {
    var segs = document.querySelectorAll("#pv-segs .stv-seg");
    var s = segs[i]; if (s && s.firstChild) { s.firstChild.style.width = pct + "%"; }
  }
  function preview() {
    if (!C.items.length) { return; }
    var root = $("#status-root"); if (!root) { return; }
    teardown();
    teardownPreview();
    P = { idx: 0, dead: false, raf: 0, vid: null, ready: false, elapsed: 0, dur: 5000, lastTs: 0, capFocus: false, wantNext: false, loadTimer: 0 };
    root.innerHTML = '<div class="stv sv2">' +
      '<div class="sv-bg" id="pv-bg"></div>' +
      '<div class="stv-segs" id="pv-segs">' + pvSegsHtml() + "</div>" +
      '<div class="stv-hd"><span class="stv-av" id="pv-av"></span><div><div class="stv-nm">Your status</div><div class="stv-tm">Preview</div></div>' +
      '<button class="stv-x" id="pv-x" aria-label="Back">×</button></div>' +
      '<div class="stv-md" id="pv-md"><div class="sv-load"><div class="sv-ring"></div><div class="sv-load-t">Loading preview…</div></div></div>' +
      '<div class="pv-capwrap"><input type="text" class="pv-cap" id="pv-cap" maxlength="300" placeholder="Add a caption for this item"></div>' +
      "</div>";
    root.classList.add("on");
    var D = DB(), my = me();
    if (D && D.getProfileById && my) {
      D.getProfileById(my).then(function (p) { var el = $("#pv-av"); if (el && p) { el.innerHTML = avaHtml(p); } }).catch(function () {});
    }
    $("#pv-x").addEventListener("click", function () { backToComposer(); });
    var stv = $(".sv2", root);
    var pd = null;
    stv.addEventListener("pointerdown", function (e) {
      if (!P || P.dead) { return; }
      if (e.target.closest && e.target.closest("#pv-x,.pv-capwrap")) { return; }
      pd = { x: e.clientX };
    });
    stv.addEventListener("pointerup", function (e) {
      if (!pd || !P || P.dead) { pd = null; return; }
      var x = pd.x; pd = null;
      if (e.target.closest && e.target.closest("#pv-x,.pv-capwrap")) { return; }
      var w = stv.getBoundingClientRect().width || window.innerWidth;
      if (x < w * 0.32) { pvPrev(); } else { pvNext(); }
    });
    showPreviewItem();
  }
  function backToComposer() {
    teardownPreview();
    window.NM_statusComposer(true);
  }
  function showPreviewItem() {
    if (!P || P.dead) { return; }
    if (P.idx >= C.items.length) { backToComposer(); return; }
    var it = C.items[P.idx];
    P.ready = false; P.vid = null; P.elapsed = 0; P.dur = 5000; P.lastTs = 0; P.wantNext = false;
    var segs = $("#pv-segs"); if (segs) { segs.innerHTML = pvSegsHtml(); }
    var bg = $("#pv-bg"); if (bg) { bg.style.backgroundImage = "url(\"" + it.url + "\")"; }
    var capEl = $("#pv-cap");
    if (capEl) {
      capEl.value = it.cap || "";
      if (!capEl._svW) {
        capEl._svW = true;
        capEl.addEventListener("click", function (e) { e.stopPropagation(); });
        capEl.addEventListener("input", function () { if (P && C.items[P.idx]) { C.items[P.idx].cap = capEl.value; } });
        capEl.addEventListener("focus", function () { if (P) { P.capFocus = true; } });
        capEl.addEventListener("blur", function () {
          if (!P || P.dead) { return; }
          P.capFocus = false;
          if (C.items[P.idx]) { C.items[P.idx].cap = capEl.value; }
          if (P.wantNext) { P.wantNext = false; pvNext(); return; }
          P.lastTs = 0;   /* resume progress from where it paused */
        });
      }
    }
    var md = $("#pv-md"); if (!md) { return; }
    md.innerHTML = '<div class="sv-load"><div class="sv-ring"></div><div class="sv-load-t">Loading preview…</div></div>';
    var myIdx = P.idx, settled = false;
    function alive() { return P && !P.dead && P.idx === myIdx && !settled; }
    function ready(mediaEl, durMs) {
      if (!alive()) { return; }
      settled = true;
      clearTimeout(P.loadTimer);
      md.innerHTML = "";
      mediaEl.classList.add("sv-media");
      md.appendChild(mediaEl);
      P.ready = true;
      if (durMs) { P.dur = durMs; }
      P.lastTs = 0;
      pvTickStart();
    }
    function fail() {
      if (!alive()) { return; }
      settled = true;
      clearTimeout(P.loadTimer);
      /* FIX 9: an error card, never a silent skip or vanish. */
      md.innerHTML = '<div class="sv-err"><div class="sv-err-t">This item could not be previewed</div>' +
        '<div class="sv-err-s">It may still post, but if it looks wrong here it will look wrong to your followers too. Go back and pick it again, or remove it.</div></div>';
    }
    P.loadTimer = setTimeout(fail, 15000);
    if (it.kind === "video") {
      var v = document.createElement("video");
      v.src = it.url; v.playsInline = true; v.controls = false; v.preload = "auto";
      P.vid = v;
      v.oncanplay = function () {
        ready(v, Math.max(1, (v.duration || 5)) * 1000);
        var pr = v.play();
        if (pr && pr.catch) { pr.catch(function () { v.muted = true; v.play().catch(function () {}); }); }
      };
      v.onended = function () {
        if (!P || P.dead || P.idx !== myIdx) { return; }
        pvSetSeg(myIdx, 100);
        if (P.capFocus) { P.wantNext = true; }
        else if (P.idx < C.items.length - 1) { pvNext(); }
      };
      v.onerror = function () { fail(); };
    } else {
      var im = new Image();
      im.onload = function () { ready(im, 5000); };
      im.onerror = function () { fail(); };
      im.src = it.url;
    }
  }
  function pvTickStart() {
    if (!P || P.raf) { return; }
    var step = function (ts) {
      if (!P || P.dead) { return; }
      if (P.ready && !P.capFocus) {
        if (P.vid) {
          if (P.vid.duration) { P.dur = P.vid.duration * 1000; P.elapsed = P.vid.currentTime * 1000; }
        } else {
          if (P.lastTs) { P.elapsed += ts - P.lastTs; }
          if (P.elapsed >= P.dur) {
            pvSetSeg(P.idx, 100);
            if (P.idx < C.items.length - 1) { pvNext(); return; }
            P.ready = false;   /* last photo: hold on it, like the original */
          }
        }
        if (P && !P.dead) { pvSetSeg(P.idx, P.dur ? Math.min(100, (P.elapsed / P.dur) * 100) : 0); }
      }
      P.lastTs = ts;
      if (P && !P.dead) { P.raf = requestAnimationFrame(step); }
    };
    P.raf = requestAnimationFrame(step);
  }
  function pvNext() {
    if (!P || P.dead) { return; }
    if (P.raf) { cancelAnimationFrame(P.raf); P.raf = 0; }
    if (P.vid) { try { P.vid.pause(); } catch (e) {} }
    P.idx++;
    showPreviewItem();
  }
  function pvPrev() {
    if (!P || P.dead || P.idx <= 0) { return; }
    if (P.raf) { cancelAnimationFrame(P.raf); P.raf = 0; }
    if (P.vid) { try { P.vid.pause(); } catch (e) {} }
    P.idx--;
    showPreviewItem();
  }

  /* ================= viewer engine (v1, unchanged behaviour) ================= */
  var S = null;
  function teardown() {
    if (!S) { return; }
    S.dead = true;
    if (S.raf) { cancelAnimationFrame(S.raf); }
    if (S.loadTimer) { clearTimeout(S.loadTimer); }
    if (S.delTimer) { clearTimeout(S.delTimer); }
    if (S._pdTimer) { clearTimeout(S._pdTimer); }
    if (S.vid) { try { S.vid.pause(); } catch (e) {} }
    S = null;
  }
  function closeViewer(refresh) {
    teardown();
    if (window.NM_statusClose && window.NM_statusClose._svOrig) { window.NM_statusClose._svOrig(); }
    if (refresh && window.NM_updatesOpen) { try { window.NM_updatesOpen(true); } catch (e) {} }
  }
  function segsHtml() {
    return S.items.map(function (it, i) {
      return '<div class="stv-seg' + (i < S.idx ? " done" : "") + '"><i style="width:' + (i < S.idx ? "100" : "0") + '%"></i></div>';
    }).join("");
  }
  function setSeg(i, pct) {
    var segs = document.querySelectorAll("#status-root .stv-seg");
    var s = segs[i]; if (!s || !s.firstChild) { return; }
    s.firstChild.style.width = pct + "%";
  }
  function view(userId, rows) {
    var root = $("#status-root"); if (!root || !rows || !rows.length) { return; }
    var items = [];
    rows.forEach(function (r) {
      (r.media_urls || []).forEach(function (u, mi) {
        items.push({ row: r, url: u, kind: r.kind, cap: (r.captions && r.captions[mi]) || (mi === 0 ? (r.caption || "") : "") });
      });
    });
    if (!items.length) { return; }
    teardown();
    teardownPreview();
    var my = me(), own = String(my) === String(userId);
    S = {
      userId: userId, rows: rows, items: items, idx: 0, own: own, dead: false,
      raf: 0, vid: null, ready: false, holding: false, delPause: false, delArmed: false,
      elapsed: 0, dur: 5000, lastTs: 0, loadTimer: 0, delTimer: 0, _pdTimer: 0,
      name: (rows[0] && rows[0]._nm) || null
    };
    root.innerHTML = '<div class="stv sv2">' +
      '<div class="sv-bg" id="sv-bg"></div>' +
      '<div class="stv-segs" id="sv-segs">' + segsHtml() + "</div>" +
      '<div class="stv-hd"><span class="stv-av" id="stv-av">' + (S.name ? "<span>" + esc(S.name.trim().charAt(0).toUpperCase() || "S") + "</span>" : '<span class="sv-skel"></span>') + "</span>" +
      '<div><div class="stv-nm" id="sv-nm">' + (S.name ? esc(S.name) : "Loading…") + '</div><div class="stv-tm" id="sv-tm"></div></div>' +
      '<button class="stv-x" id="stv-x" aria-label="Close">×</button></div>' +
      '<div class="stv-md" id="stv-md"><div class="sv-load" id="sv-load"><div class="sv-ring"></div><div class="sv-load-t">Loading status…</div></div></div>' +
      '<div class="stv-cp" id="sv-cap" hidden></div>' +
      (own ? '<button class="stv-del" id="stv-del">Delete status</button>' : "") +
      "</div>";
    root.classList.add("on");
    wireChrome();
    loadProfile();
    showItem();
  }
  function wireChrome() {
    var root = $("#status-root");
    var x = $("#stv-x"); if (x) { x.addEventListener("click", function (e) { e.stopPropagation(); closeViewer(true); }); }
    var del = $("#stv-del");
    if (del) { del.addEventListener("click", function (e) { e.stopPropagation(); onDelete(del); }); }
    var stv = $(".sv2", root);
    if (!stv || stv._svPtr) { return; }
    stv._svPtr = true;
    var pd = null;
    stv.addEventListener("pointerdown", function (e) {
      if (!S || S.dead) { return; }
      if (e.target.closest && e.target.closest("#stv-x,#stv-del,.stx-chip,.stv-hd")) { return; }
      pd = { x: e.clientX, y: e.clientY, t: Date.now(), held: false };
      S._pdTimer = setTimeout(function () {
        if (pd && S && !S.dead) { pd.held = true; S.holding = true; if (S.vid) { try { S.vid.pause(); } catch (err) {} } }
      }, 230);
    });
    stv.addEventListener("pointermove", function (e) {
      if (!pd || !S || S.dead) { return; }
      if (e.clientY - pd.y > 90) { pd = null; clearTimeout(S._pdTimer); closeViewer(true); }
    });
    function up(e) {
      if (!pd || !S || S.dead) { pd = null; return; }
      clearTimeout(S._pdTimer);
      var wasHeld = pd.held, x = pd.x;
      pd = null;
      if (wasHeld) {
        S.holding = false;
        if (S.vid && S.ready) { try { S.vid.play().catch(function () {}); } catch (err) {} }
        return;
      }
      if (e.target.closest && e.target.closest("#stv-x,#stv-del,.stx-chip,.stv-hd")) { return; }
      var w = stv.getBoundingClientRect().width || window.innerWidth;
      if (x < w * 0.32) { prev(); } else { next(); }
    }
    stv.addEventListener("pointerup", up);
    stv.addEventListener("pointercancel", function () { pd = null; if (S) { S.holding = false; clearTimeout(S._pdTimer); } });
  }
  function loadProfile() {
    var D = DB(); if (!D || !D.getProfileById || !S) { return; }
    var uid = S.userId, st = S;
    D.getProfileById(uid).then(function (p) {
      if (!S || S.dead || S !== st || !p) { return; }
      S.name = p.display_name || "Seller";
      var av = $("#stv-av"); if (av) { av.innerHTML = avaHtml(p); }
      var nm = $("#sv-nm"); if (nm) { nm.textContent = S.name; }
      if (!S.own) {
        var goStore = function (e) { e.stopPropagation(); var u = uid; closeViewer(false); if (window.NM_openStore) { window.NM_openStore(u); } };
        if (nm) { nm.style.cursor = "pointer"; nm.addEventListener("click", goStore); }
        if (av) { av.style.cursor = "pointer"; av.addEventListener("click", goStore); }
      }
    }).catch(function () {});
  }
  function onDelete(del) {
    var D = DB(); if (!S) { return; }
    if (!D || !D.deleteStatus) { toast("Could not delete. Reopen the app and try again."); return; }
    if (!S.delArmed) {
      S.delArmed = true; S.delPause = true;
      del.textContent = "Tap again to confirm delete";
      del.classList.add("arm");
      clearTimeout(S.delTimer);
      S.delTimer = setTimeout(function () {
        if (!S) { return; }
        S.delArmed = false; S.delPause = false;
        var d = $("#stv-del"); if (d) { d.textContent = "Delete status"; d.classList.remove("arm"); }
      }, 5000);
      return;
    }
    clearTimeout(S.delTimer);
    del.disabled = true; del.textContent = "Deleting…";
    var rowId = S.items[S.idx].row.id;
    D.deleteStatus(rowId).then(function () {
      toast("Status deleted");
      closeViewer(true);
    }).catch(function (er) {
      toast((er && er.message) || "Could not delete. Check your connection and try again.");
      if (!S) { return; }
      S.delArmed = false; S.delPause = false;
      var d = $("#stv-del"); if (d) { d.disabled = false; d.textContent = "Delete status"; d.classList.remove("arm"); }
    });
  }
  function showItem() {
    if (!S || S.dead) { return; }
    if (S.idx >= S.items.length) { closeViewer(true); return; }
    var it = S.items[S.idx];
    markViewed(it.row.id);
    S.ready = false; S.vid = null; S.elapsed = 0; S.dur = 5000; S.lastTs = 0;
    S.delArmed = false; S.delPause = false;
    var del = $("#stv-del"); if (del) { del.disabled = false; del.textContent = "Delete status"; del.classList.remove("arm"); }
    var segs = $("#sv-segs"); if (segs) { segs.innerHTML = segsHtml(); }
    var tm = $("#sv-tm"); if (tm) { tm.textContent = rel(it.row.created_at); }
    var cap = $("#sv-cap");
    if (cap) {
      if (it.cap) { cap.textContent = it.cap; cap.hidden = false; } else { cap.hidden = true; cap.textContent = ""; }
    }
    var bg = $("#sv-bg"); if (bg) { bg.style.backgroundImage = "url(\"" + it.url + "\")"; }
    var md = $("#stv-md"); if (!md) { return; }
    md.innerHTML = '<div class="sv-load" id="sv-load"><div class="sv-ring"></div><div class="sv-load-t">Loading status…</div></div>';
    var mySeq = S.idx, settled = false;
    function alive() { return S && !S.dead && S.idx === mySeq && !settled; }
    function ready(mediaEl, durMs) {
      if (!alive()) { return; }
      settled = true;
      clearTimeout(S.loadTimer);
      md.innerHTML = "";
      mediaEl.classList.add("sv-media");
      md.appendChild(mediaEl);
      S.ready = true;
      S.elapsed = 0;
      if (durMs) { S.dur = durMs; }
      S.lastTs = 0;
      startTick();
      preloadNext();
    }
    function fail() {
      if (!alive()) { return; }
      settled = true;
      clearTimeout(S.loadTimer);
      toast("Could not load that status. Skipping…");
      next();
    }
    S.loadTimer = setTimeout(fail, 15000);
    if (it.kind === "video") {
      var v = document.createElement("video");
      v.src = it.url; v.playsInline = true; v.controls = false; v.preload = "auto";
      S.vid = v;
      v.oncanplay = function () {
        ready(v, Math.max(1, (v.duration || 5)) * 1000);
        var pr = v.play();
        if (pr && pr.catch) { pr.catch(function () { v.muted = true; v.play().catch(function () {}); }); }
      };
      v.onended = function () { if (S && !S.dead && S.idx === mySeq) { setSeg(mySeq, 100); next(); } };
      v.onerror = function () { fail(); };
    } else {
      var im = new Image();
      im.onload = function () { ready(im, 5000); };
      im.onerror = function () { fail(); };
      im.src = it.url;
    }
  }
  function startTick() {
    if (!S || S.raf) { return; }
    var step = function (ts) {
      if (!S || S.dead) { return; }
      if (S.ready && !S.holding && !S.delPause) {
        if (S.vid) {
          if (S.vid.duration) { S.dur = S.vid.duration * 1000; S.elapsed = S.vid.currentTime * 1000; }
        } else {
          if (S.lastTs) { S.elapsed += ts - S.lastTs; }
          if (S.elapsed >= S.dur) { setSeg(S.idx, 100); next(); return; }
        }
        if (S && !S.dead) { setSeg(S.idx, S.dur ? Math.min(100, (S.elapsed / S.dur) * 100) : 0); }
      }
      S.lastTs = ts;
      if (S && !S.dead) { S.raf = requestAnimationFrame(step); }
    };
    S.raf = requestAnimationFrame(step);
  }
  function preloadNext() {
    if (!S) { return; }
    var nx = S.items[S.idx + 1]; if (!nx) { return; }
    if (nx.kind === "video") { var v = document.createElement("video"); v.preload = "metadata"; v.muted = true; v.src = nx.url; }
    else { var i = new Image(); i.src = nx.url; }
  }
  function next() {
    if (!S || S.dead) { return; }
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    if (S.vid) { try { S.vid.pause(); } catch (e) {} }
    S.idx++;
    showItem();
  }
  function prev() {
    if (!S || S.dead || S.idx <= 0) { return; }
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    if (S.vid) { try { S.vid.pause(); } catch (e) {} }
    S.idx--;
    showItem();
  }

  /* ================= install (once — statusx wraps these afterwards) ==== */
  function install() {
    if (window.__svInstalled) { return; }
    if (!window.NM_statusViewer || !window.NM_statusComposer || !window.NM_statusPreview) { return; }
    window.__svInstalled = true;
    var viewerFn = function (userId, rows) { view(userId, rows); };
    viewerFn._sv = true;
    window.NM_statusViewer = viewerFn;
    var previewFn = function () { preview(); };
    previewFn._sv = true;
    window.NM_statusPreview = previewFn;
    var composerFn = function (keep) { composer(!!keep); };
    composerFn._sv = true;
    window.NM_statusComposer = composerFn;
    var origClose = window.NM_statusClose;
    var closeFn = function () { teardown(); teardownPreview(); if (origClose) { origClose(); } };
    closeFn._sv = true;
    closeFn._svOrig = origClose;
    window.NM_statusClose = closeFn;
  }
  install();
  if (!window.__svInstalled) { document.addEventListener("DOMContentLoaded", install); }
})();
