/* A member's card, the destination of the one signature motion.

   It shows what the API answered (API.member) and nothing else. A stranger
   is a seat: their role and sector as a handle, their city, and a tile with
   nothing on it, never a name. A connection, someone you have both
   confirmed, is a name, role, firm and city. Neither shows what they can
   open or what they need, because other members do not see either in the
   app, and there is no founder mark on either (D13).

   A stranger can be asked for an introduction, or told you have met.
   Anyone but yourself can be reported or blocked, and both sit last and
   styled down. The founder seat reading a card gets the record and nothing
   to do on it. */

const firstOf = m => m.first ? esc(m.first) : "";

BB.screens._profile = function (m) {
  const peer = m.kind === "peer";
  const acts = m.kind !== "record";

  return `
  <div class="cols a" style="padding-top:26px">
    <div class="fade">
      <div class="tile lg${peer ? " veiled" : ""}" data-hero style="width:100%;aspect-ratio:1;font-size:64px">${esc(m.initials)}</div>

      <div style="margin-top:22px">
        <h1 class="display" style="font-size:29px">${peer ? esc(m.handle) : nameOf(m)}</h1>
        <p class="muted" style="font-size:14px;margin-top:7px;line-height:1.5">
          ${peer ? esc(m.city) : `${esc(m.role)}<br>${[m.firm, m.city].filter(Boolean).map(esc).join(" · ")}`}
        </p>
      </div>
    </div>

    <div class="fade stack">
      ${peer ? requestCard(m) : ""}
      ${peer ? connectBlock(m) : ""}
      ${acts ? reportBlock(m) : ""}
      ${acts ? blockBlock(m) : ""}
    </div>
  </div>`;
};

/* Asking for an introduction, on a stranger's card only (D13): a connection
   already has your name and you theirs. core.js sends it and its Undo. */
function requestCard(m) {
  const asked = BB.state.requested && BB.state.requested[m.id];
  return `
  <div class="card">
    ${asked ? `
      <div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">
        <span class="pill plain">Checking with them</span>
        <button class="btn sm quiet" data-act="undo" data-for="${esc(m.id)}"
          data-id="undo:${esc(m.id)}">Undo</button>
      </div>`
    : `
      <button class="btn primary block" data-act="request" data-for="${esc(m.id)}"
        data-id="request:${esc(m.id)}">Request an introduction</button>`}
    <p class="small muted" style="margin-top:14px;line-height:1.6">
      We ask them straight away, privately and without your name. Nothing is
      released until they say yes and we approve it. If it does not go ahead,
      you see only that it did not proceed. You can follow it under Introductions.
    </p>
  </div>`;
}

/* Met in person: the one way a connection forms outside a brokered
   introduction, offered quietly and only to a stranger. The request claims
   nothing but the meeting itself; the tie forms when the other side agrees
   that is true, and each side then sets their own vouch privately. A decline
   is silent, like every other decline in the product.

   Once either of them has asked, the card reads the same whoever it was,
   because the API does not say and the card must not guess. */
function connectBlock(m) {
  if (m.tie === "pending") return `
    <p class="small muted" style="line-height:1.6">
      A request saying you have met is open between you. If it is waiting on
      you, it is under Introductions. If it is confirmed you connect, and a
      decline is never shown.
    </p>`;
  return `
    <p class="small muted">
      <button class="btn quiet sm" style="margin-left:-13px"
        data-connect="${esc(m.id)}" data-id="met:${esc(m.id)}">We have met in person</button>
    </p>`;
}

/* Reporting conduct.

   Placed last and styled down on purpose. A prominent report button changes how
   a room behaves: it invites the reading that this is a place where people get
   sold to. It has to be findable without being suggested.

   The copy states what actually happens, and what happens is small, because
   Blackbook London cannot see the conversation it is being told about. One report is
   one person's word. That is worth saying rather than implying an
   investigation that cannot happen.

   Also drawn on a released introduction, where `m` is { id, first } from its
   contact. The API answers every report the same way, so "already reported"
   is this page's memory, in BB.state for the session (boot.js). */

function reportBlock(m) {
  const done = BB.state.reported && BB.state.reported[m.id];
  const open = BB.state.reporting === m.id;
  const picked = BB.state.reportReason;
  const name = firstOf(m);

  if (done) return `
    <p class="small muted" style="line-height:1.6">
      You reported ${name || "this member"}. It is with us. They are not told,
      and never learn it was you.
    </p>`;

  /* Pulled left by its own padding and border so the label sits on the text
     column rather than 13px inside it. A borderless button aligns by its box,
     which is not where the eye reads it from. */
  if (!open) return `
    <p class="small muted">
      <button class="btn quiet sm" style="margin-left:-13px"
        data-report="open" data-for="${esc(m.id)}">Report conduct</button>
    </p>`;

  return `
  <div class="card">
    <div class="card-head"><h2>Report ${name || "this member"}</h2></div>
    <p class="small muted" style="line-height:1.65;margin-bottom:4px">
      For breaking what every member agreed to. Not for declining you, not for
      being slow, and not for saying no.
    </p>

    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:16px">
      ${Object.keys(REPORT_REASONS).map(k => `
        <button class="pill${picked === k ? " solid" : " plain"}"
          data-report="reason" data-v="${k}"
          aria-pressed="${picked === k}">${esc(REPORT_REASONS[k])}</button>`).join("")}
    </div>

    <label class="fld">
      <span class="lbl">What happened (optional)</span>
      <textarea id="report-detail" rows="3" maxlength="600"
        placeholder="Dates and specifics help. We cannot see your conversation, so this is all we will have."></textarea>
    </label>

    <div class="veil" style="margin-top:16px">
      <b>A single report is not passed on to them, and they never learn it was you.</b>
      We read every report and keep it. One report changes nothing on its own:
      if a second member raises the same thing separately, we look at both and
      speak to them before anything is decided. Nothing visible happens
      straight away, and if you were expecting it to, this is the wrong
      expectation to leave you with.
    </div>

    <div class="row" style="margin-top:16px">
      <button class="btn primary sm" data-report="send" data-for="${esc(m.id)}"
        data-id="report:${esc(m.id)}">Send it to us</button>
      <button class="btn sm quiet" data-report="cancel">Cancel</button>
    </div>
  </div>`;
}

/* Blocking, from the card. One step to ask and one to confirm, because it
   takes effect at once: the card closes and the two of them stop seeing each
   other. It is undone from Settings. */
function blockBlock(m) {
  if (BB.state.blocking !== m.id) return `
    <p class="small muted">
      <button class="btn quiet sm" style="margin-left:-13px"
        data-block="ask" data-for="${esc(m.id)}">Block</button>
    </p>`;
  return `
  <div class="veil">
    <b>They are never told.</b> From then on neither of you sees the other
    anywhere in Blackbook London, including the details of an introduction
    already made. You can undo it in Settings.
    <div class="row" style="margin-top:14px">
      <button class="btn danger sm" data-block="confirm" data-for="${esc(m.id)}"
        data-id="block:${esc(m.id)}">Yes, block</button>
      <button class="btn sm quiet" data-block="cancel">Cancel</button>
    </div>
  </div>`;
}


/* Settings, preferences, blocks, membership, your data and leaving. */

BB.screens.settings = function () {
  const me = API.me();
  const blocks = API.blocks();
  /* What "Show me everything" fetched (boot.js), or null: the export, and
     the member's own audit trail, newest first. */
  const data = BB.state.myData;
  /* The API names the seat that looked by its role, never the person. Every
     staff seat is shown under the trading name. */
  const opened = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit" });
  const trail = { view_member: "Opened by Blackbook London",
                  credential_linked: "You signed in for the first time" };
  const theme = document.documentElement.dataset.themePreference
    || document.documentElement.dataset.theme || "auto";
  const density = document.documentElement.dataset.density || "comfortable";
  const seg = (id, opts, current) =>
    `<div class="segmented" id="${id}" role="group">` +
    opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${current === v}">${l}</button>`).join("") +
    `</div>`;

  return `
  <div class="page-head"><div><h1>Settings</h1></div></div>

  <div class="cols b">
    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Appearance</h2></div>
        <div class="set-row">
          <div><div class="t">Theme</div>
            <div class="d">Auto follows local daylight, worked out from your time zone, so it turns dark in the evening
              and light in the morning.</div></div>
          ${seg("set-theme", [["light","Light"],["dark","Dark"],["auto","Auto"]], theme)}
        </div>
        <div class="set-row">
          <div><div class="t">Density</div><div class="d">Compact fits more on screen.</div></div>
          ${seg("set-density", [["comfortable","Comfortable"],["compact","Compact"]], density)}
        </div>
      </div>

      <!-- Blocks, as GET /api/blocks lists them: an id each and nothing about
           the other member, so no name, no firm and no date. -->
      <div class="card">
        <div class="card-head"><h2>Blocked</h2></div>
        <p class="small muted" style="line-height:1.65">
          A block is silent. They are never told, and neither of you sees the other.
          Each one is listed without a name, because once blocked they are hidden
          from you too. You block someone from their card.
        </p>
        ${blocks.length ? blocks.map(b => `
          <div class="set-row">
            <div class="t">Blocked</div>
            <button class="btn sm" data-unblock="${esc(b.id)}" data-id="unblock:${esc(b.id)}">Unblock</button>
          </div>`).join("")
        : '<p class="small muted" style="margin-top:10px">Nobody is blocked.</p>'}
      </div>

      <div class="card">
        <div class="card-head"><h2>What we never do</h2></div>
        <p class="small muted" style="margin-bottom:16px;line-height:1.6">
          Not settings. These do not have a switch, and there is no version of
          Blackbook London in which they are turned off.
        </p>
        <ul style="list-style:none">
          ${[["Your name is never shown in search.",
              "Another member sees your role, your sector and your city. Nothing else, until you have agreed."],
             ["How strongly you vouch is never shown to them.",
              "The scale is your own record."],
             ["A block is never disclosed.",
              "The person you blocked is not told, and a searcher is never shown who is hidden from them."],
             ["We never see a conversation between members.",
              "Once an introduction is made, it happens on your own channels."]
            ].map(([t, d], i) => `
            <li style="padding:12px 0;${i ? "border-top:1px solid var(--line)" : ""}">
              <span style="font-weight:650;font-size:13.5px;display:block">${t}</span>
              <span class="small muted" style="line-height:1.55">${d}</span>
            </li>`).join("")}
        </ul>
      </div>
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Membership</h2></div>
        <div class="set-row">
          <div><div class="t">Invitations</div>
            <div class="d">Spend them on someone you would defend in a room you are not in.
              Your name stays attached. Inviting happens from your Network page.</div></div>
          <span class="pill">${me.invitesLeft} left</span>
        </div>

        <div class="set-row">
          <div><div class="t">Sign out</div>
            <div class="d">Ends your session in this browser.</div></div>
          <button class="btn sm" data-sign-out>Sign out</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Your data</h2></div>
        <p class="small muted" style="line-height:1.65">
          We hold little and show other members less. Introduction records are deleted
          30 days after the introduction ends. Show me everything lists what you have
          given us and each time we opened your record. Our vetting notes are not included.
        </p>
        <div class="row" style="margin-top:14px">
          <button class="btn sm" data-data="show" data-id="my-data">${data ? "Hide" : "Show me everything"}</button>
          <button class="btn sm quiet" data-data="download" data-id="my-data-download">Download</button>
        </div>
        ${data ? `
          <pre class="dump">${esc(JSON.stringify(data.exported, null, 2))}</pre>
          <h3 style="font-weight:650;font-size:13.5px;margin-top:18px">Who has opened your record</h3>
          ${data.audit.length ? `
          <ul style="list-style:none;max-height:340px;overflow:auto">
            ${data.audit.map((r, i) => `
            <li style="padding:10px 0;${i ? "border-top:1px solid var(--line)" : ""}">
              <span style="font-size:13.5px;display:block">${esc(trail[r.action] || r.action)}</span>
              <span class="small muted tabular">${esc(opened.format(new Date(r.at)))}${
                r.action === "view_member" && r.reason ? ` · Reason given: ${esc(r.reason)}` : ""}</span>
            </li>`).join("")}
          </ul>` : '<p class="small muted" style="margin-top:6px">Nobody has opened it.</p>'}` : ""}
      </div>

      <!-- The founder seat does not leave, and the API refuses it. -->
      ${me.founder ? "" : `
      <div class="card">
        <div class="card-head"><h2>Leaving</h2></div>
        <p class="small muted" style="line-height:1.65">
          Your profile disappears and no announcement is made.
        </p>
        ${BB.state.confirmLeave ? `
          <div class="veil" style="margin-top:14px">
            <b>This cannot be undone.</b> Your profile, your ask, your gives, your connections
            and every strength you recorded are deleted, and invitations you have not spent
            stop working. An introduction in progress ends. One already made cannot be taken
            back, because the other person already has your details.
          </div>
          <p class="small muted" style="margin-top:14px;line-height:1.65">
            Download your data first if you want a copy. Once you leave, there is nothing to download.
          </p>
          <div class="row" style="margin-top:10px">
            <button class="btn sm" data-data="download" data-id="my-data-download">Download my data</button>
          </div>
          <div class="row" style="margin-top:14px">
            <button class="btn danger sm" data-leave="confirm" data-id="leave">Yes, remove me</button>
            <button class="btn sm quiet" data-leave="cancel" data-id="leave">Keep my membership</button>
          </div>`
        : `<button class="btn danger sm" style="margin-top:14px" data-leave="ask">Remove me</button>`}
      </div>`}
    </div>
  </div>`;
};
BB.screens.settings.needs = ["me", "blocks"];
