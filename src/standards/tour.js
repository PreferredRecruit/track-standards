// @ts-nocheck
/* Help button + guided tour (Ryan 2026-11-02: "design a 'Help' button or an onboarding tutorial tour that triggers when a user first
   logs in ... ensure no one is confused about how to use the platform"). The Help button sits in the header (a floating bubble until 2026-11-04, when it was covering table rows on phones): quick
   answers in plain words plus "Take the tour". The tour spotlights the home controls one at a time, starts by itself the first time a
   signed-in member reaches the home page (once per browser and account), and can be replayed from Help. It sets html.onbon while open,
   which already keeps the evaluation pop-ups and nudges away. */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEY = "prTour1";
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
let O = { DEF: {}, log: () => { }, signedIn: () => false, userId: () => "" }, STEP = -1, STEPS = [];

const steps = () => [
  { sel: [".switch", ".prh .prnav"], t: "Four sections", b: "Standards finds colleges for your time. Results shows the best college marks this season. Rankings shows the top college teams. Recruiting AI answers your questions." },
  { sel: "#mf", t: "Find colleges for your time", b: "Pick boys or girls and the event, then type a best time or mark from a meet (like 11.2 or 20-6). Pick the grade and press Search colleges." },
  { sel: "#q", t: "Look up one school", b: "Type any college name to see the marks that school's team looks for, event by event." },
  { sel: ['.switch [data-tab="ask"]', '.prnav [data-tab="ask"]'], t: "Ask in plain words", b: "Not sure where to look? Ask the Recruiting AI, for example: \"Which colleges fit a 5:10 mile?\"" },
  { sel: "#acchd", t: O.signedIn() ? "Your account" : "Save your times", b: O.signedIn() ? "Your profile lives here: your athlete's events, times and grade, so the site can show the colleges that fit." : "Sign in to save your athlete's events and times so the site remembers them." },
  { sel: "#prhelp", t: "Help is always here", b: "Tap Help any time for quick answers or to watch this tour again." },
];

/* a step may list selectors; use the first one on screen (desktop hides the hero pill bar, the header holds the same links) */
const target = sel => { for (const q of [].concat(sel)) { const e = document.querySelector(q); if (e && e.getClientRects().length) return e; } return null; };

function layer() {
  let el = document.getElementById("prtour");
  if (!el) { el = document.createElement("div"); el.id = "prtour"; el.innerHTML = `<div class="trhole"></div><div class="trcard" role="dialog" aria-modal="true" aria-labelledby="trt"></div>`; document.body.appendChild(el); }
  return el;
}
function place() {
  const el = document.getElementById("prtour"); if (!el || STEP < 0) return;
  const s = STEPS[STEP], tg = target(s.sel), hole = el.querySelector(".trhole"), card = el.querySelector(".trcard");
  if (!tg) { hole.style.cssText = "opacity:0"; card.style.cssText = ""; card.classList.add("mid"); return; }
  card.classList.remove("mid");
  const r = tg.getBoundingClientRect(), p = 8;
  hole.style.cssText = `top:${r.top - p}px;left:${r.left - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px`;
  if (innerWidth < 640) { card.style.cssText = ""; card.classList.add("dock"); card.classList.toggle("top", r.top > innerHeight * 0.55); return; }
  card.classList.remove("dock", "top");
  const W = Math.min(360, innerWidth - 32), below = r.bottom + 16 + 220 < innerHeight;
  card.style.cssText = `width:${W}px;left:${Math.max(16, Math.min(r.left, innerWidth - W - 16))}px;${below ? `top:${r.bottom + 16}px` : `top:${Math.max(16, r.top - 16 - card.offsetHeight)}px`}`;
}
function show(i) {
  STEP = i; const el = layer(), s = STEPS[i], tg = target(s.sel);
  document.documentElement.classList.add("onbon", "tron"); el.hidden = false;
  el.querySelector(".trcard").innerHTML = `<p class="trn">${i + 1} of ${STEPS.length}</p><h3 id="trt">${esc(s.t)}</h3><p>${esc(s.b)}</p>
    <div class="trbtns"><button type="button" class="trskip" data-tr="end">${i === STEPS.length - 1 ? "Close" : "Skip tour"}</button><span>${i ? `<button type="button" class="trback" data-tr="back">Back</button>` : ""}<button type="button" class="trnext" data-tr="next">${i === STEPS.length - 1 ? "Got it" : "Next"}</button></span></div>`;
  if (tg) tg.scrollIntoView({ block: "center", behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  requestAnimationFrame(() => { place(); el.querySelector(".trnext").focus(); });
}
export function start(how = "help") {
  if (!document.getElementById("mf")) { location.href = "/?tour=1"; return; }   /* the tour walks the home page */
  closeHelp(); STEPS = steps().filter(s => s.sel === "#prhelp" || target(s.sel)); O.log("tour", { detail: "start", how }); show(0);
}
function end(done) {
  const el = document.getElementById("prtour"); if (el) el.hidden = true;
  document.documentElement.classList.remove("onbon", "tron");
  store.set(KEY + ":" + (O.userId() || "anon"), "1"); O.log("tour", { detail: done ? "done" : "skip", step: STEP + 1 }); STEP = -1;
}

/* Help panel: quick answers in plain words, the tour, and the Recruiting AI for anything else */
const HELP = () => [
  ["How do I find colleges for my time?", "On Standards, pick boys or girls and the event, type a best time or mark from a meet, pick the grade and press Search colleges. You'll see every college that fits, sorted by how good a fit it is."],
  ["What do Target, Recruit and Walk-On mean?", `Target: ${O.DEF.T || ""} Recruit: ${O.DEF.R || ""} Walk-On: ${O.DEF.W || ""}`],
  ["How do I type a time or a mark?", "Type it the way it reads on the results sheet: 11.2 or 11.24 for a sprint, 4:35 or 4:35.2 for a mile, 20-6 or 20' 6\" for a jump or throw."],
  ["What are Results and Rankings?", "Results lists the best college marks this season, event by event, from TFRRS. Rankings rates the college teams themselves, so you can see who's strongest in each division."],
  ["How do I see one school?", "Type the school's name in \"Search for one school\" on the Standards page. Its page shows the marks its team looks for in every event, men and women."],
];
function helpPanel() {
  let p = document.getElementById("prhelpp");
  if (!p) { p = document.createElement("div"); p.id = "prhelpp"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Help"); p.hidden = true; document.body.appendChild(p); }
  p.innerHTML = `<div class="hph"><b>Need a hand?</b><button type="button" class="hpx" data-hp="close" aria-label="Close help">×</button></div>
    <button type="button" class="hptour" data-hp="tour"><span>▶</span>Take the 1-minute tour</button>
    ${HELP().map(([q, a]) => `<details class="hpq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    <button type="button" class="hpai" data-hp="ai">Still stuck? Ask the Recruiting AI ›</button>`;
  return p;
}
function openHelp() { const p = helpPanel(); p.hidden = false; document.getElementById("prhelp").setAttribute("aria-expanded", "true"); p.querySelector(".hptour").focus(); O.log("help", { detail: "open" }); }
function closeHelp() { const p = document.getElementById("prhelpp"); if (p) p.hidden = true; const b = document.getElementById("prhelp"); if (b) b.setAttribute("aria-expanded", "false"); }

export function init(opts) {
  O = { ...O, ...opts };
  if (!document.getElementById("prhelp")) {
    const b = document.createElement("button"); b.id = "prhelp"; b.type = "button"; b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "prhelpp");
    b.setAttribute("aria-label", "Help"); b.innerHTML = `<span aria-hidden="true">?</span>Help`; (document.querySelector(".prh #acchd")?.parentElement || document.body).insertBefore(b, document.querySelector(".prh #acchd"));
  }
  document.addEventListener("click", ev => {
    if (ev.target.closest("#prhelp")) { const p = document.getElementById("prhelpp"); return p && !p.hidden ? closeHelp() : openHelp(); }
    const h = ev.target.closest("[data-hp]");
    if (h) { const a = h.dataset.hp; if (a === "close") closeHelp(); if (a === "tour") start("help"); if (a === "ai") { closeHelp(); if (O.ask) O.ask(); } return; }
    const q = ev.target.closest(".hpq summary"); if (q) O.log("help", { detail: "q", q: q.textContent.slice(0, 60) });
    const t = ev.target.closest("[data-tr]");
    if (t) { const a = t.dataset.tr; if (a === "next") STEP + 1 < STEPS.length ? show(STEP + 1) : end(true); else if (a === "back") show(Math.max(0, STEP - 1)); else end(false); return; }
    const p = document.getElementById("prhelpp"); if (p && !p.hidden && !ev.target.closest("#prhelpp")) closeHelp();
  });
  document.addEventListener("keydown", ev => {
    if (ev.key !== "Escape") { if (STEP >= 0 && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) show(ev.key === "ArrowRight" ? Math.min(STEPS.length - 1, STEP + 1) : Math.max(0, STEP - 1)); return; }
    if (STEP >= 0) end(false); else closeHelp();
  });
  addEventListener("resize", place); addEventListener("scroll", place, { passive: true });
}
/* called after each home render: ?tour=1 (from Help on another page) or a signed-in member's first visit */
export function maybe() {
  if (STEP >= 0 || !document.getElementById("mf") || document.documentElement.classList.contains("onbon")) return;
  if (/[?&]tour=1\b/.test(location.search)) { history.replaceState({}, "", location.pathname + location.search.replace(/[?&]tour=1\b/, "").replace(/^&/, "?")); return setTimeout(() => start("link"), 400); }
  if (O.signedIn() && O.member && O.member() && !store.get(KEY + ":" + (O.userId() || "anon"))) setTimeout(() => { if (STEP < 0 && !document.documentElement.classList.contains("onbon")) start("first-login"); }, 900);
}
