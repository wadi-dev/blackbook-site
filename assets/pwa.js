/* Blackbook London: progressive web app glue.

   Registers the service worker and offers whichever install route the
   platform has.

   Chromium (Android, desktop Chrome and Edge) fires beforeinstallprompt. We
   hold that event and fire it from our own control, so the browser's
   mini-infobar does not appear on its own schedule.

   iOS has no install prompt of any kind. Safari, and every other browser on
   iOS, cannot be asked programmatically to add a site to the home screen.
   The member has to tap Share and then Add to Home Screen themselves. So on
   iOS, when the page is not already running standalone, we show a short
   dismissible hint saying exactly that. Where the directive says "prompt",
   on iOS it means this hint.

   The install control and the hint are only rendered on a page whose script
   tag carries data-install (the app page). The public page and the legal
   pages still register the worker but say nothing: a stranger on the landing
   page is not a member and is not invited to install anything.

   Storage: one localStorage key recording that the member dismissed the hint.
   That is a preference, not data, and it is the only thing this file stores. */

(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  /* Captured now: currentScript is null once we are inside a callback. */
  var script = document.currentScript;
  var wantsInstallUi = !!(script && script.hasAttribute("data-install"));
  var DISMISS_KEY = "bb-install-hint-dismissed";

  navigator.serviceWorker.register("sw.js").catch(function (err) {
    /* Registration failing means no offline shell, nothing more. The app
       still works from the network, so this is a console note, not a fault
       the member should see. */
    console.warn("Blackbook London: service worker not registered.", err);
  });

  var isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    navigator.standalone === true;

  /* iPadOS reports itself as a Mac; the touch point count tells them apart. */
  var isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
  }

  /* ---- Chromium: hold the event, expose a control ---------------------- */

  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    document.dispatchEvent(new CustomEvent("bb:installable"));
    if (wantsInstallUi && !dismissed()) showBar("chromium");
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    removeBar();
  });

  /* Public surface for the app's own screens (a settings row, say):
     BBInstall.available tells them whether a control is worth showing and
     BBInstall.prompt() fires it. The bb:installable event on document fires
     when that changes from false to true. */
  window.BBInstall = {
    get available() { return deferredPrompt !== null; },
    get iosHint() { return isIOS && !isStandalone; },
    prompt: function () {
      if (!deferredPrompt) return Promise.resolve(null);
      var evt = deferredPrompt;
      deferredPrompt = null;
      evt.prompt();
      return evt.userChoice.then(function (choice) {
        if (choice.outcome !== "accepted") remember();
        removeBar();
        return choice.outcome;
      });
    }
  };

  /* ---- iOS: the hint ------------------------------------------------------ */

  if (wantsInstallUi && isIOS && !isStandalone && !dismissed()) {
    if (document.body) showBar("ios");
    else document.addEventListener("DOMContentLoaded", function () { showBar("ios"); });
  }

  /* ---- The bar ------------------------------------------------------------- */

  var bar = null;

  /* Styles are set through the CSSOM rather than a style attribute or an
     injected <style> element, so this file keeps working if style-src
     later loses 'unsafe-inline' the way script-src has. The colours are the
     app's own tokens, so the bar follows light and dark with the page.
     Buttons reuse the existing .btn classes from app.css. */
  function style(el, props) {
    for (var k in props) el.style[k] = props[k];
  }

  function button(label, cls, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn sm " + cls;
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function showBar(kind) {
    if (bar) return;

    bar = document.createElement("div");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Add to home screen");
    style(bar, {
      display: "flex", alignItems: "center", justifyContent: "center",
      flexWrap: "wrap", gap: "10px 14px",
      padding: "10px 16px",
      background: "var(--surface)", color: "var(--text)",
      borderBottom: "1px solid var(--line)",
      fontSize: "13.5px", lineHeight: "1.5"
    });

    var text = document.createElement("span");
    text.textContent = kind === "ios"
      ? "Add Blackbook London to your home screen: tap Share, then Add to Home Screen."
      : "Add Blackbook London to your home screen.";
    bar.appendChild(text);

    var actions = document.createElement("span");
    style(actions, { display: "inline-flex", gap: "8px" });

    if (kind === "chromium") {
      actions.appendChild(button("Install", "primary", function () {
        window.BBInstall.prompt();
      }));
    }
    actions.appendChild(button(kind === "ios" ? "Dismiss" : "Not now", "quiet", function () {
      remember();
      removeBar();
    }));

    bar.appendChild(actions);

    /* In document flow at the top of the body, above the sticky topbar, so
       it scrolls away with the page and never overlaps the tab bar. */
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function removeBar() {
    if (!bar) return;
    bar.remove();
    bar = null;
  }
})();
