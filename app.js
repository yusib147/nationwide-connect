/* Nationwide Connect app. Demo mode runs on localStorage until
   Supabase keys are set in config.js. */
(function () {
"use strict";

var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

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

/* ---------- categories ---------- */
var CATS = [
  { id: "vehicles", name: "Vehicles", icon: "🚗", bg: "#1f6feb" },
  { id: "phones", name: "Phones and Tablets", icon: "📱", bg: "#7c3aed" },
  { id: "electronics", name: "Electronics", icon: "📺", bg: "#0891b2" },
  { id: "furniture", name: "Furniture", icon: "🛋️", bg: "#b45309" },
  { id: "fashion", name: "Fashion", icon: "👗", bg: "#db2777" },
  { id: "property", name: "Property", icon: "🏠", bg: "#0d9488" },
  { id: "services", name: "Services", icon: "🔧", bg: "#4d7c0f" }
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
  { id: "s17", title: "3 Bedroom Flat in Serviced Estate", price: 3500000, priceSuffix: "per year", category: "property", description: "Spacious 3 bedroom flat with all rooms en suite. Estate has 24 hour power and security.", location: "Lekki, Lagos", condition: "New", sellerName: "Estate Homes", sellerPhone: "08167890123", at: Date.now() - 2 * H },
  { id: "s18", title: "Mini Flat, Tiled All Through", price: 1250000, priceSuffix: "per year", category: "property", description: "Clean mini flat with kitchen cabinets and water heater. Serene area.", location: "Yaba, Lagos", condition: "New", sellerName: "Lagos Lets", sellerPhone: "08178901234", at: Date.now() - 7 * H },
  { id: "s19", title: "Full Plot of Land, Dry Table", price: 25000000, category: "property", description: "Dry full plot with good title. Fenced and gated area, fast developing.", location: "Ibeju Lekki", condition: "New", sellerName: "Land Prime", sellerPhone: "08189012345", at: Date.now() - 1 * D },
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
}

/* ---------- cards ---------- */
function cardHTML(p) {
  var c = catOf(p.category);
  var price = naira(p.price) + (p.priceSuffix ? " " + esc(p.priceSuffix) : "");
  var initial = esc(p.title.trim().charAt(0).toUpperCase());
  return '<div class="card" data-id="' + esc(p.id) + '">' +
    '<div class="card-photo" style="background:' + c.bg + '"><span>' + c.icon + '</span><span class="card-init">' + initial + '</span></div>' +
    '<div class="card-body"><div class="card-price">' + price + '</div>' +
    '<div class="card-title">' + esc(p.title) + '</div>' +
    '<div class="card-meta">' + esc(p.location) + ' · ' + timeAgo(p.at) + '</div></div></div>';
}
function bindCards(root) {
  root.querySelectorAll(".card").forEach(function (el) {
    el.addEventListener("click", function () { openDetail(el.getAttribute("data-id")); });
  });
}

/* ---------- home ---------- */
var homeCat = "";
function renderChips() {
  var html = '<button class="chip' + (homeCat === "" ? " active" : "") + '" data-cat="">All</button>';
  CATS.forEach(function (c) {
    html += '<button class="chip' + (homeCat === c.id ? " active" : "") + '" data-cat="' + c.id + '">' + c.icon + " " + esc(c.name) + "</button>";
  });
  var box = $("#home-chips");
  box.innerHTML = html;
  box.querySelectorAll(".chip").forEach(function (b) {
    b.addEventListener("click", function () { homeCat = b.getAttribute("data-cat"); renderChips(); renderHome(); });
  });
}
function renderHome() {
  var q = $("#home-search").value.trim();
  window.NM_DB.listProducts({ category: homeCat, query: q }).then(function (list) {
    var g = $("#home-grid");
    g.innerHTML = list.map(cardHTML).join("");
    bindCards(g);
    $("#home-empty").hidden = list.length > 0;
    updateBadge();
  });
}

/* ---------- category screen ---------- */
var catSel = "";
function renderCatList() {
  window.NM_DB.listProducts({}).then(function (all) {
    var counts = {};
    all.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var box = $("#cat-list");
    box.innerHTML = CATS.map(function (c) {
      return '<button class="cat-row" data-cat="' + c.id + '"><span class="cat-ico">' + c.icon + '</span>' +
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
    var g = $("#cat-grid");
    g.innerHTML = list.length ? list.map(cardHTML).join("") : '<div class="empty">No items here yet. Be the first to post one.</div>';
    bindCards(g);
  });
}
function resetCatScreen() {
  catSel = "";
  $("#cat-results-head").hidden = true;
  $("#cat-grid").innerHTML = "";
  renderCatList();
}

/* ---------- detail ---------- */
var detailId = null;
function openDetail(id) {
  detailId = id;
  window.NM_DB.listProducts({}).then(function (all) {
    var p = null;
    for (var i = 0; i < all.length; i++) { if (all[i].id === id) { p = all[i]; } }
    if (!p) { toast("Item not found."); return; }
    var c = catOf(p.category);
    var price = naira(p.price) + (p.priceSuffix ? " " + esc(p.priceSuffix) : "");
    var initial = esc(p.sellerName.trim().charAt(0).toUpperCase());
    $("#detail-body").innerHTML =
      '<div class="detail-photo" style="background:' + c.bg + '">' + c.icon + '</div>' +
      '<div class="detail-body"><div class="detail-price">' + price + '</div>' +
      '<div class="detail-title">' + esc(p.title) + '</div>' +
      '<div class="detail-meta">' + esc(p.location) + ' · ' + esc(p.condition) + ' · ' + timeAgo(p.at) + '</div>' +
      '<div class="detail-desc">' + esc(p.description) + '</div>' +
      '<div class="seller-card"><div class="seller-ava">' + initial + '</div>' +
      '<div><div class="seller-name">' + esc(p.sellerName) + '</div>' +
      '<div class="seller-sub">Member of Nationwide Connect</div></div></div>' +
      '<div class="safety"><h4>Safety tips</h4><ul>' +
      '<li>Meet the seller in a public place.</li>' +
      '<li>Check the item well before you pay.</li>' +
      '<li>Never pay in advance for an item you have not seen.</li>' +
      '</ul></div></div>' +
      '<div class="chat-cta"><button id="detail-chat" class="btn-primary">Chat seller</button></div>';
    $("#detail-chat").addEventListener("click", function () {
      window.NM_DB.currentUser().then(function (u) {
        if (!u) { show("auth"); toast("Log in to chat with sellers."); return; }
        window.NM_DB.openConversation(p.id).then(function (cid) {
          openThread(cid);
        }).catch(function (e) { toast(e.message); });
      });
    });
    show("detail");
  });
}

/* ---------- inbox + thread ---------- */
var threadId = null;
function renderInbox() {
  window.NM_DB.currentUser().then(function (u) {
    if (!u) { $("#inbox-list").innerHTML = ""; $("#inbox-empty").hidden = false; return; }
    window.NM_DB.listConversations().then(function (list) {
      var box = $("#inbox-list");
      $("#inbox-empty").hidden = list.length > 0;
      box.innerHTML = list.map(function (c) {
        var last = c.messages[c.messages.length - 1];
        var other = c.otherName || ((c.buyerPhone === u.phone) ? c.sellerName : c.buyerName);
        var unread = c.unreadFor === u.phone;
        return '<button class="convo" data-id="' + esc(c.id) + '">' +
          '<span class="convo-ava">' + catOf(c.productCat).icon + '</span>' +
          '<span class="convo-main"><span class="convo-top"><span class="convo-name">' + esc(other) +
          (unread ? '<span class="unread-dot"></span>' : '') + '</span>' +
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
}
function getConvo(id) {
  return window.NM_DB.getConversation(id);
}
function openThread(id) {
  threadId = id;
  getConvo(id).then(function (c) {
    if (!c) { toast("Chat not found."); return; }
  window.NM_DB.currentUser().then(function (u) {
    var other = c.otherName || ((u && c.buyerPhone === u.phone) ? c.sellerName : c.buyerName);
    $("#thread-name").textContent = other;
    $("#thread-sub").textContent = naira(c.productPrice) + " · " + c.productTitle;
    /* mark read */
    try {
      var all = JSON.parse(localStorage.getItem("nm_convos") || "[]");
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id && u && all[i].unreadFor === u.phone) { delete all[i].unreadFor; }
      }
      localStorage.setItem("nm_convos", JSON.stringify(all));
    } catch (e) {}
    renderThreadMsgs();
    show("thread");
    updateBadge();
  });
  });
}
function renderThreadMsgs() {
  var box = $("#thread-msgs");
  getConvo(threadId).then(function (c) {
    if (!c) { box.innerHTML = ""; return; }
    box.innerHTML = c.messages.map(function (m) {
      var cls = m.from === "buyer" ? "me" : "them";
      /* "me" means the current viewer if they are the buyer; sellers see mirrored in demo */
      return '<div class="msg ' + cls + '">' + esc(m.text) + '<span class="msg-time">' + timeAgo(m.at) + '</span></div>';
    }).join("");
    box.scrollTop = box.scrollHeight;
  });
}
window.NM = window.NM || {};
window.NM.onExternalMessage = function (convoId) {
  /* seller auto reply arrived */
  try {
    var u = JSON.parse(localStorage.getItem("nm_session") || "null");
    var all = JSON.parse(localStorage.getItem("nm_convos") || "[]");
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === convoId && u && all[i].buyerPhone === u.phone) { all[i].unreadFor = u.phone; }
    }
    localStorage.setItem("nm_convos", JSON.stringify(all));
  } catch (e) {}
  if (convoId === threadId) { renderThreadMsgs(); }
  updateBadge();
};
function updateBadge() {
  window.NM_DB.currentUser().then(function (u) {
    var n = 0;
    if (u) {
      try {
        var all = JSON.parse(localStorage.getItem("nm_convos") || "[]");
        all.forEach(function (c) { if (c.unreadFor === u.phone) { n++; } });
      } catch (e) {}
    }
    var b = $("#nav-badge");
    b.hidden = n === 0;
    b.textContent = n;
  });
}

/* ---------- me ---------- */
function renderMe() {
  window.NM_DB.currentUser().then(function (u) {
    var box = $("#me-body");
    if (!u) {
      box.innerHTML = '<div class="me-card"><div class="me-name">You are not logged in</div>' +
        '<p class="me-phone">Log in to post items and chat with sellers.</p>' +
        '<div class="me-actions"><button class="btn-primary" id="me-login">Log in</button></div></div>';
      $("#me-login").addEventListener("click", function () { show("auth"); });
      return;
    }
    window.NM_DB.listProducts({ seller: u.phone }).then(function (mine) {
      var html = '<div class="me-card"><div class="me-name">' + esc(u.name) + '</div>' +
        '<div class="me-phone">' + esc(u.phone) + '</div>' +
        '<div class="me-actions"><button class="btn-ghost" id="me-sell">Sell an item</button>' +
        '<button class="btn-ghost btn-danger" id="me-logout">Log out</button></div></div>' +
        '<div class="section-head">My listings (' + mine.length + ')</div>' +
        '<div class="grid">' + (mine.length ? mine.map(cardHTML).join("") : "") + '</div>' +
        (mine.length ? "" : '<div class="empty">You have not posted anything yet.</div>');
      box.innerHTML = html;
      bindCards(box);
      $("#me-sell").addEventListener("click", function () { show("sell"); });
      $("#me-logout").addEventListener("click", function () {
        window.NM_DB.signOut().then(function () { show("auth"); toast("Logged out. See you soon."); });
      });
    });
  });
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
  renderChips(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge();
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
    $("#tab-login").addEventListener("click", function () {
      $("#tab-login").classList.add("active"); $("#tab-signup").classList.remove("active");
      $("#form-login").hidden = false; $("#form-signup").hidden = true; $("#form-otp").hidden = true; clearAuthError();
    });
    $("#tab-signup").addEventListener("click", function () {
      $("#tab-signup").classList.add("active"); $("#tab-login").classList.remove("active");
      $("#form-signup").hidden = false; $("#form-login").hidden = true; $("#form-otp").hidden = true; clearAuthError();
    });

    var otpCtx = null;

    $("#form-signup").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var name = $("#signup-name").value.trim();
      var phone = $("#signup-phone").value.trim();
      var pass = $("#signup-pass").value;
      if (!name) { authError("Tell us your name."); return; }
      if (!validPhone(phone)) { authError("Type a valid Nigerian phone number, like 0803 123 4567."); return; }
      if (pass.length < 4) { authError("Password needs at least 4 characters."); return; }
      window.NM_DB.signUp(name, phone, pass).then(function (r) {
        if (r.otpSent) {
          otpCtx = { phone: phone, name: name };
          $("#otp-phone-label").textContent = phone;
          $("#form-signup").hidden = true; $("#form-otp").hidden = false;
          toast("Code sent. Check your SMS.");
        } else { afterAuth(r); }
      }).catch(function (err) { authError(err.message); });
    });

    $("#form-login").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var phone = $("#login-phone").value.trim();
      var pass = $("#login-pass").value;
      if (!validPhone(phone)) { authError("Type a valid Nigerian phone number, like 0803 123 4567."); return; }
      if (!pass) { authError("Type your password."); return; }
      window.NM_DB.signIn(phone, pass).then(function (r) {
        if (r.otpSent) {
          otpCtx = { phone: phone, name: phone };
          $("#otp-phone-label").textContent = phone;
          $("#form-login").hidden = true; $("#form-otp").hidden = false;
          toast("Code sent. Check your SMS.");
        } else { afterAuth(r); }
      }).catch(function (err) { authError(err.message); });
    });

    $("#form-otp").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var code = $("#otp-code").value.trim();
      if (!otpCtx || code.length < 4) { authError("Type the code we sent you."); return; }
      window.NM_DB.verifyOtp(otpCtx.phone, code).then(function () {
        afterAuth({ phone: otpCtx.phone, name: otpCtx.name });
      }).catch(function (err) { authError(err.message); });
    });

    /* home search */
    var searchT = null;
    $("#home-search").addEventListener("input", function () {
      clearTimeout(searchT);
      searchT = setTimeout(renderHome, 250);
    });

    /* backs */
    $("#detail-back").addEventListener("click", function () { show("home"); renderHome(); });
    $("#thread-back").addEventListener("click", function () { show("inbox"); renderInbox(); });
    $("#sell-back").addEventListener("click", function () { show("home"); renderHome(); });
    $("#cat-back").addEventListener("click", resetCatScreen);

    /* thread form */
    $("#thread-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = $("#thread-input");
      var text = inp.value.trim();
      if (!text || !threadId) { return; }
      inp.value = "";
      window.NM_DB.sendMessage(threadId, text).then(renderThreadMsgs).catch(function (err) { toast(err.message); });
    });

    /* sell form */
    fillSellCats();
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
        description: $("#sell-desc").value.trim()
      };
      if (!data.title) { errBox.textContent = "Give your item a title."; errBox.hidden = false; return; }
      if (!data.price || Number(data.price) <= 0) { errBox.textContent = "Type a valid price in naira."; errBox.hidden = false; return; }
      if (!data.description) { errBox.textContent = "Describe your item in a few words."; errBox.hidden = false; return; }
      window.NM_DB.createProduct(data).then(function (p) {
        $("#sell-form").reset();
        renderHome();
        toast("Your item is live on Nationwide Connect.");
        openDetail(p.id);
      }).catch(function (err) {
        if (err.message.indexOf("Log in") >= 0) { show("auth"); }
        errBox.textContent = err.message; errBox.hidden = false;
      });
    });

    /* boot: if logged in go home, else auth */
    window.NM_DB.currentUser().then(function (u) {
      renderChips(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge();
      show(u ? "home" : "auth");
    });
  });
});
})();
