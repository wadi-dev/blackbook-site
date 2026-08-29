/* Network — the graph, and the maintenance of it.

   Line weight AND darkness both carry strength. Redundant encoding on purpose:
   it survives colour blindness, greyscale printing and a screenshot pasted
   into a deck, none of which a hue ramp does.

   The strength is editable from here. This is the screen where you realise a 5
   is now a 2, and a graph nobody can correct decays into fiction. */

BB.screens.network = function () {
  const ties = API.ties();
  const me = API.me();
  const editing = BB.state.editStrength;

  /* Node positions live on BB.graph so a drag survives the next render, and so
     the layout you arranged is still there when you come back to the screen.
     Seeded radially the first time only. */
  /* Seeded into concentric rings, not one.

     A single fixed-radius ring works until about seventeen connections and then
     silently fails: at 25 the nearest pair sits 31 units apart, at 50 it is 17
     and at 100 it is 9, against a node 38 units wide. Nodes stopped being
     distinguishable long before anything felt slow, so nothing flagged it.

     Each ring holds as many as its circumference allows at ARC units per node,
     then the next ring starts further out. The graph pans and zooms, so a
     layout larger than the viewBox is navigable rather than lost. */
  const CX = 250, CY = 215, R0 = 158, ARC = 58, RING_GAP = 74;
  if (!BB.graph) BB.graph = { pos: {}, scale: 1 };

  const unseeded = ties.filter(t => !BB.graph.pos[t.id]);
  if (unseeded.length) {
    /* Work out the rings first, so each is filled evenly rather than the last
       one carrying a stray node on its own. */
    const rings = [];
    let placed = 0, ring = 0;
    while (placed < unseeded.length) {
      const r = R0 + ring * RING_GAP;
      const capacity = Math.max(3, Math.floor((2 * Math.PI * r) / ARC));
      const take = Math.min(capacity, unseeded.length - placed);
      rings.push({ r, take });
      placed += take;
      ring++;
    }
    let i = 0;
    rings.forEach((ring, ri) => {
      for (let k = 0; k < ring.take; k++, i++) {
        /* Offset alternate rings by half a step so nodes do not line up
           radially and read as spokes. */
        const a = (Math.PI * 2 * k) / ring.take
                + (ri % 2 ? Math.PI / ring.take : 0) - Math.PI / 2;
        BB.graph.pos[unseeded[i].id] =
          { x: CX + Math.cos(a) * ring.r, y: CY + Math.sin(a) * ring.r };
      }
    });
  }
  if (!BB.graph.pos.__me) BB.graph.pos.__me = { x: CX, y: CY };

  /* Second degree, shown only when asked for. Each veiled node is parked just
     beyond the connection it runs through, so the route reads at a glance. */
  const reach = BB.state.showReach ? API.secondDegree() : [];
  reach.forEach(r => {
    if (BB.graph.pos[r.id]) return;
    const via = BB.graph.pos[r.via[0]] || { x: CX, y: CY };
    const ang = Math.atan2(via.y - CY, via.x - CX);
    /* Pushed clear of the connection it hangs off, then clamped for its label
       rather than for its box. A veiled node carries a seat, and a seat is a
       long string: parked beyond a connection that already sat near the right
       edge, "SINGLE FAMILY OFFICE" ran off the card and read as "SINGLE FAMILY
       O". The label is capped at 17 characters, which measures 47 units either
       side of centre, so 50 is the margin the clamp needs. Clamping harder than
       that drags the node back on top of the connection it belongs to, which is
       how an earlier attempt at 78 traded a clipped label for two overlapping
       nodes. */
    BB.graph.pos[r.id] = {
      x: Math.max(50, Math.min(450, via.x + Math.cos(ang) * 84)),
      y: Math.max(30, Math.min(392, via.y + Math.sin(ang) * 84))
    };
  });

  const P = id => BB.graph.pos[id];
  const me0 = P("__me");
  const nodes = ties.map(t => ({ ...t, x: P(t.id).x, y: P(t.id).y }));

  /* The label under a first-degree node is the person's name, not their seat.

     It used to be the sub-sector, which meant a graph of your own network read
     as a list of job functions: you had to remember which of four people
     "M&A / ADVISORY" was. You know these people, so the name is the thing that
     identifies the node, and what they do is one tap away on their profile.

     Surname reduced to an initial because the label has to sit inside roughly
     one node's spacing. "Peter Halloran" at this size is wider than the gap
     between two nodes on the inner ring and would collide with its neighbour;
     "Peter H." separates two Peters without doing that.

     Second-degree nodes keep the seat and never take a name. That is not a
     layout decision, it is the promise the product is built on. */
  const graphLabel = m => `${m.first} ${m.last.charAt(0)}.`;

  /* A veiled node's seat, cut to something a graph can hold. The full string
     stays in the list beside the graph, which is where you read it properly. */
  const seatLabel = s => (s.length > 17 ? s.slice(0, 16).trimEnd() + "…" : s).toUpperCase();

  const strengthCell = t => editing === t.id ? `
    <span class="row ramp" style="gap:4px;flex-shrink:0">
      ${[1,2,3,4,5,6,7].map(n => `
        <button class="btn sm" data-set-strength="${n}" data-id="${esc(t.id)}"
          style="padding:4px 8px;min-width:26px;${n === t.strength ? "background:var(--accent);color:var(--surface);border-color:var(--accent)" : ""}">${n}</button>`).join("")}
    </span>` : `
    <button data-edit-strength="${esc(t.id)}" title="Change how far you would go"
      style="flex-shrink:0;padding:4px 0">${dots(t.strength)}</button>`;

  return `
  <div class="page-head">
    <div>
      <h1>Network</h1>
      <p class="sub">Line weight is how far you have said you would go for them. It is
        your record, never shown to them, and you can change it whenever it stops
        being true.</p>
    </div>
    <button class="btn sm ${BB.state.showReach ? "primary" : ""}" data-reach="toggle">
      ${BB.state.showReach ? "Hide who they can reach" : "Show who they can reach"}
    </button>
  </div>

  <div class="cols b">
    <div class="card graph-card" style="padding:0;overflow:hidden">
      <svg id="graph" viewBox="0 0 500 430" role="img"
           aria-label="Your network, ${ties.length} connections. Drag to rearrange.">
        <g id="graph-view" transform="${graphTransform()}">
          ${nodes.map(n => `<line data-edge="${esc(n.id)}"
            x1="${me0.x}" y1="${me0.y}" x2="${n.x}" y2="${n.y}"
            stroke="${ramp(n.strength)}" stroke-width="${(1 + n.strength * 0.46).toFixed(2)}"
            stroke-linecap="round"/>`).join("")}

          ${nodes.map(n => `
            <g class="gnode" data-node="${esc(n.id)}"
               transform="translate(${n.x},${n.y})">
              <rect x="-19" y="-19" width="38" height="38" rx="11"
                fill="var(--surface)" stroke="var(--line)"/>
              <text y="4.5" text-anchor="middle" font-size="12" font-weight="650"
                fill="var(--text)" font-family="var(--font-display)">${esc(n.member.initials)}</text>
              <text class="glabel" y="34" text-anchor="middle" font-size="10" font-weight="650"
                font-family="var(--font-body)">${esc(graphLabel(n.member))}</text>
            </g>`).join("")}

          ${reach.map(r => {
            const p = P(r.id), v = P(r.via[0]);
            return `
            <line class="gedge-far" x1="${v.x}" y1="${v.y}" x2="${p.x}" y2="${p.y}"
              data-edge="${esc(r.id)}" stroke="var(--line-strong)" stroke-width="1.2"
              stroke-dasharray="3 4" stroke-linecap="round"/>
            <g class="gnode gfar" data-node="${esc(r.id)}" data-reach="${esc(r.id)}"
               transform="translate(${p.x},${p.y})">
              <rect x="-15" y="-15" width="30" height="30" rx="9"
                fill="var(--recess)" stroke="var(--line-strong)" stroke-dasharray="3 3"/>
              <text y="4" text-anchor="middle" font-size="11" font-weight="650"
                fill="var(--muted)" font-family="var(--font-display)">··</text>
              <text class="glabel" y="29" text-anchor="middle" font-size="8.5" font-weight="600"
                font-family="var(--font-body)"
                letter-spacing=".04em">${esc(seatLabel(r.sub))}</text>
            </g>`;
          }).join("")}

          <g class="gnode gme" data-node="__me" transform="translate(${me0.x},${me0.y})">
            <rect x="-27" y="-27" width="54" height="54" rx="16" fill="var(--accent)"/>
            <text y="6" text-anchor="middle" font-size="16" font-weight="650"
              fill="var(--surface)" font-family="var(--font-display)">${esc(me.initials)}</text>
          </g>
        </g>
      </svg>
      <div class="graph-foot">
        <p class="small muted" style="margin:0">
          ${ties.length ? `You stay fixed in the middle and the web stays around you.
            Drag any connection to move it, tap a name to open their profile,
            scroll to expand or contract the whole web. Thicker and darker means
            you would go further for them.`
          : `Just you so far. Each introduction that is made adds a line here, and
            the weight of the line is how far you say you would go.`}
        </p>
        ${ties.length ? '<button class="btn sm quiet" data-graph="reset">Reset layout</button>' : ""}
      </div>
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>On Blackbook</h2>
          <span class="eyebrow">${ties.length}</span></div>
        ${!ties.length ? `
          <div class="empty">
            <b>No connections yet.</b>
            Members appear here once an introduction has been made and both of
            you accepted. There is nobody to add by hand.
          </div>` : ""}
        ${ties.map(t => `
          <div class="prow${editing === t.id ? " editing" : ""}">
            <button class="row" data-member="${esc(t.id)}" style="gap:13px;flex:1;min-width:0;text-align:left">
              ${tile(t.member, 36)}
              <span class="grow">
                <span class="who">${nameOf(t.member, true)}</span>
                <span class="sub">${esc(t.member.firm)}</span>
              </span>
            </button>
            ${strengthCell(t)}
          </div>`).join("")}
        ${editing ? (() => {
          const t = ties.find(x => x.id === editing);
          const name = t ? t.member.first : "";
          /* The vouch prompt, and the one moment a circle invitation is
             offered: right after declaring you would go far for someone. The
             scale itself never opens the door; the member does, on purpose. */
          let extra = "";
          if (t && t.strength >= 5) {
            if (API.inCircle(t.id)) extra = `
              <p class="small muted" style="margin-top:10px">
                ${esc(name)} is in your close circle. You see each other's
                private profiles.</p>`;
            else if (API.hasInvited(t.id)) extra = `
              <p class="small muted" style="margin-top:10px">
                Invited to your close circle. If ${esc(name)} accepts, you will
                each see the other's private profile. If not, you will not be
                told, and nothing changes.</p>`;
            else extra = `
              <div class="row" style="margin-top:12px">
                <button class="btn sm" data-circle-invite="${esc(t.id)}">
                  Invite ${esc(name)} to your close circle</button>
              </div>
              <p class="small muted" style="margin-top:8px;line-height:1.6">
                Accepting shares your private profiles with each other. Your
                vouch is never part of the invitation, and a decline is silent.
              </p>`;
          }
          return `<p class="small muted" style="margin-top:12px">
            How far would you actually go for them? Nobody is told, and it
            changes nothing they see.</p>${extra}`;
        })() : ""}
      </div>

      <div class="card">
        <div class="card-head"><h2>Grow your network</h2>
          <span class="eyebrow">Invitations ${me.invitesLeft} of ${me.invitesTotal}</span></div>

        <p class="small" style="font-weight:650;margin-bottom:4px">Someone already on Blackbook</p>
        <p class="small muted" style="line-height:1.6;margin-bottom:10px">
          Met a member in person? Open their profile and tell us you have met.
          They confirm, you connect, and each of you keeps your own private
          vouch. Nothing costs an invitation.
        </p>
        <button class="btn sm" data-go-screen="members">Find them in Members</button>

        <div style="border-top:1px solid var(--line);margin:16px 0"></div>

        <p class="small" style="font-weight:650;margin-bottom:4px">Someone new</p>
        <p class="small muted" style="line-height:1.6;margin-bottom:10px">
          Spending an invitation is the only way in. ${me.invitesLeft} of
          ${me.invitesTotal} unspent, none outstanding: a code you have handed
          out shows here until it is used.
        </p>
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <button class="btn sm" data-invite-wa>Invite by WhatsApp</button>
          <button class="btn sm" data-share-invite>Other ways</button>
          <button class="btn sm" data-qr>${BB.state.showQr ? "Hide the QR" : "Show as QR"}</button>
        </div>
        <p class="small muted" style="margin-top:9px">
          The code comes from your sheet, one per named person.
        </p>
        ${BB.state.showQr ? `
        <div style="margin-top:14px;text-align:center">
          <div style="display:inline-block;background:#fff;padding:18px;border:1px solid var(--line);border-radius:14px">
            <svg viewBox="0 0 ${QR_N} ${QR_N}" width="204" height="204"
              shape-rendering="crispEdges" role="img"
              aria-label="QR code opening the Blackbook invitation gate">
              <path d="${QR_PATH}" fill="#000"/>
            </svg>
          </div>
          <p class="small muted" style="margin-top:10px;line-height:1.6">
            Scanning opens the invitation gate on their phone. The code you
            give them yourself.
          </p>
        </div>` : ""}
      </div>

      ${BB.state.showReach ? `
      <div class="card">
        <div class="card-head"><h2>One step further</h2>
          <span class="eyebrow">${reach.length}</span></div>
        ${reach.length ? reach.map(r => `
          <div class="prow" style="cursor:default">
            <div class="tile veiled" aria-hidden="true" style="width:36px;height:36px">··</div>
            <span class="grow">
              <span class="who">${esc(r.role)}</span>
              <span class="sub">${esc(r.sector)} · ${esc(r.city)}</span>
              <span class="eyebrow" style="display:block;margin-top:5px">Through ${
                r.via.map(v => esc(API.member(v).first)).join(" and ")}</span>
            </span>
            <button class="btn sm" data-act="request">Request</button>
          </div>`).join("") : `
          <div class="empty">
            <b>Nobody yet.</b>
            This fills as the people you are closest to add their own connections.
          </div>`}
        <div class="veil" style="margin-top:14px">
          <b>You see the seat, not the name.</b> Nothing is released until they
          say yes, and you are not told if they decline. You are also never shown
          how strongly those two vouch for each other, because that is their
          own record exactly as yours is.
        </div>
      </div>` : ""}

      <div class="card">
        <div class="card-head"><h2>People not on Blackbook</h2></div>
        <div class="veil">
          <b>We hold nothing about them.</b> Not a name, not a firm, not a note.
          The people you know who are not members stay in your own phone, where
          they already are. We learn a name only when an introduction is agreed
          and both sides have said yes.
        </div>
        <p class="small muted" style="margin-top:12px;line-height:1.6">
          This is why we can tell a stranger, truthfully, that they do not appear
          anywhere in Blackbook until they join it themselves.
        </p>
      </div>
    </div>
  </div>`;
};
