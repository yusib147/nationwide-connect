/* Nationwide Media Connect — banner artwork submission (buyer side).
   After a buyer pays for the home page banner (banner_30d, N5,000, 2 weeks)
   they upload their artwork here: ONE video (max 20 seconds) OR up to TWO
   pictures, plus their business name, one short line and an optional link.
   The submission goes to banner_submissions as "pending" for admin review;
   when approved the admin creates the home page banner scene(s), which run
   14 days from the day they go live. Files are uploaded straight to the
   "banner-artwork" storage bucket under the caller's own user-id folder;
   the server re-validates every URL before accepting a submission. */
;(function () {
  "use strict";
  var BUCKET = "banner-artwork";
  var MAX_VIDEO_BYTES = 25 * 1024 * 1024;  /* 25MB */
  var MAX_PIC_BYTES = 5 * 1024 * 1024;     /* 5MB per picture */
  var MAX_VIDEO_SECS = 20.5;              /* 20-second cap with a small tolerance */

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtDate(ts) { try { return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function toast(m) { try { if (window.NM_int && window.NM_int.toast) { window.NM_int.toast(m); return; } } catch (e) {} try { if (window.NM_toast) { window.NM_toast(m); } } catch (e) {} }
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

  try {
    var st = document.createElement("style");
    st.id = "nm-bs-css";
    st.textContent = ".nm-bs-page{position:fixed;inset:0;z-index:99990;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch}"
      + ".nm-bs-wrap{max-width:720px;margin:0 auto;padding:0 0 calc(30px + env(safe-area-inset-bottom))}"
      + ".nm-bs-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;background:var(--card);border-bottom:1px solid var(--line-soft);padding:calc(12px + env(safe-area-inset-top)) 14px 12px}"
      + ".nm-bs-top h2{margin:0;font-size:17px;font-weight:800;color:var(--ink)}"
      + ".nm-bs-sec{margin:14px 14px 0;background:var(--card);border:1px solid var(--line-soft);border-radius:20px;padding:18px;box-shadow:var(--shadow-card)}"
      + ".nm-bs-sec h3{margin:0 0 8px;font-size:15.5px;font-weight:800;color:var(--ink)}"
      + ".nm-bs-sub{font-size:13px;color:var(--muted);line-height:1.6;margin:0 0 12px}"
      + ".nm-bs-in{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:11px 13px;font-size:14px;font-family:inherit;margin-bottom:9px}"
      + ".nm-bs-in:focus{outline:0;border-color:var(--acc2)}"
      + ".nm-bs-btn{border:0;border-radius:12px;background:var(--acc-grad);color:#fff;font-weight:800;font-size:14px;padding:12px 16px;cursor:pointer;min-height:46px}"
      + ".nm-bs-btn.ghost{background:var(--card);color:var(--ink);border:1.5px solid var(--line)}"
      + ".nm-bs-btn:disabled{opacity:.55;cursor:default}"
      + ".nm-bs-mode{display:flex;gap:8px;margin-bottom:12px}"
      + ".nm-bs-mode button{flex:1;border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:12px;padding:12px 8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;min-height:46px}"
      + ".nm-bs-mode button.on{border-color:var(--acc2);background:var(--acc-soft)}"
      + ".nm-bs-thumbs{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 12px}"
      + ".nm-bs-thumb{width:110px;height:110px;border-radius:12px;object-fit:cover;background:#000}"
      + "video.nm-bs-thumb{width:220px}"
      + ".nm-bs-chip{display:inline-block;font-size:11px;font-weight:800;border-radius:99px;padding:4px 10px;background:var(--acc-soft);color:var(--muted);margin-bottom:8px}"
      + ".nm-bs-chip.live{background:#e7f8ee;color:#0d7a3d}"
      + ".nm-bs-err{font-size:13px;color:#c0392b;font-weight:700;margin:0 0 10px;min-height:0}";
    document.head.appendChild(st);
  } catch (e) {}

  function mediaPreview(media) {
    return (media || []).map(function (m) {
      if (m.kind === "video") return '<video class="nm-bs-thumb" src="' + esc(m.url) + '" controls preload="metadata"></video>';
      return '<img class="nm-bs-thumb" src="' + esc(m.url) + '" alt="Banner artwork">';
    }).join("");
  }

  function open() {
    var old = document.getElementById("nm-bs-page");
    if (old) old.remove();
    var page = document.createElement("div");
    page.className = "nm-bs-page";
    page.id = "nm-bs-page";
    page.innerHTML = '<div class="nm-bs-wrap"><div class="nm-bs-top"><button type="button" class="icon-btn" id="nm-bs-back" aria-label="Back">‹</button><h2>Your home page banner</h2></div><div id="nm-bs-body"><div class="nm-bs-sec"><p class="nm-bs-sub">Loading…</p></div></div></div>';
    document.body.appendChild(page);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    function close() { page.remove(); try { document.body.style.overflow = ""; } catch (e) {} }
    page.querySelector("#nm-bs-back").addEventListener("click", close);
    window.NM_closeBannerSubmit = close;
    renderState(page);
  }
  window.NM_openBannerSubmit = open;

  function renderState(page) {
    var host = page.querySelector("#nm-bs-body");
    host.innerHTML = '<div class="nm-bs-sec"><p class="nm-bs-sub">Loading…</p></div>';
    api("state", {}).then(function (j) {
      if (!j || !j.ok) { host.innerHTML = '<div class="nm-bs-sec"><p class="nm-bs-sub">Could not load your banner details right now. Please go back and try again.</p></div>'; return; }
      var latest = j.latest;
      if (!j.paidBanner) {
        host.innerHTML = '<div class="nm-bs-sec"><h3>No banner booking yet</h3>' +
          '<p class="nm-bs-sub">You have not paid for a home page banner. Once you pay for the ₦5,000 banner, you can upload your video or pictures right here and we will review them.</p></div>';
        return;
      }
      if (latest && latest.status === "pending") {
        host.innerHTML = '<div class="nm-bs-sec"><span class="nm-bs-chip">Under review</span><h3>Artwork received</h3>' +
          '<p class="nm-bs-sub">We are reviewing your artwork. It goes live on the home page for 2 weeks once approved. You do not need to do anything else.</p>' +
          '<div class="nm-bs-thumbs">' + mediaPreview(latest.media) + "</div>" +
          '<p class="nm-bs-sub">"' + esc(latest.title) + '"' + (latest.subtitle ? " · " + esc(latest.subtitle) : "") + " · sent " + fmtDate(latest.created_at) + "</p></div>";
        return;
      }
      if (latest && latest.status === "approved") {
        host.innerHTML = '<div class="nm-bs-sec"><span class="nm-bs-chip live">Live</span><h3>Your banner is on the home page</h3>' +
          '<p class="nm-bs-sub">"' + esc(latest.title) + '"' + (latest.subtitle ? " · " + esc(latest.subtitle) : "") + " · approved " + fmtDate(latest.reviewed_at || latest.created_at) + ". It runs for a full 2 weeks from the day it went live.</p>" +
          '<div class="nm-bs-thumbs">' + mediaPreview(latest.media) + "</div></div>";
        return;
      }
      /* open payment exists (never submitted, or the last submission was rejected) */
      renderForm(host, latest && latest.status === "rejected" ? latest : null);
    }).catch(function () {
      host.innerHTML = '<div class="nm-bs-sec"><p class="nm-bs-sub">Could not load your banner details right now. Please go back and try again.</p></div>';
    });
  }

  function renderForm(host, prev) {
    host.innerHTML = ""
      + '<div class="nm-bs-sec"><h3>Send your banner artwork</h3>'
      + '<p class="nm-bs-sub">Your ₦5,000 home page banner is booked. Send <b>one video of at most 20 seconds</b> OR <b>1 or 2 pictures</b> and we will review them. Once approved, your banner goes live on the home page for <b>2 weeks</b>.</p>'
      + (prev ? '<p class="nm-bs-sub">Your previous artwork was not approved. You can send new artwork here — your booking is still valid.</p>' : "")
      + '<p class="nm-bs-err" id="nm-bs-err" style="display:none"></p>'
      + '<input class="nm-bs-in" id="nm-bs-title" type="text" maxlength="80" placeholder="Business name *">'
      + '<input class="nm-bs-in" id="nm-bs-sub" type="text" maxlength="120" placeholder="One short line about your business (optional)">'
      + '<input class="nm-bs-in" id="nm-bs-link" type="text" placeholder="Link (optional, e.g. https://… or /p/…)">'
      + '<div class="nm-bs-mode"><button type="button" id="nm-bs-mv" class="on">🎬 Video (max 20s)</button><button type="button" id="nm-bs-mp">🖼️ Pictures (1 or 2)</button></div>'
      + '<input class="nm-bs-in" id="nm-bs-file" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov">'
      + '<div class="nm-bs-thumbs" id="nm-bs-thumbs"></div>'
      + '<button type="button" class="nm-bs-btn" id="nm-bs-send" style="width:100%" disabled>Send for review</button></div>'
      + '<div class="nm-bs-sec"><h3>No artwork ready?</h3>'
      + '<p class="nm-bs-sub">You can also send your video or pictures to our WhatsApp <b>09150951870</b> with your business name and one short line, and we will handle it from there.</p></div>';
    var mode = "video";
    var files = [];
    var errEl = host.querySelector("#nm-bs-err");
    var sendBtn = host.querySelector("#nm-bs-send");
    var fileInput = host.querySelector("#nm-bs-file");
    var thumbs = host.querySelector("#nm-bs-thumbs");
    function showErr(m) { errEl.textContent = m; errEl.style.display = m ? "block" : "none"; }
    function setMode(m) {
      mode = m; files = [];
      host.querySelector("#nm-bs-mv").className = m === "video" ? "on" : "";
      host.querySelector("#nm-bs-mp").className = m === "pictures" ? "on" : "";
      fileInput.value = "";
      fileInput.accept = m === "video" ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
      fileInput.multiple = m === "pictures";
      thumbs.innerHTML = "";
      sendBtn.disabled = true;
      showErr("");
    }
    host.querySelector("#nm-bs-mv").addEventListener("click", function () { setMode("video"); });
    host.querySelector("#nm-bs-mp").addEventListener("click", function () { setMode("pictures"); });

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
          if (d > MAX_VIDEO_SECS) { files = []; thumbs.innerHTML = ""; showErr("This video is " + Math.round(d) + " seconds — the maximum is 20 seconds."); return; }
          files = [f];
          try { thumbs.innerHTML = '<video class="nm-bs-thumb" src="' + URL.createObjectURL(f) + '" controls preload="metadata"></video>'; } catch (e) {}
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
          try { return '<img class="nm-bs-thumb" src="' + URL.createObjectURL(f2) + '" alt="preview">'; } catch (e) { return ""; }
        }).join("");
        sendBtn.disabled = false;
      }
    });

    sendBtn.addEventListener("click", function () {
      var title = host.querySelector("#nm-bs-title").value.trim();
      var subtitle = host.querySelector("#nm-bs-sub").value.trim();
      var link = host.querySelector("#nm-bs-link").value.trim();
      if (!title) { showErr("Please add your business name."); return; }
      if (link && !(/^https?:\/\//i.test(link) || link.charAt(0) === "/")) { showErr("The link must start with http://, https:// or /."); return; }
      if (!files.length) { showErr(mode === "video" ? "Choose your video first." : "Choose your picture(s) first."); return; }
      showErr("");
      sendBtn.disabled = true;
      sendBtn.textContent = "Uploading…";
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
            sendBtn.textContent = "Uploading…";
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
        sendBtn.textContent = "Sending…";
        return api("submit", { title: title, subtitle: subtitle, link_url: link, media: media });
      }).then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.error) || "Could not send your artwork.");
        toast("Artwork sent for review. We will put your banner live once approved.");
        renderState(document.getElementById("nm-bs-page"));
      }).catch(function (e) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send for review";
        showErr(e && e.message ? e.message : "Something went wrong. Please try again.");
      });
    });
  }
})();
