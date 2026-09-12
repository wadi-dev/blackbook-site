/* Sign in. ClerkJS is loaded from the Frontend API host and asked for a
   session token each time a request needs one; our code holds a token for no
   longer than the request it is attached to, and writes nothing to storage.

   Two modes, decided by the page rather than its filename:
   - a page with a #signin element mounts Clerk's SignIn component there;
   - any other page (app.html) is guarded. No session means a redirect to
     signin.html, and the way back travels in ?back=.

   Load order on a guarded page: config.js, core.js, then this file. core.js
   declares BB as a top-level const, which is a lexical binding rather than a
   window property, so this file attaches to that binding when it exists and
   only creates window.BB on pages that never load core.js. */

(function () {
  "use strict";

  const cfg = window.BB_CONFIG || {};
  const root = (typeof BB === "object" && BB !== null) ? BB : (window.BB = window.BB || {});

  const SIGNIN = "signin.html";
  const APP = "app.html";

  const here = () => location.pathname.split("/").pop() || "index.html";
  const abs = rel => new URL(rel, location.href).href;

  /* A return target is a bare page name in this directory, with an optional
     query and hash. Anything else falls back to the app, so a crafted ?back=
     cannot turn sign-in into an open redirect. */
  const safeBack = s =>
    (typeof s === "string" && /^[A-Za-z0-9_-]+\.html(\?[^#\s]*)?(#\S*)?$/.test(s)) ? s : APP;

  let leaving = false;

  function signInUrl(why) {
    const u = new URL(SIGNIN, location.href);
    u.searchParams.set("back", here() + location.search + location.hash);
    if (why) u.searchParams.set("why", why);
    return u.href;
  }

  function toSignIn(why) {
    if (leaving) return;
    leaving = true;
    location.replace(signInUrl(why));
  }

  /* On signin.html the message has a home in the page. Elsewhere it covers
     the screen, because a guard that fails quietly is no guard. Styles are set
     through the CSSOM so the notice is whole on any page that loads this
     file, with or without app.css or a style-src that permits attributes. */
  function notice(text) {
    const slot = document.getElementById("signin-msg");
    if (slot) { slot.textContent = text; return; }
    let box = document.getElementById("auth-notice");
    if (!box) {
      box = document.createElement("div");
      box.id = "auth-notice";
      box.setAttribute("role", "alert");
      Object.assign(box.style, {
        position: "fixed", inset: "0", zIndex: "1000",
        display: "grid", placeItems: "center", padding: "24px",
        background: "var(--bg, #fff)", color: "var(--text, #000)",
        font: "15px/1.6 var(--font-body, system-ui, sans-serif)",
        textAlign: "center"
      });
      document.body.appendChild(box);
    }
    box.textContent = text;
  }

  function loadClerk() {
    return new Promise((resolve, reject) => {
      if (window.Clerk) { resolve(window.Clerk); return; }
      const host = String(cfg.CLERK_FRONTEND_API || "");
      const key = String(cfg.CLERK_PUBLISHABLE_KEY || "");
      if (!/^[a-z0-9.-]+$/i.test(host) || /REPLACE/.test(host)
          || !/^pk_(live|test)_/.test(key) || /REPLACE/.test(key)) {
        reject(new Error("Sign-in is not configured yet. Set CLERK_FRONTEND_API and "
          + "CLERK_PUBLISHABLE_KEY in assets/config.js."));
        return;
      }
      /* The documented way to load ClerkJS without a bundler. The browser
         build reads the publishable key off its own script tag when it runs,
         so the attribute has to be in place before the tag is appended. */
      const s = document.createElement("script");
      s.src = "https://" + host + "/npm/@clerk/clerk-js@5/dist/clerk.browser.js";
      s.async = true;
      s.crossOrigin = "anonymous";
      s.dataset.clerkPublishableKey = key;
      s.addEventListener("load", () => window.Clerk
        ? resolve(window.Clerk)
        : reject(new Error("ClerkJS loaded but did not define window.Clerk.")));
      s.addEventListener("error", () => reject(new Error(
        "Sign-in could not be loaded from " + host
        + ". Check the host in assets/config.js and the page's script-src.")));
      document.head.appendChild(s);
    });
  }

  /* ClerkJS fetches the instance environment on load and keeps it on the
     instance. The accessor is marked unstable in v5 and was renamed in v6, so
     both names are tried. Keys inside user settings stay snake_case.
     Returns true if passwords can sign someone in, false if not, null if the
     setting could not be read at all. */
  function passwordIsLive(clerk) {
    const env = clerk.__unstable__environment || clerk.__internal_environment;
    const pw = env && env.userSettings && env.userSettings.attributes
      && env.userSettings.attributes.password;
    if (!pw || typeof pw.enabled !== "boolean") return null;
    return Boolean(pw.enabled || pw.used_for_first_factor);
  }

  /* Clerk's components are themed from our tokens, read at mount so the
     values already reflect the theme in effect. Old and new variable names
     are both set: v5 accepts either and deprecates one set. */
  function appearance() {
    const css = getComputedStyle(document.documentElement);
    const v = name => css.getPropertyValue(name).trim();
    return {
      variables: {
        colorPrimary: v("--accent"),
        colorBackground: v("--surface"),
        colorText: v("--text"), colorForeground: v("--text"),
        colorTextSecondary: v("--muted"), colorMutedForeground: v("--muted"),
        colorInputBackground: v("--surface"), colorInput: v("--surface"),
        colorInputText: v("--text"), colorInputForeground: v("--text"),
        colorNeutral: v("--text"),
        colorBorder: v("--line-strong"),
        colorDanger: v("--danger"),
        borderRadius: v("--r"),
        fontFamily: v("--font-body"),
        fontFamilyButtons: v("--font-body")
      },
      layout: { logoPlacement: "none", shimmer: false },
      elements: {
        cardBox: { boxShadow: "none", border: "1px solid " + v("--line") },
        card: { boxShadow: "none" },
        /* Membership is by invitation. The join form is elsewhere, so the
           "Don't have an account? Sign up" row has nothing to point at. */
        footerAction: { display: "none" }
      }
    };
  }

  let clerk = null;

  const ready = (async () => {
    const mount = document.getElementById("signin");
    try {
      clerk = await loadClerk();
      await clerk.load({ signInUrl: abs(SIGNIN) });
    } catch (e) {
      notice(e.message);
      throw e;
    }

    const live = passwordIsLive(clerk);
    if (live === true) {
      notice("Sign-in is paused. This Clerk instance accepts passwords, which "
        + "Blackbook London does not allow. Turn Password off in the Clerk dashboard "
        + "(docs/clerk.md) and reload.");
      throw new Error("Clerk instance has password enabled as a first factor.");
    }
    if (live === null) {
      console.warn("BB.auth: Clerk user settings were not readable, so the "
        + "no-password check did not run. Check docs/clerk.md against the dashboard.");
    }

    if (mount) {
      const params = new URLSearchParams(location.search);
      const back = abs(safeBack(params.get("back")));
      if (clerk.session) { location.replace(back); await new Promise(() => {}); }
      if (params.get("why") === "signedout") {
        notice("Your session ended. Sign in again to continue.");
      }
      clerk.mountSignIn(mount, {
        routing: "hash",
        forceRedirectUrl: back,
        withSignUp: false,
        appearance: appearance()
      });
      return clerk;
    }

    /* The page is leaving. The promise stays pending so nothing downstream
       runs against a session that is not there. */
    if (!clerk.session) { toSignIn(); await new Promise(() => {}); }

    clerk.addListener(({ session }) => { if (!session) toSignIn("signedout"); });
    return clerk;
  })();
  ready.catch(() => {});

  root.auth = {
    ready: () => ready,
    signedIn: () => Boolean(clerk && clerk.session),

    /* Asked for immediately before each request. The SDK refreshes the token
       as it nears expiry and keeps it in memory; we keep nothing. Resolves
       null when there is no session. */
    token: async () => {
      await ready;
      return clerk.session ? clerk.session.getToken() : null;
    },

    /* Ends the Clerk session, then lands on signin.html. A reason, if given,
       becomes the line the sign-in page shows. */
    signOut: async why => {
      await ready;
      leaving = true;
      return clerk.signOut({ redirectUrl: signInUrl(why) });
    },

    /* A plain object, so screens never reach into the SDK's resources. */
    user: () => {
      const u = clerk && clerk.user;
      if (!u) return null;
      const email = u.primaryEmailAddress ? u.primaryEmailAddress.emailAddress : null;
      return { id: u.id, email, firstName: u.firstName || "", lastName: u.lastName || "" };
    },

    toSignIn
  };
})();
