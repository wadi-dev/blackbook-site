/* The membership inquiry form, wired to POST /api/inquiries.

   This door is public. The person using it is not a member, so there is no
   token, nothing is read back from the answer beyond its status, and nothing
   the server says is kept anywhere. A 204 means the inquiry is on the
   broker's desk; it opens nothing, because an inquiry is not an application
   and promises nothing beyond a manual read.

   The server answers 204 to a repeat from the same address as well, on
   purpose, so the form cannot be used to learn whether an address has asked
   before. This page shows the same received state either way. */
(function () {
  const form   = document.getElementById("inquiry-form");
  const button = document.getElementById("submit");
  const msg    = document.getElementById("inquiry-msg");
  const done   = document.getElementById("received");
  const fields = {
    full_name:    document.getElementById("full_name"),
    email:        document.getElementById("email"),
    firm:         document.getElementById("firm"),
    role_title:   document.getElementById("role_title"),
    sector:       document.getElementById("sector"),
    linkedin_url: document.getElementById("linkedin_url")
  };

  // The backend's 422 names fields by their JSON key. These are the words the
  // person sees instead, so the validation payload (which carries what they
  // typed) never reaches the page.
  const LABELS = {
    full_name: "full name", email: "email address", firm: "firm",
    role_title: "role", sector: "sector", linkedin_url: "LinkedIn profile URL"
  };

  const UNSENT   = "The form could not be sent. Please try again.";
  const TOO_MANY = "Too many requests. Try again shortly.";
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

  /* A LinkedIn profile lives at linkedin.com/in/<handle>, on any subdomain
     (uk.linkedin.com, www.linkedin.com). A missing scheme is the most common
     way a real address arrives, from a copied handle rather than the bar, so
     one is supplied before parsing instead of refusing it. The rule is the
     server's, character for character: one handle of the characters LinkedIn
     issues, two to a hundred of them, an optional trailing slash, nothing
     else. What is sent is the one shape the server stores,
     https://www.linkedin.com/in/<handle>, so the tracking a browser tacks on
     never leaves this page. Anything else is refused here, before the
     network, because the server would only send it back as a 422. */
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
    const missing = Object.keys(fields).filter(name => !fields[name].value.trim());
    if (missing.length) {
      fail(`Please fill in your ${list(missing)}.`, missing);
      return false;
    }
    if (!fields.email.validity.valid) {
      fail("Please check your email address.", ["email"]);
      return false;
    }
    if (!profileUrl(fields.linkedin_url.value)) {
      fail("Please check your LinkedIn profile URL. It should look like linkedin.com/in/your-name.", ["linkedin_url"]);
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
  // the person's input and the validator's wording; neither is shown.
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
        button.textContent = "Send";
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
    done.hidden = false;
    done.focus();
  };

  const send = async body => {
    const url = endpoint("/api/inquiries");
    if (!url) return { kind: "unsent" };
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
      return { kind: "unsent" };
    }
    if (res.ok) return { kind: "ok" };
    if (res.status === 429) return { kind: "too_many", text: sentence(await readJson(res), TOO_MANY) };
    if (res.status === 422) return { kind: "invalid", names: invalidFields(await readJson(res)) };
    return { kind: "unsent" };
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (busy || countdown) return;
    clearMarks();
    if (!validate()) return;

    busy = true;
    button.disabled = true;
    button.textContent = "Sending";

    const result = await send({
      full_name:    fields.full_name.value.trim(),
      email:        fields.email.value.trim(),
      firm:         fields.firm.value.trim(),
      role_title:   fields.role_title.value.trim(),
      sector:       fields.sector.value.trim(),
      linkedin_url: profileUrl(fields.linkedin_url.value)
    });

    busy = false;
    button.disabled = false;
    button.textContent = "Send";

    switch (result.kind) {
      case "ok":
        succeed();
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
        fail(UNSENT);
    }
  });

  fields.full_name.focus();
})();
