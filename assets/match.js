/* ==========================================================================
   BLACKBOOK: the match engine

   Blackbook is not software that connects people. It is two people connecting
   others by hand, with software keeping the record. That makes operator time
   the only thing standing between 10 members and 300, and matching is where
   most of that time goes: reading every ask, holding every give in your head,
   and noticing the overlap.

   This does the noticing. It never sends anything and never decides anything.
   It produces a ranked, explained shortlist, and a human throws most of it
   away. That division is deliberate: the judgement is the product.

   Scoring is transparent on purpose. A broker who cannot see why two people
   were paired will not trust the pairing, and an opaque score in a business
   built on discretion is a liability rather than a feature.
   ========================================================================== */

const MATCH = (() => {

  /* Words too common in this industry to carry signal. "Capital" appears in a
     third of firm names in London; matching on it is noise wearing a suit. */
  const STOP = new Set(`a an and are as at be been but by for from has have in
    into is it its of on or that the to was were will with who whom whose i you
    we they them their our your me my need needs want wants looking look someone
    something anyone able can could would should about across after before
    around capital partner partners group holdings limited ltd llp plc company
    firm business market markets

    introduction introductions intro relationship relationships meeting meetings
    access conversation conversations view views perspective perspectives
    contact contacts network networks people person senior level side coverage
    experience how what when where why which get got give given take taken make
    made this these those there here more most very much many both either`.split(/\s+/));

  /* Numbers and money are excluded outright. Two records mentioning "120m" have
     told you nothing, and a coincidental figure scoring as evidence is exactly
     the kind of confident nonsense this file exists to avoid. */
  const isFigure = w => /^[0-9]/.test(w) || /^[0-9.,]+[mkbn]?$/.test(w);

  const words = s => String(s || "").toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w) && !isFigure(w));

  /* Crude stemming, deliberately. "introductions" and "introduction" must meet;
     a real stemmer is not worth the dependency at this size. */
  const stem = w => w.replace(/(ing|ed|es|s)$/, "");
  const bag = s => new Set(words(s).map(stem));

  const shared = (a, b) => [...a].filter(x => b.has(x));

  /* ---------------------------------------------------------------- score --
     Type is a gate, not a weight. A give of Capital cannot satisfy an ask for
     Talent no matter how similar the wording, and letting a high text score
     override that produces confident nonsense, which is worse than silence. */

  const WEIGHTS = { text: 46, sector: 14, confidence: 20, waiting: 20 };

  function score(give, giver, ask, asker) {
    if (give.type !== ask.type) return null;
    if (giver.id === asker.id) return null;

    const gWords = bag(give.text);
    /* The ask only. Folding in the asker's own sector matched a give about bank
       directors to a banker who wanted a chemicals family: right industry,
       wrong need. Sector proximity is scored separately below, where it belongs
       and where it cannot masquerade as textual evidence. */
    const aWords = bag(ask.text);
    const overlap = shared(gWords, aWords);

    /* Normalised against the shorter bag, so a long ask cannot dilute a give
       that answers it precisely. */
    const denom = Math.max(1, Math.min(gWords.size, aWords.size));
    const textScore = Math.min(1, overlap.length / denom);

    /* Same sector is weak evidence, not strong. The whole premise is that the
       useful introduction usually crosses a boundary. */
    const sectorScore = giver.sector === asker.sector ? 0.5
      : giver.sector === asker.sub || giver.sub === asker.sector ? 1 : 0;

    /* An honest 4 that gets made beats a 7 that never does. Confidence is the
       giver's own estimate of whether they would actually pick up the phone. */
    const confScore = (give.confidence || 4) / 7;

    /* Age is a tiebreak, not a driver. It stops the same easy matches surfacing
       every week while a hard ask sits for a month. */
    const waitScore = Math.min(1, (asker.askAge || 0) / 30);

    const total =
      textScore * WEIGHTS.text +
      sectorScore * WEIGHTS.sector +
      confScore * WEIGHTS.confidence +
      waitScore * WEIGHTS.waiting;

    return {
      giver, asker, give, ask,
      score: Math.round(total),
      terms: overlap,
      /* Evidence, or the lack of it, kept separate from the score.

         A pair with a shared term has a reason. A pair with nothing but a
         matching type is a guess: it says only "this person can open doors and
         that person wants a door opened", which is true of most of the network.
         Ranking those in one list makes a guess scoring 34 sit two rows below a
         real match scoring 46, and a broker working top-down would waste the
         evening on the wrong ones. They are two different lists. */
      evidenced: overlap.length > 0 || sectorScore === 1,
      why: [
        `type ${DB.types[give.type]}`,
        overlap.length ? `shared: ${overlap.slice(0, 4).join(", ")}` : null,
        sectorScore === 1 ? "sector adjacency" : null,
        give.confidence >= 6 ? `confidence ${give.confidence}/7` : null,
        (asker.askAge || 0) > 14 ? `waiting ${asker.askAge} days` : null
      ].filter(Boolean)
    };
  }

  /* ------------------------------------------------------------ the board --
     Every open ask against every give, ranked. Small networks make this cheap:
     300 members with 4 gives each is 1200 gives against 300 asks, which is
     360,000 comparisons and still well under a frame. If it ever stops being
     cheap, the fix is to index by type first, not to make the score cleverer. */

  function board(opts = {}) {
    const min = opts.min ?? 25;
    const rows = [];
    const members = DB.members;

    members.forEach(asker => {
      if (!asker.ask || asker.askOpen === false) return;
      members.forEach(giver => {
        giver.gives.forEach(give => {
          const m = score(give, giver, { text: asker.ask, type: asker.askType }, asker);
          if (m && m.score >= min) rows.push(m);
        });
      });
    });

    /* Evidenced first, then score, then the longest waiting, so a stale ask is
       never buried under a fresh one of equal quality. */
    return rows.sort((a, b) =>
      (b.evidenced - a.evidenced) ||
      b.score - a.score ||
      (b.asker.askAge || 0) - (a.asker.askAge || 0));
  }

  /* The two lists, kept apart. `worth` is what a broker works through tonight;
     `speculative` is what they look at when that runs out. */
  const split = (opts) => {
    const all = board(opts);
    return { worth: all.filter(m => m.evidenced),
             speculative: all.filter(m => !m.evidenced) };
  };

  /* Asks nobody can currently satisfy. This is the more useful half of the
     board and the one an operator would otherwise never see: it says what the
     network is missing, which is who to recruit next. */
  function gaps() {
    const covered = new Set(board({ min: 20 }).map(m => m.asker.id));
    return DB.members
      .filter(m => m.ask && m.askOpen !== false && !covered.has(m.id))
      .map(m => ({ member: m, type: m.askType, age: m.askAge || 0 }))
      .sort((a, b) => b.age - a.age);
  }

  /* What the network cannot do at all, by type. Recruitment brief, in one line
     per row: two people are asking for Talent and nobody can give it. */
  function coverage() {
    return Object.keys(DB.types).map(t => ({
      type: t,
      label: DB.types[t],
      asking: DB.members.filter(m => m.ask && m.askOpen !== false && m.askType === t).length,
      giving: DB.members.filter(m => m.gives.some(g => g.type === t)).length
    }));
  }

  return { board, split, gaps, coverage, score, bag, words };
})();
