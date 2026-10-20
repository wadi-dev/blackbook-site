/* Wakes the database before anyone is waiting on it.

   The API's database sleeps after five minutes without a query, and the
   first query after that costs about a second more. A page that loads this
   file is about to need it: the app, sign in, or the invitation door. So one
   GET to /api/warm goes out as soon as the API's address is known, while
   the rest of the page and ClerkJS are still arriving, and the database is
   awake, or nearly, by the time the first real request reaches it.

   The request carries nothing: no token, no cookie and no header of ours,
   so the browser sends it without a preflight, and its answer is never
   read. keepalive lets it finish if the page moves on first, to sign in
   say. Every failure is ignored, a refusal included (the API allows ten a
   minute from one address, an allowance of its own, apart from the join and
   inquiry doors' five): it is a head start, never a step anything waits on.

   On the sign-in page, where finding the code in an email can take a
   while, it goes once more after four minutes, so the database is still
   awake when the code is typed.

   On the invitation door it is not sent when the address carries a code
   (enter.html?code=..., a concierge link). join.js then checks the code as
   the page loads, which wakes the database itself, so a warm would add
   nothing. Without a code in the address it goes as anywhere else: the
   joiner is pasting one, and Continue is the next step.

   Never on index.html: a visitor to the front page is not about to need
   the database, and waking it for them would spend the free plan's hours on
   nobody. Load after config.js and, on enter.html, before join.js. */

(function () {
  "use strict";

  const base = String((window.BB_CONFIG || {}).API_BASE || "").replace(/\/+$/, "");
  /* The same rule api.js holds BB.api to: https, or plain http to this
     machine for the local harness. */
  if (!/^https:\/\/[^/]+$/.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) return;

  const warm = () => {
    try {
      fetch(base + "/api/warm", { mode: "cors", credentials: "omit", cache: "no-store", keepalive: true })
        .catch(() => {});
    } catch (e) { /* no fetch at all: nothing is lost */ }
  };

  /* The same test join.js makes before it checks a code from the address,
     read before join.js takes the code out of it. */
  if (document.getElementById("join-form")) {
    let code = "";
    try { code = new URLSearchParams(location.search).get("code") || ""; } catch (e) { /* no query */ }
    if (code.replace(/\s+/g, "")) return;
  }

  warm();
  if (document.getElementById("signin")) setTimeout(warm, 4 * 60 * 1000);
})();
