// POST {token, reference} -> {ok, status, purpose, plan}
// The returning customer lands here: verify with Paystack server-side, fulfil if paid.
var lib = require("./_paylib");
module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).send(JSON.stringify({ error: "POST only" }));
  if (!lib.hasKeys()) return res.status(503).send(JSON.stringify({ error: "payments not configured" }));
  var b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  var user = await lib.getUser(b.token);
  if (!user || !user.id) return res.status(401).send(JSON.stringify({ error: "sign in required" }));
  if (!b.reference) return res.status(400).send(JSON.stringify({ error: "reference required" }));
  try {
    var p = await lib.verifyAndFulfill(b.reference);
    if (!p) return res.status(404).send(JSON.stringify({ error: "payment not found" }));
    if (p.user_id !== user.id) return res.status(403).send(JSON.stringify({ error: "not your payment" }));
    return res.status(200).send(JSON.stringify({ ok: true, status: p.status, purpose: p.purpose, plan: p.plan }));
  } catch (e) {
    return res.status(502).send(JSON.stringify({ error: "verification failed" }));
  }
};
