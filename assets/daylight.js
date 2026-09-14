/* Auto appearance by local daylight.

   Loaded in the head of every page, before the stylesheets paint, so the
   first frame is already the right theme. When the stored preference is
   "auto" the page goes dark from local sunset to local sunrise, rather than
   following the operating system's own light or dark setting, which on most
   devices is a fixed choice and not a clock.

   Privacy position, in full: nothing new is stored, no permission is asked
   for, and no request leaves the device. The only input beyond the clock is
   the browser's own time zone name (Intl.DateTimeFormat resolvedOptions),
   read into memory and used for one estimate of where the sun is. It is not
   written anywhere. The privacy policy's statement that the appearance and
   density preferences are the only things kept in the browser stays true.

   Why estimate rather than ask: a zone name is a coarse location the browser
   already exposes to every page, so using it costs the member nothing. A
   geolocation prompt on a page whose whole point is discretion would be the
   wrong trade for a theme.

   Method, all local:
   - longitude from the zone's standard offset (the smaller of its January
     and July offsets, in hours, times fifteen degrees), refined by the
     table's longitude where the zone is listed, because a zone's meridian can
     sit a long way from its capital (Reykjavik keeps UTC at 22 degrees west);
   - the daylight saving shift (current offset minus standard) moves solar
     noon to 12 plus that shift on the clock;
   - latitude from the table below, or a regional guess by prefix, because
     no offset can tell north from south;
   - declination 23.44 * sin(360/365 * (dayOfYear - 81)) degrees, and half
     the day in hours is acos(-tan(lat) * tan(decl)) / 15, clamped so a polar
     summer is all light and a polar winter all dark.

   Nothing is rounded; the test is a comparison in minutes. Accuracy is a
   few minutes either side of sunrise and sunset for a listed zone, which is
   the right scale for a theme switch, and well within an hour for a guessed
   one. The equation of time is left out on purpose: it is under 17 minutes
   and the table's longitude error is larger.

   Exposed as window.BBDaylight so core.js can re-apply when the member picks
   Auto, and so the maths can be run in node (docs/daylight.md). */

(function () {
  "use strict";

  /* [latitude, longitude] for the zones most of our members will be in. A
     zone that is not here still works: its latitude is guessed from the
     region prefix and its longitude from the offset. */
  const PLACES = {
    "Europe/London": [51.5, -0.1], "Europe/Paris": [48.9, 2.4],
    "Europe/Berlin": [52.5, 13.4], "Europe/Madrid": [40.4, -3.7],
    "Europe/Rome": [41.9, 12.5], "Europe/Dublin": [53.3, -6.3],
    "Europe/Stockholm": [59.3, 18.1], "Europe/Zurich": [47.4, 8.5],
    "Europe/Amsterdam": [52.4, 4.9], "Europe/Lisbon": [38.7, -9.1],
    "Europe/Moscow": [55.8, 37.6], "Europe/Athens": [38.0, 23.7],
    "Europe/Istanbul": [41.0, 29.0],
    "America/New_York": [40.7, -74.0], "America/Chicago": [41.9, -87.6],
    "America/Denver": [39.7, -105.0], "America/Los_Angeles": [34.1, -118.2],
    "America/Toronto": [43.7, -79.4], "America/Vancouver": [49.3, -123.1],
    "America/Mexico_City": [19.4, -99.1], "America/Sao_Paulo": [-23.5, -46.6],
    "America/Buenos_Aires": [-34.6, -58.4],
    "America/Argentina/Buenos_Aires": [-34.6, -58.4],
    "Asia/Dubai": [25.2, 55.3], "Asia/Riyadh": [24.7, 46.7],
    "Asia/Kolkata": [19.1, 72.9], "Asia/Singapore": [1.4, 103.8],
    "Asia/Hong_Kong": [22.3, 114.2], "Asia/Shanghai": [31.2, 121.5],
    "Asia/Tokyo": [35.7, 139.7], "Asia/Seoul": [37.6, 127.0],
    "Asia/Bangkok": [13.8, 100.5], "Asia/Jakarta": [-6.2, 106.8],
    "Australia/Sydney": [-33.9, 151.2], "Australia/Melbourne": [-37.8, 145.0],
    "Australia/Perth": [-31.9, 115.9], "Pacific/Auckland": [-36.9, 174.8],
    "Africa/Johannesburg": [-26.2, 28.0], "Africa/Lagos": [6.5, 3.4],
    "Africa/Cairo": [30.0, 31.2], "Africa/Nairobi": [-1.3, 36.8],
    "Atlantic/Reykjavik": [64.1, -21.9]
  };
  const REGION_LAT = {
    Europe: 50, America: 40, Asia: 30, Africa: 0, Australia: -30, Pacific: -20
  };

  const rad = (d) => d * Math.PI / 180;
  const deg = (r) => r * 180 / Math.PI;

  /* The wall clock in a zone, as numbers. hourCycle h23 because some engines
     print midnight as 24 under hour12:false; the modulo covers the rest. */
  function clockParts(date, timeZone) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone, hourCycle: "h23", year: "numeric", month: "numeric",
      day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"
    });
    const p = {};
    fmt.formatToParts(date).forEach((x) => {
      if (x.type !== "literal") p[x.type] = Number(x.value);
    });
    p.hour = p.hour % 24;
    return p;
  }

  /* Offset of a zone from UTC in minutes at the given instant, positive east. */
  function offsetMinutes(date, timeZone, parts) {
    const p = parts || clockParts(date, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const whole = Math.floor(date.getTime() / 1000) * 1000;
    return (asUtc - whole) / 60000;
  }

  function placeFor(timeZone) {
    const known = PLACES[timeZone];
    if (known) return { lat: known[0], lng: known[1] };
    const prefix = String(timeZone || "").split("/")[0];
    const lat = prefix in REGION_LAT ? REGION_LAT[prefix] : 40;
    return { lat, lng: null };
  }

  /* Sunrise and sunset for the local calendar day the instant falls on, as
     minutes past local midnight on the zone's clock. `minutes` is the
     instant itself on the same scale, so a caller compares without a second
     trip through Intl. */
  function solarWindow(date, timeZone) {
    const local = clockParts(date, timeZone);
    const offset = offsetMinutes(date, timeZone, local);
    const jan = offsetMinutes(new Date(Date.UTC(local.year, 0, 1, 12)), timeZone);
    const jul = offsetMinutes(new Date(Date.UTC(local.year, 6, 1, 12)), timeZone);
    const standard = Math.min(jan, jul);
    const dstShift = (offset - standard) / 60;
    const meridian = standard / 60 * 15;
    const place = placeFor(timeZone);
    const lng = place.lng === null ? meridian : place.lng;
    const noon = 12 + dstShift + (meridian - lng) / 15;

    const dayOfYear = (Date.UTC(local.year, local.month - 1, local.day)
      - Date.UTC(local.year, 0, 1)) / 86400000 + 1;
    const decl = 23.44 * Math.sin(rad(360 / 365 * (dayOfYear - 81)));
    const x = -Math.tan(rad(place.lat)) * Math.tan(rad(decl));
    const half = x <= -1 ? 12 : x >= 1 ? 0 : deg(Math.acos(x)) / 15;

    return {
      timeZone, lat: place.lat, lng, offset, standard, dstShift, dayOfYear,
      declination: decl,
      noon: noon * 60,
      sunrise: (noon - half) * 60,
      sunset: (noon + half) * 60,
      minutes: local.hour * 60 + local.minute + local.second / 60,
      polar: x <= -1 ? "light" : x >= 1 ? "dark" : null
    };
  }

  function isDark(date, timeZone) {
    const w = solarWindow(date, timeZone);
    return w.minutes < w.sunrise || w.minutes >= w.sunset;
  }

  function preference() {
    try {
      const v = localStorage.getItem("bb-theme");
      return v === "light" || v === "dark" ? v : "auto";
    } catch (e) { return "auto"; }
  }

  function zoneName() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; }
    catch (e) { return null; }
  }

  /* Writes the applied theme to <html data-theme> and the member's choice to
     data-theme-preference, so the settings screen can show Auto as selected
     while the page itself is light or dark. If the zone cannot be read the
     attribute stays "auto" and the stylesheet's media rule takes over, which
     is the pre-existing behaviour. */
  function apply() {
    const root = document.documentElement;
    const pref = preference();
    let applied = pref;
    if (pref === "auto") {
      const tz = zoneName();
      if (tz) applied = isDark(new Date(), tz) ? "dark" : "light";
    }
    const before = root.dataset.theme;
    root.dataset.themePreference = pref;
    root.dataset.theme = applied;
    /* The network map resolves its colours in JS, so it needs to hear when
       the theme flips under it. Only a real change is announced. */
    if (before !== applied && typeof CustomEvent === "function" && document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent("bb-theme-applied",
        { detail: { theme: applied, preference: pref } }));
    }
    return applied;
  }

  window.BBDaylight = { apply, window: solarWindow, isDark };

  if (typeof document !== "undefined" && document.documentElement) {
    apply();
    /* A minute is the resolution of the maths, and the check is cheap.
       visibilitychange covers a tab that slept through sunset. */
    setInterval(apply, 60000);
    if (document.addEventListener) {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) apply();
      });
    }
  }
})();
