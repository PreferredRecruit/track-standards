// @ts-nocheck
/* Onboarding page /onboarding and account page /account.
   Ryan 2026-10-19: "it should feel like they're building their profile", "just important data questions, times, gpa, grade",
   "parent accounts can add athletes depending on how many kids they have, so we can grade them too", and "kids can make
   customized images for their profile and their little banner".
   Athlete: Start → About → Events and PRs → GPA (+ a parent's contact) → profile.
   Parent: Start → About you → your athlete → their events → their GPA → profile, then "Add another athlete" any time.
   Each athlete (self or a parent's kid) is graded in the database; the parent account takes its best athlete's tier.
   Athletes are asked for a parent's contact, never their own phone (recruiting contact for minors goes to a parent).
   Photos and banners are private (bucket "avatars", owner + admins only). Admins also get the Accounts dashboard. */
import { core, optIn } from "./account.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const NOW = new Date(), SENIOR = NOW.getMonth() >= 6 ? NOW.getFullYear() + 1 : NOW.getFullYear();   // class of the current seniors
const CLASSES = [[SENIOR, "Senior"], [SENIOR + 1, "Junior"], [SENIOR + 2, "Sophomore"], [SENIOR + 3, "Freshman"]];
const gradeOf = y => y ? (y < SENIOR ? "college" : String(12 - (y - SENIOR))) : null;
const ROLES = [["athlete", "I'm an athlete", "Build your own recruiting profile"], ["parent", "I'm a parent", "Add one athlete or several"], ["coach", "I'm a coach", "Use the standards and results"], ["fan", "Just a fan", "Follow college track and field"]];
const ICON = { athlete: '<path d="M13 4a2 2 0 1 1 0 .01M9 21l2.5-6 2.5 2v4M7.5 12.5 10 9l3 1 2.5 3 3 .5"/>', parent: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5M14.5 20c.4-2.4 1.6-4 3.5-4 1.6 0 2.7 1 3 3"/>', coach: '<path d="M4 5h16v11H4zM8 21h8M12 16v5"/><path d="M8 9l3 3 5-5"/>', fan: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>' };
const THEMES = [["violet", "Violet"], ["track", "Track"], ["night", "Night meet"], ["gold", "Gold"], ["teal", "Teal"], ["ink", "Black"]];
const svg = (p, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const PERSON = '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', CAM = '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', CHECK = '<path d="M5 12l5 5 9-10"/>';

let NEWPR = null;
let D = null, KIDS = [], K = null, MODE = "onboard", SEL = 0, STEP = 0, MSG = "", BUSY = false, TAB = "profile", BANNER = false, IMGERR = "", IMGBUSY = "";
let ADM = null, ADMQ = "", ADMT = "", IS_ADMIN = null;
/* admin "view as" (Ryan 2026-11-02: "click into individual user accounts ... view the specific user's dashboard exactly as they have
   customized it"): {uid, email, name, done, ver}. Read-only: their data is loaded into the same page they see, every edit, upload and
   sign-out control is hidden and blocked (row-level security would refuse the writes anyway). */
let VIEW_AS = null;
const RO = new Set(["edit", "editkid", "quick", "addkid", "rmkid", "banner", "theme", "pick", "out", "dreamx", "add", "rm", "skip", "back", "cancel"]);
const vb = sz => VIEW_AS ? (VIEW_AS.ver ? core.badgeSvg(sz) : "") : core.badge(sz);
const IMG = {};   // storage path → blob URL

const par = () => D.role === "parent";
const fam = () => D.role === "athlete" || D.role === "parent";
const S = () => par() ? K : D;   // the athlete being built or shown
const QUICK = () => MODE.startsWith("q:");
const kidOnly = () => par() && MODE !== "onboard" && MODE !== "edit";
function stepsFor() {
  if (QUICK()) return [MODE.slice(2)];
  if (!D.role) return ["who"];
  if (par() && (MODE === "addkid" || MODE === "editkid")) return ["about", "events", "gpa"];
  if (par()) return MODE === "edit" ? ["who", "you"] : ["who", "you", "about", "events", "goals", "gpa"];
  if (D.role === "athlete") return ["who", "about", "events", "goals", "gpa"];
  return ["who", "you"];
}
const STEP_NAME = { who: "Start", you: "About you", about: "Athlete", events: "Events and PRs", goals: "Goals", gpa: "GPA" };
/* Goals (Ryan 2026-10-25: "conditional logic ... 'Are you looking for D1, D2, or JUCO scholarships?'"): target levels, then the
   scholarship question only when a level that gives athletic scholarships is picked (D3 gives none). Feeds the lead score. */
const DIVS_GOAL = [["D1", "NCAA D1"], ["D2", "NCAA D2"], ["D3", "NCAA D3"], ["NAIA", "NAIA"], ["JUCO", "Junior college"], ["not_sure", "Not sure yet"]];
const SCHOL = [["need", "We need one", "Cost decides where"], ["helps", "It would help", "A big plus"], ["not_needed", "Not needed", "Fit matters more"], ["not_sure", "Not sure yet", ""]];
const scholDivs = d => (d || []).some(x => ["D1", "D2", "NAIA", "JUCO"].includes(x));

const fmtM = (e, v) => core.cfg().fmt ? core.cfg().fmt(e, +v) : String(v);
function blankKid() { const I = core.cfg().intent || {}; return { id: null, first: "", last: "", gender: I.g || "", year: I.gr ? SENIOR + (12 - +I.gr) : "", state: D && D.state || "", school: "", gpa: "", email: "", phone: "", dream: [], marks: [[I.e || "", I.m || ""]], avatar: null, banner: null, theme: null }; }
function selfDraft(p = core.profile() || {}) {
  const I = VIEW_AS ? {} : core.cfg().intent || {};
  return { id: null, role: p.role || "", first: p.first_name || "", last: p.last_name || "", phone: p.phone || "", sms: !!p.sms_consent, em: !!p.email_updates,
    gender: p.gender || I.g || "", year: p.grad_year || (I.gr ? SENIOR + (12 - +I.gr) : ""), state: p.state || "", school: p.high_school || "", gpa: p.gpa != null ? String(p.gpa) : "",
    pname: p.parent_name || "", pemail: p.parent_email || "", pphone: p.parent_phone || "", age: !!p.age_13_plus,
    divs: p.target_divisions || [], schol: p.scholarship_priority || "",
    avatar: p.avatar_path || null, banner: p.banner_path || null, theme: p.banner_theme || null, marks: [], dream: p.dream_schools || [] };
}
async function loadAll(uid = core.ses().user.id, prof) {
  D = selfDraft(prof);
  const ms = await core.api("/rest/v1/marks?select=event,mark,athlete_id&user_id=eq." + uid + "&order=id").catch(() => []) || [];
  D.marks = ms.filter(m => !m.athlete_id).map(m => [m.event, fmtM(m.event, m.mark)]); D.marks0 = D.marks.map(m => m.slice());
  KIDS = [];
  if (par()) {
    const ks = await core.api("/rest/v1/athletes?select=*&parent_id=eq." + uid + "&order=created_at").catch(() => []) || [];
    KIDS = ks.map(a => ({ id: a.id, first: a.first_name || "", last: a.last_name || "", gender: a.gender || "", year: a.grad_year || "", state: a.state || "", school: a.high_school || "",
      gpa: a.gpa != null ? String(a.gpa) : "", email: a.email || "", phone: a.phone || "", dream: a.dream_schools || [], avatar: a.avatar_path, banner: a.banner_path, theme: a.banner_theme, marks: ms.filter(m => m.athlete_id === a.id).map(m => [m.event, fmtM(m.event, m.mark)]) }));
  }
  if (!D.marks.length) { const I = VIEW_AS ? {} : core.cfg().intent || {}; D.marks = [[I.e || "", I.m || ""]]; }
  SEL = Math.min(SEL, Math.max(0, KIDS.length - 1));
  K = KIDS[SEL] ? clone(KIDS[SEL]) : blankKid();
}
const clone = k => JSON.parse(JSON.stringify(k));
const fitsFor = (sub, e, m) => { const C = core.cfg(); if (!sub || !e || !m || !sub.gender || !C.parse || !C.fits) return null; const v = C.parse(m, e); return v == null ? null : C.fits(e, sub.gender, v); };
const evName = (e, g) => esc(core.cfg().evName ? core.cfg().evName(e, g) : e);
const nameOf = sub => [sub.first, sub.last].filter(Boolean).join(" ");
const initials = sub => nameOf(sub).split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

/* ---------- layout ---------- */
function layer() {
  let el = document.getElementById("onb");
  if (!el) { document.body.insertAdjacentHTML("beforeend", `<div class="onb" id="onb" role="main"></div>`); el = document.getElementById("onb"); }
  return el;
}
const NAV = `<nav class="onbsite" aria-label="Site"><button type="button" data-onb="home" data-v="standards">Standards</button><button type="button" data-onb="home" data-v="results">Results</button><button type="button" data-onb="home" data-v="rankings">Rankings</button></nav>`;
const top = (right = "") => `<header class="onbtop"><button type="button" class="onblogo" data-onb="exit" aria-label="Back to Track Standards"><img class="onbtile" src="/ts-icon.svg" alt="" width="34" height="34"><span><b>Track Standards</b><small>by Preferred Recruit</small></span></button><div class="onbtr">${right}${core.ses() && !core.member() ? `<button type="button" class="onbx" data-onb="out">Sign out</button>` : `<button type="button" class="onbx" data-onb="exit">Back to standards</button>`}</div></header>`;
const opt = (name, list, cur, cls = "") => `<div class="onbopt ${cls}" role="radiogroup">${list.map(([v, l, d]) => `<button type="button" role="radio" data-set="${name}" data-v="${v}" aria-checked="${String(cur) === String(v)}"><b>${esc(l)}</b>${d ? `<small>${esc(d)}</small>` : ""}</button>`).join("")}</div>`;
const inp = (id, label, val, attrs = "", help = "", obj = "s") => `<label class="onbf" for="f-${id}"><span>${label}</span><input class="in" id="f-${id}" data-in="${id}" data-obj="${obj}" value="${esc(val)}" ${attrs}>${help ? `<small>${help}</small>` : ""}</label>`;
const AGE = () => `<label class="onbck"><input type="checkbox" data-ck="age" ${D.age ? "checked" : ""}><span>I am 13 or older and agree to the <a href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>.</span></label>`;
const avatarHtml = (sub, size = 24) => sub && sub.avatar && IMG[sub.avatar] ? `<img src="${IMG[sub.avatar]}" alt="">` : sub && initials(sub) ? esc(initials(sub)) : svg(PERSON, size);

function card() {
  const sub = S(), C = core.cfg();
  if (!fam() || !sub) return `<aside class="pcard"><div class="pchd"><div class="pcav">${svg(PERSON, 24)}</div><div><b>${esc(nameOf(D) || "Your name")}</b><small>${D.role === "coach" ? "Coach account" : D.role === "fan" ? "Fan account" : "Recruiting profile"}</small></div><div></div></div><p class="pcnote">${D.role ? "Full standards, results lists and Recruiting AI open as soon as you finish." : "Pick who's building this profile to get started."}</p></aside>`;
  const marks = (sub.marks || []).filter(m => m[0] && m[1]);
  const best = marks.map(m => [m, fitsFor(sub, m[0], m[1])]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1])[0];
  const cls = CLASSES.find(c => c[0] === +sub.year), S2 = stepsFor(), pct = Math.round(Math.min(STEP, S2.length) / S2.length * 100);
  const row = (k, v) => `<div class="pcr"><span>${k}</span><b>${v ? esc(v) : '<i>Not added yet</i>'}</b></div>`;
  return `<aside class="pcard" aria-label="Recruiting profile"><div class="pchd"><div class="pcav">${avatarHtml(sub)}</div><div><b>${esc(nameOf(sub) || (par() ? "Your athlete" : "Your name"))}${vb(15)}</b><small>${esc([cls ? "Class of " + cls[0] : "", sub.gender ? (sub.gender === "m" ? "Men's" : "Women's") + " track" : "", core.ST[sub.state] || ""].filter(Boolean).join(" · ") || "Recruiting profile")}</small></div>
    <div class="pcring" style="--p:${pct}"><span>${pct}%</span></div></div>
    <div class="pcev">${marks.length ? marks.map(m => `<span class="pcchip"><b>${evName(m[0], sub.gender)}</b>${esc(m[1])}</span>`).join("") : '<span class="pcempty">Events and PRs show here</span>'}</div>
    ${best ? `<div class="pcfit"><b>${best[1].toLocaleString()}</b><span>college programs fit ${par() ? esc(sub.first || "their") + (sub.first ? "'s" : "") : "your"} ${evName(best[0][0], sub.gender)}</span></div>` : ""}
    ${row("GPA", sub.gpa)}${row("High school", sub.school)}</aside>`;
}

let MORE = false;   /* the optional part of the About step stays open across redraws (phones lost 35% of people on that step, 2026-11-05) */
document.addEventListener("toggle", e => { if (e.target && e.target.matches && e.target.matches("[data-more]")) MORE = e.target.open; }, true);
function stepBody(k) {
  const C = core.cfg(), p = par(), sub = S();
  if (k === "who") return `<h1>Build your recruiting profile</h1><p class="onbsub">It takes about two minutes. Your profile shows every college your marks fit and keeps your PRs in one place.</p>
    <div class="onbroles">${ROLES.map(([v, l, d]) => `<button type="button" data-set="role" data-v="${v}" aria-checked="${D.role === v}" role="radio"><span class="ri">${svg(ICON[v])}</span><b>${l}</b><small>${d}</small></button>`).join("")}</div>`;
  if (k === "you") return `<h1>${p ? "About you" : "Your name"}</h1><p class="onbsub">${p ? "Next you'll add your athlete. You can add more than one." : "So we know who's using the site."}</p>
    <div class="onbg2">${inp("first", "First name", D.first, 'autocomplete="given-name" maxlength="60"', "", "d")}${inp("last", "Last name", D.last, 'autocomplete="family-name" maxlength="60"', "", "d")}</div>
    ${p ? inp("phone", "Your phone", D.phone, 'type="tel" autocomplete="tel" maxlength="30"', "", "d") + `<label class="onbck"><input type="checkbox" data-ck="sms" ${D.sms ? "checked" : ""}><span>Preferred Recruit may text me about my athlete's recruiting. Message rates apply. Reply STOP to opt out.</span></label><label class="onbck"><input type="checkbox" data-ck="em" ${D.em ? "checked" : ""}><span>Send me the monthly standards update: what changed in college track recruiting, the NCAA news that matters, and where my athlete stands. One email a month. Unsubscribe any time.</span></label>` : ""}${AGE()}`;
  if (k === "about") return `<h1>${p ? (MODE === "addkid" ? "Add another athlete" : "Your athlete") : "About you"}</h1><p class="onbsub">${p ? "Each athlete gets their own profile, PRs and college matches." : "The basics coaches look at first."}</p>
    <div class="onbg2">${inp("first", p ? "Athlete's first name" : "First name", sub.first, 'autocomplete="off" maxlength="60"')}${inp("last", p ? "Athlete's last name" : "Last name", sub.last, 'autocomplete="off" maxlength="60"')}</div>
    <div class="onbq"><span>Class</span>${opt("year", [...CLASSES.map(([y, l]) => [y, l, "Class of " + y]), [SENIOR - 1, "In college", "Already there"]], sub.year, "c5")}</div>
    <div class="onbq"><span>Team</span>${opt("gender", [["m", "Men"], ["w", "Women"]], sub.gender, "c2")}</div>
    <div class="onbg2"><label class="onbf" for="f-state"><span>State</span><select class="in" id="f-state" data-in="state" data-obj="s"><option value="">Choose a state</option>${Object.entries(core.ST).map(([k2, v]) => `<option value="${k2}" ${k2 === sub.state ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>${inp("school", "High school (optional)", sub.school, 'maxlength="100" autocomplete="off"')}</div>
    <details class="onbmore" data-more ${MORE || sub.email || sub.phone || (sub.dream || []).length ? "open" : ""}><summary>Add ${p ? "their contact" : "your phone"} and dream schools (optional)</summary>
    ${p ? `<div class="onbsec"><b>${esc(sub.first || "Your athlete")}'s contact</b><small>Optional. Only Preferred Recruit sees it.</small><div class="onbg2">${inp("email", "Athlete's email", sub.email, 'type="email" maxlength="120" autocomplete="off"')}${inp("phone", "Athlete's phone", sub.phone, 'type="tel" maxlength="30" autocomplete="off"')}</div></div>`
      : `<div class="onbsec"><b>Your phone</b><small>Optional. Only Preferred Recruit sees it.</small><div class="onbg2">${inp("phone", "Your phone", sub.phone, 'type="tel" maxlength="30" autocomplete="tel"')}<span></span></div></div>`}
    ${dreamBox(sub, p)}</details>`;
  if (k === "events") {
    const evs = sub.gender ? (C.events ? C.events(sub.gender) : []) : [];
    const sel = (cur, i) => `<select class="in" data-mk="e" data-i="${i}" aria-label="Event"><option value="">Choose an event</option>${evs.map(e => `<option value="${esc(e)}" ${e === cur ? "selected" : ""}>${evName(e, sub.gender)}</option>`).join("")}</select>`;
    return `<h1>${QUICK() ? (p ? "Update " + esc(sub.first) + "'s PRs" : "Update your PRs") : p ? esc(sub.first || "Their") + (sub.first ? "'s" : "") + " events and PRs" : "Your events and PRs"}</h1><p class="onbsub">${QUICK() ? "Change a mark when you PR, or add a new event. Your college matches update as soon as you save. " : ""}Add every event with ${p ? "their" : "your"} best mark. We compare each one against ${(C.nstd || 1200).toLocaleString()} college standards.</p>
      <div class="onbmk">${sub.marks.map((m, i) => { const f = fitsFor(sub, m[0], m[1]); return `<div class="onbmr">${sel(m[0], i)}<input class="in" data-mk="m" data-i="${i}" value="${esc(m[1])}" placeholder="${esc(m[0] && C.ph ? C.ph(m[0]) : "Best mark")}" inputmode="decimal" autocomplete="off" aria-label="Best mark"><span class="onbfit${f ? " on" : ""}" data-fit="${i}">${f != null ? `<b>${f.toLocaleString()}</b> programs` : ""}</span>${sub.marks.length > 1 ? `<button type="button" class="onbrm" data-onb="rm" data-i="${i}" aria-label="Remove event">×</button>` : ""}</div>`; }).join("")}</div>
      ${sub.marks.length < 6 ? `<button type="button" class="onbadd" data-onb="add">+ Add another event</button>` : ""}`;
  }
  if (k === "goals") { const who = p ? esc(sub.first || "your athlete") : "you", only3 = D.divs.length && D.divs.every(x => x === "D3");
    return `<h1>Where ${p ? "does " + who + " want" : "do you want"} to compete?</h1><p class="onbsub">Pick every level ${p ? "they'd" : "you'd"} be happy at. We use it to show the right programs first.</p>
    <div class="onbopt c3 multi" role="group" aria-label="Levels">${DIVS_GOAL.map(([v, l]) => `<button type="button" role="checkbox" data-tog="divs" data-v="${v}" aria-checked="${D.divs.includes(v)}"><b>${l}</b></button>`).join("")}</div>
    ${scholDivs(D.divs) ? `<div class="onbq"><span>How important is an athletic scholarship?</span><div class="onbopt c2" role="radiogroup">${SCHOL.map(([v, l, d]) => `<button type="button" role="radio" data-goal="schol" data-v="${v}" aria-checked="${D.schol === v}"><b>${l}</b>${d ? `<small>${d}</small>` : ""}</button>`).join("")}</div></div>`
      : only3 ? `<p class="onbsub" style="margin-top:14px">NCAA D3 programs don't give athletic scholarships, but most offer academic and need-based aid, and coaches can help with admissions.</p>` : ""}`; }
  if (k === "gpa") return `<h1>${QUICK() ? (p ? "Update " + esc(sub.first) + "'s GPA" : "Update your GPA") : "GPA"}</h1><p class="onbsub">Coaches check grades before they recruit. A strong GPA can open more programs than a faster time.</p>
    <div class="onbgpa">${inp("gpa", "Cumulative high school GPA", sub.gpa, 'inputmode="decimal" placeholder="e.g. 3.4" maxlength="4"', "All of high school, on the scale your school uses.")}</div>
    ${D.role === "athlete" ? `<div class="onbsec"><b>A parent's contact</b><small>Optional. Recruiting help goes to a parent, never to an athlete directly.</small>
      ${inp("pname", "Parent's name", D.pname, 'maxlength="80"', "", "d")}<div class="onbg2">${inp("pemail", "Parent's email", D.pemail, 'type="email" maxlength="120"', "", "d")}${inp("pphone", "Parent's phone", D.pphone, 'type="tel" maxlength="30"', "", "d")}</div></div>${AGE()}` : ""}`;
  return "";
}
/* dream schools: up to 3, picked from the schools on this site (the pop-ups speak to them) */
function dreamBox(sub, p) {
  const list = (core.cfg().schools ? core.cfg().schools() : []), d = sub.dream || [];
  return `<div class="onbsec onbdream"><b>${p ? esc(sub.first || "Your athlete") + "'s dream schools" : "Your dream schools"}</b><small>Optional, up to 3. We'll show how close ${p ? "they are" : "you are"} to each one.</small>
    <div class="dreamchips">${d.map((n, i) => `<span class="dreamchip">${esc(n)}<button type="button" data-onb="dreamx" data-i="${i}" aria-label="Remove ${esc(n)}">×</button></span>`).join("")}</div>
    ${d.length < 3 ? `<input class="in" data-dream list="dreaml" placeholder="Type a school, like Harvard or Oregon" autocomplete="off"><datalist id="dreaml">${list.map(n => `<option value="${esc(n)}">`).join("")}</datalist>` : ""}</div>`;
}
function lastLabel() {
  if (MODE === "addkid") return "Add athlete";
  if (QUICK()) return MODE === "q:events" ? "Save PRs" : "Save GPA";
  if (MODE === "editkid" || core.member()) return "Save profile";
  return "Finish my account";
}
function wizard() {
  const S2 = stepsFor(), k = S2[STEP] || S2[0], last = STEP >= S2.length - 1 && !!D.role;
  const bar = `<ol class="onbsteps" aria-label="Progress">${(D.role ? S2 : ["who", "about", "events", "gpa"]).map((s, i) => `<li class="${i < STEP ? "done" : i === STEP ? "on" : ""}"><span>${i + 1}</span>${STEP_NAME[s]}</li>`).join("")}</ol>`;
  const back = STEP > 0 ? `<button type="button" class="onbback" data-onb="back">Back</button>` : (MODE !== "onboard") ? `<button type="button" class="onbback" data-onb="cancel">Cancel</button>` : "<span></span>";
  return top() + `<div class="onbwrap"><section class="onbmain">${bar}<form id="onbf" class="onbform" novalidate>${stepBody(k)}${MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : ""}
    ${k === "who" ? "" : `<div class="onbnav">${back}${(k === "events" || k === "gpa") && !QUICK() ? `<button type="button" class="onbskip" data-onb="skip">Skip for now</button>` : ""}<button class="acbtn onbgo" ${BUSY ? "disabled" : ""}>${BUSY ? "Saving…" : last ? lastLabel() : "Continue"}</button></div>`}</form></section>${card()}</div>`;
}

/* ---------- profile pages ---------- */
function doneView() {
  try { if (sessionStorage.getItem("prKitOpen")) { sessionStorage.removeItem("prKitOpen"); TAB = "kit"; KITV = "roster"; } } catch (e) {}   /* just unlocked: open the kit */
  if (VIEW_AS) return top(`<button type="button" class="onbtab on" data-onb="vaback">‹ Back to accounts</button>`) +
    `<div class="vabar" role="status"><span>${svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 17)}Viewing <b>${esc(VIEW_AS.name || VIEW_AS.email)}</b>'s account exactly as they see it. Read only.</span>${VIEW_AS.done ? "" : "<em>Profile not finished</em>"}<button type="button" data-onb="vaback">Back to accounts</button></div>` +
    (!D.role ? `<div class="onbwrap one"><section class="onbmain onbdone"><h1>Nothing set up yet</h1><p class="onbsub">This account was created but hasn't started the profile steps.</p></section></div>`
      : D.role === "athlete" ? `<div class="prwrap">${profileCard(D)}${footer()}</div>` : par() ? parentView() : `<div class="prwrap">${profileCard(D, true)}${footer()}</div>`);
  if (D.role && (core.premium() || fam())) return premiumView();   /* free accounts get the same shell with locks (Ryan 2026-11-12) */
  return top(NAV + (IS_ADMIN ? `<button type="button" class="onbtab${TAB === "admin" ? " on" : ""}" data-onb="tab" data-v="admin">Accounts</button><button type="button" class="onbtab${TAB === "profile" ? " on" : ""}" data-onb="tab" data-v="profile">My profile</button>` : "")) +
    `<div class="onbhome"><button type="button" class="onbhb" data-onb="home" data-v="standards">‹ Back to the site</button></div>` + (TAB === "admin" && IS_ADMIN ? adminView()
      : fam() ? `<div class="prlayout">${kit()}<div class="prmainc">${TAB === "kit" ? kitView() : D.role === "athlete" ? `<div class="prwrap">${profileCard(D)}${footer()}</div>` : parentView()}</div></div>`
      : `<div class="prwrap">${profileCard(D, true)}${footer()}</div>`);
}
/* ---------- recruiting kit (Ryan 2026-11-11, low-ticket product): left column of the account. Free steps that complete the account,
   then the premium resources, locked until the low-ticket purchase, unlocked in place after it. live with the low-ticket launch (2026-11-12). ---------- */
const LT_URL = "https://lt.thepreferredrecruit.com/";   /* Abe's sales page; confirm the exact path before launch */
const KIT_P = [["cc", "Coach Contacts", "Every coach's name, position and email ($17 add-on)"], ["list", "My College List", "Rank up to 25 colleges against your marks"],
  ["course", "The 7-Day Roadmap course", "Videos, email and DM templates and the tracker, right here"], ["dark", "Premium Dark", "A sleek dark look for the whole site"]];
const LOCK = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
function kit() {
  const sub = par() ? KIDS[SEL] : D, P = core.premium(), info = core.premiumInfo() || {};
  const free = [["Create your account", true], ["Add events and marks", !!(sub && (sub.marks || []).some(m => m[0] && m[1]))], ["Add grad year and GPA", !!(sub && sub.year && sub.gpa)],
    ["Pick your dream schools", !!(sub && (sub.dream || []).length)], ["Add a profile photo", !!(sub && sub.avatar)]];
  const done = free.filter(x => x[1]).length;
  const prem = KIT_P.filter(([k]) => k !== "pkit" || !P || info.bump);
  const em = core.ses() && core.ses().user ? core.ses().user.email : "", u = new URL(LT_URL);
  for (const [k, v] of [["utm_source", "standards"], ["utm_medium", "account"], ["utm_campaign", "premium"], ["utm_content", "free-account"]]) u.searchParams.set(k, v);   /* never personal data in links */
  return `<aside class="kit" aria-label="Your recruiting kit"><h2 class="kith">Your recruiting kit</h2>
    <div class="kitg"><div class="kitgh"><b>Complete your account</b><span>${done} of ${free.length}</span></div><div class="kitbar"><i style="width:${Math.round(done / free.length * 100)}%"></i></div>
      <ul>${free.map(([l, ok]) => `<li class="${ok ? "ok" : ""}">${ok ? `<span class="kitic ok">${svg('<path d="M5 12l5 5 9-11"/>', 14)}</span>${l}` : `<button type="button" data-onb="edit"><span class="kitic"></span>${l}</button>`}</li>`).join("")}</ul></div>
    <div class="kitg${P ? " on" : ""}"><div class="kitgh"><b>${P ? "Premium" : "Premium resources"}</b>${P ? `<span class="kitpro">Unlocked</span>` : ""}</div>
      <ul>${prem.map(([k, l, d]) => `<li class="${P ? "" : "lk"}">${P ? `<button type="button" data-onb="kit" data-v="${k}" class="${TAB === "kit" && KITV === k ? "on" : ""}"><b>${l}</b><small>${d}</small></button>` : `<span class="kitlk">${svg(LOCK, 14)}<span><b>${l}</b><small>${d}</small></span></span>`}</li>`).join("")}</ul>
      ${P ? "" : `<a class="kitbuy" href="${esc(u.toString())}" target="_blank" rel="noopener">Get Premium · $27 one time</a><p class="kitnote">Already bought it? Sign in with the email you used at checkout and it unlocks here.</p>`}</div></aside>`;
}
let KITV = "roster";
function kitView() {
  if (!core.premium()) { TAB = "profile"; return D.role === "athlete" ? `<div class="prwrap">${profileCard(D)}${footer()}</div>` : parentView(); }
  const sub = par() ? KIDS[SEL] : D, [, title, desc] = KIT_P.find(x => x[0] === KITV) || KIT_P[0];
  if (!sub) { TAB = "profile"; return parentView(); }
  const C = core.cfg(), m = (sub.marks || []).find(x => x[0] && x[1]) || [], ev = m[0] ? (C.evName ? C.evName(m[0], sub.gender) : m[0]) : "your event";
  const name = [sub.first, sub.last].filter(Boolean).join(" ") || "Your name", cls = sub.year ? "Class of " + sub.year : "";
  const head = `<div class="kvh"><h1>${esc(title)}</h1><p class="onbsub">${esc(desc)}</p></div>`;
  const later = `<div class="kvph"><b>Kit content goes here</b><p>This is where the ${esc(title.toLowerCase())} from the low-ticket kit will live, the same content buyers get by email. Waiting on the final copy from Abe.</p></div>`;
  if (KITV === "roster") return head + `<div class="kvcard"><p>Open any school page and tap <b>Coaches roster</b> to see every coach with their email. Coaches who work with ${esc(ev)} athletes are listed first.</p>
      ${(sub.dream || []).length ? `<p class="kvsub">Your dream schools</p><ul class="kvlist">${sub.dream.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
      <button type="button" class="acbtn" data-onb="home" data-v="standards">Find your schools</button></div>`;
  if (KITV === "email") { const subj = `${name} | ${ev} ${m[1] || ""} | ${cls}`.replace(/\s+\|\s+\|/g, " |").trim();
    const body = `Coach [Last name],\n\nMy name is ${name}, ${cls ? "a " + cls.toLowerCase().replace("class of", "class of") + " " : ""}${ev} athlete${sub.school ? " at " + sub.school : ""}${sub.state ? " in " + sub.state : ""}. My best ${ev} is ${m[1] || "[mark]"}${sub.gpa ? " and I have a " + sub.gpa + " GPA" : ""}.\n\nI'm interested in [School] and would like to learn what it takes to join your program. My results are on Athletic.net: [link].\n\nThank you for your time,\n${name}`;
    return head + `<div class="kvcard"><p class="kvsub">Subject</p><pre class="kvpre" id="kvsubj">${esc(subj)}</pre><p class="kvsub">Email</p><pre class="kvpre" id="kvbody">${esc(body)}</pre>
      <div class="kvrow"><button type="button" class="acbtn" data-onb="copy" data-v="kvbody">Copy email</button><button type="button" class="onbback" data-onb="copy" data-v="kvsubj">Copy subject</button></div>
      <p class="kvnote">Preview draft built from your profile. Abe's final email script replaces this wording.</p></div>`; }
  return head + later;
}
/* ---------- Premium account (Ryan 2026-11-12): sidebar, dashboard, My College List, Coach Contacts, Settings (Premium Dark / White),
   and the Admin section for admin emails. The course lives here too (Course tab, migration 020). $27 = Premium, $17 = coach emails. ---------- */
let PT = "dash", LIST = null, LISTK = null, LF = "all", LSORT = "rank", CCQ = "", CCS = null, AOV = null, OPEN = null, LMSG = "";
const ROS = {};
const STAR = '<span class="pmstar" aria-hidden="true">★</span>';
const utm = (url, where) => { const u = new URL(url); for (const [k, v] of [["utm_source", "standards"], ["utm_medium", "account"], ["utm_campaign", "premium"], ["utm_content", where]]) u.searchParams.set(k, v); return u.toString(); };
/* ---------- Classroom (Ryan 2026-11-12: "mirror the layout of Skool"): course cards with progress, then a course page with the
   module list on the left and the lesson on the right. Only the low-ticket offer: 7-Day Roadmap ($27), Coach-Ready Profile Kit +
   Coach Contacts ($17). The $97 Plan Call lives only on Abe's funnel (Ryan 2026-11-12). Locked courses show the lock and the Whop unlock page. Text and videos come from
   course_item / signed storage links only for unlocked accounts (migrations 020, 023). Progress is saved per account. ---------- */
let MODQ = null, CAT = null, CRS = null, LES = null, LESD = null, VSRC = null, CMSG = "";
const CLOCK = svg(LOCK, 14).replace("<svg", '<svg class="crslk"');  /* same lock as the Premium kit list */
const CCHK = svg('<path d="M5 12l5 5 9-11"/>', 13);
const COURSES = { "7day": { k: "lt27", d: "One job a day for 7 days: the checklist, your school list, the tracker, email and DM scripts, and follow-ups." },
 };
const cmins = s => s ? (s < 60 ? s + " sec" : Math.round(s / 60) + " min") : "";
const kindIc = k => ico(k === "video" ? "play" : k === "tool" ? "out" : "file", 12);
function mdLite(t) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null;
  for (const raw of String(t || "").split("\n")) { const l = raw.trimEnd();
    const m = l.match(/^(\d+)\.\s+(.*)$/) || l.match(/^[-•]\s+(.*)$/);
    if (/^#{1,3}\s/.test(l)) { if (list) { out.push(`</${list}>`); list = null; } out.push(`<h3>${inl(l.replace(/^#+\s/, ""))}</h3>`); continue; }
    if (m) { const k = /^\d/.test(l) ? "ol" : "ul"; if (list !== k) { if (list) out.push(`</${list}>`); out.push(`<${k}>`); list = k; } out.push(`<li>${inl(m[m.length - 1])}</li>`); continue; }
    if (list) { out.push(`</${list}>`); list = null; }
    out.push(l.trim() ? `<p>${inl(l)}</p>` : ""); }
  if (list) out.push(`</${list}>`);
  return out.join("");
}
/* Lucide icons (ISC licence, lucide.dev), inlined as SVG: no runtime dependency (house rule). One stroke style app-wide. */
const LUC = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sliders: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  play: '<path d="M6 3l14 9-14 9z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  out: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
  dot: '<circle cx="12" cy="12" r="3"/>' };
const ico = (k, n = 18) => svg(LUC[k] || LUC.dot, n);
const isTpl = it => /^7d-(em|dm)/.test(it.id);
function loadCat() { core.api("/rest/v1/rpc/course_catalog", { method: "POST", body: {} }).then(r => { CAT = r || []; render(); }).catch(e => { CAT = { err: e.message }; render(); }); }
function courseList() { const cs = []; for (const it of CAT || []) { let c = cs.find(x => x.k === it.course); if (!c) cs.push(c = { k: it.course, t: it.course_title, items: [] }); c.items.push(it); } return cs; }
const pct = c => { const n = c.items.filter(i => !i.soon).length; return n ? Math.round(c.items.filter(i => i.done && !i.soon).length / n * 100) : 0; };
function courseView() {
  if (!CAT) { loadCat(); return `<div class="pmtitle"><h1>Classroom</h1></div><p class="pmempty">Loading…</p>`; }
  if (CAT.err) return `<div class="pmtitle"><h1>Classroom</h1></div><p class="acerr">Couldn't load the classroom. ${esc(CAT.err)}</p>`;
  if (CRS) { const c = courseList().find(x => x.k === CRS); if (c) return coursePage(c); CRS = null; }
  const card = c => { const meta = COURSES[c.k] || {}, P = PRODS[meta.k] || {}, open = c.items.some(i => i.unlocked), p = pct(c), n = c.items.length;
    return `<button type="button" class="clc${open ? "" : " locked"}" data-onb="copen" data-v="${esc(c.k)}">
      <span class="clcov"><span class="clcl">Preferred Recruit</span><b>${esc(c.t)}</b>${open ? "" : `<span class="clclk">${CLOCK} Locked</span>`}</span>
      <span class="clcb"><b>${esc(c.t)}</b><small>${esc(meta.d || "")}</small>
      ${open ? `<span class="clbar" aria-label="${p}% complete"><i style="width:${p}%"></i></span><span class="clpct">${p}% complete · ${n} lessons</span>`
        : `<span class="clbuy">${esc(P.price || "")} · Unlock on Whop</span>`}</span></button>`; };
  return `<div class="pmtitle"><h1>Classroom</h1><p>Everything from your Preferred Recruit purchase, in one place.</p></div>
    ${CMSG ? `<p class="pmnote" role="status">${CMSG}</p>` : ""}<div class="clgrid">${courseList().map(card).join("")}</div>`;
}
function coursePage(c) {
  const p = pct(c), secs = []; for (const it of c.items) { let s = secs.find(x => x.t === (it.section || "")); if (!s) secs.push(s = { t: it.section || "", items: [] }); s.items.push(it); }
  if (!LES || LES.course !== c.k) { const first = (MODQ && c.items.find(i => i.section === MODQ)) || c.items.find(i => i.unlocked && !i.done && !i.soon) || c.items[0]; MODQ = null; setTimeout(() => openLesson(first.id, true), 0); }
  const row = it => `<button type="button" class="cmi${LES && LES.id === it.id ? " on" : ""}${it.done ? " done" : ""}" data-onb="cl" data-v="${esc(it.id)}"${LES && LES.id === it.id ? ' aria-current="true"' : ""}>
    <span class="cmic${it.unlocked ? "" : " lk"}" aria-hidden="true">${!it.unlocked ? CLOCK : it.done ? CCHK : kindIc(it.kind)}</span><span class="cmt">${esc(it.title)}</span>${it.unlocked && it.soon ? '<span class="crsoon">Soon</span>' : ""}</button>`;
  const doneN = c.items.filter(i => i.done).length, cur = secs.find(s => s.items.some(i => LES && i.id === LES.id));
  const mods = secs.map(s => `<details class="cmod"${!LES || s === cur || secs.length < 4 ? " open" : ""}><summary><span>${esc(s.t)}</span><small>${s.items.filter(i => i.done).length}/${s.items.length}</small></summary>${s.items.map(row).join("")}</details>`).join("");
  return `<div class="crsback"><button type="button" class="onbback" data-onb="cback">‹ Classroom</button></div>
    <div class="cpage"><aside class="cside" aria-label="Lessons"><div class="csh"><h2>${esc(c.t)}</h2><span class="clbar"><i style="width:${p}%"></i></span><small>${p}% complete · ${doneN} of ${c.items.length}</small></div>
      <details class="cmobile"><summary>All lessons · ${p}% complete</summary>${mods}</details><div class="cmods">${mods}</div></aside>
      <article class="crslesson">${LES ? lessonBody(c) : `<p class="pmempty">Loading…</p>`}</article></div>`;
}
function openLesson(id, quiet) {
  const it = (CAT || []).find(x => x.id === id); if (!it) return;
  if (!it.unlocked) { CMSG = ""; CRS = it.course; LES = it; LESD = null; VSRC = null; BUYMSG = ""; render(); return; }
  CMSG = ""; CRS = it.course; LES = it; LESD = null; VSRC = null; render(); if (!quiet) { const a = document.querySelector(".crslesson"); if (a && innerWidth < 961) a.scrollIntoView({ block: "start" }); }
  if (it.soon && it.kind === "video") { LESD = { soon: true }; render(); return; }
  core.api("/rest/v1/rpc/course_item", { method: "POST", body: { item: id } }).then(d => { if (LES !== it) return; LESD = d || {}; render();
    if (d && d.video_path && !d.soon) core.api("/storage/v1/object/sign/course/" + d.video_path.split("/").map(encodeURIComponent).join("/"), { method: "POST", body: { expiresIn: 7200 } })
      .then(s => { if (LES !== it) return; VSRC = s && (s.signedURL || s.signedUrl) ? core.URL + "/storage/v1" + (s.signedURL || s.signedUrl) : ""; render(); }).catch(() => { VSRC = ""; render(); }); })
    .catch(e => { LESD = { err: e.message }; render(); });
}
function markDone(it, on) {
  it.done = on; render();
  (on ? core.api("/rest/v1/course_progress", { method: "POST", body: { item_id: it.id }, prefer: "resolution=ignore-duplicates,return=minimal" })
      : core.api("/rest/v1/course_progress?item_id=eq." + encodeURIComponent(it.id), { method: "DELETE" })).catch(() => { it.done = !on; render(); });
}
function lessonBody(c) {
  if (!LES.unlocked) return `<p class="crskick">${esc(LES.section || LES.course_title)}</p><h1>${esc(LES.title)}</h1>` + buyView(LES.tier);
  const it = LES, d = LESD, list = c.items, i = list.findIndex(x => x.id === it.id), prev = list[i - 1], next = list[i + 1];
  let media = "";
  if (it.kind === "video" || (d && d.video_path)) media = it.soon ? `<div class="crsv soon"><span aria-hidden="true">${ico("cap")}</span><b>Video coming soon</b><small>We're recording this walkthrough. Everything else in this module works today.</small></div>`
    : VSRC ? `<video class="crsv" controls playsinline preload="metadata" src="${esc(VSRC)}"></video>` : VSRC === "" ? `<div class="crsv soon"><b>Video couldn't load</b><small>Refresh the page to try again.</small></div>` : `<div class="crsv soon"><small>Loading video…</small></div>`;
  const lk = d && d.link ? (d.link === "#cc" ? `<button type="button" class="acbtn" data-onb="pt" data-v="cc">Open Coach Contacts</button>` : d.link === "/" ? `<a class="acbtn" href="/">Open the Standards Site</a>`
    : `<a class="acbtn" href="${esc(d.link)}" target="_blank" rel="noopener">${/spreadsheets/.test(d.link) ? "Make your copy of the tracker ↗" : "Open ↗"}</a>`) : "";
  const body = !d ? `<p class="pmempty">Loading…</p>` : d.err ? `<p class="acerr">${esc(d.err === "locked" ? "This lesson is locked." : d.err)}</p>`
    : (d.body ? (isTpl(it) ? (TPL && TPL.id === it.id ? tplEditor(it) : (loadTpl(it, d), tplEditor(it))) : `<div class="crsdoc">${mdLite(d.body)}</div>`)
      : it.soon ? `<div class="crsdoc"><p>${esc(it.summary || "")}</p><p class="crssoon">This one is on its way. It will show up here as soon as it's ready.</p></div>` : "") + (lk ? `<p class="crslink">${lk}</p>` : "");
  return `<p class="crskick">${esc(it.section || it.course_title)}</p><h1>${esc(it.title)}</h1>${media}${body}
    <div class="crsdone">${it.soon ? "" : `<button type="button" class="${it.done ? "onbback" : "acbtn"}" data-onb="cdone">${it.done ? CCHK + " Completed" : "Mark as complete"}</button>`}</div>
    <div class="crsnav">${prev ? `<button type="button" class="onbback" data-onb="cl" data-v="${esc(prev.id)}">‹ Previous</button>` : "<span></span>"}${next ? `<button type="button" class="acbtn" data-onb="cl" data-v="${esc(next.id)}">Next lesson ›</button>` : ""}</div>`;
}
/* ---------- Editable templates (Ryan 2026-11-12: "edit and save them themselves, with a reset to default option";
   "i want it to be better" than Whop). Subject + email are editable, blanks are counted and one tap away, the athlete's
   profile fills what it can, and each account keeps its own saved copy (public.template_edits, migration 024). ---------- */
let TPL = null;   /* { id, def: {subject, body}, cur: {subject, body}, saved, msg, ck: {} } */
function splitTpl(raw) {
  const t = String(raw || "").replace(/\r/g, ""), at = re => { const m = t.match(re); return m ? m.index : -1; };
  const iB = at(/^Before you start[^\n]*$/m), iH = at(/^How to use this\s*$/m), iS = at(/^Subject line\s*$/m), iE = at(/^Email\s*$/m), iC = at(/^Check before you send\s*$/m), iN = at(/^What.s next[^\n]*$/m);
  if (iS < 0 || iE < 0) return { subject: "", body: t.trim(), before: [], check: [], next: "", how: "" };
  const cut = (a, b) => a < 0 ? "" : t.slice(a, b < 0 ? undefined : b);
  const lines = s => s.split("\n").slice(1).map(x => x.replace(/^\s*[✅•-]\s*/, "").trim()).filter(Boolean);
  const endE = [iC, iN].filter(x => x > iE).sort((a, b) => a - b)[0] ?? -1;
  return { before: iB >= 0 ? lines(cut(iB, [iH, iS].filter(x => x > iB).sort((a, b) => a - b)[0] ?? iS)) : [],
    how: iH >= 0 ? lines(cut(iH, iS)).join(" ") : "",
    subject: cut(iS, iE).split("\n").slice(1).join("\n").trim(), body: cut(iE, endE).split("\n").slice(1).join("\n").trim(),
    check: iC >= 0 ? lines(cut(iC, iN > iC ? iN : -1)) : [], next: iN >= 0 ? t.slice(iN).split("\n")[0].trim() : "" };
}
const blanks = s => (String(s || "").match(/\[[^\]\n]{1,60}\]/g) || []);
function fillProfile(s) {
  const sub = PSUB() || D, ms = (sub.marks || []).filter(m => m[0] && m[1]), ev = m => evName(m[0], sub.gender), map = {
    "first last": nameOf(sub), "your name": nameOf(sub), "grad year": sub.year, "gpa": sub.gpa, "high school": sub.school, "your high school": sub.school,
    "state": sub.state, "event": ms[0] && ev(ms[0]), "your events": ms.map(ev).join(", "), "best mark": ms[0] && ms[0][1], "insert best marks": ms.map(m => ev(m) + " " + m[1]).join(", "),
    "phone": D.phone || sub.phone };
  let i = 0;
  s = s.replace(/\[Event\],\s*\[Mark\]/g, x => { const m = ms[i++]; return m ? `${ev(m)}, ${m[1]}` : x; });
  return s.replace(/\[([^\]\n]{1,60})\]/g, (x, k) => { const v = map[k.trim().toLowerCase()]; return v ? String(v) : x; });
}
function loadTpl(it, d) {
  const def = splitTpl(d.body);
  const filled = { subject: fillProfile(def.subject), body: fillProfile(def.body) };
  TPL = { id: it.id, def, filled, cur: Object.assign({}, filled), saved: false, msg: "", ck: {} };
  core.api("/rest/v1/template_edits?item_id=eq." + encodeURIComponent(it.id) + "&select=subject,body", {}).then(r => {
    if (!TPL || TPL.id !== it.id || !r || !r[0]) return; TPL.cur = { subject: r[0].subject ?? def.subject, body: r[0].body ?? def.body }; TPL.saved = true; render(); }).catch(() => {});
}
function tplEditor(it) {
  const T = TPL, n = blanks(T.cur.subject).length + blanks(T.cur.body).length, uniq = [...new Set(blanks(T.cur.subject).concat(blanks(T.cur.body)))];
  const edited = T.cur.subject !== T.filled.subject || T.cur.body !== T.filled.body;
  const ckl = (k, arr, title) => arr.length ? `<div class="tpcard"><h3>${title}</h3><ul class="tpck">${arr.map((x, i) => { const on = !!T.ck[k + i];
    return `<li><button type="button" class="${on ? "on" : ""}" data-onb="tpck" data-v="${k + i}" aria-pressed="${on}"><span class="bx" aria-hidden="true">${on ? CCHK : ""}</span><span class="tx">${esc(x)}</span></button></li>`; }).join("")}</ul></div>` : "";
  return `<div class="tpwrap"><div class="tped">
    <div class="tphead"><span class="tpstat ${n ? "" : "ok"}">${n ? `${n} blank${n === 1 ? "" : "s"} left` : `${CCHK} Ready to send`}</span>
      <span class="tpsave">${T.msg ? esc(T.msg) : T.saved ? "Saved to your account" : edited ? "Not saved yet" : "Default template"}</span></div>
    ${T.def.subject || T.cur.subject ? `<label class="tplab" for="tpsub">Subject line</label><div class="tprow"><input id="tpsub" class="tpin" data-tp="subject" value="${esc(T.cur.subject)}" autocomplete="off" spellcheck="true"><button type="button" class="onbback tpcp" data-onb="tpcopy" data-v="subject">Copy</button></div>` : ""}
    <label class="tplab" for="tpbody">${/^7d-dm/.test(it.id) ? "Message" : "Email"}</label>
    <textarea id="tpbody" class="tpta" data-tp="body" spellcheck="true" rows="16">${esc(T.cur.body)}</textarea>
    ${uniq.length ? `<div class="tpblanks"><small>Tap a blank to jump to it</small>${uniq.map(b => `<button type="button" class="tpb" data-onb="tpjump" data-v="${esc(b)}">${esc(b)}</button>`).join("")}</div>` : ""}
    <div class="tpact"><button type="button" class="onbback" data-onb="tpfill">Refill my details</button><button type="button" class="acbtn" data-onb="tpcopy" data-v="body">Copy ${/^7d-dm/.test(it.id) ? "message" : "email"}</button>
      <button type="button" class="onbback" data-onb="tpsave">Save</button>${edited || T.saved ? `<button type="button" class="onbback" data-onb="tpreset">Reset to default</button>` : ""}
</div><p class="tpnote">Copy it and send from your own email. Nothing is sent from this site.</p></div>
    <aside class="tprail">${T.def.how ? `<div class="tpcard"><h3>How to use this</h3><p>${esc(T.def.how)}</p></div>` : ""}${ckl("b", T.def.before, "Before you start, have these ready")}${ckl("c", T.def.check, "Check before you send")}
      ${T.def.next ? `<div class="tpcard tpnext"><p>${esc(T.def.next)}</p></div>` : ""}</aside></div>`;
}
function tplAction(a, b) {
  if (!TPL) return false;
  if (a === "tpfill") { TPL.cur = { subject: fillProfile(TPL.cur.subject), body: fillProfile(TPL.cur.body) }; TPL.msg = "Filled from your profile. Check it, then save."; render(); return true; }
  if (a === "tpjump") { const ta = document.getElementById("tpbody"), su = document.getElementById("tpsub"), v = b.dataset.v;
    for (const el of [su, ta]) { if (!el) continue; const i = el.value.indexOf(v); if (i >= 0) { el.focus(); el.setSelectionRange(i, i + v.length); return true; } } return true; }
  if (a === "tpcopy") { const t = b.dataset.v === "subject" ? TPL.cur.subject : TPL.cur.body; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = "Copied"; setTimeout(() => { b.textContent = b.dataset.v === "subject" ? "Copy" : "Copy email"; }, 1600); }).catch(() => {}); return true; }
  if (a === "tpck") { TPL.ck[b.dataset.v] = !TPL.ck[b.dataset.v]; render(); return true; }
  if (a === "tpsave") { TPL.msg = "Saving…"; render(); core.api("/rest/v1/template_edits", { method: "POST", body: { item_id: TPL.id, subject: TPL.cur.subject, body: TPL.cur.body, updated_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates,return=minimal" })
      .then(() => { TPL.saved = true; TPL.msg = "Saved to your account"; render(); }).catch(e => { TPL.msg = "Couldn't save. " + e.message; render(); }); return true; }
  if (a === "tpreset") { if (!confirm("Reset this template to the original? Your saved changes will be removed.")) return true; TPL.cur = Object.assign({}, TPL.filled); TPL.msg = "Back to the original";
    core.api("/rest/v1/template_edits?item_id=eq." + encodeURIComponent(TPL.id), { method: "DELETE" }).catch(() => {}); TPL.saved = false; render(); return true; }
  return false;
}
document.addEventListener("input", e => { const el = e.target.closest && e.target.closest("[data-tp]"); if (!el || !TPL) return; TPL.cur[el.dataset.tp] = el.value; TPL.msg = "";
  if (el.tagName === "TEXTAREA") { el.style.height = "auto"; el.style.height = el.scrollHeight + 4 + "px"; }
  const n = blanks(TPL.cur.subject).length + blanks(TPL.cur.body).length, st = document.querySelector(".tpstat"), sv = document.querySelector(".tpsave");
  if (st) { st.className = "tpstat" + (n ? "" : " ok"); st.innerHTML = n ? `${n} blank${n === 1 ? "" : "s"} left` : `${CCHK} Ready to send`; }
  if (sv) sv.textContent = "Not saved yet"; });
/* ---------- what each Whop purchase unlocks (migration 022: Whop webhook -> entitlements, claimed by email on sign-in) ---------- */
const BUY = { lt27: LT_URL, em17: LT_URL };   /* Abe's Whop sales page; swap in direct Whop checkout links for the $17 / $97 add-ons when Abe sends them */
const PRODS = {
  lt27: { name: "Premium + 7-Day Roadmap", price: "$27 one time", gets: ["The 7-Day Roadmap course: videos, email and DM templates, checklist and tracker", "My College List: rank up to 25 colleges against your marks", "Premium Dark and Premium White for the whole site"] },
  em17: { name: "Coach emails", price: "$17 add-on to the $27 7-Day Roadmap", gets: ["Every college coach's name, position and email", "The coach for your event first", "A dedicated coach page for every school"] },};
const owns = k => k === "lt27" ? core.premium() : k === "em17" ? core.emails() : k === "pc97" ? !!(core.admin() || (core.premiumInfo() || {}).call) : true;
const NEEDS = { list: "lt27", cc: "em17" };
let BUYK = null, BUYMSG = "";
const buyUrl = (k, where) => utm(BUY[k], "lock-" + k + "-" + where);
function buyView(k) {
  const P = PRODS[k], em = (core.premiumInfo() || {}).email || (core.ses() && core.ses().user ? core.ses().user.email : "");
  return `<div class="pmbuy"><span class="pmpill">${CLOCK} Locked</span><h1>${esc(P.name)}</h1><p class="pmbuyp">${esc(P.price)}</p>
    <ul class="pmbuyl">${P.gets.map(g => `<li>${esc(g)}</li>`).join("")}</ul>
    <a class="acbtn pmbuyb" href="${esc(buyUrl(k, "page"))}" target="_blank" rel="noopener">Get it on Whop</a>
    <div class="pmunl"><h2>How it unlocks</h2><ol>
      <li>Check out on Whop with <b>${em ? esc(em) : "the email you use here"}</b>.</li>
      <li>Stay signed in here with that same email. There's nothing to enter.</li>
      <li>It unlocks on its own, usually within a minute. Your Whop email also has every asset.</li></ol>
      <p>Used a different email at checkout? Sign in here with that email instead, or reply to your Whop receipt and we'll move it over.</p>
      <button type="button" class="onbback" data-onb="recheck">I already bought it. Check again</button>${BUYMSG ? `<p class="pmbuym" role="status">${BUYMSG}</p>` : ""}</div></div>`;
}
const PSUB = () => par() ? KIDS[SEL] : D;
const aid = () => par() && KIDS[SEL] ? KIDS[SEL].id : null;
const CATS = [["dream", "Dream"], ["target", "Target"], ["reach", "Reach"]];
const catL = k => (CATS.find(c => c[0] === k) || CATS[1])[1];
function bestMark(sub) { const C = core.cfg(); const ms = (sub && sub.marks || []).filter(m => m[0] && m[1]).map(m => ({ e: m[0], m: m[1], v: C.parse ? C.parse(m[1], m[0]) : null })).filter(m => m.v != null);
  ms.forEach(m => { m.n = C.fits ? C.fits(m.e, sub.gender || "m", m.v) : 0; }); return ms.sort((a, b) => b.n - a.n); }
function fitChip(info) { if (!info) return ""; const t = info.tier; return `<span class="pmfit ${t ? "t" + t : "tx"}">${t === "T" ? "At Target" : t === "R" ? "At Recruit" : t === "W" ? "At Walk-On" : "Above your mark"}</span>`; }
function sideNav() {
  const it = (v, l, ic, st) => { const k = NEEDS[v], lk = k && !owns(k);
    return `<button type="button" class="pmnv${PT === v ? " on" : ""}${lk ? " lk" : ""}" data-onb="pt" data-v="${v}"${PT === v ? ' aria-current="page"' : ""}${lk ? ' aria-label="' + l + ' (locked)"' : ""}><span class="ic" aria-hidden="true">${ic}</span>${l}${lk ? `<span class="pmlk">${CLOCK}</span>` : st ? STAR : ""}</button>`; };
  /* admins: Accounts first (Ryan 2026-11-12: "I can no longer see the accounts on my master account"; it had moved to the end of the menu, off-screen on phones) */
  const adm = core.admin() ? `<p class="pmgrp">Admin</p>${it("admin", "Accounts", ico("users"))}${it("aov", "Overview", ico("chart"))}<p class="pmgrp">Your account</p>` : "";
  const P = core.premium();
  return `<nav class="pmside" aria-label="Your account">${adm}${it("dash", "Dashboard", ico("home"))}${it("course", "Classroom", ico("cap"), 1)}${it("cc", "Coach Contacts", ico("mail"), 1)}${it("list", "My Colleges", ico("bookmark"), 1)}
    ${modNav()}<p class="pmgrp">Account</p>${it("profile", "Profile and marks", ico("user"))}${it("set", "Settings", ico("sliders"))}
    <div class="pmplan">${P ? `<b>${STAR} ${core.admin() ? "Admin" : "Premium"}</b><span><i class="dot"></i>${core.admin() ? "Everything unlocked" : "Active"}</span>`
      : `<b>Free account</b><span>Unlock the course, college list and more.</span><a class="acbtn" href="${esc(buyUrl("lt27", "sidebar"))}" target="_blank" rel="noopener">Get Premium · $27</a>`}</div></nav>`;
}
/* the course outline in the sidebar (Ryan 2026-11-12: "a bunch of locks on the left side"): each module, locked until bought */
function modNav() {
  if (!CAT || CAT.err) return "";
  const mods = []; for (const x of CAT) if (x.course === "7day") { let m = mods.find(y => y.t === x.section); if (!m) mods.push(m = { t: x.section, items: [] }); m.items.push(x); }
  if (!mods.length) return "";
  const nav = m => { const lk = !m.items.some(i => i.unlocked), part = !lk && m.items.some(i => !i.unlocked), on = PT === "course" && CRS === "7day" && LES && LES.section === m.t;
    return `<button type="button" class="pmnv pmmod${on ? " on" : ""}${lk ? " lk" : ""}" data-onb="cmod" data-v="${esc(m.t)}"${lk ? ' aria-label="' + esc(m.t) + ' (locked)"' : ""}><span class="ic" aria-hidden="true">${m.items.every(i => i.done) ? CCHK : ico("dot", 14)}</span><span class="pmmt">${esc(m.t.replace(/^Email templates: /, ""))}</span>${lk || part ? `<span class="pmlk">${CLOCK}</span>` : ""}</button>`; };
  const tp = "Email templates: ", days = mods.filter(m => !m.t.startsWith(tp)), tpl = mods.filter(m => m.t.startsWith(tp));
  return `<p class="pmgrp">7-Day Roadmap</p>` + days.map(nav).join("") + (tpl.length ? `<p class="pmgrp">Email templates</p>` + tpl.map(nav).join("") : "");
}
/* phone: app-style bottom bar + a full menu sheet (Ryan 2026-11-12: "premium website customization for mobile/phone views") */
let SHEET = false;
function phoneNav() {
  const b = (v, l, ic) => `<button type="button" class="pmtb${PT === v ? " on" : ""}" data-onb="pt" data-v="${v}"${PT === v ? ' aria-current="page"' : ""}><span aria-hidden="true">${ic}</span>${l}</button>`;
  return `<nav class="pmtabs" aria-label="Account menu">${b("dash", "Home", ico("home", 20))}${b("course", "Course", ico("cap", 20))}${b("cc", "Coaches", ico("mail", 20))}${b("list", "Colleges", ico("bookmark", 20))}
    <button type="button" class="pmtb${SHEET ? " on" : ""}" data-onb="sheet" aria-expanded="${SHEET}"><span aria-hidden="true">${ico("menu", 20)}</span>Menu</button></nav>
    ${SHEET ? `<div class="pmsheetbg" data-onb="sheet"></div><div class="pmsheet" role="dialog" aria-label="Menu">${sideNav()}</div>` : ""}`;
}
let PTADM = false;
function premiumView() {
  const C = core.cfg();
  if (!CAT) loadCat();
  if (!PTADM && core.admin()) { PTADM = true; if (PT === "dash") PT = "admin"; }
  if ((PT === "list" || PT === "dash") && core.premium()) { const k = aid() || "me"; if (LISTK !== k) { LISTK = k; LIST = null; loadList(); } }
  let body = "";
  if (NEEDS[PT] && !owns(NEEDS[PT])) body = buyView(NEEDS[PT]);
  else if (PT === "buy" && BUYK) body = buyView(BUYK);
  else if (PT === "dash") body = dashView(); else if (PT === "list") body = listView(); else if (PT === "cc") body = ccView(); else if (PT === "set") body = setView(); else if (PT === "course") body = courseView();
  else if (PT === "aov" && core.admin()) body = aovView(); else if (PT === "admin" && core.admin()) body = adminView();
  else body = D.role === "athlete" ? `<div class="prwrap">${profileCard(D)}${footer()}</div>` : par() ? parentView() : `<div class="prwrap">${profileCard(D, true)}${footer()}</div>`;
  return top(NAV) + `<div class="pmshell">${sideNav()}<section class="pmmain">${body}</section></div>` + phoneNav();
}
function headRow() {
  const sub = PSUB() || D, C = core.cfg(), ms = bestMark(sub).slice(0, 3);
  return `<div class="pmhead"><span class="pcav pmav">${avatarHtml(sub, 20)}</span><div class="pmwho"><h1>${esc(nameOf(sub) || "Your profile")} <span class="pmpill">${core.admin() ? "Admin" : core.premium() ? STAR + " Premium" : "Free"}</span></h1>
    <p>${esc([sub.year ? "Class of " + sub.year : "", sub.school || ""].filter(Boolean).join(" · "))}</p></div>
    <div class="pmmarks">${ms.length ? ms.map(m => `<div class="pmmk"><small>${evName(m.e, sub.gender)}</small><b>${esc(m.m)}</b><span>${m.n.toLocaleString()} colleges fit</span></div>`).join("")
      : `<button type="button" class="pmmk add" data-onb="pt" data-v="profile">+ Add a mark</button>`}</div></div>`;
}
function dashView() {
  if (!core.premium()) return headRow() + `<div class="pmpaths">
    <button type="button" class="pmpath pri" data-onb="pt" data-v="course"><span class="ic" aria-hidden="true">${ico("cap")}</span><span><b>The 7-Day Roadmap</b><small>See every lesson. Unlock it with Premium.</small></span><span class="pmgo" aria-hidden="true">›</span></button>
    <button type="button" class="pmpath" data-onb="pt" data-v="cc"><span class="ic" aria-hidden="true">${ico("mail")}</span><span><b>Coach Contacts</b><small>Every college coach's email ($17 add-on)</small></span><span class="pmgo">${CLOCK}</span></button></div>
    <div class="pmcard pmup"><div><h2>${STAR} Premium</h2><p>The 7-Day Roadmap, My College List and Premium Dark. $27 one time.</p></div>
    <a class="acbtn" href="${esc(buyUrl("lt27", "dashboard"))}" target="_blank" rel="noopener">Get Premium on Whop</a>
    <p class="pmupn">Bought it? It unlocks by itself when you're signed in with the email you used at checkout.</p></div>`;
  const L = (LIST || []).slice(0, 5), sub = PSUB() || D, b = bestMark(sub)[0], C = core.cfg();
  return headRow() + `<div class="pmpaths">
    <button type="button" class="pmpath pri" data-onb="pt" data-v="cc"><span class="ic" aria-hidden="true">${ico("mail")}</span><span><b>${STAR} Coach Contacts</b><small>${core.emails() ? "Get any college coach's email" : "Coach emails are the $17 add-on"}</small></span><span class="pmgo" aria-hidden="true">›</span></button>
    <button type="button" class="pmpath" data-onb="pt" data-v="course"><span class="ic" aria-hidden="true">${ico("cap")}</span><span><b>${STAR} Your 7-Day Roadmap</b><small>Videos, templates and tools, one step a day</small></span><span class="pmgo" aria-hidden="true">›</span></button></div>
    <div class="pmcard"><div class="pmch"><h2>My Colleges <small>${LIST ? LIST.length + " of 25" : ""}</small></h2><button type="button" class="onbback" data-onb="pt" data-v="list">${LIST && LIST.length ? "Open list" : "Add colleges"}</button></div>
    ${LIST == null ? `<p class="pmempty">Loading…</p>` : L.length ? L.map((r, i) => { const info = b && C.sinfo ? C.sinfo(r.name, sub.gender || "m", b.e, b.v) : null;
      return `<div class="pmrow"><span class="pmrk">${i + 1}</span><span class="pmnm"><b>${esc(r.name)}</b><small>${esc(info ? info.d : "")}</small></span><span class="pmcat ${r.cat}">${catL(r.cat)}</span>${fitChip(info)}<span class="pmco">${r.coach_name ? STAR + " " + esc(r.coach_name) : ""}</span></div>`; }).join("")
      : `<p class="pmempty">Add up to 25 colleges, rank them, and keep the coach you want to email next to each one.</p>`}</div>`;
}
async function loadList() {
  const a = aid(), k = LISTK;
  const rows = await core.api("/rest/v1/college_list?select=*&order=rank,id&athlete_id=" + (a ? "eq." + a : "is.null")).catch(() => []);
  if (LISTK !== k) return; LIST = rows || []; render();
}
function listView() {
  const sub = PSUB() || D, b = bestMark(sub)[0], C = core.cfg(), L = LIST || [], full = L.length >= 25;
  let rows = L.map((r, i) => ({ r, i, info: b && C.sinfo ? C.sinfo(r.name, sub.gender || "m", b.e, b.v) : null })).filter(x => LF === "all" || x.r.cat === LF);
  if (LSORT === "std") rows = rows.slice().sort((x, y) => (({ T: 0, R: 1, W: 2 })[x.info && x.info.tier] ?? 3) - (({ T: 0, R: 1, W: 2 })[y.info && y.info.tier] ?? 3));
  const drag = LSORT === "rank";
  return `<div class="pmtitle"><h1>My Colleges</h1><p>${L.length} of 25${b ? ` · compared with your ${evName(b.e, sub.gender)} (${esc(b.m)})` : ""}</p></div>
    <div class="pmtool"><form class="pmadd" data-pform="add"><input class="in" id="pmadd" list="pmsch" placeholder="${full ? "Remove one to add another" : "Add a college"}" ${full ? "disabled" : ""} autocomplete="off" aria-label="Add a college"><button class="acbtn" ${full ? "disabled" : ""}>Add</button></form>
      <div class="pmseg" role="group" aria-label="Show">${[["all", "All"], ...CATS].map(([k, l]) => `<button type="button" data-onb="lf" data-v="${k}" aria-pressed="${LF === k}">${l}</button>`).join("")}</div>
      <div class="pmseg" role="group" aria-label="Order">${[["rank", "My ranking"], ["std", "Times vs standards"]].map(([k, l]) => `<button type="button" data-onb="lsort" data-v="${k}" aria-pressed="${LSORT === k}">${l}</button>`).join("")}</div></div>
    ${LMSG ? `<p class="pmmsg" role="status">${esc(LMSG)}</p>` : ""}
    <datalist id="pmsch">${(C.schools ? C.schools() : []).filter(n => !L.some(r => r.name === n)).map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    ${LIST == null ? `<p class="pmempty">Loading…</p>` : !L.length ? `<div class="pmcard"><p class="pmempty">Start with your dream school. Type its name above.</p></div>` : `<ol class="pmlist" id="pmlist">${rows.map(({ r, i, info }) => `<li class="pmli" data-id="${r.id}">
      <div class="pmlr">${drag ? `<button type="button" class="pmh" data-lh="${r.id}" aria-label="Move ${esc(r.name)}, rank ${i + 1}. Use the arrow keys.">⋮⋮</button>` : `<span></span>`}<span class="pmrk">${i + 1}</span>
      <button type="button" class="pmnm" data-onb="school" data-slug="${esc(info ? info.slug : "")}"><b>${esc(r.name)}</b><small>${esc(info ? [info.d, info.c].filter(Boolean).join(" · ") : "")}</small></button>
      <button type="button" class="pmcat ${r.cat}" data-onb="lcat" data-id="${r.id}" aria-label="Category ${catL(r.cat)}. Tap to change.">${catL(r.cat)}</button>
      <span class="pmstd">${fitChip(info)}${info && info.lvs && info.lvs[1] ? `<small>Recruit ${esc(info.lvs[1])}</small>` : ""}</span>
      <span class="pmco">${r.coach_name ? `<b>${STAR} ${esc(r.coach_name)}</b><small>${esc(r.coach_email || "")}</small>` : core.emails() ? `<small class="none">No coach picked</small>` : ""}</span>
      ${core.emails() ? `<button type="button" class="pmexp" data-onb="lopen" data-id="${r.id}" aria-expanded="${OPEN === r.id}" aria-label="Coaches at ${esc(r.name)}">›</button>` : `<span></span>`}</div>
      ${OPEN === r.id ? openRow(r, info) : ""}</li>`).join("")}</ol>`}`;
}
function openRow(r, info) {
  const slug = info && info.slug; if (!slug) return `<div class="pmdrawer"><p class="pmempty">No coaches on file for this college.</p></div>`;
  const rows = ROS[slug];
  if (!rows) { core.api("/rest/v1/rpc/coach_roster", { method: "POST", body: { slug } }).then(x => { ROS[slug] = x || []; render(); }).catch(e => { ROS[slug] = []; LMSG = /limit/.test(e.message) ? "You've opened a lot of colleges today. More open tomorrow." : ""; render(); }); return `<div class="pmdrawer"><p class="pmempty">Loading coaches…</p></div>`; }
  if (!rows.length) return `<div class="pmdrawer"><p class="pmempty">We don't have this college's coaches yet. We add colleges every week.</p><button type="button" class="onbback" data-onb="lrm" data-id="${r.id}">Remove from list</button></div>`;
  return `<div class="pmdrawer">${rows.map(c => `<div class="pmc"><span><b>${esc(c.name)}</b><small>${esc(c.title || "Coach")}${(c.groups || []).length ? " · " + c.groups.join(", ") : ""}</small></span><span class="pmce">${esc(c.email)}</span>
    <button type="button" class="rcopy" data-copy="${esc(c.email)}">Copy</button><button type="button" class="pmtrk" data-onb="ltrack" data-id="${r.id}" data-n="${esc(c.name)}" data-e="${esc(c.email)}" aria-pressed="${r.coach_email === c.email}">${r.coach_email === c.email ? "★ Tracking" : "Track"}</button></div>`).join("")}
    <div class="pmdf"><span>Track one coach to keep them next to this college.</span><button type="button" class="onbback" data-onb="lrm" data-id="${r.id}">Remove from list</button></div></div>`;
}
async function listAdd(name) {
  const C = core.cfg(), list = C.schools ? C.schools() : [], hit = list.find(n => n.toLowerCase() === String(name).trim().toLowerCase());
  if (!hit) { LMSG = "Pick a college from the list."; return render(); }
  if ((LIST || []).some(r => r.name === hit)) { LMSG = hit + " is already on your list."; return render(); }
  if ((LIST || []).length >= 25) { LMSG = "Your list is full. Remove one to add another."; return render(); }
  const sub = PSUB() || D, b = bestMark(sub)[0], info = C.sinfo ? C.sinfo(hit, sub.gender || "m", b && b.e, b && b.v) : null;
  const row = { name: hit, slug: info ? info.slug : hit, cat: info && info.tier ? "target" : "reach", rank: (LIST || []).length, athlete_id: aid() };
  try { const r = await core.api("/rest/v1/college_list", { method: "POST", body: row, prefer: "return=representation" }); LIST.push((r && r[0]) || row); LMSG = hit + " added as " + catL(row.cat) + ".";
    C.log && C.log("college_list", { detail: "add" }); } catch (e) { LMSG = /full/.test(e.message) ? "Your list is full. Remove one to add another." : "Couldn't add it. Try again."; }
  render(); const n = document.getElementById("pmadd"); if (n) n.focus();
}
const patch = (id, body) => core.api("/rest/v1/college_list?id=eq." + id, { method: "PATCH", body }).catch(() => { LMSG = "Couldn't save that change. Check your connection."; render(); });
function saveRanks() { (LIST || []).forEach((r, i) => { if (r.rank !== i) { r.rank = i; patch(r.id, { rank: i }); } }); }
function moveRow(id, to) { const i = LIST.findIndex(r => r.id === id); if (i < 0) return; to = Math.max(0, Math.min(LIST.length - 1, to)); const [r] = LIST.splice(i, 1); LIST.splice(to, 0, r); saveRanks(); render();
  const h = document.querySelector(`[data-lh="${id}"]`); if (h) h.focus(); }
function ccView() {
  const C = core.cfg(), sub = PSUB() || D, b = bestMark(sub)[0];
  if (!core.emails()) return `<div class="pmland"><span class="pmpill">${STAR} Coach Contacts</span><h1>Coach emails are the $17 add-on</h1><p>Your Premium account includes everything else. Questions about adding coach emails? <a href="mailto:support@thepreferredrecruit.com">support@thepreferredrecruit.com</a></p></div>`;
  if (CCS) { const info = C.sinfo ? C.sinfo(CCS, sub.gender || "m", b && b.e, b && b.v) : null;
    setTimeout(() => { const el = document.getElementById("pmcc"); if (el && C.ccLoad) C.ccLoad(el, CCS); }, 0);
    return `<nav class="pmcrumb" aria-label="Breadcrumb"><button type="button" data-onb="ccback" data-v="land">Coach Contacts</button><span>/</span>${CCQ ? `<button type="button" data-onb="ccback" data-v="res">Search</button><span>/</span>` : ""}<span>${esc(CCS)}</span></nav>
      <div class="pmtitle"><h1>${esc(info ? info.t : CCS)}</h1><p>${esc(info ? [info.d, info.c].filter(Boolean).join(" · ") : "")}${info && b ? ` · ${evName(b.e, sub.gender)} ${esc(b.m)} ` : ""}${fitChip(info)}</p></div>
      <div id="pmcc" class="pmccbox"><p class="pmempty">Loading coaches…</p></div>
      <div class="pmdf"><button type="button" class="onbback" data-onb="school" data-slug="${esc(info ? info.slug : "")}">Standards, results and roster</button>${(LIST || []).some(r => r.name === CCS) ? "" : `<button type="button" class="onbback" data-onb="ccadd">+ Add to My Colleges</button>`}</div>`; }
  const q = CCQ.trim().toLowerCase(), all = C.schools ? C.schools() : [], hits = q ? all.filter(n => n.toLowerCase().includes(q)).slice(0, 12) : [];
  const pick = (LIST || []).slice(0, 4);
  return `<div class="pmland"><span class="pmpill">${STAR} Included with Unlimited Access</span><h1>Get any college coach's email</h1><p>Search a college to see its coaches, what each one coaches, and their email. The coach for your event comes first.</p>
    <form class="pmsearch" data-pform="cc" role="search"><input class="in" id="pmcq" list="pmall" value="${esc(CCQ)}" placeholder="Search a college, like Texas State" autocomplete="off" aria-label="Search a college"><button class="acbtn">Search</button></form>
    <datalist id="pmall">${all.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    ${q ? `<div class="pmcard pmres">${hits.length ? hits.map(n => { const info = C.sinfo ? C.sinfo(n, sub.gender || "m", b && b.e, b && b.v) : null;
      return `<button type="button" class="pmrow" data-onb="ccs" data-v="${esc(n)}"><span class="pmnm"><b>${esc(n)}</b><small>${esc(info ? [info.d, info.c].filter(Boolean).join(" · ") : "")}</small></span>${fitChip(info)}<span class="pmgo" aria-hidden="true">›</span></button>`; }).join("") : `<p class="pmempty">No college matches "${esc(CCQ)}". Try part of the name.</p>`}</div>`
      : pick.length ? `<div class="pmquick"><p>From My Colleges</p><div>${pick.map(r => `<button type="button" class="pmq" data-onb="ccs" data-v="${esc(r.name)}"><b>${esc(r.name)}</b><span class="pmcat ${r.cat}">${catL(r.cat)}</span></button>`).join("")}</div></div>` : ""}
    <ol class="pmunl"><li><b>Search a college</b><span>Any college on Track Standards</span></li><li><b>Find your event's coach</b><span>Listed first, with their title</span></li><li><b>Copy the email</b><span>Send it from your own inbox</span></li></ol></div>`;
}
function setView() {
  const t = core.theme();
  return `<div class="pmtitle"><h1>Settings</h1><p>Signed in as ${esc(core.ses() ? core.ses().user.email : "")}</p></div>
    <div class="pmcard pmset"><h2>Look</h2><p>Your choice follows you on every page of Track Standards.</p>
    <div class="pmthemes" role="radiogroup" aria-label="Look">${[["dark", "Premium Dark", "Sleek and dark"], ["light", "Premium White", "Clean and bright"]].map(([k, l, d]) => `<button type="button" role="radio" aria-checked="${t === k}" class="pmth ${k}" data-onb="ptheme" data-v="${k}"><span class="sw" aria-hidden="true"></span><b>${l}</b><small>${d}</small></button>`).join("")}</div></div>
    <div class="pmcard pmset"><h2>Your plan</h2><p>${core.admin() ? "Admin account: Premium and coach emails are always on." : `${STAR} Premium${core.emails() ? " with coach emails" : ""}. One-time purchase, lifetime access.`}</p>
    <div class="pmdf"><button type="button" class="onbback" data-onb="pt" data-v="course">Go to Course</button><button type="button" class="onbback" data-onb="out">Sign out</button></div></div>`;
}
function aovView() {
  if (!AOV) { core.api("/rest/v1/rpc/admin_overview", { method: "POST", body: {} }).then(x => { AOV = x || {}; render(); }).catch(e => { AOV = { err: e.message }; render(); }); return `<div class="pmtitle"><h1>Overview</h1></div><p class="pmempty">Loading…</p>`; }
  if (AOV.err) return `<div class="pmtitle"><h1>Overview</h1></div><p class="acerr">${esc(AOV.err)}</p>`;
  const n = k => (AOV[k] || 0).toLocaleString(), k = (l, v, s) => `<div class="pmkpi"><small>${l}</small><b>${v}</b><span>${s}</span></div>`;
  return `<div class="pmtitle"><h1>Overview</h1><p>Live from the accounts database</p></div>
    <div class="pmkpis">${k("Accounts", n("accounts"), "+" + n("new_week") + " this week")}${k("Finished profiles", n("finished"), Math.round((AOV.finished || 0) / Math.max(1, AOV.accounts || 1) * 100) + "% of accounts")}
      ${k(STAR + " Premium ($27)", n("premium"), "+" + n("premium_week") + " this week")}${k("Coach emails ($17)", n("emails"), n("waiting") + " orders waiting for an account")}
      ${k("Colleges opened", n("lists_opened_week"), "coach lists, last 7 days")}${k("Colleges listed", n("colleges_listed"), "on My College Lists")}</div>
    <div class="pmdf"><button type="button" class="acbtn" data-onb="pt" data-v="admin">Open all accounts</button><button type="button" class="onbback" data-onb="aovr">Refresh</button></div>`;
}
/* drag to rank: pointer events (mouse and touch), keyboard arrows on the handle */
let DRG = null;
document.addEventListener("pointerdown", e => { const h = e.target.closest && e.target.closest("[data-lh]"); if (!h || PT !== "list") return; e.preventDefault();
  const li = h.closest(".pmli"); DRG = { li, id: +h.dataset.lh, y0: e.clientY, moved: false, last: undefined }; try { h.setPointerCapture(e.pointerId); } catch (x) {} });
document.addEventListener("pointermove", e => { if (!DRG) return; if (!DRG.moved && Math.abs(e.clientY - DRG.y0) < 4) return;
  if (!DRG.moved) { DRG.moved = true; DRG.li.classList.add("drag"); }
  const ol = document.getElementById("pmlist"); if (!ol) return; const others = [...ol.children].filter(x => x !== DRG.li); let before = null;
  for (const o of others) { const r = o.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = o; break; } }
  if (DRG.last !== before) { DRG.last = before; const t0 = DRG.li.getBoundingClientRect().top; ol.insertBefore(DRG.li, before); DRG.y0 += DRG.li.getBoundingClientRect().top - t0; }
  DRG.li.style.transform = `translateY(${e.clientY - DRG.y0}px)`; });
function dragEnd() { if (!DRG) return; const d = DRG; DRG = null; d.li.classList.remove("drag"); d.li.style.transform = ""; if (!d.moved) return;
  const order = [...document.querySelectorAll("#pmlist .pmli")].map(x => +x.dataset.id);
  if (LF === "all") LIST.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  else { const pos = LIST.map((r, i) => r.cat === LF ? i : -1).filter(i => i >= 0), moved = order.map(id => LIST.find(r => r.id === id)); pos.forEach((p, k) => { LIST[p] = moved[k]; }); }
  saveRanks(); render(); }
document.addEventListener("pointerup", dragEnd); document.addEventListener("pointercancel", dragEnd);
document.addEventListener("keydown", e => { const h = e.target.closest && e.target.closest("[data-lh]"); if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return; e.preventDefault();
  const id = +h.dataset.lh, i = LIST.findIndex(r => r.id === id); moveRow(id, i + (e.key === "ArrowUp" ? -1 : 1)); });
document.addEventListener("submit", e => { const f = e.target.closest && e.target.closest("[data-pform]"); if (!f) return; e.preventDefault();
  if (f.dataset.pform === "add") listAdd(document.getElementById("pmadd").value);
  if (f.dataset.pform === "cc") { CCQ = document.getElementById("pmcq").value; const all = core.cfg().schools ? core.cfg().schools() : [], hit = all.find(n => n.toLowerCase() === CCQ.trim().toLowerCase()); if (hit) CCS = hit; render(); const C = core.cfg(); C.log && C.log("coach_contacts", { detail: "search" }); } });
function premiumAction(a, b) {
  if (a === "pt") { SHEET = false; BUYMSG = ""; PT = b.dataset.v; OPEN = null; LMSG = ""; if (PT === "cc") { CCS = null; } if (PT === "course") { CRS = null; LES = null; CMSG = ""; } render(); layer().scrollTo(0, 0); return true; }
  if (a === "cl") { SHEET = false; openLesson(b.dataset.v); return true; }
  if (a === "sheet") { SHEET = !SHEET; render(); return true; }
  if (a === "recheck") { BUYMSG = "Checking…"; render(); core.loadProfile().then(() => { const k = BUYK || NEEDS[PT]; BUYMSG = k && owns(k) ? "Unlocked. You're all set." : "Not unlocked yet. If you just paid, give it a minute and check again."; CAT = null; render(); }); return true; }
  if (a === "cback") { CRS = null; LES = null; LESD = null; VSRC = null; render(); layer().scrollTo(0, 0); return true; }
  if (a === "copen") { const c = courseList().find(x => x.k === b.dataset.v); if (!c) return true; CRS = c.k; LES = null; render(); layer().scrollTo(0, 0); return true; }
  if (/^tp/.test(a) && tplAction(a, b)) return true;
  if (a === "cmod") { SHEET = false; PT = "course"; CRS = "7day"; LES = null; MODQ = b.dataset.v; render(); layer().scrollTo(0, 0); return true; }
  if (a === "cdone") { if (LES) markDone(LES, !LES.done); return true; }
  if (a === "ccopy") { const t = LESD && LESD.body || ""; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy template"; }, 1800); }).catch(() => { b.textContent = "Select and copy the text below"; }); return true; }
  if (a === "ptheme") { core.setTheme(b.dataset.v); render(); return true; }
  if (a === "lf") { LF = b.dataset.v; render(); return true; }
  if (a === "lsort") { LSORT = b.dataset.v; render(); return true; }
  if (a === "lcat") { const r = LIST.find(x => x.id === +b.dataset.id); if (!r) return true; const o = ["dream", "target", "reach"]; r.cat = o[(o.indexOf(r.cat) + 1) % 3]; patch(r.id, { cat: r.cat }); render();
    const n = document.querySelector(`[data-onb="lcat"][data-id="${r.id}"]`); if (n) n.focus(); return true; }
  if (a === "lopen") { const id = +b.dataset.id; OPEN = OPEN === id ? null : id; render(); return true; }
  if (a === "ltrack") { const r = LIST.find(x => x.id === +b.dataset.id); if (!r) return true; r.coach_name = b.dataset.n; r.coach_email = b.dataset.e; patch(r.id, { coach_name: r.coach_name, coach_email: r.coach_email }); render(); return true; }
  if (a === "lrm") { const id = +b.dataset.id, r = LIST.find(x => x.id === id); if (!r || !confirm(`Remove ${r.name} from your list?`)) return true; LIST = LIST.filter(x => x.id !== id); OPEN = null;
    core.api("/rest/v1/college_list?id=eq." + id, { method: "DELETE" }).catch(() => {}); saveRanks(); render(); return true; }
  if (a === "ccs") { CCS = b.dataset.v; render(); layer().scrollTo(0, 0); return true; }
  if (a === "ccback") { if (b.dataset.v === "land") CCQ = ""; CCS = null; render(); return true; }
  if (a === "ccadd") { const n = CCS; PT = "list"; LISTK = null; render(); setTimeout(() => listAdd(n), 300); return true; }
  if (a === "aovr") { AOV = null; render(); return true; }
  return false;
}
function simpleDone() {
  return `<div class="onbwrap one"><section class="onbmain onbdone"><span class="onbok">${svg(CHECK, 26)}</span><h1>Your account is ready</h1>
    <p class="onbsub">Every standard, full results list and unlimited Recruiting AI is open to you now.</p>
    <div class="onbcta"><button type="button" class="acbtn" data-onb="exit">Go to the standards</button><button type="button" class="onbback" data-onb="edit">Edit account</button><button type="button" class="onbback" data-onb="out">Sign out</button></div>
    <p class="onbmail">Signed in as ${esc(core.ses() ? core.ses().user.email : "")}</p></section></div>`;
}
const who = () => VIEW_AS ? "Account email: " + esc(VIEW_AS.email) : "Signed in as " + esc(core.ses() ? core.ses().user.email : "");
const footer = () => `<section class="prmore"><div></div><div class="prfoot"><p class="onbmail">${who()}. Profiles are private: only you and the Preferred Recruit team can see them.</p><button type="button" class="onbback" data-onb="out">Sign out</button></div></section>`;
function parentView() {
  const kid = KIDS[SEL];
  return `<div class="prwrap"><div class="prkids"><div class="prkh"><h2>${VIEW_AS ? "Athletes" : "Your athletes"}</h2><span>${KIDS.length} on this account</span></div><div class="prkl">
    ${KIDS.map((k2, i) => `<button type="button" class="prkid${i === SEL ? " on" : ""}" data-onb="kid" data-i="${i}"><span class="pcav sm">${avatarHtml(k2, 18)}</span><span><b>${esc(nameOf(k2))}</b><small>${esc([CLASSES.find(c => c[0] === +k2.year) ? "Class of " + k2.year : "", k2.marks[0] ? (core.cfg().evName ? core.cfg().evName(k2.marks[0][0], k2.gender) : k2.marks[0][0]) : ""].filter(Boolean).join(" · "))}</small></span></button>`).join("")}
    <button type="button" class="prkid add" data-onb="addkid"><span class="pcav sm">+</span><span><b>Add another athlete</b><small>Brother, sister, any of your kids</small></span></button></div></div>
    ${kid ? profileCard(kid) : `<section class="onbmain onbdone"><h1>Add your first athlete</h1><p class="onbsub">Their PRs, GPA and college matches live here.</p><button type="button" class="acbtn" data-onb="addkid">Add athlete</button></section>`}
    <section class="prmore"><div><h2 class="prh2">You</h2><div class="pcr"><span>Name</span><b>${esc(nameOf(D)) || "<i>Not added yet</i>"}</b></div><div class="pcr"><span>Phone</span><b>${esc(D.phone) || "<i>Not added yet</i>"}</b></div><button type="button" class="onbback" data-onb="edit">Edit your details</button></div>
      <div class="prfoot"><p class="onbmail">${who()}. Profiles are private: only you and the Preferred Recruit team can see them.</p><button type="button" class="onbback" data-onb="out">Sign out</button></div></section></div>`;
}
/* one athlete's page: banner (theme or photo), photo, basics, stats per event */
function profileCard(sub, lite) {
  const C = core.cfg(), marks = (sub.marks || []).filter(m => m[0] && m[1]), cls = CLASSES.find(c => c[0] === +sub.year);
  const stats = marks.map(([e, m]) => { const v = C.parse(m, e); return { e, m, st: v != null && C.stats ? C.stats(e, sub.gender, v) : null }; });
  const best = stats.filter(x => x.st).sort((a, b) => b.st.n - a.st.n)[0];
  const tile = (v, l) => `<div class="prtile"><b>${v}</b><span>${l}</span></div>`;
  const evCard = ({ e, m, st }) => { const n = st ? st.n : 0, w = k => n ? Math.max(st[k] / n * 100, st[k] ? 4 : 0) : 0;
    const isNew = NEWPR && NEWPR.id === (sub.id || "self") && NEWPR.ev.includes(e);
    return `<article class="prev${isNew ? " newpr" : ""}"><header><span>${evName(e, sub.gender)}${isNew ? '<em class="prnew">New PR</em>' : ""}</span><b>${esc(m)}</b></header>
      ${st ? `<div class="prfit"><b>${n.toLocaleString()}</b><span>college programs fit this mark</span></div>
      <div class="prbar" role="img" aria-label="${st.T} Target, ${st.R} Recruit, ${st.W} Walk-On"><i class="T" style="width:${w("T")}%"></i><i class="R" style="width:${w("R")}%"></i><i class="W" style="width:${w("W")}%"></i></div>
      <div class="prlv"><span><i class="T"></i>${st.T} Target</span><span><i class="R"></i>${st.R} Recruit</span><span><i class="W"></i>${st.W} Walk-On</span></div>
      ${st.near ? `<p class="prnear">${esc(st.near.gap)} from ${esc(st.near.lv)} level at ${st.near.n} more programs</p>` : ""}
      ${st.top.length ? `<ul class="prtop">${st.top.map(t => `<li><a href="/schools/${esc(t.slug)}" data-onb="school" data-slug="${esc(t.slug)}">${esc(t.n)}</a><small>${esc(t.d)} · ${esc(t.lv)}</small></li>`).join("")}</ul>` : ""}
      <div class="prevact"><button type="button" class="onbback" data-onb="see" data-g="${esc(sub.gender)}" data-e="${esc(e)}" data-m="${esc(m)}">See all ${n.toLocaleString()} colleges</button><button type="button" class="aclnk" data-onb="quick" data-v="events">Update</button></div>` : `<p class="prnear">No college standards for this event yet.</p><button type="button" class="aclnk" data-onb="quick" data-v="events">Update</button>`}</article>`; };
  const bannerImg = sub.banner && IMG[sub.banner], theme = sub.theme || "violet", own = par() ? "their" : "your";
  return `<section class="prhero"><div class="prband bt-${esc(theme)}${bannerImg ? " img" : ""}"${bannerImg ? ` style="background-image:url('${bannerImg}')"` : ""}>
      <button type="button" class="prbbtn" data-onb="banner">${svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', 15)}<span>Customize banner</span></button>
      ${BANNER ? `<div class="prbpick" role="dialog" aria-label="Banner"><b>Banner</b><div class="prsw">${THEMES.map(([v, l]) => `<button type="button" class="bt-${v}${!bannerImg && theme === v ? " on" : ""}" data-onb="theme" data-v="${v}" title="${l}" aria-label="${l}"></button>`).join("")}</div>
        <label class="prup">${svg(CAM, 16)}Upload a banner photo<input type="file" accept="image/jpeg,image/png,image/webp" data-onb-file="banner" hidden></label>${IMGBUSY === "banner" ? "<small>Uploading…</small>" : "<small>Wide photos work best.</small>"}</div>` : ""}</div>
    <div class="prhead"><div class="prav${IMGBUSY === "avatar" ? " busy" : ""}">${sub.avatar && IMG[sub.avatar] ? `<img src="${IMG[sub.avatar]}" alt="${esc(nameOf(sub))}">` : `<span>${esc(initials(sub) || "PR")}</span>`}
        <label class="prcam" title="${sub.avatar ? "Change photo" : "Add a photo"}">${svg(CAM, 18)}<input type="file" accept="image/jpeg,image/png,image/webp" data-onb-file="avatar" hidden></label></div>
      <div class="prid"><h1>${esc(nameOf(sub))}${vb(22)}</h1>${(VIEW_AS ? VIEW_AS.ver : core.prVerified()) ? `<p class="prvl">Verified Preferred Recruit athlete</p>` : ""}<p>${lite ? (D.role === "coach" ? "Coach" : "Fan") : esc([cls ? "Class of " + cls[0] : sub.year ? "In college" : "", sub.gender ? (sub.gender === "m" ? "Men's" : "Women's") + " track and field" : "", sub.school, core.ST[sub.state]].filter(Boolean).join(" · "))}</p>
        ${IMGERR ? `<p class="acerr">${esc(IMGERR)}</p>` : !sub.avatar ? `<button type="button" class="aclnk" data-onb="pick" data-v="avatar">Add a profile photo</button>` : ""}</div>
      <div class="pract"><button type="button" class="onbx" data-onb="${par() ? "editkid" : "edit"}">Edit profile</button></div></div>
    ${lite ? `<div class="prlite"><p>${D.role === "coach" ? "Coach account" : "Fan account"}${IS_ADMIN && !VIEW_AS ? " · Admin" : ""}. Every standard, full results list and unlimited Recruiting AI is open to you.</p><div class="onbcta"><button type="button" class="acbtn" data-onb="exit">Go to the standards</button>${IS_ADMIN ? `<button type="button" class="onbback" data-onb="tab" data-v="admin">Open the Accounts dashboard</button>` : ""}</div><p class="onbmail">Want a recruiting profile with PRs and college matches? Tap Edit profile and choose athlete or parent.</p></div></section>` : `
    <div class="prtiles">${tile(marks.length, marks.length === 1 ? "Event" : "Events")}${tile(best ? best.st.n.toLocaleString() : "–", `Programs ${own} best mark fits`)}${tile(esc(sub.gpa) || "–", `GPA <button type="button" class="aclnk prtl" data-onb="quick" data-v="gpa">Update</button>`)}${tile(cls ? esc(cls[1]) : sub.year ? "College" : "–", "Class")}</div></section>
    ${evalCard(sub, best)}<div class="prh2row"><h2 class="prh2">${par() ? esc(sub.first) + "'s" : "Your"} events and PRs</h2><button type="button" class="onbx" data-onb="quick" data-v="events">${svg('<path d="M12 5v14M5 12h14"/>', 14)} Update PRs</button></div><div class="prgrid">${stats.map(evCard).join("") || `<p class="onbsub">No events yet.</p>`}</div>
    ${par() ? `<p class="prrm"><button type="button" class="aclnk" data-onb="rmkid">Remove ${esc(sub.first)} from this account</button></p>` : ""}`}`;
}

/* evaluation card on the athlete's own profile (2026-11-03: qualified accounts saw every college their marks fit and no next step;
   104 of 672 accounts had ever clicked the evaluation). Not for Tier C (no sales offer, same rule as the pop-ups), not in admin view. */
function evalCard(sub, best) {
  if (VIEW_AS || !best || !core.member()) return "";
  const tier = par() ? sub.tier || core.profile().tier : core.profile().tier; if (tier === "C") return "";
  const C = core.cfg(), gy = +sub.year, grade = gy >= SENIOR && gy <= SENIOR + 3 ? 12 - (gy - SENIOR) : null;
  const url = C.evalUrl ? C.evalUrl({ e: best.e, m: best.m, grade: sub.grade || grade || "" }) : "#";
  const who = par() ? (sub.first || "your athlete") : "you", whose = par() ? `${esc(sub.first || "Your athlete")}'s` : "Your";
  return `<section class="preval"><div><b>${whose} ${evName(best.e, sub.gender)} fits ${best.st.n.toLocaleString()} college programs.</b><p>A free evaluation from Preferred Recruit shows which of those coaches would want ${esc(who)} and who to contact first. It takes about a minute.</p></div>
    <a class="acbtn" href="${esc(url)}" target="_blank" rel="noopener" data-preval>Get the free evaluation</a></section>`;
}
document.addEventListener("click", e => { if (!e.target.closest || !e.target.closest("[data-preval]")) return; const C = core.cfg(); C.log && C.log("popup_click", { placement: "profile", variant: "profile-card" }); optIn(); });

/* ---------- admin dashboard (read-only): one row per athlete, parents' kids included ---------- */
function flat() {
  const out = [];
  for (const r of ADM.rows) {
    const contact = [r.email, r.phone && (r.phone + (r.sms_consent ? " (texts OK)" : "")), r.parent_name && "Parent: " + r.parent_name, r.parent_email, r.parent_phone].filter(Boolean);
    const acct = [r.first_name, r.last_name].filter(Boolean).join(" ");
    if (r.role === "parent" && (r.athletes || []).length) r.athletes.forEach((a, ki) => out.push({ uid: r.id, ki, dream: a.dream_schools || [], kidContact: [a.email, a.phone && "Athlete: " + a.phone].filter(Boolean), name: [a.first_name, a.last_name].filter(Boolean).join(" "), sub: "Parent: " + (acct || r.email), role: "parent's athlete", gender: a.gender, state: a.state, school: a.high_school, year: a.grad_year, gpa: a.gpa, tier: a.tier, done: !!r.finished_at, confirmed: r.confirmed, marks: a.marks || [], contact, email: r.email, opted: r.opted_in_at, created: r.created_at, confirmed: r.confirmed }));
    else out.push({ uid: r.id, ki: -1, dream: r.dream_schools || [], kidContact: [], name: acct, sub: r.role || "no profile yet", role: r.role, gender: r.gender, state: r.state, school: r.high_school, year: r.grad_year, gpa: r.gpa, tier: r.tier, done: !!r.finished_at, marks: r.marks || [], contact, email: r.email, opted: r.opted_in_at, created: r.created_at, confirmed: r.confirmed });
  }
  for (const x of out) {
    const athleteRow = x.role === "athlete" || x.role === "parent's athlete";
    const F = athleteRow ? [["Name", x.name], ["Class", x.year], ["State", x.state], ["Men/Women", x.gender], ["PRs", x.marks.length], ["GPA", x.gpa != null]] : [["Name", x.name]];
    x.have = F.filter(f => f[1]).length; x.need = F.length; x.missing = F.filter(f => !f[1]).map(f => f[0]);
    x.group = !x.confirmed ? "unconf" : !x.done ? "open" : x.tier;
  }
  return out;
}
const SENT = {};
async function sendNudge(email, kind) {
  SENT[email] = "sending"; render();
  try {
    if (kind === "confirm") await core.api("/auth/v1/resend?redirect_to=" + encodeURIComponent(location.origin + "/onboarding"), { method: "POST", body: { type: "signup", email }, auth: false });
    else await core.api("/auth/v1/otp?redirect_to=" + encodeURIComponent(location.origin + "/onboarding"), { method: "POST", body: { email, create_user: false }, auth: false });
    SENT[email] = "sent";
  } catch (e) { SENT[email] = /seconds|rate/i.test(e.message) ? "wait a minute" : "failed"; }
  render();
}
function adminView() {
  if (!ADM) { loadAdmin(); return `<div class="onbwrap one"><section class="onbmain"><div class="skrows" role="status" aria-label="Loading accounts"><span class="skel" style="width:92%"></span><span class="skel" style="width:78%"></span><span class="skel" style="width:85%"></span><span class="skel" style="width:70%"></span><span class="skel" style="width:88%"></span><span class="skel" style="width:64%"></span></div></section></div>`; }
  if (ADM.err) return `<div class="onbwrap one"><section class="onbmain"><p class="acerr">${esc(ADM.err)}</p></section></div>`;
  const all = flat(), q = ADMQ.trim().toLowerCase();
  const rows = all.filter(r => (!ADMT || r.group === ADMT) && (!q || [r.email, r.name, r.sub, r.state, r.school].join(" ").toLowerCase().includes(q)));
  const n = k => all.filter(r => r.group === k).length;
  const GROUPS = [["A+", "Tier A+"], ["A", "Tier A"], ["B", "Tier B"], ["C", "Tier C"], ["open", "Profile not finished"], ["unconf", "Email not confirmed"]];
  const mk = r => r.marks.map(m => `${evName(m.e, r.gender)} ${esc(fmtM(m.e, m.m))}`).join("<br>");
  return `<div class="onbadm"><div class="admhd"><h1>Accounts</h1><p class="onbsub">One row per athlete (a parent's kids each get their own row). Tier A+ = Tier A plus a full profile and a parent contact. Tier A = GPA 3.0+ and a mark that meets the Preferred Recruit outreach standard. "Profile" shows what each person has filled in. Reminder buttons send that one person a fresh confirm email or a one-click link back to their profile form.</p></div>
    <div class="admst">${[["", "All", all.length], ...GROUPS.map(([k, l]) => [k, l, n(k)])].map(([k, l, c]) => `<button type="button" data-onb="adt" data-v="${k}" class="${ADMT === k ? "on" : ""}"><b>${c}</b><span>${l}</span></button>`).join("")}</div>
    <div class="admbar"><input class="in" id="admq" data-in="admq" placeholder="Search name, email, school or state" value="${esc(ADMQ)}"><button type="button" class="onbback" data-onb="csv">Download CSV</button><button type="button" class="onbback" data-onb="reload">Refresh</button></div>
    <div class="admtbl"><table><thead><tr><th>Athlete</th><th>Tier</th><th>Profile</th><th>Class</th><th>Events and PRs</th><th>GPA</th><th>High school</th><th>Contact</th><th>Joined</th></tr></thead><tbody>
    ${(ADMT ? [[ADMT, ""]] : GROUPS).map(([gk, gl]) => { const G = rows.filter(r => r.group === gk); if (!G.length) return ""; return (gl ? `<tr class="admgrp"><td colspan="9">${esc(gl)} <span>${G.length}</span></td></tr>` : "") + G.map(r => `<tr><td><button type="button" class="admname" data-onb="viewas" data-u="${esc(r.uid)}" data-i="${r.ki}" title="View this account as they see it">${esc(r.name || r.email || "–")}</button>${r.dream.length ? `<small class="admdream">Dream: ${esc(r.dream.join(", "))}</small>` : ""}<small>${esc(r.sub)}${r.state ? " · " + esc(r.state) : ""}${r.gender ? " · " + (r.gender === "m" ? "Men" : "Women") : ""}</small></td>
      <td><span class="admtier t${esc(r.done ? r.tier : "x")}">${r.done ? esc(r.tier) : "–"}</span>${r.opted ? '<small>clicked evaluation</small>' : ""}</td>
      <td class="admprof"><b class="${r.have === r.need ? "full" : ""}">${r.have}/${r.need}</b><small>${r.have === r.need ? "Complete" : "Missing: " + esc(r.missing.join(", "))}</small>${!r.confirmed || !r.done ? (SENT[r.email] ? `<small class="admsent">Reminder ${esc(SENT[r.email])}</small>` : `<button type="button" class="admnudge" data-onb="nudge" data-e="${esc(r.email)}" data-k="${r.confirmed ? "profile" : "confirm"}">${r.confirmed ? "Send finish-profile link" : "Resend confirm email"}</button>`) : ""}</td>
      <td>${r.year ? esc(r.year) : "–"}</td><td>${mk(r) || "–"}</td><td>${r.gpa != null ? esc(r.gpa) : "–"}</td><td>${esc(r.school || "–")}</td>
      <td class="admc">${[...r.kidContact, ...r.contact].map(esc).join("<br>")}${r.confirmed ? "" : '<small class="admwarn">email not confirmed</small>'}</td><td>${esc(new Date(r.created).toLocaleDateString())}</td></tr>`).join(""); }).join("") || `<tr><td colspan="9">No accounts match.</td></tr>`}
    </tbody></table></div></div>`;
}
/* open one account read-only, exactly as its owner sees /account; ki = which of a parent's athletes was clicked */
async function viewAs(uid, ki) {
  const r = ADM && ADM.rows.find(x => x.id === uid); if (!r) return;
  const kid = ki >= 0 && r.athletes && r.athletes[ki], nm = kid ? [kid.first_name, kid.last_name].filter(Boolean).join(" ") : [r.first_name, r.last_name].filter(Boolean).join(" ");
  VIEW_AS = { uid, email: r.email, name: nm, done: !!r.finished_at, ver: false };
  layer().innerHTML = top() + `<div class="onbwrap one"><section class="onbmain"><p class="onbsub">Opening ${esc(nm || r.email)}'s account…</p></section></div>`;
  try {
    const [pr, vr] = await Promise.all([core.api("/rest/v1/profiles?select=*&id=eq." + uid), core.api("/rest/v1/pr_verified?select=via&user_id=eq." + uid).catch(() => [])]);
    VIEW_AS.ver = !!(vr && vr[0]);
    await loadAll(uid, (pr && pr[0]) || {});
    SEL = Math.max(0, Math.min(ki, KIDS.length - 1)); K = KIDS[SEL] ? clone(KIDS[SEL]) : blankKid();
    BANNER = false; IMGERR = ""; MODE = "onboard"; STEP = 0; TAB = "profile"; NEWPR = null;
    await loadImgs();
  } catch (e) { VIEW_AS = null; ADM.err = "Couldn't open that account. " + e.message; }
  document.documentElement.classList.toggle("onbva", !!VIEW_AS); render(); window.scrollTo(0, 0); layer().scrollTo(0, 0);
}
async function viewAsEnd() {
  VIEW_AS = null; document.documentElement.classList.remove("onbva");
  await loadAll(); await loadImgs(); SEL = 0; K = KIDS[0] ? clone(KIDS[0]) : blankKid(); TAB = "admin"; render(); window.scrollTo(0, 0); layer().scrollTo(0, 0);
}
/* the API returns at most 1,000 rows per request, so the list stopped at 1,000 accounts (Ryan 2026-11-11: "stuck at 1,006"; the
   database had 1,187). Fetch in pages of 1,000, newest first, until a page comes back short. */
async function loadAdmin() { try { const rows = []; for (let off = 0; off < 100000; off += 1000) { const r = await core.api(`/rest/v1/rpc/admin_accounts?order=created_at.desc,id&limit=1000&offset=${off}`, { method: "POST", body: {} }) || []; rows.push(...r); if (r.length < 1000) break; } ADM = { rows }; } catch (e) { ADM = { err: "Couldn't load accounts. " + e.message }; } render(); }
function csv() {
  const H = ["athlete", "account", "role", "tier", "class", "gender", "state", "high_school", "gpa", "marks", "contact", "finished", "clicked_evaluation", "joined"];
  const cell = v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const lines = [H.join(",")].concat(flat().map(r => [r.name, r.sub, r.role, r.done ? r.tier : "", r.year, r.gender, r.state, r.school, r.gpa, r.marks.map(m => m.e + " " + fmtM(m.e, m.m)).join("; "), r.contact.join("; "), r.done ? "yes" : "no", r.opted ? "yes" : "", r.created].map(cell).join(",")));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `standards-accounts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

/* ---------- photos and banners: private bucket avatars/<user id>/[<athlete id>-]avatar.jpg | banner.jpg ---------- */
async function loadImg(path) {
  if (!path || IMG[path]) return;
  try { await core.fresh(); const r = await fetch(core.URL + "/storage/v1/object/authenticated/avatars/" + path.split("?")[0], { headers: { apikey: core.KEY, Authorization: "Bearer " + core.ses().access_token } });
    if (r.ok) IMG[path] = URL.createObjectURL(await r.blob()); } catch (e) {}
}
const loadImgs = () => Promise.all([D, ...KIDS].flatMap(s => [s.avatar, s.banner]).filter(Boolean).map(loadImg));
async function crop(file, w, h) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("That file isn't an image we can read.")); i.src = URL.createObjectURL(file); });
  const r = w / h, iw = img.naturalWidth, ih = img.naturalHeight, sw = Math.min(iw, ih * r), sh = sw / r, c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h); URL.revokeObjectURL(img.src);
  return await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.86));
}
const subNow = () => par() ? KIDS[SEL] : D;
async function patchSub(sub, body) {
  if (sub.id) await core.api("/rest/v1/athletes?id=eq." + sub.id, { method: "PATCH", body, prefer: "return=minimal" });
  else await core.api("/rest/v1/profiles?id=eq." + core.ses().user.id, { method: "PATCH", body, prefer: "return=minimal" });
}
async function upload(kind, file) {
  IMGERR = ""; const sub = subNow(); if (!file || !sub) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { IMGERR = "Use a JPG, PNG or WebP photo."; return render(); }
  if (file.size > 15 * 1024 * 1024) { IMGERR = "That photo is too big. Try one under 15 MB."; return render(); }
  IMGBUSY = kind; render();
  try {
    const blob = kind === "avatar" ? await crop(file, 512, 512) : await crop(file, 1500, 500);
    const path = core.ses().user.id + "/" + (sub.id ? sub.id + "-" : "") + kind + ".jpg", ver = path + "?v=" + Date.now();
    await core.fresh();
    const r = await fetch(core.URL + "/storage/v1/object/avatars/" + path, { method: "POST", headers: { apikey: core.KEY, Authorization: "Bearer " + core.ses().access_token, "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "60" }, body: blob });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "upload failed");
    await patchSub(sub, kind === "avatar" ? { avatar_path: ver } : { banner_path: ver });
    IMG[ver] = URL.createObjectURL(blob); sub[kind] = ver; if (kind === "banner") BANNER = false;
    core.cfg().log && core.cfg().log("account", { detail: kind, placement: "profile" });
  } catch (e) { IMGERR = "Couldn't upload. " + e.message; }
  IMGBUSY = ""; render();
}
async function setTheme(v) { const sub = subNow(); if (!sub) return; sub.theme = v; sub.banner = null; BANNER = false; render(); try { await patchSub(sub, { banner_theme: v, banner_path: null }); } catch (e) { IMGERR = "Couldn't save the banner."; render(); } }

/* ---------- render + save ---------- */
const onWizard = () => !VIEW_AS && !(core.member() && location.pathname === "/account" && MODE === "onboard") && !(IS_ADMIN && TAB === "admin" && location.pathname === "/account");
function render() {
  const el = layer(); if (!D) return;
  const html = onWizard() ? wizard() : doneView();
  const ae = document.activeElement, keepId = ae && ae.dataset && ae.dataset.in, pos = ae && ae.selectionStart;
  el.innerHTML = html;
  if (keepId) { const n = el.querySelector(`[data-in="${keepId}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
}
function read() {
  const el = layer(), sub = S();
  el.querySelectorAll("[data-in]").forEach(n => { const k = n.dataset.in; if (k === "admq") ADMQ = n.value; else (n.dataset.obj === "d" ? D : sub)[k] = n.value.trim(); });
  el.querySelectorAll("[data-ck]").forEach(n => { D[n.dataset.ck] = n.checked; });
  el.querySelectorAll("[data-mk]").forEach(n => { sub.marks[+n.dataset.i][n.dataset.mk === "e" ? 0 : 1] = n.value.trim(); });
}
function check(k) {
  const C = core.cfg(), sub = S();
  if (k === "you") {
    if (!D.first) return "Add your first name.";
    if (par() && D.phone && D.phone.replace(/\D/g, "").length < 10) return "Check your phone number.";
    if (!D.age) return "Please confirm you're 13 or older.";
  }
  if (k === "about") {
    if (sub.phone && sub.phone.replace(/\D/g, "").length < 10) return par() ? "Check your athlete's phone number, or leave it blank." : "Check your phone number, or leave it blank.";
    if (sub.email && !/^\S+@\S+\.\S+$/.test(sub.email)) return "Check your athlete's email, or leave it blank.";
    if (!sub.first) return par() ? "Add your athlete's first name." : "Add your first name.";
  }
  if (k === "events") {
    const ok = sub.marks.filter(m => m[0] || m[1]);
    for (const [e, m] of ok) if (!e || !m || C.parse(m, e) == null) return `Check the mark for ${e ? (C.evName ? C.evName(e, sub.gender) : e) : "the event"}${e && C.ph ? " (for example " + C.ph(e) + ")" : ""}.`;
    if (new Set(ok.map(m => m[0])).size < ok.length) return "Each event only once, please.";
  }
  if (k === "goals" && !D.divs.length) return "Pick at least one level, or Not sure yet.";
  if (k === "gpa") {
    const g = +sub.gpa; if (sub.gpa !== "" && sub.gpa != null && (isNaN(g) || g < 0 || g > 5)) return "Enter a GPA between 0.0 and 5.0, like 3.4, or leave it blank for now.";
    if (D.role === "athlete") {
      if (D.pemail && !/^\S+@\S+\.\S+$/.test(D.pemail)) return "Check the parent's email.";
      if (D.pphone && D.pphone.replace(/\D/g, "").length < 10) return "Check the parent's phone number.";
      if (!D.age) return "Please confirm you're 13 or older.";
    }
  }
  return "";
}
async function save(k, finish) {
  const C = core.cfg(), uid = core.ses().user.id, sub = S(), kid = par();
  const prof = { id: uid, role: D.role, onboarding_step: STEP + 1, site_sid: C.sid || null };
  if (k === "who") Object.assign(prof, {});
  if (k === "you") Object.assign(prof, { first_name: D.first || null, last_name: D.last || null, phone: kid ? (D.phone || null) : null, sms_consent: kid && !!D.phone && !!D.sms, email_updates: kid && !!D.em, age_13_plus: true });
  const yr = sub.year ? +sub.year : null, gpa = sub.gpa !== "" && sub.gpa != null && !isNaN(+sub.gpa) ? Math.round(+sub.gpa * 100) / 100 : null;
  if (k === "about" && !kid) Object.assign(prof, { first_name: sub.first, last_name: sub.last || null, grad_year: yr, grade: yr ? gradeOf(yr) : null, gender: sub.gender || null, state: sub.state || null, high_school: sub.school || null, phone: sub.phone || null, dream_schools: (sub.dream || []).length ? sub.dream : null });
  if (k === "gpa" && !kid) Object.assign(prof, { gpa, parent_name: D.pname || null, parent_email: D.pemail || null, parent_phone: D.pphone || null, age_13_plus: true });
  if (finish && (MODE === "onboard" || MODE === "edit")) prof.finished_at = (core.profile() && core.profile().finished_at) || new Date().toISOString();
  if (!kidOnly()) await core.api("/rest/v1/profiles?on_conflict=id", { method: "POST", body: prof, prefer: "resolution=merge-duplicates,return=minimal" });
  /* goals go in their own request: if the database doesn't have these fields yet (migration 008), the step still saves */
  if (k === "goals" && !kidOnly()) await core.api("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", body: { target_divisions: D.divs.length ? D.divs : null, scholarship_priority: scholDivs(D.divs) ? (D.schol || null) : null }, prefer: "return=minimal" }).catch(() => {});
  if (kid && (k === "about" || k === "gpa")) {
    const row = k === "about" ? { first_name: sub.first, last_name: sub.last || null, grad_year: yr, grade: yr ? gradeOf(yr) : null, gender: sub.gender || null, state: sub.state || null, high_school: sub.school || null,
      email: sub.email || null, phone: sub.phone || null, dream_schools: (sub.dream || []).length ? sub.dream : null } : { gpa };
    if (sub.id) await core.api("/rest/v1/athletes?id=eq." + sub.id, { method: "PATCH", body: row, prefer: "return=minimal" });
    else { const r = await core.api("/rest/v1/athletes", { method: "POST", body: Object.assign({ parent_id: uid }, row), prefer: "return=representation" }); sub.id = r[0].id; }
  }
  if (k === "events") {
    await core.api("/rest/v1/marks?user_id=eq." + uid + (kid ? "&athlete_id=eq." + sub.id : "&athlete_id=is.null"), { method: "DELETE" });
    const ms = sub.marks.filter(m => m[0] && m[1]).map(([e, m]) => ({ user_id: uid, athlete_id: kid ? sub.id : null, event: e, mark: C.parse(m, e) }));
    if (ms.length) await core.api("/rest/v1/marks", { method: "POST", body: ms, prefer: "return=minimal" });
  }
}
const better = (e, a, b) => /Jump|Vault|Put|Discus|Hammer|Javelin/.test(e) ? b > a : b < a;
async function next() {
  read(); const S2 = stepsFor(), k = S2[STEP], err = check(k);
  const C0 = core.cfg(), before = k === "events" ? Object.fromEntries((QUICK() || MODE === "edit" || MODE === "editkid" ? (par() ? (KIDS[SEL] || {}).marks || [] : (D.marks0 || [])) : []).map(([e, m]) => [e, C0.parse(m, e)])) : null;
  if (err) { MSG = err; return render(); }
  const finish = STEP === S2.length - 1;
  BUSY = true; MSG = ""; render();
  try {
    await core.fresh(); await save(k, finish);
    core.cfg().log && core.cfg().log("account", { detail: finish ? (MODE === "addkid" ? "added-athlete" : QUICK() ? "updated-" + k : "finished") : "step-" + k, placement: "onboarding" });
    if (before) { const sub = S(), news = sub.marks.filter(([e, m]) => m && before[e] != null && better(e, before[e], C0.parse(m, e))).map(m => m[0]); if (news.length) { NEWPR = { id: sub.id || "self", ev: news }; news.forEach(e => C0.log && C0.log("account", { detail: "new-pr", event: e, placement: "profile" })); } }
    BUSY = false;
    if (finish) {
      const keepId = S() && S().id; await core.loadProfile(); await loadAll();
      if (par() && keepId) SEL = Math.max(0, KIDS.findIndex(x => x.id === keepId));
      MODE = "onboard"; STEP = 0; core.changed();
      if (location.pathname !== "/account") history.replaceState({}, "", "/account");
    } else STEP++;
    render(); window.scrollTo(0, 0); layer().scrollTo(0, 0);
  } catch (e) { BUSY = false; MSG = "Couldn't save. " + e.message; render(); }
}

export async function show() {
  VIEW_AS = null; document.documentElement.classList.remove("onbva");
  const el = layer(); document.documentElement.classList.add("onbon"); el.hidden = false;
  if (!document.querySelector('meta[name="robots"][data-onb]')) document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex, nofollow" data-onb>');
  if (!core.ses()) { el.innerHTML = top() + `<div class="onbwrap one"><section class="onbmain onbdone"><h1>Build your recruiting profile</h1><p class="onbsub">Create a free account first. It takes about two minutes and shows every college your marks fit.</p><div class="onbcta"><button type="button" class="acbtn" data-acc="signup" data-why="onboarding">Create free account</button><button type="button" class="onbback" data-acc="signin" data-why="onboarding">I already have an account</button></div></section></div>`; return; }
  if (IS_ADMIN == null) IS_ADMIN = await core.api("/rest/v1/rpc/is_admin", { method: "POST", body: {} }).catch(() => false) === true;
  await loadAll(); await loadImgs();
  const p = core.profile() || {};
  MODE = "onboard";
  STEP = core.member() ? 0 : Math.min(p.onboarding_step || 0, stepsFor().length - 1);
  if (core.member() && location.pathname === "/onboarding") history.replaceState({}, "", "/account");
  TAB = "profile";
  render();
}
export function hide() { const el = document.getElementById("onb"); if (el) { el.hidden = true; el.innerHTML = ""; } document.documentElement.classList.remove("onbon"); const m = document.querySelector('meta[name="robots"][data-onb]'); if (m) m.remove(); }
export const isPage = () => location.pathname === "/onboarding" || location.pathname === "/account";
export function go(path) { if (location.pathname !== path) history.pushState({}, "", path); show(); window.scrollTo(0, 0); }

function startMode(m) { MODE = m; STEP = 0; MSG = ""; TAB = "profile"; history.pushState({}, "", "/onboarding"); render(); layer().scrollTo(0, 0); }
export function bind() {
  addEventListener("popstate", () => { if (isPage()) show(); else if (core.ses() && !core.member()) go("/onboarding"); else hide(); });
  document.addEventListener("click", e => {
    const el = document.getElementById("onb"); if (!el || el.hidden || !el.contains(e.target)) return;
    const tg = e.target.closest("[data-tog]");
    if (tg) { read(); const v = tg.dataset.v; MSG = "";
      D.divs = v === "not_sure" ? (D.divs.includes(v) ? [] : [v]) : D.divs.includes(v) ? D.divs.filter(x => x !== v) : [...D.divs.filter(x => x !== "not_sure"), v];
      return render(); }
    const gl = e.target.closest("[data-goal]");
    if (gl) { read(); D.schol = gl.dataset.v; MSG = ""; return render(); }
    const s = e.target.closest("[data-set]");
    if (s) { read(); const k = s.dataset.set, v = s.dataset.v; MSG = "";
      if (k === "role") { D.role = v; STEP = 1; if (par() && !K) K = blankKid(); return render(); }
      const sub = S(); sub[k] = k === "year" ? +v : v;
      if (k === "gender") sub.marks = sub.marks.map(m => [core.cfg().events(v).includes(m[0]) ? m[0] : "", m[1]]);
      return render(); }
    const b = e.target.closest("[data-onb]"); if (!b) return; const a = b.dataset.onb; e.preventDefault();
    if (VIEW_AS && RO.has(a)) return;
    if (!VIEW_AS && premiumAction(a, b)) return;
    if (a === "viewas") return viewAs(b.dataset.u, +b.dataset.i);
    if (a === "vaback") return viewAsEnd();
    if (a === "home") { const v = b.dataset.v || "standards"; history.pushState({}, "", v === "results" ? "/?tab=results" : "/"); hide(); core.changed(); window.__prStandardsRoute && window.__prStandardsRoute(null); const t = document.querySelector(`.switch [data-tab="${v}"]`) || document.querySelector(`[data-tab="${v}"]:not(.logo)`); if (t) t.click(); window.scrollTo(0, 0); return; }
    if (a === "exit") { if (core.ses() && !core.member() && location.pathname !== "/account") { MSG = "Finish your profile to use the site. It takes about two minutes."; return render(); } history.pushState({}, "", "/"); hide(); core.changed(); return; }
    if (a === "skip") { read(); const sub = S(), k2 = stepsFor()[STEP]; if (k2 === "events") sub.marks = sub.marks.filter(m => m[0] && m[1] && core.cfg().parse(m[1], m[0]) != null); if (!sub.marks.length) sub.marks = [["", ""]]; if (k2 === "gpa" && (sub.gpa === "" || isNaN(+sub.gpa))) sub.gpa = ""; MSG = ""; return next(); }
    if (a === "back") { read(); MSG = ""; STEP = Math.max(0, STEP - 1); return render(); }
    if (a === "cancel") { MODE = "onboard"; STEP = 0; MSG = ""; history.replaceState({}, "", "/account"); loadAll().then(render); return; }
    if (a === "add") { read(); S().marks.push(["", ""]); return render(); }
    if (a === "rm") { read(); S().marks.splice(+b.dataset.i, 1); return render(); }
    if (a === "edit") { if (par()) { K = KIDS[SEL] ? clone(KIDS[SEL]) : blankKid(); } return startMode("edit"); }
    if (a === "editkid") { K = clone(KIDS[SEL]); return startMode("editkid"); }
    if (a === "quick") { if (par()) K = clone(KIDS[SEL]); NEWPR = null; return startMode("q:" + b.dataset.v); }
    if (a === "addkid") { K = blankKid(); K.state = (KIDS[0] && KIDS[0].state) || ""; return startMode("addkid"); }
    if (a === "kid") { SEL = +b.dataset.i; K = clone(KIDS[SEL]); BANNER = false; IMGERR = ""; return render(); }
    if (a === "rmkid") { const k2 = KIDS[SEL]; if (!k2 || !confirm(`Remove ${k2.first} from this account? Their PRs and photos are deleted.`)) return;
      core.api("/rest/v1/athletes?id=eq." + k2.id, { method: "DELETE" }).then(async () => { SEL = 0; await core.loadProfile(); await loadAll(); core.changed(); render(); }).catch(err => { IMGERR = "Couldn't remove. " + err.message; render(); }); return; }
    if (a === "banner") { BANNER = !BANNER; return render(); }
    if (a === "theme") return setTheme(b.dataset.v);
    if (a === "tab") { TAB = b.dataset.v; return render(); }
    if (a === "kit") { KITV = b.dataset.v || "roster"; TAB = "kit"; render(); layer().scrollTo(0, 0); return; }
    if (a === "copy") { const el = document.getElementById(b.dataset.v); if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent).then(() => { const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1600); }).catch(() => {}); return; }
    if (a === "pick") { const f = el.querySelector(`[data-onb-file="${b.dataset.v || "avatar"}"]`); return f && f.click(); }
    if (a === "school") { const slug = b.dataset.slug; history.pushState({}, "", "/schools/" + slug); hide(); core.changed(); window.__prStandardsRoute && window.__prStandardsRoute(slug); return; }
    if (a === "dreamx") { read(); const sub = S(); sub.dream = (sub.dream || []).filter((x, i) => i !== +b.dataset.i); return render(); }
    if (a === "adt") { ADMT = b.dataset.v; return render(); }
    if (a === "nudge") { if (!SENT[b.dataset.e]) sendNudge(b.dataset.e, b.dataset.k); return; }
    if (a === "reload") { ADM = null; return render(); }
    if (a === "csv") return ADM && ADM.rows && csv();
    if (a === "out") { for (const k2 in IMG) { URL.revokeObjectURL(IMG[k2]); delete IMG[k2]; } KIDS = []; K = null; core.signOut(); hide(); history.pushState({}, "", "/"); return; }
    if (a === "see") { history.pushState({}, "", `/?g=${b.dataset.g}&e=${encodeURIComponent(b.dataset.e)}&m=${encodeURIComponent(b.dataset.m)}`); hide(); core.changed(); window.__prStandardsRoute && window.__prStandardsRoute(null); return; }
  });
  document.addEventListener("submit", e => { if (e.target.id !== "onbf") return; e.preventDefault(); if (!BUSY) next(); });
  document.addEventListener("input", e => {
    const el = document.getElementById("onb"); if (!el || el.hidden || !el.contains(e.target)) return;
    if (e.target.dataset.in === "admq") { ADMQ = e.target.value; return render(); }
    if (e.target.matches("[data-dream]")) { const v = e.target.value.trim(), list = core.cfg().schools ? core.cfg().schools() : [], hit = list.find(n => n.toLowerCase() === v.toLowerCase());
      if (hit) { read(); const sub = S(); sub.dream = [...new Set([...(sub.dream || []), hit])].slice(0, 3); render(); const n = el.querySelector("[data-dream]"); if (n) n.focus(); } return; }
    if (e.target.dataset.mk) { read(); const sub = S(), i = +e.target.dataset.i, f = fitsFor(sub, ...sub.marks[i]), s = el.querySelector(`[data-fit="${i}"]`);
      if (s) { s.className = "onbfit" + (f != null ? " on" : ""); s.innerHTML = f != null ? `<b>${f.toLocaleString()}</b> programs` : ""; }
      const c = el.querySelector(".pcard"); if (c) c.outerHTML = card(); }
    else if (e.target.dataset.in) { read(); const c = el.querySelector(".pcard"); if (c) c.outerHTML = card(); }
  });
  document.addEventListener("change", e => {
    if (e.target.matches && e.target.matches("[data-onb-file]") && !VIEW_AS) { upload(e.target.dataset.onbFile, e.target.files && e.target.files[0]); e.target.value = ""; return; }
    const el = document.getElementById("onb"); if (el && !el.hidden && el.contains(e.target) && (e.target.dataset.mk === "e" || e.target.dataset.in === "state")) { read(); render(); }
  });
}
