/* ==========================================================================
   BLACKBOOK — mock data

   Stands in for the API. Every function here is written to mirror the shape a
   real endpoint would return, so swapping to fetch() later is a change in this
   file only — no screen touches the data directly.

   All people are fictional.
   ========================================================================== */

const DB = {};

/* ---------------------------------------------------------------- people -- */

DB.members = [
  /* The signed-in member. Real name, fictional seat: the role, firm, ask,
     gives and achievements below are placeholder and describe nobody. */
  { id: "wg", first: "Wadi", last: "Guilden", initials: "WG",
    role: "Co-Founder & Chief Operating Officer", firm: "Blackbook", city: "London",
    sector: "Corporate Leadership", sub: "Chief Operating Officer",
    founder: true, founding: false, verified: "14 Feb 2026",
    /* Invitations and referrer used to be printed straight into the settings
       markup as "2 of 2" and "The founders". They are facts about a member, so
       they belong in the member record where they can be wrong rather than in
       the template where they cannot be right. */
    invitesTotal: 2, invitesLeft: 2, referredBy: "The founders",
    ask: "A chair for a €400m European industrial platform. Someone who has taken a family-owned business through its first institutional cycle and out the other side.",
    askType: "talent", askAge: 4, askOptIns: 3, askOpen: true,
    /* Drafted from things Wadi has actually said, not invented. Each one still
       needs him to confirm the wording and set his own confidence, because
       confidence is a judgement about whether he would really make the call. */
    gives: [
      { text: "Introductions to MDs and directors at bulge-bracket banks in London",
        type: "door", confidence: 5 },
      { text: "A route into Bell & Colvill, a McLaren and Lotus dealer group in Surrey",
        type: "door", confidence: 6 },
      { text: "How to get a UK data-protection position right before launch rather than after",
        type: "judgment", confidence: 5 }
    ],
    /* Deliberately empty. This record carries a real person's name, so it must
       not carry invented credentials. Everything else on it (the seat, the ask,
       the gives) is placeholder that exists to demonstrate the mechanics; a
       quantified claim about somebody's career is a different thing, and it
       read as a CV once the name above it was real. */
    achievements: [] },

  { id: "jr", first: "Julian", last: "Reyes", initials: "JR",
    role: "Founding Partner", firm: "Reyes & Co.", city: "New York",
    sector: "Private Credit", sub: "Special Situations",
    founder: true, founding: false, verified: "14 Feb 2026",
    ask: "A regulator-side view on how the UK will treat NAV facilities in 2027. I will pay for it in deal flow.",
    askType: "judgment", askAge: 11, askOptIns: 1, askOpen: true,
    gives: [
      { text: "Creditor-side introductions in European workouts", type: "door", confidence: 7 },
      { text: "Direct lending capital, $40–120m", type: "capital", confidence: 6 }
    ],
    achievements: [
      "Founded a $3.4bn special-situations platform from a single-LP seed",
      "Twelve years on a bulge-bracket restructuring desk before launching",
      "Lead creditor in three of the decade's largest European workouts"
    ],
    /* Julian's circle invitation is the demo's pending one, so accepting it
       has a visible payoff: this appears the moment both sides have agreed. */
    closed: [
      "Quietly assembling a continuation vehicle for two 2019-vintage assets",
      "Anchor commitment agreed, unannounced, for a distressed shipping book"
    ] },

  { id: "tm", first: "Theodora", last: "Mbeki", initials: "TM",
    role: "Chief Investment Officer", firm: "Aldwych Sovereign", city: "Singapore",
    sector: "Asset Management", sub: "Sovereign Wealth",
    founder: false, founding: true, verified: "2 Mar 2026",
    ask: "Two credible GPs in energy transition infrastructure who are not already on every consultant's list.",
    askType: "deal", askAge: 6, askOptIns: 2, askOpen: true,
    gives: [
      { text: "Sovereign LP introductions", type: "capital", confidence: 6 },
      { text: "Co-investment capacity at $50m and above", type: "capital", confidence: 7 }
    ],
    achievements: [
      "Allocates $18bn across private markets for a sovereign mandate",
      "Built the fund's first co-investment programme, now 40% of deployment",
      "Sits on three GP advisory boards"
    ] },

  { id: "ph", first: "Peter", last: "Halloran", initials: "PH",
    role: "Head of European M&A", firm: "Sterling Whitcombe", city: "London",
    sector: "Investment Banking", sub: "M&A / Advisory",
    founder: false, founding: true, verified: "2 Mar 2026",
    ask: "An introduction to the family behind a mid-Rhine chemicals group. Not a mandate hunt. A relationship I have been building for six years.",
    askType: "door", askAge: 21, askOptIns: 0, askOpen: true,
    gives: [
      { text: "Sponsor coverage across 40 European funds", type: "door", confidence: 7 },
      { text: "Defence-side advisory relationships", type: "judgment", confidence: 6 }
    ],
    achievements: [
      "Advised on $60bn of announced transactions in the last three years",
      "Runs a 40-banker franchise across five countries",
      "Sole adviser on two hostile defences in 2025"
    ],
    /* Shown only to people this member holds close (5+). The point is
       anti-solicitation: live, unannounced work is exactly what a seller
       cold-pitches against, so it never reaches anyone the member has not
       personally rated close. See closedCard() in profile.js. */
    closed: [
      "Sole adviser on an unannounced take-private in European industrials",
      "Retained pre-announcement by a Gulf sovereign fund on a defence carve-out"
    ] },

  { id: "nb", first: "Nadia", last: "Broussard", initials: "NB",
    role: "Managing Director", firm: "Corbel Infrastructure", city: "Paris",
    sector: "Real Assets", sub: "Energy Transition & Renewables",
    founder: false, founding: true, verified: "9 Mar 2026",
    ask: "A commercial director who has actually built and sold merchant storage in the Nordics.",
    askType: "talent", askAge: 3, askOptIns: 4, askOpen: true,
    gives: [
      { text: "Grid and permitting contacts across France and Iberia", type: "door", confidence: 7 },
      { text: "Project finance structuring", type: "judgment", confidence: 6 }
    ],
    achievements: [
      "Closed €6.5bn of transition infrastructure since 2019",
      "Former head of project finance at a G-SIB",
      "Advises the French government on grid-scale storage policy"
    ] },

  { id: "sk", first: "Soren", last: "Kalb", initials: "SK",
    role: "Co-Founder & Chief Executive", firm: "Vantablack Systems", city: "San Francisco",
    sector: "Technology", sub: "Artificial Intelligence",
    founder: false, founding: true, verified: "9 Mar 2026",
    ask: "Capital with patience. A single strategic cheque of $80–120m from someone who will not need liquidity before 2032.",
    askType: "capital", askAge: 8, askOptIns: 5, askOpen: true,
    gives: [
      { text: "Hyperscaler relationships at CTO level", type: "door", confidence: 6 },
      { text: "Technical diligence on inference workloads", type: "judgment", confidence: 7 }
    ],
    /* Soren also holds close-only material, but the demo member's tie to him
       is a 3, so it never renders. The pair with Peter (a 6) demonstrates both
       sides of the gate with the mock data as it stands. */
    closed: [
      "In quiet talks to acquire a European inference-chip team",
      "Series D being assembled at better than double the last round"
    ],
    achievements: [
      "Second company; the first sold to a US hyperscaler in 2021",
      "$310m raised across four rounds; profitable since Q2 2025",
      "Fourteen granted patents in inference optimisation"
    ] },

  { id: "ao", first: "Adaeze", last: "Okonkwo", initials: "AO",
    role: "Senior Partner", firm: "Wren & Partners", city: "London",
    sector: "Law", sub: "Private Funds",
    founder: false, founding: true, verified: "16 Mar 2026",
    ask: "A conversation with an LP who has walked away from a fund at final close. I want to understand what actually breaks the trust.",
    askType: "judgment", askAge: 14, askOptIns: 2, askOpen: true,
    gives: [
      { text: "Fund formation counsel", type: "judgment", confidence: 7 },
      { text: "LPA negotiation across 60-plus funds", type: "judgment", confidence: 7 }
    ],
    achievements: [
      "Structured 60+ first-time funds, aggregate $22bn",
      "Head of the firm's global funds practice",
      "Sits on the LPA drafting committee of an industry body"
    ] },

  { id: "lv", first: "Lucia", last: "Ventura", initials: "LV",
    role: "Group Chief Financial Officer", firm: "Ferrante Holdings", city: "Milan",
    sector: "Corporate Leadership", sub: "Chief Financial Officer",
    founder: false, founding: true, verified: "16 Mar 2026",
    ask: "An operating partner who can run a 14-month carve-out without needing a consultancy behind them.",
    askType: "talent", askAge: 9, askOptIns: 1, askOpen: true,
    gives: [
      { text: "Family-controlled industrial boards in Italy", type: "door", confidence: 6 },
      { text: "Carve-out and separation experience", type: "judgment", confidence: 7 }
    ],
    achievements: [
      "CFO of a €4bn family-controlled industrial group",
      "Executed the group's first public bond, 2023",
      "Two decades at a Big Four transaction practice"
    ] },

  { id: "rh", first: "Rohan", last: "Hirani", initials: "RH",
    role: "Principal", firm: "Ashgrove Family Office", city: "Dubai",
    sector: "Family Office", sub: "Single Family Office",
    founder: false, founding: true, verified: "23 Mar 2026",
    ask: "Co-investors for control deals in GCC healthcare. Cheque size $40–80m, no fund structures.",
    askType: "capital", askAge: 5, askOptIns: 3, askOpen: true,
    gives: [
      { text: "Direct balance-sheet capital, $40–80m", type: "capital", confidence: 7 },
      { text: "GCC healthcare operators", type: "door", confidence: 6 }
    ],
    achievements: [
      "Directs the direct-investment arm of a third-generation family balance sheet",
      "Nine control positions across logistics and healthcare services",
      "Chairs the family's investment committee"
    ] },

  { id: "gw", first: "Gideon", last: "Whitlock", initials: "GW",
    role: "Director General", firm: "Office for Market Integrity", city: "London",
    sector: "Public Sector & Policy", sub: "Regulators & Central Banks",
    founder: false, founding: true, verified: "23 Mar 2026",
    ask: "Nothing. I am here to listen, and to correct things that are wrong before they become policy.",
    askType: "judgment", askAge: 30, askOptIns: 0, askOpen: false,
    gives: [
      { text: "Regulatory perspective before it becomes policy", type: "judgment", confidence: 7 }
    ],
    achievements: [
      "Leads a supervisory directorate covering wholesale markets",
      "Fifteen years in markets, then eight in public service",
      "Chairs an international coordination working group"
    ] }
];

DB.me = "wg";

/* ------------------------------------------------------------- the graph -- */
/* Declared strength, 1–7. Held privately: never shown to the person rated. */

DB.ties = [
  { id: "jr", strength: 7, since: "2019" },
  { id: "ph", strength: 6, since: "2016" },
  { id: "tm", strength: 5, since: "2021" },
  { id: "ao", strength: 5, since: "2018" },
  { id: "nb", strength: 4, since: "2022" },
  { id: "sk", strength: 3, since: "2024" },
  { id: "lv", strength: 2, since: "2025" }
];

/* Ties between other members, which is what makes a second degree exist.
   Deliberately holds no strength: how close THEY say they are is their own
   record, and you are never shown it. All you get is that a route exists. */
DB.memberTies = [
  { a: "tm", b: "rh" },
  { a: "jr", b: "rh" },
  { a: "ph", b: "gw" },
  { a: "ao", b: "gw" }
];

/* Members who have blocked visibility to this member's firm. Held as seats
   only — the searcher must never be able to work out who they are, so no
   name, no id, nothing joinable back to a member record. */
DB.blocked = [
  { role: "Managing Director", sector: "Private Equity", city: "London" },
  { role: "Partner", sector: "Law", city: "London" }
];

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
DB.blocks = ["Ferrante Holdings"];

/* The close circle: MUTUAL, unlike the vouch scale, which stays one-sided and
   private forever.

   The two are deliberately decoupled. A vouch is your own honest record and
   never triggers anything, or members would inflate their sevens to open
   doors and the whole graph would rot into flattery. Entering each other's
   private profiles is a separate, deliberate act: one member extends an
   invitation, the other accepts or silently declines. Only the invitation
   travels, never the number, so the only signal another member can ever
   receive is a compliment. */
DB.circle = ["ph"];

/* Invitations to a circle, pending this member's answer. */
DB.circleInvites = [
  { from: "jr", when: "14 Aug" }
];

/* Circle invitations this member has sent. Held so the UI can say "invited"
   instead of offering the button twice. Never shown to the other side as
   anything but the single invitation itself. */
DB.circleOut = [];

/* Met-in-person requests: the one way a connection forms outside a brokered
   introduction. Two members meet at a dinner, one says so on the platform,
   the other confirms, and only then does a tie exist. Mutual by construction,
   silent on decline, and it carries no strength: each side sets their own
   vouch privately afterwards, exactly as with any other connection. */
DB.connectRequests = [
  { from: "rh", when: "15 Aug" }
];
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

/* Reasons a member can attach to a decline, if they choose to attach anything.

   The default decline stays silent, and the promise stays intact: declining
   costs nothing and carries no signal. This list exists for the member who
   WANTS the other side to hear something, because being turned down in dead
   silence lands badly with exactly the seniority this network selects for.

   Every line is written to close a door gently rather than open a negotiation:
   no "maybe later", no invitation to rephrase and retry. The reason travels
   through us, never with a name attached. */
DB.declineReasons = {
  timing:   "Not the right time for me",
  conflict: "Too close to a live matter",
  fit:      "Not something I can genuinely help with",
  capacity: "Fully committed at the moment"
};

/* The four grounds, worded as the member would say them rather than as the
   terms say them. Each maps to an obligation in section 4 that section 8 can
   act on, so a report is never an opinion about someone being unpleasant. */
DB.reportReasons = {
  selling:    "Sold to me, or pitched the room",
  pressure:   "Kept pushing after I said no",
  identity:   "Not who they said they were",
  confidence: "Repeated something from here outside"
};

/* ------------------------------------------------------- introductions --- */

DB.intros = [
  { id: "i1", with: "ph", direction: "requested", state: "released",
    when: "28 July", note: "Both sides accepted. Contact details exchanged. We are out of the way from here." },
  { id: "i2", with: "tm", direction: "offered", state: "checking",
    when: "1 Aug", note: "She has not seen your name. We are asking whether she is open to it." },
  { id: "i3", with: "sk", direction: "incoming", state: "awaiting",
    when: "2 Aug", note: "Wants an introduction to a chair for a €400m industrial platform." },
  { id: "i4", with: "lv", direction: "requested", state: "declined",
    when: "18 July", note: "Neither side was told anything further, and no reason is given either way." }
];

/* Threads are between the member and US, about a specific introduction.
   There is no member-to-member messaging in Blackbook: once an introduction is
   released the conversation moves to the members' own channels. A banker
   discussing a live deal in an unapproved app creates an off-channel
   communications problem for their employer, and their compliance team would
   block us for it. */
DB.threads = [
  { about: "ph", subject: "Introduction to Peter Halloran", state: "released",
    when: "28 July", unread: false,
    messages: [
      { from: "us",  text: "Peter has accepted. His details are below, and he has yours. We are out of the way from here." },
      { from: "me",  text: "Thank you. I will call him this week." },
      { from: "us",  text: "Good luck. We will check in once, in a fortnight, and not before." }
    ] },
  { about: "ao", subject: "Introduction to Adaeze Okonkwo", state: "checking",
    when: "30 July", unread: true,
    messages: [
      { from: "us",  text: "We have put your request to her without your name. She has asked what the LPA question is specifically. Can you give us a line we can pass on?" }
    ] },
  { about: "tm", subject: "Introduction to Theodora Mbeki", state: "declined",
    when: "26 July", unread: false,
    messages: [
      { from: "me", text: "Two names worth her time. Both raising, neither on the consultant lists." },
      { from: "us", text: "This one did not proceed. Nothing further was shared, and no reason is given either way." }
    ] }
];

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
   channel — it survives colour blindness, greyscale and a screenshot. */
DB.ramp = { 7: "#0A0A0A", 6: "#333333", 5: "#555555", 4: "#777777",
            3: "#999999", 2: "#B5B5B5", 1: "#CFCFCF" };
DB.rampDark = { 7: "#FFFFFF", 6: "#D6D6D6", 5: "#AFAFAF", 4: "#8A8A8A",
                3: "#6A6A6A", 2: "#4E4E4E", 1: "#3A3A3A" };

/* ------------------------------------------------------------------ API --- */
/* Mirrors the shape a real endpoint would return. Swap the bodies for fetch()
   and nothing above this line changes. */

const API = {
  me:        () => DB.members.find(m => m.id === DB.me),
  member:    id => DB.members.find(m => m.id === id),
  members:   () => DB.members.filter(m => m.id !== DB.me),
  ties:      () => DB.ties.map(t => ({ ...t, member: API.member(t.id) })),
  intros:    () => DB.intros.map(i => ({ ...i, member: API.member(i.with) })),
  threads:   () => DB.threads.map(t => ({ ...t, member: API.member(t.about) })),

  /* Asks from other members, with whether the viewer can actually give it. */
  asks() {
    const mine = API.me();
    const myGiveTypes = new Set(mine.gives.map(g => g.type));
    return API.members()
      .filter(m => m.ask && m.askOpen !== false)
      .map(m => ({ member: m, canHelp: myGiveTypes.has(m.askType) }))
      .sort((a, b) => (b.canHelp - a.canHelp) || (a.member.askAge - b.member.askAge));
  },

  /* Two different questions, and conflating them is how the counts went wrong:
       askersFor  — how many members are ASKING for this type (what a give is worth)
       giversOf   — how many members can GIVE this type (what an ask can expect)
     Both exclude the viewer: your own record is not a match for itself. */
  askersFor(type) {
    return DB.members.filter(m =>
      m.id !== DB.me && m.ask && m.askOpen !== false && m.askType === type).length;
  },
  giversOf(type) {
    return DB.members.filter(m => m.id !== DB.me && m.gives.some(g => g.type === type)).length;
  },

  /* The four numbers on Home, derived rather than written down.

     They used to be hardcoded: 19 intros made, 6 received, 3.2x ratio. That was
     fine while the record belonged to an invented person. It is not fine now,
     and it was actively wrong on day one, where a member who had just joined
     was shown nineteen introductions they had never made, sitting next to a
     truthful zero connections. */
  standing() {
    const made = DB.intros.filter(i => i.direction === "offered" && i.state === "released").length;
    const received = DB.intros.filter(i => i.direction !== "offered" && i.state === "released").length;
    const gives = API.me().gives.length;
    const asks = API.me().ask && API.me().askOpen !== false ? 1 : 0;
    return {
      connections: DB.ties.length,
      made, received, gives, asks,
      /* No ask yet means no ratio, not a division by zero dressed as a number. */
      ratio: asks ? (gives / asks).toFixed(1) + "×" : "—"
    };
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

  setAsk(text, type) {
    const me = API.me();
    me.ask = text.trim();
    me.askType = type || me.askType;
    me.askAge = 0;
    me.askOpen = !!me.ask;
    return me;
  },

  addGive(text, type) {
    const me = API.me();
    me.gives.push({ text: text.trim(), type, confidence: 5 });
    return me.gives[me.gives.length - 1];
  },
  editGive(i, text) {
    const me = API.me();
    if (me.gives[i]) me.gives[i].text = text.trim();
  },
  removeGive(i) {
    const me = API.me();
    return me.gives.splice(i, 1)[0];
  },

  /* Passing an ask sends it one hop into your own network. They see the ask,
     never who asked, so all that is recorded here is that it happened. */
  passOn(id) {
    DB.passed[id] = (DB.passed[id] || 0) + 1;
    return DB.passed[id];
  },
  hasPassed: id => !!DB.passed[id],

  acceptIntro(id) {
    const i = DB.intros.find(x => x.id === id);
    if (!i || i.state !== "awaiting") return null;
    i.state = "released";
    i.note = "Both sides accepted. Contact details exchanged. We are out of the way from here.";
    return i;
  },

  /* Declining. reason and note are both optional, and their absence IS the
     default: a silent decline stores nothing and says nothing.

     When a reason is given, it is relayed by us, unattributed. The free-text
     note is capped short and framed as passed on in our voice, because a
     paragraph in the decliner's own words is a fingerprint, and the promise
     that a decline carries no signal includes not signalling who wrote it. */
  declineIntro(id, reason, note) {
    const i = DB.intros.find(x => x.id === id);
    if (!i || i.state !== "awaiting") return null;
    i.state = "declined";
    if (reason && DB.declineReasons[reason]) i.declineReason = reason;
    if (note && note.trim()) i.declineNote = note.trim().slice(0, 200);
    i.note = (i.declineReason || i.declineNote)
      ? "You declined. The reason below was passed on by us, without your name."
      : "Neither side was told anything further, and no reason is given either way.";
    return i;
  },

  withdrawIntro(id) {
    const i = DB.intros.find(x => x.id === id);
    if (!i) return null;
    i.state = "declined";
    i.note = "You withdrew this before it reached them. They were never told it existed.";
    return i;
  },

  reply(about, text) {
    const t = DB.threads.find(x => x.about === about);
    if (!t || !text.trim()) return null;
    t.messages.push({ from: "me", text: text.trim() });
    t.unread = false;
    return t;
  },
  markRead(about) {
    const t = DB.threads.find(x => x.about === about);
    if (t) t.unread = false;
  },

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

  /* Met in person. The request only says "we have met"; the tie forms when
     the other side agrees that is true. Strength starts at the floor because
     a vouch is earned, not granted by a handshake, and each side sets their
     own privately afterwards. */
  isTied: id => DB.ties.some(t => t.id === id),
  connectRequests: () => DB.connectRequests.map(r => ({ ...r, member: API.member(r.from) })),
  hasRequestedConnect: id => DB.connectOut.includes(id),
  requestConnect(id) {
    if (!API.member(id) || API.isTied(id) || API.hasRequestedConnect(id)) return false;
    DB.connectOut.push(id);
    return true;
  },
  acceptConnect(id) {
    const i = DB.connectRequests.findIndex(r => r.from === id);
    if (i < 0 || API.isTied(id)) return false;
    DB.connectRequests.splice(i, 1);
    DB.ties.push({ id, strength: 1, since: "2026" });
    return true;
  },
  declineConnect(id) {
    const i = DB.connectRequests.findIndex(r => r.from === id);
    if (i > -1) DB.connectRequests.splice(i, 1);
  },

  /* The close circle. Mutual by construction: nothing is shared until both
     have said yes, and a decline is silent, so the inviter simply never
     learns. The decline leaves no record at all, which is the same promise
     an introduction makes. */
  inCircle: id => DB.circle.includes(id),
  circleInvites: () => DB.circleInvites.map(i => ({ ...i, member: API.member(i.from) })),
  hasInvited: id => DB.circleOut.includes(id),
  inviteCircle(id) {
    if (!API.member(id) || API.inCircle(id) || API.hasInvited(id)) return false;
    DB.circleOut.push(id);
    return true;
  },
  acceptCircleInvite(id) {
    const i = DB.circleInvites.findIndex(x => x.from === id);
    if (i < 0) return false;
    DB.circleInvites.splice(i, 1);
    if (!DB.circle.includes(id)) DB.circle.push(id);
    return true;
  },
  declineCircleInvite(id) {
    const i = DB.circleInvites.findIndex(x => x.from === id);
    if (i > -1) DB.circleInvites.splice(i, 1);
  },

  /* Reporting conduct.

     Silent, like a decline and like a block. If reporting were visible nobody
     senior would ever use it: the cost of being seen to complain, in this
     industry, is higher than the cost of being sold to.

     Note what is deliberately NOT returned: how many other people have
     reported the same person. That is the founders' view, not a member's.
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

  /* Everything held about the member, which is what "Show me everything" has
     to be able to produce on demand under UK GDPR Article 15. */
  exportMe() {
    const me = API.me();
    return {
      exported: new Date().toISOString(),
      you: { name: `${me.first} ${me.last}`, role: me.role, firm: me.firm,
             city: me.city, sector: me.sector, subSector: me.sub,
             verified: me.verified, referredBy: me.referredBy,
             invitations: `${me.invitesLeft} of ${me.invitesTotal} unspent` },
      whatYouCanOpen: me.gives.map(g => ({ text: g.text, type: DB.types[g.type] })),
      whatYouAskedFor: me.ask ? { text: me.ask, type: DB.types[me.askType] } : null,
      achievements: me.achievements,
      shownOnlyToCloseConnections: me.closed || [],
      peopleYouNamed: DB.ties.map(t => ({
        name: `${API.member(t.id).first} ${API.member(t.id).last}`,
        howFarYouSaidYouWouldGo: t.strength,
        note: "Your vouch, 1 to 7. Never shown to them." })),
      closeCircle: DB.circle.map(id =>
        `${API.member(id).first} ${API.member(id).last}`),
      firmsYouBlocked: DB.blocks,
      /* Your own reports come back to you because you wrote them. Reports made
         about you by other people do not appear here and never will: releasing
         them would identify the person who filed one, which is the whole reason
         anybody files one. */
      conductYouReported: DB.reports.map(r => ({
        about: `${API.member(r.about).first} ${API.member(r.about).last}`,
        reason: DB.reportReasons[r.reason],
        detail: r.detail || null,
        when: r.when,
        note: "They were not told. Kept for 24 months, then deleted."
      })),
      introductions: DB.intros.map(i => ({
        with: `${API.member(i.with).first} ${API.member(i.with).last}`,
        direction: i.direction, state: i.state, when: i.when,
        note: "Deleted 30 days after the introduction closes." })),
      messagesWithUs: DB.threads.map(t => ({
        subject: t.subject, when: t.when, messages: t.messages.length })),
      notHeld: [
        "No browsing history.",
        "No record of who searched for you.",
        "No conversation between you and another member. We never see those.",
        "Nothing at all about people you know who are not members. Not a name, not a firm, not a note."
      ]
    };
  },

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
