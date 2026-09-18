/* Admin, the broker's desk. Staff only.

   Three lists, all from the live API and none from data.js: the applicants
   waiting at the door, with Approve and Reject on each, the lineage of every
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
    lineage: { rows: [], error: null },
    inquiries: { rows: [], error: null },
    filter: { sector: "", firm: "", title: "" },
    busy: null,     /* id of the applicant or inquiry whose call is in flight */
    notice: null    /* the server's own sentence after a refused decision */
  };

  const TABS = [["applications", "Applications"], ["lineage", "Lineage"], ["inquiries", "Inquiries"]];

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

  async function load() {
    S.loading = true;
    if (isAdmin()) render();
    /* All three every time, whichever tab is up: Applications reads the
       referrer's name out of the lineage, and a switch of tab should not
       wait on the network. */
    await Promise.all([
      fetchInto(S.apps, "/api/broker/applications"),
      fetchInto(S.lineage, "/api/broker/lineage"),
      fetchInto(S.inquiries, "/api/broker/inquiries")
    ]);
    S.loading = false;
    /* The broker may have moved on while the request was out; drawing this
       screen over another would be worse than dropping a redraw. */
    if (isAdmin()) render();
  }

  /* A decision is one POST and a reload. A 409 is a decision the machine
     refused and a 429 a pause; both arrive with the server's own sentence,
     and that sentence is the whole of what the broker needs to read. The
     reload runs either way, because the list is the truth and the refusal
     may be the list having moved. */
  async function decide(id, path, payload) {
    S.busy = id;
    S.notice = null;
    render();
    try {
      await BB.api(path, { method: "POST", body: payload });
    } catch (e) {
      S.notice = e && e.detail ? e.detail : "Something went wrong.";
    }
    S.busy = null;
    await load();
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
      if (TABS.some(([key]) => key === b.dataset.tab)) { S.tab = b.dataset.tab; render(); }
      return;
    }
    if (S.busy) return;

    if (kind === "dismiss") {
      dismiss(id);
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
    if (S.loading && !a.rows.length) return `<p class="admin-state muted">Loading</p>`;
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

  /* --------------------------------------------------------------- page --- */

  const tabs = () => `
  <div class="segmented admin-tabs" role="group" aria-label="Section">
    ${TABS.map(([key, label]) =>
      `<button type="button" data-admin="tab" data-tab="${key}" aria-pressed="${S.tab === key}">${label}</button>`
    ).join("")}
  </div>`;

  function section() {
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
      <p class="sub">Who is waiting at the door, who invited whom, and who has
        asked to be let in. Every decision here is taken by the API and
        recorded against your seat.</p>
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
    return drawn ? page() : BB.screens.home();
  };
})();
