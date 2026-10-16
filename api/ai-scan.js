// Nationwide Connect — same-origin proxy for the AI anti-scam Edge Functions.
// Browsers cannot call the Supabase functions directly (CORS preflight is
// rejected), so the storefront calls /api/ai-scan and this route forwards
// server-side with the public anon key.
// SECURITY (2026-10-14): callers must present their Supabase session token.
// The token is validated, the caller must be a participant of the chat (or
// able to see the listing under RLS), scans are rate-limited per user, and
// internal fields (pattern_alerts) are never returned. This stops strangers
// from draining the shared Groq quota through this endpoint.
// POST { conversation_id } -> check-chat verdict
// POST { product_id }      -> check-listing verdict
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Y2lmanh5dGRpeGlvbHZrbXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjUzMTEsImV4cCI6MjEwNzA0MTMxMX0.yg1VRq-aD7txUAgJnQW1H-5j_CyNjNbnEM7pUaoJVNQ";
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var scanLog = {}; // userId -> {at, count, day} (per-instance speed bump)

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).send(JSON.stringify({ error: "POST only" }));
    return;
  }
  var body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  var fn = null, payload = null, table = null, id = null;
  if (body.conversation_id) { fn = "check-chat"; id = String(body.conversation_id); payload = { conversation_id: id }; table = "conversations"; }
  else if (body.product_id) { fn = "check-listing"; id = String(body.product_id); payload = { product_id: id }; table = "products"; }
  if (!fn || !UUID_RE.test(id)) {
    res.status(400).send(JSON.stringify({ error: "valid conversation_id or product_id required" }));
    return;
  }

  // --- caller must be logged in ---
  var auth = String(req.headers.authorization || "");
  var token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    res.status(401).send(JSON.stringify({ error: "login required" }));
    return;
  }
  var uid = null;
  try {
    var ur = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + token }
    });
    if (!ur.ok) { res.status(401).send(JSON.stringify({ error: "invalid session" })); return; }
    var uj = await ur.json();
    uid = uj && uj.id;
    if (!uid) { res.status(401).send(JSON.stringify({ error: "invalid session" })); return; }
  } catch (e) {
    res.status(502).send(JSON.stringify({ error: "auth check unavailable" }));
    return;
  }

  // --- per-user rate limit (speed bump on top of auth) ---
  var now = Date.now();
  var today = new Date().toISOString().slice(0, 10);
  var rec = scanLog[uid] || { at: 0, count: 0, day: today };
  if (rec.day !== today) { rec.day = today; rec.count = 0; }
  if (now - rec.at < 10000) {
    res.status(429).send(JSON.stringify({ error: "scans are rate limited, wait a few seconds" }));
    return;
  }
  if (rec.count >= 300) {
    res.status(429).send(JSON.stringify({ error: "daily scan limit reached" }));
    return;
  }
  rec.at = now; rec.count++; scanLog[uid] = rec;

  // --- caller must be able to see the target row under RLS ---
  try {
    var vr = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + encodeURIComponent(id) + "&select=id", {
      headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + token }
    });
    var vj = vr.ok ? await vr.json() : [];
    if (!Array.isArray(vj) || !vj.length) {
      res.status(403).send(JSON.stringify({ error: "not your " + (table === "conversations" ? "conversation" : "listing") }));
      return;
    }
  } catch (e) {
    res.status(502).send(JSON.stringify({ error: "access check unavailable" }));
    return;
  }

  // Listings are never barred by the AI (owner directive, 2026-10-14):
  // every listing goes live; AI enforcement focuses on chats and scams.
  // Product scan calls return an instant approval without invoking
  // check-listing, so nothing can hold, reject or score a listing.
  if (table === "products") {
    res.status(200).send(JSON.stringify({ ok: true, status: "active", auto_approved: true }));
    return;
  }

  try {
    var r = await fetch(SUPABASE_URL + "/functions/v1/" + fn, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": "Bearer " + SUPABASE_ANON,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    var text = await r.text();
    if (r.ok) {
      try {
        var j = JSON.parse(text);
        if (j && typeof j === "object") { delete j.pattern_alerts; text = JSON.stringify(j); }
      } catch (e) {}
    }
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).send(JSON.stringify({ error: "AI check unavailable" }));
  }
};
