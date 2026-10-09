/* ==========================================================================
   BLACKBOOK: shell, router and shared helpers

   No framework and no build step, matching the conventions of the existing
   application so this can drop into appui/ rather than compete with it.
   Screens register themselves on BB.screens and are rendered into #screen.
   ========================================================================== */

const BB = { screens: {}, state: { screen: "home", detail: null } };

/* ------------------------------------------------------------- helpers --- */

const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;",
                               '"': "&quot;", "'": "&#39;" }[c]));

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

/* A member's name, with the founder mark where it applies.

   A solid pill after the name, not brackets around it. The brackets read as
   editorial annotation, which made the name itself look provisional, like a
   placeholder that had not been filled in yet. The pill borrows the one state
   the design system already has, inversion, and leaves the name alone.

   Inline rows (lists, tie rows) drop the pill entirely rather than
   shrinking it: at that size it turns into an unreadable black blob, and a
   mark of office repeated on every row of every list stops being a mark of
   anything. The full treatment lives where the full name does, on Home and on
   the profile. */
const nameOf = (m, inline) => inline || !m.founder
  ? `${esc(m.first)} ${esc(m.last)}`
  : `${esc(m.first)} ${esc(m.last)}<span class="fdr-pill">Founder</span>`;

const fullName = m => `${m.first} ${m.last}`;

/* Strength as filled dots, 1–7. */
const dots = n => `<span class="dots" role="img" aria-label="Strength ${n} of 7">` +
  [1,2,3,4,5,6,7].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("") + "</span>";

/* Person tile. Rounded square, never a circle. */
const tile = (m, size, extra) => {
  const r = size >= 80 ? " lg" : "";
  return `<div class="tile${r}${extra ? " " + extra : ""}" aria-hidden="true" ` +
    `style="width:${size}px;height:${size}px;font-size:${Math.max(11, Math.round(size * 0.30))}px">` +
    `${esc(m.initials)}</div>`;
};

let toastTimer;
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = el("div", "toast"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ------------------------------------------------------------ chrome ----- */

const NAV = [
  ["home", "Home"], ["network", "Network"], ["asks", "Asks"], ["gives", "Gives"],
  ["members", "Members"], ["introductions", "Introductions"]
];
/* Screens still drawn from the mock in data.js, so not shown beside live
   data (D2): Members and Search until M6, Asks until M8. They are left out
   of the bar, the tab bar and the topbar, and render() draws Home for a link
   that names one. */
const HIDDEN = ["members", "search", "asks"];
const shown = list => list.filter(([k]) => !HIDDEN.includes(k));
/* Admin is not in NAV. It is added at the far right of the topbar, and at
   the foot of the More sheet on a phone, once the API has answered that the
   caller is staff (BB.auth.isStaff sets BB.staff), so a member's chrome never
   carries the word; the screen itself asks the API again. */
const ADMIN_NAV = ["admin", "Admin"];
const withAdmin = list => BB.staff === true ? list.concat([ADMIN_NAV]) : list;

const ICON = {
  cog: '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/>',
  back: '<path d="M11 4L5 10l6 6"/>',

  /* Tab-bar icons. Drawn to the same 20-unit box and 1.5 stroke as the two
     above. Members and More are built from rounded squares on purpose, it is
     the shape people are drawn as everywhere else in the product. */
  home:    '<path d="M3.4 8.5 10 3.2l6.6 5.3V16a1.2 1.2 0 0 1-1.2 1.2H4.6A1.2 1.2 0 0 1 3.4 16z"/>',
  asks:    '<path d="M16.8 12.1a1.8 1.8 0 0 1-1.8 1.8H7.7L4 16.8V5.7a1.8 1.8 0 0 1 1.8-1.8h9.2a1.8 1.8 0 0 1 1.8 1.8z"/>',
  members: '<rect x="2.4" y="5.4" width="7.6" height="7.6" rx="2.3"/><rect x="10" y="7" width="7.6" height="7.6" rx="2.3"/>',
  intros:  '<path d="M2.8 6.6h6M6.8 4.6l2 2-2 2"/><path d="M17.2 13.4h-6M13.2 11.4l-2 2 2 2"/>',
  more:    '<rect x="3.1" y="3.1" width="5.7" height="5.7" rx="1.8"/><rect x="11.2" y="3.1" width="5.7" height="5.7" rx="1.8"/><rect x="3.1" y="11.2" width="5.7" height="5.7" rx="1.8"/><rect x="11.2" y="11.2" width="5.7" height="5.7" rx="1.8"/>'
};

/* The bottom bar, on mobile.

   Seven destinations do not fit across 375px, five is the width at which a
   label is still readable. The split is by frequency, not importance: Home,
   Asks, Members and Introductions are the daily loop; Network is maintenance,
   Gives is set-and-forget, Settings is rare. Those three sit behind More. */

const TABS = [
  ["home", "Home", "home"], ["asks", "Asks", "asks"], ["members", "Members", "members"],
  ["introductions", "Intros", "intros"], ["more", "More", "more"]
];
const SHEET = [
  ["network", "Network"], ["gives", "Gives"], ["settings", "Settings"]
];
const svg = (paths, size) =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" ` +
  `stroke-linecap="round" stroke-linejoin="round"${size ? ` style="width:${size}px;height:${size}px"` : ""}>${paths}</svg>`;

function renderChrome() {
  /* Until /api/me has answered that this member has been through the
     onboarding screen, the chrome leads nowhere: the wordmark, and once the
     answer is in, Sign out (boot.js). No tab bar and no More sheet, so there
     is nothing to tap past it. See render(). */
  const me = BB.store.peek("me");
  const tabbar = document.getElementById("tabbar");
  if (!me || me.onboarded === false) {
    document.getElementById("topbar").innerHTML = `
      <div class="topbar-inner">
        <span class="wordmark">Blackbook<span class="geo">(London)</span></span>
        <span class="grow"></span>
        ${me ? '<button class="btn sm" data-sign-out>Sign out</button>' : ""}
      </div>`;
    tabbar.innerHTML = "";
    tabbar.hidden = true;
    document.querySelector("#sheet .sheet-list").innerHTML = "";
    return;
  }
  tabbar.hidden = false;

  /* Requests waiting on this member's answer, counted from whatever the
     store holds. Never fetched here, so the badge never holds up a render;
     boot.js asks for the list behind the first one. */
  const waiting = (BB.store.peek("introductions") || [])
    .filter(i => i.side === "target" && i.state === "requested").length;

  document.getElementById("topbar").innerHTML = `
    <div class="topbar-inner">
      <span class="wordmark">Blackbook<span class="geo">(London)</span></span>
      <nav class="nav" aria-label="Main">
        ${withAdmin(shown(NAV)).map(([k, label]) => {
          const n = k === "introductions" ? waiting : 0;
          return `<button data-go="${k}" aria-current="${BB.state.screen === k}">${label}` +
            (n ? `<span class="count">${n}</span>` : "") + `</button>`;
        }).join("")}
      </nav>
      ${HIDDEN.includes("search") ? "" : `<button class="icon-btn" data-go="search" title="Search" aria-label="Search"
        aria-current="${BB.state.screen === "search"}">${svg(ICON.search)}</button>`}
      <button class="icon-btn" data-go="settings" title="Settings" aria-label="Settings">${svg(ICON.cog)}</button>
    </div>`;
  /* Wired here, where the bar is drawn, and nowhere else: render() returns
     early while a screen loads or fails, and wire() is not reached then. */
  document.querySelectorAll(".topbar [data-go]").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go)));

  const sheet = withAdmin(SHEET);
  const onSheet = sheet.some(([k]) => k === BB.state.screen);

  document.getElementById("tabbar").innerHTML = shown(TABS).map(([k, label, icon]) => {
    const current = k === "more" ? onSheet : BB.state.screen === k;
    const n = k === "introductions" ? waiting : 0;
    return `<button ${k === "more" ? 'data-sheet="open"' : `data-go="${k}"`}
      aria-current="${current}"${k === "more" ? ` aria-expanded="${BB.sheetOpen === true}"` : ""}>
      ${svg(ICON[icon])}<span class="lab">${label}</span>` +
      (n ? `<span class="count">${n}</span>` : "") + `</button>`;
  }).join("");

  document.querySelector("#sheet .sheet-list").innerHTML = sheet.map(([k, label]) =>
    `<button class="item" data-go="${k}" aria-current="${BB.state.screen === k}">
      <span class="grow">${label}</span></button>`).join("");
}

/* While an overlay is up, everything behind it is inert: not focusable, not
   read by a screen reader, not clickable. Without this, tabbing out of the
   sheet or a profile walks into content the reader cannot see, which is worse
   than a dead end because nothing tells you it has happened. */
function setBehindInert(on) {
  ["topbar", "screen", "tabbar"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (on) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  });
}

/* Focus has to come back where it started, or a keyboard user is dropped at
   the top of the document every time they close something. */
let focusReturn = null;
const rememberFocus = () => { focusReturn = document.activeElement; };
const restoreFocus = () => {
  if (focusReturn && document.contains(focusReturn)) focusReturn.focus();
  focusReturn = null;
};

/* The More sheet. */

function setSheet(open) {
  if (open && !BB.sheetOpen) rememberFocus();
  BB.sheetOpen = open;
  const s = document.getElementById("sheet");
  s.classList.toggle("open", open);
  s.hidden = !open;
  /* On the root and not the body: html carries overflow-x: clip, and an
     html whose overflow is not visible stops passing the body's overflow
     to the viewport, so a lock on body would not hold the page. It would
     make body a scroll container of its own instead, and the sticky top
     bar would stick inside that and leave the screen. */
  document.documentElement.classList.toggle("no-scroll", open);
  /* The tab bar holds the More button itself, so it is inerted after focus has
     already moved into the sheet. */
  setBehindInert(open);
  const more = document.querySelector('.tabbar [data-sheet]');
  if (more) more.setAttribute("aria-expanded", String(open));
  if (!open) restoreFocus();
  if (open) {
    const first = s.querySelector(".item");
    if (first) first.focus();
  }
}

/* -------------------------------------------------------------- router --- */

function go(screen) {
  /* A profile can still be open when navigation happens. It is appended to the
     body rather than to #screen, so it survives a render, leaving a dead
     overlay on top and the body permanently scroll-locked. Tear it down here
     rather than trusting every caller to close it first. */
  const open = document.getElementById("detail");
  if (open) {
    open.remove();
    document.documentElement.classList.remove("no-scroll");
    document.removeEventListener("keydown", escClose);
    setBehindInert(false);
    focusReturn = null;          /* going elsewhere, so do not restore */
    BB.trail = [];
  }

  BB.state.screen = screen;
  BB.state.detail = null;
  if (BB.sheetOpen) setSheet(false);
  render();
  window.scrollTo(0, 0);
}

/* A screen that declares .needs, a list of store keys, is drawn once the
   store holds data for every one of them. Until then #screen carries the
   loading line, and if a fetch fails, the error box with Try again (boot.js
   answers [data-store-retry] by rendering again). Screens without .needs
   draw at once, as they always have.

   A screen can name keys in .wants as well, for data that only part of it
   shows. It draws at once without them, and again when they land; until
   then its element marked data-wants holds its own loading line, and if a
   fetch fails, that element alone gets the error box. So the Network graph
   failing to load leaves the invitation under it in place.

   Each render takes a number, so a fetch that lands after the member has
   moved on, or after a later render has drawn, redraws nothing.

   A screen that declares .mount is handed #screen once its markup is in,
   for what a string of HTML cannot do: the Network graph lays itself out
   and takes its gestures there.

   A screen can name one part of itself in .keep, which a render of the same
   screen leaves where it is (keepPart, below).

   Before any of that comes the onboarding gate (8 October 2026). Nothing is
   drawn until /api/me has answered, and while it answers onboarded false
   the onboarding screen (home.js) is drawn in place of whatever was asked
   for: a tab, a link, a hash and a shortcut all arrive here. Once it answers
   true, the gate opens on Home. An answer with no onboarded field at all,
   from an API older than the gate, opens it, so nobody is held on a screen
   that API cannot take. */
let renders = 0;

/* A 404 body differs by route, so it is never shown here. */
function cannotLoad(err) {
  const why = err && err.status !== 404 && err.detail ? err.detail : "Try again in a moment.";
  return `<div class="empty" role="alert">
          <b>Could not load this.</b>${esc(why)}
          <div style="margin-top:14px"><button class="btn sm" data-store-retry>Try again</button></div>
        </div>`;
}

function render() {
  if (HIDDEN.includes(BB.state.screen)) BB.state.screen = "home";
  const host = document.getElementById("screen");
  const seq = ++renders;
  const me = BB.store.peek("me");
  if (me === undefined) {
    renderChrome();
    host.innerHTML = `<div class="shell"><p class="admin-state muted" role="status">Loading</p></div>`;
    /* The keys the screen asked for set off now, beside /api/me, rather
       than once it has answered: the gate waits for me alone, and the
       render it opens on finds them in flight or landed, one round trip
       sooner (9 October 2026). A failure here is left to that render,
       which asks for the key again and shows the error box if it fails
       again. A member still to be onboarded fetches a few keys the
       onboarding screen does not draw from, once. */
    const asked = BB.screens[BB.state.screen] || BB.screens.home;
    BB.store.need([].concat(asked.needs || [], asked.wants || [])).catch(() => {});
    BB.store.need(["me"]).then(() => { if (seq === renders) render(); }, err => {
      if (seq !== renders) return;
      host.innerHTML = `<div class="shell">${cannotLoad(err)}</div>`;
    });
    return;
  }
  if (me.onboarded === false) BB.state.screen = "onboarding";
  else if (BB.state.screen === "onboarding") BB.state.screen = "home";
  renderChrome();
  const fn = BB.screens[BB.state.screen] || BB.screens.home;
  if (fn.needs) {
    const waiting = BB.store.need(fn.needs);
    if (fn.needs.some(k => BB.store.peek(k) === undefined)) {
      host.innerHTML = `<div class="shell"><p class="admin-state muted" role="status">Loading</p></div>`;
      waiting.then(() => { if (seq === renders) render(); }, err => {
        if (seq !== renders) return;
        host.innerHTML = `<div class="shell">${cannotLoad(err)}</div>`;
      });
      return;
    }
  }
  /* A screen that throws gets the error box with Try again, not a Loading
     line that never ends, and render() itself never throws, so the chrome
     and every other screen keep working. */
  try {
    const html = `<div class="shell">${fn()}</div>`;
    if (!keepPart(host, html, fn.keep)) {
      host.innerHTML = html;
      wire(host);
    }
    if (fn.mount) fn.mount(host);
  } catch (e) {
    console.error("BB.render:", e);
    host.innerHTML = `<div class="shell">${cannotLoad()}</div>`;
    return;
  }
  if (fn.wants) {
    const missing = fn.wants.some(k => BB.store.peek(k) === undefined);
    BB.store.need(fn.wants).then(() => { if (missing && seq === renders) render(); }, err => {
      if (seq !== renders) return;
      host.querySelectorAll("[data-wants]").forEach(part => { part.innerHTML = cannotLoad(err); });
    });
  }
}

/* The part of a screen named by its .keep, a selector, stays on the page
   when the screen is drawn over itself, and everything around it is drawn
   new. The part carries data-keep, a value that changes whenever its
   markup would, and it is kept only while that value is the same.

   It is never taken out of the page, not even for a moment: a transition
   on an element that leaves the document is cancelled, so a part moved out
   and back would finish its motion in one frame. Instead the two trees are
   walked up together from the part, and at each level everything beside it
   is replaced and the attributes are copied across, which needs the new
   markup to hold the part at the same depth, under the same elements.

   Gives is the reason (8 October 2026): a redraw there while one of the
   types was opening or closing cut the motion short, and took the focus
   off the row a keyboard was on. Returns false, having changed nothing,
   when there is nothing to keep, and render() then draws as it always has.
   The new nodes are wired before they go in, and the kept part is not
   wired again. */
function keepPart(host, html, sel) {
  const live = sel && host.querySelector(sel);
  if (!live) return false;
  const fresh = el("div", null, html);
  const drawn = fresh.querySelector(sel);
  if (!drawn || drawn.dataset.keep !== live.dataset.keep) return false;
  const chain = (n, top) => { const c = [n]; while (n !== top) c.push(n = n.parentNode); return c; };
  const was = chain(live, host), now = chain(drawn, fresh);
  if (was.length !== now.length
      || was.some((n, i) => n !== host && n.tagName !== now[i].tagName)) return false;
  wire(fresh);
  for (let i = 1; i < was.length; i++) {
    const into = was[i], from = now[i], kept = was[i - 1];
    Array.from(into.childNodes).forEach(n => { if (n !== kept) n.remove(); });
    let after = false;
    Array.from(from.childNodes).forEach(n => {
      if (n === now[i - 1]) after = true;
      else if (after) into.appendChild(n);
      else into.insertBefore(n, kept);
    });
    if (into === host) break;
    Array.from(into.attributes).forEach(a => { if (!from.hasAttribute(a.name)) into.removeAttribute(a.name); });
    Array.from(from.attributes).forEach(a => into.setAttribute(a.name, a.value));
  }
  return true;
}

/* Checked live rather than cached: a member who turns the setting on mid-session
   should be honoured without reloading. The CSS block handles transitions and
   the sheet; this is for the motion CSS cannot reach, which is anything driven
   by requestAnimationFrame. */
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Delegated wiring, re-applied after every render. */
function wire(root) {
  root.querySelectorAll("[data-go]").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go)));
  root.querySelectorAll("[data-member]").forEach(b =>
    b.addEventListener("click", e => {
      e.preventDefault();
      openMember(b.dataset.member, b.querySelector(".tile"));
    }));
  root.querySelectorAll("[data-act]").forEach(b =>
    b.addEventListener("click", () => act(b.dataset.act, b)));
}

/* A card's own buttons: asking for an introduction, and its Undo. Each
   carries the member's id in data-for; a button without one does nothing. */
function act(kind, btn) {
  const memberId = btn.dataset.for;
  if (!memberId) return;
  if (kind === "request") requestIntro(memberId);
  else if (kind === "undo") undoIntro(memberId);
}

/* Asking for an introduction to a stranger. The request reaches them at
   once, without the asker's name, so Undo is a withdrawal like the one on
   the Introductions screen: they see only that it did not proceed. Undo is
   there because a thumb slips.

   The id the API answers is kept in BB.state for the page session, so the
   card draws the request and its Undo however often it is redrawn. One
   write per member at a time, so a double tap is one request, and the API
   answers a repeat with the request already open in any case. The toast
   waits for the server. */
function requestIntro(memberId) {
  const sent = BB.store.write("request:" + memberId, () => BB.api("/api/introductions",
    { method: "POST", body: { member_id: memberId } }), { invalidate: ["introductions"] });
  if (!sent) return;
  sent.then(row => {
    (BB.state.requested = BB.state.requested || {})[memberId] = row.id;
    refreshDetail();
    toast("Requested. Nothing is released until they say yes and we approve it.");
  }, err => toast(err && err.status === 404
    ? "That member is not available." : (err && err.detail) || "Something went wrong."));
}

function undoIntro(memberId) {
  const introId = BB.state.requested && BB.state.requested[memberId];
  if (!introId) return;
  const sent = BB.store.write("undo:" + memberId, () => BB.api("/api/introductions/"
    + encodeURIComponent(introId) + "/withdraw", { method: "POST" }),
    { invalidate: ["introductions"] });
  if (!sent) return;
  sent.then(() => {
    delete BB.state.requested[memberId];
    refreshDetail();
    toast("Withdrawn. They see only that it did not proceed.");
  }, err => toast(err && err.status === 404
    ? "It can no longer be withdrawn here. Tell us and it will not proceed."
    : (err && err.detail) || "Something went wrong."));
}

/* ------------------------------------------------------ member detail ---- */
/* The one signature motion in the system: the tile the member clicked flies
   into the profile, interpolating position, size, radius and type size at
   once, so the card *is* the profile opened rather than a new page loading.
   Everything else in Blackbook London is instant.

   The flight is a transform (9 October 2026). The clone is laid out once,
   at the size and place it lands, and is moved and scaled from the tile's
   by a transform, which the compositor runs without the page's thread: it
   used to animate left, top, width, height and font-size, a layout and a
   paint of the clone on every frame of the flight. The corners and the
   initials fly with it as keyframes on the same clock: a radius in pixels
   on the clone and a scale on the span that holds the initials, each
   divided by the scale the box is at on that frame, so the corners read as
   the tile's 12px over the tile and the hero's 20px over the hero, and the
   initials at the tile's type size and then the hero's, on the straight
   curve they always took. Neither lays the clone out: the radius is paint,
   the span's scale is composite. A transition on either would not do, since
   the product of two eased values is not the eased value: a radius in
   pixels under a growing scale balloons mid-flight, and the initials read a
   quarter large. */

/* The flight for the tile at `at` and the clone laid out at `box`, as
   keyframes for the clone's transform and corner radius and for the span's
   transform, from the tile to the box, or from the box to the tile with
   `toTile`. `s` is the box's scale on each frame, the tile's size over the
   box's at the tile and 1 at the box; the radius and the span's scale are
   what should show divided by it. Forty steps keep the straight curve
   within one per cent where it bends most, on the first frames, where `s`
   is smallest and changes fastest. */
const FLIGHT_STEPS = 40;
const flightFrames = (at, box, boxFont, tileFont, toTile) => {
  const s0 = at.width / box.width, r0 = at.width >= 80 ? 20 : 12;
  const outer = [], radius = [], inner = [];
  for (let k = 0; k <= FLIGHT_STEPS; k++) {
    const t = toTile ? 1 - k / FLIGHT_STEPS : k / FLIGHT_STEPS;
    const s = s0 + (1 - s0) * t;
    outer.push({ transform: `translate(${(at.left - box.left) * (1 - t)}px, `
      + `${(at.top - box.top) * (1 - t)}px) scale(${s})` });
    radius.push({ borderRadius: `${(r0 + (20 - r0) * t) / s}px` });
    inner.push({ transform: `scale(${(tileFont + (boxFont - tileFont) * t) / (boxFont * s)})` });
  }
  return { outer, radius, inner };
};
const tileFontOf = rect => Math.max(11, rect.width * 0.30);

/* Fly the clone: three animations on one clock, with the system's easing.
   They start on the next frame, so nothing has to be read back first to
   give them a style to move from. */
let flightEase;
const fly = (clone, frames, duration) => {
  flightEase = flightEase
    || getComputedStyle(document.documentElement).getPropertyValue("--ease").trim();
  const timing = { duration, easing: flightEase, fill: "forwards" };
  clone.animate(frames.outer, timing);
  clone.animate(frames.radius, timing);
  clone.firstChild.animate(frames.inner, timing);
};

/* The trail of profiles opened without leaving the overlay. A card no longer
   links to another, so today it is one deep, but anything that opens a card
   while one is open walks deeper rather than stacking. Back walks it one
   step; Home leaves entirely.

   It exists because the previous version appended a SECOND #detail for every
   hop, duplicate ids, and Back removed whichever getElementById found first,
   which was the one underneath. You ended up stranded on a profile with the
   scroll lock already released and Back doing nothing. */
BB.trail = [];

/* A staff seat reads a card from the API once per page session
   (BB.store.member): every staff read of a card is a look recorded on that
   member's own trail, and the founder seat's reads give this reason, which
   the member reads beside the look. A member's read writes no look, so a
   member's card is read again on each opening, and a tie confirmed or an
   introduction released elsewhere shows the next time it is opened. A 404
   is every card a member may not have, blocked, departed or never there,
   so it gets one fixed sentence. */
const CARD_REASON = "member card";
const staffSeat = () => {
  const me = BB.store.peek("me");
  return BB.staff === true || !!(me && me.role);
};
const loadCard = id => {
  if (!staffSeat()) BB.store.invalidate("member:" + id);
  return BB.store.member(id, staffSeat() ? CARD_REASON : undefined).then(() => API.member(id));
};
const cardRefused = err => toast(err && err.status === 404
  ? "That card is not available." : (err && err.detail) || "Could not load the card.");

/* The bar shows the sector and nothing else: the one thing every card has,
   a stranger's included. */
function detailBody(m) {
  return `
    <div class="detail-bar"><div class="inner">
      <button class="btn sm" id="detail-back">${svg(ICON.back, 14)} ${BB.trail.length > 1 ? "Back" : "Close"}</button>
      <button class="icon-btn" id="detail-home" title="Home" aria-label="Home">${svg(ICON.home)}</button>
      <span class="eyebrow">${esc(m.sector)}</span>
    </div></div>
    <div class="shell">${BB.screens._profile(m)}</div>`;
}

/* Re-point an already-open overlay at a different member, rather than stacking
   a new one on top of it. */
function swapMember(id) {
  return loadCard(id).then(m => {
    const wrap = document.getElementById("detail");
    if (!m || !wrap) return;
    BB.state.detail = id;
    wrap.innerHTML = detailBody(m);
    wrap.scrollTop = 0;
    wrap.querySelectorAll(".fade").forEach(f => f.classList.add("in"));
    wireDetail(wrap);
  }, cardRefused);
}

/* Re-render the open overlay in place, holding the reader where they are.

   swapMember resets scrollTop because it is pointing the overlay at a different
   person, and the top is the right place to start reading someone new. This is
   the same person with changed state, so the scroll position is still correct.
   Losing it would throw a reader to the top of the page halfway through filling
   in a report, which is a long way from where they were working.

   Returns false when no overlay is open, so a caller can fall back to a normal
   screen render without having to know which surface it is on. An open
   overlay was drawn from a card the store already holds, so there is nothing
   to wait for here. */
function refreshDetail() {
  const wrap = document.getElementById("detail");
  const m = wrap && BB.state.detail && API.member(BB.state.detail);
  if (!m) return false;
  const y = wrap.scrollTop;
  wrap.innerHTML = detailBody(m);
  wrap.querySelectorAll(".fade").forEach(f => f.classList.add("in"));
  wireDetail(wrap);
  wrap.scrollTop = y;
  return true;
}

function wireDetail(wrap) {
  wire(wrap);
  wrap.querySelector("#detail-back").addEventListener("click", () => {
    BB.trail.pop();
    if (BB.trail.length) swapMember(BB.trail[BB.trail.length - 1]);
    else closeMember(BB.detailSrc);
  });
  wrap.querySelector("#detail-home").addEventListener("click", () => {
    closeMember(null);
    go("home");
  });
}

/* Nothing draws until the card is in. One open at a time, so a double tap
   opens one overlay, and a card that lands after the member has moved to
   another screen is not drawn over it. */
let opening = null;

function openMember(id, srcTile) {
  if (opening) return;
  const from = BB.state.screen;
  opening = loadCard(id).then(m => {
    if (m && BB.state.screen === from) showMember(id, m, srcTile);
  }, cardRefused).finally(() => { opening = null; });
}

function showMember(id, m, srcTile) {
  /* Already inside a profile: walk deeper rather than opening a second one. */
  if (document.getElementById("detail")) {
    BB.trail.push(id);
    swapMember(id);
    return;
  }

  /* A redraw while the card loaded may have taken the tile out of the page. */
  if (srcTile && !document.contains(srcTile)) srcTile = null;

  /* A block left half asked on an earlier visit does not come back armed. */
  BB.state.blocking = null;
  BB.state.detail = id;
  BB.trail = [id];
  BB.detailSrc = srcTile;

  const src = srcTile ? srcTile.getBoundingClientRect() : null;

  rememberFocus();
  const wrap = el("div", "detail");
  wrap.id = "detail";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-label", m.kind === "peer" ? m.handle
    : [fullName(m), m.role].filter(Boolean).join(", "));
  wrap.innerHTML = detailBody(m);
  document.body.appendChild(wrap);
  document.documentElement.classList.add("no-scroll");
  setBehindInert(true);

  const target = wrap.querySelector("[data-hero]");
  const fades = wrap.querySelectorAll(".fade");

  if (src && target && !reducedMotion()) {
    /* The flight lands where the hero ends up and at its type size: the
       hero is measured while its .fade still holds it lower by its lift,
       which comes off as the fade runs. */
    const dst = target.getBoundingClientRect();
    const heroFont = getComputedStyle(target).fontSize;
    const lift = new DOMMatrixReadOnly(getComputedStyle(target.closest(".fade")).transform).m42;
    const box = { left: dst.left, top: dst.top - lift, width: dst.width, height: dst.height };
    const clone = el("div", "flip", `<span>${esc(m.initials)}</span>`);
    clone.style.cssText =
      `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;` +
      `border-radius:20px;font-size:${heroFont};`;
    document.body.appendChild(clone);
    fly(clone, flightFrames(src, box, parseFloat(heroFont), tileFontOf(src), false), 560);
    target.style.opacity = "0";

    requestAnimationFrame(() => { fades.forEach(f => f.classList.add("in")); });
    setTimeout(() => { target.style.opacity = ""; clone.remove(); }, 580);
  } else {
    fades.forEach(f => f.classList.add("in"));
  }

  wireDetail(wrap);
  /* Focus into the overlay, or a keyboard user lands on whatever is behind it
     and cannot see where they are. Back is the right target: it is the way
     out, and it reads the person's name from the bar beside it. */
  const back = wrap.querySelector("#detail-back");
  if (back) back.focus();
  document.addEventListener("keydown", escClose);
}

/* Escape follows Back, not Close, one step out of the trail at a time. */
function escClose(e) {
  if (e.key !== "Escape" || !document.getElementById("detail")) return;
  BB.trail.pop();
  if (BB.trail.length) swapMember(BB.trail[BB.trail.length - 1]);
  else closeMember(BB.detailSrc);
}

function closeMember(srcTile) {
  const wrap = document.getElementById("detail");
  if (!wrap) return;
  document.removeEventListener("keydown", escClose);
  BB.trail = [];
  const target = wrap.querySelector("[data-hero]");
  /* A redraw behind the overlay may have taken the tile out of the page. */
  const src = srcTile && document.contains(srcTile) ? srcTile.getBoundingClientRect() : null;

  const finish = () => {
    wrap.remove();
    document.documentElement.classList.remove("no-scroll");
    BB.state.detail = null;
    setBehindInert(false);
    restoreFocus();
  };

  if (src && target && !reducedMotion()) {
    const dst = target.getBoundingClientRect();
    const heroFont = getComputedStyle(target).fontSize;
    const m = API.member(BB.state.detail);
    const clone = el("div", "flip", `<span>${esc(m ? m.initials : "")}</span>`);
    clone.style.cssText =
      `left:${dst.left}px;top:${dst.top}px;width:${dst.width}px;height:${dst.height}px;` +
      `border-radius:20px;font-size:${heroFont};`;
    document.body.appendChild(clone);
    wrap.style.transition = "opacity .3s var(--ease)";
    wrap.style.opacity = "0";
    fly(clone, flightFrames(src, dst, parseFloat(heroFont), tileFontOf(src), true), 460);
    setTimeout(() => { clone.remove(); finish(); }, 470);
  } else {
    finish();
  }
}

/* ----------------------------------------------------------- preferences -- */

function setTheme(v) {
  const pref = ["light", "dark", "auto"].includes(v) ? v : "auto";
  try { localStorage.setItem("bb-theme", v); } catch (e) {}
  document.documentElement.dataset.themePreference = pref;
  /* Auto is resolved by daylight.js into light or dark on the root. Only
     when that script is missing does "auto" reach the attribute, where the
     stylesheet's media rule still handles it. */
  if (pref === "auto" && window.BBDaylight) BBDaylight.apply();
  else document.documentElement.dataset.theme = pref;
  if (BB.state.screen === "network") render();
}
function setDensity(v) {
  document.documentElement.dataset.density = v === "compact" ? "compact" : "comfortable";
  try { localStorage.setItem("bb-density", v); } catch (e) {}
}

/* Boot lives in boot.js, loaded after every screen has registered itself. */

/* The door, as a QR. Version-2 style 29x29 grid precomputed offline for the
   one string it will ever hold, https://blackbook.london/enter.html, so no
   generator library ships to the page. Scanning opens the gate; the code is
   given in person, which is the sheet discipline. The emailed one-time-code
   version replaces this when the backend connects. */
const QR_N = 29;
const QR_PATH = "M0 0h1v1h-1zM1 0h1v1h-1zM2 0h1v1h-1zM3 0h1v1h-1zM4 0h1v1h-1zM5 0h1v1h-1zM6 0h1v1h-1zM8 0h1v1h-1zM9 0h1v1h-1zM10 0h1v1h-1zM11 0h1v1h-1zM15 0h1v1h-1zM16 0h1v1h-1zM17 0h1v1h-1zM18 0h1v1h-1zM19 0h1v1h-1zM20 0h1v1h-1zM22 0h1v1h-1zM23 0h1v1h-1zM24 0h1v1h-1zM25 0h1v1h-1zM26 0h1v1h-1zM27 0h1v1h-1zM28 0h1v1h-1zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM9 1h1v1h-1zM12 1h1v1h-1zM14 1h1v1h-1zM15 1h1v1h-1zM18 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM6 2h1v1h-1zM11 2h1v1h-1zM13 2h1v1h-1zM14 2h1v1h-1zM15 2h1v1h-1zM18 2h1v1h-1zM19 2h1v1h-1zM20 2h1v1h-1zM22 2h1v1h-1zM24 2h1v1h-1zM25 2h1v1h-1zM26 2h1v1h-1zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h1v1h-1zM3 3h1v1h-1zM4 3h1v1h-1zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM11 3h1v1h-1zM17 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM25 3h1v1h-1zM26 3h1v1h-1zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h1v1h-1zM3 4h1v1h-1zM4 4h1v1h-1zM6 4h1v1h-1zM10 4h1v1h-1zM11 4h1v1h-1zM12 4h1v1h-1zM13 4h1v1h-1zM19 4h1v1h-1zM22 4h1v1h-1zM24 4h1v1h-1zM25 4h1v1h-1zM26 4h1v1h-1zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h1v1h-1zM10 5h1v1h-1zM11 5h1v1h-1zM14 5h1v1h-1zM16 5h1v1h-1zM17 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h1v1h-1zM1 6h1v1h-1zM2 6h1v1h-1zM3 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM23 6h1v1h-1zM24 6h1v1h-1zM25 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM8 7h1v1h-1zM9 7h1v1h-1zM12 7h1v1h-1zM13 7h1v1h-1zM14 7h1v1h-1zM16 7h1v1h-1zM17 7h1v1h-1zM19 7h1v1h-1zM0 8h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM9 8h1v1h-1zM13 8h1v1h-1zM14 8h1v1h-1zM15 8h1v1h-1zM16 8h1v1h-1zM17 8h1v1h-1zM22 8h1v1h-1zM25 8h1v1h-1zM27 8h1v1h-1zM28 8h1v1h-1zM2 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM16 9h1v1h-1zM17 9h1v1h-1zM18 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM21 9h1v1h-1zM22 9h1v1h-1zM23 9h1v1h-1zM24 9h1v1h-1zM28 9h1v1h-1zM0 10h1v1h-1zM1 10h1v1h-1zM2 10h1v1h-1zM3 10h1v1h-1zM4 10h1v1h-1zM6 10h1v1h-1zM8 10h1v1h-1zM10 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM22 10h1v1h-1zM24 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM1 11h1v1h-1zM2 11h1v1h-1zM8 11h1v1h-1zM10 11h1v1h-1zM11 11h1v1h-1zM12 11h1v1h-1zM13 11h1v1h-1zM14 11h1v1h-1zM18 11h1v1h-1zM20 11h1v1h-1zM21 11h1v1h-1zM28 11h1v1h-1zM2 12h1v1h-1zM3 12h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM6 12h1v1h-1zM9 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM17 12h1v1h-1zM19 12h1v1h-1zM25 12h1v1h-1zM26 12h1v1h-1zM1 13h1v1h-1zM3 13h1v1h-1zM8 13h1v1h-1zM9 13h1v1h-1zM13 13h1v1h-1zM15 13h1v1h-1zM16 13h1v1h-1zM17 13h1v1h-1zM19 13h1v1h-1zM22 13h1v1h-1zM26 13h1v1h-1zM27 13h1v1h-1zM28 13h1v1h-1zM1 14h1v1h-1zM2 14h1v1h-1zM3 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM14 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM19 14h1v1h-1zM22 14h1v1h-1zM23 14h1v1h-1zM26 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM0 15h1v1h-1zM3 15h1v1h-1zM4 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM8 15h1v1h-1zM9 15h1v1h-1zM13 15h1v1h-1zM15 15h1v1h-1zM16 15h1v1h-1zM20 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM24 15h1v1h-1zM27 15h1v1h-1zM0 16h1v1h-1zM1 16h1v1h-1zM2 16h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM12 16h1v1h-1zM16 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM20 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM24 16h1v1h-1zM25 16h1v1h-1zM27 16h1v1h-1zM1 17h1v1h-1zM2 17h1v1h-1zM4 17h1v1h-1zM5 17h1v1h-1zM7 17h1v1h-1zM10 17h1v1h-1zM11 17h1v1h-1zM12 17h1v1h-1zM13 17h1v1h-1zM15 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM25 17h1v1h-1zM26 17h1v1h-1zM27 17h1v1h-1zM0 18h1v1h-1zM3 18h1v1h-1zM6 18h1v1h-1zM7 18h1v1h-1zM9 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM15 18h1v1h-1zM17 18h1v1h-1zM22 18h1v1h-1zM24 18h1v1h-1zM26 18h1v1h-1zM3 19h1v1h-1zM9 19h1v1h-1zM10 19h1v1h-1zM11 19h1v1h-1zM17 19h1v1h-1zM19 19h1v1h-1zM21 19h1v1h-1zM22 19h1v1h-1zM24 19h1v1h-1zM26 19h1v1h-1zM1 20h1v1h-1zM2 20h1v1h-1zM4 20h1v1h-1zM5 20h1v1h-1zM6 20h1v1h-1zM7 20h1v1h-1zM10 20h1v1h-1zM13 20h1v1h-1zM15 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM20 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM26 20h1v1h-1zM8 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM13 21h1v1h-1zM14 21h1v1h-1zM16 21h1v1h-1zM20 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM26 21h1v1h-1zM27 21h1v1h-1zM28 21h1v1h-1zM0 22h1v1h-1zM1 22h1v1h-1zM2 22h1v1h-1zM3 22h1v1h-1zM4 22h1v1h-1zM5 22h1v1h-1zM6 22h1v1h-1zM8 22h1v1h-1zM10 22h1v1h-1zM13 22h1v1h-1zM17 22h1v1h-1zM18 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM25 22h1v1h-1zM27 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM8 23h1v1h-1zM11 23h1v1h-1zM12 23h1v1h-1zM15 23h1v1h-1zM19 23h1v1h-1zM20 23h1v1h-1zM24 23h1v1h-1zM25 23h1v1h-1zM27 23h1v1h-1zM0 24h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM6 24h1v1h-1zM9 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM17 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM27 24h1v1h-1zM0 25h1v1h-1zM2 25h1v1h-1zM3 25h1v1h-1zM4 25h1v1h-1zM6 25h1v1h-1zM8 25h1v1h-1zM9 25h1v1h-1zM11 25h1v1h-1zM13 25h1v1h-1zM14 25h1v1h-1zM15 25h1v1h-1zM17 25h1v1h-1zM19 25h1v1h-1zM21 25h1v1h-1zM23 25h1v1h-1zM24 25h1v1h-1zM25 25h1v1h-1zM28 25h1v1h-1zM0 26h1v1h-1zM2 26h1v1h-1zM3 26h1v1h-1zM4 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM11 26h1v1h-1zM12 26h1v1h-1zM14 26h1v1h-1zM16 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM20 26h1v1h-1zM23 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM20 27h1v1h-1zM22 27h1v1h-1zM25 27h1v1h-1zM27 27h1v1h-1zM0 28h1v1h-1zM1 28h1v1h-1zM2 28h1v1h-1zM3 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM8 28h1v1h-1zM9 28h1v1h-1zM11 28h1v1h-1zM12 28h1v1h-1zM16 28h1v1h-1zM18 28h1v1h-1zM19 28h1v1h-1zM20 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM23 28h1v1h-1zM27 28h1v1h-1z";
