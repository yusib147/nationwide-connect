/* Nationwide Media Connect — manual bank-transfer payments + Open Beta bar.
   Paystack checkout is PAUSED (Ibrahim, 2026-10-23). Every purchase routes
   here via the NM_manualPay hook in supabase/client.js startPayment.
   Flow: user transfers to the OPay account -> submits the name on the
   transfer -> claim recorded by /api/pay-manual -> admin approves in the
   admin panel -> the plan activates. Nothing activates before approval. */
(function () {
  "use strict";
  var ACCOUNT = { bank: "OPay", number: "9150951870", name: "Yusuf Babatunde Ibrahim" };
  var SUPPORT_WA = "09150951870";
  var PLANS = {
    bump_1: { label: "Bump listing", naira: "₦1,000", blurb: "Push one listing back to the top of the feed." },
    promote_7d: { label: "Promote · 1 week", naira: "₦1,000", blurb: "Pin one listing at the top of Home and its category for 7 days." },
    featured_7d: { label: "Featured · 2 weeks", naira: "₦5,000", blurb: "Feature one listing for 14 days." },
    premium_1m: { label: "Premium · 2 months (launch promo)", naira: "₦1,000", blurb: "Unlimited listings, the gold badge, and a free ad boost for your current listings." },
    premium_promo_2m: { label: "Premium · 2 months (launch promo)", naira: "₦1,000", blurb: "Unlimited listings, the gold badge, and a free ad boost for your current listings." },
    premium_6m: { label: "Premium · 6 months", naira: "₦5,000", blurb: "Unlimited listings and the gold badge for 6 months." },
    banner_30d: { label: "Home banner · 2 weeks", naira: "₦5,000", blurb: "Your advert on the home page for 14 days. After approval, you upload your artwork from the banner page." }
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg, ok) { if (window.NM_payToast) { window.NM_payToast(msg, ok ? 1 : 0); } else if (window.NM_toast) { window.NM_toast(msg); } else { alert(msg); } }
  function token() {
    var DB = window.NM_DB;
    if (!DB || !DB.client) return Promise.reject(new Error("Payments need a connection."));
    return DB.client.auth.getSession().then(function (s) {
      var t = s && s.data && s.data.session && s.data.session.access_token;
      if (!t) throw new Error("Log in to pay.");
      return t;
    });
  }
  function api(payload) {
    return token().then(function (t) {
      payload.token = t;
      return fetch("/api/pay-manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "Something went wrong. Please try again.");
      return j;
    });
  }
  function copyText(txt, btn) {
    function done() { if (btn) { var o = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = o; }, 1600); } }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, function () { fallback(); }); } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      ta.remove();
    }
  }

  /* ---------------- Open Beta bar ---------------- */
  function betaBar() {
    try { if (localStorage.getItem("nm_beta_hide") === "1") return; } catch (e) {}
    if (document.getElementById("nm-beta-bar")) return;
    var bar = document.createElement("div");
    bar.id = "nm-beta-bar";
    bar.innerHTML = '<span class="pm-beta-tag">Open Beta Testing</span>' +
      '<span class="pm-beta-txt">Nationwide Media Connect is in open beta, so some things are still being improved. Thanks for testing with us. Spotted a problem? WhatsApp ' + SUPPORT_WA + ".</span>" +
      '<button type="button" class="pm-beta-x" aria-label="Dismiss">✕</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector(".pm-beta-x").addEventListener("click", function () {
      bar.remove();
      try { localStorage.setItem("nm_beta_hide", "1"); } catch (e) {}
    });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", betaBar); } else { betaBar(); }

  /* ---------------- transfer sheet ---------------- */
  function stateChip(x) {
    if (x.status === "paid") return '<span class="pm-chip ok">Active</span>';
    if (x.status === "failed") return '<span class="pm-chip bad">Not confirmed</span>';
    return '<span class="pm-chip wait">Under review</span>';
  }
  window.NM_manualPay = function (plan, targetId) {
    var info = PLANS[plan] || { label: plan, naira: "", blurb: "" };
    return new Promise(function (resolve) {
      var old = document.getElementById("pm-scrim"); if (old) old.remove();
      var scrim = document.createElement("div");
      scrim.className = "pm-scrim"; scrim.id = "pm-scrim";
      scrim.innerHTML =
        '<div class="pm-sheet" role="dialog" aria-label="Pay with bank transfer">' +
        '<div class="pm-head"><div><div class="pm-kicker">Secure payment</div><h3>Pay with bank transfer</h3></div>' +
        '<button type="button" class="pm-x" aria-label="Close">✕</button></div>' +
        '<div class="pm-plan"><div><div class="pm-plan-name">' + esc(info.label) + '</div><div class="pm-plan-blurb">' + esc(info.blurb) + '</div></div>' +
        '<div class="pm-plan-price">' + esc(info.naira) + "</div></div>" +
        '<div class="pm-steps">' +
        "<div><b>1</b><span>Transfer the exact amount to the account below.</span></div>" +
        "<div><b>2</b><span>Tap \u201CI have sent the transfer\u201D and enter the name on your transfer.</span></div>" +
        "<div><b>3</b><span>We confirm it and activate your plan. You will see the status under \u201CMy payments\u201D below.</span></div>" +
        "</div>" +
        '<div class="pm-acct">' +
        '<div class="pm-acct-row"><span>Bank</span><b>' + esc(ACCOUNT.bank) + "</b></div>" +
        '<div class="pm-acct-row"><span>Account number</span><b class="pm-num">' + esc(ACCOUNT.number) + '</b><button type="button" class="pm-copy" data-copy="' + esc(ACCOUNT.number) + '">Copy</button></div>' +
        '<div class="pm-acct-row"><span>Account name</span><b>' + esc(ACCOUNT.name) + "</b></div>" +
        '<div class="pm-acct-row"><span>Amount</span><b>' + esc(info.naira) + "</b></div>" +
        "</div>" +
        '<div class="pm-note"><b>Please read before you pay.</b> Send the exact amount from your own bank account if you can, and keep your transfer receipt. After you send it, submit the name on the transfer here so we can match your payment quickly. Activation is manual while we are in open beta: most payments are confirmed within a few hours, and always within 24 hours. Do not send the payment twice. If anything looks wrong, message us on WhatsApp ' + SUPPORT_WA + " with your payment reference.</div>" +
        '<label class="pm-lab">Name on the transfer<input id="pm-sender" type="text" autocomplete="name" placeholder="e.g. Adaeze Okafor" maxlength="80"></label>' +
        '<label class="pm-lab">Note (optional)<input id="pm-note-in" type="text" placeholder="Anything we should know" maxlength="200"></label>' +
        '<div class="pm-err" id="pm-err"></div>' +
        '<button type="button" class="pm-cta" id="pm-send">I have sent the transfer</button>' +
        '<button type="button" class="pm-ghost" id="pm-mine">My payments</button>' +
        '<div id="pm-mine-box"></div>' +
        "</div>";
      document.body.appendChild(scrim);
      function close() { scrim.remove(); }
      scrim.querySelector(".pm-x").addEventListener("click", function () { close(); resolve(null); });
      scrim.addEventListener("click", function (e) { if (e.target === scrim) { close(); resolve(null); } });
      Array.prototype.forEach.call(scrim.querySelectorAll("[data-copy]"), function (btn) {
        btn.addEventListener("click", function () { copyText(btn.getAttribute("data-copy"), btn); });
      });
      var errBox = scrim.querySelector("#pm-err");
      scrim.querySelector("#pm-mine").addEventListener("click", function () {
        var box = scrim.querySelector("#pm-mine-box");
        box.innerHTML = '<div class="pm-mine-load">Loading your payments…</div>';
        api({ action: "mine" }).then(function (j) {
          if (!j.payments || !j.payments.length) { box.innerHTML = '<div class="pm-mine-load">No transfer payments yet.</div>'; return; }
          box.innerHTML = j.payments.map(function (x) {
            var pi = PLANS[x.plan] || { label: x.plan };
            return '<div class="pm-mine-row"><div><b>' + esc(pi.label) + '</b><small>' + esc(x.reference) + " · " + esc(new Date(x.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })) + "</small></div>" + stateChip(x) + "</div>";
          }).join("");
        }).catch(function (e) { box.innerHTML = '<div class="pm-mine-load">' + esc(e.message) + "</div>"; });
      });
      scrim.querySelector("#pm-send").addEventListener("click", function () {
        var btn = this;
        var sender = scrim.querySelector("#pm-sender").value.trim();
        var note = scrim.querySelector("#pm-note-in").value.trim();
        if (sender.length < 2) { errBox.textContent = "Please enter the name on the transfer, so we can match your payment."; return; }
        errBox.textContent = "";
        btn.disabled = true; btn.textContent = "Recording your payment…";
        api({ action: "claim", plan: plan, target_id: targetId || null, sender_name: sender, note: note }).then(function (j) {
          scrim.querySelector(".pm-sheet").innerHTML =
            '<div class="pm-done"><div class="pm-done-ico">✓</div>' +
            "<h3>Payment recorded</h3>" +
            "<p>Thank you. We have your claim for <b>" + esc(info.label) + "</b> (" + esc(info.naira) + "). Once we confirm your transfer, your plan activates automatically. Most confirmations land within a few hours, always within 24 hours.</p>" +
            '<div class="pm-ref"><span>Your payment reference</span><b>' + esc(j.reference) + '</b><button type="button" class="pm-copy" id="pm-ref-copy">Copy</button></div>' +
            "<p class='pm-done-sub'>Keep this reference. If you need help, WhatsApp " + SUPPORT_WA + " and quote it. You can check the status any time from \u201CMy payments\u201D on this screen.</p>" +
            (plan === "banner_30d" ? "<p class='pm-done-sub'>For your banner: after approval, open the banner page to upload your artwork and it goes into the setup queue.</p>" : "") +
            '<button type="button" class="pm-cta" id="pm-done-x">Done</button></div>';
          var rc = scrim.querySelector("#pm-ref-copy");
          if (rc) rc.addEventListener("click", function () { copyText(j.reference, rc); });
          scrim.querySelector("#pm-done-x").addEventListener("click", function () { close(); resolve(j); try { location.reload(); } catch (e) {} });
          toast(j.existing ? "You already have a payment under review for this. We are on it." : "Payment recorded. We will confirm and activate it shortly.", 1);
          resolve(j);
        }).catch(function (e) {
          btn.disabled = false; btn.textContent = "I have sent the transfer";
          errBox.textContent = e.message || "Could not record your payment. Please try again.";
        });
      });
    });
  };
})();
