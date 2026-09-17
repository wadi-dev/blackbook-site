/* Deployment configuration. Loaded before every other script on a page that
   talks to the API or to Clerk.

   Every value here is public by design. The API base is the address the
   browser fetches anyway, and Clerk's publishable key and Frontend API host
   are built to be shipped in page source: the publishable key can start a
   sign-in but cannot read or change anything, and the secret key that can
   never leaves the backend. Nothing in this file is a credential. */

window.BB_CONFIG = Object.freeze({

  /* Base URL of the FastAPI service, scheme and host, no trailing slash.
     Not known until the service is deployed. The .example domain is reserved,
     so nothing is ever sent anywhere while this placeholder stands; BB.api()
     also refuses a base containing REPLACE. The pages' CSP names
     https://blackbook-london-api.fly.dev in connect-src as the working
     assumption. It was blackbook-api.fly.dev until 12 September 2026, when
     that hostname turned out to be serving a third party's API already (its
     preflight named another site as the allowed origin); Fly app names are
     global. When the real origin is confirmed by the deploy, set it here and
     in the Content-Security-Policy meta on every page (a meta tag cannot read
     this file): the two change together.
     BB.api() resolves every path against this and refuses anything that
     resolves elsewhere. */
  API_BASE: "https://blackbook-london-api.fly.dev",

  /* Clerk Dashboard > Configure > API keys > Publishable key.
     Production keys start pk_live_, development keys pk_test_. The key
     encodes the Frontend API host, so the two values below must come from the
     same instance. */
  CLERK_PUBLISHABLE_KEY: "pk_test_bGFyZ2UtbGFkeWJ1Zy00MTExLmNsZXJrLmFjY291bnRzLmRldiQ",

  /* Clerk Dashboard > Configure > API keys > Frontend API URL, host only, no
     scheme. Production serves it from a CNAME on our own domain,
     clerk.blackbook.london (see docs/clerk.md). A development instance uses
     <slug>.clerk.accounts.dev. ClerkJS itself is loaded from this host, so it
     must also appear in the page's script-src and connect-src. */
  CLERK_FRONTEND_API: "large-ladybug-4111.clerk.accounts.dev"

  /* DEV_BEARER, optional, and deliberately not present here.

     A non-empty string makes auth.js skip Clerk altogether: ready() resolves
     at once, token() hands this string to every request, signedIn() is true,
     user() is {demo: true} and signOut() goes to index.html. It exists for
     the demo and is written into the demo's copy of this file by the demo's
     site builder, never by hand and never into production. It is safe there
     and nowhere else: the demo API accepts unsigned tokens and reaches only
     the throwaway database, so the string opens nothing real, and a
     production config that carried it would still be talking to an API that
     refuses it. See docs/admin.md. */
});
