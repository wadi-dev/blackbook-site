/* Gives, what you can open for someone else.

   Each give is filed under one of the types the API serves: the twelve an
   ask can use, plus judgement and operating experience. We read every give
   against the open asks, by type or by the words they share, and no counts of
   either side are shown. Adding, editing and removing go to the server
   (boot.js), one give at a time, addressed by id. */

/* One sentence for each type, read as what a member can open for someone,
   never as the deal itself: a give is an introduction, and the terms behind it
   are the members' own. Keyed by the value the API serves. */
const TYPE_NOTES = {
  capital_raise: "Access to investors, funds or family offices who back businesses and would take a first conversation.",
  buyout: "Access to buyers who acquire whole businesses, or to owners ready to hand theirs on.",
  sale_or_exit: "Access to the people who buy businesses, or who guide owners through stepping back from one.",
  strategic_partnership: "An introduction to a firm whose reach, product or customers would strengthen another member's business.",
  joint_venture: "An introduction to a counterpart willing to build something new together and share in the outcome.",
  debt_or_refinancing: "Access to lenders, banks or credit funds who provide borrowing to businesses.",
  real_assets: "Access to owners, developers or holders of property, land, infrastructure or other physical assets.",
  market_entry: "A first door into a new country, sector or customer base where you already have standing.",
  supplier_or_distribution: "An introduction to a supplier, manufacturer or distributor who can make, source or carry a product.",
  leadership_hire: "An introduction to a proven senior leader for a board seat or a top role.",
  regulatory_or_legal: "An introduction to someone who knows how a regulator, licence or legal question really works.",
  introduction_to_a_firm: "A warm introduction to a named firm where you know the person who decides.",
  judgement: "Your own view, drawn from experience, on a decision another member is weighing.",
  operating_experience: "Hands-on knowledge from having built, run or turned around a business like theirs."
};

BB.screens.gives = function () {
  const gives = API.gives();
  const kinds = API.categories().give;
  const editing = BB.state.editGive;   /* a give's id, or "new" */

  /* `g` is the give being edited, or nothing for a new one. A new give starts
     at 4, the API's own default, and with no type until one is chosen. */
  const form = (g) => {
    const confidence = g ? g.confidence : 4;
    return `
    <div class="card">
      <div class="card-head"><h2>${g ? "Edit this give" : "Add a give"}</h2></div>
      <label class="fld">
        <span class="lbl">What you can open</span>
        <textarea id="give-text" rows="2"
          placeholder="A first meeting with three mid-market PE sponsors this quarter">${esc(g ? g.text : "")}</textarea>
      </label>
      <label class="fld" style="max-width:260px">
        <span class="lbl">Which type</span>
        <select id="give-type">${g ? "" : '<option value="" selected disabled>Choose one</option>'}${
          kinds.map(k => `<option value="${esc(k.value)}"${g && k.value === g.category ? " selected" : ""}>${esc(k.label)}</option>`).join("")}</select>
      </label>
      <label class="fld" style="max-width:260px">
        <span class="lbl">Confidence, 1 to 7</span>
        <select id="give-confidence">${[1, 2, 3, 4, 5, 6, 7].map(n =>
          `<option value="${n}"${n === confidence ? " selected" : ""}>${n}</option>`).join("")}</select>
      </label>
      <div class="row" style="margin-top:16px">
        <button class="btn primary sm" data-give="save" data-id="${g ? esc(g.id) : "new-give"}">Save</button>
        <button class="btn sm quiet" data-give="cancel">Cancel</button>
      </div>
    </div>`;
  };

  return `
  <div class="page-head">
    <div>
      <h1>Gives</h1>
      <p class="sub">Something specific you could realistically make happen. A named
        person you would be comfortable introducing, or a group you genuinely hold.</p>
    </div>
    <button class="btn primary" data-give="new">Add a give</button>
  </div>

  <div class="cols b">
    <div class="stack">
      ${editing === "new" ? form() : ""}

      ${gives.map(g => editing === g.id ? form(g) : `
        <div class="card">
          <div class="spread" style="flex-wrap:wrap;row-gap:8px">
            <h2 style="font-weight:650">${esc(g.text)}</h2>
            <span class="pill plain" style="white-space:nowrap">${esc(g.label)}</span>
          </div>
          <div class="meter" style="margin-top:14px;max-width:360px">
            <span class="lbl">Confidence</span>
            <span class="bar"><i style="width:${Math.round(g.confidence / 7 * 100)}%"></i></span>
            <span class="val tabular">${g.confidence}/7</span>
          </div>
          <div class="row" style="margin-top:14px">
            <button class="btn sm" data-give="edit" data-id="${esc(g.id)}">Edit</button>
            <button class="btn sm quiet" data-give="remove" data-id="${esc(g.id)}">Remove</button>
          </div>
        </div>`).join("")}

      ${!gives.length && editing !== "new" ? `
        <div class="empty">
          <b>Nothing declared yet.</b>
          What you can open is what we match against other members' asks.
          <div style="margin-top:14px"><button class="btn primary sm" data-give="new">Add your first</button></div>
        </div>` : ""}
    </div>

    <div class="stack">
      <div class="card" id="gives-types" data-keep="${esc(kinds.map(k => k.value + " " + k.label).join("|"))}">
        <div class="card-head"><h2>The types</h2></div>
        <p class="small muted" style="margin-bottom:14px;line-height:1.6">
          Each give is paired with the open asks of the same type, and with asks
          that share its words, on a list only we read. Other members never see
          your gives.
        </p>
        ${kinds.map(k => {
          const open = BB.state.openType === k.value;
          const note = TYPE_NOTES[k.value];
          if (!note) return `
          <div class="type-row"><span class="type-head type-plain">${esc(k.label)}</span></div>`;
          return `
          <div class="type-row">
            <button type="button" class="type-head" data-type-toggle="${esc(k.value)}"
              aria-expanded="${open}" aria-controls="type-${esc(k.value)}">
              <span>${esc(k.label)}</span>
              <svg class="type-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
                  stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="type-body" id="type-${esc(k.value)}">
              <div class="type-inner"><p class="small muted">${esc(note)}</p></div>
            </div>
          </div>`;
        }).join("")}
      </div>

      <div class="card">
        <div class="card-head"><h2>Be specific</h2></div>
        <p class="small muted" style="line-height:1.65">
          "Sponsor coverage" is weak. "A first meeting with three mid-market PE sponsors
          this quarter" is something another member can act on.
        </p>
        <p class="small muted" style="line-height:1.65;margin-top:10px">
          Confidence is how comfortable you would genuinely be making the introduction,
          not how well you know them. A 7 you would never actually make is worth less
          to everyone than an honest 4.
        </p>
      </div>
    </div>
  </div>`;
};
BB.screens.gives.needs = ["gives", "categories"];
/* The types stay where they are when Gives is drawn again, a redraw from the
   store included, so one that is opening or closing finishes its motion and
   one that is open is not drawn again under the reader (core.js, keepPart).
   They depend on the served list alone, which is what data-keep holds. */
BB.screens.gives.keep = "#gives-types";
