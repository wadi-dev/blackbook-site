/* Admin, the broker's desk. Staff only.

   Four lists, all from the live API and none from data.js: the applicants
   waiting at the door, with Approve and Reject on each, the introductions
   waiting on a release, with Release and Stop on each, the lineage of every
   seat as a tree, and the membership inquiries from the public form, with
   Dismiss on each. One is shown at a time behind a segmented control. The
   screen holds what the API sent in memory for the session and writes none
   of it anywhere; a reload starts from nothing.

   The tab that reaches here is drawn only when BB.auth.isStaff() has said
   yes, and this function asks the same question again on every visit, before
   drawing anything, because a screen name is a string anybody can type into
   BB.state and BB.staff is a property anybody can set. Neither is read here:
   the only thing that lets the page draw is the API's own answer, kept in a
   variable this file alone can reach. The API refuses a member on every call
   regardless; the check here is so a member never sees an empty admin page
   with four 404s behind it. */

(function () {
  "use strict";

  const S = {
    started: false,
    loading: false,
    tab: "applications",
    apps: { rows: [], error: null },
    queue: { rows: [], error: null },
    lineage: { rows: [], error: null, fresh: false },
    inquiries: { rows: [], error: null },
    filter: { sector: "", firm: "", title: "" },
    stopping: null, /* id of the introduction whose Stop is asking for a cause */
    open: new Set(), /* "<introduction id> <member id>" for each card open under a row */
    busy: null,     /* id of the applicant, introduction, inquiry or card whose call is in flight */
    notice: null    /* the server's own sentence after a refused decision */
  };

  const TABS = [["applications", "Applications"], ["introductions", "Introductions"],
    ["lineage", "Lineage"], ["inquiries", "Inquiries"]];

  const isAdmin = () => BB.state.screen === "admin";

  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const day = iso => {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? "" : fmt.format(t);
  };
  const ago = iso => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "";
    const n = Math.floor((Date.now() - t) / 86400000);
    return n <= 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
  };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  /* ------------------------------------------------------------ loading --- */

  async function fetchInto(slot, path) {
    try {
      const rows = await BB.api(path);
      slot.rows = Array.isArray(rows) ? rows : [];
      slot.error = null;
    } catch (e) {
      slot.error = e && e.detail ? e.detail : "Could not load.";
    }
  }

  /* The lineage is read only when the tab on screen needs a name from it.
     Every read of it records a "lineage" look on every member's own trail,
     so reading it on each visit would fill every trail with looks nobody
     took. Applications needs it for a referrer and Introductions for both
     parties, and only for an id it does not already hold. The Lineage tab
     needs it once after each load, because the tree is what it shows. */
  function needsLineage() {
    if (S.tab === "lineage") return !S.lineage.fresh;
    const known = new Set(S.lineage.rows.map(r => r.id));
    const ids = S.tab === "applications" ? S.apps.rows.map(r => r.referrer_id)
      : S.tab === "introductions" ? S.queue.rows.flatMap(r => [r.requester_id, r.target_id])
      : [];
    return ids.some(id => id && !known.has(id));
  }

  async function names() {
    if (!needsLineage()) return;
    await fetchInto(S.lineage, "/api/broker/lineage");
    S.lineage.fresh = !S.lineage.error;
  }

  async function load() {
    S.loading = true;
    S.lineage.fresh = false;
    if (isAdmin()) render();
    /* The other three every time, whichever tab is up, so a switch of tab
       does not wait on the network for them. None of the three is a look at
       every member. */
    await Promise.all([
      fetchInto(S.apps, "/api/broker/applications"),
      fetchInto(S.queue, "/api/broker/queue"),
      fetchInto(S.inquiries, "/api/broker/inquiries")
    ]);
    /* After the lists, so the question is asked of the rows that came back
       and of whichever tab is up by then. */
    await names();
    S.loading = false;
    /* The broker may have moved on while the request was out; drawing this
       screen over another would be worse than dropping a redraw. */
    if (isAdmin()) render();
  }

  /* A decision is one POST and a reload. A 409 is a decision the machine
     refused and a 429 a pause; both arrive with the server's own sentence,
     and that sentence is the whole of what the broker needs to read. The
     reload runs either way, because the list is the truth and the refusal
     may be the list having moved. `gone`, when given, is the screen's own
     sentence for a 404, whose body differs by route. */
  async function decide(id, path, payload, gone) {
    S.busy = id;
    S.notice = null;
    render();
    try {
      await BB.api(path, { method: "POST", body: payload });
    } catch (e) {
      S.notice = gone && e && e.status === 404 ? gone
        : e && e.detail ? e.detail : "Something went wrong.";
    }
    S.busy = null;
    await load();
  }

  /* Release and Stop. A 404 is the introduction having moved on, released
     or stopped from another window. The broker may be one of the two, so
     the store's copy of their own introductions is marked stale whatever
     the answer, and their Introductions screen asks again. */
  async function settle(id, what, payload) {
    await decide(id, "/api/broker/introductions/" + id + "/" + what, payload,
      "That introduction is no longer waiting.");
    BB.store.invalidate("introductions");
  }

  /* A party's card, read only when asked for: every staff read of a card is
     a look recorded on that member's own trail, with this reason. The store
     keeps it for the page session, so closing it and opening it again reads
     nothing. */
  const CARD_REASON = "introduction review";

  async function card(introId, memberId) {
    const key = introId + " " + memberId;
    if (S.open.has(key)) { S.open.delete(key); render(); return; }
    S.busy = memberId;
    S.notice = null;
    render();
    try {
      await BB.store.member(memberId, CARD_REASON);
      S.open.add(key);
    } catch (e) {
      S.notice = e && e.status === 404 ? "That card is not available."
        : e && e.detail ? e.detail : "Could not load the card.";
    }
    S.busy = null;
    if (isAdmin()) render();
  }

  /* Dismissing an inquiry is one DELETE and a reload. The row is gone from
     the API's list whether or not the DELETE was refused, so the list is
     reloaded either way and the server's sentence, if any, shown above it. */
  async function dismiss(id) {
    S.busy = id;
    S.notice = null;
    render();
    try {
      await BB.api("/api/broker/inquiries/" + id, { method: "DELETE" });
    } catch (e) {
      S.notice = e && e.detail ? e.detail : "Something went wrong.";
    }
    S.busy = null;
    await load();
  }

  /* One listener on the screen root, which outlives every render. */
  const host = document.getElementById("screen");
  if (host) host.addEventListener("click", e => {
    const b = e.target.closest("[data-admin]");
    if (!b || !isAdmin()) return;
    const kind = b.dataset.admin;
    const id = encodeURIComponent(b.dataset.id || "");

    if (kind === "refresh") { S.notice = null; load(); return; }
    if (kind === "tab") {
      if (!TABS.some(([key]) => key === b.dataset.tab)) return;
      S.tab = b.dataset.tab;
      /* A load in flight asks for the names of whichever tab is up when its
         lists land, so only a switch between loads asks here. */
      if (S.loading || !needsLineage()) { render(); return; }
      S.loading = true;
      render();
      names().then(() => { S.loading = false; if (isAdmin()) render(); });
      return;
    }
    if (S.busy) return;

    if (kind === "dismiss") {
      dismiss(id);
      return;
    }

    if (kind === "card") {
      card(b.dataset.intro || "", b.dataset.id || "");
      return;
    }
    if (kind === "release") {
      if (!window.confirm("Release this introduction? Each of them gets the other's "
        + "name, email and LinkedIn. It cannot be undone.")) return;
      settle(id, "release");
      return;
    }
    if (kind === "stop") { S.stopping = b.dataset.id; render(); return; }
    if (kind === "stop-cancel") { S.stopping = null; render(); return; }
    if (kind === "cause") {
      const cause = b.dataset.cause;
      if (!CAUSES.some(([key]) => key === cause)) return;
      S.stopping = null;
      settle(id, "stop", { cause });
      return;
    }

    if (kind === "approve") {
      decide(id, "/api/members/" + id + "/approve");
      return;
    }
    if (kind === "reject") {
      const reason = window.prompt("Reason for turning this applicant away");
      if (reason === null) return;
      if (!reason.trim()) {
        S.notice = "A reason is needed to turn someone away.";
        render();
        return;
      }
      decide(id, "/api/members/" + id + "/depart", { reason: reason.trim() });
    }
  });

  /* The filters redraw the inquiry list alone, not the screen: a full render
     would replace the input the broker is typing into and drop the caret. */
  if (host) host.addEventListener("input", e => {
    const f = e.target.closest("[data-admin-filter]");
    if (!f || !isAdmin()) return;
    const key = f.dataset.adminFilter;
    if (!(key in S.filter)) return;
    S.filter[key] = f.value;
    const list = host.querySelector("#admin-inquiry-list");
    const count = host.querySelector("#admin-inquiry-count");
    if (list) list.innerHTML = inquiryList();
    if (count) count.textContent = inquiryCount();
  });

  /* ------------------------------------------------------- applications --- */

  const referrerLine = (id, byId) => {
    if (!id) return "No referrer";
    if (!byId.has(id)) return "Referrer not on the list";
    return "Invited by " + (byId.get(id) || "a departed seat");
  };

  function applications() {
    const a = S.apps;
    if (a.error) return `<div class="empty"><b>Could not load applications.</b>${esc(a.error)}</div>`;
    if (S.loading && (!a.rows.length || needsLineage())) return `<p class="admin-state muted">Loading</p>`;
    if (!a.rows.length) return `<div class="empty">Nothing waiting.</div>`;

    const byId = new Map(S.lineage.rows.map(r => [r.id, r.name]));
    const off = S.busy ? " disabled" : "";
    return `<div class="stack">${a.rows.map(r => `
      <div class="card admin-row">
        <div class="spread" style="align-items:flex-start">
          <div class="grow">
            <div class="admin-name">${esc(r.name) || '<span class="muted">Unnamed</span>'}</div>
            <div class="small muted">${esc(r.role_title)} at ${esc(r.firm)}</div>
            <div class="small muted">${esc(r.sector)} · ${esc(r.city)}</div>
            <div class="small muted" style="margin-top:6px">${esc(referrerLine(r.referrer_id, byId))}
              · Applied ${esc(day(r.created_at))}, ${esc(ago(r.created_at))}</div>
          </div>
          <div class="row admin-acts">
            <button class="btn primary sm" data-admin="approve" data-id="${esc(r.id)}"${off}>Approve</button>
            <button class="btn sm" data-admin="reject" data-id="${esc(r.id)}"${off}>Reject</button>
          </div>
        </div>
      </div>`).join("")}</div>`;
  }

  /* ------------------------------------------------------------ lineage --- */

  /* Walked from referrer_id rather than read off `path`. The two agree
     wherever the path is filled in, but the founder is seeded outside the
     invitation flow with an empty path, and a joiner under an empty path gets
     a one-segment path of their own: counting segments would sit the
     founder's invitees at the founder's depth. The walk cannot. */
  function tree() {
    const rows = S.lineage.rows;
    const byId = new Map(rows.map(r => [r.id, r]));
    const kids = new Map();
    rows.forEach(r => {
      const k = r.referrer_id && byId.has(r.referrer_id) ? r.referrer_id : null;
      if (!kids.has(k)) kids.set(k, []);
      kids.get(k).push(r);
    });
    const byAge = (x, y) => String(x.created_at).localeCompare(String(y.created_at));

    const out = [];
    const walk = (parent, depth) => {
      (kids.get(parent) || []).sort(byAge).forEach(r => {
        out.push(node(r, depth, (kids.get(r.id) || []).length));
        walk(r.id, depth + 1);
      });
    };
    walk(null, 0);
    return out.join("");
  }

  const node = (r, depth, invited) => `
    <div class="lineage-node" style="--depth:${depth}">
      <span class="lineage-name">${r.name ? esc(r.name) : '<span class="muted">departed seat</span>'}</span>
      <span class="pill plain">${esc(cap(r.status))}</span>
      <span class="small muted">${r.approved_at
        ? "Joined " + esc(day(r.approved_at))
        : "Applied " + esc(day(r.created_at))}</span>
      <span class="small muted tabular">Invited ${invited}</span>
    </div>`;

  function lineage() {
    const l = S.lineage;
    if (l.error) return `<div class="empty"><b>Could not load the lineage.</b>${esc(l.error)}</div>`;
    if (S.loading && !l.rows.length) return `<p class="admin-state muted">Loading</p>`;
    if (!l.rows.length) return `<div class="empty">Nobody yet.</div>`;
    return `<div class="lineage">${tree()}</div>`;
  }

  /* ---------------------------------------------------------- inquiries --- */

  const has = (value, needle) => String(value || "").toLowerCase().includes(needle);

  /* Case-insensitive substring on each of the three filters, all of which
     must match. An empty filter matches everything. */
  function matching() {
    const sector = S.filter.sector.trim().toLowerCase();
    const firm = S.filter.firm.trim().toLowerCase();
    const title = S.filter.title.trim().toLowerCase();
    return S.inquiries.rows.filter(r =>
      (!sector || has(r.sector, sector)) &&
      (!firm || has(r.firm, firm)) &&
      (!title || has(r.role_title, title)));
  }

  const filtering = () => Boolean(S.filter.sector.trim() || S.filter.firm.trim() || S.filter.title.trim());

  function inquiryCount() {
    const all = S.inquiries.rows.length;
    if (!filtering()) return all + (all === 1 ? " inquiry" : " inquiries");
    return matching().length + " of " + all + " shown";
  }

  /* The address is a link only when it is one the browser would open as a
     page. Anything else the API may hold is shown as text, so a stored
     string can never become a javascript: or data: href on this screen. */
  const profileLink = url => {
    const text = String(url || "");
    if (!/^https?:\/\//i.test(text)) return esc(text);
    // Shown as linkedin.com/in/<handle>: the scheme and www are noise on a
    // phone, where the full address broke in the middle of the handle.
    const shown = text.replace(/^https?:\/\/(www\.)?/i, "");
    return `<a href="${esc(text)}" target="_blank" rel="noopener noreferrer">${esc(shown)}</a>`;
  };

  function inquiryList() {
    const q = S.inquiries;
    if (q.error) return `<div class="empty"><b>Could not load the inquiries.</b>${esc(q.error)}</div>`;
    if (S.loading && !q.rows.length) return `<p class="admin-state muted">Loading</p>`;
    if (!q.rows.length) return `<div class="empty">Nobody has asked.</div>`;
    const rows = matching();
    if (!rows.length) return `<div class="empty">Nothing matches the filters.</div>`;

    const off = S.busy ? " disabled" : "";
    return `<div class="stack">${rows.map(r => `
      <div class="card admin-row">
        <div class="spread" style="align-items:flex-start">
          <div class="grow">
            <div class="admin-name">${esc(r.full_name) || '<span class="muted">Unnamed</span>'}</div>
            <div class="small muted">${esc(r.role_title)} at ${esc(r.firm)}</div>
            <div class="small muted">${esc(r.sector)}</div>
            <div class="small admin-link">${profileLink(r.linkedin_url)}</div>
            <div class="small muted">${esc(r.email)}</div>
            <div class="small muted" style="margin-top:6px">Asked ${esc(day(r.created_at))}, ${esc(ago(r.created_at))}</div>
          </div>
          <div class="row admin-acts">
            <button class="btn sm" data-admin="dismiss" data-id="${esc(r.id)}"${off}>Dismiss</button>
          </div>
        </div>
      </div>`).join("")}</div>`;
  }

  const filterField = (key, label) => `
    <label class="admin-filter">
      <span class="lbl">${label}</span>
      <input type="search" data-admin-filter="${key}" value="${esc(S.filter[key])}"
        autocomplete="off" autocapitalize="off" spellcheck="false">
    </label>`;

  const inquiries = () => `
  <div class="admin-filters">
    ${filterField("sector", "Sector")}
    ${filterField("firm", "Firm")}
    ${filterField("title", "Title")}
  </div>
  <div id="admin-inquiry-list">${inquiryList()}</div>`;

  /* ------------------------------------------------------ introductions --- */

  /* The causes a stop is recorded with, and the only ones sent (D11).
     Neither member ever reads one: both see did_not_proceed whichever it
     is. */
  const CAUSES = [["not_a_fit", "Not a fit"], ["conflict", "Conflict"], ["broker_stopped", "Other"]];

  /* Names come from the lineage, by id. The queue carries none. */
  const who = (id, byId) => {
    if (!byId.has(id)) return '<span class="muted">a seat not on the list</span>';
    return byId.get(id) ? esc(byId.get(id)) : '<span class="muted">a departed seat</span>';
  };

  const since = (word, iso) => iso ? word + " " + day(iso) + ", " + ago(iso) : "";

  const cardButton = (r, id, byId, off) => `
            <button class="btn quiet sm" data-admin="card" data-intro="${esc(r.id)}" data-id="${esc(id)}"
              aria-expanded="${S.open.has(r.id + " " + id)}"${off}>${byId.get(id) ? esc(byId.get(id)) + "'s card" : "Card"}</button>`;

  /* The StaffView the store holds, drawn once it is open. */
  const cardOf = (r, id) => {
    const v = S.open.has(r.id + " " + id) ? BB.store.peek("member:" + id) : null;
    if (!v) return "";
    return `
            <div class="small" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
              <div class="admin-name">${esc(v.name) || '<span class="muted">Unnamed</span>'}</div>
              <div class="muted">${esc(v.role_title)} at ${esc(v.firm)}</div>
              <div class="muted">${esc(v.sector)} · ${esc(v.city)} · ${esc(cap(v.status))}</div>
              <div class="admin-link">${profileLink(v.linkedin_url)}</div>
              <div class="muted">${esc(v.email)}</div>
              ${v.vetting_notes ? `<div class="muted" style="margin-top:6px">${esc(v.vetting_notes)}</div>` : ""}
            </div>`;
  };

  const causes = (id, off) => `
        <div class="row" style="margin-top:12px" role="group" aria-label="Why stop it">
          <span class="small muted">Why stop it? Neither of them sees the reason.</span>
          ${CAUSES.map(([cause, label]) =>
            `<button class="btn sm" data-admin="cause" data-id="${esc(id)}" data-cause="${cause}"${off}>${label}</button>`
          ).join("")}
          <button class="btn quiet sm" data-admin="stop-cancel"${off}>Cancel</button>
        </div>`;

  /* Oldest first, as the API sends them. Two times on each: when it was
     asked for, and when the other side said yes and it reached you. */
  function introductionList() {
    const q = S.queue;
    if (q.error) return `<div class="empty"><b>Could not load the introductions.</b>${esc(q.error)}</div>`;
    if (S.loading && (!q.rows.length || needsLineage())) return `<p class="admin-state muted">Loading</p>`;
    if (!q.rows.length) return `<div class="empty">Nothing waiting.</div>`;

    const byId = new Map(S.lineage.rows.map(r => [r.id, r.name]));
    const off = S.busy ? " disabled" : "";
    return `<div class="stack">${q.rows.map(r => `
      <div class="card admin-row">
        <div class="spread" style="align-items:flex-start">
          <div class="grow">
            <div class="admin-name">${who(r.requester_id, byId)} <span class="muted">asked to meet</span> ${who(r.target_id, byId)}</div>
            <div class="small muted" style="margin-top:6px">${esc([since("Asked", r.requested_at),
              since("Accepted", r.accepted_at)].filter(Boolean).join(" · "))}</div>
            <div class="row" style="margin-top:8px">${cardButton(r, r.requester_id, byId, off)}${cardButton(r, r.target_id, byId, off)}
            </div>${cardOf(r, r.requester_id)}${cardOf(r, r.target_id)}
          </div>
          <div class="row admin-acts">
            <button class="btn primary sm" data-admin="release" data-id="${esc(r.id)}"${off}>Release</button>
            <button class="btn sm" data-admin="stop" data-id="${esc(r.id)}"
              aria-expanded="${S.stopping === r.id}"${off}>Stop</button>
          </div>
        </div>${S.stopping === r.id ? causes(r.id, off) : ""}
      </div>`).join("")}</div>`;
  }

  /* --------------------------------------------------------------- page --- */

  const tabs = () => `
  <div class="segmented admin-tabs" role="group" aria-label="Section">
    ${TABS.map(([key, label]) =>
      `<button type="button" data-admin="tab" data-tab="${key}" aria-pressed="${S.tab === key}">${label}</button>`
    ).join("")}
  </div>`;

  function section() {
    if (S.tab === "introductions") return `
  <div class="card-head">
    <h2>Introductions</h2>
    <span class="eyebrow">${S.queue.rows.length} waiting</span>
  </div>
  ${introductionList()}`;
    if (S.tab === "lineage") return `
  <div class="card-head">
    <h2>Lineage</h2>
    <span class="eyebrow">${S.lineage.rows.length} seats</span>
  </div>
  ${lineage()}`;
    if (S.tab === "inquiries") return `
  <div class="card-head">
    <h2>Inquiries</h2>
    <span class="eyebrow" id="admin-inquiry-count">${esc(inquiryCount())}</span>
  </div>
  ${inquiries()}`;
    return `
  <div class="card-head">
    <h2>Applications</h2>
    <span class="eyebrow">${S.apps.rows.length} waiting</span>
  </div>
  ${applications()}`;
  }

  const page = () => `
  <div class="page-head">
    <div>
      <h1>Admin</h1>
      <p class="sub">Who is waiting at the door, which introductions are
        waiting on you, who invited whom, and who has asked to be let in.
        Every decision here is taken by the API and recorded against your
        seat.</p>
    </div>
    <button class="btn sm" data-admin="refresh"${S.loading ? " disabled" : ""}>${S.loading ? "Loading" : "Refresh"}</button>
  </div>

  ${S.notice ? `<div class="admin-notice" role="alert">${esc(S.notice)}</div>` : ""}

  ${tabs()}
  ${section()}`;

  /* Set from the API's answer and from nothing else. */
  let confirmed = false;

  BB.screens.admin = function () {
    /* What this call draws is decided now, so the answer below cannot
       redraw a page that is already the admin page, which would ask again
       and never stop. */
    const drawn = confirmed;
    BB.auth.isStaff().then(ok => {
      if (!isAdmin()) return;
      if (!ok) {
        /* Home is put back so the address is not left pointing here, and
           the tab goes with it if something other than the API put it up. */
        BB.staff = false;
        BB.state.screen = "home";
        render();
        return;
      }
      confirmed = true;
      if (!S.started) { S.started = true; load(); return; }
      if (!drawn) render();
    });
    /* Until the answer, the loading line every screen waiting on data shows.
       Not Home: Home reads the store, and this screen fills none of it. */
    return drawn ? page() : `<p class="admin-state muted" role="status">Loading</p>`;
  };
})();
