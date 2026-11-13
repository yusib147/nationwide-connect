/* Nationwide Media Connect — photogate.js (2026-10-25, v4 banner)
   Ibrahim's current model (2026-10-25 ~19:58 WAT, supersedes the
   blocking gate of v1–v3): a signed-in account with NO profile
   picture is greeted at app entry by a dismissible top banner styled
   like the Open Beta bar. Nothing blocks entry. The banner offers
   "Add photo" (opens the photo sheet: Take a photo / Choose from
   gallery) and "Skip" (dismisses it). Show rule shipped with v4:
   - it appears at app entry for a signed-in user whose stored avatar
     is not proven, and stays while they browse until they act on it;
   - Skip stamps a per-account localStorage timestamp
     (nm_photo_skip_<uid>): the banner then stays away for 7 days,
     across screens and reloads, and never reappears mid-session
     after a skip;
   - a user with a proven avatar never sees it (any skip stamp is
     cleared); signed-out visitors never see it; it is suppressed on
     the auth/OTP/recover screens so it never greets mid-signup —
     signup completes and the banner is simply the greeter inside.
   The grandfathered nudge is merged into this same banner: one
   mechanism for everyone without a photo, new or old accounts alike.

   POLICY (unchanged from the v3 advisory change): a profile picture
   is recommended, and a clear photo of your face is recommended most
   (buyers and sellers trust a person they can see) — but ANY picture
   the user uploads is accepted. Face detection and AI classification
   are NOT part of the flow; their code is left in this file DORMANT
   (loadFaceApi / detectFace / classify / flag, uncalled from the
   banner path) and the check-photo Edge Function + the ai-scan
   photo_check branch stay deployed server-side, in case a future
   policy wants them back.

   WHY THE GATE CAME DOWN (diagnosis of Ibrahim's stuck upload,
   2026-10-25): the v2 completion path ran two verification stages
   BEFORE the save — an on-device face detector fed by ~860KB of CDN
   downloads with NO timeout anywhere in that stage (a stall = a
   silent, permanent "Looking for your face…"), and a server AI
   classification whose endpoint measured 46.7s returning a
   non-verdict {"flagged":true} while its providers were down (a
   guaranteed ~15s "Confirming…" freeze via the race cap; a second
   probe got 502 "classification unavailable" in 31.6s). The save
   itself was degraded: uploadAvatar's storage path
   ("avatars/<uid>.jpg" inside the avatars bucket) is RLS-denied in
   production (proven by direct REST probe: 400 "new row violates
   row-level security policy" — the bucket policy expects the uid as
   the first path segment), so every save silently fell back to a
   base64 data URL in profiles.avatar_url. The upload pipeline below
   is the robust one built for v3: choose/capture -> decode -> square
   crop -> compress (with a size guard so the data-URL fallback
   always stays far under the 90,000-char DB shape cap) ->
   DB.uploadAvatar, and every failure surfaces a plain-language
   message with the buttons re-enabled — no silent stuck states.

   The boot veil and fail-closed entry blocking of v2/v3 are RETIRED
   with the gate (the inline veil script is removed from index.html).
   The suspension gate (gateplus.js) is a separate mechanism and is
   untouched. The server-side companion supabase/photogate_guard.sql
   (applied 2026-10-25) stays exactly as it is: it only restricts
   profiles.avatar_url to the genuine upload shapes and makes
   profiles.created_at immutable — still correct under this model.
   A stored avatar only counts as "has a photo" if it has one of the
   two shapes uploadAvatar can produce (avatarProven below).
   Upload-success grace: a resolved uploadAvatar records a 30s
   session proof, so a lagging profile read-back can never resurrect
   the banner right after a successful save. */
(function () {
  "use strict";

  var BANNER_ID = "nm-photo-banner";
  var SHEET_ID = "nm-photo-sheet";
  var SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; /* Skip = 7 days away */
  var FACE_LIB = window.NM_FACE_LIB_URL || "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
  var FACE_WEIGHTS = window.NM_FACE_WEIGHTS_URL || "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
  var state = { uid: null, name: "", busy: false, resolved: false };

  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m) { if (window.NM_toast) { try { window.NM_toast(m); } catch (e) {} } }
  function DB() { return window.NM_DB || null; }
  function activeScreen() { var s = $(".screen.active"); return s ? s.id : ""; }
  function authBusy() {
    var a = activeScreen();
    return a === "screen-auth" || a === "screen-otp" || a === "screen-recover";
  }

  var CSS =
    "#" + BANNER_ID + "{position:sticky;top:0;z-index:99990;display:flex;align-items:center;gap:10px;padding:9px 14px;background:linear-gradient(90deg,#e8380d,#ff7a18);color:#fff;font-size:13px;line-height:1.45;box-shadow:0 2px 10px rgba(0,0,0,.18);font-family:inherit}" +
    ".pgb-tag{flex:0 0 auto;background:#fff;color:#c22e06;font-weight:800;font-size:11px;letter-spacing:.4px;text-transform:uppercase;padding:3px 8px;border-radius:999px}" +
    ".pgb-txt{flex:1 1 auto}" +
    ".pgb-add{flex:0 0 auto;background:#fff;color:#c22e06;border:0;font-weight:800;font-size:13px;padding:7px 14px;border-radius:999px;cursor:pointer;font-family:inherit}" +
    ".pgb-skip{flex:0 0 auto;background:rgba(255,255,255,.18);border:0;color:#fff;font-weight:700;font-size:13px;padding:7px 12px;border-radius:999px;cursor:pointer;font-family:inherit}" +
    "#" + SHEET_ID + "{position:fixed;inset:0;z-index:99992;background:rgba(15,17,21,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit;overflow-y:auto}" +
    ".pg-card{background:var(--chrome,#fff);color:var(--ink,#241a10);border-radius:18px;max-width:420px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35)}" +
    ".pg-ava{width:104px;height:104px;border-radius:50%;margin:2px auto 14px;background:var(--chrome2,#f3e7d3);border:3px solid var(--acc,#ff5a1f);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;color:var(--acc2,#e8380d);overflow:hidden}" +
    ".pg-ava img{width:100%;height:100%;object-fit:cover;display:block}" +
    ".pg-card h2{margin:0 0 8px;font-size:21px}" +
    ".pg-card p{margin:0 0 16px;color:var(--muted,#7a6a58);font-size:14.5px;line-height:1.55}" +
    ".pg-btn{display:block;width:100%;box-sizing:border-box;background:var(--acc-grad,linear-gradient(135deg,#ff5a1f,#e8380d));color:#fff;border:0;border-radius:12px;padding:14px;font-size:15.5px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:10px}" +
    ".pg-btn2{background:var(--chrome2,#f3e7d3);color:var(--ink,#241a10);border:1.5px solid var(--line-soft,#e5d9c5)}" +
    ".pg-btn[disabled]{opacity:.55;cursor:wait}" +
    ".pg-later{display:block;width:100%;margin-top:10px;background:none;border:0;color:var(--acc2,#e8380d);font-size:14.5px;font-weight:700;padding:10px;cursor:pointer;font-family:inherit}" +
    ".pg-err{min-height:20px;margin:12px 0 0;color:#d43a1f;font-size:13.5px;font-weight:600}" +
    ".pg-status{min-height:18px;margin:12px 0 0;color:var(--muted,#7a6a58);font-size:13.5px;font-weight:600}" +
    ".pg-vid{width:100%;border-radius:12px;background:#000;max-height:330px;object-fit:cover;display:block}" +
    ".pg-vid.mirror{transform:scaleX(-1)}" +
    ".pg-camrow{display:flex;gap:8px;margin-top:10px}" +
    ".pg-camrow .pg-btn{margin-top:0;padding:12px;font-size:14.5px}" +
    ".pg-prev{width:100%;border-radius:12px;display:block;max-height:330px;object-fit:cover}";

  function ensureCss() {
    if (document.getElementById("pg-css")) { return; }
    var st = document.createElement("style");
    st.id = "pg-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------- image helpers ---------------- */
  function decodeBlob(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url, w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) {} reject(new Error("Could not read that photo.")); };
      img.src = url;
    });
  }
  function cropCanvas(img, size) {
    var side = Math.min(img.naturalWidth, img.naturalHeight);
    var sx = Math.round((img.naturalWidth - side) / 2);
    var sy = Math.round((img.naturalHeight - side) / 2);
    var cv = document.createElement("canvas");
    cv.width = size; cv.height = size;
    cv.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return cv;
  }
  function canvasBlob(cv, type, q) {
    return new Promise(function (resolve, reject) {
      cv.toBlob(function (b) { if (b) { resolve(b); } else { reject(new Error("Could not process that photo.")); } }, type || "image/jpeg", q || 0.85);
    });
  }

  /* ---------------- LAYER 1: on-device face presence ----------------
     DORMANT since the 2026-10-25 advisory policy: detectFace() is not
     called from the banner path (or anywhere). Kept (with Layer 2
     below) so a future policy can re-enable face checks without
     rebuilding them. */
  var faceReady = null; /* Promise<boolean> */
  function loadFaceApi() {
    if (faceReady) { return faceReady; }
    faceReady = new Promise(function (resolve) {
      function have() { return typeof window.faceapi !== "undefined" && window.faceapi.nets && window.faceapi.nets.tinyFaceDetector; }
      function loadModel() {
        if (!have()) { resolve(false); return; }
        window.faceapi.nets.tinyFaceDetector.loadFromUri(FACE_WEIGHTS).then(function () { resolve(true); }, function () { resolve(false); });
      }
      if (have() && window.faceapi.nets.tinyFaceDetector.params) { resolve(true); return; }
      if (have()) { loadModel(); return; }
      var sc = document.createElement("script");
      sc.src = FACE_LIB;
      sc.onload = loadModel;
      sc.onerror = function () { resolve(false); };
      document.head.appendChild(sc);
      setTimeout(function () { if (!have()) { resolve(false); } }, 20000);
    });
    return faceReady;
  }
  /* -> {state:"pass"} | {state:"reject", msg} | {state:"unavailable"} */
  function detectFace(cv) {
    return loadFaceApi().then(function (ok) {
      if (!ok || !window.faceapi) { return { state: "unavailable" }; }
      var opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });
      return window.faceapi.detectAllFaces(cv, opts).then(function (dets) {
        if (!dets || !dets.length) {
          return { state: "reject", msg: "Please use a clear photo of your face." };
        }
        /* The tiny detector often emits a second, larger halo box around
           a big close-up face: it overlaps the true box heavily and
           frequently extends past the frame edge (measured on a real
           capture: true box score .96, halo .57, 46% overlap of the true
           box, halo origin at negative coordinates). Such boxes are the
           SAME face. Genuinely different faces (a group photo) sit side
           by side with ~zero overlap and stay inside the frame, so the
           multi-face rejection still fires for them. */
        var sorted = dets.slice().sort(function (a, z) { return z.score - a.score; });
        var primary = sorted[0];
        function overlapRatio(b1, b2) {
          var x = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          var y = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          var inter = x * y;
          var minArea = Math.min(b1.width * b1.height, b2.width * b2.height);
          return minArea > 0 ? inter / minArea : 0;
        }
        function haloBox(b) {
          return b.x < -0.05 * b.width || b.y < -0.05 * b.height ||
            b.x + b.width > cv.width + 0.05 * b.width || b.y + b.height > cv.height + 0.05 * b.height;
        }
        var others = sorted.slice(1).filter(function (d) {
          return overlapRatio(d.box, primary.box) < 0.3 && !haloBox(d.box);
        });
        if (others.length) {
          return { state: "reject", msg: "Please use a photo with only your face in it." };
        }
        var b = primary.box;
        var imgArea = cv.width * cv.height;
        var share = (b.width * b.height) / imgArea;
        var wShare = b.width / cv.width;
        if (share < 0.03 || wShare < 0.15) {
          return { state: "reject", msg: "Your face is too small in that photo. Move closer and try again." };
        }
        if (share > 0.85) {
          return { state: "reject", msg: "That photo is too close up. Use a normal head and shoulders photo." };
        }
        return { state: "pass" };
      }).catch(function () { return { state: "unavailable" }; });
    });
  }

  /* ---------------- LAYER 2: server AI classification ----------------
     DORMANT since the 2026-10-25 advisory policy: classify() is not
     called from the banner path (or anywhere). The /api/ai-scan
     photo_check branch and the check-photo Edge Function stay
     deployed server-side. */
  var KIND_MSG = {
    logo: "That looks like a logo. Please use a real photo of yourself.",
    product: "That looks like a product photo. Please use a real photo of yourself.",
    object: "That looks like an object, not a person. Please use a real photo of yourself.",
    illustration: "That looks like a drawing or cartoon. Please use a real photo of yourself.",
    screenshot: "That looks like a screenshot. Please use a real photo of yourself.",
    text: "That looks like text, not a photo of a person. Please use a real photo of yourself.",
    animal: "That is an animal. Please use a real photo of yourself.",
    other: "Please use a real photo of yourself."
  };
  /* -> {state:"human"} | {state:"reject", msg} | {state:"unknown"} */
  function classify(cv256) {
    var db = DB();
    if (!db || typeof db.aiScan !== "function") { return Promise.resolve({ state: "unknown" }); }
    var dataUrl;
    try { dataUrl = cv256.toDataURL("image/jpeg", 0.85); } catch (e) { return Promise.resolve({ state: "unknown" }); }
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 15000); });
    return Promise.race([db.aiScan({ photo_check: dataUrl }), timeout]).then(function (j) {
      if (!j || typeof j.human_photo !== "boolean") { return { state: "unknown" }; }
      if (j.human_photo) { return { state: "human" }; }
      return { state: "reject", msg: KIND_MSG[j.kind] || KIND_MSG.other };
    }).catch(function () { return { state: "unknown" }; });
  }

  function flag(status) {
    var db = DB();
    try {
      if (db && db.client && db.client.auth && db.client.auth.updateUser) {
        return db.client.auth.updateUser({ data: { photo_check: status, photo_check_at: new Date().toISOString() } })
          .then(function () {}, function () {});
      }
    } catch (e) {}
    return Promise.resolve();
  }

  /* ---------------- upload-success session proof ----------------
     A resolved uploadAvatar() call means the server accepted the save
     (storage object or the profiles.avatar_url fallback — both are
     confirmed writes). The profile READ can still lag behind the
     write (replica/CDN), so the upload records a 30s session proof:
     while it is fresh, the watcher keeps the banner away and keeps
     re-checking; once the stored avatar reads back proven, the proof
     is cleared. */
  var proofMem = {}; /* uid -> {at, url} */
  function recordProof(uid, url) {
    if (!uid) { return; }
    proofMem[uid] = { at: Date.now(), url: url || "" };
    try { sessionStorage.setItem("nm_photo_done_" + uid, JSON.stringify(proofMem[uid])); } catch (e) {}
  }
  function readProof(uid) {
    if (!uid) { return null; }
    var p = proofMem[uid] || null;
    if (!p) {
      try {
        var raw = sessionStorage.getItem("nm_photo_done_" + uid);
        if (raw) { p = JSON.parse(raw); proofMem[uid] = p; }
      } catch (e) {}
    }
    if (!p || !p.at) { return null; }
    if (Date.now() - p.at > 30000) { clearProof(uid); return null; }
    return p;
  }
  function clearProof(uid) {
    if (!uid) { return; }
    delete proofMem[uid];
    try { sessionStorage.removeItem("nm_photo_done_" + uid); } catch (e) {}
  }

  /* ---------------- the shared pipeline (any picture) ----------------
     choose/capture -> decode -> square crop -> compress (with a size
     guard so the data-URL fallback avatar always stays far under the
     90,000-char shape cap) -> DB.uploadAvatar. NO face detection, NO
     AI classification — those are advisory-era remnants, dormant
     above. Every failure lands in .pg-err in plain language with the
     buttons re-enabled. */
  /* ctx: {err, status, ava, setBusy} from the card that started it. */
  function processImage(blob, ctx, root) {
    var db = DB();
    if (!db || typeof db.uploadAvatar !== "function") {
      ctx.err.textContent = "Photo upload is not available right now. Check your connection, then try again.";
      return Promise.resolve(false);
    }
    ctx.setBusy(true);
    ctx.err.textContent = "";
    ctx.status.textContent = "Preparing your photo…";
    var stage = "decode";
    return decodeBlob(blob).then(function (d) {
      var minSide = Math.min(d.w, d.h);
      if (!d.w || !d.h || minSide < 96) {
        try { URL.revokeObjectURL(d.url); } catch (e) {}
        throw { pgMsg: "That photo is too small to use. Please pick a different photo." };
      }
      var avatarCv = cropCanvas(d.img, 256);
      try { URL.revokeObjectURL(d.url); } catch (e) {}
      stage = "save";
      ctx.status.textContent = "Saving your photo…";
      return canvasBlob(avatarCv, "image/jpeg", 0.85).then(function (b) {
        /* Size guard: if the storage path is unavailable, uploadAvatar
           stores a base64 data URL in the profile, which the watcher
           and the DB guard only accept up to 90,000 chars (~67KB of
           JPEG). A 256px JPEG is normally 15–40KB; if one ever comes
           out huge, re-encode smaller/coarser until it fits with room
           to spare, so a successful save can never be un-provable. */
        if (b.size <= 48000) { return b; }
        var small = document.createElement("canvas");
        small.width = 192; small.height = 192;
        try { small.getContext("2d").drawImage(avatarCv, 0, 0, 192, 192); } catch (e) { return b; }
        return canvasBlob(small, "image/jpeg", 0.62).then(function (b2) {
          return b2 && b2.size < b.size ? b2 : b;
        }).catch(function () { return b; });
      }).then(function (b) {
        if (window.NM_imgPrep) { return window.NM_imgPrep(b).catch(function () { return b; }); }
        return b;
      }).then(function (b) {
        return db.uploadAvatar(b);
      });
    }).then(function (url) {
      /* The save is confirmed: close the sheet and the banner NOW —
         never wait on a profile read-back that can lag the write. */
      recordProof(state.uid, typeof url === "string" ? url : "");
      ctx.setBusy(false);
      ctx.status.textContent = "";
      stopCamera(root);
      clearSkip(state.uid);
      dropSheet(); dropBanner();
      toast("Photo added. Welcome to Nationwide Media Connect!");
      check();
      return true;
    }).catch(function (err) {
      ctx.setBusy(false);
      ctx.status.textContent = "";
      if (err && err.pgMsg) {
        ctx.err.textContent = err.pgMsg;
      } else if (stage === "save") {
        ctx.err.textContent = "Your photo could not be saved. Check your connection, then try again — or pick a different photo.";
      } else {
        ctx.err.textContent = "Something went wrong with that photo. Please try again, or pick a different photo.";
      }
      return false;
    });
  }

  /* ---------------- camera ---------------- */
  function stopCamera(root) {
    if (!root) { return; }
    var v = root.querySelector("[data-video]");
    if (v && v.srcObject) {
      try { v.srcObject.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      v.srcObject = null;
    }
    var wrap = root.querySelector("[data-camwrap]");
    if (wrap) { wrap.hidden = true; }
  }
  function startCamera(root, ctx) {
    var wrap = root.querySelector("[data-camwrap]");
    var video = root.querySelector("[data-video]");
    var prev = root.querySelector("[data-preview]");
    if (prev) { prev.hidden = true; }
    ctx.err.textContent = "";
    function fallback(msg) {
      stopCamera(root);
      if (msg) { ctx.err.textContent = msg; }
      var cf = root.querySelector("[data-camfile]");
      if (cf) { cf.click(); }
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      fallback("");
      return;
    }
    var facing = root.__pgFacing || "user";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false }).then(function (stream) {
      wrap.hidden = false;
      video.srcObject = stream;
      video.classList.toggle("mirror", facing === "user");
      var p = video.play();
      if (p && p.catch) { p.catch(function () {}); }
    }).catch(function (err) {
      if (err && err.name === "NotAllowedError") {
        ctx.err.textContent = "Camera permission was refused. You can choose a photo from your gallery instead.";
        return;
      }
      if (err && (err.name === "NotFoundError" || err.name === "OverconstrainedError" || err.name === "NotReadableError")) {
        fallback("The camera could not be opened here, so pick a photo instead.");
        return;
      }
      ctx.err.textContent = "The camera could not be opened. You can choose a photo from your gallery instead.";
    });
  }
  function capturePhoto(root, ctx) {
    var video = root.querySelector("[data-video]");
    if (!video || !video.videoWidth) { return; }
    var facing = root.__pgFacing || "user";
    var cv = document.createElement("canvas");
    cv.width = video.videoWidth; cv.height = video.videoHeight;
    var cx = cv.getContext("2d");
    if (facing === "user") { cx.translate(cv.width, 0); cx.scale(-1, 1); }
    cx.drawImage(video, 0, 0);
    stopCamera(root);
    canvasBlob(cv, "image/jpeg", 0.92).then(function (blob) {
      var prev = root.querySelector("[data-preview]");
      var img = root.querySelector("[data-previmg]");
      try { img.src = URL.createObjectURL(blob); } catch (e) {}
      prev.hidden = false;
      root.__pgCapture = blob;
    }).catch(function () {
      ctx.err.textContent = "Could not capture that photo. Try again.";
    });
  }

  /* ---------------- the photo sheet (opened from the banner) ------- */
  function buildCard(root, name) {
    var initial = String(name || "M").trim().charAt(0).toUpperCase() || "M";
    root.__pgFacing = "user";
    root.innerHTML =
      '<div class="pg-card">' +
      '<div class="pg-ava" data-ava>' + initial + "</div>" +
      "<h2>Add your profile photo</h2>" +
      "<p>We recommend a clear photo of your face, because buyers and sellers trust a person they can see — but any picture of yours will do.</p>" +
      '<div data-camwrap hidden><video class="pg-vid" data-video autoplay playsinline muted></video>' +
      '<div class="pg-camrow"><button type="button" class="pg-btn" data-capture>Capture</button>' +
      '<button type="button" class="pg-btn pg-btn2" data-flip>Flip</button>' +
      '<button type="button" class="pg-btn pg-btn2" data-camcancel>Cancel</button></div></div>' +
      '<div data-preview hidden><img class="pg-prev" data-previmg alt="Your photo">' +
      '<div class="pg-camrow"><button type="button" class="pg-btn" data-use>Use this photo</button>' +
      '<button type="button" class="pg-btn pg-btn2" data-retake>Retake</button></div></div>' +
      '<div data-pickrow>' +
      '<button type="button" class="pg-btn" data-take>Take a photo</button>' +
      '<button type="button" class="pg-btn pg-btn2" data-pick>Choose from gallery</button>' +
      "</div>" +
      '<input type="file" accept="image/*" hidden data-file>' +
      '<input type="file" accept="image/*" capture="user" hidden data-camfile>' +
      '<button type="button" class="pg-later" data-close>Not now</button>' +
      '<p class="pg-status" data-status></p>' +
      '<p class="pg-err" data-err></p>' +
      "</div>";

    var ctx = {
      err: root.querySelector("[data-err]"),
      status: root.querySelector("[data-status]"),
      ava: root.querySelector("[data-ava]"),
      setBusy: function (on) {
        state.busy = !!on;
        root.querySelectorAll("[data-take],[data-pick],[data-capture],[data-use],[data-retake],[data-flip]").forEach(function (b) { b.disabled = !!on; });
      }
    };
    root.__pgCtx = ctx;

    var fileIn = root.querySelector("[data-file]");
    var camIn = root.querySelector("[data-camfile]");
    function onFile(input) {
      var f = input.files && input.files[0];
      input.value = "";
      if (!f) { return; }
      if (String(f.type || "").indexOf("image/") !== 0) { ctx.err.textContent = "Pick an image file."; return; }
      try { ctx.ava.innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="">'; } catch (e) {}
      processImage(f, ctx, root);
    }
    fileIn.addEventListener("change", function () { onFile(fileIn); });
    camIn.addEventListener("change", function () { onFile(camIn); });
    root.querySelector("[data-pick]").addEventListener("click", function () { fileIn.click(); });
    root.querySelector("[data-take]").addEventListener("click", function () { startCamera(root, ctx); });
    root.querySelector("[data-camcancel]").addEventListener("click", function () { stopCamera(root); });
    root.querySelector("[data-flip]").addEventListener("click", function () {
      root.__pgFacing = root.__pgFacing === "user" ? "environment" : "user";
      stopCamera(root);
      startCamera(root, ctx);
    });
    root.querySelector("[data-capture]").addEventListener("click", function () { capturePhoto(root, ctx); });
    root.querySelector("[data-retake]").addEventListener("click", function () {
      root.querySelector("[data-preview]").hidden = true;
      startCamera(root, ctx);
    });
    root.querySelector("[data-use]").addEventListener("click", function () {
      if (!root.__pgCapture) { return; }
      try { ctx.ava.innerHTML = '<img src="' + URL.createObjectURL(root.__pgCapture) + '" alt="">'; } catch (e) {}
      processImage(root.__pgCapture, ctx, root);
    });
    root.querySelector("[data-close]").addEventListener("click", function () { dropSheet(); });
  }

  function openSheet() {
    ensureCss();
    if (document.getElementById(SHEET_ID)) { return; }
    var s = document.createElement("div");
    s.id = SHEET_ID;
    document.body.appendChild(s);
    buildCard(s, state.name);
    s.addEventListener("click", function (e) { if (e.target === s) { dropSheet(); } });
  }
  function dropSheet() { var s = document.getElementById(SHEET_ID); if (s) { stopCamera(s); s.remove(); } }

  /* ---------------- the banner + Skip snooze ---------------- */
  function skipKey(uid) { return "nm_photo_skip_" + uid; }
  function snoozed(uid) {
    if (!uid) { return false; }
    try {
      var ts = parseInt(localStorage.getItem(skipKey(uid)) || "0", 10);
      return !!ts && (Date.now() - ts < SNOOZE_MS);
    } catch (e) { return false; }
  }
  function setSkip(uid) {
    if (!uid) { return; }
    try { localStorage.setItem(skipKey(uid), String(Date.now())); } catch (e) {}
  }
  function clearSkip(uid) {
    if (!uid) { return; }
    try { localStorage.removeItem(skipKey(uid)); } catch (e) {}
  }

  function showBanner() {
    ensureCss();
    if (document.getElementById(BANNER_ID)) { return; }
    var bar = document.createElement("div");
    bar.id = BANNER_ID;
    bar.innerHTML =
      '<span class="pgb-tag">Profile photo</span>' +
      '<span class="pgb-txt"><b>Add a profile picture.</b> A profile picture with your face helps people trust you more.</span>' +
      '<button type="button" class="pgb-add">Add photo</button>' +
      '<button type="button" class="pgb-skip">Skip</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector(".pgb-add").addEventListener("click", function () { openSheet(); });
    bar.querySelector(".pgb-skip").addEventListener("click", function () {
      setSkip(state.uid);
      dropBanner();
    });
  }
  function dropBanner() { var b = document.getElementById(BANNER_ID); if (b) { b.remove(); } }

  /* ---------------- watcher ---------------------------------------
     Quiet by design: it never blocks, veils or gates anything. It
     only maintains the banner — show it for a signed-in user with no
     proven photo (unless snoozed), remove it the moment a proven
     photo exists or the user signs out. Every ambiguity simply
     leaves things as they are and lets the next cycle look again. */
  var retryTimer = null;
  function scheduleRetry(ms) {
    if (retryTimer) { return; }
    retryTimer = setTimeout(function () { retryTimer = null; check(); }, ms);
  }

  /* The raw GoTrue user (server-issued fields only). PERF (2026-10-26):
     auth.getUser() makes a NETWORK round-trip on every call, and the
     watcher calls it every cycle — that was 2 REST calls per check,
     ~6/minute in the first minute and 6/minute forever after. The
     stored session (auth.getSession(), a local read) carries the same
     server-issued user fields and is what the rest of the app already
     trusts for identity; the banner is advisory, so session truth is
     the right source. getUser stays as a fallback for old clients. */
  function rawUser(db) {
    if (!db.client || !db.client.auth) { return Promise.resolve(undefined); }
    if (typeof db.client.auth.getSession === "function") {
      return db.client.auth.getSession().then(function (res) {
        var s = (res && res.data && res.data.session) || null;
        return s ? (s.user || null) : null;
      }).catch(function () { return undefined; }); /* undefined = could not tell */
    }
    if (typeof db.client.auth.getUser === "function") {
      return db.client.auth.getUser().then(function (res) {
        return (res && res.data && res.data.user) || null;
      }).catch(function () { return undefined; }); /* undefined = could not tell */
    }
    return Promise.resolve(undefined);
  }

  /* A stored avatar only counts as "has a photo" if it has one of the
     two shapes uploadAvatar can produce: the user's own file in the
     avatars bucket, or the small JPEG data URL the RLS fallback
     stores. Anything else (a hand-set external URL via the REST API)
     is not a real uploaded photo. */
  function avatarProven(pr, uid) {
    var u = pr && pr.avatar_url;
    if (!u) { return false; }
    if (u.indexOf("/storage/v1/object/public/avatars/avatars/" + uid + ".jpg") > -1) { return true; }
    if (u.indexOf("data:image/jpeg;base64,") === 0 && u.length <= 90000) { return true; }
    return false;
  }

  function resolveBanner(raw, pr) {
    var uid = raw.id;
    var meta = raw.user_metadata || {};
    state.name = (pr && pr.display_name) || meta.display_name || raw.email || "";
    if (pr && avatarProven(pr, uid)) {
      clearProof(uid);
      clearSkip(uid);
      dropBanner(); dropSheet();
      return;
    }
    if (readProof(uid)) {
      /* A save succeeded moments ago; the read-back has not caught
         up yet. Keep the banner away and re-check shortly. */
      dropBanner();
      scheduleRetry(6000);
      return;
    }
    if (document.getElementById(SHEET_ID)) { return; } /* sheet open: banner waits underneath */
    if (snoozed(uid)) { dropBanner(); return; }
    showBanner();
  }

  function check() {
    var db = DB();
    if (!db || typeof db.currentUser !== "function") { return; }
    if (state.busy) { return; } /* a photo upload is in flight in the sheet */
    if (document.hidden) { return; } /* the visibilitychange hook re-checks on return */
    if (db.mode !== "supabase" || !db.client) { return; } /* cannot tell: stay silent */
    rawUser(db).then(function (raw) {
      if (raw === undefined) { return; } /* could not tell: stay silent */
      if (!raw || !raw.id) { /* positively signed out */
        state.uid = null;
        dropBanner(); dropSheet();
        return;
      }
      state.uid = raw.id;
      state.resolved = true; /* a real user is known: the fast poll can stand down */
      if (authBusy()) { return; } /* never greet mid-auth-flow; entry checks catch up */
      return db.getProfileById(raw.id).then(function (pr) {
        resolveBanner(raw, pr || null);
      }).catch(function () { /* fetch error: stay silent, next cycle retries */ });
    }).catch(function () {});
  }

  var tries = 0;
  (function boot() {
    var db = DB();
    if (db && typeof db.currentUser === "function") {
      check();
      /* Fast poll for the first minute: catches the post-signup /
         post-verification entry and slow session restores within
         ~2s instead of waiting for the slow interval. PERF
         (2026-10-26): it stands down as soon as a user has actually
         been resolved (the banner decision is then made — before, it
         burned the full 30 cycles regardless), and the steady-state
         interval relaxes 20s -> 60s: the profiles realtime hook,
         focus and visibilitychange already catch changes promptly,
         so the interval is only a backstop. */
      var fast = 0;
      var fastTimer = setInterval(function () {
        fast++;
        check();
        if (fast >= 30 || state.resolved) { clearInterval(fastTimer); }
      }, 2000);
      setInterval(check, 60000);
      document.addEventListener("visibilitychange", function () { if (!document.hidden) { check(); } });
      window.addEventListener("focus", check);
      if (db.onLive) { try { db.onLive("profiles", function () { check(); }); } catch (e) {} }
      setTimeout(check, 1500);
      setTimeout(check, 4500);
    } else if (tries++ < 40) {
      setTimeout(boot, 500);
    }
  })();

  window.NM_photoGate = { check: check, _processForTest: processImage };
})();
