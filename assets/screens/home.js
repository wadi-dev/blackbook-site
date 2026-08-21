/* Home — the member's own standing.

   Deliberately not an activity feed. It opens on what you are asking for and
   what you have given, because the first question every session should prompt
   is "is this still how I want to be seen?" — not "what has everyone else
   achieved?". There are no view counts, no profile-strength meters and no
   streaks anywhere in Blackbook. */

BB.screens.home = function () {
  const me = API.me();
  const ties = API.ties();
  const matches = API.asks().filter(a => a.canHelp).slice(0, 3);
  const s = API.standing();
  const hasAsk = !!me.ask && me.askOpen !== false;

  return `
  <div class="page-head">
    <div>
      <h1 class="display">${nameOf(me)}</h1>
      <p class="sub">${esc(me.role)} · ${esc(me.firm)} · ${esc(me.city)}</p>
    </div>
    <div class="row">
      <!-- Founder is already marked on the name itself; twice on one screen
           turns a mark of office into decoration. -->
      <span class="pill plain">Verified ${esc(me.verified)}</span>
    </div>
  </div>

  <div class="stats">
    <div class="s"><b class="tabular">${s.connections}</b><span>Connections</span></div>
    <div class="s"><b class="tabular">${s.made}</b><span>Intros made</span></div>
    <div class="s"><b class="tabular">${s.received}</b><span>Intros received</span></div>
    <div class="s"><b class="tabular">${esc(s.ratio)}</b><span>Give / ask ratio</span></div>
  </div>

  <div class="cols b" style="margin-top:var(--gap)">
    <div class="stack">

      <div class="card">
        <div class="card-head">
          <h2>Your ask</h2>
          ${hasAsk ? `<span class="eyebrow">${esc(DB.types[me.askType])} · live</span>` : ""}
        </div>
        ${!hasAsk && !BB.state.editAsk ? `
          <div class="empty">
            <b>You have not asked for anything yet.</b>
            One thing you need that money alone cannot buy. It is the only part
            of this that other members act on directly.
            <div style="margin-top:14px">
              <button class="btn primary sm" data-ask="edit">Write your ask</button>
            </div>
          </div>` : ""}
        ${hasAsk || BB.state.editAsk ? `
        ${BB.state.editAsk ? `
          <label class="fld">
            <span class="lbl">What you need that money alone cannot buy</span>
            <textarea id="ask-text" rows="4">${esc(me.ask)}</textarea>
          </label>
          <label class="fld" style="max-width:260px">
            <span class="lbl">Which type</span>
            <select id="ask-type">${Object.keys(DB.types).map(k =>
              `<option value="${k}"${k === me.askType ? " selected" : ""}>${esc(DB.types[k])}</option>`).join("")}</select>
          </label>
          <div class="row" style="margin-top:16px">
            <button class="btn primary sm" data-ask="save">Save</button>
            <button class="btn sm quiet" data-ask="cancel">Cancel</button>
          </div>`
        : `
          <div class="askbox"><p>${esc(me.ask)}</p></div>
          <div class="row" style="margin-top:14px">
            <span class="small muted">Posted ${me.askAge} day${me.askAge === 1 ? "" : "s"} ago</span>
            <span class="small muted">·</span>
            <span class="small muted">${me.askOptIns} member${me.askOptIns === 1 ? "" : "s"} opted in</span>
            <span class="grow"></span>
            <button class="btn sm" data-ask="edit">Edit</button>
          </div>`}` : ""}
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Someone can give what you asked for</h2>
          ${matches.length ? `<span class="pill plain">${matches.length}</span>` : ""}
        </div>
        ${matches.length ? matches.map(a => `
          <button class="prow" data-member="${esc(a.member.id)}">
            ${tile(a.member, 42)}
            <span class="grow">
              <span class="who">${nameOf(a.member, true)}</span>
              <span class="sub">${esc(a.member.gives[0].text)}</span>
            </span>
            <span class="pill plain">${esc(DB.types[a.member.gives[0].type])}</span>
          </button>`).join("") : `
          <div class="empty">
            <b>Nothing matches yet.</b>
            As members post asks you can act on, they land here.
          </div>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>What you can open</h2>
          <button class="btn sm" data-go="gives">Manage</button></div>
        ${!me.gives.length ? `
          <div class="empty">
            <b>Nothing declared yet.</b>
            What you can open is the reason another member will want to know
            you. We ask for four.
            <div style="margin-top:14px">
              <button class="btn primary sm" data-go="gives">Add your first</button>
            </div>
          </div>` : ""}
        ${me.gives.map((g, i) => `
          <div style="padding:12px 0;${i ? "border-top:1px solid var(--line)" : ""}">
            <div class="spread">
              <h3 style="font-weight:600">${esc(g.text)}</h3>
              <span class="tag">${esc(DB.types[g.type])}</span>
            </div>
            <div class="meter" style="margin-top:9px;max-width:320px">
              <span class="lbl">Confidence</span>
              <span class="bar"><i style="width:${Math.round(g.confidence / 7 * 100)}%"></i></span>
              <span class="val tabular">${g.confidence}/7</span>
            </div>
          </div>`).join("")}
      </div>

    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Achievements</h2></div>
        ${me.achievements.length ? me.achievements.map((a, i) => `
          <div style="display:flex;gap:13px;padding:11px 0;${i ? "border-top:1px solid var(--line)" : ""}">
            <span class="small muted tabular" style="padding-top:2px">0${i + 1}</span>
            <span style="font-size:14px;line-height:1.5">${esc(a)}</span>
          </div>`).join("") : `
          <div class="empty">
            <b>Nothing here yet.</b>
            Three things you have actually done, in your own words. This is the
            one part of your record that has to be true.
          </div>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>You vouch for</h2>
          ${ties.length ? '<button class="btn sm quiet" data-go="network">All</button>' : ""}</div>
        ${ties.length ? ties.slice(0, 4).map(t => `
          <button class="prow" data-member="${esc(t.id)}">
            ${tile(t.member, 34)}
            <span class="grow">
              <span class="who">${nameOf(t.member, true)}</span>
              <span class="sub">${esc(t.member.firm)}</span>
            </span>
            ${dots(t.strength)}
          </button>`).join("") : `
          <div class="empty">
            <b>Nobody yet.</b>
            This fills as introductions are made. It is not something to go and
            collect.
          </div>`}
        ${ties.length ? `<p class="small muted" style="margin-top:12px;line-height:1.6">
          How far you said you would go is never shown to the other person.
        </p>` : ""}
      </div>

      <div class="card">
        <div class="card-head"><h2>You are early, on purpose</h2>
          <span class="eyebrow">Founding cohort</span></div>
        <p class="small" style="line-height:1.65;color:var(--muted)">
          Everything here works. What we want from you, and the reason your
          membership is free for now, is your judgment: what is wrong, what is
          missing, and what you would never use. When the network reaches its
          full first intake, the founding label goes and a membership fee
          arrives with 30 days' notice, exactly as the terms say.
        </p>
        <div class="row" style="margin-top:14px">
          <button class="btn sm" data-go="messages">Tell us what is wrong</button>
        </div>
      </div>
    </div>
  </div>`;
};
