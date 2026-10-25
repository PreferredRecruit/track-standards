// @ts-nocheck
/* Recruitment Readiness check, /readiness (Ryan 2026-10-25: "Interactive Data Collection: a 'Recruitment Readiness' quiz ...
   immediate value to the athlete while giving us rich, structured data on their needs and academic/athletic standing").
   Ten one-tap questions (about two minutes) → a 0-100 readiness score in four parts, the programs their mark fits by level, and
   the three next steps that would move the score most. Free, no sign-up.
   Data: every answer is categorical (no names, no contact details). Logged anonymously as site events; a signed-in account also
   saves it on its profile (readiness, readiness_score, target_divisions, recruiting_stage, parent_involvement), which feeds the
   lead score. Nothing is pushed to Close: qualified results point to the evaluation form, and filling it in is the intent signal.
   Same look as onboarding (classes .onb*), its own layer #rdy. */
import { core } from "./account.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DIVL = { D1: "NCAA D1", D2: "NCAA D2", D3: "NCAA D3", NAIA: "NAIA", JUCO: "Junior college", not_sure: "Not sure yet" };
let Q = null, STEP = 0, MSG = "", RES = null;

const STEPS = [
  { k: "who", t: "Who's taking the check?", sub: "It takes about two minutes. No sign-up.", opts: [["athlete", "I'm the athlete"], ["parent", "I'm a parent"]] },
  { k: "grade", t: () => Q.who === "parent" ? "What grade is your athlete in?" : "What grade are you in?", opts: [["9", "Freshman"], ["10", "Sophomore"], ["11", "Junior"], ["12", "Senior"]] },
  { k: "g", t: "Which team?", opts: [["m", "Men's track"], ["w", "Women's track"]] },
  { k: "mark", t: () => Q.who === "parent" ? "Their best event and mark" : "Your best event and mark", sub: "High school marks are fine. The 1600m, 3200m and 300m hurdles are converted automatically.", custom: true },
  { k: "gpa", t: "Cumulative GPA", sub: "All of high school, on your school's scale.", opts: [["3_5_plus", "3.5 or higher"], ["3_0_to_3_49", "3.0 to 3.49"], ["2_3_to_2_99", "2.3 to 2.99"], ["under_2_3", "Under 2.3"]] },
  { k: "divs", t: "Which levels are you aiming for?", sub: "Pick every level you'd be happy at.", multi: [["D1", "NCAA D1"], ["D2", "NCAA D2"], ["D3", "NCAA D3"], ["NAIA", "NAIA"], ["JUCO", "Junior college"], ["not_sure", "Not sure yet"]] },
  { k: "stage", t: "Have college coaches contacted you yet?", opts: [["none", "Not yet"], ["some", "A few have"], ["offers", "I have offers"]] },
  { k: "emailed", t: "Have you emailed college coaches yourself?", opts: [["no", "Not yet"], ["few", "A few"], ["many", "Ten or more"]] },
  { k: "video", t: "Do you have a recruiting video or an online profile?", sub: "A profile means TFRRS, MileSplit, athletic.net or a recruiting page coaches can see.", opts: [["none", "Neither yet"], ["one", "One of them"], ["both", "Both"]] },
  { k: "quest", t: "Have you filled out any college recruiting questionnaires?", opts: [["no", "Not yet"], ["some", "Yes, a few"]] },
  { k: "parent", t: "How involved is a parent in recruiting?", opts: [["both", "Both parents"], ["one", "One parent"], ["none_yet", "Not yet"]], skip: () => Q.who === "parent" },
];
const steps = () => STEPS.filter(s => !(s.skip && s.skip()));

function layer() {
  let el = document.getElementById("rdy");
  if (!el) { document.body.insertAdjacentHTML("beforeend", `<div class="onb" id="rdy" role="main"></div>`); el = document.getElementById("rdy"); }
  return el;
}
const top = () => `<header class="onbtop"><button type="button" class="onblogo" data-rq="exit" aria-label="Back to Track Standards"><span class="onbtile">PR</span><span><b>Preferred Recruit</b><small>Track Standards</small></span></button></header>`;
const title = s => typeof s.t === "function" ? s.t() : s.t;

function stepView() {
  const S = steps(), s = S[STEP], C = core.cfg(), pct = Math.round(STEP / S.length * 100);
  let body = "";
  if (s.opts) body = `<div class="onbopt ${s.opts.length > 3 ? "c2" : "c1"}" role="radiogroup">${s.opts.map(([v, l]) => `<button type="button" role="radio" data-rq="pick" data-v="${v}" aria-checked="${Q[s.k] === v}"><b>${esc(l)}</b></button>`).join("")}</div>`;
  if (s.multi) body = `<div class="onbopt c3 multi" role="group">${s.multi.map(([v, l]) => `<button type="button" role="checkbox" data-rq="tog" data-v="${v}" aria-checked="${Q.divs.includes(v)}"><b>${esc(l)}</b></button>`).join("")}</div>`;
  if (s.custom) { const evs = Q.g && C.events ? C.events(Q.g) : [];
    body = `<div class="onbg2"><label class="onbf"><span>Event</span><select class="in" id="rq-e"><option value="">Choose an event</option>${evs.map(e => `<option value="${esc(e)}" ${e === Q.e ? "selected" : ""}>${esc(C.evName ? C.evName(e, Q.g) : e)}</option>`).join("")}</select></label>
      <label class="onbf"><span>Best mark</span><input class="in" id="rq-m" value="${esc(Q.m)}" placeholder="${esc(Q.e && C.ph ? C.ph(Q.e) : "e.g. 4:35")}" inputmode="decimal" autocomplete="off"></label></div>`; }
  const next = s.multi || s.custom;
  return top() + `<div class="onbwrap"><section class="onbmain"><div class="rqbar" aria-hidden="true"><i style="width:${pct}%"></i></div><p class="rqn">Question ${STEP + 1} of ${S.length}</p>
    <form class="onbform" id="rqf" novalidate><h1>${esc(title(s))}</h1>${s.sub ? `<p class="onbsub">${esc(s.sub)}</p>` : ""}${body}${MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : ""}
    <div class="onbnav">${STEP ? `<button type="button" class="onbback" data-rq="back">Back</button>` : "<span></span>"}${next ? `<button class="acbtn onbgo" data-rq="next">${STEP === S.length - 1 ? "See my results" : "Continue"}</button>` : ""}</div></form></section></div>`;
}

/* score: athletic 35 · academic 20 · outreach 25 · exposure 10 · family 10 */
function score() {
  const C = core.cfg(), v = Q.e && Q.m ? C.parse(Q.m, Q.e) : null, fit = v != null && C.divfit ? C.divfit(Q.e, Q.g, v) : null;
  const want = Q.divs.filter(d => d !== "not_sure" && d !== "JUCO").map(d => DIVL[d]), pool = want.length ? want : ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
  const sum = (ks, lv) => ks.reduce((n, d) => n + ((fit && fit[d] && fit[d][lv]) || 0), 0);
  const T = sum(pool, "T"), R = sum(pool, "R"), W = sum(pool, "W"), any = fit ? Object.values(fit).reduce((n, x) => n + x.T + x.R + x.W, 0) : 0;
  const ath = T ? 35 : R ? 28 : W ? 20 : any ? 12 : v != null ? 5 : 0;
  const aca = { "3_5_plus": 20, "3_0_to_3_49": 16, "2_3_to_2_99": 9, under_2_3: 3 }[Q.gpa] || 0;
  const out = ({ many: 12, few: 7, no: 0 }[Q.emailed] || 0) + ({ some: 5, no: 0 }[Q.quest] || 0) + ({ both: 8, one: 4, none: 0 }[Q.video] || 0);
  const exp = { offers: 10, some: 7, none: 2 }[Q.stage] || 0;
  const fam = Q.who === "parent" ? 10 : ({ both: 10, one: 7, none_yet: 2 }[Q.parent] || 0);
  const parts = { athletic: ath, academic: aca, outreach: out, exposure: exp, family: fam };
  /* next steps: the three biggest gaps, in plain words */
  const S = [], par = Q.who === "parent", they = par ? "they" : "you", their = par ? "their" : "your";
  if (out < 12) S.push([25 - out, Q.emailed === "no" ? `Email the coaches at the programs ${their} mark fits. Coaches recruit the athletes they know about.` : par ? "Keep emailing coaches, and follow up after every new PR." : "Keep emailing coaches, and follow up after every PR."]);
  if (Q.video !== "both") S.push([8 - ({ both: 8, one: 4, none: 0 }[Q.video] || 0) + 2, `Put ${their} marks where coaches look: an up-to-date online profile and a short race or field video.`]);
  if (Q.quest !== "some") S.push([5, `Fill out the recruiting questionnaire on each target school's site. It puts ${par ? "your athlete" : "you"} on the coach's list.`]);
  if (ath < 28) S.push([35 - ath, v == null ? `Add a mark to see which programs ${they} already fit.` : W ? `Look at the programs where ${par ? "they're" : "you're"} at Walk-On level now. A small PR could move ${par ? "them" : "you"} to Recruit.` : any ? `${par ? "Their" : "Your"} mark already fits programs at other levels. Add them to the list: the standards search shows every one.` : `Pick one event to build around. The standards search shows the mark each program wants.`]);
  if (aca < 16) S.push([20 - aca, `Grades open doors. A 3.0 or higher widens the list of programs that can take ${par ? "them" : "you"}.`]);
  if (Q.who !== "parent" && fam < 7) S.push([10 - fam, "Bring a parent in. Most families make this decision together, and coaches talk to parents too."]);
  const steps3 = S.sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => x[1]);
  const total = Math.min(100, ath + aca + out + exp + fam);
  return { total, parts, steps: steps3, fit, T, R, W, v, pool };
}
const qualified = r => +Q.grade >= 10 && (r.T + r.R) > 0 && ["3_5_plus", "3_0_to_3_49"].includes(Q.gpa);

function resultView() {
  const r = RES, C = core.cfg(), who = Q.who === "parent" ? "Your athlete" : "You", lvl = r.total >= 75 ? "Ready to be recruited" : r.total >= 50 ? "On the way" : "Getting started";
  const P = [["Athletic", r.parts.athletic, 35], ["Academic", r.parts.academic, 20], ["Outreach", r.parts.outreach, 25], ["Coach contact", r.parts.exposure, 10], ["Family", r.parts.family, 10]];
  const fitLine = r.v == null ? "" : (r.T + r.R + r.W)
    ? `${who === "You" ? "Your" : "Their"} ${esc(Q.m)} in the ${esc(C.evName ? C.evName(Q.e, Q.g) : Q.e)} fits <b>${r.T + r.R + r.W}</b> programs at the levels you picked: ${r.T} Target, ${r.R} Recruit, ${r.W} Walk-On.`
    : `${who === "You" ? "Your" : "Their"} ${esc(Q.m)} doesn't reach a level at the programs you picked yet. The standards search shows exactly how far off each one is.`;
  const cta = qualified(r)
    ? `<a class="acbtn onbgo" href="${esc(C.quiz ? C.quiz({ e: Q.e, grade: Q.grade, m: Q.m, stage: Q.stage, score: r.total }) : "#")}" target="_blank" rel="noopener" data-rq="eval">Get your free recruitment evaluation</a><p class="onbsub" style="margin-top:8px">${who === "You" ? "Your" : "Their"} marks and grades already fit programs. The evaluation shows which coaches to contact first.</p>`
    : core.member() ? `<button type="button" class="acbtn onbgo" data-rq="exit">Back to the standards</button>`
    : `<button type="button" class="acbtn onbgo" data-rq="account">Save my results</button><p class="onbsub" style="margin-top:8px">A free account keeps your score and shows when a new PR moves you up.</p>`;
  return top() + `<div class="onbwrap"><section class="onbmain rqres"><p class="rqn">Recruitment Readiness</p>
    <div class="rqscore"><b>${r.total}</b><span>/100</span><em>${lvl}</em></div>
    <div class="rqparts">${P.map(([l, n, m]) => `<div><span>${l}</span><i><u style="width:${Math.round(n / m * 100)}%"></u></i><small>${n}/${m}</small></div>`).join("")}</div>
    ${fitLine ? `<p class="rqfit">${fitLine}</p>` : ""}
    <h2>${r.total >= 75 ? "Keep it moving" : "What would move the score most"}</h2><ol class="rqsteps">${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    <div class="rqcta">${cta}</div>
    <p class="rqfoot"><button type="button" class="lnk" data-rq="again">Take it again</button></p></section></div>`;
}

function render() { const el = layer(); el.hidden = false; document.documentElement.classList.add("onbon"); el.innerHTML = RES ? resultView() : stepView(); }
function readMark() { const e = document.getElementById("rq-e"), m = document.getElementById("rq-m"); if (e) Q.e = e.value; if (m) Q.m = m.value.trim(); }

async function finish() {
  RES = score(); const C = core.cfg(); try { localStorage.setItem("prReadyDone", "1"); } catch (e) {}
  /* anonymous, categorical only */
  /* compact code (the tracker keeps 30 characters): r<score>|grade|who|gpa|levels|coach contact|emailed|video|questionnaires|parent
     e.g. "r72|11|a|4|12N|0|1|0|1|2"; levels 1/2/3 = NCAA D1-D3, N = NAIA, J = junior college, U = not sure */
  const code = ["r" + RES.total, Q.grade, Q.who === "parent" ? "p" : "a", { "3_5_plus": 4, "3_0_to_3_49": 3, "2_3_to_2_99": 2, under_2_3: 1 }[Q.gpa] || 0,
    Q.divs.map(d => ({ D1: 1, D2: 2, D3: 3, NAIA: "N", JUCO: "J", not_sure: "U" }[d])).join("") || "-", { none: 0, some: 1, offers: 2 }[Q.stage] ?? "-",
    { no: 0, few: 1, many: 2 }[Q.emailed] ?? "-", { none: 0, one: 1, both: 2 }[Q.video] ?? "-", { no: 0, some: 1 }[Q.quest] ?? "-", Q.who === "parent" ? "x" : ({ none_yet: 0, one: 1, both: 2 }[Q.parent] ?? "-")].join("|");
  C.log && C.log("feedback", { detail: code, event: Q.e || undefined, grade: Q.grade || undefined });
  if (core.member()) {
    const uid = core.ses().user.id, st = { none: "getting_started", some: "talking", offers: "offers" }[Q.stage];
    const pi = Q.who === "parent" ? null : { both: "both", one: null, none_yet: "none_yet" }[Q.parent];
    core.api("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", prefer: "return=minimal", body: { readiness: Object.assign({}, Q, { m: undefined }), readiness_score: RES.total, readiness_at: new Date().toISOString(),
      target_divisions: Q.divs.length ? Q.divs : null, recruiting_stage: st, ...(pi ? { parent_involvement: pi } : {}) } }).catch(() => {});
  }
  render(); layer().scrollTo(0, 0);
}

export const isPage = () => location.pathname === "/readiness";
export function show() { const I = core.cfg().intent || {}; Q = Q || { who: "", grade: I.gr ? String(I.gr) : "", g: I.g || "", e: I.e || "", m: I.m || "", gpa: "", divs: [], stage: "", emailed: "", video: "", quest: "", parent: "" }; STEP = 0; RES = null; MSG = ""; render(); core.cfg().log && core.cfg().log("feedback", { detail: "readiness-start" }); }
export function hide() { const el = document.getElementById("rdy"); if (el) { el.hidden = true; el.innerHTML = ""; } document.documentElement.classList.remove("onbon"); }
export function go() { if (location.pathname !== "/readiness") history.pushState({}, "", "/readiness"); show(); window.scrollTo(0, 0); }

export function bind() {
  document.addEventListener("click", e => {
    const el = document.getElementById("rdy"); if (!el || el.hidden || !el.contains(e.target)) return;
    const b = e.target.closest("[data-rq]"); if (!b) return; const a = b.dataset.rq;
    if (a === "eval") { core.cfg().log && core.cfg().log("popup_click", { placement: "readiness", variant: "readiness-" + (RES && RES.total) }); return; }   // the link opens the form
    e.preventDefault(); MSG = "";
    const S = steps(), s = S[STEP];
    if (a === "exit") { history.pushState({}, "", "/"); hide(); core.changed(); return; }
    if (a === "again") { RES = null; STEP = 0; return render(); }
    if (a === "account") { hide(); history.pushState({}, "", "/"); core.changed();   /* the account module opens sign-up for any [data-acc="signup"] click */
      const t = document.createElement("button"); t.type = "button"; t.hidden = true; t.dataset.acc = "signup"; t.dataset.why = "readiness"; document.body.append(t); t.click(); t.remove(); return; }
    if (a === "back") { readMark(); STEP = Math.max(0, STEP - 1); return render(); }
    if (a === "pick") { Q[s.k] = b.dataset.v; if (s.k === "g" && Q.e && core.cfg().events && !core.cfg().events(Q.g).includes(Q.e)) Q.e = ""; return STEP === S.length - 1 ? finish() : (STEP++, render()); }
    if (a === "tog") { const v = b.dataset.v; Q.divs = v === "not_sure" ? (Q.divs.includes(v) ? [] : [v]) : Q.divs.includes(v) ? Q.divs.filter(x => x !== v) : [...Q.divs.filter(x => x !== "not_sure"), v]; return render(); }
    if (a === "next") {
      if (s.custom) { readMark(); if (Q.m && (!Q.e || core.cfg().parse(Q.m, Q.e) == null)) { MSG = `Check the mark${Q.e && core.cfg().ph ? " (for example " + core.cfg().ph(Q.e) + ")" : ""}, or leave it blank.`; return render(); } }
      if (s.multi && !Q.divs.length) { MSG = "Pick at least one level, or Not sure yet."; return render(); }
      return STEP === S.length - 1 ? finish() : (STEP++, render());
    }
  });
  document.addEventListener("submit", e => { if (e.target && e.target.id === "rqf") { e.preventDefault(); const n = document.querySelector('#rdy [data-rq="next"]'); n && n.click(); } });
  window.addEventListener("popstate", () => { if (isPage()) show(); else hide(); });
}
