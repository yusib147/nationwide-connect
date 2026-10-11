/* Vercel serverless function: dynamic link preview for shared products.
   GET /api/item?id=ID&t=TITLE&pr=PRICE&l=LOCATION&img=IMAGE_URL
   - Product data embedded in the URL is used first (works for seed + demo
     listings that are not in the database).
   - Falls back to a Supabase lookup when the URL has no product data.
   - Crawlers (WhatsApp, Facebook, X) read og:image = the product's main photo.
   - Humans are instantly redirected to the app at /?item=ID.
   - Unknown/missing product falls back to the site banner. */
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Y2lmanh5dGRpeGlvbHZrbXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjUzMTEsImV4cCI6MjEwNzA0MTMxMX0.yg1VRq-aD7txUAgJnQW1H-5j_CyNjNbnEM7pUaoJVNQ";
var SITE = "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app";
var FALLBACK_IMG = SITE + "/assets/og-cover.jpg";

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
  var id = q.id || q.item || "";
  var title = "Nationwide Media Connect";
  var desc = "Buy and sell anything in Nigeria. Post free ads, chat with sellers, make offers.";
  var img = FALLBACK_IMG;
  var target = SITE + "/";

  /* 1) Product data embedded in the share URL (seed + demo listings). */
  if (q.t) {
    var pt = String(q.t).slice(0, 120);
    var pp = q.pr || "";
    title = pt + (pp ? " - " + naira(pp) : "") + " | Nationwide Connect";
    desc = (q.l ? String(q.l).slice(0, 80) + " | " : "") + "Nationwide Media Connect";
    if (q.img) { img = String(q.img); }
  }

  if (id) {
    target = SITE + "/?item=" + encodeURIComponent(id);
    /* 2) Database lookup fills in anything the URL did not carry. */
    if (!q.t || !q.img) {
      try {
        var url = SUPABASE_URL + "/rest/v1/products?select=title,description,price,location,image_urls" +
          "&id=eq." + encodeURIComponent(id) + "&status=eq.active&limit=1";
        var r = await fetch(url, {
          headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }
        });
        var rows = await r.json();
        if (rows && rows.length) {
          var p = rows[0];
          var imgs = p.image_urls || [];
          if (!q.img && imgs.length && imgs[0]) { img = imgs[0]; }
          if (!q.t) {
            title = (p.title || "Item") + " - " + naira(p.price) + " | Nationwide Connect";
            var d = (p.description || "").replace(/\s+/g, " ").trim().slice(0, 150);
            desc = (d ? d + " " : "") + "| " + (p.location || "Nigeria");
          }
        }
      } catch (e) { /* keep what the URL gave us */ }
    }
  }

  if (img.charAt(0) === "/") { img = SITE + img; }

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
    "<meta property=\"og:url\" content=\"" + esc(target) + "\">" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\">" +
    "<meta name=\"twitter:title\" content=\"" + esc(title) + "\">" +
    "<meta name=\"twitter:description\" content=\"" + esc(desc) + "\">" +
    "<meta name=\"twitter:image\" content=\"" + esc(img) + "\">" +
    "<meta http-equiv=\"refresh\" content=\"0;url=" + esc(target) + "\">" +
    "</head><body>" +
    "<p>Opening <a href=\"" + esc(target) + "\">Nationwide Connect</a>\u2026</p>" +
    "<script>window.location.replace(" + JSON.stringify(target) + ");</script>" +
    "</body></html>"
  );
};
