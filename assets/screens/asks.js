/* Asks, what members need.

   Ordered by whether you can actually help, then by how long it has waited.
   Deliberately not by an urgency number the asker sets themselves: a
   self-declared, sortable priority field only ever ends up at maximum. */

BB.screens.asks = function () {
  const rows = API.asks();
  const canHelp = rows.filter(r => r.canHelp);
  const rest = rows.filter(r => !r.canHelp);

  const card = a => {
    const m = a.member;
    return `
    <div class="card">
      <div class="spread" style="align-items:flex-start">
        <button class="row" data-member="${esc(m.id)}" style="gap:12px;text-align:left">
          ${tile(m, 42)}
          <span>
            <span style="font-weight:650;font-size:14px;display:block">${nameOf(m, true)}</span>
            <span class="small muted">${esc(m.role)}, ${esc(m.firm)}</span>
          </span>
        </button>
        <span class="pill plain">${esc(DB.types[m.askType])}</span>
      </div>
      <p style="margin-top:14px;font-size:14.5px;line-height:1.55">${esc(m.ask)}</p>
      <div class="row" style="margin-top:16px">
        ${a.canHelp
          ? `<button class="btn primary sm" data-act="help">I can help with this</button>`
          : `<button class="btn sm" data-member="${esc(m.id)}">View profile</button>`}
        ${API.hasPassed(m.id)
          ? `<span class="small muted">Passed on. They are not told by whom.</span>`
          : `<button class="btn sm quiet" data-pass="${esc(m.id)}">Pass it on</button>`}
        <span class="grow"></span>
        <span class="small muted">${m.askAge > 14
          ? "Asked " + m.askAge + " days ago &middot; still unsolved"
          : "Asked " + m.askAge + " day" + (m.askAge === 1 ? "" : "s") + " ago"}</span>
      </div>
    </div>`;
  };

  return `
  <div class="page-head">
    <div>
      <h1>Asks</h1>
      <p class="sub">What members need, in their own words. The ones you can act on
        come first; after that, whatever has waited longest.</p>
    </div>
  </div>

  ${canHelp.length ? `
    <div class="card-head" style="margin-top:6px">
      <h2>You can give this</h2>
      <span class="eyebrow">${canHelp.length} of ${rows.length} open asks</span>
    </div>
    <div class="stack">${canHelp.map(card).join("")}</div>` : `
    <div class="empty">
      <b>Nothing matches what you can open, yet.</b>
      As members post asks you can act on, they land here first.
    </div>`}

  <div class="card-head" style="margin-top:34px">
    <h2>Everything else</h2>
    <span class="eyebrow">${rest.length} you cannot currently give</span>
  </div>
  <div class="stack">${rest.map(card).join("")}</div>

  <div class="veil" style="margin-top:26px">
    <b>Passing an ask on</b> sends it one hop into your own network. They see the ask,
    never who asked. It is the quietest way to be useful here.
  </div>`;
};
