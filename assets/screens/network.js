/* Network: bringing someone new in.

   The graph, the list of connections with how far you would go for each,
   second-degree reach and the close circle all read the mock in data.js
   until M7 connects ties and vouches, so none of them is drawn beside live
   data (D2). Home shows the live connections. The invitation is live:
   boot.js mints it with POST /api/invitations. */

BB.screens.network = function () {
  return `
  <div class="page-head"><div><h1>Network</h1></div></div>

  <div class="cols b">
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
