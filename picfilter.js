/* Nationwide Media Connect — pictures-only guard (owner order 2026-11-01).
   The website shows only products that have pictures. Wraps
   NM_DB.listProducts: a returned product must carry at least one image,
   except the signed-in user's OWN listings, so a seller can still see and
   fix their own listing from the Me page. Loaded after app.js; every caller
   reaches listProducts through window.NM_DB at call time, so the wrap
   covers home, category, search, seller shops and Me alike. */
(function () {
  "use strict";
  if (!window.NM_DB || typeof window.NM_DB.listProducts !== "function") return;
  if (window.NM_DB.__picFilterWrapped) return;
  var orig = window.NM_DB.listProducts;
  var myId = null;
  var myIdReady = null;
  function resolveMe() {
    if (!myIdReady) {
      var p = (typeof window.NM_DB.currentUser === "function")
        ? window.NM_DB.currentUser()
        : Promise.resolve(null);
      myIdReady = Promise.resolve(p).then(function (u) {
        myId = u && (u.id || u.user_id) ? String(u.id || u.user_id) : null;
        return myId;
      }, function () { myId = null; return null; });
    }
    return myIdReady;
  }
  function hasPic(p) { return !!(p && p.images && p.images.length > 0); }
  function isMine(p) {
    return !!(p && myId && p.sellerId && String(p.sellerId) === myId);
  }
  window.NM_DB.listProducts = function (filter) {
    return Promise.all([orig.call(window.NM_DB, filter), resolveMe()])
      .then(function (both) {
        var list = both[0] || [];
        return list.filter(function (p) { return hasPic(p) || isMine(p); });
      });
  };
  window.NM_DB.__picFilterWrapped = true;
})();
