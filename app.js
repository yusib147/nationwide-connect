/* Nationwide Connect app. Phase 2: premium UX, 20 researched ideas. */
(function () {
"use strict";

var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

/* cached signed-in user (set on login/boot, cleared on logout) */
var _cachedUser = null;
function getCachedUser() {
  if (_cachedUser) { return _cachedUser; }
  /* fall back to localStorage so the cache survives reloads */
  try {
    var s = localStorage.getItem("nc2_cached_user");
    if (s) { _cachedUser = JSON.parse(s); return _cachedUser; }
  } catch (e) {}
  return null;
}
function setCachedUser(u) {
  _cachedUser = u || null;
  try {
    if (u) { localStorage.setItem("nc2_cached_user", JSON.stringify(u)); }
    else { localStorage.removeItem("nc2_cached_user"); }
  } catch (e) {}
}

/* ---------- helpers ---------- */
function naira(n) {
  var parts = Math.round(Number(n)).toString().split("");
  var out = "", c = 0;
  for (var i = parts.length - 1; i >= 0; i--) { out = parts[i] + out; c++; if (c % 3 === 0 && i > 0) { out = "," + out; } }
  return "₦" + out;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function timeAgo(ts) {
  var m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) { return "Just now"; }
  if (m < 60) { return m + (m === 1 ? " min ago" : " mins ago"); }
  var h = Math.floor(m / 60);
  if (h < 24) { return h + (h === 1 ? " hour ago" : " hours ago"); }
  var d = Math.floor(h / 24);
  return d + (d === 1 ? " day ago" : " days ago");
}
function toast(msg) {
  var t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(function () { t.hidden = true; }, 2600);
}
function validPhone(p) {
  p = String(p).replace(/[\s-]/g, "");
  return /^(0[789][01]\d{8}|\+234[789][01]\d{8})$/.test(p);
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
}
function getLS(k, fb) {
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; }
}
function setLS(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}
/* light typo tolerant match: normalized includes or subsequence */
function fuzzyMatch(hay, q) {
  hay = String(hay || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
  q = String(q || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!q) { return true; }
  if (hay.indexOf(q) >= 0) { return true; }
  var words = q.split(/\s+/);
  return words.every(function (w) {
    if (!w) { return true; }
    if (hay.indexOf(w) >= 0) { return true; }
    /* subsequence: letters in order */
    var hi = 0;
    for (var i = 0; i < hay.length && hi < w.length; i++) {
      if (hay[i] === w[hi]) { hi++; }
    }
    return hi === w.length;
  });
}
/* strict substring match for the main search filter (less permissive than fuzzyMatch) */
function searchMatch(hay, q) {
  hay = String(hay || "").toLowerCase();
  q = String(q || "").toLowerCase().trim();
  if (!q) { return true; }
  /* every word in the query must appear as a substring */
  var words = q.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    if (words[i] && hay.indexOf(words[i]) < 0) { return false; }
  }
  return true;
}
function haversineKm(a, b) {
  var R = 6371, dLa = (b.la - a.la) * Math.PI / 180, dLo = (b.lo - a.lo) * Math.PI / 180;
  var s = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
    Math.cos(a.la * Math.PI / 180) * Math.cos(b.la * Math.PI / 180) *
    Math.sin(dLo / 2) * Math.sin(dLo / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}
var CITY_COORDS = {
  "Lagos": { la: 6.5244, lo: 3.3792 },
  "Abuja": { la: 9.0579, lo: 7.4951 },
  "Port Harcourt": { la: 4.8156, lo: 7.0498 },
  "Ibadan": { la: 7.3775, lo: 3.9470 },
  "Kano": { la: 12.0022, lo: 8.5919 },
  "Enugu": { la: 6.4527, lo: 7.5106 }
};
function cityOfLocation(loc) {
  loc = String(loc || "");
  var names = Object.keys(CITY_COORDS);
  for (var i = 0; i < names.length; i++) {
    if (loc.indexOf(names[i]) >= 0) { return names[i]; }
  }
  return null;
}

/* ---------- local feature stores ---------- */
var store = {
  get: function (k, fb) { return getLS("nc2_" + k, fb); },
  set: function (k, v) { setLS("nc2_" + k, v); }
};
function pushRecentView(id) {
  var r = store.get("recently_viewed", []);
  r = r.filter(function (x) { return x !== id; });
  r.unshift(id);
  store.set("recently_viewed", r.slice(0, 12));
}
function getFavIds() { return store.get("favs", []); }
function isFav(id) { return getFavIds().indexOf(id) >= 0; }
function hideListing(id) {
  var h = store.get("hidden", []);
  if (h.indexOf(id) < 0) { h.push(id); store.set("hidden", h); }
}
function isHidden(id) { return store.get("hidden", []).indexOf(id) >= 0; }
function markStale(id) {
  var s = store.get("stale", []);
  if (s.indexOf(id) < 0) { s.push(id); store.set("stale", s); }
}
function isStale(id) { return store.get("stale", []).indexOf(id) >= 0; }
/* Verification tiers: DB backed (profiles.verification_tier), localStorage is
   only a cache so badges render instantly while the row loads. */
var _tierCache = {};
function getTier(userId) {
  if (_tierCache[userId]) { return _tierCache[userId]; }
  return (store.get("verify", {})[userId]) || null;
}
function cacheTier(userId, tier) {
  if (!userId || !tier) { return; }
  _tierCache[userId] = tier;
  var v = store.get("verify", {});
  if (v[userId] !== tier) { v[userId] = tier; store.set("verify", v); }
}
function primeTier(userId) {
  if (!userId) { return Promise.resolve(null); }
  if (_tierCache[userId]) { return Promise.resolve(_tierCache[userId]); }
  return window.NM_DB.getTier(userId).then(function (t) {
    if (t) { cacheTier(userId, t); }
    return getTier(userId);
  }).catch(function () { return getTier(userId); });
}
function tierOf(p) { return (p && (p.sellerTier || (p.sellerId ? getTier(p.sellerId) : null))) || null; }
function tierBadge(tier) {
  if (tier === "gold") { return '<span class="vtick gold" title="Gold verified">✓</span>'; }
  if (tier === "silver") { return '<span class="vtick" style="background:linear-gradient(135deg,#cfd6dd,#8fa0ad);color:#233038" title="Silver verified">✓</span>'; }
  if (tier === "bronze") { return '<span class="vtick" title="Verified">✓</span>'; }
  return "";
}
function tierName(tier) {
  if (tier === "gold") { return "Gold"; }
  if (tier === "silver") { return "Silver"; }
  if (tier === "bronze") { return "Bronze"; }
  return "Verified";
}
function waVerifyHTML(u, tier) {
  if (!u || !u.id || tier === "gold" || !u.phone) { return ""; }
  var pending = store.get("wa_verify", {})[u.id];
  if (pending) {
    return '<div class="wa-verify"><div class="vname">Verification pending</div>' +
      '<div class="vsub">We are checking your WhatsApp message. Your badge upgrades to gold once the chat is confirmed.</div>' +
      '<button class="mini-btn" id="wa-verify-btn">Resend code</button></div>';
  }
  return '<div class="wa-verify"><div class="vname">Prove this number is yours</div>' +
    '<div class="vsub">Send the message from the number you signed up with. Once the chat is confirmed, your badge upgrades to gold.</div>' +
    '<button class="mini-btn" id="wa-verify-btn">Verify my number</button></div>';
}

/* WhatsApp number ownership verification.
   Tiers: bronze = email signup, silver = valid phone on profile,
   gold = phone ownership proven over WhatsApp (set by Ibrahim in the dashboard). */
var WA_VERIFY_NUMBER = "2349150951870";
function buildWaVerifyLink(code, phone) {
  var text = "Nationwide Connect number verification. Code: " + code + ". My number: " + phone;
  return "https://wa.me/" + WA_VERIFY_NUMBER + "?text=" + encodeURIComponent(text);
}
function startWhatsAppVerify(u) {
  if (!window.NM_DB.phoneValid(u.phone || "")) { toast("Add a valid phone number to your profile first."); return; }
  var phone = window.NM_DB.normalizePhone(u.phone);
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var all = store.get("wa_verify", {});
  all[u.id] = { code: code, phone: phone, at: Date.now() };
  store.set("wa_verify", all);
  window.open(buildWaVerifyLink(code, phone), "_blank");
  renderMe();
}
function getRating(sellerId) {
  var r = store.get("ratings", {})[sellerId];
  if (!r || !r.count) { return null; }
  return { avg: r.total / r.count, count: r.count };
}
function starsHTML(avg) {
  var full = Math.round(avg), s = "";
  for (var i = 1; i <= 5; i++) { s += i <= full ? "★" : "☆"; }
  return '<span class="stars">' + s + "</span>";
}
function recordReplyTime(sellerId, ms) {
  if (!sellerId || !(ms > 0) || ms > 48 * 3600000) { return; }
  var all = store.get("resp", {});
  var r = all[sellerId] || { total: 0, count: 0 };
  r.total += ms; r.count++;
  all[sellerId] = r;
  store.set("resp", all);
}
function respLabel(sellerId) {
  var r = store.get("resp", {})[sellerId];
  if (!r || !r.count) { return null; }
  var avgH = (r.total / r.count) / 3600000;
  if (avgH <= 1) { return "Replies fast"; }
  if (avgH <= 6) { return "Replies within hours"; }
  return "Replies slowly";
}
function pushRecentSearch(q) {
  q = String(q || "").trim();
  if (q.length < 2) { return; }
  var r = store.get("recent_searches", []).filter(function (x) { return x !== q; });
  r.unshift(q);
  store.set("recent_searches", r.slice(0, 8));
  var t = store.get("trending", {});
  t[q] = (t[q] || 0) + 1;
  store.set("trending", t);
}
function bumpProduct(id) {
  var b = store.get("bumps", {});
  b[id] = Date.now();
  store.set("bumps", b);
}
function bumpAt(id) { return store.get("bumps", {})[id] || 0; }

/* ---------- categories ---------- */
var CATS = [
  { id: "vehicles", name: "Vehicles", icon: "🚗", iconSvg: "assets/icons/vehicles.svg", bg: "#1f6feb" },
  { id: "phones", name: "Phones and Tablets", icon: "📱", iconSvg: "assets/icons/phones.svg", bg: "#7c3aed" },
  { id: "electronics", name: "Electronics", icon: "📺", iconSvg: "assets/icons/electronics.svg", bg: "#0891b2" },
  { id: "furniture", name: "Furniture", icon: "🛋️", iconSvg: "assets/icons/furniture.svg", bg: "#b45309" },
  { id: "fashion", name: "Fashion", icon: "👗", iconSvg: "assets/icons/fashion.svg", bg: "#db2777" },
  { id: "property", name: "Property", icon: "🏠", iconSvg: "assets/icons/property.svg", bg: "#0d9488" },
  { id: "services", name: "Services", icon: "🔧", iconSvg: "assets/icons/services.svg", bg: "#4d7c0f" }
];
function catOf(id) {
  for (var i = 0; i < CATS.length; i++) { if (CATS[i].id === id) { return CATS[i]; } }
  return CATS[0];
}

/* ---------- seed listings (24) ---------- */
var H = 3600000, M = 60000, D = 24 * H;
var SEEDS = [
  { id: "s1", title: "Toyota Camry 2015, Very Clean, First Body", price: 8500000, category: "vehicles", description: "Well kept Camry. Engine and gear in perfect shape. Buy and drive, nothing to fix.", location: "Lekki, Lagos", condition: "Used", sellerName: "Chidi O.", sellerPhone: "08031234567", at: Date.now() - 2 * H },
  { id: "s2", title: "Honda Accord 2018, Leather Interior", price: 12750000, category: "vehicles", description: "Accident free Accord with leather seats and reverse camera. All papers complete.", location: "Wuse, Abuja", condition: "Used", sellerName: "Amina B.", sellerPhone: "08059876543", at: Date.now() - 5 * H },
  { id: "s3", title: "Keke Napep Tricycle, Brand New Engine", price: 1450000, category: "vehicles", description: "Strong keke with new engine. Perfect for transport business, ready for road.", location: "Port Harcourt", condition: "New", sellerName: "Emeka K.", sellerPhone: "08098765432", at: Date.now() - 1 * D },
  { id: "s4", title: "iPhone 13 Pro Max 256GB, Factory Unlocked", price: 845000, category: "phones", description: "Neatly used iPhone 13 Pro Max. Battery health 89 percent. Screen flawless.", location: "Ikeja, Lagos", condition: "Used", sellerName: "Tunde A.", sellerPhone: "08034567890", at: Date.now() - 30 * M },
  { id: "s5", title: "Samsung Galaxy S23 Ultra 512GB", price: 960000, category: "phones", description: "Brand new sealed S23 Ultra with S Pen. Full box and warranty.", location: "Lekki, Lagos", condition: "New", sellerName: "Ngozi E.", sellerPhone: "08045678901", at: Date.now() - 1 * H },
  { id: "s6", title: "iPhone 12 128GB, Battery Health 91 Percent", price: 445000, category: "phones", description: "Clean iPhone 12, never opened. Face ID and true tone working perfectly.", location: "Surulere, Lagos", condition: "Used", sellerName: "Ibrahim D.", sellerPhone: "08056789012", at: Date.now() - 3 * H },
  { id: "s7", title: "iPad Air 5th Gen 64GB WiFi", price: 385000, category: "phones", description: "Barely used iPad Air with M1 chip. Great for school and design work.", location: "Maitama, Abuja", condition: "Used", sellerName: "Fatima S.", sellerPhone: "08067890123", at: Date.now() - 6 * H },
  { id: "s8", title: "Samsung 65 Inch Crystal 4K Smart TV", price: 465000, category: "electronics", description: "Brand new 65 inch smart TV with 2 year warranty. Free wall bracket.", location: "Ikeja, Lagos", condition: "New", sellerName: "Kunle J.", sellerPhone: "08078901234", at: Date.now() - 2 * H },
  { id: "s9", title: "PlayStation 5 Disc Edition with 2 Pads", price: 655000, category: "electronics", description: "PS5 with 2 controllers and 3 games. Barely played, selling to upgrade.", location: "Lekki, Lagos", condition: "Used", sellerName: "Segun P.", sellerPhone: "08089012345", at: Date.now() - 4 * H },
  { id: "s10", title: "MacBook Pro 14 M2 Pro 512GB", price: 1450000, category: "electronics", description: "MacBook Pro with M2 Pro chip. Cycle count under 100. Box and charger intact.", location: "Victoria Island, Lagos", condition: "Used", sellerName: "Adaeze N.", sellerPhone: "08090123456", at: Date.now() - 1 * D },
  { id: "s11", title: "L Shaped Sofa, Premium Fabric", price: 350000, category: "furniture", description: "Comfortable L shaped sofa in grey fabric. Solid frame, very durable.", location: "Lekki, Lagos", condition: "New", sellerName: "Blessing T.", sellerPhone: "08101234567", at: Date.now() - 1 * H },
  { id: "s12", title: "6 Seater Marble Dining Set", price: 285000, category: "furniture", description: "Elegant marble top dining table with 6 padded chairs. Home used, neat.", location: "Ikeja, Lagos", condition: "Used", sellerName: "Yusuf M.", sellerPhone: "08112345678", at: Date.now() - 5 * H },
  { id: "s13", title: "King Size Bed Frame with Storage", price: 225000, category: "furniture", description: "Strong hardwood king size frame with drawers under. No squeak.", location: "GRA, Port Harcourt", condition: "New", sellerName: "Gift W.", sellerPhone: "08123456789", at: Date.now() - 2 * D },
  { id: "s14", title: "Nike Air Force 1 White, Original", price: 68000, category: "fashion", description: "Original Air Force 1, size 43. Worn twice, box available.", location: "Lagos Island", condition: "Used", sellerName: "David O.", sellerPhone: "08134567890", at: Date.now() - 45 * M },
  { id: "s15", title: "Luxury Agbada, Hand Embroidered", price: 48000, category: "fashion", description: "Premium agbada with fine embroidery. Perfect for owambe and events.", location: "Surulere, Lagos", condition: "New", sellerName: "Adeola F.", sellerPhone: "08145678901", at: Date.now() - 3 * H },
  { id: "s16", title: "24 Inch Human Hair Wig, Bone Straight", price: 185000, category: "fashion", description: "Full 24 inch bone straight wig, 300g density. Soft and full.", location: "Garki, Abuja", condition: "New", sellerName: "Chioma V.", sellerPhone: "08156789012", at: Date.now() - 1 * D },
  { id: "s17", title: "3 Bedroom Flat in Serviced Estate", price: 3500000, priceSuffix: "per year", category: "property", description: "Spacious 3 bedroom flat with all rooms en suite. Estate has 24 hour power and security.", location: "Lekki, Lagos", condition: "New", sellerName: "Estate Homes", sellerPhone: "08167890123", at: Date.now() - 7 * H },
  { id: "s18", title: "Mini Flat, Tiled All Through", price: 1250000, priceSuffix: "per year", category: "property", description: "Clean mini flat with kitchen cabinets and water heater. Serene area.", location: "Yaba, Lagos", condition: "New", sellerName: "Lagos Lets", sellerPhone: "08178901234", at: Date.now() - 7 * H },
  { id: "s19", title: "Full Plot of Land, Dry Table", price: 25000000, category: "property", description: "Dry full plot with good title. Fenced and gated area, fast developing.", location: "Ibeju Lekki", condition: "New", sellerName: "Land Prime", sellerPhone: "08189012345", at: Date.now() - 2 * D },
  { id: "s20", title: "4 Bedroom Duplex with BQ", price: 120000000, category: "property", description: "Luxury 4 bedroom duplex with boys quarter. Fitted kitchen, CCTV, ample parking.", location: "Ajah, Lagos", condition: "New", sellerName: "Prime Estates", sellerPhone: "08190123456", at: Date.now() - 2 * D },
  { id: "s21", title: "Single Room Self Contain", price: 450000, priceSuffix: "per year", category: "property", description: "Neat self contain with own kitchen and toilet. Good for a single person.", location: "Diobu, Port Harcourt", condition: "New", sellerName: "PH Lets", sellerPhone: "08201234567", at: Date.now() - 3 * D },
  { id: "s22", title: "Deep Home Cleaning, 3 Bedrooms", price: 25000, category: "services", description: "Professional deep cleaning for 3 bedroom homes. We bring our own tools.", location: "Lagos", condition: "New", sellerName: "Sparkle Team", sellerPhone: "08212345678", at: Date.now() - 2 * H },
  { id: "s23", title: "Event Decoration, Full Hall Setup", price: 150000, category: "services", description: "Complete hall decoration for weddings and parties. Stage, lights and drapes.", location: "Ikeja, Lagos", condition: "New", sellerName: "Glam Events", sellerPhone: "08223456789", at: Date.now() - 1 * D },
  { id: "s24", title: "Master Plumber, No Story", price: 15000, category: "services", description: "Fast and neat plumbing repairs. Pipes, tanks, heaters and leaks.", location: "Surulere, Lagos", condition: "New", sellerName: "Baba Pipe", sellerPhone: "08234567890", at: Date.now() - 4 * H }
];
window.NM_SEEDS = SEEDS;

/* ---------- router ---------- */
var NAV_SCREENS = ["home", "category", "inbox", "me"];
var current = "auth";
function show(name) {
  current = name;
  $$(".screen").forEach(function (el) { el.classList.remove("active"); });
  var sc = $("#screen-" + name);
  if (sc) { sc.classList.add("active"); }
  var nav = $("#bottomnav");
  nav.style.display = NAV_SCREENS.indexOf(name) >= 0 ? "flex" : "none";
  $$(".nav-btn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-go") === name);
  });
  window.scrollTo(0, 0);
  if (name === "inbox") { startInboxPoll(); } else { stopInboxPoll(); }
}

/* ---------- cards ---------- */
function cardPhotoHTML(p) {
  var c = catOf(p.category);
  if (p.images && p.images.length) {
    return '<div class="card-photo"><img src="' + esc(p.images[0]) + '" alt="" loading="lazy"></div>';
  }
  var initial = esc(p.title.trim().charAt(0).toUpperCase());
  return '<div class="card-photo" style="background:' + c.bg + '"><span>' + c.icon + '</span><span class="card-init">' + initial + '</span></div>';
}
function cardHTML(p, opts, idx) {
  opts = opts || {};
  idx = idx || 0;
  var price = naira(p.price) + (p.priceSuffix ? " " + esc(p.priceSuffix) : "");
  var badges = "";
  if (p.bumpAt || bumpAt(p.id)) { badges += '<span class="badge promoted">Promoted</span>'; }
  if (opts.priceDrop) { badges += '<span class="badge drop">Price drop</span>'; }
  var tier = tierOf(p);
  if (tier) { badges += '<span class="badge verified">' + tierName(tier) + ' verified</span>'; }
  var rating = p.sellerId ? getRating(p.sellerId) : null;
  var trust = "";
  if (rating) {
    trust = '<div class="card-trust">' + starsHTML(rating.avg) + '<span>' + rating.avg.toFixed(1) + '</span>' + tierBadge(tier) + '</div>';
  } else if (tier) {
    trust = '<div class="card-trust">' + tierBadge(tier) + '<span>' + tierName(tier) + ' seller</span></div>';
  }
  var was = opts.wasPrice ? '<span class="was">' + naira(opts.wasPrice) + '</span>' : '';
  var favBtn = '<button class="card-fav' + (isFav(p.id) ? " on" : "") + '" data-fav="' + esc(p.id) + '" aria-label="Save">' + (isFav(p.id) ? "♥" : "♡") + '</button>';
  return '<div class="card rise" data-id="' + esc(p.id) + '" style="--i:' + idx + '">' +
    (badges ? '<div class="card-badges">' + badges + '</div>' : '') + favBtn +
    cardPhotoHTML(p) +
    '<div class="card-body"><div class="card-price">' + price + was + '</div>' +
    '<div class="card-title">' + esc(p.title) + '</div>' + trust +
    '<div class="card-meta">' + esc(p.location) + ' · ' + timeAgo(p.at) + '</div></div></div>';
}
function galleryHTML(p) {
  var c = catOf(p.category);
  var imgs = p.images || [];
  if (!imgs.length) {
    return '<div class="detail-photo" style="background:' + c.bg + '">' + c.icon + '</div>';
  }
  var slides = imgs.map(function (src, i) {
    return '<div class="gal-slide" data-i="' + i + '"><img src="' + esc(src) + '" alt="Item photo">' +
      '<span class="gal-count">' + (i + 1) + ' of ' + imgs.length + '</span></div>';
  }).join("");
  var dots = imgs.map(function (_, i) {
    return '<span class="' + (i === 0 ? "on" : "") + '"></span>';
  }).join("");
  return '<div class="gal" id="detail-gal">' + slides + '</div>' +
    '<div class="gal-dots" id="gal-dots">' + dots + '</div>' +
    (imgs.length > 1 ? '<p class="gal-zoom-hint">Swipe to see more. Tap a photo to zoom.</p>' : '<p class="gal-zoom-hint">Tap the photo to zoom.</p>');
}
function bindGallery(p) {
  var gal = $("#detail-gal"), dots = $("#gal-dots");
  if (!gal) { return; }
  if (dots) {
    var spans = dots.querySelectorAll("span");
    gal.addEventListener("scroll", function () {
      var i = Math.round(gal.scrollLeft / gal.clientWidth);
      spans.forEach(function (sp, j) { sp.classList.toggle("on", j === i); });
    });
  }
  var imgs = (p.images || []);
  gal.querySelectorAll(".gal-slide").forEach(function (sl) {
    sl.addEventListener("click", function () {
      openFullscreen(imgs, Number(sl.getAttribute("data-i")) || 0);
    });
  });
}
function openFullscreen(imgs, startIdx) {
  if (!imgs.length) { return; }
  var idx = startIdx, scale = 1;
  var root = $("#fs-root");
  function render() {
    root.innerHTML = '<div class="fs-viewer" id="fs-viewer">' +
      '<button class="fs-close" id="fs-close" aria-label="Close">×</button>' +
      (imgs.length > 1 ? '<button class="fs-nav fs-prev" id="fs-prev">‹</button><button class="fs-nav fs-next" id="fs-next">›</button>' : '') +
      '<img id="fs-img" src="' + esc(imgs[idx]) + '" alt="Item photo">' +
      '</div>';
    var img = $("#fs-img");
    img.style.transform = "scale(1)";
    scale = 1;
    img.addEventListener("dblclick", function () {
      scale = scale === 1 ? 2.2 : 1;
      img.style.transform = "scale(" + scale + ")";
    });
    var lastT = 0;
    img.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastT) { scale = Math.min(3, Math.max(1, scale * (d / lastT))); img.style.transform = "scale(" + scale + ")"; }
        lastT = d;
      }
    }, { passive: false });
    img.addEventListener("touchend", function () { lastT = 0; });
    $("#fs-close").addEventListener("click", closeFullscreen);
    $("#fs-viewer").addEventListener("click", function (e) { if (e.target.id === "fs-viewer") { closeFullscreen(); } });
    var prev = $("#fs-prev"), next = $("#fs-next");
    if (prev) { prev.addEventListener("click", function (e) { e.stopPropagation(); idx = (idx - 1 + imgs.length) % imgs.length; render(); }); }
    if (next) { next.addEventListener("click", function (e) { e.stopPropagation(); idx = (idx + 1) % imgs.length; render(); }); }
  }
  render();
}
function closeFullscreen() { $("#fs-root").innerHTML = ""; }
function bindCards(root) {
  root.querySelectorAll(".card").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-fav]")) { return; }
      openDetail(el.getAttribute("data-id"));
    });
  });
  root.querySelectorAll("[data-fav]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleFav(b.getAttribute("data-fav"));
    });
  });
}
function toggleFav(id) {
  var favs = getFavIds();
  var i = favs.indexOf(id);
  var on = i < 0;
  if (on) { favs.push(id); } else { favs.splice(i, 1); }
  store.set("favs", favs);
  window.NM_DB.currentUser().then(function (u) {
    if (u && u.id) {
      if (on) { window.NM_DB.toggleFavorite(id).catch(function () {}); }
      else { window.NM_DB.toggleFavorite(id).catch(function () {}); }
    }
  });
  toast(on ? "Saved to favorites." : "Removed from favorites.");
  renderHome(); renderMeFavs();
}

/* ---------- home ---------- */
var homeCat = "";
var verifiedOnly = false;
var nearMe = null; /* null = off, {la,lo} = on */
function skeletonHTML() {
  var s = "";
  for (var i = 0; i < 6; i++) {
    s += '<div class="skel-card"><div class="skel-photo shimmer"></div><div class="skel-line shimmer"></div><div class="skel-line short shimmer"></div></div>';
  }
  return '<div class="skel-grid">' + s + '</div>';
}
function renderChips() {
  var html = '<button class="chip' + (homeCat === "" ? " active" : "") + '" data-cat="">All</button>';
  CATS.forEach(function (c) {
    html += '<button class="chip' + (homeCat === c.id ? " active" : "") + '" data-cat="' + c.id + '"><img class="chip-ico" src="' + c.iconSvg + '" alt="">' + esc(c.name) + "</button>";
  });
  var box = $("#home-chips");
  box.innerHTML = html;
  box.querySelectorAll(".chip").forEach(function (b) {
    b.addEventListener("click", function () { homeCat = b.getAttribute("data-cat"); renderChips(); renderHome(); });
  });
}
function applyClientFilters(list, q) {
  var out = [];
  var snaps = store.get("price_snap", {});
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (isHidden(p.id) || isStale(p.id)) { continue; }
    if (verifiedOnly) {
      var t = tierOf(p);
      if (!t) { continue; }
    }
    if (q && !searchMatch(p.title + " " + p.description + " " + p.location, q)) { continue; }
    out.push(p);
  }
  /* price drop detection + snapshots */
  var newSnaps = {};
  out.forEach(function (p) {
    newSnaps[p.id] = p.price;
    if (snaps[p.id] && snaps[p.id] > p.price && isFav(p.id)) {
      p._priceDrop = snaps[p.id];
    }
  });
  store.set("price_snap", newSnaps);
  /* bumped first, then newest */
  out.sort(function (a, b) {
    var ba = a.bumpAt || bumpAt(a.id), bb = b.bumpAt || bumpAt(b.id);
    if ((ba > 0) !== (bb > 0)) { return bb - ba; }
    if (ba && bb) { return bb - ba; }
    return b.at - a.at;
  });
  /* near me: sort by distance, keep within 60km */
  if (nearMe) {
    out = out.filter(function (p) {
      var city = cityOfLocation(p.location);
      if (!city) { return false; }
      p._dist = haversineKm(nearMe, CITY_COORDS[city]);
      return p._dist <= 60;
    }).sort(function (a, b) { return a._dist - b._dist; });
  }
  return out;
}
var homeLoading = false;
function renderHome() {
  var q = $("#home-search").value.trim();
  var g = $("#home-grid");
  if (!homeLoading) {
    homeLoading = true;
    g.innerHTML = skeletonHTML();
    $("#home-empty").hidden = true;
  }
  window.NM_DB.listProducts({ category: homeCat, query: "" }).then(function (list) {
    homeLoading = false;
    var filtered = applyClientFilters(list, q);
    g.innerHTML = filtered.map(function (p, i) {
      return cardHTML(p, { priceDrop: !!p._priceDrop, wasPrice: p._priceDrop || null }, i);
    }).join("");
    bindCards(g);
    $("#home-empty").hidden = filtered.length > 0;
    var hc = $("#home-count");
    if (hc) { hc.textContent = filtered.length ? filtered.length + " items" : ""; }
    renderRecentlyViewed(list);
    updateBadge();
  }).catch(function () {
    /* never leave the skeleton up forever */
    homeLoading = false;
    g.innerHTML = "";
    $("#home-empty").hidden = false;
  });
}
function renderRecentlyViewed(all) {
  var ids = store.get("recently_viewed", []);
  var wrap = $("#rv-wrap"), strip = $("#rv-strip");
  if (!ids.length) { wrap.hidden = true; return; }
  var items = [];
  ids.forEach(function (id) {
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id && !isHidden(id)) { items.push(all[i]); break; }
    }
  });
  if (!items.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  strip.innerHTML = items.map(function (p) {
    var c = catOf(p.category);
    var photo = (p.images && p.images.length)
      ? '<div class="rv-photo"><img src="' + esc(p.images[0]) + '" alt="" loading="lazy"></div>'
      : '<div class="rv-photo" style="background:' + c.bg + '">' + c.icon + '</div>';
    return '<div class="rv-item" data-id="' + esc(p.id) + '">' + photo +
      '<div class="rv-price">' + naira(p.price) + '</div></div>';
  }).join("");
  strip.querySelectorAll(".rv-item").forEach(function (el) {
    el.addEventListener("click", function () { openDetail(el.getAttribute("data-id")); });
  });
}
function renderTrends() {
  var wrap = $("#trend-wrap"), box = $("#trend-chips"), title = $("#trend-title");
  var recent = store.get("recent_searches", []);
  var trending = store.get("trending", {});
  var tlist = Object.keys(trending).sort(function (a, b) { return trending[b] - trending[a]; }).slice(0, 6);
  if (!recent.length && !tlist.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  var chips = recent.slice(0, 4).map(function (q) {
    return '<button class="trend-chip" data-q="' + esc(q) + '">↻ ' + esc(q) + '</button>';
  }).join("");
  if (tlist.length) {
    title.textContent = recent.length ? "Recent and trending" : "Trending now";
    chips += tlist.filter(function (q) { return recent.indexOf(q) < 0; }).slice(0, 4).map(function (q) {
      return '<button class="trend-chip" data-q="' + esc(q) + '">▲ ' + esc(q) + '</button>';
    }).join("");
  } else {
    title.textContent = "Your recent searches";
  }
  box.innerHTML = chips;
  box.querySelectorAll(".trend-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      $("#home-search").value = b.getAttribute("data-q");
      renderHome();
    });
  });
}

/* ---------- category screen ---------- */
var catSel = "";
function renderCatList() {
  window.NM_DB.listProducts({}).then(function (all) {
    var counts = {};
    all.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var box = $("#cat-list");
    box.innerHTML = CATS.map(function (c, i) {
      return '<button class="cat-row rise" style="--i:' + i + '" data-cat="' + c.id + '"><span class="cat-ico" style="background:' + c.bg + '"><img src="' + c.iconSvg + '" alt=""></span>' +
        '<span class="cat-name">' + esc(c.name) + '</span>' +
        '<span class="cat-count">' + (counts[c.id] || 0) + ' items</span></button>';
    }).join("");
    box.querySelectorAll(".cat-row").forEach(function (b) {
      b.addEventListener("click", function () { catSel = b.getAttribute("data-cat"); renderCatResults(); });
    });
  });
}
function renderCatResults() {
  var c = catOf(catSel);
  $("#cat-list").innerHTML = "";
  $("#cat-results-head").hidden = false;
  $("#cat-results-title").textContent = c.icon + " " + c.name;
  window.NM_DB.listProducts({ category: catSel }).then(function (list) {
    var filtered = applyClientFilters(list, "");
    var g = $("#cat-grid");
    g.innerHTML = filtered.length ? filtered.map(function (p, i) { return cardHTML(p, null, i); }).join("") : '<div class="empty" style="grid-column:1/-1"><img class="empty-illus" src="assets/empty-search.svg" alt=""><h3>No items here yet</h3><p>Be the first to post one in this category.</p></div>';
    bindCards(g);
  }).catch(function () {
    $("#cat-grid").innerHTML = '<div class="empty">Could not load items. Pull down to try again.</div>';
  });
}
function resetCatScreen() {
  catSel = "";
  $("#cat-results-head").hidden = true;
  $("#cat-grid").innerHTML = "";
  renderCatList();
}

/* ---------- modals ---------- */
function openModal(html) {
  var root = $("#modal-root");
  root.innerHTML = '<div class="modal-back" id="modal-back"><div class="modal" id="modal-box">' + html + '</div></div>';
  $("#modal-back").addEventListener("click", function (e) {
    if (e.target.id === "modal-back") { closeModal(); }
  });
}
function closeModal() { $("#modal-root").innerHTML = ""; }

/* ---------- detail ---------- */
var detailId = null;
var detailProduct = null;
function shareWhatsApp(p) {
  var url = "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app/";
  var text = "Check this on Nationwide Connect: " + p.title + " for " + naira(p.price) + " in " + p.location + " " + url;
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
}
function openDetail(id) {
  detailId = id;
  window.NM_DB.listProducts({}).then(function (all) {
    var p = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { p = all[i]; } }
    if (!p || isHidden(id)) { toast("Item not found."); return; }
    detailProduct = p;
    pushRecentView(id);
    var price = naira(p.price) + (p.priceSuffix ? " " + esc(p.priceSuffix) : "");
    var initial = esc(p.sellerName.trim().charAt(0).toUpperCase());
    var tier = tierOf(p);
    var rating = p.sellerId ? getRating(p.sellerId) : null;
    var resp = p.sellerId ? respLabel(p.sellerId) : null;
    var sellerAva = p.sellerAvatar
      ? '<div class="seller-ava"><img class="avatar-img" src="' + esc(p.sellerAvatar) + '" alt=""></div>'
      : '<div class="seller-ava">' + initial + '</div>';
    var trustBits = "";
    if (rating) { trustBits += '<span>' + starsHTML(rating.avg) + ' ' + rating.avg.toFixed(1) + ' (' + rating.count + ')</span>'; }
    if (tier) { trustBits += '<span>' + tierBadge(tier) + ' ' + tierName(tier) + ' verified</span>'; }
    if (resp) { trustBits += '<span class="resp-badge">⚡ ' + esc(resp) + '</span>'; }
    var sellerCardInner =
      '<div class="seller-card' + (p.sellerId ? "" : " no-seller") + '" id="detail-seller"' + (p.sellerId ? ' role="button" tabindex="0"' : "") + '>' + sellerAva +
      '<div class="seller-main"><div class="seller-name">' + esc(p.sellerName) + ' ' + tierBadge(tier) + '</div>' +
      '<div class="seller-sub">Member of Nationwide Connect' + (p.sellerId ? ' · tap to see shop' : '') + '</div>' +
      (trustBits ? '<div class="seller-stats">' + trustBits + '</div>' : '') +
      '</div>' + (p.sellerId ? '<span style="color:var(--faint);font-size:20px">›</span>' : '') + '</div>';
    $("#detail-body").innerHTML =
      galleryHTML(p) +
      '<div class="detail-body">' +
      (p.bumpAt || bumpAt(p.id) ? '<div style="margin-bottom:8px"><span class="badge promoted">Promoted</span></div>' : '') +
      '<div class="detail-price-row"><div class="detail-price">' + price + '</div></div>' +
      '<div class="detail-title">' + esc(p.title) + '</div>' +
      '<div class="detail-meta">' + esc(p.location) + ' · ' + esc(p.condition) + ' · ' + timeAgo(p.at) + '</div>' +
      '<div class="action-row">' +
        '<button class="action-btn wa" id="d-share">✈ Share</button>' +
        '<button class="action-btn" id="d-ping">✓ Available?</button>' +
      '</div>' +
      sellerCardInner +
      '<div class="detail-desc">' + esc(p.description) + '</div>' +
      '<div class="safety"><h4>🛡 Stay safe on Nationwide Connect</h4><ul>' +
      '<li>Meet the seller in a public place.</li>' +
      '<li>Check the item well before you pay.</li>' +
      '<li>Never pay in advance for an item you have not seen.</li>' +
      '<li>Keep your chat inside the app so we can help if anything goes wrong.</li>' +
      '</ul></div>' +
      '<button class="report-link" id="d-report">Report this listing</button>' +
      '</div>' +
      '<div class="chat-cta"><button id="detail-chat" class="btn-primary">Chat seller</button>' +
      '<button id="detail-offer" class="btn-secondary offer-btn">Make offer</button></div>';
    bindGallery(p);
    $("#d-share").addEventListener("click", function () { shareWhatsApp(p); });
    $("#d-report").addEventListener("click", function () { openReportModal(p); });
    $("#d-ping").addEventListener("click", function () { sendAvailabilityPing(p); });
    $("#detail-offer").addEventListener("click", function () { openOfferModal(p); });
    var sc = $("#detail-seller");
    if (p.sellerId) {
      sc.addEventListener("click", function () { openSeller(p.sellerId, p.sellerName); });
    }
    $("#detail-chat").addEventListener("click", function () {
      /* Fast path: use cached user; fall back to a direct session check. */
      var cu = getCachedUser();
      if (cu && cu.id) {
        window.NM_DB.openConversation(detailProduct.id).then(function (cid) {
          openThread(cid);
        }).catch(function (e) { toast(e.message); });
        return;
      }
      /* No cache: ask Supabase directly, with a timeout so we never hang. */
      var done = false;
      var to = setTimeout(function () {
        if (!done) { done = true; show("auth"); toast("Log in to chat with sellers."); }
      }, 8000);
      window.NM_DB.currentUser().then(function (u) {
        if (done) { return; }
        done = true; clearTimeout(to);
        if (!u) { show("auth"); toast("Log in to chat with sellers."); return; }
        setCachedUser(u);
        window.NM_DB.openConversation(detailProduct.id).then(function (cid) {
          openThread(cid);
        }).catch(function (e) { toast(e.message); });
      }).catch(function () {
        if (!done) { done = true; clearTimeout(to); show("auth"); toast("Log in to chat with sellers."); }
      });
    });
    show("detail");
  });
}
function openReportModal(p) {
  var reasons = ["Looks like a scam", "Fake or stolen photos", "Already sold", "Wrong category", "Something else"];
  var sel = -1;
  openModal('<h3>Report this listing</h3><p class="m-sub">Tell us what is wrong. Reports from the community keep the marketplace safe.</p>' +
    '<div class="reason-list">' + reasons.map(function (r, i) {
      return '<button class="reason-btn" data-i="' + i + '">' + esc(r) + '</button>';
    }).join("") + '</div>' +
    '<div class="modal-actions"><button class="modal-cancel" id="m-cancel">Cancel</button>' +
    '<button class="btn-primary" id="m-report">Send report</button></div>');
  $("#modal-box").querySelectorAll(".reason-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      sel = Number(b.getAttribute("data-i"));
      $("#modal-box").querySelectorAll(".reason-btn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
    });
  });
  $("#m-cancel").addEventListener("click", closeModal);
  $("#m-report").addEventListener("click", function () {
    if (sel < 0) { toast("Pick a reason first."); return; }
    window.NM_DB.fileReport(p.id, reasons[sel]).then(function () {
      hideListing(p.id);
      closeModal();
      toast("Thanks. We will review this listing.");
      show("home"); renderHome();
    }).catch(function (e) {
      var msg = (e && e.message) || "";
      toast(msg.indexOf("row-level security") >= 0
        ? "Could not send the report right now. Please try again later."
        : (msg || "Could not send the report."));
    });
  });
}
function sendAvailabilityPing(p) {
  window.NM_DB.currentUser().then(function (u) {
    if (!u) { show("auth"); toast("Log in to ask the seller."); return; }
    window.NM_DB.openConversation(p.id).then(function (cid) {
      return window.NM_DB.sendMessage(cid, "[AVAILABILITY PING] Is this still available?").then(function () {
        setLS("nc2_ping_" + cid, { by: u.id || u.phone, answered: false });
        openThread(cid);
        toast("Question sent. The seller can answer with one tap.");
      });
    }).catch(function (e) { toast(e.message); });
  });
}
function openOfferModal(p) {
  var cu = getCachedUser();
  var up = cu ? Promise.resolve(cu) : window.NM_DB.currentUser();
  up.then(function (u) {
    if (!u) { show("auth"); toast("Log in to make an offer."); return; }
    setCachedUser(u);
    if (!p.sellerId) { toast("Offers work on live listings."); return; }
    openModal('<h3>Make an offer</h3><p class="m-sub">The seller can accept, counter or decline. ' + esc(p.title) + ' is listed at ' + naira(p.price) + '.</p>' +
      '<label>Your offer in naira<input id="offer-amt" type="number" inputmode="numeric" min="1" placeholder="e.g. 400000"></label>' +
      '<label>Offer lasts<select id="offer-exp"><option value="24">24 hours</option><option value="48" selected>48 hours</option><option value="72">72 hours</option></select></label>' +
      '<div class="modal-actions"><button class="modal-cancel" id="m-cancel">Cancel</button>' +
      '<button class="btn-primary" id="m-offer">Send offer</button></div>');
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-offer").addEventListener("click", function () {
      var amt = Number($("#offer-amt").value);
      if (!(amt > 0)) { toast("Type your offer amount."); return; }
      var expH = Number($("#offer-exp").value);
      var expires = new Date(Date.now() + expH * 3600000).toISOString();
      window.NM_DB.makeOffer(p.id, p.sellerId, amt, expires).then(function () {
        return window.NM_DB.openConversation(p.id).then(function (cid) {
          return window.NM_DB.sendMessage(cid, "I made an offer of " + naira(amt) + " for this item.");
        });
      }).then(function () {
        closeModal();
        toast("Offer sent. You will see the answer here and in Me.");
      }).catch(function (e) { toast(e.message); });
    });
  });
}

/* ---------- inbox + unread ---------- */
var threadId = null;
var threadPoll = null;
var inboxPoll = null;
var lastUnreadCount = 0;
function stopThreadPoll() {
  if (threadPoll) { clearInterval(threadPoll); threadPoll = null; }
}
function startThreadPoll() {
  stopThreadPoll();
  threadPoll = setInterval(function () {
    if (threadId) { renderThreadMsgs(); }
  }, 5000);
}
function startInboxPoll() {
  stopInboxPoll();
  var tick = function () {
    if (current !== "inbox" && current !== "home") { return; }
    computeUnread().then(function (n) {
      if (n > lastUnreadCount && lastUnreadCount >= 0 && document.visibilityState === "visible") {
        var diff = n - lastUnreadCount;
        if (lastUnreadCount > 0 || n > 1) { toast(diff === 1 ? "You have a new message." : "You have " + diff + " new messages."); }
      }
      lastUnreadCount = n;
      var b = $("#nav-badge");
      b.hidden = n === 0;
      b.textContent = n > 99 ? "99+" : n;
      if (current === "inbox") { renderInboxList(); }
    });
  };
  inboxPoll = setInterval(tick, 20000);
  tick();
}
function stopInboxPoll() {
  if (inboxPoll) { clearInterval(inboxPoll); inboxPoll = null; }
}
function readTs(id) { return getLS("nc2_read_" + id, 0); }
function markThreadRead(id) { setLS("nc2_read_" + id, Date.now()); }
function computeUnread() {
  return window.NM_DB.currentUser().then(function (u) {
    if (!u) { return 0; }
    /* local convos */
    var n = 0;
    try {
      var all = JSON.parse(localStorage.getItem("nm_convos") || "[]");
      var key = u.phone || u.id;
      all.forEach(function (c) { if (c.unreadFor === key) { n++; } });
    } catch (e) {}
    /* live convos: last message not mine and newer than read ts */
    return window.NM_DB.listConversations().then(function (list) {
      var checks = list.filter(function (c) { return c.live; }).map(function (c) {
        return window.NM_DB.getConversation(c.id).then(function (full) {
          if (!full || !full.messages.length) { return 0; }
          var last = full.messages[full.messages.length - 1];
          if (last.mine) { return 0; }
          return last.at > readTs(c.id) ? 1 : 0;
        }).catch(function () { return 0; });
      });
      return Promise.all(checks).then(function (rs) {
        rs.forEach(function (x) { n += x; });
        return n;
      });
    });
  });
}
function updateBadge() {
  computeUnread().then(function (n) {
    lastUnreadCount = n;
    var b = $("#nav-badge");
    b.hidden = n === 0;
    b.textContent = n > 99 ? "99+" : n;
  });
}
function renderInbox() {
  window.NM_DB.currentUser().then(function (u) {
    if (!u) { $("#inbox-list").innerHTML = ""; $("#inbox-empty").hidden = false; return; }
    renderInboxList();
  });
}
function renderInboxList() {
  window.NM_DB.currentUser().then(function (u) {
    if (!u) { return; }
    window.NM_DB.listConversations().then(function (list) {
      var box = $("#inbox-list");
      $("#inbox-empty").hidden = list.length > 0;
      var jobs = list.map(function (c) {
        if (!c.live) {
          var last = c.messages[c.messages.length - 1];
          var unread = c.unreadFor === (u.phone || u.id);
          return Promise.resolve({ c: c, unread: unread, last: last });
        }
        return window.NM_DB.getConversation(c.id).then(function (full) {
          var last = full && full.messages.length ? full.messages[full.messages.length - 1] : null;
          var unread = last && !last.mine && last.at > readTs(c.id);
          return { c: c, unread: !!unread, last: last };
        }).catch(function () { return { c: c, unread: false, last: null }; });
      });
      Promise.all(jobs).then(function (rows) {
        box.innerHTML = rows.map(function (r) {
          var c = r.c, last = r.last;
          var buyer = iAmBuyerIn(c, u);
          var other = c.otherName || (buyer ? (c.sellerName || "Seller") : (c.buyerName || "Buyer"));
          var ava = c.otherAvatar
            ? '<span class="convo-ava"><img class="avatar-img" src="' + esc(c.otherAvatar) + '" alt=""></span>'
            : '<span class="convo-ava">' + catOf(c.productCat).icon + '</span>';
          return '<button class="convo" data-id="' + esc(c.id) + '">' + ava +
            '<span class="convo-main"><span class="convo-top"><span class="convo-name">' + esc(other) +
            (r.unread ? '<span class="unread-dot"></span>' : '') + '</span>' +
            '<span class="convo-time">' + (last ? timeAgo(last.at) : "") + '</span></span>' +
            '<span class="convo-sub">' + esc(last ? last.text : "Say hello") + '</span>' +
            '<span class="convo-prod">' + naira(c.productPrice) + ' · ' + esc(c.productTitle) + '</span></span></button>';
        }).join("");
        box.querySelectorAll(".convo").forEach(function (b) {
          b.addEventListener("click", function () { openThread(b.getAttribute("data-id")); });
        });
        updateBadge();
      });
    });
  });
}
function getConvo(id) {
  return window.NM_DB.getConversation(id);
}
function iAmBuyerIn(c, u) {
  if (c.buyerId && u && u.id) { return c.buyerId === u.id; }
  var key = u ? (u.phone || u.id) : null;
  return !key || !c.buyerPhone || c.buyerPhone === key;
}

/* ---------- thread ---------- */
var QUICK_REPLIES = ["Is this still available?", "What is your last price?", "Where is the pickup?", "Can we meet today?"];
function openThread(id) {
  threadId = id;
  getConvo(id).then(function (c) {
    if (!c) { toast("Chat not found."); return; }
    window.NM_DB.currentUser().then(function (u) {
      var key = u ? (u.phone || u.id) : null;
      var buyer = iAmBuyerIn(c, u);
      var other = c.otherName || (buyer ? (c.sellerName || "Seller") : (c.buyerName || "Buyer"));
      $("#thread-name").textContent = other;
      $("#thread-sub").textContent = naira(c.productPrice) + " · " + c.productTitle;
      markThreadRead(id);
      try {
        var all = JSON.parse(localStorage.getItem("nm_convos") || "[]");
        for (var i = 0; i < all.length; i++) {
          if (all[i].id === id && key && all[i].unreadFor === key) { delete all[i].unreadFor; }
        }
        localStorage.setItem("nm_convos", JSON.stringify(all));
      } catch (e) {}
      renderTrustHeader(c, u);
      /* refresh the trust header once the seller tier row lands */
      if (c.sellerId && !_tierCache[c.sellerId]) {
        primeTier(c.sellerId).then(function () { renderTrustHeader(c, u); });
      }
      renderQuickReplies(c, u);
      renderThreadMsgs();
      show("thread");
      startThreadPoll();
      updateBadge();
    });
  });
}
function renderTrustHeader(c, u) {
  var box = $("#screen-thread");
  var old = $("#trust-header");
  if (old) { old.remove(); }
  var sellerId = c.sellerId || null;
  var rating = sellerId ? getRating(sellerId) : null;
  var tier = sellerId ? getTier(sellerId) : null;
  var resp = sellerId ? respLabel(sellerId) : null;
  var bits = [];
  if (rating) { bits.push('<span class="stars">' + starsHTML(rating.avg) + '</span><span>' + rating.avg.toFixed(1) + '</span>'); }
  if (tier) { bits.push(tierBadge(tier) + '<span>' + tierName(tier) + ' verified</span>'); }
  if (resp) { bits.push('<span>⚡ ' + esc(resp) + '</span>'); }
  if (!bits.length) { return; }
  var el = document.createElement("div");
  el.className = "trust-header";
  el.id = "trust-header";
  el.innerHTML = "🛡 " + bits.join(" · ");
  var msgs = $("#thread-msgs");
  box.insertBefore(el, msgs);
}
function renderQuickReplies(c, u) {
  var box = $("#quick-replies");
  var iAmBuyer = iAmBuyerIn(c, u);
  if (!iAmBuyer) { box.innerHTML = ""; return; }
  box.innerHTML = QUICK_REPLIES.map(function (q) {
    return '<button class="qr-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>';
  }).join("");
  box.querySelectorAll(".qr-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      var q = b.getAttribute("data-q");
      window.NM_DB.sendMessage(threadId, q).then(renderThreadMsgs).catch(function (e) { toast(e.message); });
    });
  });
}
function renderThreadMsgs() {
  var box = $("#thread-msgs");
  Promise.all([getConvo(threadId), window.NM_DB.currentUser()]).then(function (res) {
    var c = res[0], u = res[1];
    if (!c || !box) { return; }
    var iAmBuyer = iAmBuyerIn(c, u);
    var html = "";
    var sellerId = iAmBuyer ? c.sellerId : null;
    c.messages.forEach(function (m, idx) {
      var mine;
      if (m.mine !== undefined && m.mine !== null) { mine = !!m.mine; }
      else { mine = (m.from === "buyer") ? iAmBuyer : !iAmBuyer; }
      /* record seller reply times */
      if (sellerId && !mine && idx > 0) {
        var prev = c.messages[idx - 1];
        var pmine = (prev.mine !== undefined && prev.mine !== null) ? !!prev.mine : ((prev.from === "buyer") ? iAmBuyer : !iAmBuyer);
        if (pmine) { recordReplyTime(sellerId, m.at - prev.at); }
      }
      var isPing = typeof m.text === "string" && m.text.indexOf("[AVAILABILITY PING]") === 0;
      var text = isPing ? esc(m.text.replace("[AVAILABILITY PING] ", "")) : esc(m.text);
      html += '<div class="msg ' + (mine ? "me" : "them") + '">' + text +
        '<span class="msg-time">' + timeAgo(m.at) + '</span>';
      /* seller one tap ping answer */
      if (isPing && !iAmBuyer && !mine) {
        var pingState = getLS("nc2_ping_" + threadId, null);
        if (!pingState || !pingState.answered) {
          html += '<div class="ping-actions"><button data-ping="yes">Yes, available</button><button data-ping="no">No, sold</button></div>';
        }
      }
      html += '</div>';
    });
    /* rate seller prompt */
    if (iAmBuyer && sellerId && c.messages.length >= 4 && !store.get("rated_" + threadId, false)) {
      html += '<div class="msg sys" id="rate-prompt">Happy with this seller? <button class="mini-btn" id="rate-btn" style="margin-left:6px">Rate them</button></div>';
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll("[data-ping]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ans = b.getAttribute("data-ping");
        setLS("nc2_ping_" + threadId, { answered: true });
        var reply = ans === "yes" ? "Yes, it is still available." : "Sorry, it is sold.";
        window.NM_DB.sendMessage(threadId, reply).then(function () {
          if (ans === "no" && c.productId) {
            markStale(c.productId);
            window.NM_DB.markProductSold(c.productId).catch(function () {});
          }
          renderThreadMsgs();
        }).catch(function (e) { toast(e.message); });
      });
    });
    var rb = $("#rate-btn");
    if (rb) {
      rb.addEventListener("click", function () { openRateModal(threadId, sellerId, c.sellerName || "Seller"); });
    }
  });
}
function openRateModal(convoId, sellerId, sellerName) {
  var sel = 0;
  openModal('<h3>Rate ' + esc(sellerName) + '</h3><p class="m-sub">Your rating helps other buyers shop with confidence.</p>' +
    '<div class="reason-list" id="star-row" style="grid-template-columns:repeat(5,1fr)">' +
    [1, 2, 3, 4, 5].map(function (i) {
      return '<button class="reason-btn" data-s="' + i + '" style="justify-content:center;font-size:26px">☆</button>';
    }).join("") + '</div>' +
    '<div class="modal-actions"><button class="modal-cancel" id="m-cancel">Skip</button>' +
    '<button class="btn-primary" id="m-rate">Send rating</button></div>');
  $("#modal-box").querySelectorAll("#star-row .reason-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      sel = Number(b.getAttribute("data-s"));
      $("#modal-box").querySelectorAll("#star-row .reason-btn").forEach(function (x, xi) {
        x.textContent = xi < sel ? "★" : "☆";
        x.classList.toggle("on", xi < sel);
      });
    });
  });
  $("#m-cancel").addEventListener("click", function () {
    store.set("rated_" + convoId, true);
    closeModal(); renderThreadMsgs();
  });
  $("#m-rate").addEventListener("click", function () {
    if (!sel) { toast("Tap the stars first."); return; }
    var all = store.get("ratings", {});
    var r = all[sellerId] || { total: 0, count: 0 };
    r.total += sel; r.count++;
    all[sellerId] = r;
    store.set("ratings", all);
    store.set("rated_" + convoId, true);
    closeModal();
    toast("Thanks for rating.");
    renderThreadMsgs();
  });
}
window.NM = window.NM || {};
window.NM.onExternalMessage = function (convoId) {
  try {
    var u = JSON.parse(localStorage.getItem("nm_session") || "null");
    var all = JSON.parse(localStorage.getItem("nm_convos") || "[]");
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === convoId && u && all[i].buyerPhone === u.phone) { all[i].unreadFor = u.phone; }
    }
    localStorage.setItem("nm_convos", JSON.stringify(all));
  } catch (e) {}
  if (convoId === threadId) { renderThreadMsgs(); markThreadRead(convoId); }
  else {
    window.NM_DB.currentUser().then(function (u2) {
      if (u2 && document.visibilityState === "visible") { toast("New message from your chat."); }
    });
  }
  updateBadge();
};

/* ---------- seller storefront ---------- */
function openSeller(sellerId, sellerName) {
  window.NM_DB.getProfileById(sellerId).then(function (prof) {
    window.NM_DB.listProducts({}).then(function (all) {
      var mine = all.filter(function (p) { return p.sellerId === sellerId && !isHidden(p.id); });
      var name = (prof && prof.display_name) || sellerName || "Seller";
      var initial = esc(name.trim().charAt(0).toUpperCase());
      var ava = prof && prof.avatar_url
        ? '<div class="seller-ava"><img class="avatar-img" src="' + esc(prof.avatar_url) + '" alt=""></div>'
        : '<div class="seller-ava">' + initial + '</div>';
      var tier = (prof && prof.verification_tier) || getTier(sellerId);
      if (prof && prof.verification_tier) { cacheTier(sellerId, prof.verification_tier); }
      var rating = getRating(sellerId);
      var memberSince = prof && prof.created_at ? new Date(prof.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "recently";
      window.NM_DB.sellerMessageStats(sellerId).then(function (stats) {
        var resp = stats && stats.avgMs ? "Replies in about " + respDuration(stats.avgMs) : (respLabel(sellerId) || "New seller");
        $("#seller-body").innerHTML =
          '<div class="store-hero">' + ava +
          '<div class="store-name">' + esc(name) + ' ' + tierBadge(tier) + '</div>' +
          '<div class="store-meta">Member since ' + esc(memberSince) + (tier ? ' · ' + tierName(tier) + ' verified' : '') + '</div>' +
          '<div class="store-stats">' +
          '<div class="store-stat"><b>' + mine.length + '</b><span>Listings</span></div>' +
          '<div class="store-stat"><b>' + (rating ? rating.avg.toFixed(1) + '★' : 'New') + '</b><span>Rating</span></div>' +
          '<div class="store-stat"><b style="font-size:12px">' + esc(resp) + '</b><span>Response</span></div>' +
          '</div></div>' +
          '<div class="section-head">All listings</div>' +
          '<div class="grid" id="seller-grid">' + mine.map(function (p, i) { return cardHTML(p, null, i); }).join("") + '</div>' +
          (mine.length ? "" : '<div class="empty"><img class="empty-illus" src="assets/empty-search.svg" alt=""><h3>No active listings</h3><p>This seller has nothing listed right now.</p></div>');
        bindCards($("#seller-grid"));
        show("seller");
      });
    });
  });
}
function respDuration(ms) {
  var m = Math.round(ms / 60000);
  if (m < 1) { return "a minute"; }
  if (m < 60) { return m + " mins"; }
  var h = Math.round(m / 60);
  if (h < 24) { return h + (h === 1 ? " hour" : " hours"); }
  return Math.round(h / 24) + " days";
}

/* ---------- header avatars ---------- */
function refreshHeaderAvatars() {
  window.NM_DB.currentUser().then(function (u) {
    var initial = u ? esc((u.name || "M").trim().charAt(0).toUpperCase()) : "☺";
    var inner = (u && u.avatarUrl)
      ? '<img src="' + esc(u.avatarUrl) + '" alt="">'
      : initial;
    $$(".topbar").forEach(function (bar) {
      var btn = bar.querySelector(".me-mini");
      if (!btn) {
        btn = document.createElement("button");
        btn.className = "me-mini";
        btn.setAttribute("aria-label", "My profile");
        btn.addEventListener("click", function () { renderMe(); show("me"); });
        bar.appendChild(btn);
      }
      btn.innerHTML = inner;
    });
    var navIco = $("#nav-me-ico");
    if (navIco) {
      navIco.innerHTML = (u && u.avatarUrl)
        ? '<img class="avatar-img" style="width:24px;height:24px;" src="' + esc(u.avatarUrl) + '" alt="">'
        : "☺";
    }
  });
}

/* ---------- me ---------- */
function avatarHTML(url, initial, cls) {
  if (url) { return '<div class="' + cls + '"><img class="avatar-img" src="' + esc(url) + '" alt=""></div>'; }
  return '<div class="' + cls + '">' + esc(initial) + '</div>';
}
function renderMe() {
  window.NM_DB.currentUser().then(function (u) {
    var box = $("#me-body");
    if (!u) {
      renderGuestMe(box);
      return;
    }
    var initial = esc((u.name || "M").trim().charAt(0).toUpperCase());
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var tier = getTier(u.id);
    /* DB is the source of truth; refresh the verify row once it lands */
    primeTier(u.id).then(function (t) {
      if (t && t !== tier && $("#me-body")) { renderMe(); }
    });
    var html =
      '<div class="me-hero rise">' +
        '<div class="me-avatar-wrap">' +
          '<div class="me-avatar" id="me-avatar" title="Change photo">' +
            (u.avatarUrl ? '<img class="avatar-img" src="' + esc(u.avatarUrl) + '" alt="">' : initial) +
          '</div>' +
          '<div><div class="me-name" style="color:#fff">' + esc(u.name) + ' ' + tierBadge(tier) + '</div>' +
          (u.email ? '<div class="me-detail" style="color:rgba(255,255,255,.75)">' + esc(u.email) + '</div>' : "") +
          (u.phone ? '<div class="me-detail" style="color:rgba(255,255,255,.75)">' + esc(u.phone) + '</div>' : "") +
          (u.address ? '<div class="me-detail" style="color:rgba(255,255,255,.75)">' + esc(u.address) + '</div>' : "") +
          '<button class="me-avatar-btn" id="me-avatar-btn" style="color:#ff9a3d">Change photo</button></div>' +
        '</div>' +
        '<input id="me-avatar-file" type="file" accept="image/*" hidden>' +
      '</div>' +
      '<div class="me-card" style="margin-top:10px">' +
        '<div class="verify-row" style="border-top:0;margin-top:0;padding-top:2px"><div class="vinfo"><div class="vname">Seller verification ' + tierBadge(tier) + '</div>' +
        '<div class="vsub">' + (tier ? tierName(tier) + ' verified. Buyers trust you more.' : 'Get verified to win buyer trust.') + '</div></div>' +
        (tier === "gold" ? "" : '<button class="mini-btn" id="verify-btn">' + (tier ? "Upgrade" : "Verify me") + '</button>') + '</div>' +
        waVerifyHTML(u, tier) +
        '<div class="profile-form" id="profile-form">' +
          '<label>Display name<input id="pf-name" type="text" value="' + esc(u.name) + '" maxlength="60"></label>' +
          '<label>Phone<input id="pf-phone" type="tel" value="' + esc(u.phone || "") + '" placeholder="0803 123 4567"></label>' +
          '<label>Address<input id="pf-address" type="text" value="' + esc(u.address || "") + '" placeholder="Street, area, city" maxlength="120"></label>' +
          '<button class="btn-primary" id="pf-save" type="button">Save profile</button>' +
        '</div>' +
        '<div class="theme-row"><span>Dark mode</span>' +
          '<label class="switch"><input type="checkbox" id="theme-toggle"' + (dark ? " checked" : "") + '><span class="slider"></span></label>' +
        '</div>' +
        '<div class="me-actions"><button class="btn-ghost" id="me-sell">Sell an item</button>' +
        '<button class="btn-ghost btn-danger" id="me-logout">Log out</button></div>' +
      '</div>' +
      '<div id="me-alerts"></div>' +
      '<div class="section-head">Favorites <span id="fav-count"></span></div>' +
      '<div class="grid fav-grid" id="me-favs"></div>' +
      '<div class="section-head">Saved searches <button class="link-btn" id="ss-add">+ Save current</button></div>' +
      '<div class="me-card" id="ss-list" style="margin-top:8px"></div>' +
      '<div class="section-head">Offers on my items</div>' +
      '<div class="me-card" id="offer-list" style="margin-top:8px"><div class="me-detail">Loading...</div></div>' +
      '<div class="section-head">My listings (<span id="me-count">0</span>)</div>' +
      '<div class="grid" id="me-grid"></div>' +
      '<div class="empty" id="me-empty" hidden>You have not posted anything yet.</div>';
    box.innerHTML = html;

    window.NM_DB.listProducts({ sellerId: u.id, seller: u.phone }).then(function (mine) {
      $("#me-count").textContent = mine.length;
      var g = $("#me-grid");
      g.innerHTML = mine.map(function (p, i) {
        return cardHTML(p, null, i) +
          '<div style="grid-column:1/-1;margin:-6px 0 8px"><button class="mini-btn" data-bump="' + esc(p.id) + '" data-bumped="' + (p.bumpAt ? "1" : "") + '">' +
          (p.bumpAt ? "✓ Promoted" : "Promote to top") + '</button></div>';
      }).join("");
      bindCards(g);
      g.querySelectorAll("[data-bump]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var id = b.getAttribute("data-bump");
          var isBumped = !!b.getAttribute("data-bumped");
          b.disabled = true;
          var op = isBumped ? window.NM_DB.unbumpProduct(id) : window.NM_DB.bumpProduct(id);
          op.then(function () {
            toast(isBumped ? "Promotion removed." : "Promoted. Your item now shows at the top with a Promoted badge.");
            renderMe();
          }).catch(function (err) {
            /* demo rows keep the old local fallback */
            if (isBumped) { var bb = store.get("bumps", {}); delete bb[id]; store.set("bumps", bb); }
            else { bumpProduct(id); }
            renderMe();
          });
        });
      });
      $("#me-empty").hidden = mine.length > 0;
      renderOfferSection(u, mine);
    });

    renderMeFavs();
    renderSavedSearches();
    renderWatchAlerts();

    $("#me-sell").addEventListener("click", function () { show("sell"); });
    $("#me-logout").addEventListener("click", function () {
      stopThreadPoll(); stopInboxPoll();
      threadId = null;
      window.NM_DB.signOut().then(function () {
        setCachedUser(null);
        renderChips(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge(); refreshHeaderAvatars();
        show("auth");
        toast("Logged out. See you soon.");
      }).catch(function (e) { toast(e.message); });
    });

    $("#theme-toggle").addEventListener("change", function (e) {
      setTheme(e.target.checked ? "dark" : "light");
    });

    var vb = $("#verify-btn");
    if (vb) {
      vb.addEventListener("click", function () { openVerifyModal(u); });
    }

    var waBtn = $("#wa-verify-btn");
    if (waBtn) {
      waBtn.addEventListener("click", function () { startWhatsAppVerify(u); });
    }

    var fileInp = $("#me-avatar-file");
    $("#me-avatar-btn").addEventListener("click", function () { fileInp.click(); });
    $("#me-avatar").addEventListener("click", function () { fileInp.click(); });
    fileInp.addEventListener("change", function () {
      var f = fileInp.files && fileInp.files[0];
      if (!f) { return; }
      if (f.type.indexOf("image/") !== 0) { toast("Pick an image file."); return; }
      squareCrop(f, 256).then(function (blob) {
        toast("Uploading photo...");
        return window.NM_DB.uploadAvatar(blob);
      }).then(function () {
        toast("Photo updated.");
        renderMe(); refreshHeaderAvatars();
      }).catch(function (e) { toast(e.message); });
      fileInp.value = "";
    });

    $("#pf-save").addEventListener("click", function () {
      var name = $("#pf-name").value.trim();
      var phone = $("#pf-phone").value.trim();
      var address = $("#pf-address").value.trim();
      if (!name) { toast("Type your display name."); return; }
      if (phone && !validPhone(phone)) { toast("That phone number does not look right."); return; }
      window.NM_DB.updateProfile({ display_name: name, phone: phone, address: address }).then(function () {
        /* silver tier: phone verified */
        if (phone && getTier(u.id) !== "silver" && getTier(u.id) !== "gold") {
          window.NM_DB.setTier("silver").then(function () {
            cacheTier(u.id, "silver");
            toast("Profile saved. You are now Silver verified.");
            renderMe(); refreshHeaderAvatars();
          }).catch(function () {
            toast("Profile saved.");
            renderMe(); refreshHeaderAvatars();
          });
          return;
        }
        toast("Profile saved.");
        renderMe(); refreshHeaderAvatars();
      }).catch(function (e) { toast(e.message); });
    });

    var ssAdd = $("#ss-add");
    if (ssAdd) {
      ssAdd.addEventListener("click", function () {
        var q = $("#home-search").value.trim();
        if (!q && !homeCat) { toast("Search for something first, then save it."); return; }
        window.NM_DB.addSavedSearch(q, homeCat).then(function (s) {
          toast("Search saved. We will flag new matches here.");
          renderSavedSearches();
        }).catch(function (e) {
          /* guests keep searches on this phone */
          var ss = store.get("saved_searches", []);
          ss.unshift({ id: "ss" + Date.now(), query: q, category: homeCat, createdAt: Date.now() });
          store.set("saved_searches", ss.slice(0, 10));
          toast("Search saved. We will flag new matches here.");
          renderSavedSearches();
        });
      });
    }
  });
}
function renderGuestMe(box) {
  var favs = getFavIds();
  window.NM_DB.listProducts({}).then(function (all) {
    var items = all.filter(function (p) { return favs.indexOf(p.id) >= 0 && !isHidden(p.id); });
    box.innerHTML = '<div class="me-card rise"><div class="me-name">You are not logged in</div>' +
      '<p class="me-phone">Log in to post items and chat with sellers. Your saved items stay on this phone.</p>' +
      '<div class="me-actions"><button class="btn-primary" id="me-login">Log in</button></div></div>' +
      '<div class="section-head">Saved items (' + items.length + ')</div>' +
      '<div class="grid fav-grid" id="me-favs">' + items.map(function (p) { return cardHTML(p); }).join("") + '</div>' +
      (items.length ? "" : '<div class="empty">Tap the heart on any item to save it here.</div>');
    bindCards($("#me-favs"));
    $("#me-login").addEventListener("click", function () { show("auth"); });
  });
}
function renderMeFavs() {
  var grid = $("#me-favs");
  if (!grid) { return; }
  window.NM_DB.currentUser().then(function (u) {
    var doRender = function (ids) {
      window.NM_DB.listProducts({}).then(function (all) {
        var items = all.filter(function (p) { return ids.indexOf(p.id) >= 0 && !isHidden(p.id); });
        var snaps = store.get("price_snap", {});
        var fc = $("#fav-count");
        if (fc) { fc.textContent = "(" + items.length + ")"; }
        grid.innerHTML = items.map(function (p, i) {
          var drop = snaps[p.id] && snaps[p.id] > p.price;
          return cardHTML(p, { priceDrop: drop, wasPrice: drop ? snaps[p.id] : null }, i);
        }).join("");
        bindCards(grid);
        if (!items.length) {
          grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><img class="empty-illus" src="assets/empty-heart.svg" alt=""><h3>No favorites yet</h3><p>Tap the heart on any item to save it here.</p></div>';
        }
      });
    };
    if (u && u.id) {
      window.NM_DB.listFavoriteIds().then(function (serverIds) {
        var local = getFavIds();
        var merged = local.slice();
        serverIds.forEach(function (id) { if (merged.indexOf(id) < 0) { merged.push(id); } });
        doRender(merged);
      });
    } else {
      doRender(getFavIds());
    }
  });
}
function renderSavedSearches() {
  var box = $("#ss-list");
  if (!box) { return; }
  window.NM_DB.listSavedSearches().then(function (dbSS) {
    var ss = dbSS.length ? dbSS : store.get("saved_searches", []);
    var dbBacked = dbSS.length > 0;
    if (!ss.length) {
      box.innerHTML = '<div class="me-detail">No saved searches. Search for something on Home, then tap "+ Save current".</div>';
      return;
    }
    window.NM_DB.listProducts({}).then(function (all) {
      box.innerHTML = ss.map(function (s) {
        var matches = all.filter(function (p) {
          if (isHidden(p.id)) { return false; }
          if (s.category && p.category !== s.category) { return false; }
          return !s.query || fuzzyMatch(p.title + " " + p.description, s.query);
        }).filter(function (p) { return p.at > (s.createdAt || 0); });
        return '<div class="ss-row"><span class="ss-q">' + esc(s.query || catOf(s.category).name) +
          (matches.length ? ' <span class="ss-new">' + matches.length + ' new</span>' : '') + '</span>' +
          '<button class="link-btn" data-ssrun="' + esc(s.id) + '">View</button>' +
          '<button class="ss-del" data-ssdel="' + esc(s.id) + '" aria-label="Delete">×</button></div>';
      }).join("");
      box.querySelectorAll("[data-ssrun]").forEach(function (b) {
        b.addEventListener("click", function () {
          var s = ss.filter(function (x) { return String(x.id) === b.getAttribute("data-ssrun"); })[0];
          if (!s) { return; }
          $("#home-search").value = s.query || "";
          homeCat = s.category || "";
          renderChips(); renderHome(); show("home");
        });
      });
      box.querySelectorAll("[data-ssdel]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-ssdel");
          if (dbBacked) {
            window.NM_DB.deleteSavedSearch(id).then(renderSavedSearches).catch(function (e) { toast(e.message); });
          } else {
            store.set("saved_searches", ss.filter(function (x) { return String(x.id) !== id; }));
            renderSavedSearches();
          }
        });
      });
    });
  });
}
function renderWatchAlerts() {
  var box = $("#me-alerts");
  if (!box) { return; }
  var favs = getFavIds();
  if (!favs.length) { box.innerHTML = ""; return; }
  window.NM_DB.listProducts({}).then(function (all) {
    var snaps = store.get("price_snap", {});
    var drops = [];
    all.forEach(function (p) {
      if (favs.indexOf(p.id) >= 0 && snaps[p.id] && snaps[p.id] > p.price) {
        drops.push({ p: p, was: snaps[p.id] });
      }
    });
    box.innerHTML = drops.map(function (d) {
      return '<button class="alert-row" data-id="' + esc(d.p.id) + '"><span class="tag">Price drop</span>' +
        '<span>' + esc(d.p.title) + ' is now ' + naira(d.p.price) + ' (was ' + naira(d.was) + ')</span></button>';
    }).join("");
    box.querySelectorAll(".alert-row").forEach(function (b) {
      b.addEventListener("click", function () { openDetail(b.getAttribute("data-id")); });
    });
  });
}
function renderOfferSection(u, mine) {
  var box = $("#offer-list");
  if (!box) { return; }
  var myIds = {};
  mine.forEach(function (p) { myIds[p.id] = true; });
  var jobs = mine.map(function (p) { return window.NM_DB.listOffersForProduct(p.id); });
  Promise.all(jobs).then(function (lists) {
    var offers = [];
    lists.forEach(function (l, i) {
      l.forEach(function (o) { o._product = mine[i]; offers.push(o); });
    });
    offers.sort(function (a, b) { return Date.parse(b.created_at) - Date.parse(a.created_at); });
    var pending = offers.filter(function (o) { return o.status === "pending"; });
    if (!offers.length) {
      box.innerHTML = '<div class="me-detail">No offers yet. Buyers can tap "Make offer" on your items.</div>';
      return;
    }
    box.innerHTML = offers.slice(0, 10).map(function (o) {
      var st = o.status;
      var cls = st === "accepted" ? "accepted" : (st === "declined" || st === "expired") ? "declined" : "pending";
      var label = st === "pending" ? "Pending" : st === "accepted" ? "Accepted" : st === "declined" ? "Declined" : "Expired";
      var btns = "";
      if (st === "pending" && o.seller_id === u.id) {
        btns = '<div class="offer-btns"><button class="acc" data-offer="accept" data-id="' + o.id + '">Accept</button>' +
          '<button data-offer="counter" data-id="' + o.id + '">Counter</button>' +
          '<button data-offer="decline" data-id="' + o.id + '">Decline</button></div>';
      }
      return '<div class="offer-status ' + cls + '"><span>' + naira(o.amount) + ' on ' + esc(o._product.title) +
        ' · ' + label + '</span></div>' + btns;
    }).join("");
    box.querySelectorAll("[data-offer]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id"), act = b.getAttribute("data-offer");
        if (act === "decline") {
          window.NM_DB.answerOffer(id, "declined").then(function () { toast("Offer declined."); renderMe(); }).catch(function (e) { toast(e.message); });
        } else if (act === "accept") {
          window.NM_DB.answerOffer(id, "accepted").then(function () { toast("Offer accepted. Chat the buyer to close it."); renderMe(); }).catch(function (e) { toast(e.message); });
        } else {
          openModal('<h3>Counter offer</h3><p class="m-sub">Name your price. The buyer sees it in their offers.</p>' +
            '<label>Your price in naira<input id="counter-amt" type="number" inputmode="numeric" min="1"></label>' +
            '<div class="modal-actions"><button class="modal-cancel" id="m-cancel">Cancel</button>' +
            '<button class="btn-primary" id="m-counter">Send counter</button></div>');
          $("#m-cancel").addEventListener("click", closeModal);
          $("#m-counter").addEventListener("click", function () {
            var amt = Number($("#counter-amt").value);
            if (!(amt > 0)) { toast("Type an amount."); return; }
            window.NM_DB.answerOffer(id, "pending", amt).then(function () {
              closeModal(); toast("Counter sent."); renderMe();
            }).catch(function (e) { toast(e.message); });
          });
        }
      });
    });
  });
}
function openVerifyModal(u) {
  var tier = getTier(u.id);
  openModal('<h3>Seller verification</h3><p class="m-sub">Verified sellers win more buyer trust and show up under the Verified only filter.</p>' +
    '<div class="reason-list">' +
    '<button class="reason-btn' + (tier === "bronze" ? " on" : "") + '" data-t="bronze">🥉 Bronze · email confirmed' + (tier === "bronze" ? " ✓" : "") + '</button>' +
    '<button class="reason-btn' + (tier === "silver" ? " on" : "") + '" data-t="silver">🥈 Silver · phone number on profile' + (tier === "silver" ? " ✓" : "") + '</button>' +
    '<button class="reason-btn' + (tier === "gold" ? " on" : "") + '" data-t="gold">🥇 Gold · number proven over WhatsApp' + (tier === "gold" ? " ✓" : "") + '</button>' +
    '</div>' +
    '<div class="modal-actions"><button class="modal-cancel" id="m-cancel">Close</button></div>');
  $("#m-cancel").addEventListener("click", closeModal);
  $("#modal-box").querySelectorAll("[data-t]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-t");
      if (t === "bronze") {
        window.NM_DB.setTier("bronze").then(function () {
          cacheTier(u.id, "bronze");
          closeModal();
          toast("You are now Bronze verified.");
          renderMe(); renderHome();
        }).catch(function (e) { toast(e.message); });
      } else if (t === "silver") {
        if (!u.phone) { toast("Add your phone number in your profile first."); return; }
        window.NM_DB.setTier("silver").then(function () {
          cacheTier(u.id, "silver");
          closeModal();
          toast("You are now Silver verified.");
          renderMe(); renderHome();
        }).catch(function (e) { toast(e.message); });
      } else {
        toast("Gold needs your number proven over WhatsApp. Tap Verify my number above and send the message.");
        return;
      }
    });
  });
}

/* ---------- theme ---------- */
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("nm_theme", t); } catch (e) {}
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) { meta.setAttribute("content", t === "dark" ? "#0e1210" : "#0a7a3d"); }
}

/* ---------- image compression ---------- */
function compressImage(file, maxDim, quality) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var cw = Math.max(1, Math.round(img.width * scale));
      var ch = Math.max(1, Math.round(img.height * scale));
      var cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      cv.getContext("2d").drawImage(img, 0, 0, cw, ch);
      cv.toBlob(function (b) {
        b ? resolve(b) : reject(new Error("Could not read that photo."));
      }, "image/jpeg", quality);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo."));
    };
    img.src = url;
  });
}
function squareCrop(file, size) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var side = Math.min(img.width, img.height);
      var sx = Math.round((img.width - side) / 2), sy = Math.round((img.height - side) / 2);
      var cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      cv.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
      cv.toBlob(function (b) {
        b ? resolve(b) : reject(new Error("Could not read that photo."));
      }, "image/jpeg", 0.85);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo."));
    };
    img.src = url;
  });
}

/* ---------- sell photo picker ---------- */
var sellPhotos = [];
function renderPhotoThumbs() {
  var box = $("#photo-thumbs");
  $("#photo-count").textContent = "(" + sellPhotos.length + " of 9)";
  box.innerHTML = sellPhotos.map(function (p, i) {
    return '<div class="photo-thumb"><img src="' + p.url + '" alt="">' +
      '<button type="button" class="rm" data-i="' + i + '" aria-label="Remove">×</button>' +
      (i === 0 ? '<span class="first-tag">Cover</span>' : "") + '</div>';
  }).join("");
  box.querySelectorAll(".rm").forEach(function (b) {
    b.addEventListener("click", function () {
      var i = Number(b.getAttribute("data-i"));
      URL.revokeObjectURL(sellPhotos[i].url);
      sellPhotos.splice(i, 1);
      renderPhotoThumbs(); updateCompleteness();
    });
  });
  updateCompleteness();
}
function handlePhotoSelect(files) {
  var list = Array.prototype.slice.call(files || []);
  var room = 9 - sellPhotos.length;
  if (list.length > room) {
    toast("Only 9 photos per item. Picking the first " + room + ".");
    list = list.slice(0, room);
  }
  var chain = Promise.resolve();
  list.forEach(function (f) {
    chain = chain.then(function () {
      if (f.type.indexOf("image/") !== 0) { toast("Skipped a file that is not an image."); return; }
      if (f.size > 15 * 1024 * 1024) { toast("Skipped a photo over 15 MB."); return; }
      return compressImage(f, 1200, 0.75).then(function (blob) {
        sellPhotos.push({ blob: blob, url: URL.createObjectURL(blob) });
      }).catch(function () { toast("Could not read one photo."); });
    });
  });
  return chain.then(renderPhotoThumbs);
}
function updateCompleteness() {
  var score = 0, tips = [];
  var title = $("#sell-title").value.trim();
  var price = $("#sell-price").value.trim();
  var desc = $("#sell-desc").value.trim();
  if (title.length >= 10) { score += 20; } else { tips.push("a longer title"); }
  if (price && Number(price) > 0) { score += 15; } else { tips.push("a price"); }
  if (desc.length >= 40) { score += 20; } else { tips.push("a fuller description"); }
  if ($("#sell-category").value) { score += 10; }
  var n = sellPhotos.length;
  if (n >= 5) { score += 25; }
  else if (n >= 3) { score += 18; tips.push(n + " photos is good, 5 or more sells faster"); }
  else if (n >= 1) { score += 10; tips.push("at least 3 photos"); }
  else { tips.push("photos of your item"); }
  if ($("#sell-location").value) { score += 10; }
  $("#complete-pct").textContent = score + "%";
  $("#complete-fill").style.width = score + "%";
  $("#complete-tip").textContent = score >= 90
    ? "Strong listing. This one is ready to sell fast."
    : "Add " + tips.slice(0, 2).join(" and ") + " to sell faster.";
}

/* ---------- auth ---------- */
function authError(msg) {
  var e = $("#auth-error");
  e.textContent = msg;
  e.hidden = false;
}
function clearAuthError() { $("#auth-error").hidden = true; }
function afterAuth(u) {
  clearAuthError();
  setCachedUser(u);
  /* merge guest favorites into the account */
  var local = getFavIds();
  if (local.length && u && u.id) {
    window.NM_DB.mergeLocalFavorites(local).catch(function () {});
  }
  /* merge on phone saved searches into the account, then clear the phone copy */
  var ssLocal = store.get("saved_searches", []);
  if (ssLocal.length && u && u.id) {
    var chain = Promise.resolve();
    ssLocal.forEach(function (s) {
      chain = chain.then(function () {
        return window.NM_DB.addSavedSearch(s.query || "", s.category || "").catch(function () {});
      });
    });
    chain.then(function () { store.set("saved_searches", []); });
  }
  renderChips(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge(); refreshHeaderAvatars();
  show("home");
  toast(u.authNotice || ("Welcome, " + u.name.split(" ")[0]));
}

/* ---------- sell ---------- */
function fillSellCats() {
  $("#sell-category").innerHTML = CATS.map(function (c) {
    return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
  }).join("");
}

/* ---------- wire up ---------- */
document.addEventListener("DOMContentLoaded", function () {
  window.NM_DB.init().then(function () {

    /* nav */
    $$(".nav-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var go = b.getAttribute("data-go");
        if (go === "home") { renderHome(); }
        if (go === "category") { resetCatScreen(); }
        if (go === "inbox") { renderInbox(); }
        if (go === "me") { renderMe(); }
        show(go);
      });
    });

    /* auth tabs */
    var authTabs = ["login", "signup"];
    function showAuthTab(which) {
      authTabs.forEach(function (t) {
        $("#tab-" + t).classList.toggle("active", t === which);
        $("#form-" + t).hidden = (t !== which);
      });
      $("#form-forgot").hidden = true;
      clearAuthError();
    }
    authTabs.forEach(function (t) {
      $("#tab-" + t).addEventListener("click", function () { showAuthTab(t); });
    });

    /* forgot password */
    $("#forgot-link").addEventListener("click", function () {
      $("#form-login").hidden = true; $("#form-forgot").hidden = false; clearAuthError();
    });
    $("#forgot-back").addEventListener("click", function () {
      $("#form-forgot").hidden = true; $("#form-login").hidden = false; clearAuthError();
    });
    $("#form-forgot").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var email = $("#forgot-email").value.trim();
      if (!validEmail(email)) { authError("Type a valid email address."); return; }
      window.NM_DB.resetPassword(email).then(function () {
        toast("Check your Gmail for the reset link.");
        $("#form-forgot").hidden = true; $("#form-login").hidden = false;
      }).catch(function (err) { authError(err.message); });
    });

    $("#form-signup").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var name = $("#signup-name").value.trim();
      var email = $("#signup-email").value.trim();
      var phone = $("#signup-phone").value.trim();
      var pass = $("#signup-pass").value;
      if (!name) { authError("Tell us your name."); return; }
      if (!validEmail(email)) { authError("Type a valid email address."); return; }
      if (!window.NM_DB.phoneValid(phone)) { authError("Type a valid Nigerian phone number, like 0803 123 4567."); return; }
      if (pass.length < 6) { authError("Password needs at least 6 characters."); return; }
      window.NM_DB.signUp(name, email, phone, pass).then(function (r) {
        /* bronze tier on signup (the profiles default) */
        if (r && r.id) { cacheTier(r.id, "bronze"); }
        if (r.confirmNotice) {
          toast(r.confirmNotice);
          showAuthTab("login");
          $("#login-id").value = email;
        } else { afterAuth(r); }
      }).catch(function (err) { authError(err.message); });
    });

    $("#form-login").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var id = $("#login-id").value.trim();
      var pass = $("#login-pass").value;
      if (!id) { authError("Type your email or phone number."); return; }
      if (!pass) { authError("Type your password."); return; }
      window.NM_DB.signInWithIdentifier(id, pass).then(function (r) {
        afterAuth(r);
      }).catch(function (err) { authError(err.message); });
    });

    /* home search */
    var searchT = null;
    $("#home-search").addEventListener("input", function () {
      clearTimeout(searchT);
      searchT = setTimeout(function () {
        var q = $("#home-search").value.trim();
        if (q.length > 1) { pushRecentSearch(q); renderTrends(); }
        renderHome();
      }, 400);
    });
    $("#home-search").addEventListener("change", function () {
      var q = $("#home-search").value.trim();
      if (q.length > 1) { pushRecentSearch(q); renderTrends(); }
    });

    /* filter pills */
    $("#filter-verified").addEventListener("click", function () {
      verifiedOnly = !verifiedOnly;
      this.classList.toggle("on", verifiedOnly);
      renderHome();
      if (verifiedOnly) { toast("Showing verified sellers only."); }
    });
    $("#filter-near").addEventListener("click", function () {
      var btn = this;
      if (nearMe) {
        nearMe = null;
        btn.classList.remove("on");
        renderHome();
        return;
      }
      if (!navigator.geolocation) { toast("Your phone cannot share location. Showing all areas."); return; }
      btn.classList.add("on");
      toast("Finding items near you...");
      navigator.geolocation.getCurrentPosition(function (pos) {
        nearMe = { la: pos.coords.latitude, lo: pos.coords.longitude };
        renderHome();
        toast("Showing items near you first.");
      }, function () {
        btn.classList.remove("on");
        toast("Location blocked. Showing all areas instead.");
      }, { timeout: 8000 });
    });

    /* backs */
    $("#detail-back").addEventListener("click", function () { show("home"); renderHome(); });
    $("#thread-back").addEventListener("click", function () { stopThreadPoll(); markThreadRead(threadId); threadId = null; show("inbox"); renderInbox(); });
    $("#sell-back").addEventListener("click", function () { show("home"); renderHome(); });
    $("#cat-back").addEventListener("click", resetCatScreen);
    $("#seller-back").addEventListener("click", function () { show("detail"); });

    /* thread form */
    $("#thread-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = $("#thread-input");
      var text = inp.value.trim();
      if (!text || !threadId) { return; }
      inp.value = "";
      window.NM_DB.sendMessage(threadId, text).then(function () {
        markThreadRead(threadId);
        renderThreadMsgs();
      }).catch(function (err) { toast(err.message); });
    });

    /* sell form */
    fillSellCats();
    ["sell-title", "sell-price", "sell-desc"].forEach(function (id) {
      $("#" + id).addEventListener("input", updateCompleteness);
    });
    $("#sell-category").addEventListener("change", updateCompleteness);
    $("#sell-location").addEventListener("change", updateCompleteness);
    updateCompleteness();
    $("#sell-photos").addEventListener("change", function (e) {
      handlePhotoSelect(e.target.files);
      e.target.value = "";
    });
    $("#sell-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var errBox = $("#sell-error");
      errBox.hidden = true;
      var data = {
        title: $("#sell-title").value.trim(),
        price: $("#sell-price").value.trim(),
        category: $("#sell-category").value,
        condition: $("#sell-condition").value,
        location: $("#sell-location").value,
        description: $("#sell-desc").value.trim(),
        photoBlobs: sellPhotos.map(function (p) { return p.blob; })
      };
      if (!data.title) { errBox.textContent = "Give your item a title."; errBox.hidden = false; return; }
      if (!data.price || Number(data.price) <= 0) { errBox.textContent = "Type a valid price in naira."; errBox.hidden = false; return; }
      if (!data.description) { errBox.textContent = "Describe your item in a few words."; errBox.hidden = false; return; }
      var btn = $("#sell-form .btn-primary");
      btn.disabled = true;
      window.NM_DB.createProduct(data).then(function (p) {
        $("#sell-form").reset();
        sellPhotos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
        sellPhotos = [];
        renderPhotoThumbs();
        renderHome();
        toast("Your item is live on Nationwide Connect.");
        openDetail(p.id);
      }).catch(function (err) {
        if (err.message.indexOf("Log in") >= 0) { show("auth"); }
        errBox.textContent = err.message; errBox.hidden = false;
      }).then(function () { btn.disabled = false; });
    });

    /* password recovery: reset link brings the user back with type=recovery */
    function showRecover() {
      renderChips(); renderHome(); renderCatList(); renderInbox(); updateBadge();
      show("recover");
    }
    window.NM_DB.onPasswordRecovery(function () { showRecover(); });
    $("#form-recover").addEventListener("submit", function (e) {
      e.preventDefault();
      var errBox = $("#recover-error"); errBox.hidden = true;
      var p1 = $("#recover-pass").value, p2 = $("#recover-pass2").value;
      if (p1.length < 6) { errBox.textContent = "Password needs at least 6 characters."; errBox.hidden = false; return; }
      if (p1 !== p2) { errBox.textContent = "The two passwords do not match."; errBox.hidden = false; return; }
      window.NM_DB.setNewPassword(p1).then(function () {
        try { history.replaceState(null, "", window.location.pathname); } catch (e2) {}
        window.NM_DB.currentUser().then(function (u) { afterAuth(u); });
      }).catch(function (err) { errBox.textContent = err.message; errBox.hidden = false; });
    });

    /* boot */
    window.NM_DB.currentUser().then(function (u) {
      setCachedUser(u);
      renderChips(); renderTrends(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge(); refreshHeaderAvatars();
      if (/[?#&]type=recovery/.test(window.location.hash || "")) { show("recover"); }
      else { show(u ? "home" : "auth"); }
      checkSavedSearchAlerts();
      initPremiumUI();
      hideSplash();
    });
  });
});

/* ---------- premium UI: splash, hero carousel, ticker ---------- */
function hideSplash() {
  var s = $("#splash");
  if (s) { setTimeout(function () { s.classList.add("hide"); }, 1100); }
}
function initPremiumUI() {
  /* hero carousel auto-rotate */
  var track = $("#hero-track"), dotsWrap = $("#hero-dots");
  if (track && !track.dataset.ncInit) {
    track.dataset.ncInit = "1";
    var slides = track.children.length, idx = 0;
    var dots = dotsWrap ? dotsWrap.children : [];
    setInterval(function () {
      if (!document.body.contains(track)) { return; }
      idx = (idx + 1) % slides;
      track.style.transform = "translateX(-" + (idx * 100) + "%)";
      for (var i = 0; i < dots.length; i++) { dots[i].className = i === idx ? "on" : ""; }
    }, 4500);
    /* hero CTA buttons navigate */
    track.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hero-go]");
      if (b && typeof show === "function") { show(b.dataset.heroGo); }
    });
  }
  /* ticker: duplicate content for a seamless loop */
  var tick = $("#ticker-track");
  if (tick && !tick.dataset.ncInit) {
    tick.dataset.ncInit = "1";
    tick.innerHTML += tick.innerHTML;
  }
  /* promo countdown: ends Sunday midnight local, then rolls to next week */
  var promo = $("#promo-strip");
  if (promo && !promo.dataset.ncInit) {
    promo.dataset.ncInit = "1";
    promo.hidden = false;
    var ph = $("#promo-h"), pm = $("#promo-m"), ps = $("#promo-s");
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tickPromo() {
      var now = new Date();
      var end = new Date(now);
      end.setDate(now.getDate() + ((7 - now.getDay()) % 7));
      end.setHours(23, 59, 59, 999);
      var diff = Math.max(0, end - now);
      var h = Math.floor(diff / 3600000), m = Math.floor(diff % 3600000 / 60000), s = Math.floor(diff % 60000 / 1000);
      if (ph) { ph.textContent = pad(h); pm.textContent = pad(m); ps.textContent = pad(s); }
    }
    tickPromo();
    setInterval(tickPromo, 1000);
    var go = $("#promo-go");
    if (go) { go.addEventListener("click", function () { if (typeof show === "function") { show("me"); } }); }
  }
}

/* saved search alerts on boot */
function checkSavedSearchAlerts() {
  var ss = store.get("saved_searches", []);
  if (!ss.length) { return; }
  window.NM_DB.listProducts({}).then(function (all) {
    var total = 0;
    ss.forEach(function (s) {
      var matches = all.filter(function (p) {
        if (isHidden(p.id)) { return false; }
        if (s.category && p.category !== s.category) { return false; }
        return (!s.query || fuzzyMatch(p.title + " " + p.description, s.query)) && p.at > (s.createdAt || 0);
      });
      total += matches.length;
    });
    if (total > 0) {
      setTimeout(function () {
        toast(total === 1 ? "1 new item matches your saved search." : total + " new items match your saved searches. See Me tab.");
      }, 2500);
    }
  });
}
})();
