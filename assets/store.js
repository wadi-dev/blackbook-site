/* The data store. Screens read API answers through here rather than calling
   BB.api themselves, so one answer serves every screen that shows it.

   Memory only. Nothing here is written to localStorage, sessionStorage or
   the Cache API, for the reason sw.js gives: a member's data on disk
   outlives the session and survives sign-out. A reload starts from nothing.

   A key names one answer: "me", "asks", "member:<id>", "search:<query>".
   The part before the colon picks the definition, the part after is handed
   to it. define() says how a key is fetched, need() makes sure keys have
   data, peek() reads what is there without fetching.

   An answer is reused for 30 seconds. After that need() hands back what it
   has and fetches again in the background, and an answer that changed
   redraws the screen that needs it, once for however many land together.
   A response that set off before the last invalidate() of its key is
   dropped, so a read that crossed a write cannot put the old state back.
   A background redraw waits while a field in #screen has focus or holds
   text that was never saved; the data is kept, and the next render shows it.

   Load after api.js. Attaches to the BB declared by core.js. */

(function () {
  "use strict";

  const root = (typeof BB === "object" && BB !== null) ? BB : (window.BB = window.BB || {});

  const FRESH = 30000;

  const defs = new Map();      /* name -> { load, fresh } */
  const entries = new Map();   /* key -> { has, data, at, stale, gen, pending } */
  const writing = new Map();   /* write id -> its promise */

  const split = key => {
    const i = key.indexOf(":");
    return i === -1 ? [key, undefined] : [key.slice(0, i), key.slice(i + 1)];
  };

  /* A key nothing defines is a typo in a screen, so it throws rather than
     drawing an error box that looks like the network's fault. */
  function defOf(key) {
    const def = defs.get(split(key)[0]);
    if (!def) throw new Error("BB.store: nothing defines " + key);
    return def;
  }

  function entry(key) {
    let e = entries.get(key);
    if (!e) {
      e = { has: false, data: undefined, at: 0, stale: false, gen: 0, pending: null };
      entries.set(key, e);
    }
    return e;
  }

  /* `fresh` is how long an answer is reused before need() fetches it again. */
  function define(name, load, opts) {
    defs.set(name, { load, fresh: opts && opts.fresh !== undefined ? opts.fresh : FRESH });
  }

  /* One fetch per key at a time. `extra` reaches the definition alongside the
     key's argument (the reason on a staff read of a member). */
  function fetchKey(key, extra) {
    const def = defOf(key);
    const e = entry(key);
    if (e.pending) return e.pending;
    const gen = e.gen;
    const settle = (ok, value) => {
      /* Invalidated or cleared while out: this answer may predate a write,
         so whoever is waiting gets a newer one instead, the one already
         taken if there is one, otherwise the next. */
      if (entries.get(key) !== e || e.gen !== gen) {
        const now = entries.get(key);
        if (now && now.has && !now.stale && !now.pending) return now.data;
        return fetchKey(key, extra);
      }
      e.pending = null;
      if (!ok) throw value;
      const shown = e.has;
      const changed = !shown || JSON.stringify(value) !== JSON.stringify(e.data);
      Object.assign(e, { has: true, data: value, at: Date.now(), stale: false });
      if (shown && changed) redraw(key);
      return value;
    };
    e.pending = Promise.resolve()
      .then(() => def.load(split(key)[1], extra))
      .then(v => settle(true, v), err => settle(false, err));
    return e.pending;
  }

  /* Resolves with the data for every key, in order, once each has some. A
     key that has data resolves at once, and if that data is old it is
     fetched again behind the scenes; a failure there keeps what is shown. */
  function need(keys) {
    const list = [].concat(keys);
    list.forEach(defOf);
    return Promise.all(list.map(key => {
      const e = entry(key);
      if (!e.has) return fetchKey(key);
      if (e.stale || Date.now() - e.at >= defOf(key).fresh) fetchKey(key).catch(() => {});
      return e.data;
    }));
  }

  function peek(key) {
    const e = entries.get(key);
    return e && e.has ? e.data : undefined;
  }

  /* Marks keys stale and orphans any fetch already out for them. A bare name
     covers its colon keys too: invalidate("member") reaches every member. It
     fetches nothing itself; the next need() does. */
  function invalidate(keys) {
    [].concat(keys).forEach(k => entries.forEach((e, key) => {
      if (key !== k && !key.startsWith(k + ":")) return;
      e.stale = true;
      e.gen += 1;
      e.pending = null;
    }));
  }

  /* Forgets everything, for sign-out. */
  function clear() {
    entries.forEach(e => { e.gen += 1; e.pending = null; });
    entries.clear();
  }

  /* One member's card. Kept for the page session rather than 30 seconds,
     because every staff read of a card is an audit row on that member. */
  function member(id, reason) {
    const e = entries.get("member:" + id);
    if (e && e.has && !e.stale) return Promise.resolve(e.data);
    return fetchKey("member:" + id, reason);
  }

  /* ------------------------------------------------------------ writes --- */

  /* One write per id in flight. `send` makes the request and returns its
     promise. A second call while the first is out sends nothing and returns
     null, so a double tap is one request. Every button carrying
     data-id="<id>" is disabled meanwhile, including buttons a render draws
     while the write is out. The keys in opts.invalidate are invalidated when
     the server answers, whatever it answered, before the caller hears.

     opts.update, { key: (held, answer) => data }, puts a successful answer
     into what the store holds for each key, also before the caller hears, so
     every render after the write draws it rather than the data from before.
     A key with nothing held yet is left alone; the next need() fetches it. */
  function write(id, send, opts) {
    id = String(id);
    if (writing.has(id)) return null;
    const update = (opts && opts.update) || {};
    const p = Promise.resolve().then(send).then(answer => {
      Object.keys(update).forEach(key => {
        const e = entries.get(key);
        if (e && e.has) e.data = update[key](e.data, answer);
      });
      return answer;
    }).finally(() => {
      writing.delete(id);
      release(id);
      if (opts && opts.invalidate) invalidate(opts.invalidate);
    });
    writing.set(id, p);
    hold();
    return p;
  }

  const buttonsFor = id =>
    Array.from(document.querySelectorAll("button[data-id]")).filter(b => b.dataset.id === id);

  /* Only buttons this file disabled are enabled again, so a button a screen
     drew disabled for its own reasons stays that way. */
  function hold() {
    writing.forEach((_, id) => buttonsFor(id).forEach(b => {
      if (b.disabled) return;
      b.disabled = true;
      b.dataset.storeBusy = "";
    }));
    if (writing.size) watcher.observe(document.body, { childList: true, subtree: true });
  }

  function release(id) {
    buttonsFor(id).forEach(b => {
      if (!("storeBusy" in b.dataset)) return;
      b.disabled = false;
      delete b.dataset.storeBusy;
    });
    if (!writing.size) watcher.disconnect();
  }

  const watcher = new MutationObserver(hold);

  /* ----------------------------------------------------------- redraws --- */

  const landed = new Set();
  let queued = false;

  function redraw(key) {
    landed.add(key);
    if (queued) return;
    queued = true;
    queueMicrotask(flush);
  }

  /* Text that differs from what the field was drawn with has not been saved
     yet. The open sheet counts too: a render rebuilds its list and drops the
     focus a keyboard user has in it. */
  function busy() {
    const host = document.getElementById("screen");
    if (root.sheetOpen) return true;
    if (!host) return false;
    const a = document.activeElement;
    if (a && host.contains(a) && a.matches("input, textarea, select, [contenteditable]")) return true;
    return Array.from(host.querySelectorAll("input, textarea"))
      .some(f => f.value !== f.defaultValue);
  }

  function flush() {
    queued = false;
    if (!landed.size || typeof render !== "function") return;
    const fn = root.screens && (root.screens[root.state.screen] || root.screens.home);
    /* The keys it draws without (.wants, core.js) redraw it as well. */
    const needs = [].concat((fn && fn.needs) || [], (fn && fn.wants) || []);
    if (!needs.some(k => landed.has(k))) { landed.clear(); return; }
    if (busy()) return;
    landed.clear();
    render();
  }

  /* A redraw held for a focused field runs once focus has settled elsewhere.
     A timeout rather than a microtask, because during focusout the next
     field has not been focused yet. */
  document.addEventListener("focusout", () => { if (landed.size) setTimeout(flush, 0); });

  /* ------------------------------------------------- routes that exist --- */

  const get = path => () => root.api(path);
  define("me", get("/api/me"));
  define("introductions", get("/api/introductions"));
  define("asks", get("/api/asks"));
  define("gives", get("/api/gives"));
  define("categories", get("/api/categories"));
  define("ties", get("/api/ties"));
  define("tieRequests", get("/api/ties/requests"));
  define("suggestions", get("/api/suggestions"));
  define("blocks", get("/api/blocks"));
  define("network", get("/api/network"));
  define("member", (id, reason) => root.api("/api/members/" + encodeURIComponent(id)
    + (reason ? "?reason=" + encodeURIComponent(reason) : "")), { fresh: Infinity });
  /* search:<query string>, as URLSearchParams writes it: search:sector=x&city=y */
  define("search", query => root.api("/api/search?" + new URLSearchParams(query)));

  root.store = { define, need, peek, invalidate, write, member, clear };
})();
