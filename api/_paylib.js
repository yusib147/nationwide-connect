// Shared helpers for Nationwide Media Connect Paystack payments.
// Server-side only. The Paystack SECRET key lives in the Vercel env (PAYSTACK_SECRET_KEY)
// and must never reach the browser or chat.
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SERVICE = process.env.SUPABASE_SERVICE_ROLE || "";
var PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
var SITE = "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app";

// Manual bank-transfer mode (Ibrahim, 2026-10-23): Paystack checkout is
// PAUSED, not removed. While MANUAL_MODE is true, /api/pay-init refuses,
// the client routes every purchase to the transfer sheet (paymanual.js),
// claims are recorded by /api/pay-manual, and an admin approves each one
// from the admin panel, which runs the same fulfill() as a verified
// Paystack payment. To bring Paystack back: set MANUAL_MODE false and
// remove the NM_manualPay hook in supabase/client.js startPayment.
var MANUAL_MODE = true;
var MANUAL_ACCOUNT = { bank: "OPay", number: "9150951870", name: "Yusuf Babatunde Ibrahim" };

// Server-side price list. The client NEVER sets the amount.
var PLANS = {
  bump_1:      { purpose: "bump",     label: "Bump listing",        amount_kobo: 100000,  days: 0 },
  promote_7d:  { purpose: "promote",  label: "Promote 1 week",      amount_kobo: 100000,  days: 7 },
  featured_7d: { purpose: "featured", label: "Featured 2 weeks",    amount_kobo: 500000,  days: 14 },
  premium_1m:  { purpose: "premium",  label: "Launch promo Premium 2 months + free listing ad boost", amount_kobo: 100000, months: 2, promo_ads: true },
  premium_promo_2m: { purpose: "premium", label: "Launch promo Premium 2 months + free listing ad boost", amount_kobo: 100000, months: 2, promo_ads: true },
  premium_6m:  { purpose: "premium",  label: "Premium 6 months", amount_kobo: 500000, months: 6 },
  banner_30d:  { purpose: "banner",   label: "Home banner 2 weeks", amount_kobo: 500000, days: 14 }
};

function sb(path, opts) {
  var headers = { apikey: SERVICE, Authorization: "Bearer " + SERVICE, "Content-Type": "application/json" };
  if (opts && opts.headers) for (var k in opts.headers) headers[k] = opts.headers[k];
  var o = Object.assign({}, opts || {}, { headers: headers });
  return fetch(SUPABASE_URL + "/rest/v1/" + path, o).then(function (r) {
    if (!r.ok) throw new Error("db " + r.status);
    return r.text().then(function (t) { return t ? JSON.parse(t) : []; });
  });
}

function getUser(token) {
  if (!token) return Promise.resolve(null);
  return fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SERVICE, Authorization: "Bearer " + token } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });
}

function paystack(path, opts) {
  var o = Object.assign({}, opts || {}, { headers: { Authorization: "Bearer " + PAYSTACK_SECRET, "Content-Type": "application/json" } });
  return fetch("https://api.paystack.co" + path, o).then(function (r) { return r.json(); });
}

// Launch-promo free advertising: immediately boost every active listing the
// buyer already has, so the benefit is real in the live feed (listProducts
// sorts bumped listings first). The benefit is recorded on the payment row.
function applyPromoAds(p, now) {
  return sb("products?select=id&seller_id=eq." + p.user_id + "&status=eq.active", {}).then(function (rows) {
    var count = rows ? rows.length : 0;
    var meta = (p.meta && typeof p.meta === "object") ? p.meta : {};
    var benefit = { type: "free_listing_ad_boost", status: count ? "applied" : "no_active_listings", listings_boosted: count, applied_at: now.toISOString() };
    var nextMeta = Object.assign({}, meta, { promo_benefit: benefit });
    function record() { return sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ meta: nextMeta }) }); }
    if (!count) return record();
    return sb("products?seller_id=eq." + p.user_id + "&status=eq.active", { method: "PATCH", body: JSON.stringify({ bump_at: now.toISOString() }) }).then(record);
  }).catch(function () { return null; });
}

// Idempotent + race-safe: only activates a payment whose status is not yet
// "paid". The caller must first WIN an atomic claim (a unique token written
// into meta under a status filter, then read back) before applying benefits,
// so the verify endpoint and the webhook firing together can never apply a
// benefit (e.g. premium months) twice for one payment.
function fulfill(p) {
  if (!p || p.status === "paid") return Promise.resolve(false);
  var now = new Date();
  var plan = PLANS[p.plan] || {};
  var days = plan.days || 0;
  var token = "claim-" + now.getTime() + "-" + Math.floor(Math.random() * 1e9);
  var baseMeta = (p.meta && typeof p.meta === "object") ? p.meta : {};
  var claimMeta = Object.assign({}, baseMeta, { claim: token });
  var observed = p.status || "pending";
  return sb("payments?id=eq." + p.id + "&status=eq." + encodeURIComponent(observed), { method: "PATCH", body: JSON.stringify({ meta: claimMeta }) }).then(function () {
    return sb("payments?select=meta,status&id=eq." + p.id + "&limit=1", {});
  }).then(function (rows) {
    var cur = rows && rows[0];
    if (!cur || cur.status === "paid" || !cur.meta || cur.meta.claim !== token) return false;
    var work = Promise.resolve();
    if (p.purpose === "bump" && p.target_id) {
      work = sb("products?id=eq." + p.target_id, { method: "PATCH", body: JSON.stringify({ bump_at: now.toISOString() }) });
    } else if (p.purpose === "promote" && p.target_id) {
      work = sb("products?select=promoted_until&id=eq." + p.target_id + "&limit=1", {}).then(function (prows) {
        var cur = prows && prows[0] && prows[0].promoted_until ? Date.parse(prows[0].promoted_until) : 0;
        var base = Math.max(now.getTime(), isNaN(cur) ? 0 : cur);
        var exp = new Date(base + days * 864e5).toISOString();
        return sb("products?id=eq." + p.target_id, { method: "PATCH", body: JSON.stringify({ promoted_until: exp, bump_at: now.toISOString() }) });
      });
    } else if (p.purpose === "featured" && p.target_id) {
      var exp = new Date(now.getTime() + days * 864e5).toISOString();
      work = sb("admin_featured?select=product_id&product_id=eq." + p.target_id + "&limit=1", {}).then(function (frows) {
        if (frows && frows.length) return sb("admin_featured?product_id=eq." + p.target_id, { method: "PATCH", body: JSON.stringify({ expires_at: exp, source: "paid" }) });
        return sb("admin_featured", { method: "POST", body: JSON.stringify([{ product_id: p.target_id, expires_at: exp, source: "paid" }]) });
      });
    } else if (p.purpose === "premium") {
      work = sb("profiles?select=premium_until&id=eq." + p.user_id, {}).then(function (prows) {
        var cur2 = prows && prows[0] && prows[0].premium_until ? new Date(prows[0].premium_until) : now;
        var base = cur2 > now ? cur2 : now;
        var until;
        if (plan.months) { var md = new Date(base.getTime()); md.setMonth(md.getMonth() + plan.months); until = md.toISOString(); }
        else { until = new Date(base.getTime() + days * 864e5).toISOString(); }
        return sb("profiles?id=eq." + p.user_id, { method: "PATCH", body: JSON.stringify({ verification_tier: "gold", premium_until: until }) }).then(function () {
          var pWithMeta = Object.assign({}, p, { meta: claimMeta });
          return plan.promo_ads ? applyPromoAds(pWithMeta, now) : null;
        });
      });
    }
    // purpose "banner": nothing automatic — the paid row is the admin's fulfilment queue.
    return work.then(function () {
      return sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ status: "paid", paid_at: now.toISOString(), activated_at: now.toISOString() }) });
    }).then(function () {
      if (p.purpose === "premium") { return referralReward(Object.assign({}, p, { meta: claimMeta })).then(function () { return true; }, function () { return true; }); }
      return true;
    });
  });
}

// Verify a reference with Paystack and fulfil if genuinely paid. Returns the payment row.
function verifyAndFulfill(reference) {
  return sb("payments?reference=eq." + encodeURIComponent(reference) + "&limit=1", {}).then(function (rows) {
    var p = rows && rows[0];
    if (!p) return null;
    if (p.status === "paid") return p;
    return paystack("/transaction/verify/" + encodeURIComponent(reference), {}).then(function (v) {
      var d = v && v.data;
      if (d && d.status === "success" && d.amount === p.amount_kobo && d.currency === "NGN") {
        var au = d.authorization || {};
        var inst = { auth: au.authorization_code || null, bin: au.bin || null, last4: au.last4 || null, bank: au.bank || null, channel: d.channel || null };
        var meta2 = Object.assign({}, (p.meta && typeof p.meta === "object") ? p.meta : {}, { instrument: inst, payer_email: (d.customer && d.customer.email) || null });
        var p2 = Object.assign({}, p, { meta: meta2 });
        return sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ meta: meta2 }) }).catch(function () { return null; }).then(function () {
          return fulfill(p2).then(function () { return Object.assign({}, p2, { status: "paid" }); });
        });
      }
      if (d && (d.status === "failed" || d.status === "abandoned")) {
        return sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ status: d.status }) }).then(function () { return Object.assign({}, p, { status: d.status }); });
      }
      return p;
    });
  });
}


// ---------------- Refer & Earn ----------------
// Rewards are created ONLY here, inside fulfilment of a verified external
// payment. Splits (Ibrahim's spec, kobo): a N1,000 premium payment pays the
// referrer N250 cash + N250 service credit; N5,000 pays N750 cash + N250
// credit. Ibrahim's rule (2026-10-18): the N5,000 tier earns on EVERY
// verified payment by the referral; the N1,000 tier earns ONCE per
// referred account (first N1,000 payment only). Unique payment_ref and
// ledger idempotency keys make a replay of the SAME payment harmless.
// Any fraud signal holds the
// reward (status "held", no ledger entries) for admin review instead of
// crediting it. Wallet-paid purchases never create rewards (meta.method).
var REWARD_BY_AMOUNT = { 100000: { cash: 25000, credit: 25000 }, 500000: { cash: 75000, credit: 25000 } };
function canonEmail(e) {
  if (!e) return "";
  var str = String(e).toLowerCase().trim();
  var at = str.lastIndexOf("@"); if (at < 0) return str;
  var local = str.slice(0, at), dom = str.slice(at + 1);
  if (dom === "gmail.com" || dom === "googlemail.com") { local = local.split("+")[0].replace(/\./g, ""); dom = "gmail.com"; }
  else { local = local.split("+")[0]; }
  return local + "@" + dom;
}
function authUserEmail(uid) {
  return fetch(SUPABASE_URL + "/auth/v1/admin/users/" + uid, { headers: { apikey: SERVICE, Authorization: "Bearer " + SERVICE } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (u) { return (u && u.email) || ""; })
    .catch(function () { return ""; });
}
function instrumentKey(meta) {
  var i = meta && meta.instrument;
  if (!i) return null;
  return i.auth || ((i.bin || "") + ":" + (i.last4 || "")) || null;
}
function referralReward(p) {
  var rw = REWARD_BY_AMOUNT[p.amount_kobo];
  if (!rw) return Promise.resolve();
  if (p.meta && p.meta.method === "wallet") return Promise.resolve();
  return sb("profiles?select=id,referred_by,referral_code_used,phone,created_at&id=eq." + p.user_id, {}).then(function (rows) {
    var payer = rows && rows[0];
    if (!payer || !payer.referred_by) return null;
    var referrerId = payer.referred_by;
    return sb("referral_rewards?select=id,amount_paid_kobo&referred_user_id=eq." + p.user_id, {}).then(function (existing) {
      // Ibrahim's rule (2026-10-18): the N1,000 tier earns ONCE per referred
      // account (its first N1,000 payment only); the N5,000 tier earns on
      // EVERY payment. A partial unique index in the DB backs the N1,000 cap.
      if (Number(p.amount_kobo) === 100000 && existing && existing.some(function (r) { return Number(r.amount_paid_kobo) === 100000; })) return null;
      var flags = [];
      var checks = [];
      if (referrerId === p.user_id) flags.push("self_referral");
      checks.push(Promise.all([
        sb("device_records?select=fingerprint&user_id=eq." + referrerId + "&limit=50", {}).catch(function () { return []; }),
        sb("device_records?select=fingerprint&user_id=eq." + p.user_id + "&limit=50", {}).catch(function () { return []; })
      ]).then(function (both) {
        var mine = {};
        (both[0] || []).forEach(function (d) { mine[d.fingerprint] = 1; });
        if ((both[1] || []).some(function (d) { return mine[d.fingerprint]; })) flags.push("shared_device");
      }));
      checks.push(sb("profiles?select=phone&id=eq." + referrerId, {}).then(function (rr) {
        var rp = rr && rr[0] && rr[0].phone;
        if (rp && payer.phone && String(rp).replace(/\D/g, "") === String(payer.phone).replace(/\D/g, "")) flags.push("shared_phone");
      }).catch(function () {}));
      var inst = instrumentKey(p.meta);
      if (inst) {
        checks.push(sb("payments?select=id,user_id,meta&status=eq.paid&limit=300", {}).then(function (all) {
          (all || []).forEach(function (q) {
            if (q.id === p.id || q.user_id === p.user_id) return;
            if (instrumentKey(q.meta) === inst) flags.push("shared_payment_instrument");
          });
        }).catch(function () {}));
      }
      checks.push(Promise.all([authUserEmail(referrerId), authUserEmail(p.user_id)]).then(function (em) {
        if (em[0] && em[1] && canonEmail(em[0]) === canonEmail(em[1])) flags.push("shared_email_identity");
      }));
      checks.push(sb("referral_rewards?select=id&referrer_id=eq." + referrerId + "&created_at=gt." + new Date(Date.now() - 864e5).toISOString(), {}).then(function (recent) {
        if (recent && recent.length >= 5) flags.push("velocity_hold");
      }).catch(function () {}));
      return Promise.all(checks).then(function () {
        var held = flags.length > 0;
        var row = { referrer_id: referrerId, referred_user_id: p.user_id, payment_ref: p.reference, plan: p.plan, amount_paid_kobo: p.amount_kobo, cash_kobo: rw.cash, credit_kobo: rw.credit, status: held ? "held" : "credited", fraud_flags: flags };
        return sb("referral_rewards", { method: "POST", body: JSON.stringify([row]) }).then(function () {
          if (held) return null;
          var entries = [
            { user_id: referrerId, kind: "cash", amount_kobo: rw.cash, reason: "referral_reward", ref: p.reference, idempotency_key: "ref:" + p.reference + ":cash" },
            { user_id: referrerId, kind: "credit", amount_kobo: rw.credit, reason: "referral_reward", ref: p.reference, idempotency_key: "ref:" + p.reference + ":credit" }
          ];
          return sb("wallet_ledger", { method: "POST", body: JSON.stringify(entries) }).catch(function () { return null; });
        }).catch(function () { return null; });
      });
    });
  }).catch(function () { return null; });
}

module.exports = { PLANS: PLANS, sb: sb, getUser: getUser, paystack: paystack, fulfill: fulfill, verifyAndFulfill: verifyAndFulfill, SITE: SITE, MANUAL_MODE: MANUAL_MODE, MANUAL_ACCOUNT: MANUAL_ACCOUNT, hasKeys: function () { return !!PAYSTACK_SECRET && !!SERVICE; } };
