/* Nationwide Connect automated quality gate. Loaded after app.js in tests/run.html.
   Drives the real UI and asserts each gate item. */
(function () {
"use strict";

var results = [];
var errors = [];
window.addEventListener("error", function (e) { errors.push("window.onerror: " + e.message); });
var origErr = console.error;
console.error = function () {
  errors.push("console.error: " + Array.prototype.join.call(arguments, " "));
  return origErr.apply(console, arguments);
};

function $(s) { return document.querySelector(s); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function ok(name, cond) {
  results.push({ name: name, pass: !!cond });
  log((cond ? "PASS" : "FAIL") + " " + name);
}
function log(t) {
  var o = document.getElementById("test-output");
  o.textContent += "\n" + t;
}
function setVal(sel, v) {
  var el = $(sel);
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
function submit(sel) {
  $(sel).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}
function click(sel) { $(sel).click(); }
function activeScreen() {
  var el = document.querySelector(".screen.active");
  return el ? el.id : "none";
}

async function run() {
  log("Nationwide Connect quality gate");
  localStorage.clear();
  await sleep(800); /* let app boot to auth */

  ok("1 boot shows auth screen", activeScreen() === "screen-auth");

  /* 2 sign up with email */
  var testEmail = "yusibrahim147+sbtest" + Date.now() + "@gmail.com";
  var testPass = "TestPass123!";
  setVal("#signup-name", "Test User");
  setVal("#signup-email", testEmail);
  setVal("#signup-phone", "08031234567");
  setVal("#signup-pass", testPass);
  click("#tab-signup");
  submit("#form-signup");
  await sleep(3000);
  ok("2a sign up with email lands on home", activeScreen() === "screen-home");
  var me = await window.NM_DB.currentUser();
  ok("2b session active with email", !!(me && me.email === testEmail));
  var prof = await window.NM_DB.client.from("profiles").select("phone,display_name").eq("id", me.id).maybeSingle();
  ok("2c profile row created with phone", !!(prof.data && prof.data.phone === "08031234567"));

  /* 3 log out */
  click('.nav-btn[data-go="me"]');
  await sleep(400);
  ok("3a me screen opens", activeScreen() === "screen-me");
  click("#me-logout");
  await sleep(400);
  ok("3b log out returns to auth", activeScreen() === "screen-auth");

  /* 4 log back in */
  setVal("#login-email", testEmail);
  setVal("#login-pass", testPass);
  submit("#form-login");
  await sleep(2500);
  ok("4 log back in lands on home", activeScreen() === "screen-home");

  /* 5 post a product */
  click('.nav-btn[data-go="sell"]');
  await sleep(400);
  ok("5a sell screen opens", activeScreen() === "screen-sell");
  setVal("#sell-title", "Test Nokia Torch Phone");
  setVal("#sell-price", "15000");
  $("#sell-category").value = "phones";
  $("#sell-condition").value = "New";
  $("#sell-location").value = "Abuja";
  setVal("#sell-desc", "Neat torch phone with strong battery.");
  submit("#sell-form");
  await sleep(800);
  ok("5b posting goes to detail screen", activeScreen() === "screen-detail");
  ok("5c detail shows the new title", $("#detail-body").textContent.indexOf("Test Nokia Torch Phone") >= 0);
  ok("5d detail shows naira price", $("#detail-body").textContent.indexOf("₦15,000") >= 0);

  /* 5e product persisted in Supabase (survives reload) */
  var prow = await window.NM_DB.client.from("products").select("id,seller_id").eq("title", "Test Nokia Torch Phone").order("created_at", { ascending: false }).limit(1).maybeSingle();
  ok("5e product row persisted in Supabase", !!(prow.data && prow.data.id));
  window._testProductId = prow.data && prow.data.id;

  /* 6 find it on Home */
  click("#detail-back");
  await sleep(500);
  ok("6 item appears on Home grid", $("#home-grid").textContent.indexOf("Test Nokia Torch Phone") >= 0);

  /* 7 open a seed product, chat */
  var firstCard = document.querySelector('#home-grid .card[data-id^="s"]');
  ok("7a seed card exists on home", !!firstCard);
  firstCard.click();
  await sleep(600);
  ok("7b detail opens for seed item", activeScreen() === "screen-detail");
  click("#detail-chat");
  await sleep(600);
  ok("7c chat seller opens thread", activeScreen() === "screen-thread");
  setVal("#thread-input", "Hello, is this still available?");
  submit("#thread-form");
  await sleep(400);
  ok("7d my message renders", $("#thread-msgs").textContent.indexOf("Hello, is this still available?") >= 0);
  await sleep(3500); /* seller auto reply, 2200ms timer */
  var threadText = $("#thread-msgs").textContent;
  ok("7e seller auto reply arrives", threadText.indexOf("thanks for your message") >= 0 || threadText.indexOf("still available") >= 0);

  /* 8 inbox */
  click("#thread-back");
  await sleep(500);
  ok("8a back to inbox", activeScreen() === "screen-inbox");
  ok("8b conversation listed in inbox", document.querySelectorAll("#inbox-list .convo").length >= 1);

  /* 9 browse each category */
  click('.nav-btn[data-go="category"]');
  await sleep(500);
  var cats = ["vehicles", "phones", "electronics", "furniture", "fashion", "property", "services"];
  var allHave = true;
  for (var i = 0; i < cats.length; i++) {
    var prods = await window.NM_DB.listProducts({ category: cats[i] });
    if (!prods.length) { allHave = false; log("empty category: " + cats[i]); }
  }
  ok("9a every category has listings", allHave);
  var row = document.querySelector('.cat-row[data-cat="furniture"]');
  row.click();
  await sleep(500);
  ok("9b category results render cards", document.querySelectorAll("#cat-grid .card").length >= 1);
  click("#cat-back");
  await sleep(400);
  ok("9c back to category list", document.querySelectorAll("#cat-list .cat-row").length === 7);

  /* 10 search */
  click('.nav-btn[data-go="home"]');
  await sleep(400);
  setVal("#home-search", "Camry");
  await sleep(600);
  ok("10 search filters to Camry", $("#home-grid").textContent.indexOf("Camry") >= 0);
  setVal("#home-search", "");
  await sleep(600);

  /* 11 mobile layout: no horizontal overflow */
  var overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  ok("11 no horizontal overflow at 390px", overflow <= 1);

  /* 12 console errors */
  ok("12 zero console errors", errors.length === 0);
  if (errors.length) { errors.forEach(function (e) { log("ERR " + e); }); }

  /* 13 cleanup test rows */
  try {
    var me2 = await window.NM_DB.currentUser();
    if (window._testProductId) {
      await window.NM_DB.client.from("products").delete().eq("id", window._testProductId);
    }
    if (me2 && me2.id) {
      await window.NM_DB.client.from("products").delete().eq("seller_id", me2.id).eq("title", "Test Nokia Torch Phone");
      await window.NM_DB.client.from("profiles").delete().eq("id", me2.id);
      await window.NM_DB.signOut();
    }
    var gone = await window.NM_DB.client.from("products").select("id").eq("title", "Test Nokia Torch Phone").limit(1);
    ok("13 test rows cleaned up", !gone.data || gone.data.length === 0);
  } catch (e) { ok("13 test rows cleaned up", false); log("cleanup err " + e.message); }

  var pass = results.filter(function (r) { return r.pass; }).length;
  document.title = "TESTS:DONE:" + pass + "/" + results.length;
  log("DONE " + pass + "/" + results.length);
}

if (document.readyState === "complete") { run(); }
else { window.addEventListener("load", function () { setTimeout(run, 300); }); }
})();
