/* Introductions, the double opt-in, made visible.

   Every card is a row of GET /api/introductions: its state, which side of it
   the member is on, when it was asked for, and, once released, the other
   side's name, email address and LinkedIn. Before the release a row names
   nobody, so until then a card carries no name, no seat and no firm.

   The state is shown as a state, not hidden behind a status word, with one
   exception that is the point of the design: the asker reads "Checking with
   them" from the moment they ask until we release it or it ends. They are
   never shown that the other side said yes and it is with us, so a decline,
   a withdrawal and our own stop all end the same way, as did not proceed.

   Declining is one silent step. Accept, decline and withdraw go to the
   server (boot.js), and so do the answers to met in person, whose requests
   are GET /api/ties/requests. On a released card the other side's name opens
   their card, from contact.member_id, and they can be reported there too
   (profile.js). */

const INTRO_LIVE = ["requested", "side_a_accepted", "side_b_accepted", "broker_review"];

/* "Asked 7 Oct 2026". A date that will not parse is left out rather than
   drawn as "Invalid Date". */
const introAsked = iso => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : "Asked " + shortDate.format(t);
};

/* The LinkedIn address is a link only when it is one the browser would open
   as a page, so a stored string can never become a javascript: href here.
   Shown without the scheme and www, as Admin shows it. */
const introLinkedIn = url => {
  const text = String(url || "");
  if (!/^https:\/\//i.test(text)) return esc(text);
  const shown = text.replace(/^https:\/\/(www\.)?/i, "");
  return `<a href="${esc(text)}" target="_blank" rel="noopener noreferrer">${esc(shown)}</a>`;
};

BB.screens.introductions = function () {
  const rows = API.intros();
  const met = API.tieRequests();
  const live     = rows.filter(i => INTRO_LIVE.includes(i.state));
  const released = rows.filter(i => i.state === "released");
  const ended    = rows.filter(i => !INTRO_LIVE.includes(i.state) && i.state !== "released");

  /* A seat with nothing on it, for every card before the release, on both
     sides, because neither side has been shown the other. */
  const veiled = (title, sub) => `
    <div class="row" style="gap:11px">
      <div class="tile veiled" aria-hidden="true" style="width:36px;height:36px">··</div>
      <span style="text-align:left">
        <span style="font-weight:650;font-size:14px;display:block">${esc(title)}</span>
        <span class="small muted">${esc(sub)}</span>
      </span>
    </div>`;

  const note = text => `
    <p style="margin-top:12px;font-size:14px;color:var(--muted);line-height:1.55">${text}</p>`;

  const card = i => {
    const asker = i.side === "asker";
    const when = introAsked(i.requested_at);
    let head, label, cls = "", body;

    if (i.state === "released" && i.contact) {
      const c = i.contact;
      head = `
        <button class="row" data-member="${esc(c.member_id)}" style="gap:11px">
          ${tile(splitName(c.name), 36)}
          <span style="text-align:left">
            <span style="font-weight:650;font-size:14px;display:block">${esc(c.name)}</span>
            <span class="small muted">${esc(when)}</span>
          </span>
        </button>`;
      label = "Released"; cls = "done";
      body = `
        <div class="small" style="margin-top:12px;line-height:1.7">
          <div style="overflow-wrap:anywhere">${esc(c.email)}</div>
          ${c.linkedin_url ? `<div class="admin-link">${introLinkedIn(c.linkedin_url)}</div>` : ""}
        </div>
        ${note(`Both of you said yes and we approved it. The conversation is yours
          from here, on your own channels. These details are shown here for 30 days.`)}
        <div style="margin-top:14px">${reportBlock({ id: c.member_id, ...splitName(c.name) })}</div>`;
    } else if (i.state === "released") {
      /* Released, and the details taken away since: a block either way, or
         one of them has left. Which of those it was is nobody's business, so
         it is not said. */
      head = veiled("An introduction", when);
      label = "Released"; cls = "done";
      body = note("Their details are no longer shown here.");
    } else if (INTRO_LIVE.includes(i.state) && asker) {
      /* The same card wherever it has got to, Withdraw included. The asker
         may withdraw at any point until we make the introduction (9 October
         2026), which is what the terms say: refused once it had reached us,
         the button told them the other side had said yes. Once it is made or
         has ended the server refuses, and boot.js says so. */
      head = veiled("Your request", when);
      label = "Checking with them";
      body = `
        ${note(`We are checking with them. They do not see your name, and nothing
          is released until they say yes and we approve it.`)}
        <div class="row" style="margin-top:14px;flex-wrap:wrap">
          <button class="btn sm" data-intro="withdraw" data-id="${esc(i.id)}">Withdraw</button>
        </div>
        <p class="small muted" style="margin-top:10px;line-height:1.6">
          You can withdraw at any point until the introduction is made. They see
          only that it did not proceed.
        </p>`;
    } else if (i.state === "requested") {
      head = veiled("A request to you", when);
      label = "Awaiting you"; cls = "wait";
      body = `
        <div class="row" style="margin-top:14px;flex-wrap:wrap">
          <button class="btn primary sm" data-intro="accept" data-id="${esc(i.id)}">Accept</button>
          <button class="btn sm" data-intro="decline" data-id="${esc(i.id)}">Decline, silently</button>
        </div>
        <p class="small muted" style="margin-top:10px;line-height:1.6">
          Neither of you has seen the other's name. Accepting sends it to us, and
          nothing is released until we approve it. Then you each get the other's
          name, email address and LinkedIn. Declining tells them only that it did
          not proceed.
        </p>`;
    } else if (INTRO_LIVE.includes(i.state)) {
      head = veiled("A request to you", when);
      label = "Checking";
      body = note("You said yes. It is with us now, and nothing is released until we approve it.");
    } else {
      /* One ending for all of them: declined, stopped, and withdrawn, which
         the target already reads as did not proceed and the asker knows
         about because they did it. */
      head = veiled(asker ? "Your request" : "A request to you", when);
      label = "Did not proceed"; cls = "wait";
      body = note("It did not go ahead. No reason is given either way.");
    }

    return `
    <div class="card">
      <div class="spread" style="flex-wrap:wrap;row-gap:10px">${head}<span class="state ${cls}">${esc(label)}</span></div>
      ${body}
    </div>`;
  };

  return `
  <div class="page-head">
    <div>
      <h1>Introductions</h1>
      <p class="sub">No name or contact detail is released until both of you say yes
        and we approve it. A decline is silent and costs nothing.</p>
    </div>
  </div>

  ${met.length ? `
    <div class="card-head"><h2>Met in person</h2>
      <span class="eyebrow">${met.length}</span></div>
    <div class="stack" style="margin-bottom:34px">
      ${met.map(r => `
      <div class="card">
        <div class="spread" style="flex-wrap:wrap;row-gap:10px">
          ${veiled(r.handle || [r.role_title, r.sector].filter(Boolean).join(", ") || "A member",
                   ["says you have met", r.city].filter(Boolean).join(" · "))}
          <span class="state">Connection</span>
        </div>
        <p style="margin-top:12px;font-size:14px;color:var(--muted);line-height:1.55">
          Confirming connects you, and you each see the other's name, role and firm.
        </p>
        <div class="row" style="margin-top:14px;flex-wrap:wrap">
          <button class="btn primary sm" data-met="confirm" data-id="${esc(r.id)}">We have met</button>
          <button class="btn sm" data-met="decline" data-id="${esc(r.id)}">Decline, silently</button>
        </div>
        <p class="small muted" style="margin-top:10px;line-height:1.6">
          A decline is silent. They are not told, and the request does not come
          back. The decline is noted on your record, not theirs.
        </p>
      </div>`).join("")}
    </div>` : ""}

  ${live.length ? `
    <div class="card-head"><h2>Under way</h2><span class="eyebrow">${live.length}</span></div>
    <div class="stack">${live.map(card).join("")}</div>`
  : `<div class="empty">
      <b>No introductions under way.</b>
      Ask for one from a member's profile, or wait for one to reach you.
    </div>`}

  ${released.length ? `
    <div class="card-head" style="margin-top:34px"><h2>Made</h2>
      <span class="eyebrow">${released.length}</span></div>
    <div class="stack">${released.map(card).join("")}</div>` : ""}

  ${ended.length ? `
    <div class="card-head" style="margin-top:34px"><h2>Did not proceed</h2>
      <span class="eyebrow">${ended.length}</span></div>
    <div class="stack">${ended.map(card).join("")}</div>` : ""}

  <div class="veil" style="margin-top:26px">
    <b>The record of an introduction is deleted 30 days after it ends,</b> whether it
    went ahead, was declined or was withdrawn. In this industry the fact that two
    people spoke can matter as much as what they said, so we do not keep a
    browsable history of who met whom.
  </div>`;
};
BB.screens.introductions.needs = ["introductions", "tieRequests"];
