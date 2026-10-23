// POST {token, plan, target_id?, meta?} -> {ok, authorization_url, reference}
// Creates a pending payment and opens Paystack checkout. Amount comes from the server price list only.
var lib = require("./_paylib");
module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).send(JSON.stringify({ error: "POST only" }));
  if (lib.MANUAL_MODE) return res.status(410).send(JSON.stringify({ error: "Card payment is paused right now. Please pay by bank transfer instead." }));
  if (!lib.hasKeys()) return res.status(503).send(JSON.stringify({ error: "payments not configured" }));
  var b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  var user = await lib.getUser(b.token);
  if (!user || !user.id) return res.status(401).send(JSON.stringify({ error: "sign in required" }));
  var plan = lib.PLANS[b.plan];
  if (!plan) return res.status(400).send(JSON.stringify({ error: "unknown plan" }));
  var target = b.target_id || null;
  if ((plan.purpose === "bump" || plan.purpose === "featured" || plan.purpose === "promote")) {
    if (!target) return res.status(400).send(JSON.stringify({ error: "listing required" }));
    var rows = await lib.sb("products?select=id,seller_id&id=eq." + target + "&limit=1", {}).catch(function () { return null; });
    if (!rows || !rows[0]) return res.status(404).send(JSON.stringify({ error: "listing not found" }));
    if (rows[0].seller_id !== user.id) return res.status(403).send(JSON.stringify({ error: "not your listing" }));
  }
  var reference = "NC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
  var meta = (b.meta && typeof b.meta === "object") ? b.meta : {};
  try {
    await lib.sb("payments", { method: "POST", body: JSON.stringify([{ user_id: user.id, purpose: plan.purpose, target_id: target, plan: b.plan, amount_kobo: plan.amount_kobo, reference: reference, meta: meta }]) });
    var init = await lib.paystack("/transaction/initialize", { method: "POST", body: JSON.stringify({ email: user.email, amount: plan.amount_kobo, reference: reference, callback_url: lib.SITE + "/?pay=return", metadata: { purpose: plan.purpose, plan: b.plan, user_id: user.id } }) });
    if (!init || !init.status || !init.data || !init.data.authorization_url) throw new Error("paystack init failed");
    return res.status(200).send(JSON.stringify({ ok: true, authorization_url: init.data.authorization_url, reference: reference }));
  } catch (e) {
    return res.status(502).send(JSON.stringify({ error: "could not start payment" }));
  }
};
