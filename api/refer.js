// Nationwide Connect — Refer & Earn API (server-side, service role).
// POST { token, action, ... } with the caller's Supabase session token.
// Actions: attach (lock a referral code onto a brand-new account), mycode
// (get or generate the caller's referral code), summary (balances, stats,
// history), walletpay (spend service credit on a plan), withdraw (request a
// cash withdrawal). Money rules live server-side only: balances are sums
// over the append-only wallet_ledger; cash clears 7 days after it is
// earned; withdrawals are paid manually by admin after review.
var lib = require("./_paylib");
var crypto = require("crypto");
var CLEAR_MS = 7 * 864e5;
var MIN_WITHDRAW_KOBO = 100000; // N1,000

function sums(rows) {
  var cash = 0, credit = 0, cashCleared = 0;
  var now = Date.now();
  (rows || []).forEach(function (r) {
    var amt = Number(r.amount_kobo) || 0;
    if (r.kind === "credit") { credit += amt; }
    else {
      cash += amt;
      if (amt > 0 && now - Date.parse(r.created_at) >= CLEAR_MS) cashCleared += amt;
      else if (amt < 0) cashCleared += amt; // debits count against cleared first
    }
  });
  return { cash: cash, credit: credit, cashCleared: Math.max(0, cashCleared) };
}
function ledgerOf(uid) { return lib.sb("wallet_ledger?select=kind,amount_kobo,reason,ref,created_at&user_id=eq." + uid + "&order=created_at.asc&limit=1000", {}); }
function withdrawalsOf(uid) { return lib.sb("withdrawals?select=id,amount_kobo,status,created_at,settled_at&user_id=eq." + uid + "&order=created_at.desc&limit=50", {}); }
function availableCash(uid) {
  return Promise.all([ledgerOf(uid), withdrawalsOf(uid)]).then(function (both) {
    var s = sums(both[0]);
    var requested = 0;
    (both[1] || []).forEach(function (w) { if (w.status === "requested") requested += Number(w.amount_kobo) || 0; });
    return { sums: s, requested: requested, available: Math.max(0, s.cashCleared - requested) };
  });
}

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).send(JSON.stringify({ error: "POST only" }));
  if (!lib.hasKeys()) return res.status(503).send(JSON.stringify({ error: "not configured" }));
  var b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  var user = await lib.getUser(b.token);
  if (!user || !user.id) return res.status(401).send(JSON.stringify({ error: "sign in required" }));
  var uid = user.id;
  try {
    if (b.action === "attach") {
      var code = String(b.code || "").trim().toUpperCase();
      if (!code) return res.status(400).send(JSON.stringify({ error: "code required" }));
      var prof = await lib.sb("profiles?select=id,referred_by,created_at&id=eq." + uid, {});
      var me = prof && prof[0];
      if (!me) return res.status(404).send(JSON.stringify({ error: "profile not found" }));
      if (me.referred_by) return res.status(200).send(JSON.stringify({ ok: true, already: true }));
      if (Date.now() - Date.parse(me.created_at) > 7 * 864e5) return res.status(200).send(JSON.stringify({ ok: false, reason: "account_too_old" }));
      var owners = await lib.sb("profiles?select=id&referral_code=eq." + encodeURIComponent(code), {});
      var owner = owners && owners[0];
      if (!owner) return res.status(200).send(JSON.stringify({ ok: false, reason: "unknown_code" }));
      if (owner.id === uid) return res.status(200).send(JSON.stringify({ ok: false, reason: "own_code" }));
      await lib.sb("profiles?id=eq." + uid + "&referred_by=is.null", { method: "PATCH", body: JSON.stringify({ referred_by: owner.id, referral_code_used: code }) });
      return res.status(200).send(JSON.stringify({ ok: true }));
    }
    async function ensureReferralCode(uid2) {
      var p2 = await lib.sb("profiles?select=referral_code&id=eq." + uid2, {});
      var existing = p2 && p2[0] && p2[0].referral_code;
      if (existing) return existing;
      var ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      for (var attempt = 0; attempt < 6; attempt++) {
        var cand = "NM";
        var buf = crypto.randomBytes(6);
        for (var i = 0; i < 6; i++) cand += ABC[buf[i] % ABC.length];
        var clash = await lib.sb("profiles?select=id&referral_code=eq." + encodeURIComponent(cand), {}).catch(function () { return null; });
        if (!clash || clash.length) continue;
        try {
          await lib.sb("profiles?id=eq." + uid2 + "&referral_code=is.null", { method: "PATCH", body: JSON.stringify({ referral_code: cand }) });
        } catch (e) { continue; }
        var holders = await lib.sb("profiles?select=id&referral_code=eq." + encodeURIComponent(cand), {}).catch(function () { return null; });
        if (holders && holders.length === 1 && holders[0].id === uid2) return cand;
        var chk = await lib.sb("profiles?select=referral_code&id=eq." + uid2, {});
        if (chk && chk[0] && chk[0].referral_code) return chk[0].referral_code;
      }
      return null;
    }
    if (b.action === "mycode") {
      var code0 = await ensureReferralCode(uid);
      if (!code0) return res.status(500).send(JSON.stringify({ error: "could not generate a code" }));
      return res.status(200).send(JSON.stringify({ ok: true, code: code0 }));
    }
    if (b.action === "summary") {
      var data = await Promise.all([
        lib.sb("profiles?select=referral_code&id=eq." + uid, {}),
        lib.sb("profiles?select=id,display_name,created_at,premium_until&referred_by=eq." + uid + "&order=created_at.desc&limit=1000", {}),
        lib.sb("referral_rewards?select=id,referred_user_id,plan,amount_paid_kobo,cash_kobo,credit_kobo,status,created_at&referrer_id=eq." + uid + "&order=created_at.desc&limit=50", {}),
        ledgerOf(uid),
        withdrawalsOf(uid)
      ]);
      var codeFinal = (data[0] && data[0][0] && data[0][0].referral_code) || null;
      if (!codeFinal) { try { codeFinal = await ensureReferralCode(uid); } catch (e) { codeFinal = null; } }
      var s = sums(data[3]);
      var requested = 0;
      (data[4] || []).forEach(function (w) { if (w.status === "requested") requested += Number(w.amount_kobo) || 0; });
      var history = (data[3] || []).slice(-12).reverse();
      var rewardByReferred = {};
      (data[2] || []).forEach(function (r) { rewardByReferred[r.referred_user_id] = r; });
      var people = (data[1] || []).map(function (p) {
        var rw2 = rewardByReferred[p.id];
        return {
          name: p.display_name || "Customer",
          joined_at: p.created_at,
          premium: !!(rw2 || (p.premium_until && Date.parse(p.premium_until) > Date.now())),
          reward_status: rw2 ? rw2.status : null
        };
      });
      return res.status(200).send(JSON.stringify({
        ok: true,
        code: codeFinal,
        referredCount: (data[1] || []).length,
        subscribedCount: (data[2] || []).filter(function (r) { return r.status === "credited" || r.status === "held"; }).length,
        cashKobo: s.cash, creditKobo: s.credit, cashAvailableKobo: Math.max(0, s.cashCleared - requested),
        minWithdrawKobo: MIN_WITHDRAW_KOBO,
        rewards: data[2] || [], history: history, withdrawals: (data[4] || []).slice(0, 6), people: people
      }));
    }
    if (b.action === "walletpay") {
      var plan = lib.PLANS[b.plan];
      if (!plan) return res.status(400).send(JSON.stringify({ error: "unknown plan" }));
      var target = b.target_id || null;
      if ((plan.purpose === "bump" || plan.purpose === "featured")) {
        if (!target) return res.status(400).send(JSON.stringify({ error: "listing required" }));
        var prods = await lib.sb("products?select=id,seller_id&id=eq." + target + "&limit=1", {}).catch(function () { return null; });
        if (!prods || !prods[0]) return res.status(404).send(JSON.stringify({ error: "listing not found" }));
        if (prods[0].seller_id !== uid) return res.status(403).send(JSON.stringify({ error: "not your listing" }));
      }
      var idem = String(b.idem || "");
      if (idem.length < 8) return res.status(400).send(JSON.stringify({ error: "idem required" }));
      var price = plan.amount_kobo;
      var led = await ledgerOf(uid);
      if (sums(led).credit < price) return res.status(402).send(JSON.stringify({ error: "not enough wallet credit", creditKobo: sums(led).credit }));
      var reference = "WALLET-" + crypto.createHash("sha256").update(uid + ":" + idem).digest("hex").slice(0, 20).toUpperCase();
      var spent = await lib.sb("payments?select=id,status&reference=eq." + reference, {});
      if (spent && spent[0] && spent[0].status === "paid") return res.status(200).send(JSON.stringify({ ok: true, already: true, reference: reference }));
      try {
        await lib.sb("wallet_ledger", { method: "POST", body: JSON.stringify([{ user_id: uid, kind: "credit", amount_kobo: -price, reason: "service_payment", ref: reference, idempotency_key: "spend:" + uid + ":" + idem }]) });
      } catch (e) {
        return res.status(409).send(JSON.stringify({ error: "this payment is already being processed" }));
      }
      var prow;
      try {
        await lib.sb("payments", { method: "POST", body: JSON.stringify([{ user_id: uid, purpose: plan.purpose, target_id: target, plan: b.plan, amount_kobo: price, reference: reference, status: "pending", meta: { method: "wallet" } }]) });
        var gotRow = await lib.sb("payments?select=*&reference=eq." + reference + "&limit=1", {});
        prow = gotRow && gotRow[0];
        if (!prow) throw new Error("no payment row");
        var done = await lib.fulfill(prow);
        if (!done) throw new Error("fulfilment failed");
      } catch (e2) {
        await lib.sb("wallet_ledger", { method: "POST", body: JSON.stringify([{ user_id: uid, kind: "credit", amount_kobo: price, reason: "reversal", ref: reference, idempotency_key: "spend:" + uid + ":" + idem + ":rev" }]) }).catch(function () {});
        if (prow) await lib.sb("payments?id=eq." + prow.id, { method: "PATCH", body: JSON.stringify({ status: "failed" }) }).catch(function () {});
        return res.status(500).send(JSON.stringify({ error: "wallet payment failed and your credit was restored" }));
      }
      return res.status(200).send(JSON.stringify({ ok: true, reference: reference, purpose: plan.purpose }));
    }
    if (b.action === "withdraw") {
      var amount = Math.floor(Number(b.amount_kobo) || 0);
      var bank = String(b.bank_name || "").trim(), acct = String(b.account_number || "").replace(/\D/g, ""), name = String(b.account_name || "").trim();
      if (!bank || acct.length !== 10 || !name) return res.status(400).send(JSON.stringify({ error: "enter your bank, a 10-digit account number and the account name" }));
      if (amount < MIN_WITHDRAW_KOBO) return res.status(400).send(JSON.stringify({ error: "minimum withdrawal is N1,000" }));
      var av = await availableCash(uid);
      if (amount > av.available) return res.status(400).send(JSON.stringify({ error: "amount is more than your available cash", availableKobo: av.available }));
      await lib.sb("withdrawals", { method: "POST", body: JSON.stringify([{ user_id: uid, amount_kobo: amount, bank_name: bank, account_number: acct, account_name: name, status: "requested" }]) });
      return res.status(200).send(JSON.stringify({ ok: true }));
    }
    return res.status(400).send(JSON.stringify({ error: "unknown action" }));
  } catch (e) {
    return res.status(500).send(JSON.stringify({ error: "refer action failed" }));
  }
};
