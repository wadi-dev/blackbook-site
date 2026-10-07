/* ==========================================================================
   BLACKBOOK: mock data

   Stands in for the API. Every function here is written to mirror the shape a
   real endpoint would return, so swapping to fetch() later is a change in this
   file only, no screen touches the data directly.

   The founder is real. There are no other records: the network
   fills with real members or stays honestly empty.

   Home no longer reads any of it. API.me() and the live adapters below it
   read the API's answers through BB.store; the rest stays mock until its
   screen is connected.
   ========================================================================== */

const DB = {};

/* ---------------------------------------------------------------- people -- */

DB.members = [
  /* The founder. The only real person, and the only record, shown under the
     trading name. Everything not written in the product is absent rather than
     invented: no ask until the founder writes one, no achievements. */
  { id: "founder", first: "Blackbook", last: "London", initials: "BL",
    role: "Founder", firm: "Blackbook London", city: "London",
    sector: "Corporate Leadership", sub: "Founder",
    founder: true, founding: false, verified: "30 Jul 2026",
    invitesTotal: 5, invitesLeft: 5, referredBy: "Founder",
    ask: "", askType: "door", askAge: 0, askOptIns: 0, askOpen: false,
    gives: [
      { text: "Introductions to MDs and directors at bulge-bracket banks in London",
        type: "door", confidence: 5 },
      { text: "How to get a UK data-protection position right before launch rather than after",
        type: "judgment", confidence: 5 }
    ],
    achievements: [] }
];

DB.me = "founder";

/* ------------------------------------------------------------- the graph -- */
/* Declared strength, 1–7. Held privately: never shown to the person rated. */

DB.ties = [
  /* Empty until the first real member joins. Nobody starts at zero: the
     referrer becomes the first connection at joining. */
];

/* Ties between other members, which is what makes a second degree exist.
   Deliberately holds no strength: how close THEY say they are is their own
   record, and you are never shown it. All you get is that a route exists. */
DB.memberTies = [];

/* Members who have blocked visibility to this member's firm. Held as seats
   only, the searcher must never be able to work out who they are, so no
   name, no id, nothing joinable back to a member record. */
DB.blocked = [];

/* There is deliberately no store of non-members here.

   R1 in the DPIA was that we held a name, a firm and a closeness rating about
   people who had never heard of us, could not object because they did not know,
   and would have had to be told under Article 14. Scored HIGH, mitigated to
   Medium, and marked "arguable but not comfortable".

   Resolved by not holding it. The member's own contacts stay on the member's own
   phone. We learn a name at the moment an introduction is agreed and both sides
   have accepted, and not before. See ../../blackbook/r1-options.md. */

/* Firms this member has blocked. Absolute and silent: never disclosed to the
   blocked party, and never to a searcher. */
DB.blocks = [];

/* The close circle: MUTUAL, unlike the vouch scale, which stays one-sided and
   private forever.

   The two are deliberately decoupled. A vouch is your own honest record and
   never triggers anything, or members would inflate their sevens to open
   doors and the whole graph would rot into flattery. Entering each other's
   private profiles is a separate, deliberate act: one member extends an
   invitation, the other accepts or silently declines. Only the invitation
   travels, never the number, so the only signal another member can ever
   receive is a compliment. */
DB.circle = [];

/* Circle invitations this member has sent. Held so the UI can say "invited"
   instead of offering the button twice. Never shown to the other side as
   anything but the single invitation itself. */
DB.circleOut = [];

/* Met-in-person requests: the one way a connection forms outside a brokered
   introduction. Two members meet at a dinner, one says so on the platform,
   the other confirms, and only then does a tie exist. Mutual by construction,
   silent on decline, and it carries no strength: each side sets their own
   vouch privately afterwards, exactly as with any other connection.
   The requests waiting on this member come from the API (GET
   /api/ties/requests); these are the ones this member has sent. */
DB.connectOut = [];

/* Asks this member has passed one hop into their own network. */
DB.passed = {};

/* Conduct reports this member has filed.

   The terms already forbid soliciting the membership (section 4) and make it a
   ground for removal (section 8). Until now there was no way for a member to
   say it had happened, which made both clauses decorative.

   Deliberately empty on day one. A network that ships with somebody already
   reported is telling its first ten members something untrue about itself. */
DB.reports = [];

/* The four grounds, worded as the member would say them rather than as the
   terms say them. Each maps to an obligation in section 4 that section 8 can
   act on, so a report is never an opinion about someone being unpleasant. */
DB.reportReasons = {
  selling:    "Sold to me, or pitched the room",
  pressure:   "Kept pushing after I said no",
  identity:   "Not who they said they were",
  confidence: "Repeated something from here outside"
};

/* ------------------------------------------------------------- lexicon --- */

/* One lexicon for both sides. A give in a row satisfies an ask in the same row,
   so the row must have one name. It used to have two: a give was "Doors" and the
   ask it satisfied was "Access", which put both words on screen at once on Home
   and read as two different things. Same for "Deal flow" and "Deal". */
DB.types = {
  capital: "Capital", talent: "Talent", door: "Doors",
  deal: "Deal flow", judgment: "Judgment"
};

/* The fifteen sectors, verbatim from the taxonomy document. The filter lists
   all of them, including the empty ones, because the list IS the statement of
   what this network intends to hold. An empty sector renders disabled with an
   honest zero rather than being hidden, which is also the recruitment brief
   in miniature. */
DB.sectors = [
  "Investment Banking", "Private Equity", "Hedge Funds", "Asset Management",
  "Private Credit", "Real Assets", "Family Office", "Corporate Leadership",
  "Technology", "Law", "Professional Services", "Public Sector & Policy",
  "Healthcare & Life Sciences", "Energy & Commodities",
  "Media, Sport & Entertainment"
];

/* Level two of the taxonomy: what you DO within the world you are in. Verbatim
   from the taxonomy document, which spent some effort separating this from
   level three (what you point it at), so additions here should go through that
   document first, not get typed in ad hoc.

   Two mock members carry a focus where their sub-sector should be (Sovereign
   Wealth, Artificial Intelligence). Left alone deliberately: they demo well,
   and the members menu unions this list with whatever members actually carry,
   so they stay filterable either way. */
DB.subsectors = {
  "Investment Banking": ["M&A / Advisory", "Sales & Trading",
    "Equity Capital Markets", "Debt Capital Markets", "Leveraged Finance",
    "Restructuring & Special Situations", "Financial Sponsors Coverage",
    "Equity Research", "Private Capital Markets"],
  "Private Equity": ["Large-Cap Buyout", "Mid-Market Buyout", "Growth Equity",
    "Venture Capital", "Secondaries", "Co-Investment", "Fund of Funds",
    "Distressed & Turnaround", "Portfolio Operations"],
  "Hedge Funds": ["Long / Short Equity", "Global Macro", "Multi-Strategy (Pod)",
    "Event-Driven & Merger Arbitrage", "Credit & Distressed",
    "Quantitative & Systematic", "Activist", "Commodities",
    "Fixed Income Relative Value"],
  "Asset Management": ["Long-Only Equities", "Fixed Income",
    "Multi-Asset & Solutions", "ETF & Index", "Private Markets Allocation"],
  "Private Credit": ["Direct Lending", "Mezzanine", "Special Situations",
    "Asset-Backed & Specialty Finance", "NAV & Fund Finance",
    "Real Estate Debt", "Infrastructure Debt"],
  "Real Assets": ["Real Estate Equity", "Infrastructure",
    "Energy Transition & Renewables", "Natural Resources",
    "Transport & Aviation Leasing", "Digital Infrastructure"],
  "Family Office": ["Single Family Office", "Multi-Family Office",
    "Principal Investment", "Foundation & Endowment", "UHNW Private Banking"],
  "Corporate Leadership": ["Chief Executive", "Chief Financial Officer",
    "Chief Operating Officer", "Chief Commercial Officer",
    "Corporate Development / M&A", "Strategy", "General Counsel",
    "Chair & Non-Executive Portfolio"],
  "Technology": ["Founder / Chief Executive", "Engineering Leadership",
    "Product Leadership", "Design Leadership", "Data & Analytics Leadership",
    "Commercial & Go-to-Market", "Chief Information Security Officer"],
  "Law": ["M&A / Corporate", "Private Funds", "Banking & Finance",
    "Litigation & Arbitration", "Regulatory & Antitrust",
    "Restructuring & Insolvency", "Tax", "Employment & Partnership",
    "Intellectual Property"],
  "Professional Services": ["Strategy Consulting", "Transaction Services",
    "Audit & Assurance", "Tax Advisory", "Restructuring Advisory",
    "Executive Search", "Investor Relations & Communications",
    "Risk & Regulatory"],
  "Public Sector & Policy": ["Government & Ministerial",
    "Regulators & Central Banks", "Sovereign & Development Finance",
    "Trade & Diplomacy", "Policy & Research", "Defence & National Security"],
  "Healthcare & Life Sciences": ["Biotech Founder", "Pharmaceutical Leadership",
    "Medtech & Devices", "Healthcare Services", "Life Science Investing",
    "Clinical & Academic Leadership", "Regulatory & Market Access"],
  "Energy & Commodities": ["Oil & Gas", "Power & Utilities",
    "Renewables Development", "Commodities Trading", "Mining & Metals",
    "Carbon & Environmental Markets"],
  "Media, Sport & Entertainment": ["Sports Ownership & Rights",
    "Talent & Representation", "Film, Television & Streaming", "Music",
    "Publishing & Press", "Luxury & Fashion"]
};

/* Strength ramp: weight of black, never hue. Ordinal data on an ordinal
   channel, it survives colour blindness, greyscale and a screenshot. */
DB.ramp = { 7: "#0A0A0A", 6: "#333333", 5: "#555555", 4: "#777777",
            3: "#999999", 2: "#B5B5B5", 1: "#CFCFCF" };
DB.rampDark = { 7: "#FFFFFF", 6: "#D6D6D6", 5: "#AFAFAF", 4: "#8A8A8A",
                3: "#6A6A6A", 2: "#4E4E4E", 1: "#3A3A3A" };

/* ------------------------------------------------------------------ API --- */
/* Mirrors the shape a real endpoint would return. Swap the bodies for fetch()
   and nothing above this line changes. */

/* "Alice Arbery" is first "Alice", last "Arbery", initials "AA". Split on the
   first space only, so a surname with a space in it stays whole. */
function splitName(name) {
  const s = String(name || "").trim();
  const i = s.indexOf(" ");
  const first = i === -1 ? s : s.slice(0, i);
  const last = i === -1 ? "" : s.slice(i + 1).trim();
  return { first, last, initials: (first.charAt(0) + last.charAt(0)).toUpperCase() };
}

/* "7 Oct 2026", as Admin writes a date. */
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const API = {
  /* ---- Live, through BB.store (store.js). These read what the store holds
     and fetch nothing: a screen that calls one names its key in .needs, so
     the data is there before the screen draws. ---------------------------- */

  /* SelfView for a member, StaffView for the founder seat. The founder seat
     is shown under the trading name whatever the seat itself is called,
     because no screen names the founder. */
  me() {
    const v = BB.store.peek("me");
    if (!v) return undefined;
    const founder = v.role === "founder";
    return {
      id: v.id,
      ...splitName(founder ? "Blackbook London" : v.name),
      role: v.role_title, firm: v.firm, city: v.city, sector: v.sector,
      founder,
      since: shortDate.format(new Date(v.member_since || v.created_at)),
      invitesLeft: v.invitations_left,
      /* For the Asks screen, still on the mock, which reads the member's
         gives off this record. */
      gives: API.gives()
    };
  },

  /* The member's one open ask, or null. The API lists asks oldest first, so
     if more than one is open the newest is the one shown. */
  ask() {
    const open = (BB.store.peek("asks") || []).filter(a => a.state === "open");
    const a = open[open.length - 1];
    if (!a) return null;
    return {
      id: a.id, category: a.category, label: a.category_label, title: a.title,
      age: Math.max(0, Math.floor((Date.now() - Date.parse(a.created_at)) / 86400000))
    };
  },

  /* `text` and `type` keep the mock's names, which Home, Gives and the
     screens still on the mock all read. */
  gives: () => (BB.store.peek("gives") || []).map(g => ({
    id: g.id, category: g.category, label: g.category_label,
    text: g.description, type: g.give_type, confidence: g.confidence
  })),

  /* The two closed lists, values and the words beside them, as served. */
  categories: () => BB.store.peek("categories"),

  /* Confirmed ties, as ConnectionView: name, role and firm, and no strength.
     ties() below stays the mock for the Network screen until vouches are
     connected. */
  connections: () => (BB.store.peek("ties") || []).map(c => ({
    id: c.id, ...splitName(c.name),
    role: c.role_title, firm: c.firm, city: c.city, sector: c.sector
  })),

  /* The member's introductions, both sides, as AskerView: id, state, side,
     requested_at, and contact once released. Oldest first, as served. */
  intros: () => BB.store.peek("introductions") || [],

  /* Met-in-person requests waiting on this member, as the veiled seat
     (PeerView): handle, sector and city, and no name and no date. */
  tieRequests: () => BB.store.peek("tieRequests") || [],

  /* ---- Mock ------------------------------------------------------------ */

  member:    id => DB.members.find(m => m.id === id),
  members:   () => DB.members.filter(m => m.id !== DB.me),
  ties:      () => DB.ties.map(t => ({ ...t, member: API.member(t.id) })),

  /* Asks from other members, with whether the viewer can actually give it. */
  asks() {
    const mine = API.me();
    const myGiveTypes = new Set(mine.gives.map(g => g.type));
    return API.members()
      .filter(m => m.ask && m.askOpen !== false)
      .map(m => ({ member: m, canHelp: myGiveTypes.has(m.askType) }))
      .sort((a, b) => (b.canHelp - a.canHelp) || (a.member.askAge - b.member.askAge));
  },

  /* People your connections can reach who you cannot reach yourself.

     Returned VEILED, on purpose. You get the seat, the sector, the city and who
     the route runs through. You do not get the name, and you do not get how
     close the two of them say they are, because that is their private record
     exactly as yours is. The name is released when both sides accept, and not
     before. This is the same rule search follows.

     minStrength defaults to 5 because a route is only worth showing if the
     person carrying it would actually make the call. */
  secondDegree(minStrength = 5) {
    const mine = new Set(DB.ties.map(t => t.id));
    const close = new Set(DB.ties.filter(t => t.strength >= minStrength).map(t => t.id));
    const found = new Map();

    DB.memberTies.forEach(({ a, b }) => {
      [[a, b], [b, a]].forEach(([via, far]) => {
        if (!close.has(via) || mine.has(far) || far === DB.me) return;
        const m = API.member(far);
        if (!m) return;
        if (!found.has(far)) {
          found.set(far, {
            id: far, role: m.role, sector: m.sector, sub: m.sub, city: m.city,
            gives: m.gives.length, via: []
          });
        }
        found.get(far).via.push(via);
      });
    });
    return [...found.values()];
  },

  /* ---- Mutations. In the real build each of these is one request; here they
     change DB in place so the prototype behaves rather than pretends. ------ */

  /* Passing an ask sends it one hop into your own network. They see the ask,
     never who asked, so all that is recorded here is that it happened. */
  passOn(id) {
    DB.passed[id] = (DB.passed[id] || 0) + 1;
    return DB.passed[id];
  },
  hasPassed: id => !!DB.passed[id],

  block(firm) {
    const name = firm.trim();
    if (!name || DB.blocks.includes(name)) return false;
    DB.blocks.push(name);
    return true;
  },
  unblock(firm) {
    const i = DB.blocks.indexOf(firm);
    if (i > -1) DB.blocks.splice(i, 1);
  },

  /* Met in person, from a profile. The request only says "we have met"; the
     tie forms when the other side agrees that is true. Answering one is live
     (boot.js); asking is still the mock until the profile is connected. */
  isTied: id => DB.ties.some(t => t.id === id),
  hasRequestedConnect: id => DB.connectOut.includes(id),
  requestConnect(id) {
    if (!API.member(id) || API.isTied(id) || API.hasRequestedConnect(id)) return false;
    DB.connectOut.push(id);
    return true;
  },

  /* The close circle. Mutual by construction: nothing is shared until both
     have said yes, and a decline is silent, so the inviter simply never
     learns. It is not decided yet, so nothing here reaches the API, and the
     Introductions screen no longer offers invitations to answer. */
  inCircle: id => DB.circle.includes(id),
  hasInvited: id => DB.circleOut.includes(id),
  inviteCircle(id) {
    if (!API.member(id) || API.inCircle(id) || API.hasInvited(id)) return false;
    DB.circleOut.push(id);
    return true;
  },

  /* Reporting conduct.

     Silent, like a decline and like a block. If reporting were visible nobody
     senior would ever use it: the cost of being seen to complain, in this
     industry, is higher than the cost of being sold to.

     Note what is deliberately NOT returned: how many other people have
     reported the same person. That is the founder's view, not a member's.
     Telling one member that two others have complained hands them a fact about
     two people who did not consent to share it. */
  report(id, reason, detail) {
    if (!API.member(id) || !DB.reportReasons[reason]) return false;
    if (API.reportedByMe(id)) return false;
    DB.reports.push({
      about: id, by: DB.me, reason,
      detail: (detail || "").trim().slice(0, 600),
      when: new Date().toISOString()
    });
    return true;
  },
  reportedByMe: id => DB.reports.some(r => r.about === id),

  /* Search anonymises STRANGERS, not everyone.
     Veiling someone whose name you already have is theatre, and theatre is
     corrosive in a product whose whole claim is discretion. So:
       - already in your network  -> shown openly. You know them. Go and ask.
       - anyone else              -> seat, sector and path only, no name,
                                     until both sides have opted in. */
  /* Word-level matching across everything a member has declared, including
     what they can open, which is the field people actually search for and the
     one the old version never looked at. Every word in the query has to appear
     somewhere in the record, so "healthcare chair" narrows rather than widens.

     This is still matching, not understanding. It will not know that "carve-out"
     and "divestment" are the same thing. The screen no longer claims otherwise:
     the old copy invited "search by what you need", which promised a search
     nobody had built. */
  search(q) {
    const words = (q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const haystack = m => [
      m.role, m.firm, m.sector, m.sub, m.city, m.ask,
      ...m.gives.map(g => g.text),
      ...m.gives.map(g => DB.types[g.type]),
      DB.types[m.askType]
    ].join(" ").toLowerCase();

    return API.members()
      .filter(m => { const h = haystack(m); return words.every(w => h.includes(w)); })
      .map(m => {
        const tie = DB.ties.find(x => x.id === m.id);
        return tie
          ? { known: true, id: m.id, member: m, strength: tie.strength,
              path: "In your network" }
          : { known: false, id: m.id,
              role: m.role, sector: m.sector, sub: m.sub, city: m.city,
              path: "Second degree · " +
                    (1 + (m.id.charCodeAt(0) % 3)) + " shared connections" };
      });
  },

  /* Blocked members are excluded silently and the count is real, not a fixed
     line of copy. Nothing is claimed that is not true of this query. */
  blockedFrom(q) {
    const words = (q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    return DB.blocked.filter(b => {
      const h = [b.role, b.sector, b.city].join(" ").toLowerCase();
      return words.every(w => h.includes(w));
    }).length;
  }
};
