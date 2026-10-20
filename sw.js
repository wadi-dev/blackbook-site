/* Blackbook London: service worker.

   Scope: the app shell only. This worker exists so the app opens from the
   home screen without a network, and for nothing else. It holds static files
   that are identical for every member. It never holds anything that came from
   the API or from Clerk, and it never answers a request for either.

   Why so narrow: a service worker cache is a file on disk that outlives the
   session and survives sign-out. On a shared or lost device, a member's
   introductions, asks and contact details sitting in that cache would be
   readable by whoever holds the phone, regardless of who is signed in. The
   only safe rule is that member data never passes through a cache at all, so
   the worker refuses to look at any request it cannot prove is a static
   shell file on this origin.

   Deploying: bump VERSION whenever a shell file changes. The pages already
   carry ?v= query strings on their asset links, but those do not reach this
   cache (matching ignores the query), so without a VERSION bump a returning
   member keeps the old files until the browser's own update check runs. */

"use strict";

const VERSION = "2026-10-20.2";
const CACHE = "blackbook-shell-" + VERSION;

/* Every file the shell needs, and only those. Paths are relative to sw.js,
   which must sit at the site root so the scope covers every page.

   Deliberately absent:
   - console.html: a broker tool, not for a member's device.
   - enter.html and assets/join.js: the invitation door. An invitee opens it
     once, with a network, before they are a member. It is not something an
     installed app needs offline.
   - inquire.html and assets/inquire.js: the inquiry door, for the same
     reason.
   - anything under assets/ that is fetched at runtime rather than loaded by
     the pages, unless it is listed here. One is: assets/vendor/d3.min.js,
     which the Network screen fetches when it first mounts (10 October
     2026), so the graph still draws offline.

   This list must match the script and stylesheet tags on app.html exactly,
   plus D3, plus the pages a member can land on from the app. Any new script or
   stylesheet the app page starts loading must be added here, or it is simply
   never cached and the app fails offline. That is the safe direction to fail
   in, but it is still a failure. */
const SHELL = [
  "./",
  "index.html",
  "app.html",
  "signin.html",
  "privacy.html",
  "terms.html",
  "offline.html",
  "manifest.json",
  "assets/app.css",
  "assets/landing.css",
  "assets/daylight.js",
  "assets/legal.js",
  "assets/config.js",
  "assets/warm.js",
  "assets/data.js",
  "assets/core.js",
  "assets/auth.js",
  "assets/api.js",
  "assets/store.js",
  "assets/vendor/d3.min.js",
  "assets/boot.js",
  "assets/pwa.js",
  "assets/screens/home.js",
  "assets/screens/network.js",
  "assets/screens/asks.js",
  "assets/screens/gives.js",
  "assets/screens/members.js",
  "assets/screens/introductions.js",
  "assets/screens/profile.js",
  "assets/screens/admin.js",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-512-maskable.png",
  "assets/icons/apple-touch-icon-180.png",
  "assets/favicon.svg",
  "favicon.ico"
];

const OFFLINE_PAGE = "offline.html";

/* Resolved once, so membership checks compare canonical URLs (no query, no
   fragment) rather than the relative strings above. */
const SHELL_URLS = new Set(SHELL.map((p) => new URL(p, self.location.href).href));

function shellKey(url) {
  return url.origin + url.pathname;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      /* cache: "reload" goes past the browser's HTTP cache, so a VERSION bump
         cannot precache a copy GitHub Pages' max-age (600s) is still holding.
         addAll is all-or-nothing on purpose: a typo in SHELL should fail the
         install loudly in DevTools rather than leave a shell with a hole in it
         that only shows up offline. */
      cache.addAll(SHELL.map((p) => new Request(p, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  /* True when an older shell cache was here, so this activation is an
     update. False on a first install, where every open page came from the
     network and already runs this version's files. */
  const updated = caches.keys().then((names) => {
    const old = names.filter((name) => name.startsWith("blackbook-shell-") && name !== CACHE);
    return Promise.all(old.map((name) => caches.delete(name))).then(() => old.length > 0);
  });
  /* The windows open before this worker claims them. On an update, each is
     running the files an older worker served it. */
  const open = self.clients.matchAll({ type: "window", includeUncontrolled: true });

  /* The cleanup and the claim, and nothing else. Activation used to wait on
     reloading the pages as well, but a page's navigation waits for this
     worker to finish activating, so the two waited on each other until
     Chrome's five minute event timeout gave up (20 October 2026). */
  event.waitUntil(updated.then(() => self.clients.claim()));

  navigating = new Set();
  Promise.all([updated, open]).then(([isUpdate, wins]) => {
    if (isUpdate && wins.length) afterActivation(() => refreshPages(wins));
    else navigating = null;
  }).catch(() => { navigating = null; });
});

/* Runs `fn` once this worker is activated, when a navigation it starts can
   be answered. */
function afterActivation(fn) {
  const me = self.registration.active;
  if (!me || me.state === "activated") { fn(); return; }
  me.addEventListener("statechange", function wait() {
    if (me.state === "activating") return;
    me.removeEventListener("statechange", wait);
    if (me.state === "activated") fn();
  });
}

/* The pages open when this worker took over must reload, so they run this
   version's files. Each is told first: pwa.js answers, and reloads itself
   when nobody is typing in it, so the worker leaves it be. A page that has
   not answered after RELOAD_GRACE_MS is running an older pwa.js, or none
   (offline.html), and the worker reloads it, with two exceptions.
   - A page with a reload of its own on the way: a navigation to its address
     has reached this worker since the pages were told. The pwa.js of 18
     September to 20 October 2026 reloads itself 1.5 seconds after the
     takeover, and on a slow network that reload is still in flight at the
     grace check; a second navigation would only cancel it and start over.
   - A page in front of the member, focused and visible, where they may be
     typing. It is looked at again every RECHECK_MS and reloaded once it is
     hidden or has lost focus. The same older pwa.js reloads such a page
     itself when its focused field loses focus, which no worker can stop;
     the worker at least does not do it sooner, in the middle of a word.
   A page that has reloaded is a new client with a new id, so no page is
   reloaded twice. The looking stops when the browser stops this worker for
   being idle; a page still waiting then loads the new files at its next
   navigation. */
const RELOAD_GRACE_MS = 3000;
const RECHECK_MS = 2000;
const SELF_RELOADING = new Set();
/* Page addresses navigated to since this worker activated, while there are
   pages it may still reload. Null otherwise. */
let navigating = null;

const bare = (href) => { const u = new URL(href); u.hash = ""; return u.href; };

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "bb-reloads-itself" && event.source) {
    SELF_RELOADING.add(event.source.id);
  }
});

function refreshPages(wins) {
  const waiting = new Set(wins.map((w) => w.id));
  wins.forEach((w) => w.postMessage({ type: "bb-shell-updated" }));
  const look = () => self.clients.matchAll({ type: "window" }).then((now) => {
    const here = new Set(now.map((w) => w.id));
    waiting.forEach((id) => { if (!here.has(id)) waiting.delete(id); });
    now.forEach((w) => {
      if (!waiting.has(w.id)) return;
      if (SELF_RELOADING.has(w.id) || navigating.has(bare(w.url))) { waiting.delete(w.id); return; }
      if (w.focused && w.visibilityState === "visible") return;
      waiting.delete(w.id);
      w.navigate(w.url).catch(() => {});
    });
    if (waiting.size) setTimeout(look, RECHECK_MS);
    else navigating = null;
  }).catch(() => { navigating = null; });
  setTimeout(look, RELOAD_GRACE_MS);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /* Only GET can be a shell file. Anything else is an action against the API
     and is none of this worker's business. */
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* First and decisive check: origin. The fetch event fires for every request
     a page in scope makes, including calls to the API and to Clerk, so this
     is the earliest point at which the worker can step aside. Returning
     without respondWith hands the request straight to the browser, untouched
     and unread. The URL's origin is the only thing inspected. */
  if (url.origin !== self.location.origin) return;

  /* Navigations: the network is the source of truth so a deploy is seen on
     the next open, the precached copy stands in when the network fails, and
     offline.html covers a page that was never cached. */
  if (request.mode === "navigate") {
    if (navigating) navigating.add(bare(url.href));
    /* Past the HTTP cache: the host serves pages with a ten minute max-age,
       and a launch inside that window would otherwise get the previous
       page. no-cache revalidates by ETag, so an unchanged page costs a 304. */
    event.respondWith(
      fetch(url.href, { cache: "no-cache", credentials: "same-origin" }).catch(() =>
        caches.open(CACHE).then((cache) =>
          cache.match(request, { ignoreSearch: true })
            .then((hit) => hit || cache.match(OFFLINE_PAGE))
        )
      )
    );
    return;
  }

  /* Everything else on this origin that is not in SHELL is left alone too.
     A same-origin request that is not a shell file has no reason to exist
     today, and if one appears later it must not be cached by accident. */
  if (!SHELL_URLS.has(shellKey(url))) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          /* "basic" is the type of a response that came from this origin.
             Anything else (opaque, cors, error) is never stored, even though
             the URL passed the shell check, because a redirect could have
             carried the request to an origin the check did not see. */
          if (response.ok && response.type === "basic") {
            cache.put(shellKey(url), response.clone());
          }
          return response;
        });
      })
    )
  );
});
