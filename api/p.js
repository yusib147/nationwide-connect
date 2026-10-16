/* Vercel serverless function: short, professional share links.
   GET /p/toyota-camry-2015-5b5f4ed9  (rewritten to /api/p?c=...)
   - Trailing 8 hex chars = product UUID prefix -> Supabase lookup.
   - Otherwise uses product data embedded in the URL (seed/demo listings).
   - Crawlers get og:image = product photo, og:title = title + price + seller.
   - Humans are instantly redirected to /?item=PRODUCT_ID. */
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Y2lmanh5dGRpeGlvbHZrbXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjUzMTEsImV4cCI6MjEwNzA0MTMxMX0.yg1VRq-aD7txUAgJnQW1H-5j_CyNjNbnEM7pUaoJVNQ";
var SITE = "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app";
var FALLBACK_IMG = SITE + "/assets/og-cover.jpg";

function okImg(u) {
  try {
    var pu = new URL(String(u));
    return pu.protocol === "https:" && (pu.host === "qxcifjxytdixiolvkmtv.supabase.co" || pu.host === "nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app");
  } catch (e) { return false; }
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function naira(n) {
  n = Number(n) || 0;
  return "\u20A6" + n.toLocaleString("en-NG");
}

module.exports = async function (req, res) {
  var q = req.query || {};
  var code = String(q.c || "").replace(/[^a-zA-Z0-9-]/g, "");
  var title = "Nationwide Media Connect";
  var desc = "Buy and sell anything in Nigeria. Post free ads, chat with sellers, make offers.";
  var img = FALLBACK_IMG;
  var target = SITE + "/";
  var fullId = "";

  /* 1) Embedded product data (seed/demo listings not in the database). */
  var hasEmbedded = !!q.t;
  if (hasEmbedded) {
    var pt = String(q.t).slice(0, 120);
    var pp = q.pr || "";
    var seller = q.s ? String(q.s).slice(0, 60) : "";
    title = pt + (pp ? " - " + naira(pp) : "") + (seller ? " | " + seller : "");
    desc = (q.l ? String(q.l).slice(0, 80) + " | " : "") + "Nationwide Media Connect";
    if (q.img && okImg(q.img)) { img = String(q.img); }
  }

  /* 2) Resolve the trailing 32-hex product id via the database. */
  var m = code.replace(/-/g, "").match(/([0-9a-f]{32})$/i);
  if (m && !hasEmbedded) {
    var hex = m[1].toLowerCase();
    var uuid = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
    try {
      var url = SUPABASE_URL + "/rest/v1/products?select=id,title,description,price,location,image_urls,profiles(display_name)" +
        "&id=eq." + uuid + "&status=in.(active,sold)&limit=1";
      var r = await fetch(url, {
        headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }
      });
      var rows = await r.json();
      if (rows && rows.length) {
        var p = rows[0];
        fullId = p.id;
        var imgs = p.image_urls || [];
        if (imgs.length && imgs[0]) { img = imgs[0]; }
        var sellerName = (p.profiles && p.profiles.display_name) || "";
        title = (p.title || "Item") + " - " + naira(p.price) + (sellerName ? " | " + sellerName : "");
        var d = (p.description || "").replace(/\s+/g, " ").trim().slice(0, 120);
        desc = (d ? d + " " : "") + "| " + (p.location || "Nigeria");
      }
    } catch (e) { /* keep fallback */ }
  }

  /* 3) Seed/demo id carried in the slug (e.g. /p/toyota-camry-s1). */
  if (!fullId && hasEmbedded && q.pid) { fullId = String(q.pid); }

  if (fullId) { target = SITE + "/?item=" + encodeURIComponent(fullId); }
  if (img.charAt(0) === "/") { img = SITE + img; }
  var canonical = SITE + "/p/" + encodeURIComponent(code);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
    "<title>" + esc(title) + "</title>" +
    "<meta name=\"description\" content=\"" + esc(desc) + "\">" +
    "<meta property=\"og:type\" content=\"website\">" +
    "<meta property=\"og:site_name\" content=\"Nationwide Media Connect\">" +
    "<meta property=\"og:title\" content=\"" + esc(title) + "\">" +
    "<meta property=\"og:description\" content=\"" + esc(desc) + "\">" +
    "<meta property=\"og:image\" content=\"" + esc(img) + "\">" +
    "<meta property=\"og:url\" content=\"" + esc(canonical) + "\">" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\">" +
    "<meta name=\"twitter:title\" content=\"" + esc(title) + "\">" +
    "<meta name=\"twitter:description\" content=\"" + esc(desc) + "\">" +
    "<meta name=\"twitter:image\" content=\"" + esc(img) + "\">" +
    "<meta http-equiv=\"refresh\" content=\"0;url=" + esc(target) + "\">" +
    "</head><body>" +
    "<p>Opening <a href=\"" + esc(target) + "\">Nationwide Media Connect</a>\u2026</p>" +
    "<script>window.location.replace(" + JSON.stringify(target) + ");</script>" +
    "</body></html>"
  );
};
