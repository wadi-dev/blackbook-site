/* The API client. One function, BB.api(path, options), over fetch.

   Every request goes to API_BASE and nowhere else, carries a Clerk session
   token fetched at the moment of sending, and is never cached. Nothing the
   API returns is written to storage by this file; screens receive parsed
   JSON and that is all.

   Load after config.js and auth.js. Attaches to the BB declared by core.js
   when that is present, otherwise to window.BB (see auth.js for why). */

(function () {
  "use strict";

  const cfg = window.BB_CONFIG || {};
  const root = (typeof BB === "object" && BB !== null) ? BB : (window.BB = window.BB || {});

  /* Every failure is one of these. `status` is the HTTP status, or 0 when the
     request never reached the server. `detail` is the server's own sentence
     when it sent one. `retryAfter` is seconds, set on 429 when the header was
     present and readable: the API is on another origin, so the browser only
     exposes it if the backend's CORS layer lists Retry-After in
     Access-Control-Expose-Headers. Until it does, this stays null. */
  class ApiError extends Error {
    constructor(status, detail, extra) {
      super(detail);
      this.name = "ApiError";
      this.status = status;
      this.detail = detail;
      this.retryAfter = null;
      Object.assign(this, extra);
    }
  }

  const FALLBACK = {
    0: "Could not reach Blackbook London. Check your connection and try again.",
    401: "You are signed out.",
    404: "Not found.",
    409: "That conflicts with something already there.",
    429: "Too many requests. Try again shortly."
  };

  /* A path is relative to API_BASE or it is refused. Resolving and then
     comparing origins catches every spelling of "somewhere else", including
     protocol-relative //host and a scheme in the middle of the string. */
  function resolve(path) {
    const base = String(cfg.API_BASE || "").replace(/\/+$/, "");
    /* Plain http is tolerated for a backend running on this machine and
       nowhere else: a token over http anywhere else is a token on the wire. */
    const ok = /^https:\/\/[^/]+$/.test(base) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base);
    if (!ok || /REPLACE/.test(base)) {
      throw new ApiError(0, "The API address is not configured. Set API_BASE in assets/config.js.");
    }
    if (typeof path !== "string" || !/^\/(?![\/\\])/.test(path)) {
      throw new ApiError(0, "BB.api only accepts a path relative to the API, such as /api/me.",
        { path });
    }
    const url = new URL(base + path);
    if (url.origin !== new URL(base).origin) {
      throw new ApiError(0, "BB.api refused a path that leaves the API.", { path });
    }
    return url.href;
  }

  /* Seconds or an HTTP date, per the header's definition. */
  function retryAfterSeconds(res) {
    const h = res.headers.get("Retry-After");
    if (!h) return null;
    if (/^\d+$/.test(h)) return Number(h);
    const when = Date.parse(h);
    return Number.isNaN(when) ? null : Math.max(0, Math.round((when - Date.now()) / 1000));
  }

  async function body(res) {
    const type = res.headers.get("Content-Type") || "";
    if (res.status === 204 || !type.includes("application/json")) return null;
    try { return await res.json(); } catch (e) { return null; }
  }

  /* FastAPI sends 422 detail as a list of field errors. Screens get one
     sentence; the list is kept on the error for anyone who wants it. */
  const detailOf = (data, status) =>
    data && typeof data.detail === "string" ? data.detail : (FALLBACK[status] || "Something went wrong.");

  let leaving = false;

  async function api(path, options) {
    const opts = options || {};
    const url = resolve(path);

    const headers = new Headers(opts.headers || {});
    headers.set("Accept", "application/json");

    /* Token is asked for here, immediately before the request, and goes out
       in the header and nowhere else. POST /api/join and GET /health are the
       two public routes: they pass auth: false. */
    if (opts.auth !== false) {
      if (!root.auth) throw new ApiError(0, "BB.auth is not loaded.");
      let token;
      try {
        token = await root.auth.token();
      } catch (e) {
        /* ready() rejected: Clerk did not load, or the instance was refused.
           Callers catch ApiError and nothing else, so the cause is wrapped. */
        throw new ApiError(0, e && e.message ? e.message : "Sign-in is not available.", { cause: e });
      }
      if (!token) return signedOut();
      headers.set("Authorization", "Bearer " + token);
    }

    let payload = opts.body;
    if (payload !== undefined && payload !== null && typeof payload !== "string"
        && !(payload instanceof FormData) && !(payload instanceof Blob)) {
      payload = JSON.stringify(payload);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    }

    let res;
    try {
      res = await fetch(url, {
        method: opts.method || (payload === undefined ? "GET" : "POST"),
        headers,
        body: payload,
        signal: opts.signal,
        cache: "no-store",
        /* Bearer, not cookies, so nothing credentialed crosses origins. A
           redirect is refused outright: the API never issues one, and a
           redirect is the one way a token could be carried to another host. */
        credentials: "omit",
        mode: "cors",
        redirect: "error"
      });
    } catch (e) {
      throw new ApiError(0, FALLBACK[0], { cause: e });
    }

    if (res.ok) return body(res);

    const data = await body(res);
    const detail = detailOf(data, res.status);

    if (res.status === 401) return signedOut();

    const err = new ApiError(res.status, detail,
      data && data.detail !== undefined ? { serverDetail: data.detail } : {});
    if (res.status === 429) err.retryAfter = retryAfterSeconds(res);
    throw err;
  }

  /* 401 means the backend does not accept this session, whatever the reason.
     The Clerk session is ended rather than kept, or signin.html would see a
     live session and bounce straight back to a page that 401s again. One
     redirect per page load: later calls in flight get the error and nothing
     more. */
  async function signedOut() {
    if (!leaving && root.auth) {
      leaving = true;
      root.auth.signOut("signedout").catch(() => {});
    }
    throw new ApiError(401, FALLBACK[401]);
  }

  root.api = api;
  root.ApiError = ApiError;
})();
