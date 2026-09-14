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

const VERSION = "2026-09-14.2";
const CACHE = "blackbook-shell-" + VERSION;

/* Every file the shell needs, and only those. Paths are relative to sw.js,
   which must sit at the site root so the scope covers every page.

   Deliberately absent:
   - console.html: a broker tool, not for a member's device.
   - enter.html and assets/join.js: the invitation door. An invitee opens it
     once, with a network, before they are a member. It is not something an
     installed app needs offline.
   - anything under assets/ that is fetched at runtime rather than loaded by
     the pages (there is nothing today; keep it that way or list it here).

   This list must match the script and stylesheet tags on app.html exactly,
   plus the pages a member can land on from the app. Any new script or
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
  "assets/config.js",
  "assets/data.js",
  "assets/core.js",
  "assets/auth.js",
  "assets/api.js",
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
  "assets/icons/apple-touch-icon-180.png"
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
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("blackbook-shell-") && name !== CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

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
    event.respondWith(
      fetch(request).catch(() =>
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
