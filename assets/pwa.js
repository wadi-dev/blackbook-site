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

  navigator.serviceWorker.register("sw.js").then(function (reg) {
    /* A deploy is a new sw.js. The browser looks for one on its own
       schedule, which on an installed app can mean a whole session on
       yesterday's shell; we look on every open and every return to the
       foreground. update() fetches sw.js past the HTTP cache. */
    function check() { reg.update().catch(function () {}); }
    check();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") check();
    });
  }).catch(function (err) {
    /* Registration failing means no offline shell, nothing more. The app
       still works from the network, so this is a console note, not a fault
       the member should see. */
    console.warn("Blackbook London: service worker not registered.", err);
  });

  /* When a new worker takes the page over (sw.js calls skipWaiting and
     clients.claim), the page is still running the files the old worker
     served. Reload once, so it runs the new ones. Not on the very first
     install, when the page already has the network's files, and never under
     somebody's fingers: at once only while no field has focus and no field
     holds anything the member typed. Otherwise the page is left as it is,
     stale but whole, and reloads the next time it is hidden with nothing
     typed in it; a page opened from it meanwhile comes through the new
     worker anyway. It used to reload when the focused field lost focus, but
     that blur is the member's own tap on the next field, Continue or Send,
     so the reload took what they had typed (20 October 2026). */
  var hadController = !!navigator.serviceWorker.controller;
  /* Set when a new worker takes over from one this page already had. */
  var stale = false;
  var asked = false;
  var reloading = false;
  /* Every field the member has typed in or changed on this page. */
  var changed = [];
  document.addEventListener("input", function (e) {
    if (changed.indexOf(e.target) < 0) changed.push(e.target);
  }, true);
  function typing() {
    var el = document.activeElement;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" || el.isContentEditable);
  }
  /* A field still on the page that the member changed and has not put back
     as the page drew it. */
  function holding() {
    changed = changed.filter(function (el) { return el.isConnected; });
    return changed.some(function (el) {
      if (el.isContentEditable) return true;
      if (el.type === "checkbox" || el.type === "radio") return el.checked !== el.defaultChecked;
      return el.value !== el.defaultValue;
    });
  }
  function reloadOnce() {
    if (reloading) return;
    reloading = true;
    location.reload();
  }
  /* Once, whichever of the two below asks first. */
  function reloadSoon() {
    if (asked) return;
    asked = true;
    if (!typing() && !holding()) { reloadOnce(); return; }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && !holding()) reloadOnce();
    });
  }
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController) { hadController = true; return; }
    stale = true;
    /* The fallback, for a worker that never sends the message below: a
       moment later, if the page is still here, reload it from this side. */
    setTimeout(reloadSoon, 1500);
  });
  /* A worker that has replaced an older shell tells each page that was open
     when it took over, once it has activated (sw.js, activate). The answer
     says this page decides for itself, so the worker does not reload it
     too. A page the takeover found with no worker already has the
     network's files, and stays as it is. */
  navigator.serviceWorker.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "bb-shell-updated") return;
    if (e.source) e.source.postMessage({ type: "bb-reloads-itself" });
    if (stale) reloadSoon();
  });
  if (navigator.serviceWorker.startMessages) navigator.serviceWorker.startMessages();

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

  /* Declared before the block below, which draws the bar while this file is
     still running. Declared after it, this line set the new bar back to
     null, and Dismiss then found nothing to remove. The same holds for the
     watcher that keeps the bar in place, and for the one waiting to put it
     up (below). */
  var bar = null;
  var watcher = null;
  var stopWaiting = null;

  if (wantsInstallUi && isIOS && !isStandalone && !dismissed()) {
    if (document.body) showBar("ios");
    else document.addEventListener("DOMContentLoaded", function () { showBar("ios"); });
  }

  /* ---- The bar ------------------------------------------------------------- */

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
    /* Under the tab bar (z-index 70) and the More sheet (80), so it can
       never cover either. */
    style(bar, {
      position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "65",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: "12px 16px",
      padding: "10px 16px",
      background: "var(--surface)", color: "var(--text)",
      borderTop: "1px solid var(--line)",
      fontSize: "13.5px", lineHeight: "1.5"
    });
    /* Above the home indicator. Set on its own, so a browser that refuses
       env() keeps the plain 10px above. */
    bar.style.paddingBottom = "calc(10px + env(safe-area-inset-bottom))";

    var text = document.createElement("span");
    style(text, { flex: "0 1 auto" });
    text.textContent = kind === "ios"
      ? "Add Blackbook London to your home screen: tap Share, then Add to Home Screen."
      : "Add Blackbook London to your home screen.";
    bar.appendChild(text);

    var actions = document.createElement("span");
    style(actions, { display: "inline-flex", gap: "8px", flex: "none" });

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

    /* Fixed to the bottom of the screen, out of the page's flow, so its
       arriving moves nothing on the page (20 October 2026). It used to go
       in above the page, which then had to be scrolled by its height to
       keep still, and that left the bar above the top of the screen, where
       nobody saw it. Being fixed, it would sit over whatever the screen has
       there, so it goes up only at a moment when it covers no control
       (below). */
    waitForRoom();
  }

  /* The bar waits out of the page until the tab bar is showing, which it
     is not before /api/me has answered nor at any point in onboarding,
     whose form the bar must not sit over. It also waits while the screen
     is still a skeleton, since the screen's own controls are about to take
     its place, and for a moment when no control lies under the bar's box.
     It looks again whenever the tab bar or the screen changes, the window
     is resized, or a scroll comes to rest. Each look is made just before a
     frame, so the bar goes up in the same frame as the screen it fits, or
     not at all. From the first look the page's end has room for the bar
     (place), so a scroll can always find it a clear place. Once up it stays
     until dismissed, and content scrolls under it as it does under the tab
     bar. On Home, for a member with nothing declared, the Manage button of
     What you can open sits where the bar would, so there it waits for a
     scroll. */
  function waitForRoom() {
    var tabbar = document.getElementById("tabbar");
    var screen = document.getElementById("screen");
    if (!tabbar || !screen) return;
    var queued = false;
    var rest = null;
    function soon() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; tryShow(); });
    }
    function rested() {
      clearTimeout(rest);
      rest = setTimeout(soon, 150);
    }
    var changes = new MutationObserver(soon);
    changes.observe(tabbar, { attributes: true, attributeFilter: ["hidden"] });
    changes.observe(screen, { childList: true });
    window.addEventListener("scroll", rested, { passive: true });
    window.addEventListener("resize", soon);
    stopWaiting = function () {
      changes.disconnect();
      window.removeEventListener("scroll", rested);
      window.removeEventListener("resize", soon);
      clearTimeout(rest);
      stopWaiting = null;
    };
    soon();
  }

  function tryShow() {
    if (!bar || bar.isConnected) return;
    var tabbar = document.getElementById("tabbar");
    if (!tabbar || tabbar.hidden) return;
    if (document.querySelector("#screen [data-skeleton]")) return;
    /* Put up and measured inside this one frame; taken down again before
       it paints if it would cover anything. */
    document.body.appendChild(bar);
    place();
    if (covers()) { bar.remove(); return; }
    stopWaiting();
    if (window.ResizeObserver) {
      watcher = new ResizeObserver(place);
      watcher.observe(bar);
      watcher.observe(tabbar);
    }
  }

  /* Whether the bar is on top of any part of a control: a point across the
     middle of where the two overlap finds the bar rather than the control.
     The tab bar and the More sheet stack above the bar, so their own
     buttons are never under it. */
  var CONTROLS = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
  function covers() {
    var b = bar.getBoundingClientRect();
    var els = document.querySelectorAll(CONTROLS);
    for (var i = 0; i < els.length; i++) {
      if (bar.contains(els[i])) continue;
      var r = els[i].getBoundingClientRect();
      var top = Math.max(r.top, b.top), bottom = Math.min(r.bottom, b.bottom);
      var left = Math.max(r.left, b.left), right = Math.min(r.right, b.right);
      if (bottom <= top || right <= left) continue;
      var y = (top + bottom) / 2;
      var xs = [0.1, 0.5, 0.9];
      for (var j = 0; j < xs.length; j++) {
        var hit = document.elementFromPoint(left + (right - left) * xs[j], y);
        if (hit && bar.contains(hit)) return true;
      }
    }
    return false;
  }

  /* On a phone the bar sits on top of the tab bar whenever the tab bar is
     showing, which it does only once /api/me has answered (core.js). It is
     lifted by a transform, which moves nothing else and is not a layout
     shift, by the tab bar's height less its safe area padding; the bar's own
     padding for the home indicator then sits behind the tab bar. The page
     gains the bar's height at its end, where adding space moves nothing,
     so its last line can still be scrolled clear of the bar. */
  function place() {
    if (!bar) return;
    var tabbar = document.getElementById("tabbar");
    var lift = 0;
    if (tabbar && tabbar.offsetHeight) {
      /* Rounded down, so a tab bar of fractional height overlaps the bar's
         padding rather than leaving a hairline of page between the two. */
      lift = Math.floor(tabbar.getBoundingClientRect().height -
        (parseFloat(getComputedStyle(tabbar).paddingBottom) || 0));
    }
    bar.style.transform = lift ? "translateY(" + -lift + "px)" : "";
    document.body.style.paddingBottom = bar.offsetHeight + "px";
  }

  function removeBar() {
    if (!bar) return;
    if (stopWaiting) stopWaiting();
    if (watcher) { watcher.disconnect(); watcher = null; }
    bar.remove();
    bar = null;
    document.body.style.paddingBottom = "";
  }
})();
