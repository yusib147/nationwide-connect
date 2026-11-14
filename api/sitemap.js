/* Vercel serverless function: dynamic XML sitemap.
   GET /sitemap.xml (rewritten to /api/sitemap)
   Lists the home page and every ACTIVE product's canonical share URL
   (/p/<slug>-<32hex>) with up to 3 product images per listing (image
   sitemap), so Google Images can index the catalogue too. Legal pages
   are app-loaded fragments, not standalone pages, so they are not
   advertised here. Origin is host-aware: the production .vercel.app
   host and any attached custom domain canonicalise to themselves;
   preview hosts fall back to the production origin. That makes the
   permanent domain canonical automatically the day it is attached.
   Cached at the edge for 1 hour. */
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Y2lmanh5dGRpeGlvbHZrbXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjUzMTEsImV4cCI6MjEwNzA0MTMxMX0.yg1VRq-aD7txUAgJnQW1H-5j_CyNjNbnEM7pUaoJVNQ";
var PROD_HOST = "nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app";
var PROD_SITE = "https://" + PROD_HOST;

function originFor(req) {
  var h = (req && req.headers) || {};
  var host = String(h["x-forwarded-host"] || h.host || "").split(",")[0].trim();
  var proto = String(h["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
  if (host === PROD_HOST) { return PROD_SITE; }
  if (host && !/\.vercel\.app$/i.test(host)) { return proto + "://" + host; }
  return PROD_SITE;
}
function slug(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "item";
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function urlEntry(loc, lastmod, changefreq, priority, images, title) {
  var s = "  <url>\n    <loc>" + esc(loc) + "</loc>\n";
  if (lastmod) { s += "    <lastmod>" + esc(lastmod) + "</lastmod>\n"; }
  s += "    <changefreq>" + changefreq + "</changefreq>\n" +
       "    <priority>" + priority + "</priority>\n";
  (images || []).forEach(function (u) {
    if (!u) { return; }
    s += "    <image:image>\n      <image:loc>" + esc(u) + "</image:loc>\n";
    if (title) { s += "      <image:title>" + esc(title) + "</image:title>\n"; }
    s += "    </image:image>\n";
  });
  s += "  </url>\n";
  return s;
}

module.exports = async function (req, res) {
  var SITE = originFor(req);
  var out = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n";
  out += urlEntry(SITE + "/", null, "hourly", "1.0", null, null);
  out += urlEntry(SITE + "/faq.html", null, "monthly", "0.7", null, null);
  try {
    var url = SUPABASE_URL + "/rest/v1/products?select=id,title,created_at,image_urls" +
      "&status=eq.active&order=created_at.desc&limit=1000";
    var r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }
    });
    var rows = await r.json();
    if (rows && rows.length) {
      rows.forEach(function (p) {
        var loc = SITE + "/p/" + slug(p.title) + "-" + String(p.id).replace(/-/g, "");
        var lastmod = p.created_at ? String(p.created_at).slice(0, 10) : null;
        var imgs = (p.image_urls || []).filter(Boolean).slice(0, 3);
        out += urlEntry(loc, lastmod, "weekly", "0.8", imgs, p.title);
      });
    }
  } catch (e) { /* sitemap still valid with the static entries */ }
  out += "</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.status(200).send(out);
};
