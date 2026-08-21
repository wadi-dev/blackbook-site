/* The member profile — the destination of the one signature motion.

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

/* The door, as a QR. Version-2 style 29x29 grid precomputed offline for the
   one string it will ever hold, https://blackbook.london/enter.html, so no
   generator library ships to the page. Scanning opens the gate; the code is
   given in person, which is the sheet discipline. The emailed one-time-code
   version replaces this when the backend connects. */
const QR_N = 29;
const QR_PATH = "M0 0h1v1h-1zM1 0h1v1h-1zM2 0h1v1h-1zM3 0h1v1h-1zM4 0h1v1h-1zM5 0h1v1h-1zM6 0h1v1h-1zM8 0h1v1h-1zM9 0h1v1h-1zM10 0h1v1h-1zM11 0h1v1h-1zM15 0h1v1h-1zM16 0h1v1h-1zM17 0h1v1h-1zM18 0h1v1h-1zM19 0h1v1h-1zM20 0h1v1h-1zM22 0h1v1h-1zM23 0h1v1h-1zM24 0h1v1h-1zM25 0h1v1h-1zM26 0h1v1h-1zM27 0h1v1h-1zM28 0h1v1h-1zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM9 1h1v1h-1zM12 1h1v1h-1zM14 1h1v1h-1zM15 1h1v1h-1zM18 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM6 2h1v1h-1zM11 2h1v1h-1zM13 2h1v1h-1zM14 2h1v1h-1zM15 2h1v1h-1zM18 2h1v1h-1zM19 2h1v1h-1zM20 2h1v1h-1zM22 2h1v1h-1zM24 2h1v1h-1zM25 2h1v1h-1zM26 2h1v1h-1zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h1v1h-1zM3 3h1v1h-1zM4 3h1v1h-1zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM11 3h1v1h-1zM17 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM25 3h1v1h-1zM26 3h1v1h-1zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h1v1h-1zM3 4h1v1h-1zM4 4h1v1h-1zM6 4h1v1h-1zM10 4h1v1h-1zM11 4h1v1h-1zM12 4h1v1h-1zM13 4h1v1h-1zM19 4h1v1h-1zM22 4h1v1h-1zM24 4h1v1h-1zM25 4h1v1h-1zM26 4h1v1h-1zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h1v1h-1zM10 5h1v1h-1zM11 5h1v1h-1zM14 5h1v1h-1zM16 5h1v1h-1zM17 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h1v1h-1zM1 6h1v1h-1zM2 6h1v1h-1zM3 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM23 6h1v1h-1zM24 6h1v1h-1zM25 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM8 7h1v1h-1zM9 7h1v1h-1zM12 7h1v1h-1zM13 7h1v1h-1zM14 7h1v1h-1zM16 7h1v1h-1zM17 7h1v1h-1zM19 7h1v1h-1zM0 8h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM9 8h1v1h-1zM13 8h1v1h-1zM14 8h1v1h-1zM15 8h1v1h-1zM16 8h1v1h-1zM17 8h1v1h-1zM22 8h1v1h-1zM25 8h1v1h-1zM27 8h1v1h-1zM28 8h1v1h-1zM2 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM16 9h1v1h-1zM17 9h1v1h-1zM18 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM21 9h1v1h-1zM22 9h1v1h-1zM23 9h1v1h-1zM24 9h1v1h-1zM28 9h1v1h-1zM0 10h1v1h-1zM1 10h1v1h-1zM2 10h1v1h-1zM3 10h1v1h-1zM4 10h1v1h-1zM6 10h1v1h-1zM8 10h1v1h-1zM10 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM22 10h1v1h-1zM24 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM1 11h1v1h-1zM2 11h1v1h-1zM8 11h1v1h-1zM10 11h1v1h-1zM11 11h1v1h-1zM12 11h1v1h-1zM13 11h1v1h-1zM14 11h1v1h-1zM18 11h1v1h-1zM20 11h1v1h-1zM21 11h1v1h-1zM28 11h1v1h-1zM2 12h1v1h-1zM3 12h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM6 12h1v1h-1zM9 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM17 12h1v1h-1zM19 12h1v1h-1zM25 12h1v1h-1zM26 12h1v1h-1zM1 13h1v1h-1zM3 13h1v1h-1zM8 13h1v1h-1zM9 13h1v1h-1zM13 13h1v1h-1zM15 13h1v1h-1zM16 13h1v1h-1zM17 13h1v1h-1zM19 13h1v1h-1zM22 13h1v1h-1zM26 13h1v1h-1zM27 13h1v1h-1zM28 13h1v1h-1zM1 14h1v1h-1zM2 14h1v1h-1zM3 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM14 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM19 14h1v1h-1zM22 14h1v1h-1zM23 14h1v1h-1zM26 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM0 15h1v1h-1zM3 15h1v1h-1zM4 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM8 15h1v1h-1zM9 15h1v1h-1zM13 15h1v1h-1zM15 15h1v1h-1zM16 15h1v1h-1zM20 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM24 15h1v1h-1zM27 15h1v1h-1zM0 16h1v1h-1zM1 16h1v1h-1zM2 16h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM12 16h1v1h-1zM16 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM20 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM24 16h1v1h-1zM25 16h1v1h-1zM27 16h1v1h-1zM1 17h1v1h-1zM2 17h1v1h-1zM4 17h1v1h-1zM5 17h1v1h-1zM7 17h1v1h-1zM10 17h1v1h-1zM11 17h1v1h-1zM12 17h1v1h-1zM13 17h1v1h-1zM15 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM25 17h1v1h-1zM26 17h1v1h-1zM27 17h1v1h-1zM0 18h1v1h-1zM3 18h1v1h-1zM6 18h1v1h-1zM7 18h1v1h-1zM9 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM15 18h1v1h-1zM17 18h1v1h-1zM22 18h1v1h-1zM24 18h1v1h-1zM26 18h1v1h-1zM3 19h1v1h-1zM9 19h1v1h-1zM10 19h1v1h-1zM11 19h1v1h-1zM17 19h1v1h-1zM19 19h1v1h-1zM21 19h1v1h-1zM22 19h1v1h-1zM24 19h1v1h-1zM26 19h1v1h-1zM1 20h1v1h-1zM2 20h1v1h-1zM4 20h1v1h-1zM5 20h1v1h-1zM6 20h1v1h-1zM7 20h1v1h-1zM10 20h1v1h-1zM13 20h1v1h-1zM15 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM20 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM26 20h1v1h-1zM8 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM13 21h1v1h-1zM14 21h1v1h-1zM16 21h1v1h-1zM20 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM26 21h1v1h-1zM27 21h1v1h-1zM28 21h1v1h-1zM0 22h1v1h-1zM1 22h1v1h-1zM2 22h1v1h-1zM3 22h1v1h-1zM4 22h1v1h-1zM5 22h1v1h-1zM6 22h1v1h-1zM8 22h1v1h-1zM10 22h1v1h-1zM13 22h1v1h-1zM17 22h1v1h-1zM18 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM25 22h1v1h-1zM27 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM8 23h1v1h-1zM11 23h1v1h-1zM12 23h1v1h-1zM15 23h1v1h-1zM19 23h1v1h-1zM20 23h1v1h-1zM24 23h1v1h-1zM25 23h1v1h-1zM27 23h1v1h-1zM0 24h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM6 24h1v1h-1zM9 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM17 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM27 24h1v1h-1zM0 25h1v1h-1zM2 25h1v1h-1zM3 25h1v1h-1zM4 25h1v1h-1zM6 25h1v1h-1zM8 25h1v1h-1zM9 25h1v1h-1zM11 25h1v1h-1zM13 25h1v1h-1zM14 25h1v1h-1zM15 25h1v1h-1zM17 25h1v1h-1zM19 25h1v1h-1zM21 25h1v1h-1zM23 25h1v1h-1zM24 25h1v1h-1zM25 25h1v1h-1zM28 25h1v1h-1zM0 26h1v1h-1zM2 26h1v1h-1zM3 26h1v1h-1zM4 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM11 26h1v1h-1zM12 26h1v1h-1zM14 26h1v1h-1zM16 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM20 26h1v1h-1zM23 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM9 27h1v1h-1zM20 27h1v1h-1zM22 27h1v1h-1zM25 27h1v1h-1zM27 27h1v1h-1zM0 28h1v1h-1zM1 28h1v1h-1zM2 28h1v1h-1zM3 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM8 28h1v1h-1zM9 28h1v1h-1zM11 28h1v1h-1zM12 28h1v1h-1zM16 28h1v1h-1zM18 28h1v1h-1zM19 28h1v1h-1zM20 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM23 28h1v1h-1zM27 28h1v1h-1z";

/* Settings — preferences, visibility, membership. */

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
              Your name stays attached.</div></div>
          <span class="pill">${API.me().invitesLeft} of ${API.me().invitesTotal}</span>
        </div>
        <div class="row" style="margin-top:2px;flex-wrap:wrap">
          <button class="btn sm" data-share-invite>Share an invitation</button>
          <button class="btn sm" data-qr>${BB.state.showQr ? "Hide the QR" : "Show as QR"}</button>
          <span class="small muted">The message is written for you. The code
            comes from your own sheet, one per named person.</span>
        </div>
        ${BB.state.showQr ? `
        <div style="margin-top:16px;text-align:center">
          <div style="display:inline-block;background:#fff;padding:18px;border:1px solid var(--line);border-radius:14px">
            <svg viewBox="0 0 ${QR_N} ${QR_N}" width="216" height="216"
              shape-rendering="crispEdges" role="img"
              aria-label="QR code opening the Blackbook invitation gate">
              <path d="${QR_PATH}" fill="#000"/>
            </svg>
          </div>
          <p class="small muted" style="margin-top:12px;line-height:1.6">
            Scanning opens the invitation gate on their phone. The code you
            give them yourself, in person, from your sheet.
          </p>
        </div>` : ""}
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
