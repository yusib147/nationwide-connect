/* Vercel serverless function: short, professional share links.
   GET /p/toyota-camry-2015-5b5f4ed9  (rewritten to /api/p?c=...)
   - Trailing 32 hex chars = product UUID -> Supabase lookup.
   - Otherwise uses product data embedded in the URL (seed/demo listings).
   - Crawlers get og:image = product photo, og:title = title + price +
     seller, a canonical URL, and a Product JSON-LD block (real price,
     NGN, availability) for Google rich results.
   - Humans are instantly redirected to /?item=PRODUCT_ID.
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

module.exports = async function (req, res) {
  var SITE = originFor(req);
  var FALLBACK_IMG = SITE + "/assets/og-cover.jpg";
  var q = req.query || {};
  var code = String(q.c || "").replace(/[^a-zA-Z0-9-]/g, "");
  var title = "Nationwide Media Connect";
  var desc = "Buy and sell anything in Nigeria. Post free ads and chat with sellers.";
  var img = FALLBACK_IMG;
  var target = SITE + "/";
  var fullId = "";
  var found = false;      // positively maps to a real listing (db row or embedded seed)
  var dbChecked = false;  // the db lookup ran to completion (a throw is NOT a miss)
  var prod = null;        // verified db product data for the JSON-LD block

  /* 1) Embedded product data (seed/demo listings not in the database). */
  var hasEmbedded = !!q.t;
  if (hasEmbedded) {
    found = true;
    var pt = String(q.t).slice(0, 120);
    var pp = q.pr || "";
    var seller = q.s ? String(q.s).slice(0, 60) : "";
    title = pt + (pp ? " - " + naira(pp) : "") + (seller ? " | " + seller : "");
    desc = (q.l ? String(q.l).slice(0, 80) + " | " : "") + "Nationwide Media Connect";
    if (q.img && okImg(q.img, reqHost(req))) { img = String(q.img); }
  }

  /* 2) Resolve the trailing 32-hex product id via the database. */
  var m = code.replace(/-/g, "").match(/([0-9a-f]{32})$/i);
  if (m && !hasEmbedded) {
    var hex = m[1].toLowerCase();
    var uuid = hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
    try {
      var url = SUPABASE_URL + "/rest/v1/products?select=id,title,description,price,location,status,condition,image_urls,profiles(display_name)" +
        "&id=eq." + uuid + "&status=in.(active,sold)&limit=1";
      var r = await fetch(url, {
        headers: { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON }
      });
      if (r.ok) { dbChecked = true; }
      var rows = await r.json();
      if (rows && rows.length) {
        found = true;
        var p = rows[0];
        fullId = p.id;
        var imgs = p.image_urls || [];
        if (imgs.length && imgs[0]) { img = imgs[0]; }
        var sellerName = (p.profiles && p.profiles.display_name) || "";
        title = (p.title || "Item") + " - " + naira(p.price) + (sellerName ? " | " + sellerName : "");
        var d = (p.description || "").replace(/\s+/g, " ").trim().slice(0, 120);
        desc = (d ? d + " " : "") + "| " + (p.location || "Nigeria");
        prod = {
          name: p.title || "Item",
          desc: (p.description || "").replace(/\s+/g, " ").trim().slice(0, 300),
          price: Number(p.price),
          status: p.status || "active",
          condition: p.condition || "",
          images: imgs.filter(Boolean),
          seller: sellerName
        };
      }
    } catch (e) { /* keep fallback */ }
  }

  /* 3) Seed/demo id carried in the slug (e.g. /p/toyota-camry-s1). */
  if (!fullId && hasEmbedded && q.pid) { fullId = String(q.pid); }

  if (fullId) { target = SITE + "/?item=" + encodeURIComponent(fullId); }
  if (img.charAt(0) === "/") { img = SITE + img; }
  var canonical = SITE + "/p/" + encodeURIComponent(code);
  var m32 = code.replace(/-/g, "").match(/([0-9a-f]{32})$/i);
  var dead = !found && (dbChecked || !m32);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (dead) {
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.status(404).send(
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
      "<title>Link not found - Nationwide Media Connect</title>" +
      "<meta name=\"robots\" content=\"noindex\">" +
      "<meta property=\"og:title\" content=\"Link not found - Nationwide Media Connect\">" +
      "<meta property=\"og:image\" content=\"" + esc(FALLBACK_IMG) + "\">" +
      "</head><body>" +
      "<p>This listing link is no longer valid. <a href=\"" + esc(SITE + "/") + "\">Browse the marketplace</a>.</p>" +
      "</body></html>"
    );
    return;
  }
  var imgDims = (img === FALLBACK_IMG)
    ? "<meta property=\"og:image:width\" content=\"1000\">" +
      "<meta property=\"og:image:height\" content=\"500\">" : "";
  /* Product structured data, built only from a verified database row. */
  var ldScript = "";
  if (prod && isFinite(prod.price)) {
    var offer = {
      "@type": "Offer",
      "url": canonical,
      "priceCurrency": "NGN",
      "price": prod.price,
      "availability": prod.status === "sold" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
    };
    if (prod.condition) {
      offer.itemCondition = prod.condition === "New"
        ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition";
    }
    var ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": prod.name,
      "description": prod.desc || desc,
      "offers": offer
    };
    if (prod.images.length) { ld.image = prod.images; }
    if (prod.seller) { ld.seller = { "@type": "Person", "name": prod.seller }; }
    ldScript = "<script type=\"application/ld+json\">" +
      JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>";
  }
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
    "<meta property=\"og:url\" content=\"" + esc(canonical) + "\">" +
    "<link rel=\"canonical\" href=\"" + esc(canonical) + "\">" +
    imgDims + ldScript +
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
