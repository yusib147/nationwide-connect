// Nationwide Media Connect — public live banner ads feed.
// WHY THIS EXISTS: admin_banners has RLS enabled with NO policies
// (service-role only, see admin_tables.sql), so the browser client can
// NEVER read it — premium.js's direct supabase-js query always came back
// empty and approved paid banners never rendered on the home page.
// This endpoint reads with the service role (via _paylib) and returns
// only ads that are active and in date right now. No secrets leak: the
// response contains only what a visitor would see on the home page.
// Each ad is enriched with its advertiser's shop link by joining the
// approved banner_submissions row (matched on artwork URL), because
// admin_banners itself has no user_id column.
var lib = require("./_paylib");

function kindOf(url) {
  var clean = String(url || "").split("?")[0].split("#")[0].toLowerCase();
  return /\.(mp4|webm|mov)$/.test(clean) ? "video" : "image";
}
function escQ(v) { return encodeURIComponent(String(v).replace(/[(),*]/g, "")); }

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60");
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).send(JSON.stringify({ error: "GET only" }));
  }
  if (!lib.hasKeys()) return res.status(200).send(JSON.stringify({ ok: true, ads: [], scenes: [] }));
  try {
    var now = Date.now();
    var rows = await lib.sb("admin_banners?select=id,title,subtitle,image_url,link_url,starts_at,ends_at,is_active,sort_order&order=sort_order.asc&limit=100", {}).catch(function () { return []; });
    var live = (rows || []).filter(function (b) {
      if (!b || !b.is_active) return false;
      if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
      if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
      return true;
    });
    if (!live.length) return res.status(200).send(JSON.stringify({ ok: true, ads: [], scenes: [] }));

    /* Join approved submissions by artwork URL to recover the advertiser. */
    var subs = await lib.sb("banner_submissions?select=user_id,title,subtitle,link_url,media,reviewed_at,live_until&status=eq.approved&order=reviewed_at.desc&limit=100", {}).catch(function () { return []; });
    var byUrl = {};
    (subs || []).forEach(function (s) {
      (s.media || []).forEach(function (m) { if (m && m.url && !byUrl[m.url]) byUrl[m.url] = s; });
    });
    var uids = {};
    live.forEach(function (b) { var s = byUrl[b.image_url]; if (s && s.user_id) uids[s.user_id] = 1; });
    var names = {};
    var uidList = Object.keys(uids);
    if (uidList.length) {
      var profs = await lib.sb("profiles?select=id,display_name&id=in.(" + uidList.map(escQ).join(",") + ")", {}).catch(function () { return []; });
      (profs || []).forEach(function (p) { names[p.id] = p.display_name || ""; });
    }

    var scenes = live.map(function (b) {
      var s = byUrl[b.image_url] || null;
      var uid = s ? s.user_id : null;
      var link = String(b.link_url || (s && s.link_url) || "").trim();
      var shop = uid ? "/?shop=" + uid : "";
      return {
        title: b.title || (s && s.title) || "Sponsored",
        subtitle: b.subtitle || (s && s.subtitle) || "",
        media_url: b.image_url || "",
        media_kind: kindOf(b.image_url),
        link_url: link,
        shop_url: shop,
        user_id: uid,
        business: (uid && names[uid]) || b.title || "Advertiser",
        starts_at: b.starts_at, ends_at: b.ends_at
      };
    });
    /* Group scenes into ads: same advertiser + title + start = one ad. */
    var ads = [], seen = {};
    scenes.forEach(function (sc) {
      var key = (sc.user_id || "") + "|" + sc.title + "|" + (sc.starts_at || "");
      if (!seen[key]) {
        seen[key] = { title: sc.title, subtitle: sc.subtitle, link_url: sc.link_url, shop_url: sc.shop_url, user_id: sc.user_id, business: sc.business, starts_at: sc.starts_at, ends_at: sc.ends_at, media: [] };
        ads.push(seen[key]);
      }
      if (sc.media_url) seen[key].media.push({ url: sc.media_url, kind: sc.media_kind });
    });
    return res.status(200).send(JSON.stringify({ ok: true, ads: ads, scenes: scenes }));
  } catch (e) {
    return res.status(200).send(JSON.stringify({ ok: true, ads: [], scenes: [] }));
  }
};
