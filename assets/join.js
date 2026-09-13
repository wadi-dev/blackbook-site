/* The invitation form, wired to POST /api/join.

   This door is public. The person using it is not a member yet, so there is
   no token, nothing is read back from the answer beyond its status, and
   nothing the server says is kept anywhere. A 201 means the application is
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
  const fields = {
    code:       document.getElementById("code"),
    first_name: document.getElementById("first_name"),
    last_name:  document.getElementById("last_name"),
    email:      document.getElementById("email"),
    role_title: document.getElementById("role_title"),
    firm:       document.getElementById("firm")
  };

  // The backend's 422 names fields by their JSON key. These are the words the
  // member sees instead, so the validation payload (which carries what they
  // typed) never reaches the page.
  const LABELS = {
    code: "invitation code", first_name: "first name", last_name: "last name",
    email: "email address", role_title: "role", firm: "firm"
  };

  const UNREACHABLE = "The door could not be reached. Please try again in a moment.";
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
     so a person without a code is never asked who they are. Step two sends the
     full application to /api/join. If the code has died between the two (spent
     by somebody else, or expired), the door refuses and the page returns to
     step one with the same sentence. */
  let unlocked = false;

  const showStepOne = () => {
    unlocked = false;
    stepTwo.hidden = true;
    change.hidden = true;
    fields.code.readOnly = false;
    button.textContent = "Continue";
  };

  const showStepTwo = () => {
    unlocked = true;
    stepTwo.hidden = false;
    change.hidden = false;
    fields.code.readOnly = true;
    button.textContent = "Send";
    fields.first_name.focus();
  };

  change.addEventListener("click", () => {
    clearMarks();
    showStepOne();
    // A different code means a different code: the field is emptied, not
    // merely unlocked, so the person is not left editing the old one.
    fields.code.value = "";
    fields.code.focus();
  });

  const validate = () => {
    const missing = (unlocked ? ["code", "first_name", "last_name", "email"] : ["code"])
      .filter(name => !fields[name].value.trim());
    if (missing.length) {
      fail(`Please fill in your ${list(missing)}.`, missing);
      return false;
    }
    if (unlocked && !fields.email.validity.valid) {
      fail("Please check your email address.", ["email"]);
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
      const name = loc[0] === "body" ? loc[1] : loc[0];
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

  const send = async (path, body) => {
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
    if (res.ok) return { kind: "ok" };
    if (res.status === 400) return { kind: "refused", text: sentence(await readJson(res), REFUSED) };
    if (res.status === 429) return { kind: "too_many", text: sentence(await readJson(res), TOO_MANY) };
    if (res.status === 422) return { kind: "invalid", names: invalidFields(await readJson(res)) };
    return { kind: "unreachable" };
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (busy || countdown) return;
    clearMarks();
    if (!validate()) return;

    busy = true;
    button.disabled = true;
    const wasUnlocked = unlocked;
    button.textContent = wasUnlocked ? "Sending" : "Checking";

    let result;
    if (!wasUnlocked) {
      result = await send("/api/join/check", { code: fields.code.value.trim() });
    } else {
      const body = {
        code: fields.code.value.trim(),
        email: fields.email.value.trim(),
        first_name: fields.first_name.value.trim(),
        last_name: fields.last_name.value.trim()
      };
      const role = fields.role_title.value.trim();
      const firm = fields.firm.value.trim();
      if (role) body.role_title = role;
      if (firm) body.firm = firm;
      result = await send("/api/join", body);
    }

    busy = false;
    button.disabled = false;
    button.textContent = wasUnlocked ? "Send" : "Continue";

    switch (result.kind) {
      case "ok":
        if (wasUnlocked) succeed(); else showStepTwo();
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
      default:
        fail(UNREACHABLE);
    }
  });

  fields.code.focus();
})();
