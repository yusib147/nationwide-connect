// Premium expiry notifications — daily server-side check (2026-10-25).
// NOT a route (underscore prefix). Invoked by api/pay-manual.js when the
// Vercel Cron GET arrives (the Hobby plan caps this project at 12
// Serverless Functions and it is already at 12, so no new route file).
// The caller (pay-manual) has already verified the CRON_SECRET header.
//
// Finds profiles whose premium_until falls in the warning window and
// inserts real notification rows (kind "premium"), which the bell and
// notifications list render like any other stored notification:
//   - warning: premium_until within the next 7 days (not yet passed)
//   - expired: premium_until passed within the last 8 days
// Permanent gold (premium_until NULL) is never selected. Dedupe: exactly
// one notice per (user, notice kind, premium_until) — the premium_until
// value is stored in meta, and a repeat run finds the existing row and
// skips. When a user renews, premium_until changes, so the new term can
// earn its own warning later.
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}
/* Whole calendar days between two instants, in Africa/Lagos. */
function calDays(from, to) {
  function parts(d) {
    var s = d.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" }); // dd/mm/yyyy
    var p = s.split("/");
    return Date.UTC(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }
  return Math.round((parts(to) - parts(from)) / 864e5);
}

async function run(lib) {
  var now = new Date();
  var lo = new Date(now.getTime() - 8 * 864e5).toISOString();
  var hi = new Date(now.getTime() + 7 * 864e5).toISOString();
  var profiles = await lib.sb("profiles?select=id,premium_until&premium_until=not.is.null&premium_until=gt." + encodeURIComponent(lo) + "&premium_until=lt." + encodeURIComponent(hi) + "&limit=1000", {});
  var warned = 0, expired = 0, skipped = 0;
  var rows = profiles || [];
  for (var i = 0; i < rows.length; i++) {
    var p = rows[i];
    var until = new Date(p.premium_until);
    if (isNaN(until.getTime())) { skipped++; continue; }
    var isExpired = until <= now;
    var notice = isExpired ? "premium_expired" : "premium_expiry";
    var existing = await lib.sb("notifications?select=id,meta&user_id=eq." + p.id + "&kind=eq.premium&limit=100", {}).catch(function () { return null; });
    if (!existing) { skipped++; continue; }
    var dup = existing.some(function (n) {
      return n.meta && n.meta.notice === notice && n.meta.premium_until === p.premium_until;
    });
    if (dup) { skipped++; continue; }
    var title, body;
    if (isExpired) {
      title = "Your Premium has expired";
      body = "Your Premium ended on " + fmtDate(until) + ". Renew to get your gold badge and Premium benefits back.";
    } else {
      var days = calDays(now, until);
      if (days <= 0) {
        title = "Your Premium expires today";
        body = "Your Premium expires today, " + fmtDate(until) + ". Renew to keep your gold badge and Premium benefits.";
      } else {
        title = "Your Premium expires in " + days + (days === 1 ? " day" : " days");
        body = "Your Premium expires in " + days + (days === 1 ? " day" : " days") + ", on " + fmtDate(until) + ". Renew to keep your gold badge and Premium benefits.";
      }
    }
    try {
      await lib.sb("notifications", { method: "POST", body: JSON.stringify([{ user_id: p.id, kind: "premium", title: title, body: body, meta: { notice: notice, premium_until: p.premium_until } }]) });
      if (isExpired) expired++; else warned++;
    } catch (e) { skipped++; }
  }
  return { checked: rows.length, warned: warned, expired: expired, skipped: skipped };
}

module.exports = { run: run };
