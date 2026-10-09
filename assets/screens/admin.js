/* Admin, the broker's desk. Staff only.

   Five lists, all from the live API and none from data.js: the applicants
   waiting at the door, with Approve and Reject on each, the introductions
   waiting on a release, with Release and Stop on each, the members who have
   been reported, with their reports on each, the lineage of every seat as a
   tree, with the decisions its standing allows on each, and the membership
   inquiries from the public form, with Dismiss on each. A sixth section,
   Concierge, mints an invitation that carries the details of the person it
   is for. One is shown at a time behind a segmented control. The screen
   holds what the API sent in memory for the session and writes none of it
   anywhere; a reload starts from nothing.

   The tab that reaches here is drawn only when BB.auth.isStaff() has said
   yes, and this function asks the same question again on every visit, before
   drawing anything, because a screen name is a string anybody can type into
   BB.state and BB.staff is a property anybody can set. Neither is read here:
   the only thing that lets the page draw is the API's own answer, kept in a
   variable this file alone can reach. The API refuses a member on every call
   regardless; the check here is so a member never sees an empty admin page
   with five 404s behind it. */

(function () {
  "use strict";

  const S = {
    started: false,
    loading: false,
    tab: "applications",
    apps: { rows: [], error: null },
    queue: { rows: [], error: null },
    conduct: { rows: [], error: null, fresh: false },
    lineage: { rows: [], error: null, fresh: false },
    inquiries: { rows: [], error: null },
    filter: { sector: "", firm: "", title: "" },
    stopping: null, /* id of the introduction whose Stop is asking for a cause */
    open: new Set(), /* "<introduction id> <member id>" for each card open under a row */
    reports: new Map(), /* reported member's id -> their reports, for each list open under a row */
    busy: null,     /* id of the applicant, introduction, inquiry, card or member whose call is in flight */
    notice: null,   /* the server's own sentence after a refused decision */
    concierge: {
      fields: { first_name: "", last_name: "", firm: "", role_title: "", city: "" },
      busy: false,  /* a mint is in flight */
      minted: null  /* the last answer: {code, expires_at, hours, link} */
    }
  };

  const TABS = [["applications", "Applications"], ["introductions", "Introductions"],
    ["conduct", "Conduct"], ["lineage", "Lineage"], ["inquiries", "Inquiries"],
    ["concierge", "Concierge"]];

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
     took. Applications needs it for a referrer, Introductions for both
     parties and Conduct for each reported member and each reporter, and only
     for an id it does not already hold. The Lineage tab needs it once after
     each load, because the tree is what it shows. */
  function needsLineage() {
    if (S.tab === "lineage") return !S.lineage.fresh;
    const known = new Set(S.lineage.rows.map(r => r.id));
    const ids = S.tab === "applications" ? S.apps.rows.map(r => r.referrer_id)
      : S.tab === "introductions" ? S.queue.rows.flatMap(r => [r.requester_id, r.target_id])
      : S.tab === "conduct" ? S.conduct.rows.map(r => r.subject_id)
        .concat(Array.from(S.reports.values()).flat().map(r => r.reporter_id))
      : [];
    return ids.some(id => id && !known.has(id));
  }

  async function names() {
    if (!needsLineage()) return;
    await fetchInto(S.lineage, "/api/broker/lineage");
    S.lineage.fresh = !S.lineage.error;
  }

  /* The conduct index is read only while its tab is up, once after each
     load, for the lineage's reason: every read of it records a conduct look
     at every member it lists. Those looks are not on the member's own trail,
     but a look nobody took is still a false record. */
  const needsConduct = () => S.tab === "conduct" && !S.conduct.fresh;

  async function conduct() {
    if (!needsConduct()) return;
    await fetchInto(S.conduct, "/api/broker/conduct");
    S.conduct.fresh = !S.conduct.error;
  }

  async function load() {
    S.loading = true;
    S.lineage.fresh = false;
    S.conduct.fresh = false;
    S.reports.clear();
    if (isAdmin()) render();
    /* The other three every time, whichever tab is up, so a switch of tab
       does not wait on the network for them. None of the three is a look at
       every member, nor at every member reported. */
    await Promise.all([
      fetchInto(S.apps, "/api/broker/applications"),
      fetchInto(S.queue, "/api/broker/queue"),
      fetchInto(S.inquiries, "/api/broker/inquiries")
    ]);
    /* After the lists, so the question is asked of the rows that came back
       and of whichever tab is up by then. */
    await conduct();
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
     sentence for a 404, whose body differs by route. Resolves with the
     server's answer, or with nothing after a refusal. */
  async function decide(id, path, payload, gone) {
    S.busy = id;
    S.notice = null;
    render();
    let answer;
    try {
      answer = await BB.api(path, { method: "POST", body: payload });
    } catch (e) {
      S.notice = gone && e && e.status === 404 ? gone
        : e && e.detail ? e.detail : "Something went wrong.";
    }
    /* Held until the list is read again, or the row just decided is drawn
       live from the old list and a second click decides it twice. */
    await load();
    S.busy = null;
    if (isAdmin()) render();
    return answer;
  }

  /* Approve is the one decision whose answer is read. Since 9 October 2026
     the API sends the member their sign-in invitation inside the request,
     and the StaffView it answers with carries invited_at once that has gone.
     Null means the API had no key to send it with, which on the local
     harness is always, so the toast says to send it by hand instead. A 502
     is the invitation failing: the API rolled the approval back, so the
     applicant is still on the list when it reloads, and the server's
     sentence above it says to try again. One request however fast it is
     tapped: S.busy is set before the first await and the click handler
     returns while it is set. */
  async function approve(id) {
    const view = await decide(id, "/api/members/" + id + "/approve");
    if (!view) return;
    toast(view.invited_at ? "Approved. The invitation has been sent."
      : "Approved. The invitation must be sent by hand.");
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
     nothing. The reason is the one every other card read gives (core.js):
     the member reads it beside the look, and a reason that named the
     review would tell an asker the other side had said yes. */
  const CARD_REASON = "member card";

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

  /* One member's reports, read only when asked for and read again on each
     opening, so what is shown is what is on file. Each read is a conduct
     look recorded with this reason, which the member's own trail leaves out.
     The reporters' names come from the lineage, which may need reading for a
     reporter who joined after it was last read. */
  const REPORTS_REASON = "conduct review";

  async function reports(memberId) {
    if (S.reports.has(memberId)) { S.reports.delete(memberId); render(); return; }
    S.busy = memberId;
    S.notice = null;
    render();
    try {
      const rows = await BB.api("/api/conduct/reports/" + encodeURIComponent(memberId)
        + "?reason=" + encodeURIComponent(REPORTS_REASON));
      S.reports.set(memberId, Array.isArray(rows) ? rows : []);
      await names();
    } catch (e) {
      S.notice = e && e.status === 404 ? "Those reports are no longer on file."
        : e && e.detail ? e.detail : "Could not load the reports.";
    }
    S.busy = null;
    if (isAdmin()) render();
  }

  /* The decisions a lineage node can offer, by the seat's standing, as
     LEGAL_FROM in the API's app/lifecycle.py allows them. A pending seat is
     decided on Applications, and departed and banned have no way out, so
     those three offer nothing. `ask` is the prompt for a reason (D11):
     Suspend, Remove and Ban each need one, Reinstate and Thaw take none. */
  const DECISIONS = {
    suspend: { label: "Suspend", ask: "Reason for suspending",
      warn: "They are signed out at once, and only Reinstate lets them back in." },
    reinstate: { label: "Reinstate" },
    thaw: { label: "Thaw" },
    depart: { label: "Remove", ask: "Reason for removing",
      warn: "A removal cannot be undone." },
    ban: { label: "Ban", ask: "Reason for banning",
      warn: "A ban cannot be undone." }
  };
  const OFFERED = {
    active: ["suspend", "depart", "ban"],
    suspended: ["reinstate", "depart", "ban"],
    frozen: ["thaw", "suspend", "depart", "ban"]
  };
  const MAX_REASON = 200; /* the API's MAX_REASON, refused there with a 422 */

  /* One POST through decide(), then the store's copies that the decision
     makes stale: the member's card, whose standing has changed, and the
     founder's own introductions, which a removal or a ban ends if he is one
     of the two. */
  async function act(memberId, decision, name) {
    const what = DECISIONS[decision];
    let payload;
    if (what.ask) {
      const reason = window.prompt(what.ask + " " + (name || "this member") + ". " + what.warn);
      if (reason === null) return;
      const text = reason.trim();
      if (!text || text.length > MAX_REASON) {
        S.notice = text ? "A reason can be at most " + MAX_REASON + " characters."
          : "A reason is needed for that decision.";
        render();
        return;
      }
      payload = { reason: text };
    }
    await decide(memberId, "/api/members/" + encodeURIComponent(memberId) + "/" + decision,
      payload, "That seat is no longer on the list.");
    BB.store.invalidate(["member:" + memberId, "introductions"]);
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
    await load();
    S.busy = null;
    if (isAdmin()) render();
  }

  /* A concierge invitation is one POST from the founder's own seat, carrying
     whichever of the five details were filled in; a blank one is not sent.
     One request per tap: the button is disabled until the answer, and the
     toast waits for it. The details are cleared after a success, so the
     next invitation starts from an empty form, and kept after a refusal, so
     nothing has to be typed again. The API holds them sealed and clears them
     when the code is spent, revoked or runs out; the link carries the code
     alone. Nothing is reloaded: no list on this screen changes until the
     invitee applies. */
  async function concierge() {
    const c = S.concierge;
    if (c.busy) return;
    const body = {};
    for (const [key, value] of Object.entries(c.fields)) {
      if (value.trim()) body[key] = value.trim();
    }
    c.busy = true;
    render();
    let made = false;
    try {
      c.minted = await BB.api("/api/broker/invitations", { method: "POST", body });
      for (const key of Object.keys(c.fields)) c.fields[key] = "";
      made = true;
      toast("Invitation ready.");
    } catch (e) {
      toast(e && e.detail ? e.detail : "Could not create an invitation.");
    }
    c.busy = false;
    if (!isAdmin()) return;
    render();
    /* The link lands under the form, below the fold on a phone, so it is
       brought up to where the founder is looking. Centred, because the tab
       bar covers the foot of the screen there. */
    const card = made && S.tab === "concierge" && host && host.querySelector(".invite-code");
    if (card) card.scrollIntoView({ block: "center" });
  }

  /* The member card's sentence (boot.js), with the link that opens the join
     page with the code already in it. */
  const conciergeText = m =>
    "I am inviting you to Blackbook London. Your private access code is: "
    + m.code + ". Join here: " + m.link;

  const copy = (text, done, failed) => {
    if (!navigator.clipboard) { toast(failed); return; }
    navigator.clipboard.writeText(text).then(() => toast(done), () => toast(failed));
  };

  /* WhatsApp, LinkedIn and Copy, as on the member's invitation card in
     boot.js and for its reasons: wa.me carries the message and the founder
     picks the recipient; LinkedIn takes no message text, so it goes on the
     clipboard and LinkedIn's messaging opens. Both tabs open synchronously
     from the tap, or the browser treats them as pop-ups. A tab opened with
     noopener is never handed back, so whether it opened cannot be told. */
  function share(how) {
    const m = S.concierge.minted;
    if (!m) return;
    const text = conciergeText(m);
    if (how === "wa") {
      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
    } else if (how === "linkedin") {
      window.open("https://www.linkedin.com/messaging/", "_blank", "noopener");
      copy(text, "Message copied. Paste it into a LinkedIn message.",
        "Copy the message from the card and paste it into a LinkedIn message.");
    } else {
      copy(text, "Copied.", "Could not copy. Select the message and copy it by hand.");
    }
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
      /* A load in flight asks for the index and the names of whichever tab
         is up when its lists land, so only a switch between loads asks here.
         The names are asked for after the index, whose rows they are for. */
      if (S.loading || !(needsConduct() || needsLineage())) { render(); return; }
      S.loading = true;
      render();
      conduct().then(names).then(() => { S.loading = false; if (isAdmin()) render(); });
      return;
    }
    /* Neither waits on a decision in flight, nor holds one up. */
    if (kind === "concierge") { concierge(); return; }
    if (kind === "concierge-share") {
      if (["wa", "linkedin", "copy"].includes(b.dataset.how)) share(b.dataset.how);
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
    if (kind === "reports") {
      reports(b.dataset.id || "");
      return;
    }
    if (kind === "decide") {
      if (!Object.keys(DECISIONS).includes(b.dataset.decision)) return;
      act(b.dataset.id || "", b.dataset.decision, b.dataset.name || "");
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
      approve(id);
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
     would replace the input the broker is typing into and drop the caret.
     The concierge fields redraw nothing; each is held so a render puts it
     back as it was. */
  if (host) host.addEventListener("input", e => {
    const d = e.target.closest("[data-concierge]");
    if (d && isAdmin() && d.dataset.concierge in S.concierge.fields) {
      S.concierge.fields[d.dataset.concierge] = d.value;
      return;
    }
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
            <div class="small muted">${[r.sector, r.city].filter(Boolean).map(esc).join(" · ")}</div>
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

  /* The founder's own node offers nothing, because the API refuses a
     suspension, a removal or a ban taken about the caller's own seat. His is
     the one staff seat, so the node is known by its role. */
  const decisions = r => {
    const offered = r.role === "founder" ? [] : OFFERED[r.status] || [];
    if (!offered.length) return "";
    const off = S.busy ? " disabled" : "";
    return `
      <span class="row" style="margin-left:auto">${offered.map(d => `
        <button class="btn sm${d === "depart" || d === "ban" ? " danger" : ""}" data-admin="decide" data-decision="${d}"
          data-id="${esc(r.id)}" data-name="${esc(r.name)}"${off}>${DECISIONS[d].label}</button>`).join("")}
      </span>`;
  };

  const node = (r, depth, invited) => `
    <div class="lineage-node" style="--depth:${depth}">
      <span class="lineage-name">${r.name ? esc(r.name) : '<span class="muted">departed seat</span>'}</span>
      <span class="pill plain">${esc(cap(r.status))}</span>
      <span class="small muted">${r.approved_at
        ? "Joined " + esc(day(r.approved_at))
        : "Applied " + esc(day(r.created_at))}</span>
      <span class="small muted tabular">Invited ${invited}</span>${decisions(r)}
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
              <div class="muted">${[v.sector, v.city, cap(v.status)].filter(Boolean).map(esc).join(" · ")}</div>
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

  /* ------------------------------------------------------------ conduct --- */

  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

  /* Oldest first, as the API sends them. The reason reads in the words the
     member chose it by (REPORT_REASONS in data.js), and the detail as they
     wrote it. */
  const reportsOf = (id, byId) => {
    const rows = S.reports.get(id);
    if (!rows) return "";
    if (!rows.length) return `
            <div class="small muted" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">No reports on file.</div>`;
    return rows.map((x, i) => `
            <div class="small" style="margin-top:10px;${i ? "" : "padding-top:10px;border-top:1px solid var(--line)"}">
              <div><b>${esc(REPORT_REASONS[x.reason] || x.reason)}</b></div>
              <div class="muted">${who(x.reporter_id, byId)} · ${esc(day(x.at))}</div>
              ${x.detail ? `<div class="muted" style="margin-top:4px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(x.detail)}</div>` : ""}
            </div>`).join("");
  };

  /* Most recently reported first, as the API sends them. One report is
     never acted on; the signal is two members saying the same thing, so a
     member reported by two or more is drawn inverted. */
  function conductList() {
    const c = S.conduct;
    if (c.error) return `<div class="empty"><b>Could not load the reports.</b>${esc(c.error)}</div>`;
    if (S.loading && (!c.rows.length || needsLineage())) return `<p class="admin-state muted">Loading</p>`;
    if (!c.rows.length) return `<div class="empty">Nobody has been reported.</div>`;

    const byId = new Map(S.lineage.rows.map(r => [r.id, r.name]));
    const off = S.busy ? " disabled" : "";
    return `<div class="stack">${c.rows.map(r => `
      <div class="card admin-row">
        <div class="spread" style="align-items:flex-start">
          <div class="grow">
            <div class="admin-name">${who(r.subject_id, byId)}</div>
            <div style="margin-top:6px"><span class="pill ${r.reporters >= 2 ? "solid" : "plain"}">${esc(
              plural(r.reports, "report", "reports") + " from " + plural(r.reporters, "member", "members"))}</span></div>
            <div class="small muted" style="margin-top:6px">${esc(r.reports > 1
              ? since("First reported", r.first_at) + " · " + since("Latest", r.latest_at)
              : since("Reported", r.first_at))}</div>${reportsOf(r.subject_id, byId)}
          </div>
          <div class="row admin-acts">
            <button class="btn sm" data-admin="reports" data-id="${esc(r.subject_id)}"
              aria-expanded="${S.reports.has(r.subject_id)}"${off}>${S.reports.has(r.subject_id) ? "Hide reports" : "Reports"}</button>
          </div>
        </div>
      </div>`).join("")}</div>`;
  }

  /* ---------------------------------------------------------- concierge --- */

  /* The five, in the order they are said aloud, with the API's limit for
     each (app/profile.py), so the browser stops where the API would refuse.
     autocomplete is off: these are somebody else's details, and the browser
     would offer the founder's own. */
  const CONCIERGE = [["first_name", "First name", 120], ["last_name", "Last name", 120],
    ["firm", "Firm", 160], ["role_title", "Role", 160], ["city", "City", 80]];

  const timeOf = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
  const until = iso => {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? "" : ", until " + timeOf.format(t) + " on " + fmt.format(t);
  };

  const minted = m => `
    <div class="invite-code" aria-live="polite" style="margin-top:16px">
      <span class="lbl">Invitation link</span>
      <span class="invite-link">${esc(m.link)}</span>
      <span class="small muted">Valid for ${esc(m.hours)} hours${esc(until(m.expires_at))}.</span>
      <p class="small invite-message">${esc(conciergeText(m))}</p>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:8px">
      <button class="btn sm primary" data-admin="concierge-share" data-how="wa">Invite by WhatsApp</button>
      <button class="btn sm" data-admin="concierge-share" data-how="linkedin">Invite by LinkedIn</button>
      <button class="btn sm" data-admin="concierge-share" data-how="copy">Copy the message</button>
    </div>`;

  function conciergeCard() {
    const c = S.concierge;
    return `
  <div class="card">
    <p class="small muted" style="line-height:1.6;margin-bottom:14px">
      An invitation from your seat with the person's details already in it.
      Their join page opens filled in, so they type only their email, and
      they can change anything you wrote. Every field is optional. The link
      carries only the code. The details are deleted when the code is used
      or revoked, and within a day of it running out.
    </p>
    <div class="admin-concierge">${CONCIERGE.map(([key, label, max]) => `
      <label class="admin-filter">
        <span class="lbl">${label}</span>
        <input type="text" data-concierge="${key}" value="${esc(c.fields[key])}" maxlength="${max}"
          autocomplete="off" spellcheck="false">
      </label>`).join("")}
    </div>
    <button class="btn primary sm" data-admin="concierge"${c.busy ? " disabled" : ""}>${c.busy ? "Generating" : "Generate invitation"}</button>
    ${c.minted ? minted(c.minted) : ""}
  </div>`;
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
    if (S.tab === "conduct") return `
  <div class="card-head">
    <h2>Conduct</h2>
    <span class="eyebrow">${S.conduct.rows.length} reported</span>
  </div>
  ${conductList()}`;
    if (S.tab === "lineage") return `
  <div class="card-head">
    <h2>Lineage</h2>
    <span class="eyebrow">${plural(S.lineage.rows.length, "seat", "seats")}</span>
  </div>
  ${lineage()}`;
    if (S.tab === "inquiries") return `
  <div class="card-head">
    <h2>Inquiries</h2>
    <span class="eyebrow" id="admin-inquiry-count">${esc(inquiryCount())}</span>
  </div>
  ${inquiries()}`;
    if (S.tab === "concierge") return `
  <div class="card-head">
    <h2>Concierge invite</h2>
  </div>
  ${conciergeCard()}`;
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
        waiting on you, who has been reported, who invited whom, and who has
        asked to be let in. Concierge invites someone by name. Every
        decision here is taken by the API and recorded against your
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
