/* Members — a flat list, filtered by what people can open, and by sector.

   Two axes, deliberately unequal. Give type is the chips, because "what can
   this person do for me" is the question the screen exists to answer. Sector
   is a compact select, because it is who somebody is rather than what they can
   open, and because sector chips were tried and removed on 5 August: with one
   member per sector, nine chips returned nine lists of one. A select holding
   nine one-member sectors is honest about being a narrowing tool; a chip row
   pretending each chip is a group is not. The two combine, so "Doors, in
   Private Equity" is one gesture each. */

BB.screens.members = function () {
  const all = API.members();
  const active = BB.state.giveFilter || "";
  const sector = BB.state.sectorFilter || "";
  const has = (m, t) => m.gives.some(g => g.type === t);

  const sub = BB.state.subFilter || "";
  const bySector = sector ? all.filter(m => m.sector === sector) : all;
  const pool = sub ? bySector.filter(m => m.sub === sub) : bySector;
  const rows = active ? pool.filter(m => has(m, active)) : pool;
  /* Chip counts follow the sector, so the numbers never argue with the list. */
  const types = Object.keys(DB.types).filter(t => pool.some(m => has(m, t)));

  /* The full fifteen from the taxonomy, not just the sectors present. Empty
     ones render disabled with a zero: the list is the statement of what this
     network intends to hold, and hiding the empty rows would shrink the
     product to whoever happens to be in the mock data this week. */
  const sectorCount = s => all.filter(m => m.sector === s).length;

  /* One menu, two depths, one gesture.

     Pressing a sector does not close the menu and wait for a second press: it
     applies the sector to the list behind AND the same menu slides into that
     sector's sub-sectors. Choosing depth is a continuation of the movement,
     not a second task. A back row walks up; "All of <sector>" stops at level
     one; picking a sub-sector finishes and closes.

     The slide is a mount animation rather than a transition between live
     panes, because the menu is rebuilt by render() on every state change and
     animating across a rebuild is machinery this product does not need. It
     reads the same: the new pane arrives from the direction you moved.

     Sub-sector lists are the canonical taxonomy unioned with whatever members
     actually declare, so a record that predates the taxonomy stays reachable.
     Empty entries render disabled at zero at both depths: the shape of the
     list is part of what the screen says. */
  const subCount = s => bySector.filter(m => m.sub === s).length;

  const filterMenu = () => {
    const anim = BB.state.menuAnim === "fwd" ? " anim-fwd"
               : BB.state.menuAnim === "back" ? " anim-back" : "";
    if (BB.state.menuPane === "subs" && sector) {
      const canonical = DB.subsectors[sector] || [];
      const present = [...new Set(bySector.map(m => m.sub))];
      const subs = [...new Set([...canonical, ...present])];
      return `
      <div class="menu${anim}" id="filter-menu" role="listbox" aria-label="Sub-sector">
        <button data-menu-back>
          <span><span aria-hidden="true" style="font-size:10px">←</span>
            All sectors</span>
        </button>
        <button role="option" data-sub-pick="" aria-current="${!sub}">
          <span>All of ${esc(sector)}</span><span class="n">${bySector.length}</span>
        </button>
        ${subs.map(s => {
          const n = subCount(s);
          return `<button role="option" data-sub-pick="${esc(s)}"
            aria-current="${sub === s}" ${n ? "" : "disabled"}>
            <span>${esc(s)}</span><span class="n">${n}</span>
          </button>`;
        }).join("")}
      </div>`;
    }
    return `
    <div class="menu${anim}" id="filter-menu" role="listbox" aria-label="Sector">
      <button role="option" data-sector-pick="" aria-current="${!sector}">
        <span>All sectors</span><span class="n">${all.length}</span>
      </button>
      ${DB.sectors.map(s => {
        const n = sectorCount(s);
        return `<button role="option" data-sector-pick="${esc(s)}"
          aria-current="${sector === s}" ${n ? "" : "disabled"}>
          <span>${esc(s)}</span><span class="n">${n}</span>
        </button>`;
      }).join("")}
    </div>`;
  };

  return `
  <div class="page-head">
    <div>
      <h1>Members</h1>
      <p class="sub">Each row shows what they can open. That is the reason to
        approach someone, not their job title.</p>
    </div>
    <button class="btn sm" data-go="search">Search instead</button>
  </div>

  <div class="row" style="margin-bottom:18px;flex-wrap:wrap;gap:8px;position:relative">
    <button class="pill ${active ? "" : "solid"}" data-give-filter="">All ${pool.length}</button>
    ${types.map(t => {
      const n = pool.filter(m => has(m, t)).length;
      return `<button class="pill ${active === t ? "solid" : ""}"
        data-give-filter="${esc(t)}">${esc(DB.types[t])} ${n}</button>`;
    }).join("")}
    <span class="grow"></span>
    <button class="pill ${sector ? "solid" : "plain"}" data-sector-menu
      aria-haspopup="listbox" aria-expanded="${!!BB.state.sectorMenu}">
      ${esc(sub ? `${sector} · ${sub}` : sector || "All sectors")}
      <span aria-hidden="true" style="font-size:9px">▾</span>
    </button>
    ${BB.state.sectorMenu ? filterMenu() : ""}
  </div>

  <div class="card">
    ${rows.map(m => {
      /* When filtering, show the give that matched rather than the first one,
         or the row argues with the chip above it. */
      const g = (active && m.gives.find(x => x.type === active)) || m.gives[0];
      return `
      <button class="prow opener" data-member="${esc(m.id)}">
        ${tile(m, 46)}
        <span class="grow">
          <span class="who">${nameOf(m, true)}</span>
          <span class="sub">${esc(m.role)}, ${esc(m.firm)} · ${esc(m.city)}</span>
        </span>
        <span class="opens">
          <span class="small muted what">${esc(g ? g.text : "No gives yet")}</span>
          <span class="tag">${esc(g ? DB.types[g.type] : "—")}</span>
        </span>
      </button>`;
    }).join("")}
  </div>

  ${!rows.length ? `<div class="empty" style="margin-top:16px">
    <b>Nobody matches those filters.</b>
    ${sub ? `Nobody in ${esc(sub)} yet. The list shows what the network intends
      to hold, and this is a seat it is still missing.`
    : sector ? `Nobody in ${esc(sector)} has declared that give yet.` : ""}
  </div>` : ""}

  ${active || sector || sub ? `<p class="small muted" style="margin-top:16px">
    ${rows.length} member${rows.length === 1 ? "" : "s"}${
      active ? ` can open ${esc(DB.types[active].toLowerCase())}` : ""}${
      sub ? ` in ${esc(sub)}` : sector ? ` in ${esc(sector)}` : ""}.
    <button class="btn sm quiet" data-clear-filters>Show all</button></p>` : ""}`;
};

/* Search — anonymised for strangers, open for people you already know.

   One field, no operators, no filter chips. The chips that used to sit here
   did nothing and did not look interactive; a search that needs a filter row
   is a search that has stopped being one field. */

BB.screens.search = function () {
  const q = BB.state.query || "";
  const results = API.search(q);
  const blocked = API.blockedFrom(q);
  const known = results.filter(r => r.known);
  const strangers = results.filter(r => !r.known);

  return `
  <div class="page-head">
    <div><h1>Search</h1>
      <p class="sub">One field, no operators. It matches words against what members
        have declared: their seat, their sector, what they can open and what they need.</p></div>
  </div>

  <div class="search-field">
    ${svg(ICON.search)}
    <input id="q" type="search" placeholder="Sector, seat, or what you need opened"
      value="${esc(q)}" autocomplete="off" spellcheck="false">
  </div>

  <div class="veil" style="margin:18px 0 22px">
    <b>Strangers are anonymised.</b> You see the seat, the sector and the path, never
    the name, until both sides opt in. People already in your network are shown openly,
    because you already know them.
  </div>

  ${!q ? `
    <div class="empty">
      <b>Try a word rather than a sentence.</b>
      "capital", "energy", "partner". Adding a second word narrows it:
      "partner london" is fewer than "partner".
    </div>`
  : results.length ? `
    ${known.length ? `
      <p class="eyebrow" style="margin-bottom:6px">In your network · ${known.length}</p>
      <div class="card" style="margin-bottom:22px">
        ${known.map(r => `
          <button class="prow" data-member="${esc(r.id)}">
            ${tile(r.member, 46)}
            <span class="grow">
              <span class="who">${nameOf(r.member, true)}</span>
              <span class="sub">${esc(r.member.role)}, ${esc(r.member.firm)} · ${esc(r.member.city)}</span>
            </span>
            <span class="row" style="gap:10px;flex-shrink:0">${dots(r.strength)}
              <span class="pill plain">Just ask them</span></span>
          </button>`).join("")}
      </div>` : ""}

    ${strangers.length ? `
      <p class="eyebrow" style="margin-bottom:6px">Reachable · ${strangers.length}</p>
      <div class="card">
        ${strangers.map(r => `
          <div class="prow" style="cursor:default">
            <div class="tile veiled" aria-hidden="true" style="width:46px;height:46px">··</div>
            <span class="grow">
              <span class="who">${esc(r.role)}</span>
              <span class="sub">${esc(r.sector)} · ${esc(r.sub)} · ${esc(r.city)}</span>
              <span class="eyebrow" style="display:block;margin-top:5px">${esc(r.path)}</span>
            </span>
            <button class="btn sm" data-act="request">Request</button>
          </div>`).join("")}
      </div>` : ""}

    ${blocked ? `
      <p class="small muted" style="margin-top:18px;max-width:56ch;line-height:1.6">
        ${blocked} member${blocked === 1 ? "" : "s"} also matched but
        ${blocked === 1 ? "is" : "are"} not shown. Blocks are never disclosed to the
        searcher, so we cannot tell you more than that.
      </p>` : ""}`
  : `<div class="empty"><b>Nothing matches.</b>Try fewer words, or a different one.</div>`}`;
};
