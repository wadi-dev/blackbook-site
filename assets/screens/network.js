/* Network: the people you brought in, and the people they brought in.

   The graph is the caller's own invitation tree as GET /api/network answers
   it, two levels deep, laid out by D3's force simulation (assets/vendor/
   d3.min.js, vendored so the CSP stays 'self' and the app opens offline).
   You are the large node in the middle. The people you invited are filled
   and named, because the join door connected you to each of them. The
   people they invited are outlined and veiled: a handle, which is a role
   and a sector, until the two of you are connected. The API decides who is
   named, so there is never a name here to hide.

   Rounded squares, never circles, as everywhere a person is drawn. Every
   colour is a token in app.css, so the graph follows the theme and the
   daylight switch through the stylesheet.

   The invitation sits below the graph and is live: boot.js mints it with
   POST /api/invitations. It has no need of the graph's answer, so the graph
   is in .wants rather than .needs (core.js): the screen draws at once, and
   if the answer is slow or fails, only the graph's card says so. */

/* A label has to fit in about one node's spacing, so a name is cut to the
   first name and the surname's initial, and a handle to twenty characters.
   The whole of either is in the node's tooltip and in the list a screen
   reader reads. */
const netLabel = n => n.known
  ? (n.last ? `${n.first} ${n.last.charAt(0)}.` : n.first)
  : (n.label.length > 20 ? n.label.slice(0, 19).trimEnd() + "…" : n.label);

const netPeople = n => `${n} ${n === 1 ? "person" : "people"}`;

/* The graph's card, and the list a screen reader reads in its place. */
function netGraph(net) {
  const first = net.nodes.filter(n => n.degree === 1);
  const second = net.nodes.filter(n => n.degree === 2);
  const byId = new Map(net.nodes.map(n => [n.id, n]));

  /* The graph is one image to a screen reader, so it is summed up in its
     label and spelled out in a list it cannot see, each inviter followed by
     the people they invited. */
  const summary = net.nodes.length
    ? `Your network: ${netPeople(first.length)} you invited, ${second.length} they invited`
    : "Your network: just you so far";
  const ordered = first.flatMap(f => [f, ...second.filter(s => s.via === f.id)]);
  const said = n => {
    const by = n.degree === 1 ? "invited by you"
      : `invited by ${byId.has(n.via) ? byId.get(n.via).label : "someone you invited"}`;
    return `${n.label}, ${by}${n.known ? "" : ", no name until you are connected"}.${n.city ? ` ${n.city}.` : ""}`;
  };

  return `
  <div class="card net-card">
    <svg id="net" class="net" role="img" aria-label="${esc(summary)}"></svg>
    <div class="graph-foot">
      <p class="small muted">${net.nodes.length
        ? "Tap someone to open their card. Drag to rearrange, pinch or scroll to zoom, and move around with two fingers on a phone."
        : "Your network grows with each invitation."}</p>
    </div>
  </div>
  <div class="visually-hidden">
    <h2>Who is in your network</h2>
    ${ordered.length ? `<ul>${ordered.map(n => `<li>${esc(said(n))}</li>`).join("")}</ul>`
      : "<p>Nobody yet. Your network grows with each invitation.</p>"}
  </div>`;
}

BB.screens.network = function () {
  const net = API.network();
  /* A code past its expiry is not drawn as live; New invitation comes back. */
  if (BB.state.invite && !(Date.parse(BB.state.invite.expires_at) > Date.now())) BB.state.invite = null;
  return `
  <div class="page-head"><div>
    <h1>Network</h1>
    ${!net || net.nodes.length ? `<p class="sub">The people you invited, and the people they
      invited in turn. Those further out show without names until you are
      connected.</p>` : ""}
  </div></div>

  ${net ? netGraph(net) : `
  <div class="card net-card">
    <div class="net" data-wants="network" style="display:grid;place-items:center;cursor:default">
      <p class="admin-state muted" role="status">Loading</p>
    </div>
  </div>`}

  <div class="cols b" style="margin-top:var(--gap)">
    <div class="stack">
      <div class="card" id="invite">
        <div class="card-head"><h2>Grow your network</h2></div>

        <p class="small muted" style="line-height:1.6;margin-bottom:10px">
          An invitation is a code, valid for 24 hours and spent when it is
          used. Their name stays attached to yours.
        </p>
        ${BB.state.invite ? `
        <div class="invite-code" aria-live="polite">
          <span class="lbl">Your code</span>
          <code>${esc(BB.state.invite.code)}</code>
          <span class="small muted">Valid for ${BB.state.invite.hours} hours.</span>
          <p class="small invite-message">I am inviting you to Blackbook London. Your private access code is: ${esc(BB.state.invite.code)}. Join here: https://blackbook.london/enter.html</p>
        </div>
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <button class="btn sm primary" data-invite-wa>Invite by WhatsApp</button>
          <button class="btn sm" data-invite-linkedin>Invite by LinkedIn</button>
          <button class="btn sm" data-share-invite>${navigator.share ? "Other ways" : "Copy the message"}</button>
          <button class="btn sm" data-qr>${BB.state.showQr ? "Hide the QR" : "Show as QR"}</button>
        </div>` : `
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <button class="btn sm primary" data-new-invite ${BB.state.inviteBusy ? "disabled" : ""}>New invitation</button>
          <button class="btn sm" data-qr>${BB.state.showQr ? "Hide the QR" : "Show as QR"}</button>
        </div>
        ${BB.state.inviteError ? `<p class="small" role="alert" style="margin-top:9px">${esc(BB.state.inviteError)}</p>` : ""}`}
        ${BB.state.showQr ? `
        <div style="margin-top:14px;text-align:center">
          <div style="display:inline-block;background:#fff;padding:18px;border:1px solid var(--line);border-radius:14px">
            <svg viewBox="0 0 ${QR_N} ${QR_N}" width="204" height="204"
              shape-rendering="crispEdges" role="img"
              aria-label="QR code opening the Blackbook London invitation gate">
              <path d="${QR_PATH}" fill="#000"/>
            </svg>
          </div>
          <p class="small muted" style="margin-top:10px;line-height:1.6">
            Scanning opens the invitation gate on their phone. The code you
            give them yourself.
          </p>
        </div>` : ""}
      </div>
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>People not on Blackbook London</h2></div>
        <div class="veil">
          <b>We hold nothing about them.</b> Not a name, not a firm, not a note.
          The people you know who are not members stay in your own phone, where
          they already are. We learn a name only when an introduction is agreed
          and both sides have said yes.
        </div>
        <p class="small muted" style="margin-top:12px;line-height:1.6">
          This is why we can tell a stranger, truthfully, that they do not appear
          anywhere in Blackbook London until they join it themselves.
        </p>
      </div>
    </div>
  </div>`;
};
BB.screens.network.wants = ["network"];

/* What the graph keeps between draws of this screen. The QR, a new
   invitation or a fresh answer from the API each rebuild the SVG; with the
   same people in it, the layout, anything dragged and the zoom come back as
   they were, and the opening motion does not play again. */
let netKept = null;

/* The simulation and opening motion of the graph on screen, stopped before
   the next draw starts its own. */
let netLive = null;

BB.screens.network.mount = function (host) {
  if (netLive) { netLive.stop(); netLive = null; }
  const svgEl = host.querySelector("#net");
  if (!svgEl) return;
  const net = API.network();
  const still = reducedMotion();

  /* Drawn in screen pixels at the size the SVG has now. The viewBox keeps
     that box, so a later resize scales the drawing rather than needing it
     drawn again. */
  const box = svgEl.getBoundingClientRect();
  const w = Math.round(box.width) || 343, h = Math.round(box.height) || 360;

  const SIZE = { 0: 56, 1: 36, 2: 26 };
  const me = { id: net.center.id, me: true, degree: 0, known: true,
               initials: net.center.initials, x: 0, y: 0, fx: 0, fy: 0 };
  const nodes = [me, ...net.nodes.map(n => ({ ...n }))];
  nodes.forEach(n => { n.size = SIZE[n.degree]; });
  const index = new Map(nodes.map(n => [n.id, n]));
  const links = net.edges.filter(e => index.has(e.from) && index.has(e.to))
    .map(e => ({ source: index.get(e.from), target: index.get(e.to) }));

  /* Two rings, a spider's web: the people you invited around you, and the
     people they invited beyond whoever invited them. The first ring widens
     with the number on it, so a large network spreads out rather than
     piling up. Seeded on the rings so the simulation only has to tidy, and
     the same people always settle the same way. */
  const firsts = nodes.filter(n => n.degree === 1);
  const R1 = Math.max(110, firsts.length * 70 / (2 * Math.PI));
  const R2 = R1 + 100;
  firsts.forEach((f, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / firsts.length;
    f.x = Math.cos(a) * R1; f.y = Math.sin(a) * R1;
    const kids = nodes.filter(n => n.via === f.id);
    const spread = Math.min(Math.PI / 2, (2 * Math.PI / firsts.length) * 0.8);
    kids.forEach((k, j) => {
      const b = a + (kids.length > 1 ? spread * (j / (kids.length - 1) - 0.5) : 0);
      k.x = Math.cos(b) * R2; k.y = Math.sin(b) * R2;
    });
  });

  const sig = JSON.stringify([net.center, net.nodes, net.edges]);
  const kept = netKept && netKept.sig === sig ? netKept : null;
  if (kept) nodes.forEach(n => Object.assign(n, kept.pos[n.id]));

  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).distance(l => l.target.degree === 1 ? R1 : R2 - R1).strength(0.7))
    .force("charge", d3.forceManyBody().strength(n => n.me ? -500 : n.degree === 1 ? -260 : -140))
    .force("collide", d3.forceCollide(n => n.me ? 52 : n.degree === 1 ? 44 : 40).iterations(2))
    .force("ring", d3.forceRadial(n => n.me ? 0 : n.degree === 1 ? R1 : R2).strength(0.12))
    .stop();
  /* Settled before anything is drawn, so the graph can be fitted to the
     screen on its final shape. */
  if (!kept) sim.tick(Math.ceil(Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay())));
  else sim.alpha(0);

  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${w} ${h}`);
  svg.append("defs").append("pattern")
    .attr("id", "net-hatch").attr("width", 6).attr("height", 6)
    .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)")
    .append("rect").attr("width", 3).attr("height", 6);
  const view = svg.append("g").attr("class", "net-view");
  const edge = view.append("g").attr("class", "net-edges")
    .selectAll("line").data(links).join("line")
    .classed("far", l => !l.target.known);
  const node = view.append("g").attr("class", "net-nodes")
    .selectAll("g").data(nodes).join("g")
    .attr("class", n => "net-node " + (n.me ? "me" : n.known ? "known" : "veiled"));

  const square = (sel, grow) => sel
    .attr("x", n => -(n.size + grow) / 2).attr("y", n => -(n.size + grow) / 2)
    .attr("width", n => n.size + grow).attr("height", n => n.size + grow)
    .attr("rx", n => (n.size + grow) * 0.3);
  node.append("title").text(n => n.me ? "You" : n.label);
  square(node.filter(n => n.me).append("rect").attr("class", "net-ring"), 12);
  square(node.append("rect").attr("class", "net-shape"), 0);
  square(node.filter(n => !n.known).append("rect").attr("class", "net-veil"), 0);
  node.filter(n => n.known).append("text").attr("class", "net-ini")
    .attr("dy", "0.35em").attr("font-size", n => Math.round(n.size * 0.32))
    .text(n => n.initials);
  node.append("text").attr("class", "net-label")
    .attr("y", n => n.size / 2 + (n.me ? 22 : 14))
    .text(n => n.me ? "You" : netLabel(n));

  const draw = () => {
    node.attr("transform", n => `translate(${n.x},${n.y})`);
    edge.attr("x1", l => l.source.x).attr("y1", l => l.source.y)
      .attr("x2", l => l.target.x).attr("y2", l => l.target.y);
  };
  draw();

  const keep = () => {
    netKept = { sig, w, h, t: d3.zoomTransform(svgEl),
      pos: Object.fromEntries(nodes.map(n => [n.id, { x: n.x, y: n.y, fx: n.fx, fy: n.fy }])) };
  };

  /* Fitted on the drawing itself, labels included, measured before the
     opening motion moves anything. Never larger than life, so a network of
     two does not fill the card with one enormous square. */
  const b = view.node().getBBox();
  const k = Math.min(1.2, 0.9 * Math.min(w / b.width, h / b.height));
  const fitted = d3.zoomIdentity.translate(w / 2, h / 2).scale(k)
    .translate(-(b.x + b.width / 2), -(b.y + b.height / 2));

  /* Wheel and pinch zoom, and the background drags to move around. On a
     phone one finger is left to scroll the page, as it is everywhere else,
     and two move the graph: a graph across the top of the screen that took
     every swipe would trap the invitation underneath it. The graph can be
     moved half a screen past its edge and no further, so it cannot be lost. */
  const pad = Math.max(w, h) / k / 2;
  const zoom = d3.zoom()
    .scaleExtent([k / 2, Math.max(3, k * 4)])
    .translateExtent([[b.x - pad, b.y - pad], [b.x + b.width + pad, b.y + b.height + pad]])
    .filter(e => (!e.ctrlKey || e.type === "wheel") && !e.button
      && !(e.type === "touchstart" && e.touches.length < 2))
    .on("zoom", e => {
      view.attr("transform", e.transform);
      if (netKept && netKept.sig === sig) netKept.t = e.transform;
    });
  svg.call(zoom).on("dblclick.zoom", null);
  svg.call(zoom.transform, kept && kept.w === w && kept.h === h ? kept.t : fitted);

  /* A tap opens the card, through the same openMember every other list
     uses, so a veiled node opens the stranger's card, which has no name on
     it either. Not for the founder seat: every card it opens is a staff
     read, the whole record and a look on that member's own trail, so a tap
     on a seat this graph veils, or a drag let go under 4px, would name them
     here and show them the look. A staff read stays a deliberate act in
     Admin. A press that travels drags the person instead; you stay where
     you are. With reduced motion the dragged node moves alone; with motion
     the rest of the web gives way around it. */
  const tap = n => {
    if (!n.known && staffSeat()) {
      toast("No name here until you are connected, as for any member. Admin holds the record.");
      return;
    }
    openMember(n.id, null);
  };
  let moved = 0, dragging = false;
  node.call(d3.drag()
    .on("start", () => { moved = 0; dragging = false; })
    .on("drag", function (e, n) {
      moved += Math.abs(e.dx) + Math.abs(e.dy);
      if (n.me || moved < 4) return;
      if (!dragging) {
        dragging = true;
        this.classList.add("grabbed");
        if (!still) sim.alphaTarget(0.2).restart();
      }
      n.fx = n.x = e.x;
      n.fy = n.y = e.y;
      if (still) draw();
    })
    .on("end", function (e, n) {
      if (moved < 4) { tap(n); return; }
      if (!dragging) return;
      this.classList.remove("grabbed");
      if (!still) sim.alphaTarget(0);
      keep();
    }));
  sim.on("tick", draw).on("end", keep);

  keep();
  let opening = null;
  if (!still && !kept) {
    /* The web opens out from you once, on the first draw of these people. */
    const to = nodes.map(n => [n, n.x, n.y]);
    opening = d3.timer(t => {
      const f = d3.easeCubicOut(Math.min(1, t / 650));
      to.forEach(([n, x, y]) => { n.x = x * f; n.y = y * f; });
      draw();
      if (f === 1) opening.stop();
    });
  }
  netLive = { stop() { if (opening) opening.stop(); sim.stop(); } };
};
