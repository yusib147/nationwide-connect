/* Nationwide Media Connect — load error states.
   Two promise chains in app.js had no .catch and left their loading UI stuck
   on a failed fetch:
   - he() (item detail): the skeleton shimmered forever. Wired via
     .catch(function(){window.NM_detailErr&&window.NM_detailErr(t)}).
   - Se() (inbox): the old catch revealed "No chats yet" on a network error,
     which reads as zero conversations rather than a failed load (same defect
     class as the home-feed item 81). Wired via .catch(window.NM_inboxErr).
   Both clear the stuck UI and show an honest error instead. If this file ever
   fails to load, the .catch(undefined) calls are safe no-ops (today's
   behavior), never a new throw. */
(function () {
  "use strict";
  window.NM_detailErr = function (id) {
    var b = document.querySelector("#detail-body");
    if (!b) return;
    b.innerHTML =
      '<div class="empty">' +
      "<h3>Couldn't load this item</h3>" +
      "<p>Check your connection and try again.</p>" +
      '<button class="btn-primary" id="detail-retry" style="margin-top:12px">Try again</button>' +
      "</div>";
    var r = document.getElementById("detail-retry");
    if (r) {
      r.addEventListener("click", function () {
        if (id && window.NM_openDetail) window.NM_openDetail(id);
        else if (window.NM_toast) window.NM_toast("Go back and open the item again.");
      });
    }
  };
  window.NM_inboxErr = function () {
    var t = document.querySelector("#inbox-list");
    if (t) {
      t.innerHTML =
        '<div class="empty">' +
        "<h3>Couldn't load chats</h3>" +
        "<p>Check your connection and try again.</p>" +
        "</div>";
    }
  };
})();
