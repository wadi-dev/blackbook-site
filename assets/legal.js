/* Blackbook London: the two controls on a legal page.

   Loaded as a file rather than written into the page, because the page's
   Content-Security-Policy allows no inline script, and that rule is worth
   more than the convenience of keeping this in the template. */
/* Two small things, and no framework for them.

   The button opens and closes every section at once, for a reader who wants
   the whole document rather than one clause.

   The print handler opens every section before the page is printed or saved
   as a PDF and puts it back afterwards, so a printed copy is the whole
   document rather than a list of headings. */
(function () {
  var secs = function () { return document.querySelectorAll("details.lp-sec"); };
  var btn = document.querySelector("[data-openall]");
  if (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-pressed") !== "true";
      secs().forEach(function (d) { d.open = open; });
      btn.setAttribute("aria-pressed", String(open));
      btn.textContent = open ? "Close every section" : "Open every section";
    });
  }
  var was = [];
  window.addEventListener("beforeprint", function () {
    was = [];
    secs().forEach(function (d) { was.push(d.open); d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    secs().forEach(function (d, i) { if (was.length) d.open = was[i]; });
  });
}());
