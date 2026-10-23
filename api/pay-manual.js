// Manual bank-transfer payments for Nationwide Media Connect.
// Paystack is PAUSED (see _paylib MANUAL_MODE). The user transfers to the
// OPay account shown in the app, then submits a claim here. Nothing
// activates on a claim alone: an admin approves it from the admin panel,
// whose API calls the bridge actions below, and approval runs the SAME
// lib.fulfill() as a verified Paystack payment (idempotent, race-safe,
// and it is the only place referral rewards are minted).
var lib = require("./_paylib");
var crypto = require("crypto");

function bridgeOk(req) {
  var want = process.env.MANUAL_BRIDGE_SECRET || "";
  var got = (req.headers && req.headers["x-bridge-secret"]) || "";
  if (!want || !got) return false;
  var a = Buffer.from(String(want)), b = Buffer.from(String(got));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).send(JSON.stringify({ error: "POST only" }));
  var b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  var action = b.action || "claim";

  /* ---------- admin bridge (called server-side by the admin panel) ---------- */
  if (action === "approve" || action === "reject") {
    if (!bridgeOk(req)) return res.status(403).send(JSON.stringify({ error: "not authorized" }));
    var id = String(b.payment_id || "");
    if (!id) return res.status(400).send(JSON.stringify({ error: "payment_id required" }));
    var rows = await lib.sb("payments?select=*&id=eq." + encodeURIComponent(id) + "&limit=1", {}).catch(function () { return null; });
    var p = rows && rows[0];
    if (!p) return res.status(404).send(JSON.stringify({ error: "payment not found" }));
    if (p.provider !== "manual") return res.status(400).send(JSON.stringify({ error: "not a manual payment" }));
    if (p.status !== "pending") return res.status(409).send(JSON.stringify({ error: "already decided: " + p.status }));
    var meta = (p.meta && typeof p.meta === "object") ? p.meta : {};
    if (action === "reject") {
      var man = Object.assign({}, meta.manual || {}, { state: "rejected", decided_at: new Date().toISOString(), reason: String(b.reason || "Transfer not confirmed").slice(0, 200) });
      await lib.sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ status: "failed", meta: Object.assign({}, meta, { manual: man }) }) });
      return res.status(200).send(JSON.stringify({ ok: true, status: "failed" }));
    }
    await lib.fulfill(p);
    var rows2 = await lib.sb("payments?select=id,status,meta&id=eq." + p.id + "&limit=1", {}).catch(function () { return null; });
    var p2 = rows2 && rows2[0];
    if (!p2 || p2.status !== "paid") return res.status(500).send(JSON.stringify({ error: "fulfilment did not complete" }));
    var meta2 = (p2.meta && typeof p2.meta === "object") ? p2.meta : {};
    var man2 = Object.assign({}, meta2.manual || {}, { state: "approved", decided_at: new Date().toISOString() });
    await lib.sb("payments?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ meta: Object.assign({}, meta2, { manual: man2 }) }) }).catch(function () {});
    return res.status(200).send(JSON.stringify({ ok: true, status: "paid" }));
  }

  /* ---------- user actions ---------- */
  var user = await lib.getUser(b.token);
  if (!user || !user.id) return res.status(401).send(JSON.stringify({ error: "sign in required" }));

  if (action === "mine") {
    var mine = await lib.sb("payments?select=id,purpose,plan,target_id,amount_kobo,reference,status,meta,created_at&user_id=eq." + user.id + "&provider=eq.manual&order=created_at.desc&limit=20", {}).catch(function () { return []; });
    return res.status(200).send(JSON.stringify({ ok: true, payments: (mine || []).map(function (x) {
      var m = (x.meta && x.meta.manual) || {};
      return { reference: x.reference, plan: x.plan, purpose: x.purpose, amount_kobo: x.amount_kobo, status: x.status, state: m.state || (x.status === "paid" ? "approved" : "awaiting_review"), created_at: x.created_at };
    }) }));
  }

  /* claim: record that the user says they have transferred */
  var plan = lib.PLANS[b.plan];
  if (!plan) return res.status(400).send(JSON.stringify({ error: "unknown plan" }));
  var target = b.target_id || null;
  if (plan.purpose === "bump" || plan.purpose === "featured" || plan.purpose === "promote") {
    if (!target) return res.status(400).send(JSON.stringify({ error: "listing required" }));
    var prows = await lib.sb("products?select=id,seller_id&id=eq." + target + "&limit=1", {}).catch(function () { return null; });
    if (!prows || !prows[0]) return res.status(404).send(JSON.stringify({ error: "listing not found" }));
    if (prows[0].seller_id !== user.id) return res.status(403).send(JSON.stringify({ error: "not your listing" }));
  }
  var sender = String(b.sender_name || "").trim().slice(0, 80);
  if (sender.length < 2) return res.status(400).send(JSON.stringify({ error: "Please enter the name on the transfer" }));
  var dupQ = "payments?select=id,reference,status&user_id=eq." + user.id + "&provider=eq.manual&status=eq.pending&plan=eq." + encodeURIComponent(b.plan) + (target ? "&target_id=eq." + target : "&target_id=is.null") + "&limit=1";
  var dup = await lib.sb(dupQ, {}).catch(function () { return null; });
  if (dup && dup[0]) return res.status(200).send(JSON.stringify({ ok: true, existing: true, reference: dup[0].reference, amount_kobo: plan.amount_kobo, plan_label: plan.label }));
  var reference = "NM" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
  var meta3 = { method: "manual_transfer", manual: { state: "awaiting_review", sender_name: sender, note: String(b.note || "").trim().slice(0, 200), claimed_at: new Date().toISOString(), bank: lib.MANUAL_ACCOUNT.bank, account_number: lib.MANUAL_ACCOUNT.number, account_name: lib.MANUAL_ACCOUNT.name } };
  try {
    await lib.sb("payments", { method: "POST", body: JSON.stringify([{ user_id: user.id, purpose: plan.purpose, target_id: target, plan: b.plan, amount_kobo: plan.amount_kobo, reference: reference, provider: "manual", meta: meta3 }]) });
  } catch (e) {
    return res.status(502).send(JSON.stringify({ error: "could not record your payment. Please try again." }));
  }
  return res.status(200).send(JSON.stringify({ ok: true, reference: reference, amount_kobo: plan.amount_kobo, plan_label: plan.label }));
};
