/* Nationwide Media Connect — imgprep.js (2026-10-24)
   Egress cuts for Supabase Storage, installed as a transparent wrapper
   around the app's storage client. supabase/client.js is frozen (at the
   deploy size ceiling), so instead of editing its upload call sites,
   this module wraps client.storage.from() once the client exists and
   processes EVERY storage upload centrally:

   1) CACHE POLICY (per bucket, only when the call site set none):
      - status-media, banner-artwork: cacheControl 31536000 (1 year).
        Object paths there are unique per upload (timestamps + random
        suffixes, upsert:false), so a long TTL can never serve a stale
        replacement.
      - product-images: cacheControl 86400 (1 day). Paths are
        products/<id>/<n>.jpg with upsert:true — a re-edited listing
        reuses the same path, so the TTL is kept short enough that a
        photo change still propagates within a day, while repeat feed
        views inside that day are served from the CDN cache instead of
        billing full egress every time.
      - avatars: deliberately NOT overridden. Path avatars/<uid>.jpg is
        overwritten in place on every change, the file is tiny, and the
        supabase-js built-in default (max-age=3600) already applies.
      Before this module, uploads carried no explicit cacheControl and
      were served as "public, max-age=3600".

   2) IMAGE PREP (still images only): decode with EXIF orientation
      respected (createImageBitmap {imageOrientation:"from-image"},
      falling back to a plain decode / <img>), cap the longest side at
      1600px, then re-encode at quality 0.82 AS WEBP whenever this
      browser can truly encode WebP (added 2026-11-02: whatever format
      the user uploads — JPEG, PNG, anything — is stored as WebP, which
      keeps the same visual quality for roughly a third less weight,
      and keeps transparency too). If WebP encoding is unavailable the
      old same-format-family behaviour applies (png->png, webp->webp,
      else jpeg). The processed blob replaces the upload ONLY when it
      is smaller than the input or a cap-resize was required; never
      upscales. When the format changes, the wrapper also corrects the
      upload's contentType to the blob's real type (the path is left
      untouched — call sites build URLs from it). Videos, GIFs, SVGs
      and non-image bodies pass through byte-identical, and any failure
      anywhere falls back to the original body — an upload can never
      be broken by this module.

   Every other bucket method (getPublicUrl, remove, list, download,
   signed URLs) is delegated untouched, and upload options the call
   sites pass (contentType, upsert) are preserved verbatim. */
;(function () {
  "use strict";

  var MAX_SIDE = 1600;
  var QUALITY = 0.82;
  var TTL = {
    "status-media": "31536000",
    "banner-artwork": "31536000",
    "product-images": "86400"
  };

  /* ---------------- image prep ---------------- */
  function isImageBody(b) {
    return !!b && typeof b === "object" && typeof b.size === "number" &&
      typeof b.type === "string" && b.type.indexOf("image/") === 0;
  }
  function skippable(type) {
    return type === "image/gif" || type === "image/svg+xml";
  }
  function outType(type) {
    if (type === "image/png") return "image/png";
    if (type === "image/webp") return "image/webp";
    return "image/jpeg";
  }
  var _webpOk = null;
  function webpOk() {
    if (_webpOk !== null) return _webpOk;
    try {
      var c = document.createElement("canvas");
      _webpOk = !!(c.toDataURL && c.toDataURL("image/webp").indexOf("data:image/webp") === 0);
    } catch (e) { _webpOk = false; }
    return _webpOk;
  }
  function decodeViaBitmap(blob) {
    var p;
    try {
      p = createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch (e) {
      p = createImageBitmap(blob);
    }
    return Promise.resolve(p).catch(function () { return createImageBitmap(blob); });
  }
  function decodeViaImg(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { resolve({ bmp: img, url: url, w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) {} reject(new Error("decode failed")); };
      img.src = url;
    });
  }
  function decode(blob) {
    if (typeof window !== "undefined" && typeof window.createImageBitmap === "function") {
      return decodeViaBitmap(blob).then(function (bmp) {
        return { bmp: bmp, url: null, w: bmp.width, h: bmp.height };
      }, function () { return decodeViaImg(blob); });
    }
    return decodeViaImg(blob);
  }
  function prep(input) {
    if (!isImageBody(input) || skippable(input.type)) return Promise.resolve(input);
    if (typeof document === "undefined") return Promise.resolve(input);
    return decode(input).then(function (d) {
      var w = d.w, h = d.h;
      function cleanup() {
        try { if (d.bmp && typeof d.bmp.close === "function") d.bmp.close(); } catch (e) {}
        if (d.url) { try { URL.revokeObjectURL(d.url); } catch (e) {} }
      }
      if (!w || !h) { cleanup(); return input; }
      var longest = Math.max(w, h);
      var scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
      var resized = scale < 1;
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      var cx = cv.getContext("2d");
      if (!cx) { cleanup(); return input; }
      try { cx.drawImage(d.bmp, 0, 0, cw, ch); } catch (e) { cleanup(); return input; }
      cleanup();
      function encodeAs(type) {
        return new Promise(function (resolve) {
          if (!cv.toBlob) { resolve(null); return; }
          try {
            cv.toBlob(function (blob) { resolve(blob || null); }, type, QUALITY);
          } catch (e) { resolve(null); }
        });
      }
      function legacy() {
        return encodeAs(outType(input.type)).then(function (blob) {
          if (!blob) return input;
          if (resized || blob.size < input.size) return blob;
          return input;
        });
      }
      if (webpOk()) {
        return encodeAs("image/webp").then(function (wb) {
          if (wb && wb.type === "image/webp" && (resized || wb.size < input.size)) return wb;
          return legacy();
        });
      }
      return legacy();
    }).catch(function () { return input; });
  }

  /* ---------------- storage wrapper ---------------- */
  function wrapBucket(bucketName, real) {
    if (!real || typeof real.upload !== "function") return real;
    return new Proxy(real, {
      get: function (target, prop) {
        if (prop === "upload" || prop === "update") {
          var orig = target[prop];
          return function (path, body, options) {
            var opts = options || {};
            var ttl = TTL[bucketName];
            var finalOpts = opts;
            if (ttl && !opts.cacheControl) {
              finalOpts = {};
              for (var k in opts) { if (Object.prototype.hasOwnProperty.call(opts, k)) finalOpts[k] = opts[k]; }
              finalOpts.cacheControl = ttl;
            }
            return prep(body).then(function (b) {
              var useOpts = finalOpts;
              if (b && b !== body && typeof b.type === "string" && b.type && (!body || b.type !== body.type)) {
                useOpts = {};
                for (var k2 in finalOpts) { if (Object.prototype.hasOwnProperty.call(finalOpts, k2)) useOpts[k2] = finalOpts[k2]; }
                useOpts.contentType = b.type;
              }
              return orig.call(target, path, b, useOpts);
            }, function () {
              return orig.call(target, path, body, finalOpts);
            });
          };
        }
        var v = target[prop];
        return typeof v === "function" ? v.bind(target) : v;
      }
    });
  }
  function wrapStorage(storage) {
    if (!storage || typeof storage.from !== "function") return false;
    if (storage.__nmImgprep) return true;
    var origFrom = storage.from.bind(storage);
    storage.from = function (bucket) {
      return wrapBucket(bucket, origFrom(bucket));
    };
    try { storage.__nmImgprep = true; } catch (e) {}
    return true;
  }
  function tryInstall() {
    var DB = window.NM_DB;
    if (DB && DB.client && DB.client.storage) return wrapStorage(DB.client.storage);
    return false;
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (tryInstall() || tries > 75) clearInterval(iv);
  }, 800);
  tryInstall();
  /* Watchdog: if the client object is ever swapped, wrap the new one too. */
  var watch = 0;
  var wiv = setInterval(function () {
    watch++;
    tryInstall();
    if (watch > 12) clearInterval(wiv);
  }, 15000);

  window.NM_imgPrep = prep;
})();
