// Nationwide Media Connect — Banner artwork submissions (buyer-facing API).
// Same-origin Vercel endpoint, server-side only (service role via _paylib).
// POST { token, action, ... } with the caller's Supabase session token.
// Actions:
//   state  -> the caller's banner state: whether they hold a paid, unconsumed
//             banner payment, and their latest artwork submission if any.
//   submit -> file an artwork submission for the caller's own paid banner
//             payment. The payment is resolved SERVER-side from the caller's
//             paid, unconsumed banner_30d payment; the client never names it.
//             Media must be exactly 1 video OR 1-2 pictures. The submission
//             goes into banner_submissions as status "pending" for admin review.
// Media reaches the server as public banner-artwork bucket URLs; every URL is
// validated against the project's storage prefix AND the caller's own user-id
// path segment, so nobody can submit someone else's files.
var lib = require("./_paylib");
var SUPA = "https://qxcifjxytdixiolvkmtv.supabase.co";
var BUCKET = "banner-artwork";
var PUBLIC_PREFIX = SUPA + "/storage/v1/object/public/" + BUCKET + "/";
var BANNER_PLAN = "banner_30d";

function err(res, code, msg) { return res.status(code).send(JSON.stringify({ error: msg })); }

function paidBannerPayments(uid) {
  return lib.sb("payments?select=id,reference,created_at,paid_at&user_id=eq." + uid +
    "&purpose=eq.banner&status=eq.paid&order=created_at.asc&limit=50", {});
}
function userSubmissions(uid) {
  return lib.sb("banner_submissions?select=id,payment_ref,title,subtitle,link_url,media,status,created_at,reviewed_at&user_id=eq." + uid +
    "&order=created_at.desc&limit=50", {});
}
function consumedRefs(subs) {
  var s = {};
  (subs || []).forEach(function (x) {
    if (x.status === "pending" || x.status === "approved") s[x.payment_ref] = 1;
  });
  return s;
}
function unconsumed(payments, subs) {
  var used = consumedRefs(subs);
  for (var i = 0; i < (payments || []).length; i++) {
    if (!used[payments[i].reference]) return payments[i];
  }
  return null;
}

function mediaError(media, uid) {
  if (!Array.isArray(media)) return "media must be a list";
  var vids = media.filter(function (m) { return m && m.kind === "video"; });
  var pics = media.filter(function (m) { return m && m.kind === "image"; });
  var allOk = (vids.length === 1 && pics.length === 0) ||
    (vids.length === 0 && (pics.length === 1 || pics.length === 2));
  if (!allOk) return "send one video (max 20 seconds) or 1 or 2 pictures";
  for (var i = 0; i < media.length; i++) {
    var m = media[i];
    var url = String(m.url || "");
    if (url.indexOf(PUBLIC_PREFIX) !== 0) return "media url not recognised";
    var rest = url.slice(PUBLIC_PREFIX.length);
    if (rest.indexOf(uid + "/") !== 0) return "media url not recognised";
    var clean = url.split("?")[0].split("#")[0].toLowerCase();
    var ext = clean.indexOf(".") >= 0 ? clean.split(".").pop() : "";
    if (m.kind === "video") {
      if (["mp4", "webm", "mov"].indexOf(ext) < 0) return "video must be mp4, webm or mov";
    } else {
      if (["jpg", "jpeg", "png", "webp"].indexOf(ext) < 0) return "pictures must be jpg, png or webp";
    }
  }
  return null;
}
function cleanLink(l) {
  var s = String(l || "").trim().slice(0, 300);
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.charAt(0) === "/") return s;
  return null; // invalid
}

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return err(res, 405, "POST only");
  if (!lib.hasKeys()) return err(res, 503, "not configured");
  var b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  var user = await lib.getUser(b.token);
  if (!user || !user.id) return err(res, 401, "sign in required");
  var uid = user.id;
  try {
    if (b.action === "state") {
      var pays = await paidBannerPayments(uid).catch(function () { return []; });
      var subs = await userSubmissions(uid).catch(function () { return []; });
      var open = unconsumed(pays, subs);
      var latest = (subs && subs[0]) || null;
      return res.status(200).send(JSON.stringify({
        ok: true,
        paidBanner: !!(pays && pays.length),
        openPayment: open ? { reference: open.reference, paid_at: open.paid_at || open.created_at } : null,
        latest: latest
      }));
    }
    if (b.action === "submit") {
      var pays2 = await paidBannerPayments(uid);
      var subs2 = await userSubmissions(uid).catch(function () { return []; });
      var pay = unconsumed(pays2, subs2);
      if (!pay) return err(res, 400, "no paid banner awaiting artwork");
      var title = String(b.title || "").trim().slice(0, 80);
      if (!title) return err(res, 400, "business name required");
      var subtitle = String(b.subtitle || "").trim().slice(0, 120);
      var link = cleanLink(b.link_url);
      if (link === null) return err(res, 400, "link must start with http(s):// or /");
      var merr = mediaError(b.media, uid);
      if (merr) return err(res, 400, merr);
      var row = [{
        user_id: uid,
        payment_ref: pay.reference,
        title: title,
        subtitle: subtitle,
        link_url: link,
        media: b.media,
        status: "pending"
      }];
      var created;
      try {
        created = await lib.sb("banner_submissions", { method: "POST", body: JSON.stringify(row) });
      } catch (e) {
        return err(res, 409, "artwork already submitted for this banner");
      }
      return res.status(200).send(JSON.stringify({ ok: true, submission: created && created[0] }));
    }
    return err(res, 400, "unknown action");
  } catch (e) {
    return err(res, 500, "request failed");
  }
};
