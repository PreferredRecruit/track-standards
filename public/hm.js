/* Microsoft Clarity loader (Ryan 2026-11-05): recordings and heatmaps for the public pages. Loaded by the app and every static page.
   The first-party click and attention map that lived here was never deployed server-side and was removed 2026-11-11; Clarity covers it. */
(function () {
  try { if (window.top !== window || /^\/(admin|embed|coaches|for-coaches)/.test(location.pathname) || /[?&]hm=0/.test(location.search)) return; } catch (e) { return; }
  /* Microsoft Clarity, project z94ulanf8z (Ryan 2026-11-05): recordings and heatmaps. Never on account, sign-up or coach pages, and a visitor's
     Global Privacy Control signal turns it off. Typed fields are masked by Clarity; anything that routes to a private page stops recording. */
  var PRIV = /^\/(account|onboarding|readiness|login|signup|reset)/;
  function isPriv() { return PRIV.test(location.pathname); }
  var CL = false;
  try {
    if (!navigator.globalPrivacyControl && !isPriv()) {
      CL = true;
      (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, "clarity", "script", "z94ulanf8z");
    }
  } catch (e) {}
  function guard() { if (CL && isPriv()) { CL = false; try { document.body.setAttribute("data-clarity-mask", "True"); window.clarity("stop"); } catch (e) {} } }
  setInterval(guard, 500);
})();
