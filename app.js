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
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
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
function cardPhotoHTML(p) {
  var c = catOf(p.category);
  if (p.images && p.images.length) {
    return '<div class="card-photo"><img src="' + esc(p.images[0]) + '" alt="" loading="lazy"></div>';
  }
  var initial = esc(p.title.trim().charAt(0).toUpperCase());
  return '<div class="card-photo" style="background:' + c.bg + '"><span>' + c.icon + '</span><span class="card-init">' + initial + '</span></div>';
}
function cardHTML(p) {
  var price = naira(p.price) + (p.priceSuffix ? " " + esc(p.priceSuffix) : "");
  return '<div class="card" data-id="' + esc(p.id) + '">' +
    cardPhotoHTML(p) +
    '<div class="card-body"><div class="card-price">' + price + '</div>' +
    '<div class="card-title">' + esc(p.title) + '</div>' +
    '<div class="card-meta">' + esc(p.location) + ' · ' + timeAgo(p.at) + '</div></div></div>';
}
function galleryHTML(p) {
  var c = catOf(p.category);
  var imgs = p.images || [];
  if (!imgs.length) {
    return '<div class="detail-photo" style="background:' + c.bg + '">' + c.icon + '</div>';
  }
  var slides = imgs.map(function (src) {
    return '<div class="gal-slide"><img src="' + esc(src) + '" alt="Item photo"></div>';
  }).join("");
  var dots = imgs.map(function (_, i) {
    return '<span class="' + (i === 0 ? "on" : "") + '"></span>';
  }).join("");
  return '<div class="gal" id="detail-gal">' + slides + '</div>' +
    (imgs.length > 1 ? '<div class="gal-dots" id="gal-dots">' + dots + '</div>' : '');
}
function bindGallery() {
  var gal = $("#detail-gal"), dots = $("#gal-dots");
  if (!gal || !dots) { return; }
  var spans = dots.querySelectorAll("span");
  gal.addEventListener("scroll", function () {
    var i = Math.round(gal.scrollLeft / gal.clientWidth);
    spans.forEach(function (sp, j) { sp.classList.toggle("on", j === i); });
  });
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
    var sellerAva = p.sellerAvatar
      ? '<div class="seller-ava"><img class="avatar-img" src="' + esc(p.sellerAvatar) + '" alt=""></div>'
      : '<div class="seller-ava">' + initial + '</div>';
    $("#detail-body").innerHTML =
      galleryHTML(p) +
      '<div class="detail-body"><div class="detail-price">' + price + '</div>' +
      '<div class="detail-title">' + esc(p.title) + '</div>' +
      '<div class="detail-meta">' + esc(p.location) + ' · ' + esc(p.condition) + ' · ' + timeAgo(p.at) + '</div>' +
      '<div class="detail-desc">' + esc(p.description) + '</div>' +
      '<div class="seller-card">' + sellerAva +
      '<div><div class="seller-name">' + esc(p.sellerName) + '</div>' +
      '<div class="seller-sub">Member of Nationwide Connect</div></div></div>' +
      '<div class="safety"><h4>Safety tips</h4><ul>' +
      '<li>Meet the seller in a public place.</li>' +
      '<li>Check the item well before you pay.</li>' +
      '<li>Never pay in advance for an item you have not seen.</li>' +
      '</ul></div></div>' +
      '<div class="chat-cta"><button id="detail-chat" class="btn-primary">Chat seller</button></div>';
    bindGallery();
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
var threadPoll = null;
function stopThreadPoll() {
  if (threadPoll) { clearInterval(threadPoll); threadPoll = null; }
}
function startThreadPoll() {
  stopThreadPoll();
  threadPoll = setInterval(function () {
    if (threadId) { renderThreadMsgs(); }
  }, 5000);
}
function renderInbox() {
  window.NM_DB.currentUser().then(function (u) {
    if (!u) { $("#inbox-list").innerHTML = ""; $("#inbox-empty").hidden = false; return; }
    window.NM_DB.listConversations().then(function (list) {
      var box = $("#inbox-list");
      $("#inbox-empty").hidden = list.length > 0;
      box.innerHTML = list.map(function (c) {
        var last = c.messages[c.messages.length - 1];
        var other = c.otherName || ((c.buyerPhone === u.phone) ? c.sellerName : c.buyerName);
        var ava = c.otherAvatar
          ? '<span class="convo-ava"><img class="avatar-img" src="' + esc(c.otherAvatar) + '" alt=""></span>'
          : '<span class="convo-ava">' + catOf(c.productCat).icon + '</span>';
        var unread = c.unreadFor === u.phone;
        return '<button class="convo" data-id="' + esc(c.id) + '">' + ava +
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
      var key = u ? (u.phone || u.id) : null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id && key && all[i].unreadFor === key) { delete all[i].unreadFor; }
      }
      localStorage.setItem("nm_convos", JSON.stringify(all));
    } catch (e) {}
    renderThreadMsgs();
    show("thread");
    startThreadPoll();
    updateBadge();
  });
  });
}
function renderThreadMsgs() {
  var box = $("#thread-msgs");
  Promise.all([getConvo(threadId), window.NM_DB.currentUser()]).then(function (res) {
    var c = res[0], u = res[1];
    if (!c || !box) { return; }
    box.innerHTML = c.messages.map(function (m) {
      var mine;
      if (m.mine !== undefined && m.mine !== null) {
        mine = !!m.mine;
      } else {
        /* local convo: "from" is conversation-relative */
        var iAmBuyer = !u || !c.buyerPhone || !u.phone || (c.buyerPhone === u.phone);
        mine = (m.from === "buyer") ? iAmBuyer : !iAmBuyer;
      }
      return '<div class="msg ' + (mine ? "me" : "them") + '">' + esc(m.text) +
        '<span class="msg-time">' + timeAgo(m.at) + '</span></div>';
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
      box.innerHTML = '<div class="me-card"><div class="me-name">You are not logged in</div>' +
        '<p class="me-phone">Log in to post items and chat with sellers.</p>' +
        '<div class="me-actions"><button class="btn-primary" id="me-login">Log in</button></div></div>';
      $("#me-login").addEventListener("click", function () { show("auth"); });
      return;
    }
    var initial = esc((u.name || "M").trim().charAt(0).toUpperCase());
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var html =
      '<div class="me-card">' +
        '<div class="me-avatar-wrap">' +
          '<div class="me-avatar" id="me-avatar" title="Change photo">' +
            (u.avatarUrl ? '<img class="avatar-img" src="' + esc(u.avatarUrl) + '" alt="">' : initial) +
          '</div>' +
          '<div><div class="me-name">' + esc(u.name) + '</div>' +
          (u.email ? '<div class="me-detail">' + esc(u.email) + '</div>' : "") +
          (u.phone ? '<div class="me-detail">' + esc(u.phone) + '</div>' : "") +
          (u.address ? '<div class="me-detail">' + esc(u.address) + '</div>' : "") +
          '<button class="me-avatar-btn" id="me-avatar-btn">Change photo</button></div>' +
        '</div>' +
        '<input id="me-avatar-file" type="file" accept="image/*" hidden>' +
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
      '<div class="section-head">My listings (<span id="me-count">0</span>)</div>' +
      '<div class="grid" id="me-grid"></div>' +
      '<div class="empty" id="me-empty" hidden>You have not posted anything yet.</div>';
    box.innerHTML = html;

    window.NM_DB.listProducts({ sellerId: u.id, seller: u.phone }).then(function (mine) {
      $("#me-count").textContent = mine.length;
      var g = $("#me-grid");
      g.innerHTML = mine.map(cardHTML).join("");
      bindCards(g);
      $("#me-empty").hidden = mine.length > 0;
    });

    $("#me-sell").addEventListener("click", function () { show("sell"); });
    $("#me-logout").addEventListener("click", function () {
      stopThreadPoll();
      threadId = null;
      window.NM_DB.signOut().then(function () {
        renderChips(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge(); refreshHeaderAvatars();
        show("auth");
        toast("Logged out. See you soon.");
      }).catch(function (e) { toast(e.message); });
    });

    $("#theme-toggle").addEventListener("change", function (e) {
      setTheme(e.target.checked ? "dark" : "light");
    });

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
      }).catch(function (e) {
        toast(e.message.indexOf("bucket") >= 0 || e.message.indexOf("Bucket") >= 0
          ? "Photo storage is being set up. Try again soon."
          : e.message);
      });
      fileInp.value = "";
    });

    $("#pf-save").addEventListener("click", function () {
      var name = $("#pf-name").value.trim();
      var phone = $("#pf-phone").value.trim();
      var address = $("#pf-address").value.trim();
      if (!name) { toast("Type your display name."); return; }
      if (phone && !validPhone(phone)) { toast("That phone number does not look right."); return; }
      window.NM_DB.updateProfile({ display_name: name, phone: phone, address: address }).then(function () {
        toast("Profile saved.");
        renderMe(); refreshHeaderAvatars();
      }).catch(function (e) { toast(e.message); });
    });
  });
}

/* ---------- theme ---------- */
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("nm_theme", t); } catch (e) {}
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) { meta.setAttribute("content", t === "dark" ? "#0f1311" : "#0a7a3d"); }
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
var sellPhotos = []; /* {blob, url} */
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
      renderPhotoThumbs();
    });
  });
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

/* ---------- auth ---------- */
function authError(msg) {
  var e = $("#auth-error");
  e.textContent = msg;
  e.hidden = false;
}
function clearAuthError() { $("#auth-error").hidden = true; }
function afterAuth(u) {
  clearAuthError();
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
    $("#tab-login").addEventListener("click", function () {
      $("#tab-login").classList.add("active"); $("#tab-signup").classList.remove("active");
      $("#form-login").hidden = false; $("#form-signup").hidden = true; clearAuthError();
    });
    $("#tab-signup").addEventListener("click", function () {
      $("#tab-signup").classList.add("active"); $("#tab-login").classList.remove("active");
      $("#form-signup").hidden = false; $("#form-login").hidden = true; clearAuthError();
    });

    $("#form-signup").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var name = $("#signup-name").value.trim();
      var email = $("#signup-email").value.trim();
      var phone = $("#signup-phone").value.trim();
      var pass = $("#signup-pass").value;
      if (!name) { authError("Tell us your name."); return; }
      if (!validEmail(email)) { authError("Type a valid email address."); return; }
      if (phone && !validPhone(phone)) { authError("That phone number does not look right. You can leave it empty."); return; }
      if (pass.length < 6) { authError("Password needs at least 6 characters."); return; }
      window.NM_DB.signUp(name, email, phone, pass).then(function (r) {
        if (r.confirmNotice) {
          toast(r.confirmNotice);
          $("#tab-login").classList.add("active"); $("#tab-signup").classList.remove("active");
          $("#form-login").hidden = false; $("#form-signup").hidden = true;
          $("#login-email").value = email;
        } else { afterAuth(r); }
      }).catch(function (err) { authError(err.message); });
    });

    $("#form-login").addEventListener("submit", function (e) {
      e.preventDefault(); clearAuthError();
      var email = $("#login-email").value.trim();
      var pass = $("#login-pass").value;
      if (!validEmail(email)) { authError("Type a valid email address."); return; }
      if (!pass) { authError("Type your password."); return; }
      window.NM_DB.signIn(email, pass).then(function (r) {
        afterAuth(r);
      }).catch(function (err) { authError(err.message); });
    });

    $("#google-btn").addEventListener("click", function () {
      clearAuthError();
      window.NM_DB.signInWithGoogle().catch(function (err) {
        authError(err.message);
      });
    });

    /* home search */
    var searchT = null;
    $("#home-search").addEventListener("input", function () {
      clearTimeout(searchT);
      searchT = setTimeout(renderHome, 250);
    });

    /* backs */
    $("#detail-back").addEventListener("click", function () { show("home"); renderHome(); });
    $("#thread-back").addEventListener("click", function () { stopThreadPoll(); threadId = null; show("inbox"); renderInbox(); });
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
        if (err.message.indexOf("STORAGE_BLOCKED:") === 0) {
          /* Listing saved; photos need the storage buckets. */
          $("#sell-form").reset();
          sellPhotos.forEach(function (ph) { URL.revokeObjectURL(ph.url); });
          sellPhotos = [];
          renderPhotoThumbs();
          renderHome();
          toast("Item is live. Photo storage is being set up, so it posted without photos.");
          if (err.productId) { openDetail(err.productId); }
          return;
        }
        errBox.textContent = err.message; errBox.hidden = false;
      }).then(function () { btn.disabled = false; });
    });

    /* boot: if logged in go home, else auth */
    /* OAuth error return (e.g. Google provider not enabled yet) */
    (function () {
      var err = null, desc = null;
      try {
        var h = window.location.hash || "";
        var q = window.location.search || "";
        var m = h.match(/error=([^&]+)/) || q.match(/error=([^&]+)/);
        var d = h.match(/error_description=([^&]+)/) || q.match(/error_description=([^&]+)/);
        if (m) { err = decodeURIComponent(m[1]); }
        if (d) { desc = decodeURIComponent(d[1].replace(/\+/g, " ")); }
      } catch (e) {}
      if (err) {
        var msg = /provider/i.test(err + " " + (desc || ""))
          ? "Google login is being set up. Use email for now."
          : "Login did not complete. Try again.";
        setTimeout(function () { authError(msg); }, 300);
        try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      }
    })();

    window.NM_DB.currentUser().then(function (u) {
      renderChips(); renderHome(); renderCatList(); renderInbox(); renderMe(); updateBadge(); refreshHeaderAvatars();
      show(u ? "home" : "auth");
    });
  });
});
})();
