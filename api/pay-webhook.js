// Paystack webhook. Source of truth: fires even if the customer closed the tab.
// Signature: x-paystack-signature = HMAC SHA512 of the RAW body with the secret key.
var crypto = require("crypto");
var lib = require("./_paylib");
module.exports = async function (req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");
  if (!lib.hasKeys()) return res.status(503).send("not configured");
  var chunks = [];
  req.on("data", function (c) { chunks.push(c); });
  req.on("end", async function () {
    var raw = Buffer.concat(chunks);
    var hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "").update(raw).digest("hex");
    if (hash !== (req.headers["x-paystack-signature"] || "")) return res.status(401).send("bad signature");
    var evt = {};
    try { evt = JSON.parse(raw.toString("utf8")); } catch (e) { return res.status(400).send("bad json"); }
    try {
      if (evt.event === "charge.success" && evt.data && evt.data.reference) {
        await lib.verifyAndFulfill(evt.data.reference);
      }
    } catch (e) { /* Paystack retries on 5xx only; verification is re-runnable, so ack and let verify path catch up */ }
    return res.status(200).send("ok");
  });
};
module.exports.config = { api: { bodyParser: false } };
