/* Gives — what you can open for someone else.

   Typed to the same five categories as asks, so a give in one row satisfies an
   ask in the same row. That is the whole matching engine, and it runs without
   a feed or a notification. */

const typeOptions = (sel) => Object.keys(DB.types).map(k =>
  `<option value="${k}"${k === sel ? " selected" : ""}>${esc(DB.types[k])}</option>`).join("");

BB.screens.gives = function () {
  const me = API.me();
  const editing = BB.state.editGive;   /* index, or "new" */

  const form = (i) => {
    const g = i === "new" ? { text: "", type: "door" } : me.gives[i];
    return `
    <div class="card">
      <div class="card-head"><h2>${i === "new" ? "Add a give" : "Edit this give"}</h2></div>
      <label class="fld">
        <span class="lbl">What you can open</span>
        <textarea id="give-text" rows="2" maxlength="140"
          placeholder="A first meeting with three mid-market PE sponsors this quarter">${esc(g.text)}</textarea>
      </label>
      <label class="fld" style="max-width:260px">
        <span class="lbl">Which type</span>
        <select id="give-type">${typeOptions(g.type)}</select>
      </label>
      <div class="row" style="margin-top:16px">
        <button class="btn primary sm" data-give="save" data-i="${i}">Save</button>
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
      ${editing === "new" ? form("new") : ""}

      ${me.gives.map((g, i) => editing === i ? form(i) : `
        <div class="card">
          <div class="spread">
            <h2 style="font-weight:650">${esc(g.text)}</h2>
            <span class="pill plain">${esc(DB.types[g.type])}</span>
          </div>
          <div class="meter" style="margin-top:14px;max-width:360px">
            <span class="lbl">Confidence</span>
            <span class="bar"><i style="width:${Math.round(g.confidence / 7 * 100)}%"></i></span>
            <span class="val tabular">${g.confidence}/7</span>
          </div>
          <p class="small muted" style="margin-top:10px">
            ${API.askersFor(g.type)} open ask${API.askersFor(g.type) === 1 ? "" : "s"}
            this could satisfy right now.
          </p>
          <div class="row" style="margin-top:14px">
            <button class="btn sm" data-give="edit" data-i="${i}">Edit</button>
            <button class="btn sm quiet" data-give="remove" data-i="${i}">Remove</button>
          </div>
        </div>`).join("")}

      ${me.gives.length < 4 && editing !== "new" ? `
        <div class="empty">
          <b>You have ${["none","one","two","three"][me.gives.length]} of four.</b>
          Members with fewer than four are reviewed at the annual check, because what you
          can open is the reason others will want to know you.
          <div style="margin-top:14px"><button class="btn primary sm" data-give="new">Add your ${
            ["first","second","third","fourth"][me.gives.length]}</button></div>
        </div>` : ""}
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>The five types</h2></div>
        <p class="small muted" style="margin-bottom:14px;line-height:1.6">
          A give in one row satisfies an ask in the same row. That is how a match is found:
          quietly, with no feed and no notification.
        </p>
        ${Object.keys(DB.types).map(k => `
          <div class="spread" style="padding:10px 0;border-top:1px solid var(--line)">
            <span style="font-size:13.5px;font-weight:600">${esc(DB.types[k])}</span>
            <span class="small muted tabular">${API.askersFor(k)} asking &middot; ${API.giversOf(k)} can give</span>
          </div>`).join("")}
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
