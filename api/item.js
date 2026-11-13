/* Vercel serverless function: dynamic link preview for shared products.
   GET /api/item?id=ID&t=TITLE&pr=PRICE&l=LOCATION&img=IMAGE_URL
   - Product data embedded in the URL is used first (works for seed + demo
     listings that are not in the database).
   - Falls back to a Supabase lookup when the URL has no product data.
   - Crawlers (WhatsApp, Facebook, X) read og:image = the product's main
     photo; Google also gets a canonical URL pointing at the product's
     /p/ page (the sitemap URL) and a Product JSON-LD block when the
     price is verified from the database or the share URL.
   - Humans are instantly redirected to the app at /?item=ID.
   - Unknown/missing product falls back to the site banner.
   - Origin is host-aware: the production .vercel.app host and any
     attached custom domain canonicalise to themselves; preview hosts
     fall back to the production origin. */
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
function reqHost(req) {
  var h = (req && req.headers) || {};
  return String(h["x-forwarded-host"] || h.host || "").split(",")[0].trim();
}
function okImg(u, host) {
  try {
    var pu = new URL(String(u));
    return pu.protocol === "https:" && (pu.host === "qxcifjxytdixiolvkmtv.supabase.co" || pu.host === PROD_HOST || (host && pu.host === host));
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
function slug(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "item";
}

module.exports = async function (req, res) {
  var SITE = originFor(req);
  var FALLBACK_IMG = SITE + "/assets/og-cover.jpg";
  var q = req.query || {};
  var id = q.id || q.item || "";
  var title = "Nationwide Media Connect";
  var desc = "Buy and sell anything in Nigeria. Post free ads and chat with sellers.";
  var img = FALLBACK_IMG;
  var target = SITE + "/";
  var prod = null;  // {name, price, status|null, images[]} for JSON-LD + canonical

  /* 1) Product data embedded in the share URL (seed + demo listings). */
  if (q.t) {
    var pt = String(q.t).slice(0, 120);
    var pp = q.pr || "";
    title = pt + (pp ? " - " + naira(pp) : "") + " | Nationwide Media Connect";
    desc = (q.l ? String(q.l).slice(0, 80) + " | " : "") + "Nationwide Media Connect";
    if (q.img && okImg(q.img, reqHost(req))) { img = String(q.img); }
    if (pp !== "" && isFinite(Number(pp))) {
      prod = { name: pt, price: Number(pp), status: null, images: (q.img && okImg(q.img, reqHost(req))) ? [String(q.img)] : [] };
    }
  }

  if (id) {
    target = SITE + "/?item=" + encodeURIComponent(id);
    /* 2) Database lookup fills in anything the URL did not carry. */
    if (!q.t || !q.img) {
      try {
        var url = SUPABASE_URL + "/rest/v1/products?select=title,description,price,location,status,image_urls" +
          "&id=eq." + encodeURIComponent(id) + "&status=in.(active,sold)&limit=1";
        var r = await fetch(url, {
          headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }
        });
        var rows = await r.json();
        if (rows && rows.length) {
          var p = rows[0];
          var imgs = p.image_urls || [];
          if (!q.img && imgs.length && imgs[0]) { img = imgs[0]; }
          if (!q.t) {
            title = (p.title || "Item") + " - " + naira(p.price) + " | Nationwide Media Connect";
            var d = (p.description || "").replace(/\s+/g, " ").trim().slice(0, 150);
            desc = (d ? d + " " : "") + "| " + (p.location || "Nigeria");
          }
          prod = {
            name: p.title || "Item",
            price: Number(p.price),
            status: p.status || "active",
            images: imgs.filter(Boolean)
          };
        }
      } catch (e) { /* keep what the URL gave us */ }
    }
  }

  if (img.charAt(0) === "/") { img = SITE + img; }

  /* Canonical product URL = the /p/ page the sitemap lists. */
  var canonical = "";
  var idHex = String(id || "").replace(/-/g, "");
  if (prod && /^[0-9a-f]{32}$/i.test(idHex)) {
    canonical = SITE + "/p/" + slug(prod.name) + "-" + idHex.toLowerCase();
  }
  var ldScript = "";
  if (prod && isFinite(prod.price)) {
    var offer = {
      "@type": "Offer",
      "url": canonical || target,
      "priceCurrency": "NGN",
      "price": prod.price
    };
    if (prod.status) {
      offer.availability = prod.status === "sold"
        ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
    }
    var ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": prod.name,
      "description": desc,
      "offers": offer
    };
    if (prod.images.length) { ld.image = prod.images; }
    ldScript = "<script type=\"application/ld+json\">" +
      JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>";
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
    "<title>" + esc(title) + "</title>" +
    "<meta name=\"description\" content=\"" + esc(desc) + "\">" +
    "<meta name=\"robots\" content=\"index, follow\">" +
    "<meta property=\"og:type\" content=\"website\">" +
    "<meta property=\"og:site_name\" content=\"Nationwide Media Connect\">" +
    "<meta property=\"og:title\" content=\"" + esc(title) + "\">" +
    "<meta property=\"og:description\" content=\"" + esc(desc) + "\">" +
    "<meta property=\"og:image\" content=\"" + esc(img) + "\">" +
    "<meta property=\"og:url\" content=\"" + esc(canonical || target) + "\">" +
    (canonical ? "<link rel=\"canonical\" href=\"" + esc(canonical) + "\">" : "") +
    ldScript +
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
