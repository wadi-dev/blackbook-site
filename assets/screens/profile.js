/* The member profile, the destination of the one signature motion.

   Left rail: the photo and who they connect with. Right: what they can open,
   what they have done, and what they need. The Ask is the only element on the
   page framed in solid ink, because it is the only element asking something
   of the reader. */

BB.screens._profile = function (m) {
  const ties = API.ties().filter(t => t.id !== m.id).slice(0, 5);
  const givers = API.giversOf(m.askType);

  return `
  <div class="cols a" style="padding-top:26px">
    <div class="fade">
      <div class="tile lg" data-hero style="width:100%;aspect-ratio:1;font-size:64px">${esc(m.initials)}</div>

      <div style="margin-top:22px">
        <h1 class="display" style="font-size:29px">${nameOf(m)}</h1>
        <p class="muted" style="font-size:14px;margin-top:7px;line-height:1.5">
          ${esc(m.role)}<br>${esc(m.firm)} · ${esc(m.city)}
        </p>
      </div>

      <hr class="rule">

      <p class="eyebrow" style="margin-bottom:12px">Connects with</p>
      <div class="carousel">
        ${ties.map(t => `
          <button class="c" data-member="${esc(t.id)}">
            ${tile(t.member, 104)}
            <span class="cn">${nameOf(t.member, true)}</span>
            <span class="cf">${esc(t.member.firm)}</span>
            ${dots(t.strength)}
          </button>`).join("")}
      </div>
      <p class="small muted" style="margin-top:2px">Only mutual connections are shown to you.</p>
    </div>

    <div class="fade stack">
      <div class="card">
        <div class="card-head">
          <h2>What they can open</h2>
          <span class="eyebrow">${esc(m.sector)}</span>
        </div>
        <div class="row" style="margin-bottom:16px">
          <span class="pill">${esc(m.sector)}</span>
          <span class="pill plain">${esc(m.sub)}</span>
        </div>
        ${m.gives.map((g, i) => `
          <div style="padding:12px 0;${i ? "border-top:1px solid var(--line)" : ""}">
            <div class="spread">
              <span style="font-size:14px;font-weight:600">${esc(g.text)}</span>
              <span class="tag">${esc(DB.types[g.type])}</span>
            </div>
          </div>`).join("")}
      </div>

      <div class="card">
        <div class="card-head"><h2>Achievements</h2></div>
        ${m.achievements.map((a, i) => `
          <div style="display:flex;gap:13px;padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
            <span class="small muted tabular" style="padding-top:2px">0${i + 1}</span>
            <span style="font-size:14px;line-height:1.5">${esc(a)}</span>
          </div>`).join("")}
      </div>

      ${closedCard(m)}

      <div class="card">
        <div class="card-head">
          <h2>Their ask</h2>
          <span class="eyebrow">${esc(DB.types[m.askType])}</span>
        </div>
        <div class="askbox"><p>${esc(m.ask)}</p></div>
        ${givers ? `<p class="small muted" style="margin-top:12px">
          <b style="color:var(--text)">${givers} member${givers === 1 ? "" : "s"}</b>
          could satisfy this.</p>` : ""}

        <div class="row" style="margin-top:18px">
          <button class="btn primary block" data-act="help">I can help with this</button>
        </div>
        <div class="row" style="margin-top:9px">
          <button class="btn block" data-act="request">Request an introduction</button>
        </div>
        <p class="small muted" style="margin-top:14px;line-height:1.6">
          Double opt-in. Nothing is sent, and no identity released, until
          ${esc(m.first)} accepts. You will not be told if they decline.
        </p>
      </div>

      ${connectBlock(m)}
      ${reportBlock(m)}
    </div>
  </div>`;
};

/* Met in person: the one way a connection forms outside a brokered
   introduction, offered quietly and only when no tie exists. The request
   claims nothing but the meeting itself; the tie forms when the other side
   agrees that is true, and each side then sets their own vouch privately.
   A decline is silent, like every other decline in the product. */
function connectBlock(m) {
  if (API.isTied(m.id)) return "";
  if (API.hasRequestedConnect(m.id)) return `
    <p class="small muted" style="line-height:1.6">
      You have told us you and ${esc(m.first)} have met. If they agree, you
      connect. If not, you will not be told.
    </p>`;
  return `
    <p class="small muted">
      <button class="btn quiet sm" style="margin-left:-13px"
        data-connect="${esc(m.id)}">We have met in person</button>
    </p>`;
}

/* The private profile, shown only inside a mutual close circle.

   Every member has two depths: the public record, and the work they share
   only with people who are IN their circle. Circle membership is mutual and
   deliberate: one member extends an invitation, the other accepts or silently
   declines, and only then do the two see each other's private sides. The
   vouch scale never opens this door on its own, or members would inflate
   their sevens to get through it and the ratings would rot into flattery.

   The purpose is anti-solicitation. A £250m deal that is not public is
   exactly the material a seller cold-pitches against, so it reaches only
   people the member has personally let in. And when the viewer is outside
   the circle, NOTHING renders: no locked card, no "2 hidden items", no
   teaser. A visible lock invites exactly the pestering the layer exists to
   prevent, and this product already has a rule for that shape: a block is
   never disclosed either. */
function closedCard(m) {
  if (!m.closed || !m.closed.length) return "";
  if (!API.inCircle(m.id)) return "";
  return `
  <div class="card">
    <div class="card-head">
      <h2>Their private profile</h2>
      <span class="eyebrow">Close circle</span>
    </div>
    ${m.closed.map((a, i) => `
      <div style="display:flex;gap:13px;padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
        <span class="small muted tabular" style="padding-top:2px">0${i + 1}</span>
        <span style="font-size:14px;line-height:1.5">${esc(a)}</span>
      </div>`).join("")}
    <p class="small muted" style="margin-top:12px;line-height:1.6">
      Shared with you because you are in ${esc(m.first)}'s close circle, and
      they are in yours. It is not on their public profile, and the rest of
      the network is not told it exists.
    </p>
  </div>`;
}

/* Reporting conduct.

   Placed last and styled down on purpose. A prominent report button changes how
   a room behaves: it invites the reading that this is a place where people get
   sold to. It has to be findable without being suggested.

   The copy states what actually happens, and what happens is small, because
   Blackbook cannot see the conversation it is being told about. One report is
   one person's word. That is worth saying rather than implying an
   investigation that cannot happen. */

function reportBlock(m) {
  const done = API.reportedByMe(m.id);
  const open = BB.state.reporting === m.id;
  const picked = BB.state.reportReason;

  if (done) return `
    <p class="small muted" style="line-height:1.6">
      You reported ${esc(m.first)}. It is with us and ${esc(m.first)} was not told.
    </p>`;

  /* Pulled left by its own padding and border so the label sits on the text
     column rather than 13px inside it. A borderless button aligns by its box,
     which is not where the eye reads it from. */
  if (!open) return `
    <p class="small muted">
      <button class="btn quiet sm" style="margin-left:-13px"
        data-report="open" data-id="${esc(m.id)}">Report conduct</button>
    </p>`;

  return `
  <div class="card">
    <div class="card-head"><h2>Report ${esc(m.first)}</h2></div>
    <p class="small muted" style="line-height:1.65;margin-bottom:4px">
      For breaking what every member agreed to. Not for declining you, not for
      being slow, and not for saying no.
    </p>

    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:16px">
      ${Object.keys(DB.reportReasons).map(k => `
        <button class="pill${picked === k ? " solid" : " plain"}"
          data-report="reason" data-v="${k}"
          aria-pressed="${picked === k}">${esc(DB.reportReasons[k])}</button>`).join("")}
    </div>

    <label class="fld">
      <span class="lbl">What happened (optional)</span>
      <textarea id="report-detail" rows="3" maxlength="600"
        placeholder="Dates and specifics help. We cannot see your conversation, so this is all we will have."></textarea>
    </label>

    <div class="veil" style="margin-top:16px">
      <b>${esc(m.first)} is never told, and never learns it was you.</b>
      We read it, we keep it, and we act when a pattern forms rather than on a
      single account. Nothing visible happens straight away, and if you were
      expecting it to, this is the wrong expectation to leave you with.
    </div>

    <div class="row" style="margin-top:16px">
      <button class="btn primary sm" data-report="send" data-id="${esc(m.id)}">Send it to us</button>
      <button class="btn sm quiet" data-report="cancel">Cancel</button>
    </div>
  </div>`;
}


/* Settings, preferences, visibility, membership. */

BB.screens.settings = function () {
  const theme = document.documentElement.dataset.theme || "auto";
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
            <div class="d">Auto follows your device, so it turns dark in the evening
              and light in the morning.</div></div>
          ${seg("set-theme", [["light","Light"],["dark","Dark"],["auto","Auto"]], theme)}
        </div>
        <div class="set-row">
          <div><div class="t">Density</div><div class="d">Compact fits more on screen.</div></div>
          ${seg("set-density", [["comfortable","Comfortable"],["compact","Compact"]], density)}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Visibility</h2></div>
        <div class="set-row">
          <div><div class="t">Blocked from seeing you</div>
            <div class="d">Absolute and silent. They are never told, and they never
              appear in your search results either.</div></div>
          <div class="row" style="flex-wrap:wrap;justify-content:flex-end">
            ${DB.blocks.map(b => `
              <button class="pill plain" data-unblock="${esc(b)}"
                title="Stop blocking ${esc(b)}">${esc(b)} ✕</button>`).join("")
              || '<span class="small muted">Nobody is blocked.</span>'}
            ${BB.state.addBlock ? `
              <input type="text" id="block-firm" placeholder="Firm name"
                autocomplete="off" style="max-width:180px">
              <button class="btn sm primary" data-block="save">Add</button>
              <button class="btn sm quiet" data-block="cancel">Cancel</button>`
            : `<button class="btn sm" data-block="new">Add</button>`}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>What we never do</h2></div>
        <p class="small muted" style="margin-bottom:16px;line-height:1.6">
          Not settings. These do not have a switch, and there is no version of
          Blackbook in which they are turned off.
        </p>
        <ul style="list-style:none">
          ${[["Your name is never shown in search.",
              "Another member sees your seat, your sector and how far away you are. Nothing else, until you have agreed."],
             ["How strongly you vouch is never shown to them.",
              "The scale is your own record. The only thing that ever travels is a close-circle invitation, and only because you sent it."],
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
          <span class="pill">${API.me().invitesLeft} of ${API.me().invitesTotal}</span>
        </div>

        <div class="set-row">
          <div><div class="t">Referred by</div>
            <div class="d">${esc(API.me().referredBy)}.</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Your data</h2></div>
        <p class="small muted" style="line-height:1.65">
          We hold little and show other members less. Introduction records are deleted
          after 30 days. You can ask for everything we hold at any time, including
          anything we have written about you.
        </p>
        <div class="row" style="margin-top:14px">
          <button class="btn sm" data-data="show">${BB.state.showData ? "Hide" : "Show me everything"}</button>
          <button class="btn sm quiet" data-data="download">Download</button>
        </div>
        ${BB.state.showData ? `
          <pre class="dump">${esc(JSON.stringify(API.exportMe(), null, 2))}</pre>` : ""}
      </div>

      <div class="card">
        <div class="card-head"><h2>Leaving</h2></div>
        <p class="small muted" style="line-height:1.65">
          Your profile disappears and no announcement is made. The person who referred
          you is told; nobody else is, ever.
        </p>
        ${BB.state.confirmLeave ? `
          <div class="veil" style="margin-top:14px">
            <b>This cannot be undone.</b> Your profile, your gives, your ask and every
            strength you recorded are deleted. Introductions already made are not
            recalled, because the other person holds those too.
          </div>
          <div class="row" style="margin-top:14px">
            <button class="btn danger sm" data-leave="confirm">Yes, remove me</button>
            <button class="btn sm quiet" data-leave="cancel">Keep my membership</button>
          </div>`
        : `<button class="btn danger sm" style="margin-top:14px" data-leave="ask">Remove me</button>`}
      </div>
    </div>
  </div>`;
};
