/* Boot. Loaded last, once every screen has registered itself on BB.screens.

   Also holds the handful of listeners that need to survive a re-render but
   cannot live in core.js because they depend on screens existing. */

(function boot() {
  let theme = "auto", density = "comfortable";
  try {
    theme = localStorage.getItem("bb-theme") || "auto";
    density = localStorage.getItem("bb-density") || "comfortable";
  } catch (e) { /* private browsing — defaults are fine */ }

  setTheme(theme);
  setDensity(density);
  render();

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

    /* ---- Introductions: accept, and the two kinds of decline -------------- */
    const ia = e.target.closest("[data-intro-accept]");
    if (ia) {
      API.acceptIntro(ia.dataset.introAccept);
      toast("Accepted. Identities released to both sides.");
      render(); return;
    }
    const idec = e.target.closest("[data-intro-decline]");
    if (idec) {
      API.declineIntro(idec.dataset.introDecline);
      toast("Declined, silently. They are told only that it did not proceed.");
      render(); return;
    }
    const ireason = e.target.closest("[data-intro-reason]");
    if (ireason) {
      BB.state.declining = ireason.dataset.introReason;
      BB.state.declineReason = null;
      render(); return;
    }
    const dpick = e.target.closest("[data-decline-pick]");
    if (dpick) {
      /* Preserve anything already typed across the re-render, or choosing a
         line would silently eat the member's own words. */
      const box = document.getElementById("decline-note");
      BB.state.declineNoteDraft = box ? box.value : "";
      BB.state.declineReason =
        BB.state.declineReason === dpick.dataset.declinePick ? null : dpick.dataset.declinePick;
      render();
      const again = document.getElementById("decline-note");
      if (again) again.value = BB.state.declineNoteDraft;
      return;
    }
    const dsend = e.target.closest("[data-decline-send]");
    if (dsend) {
      const box = document.getElementById("decline-note");
      const words = box ? box.value.trim() : "";
      if (!BB.state.declineReason && !words) {
        toast("Pick a line, or write one. A reasoned decline needs a reason.");
        return;
      }
      API.declineIntro(dsend.dataset.declineSend, BB.state.declineReason, words);
      BB.state.declining = null; BB.state.declineReason = null;
      BB.state.declineNoteDraft = "";
      toast("Declined. We pass the reason on without your name.");
      render(); return;
    }
    const dcancel = e.target.closest("[data-decline-cancel]");
    if (dcancel) {
      BB.state.declining = null; BB.state.declineReason = null;
      BB.state.declineNoteDraft = "";
      render(); return;
    }

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

    const thread = e.target.closest("[data-thread]");
    if (thread) {
      BB.state.thread = thread.dataset.thread;
      API.markRead(thread.dataset.thread);
      render(); return;
    }

    /* ---- Your ask -------------------------------------------------------- */
    const ask = e.target.closest("[data-ask]");
    if (ask) {
      const what = ask.dataset.ask;
      if (what === "edit") BB.state.editAsk = true;
      if (what === "cancel") BB.state.editAsk = false;
      if (what === "save") {
        const text = document.getElementById("ask-text").value;
        if (!text.trim()) { toast("An ask cannot be empty."); return; }
        API.setAsk(text, document.getElementById("ask-type").value);
        BB.state.editAsk = false;
        toast("Ask updated. Nobody is notified.");
      }
      render(); return;
    }

    /* ---- Gives ----------------------------------------------------------- */
    const give = e.target.closest("[data-give]");
    if (give) {
      const what = give.dataset.give;
      if (what === "new") BB.state.editGive = "new";
      if (what === "edit") BB.state.editGive = Number(give.dataset.i);
      if (what === "cancel") BB.state.editGive = null;
      if (what === "remove") {
        const gone = API.removeGive(Number(give.dataset.i));
        BB.state.editGive = null;
        toast(`Removed "${gone.text.slice(0, 32)}${gone.text.length > 32 ? "…" : ""}".`);
      }
      if (what === "save") {
        const text = document.getElementById("give-text").value;
        const type = document.getElementById("give-type").value;
        if (!text.trim()) { toast("A give needs to say what you can open."); return; }
        if (give.dataset.i === "new") {
          API.addGive(text, type);
          const n = API.me().gives.length;
          toast(n < 4 ? `Added. You have ${n} of four.` : "Added. You have four.");
        } else {
          const i = Number(give.dataset.i);
          API.editGive(i, text);
          API.me().gives[i].type = type;
          toast("Updated.");
        }
        BB.state.editGive = null;
      }
      render(); return;
    }

    /* ---- Passing an ask one hop ------------------------------------------ */
    const pass = e.target.closest("[data-pass]");
    if (pass) {
      API.passOn(pass.dataset.pass);
      toast("Passed one hop into your network. They see the ask, never who asked.");
      render(); return;
    }

    /* ---- Withdrawing an introduction ------------------------------------- */
    const wd = e.target.closest("[data-withdraw]");
    if (wd) {
      API.withdrawIntro(wd.dataset.withdraw);
      toast("Withdrawn. They were never told it existed.");
      render(); return;
    }

    /* ---- Replying to us --------------------------------------------------- */
    const send = e.target.closest("[data-send]");
    if (send) {
      const box = document.getElementById("reply");
      if (!box.value.trim()) { toast("Nothing to send."); return; }
      API.reply(send.dataset.send, box.value);
      toast("Sent to us. This thread is never visible to another member.");
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
    const cca = e.target.closest("[data-connect-accept]");
    if (cca) {
      const who = API.member(cca.dataset.connectAccept);
      API.acceptConnect(cca.dataset.connectAccept);
      toast(`Connected. Now set, privately, how far you would go for ${who.first}. They are never shown it.`);
      render(); return;
    }
    const ccd = e.target.closest("[data-connect-decline]");
    if (ccd) {
      API.declineConnect(ccd.dataset.connectDecline);
      toast("Declined, silently. They are not told, and nothing is recorded.");
      render(); return;
    }

    /* ---- The close circle -------------------------------------------------- */
    const cinv = e.target.closest("[data-circle-invite]");
    if (cinv) {
      const who = API.member(cinv.dataset.circleInvite);
      if (API.inviteCircle(cinv.dataset.circleInvite)) {
        toast(`Invited. If ${who.first} accepts, you will each see the other's private profile.`);
      }
      render(); return;
    }
    const cacc = e.target.closest("[data-circle-accept]");
    if (cacc) {
      const who = API.member(cacc.dataset.circleAccept);
      API.acceptCircleInvite(cacc.dataset.circleAccept);
      toast(`Done. You and ${who.first} now see each other's private profiles.`);
      render(); return;
    }
    const cdec = e.target.closest("[data-circle-decline]");
    if (cdec) {
      API.declineCircleInvite(cdec.dataset.circleDecline);
      toast("Declined, silently. They are not told, and nothing changes.");
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
       Composes the message and hands it to the device's own share sheet, or
       the clipboard on desktop. The code stays a placeholder on purpose: real
       codes live in the founders' sheet, one per named person, and are never
       stored in this app. Blackbook composes; the member picks the recipient
       in their own messenger, so no contact list ever touches us. */
    const inviteText = () =>
      "I'm building something with a partner: a private network "
      + "for people who can actually do deals. Referral only, no directory, "
      + "no feed. I get five invitations and I'm spending one on you. Your "
      + "code is XXXX-XXXX, at https://blackbook.london. It's free while "
      + "we're in the founding intake, and the one thing we ask for is your "
      + "honest feedback.";
    const inviteRemind = "Now swap XXXX-XXXX for a code from your sheet, and write their name against it.";

    /* WhatsApp directly, because that is where these invitations will
       actually be sent. wa.me with prefilled text opens the app with the
       message ready and the recipient still chosen by the member in
       WhatsApp itself, so no contact list ever touches us. */
    const waInv = e.target.closest("[data-invite-wa]");
    if (waInv) {
      window.open("https://wa.me/?text=" + encodeURIComponent(inviteText()),
        "_blank", "noopener");
      toast("WhatsApp is opening. " + inviteRemind);
      return;
    }

    const shareInv = e.target.closest("[data-share-invite]");
    if (shareInv) {
      const text = inviteText();
      const remind = inviteRemind;
      if (navigator.share) {
        navigator.share({ text })
          .then(() => toast("Shared. " + remind))
          .catch(() => {});   /* cancelled: no toast, nothing happened */
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
          .then(() => toast("Copied. " + remind))
          .catch(() => toast("Could not copy. The message is in invite-codes.md."));
      } else {
        toast("The message template is in invite-codes.md.");
      }
      return;
    }

    const qrBtn = e.target.closest("[data-qr]");
    if (qrBtn) { BB.state.showQr = !BB.state.showQr; render(); return; }

    /* ---- Your data -------------------------------------------------------- */
    const data = e.target.closest("[data-data]");
    if (data) {
      if (data.dataset.data === "show") { BB.state.showData = !BB.state.showData; render(); return; }
      /* A real Article 15 export, produced client-side so nothing leaves. */
      const blob = new Blob([JSON.stringify(API.exportMe(), null, 2)],
        { type: "application/json" });
      const a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = "blackbook-my-data.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("Downloaded everything we hold about you.");
      return;
    }

    /* ---- Leaving ---------------------------------------------------------- */
    const leave = e.target.closest("[data-leave]");
    if (leave) {
      const what = leave.dataset.leave;
      if (what === "ask") BB.state.confirmLeave = true;
      if (what === "cancel") BB.state.confirmLeave = false;
      if (what === "confirm") {
        BB.state.confirmLeave = false;
        toast("In the real build this deletes your account. Nothing was deleted here.");
      }
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

  /* Search types straight into the screen rather than on submit — one field,
     no operators, no button. */
  document.addEventListener("input", e => {
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
     in JS rather than CSS. Everything else follows the media query on its own. */
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((document.documentElement.dataset.theme || "auto") === "auto"
        && BB.state.screen === "network") render();
  });
})();
