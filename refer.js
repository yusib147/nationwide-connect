/* Nationwide Media Connect — refer.js
   Refer & Earn client: captures a referral code from ?ref= or the signup
   form and locks it onto the new account via /api/refer; renders the Me
   "Refer & Earn" card and the full Refer & Earn dashboard (funds,
   withdrawal form with bank details, people referred with their premium
   status, earnings history); and offers "Pay with wallet credit" before
   the normal Paystack flow whenever the credit balance covers a plan in
   full. All money rules are enforced server-side; this file presents
   them. Referral codes are unique per person: the database carries a
   unique index and the server cross-checks before and after assigning. */
;(function () {
  "use strict";
  var PRICES = { bump_1: 100000, featured_7d: 500000, premium_1m: 100000, premium_promo_2m: 100000, premium_6m: 500000, banner_30d: 1000000 };
  var LABELS = { bump_1: "Bump listing", featured_7d: "Featured 7 days", premium_1m: "Premium", premium_promo_2m: "Launch promo Premium", premium_6m: "Premium 6 months", banner_30d: "Home banner 1 month" };
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function naira(k) { return "₦" + (Math.max(0, Number(k) || 0) / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 }); }
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
      return fetch("/api/refer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
    });
  }
  try {
    var st = document.createElement("style");
    st.id = "nm-refer-css";
    st.textContent = ".nm-ref{margin:16px 14px 4px;background:var(--card);border:1px solid var(--line-soft);border-radius:20px;padding:18px;box-shadow:var(--shadow-card)}"
      + ".nm-ref h3{margin:0 0 4px;font-size:16.5px;font-weight:800;color:var(--ink)}"
      + ".nm-ref-sub{font-size:13px;color:var(--muted);line-height:1.55;margin:0 0 12px}"
      + ".nm-ref-code{display:flex;gap:8px;align-items:stretch;margin-bottom:12px}"
      + ".nm-ref-codeval{flex:1;display:flex;align-items:center;justify-content:center;border:1.5px dashed var(--line);border-radius:12px;font-weight:800;font-size:18px;letter-spacing:2px;color:var(--ink);padding:10px}"
      + ".nm-ref-btn{border:0;border-radius:12px;background:var(--acc-grad);color:#fff;font-weight:800;font-size:13.5px;padding:10px 14px;cursor:pointer}"
      + ".nm-ref-btn.ghost{background:var(--card);color:var(--ink);border:1.5px solid var(--line)}"
      + ".nm-ref-btn:disabled{opacity:.5;cursor:default}"
      + ".nm-ref-stats{display:flex;gap:10px;margin-bottom:12px}"
      + ".nm-ref-stat{flex:1;background:var(--acc-soft);border-radius:14px;padding:10px 12px}"
      + ".nm-ref-stat b{display:block;font-size:16px;color:var(--ink)}"
      + ".nm-ref-stat span{font-size:11.5px;font-weight:700;color:var(--muted)}"
      + ".nm-ref-bal{display:flex;justify-content:space-between;font-size:13.5px;font-weight:700;color:var(--ink);padding:7px 0;border-top:1px solid var(--line-soft)}"
      + ".nm-ref-bar{height:8px;border-radius:99px;background:var(--line-soft);overflow:hidden;margin:6px 0 4px}"
      + ".nm-ref-bar i{display:block;height:100%;background:var(--acc-grad);border-radius:99px}"
      + ".nm-ref-hist{font-size:12.5px;color:var(--muted);line-height:1.6}"
      + ".nm-ref-hist>div{display:flex;justify-content:space-between;border-top:1px solid var(--line-soft);padding:5px 0}"
      + ".nm-ref-in{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:11px 13px;font-size:14px;font-family:inherit;margin-bottom:9px}"
      + ".nm-ref-in:focus{outline:0;border-color:var(--acc2)}"
      + ".nm-ref-page{position:fixed;inset:0;z-index:99990;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch}"
      + ".nm-ref-wrap{max-width:720px;margin:0 auto;padding:0 0 calc(30px + env(safe-area-inset-bottom))}"
      + ".nm-ref-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;background:var(--card);border-bottom:1px solid var(--line-soft);padding:calc(12px + env(safe-area-inset-top)) 14px 12px}"
      + ".nm-ref-top h2{margin:0;font-size:17px;font-weight:800;color:var(--ink)}"
      + ".nm-ref-sec{margin:14px 14px 0;background:var(--card);border:1px solid var(--line-soft);border-radius:20px;padding:18px;box-shadow:var(--shadow-card)}"
      + ".nm-ref-sec h3{margin:0 0 8px;font-size:15.5px;font-weight:800;color:var(--ink)}"
      + ".nm-ref-person{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--line-soft);padding:9px 0;font-size:13.5px;color:var(--ink)}"
      + ".nm-ref-person small{display:block;color:var(--muted);font-weight:600;font-size:12px}"
      + ".nm-ref-chip{flex:none;font-size:11px;font-weight:800;border-radius:99px;padding:4px 9px;background:var(--acc-soft);color:var(--muted)}"
      + ".nm-ref-chip.prem{background:#e7f8ee;color:#0d7a3d}"
      + ".nm-ref-chip.held{background:#fdf0e2;color:#9a5b13}";
    document.head.appendChild(st);
  } catch (e) {}

  /* ---------- referral code capture + attach ---------- */
  try {
    var refParam = new URLSearchParams(location.search).get("ref");
    if (refParam) { try { localStorage.setItem("nm_ref_pending", refParam.toUpperCase().slice(0, 20)); } catch (e) {} }
  } catch (e) {}
  window.NM_refStash = function (code) { try { if (code) localStorage.setItem("nm_ref_pending", String(code).toUpperCase().slice(0, 20)); } catch (e) {} };
  var attachTries = 0;
  var attachIv = setInterval(function () {
    attachTries++;
    var pending = null;
    try { pending = localStorage.getItem("nm_ref_pending"); } catch (e) {}
    if (!pending || attachTries > 40) { clearInterval(attachIv); return; }
    token().then(function (tok) {
      if (!tok) return;
      clearInterval(attachIv);
      api("attach", { code: pending }).then(function () {
        try { localStorage.removeItem("nm_ref_pending"); } catch (e) {}
      }).catch(function () { try { localStorage.removeItem("nm_ref_pending"); } catch (e) {} });
    });
  }, 2000);

  /* ---------- shared data ---------- */
  var summaryCache = null, summaryAt = 0;
  function getSummary(force) {
    if (!force && summaryCache && Date.now() - summaryAt < 30000) return Promise.resolve(summaryCache);
    return api("summary", {}).then(function (j) {
      if (j && j.ok) { summaryCache = j; summaryAt = Date.now(); }
      return j;
    });
  }
  window.NM_referSummary = getSummary;
  function reasonText(r) {
    if (r.reason === "referral_reward") return (r.kind === "cash" ? "Referral cash" : "Referral credit");
    if (r.reason === "service_payment") return "Paid for a service";
    if (r.reason === "withdrawal") return "Withdrawal paid";
    if (r.reason === "reversal") return "Reversal";
    return r.reason || "Entry";
  }
  function shareTextFor(j) {
    return "Join me on Nationwide Media Connect, buy and sell across Nigeria. Use my referral code " + j.code + " when you sign up: " + location.origin + "/?ref=" + j.code;
  }
  function codeRowHTML(j) {
    return '<div class="nm-ref-code"><div class="nm-ref-codeval">' + esc(j.code || "—") + '</div><button type="button" class="nm-ref-btn" data-ref-copy>Copy</button><button type="button" class="nm-ref-btn ghost" data-ref-share>Share</button></div>';
  }
  function wireCodeRow(root, j) {
    var cp = root.querySelector("[data-ref-copy]");
    if (cp) cp.addEventListener("click", function () {
      var done = function () { toast("Referral code copied."); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(j.code).then(done).catch(done); } else { done(); }
    });
    var sh = root.querySelector("[data-ref-share]");
    if (sh) sh.addEventListener("click", function () {
      if (navigator.share) { navigator.share({ text: shareTextFor(j) }).catch(function () {}); }
      else { window.open("https://wa.me/?text=" + encodeURIComponent(shareTextFor(j)), "_blank"); }
    });
  }
  function fundsHTML(j) {
    var pct = Math.min(100, Math.round((j.cashAvailableKobo / j.minWithdrawKobo) * 100));
    return '<div class="nm-ref-bal"><span>Cash balance</span><span>' + naira(j.cashKobo) + "</span></div>"
      + '<div class="nm-ref-bal"><span>Available to withdraw</span><span>' + naira(j.cashAvailableKobo) + "</span></div>"
      + '<div class="nm-ref-bar"><i style="width:' + pct + '%"></i></div>'
      + '<p class="nm-ref-sub" style="margin:0 0 6px">' + pct + "% of the ₦1,000 withdrawal minimum. Cash clears 7 days after it is earned.</p>"
      + '<div class="nm-ref-bal"><span>Wallet credit</span><span>' + naira(j.creditKobo) + "</span></div>"
      + '<p class="nm-ref-sub" style="margin:6px 0 0">Wallet credit pays for promotions and other services inside the app.</p>';
  }

  /* ---------- Me card (entry point) ---------- */
  function renderCard(box) {
    box.innerHTML = '<h3>Refer & Earn</h3><p class="nm-ref-sub">Loading your referral details…</p>';
    getSummary(true).then(function (j) {
      if (!j || !j.ok) { box.innerHTML = '<h3>Refer & Earn</h3><p class="nm-ref-sub">Could not load your referral details right now.</p>'; return; }
      box.innerHTML = "<h3>Refer & Earn</h3>"
        + '<p class="nm-ref-sub">When someone you referred subscribes to Premium, you earn cash plus wallet credit. Manage everything in your referral dashboard.</p>'
        + codeRowHTML(j)
        + '<div class="nm-ref-stats"><div class="nm-ref-stat"><b>' + j.referredCount + '</b><span>People referred</span></div><div class="nm-ref-stat"><b>' + naira(j.cashAvailableKobo) + '</b><span>Cash available</span></div><div class="nm-ref-stat"><b>' + naira(j.creditKobo) + '</b><span>Wallet credit</span></div></div>'
        + '<button type="button" class="nm-ref-btn" id="nm-ref-open" style="width:100%">Open Refer & Earn dashboard</button>';
      wireCodeRow(box, j);
      box.querySelector("#nm-ref-open").addEventListener("click", function () { openDashboard(); });
    }).catch(function () {
      box.innerHTML = '<h3>Refer & Earn</h3><p class="nm-ref-sub">Could not load your referral details right now.</p>';
    });
  }
  function injectCard() {
    var screen = document.getElementById("screen-me");
    if (!screen || !screen.classList.contains("active")) return;
    if (document.getElementById("nm-refer-card")) return;
    var body = document.getElementById("me-body") || screen;
    var box = document.createElement("div");
    box.className = "nm-ref";
    box.id = "nm-refer-card";
    var fav = screen.querySelector(".mex-fav, #mex-fav, [class*=fav-group]");
    if (fav && fav.parentNode) { fav.parentNode.insertBefore(box, fav); } else { body.appendChild(box); }
    renderCard(box);
  }

  /* ---------- the dashboard ---------- */
  function openDashboard() {
    var old = document.getElementById("nm-refer-page");
    if (old) old.remove();
    var page = document.createElement("div");
    page.className = "nm-ref-page";
    page.id = "nm-refer-page";
    page.innerHTML = '<div class="nm-ref-wrap"><div class="nm-ref-top"><button type="button" class="icon-btn" id="nm-ref-back" aria-label="Back">‹</button><h2>Refer & Earn</h2></div><div id="nm-ref-dash"><div class="nm-ref-sec"><p class="nm-ref-sub">Loading…</p></div></div></div>';
    document.body.appendChild(page);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    function close() { page.remove(); try { document.body.style.overflow = ""; } catch (e) {} var card = document.getElementById("nm-refer-card"); if (card) renderCard(card); }
    page.querySelector("#nm-ref-back").addEventListener("click", close);
    window.NM_closeRefer = close;
    renderDashboard(page);
  }
  window.NM_openRefer = openDashboard;
  function renderDashboard(page) {
    var host = page.querySelector("#nm-ref-dash");
    getSummary(true).then(function (j) {
      if (!j || !j.ok) { host.innerHTML = '<div class="nm-ref-sec"><p class="nm-ref-sub">Could not load your referral details right now. Please go back and try again.</p></div>'; return; }
      var people = (j.people || []).map(function (p) {
        var chip = p.reward_status === "held" ? '<span class="nm-ref-chip held">Under review</span>'
          : p.premium ? '<span class="nm-ref-chip prem">Premium ✓</span>' : '<span class="nm-ref-chip">Not yet premium</span>';
        return '<div class="nm-ref-person"><div>' + esc(p.name) + "<small>Joined " + fmtDate(p.joined_at) + "</small></div>" + chip + "</div>";
      }).join("");
      var hist = (j.history || []).map(function (r) {
        return "<div><span>" + esc(reasonText(r)) + "</span><b>" + (r.amount_kobo < 0 ? "−" : "+") + naira(Math.abs(r.amount_kobo)) + "</b></div>";
      }).join("");
      var wd = (j.withdrawals || []).map(function (w) {
        return "<div><span>Withdrawal · " + esc(w.status) + " · " + fmtDate(w.created_at) + "</span><b>" + naira(w.amount_kobo) + "</b></div>";
      }).join("");
      var canWd = j.cashAvailableKobo >= j.minWithdrawKobo;
      host.innerHTML = ""
        + '<div class="nm-ref-sec"><h3>Your referral code</h3><p class="nm-ref-sub">Your code belongs to you alone. A friend must use it when they sign up, and you earn when they subscribe to Premium: ₦250 cash plus ₦250 wallet credit on the ₦1,000 plan, ₦750 cash plus ₦250 wallet credit on the ₦5,000 plan.</p>' + codeRowHTML(j) + "</div>"
        + '<div class="nm-ref-sec"><h3>Your funds</h3>' + fundsHTML(j) + "</div>"
        + '<div class="nm-ref-sec"><h3>Withdraw cash</h3><p class="nm-ref-sub">Withdrawals are reviewed and paid to your bank account. Minimum ' + naira(j.minWithdrawKobo) + ", available now: <b>" + naira(j.cashAvailableKobo) + "</b>.</p>"
        + '<input class="nm-ref-in" id="nm-ref-amt" type="number" inputmode="numeric" placeholder="Amount in naira (minimum 1000)">'
        + '<input class="nm-ref-in" id="nm-ref-bank" type="text" placeholder="Bank name (e.g. GTBank)">'
        + '<input class="nm-ref-in" id="nm-ref-acct" type="tel" inputmode="numeric" maxlength="10" placeholder="Account number (10 digits)">'
        + '<input class="nm-ref-in" id="nm-ref-name" type="text" placeholder="Account name">'
        + '<button type="button" class="nm-ref-btn" id="nm-ref-send" style="width:100%"' + (canWd ? "" : " disabled") + ">Request withdrawal</button>"
        + (wd ? '<div class="nm-ref-hist" style="margin-top:10px">' + wd + "</div>" : "")
        + "</div>"
        + '<div class="nm-ref-sec"><h3>People you referred (' + (j.people || []).length + ')</h3>'
        + (people || '<p class="nm-ref-sub">Nobody yet. Share your code and your people will appear here with their premium status.</p>')
        + '<p class="nm-ref-sub" style="margin-top:8px">' + j.subscribedCount + " of them " + (j.subscribedCount === 1 ? "has" : "have") + " subscribed to Premium.</p></div>"
        + '<div class="nm-ref-sec"><h3>Earnings history</h3>' + (hist ? '<div class="nm-ref-hist">' + hist + "</div>" : '<p class="nm-ref-sub">No earnings yet.</p>') + "</div>";
      wireCodeRow(host, j);
      var send = host.querySelector("#nm-ref-send");
      if (send) send.addEventListener("click", function () {
        var amt = Math.round(Number(host.querySelector("#nm-ref-amt").value) || 0);
        var payload = { amount_kobo: amt * 100, bank_name: host.querySelector("#nm-ref-bank").value, account_number: host.querySelector("#nm-ref-acct").value, account_name: host.querySelector("#nm-ref-name").value };
        if (!amt || !payload.bank_name || payload.account_number.length !== 10 || !payload.account_name) { toast("Please fill in the amount, bank, 10-digit account number and account name."); return; }
        send.disabled = true; send.textContent = "Sending…";
        api("withdraw", payload).then(function (r) {
          if (r && r.ok) { toast("Withdrawal requested. It will be reviewed and paid to your bank account."); summaryCache = null; renderDashboard(page); }
          else { send.disabled = false; send.textContent = "Request withdrawal"; toast((r && r.error) || "Could not request the withdrawal."); }
        }).catch(function () { send.disabled = false; send.textContent = "Request withdrawal"; toast("Could not request the withdrawal. Please try again."); });
      });
    }).catch(function () {
      host.innerHTML = '<div class="nm-ref-sec"><p class="nm-ref-sub">Could not load your referral details right now. Please go back and try again.</p></div>';
    });
  }
  try {
    if (window.MutationObserver) { new MutationObserver(function () { injectCard(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] }); }
    setInterval(injectCard, 2500);
  } catch (e) {}

  /* ---------- wallet credit in the payment flow ---------- */
  function wrapStartPayment() {
    var DB = window.NM_DB;
    if (!DB || !DB.startPayment || DB.startPayment._nmReferWrapped) return;
    var orig = DB.startPayment.bind(DB);
    DB.startPayment = function (plan, targetId) {
      var price = PRICES[plan];
      if (!price) return orig(plan, targetId);
      return getSummary(false).then(function (j) {
        if (!j || !j.ok || (j.creditKobo || 0) < price) return orig(plan, targetId);
        return new Promise(function (resolve) {
          var old = document.getElementById("nm-ref-scrim");
          if (old) old.remove();
          var scrim = document.createElement("div");
          scrim.className = "sheet-scrim";
          scrim.id = "nm-ref-scrim";
          scrim.innerHTML = '<div class="sheet" role="dialog" aria-label="Choose how to pay"><div class="sheet-head"><h3>How do you want to pay?</h3><button type="button" class="icon-btn" id="nm-ref-x" aria-label="Close">✕</button></div>'
            + '<p class="nm-ref-sub">' + esc(LABELS[plan] || "This service") + " costs <b>" + naira(price) + '</b>. Your wallet credit is <b>' + naira(j.creditKobo) + "</b>.</p>"
            + '<button type="button" class="nm-ref-btn" id="nm-ref-usewallet" style="width:100%;margin-bottom:9px">Pay with wallet credit</button>'
            + '<button type="button" class="nm-ref-btn ghost" id="nm-ref-usecard" style="width:100%">Pay with card or transfer</button></div>';
          document.body.appendChild(scrim);
          function close() { scrim.remove(); }
          scrim.querySelector("#nm-ref-x").addEventListener("click", function () { close(); resolve(orig(plan, targetId)); });
          scrim.addEventListener("click", function (e) { if (e.target === scrim) { close(); resolve(orig(plan, targetId)); } });
          scrim.querySelector("#nm-ref-usecard").addEventListener("click", function () { close(); resolve(orig(plan, targetId)); });
          scrim.querySelector("#nm-ref-usewallet").addEventListener("click", function () {
            var btn = scrim.querySelector("#nm-ref-usewallet");
            btn.disabled = true; btn.textContent = "Paying…";
            var idem = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
            api("walletpay", { plan: plan, target_id: targetId || null, idem: idem }).then(function (r) {
              if (r && r.ok) {
                close();
                toast("Paid with wallet credit. " + (LABELS[plan] || "Your service") + " is now active.");
                summaryCache = null;
                setTimeout(function () { try { location.reload(); } catch (e) {} }, 1300);
                resolve(r);
              } else {
                btn.disabled = false; btn.textContent = "Pay with wallet credit";
                toast((r && r.error) || "Wallet payment did not go through.");
              }
            }).catch(function () {
              btn.disabled = false; btn.textContent = "Pay with wallet credit";
              toast("Wallet payment did not go through. Please try again.");
            });
          });
        });
      }).catch(function () { return orig(plan, targetId); });
    };
    DB.startPayment._nmReferWrapped = true;
  }
  var wrapIv = setInterval(function () { wrapStartPayment(); if (window.NM_DB && window.NM_DB.startPayment && window.NM_DB.startPayment._nmReferWrapped) clearInterval(wrapIv); }, 800);
  setTimeout(function () { clearInterval(wrapIv); }, 30000);
})();
