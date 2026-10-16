// Shared helpers for Nationwide Connect Paystack payments.
// Server-side only. The Paystack SECRET key lives in the Vercel env (PAYSTACK_SECRET_KEY)
// and must never reach the browser or chat.
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SERVICE = process.env.SUPABASE_SERVICE_ROLE || "";
var PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
var SITE = "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app";

// Server-side price list. The client NEVER sets the amount.
var PLANS = {
  bump_1:      { purpose: "bump",     label: "Bump listing",        amount_kobo: 100000,  days: 0 },
  featured_7d: { purpose: "featured", label: "Featured 7 days",     amount_kobo: 500000,  days: 7 },
  premium_1m:  { purpose: "premium",  label: "Launch promo Premium 2 months + free listing ad boost", amount_kobo: 100000, months: 2, promo_ads: true },
  premium_promo_2m: { purpose: "premium", label: "Launch promo Premium 2 months + free listing ad boost", amount_kobo: 100000, months: 2, promo_ads: true },
  premium_6m:  { purpose: "premium",  label: "Premium 6 months", amount_kobo: 500000, months: 6 },
  banner_30d:  { purpose: "banner",   label: "Home banner 1 month", amount_kobo: 1000000, days: 30 }
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

// Idempotent: only activates a payment whose status is not yet "paid".
function fulfill(p) {
  if (!p || p.status === "paid") return Promise.resolve(false);
  var now = new Date();
  var plan = PLANS[p.plan] || {};
  var days = plan.days || 0;
  var work = Promise.resolve();
  if (p.purpose === "bump" && p.target_id) {
    work = sb("products?id=eq." + p.target_id, { method: "PATCH", body: JSON.stringify({ bump_at: now.toISOString() }) });
  } else if (p.purpose === "featured" && p.target_id) {
    var exp = new Date(now.getTime() + days * 864e5).toISOString();
    work = sb("admin_featured?select=product_id&product_id=eq." + p.target_id + "&limit=1", {}).then(function (rows) {
      if (rows && rows.length) return sb("admin_featured?product_id=eq." + p.target_id, { method: "PATCH", body: JSON.stringify({ expires_at: exp, source: "paid" }) });
      return sb("admin_featured", { method: "POST", body: JSON.stringify([{ product_id: p.target_id, expires_at: exp, source: "paid" }]) });
    });
  } else if (p.purpose === "premium") {
    work = sb("profiles?select=premium_until&id=eq." + p.user_id, {}).then(function (rows) {
      var cur = rows && rows[0] && rows[0].premium_until ? new Date(rows[0].premium_until) : now;
      var base = cur > now ? cur : now;
      var until;
      if (plan.months) { var md = new Date(base.getTime()); md.setMonth(md.getMonth() + plan.months); until = md.toISOString(); }
      else { until = new Date(base.getTime() + days * 864e5).toISOString(); }
      return sb("profiles?id=eq." + p.user_id, { method: "PATCH", body: JSON.stringify({ verification_tier: "gold", premium_until: until }) }).then(function () {
        return plan.promo_ads ? applyPromoAds(p, now) : null;
      });
    });
  }
  // purpose "banner": nothing automatic — the paid row is the admin's fulfilment queue.
  return work.then(function () {
    return sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ status: "paid", paid_at: now.toISOString(), activated_at: now.toISOString() }) });
  }).then(function () { return true; });
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
        return fulfill(p).then(function () { return Object.assign({}, p, { status: "paid" }); });
      }
      if (d && (d.status === "failed" || d.status === "abandoned")) {
        return sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ status: d.status }) }).then(function () { return Object.assign({}, p, { status: d.status }); });
      }
      return p;
    });
  });
}

module.exports = { PLANS: PLANS, sb: sb, getUser: getUser, paystack: paystack, fulfill: fulfill, verifyAndFulfill: verifyAndFulfill, SITE: SITE, hasKeys: function () { return !!PAYSTACK_SECRET && !!SERVICE; } };
