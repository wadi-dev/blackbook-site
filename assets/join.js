/* The invitation form, wired to POST /api/join.

   This door is public. The person using it is not a member yet, so there is
   no token, nothing is read back from the join's answer beyond its status,
   and nothing the server says is kept anywhere. The check's answer is read
   for one thing, the details a concierge invitation carries, which go into
   the fields and nowhere else. A 201 means the application is
   pending review; it does not open the app, because a pending member has no
   way to sign in until someone approves them.

   The server answers "That invitation is not valid." for every way a code can
   be wrong, and on purpose: unknown, spent, revoked, expired and a referrer
   who has left all read the same, so a probe learns nothing. This page shows
   that sentence and adds nothing, for the same reason. */
(function () {
  const form   = document.getElementById("join-form");
  const button = document.getElementById("submit");
  const msg    = document.getElementById("join-msg");
  const joined = document.getElementById("joined");
  const stepTwo = document.getElementById("step-two");
  const change  = document.getElementById("change-code");
  const note    = document.getElementById("prefill-note");
  const fields = {
    code:       document.getElementById("code"),
    first_name: document.getElementById("first_name"),
    last_name:  document.getElementById("last_name"),
    email:      document.getElementById("email"),
    role_title: document.getElementById("role_title"),
    firm:       document.getElementById("firm"),
    city:       document.getElementById("city"),
    linkedin_url: document.getElementById("linkedin_url"),
    accept:     document.getElementById("accept")
  };

  // Every field step two cannot be sent without, in the order the page shows
  // them. The API requires the five profile fields of every joiner (its
  // app/profile.py), so they are asked for here rather than refused there.
  const REQUIRED = ["first_name", "last_name", "email", "role_title", "firm", "city"];

  // The backend's 422 names fields by their JSON key. These are the words the
  // member sees instead, so the validation payload (which carries what they
  // typed) never reaches the page.
  const LABELS = {
    code: "invitation code", first_name: "first name", last_name: "last name",
    email: "email address", role_title: "role", firm: "firm", city: "city",
    linkedin_url: "LinkedIn profile URL", accept: "acceptance of the terms"
  };

  // The two versions are not fields anybody types. They come off the form,
  // with the box, so a 422 on either is reported against the box.
  const SENT_WITH = { terms_version: "accept", privacy_version: "accept" };

  const UNREACHABLE = "The door could not be reached. Please try again in a moment.";
  // Said when the API answered, but with a fault rather than a refusal.
  const FAULT       = "Something went wrong on our side. Please try again in a moment.";
  const REFUSED     = "That invitation is not valid.";
  const TOO_MANY    = "Too many requests. Try again shortly.";
  const WAIT_SECONDS = 60;

  let busy = false;
  let countdown = null;

  const clearMarks = () => {
    msg.textContent = "";
    for (const f of Object.values(fields)) f.removeAttribute("aria-invalid");
  };

  const fail = (text, names) => {
    msg.textContent = text;
    let first = null;
    for (const name of names || []) {
      const f = fields[name];
      if (!f) continue;
      f.setAttribute("aria-invalid", "true");
      first = first || f;
    }
    if (first) first.focus();
  };

  // Real codes are URL-safe base64 and case sensitive, so the only tidying
  // that cannot damage one is removing whitespace, which a paste from a chat
  // app often carries.
  fields.code.addEventListener("input", () => {
    const tidy = fields.code.value.replace(/\s+/g, "");
    if (tidy !== fields.code.value) {
      const caret = fields.code.selectionStart;
      fields.code.value = tidy;
      fields.code.setSelectionRange(caret, caret);
    }
  });

  for (const f of Object.values(fields)) {
    f.addEventListener("input", () => {
      f.removeAttribute("aria-invalid");
      if (!countdown) msg.textContent = "";
    });
  }

  const list = names => {
    const words = names.map(n => LABELS[n]);
    if (words.length === 1) return words[0];
    return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  };

  /* Two steps behind one button. Step one sends the code alone to
     /api/join/check and shows nothing else until the backend says it is live,
     so a person without a code is never asked who they are. A live code's
     answer carries whatever details it was minted with, which fill step two
     before it is shown. Step two sends the full application to /api/join. If
     the code has died between the two (spent by somebody else, or expired),
     the door refuses and the page returns to step one with the same
     sentence. */
  let unlocked = false;

  const showStepOne = () => {
    unlocked = false;
    stepTwo.hidden = true;
    change.hidden = true;
    fields.code.readOnly = false;
    button.textContent = "Continue";
  };

  // The cursor goes to the first field still empty, which for a concierge
  // invitation is the email address, the one thing it cannot carry.
  const showStepTwo = () => {
    unlocked = true;
    stepTwo.hidden = false;
    change.hidden = false;
    fields.code.readOnly = true;
    button.textContent = "Send";
    (REQUIRED.map(name => fields[name]).find(f => !f.value.trim()) || fields.accept).focus();
  };

  /* A concierge invitation's details, from the check's answer: an empty
     string for each one nobody gave, and all five empty on any other code.
     Each one given replaces what the field holds, because it belongs to the
     code just checked; each one not given leaves the field alone. Every
     field stays editable. */
  const PREFILLED = ["first_name", "last_name", "role_title", "firm", "city"];
  const prefill = body => {
    const given = body && body.prefill && typeof body.prefill === "object" ? body.prefill : {};
    let any = false;
    for (const name of PREFILLED) {
      const value = typeof given[name] === "string" ? given[name].trim() : "";
      if (!value) continue;
      fields[name].value = value;
      any = true;
    }
    note.hidden = !any;
  };

  change.addEventListener("click", () => {
    clearMarks();
    showStepOne();
    // A different code means a different code: the field is emptied, not
    // merely unlocked, so the person is not left editing the old one.
    fields.code.value = "";
    fields.code.focus();
  });

  /* The inquiry page's parser, the same rule as the server's: see
     assets/inquire.js for why each part is there. Optional here, so an empty
     field is fine and anything else must be a profile. */
  const HANDLE = /^\/in\/([A-Za-z0-9][A-Za-z0-9._%-]{1,99})\/?$/;
  const profileUrl = raw => {
    const text = raw.trim();
    if (!text || /\s/.test(text)) return null;
    let url;
    try {
      url = new URL(/^https?:\/\//i.test(text) ? text : "https://" + text);
    } catch (_) {
      return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
    const m = HANDLE.exec(url.pathname);
    if (!m) return null;
    return "https://www.linkedin.com/in/" + m[1];
  };

  const validate = () => {
    const missing = (unlocked ? ["code", ...REQUIRED] : ["code"])
      .filter(name => !fields[name].value.trim());
    if (missing.length) {
      fail(`Please fill in your ${list(missing)}.`, missing);
      return false;
    }
    if (unlocked && !fields.email.validity.valid) {
      fail("Please check your email address.", ["email"]);
      return false;
    }
    if (unlocked && fields.linkedin_url.value.trim() && !profileUrl(fields.linkedin_url.value)) {
      fail("Please check your LinkedIn profile URL. It should look like linkedin.com/in/your-name.", ["linkedin_url"]);
      return false;
    }
    if (unlocked && !fields.accept.checked) {
      fail("Please tick the box to accept the Terms of Membership.", ["accept"]);
      return false;
    }
    return true;
  };

  const endpoint = path => {
    const cfg = window.BB_CONFIG;
    const base = cfg && typeof cfg.API_BASE === "string" ? cfg.API_BASE.trim() : "";
    return base ? base.replace(/\/+$/, "") + path : null;
  };

  const readJson = async res => {
    try { return await res.json(); } catch (_) { return null; }
  };

  // A short string from our own server, shown as text. Anything else falls
  // back to the sentence the server is known to send.
  const sentence = (body, fallback) => {
    const d = body && body.detail;
    return typeof d === "string" && d.length > 0 && d.length <= 200 ? d : fallback;
  };

  // Field names off a 422, and nothing else from it. The payload also carries
  // the member's input and the validator's wording; neither is shown.
  const invalidFields = body => {
    const names = new Set();
    const items = body && Array.isArray(body.detail) ? body.detail : [];
    for (const item of items) {
      const loc = item && Array.isArray(item.loc) ? item.loc : [];
      const sent = loc[0] === "body" ? loc[1] : loc[0];
      const name = SENT_WITH[sent] || sent;
      if (typeof name === "string" && LABELS[name]) names.add(name);
    }
    return [...names];
  };

  const startCountdown = text => {
    let left = WAIT_SECONDS;
    button.disabled = true;
    msg.textContent = text;
    const tick = () => {
      button.textContent = `Try again in ${left}s`;
      if (left <= 0) {
        clearInterval(countdown);
        countdown = null;
        button.textContent = unlocked ? "Send" : "Continue";
        button.disabled = false;
        msg.textContent = "";
      }
      left -= 1;
    };
    tick();
    countdown = setInterval(tick, 1000);
  };

  const succeed = () => {
    form.hidden = true;
    joined.hidden = false;
    joined.focus();
  };

  // `read` asks for the answer's body as well as its status. Only the check
  // asks; the join's answer is the joiner's own record and is not read.
  const send = async (path, body, read) => {
    const url = endpoint(path);
    if (!url) return { kind: "unreachable" };
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        credentials: "omit"
      });
    } catch (_) {
      return { kind: "unreachable" };
    }
    if (res.ok) return { kind: "ok", body: read ? await readJson(res) : null };
    if (res.status === 400) return { kind: "refused", text: sentence(await readJson(res), REFUSED) };
    if (res.status === 429) return { kind: "too_many", text: sentence(await readJson(res), TOO_MANY) };
    if (res.status === 422) return { kind: "invalid", names: invalidFields(await readJson(res)) };
    return { kind: "fault" };
  };

  const submit = async () => {
    if (busy || countdown) return;
    clearMarks();
    if (!validate()) return;

    busy = true;
    button.disabled = true;
    const wasUnlocked = unlocked;
    button.textContent = wasUnlocked ? "Sending" : "Checking";

    let result;
    if (!wasUnlocked) {
      result = await send("/api/join/check", { code: fields.code.value.trim() }, true);
    } else {
      const body = {
        code: fields.code.value.trim(),
        email: fields.email.value.trim(),
        first_name: fields.first_name.value.trim(),
        last_name: fields.last_name.value.trim(),
        role_title: fields.role_title.value.trim(),
        firm: fields.firm.value.trim(),
        city: fields.city.value.trim(),
        // What the page showed beside the box, written into the form by
        // build-legal.py. The API stores the pair with its own clock.
        terms_version: form.dataset.termsVersion,
        privacy_version: form.dataset.privacyVersion
      };
      const linkedin = profileUrl(fields.linkedin_url.value);
      if (linkedin) body.linkedin_url = linkedin;
      result = await send("/api/join", body);
    }

    busy = false;
    button.disabled = false;
    button.textContent = wasUnlocked ? "Send" : "Continue";

    switch (result.kind) {
      case "ok":
        if (wasUnlocked) succeed();
        else { prefill(result.body); showStepTwo(); }
        break;
      case "refused":
        if (wasUnlocked) showStepOne();
        fail(result.text, ["code"]);
        break;
      case "too_many":
        startCountdown(result.text);
        break;
      case "invalid":
        fail(result.names.length
          ? `Please check your ${list(result.names)}.`
          : "Please check the form: one of the fields was not accepted.",
          result.names);
        break;
      case "fault":
        fail(FAULT);
        break;
      default:
        fail(UNREACHABLE);
    }
  };

  form.addEventListener("submit", e => {
    e.preventDefault();
    submit();
  });

  /* A concierge link carries its code in the address, enter.html?code=...,
     so the invitee has nothing to paste. It is read once, put in the field,
     and taken out of the address bar before anything is sent, so it is not
     left in this page's history entry or in a screenshot of it. Then the
     check runs by itself, once per load, as a tap on Continue would: the same
     request, the same meter, and the same one sentence for a code that is not
     live. The code goes nowhere else and is not logged. Trimmed as a paste
     is, and cut to the field's length, so it is what typing it would send. */
  const fromLink = () => {
    let raw = null;
    try { raw = new URLSearchParams(location.search).get("code"); } catch (_) { /* no query */ }
    if (raw === null) return false;
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.hash);
    const code = raw.replace(/\s+/g, "").slice(0, fields.code.maxLength);
    if (!code) return false;
    fields.code.value = code;
    return true;
  };

  if (fromLink()) submit();
  else fields.code.focus();
})();
