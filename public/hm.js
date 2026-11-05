/* First-party click map and attention map (Ryan 2026-11-04: "where users spend the most time and where they attempt to click").
   Loaded by the app and every static page. Sends two kinds of row through the anonymous tracker (window.prLog):
     taps : one row per page view, up to 25 clicks as  zone|element|x|y|flag  (flag o = worked, d = dead click, r = rage click)
     dwell: one row per page view,  zone:seconds,zone:seconds
   Position only. Never page text, typed values, keystrokes, session replay, names or emails. x is pixels from the page centre (scaled to
   a 375 px phone on phones), y is pixels from the top of the page. Time only counts after real input, so crawlers send nothing.
   The admin page reads it back: public/admin.html, section "Clicks and attention". Keep ZONES in step with the markup. */
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
  var ZONES = [["#eval,.eval,#spop", "popup"], ["#evpill", "pill"], ["#prnudge", "nudge"], ["#prhelpp,#prhelp", "help"], ["#prtour", "tour"], ["#acwall,.acwall,.prwall,.wall", "wall"],
    [".prh,header", "header"], ["footer", "footer"], [".switch", "tabs"], [".sctl", "switches"], [".back", "back"], [".sband", "school-banner"], ["#youf,#schk", "check-form"], ["#mf,#q,.panel", "search-form"], [".mbar,.dds", "match-filters"],
    [".dsel,.rctl,.rconf,.evwrap,.rfsum", "filters"], [".rhead", "list-title"], [".stats", "top-marks"], [".grid,.mrow,.gr", "list"], [".simple .scroll,.scroll,.evtbl,table", "table"],
    ["#sfacts,.glance", "school-facts"], ["details", "fold"], [".hero,h1", "hero"], ["main", "page"]];
  var MAXT = 25, taps = [], tapView = "", dwell = {}, last = [], lastIn = 0, muts = 0;
  function zone(el) { try { for (var i = 0; i < ZONES.length; i++) if (el.closest(ZONES[i][0])) return ZONES[i][1]; } catch (e) {} return "page"; }
  function view() {
    var p = location.pathname, q = location.search, m;
    if (/^\/schools\//.test(p)) return "school"; if (/^\/teams\//.test(p)) return "team"; if (/^\/rankings/.test(p)) return "rankings";
    if (/^\/standards\//.test(p)) return "standards"; if (/^\/guides\//.test(p)) return "guide"; if (/^\/(account|onboarding|readiness)/.test(p)) return p.slice(1, 12);
    if (p === "/" || p === "/index.html") { m = document.querySelector('.switch button[aria-selected="true"]'); m = m && m.dataset.tab; if (m && m !== "standards") return m; return /[?&]m=/.test(q) ? "search" : "home"; }
    return "other";
  }
  function name(el) { var c = (typeof el.className === "string" ? el.className : "").trim().split(/\s+/)[0] || ""; return (el.tagName.toLowerCase() + (c ? "." + c : "")).replace(/[^a-z0-9._-]/gi, "").slice(0, 18); }
  function send(k, x) { try { if (window.prLog) window.prLog(k, x); } catch (e) {} }
  function flushTaps() { if (!taps.length) return; var d = taps.map(function (t) { return [t.z, t.e, t.x, t.y, t.f].join("|"); }).join(";"); send("taps", { placement: tapView, detail: d }); taps = []; }
  function flushDwell() { for (var v in dwell) { var o = dwell[v], s = [], n = 0; for (var z in o) { s.push(z + ":" + o[z]); n += o[z]; } if (n >= 2) send("dwell", { placement: v, detail: s.join(","), active_secs: n }); } dwell = {}; }
  function flush() { flushTaps(); flushDwell(); }
  var obs = window.MutationObserver && new MutationObserver(function () { muts++; });
  function wake() { if (obs && document.body) obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "open", "aria-expanded", "aria-selected", "aria-pressed"] }); }
  addEventListener("click", function (ev) {
    if (!ev.isTrusted) return; var el = ev.target; if (!el || !el.closest || el === document.body || el === document.documentElement) return;
    var v = view(); if (v !== tapView) { flushTaps(); tapView = v; }
    var scale = innerWidth < 700 ? 375 / innerWidth : 1, t = { z: zone(el), e: name(el), x: Math.round((ev.clientX - innerWidth / 2) * scale), y: Math.round(ev.pageY), f: "o", at: Date.now() };
    var hot = el.closest("a[href],button,input,select,textarea,label,summary,option,[role=button],[role=tab],[role=option],[role=link],[data-tab],[data-rev]");
    if (!hot) { var sel = ""; try { sel = String(getSelection()); } catch (e) {} if (!sel) { var m0 = muts, u0 = location.href; wake(); setTimeout(function () { if (t.f === "o" && muts === m0 && location.href === u0) t.f = "d"; }, 500); } }
    last.push(t); last = last.filter(function (o) { return t.at - o.at < 800 && Math.abs(o.x - t.x) < 40 && Math.abs(o.y - t.y) < 40; }); if (last.length >= 3) t.f = "r";
    taps.push(t); if (taps.length >= MAXT) flushTaps();
  }, true);
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (k) { addEventListener(k, function () { lastIn = Date.now(); }, { passive: true, capture: true }); });
  setInterval(guard, 500);
  setInterval(function () {
    if (document.visibilityState !== "visible" || Date.now() - lastIn > 30000) return;
    var el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.45); if (!el) return;
    var v = view(), z = zone(el); (dwell[v] = dwell[v] || {})[z] = (dwell[v][z] || 0) + 1;
  }, 1000);
  addEventListener("pagehide", flush); document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
})();
