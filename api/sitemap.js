/* Vercel serverless function: dynamic XML sitemap.
   GET /sitemap.xml (rewritten to /api/sitemap)
   Lists the home page, the legal pages, and every ACTIVE product's
   canonical share URL (/p/<slug>-<32hex>, the same format the app
   generates when a seller taps Share). Sold/pending listings and all
   private app surfaces are excluded. Cached at the edge for 1 hour. */
var SUPABASE_URL = "https://qxcifjxytdixiolvkmtv.supabase.co";
var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Y2lmanh5dGRpeGlvbHZrbXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjUzMTEsImV4cCI6MjEwNzA0MTMxMX0.yg1VRq-aD7txUAgJnQW1H-5j_CyNjNbnEM7pUaoJVNQ";
var SITE = "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app";

function slug(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "item";
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function urlEntry(loc, lastmod, changefreq, priority) {
  var s = "  <url>\n    <loc>" + esc(loc) + "</loc>\n";
  if (lastmod) { s += "    <lastmod>" + esc(lastmod) + "</lastmod>\n"; }
  s += "    <changefreq>" + changefreq + "</changefreq>\n" +
       "    <priority>" + priority + "</priority>\n  </url>\n";
  return s;
}

module.exports = async function (req, res) {
  var out = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
  out += urlEntry(SITE + "/", null, "hourly", "1.0");
  out += urlEntry(SITE + "/legal/terms.html", null, "monthly", "0.3");
  out += urlEntry(SITE + "/legal/privacy.html", null, "monthly", "0.3");
  try {
    var url = SUPABASE_URL + "/rest/v1/products?select=id,title,created_at" +
      "&status=eq.active&order=created_at.desc&limit=1000";
    var r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }
    });
    var rows = await r.json();
    if (rows && rows.length) {
      rows.forEach(function (p) {
        var loc = SITE + "/p/" + slug(p.title) + "-" + String(p.id).replace(/-/g, "");
        var lastmod = p.created_at ? String(p.created_at).slice(0, 10) : null;
        out += urlEntry(loc, lastmod, "weekly", "0.8");
      });
    }
  } catch (e) { /* sitemap still valid with the static entries */ }
  out += "</urlset>\n";
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.status(200).send(out);
};
