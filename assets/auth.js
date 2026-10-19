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
   only creates window.BB on pages that never load core.js.

   A third mode, for the demo only: when BB_CONFIG.DEV_BEARER is a non-empty
   string, Clerk is never loaded and that string is the bearer on every
   request. See the DEV_BEARER block below for why that is safe. */

(function () {
  "use strict";

  const cfg = window.BB_CONFIG || {};
  const root = (typeof BB === "object" && BB !== null) ? BB : (window.BB = window.BB || {});

  const SIGNIN = "signin.html";
  const APP = "app.html";
  const HOME = "index.html";

  /* Set only by the demo's site builder, into the demo's own config.js.
     Safe because of where it can go and what it can reach: the demo API
     accepts unsigned tokens and reaches only the throwaway database that is
     rebuilt with the demo, and production config never carries the key, so
     there is no deployment in which this string opens anything real. api.js
     needs no change: it asks token() for a bearer and gets this one. */
  const DEV_BEARER = typeof cfg.DEV_BEARER === "string" && cfg.DEV_BEARER.trim()
    ? cfg.DEV_BEARER.trim() : null;

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

  /* One setting from the dashboard, read off the instance environment that
     ClerkJS fetches on load and keeps: whether passkeys are on (passkeys()
     below). The accessor is marked unstable in v5 and was renamed in v6, so
     both names are tried. Keys inside user settings stay snake_case.
     How members sign in is the dashboard's to decide. Until 15 October 2026
     this file refused to start sign-in on an instance that accepted
     passwords; passwords and passkeys are allowed since the founder's
     decision of 10 October 2026, and docs/clerk.md has the settings. */
  function passkeyIsOn(clerk) {
    const env = clerk && (clerk.__unstable__environment || clerk.__internal_environment);
    const pk = env && env.userSettings && env.userSettings.attributes
      && env.userSettings.attributes.passkey;
    return Boolean(pk && pk.enabled);
  }

  /* Clerk's components are themed from our tokens, read at mount so the
     values already reflect the theme in effect. Variables only: the colours,
     so the card follows light and dark, and the font and corner radius. No
     elements and no layout options (15 October 2026). Whatever the dashboard
     switches on, a passkey button, a password field, "Use another method",
     the address being signed in with its edit link, Clerk draws as it
     designed it, and nothing here can hide or squeeze it. Old and new
     variable names are both set: v5 accepts either and deprecates one set. */
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
        /* Text on the primary button. Without this Clerk picks white, which
           on the dark theme's white accent is a blank bar. Both names: v5
           and the renamed v6 key. */
        colorTextOnPrimaryBackground: v("--surface"), colorPrimaryForeground: v("--surface"),
        colorBorder: v("--line-strong"),
        colorDanger: v("--danger"),
        borderRadius: v("--r"),
        fontFamily: v("--font-body"),
        fontFamilyButtons: v("--font-body")
      }
    };
  }

  let clerk = null;

  /* The demo is signed in from the first byte. A visit to signin.html has
     nothing to mount, so it goes where a signed-in visitor always goes. */
  const devReady = async () => {
    if (document.getElementById("signin")) {
      location.replace(abs(safeBack(new URLSearchParams(location.search).get("back"))));
      await new Promise(() => {});
    }
    return null;
  };

  const ready = DEV_BEARER ? devReady() : (async () => {
    const mount = document.getElementById("signin");
    try {
      clerk = await loadClerk();
      await clerk.load({ signInUrl: abs(SIGNIN) });
    } catch (e) {
      /* The error names hosts and config files, which is for us. A member
         needs to know whether it is their connection or ours. */
      console.error("BB.auth:", e);
      notice(navigator.onLine === false
        ? "No connection. Blackbook London needs a network to sign you in."
        : "Sign-in could not start. Try again in a moment.");
      throw e;
    }

    if (mount) {
      const params = new URLSearchParams(location.search);
      const back = abs(safeBack(params.get("back")));
      if (clerk.session) { location.replace(back); await new Promise(() => {}); }
      if (params.get("why") === "signedout") {
        notice("You were signed out. If this happens again straight after you sign in, "
          + "email privacy@blackbook.london.");
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
    /* Back after a sign out or an erasure can bring this page back from the
       browser's back/forward cache, exactly as it was left, the member's
       data on it. Loaded again instead, it runs the guard above, and with no
       session it goes to sign in. */
    addEventListener("pageshow", e => { if (e.persisted) location.reload(); });
    return clerk;
  })();
  ready.catch(() => {});

  /* Staff or not, decided by the API and by nothing on this side. There is
     no role flag in the token or the config to read, and one here would be a
     claim the API never made. GET /api/broker/queue is staff-only and answers
     a member with the same 404 an unregistered path gets, so a member learns
     nothing from the probe and neither does anyone reading this file. The
     answer is kept for the session; a failure that is not a 404 (offline,
     say) is not an answer, so the next call asks again. */
  let staff = null;
  const isStaff = () => {
    if (!staff) {
      staff = ready.then(() => root.api("/api/broker/queue")).then(() => true, e => {
        if (e && e.status === 404) return false;
        staff = null;
        return false;
      });
    }
    return staff;
  };

  /* Whether a session is to be expected before ClerkJS has said. Clerk keeps
     a cookie on our own domain, __client_uat (and a twin with a suffix on
     the name), holding the time of the last sign in, and 0 once signed out.
     It says a session was here, not that one still is, so it decides only
     whether boot.js draws a skeleton while ClerkJS loads, never whether
     anything from the API is drawn. The demo is signed in from the first
     byte. */
  const likely = () => Boolean(DEV_BEARER) || document.cookie.split(";")
    .some(c => /^\s*__client_uat(_[\w-]+)?=[1-9]\d*\s*$/.test(c));

  root.auth = {
    ready: () => ready,
    likely,
    signedIn: () => DEV_BEARER ? true : Boolean(clerk && clerk.session),
    isStaff,

    /* Asked for immediately before each request. The SDK refreshes the token
       as it nears expiry and keeps it in memory; we keep nothing. Resolves
       null when there is no session. */
    token: async () => {
      await ready;
      if (DEV_BEARER) return DEV_BEARER;
      return clerk.session ? clerk.session.getToken() : null;
    },

    /* Ends the Clerk session, then lands on signin.html. A reason, if given,
       becomes the line the sign-in page shows. The demo has no session to
       end, so it clears nothing and goes to the front door. */
    signOut: async why => {
      await ready;
      leaving = true;
      if (DEV_BEARER) { location.replace(abs(HOME)); return; }
      /* A sign out that fails (no signal, or Clerk down) is said, over the
         screen, so nobody walks away from a page they think is closed. */
      return clerk.signOut({ redirectUrl: signInUrl(why) }).catch(e => {
        leaving = false;
        notice("Could not finish signing you out. Check your connection, then reload this page.");
        throw e;
      });
    },

    /* A plain object, so screens never reach into the SDK's resources. */
    user: () => {
      if (DEV_BEARER) return { demo: true };
      const u = clerk && clerk.user;
      if (!u) return null;
      const email = u.primaryEmailAddress ? u.primaryEmailAddress.emailAddress : null;
      return { id: u.id, email, firstName: u.firstName || "", lastName: u.lastName || "" };
    },

    /* What Settings needs to offer a passkey: { count } of those already on
       the account, or null when there is nothing to offer. Null in the demo
       and on the harness (no Clerk), with nobody signed in, while passkeys
       are off in the dashboard, and in a browser that cannot make one. So
       the row appears on the first load after the founder turns them on. */
    passkeys: () => {
      if (DEV_BEARER || !clerk || !clerk.user || !passkeyIsOn(clerk)) return null;
      if (typeof window.PublicKeyCredential !== "function") return null;
      return { count: (clerk.user.passkeys || []).length };
    },

    /* Asks the browser to make a passkey and Clerk to keep it. Resolves true
       once Clerk has it, false if the member closed the prompt, and rejects
       on anything else.
       Clerk counts adding a passkey as a sensitive action: more than ten
       minutes after the member last proved who they are, its server refuses
       with session_reverification_required. Clerk's own account page then
       opens its "Verify it's you" window and tries again, and so does this,
       through the same call Clerk's components use. Closing that window is a
       cancel too. A failure the browser reports is wrapped by ClerkJS in an
       error with a code, so the codes for a cancelled or aborted prompt are
       checked as well as the browser's own names.
       Two failures that another tap cannot fix reject with `passkey` set, so
       Settings can say what will work (boot.js): "exists", a passkey for this
       account already on this device (Clerk's passkey_already_exists, the
       browser's InvalidStateError), and "reverify", when the "Verify it's
       you" window cannot be opened (the call is Clerk's internal one and may
       go in a release), after which every tap is refused the same way until
       the member signs in again. */
    addPasskey: async () => {
      await ready;
      if (!root.auth.passkeys()) throw new Error("Passkeys are not available here.");
      const cancelled = e => Boolean(e) && (e.name === "NotAllowedError" || e.name === "AbortError"
        || e.code === "passkey_registration_cancelled" || e.code === "passkey_operation_aborted");
      const exists = e => Boolean(e) && (e.name === "InvalidStateError"
        || e.code === "passkey_already_exists");
      const reverify = e => Boolean(e) && Array.isArray(e.errors)
        && e.errors.some(x => x && x.code === "session_reverification_required");
      const marked = (e, why) => Object.assign(new Error("Passkey not added: " + why), { passkey: why, cause: e });
      const make = () => clerk.user.createPasskey();
      try {
        await make();
      } catch (e) {
        if (cancelled(e)) return false;
        if (exists(e)) throw marked(e, "exists");
        if (!reverify(e)) throw e;
        if (typeof clerk.__internal_openReverification !== "function") throw marked(e, "reverify");
        const verified = await new Promise(resolve => {
          try {
            clerk.__internal_openReverification({
              afterVerification: () => resolve(true),
              afterVerificationCancelled: () => resolve(false),
              appearance: appearance()
            });
          } catch (opening) { resolve(null); }
        });
        if (verified === null) throw marked(e, "reverify");
        if (!verified) return false;
        try { await make(); } catch (again) {
          if (cancelled(again)) return false;
          if (exists(again)) throw marked(again, "exists");
          throw again;
        }
      }
      /* The count Settings draws is read off the user, so it is read again. */
      await clerk.user.reload().catch(() => {});
      return true;
    },

    toSignIn
  };

  /* On the app shell only (core.js declares BB.screens; signin.html has no
     screens and no session to probe with). Not before DOMContentLoaded: api.js
     loads after this file, and in the demo `ready` is already resolved, so a
     probe started here would run in the microtask gap between the two script
     tags and find no BB.api. The shell has already rendered by the time the
     probe answers, so a staff answer redraws it once to add the tab; a
     member's answer redraws nothing. */
  const shellLoaded = new Promise(resolve => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    } else resolve();
  });
  if (root.screens) {
    shellLoaded.then(() => ready).then(isStaff).then(ok => {
      if (ok && typeof render === "function") { root.staff = true; render(); }
    }).catch(() => {});
  }
})();
