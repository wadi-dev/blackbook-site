/* ==========================================================================
   BLACKBOOK — shell, router and shared helpers

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

   Inline rows (carousels, lists, tie rows) drop the pill entirely rather than
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

/* Resolve the strength ramp against the theme actually in effect. */
function ramp(n) {
  const dark = document.documentElement.dataset.theme === "dark" ||
    ((document.documentElement.dataset.theme || "auto") === "auto" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  return (dark ? DB.rampDark : DB.ramp)[n] || "#E8E8E8";
}

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
  ["members", "Members"], ["introductions", "Introductions"], ["messages", "Messages"]
];

const ICON = {
  cog: '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/>',
  back: '<path d="M11 4L5 10l6 6"/>',

  /* Tab-bar icons. Drawn to the same 20-unit box and 1.5 stroke as the two
     above. Members and More are built from rounded squares on purpose — it is
     the shape people are drawn as everywhere else in the product. */
  home:    '<path d="M3.4 8.5 10 3.2l6.6 5.3V16a1.2 1.2 0 0 1-1.2 1.2H4.6A1.2 1.2 0 0 1 3.4 16z"/>',
  asks:    '<path d="M16.8 12.1a1.8 1.8 0 0 1-1.8 1.8H7.7L4 16.8V5.7a1.8 1.8 0 0 1 1.8-1.8h9.2a1.8 1.8 0 0 1 1.8 1.8z"/>',
  members: '<rect x="2.4" y="5.4" width="7.6" height="7.6" rx="2.3"/><rect x="10" y="7" width="7.6" height="7.6" rx="2.3"/>',
  intros:  '<path d="M2.8 6.6h6M6.8 4.6l2 2-2 2"/><path d="M17.2 13.4h-6M13.2 11.4l-2 2 2 2"/>',
  more:    '<rect x="3.1" y="3.1" width="5.7" height="5.7" rx="1.8"/><rect x="11.2" y="3.1" width="5.7" height="5.7" rx="1.8"/><rect x="3.1" y="11.2" width="5.7" height="5.7" rx="1.8"/><rect x="11.2" y="11.2" width="5.7" height="5.7" rx="1.8"/>'
};

/* The bottom bar, on mobile.

   Seven destinations do not fit across 375px — five is the width at which a
   label is still readable. The split is by frequency, not importance: Home,
   Asks, Members and Introductions are the daily loop; Network is maintenance,
   Gives is set-and-forget, Settings is rare. Those three sit behind More.

   Messages is the awkward one. It is low-volume but it carries a badge, so
   More carries that badge too — nothing that is waiting for you is ever
   invisible because it happens to live one level down. */

const TABS = [
  ["home", "Home", "home"], ["asks", "Asks", "asks"], ["members", "Members", "members"],
  ["introductions", "Intros", "intros"], ["more", "More", "more"]
];
const SHEET = [
  ["network", "Network"], ["gives", "Gives"], ["messages", "Messages"], ["settings", "Settings"]
];
const IN_SHEET = SHEET.map(s => s[0]);
const svg = (paths, size) =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" ` +
  `stroke-linecap="round" stroke-linejoin="round"${size ? ` style="width:${size}px;height:${size}px"` : ""}>${paths}</svg>`;

function renderChrome() {
  const unread = DB.threads.filter(t => t.unread).length;
  const waiting = DB.intros.filter(i => i.state === "awaiting").length;

  document.getElementById("topbar").innerHTML = `
    <div class="topbar-inner">
      <span class="wordmark">Blackbook</span>
      <nav class="nav" aria-label="Main">
        ${NAV.map(([k, label]) => {
          const n = k === "messages" ? unread : k === "introductions" ? waiting : 0;
          return `<button data-go="${k}" aria-current="${BB.state.screen === k}">${label}` +
            (n ? `<span class="count">${n}</span>` : "") + `</button>`;
        }).join("")}
      </nav>
      <button class="icon-btn" data-go="search" title="Search" aria-label="Search"
        aria-current="${BB.state.screen === "search"}">${svg(ICON.search)}</button>
      <button class="icon-btn" data-go="settings" title="Settings" aria-label="Settings">${svg(ICON.cog)}</button>
    </div>`;

  const onSheet = IN_SHEET.includes(BB.state.screen);

  document.getElementById("tabbar").innerHTML = TABS.map(([k, label, icon]) => {
    const current = k === "more" ? onSheet : BB.state.screen === k;
    const n = k === "introductions" ? waiting : k === "more" ? unread : 0;
    return `<button ${k === "more" ? 'data-sheet="open"' : `data-go="${k}"`}
      aria-current="${current}"${k === "more" ? ` aria-expanded="${BB.sheetOpen === true}"` : ""}>
      ${svg(ICON[icon])}<span class="lab">${label}</span>` +
      (n ? `<span class="count">${n}</span>` : "") + `</button>`;
  }).join("");

  document.querySelector("#sheet .sheet-list").innerHTML = SHEET.map(([k, label]) => {
    const n = k === "messages" ? unread : 0;
    return `<button class="item" data-go="${k}" aria-current="${BB.state.screen === k}">
      <span class="grow">${label}</span>` +
      (n ? `<span class="count">${n}</span>` : "") + `</button>`;
  }).join("");
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
  document.body.classList.toggle("no-scroll", open);
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
     body rather than to #screen, so it survives a render — leaving a dead
     overlay on top and the body permanently scroll-locked. Tear it down here
     rather than trusting every caller to close it first. */
  const open = document.getElementById("detail");
  if (open) {
    open.remove();
    document.body.style.overflow = "";
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

function render() {
  renderChrome();
  const host = document.getElementById("screen");
  const fn = BB.screens[BB.state.screen] || BB.screens.home;
  host.innerHTML = `<div class="shell">${fn()}</div>`;
  wire(host);
}

/* Checked live rather than cached: a member who turns the setting on mid-session
   should be honoured without reloading. The CSS block handles transitions and
   the sheet; this is for the motion CSS cannot reach, which is anything driven
   by requestAnimationFrame. */
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------- graph ----- */
/* Drag a node, drag the background to move the whole web, scroll to zoom.

   Positions are mutated straight into the DOM during a drag and only written
   back to BB.graph on release. Re-rendering mid-drag would rebuild the SVG
   under the pointer and drop the gesture. */

/* wireGraph runs on every render, so the resize listener has to be replaced
   rather than stacked. Ten visits to the network screen would otherwise leave
   ten live handlers measuring a graph that no longer exists. */
let graphResize = null;

/* The one transform the graph has, derived rather than stored.

   Scale is the only free variable now. The translate exists purely to cancel
   out what scaling does to the hub: a node at (250,215) scaled by s lands at
   (250s,215s), so translating back by (250-250s, 215-215s) leaves it exactly
   where it started. You stay nailed to the middle of the card at every zoom
   level, and the web expands and contracts around you.

   There is deliberately no pan. Two independent offsets are what let the whole
   graph wander off the canvas, and nothing in this screen needs them: the
   layout is yours to arrange node by node, and zoom reaches anything the
   viewport cannot already hold. */
function graphTransform() {
  const G = BB.graph;
  const h = (G && G.pos.__me) || { x: 250, y: 215 };
  const s = (G && G.scale) || 1;
  return `translate(${(h.x * (1 - s)).toFixed(2)},${(h.y * (1 - s)).toFixed(2)}) scale(${s})`;
}

function wireGraph(root) {
  const svg = root.querySelector("#graph");
  if (graphResize) { removeEventListener("resize", graphResize); graphResize = null; }
  if (!svg) return;
  const view = svg.querySelector("#graph-view");
  const G = BB.graph;

  /* Screen pixels to viewBox units. Node coordinates live inside the scaled
     group, so they divide by scale as well; the pan translate does not, because
     it is applied before the scale. Adding raw pixels to the pan made the web
     travel about 1.4x faster than the cursor.

     The width is cached rather than measured per move. getBoundingClientRect
     forces a synchronous layout, and calling it inside pointermove is the
     read-write-read pattern that janks a drag on a phone. The SVG only changes
     size on resize, so that is when it is re-read. */
  let svgW = 0;
  const measure = () => { svgW = svg.getBoundingClientRect().width || 1; };
  measure();
  graphResize = measure;
  addEventListener("resize", graphResize, { passive: true });

  const pxToView = () => 500 / svgW;
  const unit = () => pxToView() / G.scale;

  let mode = null, id = null, last = null, moved = 0;
  let dragEl = null, dragEdge = null;   /* resolved once, on pointerdown */

  /* A phone has no wheel, and zoom is the graph's one navigation. Pinch is
     the wheel's touch twin: two active pointers, the change in the distance
     between them multiplied straight onto the scale. Anchoring needs no
     extra maths because graphTransform derives the translate from the scale
     with the hub pinned, exactly as it does for the wheel. */
  const pts = new Map();                /* active pointers, for the pinch */
  let pinchDist = 0;

  const paint = () => view.setAttribute("transform", graphTransform());

  /* How far out you may zoom depends on how big the web actually is. A fixed
     floor of 0.45 was fine at seven connections and wrong at two hundred: the
     layout measured 1056 x 1053 while full zoom-out showed 1111 x 956, so the
     bottom of your own network was unreachable. */
  const zoomFloor = () => {
    const p = Object.values(G.pos);
    if (p.length < 3) return 0.45;
    const xs = p.map(q => q.x), ys = p.map(q => q.y);
    const w = Math.max(...xs) - Math.min(...xs) + 90;   /* node plus its label */
    const h = Math.max(...ys) - Math.min(...ys) + 90;
    return Math.max(0.1, Math.min(0.45, 500 / w, 430 / h));
  };

  /* Writes only. The elements are resolved on pointerdown and reused for the
     whole gesture, so a move costs three setAttribute calls and no DOM query. */
  const place = nodeId => {
    const p = G.pos[nodeId];
    const el = dragEl || view.querySelector(`[data-node="${nodeId}"]`);
    if (el) el.setAttribute("transform", `translate(${p.x},${p.y})`);
    if (nodeId === "__me") {
      /* Edges all run from you, so moving yourself moves every line. */
      view.querySelectorAll("[data-edge]").forEach(l => {
        l.setAttribute("x1", p.x); l.setAttribute("y1", p.y);
      });
    } else {
      const e = dragEdge || view.querySelector(`[data-edge="${nodeId}"]`);
      if (e) { e.setAttribute("x2", p.x); e.setAttribute("y2", p.y); }
    }
  };

  svg.addEventListener("pointerdown", e => {
    /* Without this a real mouse drag starts a text selection that runs out of
       the SVG and across the caption, the headings and the tie list. Selected
       text in a monochrome palette paints as solid black, which is what the
       graph "going black" actually was. */
    e.preventDefault();

    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      /* A second finger turns whatever was happening into a pinch. The node
         that was mid-drag simply stays where it is; nothing to undo. */
      view.querySelectorAll(".grabbed").forEach(n => n.classList.remove("grabbed"));
      svg.classList.remove("dragging");
      document.body.classList.remove("dragging");
      mode = "pinch"; id = null; dragEl = null; dragEdge = null;
      const [a, b] = [...pts.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* nicety */ }
      return;
    }

    /* You are the fixed point, and so is the web around you. Only the people
       in it move.

       The background used to pan the whole graph, which meant the centre slid
       about the card and the arrangement you had made drifted with it. Dragging
       is now a thing you do TO a connection, not to the canvas: press a node and
       it follows you, press anywhere else and nothing moves at all. */
    const node = e.target.closest("[data-node]");
    if (!node) { mode = null; return; }

    const hub = node.dataset.node === "__me";
    mode = hub ? "hub" : "node";
    id = hub ? null : node.dataset.node;
    dragEl = hub ? null : node;
    dragEdge = id ? view.querySelector(`[data-edge="${id}"]`) : null;
    measure();                              /* one layout read per gesture */
    last = { x: e.clientX, y: e.clientY };
    moved = 0;
    /* Guards first, capture second. setPointerCapture throws InvalidStateError
       if the pointer is no longer active, and when it did, it took the rest of
       this handler with it: mode was set but the selection guard was never
       applied, which is the state the blackout happens in. */
    if (mode === "node") {
      svg.classList.add("dragging");
      document.body.classList.add("dragging");
      node.classList.add("grabbed");
    }
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
  });

  svg.addEventListener("pointermove", e => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === "pinch") {
      if (pts.size < 2) return;
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      G.scale = Number(Math.min(2.4, Math.max(zoomFloor(),
        G.scale * (d / pinchDist))).toFixed(4));
      pinchDist = d;
      paint();
      return;
    }
    if (!mode) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    moved += Math.abs(dx) + Math.abs(dy);
    if (mode !== "node") return;      /* the hub is pressed, never dragged */

    const u = unit();
    const p = G.pos[id];
    /* Clamped to the canvas. Unclamped, a node can be flung far enough out
       that nothing but Reset brings it back, and Reset throws away the whole
       arrangement to recover one node. */
    p.x = Math.max(28, Math.min(472, p.x + dx * u));
    p.y = Math.max(28, Math.min(402, p.y + dy * u));
    place(id);
  });

  const end = e => {
    if (e && e.pointerId != null) pts.delete(e.pointerId);
    if (mode === "pinch") {
      /* One finger lifting re-bases the pinch; the last one ends it. A pinch
         is never a tap, so none of the open-profile logic below applies. */
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        return;
      }
      mode = null;
      try {
        if (e && e.pointerId != null && svg.hasPointerCapture(e.pointerId))
          svg.releasePointerCapture(e.pointerId);
      } catch (err) { /* already gone */ }
      return;
    }
    if (!mode) return;
    /* A drag must not also count as opening the profile. */
    if (moved < 4) {
      /* Your own node goes Home, which IS your profile. Opening the member
         profile for yourself rendered it in the third person: "Their ask",
         "I can help with this", "Request an introduction", and "no identity
         released until X accepts" where X is the reader. */
      if (mode === "hub") go("home");
      /* A second-degree node is veiled. Opening the profile would print the
         name of someone who has not agreed to be introduced to you, which is
         the one thing this product promises never to do. It stays draggable;
         it just does not open. */
      else if (mode === "node" && dragEl && dragEl.classList.contains("gfar")) {
        toast("You see the seat, not the name. Ask for an introduction from the list.");
      }
      else if (mode === "node") openMember(id, null);
    }
    view.querySelectorAll(".grabbed").forEach(n => n.classList.remove("grabbed"));
    mode = null; id = null; dragEl = null; dragEdge = null;
    svg.classList.remove("dragging");
    document.body.classList.remove("dragging");
    try {
      if (e && e.pointerId != null && svg.hasPointerCapture(e.pointerId))
        svg.releasePointerCapture(e.pointerId);
    } catch (err) { /* already gone */ }
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);

  /* Zoom about the hub, which is the one point that never moves.

     It used to zoom toward the cursor, which is right for a map and wrong here:
     it slid the centre off to one side, and the only way to bring it back was
     the pan gesture that no longer exists. Anchoring on the hub means zooming
     out pulls the whole web in toward you and zooming in pushes it outward,
     with you sitting still in the middle throughout. Small steps so a trackpad
     reads as continuous. */
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    G.scale = Number(Math.min(2.4, Math.max(zoomFloor(),
      G.scale * (e.deltaY < 0 ? 1.06 : 0.945))).toFixed(4));
    paint();
  }, { passive: false });

  /* Reset eases back rather than snapping, so you can see where it went. */
  const reset = root.querySelector('[data-graph="reset"]');
  if (reset) reset.addEventListener("click", () => {
    const from = { ...BB.graph.pos, __s: G.scale };
    BB.graph = null;
    render();                                  /* re-seeds radially */
    const to = BB.graph.pos, G2 = BB.graph;
    const v2 = document.querySelector("#graph-view");
    if (!v2 || reducedMotion()) return;

    const ids = Object.keys(to).filter(k => from[k]);
    const t0 = performance.now(), DUR = 420;
    const ease = t => 1 - Math.pow(1 - t, 3);

    const step = now => {
      const k = ease(Math.min(1, (now - t0) / DUR));
      G2.scale = from.__s + (1 - from.__s) * k;
      v2.setAttribute("transform", graphTransform());
      ids.forEach(nid => {
        const x = from[nid].x + (to[nid].x - from[nid].x) * k;
        const y = from[nid].y + (to[nid].y - from[nid].y) * k;
        const el = v2.querySelector(`[data-node="${nid}"]`);
        if (el) el.setAttribute("transform", `translate(${x},${y})`);
        const edge = v2.querySelector(`[data-edge="${nid}"]`);
        if (edge) { edge.setAttribute("x2", x); edge.setAttribute("y2", y); }
        if (nid === "__me") v2.querySelectorAll("[data-edge]").forEach(l => {
          l.setAttribute("x1", x); l.setAttribute("y1", y);
        });
      });
      if (k < 1) requestAnimationFrame(step);
      else ids.forEach(nid => { to[nid].x = to[nid].x; to[nid].y = to[nid].y; });
    };
    requestAnimationFrame(step);
  });
}

/* Delegated wiring, re-applied after every render. */
function wire(root) {
  wireGraph(root);
  root.querySelectorAll("[data-go]").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go)));
  document.querySelectorAll(".topbar [data-go]").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go)));
  root.querySelectorAll("[data-member]").forEach(b =>
    b.addEventListener("click", e => {
      e.preventDefault();
      openMember(b.dataset.member, b.querySelector(".tile"));
    }));
  root.querySelectorAll("[data-act]").forEach(b =>
    b.addEventListener("click", () => act(b.dataset.act, b)));
}

/* Actions that only need to feel real for a prototype. */
function act(kind, btn) {
  /* Help and request are undoable, because a thumb slips. The honesty that
     makes the undo possible: pressing the button asks US to start the
     process, and until we act nothing has reached the other member. So undo
     is not recalling a message, it is cancelling an instruction that had not
     yet been carried out. The button element is kept, listener and all, and
     put back exactly where it was. */
  if (kind === "help" || kind === "request") {
    const wrap = el("span", "row");
    wrap.style.cssText = "gap:10px;align-items:center;flex-wrap:wrap";
    wrap.innerHTML =
      `<span class="pill plain">${kind === "help"
        ? "Offer sent · awaiting opt-in" : "Awaiting their opt-in"}</span>
       <button class="btn sm quiet">Undo</button>`;
    btn.replaceWith(wrap);
    wrap.querySelector("button").addEventListener("click", () => {
      wrap.replaceWith(btn);
      toast("Undone. Nothing had been sent, and nothing is recorded.");
    });
    toast(kind === "help"
      ? "Offer sent. They decide whether to see your name. Undo is there if that was a slip."
      : "Requested. Nothing is released until they accept. Undo is there if that was a slip.");
  } else if (kind === "accept") {
    toast("Accepted. Identities released to both sides.");
  } else if (kind === "decline") {
    toast("Declined, silently. They are not told.");
  }
}

/* ------------------------------------------------------ member detail ---- */
/* The one signature motion in the system: the tile the member clicked flies
   into the profile, interpolating position, size, radius and type size at
   once, so the card *is* the profile opened rather than a new page loading.
   Everything else in Blackbook is instant. */

/* The trail of profiles opened without leaving the overlay. Profiles link to
   each other through "Connects with", so this can go several deep. Back walks
   it one step; Home leaves entirely.

   It exists because the previous version appended a SECOND #detail for every
   hop — duplicate ids, and Back removed whichever getElementById found first,
   which was the one underneath. You ended up stranded on a profile with the
   scroll lock already released and Back doing nothing. */
BB.trail = [];

function detailBody(m) {
  return `
    <div class="detail-bar"><div class="inner">
      <button class="btn sm" id="detail-back">${svg(ICON.back, 14)} ${BB.trail.length > 1 ? "Back" : "Close"}</button>
      <button class="icon-btn" id="detail-home" title="Home" aria-label="Home">${svg(ICON.home)}</button>
      <span class="eyebrow">${esc(m.sector)} · ${esc(m.sub)}</span>
      <span class="grow"></span>
      <span class="pill plain">Verified</span>
    </div></div>
    <div class="shell">${BB.screens._profile(m)}</div>`;
}

/* Re-point an already-open overlay at a different member, rather than stacking
   a new one on top of it. */
function swapMember(id) {
  const m = API.member(id);
  const wrap = document.getElementById("detail");
  if (!m || !wrap) return;
  BB.state.detail = id;
  wrap.innerHTML = detailBody(m);
  wrap.scrollTop = 0;
  wrap.querySelectorAll(".fade").forEach(f => f.classList.add("in"));
  wireDetail(wrap);
}

/* Re-render the open overlay in place, holding the reader where they are.

   swapMember resets scrollTop because it is pointing the overlay at a different
   person, and the top is the right place to start reading someone new. This is
   the same person with changed state, so the scroll position is still correct.
   Losing it would throw a reader to the top of the page halfway through filling
   in a report, which is a long way from where they were working.

   Returns false when no overlay is open, so a caller can fall back to a normal
   screen render without having to know which surface it is on. */
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

function openMember(id, srcTile) {
  const m = API.member(id);
  if (!m) return;

  /* Already inside a profile: walk deeper rather than opening a second one. */
  if (document.getElementById("detail")) {
    BB.trail.push(id);
    swapMember(id);
    return;
  }

  BB.state.detail = id;
  BB.trail = [id];
  BB.detailSrc = srcTile;

  const src = srcTile ? srcTile.getBoundingClientRect() : null;

  rememberFocus();
  const wrap = el("div", "detail");
  wrap.id = "detail";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-label", `${fullName(m)}, ${m.role}`);
  wrap.innerHTML = detailBody(m);
  document.body.appendChild(wrap);
  document.body.style.overflow = "hidden";
  setBehindInert(true);

  const target = wrap.querySelector("[data-hero]");
  const fades = wrap.querySelectorAll(".fade");

  if (src && target && !reducedMotion()) {
    const dst = target.getBoundingClientRect();
    const clone = el("div", "flip", esc(m.initials));
    clone.style.cssText =
      `left:${src.left}px;top:${src.top}px;width:${src.width}px;height:${src.height}px;` +
      `border-radius:${src.width >= 80 ? 20 : 12}px;font-size:${Math.max(11, src.width * 0.30)}px;`;
    document.body.appendChild(clone);
    target.style.opacity = "0";

    requestAnimationFrame(() => {
      clone.style.transition = "all .56s var(--ease)";
      clone.style.left = dst.left + "px";
      clone.style.top = dst.top + "px";
      clone.style.width = dst.width + "px";
      clone.style.height = dst.height + "px";
      clone.style.borderRadius = "20px";
      clone.style.fontSize = Math.max(11, dst.width * 0.30) + "px";
      fades.forEach(f => f.classList.add("in"));
    });
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

/* Escape follows Back, not Close — one step out of the trail at a time. */
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
  const src = srcTile ? srcTile.getBoundingClientRect() : null;

  const finish = () => {
    wrap.remove();
    document.body.style.overflow = "";
    BB.state.detail = null;
    setBehindInert(false);
    restoreFocus();
  };

  if (src && target && !reducedMotion()) {
    const dst = target.getBoundingClientRect();
    const clone = el("div", "flip", esc(API.member(BB.state.detail).initials));
    clone.style.cssText =
      `left:${dst.left}px;top:${dst.top}px;width:${dst.width}px;height:${dst.height}px;` +
      `border-radius:20px;font-size:${Math.max(11, dst.width * 0.30)}px;`;
    document.body.appendChild(clone);
    wrap.style.transition = "opacity .3s var(--ease)";
    wrap.style.opacity = "0";
    requestAnimationFrame(() => {
      clone.style.transition = "all .46s var(--ease)";
      clone.style.left = src.left + "px";
      clone.style.top = src.top + "px";
      clone.style.width = src.width + "px";
      clone.style.height = src.height + "px";
      clone.style.borderRadius = (src.width >= 80 ? 20 : 12) + "px";
      clone.style.fontSize = Math.max(11, src.width * 0.30) + "px";
    });
    setTimeout(() => { clone.remove(); finish(); }, 470);
  } else {
    finish();
  }
}

/* ----------------------------------------------------------- preferences -- */

function setTheme(v) {
  document.documentElement.dataset.theme = ["light", "dark", "auto"].includes(v) ? v : "auto";
  try { localStorage.setItem("bb-theme", v); } catch (e) {}
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
