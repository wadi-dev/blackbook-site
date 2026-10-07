/* Home, the member's own standing.

   Deliberately not an activity feed. It opens on what you are asking for and
   what you have given, because the first question every session should prompt
   is "is this still how I want to be seen?", not "what has everyone else
   achieved?". There are no view counts, no profile-strength meters and no
   streaks anywhere in Blackbook London. */

/* The title is 200 characters at most, counted as the API counts it, after
   trimming. Shown as the member types (boot.js) and never enforced here: an
   over-long title is refused by the API with its own sentence, and the text
   stays where it was. */
const askCount = text => `${String(text).trim().length} / 200`;

BB.screens.home = function () {
  const me = API.me();
  const ask = API.ask();
  const gives = API.gives();
  const ties = API.connections();
  const kinds = API.categories().ask;
  const editing = !!BB.state.editAsk;

  return `
  <div class="page-head">
    <div>
      <h1 class="display">${nameOf(me)}</h1>
      <p class="sub">${[me.role, me.firm, me.city].filter(Boolean).map(esc).join(" · ")}</p>
    </div>
    <div class="row">
      <!-- Founder is already marked on the name itself; twice on one screen
           turns a mark of office into decoration. -->
      <span class="pill plain">Member since ${esc(me.since)}</span>
    </div>
  </div>

  <div class="stats" style="grid-template-columns:repeat(2,1fr)">
    <div class="s"><b class="tabular">${ties.length}</b><span>Connections</span></div>
    <div class="s"><b class="tabular">${gives.length}</b><span>Gives</span></div>
  </div>

  <div class="cols b" style="margin-top:var(--gap)">
    <div class="stack">

      <div class="card">
        <div class="card-head" style="flex-wrap:wrap">
          <h2>Your ask</h2>
          ${ask ? `<span class="eyebrow">${esc(ask.label)} · live</span>` : ""}
        </div>
        ${!ask && !editing ? `
          <div class="empty">
            <b>You have not asked for anything yet.</b>
            One thing you need that money alone cannot buy. Other members never
            see it. We read it when we look for someone who can open that door.
            <div style="margin-top:14px">
              <button class="btn primary sm" data-ask="edit">Write your ask</button>
            </div>
          </div>` : ""}
        ${ask || editing ? `
        ${editing ? `
          <label class="fld">
            <span class="lbl">What you need that money alone cannot buy</span>
            <textarea id="ask-text" rows="4" aria-describedby="ask-count">${esc(ask ? ask.title : "")}</textarea>
          </label>
          <p class="small muted tabular" id="ask-count" style="margin-top:6px">${askCount(ask ? ask.title : "")}</p>
          <label class="fld" style="max-width:260px">
            <span class="lbl">Which type</span>
            <select id="ask-type">${ask ? "" : '<option value="" selected disabled>Choose one</option>'}${
              kinds.map(k => `<option value="${esc(k.value)}"${ask && k.value === ask.category ? " selected" : ""}>${esc(k.label)}</option>`).join("")}</select>
          </label>
          <div class="row" style="margin-top:16px">
            <button class="btn primary sm" data-ask="save" data-id="ask">Save</button>
            <button class="btn sm quiet" data-ask="cancel">Cancel</button>
          </div>`
        : `
          <div class="askbox"><p>${esc(ask.title)}</p></div>
          <div class="row" style="margin-top:14px">
            <span class="small muted">Posted ${ask.age === 0 ? "today" : ask.age === 1 ? "yesterday" : `${ask.age} days ago`}</span>
            <span class="grow"></span>
            <button class="btn sm quiet" data-ask="close" data-id="ask">Close</button>
            <button class="btn sm" data-ask="edit">Edit</button>
          </div>`}` : ""}
      </div>

      <div class="card">
        <div class="card-head"><h2>What you can open</h2>
          <button class="btn sm" data-go="gives">Manage</button></div>
        ${!gives.length ? `
          <div class="empty">
            <b>Nothing declared yet.</b>
            What you can open is what we match against other members' asks.
            <div style="margin-top:14px">
              <button class="btn primary sm" data-go="gives">Add your first</button>
            </div>
          </div>` : ""}
        ${gives.map((g, i) => `
          <div style="padding:12px 0;${i ? "border-top:1px solid var(--line)" : ""}">
            <div class="spread" style="flex-wrap:wrap;row-gap:8px">
              <h3 style="font-weight:600">${esc(g.text)}</h3>
              <span class="tag" style="white-space:nowrap">${esc(g.label)}</span>
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
        <div class="card-head"><h2>Connections</h2></div>
        ${ties.length ? ties.slice(0, 4).map(t => `
          <button class="prow" data-member="${esc(t.id)}">
            ${tile(t, 34)}
            <span class="grow">
              <span class="who">${nameOf(t, true)}</span>
              <span class="sub">${[t.role, t.firm].filter(Boolean).map(esc).join(" · ")}</span>
            </span>
          </button>`).join("") : `
          <div class="empty">
            <b>Nobody yet.</b>
            Connections come from the members you invite and from introductions
            that go ahead. It is not something to go and collect.
          </div>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>You are early, on purpose</h2>
          <span class="eyebrow">Founding cohort</span></div>
        <p class="small" style="line-height:1.65;color:var(--muted)">
          The closed beta is free for the first fifty Founding Members. What we
          want from you in return is your judgement: what is wrong, what is
          missing, and what you would never use.
        </p>
      </div>
    </div>
  </div>`;
};
BB.screens.home.needs = ["me", "asks", "gives", "categories", "ties"];
