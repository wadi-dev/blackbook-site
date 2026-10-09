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
        ${ties.length ? ties.map(t => `
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


/* Onboarding, the one screen a member sees until they have been through it
   (8 October 2026). render() (core.js) draws it in place of every other
   screen while /api/me answers onboarded false, under chrome that offers
   Sign out and nothing else. One page and one Submit: the member's details,
   filled in already from what they gave at the door or what their
   invitation carried, a first ask and a first give. boot.js sends it and
   opens Home once the server has taken it.

   What the member types is held in BB.state.onboarding as they type, in
   memory and nowhere else, so a redraw draws it back rather than losing it;
   it is dropped once the server has it. So is the sentence for each field
   that was refused, shown under that field. Kept beside Home rather than in
   a file of its own, so the app page and the worker's shell list (sw.js)
   load nothing new. */

/* The fields in the order they are drawn, which is the order the cursor
   looks through for the first one still empty. */
const ONBOARD_ORDER = ["first_name", "last_name", "firm", "role_title", "city",
  "ask_title", "ask_category", "give_description", "give_category"];

BB.screens.onboarding = function () {
  const kinds = API.categories();
  if (!BB.state.onboarding) {
    const me = API.me();
    BB.state.onboarding = {
      draft: { first_name: me.first, last_name: me.last, firm: me.firm, role_title: me.role,
               city: me.city, linkedin_url: me.linkedin || "", ask_title: "", ask_category: "",
               give_description: "", give_category: "", give_confidence: "4" },
      errors: {}, note: "", focused: false
    };
  }
  const { draft: d, errors: bad, note } = BB.state.onboarding;

  /* Each field names its message, so a reader hears the message with the
     label. The message is empty and hidden until there is one. */
  const msg = key =>
    `<p class="ob-msg" id="ob-${key}-msg"${bad[key] ? "" : " hidden"}>${esc(bad[key] || "")}</p>`;
  const attrs = (key, hint) => `id="ob-${key}" data-ob="${key}" aria-describedby="` +
    `${hint ? `ob-${key}-hint ` : ""}ob-${key}-msg"${bad[key] ? ' aria-invalid="true"' : ""}`;
  const text = (key, label, max, auto) => `
    <div>
      <label class="fld"><span class="lbl">${label}</span>
        <input type="text" ${attrs(key)} value="${esc(d[key])}" maxlength="${max}" autocomplete="${auto}">
      </label>
      ${msg(key)}
    </div>`;
  const choose = (key, list) => `
    <label class="fld ob-narrow"><span class="lbl">Which type</span>
      <select ${attrs(key)}><option value="" disabled${d[key] ? "" : " selected"}>Choose one</option>${
        list.map(k => `<option value="${esc(k.value)}"${k.value === d[key] ? " selected" : ""}>${esc(k.label)}</option>`).join("")}</select>
    </label>
    ${msg(key)}`;

  return `
  <div class="ob">
    <div class="page-head">
      <div>
        <h1>Welcome to Blackbook London</h1>
        <p class="sub">Before you start, check your details and tell us one thing you need
          and one thing you can open. You only do this once.</p>
      </div>
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Your details</h2></div>
        <p class="small muted ob-lead">Filled in from when you joined. Change anything that is not right.</p>
        <div class="ob-pair">
          ${text("first_name", "First name", 120, "given-name")}
          ${text("last_name", "Last name", 120, "family-name")}
        </div>
        <div class="ob-pair">
          ${text("firm", "Firm", 160, "organization")}
          ${text("role_title", "Role", 160, "organization-title")}
        </div>
        ${text("city", "City", 80, "address-level2")}
        <label class="fld"><span class="lbl">LinkedIn profile URL <span class="opt">optional</span></span>
          <input type="text" inputmode="url" ${attrs("linkedin_url", true)} value="${esc(d.linkedin_url)}"
            maxlength="400" autocomplete="url" autocapitalize="off" spellcheck="false">
        </label>
        <p class="small muted ob-hint" id="ob-linkedin_url-hint">When an introduction is made, the
          other member is given this and your email address.</p>
        ${msg("linkedin_url")}
        <p class="small muted ob-foot">Another member sees your role, your sector and your city.
          Nothing else, until you have agreed.</p>
      </div>

      <div class="card">
        <div class="card-head"><h2>Your first ask</h2></div>
        <p class="small muted ob-lead">Other members never see it. We read it when we look for
          someone who can open that door.</p>
        <label class="fld"><span class="lbl">What you need that money alone cannot buy</span>
          <textarea rows="3" ${attrs("ask_title", true)}>${esc(d.ask_title)}</textarea>
        </label>
        <p class="small muted tabular ob-hint" id="ob-ask_title-hint">${askCount(d.ask_title)}</p>
        ${msg("ask_title")}
        ${choose("ask_category", kinds.ask)}
      </div>

      <div class="card">
        <div class="card-head"><h2>Your first give</h2></div>
        <p class="small muted ob-lead">Something specific you could realistically make happen.
          Other members never see your gives.</p>
        <label class="fld"><span class="lbl">What you can open</span>
          <textarea rows="3" ${attrs("give_description")}
            placeholder="A first meeting with three mid-market PE sponsors this quarter">${esc(d.give_description)}</textarea>
        </label>
        ${msg("give_description")}
        ${choose("give_category", kinds.give)}
        <label class="fld ob-narrow"><span class="lbl">Confidence, 1 to 7</span>
          <select ${attrs("give_confidence", true)}>${[1, 2, 3, 4, 5, 6, 7].map(n =>
            `<option value="${n}"${String(n) === d.give_confidence ? " selected" : ""}>${n}</option>`).join("")}</select>
        </label>
        <p class="small muted ob-hint" id="ob-give_confidence-hint">How comfortable you would
          genuinely be making the introduction, not how well you know them.</p>
        ${msg("give_confidence")}
      </div>
    </div>

    <div class="ob-submit">
      <button class="btn primary" data-onboard="submit" data-id="onboarding">Submit</button>
      <p class="small ob-note" role="status"${note ? "" : " hidden"}>${esc(note)}</p>
    </div>
  </div>`;
};
BB.screens.onboarding.needs = ["me", "categories"];

/* The cursor starts in the first field still empty, once per visit: for an
   invitation that carried every detail, that is the ask. The page stays at
   its top, so the details are read before anything else. */
BB.screens.onboarding.mount = host => {
  const ob = BB.state.onboarding;
  if (!ob || ob.focused) return;
  ob.focused = true;
  const key = ONBOARD_ORDER.find(k => !String(ob.draft[k]).trim());
  const field = key && host.querySelector("#ob-" + key);
  if (field) field.focus({ preventScroll: true });
};
