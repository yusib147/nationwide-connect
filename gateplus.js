/* gateplus.js — suspension / ban enforcement reinforcement (loaded last).
   The built-in account gate lives in supabase/client.js (which is frozen):
   it checks profiles.account_status at boot, every 30s, on foreground and
   on the own-profile realtime event, and renders a full-screen notice with
   the appeal form. This layer closes the gaps around it:
   1) An opaque interaction veil under the gate, driven by an independent
      status watcher (boot, 20s cadence, focus, foreground, own-profile
      realtime). If the gate element is ever missing or removed while the
      account is restricted, the app stays covered and unusable.
   2) The suspended notice is reworded to the owner's protocol: the
      account is "under review" (the built-in copy only mentions the
      safety system). The reason and the appeal form are untouched.
   3) Pre-action guards: DB.sendMessage and DB.createProduct re-check the
      account status fresh before running, so a restricted user cannot
      message or post even if every overlay were stripped from the DOM.
   When the status flips back to active, the veil drops immediately and
   the built-in gate removes itself on its own next check. */
(function () {
  "use strict";
  var VEIL_ID = "nm-lockveil";
  var state = { status: "active", reason: "" };
  var wired = false;

  function restricted() { return state.status === "suspended" || state.status === "banned"; }

  function veilEl() { return document.getElementById(VEIL_ID); }
  function ensureVeil() {
    var v = veilEl();
    if (!v) {
      v = document.createElement("div");
      v.id = VEIL_ID;
      v.style.cssText = "position:fixed;inset:0;z-index:99998;background:rgba(15,17,21,.97);display:flex;align-items:center;justify-content:center;padding:20px;";
      document.body.appendChild(v);
    }
    /* Idempotent: the MutationObserver below calls this on body changes;
       rewriting innerHTML unconditionally would retrigger it forever. */
    if (v.getAttribute("data-gp") === state.status) { return; }
    v.setAttribute("data-gp", state.status);
    var banned = state.status === "banned";
    v.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:28px 24px;text-align:center;">' +
      '<div style="font-size:40px;">' + (banned ? "⛔" : "⏸️") + "</div>" +
      '<h2 style="margin:10px 0 6px;font-size:20px;">' + (banned ? "Account banned" : "Account under review") + "</h2>" +
      '<p style="color:#555;font-size:14px;line-height:1.5;margin:0;">' + (banned
        ? "This account has been permanently banned for violating marketplace policy."
        : "Your account is under review by the admin team. You cannot buy, sell or chat while your account is under review.") + "</p></div>";
  }
  function dropVeil() { var v = veilEl(); if (v) { v.remove(); } }

  /* Reword the built-in gate's suspended copy in place. Keyed by
     status|reason so it re-applies when either changes. */
  function patchGate() {
    var g = document.getElementById("nm-account-gate");
    if (!g || state.status !== "suspended") { return; }
    var key = state.status + "|" + state.reason;
    if (g.getAttribute("data-gp") === key) { return; }
    var h = g.querySelector("h2");
    if (h) { h.textContent = "Account under review"; }
    var p = g.querySelector("p");
    if (p) { p.textContent = "Your account is under review by the admin team. You cannot buy, sell or chat while your account is under review."; }
    g.setAttribute("data-gp", key);
  }

  function applyState(st) {
    if (!st || !st.status) { return; }
    state = { status: st.status, reason: st.reason || "" };
    if (restricted()) { ensureVeil(); patchGate(); } else { dropVeil(); }
  }

  function refresh() {
    var DB = window.NM_DB;
    if (!DB || typeof DB.myAccountStatus !== "function") { return Promise.resolve(null); }
    return DB.myAccountStatus().then(function (st) { if (st) { applyState(st); } return st; }).catch(function () { return null; });
  }

  function guard(DB, name) {
    var orig = DB[name];
    if (typeof orig !== "function" || orig._gpWrapped) { return; }
    var wrapped = function () {
      var self = this, args = arguments;
      return DB.myAccountStatus().then(function (st) {
        if (st) { applyState(st); }
        if (st && (st.status === "suspended" || st.status === "banned")) {
          if (window.NM_toast) {
            try { window.NM_toast(st.status === "banned" ? "This account is banned." : "Your account is under review."); } catch (e) {}
          }
          throw new Error(st.status === "banned" ? "Account banned" : "Account under review");
        }
        return orig.apply(self, args);
      });
    };
    wrapped._gpWrapped = true;
    DB[name] = wrapped;
  }

  function wire() {
    if (wired) { return; }
    var DB = window.NM_DB;
    if (!DB || typeof DB.myAccountStatus !== "function") { return; }
    wired = true;
    guard(DB, "sendMessage");
    guard(DB, "createProduct");
    if (DB.onLive) { try { DB.onLive("profiles", function () { refresh(); }); } catch (e) {} }
    refresh();
    setInterval(refresh, 20000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { refresh(); } });
    window.addEventListener("focus", refresh);
    /* The built-in gate is appended to <body>; patch its copy the moment
       it appears (and whenever it is re-rendered). */
    if (window.MutationObserver && document.body) {
      var mo = new MutationObserver(function () { if (restricted()) { patchGate(); ensureVeil(); } });
      mo.observe(document.body, { childList: true });
    }
  }

  var tries = 0;
  (function boot() {
    wire();
    if (!wired && tries++ < 40) { setTimeout(boot, 500); }
  })();
})();
