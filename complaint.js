/* ===== Complaints & Support (2026-11-06) =====
   A "complaints and fixes" box for buyers and sellers: lodge a complaint,
   report something broken, or send a suggestion. Submissions land in the
   admin panel's Complaints inbox, where the team works them and replies;
   users track status + the team's reply here under "My complaints".
   Data: table `complaints` (RLS: users insert/select only their own). */
;(function () {
  "use strict";
  var DB = window.NM_DB;
  if (!DB) return;
  function SB() { return window.NM_DB && window.NM_DB.client; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function toast(m) { try { if (window.NM_toast) { window.NM_toast(m); return; } } catch (e) {} try { alert(m); } catch (e) {} }
  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function me() { return DB.currentUser ? DB.currentUser().catch(function () { return null; }) : Promise.resolve(null); }
  function myName(u) {
    if (u && (u.name || u.display_name)) return u.name || u.display_name;
    try { var c = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); if (c && (c.name || c.display_name)) return c.name || c.display_name; } catch (e) {}
    return "";
  }
  var CATS = [
    { k: "complaint", label: "Complaint" },
    { k: "bug", label: "Bug / something to fix" },
    { k: "suggestion", label: "Suggestion" },
    { k: "other", label: "Other" }
  ];
  function catLabel(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i].k === k) return CATS[i].label; return "Complaint"; }
  var STATUS = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };

  /* ---------- Me menu row ---------- */
  function injectRow() {
    var menu = document.querySelector(".nm-me-menu");
    if (!menu || document.getElementById("nm-cmp-row")) return;
    var row = document.createElement("button");
    row.type = "button";
    row.className = "nm-me-row";
    row.id = "nm-cmp-row";
    row.innerHTML = '<span class="nm-me-ico">🛠️</span><span style="flex:1;text-align:left"><b>Complaints &amp; Support</b><span style="display:block;font-size:12px;color:var(--card-mut,#6d6d78);font-weight:500">Report a problem, track our reply</span></span><span class="nm-me-chev">›</span>';
    row.addEventListener("click", openPage);
    menu.appendChild(row);
  }

  /* ---------- page overlay ---------- */
  var pageEl = null;
  function ensurePage() {
    if (pageEl) return;
    pageEl = document.createElement("div");
    pageEl.className = "nm-cmp-page";
    pageEl.id = "nm-cmp-page";
    pageEl.innerHTML =
      '<div class="nm-cmp-wrap"><div class="nm-cmp-top">' +
      '<button type="button" class="icon-btn" id="nm-cmp-back" aria-label="Back">‹</button>' +
      "<h2>Complaints &amp; Support</h2></div>" +
      '<div class="nm-cmp-body">' +
      '<p class="nm-cmp-intro">Tell us what is wrong, what is broken, or what you would like us to improve. The team reads every message and replies here.</p>' +
      '<form id="nm-cmp-form" class="nm-cmp-form">' +
      '<label>Type<select id="nm-cmp-cat">' + CATS.map(function (c) { return '<option value="' + c.k + '">' + c.label + "</option>"; }).join("") + "</select></label>" +
      '<label>Subject<input id="nm-cmp-subj" maxlength="120" placeholder="Short title, e.g. My listing is not showing"></label>' +
      '<label>Details<textarea id="nm-cmp-msg" rows="5" maxlength="2000" placeholder="Explain it here. Add the listing name or anything that helps us find the problem."></textarea></label>' +
      '<button type="submit" class="nm-cmp-send" id="nm-cmp-send">Send</button>' +
      "</form>" +
      '<h3 class="nm-cmp-h">My complaints</h3>' +
      '<div id="nm-cmp-list"><p class="nm-cmp-empty">Loading…</p></div>' +
      "</div></div>";
    document.body.appendChild(pageEl);
    pageEl.querySelector("#nm-cmp-back").addEventListener("click", closePage);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pageEl && document.body.contains(pageEl)) closePage(); });
    pageEl.querySelector("#nm-cmp-form").addEventListener("submit", onSubmit);
  }
  function openPage() {
    ensurePage();
    pageEl.classList.add("open");
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    loadMine();
  }
  function closePage() {
    if (pageEl) { pageEl.remove(); pageEl = null; }
    try { document.body.style.overflow = ""; } catch (e) {}
  }
  window.NM_openComplaints = openPage;
  window.NM_complaintClose = closePage;

  function loadMine() {
    var host = document.getElementById("nm-cmp-list");
    if (!host) return;
    me().then(function (u) {
      if (!u || !u.id) { host.innerHTML = '<p class="nm-cmp-empty">Please sign in to see your complaints.</p>'; return; }
      return SB().from("complaints").select("id,category,subject,message,status,admin_note,created_at")
        .eq("user_id", u.id).order("created_at", { ascending: false }).limit(50)
        .then(function (r) {
          var rows = (r && r.data) || [];
          if (!rows.length) { host.innerHTML = '<p class="nm-cmp-empty">You have not sent anything yet.</p>'; return; }
          host.innerHTML = rows.map(function (c) {
            return '<div class="nm-cmp-card">' +
              '<div class="nm-cmp-cardtop"><span class="nm-cmp-cat">' + esc(catLabel(c.category)) + '</span>' +
              '<span class="nm-cmp-status st-' + esc(c.status) + '">' + esc(STATUS[c.status] || c.status) + "</span></div>" +
              "<b>" + esc(c.subject || "(no subject)") + "</b>" +
              '<p class="nm-cmp-msg-t">' + esc(c.message) + "</p>" +
              '<span class="nm-cmp-date">' + esc(fmtDate(c.created_at)) + "</span>" +
              (c.admin_note ? '<div class="nm-cmp-reply"><b>Reply from the team</b><p>' + esc(c.admin_note) + "</p></div>" : "") +
              "</div>";
          }).join("");
        });
    }).catch(function () { host.innerHTML = '<p class="nm-cmp-empty">Could not load. Pull back and try again.</p>'; });
  }

  function onSubmit(e) {
    e.preventDefault();
    var cat = document.getElementById("nm-cmp-cat").value;
    var subj = document.getElementById("nm-cmp-subj").value.trim();
    var msg = document.getElementById("nm-cmp-msg").value.trim();
    var btn = document.getElementById("nm-cmp-send");
    if (subj.length < 3) { toast("Please add a short subject"); return; }
    if (msg.length < 5) { toast("Please tell us a bit more in the details"); return; }
    btn.disabled = true; btn.textContent = "Sending…";
    me().then(function (u) {
      if (!u || !u.id) throw new Error("signin");
      return SB().from("complaints").insert({
        user_id: u.id, name: myName(u), category: cat, subject: subj, message: msg
      });
    }).then(function (r) {
      if (r && r.error) throw r.error;
      toast("Sent. The team will look into it.");
      document.getElementById("nm-cmp-subj").value = "";
      document.getElementById("nm-cmp-msg").value = "";
      btn.disabled = false; btn.textContent = "Send";
      loadMine();
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Send";
      toast("Could not send. Check your connection and try again.");
    });
  }

  /* ---------- boot: watch for the Me menu ---------- */
  var mo = new MutationObserver(function () { injectRow(); });
  try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  injectRow();
})();
