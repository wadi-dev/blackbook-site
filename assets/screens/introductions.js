/* Introductions, the double opt-in, made visible.

   The state is shown as a state, not hidden behind a status word. Irreversible
   actions announce themselves before you take them. Declining is silent and
   costless, and the person who asked is never told it was a decline, only
   that it did not proceed. */

const STATE_LABEL = {
  released:  ["Released", "done"],
  checking:  ["Checking with them", ""],
  awaiting:  ["Awaiting you", "wait"],
  declined:  ["Did not proceed", "wait"]
};

const DIRECTION_LABEL = {
  requested: "you requested",
  offered:   "you offered",
  incoming:  "requested you"
};

/* The actions on an incoming request. Three, not two, and the order is the
   argument: Accept, then the silent decline, then the decline that says why.

   Silence stays the default and stays one tap. The reasoned decline exists
   because being turned down in dead silence lands badly with exactly the
   people this network selects for. It opens a second step rather than a
   dialog: canned lines first, and a short optional note that is passed on BY
   US, unattributed, so a decline still never carries the decliner's voice. */
function declineBlock(i) {
  const open = BB.state.declining === i.id;
  const picked = BB.state.declineReason;

  if (!open) return `
    <div class="row" style="margin-top:14px;flex-wrap:wrap">
      <button class="btn primary sm" data-intro-accept="${esc(i.id)}">Accept</button>
      <button class="btn sm" data-intro-decline="${esc(i.id)}">Decline, silently</button>
      <button class="btn sm quiet" data-intro-reason="${esc(i.id)}">Decline with a reason</button>
    </div>
    <p class="small muted" style="margin-top:10px;line-height:1.6">
      Neither of you has seen the other's name. Accepting releases both at once,
      and cannot be taken back. Declining silently tells them only that it did
      not proceed. A reason, if you give one, is passed on by us without your
      name.
    </p>`;

  return `
    <div style="margin-top:14px">
      <p class="small" style="font-weight:650;margin-bottom:10px">
        What should we tell them?</p>
      <div class="row" style="flex-wrap:wrap;gap:8px">
        ${Object.keys(DB.declineReasons).map(k => `
          <button class="pill${picked === k ? " solid" : " plain"}"
            data-decline-pick="${k}" aria-pressed="${picked === k}"
            >${esc(DB.declineReasons[k])}</button>`).join("")}
      </div>
      <label class="fld">
        <span class="lbl">In your own words (optional, passed on as ours)</span>
        <textarea id="decline-note" rows="2" maxlength="200"
          placeholder="One or two lines. We relay it without your name, and we will not relay a negotiation."></textarea>
      </label>
      <div class="row" style="margin-top:14px">
        <button class="btn primary sm" data-decline-send="${esc(i.id)}">Decline and pass it on</button>
        <button class="btn sm quiet" data-decline-cancel>Back</button>
      </div>
      <p class="small muted" style="margin-top:10px;line-height:1.6">
        They learn the reason and nothing else. Not your name, not your seat,
        and not that a person wrote the note.
      </p>
    </div>`;
}

BB.screens.introductions = function () {
  const rows = API.intros();
  const live     = rows.filter(i => i.state !== "declined" && i.state !== "released");
  const released = rows.filter(i => i.state === "released");
  const stopped  = rows.filter(i => i.state === "declined");

  const card = i => {
    const [label, cls] = STATE_LABEL[i.state] || ["", ""];
    const m = i.member;

    /* Double opt-in cuts both ways. Until you have accepted, an incoming
       request shows their SEAT, not their name, exactly as yours shows to
       them. Showing their identity while telling you yours is protected would
       make the promise look one-sided, and it is not. */
    const veiled = i.direction === "incoming" && i.state === "awaiting";

    const head = veiled ? `
      <div class="row" style="gap:11px">
        <div class="tile veiled" aria-hidden="true" style="width:36px;height:36px">··</div>
        <span style="text-align:left">
          <span style="font-weight:650;font-size:14px;display:block">${esc(m.role)}</span>
          <span class="small muted">${esc(m.sector)} · ${esc(m.city)} · ${esc(i.when)}</span>
        </span>
      </div>` : `
      <button class="row" data-member="${esc(m.id)}" style="gap:11px">
        ${tile(m, 36)}
        <span style="text-align:left">
          <span style="font-weight:650;font-size:14px;display:block">${nameOf(m, true)}</span>
          <span class="small muted">${esc(DIRECTION_LABEL[i.direction])} · ${esc(i.when)}</span>
        </span>
      </button>`;

    return `
    <div class="card">
      <div class="spread">${head}<span class="state ${cls}">${esc(label)}</span></div>
      <p style="margin-top:12px;font-size:14px;color:var(--muted);line-height:1.55">${esc(i.note)}</p>
      ${veiled ? declineBlock(i) : ""}
      ${i.state === "checking" ? `
        <div class="row" style="margin-top:14px">
          <button class="btn sm" data-withdraw="${esc(i.id)}">Withdraw</button>
          <span class="small muted">They never saw your name, so they learn nothing.</span>
        </div>` : ""}
      ${/* Released is the only state where reporting makes sense: it is the
            only state in which the two of you have each other's details and a
            conversation has happened off this system. Before release there is
            nothing to report, because nothing has passed between you. */
        i.state === "released" ? `
        <div style="margin-top:14px">${reportBlock(m)}</div>` : ""}
      ${i.state === "declined" && (i.declineReason || i.declineNote) ? `
        <div class="veil" style="margin-top:12px">
          ${i.declineReason ? `<b>${esc(DB.declineReasons[i.declineReason])}.</b> ` : ""}
          ${i.declineNote ? esc(i.declineNote) : ""}
        </div>` : ""}
    </div>`;
  };

  return `
  <div class="page-head">
    <div>
      <h1>Introductions</h1>
      <p class="sub">Nothing is sent and no identity released until both sides accept.
        A decline is silent and costs nothing.</p>
    </div>
  </div>

  ${API.connectRequests().length ? `
    <div class="card-head"><h2>Met in person</h2>
      <span class="eyebrow">${API.connectRequests().length}</span></div>
    <div class="stack" style="margin-bottom:34px">
      ${API.connectRequests().map(cr => `
      <div class="card">
        <div class="spread">
          <button class="row" data-member="${esc(cr.member.id)}" style="gap:11px">
            ${tile(cr.member, 36)}
            <span style="text-align:left">
              <span style="font-weight:650;font-size:14px;display:block">${nameOf(cr.member, true)}</span>
              <span class="small muted">says you have met · ${esc(cr.when)}</span>
            </span>
          </button>
          <span class="state">Connection</span>
        </div>
        <p style="margin-top:12px;font-size:14px;color:var(--muted);line-height:1.55">
          Confirming connects you on Blackbook. You each then set, privately,
          how far you would go for the other, and neither is ever shown the
          other's answer.
        </p>
        <div class="row" style="margin-top:14px">
          <button class="btn primary sm" data-connect-accept="${esc(cr.member.id)}">We have met</button>
          <button class="btn sm" data-connect-decline="${esc(cr.member.id)}">Decline, silently</button>
        </div>
        <p class="small muted" style="margin-top:10px;line-height:1.6">
          A decline is silent. ${esc(cr.member.first)} is not told, and nothing
          is recorded.
        </p>
      </div>`).join("")}
    </div>` : ""}

  ${API.circleInvites().length ? `
    <div class="card-head"><h2>Close circle</h2>
      <span class="eyebrow">${API.circleInvites().length}</span></div>
    <div class="stack" style="margin-bottom:34px">
      ${API.circleInvites().map(ci => `
      <div class="card">
        <div class="spread">
          <button class="row" data-member="${esc(ci.member.id)}" style="gap:11px">
            ${tile(ci.member, 36)}
            <span style="text-align:left">
              <span style="font-weight:650;font-size:14px;display:block">${nameOf(ci.member, true)}</span>
              <span class="small muted">invites you to their close circle · ${esc(ci.when)}</span>
            </span>
          </button>
          <span class="state">Close circle</span>
        </div>
        <p style="margin-top:12px;font-size:14px;color:var(--muted);line-height:1.55">
          Accepting shares your private profiles with each other. Nothing else
          changes, and nobody else is told.
        </p>
        <div class="row" style="margin-top:14px">
          <button class="btn primary sm" data-circle-accept="${esc(ci.member.id)}">Accept</button>
          <button class="btn sm" data-circle-decline="${esc(ci.member.id)}">Decline, silently</button>
        </div>
        <p class="small muted" style="margin-top:10px;line-height:1.6">
          A decline is silent. ${esc(ci.member.first)} is not told, keeps no
          record, and nothing about your standing changes.
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

  ${stopped.length ? `
    <div class="card-head" style="margin-top:34px"><h2>Did not proceed</h2>
      <span class="eyebrow">${stopped.length}</span></div>
    <div class="stack">${stopped.map(card).join("")}</div>` : ""}

  <div class="veil" style="margin-top:26px">
    <b>Records of an introduction are deleted after 30 days.</b> In this industry the
    fact that two people spoke can matter as much as what they said, so we do not
    keep a browsable history of who met whom.
  </div>`;
};

/* Messages, the private thread with the broker.

   Note what this is not: there is no member-to-member messaging in Blackbook.
   Once an introduction is released the conversation moves to the members' own
   channels. A banker discussing a live deal in an unapproved app creates an
   off-channel communications problem for their employer, and their compliance
   team would block us for it. */

BB.screens.messages = function () {
  const threads = API.threads();
  const open = BB.state.thread || (threads[0] && threads[0].about);
  const active = threads.find(t => t.about === open);

  return `
  <div class="page-head">
    <div>
      <h1>Messages</h1>
      <p class="sub">Threads with us about an introduction, never with another member.
        Once one is made, the conversation is yours and happens on your own channels.</p>
    </div>
  </div>

  <div class="cols b">
    ${active ? `
    <div class="card">
      <div class="row" style="margin-bottom:4px">
        <span class="grow">
          <span style="font-weight:650;font-size:15px;display:block">${esc(active.subject)}</span>
          <span class="small muted">${esc(active.when)}</span>
        </span>
        <span class="state ${active.state === "released" ? "done" : active.state === "declined" ? "wait" : ""}">
          ${esc(STATE_LABEL[active.state] ? STATE_LABEL[active.state][0] : active.state)}</span>
      </div>
      <hr class="rule">
      <div class="bubbles">
        ${active.messages.map(msg => `
          <div class="bubble ${msg.from === "me" ? "mine" : "theirs"}">
            ${msg.from === "us" ? '<span class="eyebrow" style="display:block;margin-bottom:4px">Blackbook</span>' : ""}
            ${esc(msg.text)}
          </div>`).join("")}
      </div>
      ${active.state === "declined" ? `
        <p class="small muted" style="margin-top:16px">This thread is closed.</p>` : `
        <div class="row" style="margin-top:18px">
          <input type="text" class="grow" id="reply" placeholder="Reply to us"
            autocomplete="off" data-about="${esc(active.about)}">
          <button class="btn primary" data-send="${esc(active.about)}">Send</button>
        </div>`}
    </div>` : `<div class="empty"><b>No messages yet.</b>We write when an introduction needs something from you.</div>`}

    <div class="card">
      <div class="card-head"><h2>Threads</h2></div>
      ${threads.map(t => `
        <button class="prow" data-thread="${esc(t.about)}">
          ${tile(t.member, 34)}
          <span class="grow">
            <span class="who">${esc(t.subject)}</span>
            <span class="sub">${esc(t.messages[t.messages.length - 1].text.slice(0, 44))}…</span>
          </span>
          ${t.unread ? '<span class="dots" style="flex-shrink:0"><i class="on"></i></span>' : ""}
        </button>`).join("")}
      <p class="small muted" style="margin-top:14px;line-height:1.6">
        There is no member-to-member messaging here, on purpose. Your firm almost
        certainly requires business conversations to happen on approved channels.
      </p>
    </div>
  </div>`;
};
