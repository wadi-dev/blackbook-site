/* ==========================================================================
   The console.

   Everything a broker does by hand today: find the pair, write two careful
   messages, remember which of the two has answered, and never drop one. The
   only number that matters here is how long an introduction takes, because
   that number multiplied by the membership is the whole capacity of the
   business. It is measured at the top of the screen and nowhere else in
   Blackbook London, because nowhere else needs it.

   Nothing here sends anything. It drafts, and a human presses send in their
   own mail client, from their own address. That is not a limitation to fix
   later: an introduction that arrives from a system is a different object from
   one that arrives from a person who vouched for you.
   ========================================================================== */

const KEY = "bb-console-v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
                     catch (e) { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };

let S = load();          /* keyed by match id: { state, startedAt, madeAt } */
let tab = "board";
let openId = null;

const mid = m => `${m.giver.id}:${m.asker.id}:${m.give.text.slice(0, 24)}`;
const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;",
                               '"': "&quot;", "'": "&#39;" }[c]));
const name = m => `${m.first} ${m.last}`;

const STATES = { open: "Open", flight: "In flight", made: "Made", passed: "Passed" };

/* ---------------------------------------------------------------- drafts --
   Two messages, sent at different times, never together. The giver is asked
   first and never learns who asked unless they say yes. That ordering is the
   double opt-in, and getting it the wrong way round would leak the asker to
   somebody who then declines. */

function draftToGiver(m) {
  return `${m.giver.first},

A member here is looking for something you said you could open:

  "${m.ask.text}"

You listed "${m.give.text}". Before I say anything to them, and before I tell
you who they are: is this something you would actually be glad to do?

If not, say no and that is the end of it. They are not told it was asked, and
it costs you nothing.

Wadi`;
}

function draftToAsker(m) {
  return `${m.asker.first},

Someone here can open what you asked for. They have already said they are glad
to, so this is not a cold ask on your side.

Before I put you together, are you happy for me to release your name to them?

If not, no explanation needed, and they are told only that it did not proceed.

Wadi`;
}

function draftRelease(m) {
  return `Both of you have said yes, so here you are.

${name(m.giver)}, ${m.giver.role}, ${m.giver.firm}
${name(m.asker)}, ${m.asker.role}, ${m.asker.firm}

${m.asker.first} is looking for: ${m.ask.text}
${m.giver.first} can open: ${m.give.text}

I am out of the way from here. Anything after this is between you two, on your
own channels.

Wadi`;
}

/* --------------------------------------------------------------- render -- */

function stat() {
  const rows = Object.values(S);
  const made = rows.filter(r => r.madeAt && r.startedAt);
  const mins = made.map(r => (r.madeAt - r.startedAt) / 60000).sort((a, b) => a - b);
  const median = mins.length ? mins[Math.floor(mins.length / 2)] : null;
  const { worth } = MATCH.split();
  const open = worth.filter(m => !S[mid(m)] || S[mid(m)].state === "open").length;

  /* The projection is the point of this row. If an introduction takes you 20
     minutes and you have 2.5 hours an evening, you can make about seven a
     night. That number, not the interface, is what caps the membership.

     Two guards, both from watching it produce nonsense. A median under a
     minute means the clock was started and stopped in the same breath rather
     than measuring anything, and dividing by it printed "4,500,000 per
     evening". And a median drawn from one sample is not a median: three is the
     smallest number that can have a middle. */
  const enough = mins.length >= 3 && median >= 1;
  const perEvening = enough ? Math.max(1, Math.floor(150 / median)) : null;

  return `
  <div class="stat-row">
    <div><b>${open}</b><span>Open matches</span></div>
    <div><b>${rows.filter(r => r.state === "flight").length}</b><span>In flight</span></div>
    <div><b>${made.length}</b><span>Made</span></div>
    <div><b>${enough ? Math.round(median) + "m" : "–"}</b>
      <span>Median to make${mins.length && !enough ? ` · ${mins.length} of 3` : ""}</span></div>
    <div><b>${perEvening ?? "–"}</b><span>Per evening at 2.5h</span></div>
  </div>`;
}

function matchCard(m) {
  const id = mid(m);
  const st = S[id]?.state || "open";
  const isOpen = openId === id;

  return `
  <div class="m ${st === "made" || st === "passed" ? "done" : ""}">
    <button class="m-top" data-open="${esc(id)}">
      <span class="m-score">${m.score}</span>
      <span class="m-body">
        <span class="m-line"><b>${esc(name(m.giver))}</b> can open something
          <b>${esc(name(m.asker))}</b> asked for.</span>
        <span class="m-why">${m.why.map(w => `<span>${esc(w)}</span>`).join("")}</span>
      </span>
      <span class="m-state ${st}">${STATES[st]}</span>
    </button>

    ${isOpen ? `
    <div class="m-open">
      <div class="m-cols">
        <div>
          <p class="eyebrow" style="margin-bottom:8px">The ask · ${esc(name(m.asker))}</p>
          <div class="m-quote">${esc(m.ask.text)}</div>
          <p class="small muted" style="margin-top:8px">${esc(m.asker.role)}, ${esc(m.asker.firm)}
            · asked ${m.asker.askAge} day${m.asker.askAge === 1 ? "" : "s"} ago</p>
        </div>
        <div>
          <p class="eyebrow" style="margin-bottom:8px">The give · ${esc(name(m.giver))}</p>
          <div class="m-quote">${esc(m.give.text)}</div>
          <p class="small muted" style="margin-top:8px">${esc(m.giver.role)}, ${esc(m.giver.firm)}
            · confidence ${m.give.confidence}/7</p>
        </div>
      </div>

      <p class="eyebrow" style="margin:20px 0 8px">Step one · ask the giver, without naming the asker</p>
      <textarea class="draft" rows="11">${esc(draftToGiver(m))}</textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn sm" data-copy="${esc(id)}:giver">Copy</button>
        ${st === "open" ? `<button class="btn primary sm" data-start="${esc(id)}">Start the clock</button>` : ""}
      </div>

      ${st === "flight" ? `
        <p class="eyebrow" style="margin:22px 0 8px">Step two · only after the giver says yes</p>
        <textarea class="draft" rows="9">${esc(draftToAsker(m))}</textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn sm" data-copy="${esc(id)}:asker">Copy</button>
        </div>

        <p class="eyebrow" style="margin:22px 0 8px">Step three · both said yes</p>
        <textarea class="draft" rows="12">${esc(draftRelease(m))}</textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn sm" data-copy="${esc(id)}:release">Copy</button>
          <button class="btn primary sm" data-made="${esc(id)}">Mark made</button>
          <button class="btn sm quiet" data-passed="${esc(id)}">Did not proceed</button>
        </div>` : ""}

      ${st === "made" || st === "passed" ? `
        <p class="small muted" style="margin-top:18px">
          ${st === "made" ? "Made" : "Did not proceed"}${S[id]?.madeAt && S[id]?.startedAt
            ? ` in ${Math.round((S[id].madeAt - S[id].startedAt) / 60000)} minutes` : ""}.
          <button class="btn sm quiet" data-reopen="${esc(id)}">Reopen</button>
        </p>` : ""}
    </div>` : ""}
  </div>`;
}

function render() {
  const { worth, speculative } = MATCH.split();
  const gaps = MATCH.gaps();
  const cov = MATCH.coverage();

  /* Conduct, grouped by the person reported rather than listed as it came in.
     A queue of individual reports invites acting on each one, and acting on a
     single account is exactly what this must not do: Blackbook London never sees the
     conversation, so one report is one member's word against another's. Two
     separate members saying the same thing is the first thing that is actually
     evidence, and grouping is what makes that visible at a glance. */
  const conduct = Object.values(DB.reports.reduce((acc, r) => {
    (acc[r.about] = acc[r.about] || { member: API.member(r.about), rows: [] })
      .rows.push(r);
    return acc;
  }, {})).map(c => ({
    ...c,
    reporters: new Set(c.rows.map(r => r.by)).size
  })).sort((a, b) => b.reporters - a.reporters || b.rows.length - a.rows.length);

  const tabs = [["board", `Worth doing ${worth.length}`],
                ["maybe", `Speculative ${speculative.length}`],
                ["gaps", `Unanswerable ${gaps.length}`],
                ["coverage", "Coverage"],
                ["conduct", `Conduct ${conduct.length || ""}`.trim()]];

  document.getElementById("con").innerHTML = `
    <div class="con-head">
      <div>
        <h1>Broker console</h1>
        <p class="sub">Every open ask against every give. Nothing here sends
          anything: it drafts, and you press send yourself.</p>
      </div>
    </div>

    ${stat()}

    <div class="con-tabs">
      ${tabs.map(([k, l]) =>
        `<button data-tab="${k}" aria-current="${tab === k}">${l}</button>`).join("")}
    </div>

    ${tab === "board" ? `
      <p class="small muted" style="margin-bottom:14px;max-width:64ch;line-height:1.6">
        Pairs with an actual reason: a shared term between what one person can
        open and what the other asked for, or an adjacent seat. Work down from
        the top.
      </p>
      ${worth.length ? worth.map(matchCard).join("")
      : `<div class="empty"><b>Nothing with real evidence today.</b>
           Every remaining pair matches on type alone, which is a guess rather
           than a reason. Those are under Speculative.</div>`}` : ""}

    ${tab === "maybe" ? `
      <p class="small muted" style="margin-bottom:14px;max-width:64ch;line-height:1.6">
        Right type, nothing else in common. It says only that one member can open
        doors and another wants a door opened, which is true of most of the
        network. Worth a look when the list above runs out, and worth knowing
        that a bad introduction costs more than a missed one.
      </p>
      ${speculative.length ? speculative.map(matchCard).join("")
      : `<div class="empty"><b>Nothing speculative either.</b></div>`}` : ""}

    ${tab === "gaps" ? (gaps.length ? `
      <p class="small muted" style="margin-bottom:14px;max-width:60ch;line-height:1.6">
        Asks nobody in the network can currently satisfy. This is the recruitment
        brief: each row is a person who joined, asked for something, and is
        waiting on somebody who is not here yet.
      </p>
      ${gaps.map(g => `
        <div class="m"><div class="m-top">
          <span class="m-score">${g.age}d</span>
          <span class="m-body">
            <span class="m-line"><b>${esc(name(g.member))}</b> · ${esc(g.member.role)},
              ${esc(g.member.firm)}</span>
            <span class="m-line muted" style="margin-top:4px">${esc(g.member.ask)}</span>
            <span class="m-why"><span>needs ${esc(DB.types[g.type])}</span></span>
          </span>
        </div></div>`).join("")}`
      : `<div class="empty"><b>Every open ask has at least one candidate.</b>
           That will not last as the network grows, and this is where it shows
           first.</div>`) : ""}

    ${tab === "coverage" ? `
      <p class="small muted" style="margin-bottom:14px;max-width:60ch;line-height:1.6">
        What the network can and cannot do, by type. A row with people asking and
        nobody giving is the clearest recruitment instruction the product can
        produce.
      </p>
      ${cov.map(c => `
        <div class="m"><div class="m-top">
          <span class="m-score">${c.asking}/${c.giving}</span>
          <span class="m-body">
            <span class="m-line"><b>${esc(c.label)}</b></span>
            <span class="m-line muted" style="margin-top:4px">
              ${c.asking} asking · ${c.giving} can give.
              ${c.asking && !c.giving
                ? "Nobody here can answer this. Recruit for it."
                : c.giving && !c.asking
                ? "Plenty of supply, no demand yet."
                : "Covered."}</span>
          </span>
        </div></div>`).join("")}` : ""}

    ${tab === "conduct" ? `
      <p class="small muted" style="margin-bottom:14px;max-width:64ch;line-height:1.6">
        Members reported for breaking section 4. Grouped by person, because one
        report is one member's word: we never see the conversation it describes.
        Two separate people saying the same thing is the first thing that counts
        as evidence. Nobody reported is ever told, including after a removal.
      </p>
      ${conduct.length ? conduct.map(c => `
        <div class="m"><div class="m-top">
          <span class="m-score">${c.reporters}</span>
          <span class="m-body">
            <span class="m-line"><b>${esc(name(c.member))}</b> · ${esc(c.member.role)},
              ${esc(c.member.firm)}</span>
            <span class="m-line muted" style="margin-top:4px">
              ${c.reporters === 1
                ? "One member. Not enough to act on. Watch and wait for a second."
                : `${c.reporters} separate members. This is a pattern. Section 8 applies, and ${esc(c.member.referredBy || "their sponsor")} is told the reason.`}
            </span>
            <span class="m-why">${c.rows.map(r =>
              `<span>${esc(DB.reportReasons[r.reason])}</span>`).join("")}</span>
            ${c.rows.filter(r => r.detail).map(r => `
              <span class="m-line muted" style="margin-top:8px;font-style:italic">
                ${esc(r.detail)}</span>`).join("")}
          </span>
        </div></div>`).join("")
      : `<div class="empty"><b>Nobody has been reported.</b>
           With ten members and no introductions yet there is nothing anyone
           could report, so this being empty means the feature is untested
           rather than that conduct is good.</div>`}` : ""}
  `;
}

/* ---------------------------------------------------------------- wiring -- */

document.addEventListener("click", e => {
  const t = e.target.closest("[data-tab]");
  if (t) { tab = t.dataset.tab; openId = null; render(); return; }

  const o = e.target.closest("[data-open]");
  if (o) { openId = openId === o.dataset.open ? null : o.dataset.open; render(); return; }

  const start = e.target.closest("[data-start]");
  if (start) {
    S[start.dataset.start] = { state: "flight", startedAt: Date.now() };
    save(S); render(); return;
  }

  const made = e.target.closest("[data-made]");
  if (made) {
    const r = S[made.dataset.made] || {};
    S[made.dataset.made] = { ...r, state: "made", madeAt: Date.now() };
    save(S); render(); return;
  }

  const passed = e.target.closest("[data-passed]");
  if (passed) {
    const r = S[passed.dataset.passed] || {};
    S[passed.dataset.passed] = { ...r, state: "passed", madeAt: Date.now() };
    save(S); render(); return;
  }

  const re = e.target.closest("[data-reopen]");
  if (re) { delete S[re.dataset.reopen]; save(S); render(); return; }

  const c = e.target.closest("[data-copy]");
  if (c) {
    const box = c.closest(".row").previousElementSibling;
    box.select();
    navigator.clipboard?.writeText(box.value).catch(() => document.execCommand("copy"));
    const was = c.textContent;
    c.textContent = "Copied";
    setTimeout(() => { c.textContent = was; }, 1400);
  }
});

render();
