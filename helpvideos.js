/* Nationwide Media Connect — helpvideos.js (2026-10-23).
   Customer help videos on the Me page, per integration-spec.md.
   Videos are hosted on Google Drive (folder "Nationwide Help Videos",
   anyone-with-link reader) and streamed through the Drive preview
   player. The MP4s NEVER enter the deploy tree (deploy.py arg limit).
   To swap a video: re-upload it to Drive and change only its id below. */
;(function () {
  "use strict";

  /* ============ CONFIG — Drive video ids (edit only this block) ============ */
  var VIDEOS = [
    { id: "1gCpB1IlElVHCI_M9VKiG-p4mIMoHWL7C", cat: "start",
      title: "Getting started",
      desc: "Open your account, verify your email and find your way around.",
      dur: "1:08" },
    { id: "1i3ycIWZCJwSstecKNaDA_WgTIXCgBc2p", cat: "buying",
      title: "Buying safely",
      desc: "Search, filter by area, chat the seller and inspect before you pay.",
      dur: "1:16" },
    { id: "1ueu1SMdkc4CNC7a9mXxYVfFPG_snIX-n", cat: "selling",
      title: "Post your first listing",
      desc: "Photos, price and description: your first listing live in about a minute.",
      dur: "1:21" },
    { id: "1CThDk7OoSBgqdiIay845vPlgN3GmpBcZ", cat: "selling",
      title: "Premium, Promote and bank transfer",
      desc: "What Premium and Promote do, the exact prices, and how paying by transfer works.",
      dur: "1:34" },
    { id: "1XwYqrI4JvCTRaGr8PGhIxnS_EwRSFVD3", cat: "selling",
      title: "Banner ads",
      desc: "Put your business on the home page for 2 weeks: pay, upload artwork, go live.",
      dur: "1:35" },
    { id: "1FlnlPZXLp9MwX5gT_u3Qefbn7NJE9UBF", cat: "earning",
      title: "Refer & Earn",
      desc: "Share your code and earn cash and credit when friends pay for Premium.",
      dur: "1:22" },
    { id: "1S3UzahSg19nDU3_jyiQYUUKGuxsbgsTz", cat: "selling",
      title: "Statuses and your shop",
      desc: "Post statuses, tag listings, and set up your shop page.",
      dur: "1:15" }
  ];
  var CHIPS = [
    { key: "all", label: "All" },
    { key: "start", label: "Start here" },
    { key: "buying", label: "Buying" },
    { key: "selling", label: "Selling" },
    { key: "earning", label: "Earning" }
  ];
  /* ========================== end CONFIG ========================== */

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function thumbUrl(id) { return "https://drive.google.com/thumbnail?id=" + id + "&sz=w400"; }
  function previewUrl(id) { return "https://drive.google.com/file/d/" + id + "/preview"; }
  function viewUrl(id) { return "https://drive.google.com/file/d/" + id + "/view"; }

  /* ---------------- player overlay ---------------- */
  var playerEl = null;
  function closePlayer() {
    if (!playerEl) return;
    playerEl.remove();
    playerEl = null;
  }
  function openPlayer(v) {
    closePlayer();
    playerEl = document.createElement("div");
    playerEl.className = "nm-hv-player";
    playerEl.innerHTML =
      '<div class="nm-hv-player-box">' +
        '<div class="nm-hv-player-top"><b>' + esc(v.title) + '</b>' +
        '<button type="button" class="nm-hv-player-x" aria-label="Close video">\u2715</button></div>' +
        '<div class="nm-hv-frame"><iframe src="' + previewUrl(v.id) + '" allow="autoplay; fullscreen" allowfullscreen title="' + esc(v.title) + '"></iframe></div>' +
        '<a class="nm-hv-open" href="' + viewUrl(v.id) + '" target="_blank" rel="noopener">Open in Google Drive</a>' +
      "</div>";
    document.body.appendChild(playerEl);
    playerEl.querySelector(".nm-hv-player-x").addEventListener("click", closePlayer);
    playerEl.addEventListener("click", function (e) { if (e.target === playerEl) closePlayer(); });
  }

  /* ---------------- help videos page ---------------- */
  var pageEl = null;
  function closePage() {
    closePlayer();
    if (pageEl) pageEl.remove();
    pageEl = null;
    try { document.body.style.overflow = ""; } catch (e) {}
  }
  function openPage() {
    closePage();
    pageEl = document.createElement("div");
    pageEl.className = "nm-hv-page";
    pageEl.id = "nm-hv-page";
    var chips = CHIPS.map(function (c, i) {
      return '<button type="button" class="nm-hv-chip' + (i === 0 ? " on" : "") + '" data-chip="' + c.key + '">' + esc(c.label) + "</button>";
    }).join("");
    var cards = VIDEOS.map(function (v, i) {
      return '<button type="button" class="nm-hv-card" data-cat="' + v.cat + '" data-idx="' + i + '">' +
        '<span class="nm-hv-thumb"><img src="' + thumbUrl(v.id) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
        '<span class="nm-hv-play">\u25B6</span><span class="nm-hv-dur">' + v.dur + "</span></span>" +
        '<span class="nm-hv-meta"><b>' + esc(v.title) + "</b><span>" + esc(v.desc) + "</span></span>" +
        "</button>";
    }).join("");
    pageEl.innerHTML =
      '<div class="nm-hv-wrap"><div class="nm-hv-top">' +
      '<button type="button" class="icon-btn" id="nm-hv-back" aria-label="Back">\u2039</button><h2>Help videos</h2></div>' +
      '<div class="nm-hv-body">' +
      '<p class="nm-hv-intro">Short guides that show you how everything works, step by step. Tap any video to watch it here.</p>' +
      '<div class="nm-hv-chips">' + chips + "</div>" +
      '<div class="nm-hv-list">' + cards + "</div>" +
      '<p class="nm-hv-foot">Still stuck? WhatsApp us on <b>09150951870</b> and a real person will help.</p>' +
      "</div></div>";
    document.body.appendChild(pageEl);
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    pageEl.querySelector("#nm-hv-back").addEventListener("click", closePage);
    pageEl.querySelectorAll(".nm-hv-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        pageEl.querySelectorAll(".nm-hv-chip").forEach(function (c2) { c2.classList.remove("on"); });
        chip.classList.add("on");
        var k = chip.getAttribute("data-chip");
        pageEl.querySelectorAll(".nm-hv-card").forEach(function (card) {
          card.style.display = (k === "all" || card.getAttribute("data-cat") === k) ? "" : "none";
        });
      });
    });
    pageEl.querySelectorAll(".nm-hv-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var v = VIDEOS[Number(card.getAttribute("data-idx"))];
        if (v) openPlayer(v);
      });
    });
  }
  window.NM_openHelpVideos = openPage;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (playerEl) closePlayer();
    else if (pageEl) closePage();
  });

  /* ---------------- Me menu row ----------------
     The Me menu (.nm-me-menu) is built by extras2.js; this module only
     ADDS its own row when the menu exists and the row is missing, the
     same late-loaded pattern as the other add-on modules. */
  function injectRow() {
    var menu = document.querySelector(".nm-me-menu");
    if (!menu || menu.querySelector("#nm-hv-row")) return;
    var row = document.createElement("button");
    row.type = "button";
    row.className = "nm-me-row";
    row.id = "nm-hv-row";
    row.innerHTML = '<span class="nm-me-ico">\uD83C\uDFAC</span>' +
      '<span class="nm-hv-rowtxt"><b>Help videos</b><span>Short guides: buying, selling, Premium, banners</span></span>' +
      '<span class="nm-me-chev">\u203A</span>';
    row.addEventListener("click", openPage);
    var anchor = null, sellRow = null;
    Array.prototype.forEach.call(menu.children, function (el) {
      var t = el.textContent || "";
      if (/Help & safety/.test(t)) anchor = el;
      if (/Sell an item/.test(t)) sellRow = el;
    });
    if (anchor && anchor.nextSibling) menu.insertBefore(row, anchor.nextSibling);
    else if (anchor) menu.appendChild(row);
    else if (sellRow) menu.insertBefore(row, sellRow);
    else menu.appendChild(row);
  }
  setInterval(injectRow, 1200);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectRow);
  else injectRow();
})();
