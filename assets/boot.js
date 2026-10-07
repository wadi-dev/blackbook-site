/* Boot. Loaded last, once every screen has registered itself on BB.screens.

   Also holds the handful of listeners that need to survive a re-render but
   cannot live in core.js because they depend on screens existing. */

(function boot() {
  let theme = "auto", density = "comfortable";
  try {
    theme = localStorage.getItem("bb-theme") || "auto";
    density = localStorage.getItem("bb-density") || "comfortable";
  } catch (e) { /* private browsing, defaults are fine */ }

  setTheme(theme);
  setDensity(density);

  /* auth.js redirects a signed-out visitor. Rendering first would paint the
     mock screens for a moment on their way out. If ready() rejects, auth.js
     has already covered the page with its notice, so nothing is drawn behind
     it. Without auth.js (a page that never loaded it) the shell renders at
     once, as before. */
  /* A link can name a screen: the home-screen shortcut opens
     app.html#invite. Only these names are honoured.

     Followed twice over. On load, before the first paint, so the page opens
     where the link points rather than flashing Home first. And while the page
     is open, because a shortcut used while the app is already running only
     changes the part after the #, which reloads nothing. The hash is cleared
     once followed, so a reload does not land there again. */
  const LINKED = { invite: "network", network: "network",
                   asks: "asks", gives: "gives", members: "members",
                   introductions: "introductions" };
  const target = () => LINKED[(location.hash || "").slice(1)];
  const settle = name => {
    if (name === "invite" || location.hash === "#invite") {
      const card = document.getElementById("invite");
      if (card) card.scrollIntoView({ block: "start" });
    }
    if (history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  };
  const first = target();
  if (first) BB.state.screen = first;
  const landed = () => { if (first) settle(); };
  window.addEventListener("hashchange", () => {
    const name = target();
    if (!name) return;
    const wasInvite = location.hash === "#invite";
    go(name);
    settle(wasInvite ? "invite" : null);
  });

  /* The Intros badge reads what the store holds and never waits for it, so
     me and introductions are asked for here, behind the first render. When
     they land the chrome is drawn again, and its top bar wired as wire()
     wires it. Not while the More sheet is open: a redraw would take the
     focus out of its list, and the next render draws the badge anyway. */
  const background = () => BB.store.need(["me", "introductions"]).then(() => {
    if (BB.sheetOpen) return;
    renderChrome();
    document.querySelectorAll(".topbar [data-go]").forEach(b =>
      b.addEventListener("click", () => go(b.dataset.go)));
  }, () => {});

  if (BB.auth) BB.auth.ready().then(() => { render(); landed(); background(); }, () => {});
  else { render(); landed(); background(); }

  /* The server's sentence for a refused write. A 422 arrives as a list of
     field errors, kept on serverDetail (api.js), and the first one's message
     is the sentence. A 404 shows the caller's own sentence instead, because
     404 bodies differ by route. */
  const said = (err, missing) => {
    if (err && err.status === 404) return missing;
    const first = err && Array.isArray(err.serverDetail) && err.serverDetail[0];
    return (first && first.msg) || (err && err.detail) || "Something went wrong.";
  };

  /* A list the server has just changed one row of: the row replaces the one
     with its id, or goes on the end, where the API lists the newest. */
  const putRow = (list, row) => list.some(x => x.id === row.id)
    ? list.map(x => x.id === row.id ? row : x) : [...list, row];

  /* Your ask: one open ask. Saving is a PATCH when one is open and a POST
     when none is; closing is a PATCH to archived. Urgency is never sent. One
     write at a time, so a double tap is one request, and the toast waits for
     the server. The answer goes straight into the store's list, so the next
     Save knows the ask is open even before the list is fetched again. On a
     refusal the editor stays as it was, text and all. */
  function sendAsk(what) {
    const open = API.ask();
    let body;
    if (what === "close") {
      if (!open) return;
      body = { state: "archived" };
    } else {
      const title = document.getElementById("ask-text").value;
      const category = document.getElementById("ask-type").value;
      if (!title.trim()) { toast("An ask cannot be empty."); return; }
      if (!category) { toast("Choose which type it is."); return; }
      body = { title, category };
    }
    const sent = BB.store.write("ask", () => open
      ? BB.api("/api/asks/" + encodeURIComponent(open.id), { method: "PATCH", body })
      : BB.api("/api/asks", { method: "POST", body }),
      { update: { asks: putRow }, invalidate: ["asks"] });
    if (!sent) return;
    sent.then(() => {
      BB.state.editAsk = false;
      toast(what === "close" ? "Ask closed. Nobody is notified." : "Ask saved. Nobody is notified.");
      if (BB.state.screen === "home") render();
    }, err => toast(said(err, "That ask could not be found. Reload and try again.")));
  }

  /* A give's type is not asked for. Judgement and operating experience are
     their own kind, and every other category is a door. */
  const giveType = category =>
    ({ judgement: "judgment", operating_experience: "operator" })[category] || "door";

  /* Gives, addressed by id: "new-give" for the one being added. Adding is a
     POST, editing a PATCH of every field on the form, removing a DELETE. One
     write per give at a time, the toast waits for the server, and the answer
     goes straight into the store's list, as the ask's does. On a refusal the
     form stays as it was, text and all. */
  function sendGive(what, id) {
    let send;
    if (what === "remove") {
      send = () => BB.api("/api/gives/" + encodeURIComponent(id), { method: "DELETE" });
    } else {
      const description = document.getElementById("give-text").value;
      const category = document.getElementById("give-type").value;
      const confidence = Number(document.getElementById("give-confidence").value);
      if (!description.trim()) { toast("A give needs to say what you can open."); return; }
      if (!category) { toast("Choose which type it is."); return; }
      const body = { category, description, give_type: giveType(category), confidence };
      send = id === "new-give"
        ? () => BB.api("/api/gives", { method: "POST", body })
        : () => BB.api("/api/gives/" + encodeURIComponent(id), { method: "PATCH", body });
    }
    const gone = what === "remove" && (BB.store.peek("gives") || []).find(g => g.id === id);
    const kept = what === "remove" ? list => list.filter(g => g.id !== id) : putRow;
    const sent = BB.store.write(id, send, { update: { gives: kept }, invalidate: ["gives"] });
    if (!sent) return;
    sent.then(() => {
      /* Closes the form that was saved, and only that one. */
      if (BB.state.editGive === (id === "new-give" ? "new" : id)) BB.state.editGive = null;
      if (what !== "remove") toast(id === "new-give" ? "Added." : "Updated.");
      else if (!gone) toast("Removed.");
      else {
        const t = gone.description;
        toast(`Removed "${t.slice(0, 32)}${t.length > 32 ? "…" : ""}".`);
      }
      if (BB.state.screen === "gives") render();
    }, err => toast(said(err, "That give could not be found. Reload and try again.")));
  }

  /* Your data, fetched each time it is asked for and kept in the screen's
     state rather than the store: an export is a record of one moment.
     BB.store.write is used for its guard, one request per button at a time,
     and invalidates nothing. Show asks for the export and the audit trail
     together; Hide forgets both. */
  function showData() {
    if (BB.state.myData) { BB.state.myData = null; render(); return; }
    const sent = BB.store.write("my-data", () =>
      Promise.all([BB.api("/api/me/export"), BB.api("/api/me/audit")]));
    if (!sent) return;
    sent.then(([exported, audit]) => {
      BB.state.myData = { exported, audit };
      if (BB.state.screen === "settings") render();
    }, err => toast(said(err, "Your data could not be found. Reload and try again.")));
  }

  /* The file is the export exactly as the API answered it, built here. */
  function downloadData() {
    const sent = BB.store.write("my-data-download", () => BB.api("/api/me/export"));
    if (!sent) return;
    sent.then(exported => {
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
      const a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = "blackbook-my-data.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("Downloaded.");
    }, err => toast(said(err, "Your data could not be found. Reload and try again.")));
  }

  /* Leaving is erasure. The session ends only once the server has erased
     the record; on a refusal the member stays where they were. */
  function eraseMe() {
    const sent = BB.store.write("leave", () => BB.api("/api/me/erase", { method: "POST" }));
    if (!sent) return;
    sent.then(() => {
      BB.store.clear();
      BB.auth.signOut();
    }, err => toast(said(err, "Your membership could not be found. Reload and try again.")));
  }

  /* An introduction, addressed by its id: accept, decline or withdraw, each a
     POST with no body. Accept and withdraw answer the row as it now stands,
     which goes straight into the store's list. Decline answers nothing, and
     the row is marked did_not_proceed, which is what the server now says to
     the decliner too. One write per introduction at a time, the toast waits
     for the server, and the list is read again whatever it answered. A 404
     is every refusal the API makes here, so each move has its own sentence
     for it and the body is never shown. */
  const INTRO_SAID = {
    accept: ["Accepted. It is with us now, and nothing is released until we approve it.",
             "That request is no longer open."],
    decline: ["Declined, silently. They are told only that it did not proceed.",
              "That request is no longer open."],
    withdraw: ["Withdrawn. They see only that it did not proceed.",
               "It can no longer be withdrawn here. Tell us and it will not proceed."]
  };
  function sendIntro(what, id) {
    if (!INTRO_SAID[what]) return;
    const [done, gone] = INTRO_SAID[what];
    const ended = list => list.map(i => i.id === id ? { ...i, state: "did_not_proceed" } : i);
    const sent = BB.store.write(id, () => BB.api("/api/introductions/"
      + encodeURIComponent(id) + "/" + what, { method: "POST" }),
      { update: { introductions: what === "decline" ? ended : putRow },
        invalidate: ["introductions"] });
    if (!sent) return;
    const redraw = () => { if (BB.state.screen === "introductions") render(); };
    sent.then(() => { toast(done); redraw(); }, err => { toast(said(err, gone)); redraw(); });
  }

  /* Met in person, addressed by the asker's id: confirm or decline, each a
     POST with no body. Either way the request leaves the list as soon as the
     server agrees. A confirmation makes a connection, so the connections are
     read again too. */
  function sendMet(what, id) {
    if (what !== "confirm" && what !== "decline") return;
    const sent = BB.store.write(id, () => BB.api("/api/ties/requests/"
      + encodeURIComponent(id) + "/" + what, { method: "POST" }),
      { update: { tieRequests: list => list.filter(r => r.id !== id) },
        invalidate: what === "confirm" ? ["tieRequests", "ties"] : ["tieRequests"] });
    if (!sent) return;
    const redraw = () => { if (BB.state.screen === "introductions") render(); };
    sent.then(() => {
      toast(what === "confirm"
        ? "Connected. You each now see the other's name, role and firm."
        : "Declined, silently. They are not told.");
      redraw();
    }, err => { toast(said(err, "That request is no longer open.")); redraw(); });
  }

  /* Delegated once, at the document level, so it survives every re-render. */
  document.addEventListener("click", e => {
    /* An open menu closes on any click that lands outside it. The click is
       spent on the closing: whatever else it was aimed at waits for the next
       one, which is how every menu the member already knows behaves. */
    if (BB.state.sectorMenu && !e.target.closest("[data-sector-menu], .menu")) {
      BB.state.sectorMenu = false; BB.state.menuPane = null;
      BB.state.menuAnim = null; render(); return;
    }

    const smenu = e.target.closest("[data-sector-menu]");
    if (smenu) {
      BB.state.sectorMenu = !BB.state.sectorMenu;
      /* Reopen where the member already is: inside a sector if one is chosen,
         with the back row right there for changing worlds. */
      BB.state.menuPane = BB.state.sectorMenu && BB.state.sectorFilter ? "subs" : null;
      BB.state.menuAnim = null;
      render(); return;
    }
    const spick = e.target.closest("[data-sector-pick]");
    if (spick) {
      const s = spick.dataset.sectorPick;
      BB.state.subFilter = "";
      BB.state.sectorFilter = s;
      if (s) {
        /* The list behind updates now, and the same menu slides into the
           sector's depths. Depth is a continuation of the press, never a
           second task. */
        BB.state.menuPane = "subs";
        BB.state.menuAnim = "fwd";
      } else {
        BB.state.sectorMenu = false;
        BB.state.menuPane = null; BB.state.menuAnim = null;
      }
      render(); return;
    }
    const mback = e.target.closest("[data-menu-back]");
    if (mback) {
      BB.state.menuPane = null;
      BB.state.menuAnim = "back";
      render(); return;
    }
    const subpick = e.target.closest("[data-sub-pick]");
    if (subpick) {
      BB.state.subFilter = subpick.dataset.subPick;
      BB.state.sectorMenu = false;
      BB.state.menuPane = null; BB.state.menuAnim = null;
      render(); return;
    }

    /* Try again on the render gate's error box (core.js). A render asks the
       store again for whatever the screen still lacks. */
    if (e.target.closest("[data-store-retry]")) { render(); return; }

    /* ---- Introductions: accept, decline and withdraw ---------------------- */
    const intro = e.target.closest("[data-intro]");
    if (intro) { sendIntro(intro.dataset.intro, intro.dataset.id); return; }

    /* The tab bar and the More sheet live outside #screen, so wire() never
       reaches them. They are handled here, before anything else, because the
       sheet's items also carry data-go. */
    const sheetBtn = e.target.closest("[data-sheet]");
    if (sheetBtn) { setSheet(sheetBtn.dataset.sheet === "open" && !BB.sheetOpen); return; }

    const tab = e.target.closest(".tabbar [data-go], #sheet [data-go]");
    if (tab) { go(tab.dataset.go); return; }

    /* In-content navigation, e.g. "Find them in Members" on the network
       screen. Separate from the tab selector above so a screen button cannot
       accidentally match the bar's aria state handling. */
    const jump = e.target.closest("#screen [data-go-screen]");
    if (jump) { go(jump.dataset.goScreen); return; }

    const seg = e.target.closest("#set-theme button, #set-density button");
    if (seg) {
      const group = seg.closest(".segmented");
      group.querySelectorAll("button").forEach(b =>
        b.setAttribute("aria-pressed", b === seg));
      if (group.id === "set-theme") setTheme(seg.dataset.v);
      else setDensity(seg.dataset.v);
      return;
    }

    /* ---- Your ask -------------------------------------------------------- */
    const ask = e.target.closest("[data-ask]");
    if (ask) {
      const what = ask.dataset.ask;
      if (what === "save" || what === "close") { sendAsk(what); return; }
      if (what === "edit") BB.state.editAsk = true;
      if (what === "cancel") BB.state.editAsk = false;
      render(); return;
    }

    /* ---- Gives ----------------------------------------------------------- */
    const give = e.target.closest("[data-give]");
    if (give) {
      const what = give.dataset.give;
      if (what === "save" || what === "remove") { sendGive(what, give.dataset.id); return; }
      if (what === "new") BB.state.editGive = "new";
      if (what === "edit") BB.state.editGive = give.dataset.id;
      if (what === "cancel") BB.state.editGive = null;
      render(); return;
    }

    /* ---- Passing an ask one hop ------------------------------------------ */
    const pass = e.target.closest("[data-pass]");
    if (pass) {
      API.passOn(pass.dataset.pass);
      toast("Passed one hop into your network. They see the ask, never who asked.");
      render(); return;
    }

    /* ---- Blocking --------------------------------------------------------- */
    const unblock = e.target.closest("[data-unblock]");
    if (unblock) {
      API.unblock(unblock.dataset.unblock);
      toast(`${unblock.dataset.unblock} can see you again. They are not told either way.`);
      render(); return;
    }
    const block = e.target.closest("[data-block]");
    if (block) {
      const what = block.dataset.block;
      if (what === "new") BB.state.addBlock = true;
      if (what === "cancel") BB.state.addBlock = false;
      if (what === "save") {
        const v = document.getElementById("block-firm").value;
        if (!v.trim()) { toast("Name the firm to block."); return; }
        toast(API.block(v) ? "Blocked. Absolute and silent." : "Already blocked.");
        BB.state.addBlock = false;
      }
      render(); return;
    }

    /* ---- Met in person ----------------------------------------------------- */
    const creq = e.target.closest("[data-connect]");
    if (creq) {
      const who = API.member(creq.dataset.connect);
      if (API.requestConnect(creq.dataset.connect)) {
        toast(`Noted. If ${who.first} agrees you have met, you connect. If not, you are not told.`);
      }
      if (!refreshDetail()) render();
      return;
    }
    const met = e.target.closest("[data-met]");
    if (met) { sendMet(met.dataset.met, met.dataset.id); return; }

    /* ---- The close circle -------------------------------------------------- */
    const cinv = e.target.closest("[data-circle-invite]");
    if (cinv) {
      const who = API.member(cinv.dataset.circleInvite);
      if (API.inviteCircle(cinv.dataset.circleInvite)) {
        toast(`Invited. If ${who.first} accepts, you will each see the other's private profile.`);
      }
      render(); return;
    }

    /* ---- Reporting conduct ------------------------------------------------ */
    const rep = e.target.closest("[data-report]");
    if (rep) {
      const what = rep.dataset.report;
      if (what === "open") { BB.state.reporting = rep.dataset.id; BB.state.reportReason = null; }
      if (what === "cancel") { BB.state.reporting = null; BB.state.reportReason = null; }
      if (what === "reason") {
        /* Tapping the chosen ground again clears it, so a misclick is
           recoverable without cancelling the whole report. */
        BB.state.reportReason = BB.state.reportReason === rep.dataset.v ? null : rep.dataset.v;
      }
      if (what === "send") {
        if (!BB.state.reportReason) { toast("Choose what happened first."); return; }
        const box = document.getElementById("report-detail");
        const who = API.member(rep.dataset.id);
        if (!API.report(rep.dataset.id, BB.state.reportReason, box ? box.value : "")) {
          toast("Already reported."); return;
        }
        BB.state.reporting = null;
        BB.state.reportReason = null;
        toast(`Sent to us. ${who.first} was not told, and never learns it was you.`);
      }
      /* Reporting happens on two surfaces: a profile, which is the FLIP overlay,
         and a released introduction, which is an ordinary screen. render() only
         redraws the screen underneath the overlay, so on a profile it would
         leave the form exactly as it was and look broken. */
      if (!refreshDetail()) render();
      return;
    }

    /* ---- Sharing an invitation --------------------------------------------
       The code is real: POST /api/invitations mints one from the member's own
       allowance and answers it once. It is held in BB.state.invite for the
       length of the page and shown on the card, so the member can copy it or
       hand it to the device's share sheet. Blackbook London composes the one
       sentence; the member picks the recipient in their own messenger, so no
       contact list ever touches us. */
    const DOOR = "https://blackbook.london/enter.html";
    const inviteText = code =>
      "I am inviting you to Blackbook London. Your private access code is: "
      + code + ". Join here: " + DOOR;

    const newInv = e.target.closest("[data-new-invite]");
    if (newInv) {
      /* The click handler is synchronous; the request runs on its own and
         re-renders when it lands. */
      BB.state.inviteBusy = true; BB.state.inviteError = null; render();
      BB.api("/api/invitations", { method: "POST" })
        .then(minted => { BB.state.invite = minted; })
        .catch(err => { BB.state.inviteError = err && err.detail ? err.detail : "Could not create an invitation."; })
        .finally(() => { BB.state.inviteBusy = false; render(); });
      return;
    }

    /* WhatsApp directly, because that is where these invitations will
       actually be sent. wa.me with prefilled text opens the app with the
       message ready and the recipient still chosen by the member in
       WhatsApp itself. Opened synchronously from the click, or the browser
       treats it as a pop-up. */
    const waInv = e.target.closest("[data-invite-wa]");
    if (waInv && BB.state.invite) {
      window.open("https://wa.me/?text=" + encodeURIComponent(inviteText(BB.state.invite.code)),
        "_blank", "noopener");
      return;
    }

    /* LinkedIn has no intent that carries message text: its share endpoint
       takes a URL alone and turns it into a public post, and a private code
       is not for a post. So the message is put on the clipboard and
       LinkedIn's messaging is opened, where one paste sends it. The tab is
       opened synchronously from the tap, like WhatsApp. */
    const liInv = e.target.closest("[data-invite-linkedin]");
    if (liInv && BB.state.invite) {
      const text = inviteText(BB.state.invite.code);
      const tab = window.open("https://www.linkedin.com/messaging/", "_blank", "noopener");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => toast("Message copied. Paste it into a LinkedIn message."))
          .catch(() => toast("Copy the message from the card and paste it into a LinkedIn message."));
      } else {
        toast("Copy the message from the card and paste it into a LinkedIn message.");
      }
      if (!tab) toast("LinkedIn did not open. Allow pop-ups for this site, or open LinkedIn yourself.");
      return;
    }

    const shareInv = e.target.closest("[data-share-invite]");
    if (shareInv && BB.state.invite) {
      const text = inviteText(BB.state.invite.code);
      if (navigator.share) {
        navigator.share({ text }).catch(() => {});   /* cancelled: nothing happened */
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => toast("Copied."))
          .catch(() => toast("Could not copy. Select the message and copy it by hand."));
      }
      return;
    }

    const qrBtn = e.target.closest("[data-qr]");
    if (qrBtn) { BB.state.showQr = !BB.state.showQr; render(); return; }

    /* ---- Your data -------------------------------------------------------- */
    const data = e.target.closest("[data-data]");
    if (data) {
      if (data.dataset.data === "show") showData();
      else downloadData();
      return;
    }

    /* ---- Signing out and leaving ------------------------------------------ */
    if (e.target.closest("[data-sign-out]")) {
      BB.store.clear();
      BB.auth.signOut();
      return;
    }

    const leave = e.target.closest("[data-leave]");
    if (leave) {
      const what = leave.dataset.leave;
      if (what === "confirm") { eraseMe(); return; }
      if (what === "ask") BB.state.confirmLeave = true;
      if (what === "cancel") BB.state.confirmLeave = false;
      render(); return;
    }

    const gf = e.target.closest("[data-give-filter]");
    if (gf) { BB.state.giveFilter = gf.dataset.giveFilter; render(); return; }

    const cf = e.target.closest("[data-clear-filters]");
    if (cf) {
      BB.state.giveFilter = ""; BB.state.sectorFilter = ""; BB.state.subFilter = "";
      BB.state.menuPane = null; BB.state.menuAnim = null;
      render(); return;
    }

    const reach = e.target.closest('[data-reach="toggle"]');
    if (reach) { BB.state.showReach = !BB.state.showReach; render(); return; }

    /* Strength editing. The network screen is where you realise a 5 is now a 2,
       so the correction has to be possible from there rather than nowhere. */
    const openEdit = e.target.closest("[data-edit-strength]");
    if (openEdit) {
      BB.state.editStrength =
        BB.state.editStrength === openEdit.dataset.editStrength
          ? null : openEdit.dataset.editStrength;
      render(); return;
    }
    const setVal = e.target.closest("[data-set-strength]");
    if (setVal) {
      const tie = DB.ties.find(t => t.id === setVal.dataset.id);
      if (tie) {
        const was = tie.strength;
        tie.strength = Number(setVal.dataset.setStrength);
        toast(was === tie.strength
          ? "Unchanged."
          : `Updated to ${tie.strength}. They are never told.`);
      }
      BB.state.editStrength = null;
      render(); return;
    }

    const view = e.target.closest(".segmented button:not([id] button)");
    if (view && view.closest(".page-head")) {
      view.closest(".segmented").querySelectorAll("button").forEach(b =>
        b.setAttribute("aria-pressed", b === view));
    }
  });

  /* Search types straight into the screen rather than on submit, one field,
     no operators, no button. */
  document.addEventListener("input", e => {
    if (e.target.id === "ask-text") {
      const count = document.getElementById("ask-count");
      if (count) count.textContent = askCount(e.target.value);
    }
    if (e.target.id === "q") {
      BB.state.query = e.target.value;
      const host = document.getElementById("screen");
      host.innerHTML = `<div class="shell">${BB.screens.search()}</div>`;
      wire(host);
      const q = document.getElementById("q");
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && BB.sheetOpen) setSheet(false);
    else if (e.key === "Escape" && BB.state.sectorMenu) {
      BB.state.sectorMenu = false; BB.state.menuPane = null;
      BB.state.menuAnim = null; render();
    }
  });

  /* Auto theme has to repaint the network map, whose line colours are resolved
     in JS rather than CSS. daylight.js announces each flip; everything else
     follows the attribute through the stylesheet on its own. */
  document.addEventListener("bb-theme-applied", () => {
    if (BB.state.screen === "network") render();
  });
})();
