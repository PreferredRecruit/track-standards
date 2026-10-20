// @ts-nocheck
/* Onboarding page /onboarding and account page /account (Ryan 2026-10-19: "it should feel like they're building their profile,
   not filling out a form"). Steps: who → about → events & PRs → academics → recruiting → done, saved after every step.
   The live profile card on the right fills in as they go and shows how many college programs their marks fit.
   Funnel questions use the parent funnel's answers (references/business-data/close_lead_quality.csv).
   Athletes are asked for a parent's contact, never their own phone (recruiting contact for minors goes to a parent).
   Admins (verified emails in public.admin_emails) also get the Accounts dashboard at /account. */
import { core } from "./account.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const NOW = new Date(), SENIOR = NOW.getMonth() >= 6 ? NOW.getFullYear() + 1 : NOW.getFullYear();   // class of the current seniors
const CLASSES = [[SENIOR, "Senior"], [SENIOR + 1, "Junior"], [SENIOR + 2, "Sophomore"], [SENIOR + 3, "Freshman"]];
const gradeOf = y => y ? (y < SENIOR ? "college" : String(12 - (y - SENIOR))) : null;
const STAGE = [["getting_started", "Just getting started"], ["talking", "Talking to a few coaches, nothing serious yet"], ["real_interest", "Getting real interest or visits"], ["offers", "Already have offers or a commitment"]];
const SERIOUS = [["dream", "It's my dream"], ["serious", "I'm pretty serious"], ["exploring", "I'm exploring"], ["not_sure", "Not sure yet"]];
const INVOLVE = [["both", "Both parents"], ["mom", "Mom"], ["dad", "Dad"], ["none_yet", "None yet"]];
const ROLES = [["athlete", "I'm an athlete", "Build your own recruiting profile"], ["parent", "I'm a parent", "Build a profile for your athlete"], ["coach", "I'm a coach", "Use the standards and results"], ["fan", "Just a fan", "Follow college track and field"]];
const ICON = { athlete: '<path d="M13 4a2 2 0 1 1 0 .01M9 21l2.5-6 2.5 2v4M7.5 12.5 10 9l3 1 2.5 3 3 .5"/>', parent: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5M14.5 20c.4-2.4 1.6-4 3.5-4 1.6 0 2.7 1 3 3"/>', coach: '<path d="M4 5h16v11H4zM8 21h8M12 16v5"/><path d="M8 9l3 3 5-5"/>', fan: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>' };
const svg = (p, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

let AVA = { url: null, path: null, busy: false, err: "" };
let D = null, STEP = 0, MSG = "", BUSY = false, TAB = "profile", ADM = null, ADMQ = "", ADMT = "", IS_ADMIN = null;

const fam = () => D.role === "athlete" || D.role === "parent";
const stepsFor = () => !D.role ? ["who"] : fam() ? ["who", "about", "events", "school", "goals"] : ["who", "about"];
const STEP_NAME = { who: "Start", about: "About", events: "Events and PRs", school: "Academics", goals: "Recruiting" };

function draft() {
  const p = core.profile() || {}, I = core.cfg().intent || {};
  return { role: p.role || "", first: p.first_name || "", last: p.last_name || "", phone: p.phone || "", sms: !!p.sms_consent, ath: p.athlete_first_name || "",
    gender: p.gender || I.g || "", year: p.grad_year || (I.gr ? SENIOR + (12 - +I.gr) : ""), state: p.state || "", gpa: p.gpa != null ? String(p.gpa) : "",
    school: p.high_school || "", stage: p.recruiting_stage || "", serious: p.seriousness || "", involve: p.parent_involvement || "", pname: p.parent_name || "", pemail: p.parent_email || "", pphone: p.parent_phone || "",
    age: !!p.age_13_plus, marks: null };
}
async function loadMarks() {
  try { const r = await core.api("/rest/v1/marks?select=event,mark&user_id=eq." + core.ses().user.id); return (r || []).map(x => [x.event, core.cfg().fmt ? core.cfg().fmt(x.event, +x.mark) : String(x.mark)]); } catch (e) { return []; }
}
const fitsFor = (e, m) => { const C = core.cfg(); if (!e || !m || !D.gender || !C.parse || !C.fits) return null; const v = C.parse(m, e); return v == null ? null : C.fits(e, D.gender, v); };

/* ---------- layout ---------- */
function layer() {
  let el = document.getElementById("onb");
  if (!el) { document.body.insertAdjacentHTML("beforeend", `<div class="onb" id="onb" role="main"></div>`); el = document.getElementById("onb"); }
  return el;
}
const top = (right = "") => `<header class="onbtop"><button type="button" class="onblogo" data-onb="exit" aria-label="Back to Track Standards"><span class="onbtile">PR</span><span><b>Preferred Recruit</b><small>Track Standards</small></span></button><div class="onbtr">${right}<button type="button" class="onbx" data-onb="exit">Back to standards</button></div></header>`;

function card() {
  const C = core.cfg(), name = D.role === "parent" ? (D.ath || "Your athlete") : [D.first, D.last].filter(Boolean).join(" ") || "Your name";
  const named = D.role === "parent" ? !!D.ath : !!(D.first || D.last);
  const ini = named ? name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() : "";
  const marks = (D.marks || []).filter(m => m[0] && m[1]);
  const best = marks.map(m => [m, fitsFor(m[0], m[1])]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1])[0];
  const cls = CLASSES.find(c => c[0] === +D.year);
  const total = stepsFor().length, done = Math.min(STEP, total), pct = D.role ? Math.round(done / total * 100) : 0;
  const row = (k, v) => `<div class="pcr"><span>${k}</span><b>${v ? esc(v) : '<i>Not added yet</i>'}</b></div>`;
  return `<aside class="pcard" aria-label="Your recruiting profile"><div class="pchd"><div class="pcav">${AVA.url ? `<img src="${AVA.url}" alt="">` : ini ? esc(ini) : svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', 24)}</div><div><b>${esc(name)}</b><small>${esc([cls ? "Class of " + cls[0] : "", D.gender ? (D.gender === "m" ? "Men's" : "Women's") + " track" : "", core.ST[D.state] || ""].filter(Boolean).join(" · ") || "Recruiting profile")}</small></div>
    <div class="pcring" style="--p:${pct}"><span>${pct}%</span></div></div>
    ${fam() ? `<div class="pcev">${marks.length ? marks.map(m => `<span class="pcchip"><b>${esc(C.evName ? C.evName(m[0], D.gender) : m[0])}</b>${esc(m[1])}</span>`).join("") : '<span class="pcempty">Your events and PRs show here</span>'}</div>
    ${best ? `<div class="pcfit"><b>${best[1].toLocaleString()}</b><span>college programs fit your ${esc(C.evName ? C.evName(best[0][0], D.gender) : best[0][0])}</span></div>` : ""}
    ${row("GPA", D.gpa)}${row("Recruiting", (STAGE.find(s => s[0] === D.stage) || [])[1])}${row("Goal", (SERIOUS.find(s => s[0] === D.serious) || [])[1])}` : `<p class="pcnote">${D.role === "coach" ? "Coach accounts see every standard and full results lists." : D.role === "fan" ? "Fan accounts see every standard and full results lists." : "Pick who's building this profile to get started."}</p>`}
  </aside>`;
}
const opt = (name, list, cur, cls = "") => `<div class="onbopt ${cls}" role="radiogroup">${list.map(([v, l, d]) => `<button type="button" role="radio" data-set="${name}" data-v="${v}" aria-checked="${String(cur) === String(v)}"><b>${esc(l)}</b>${d ? `<small>${esc(d)}</small>` : ""}</button>`).join("")}</div>`;
const inp = (id, label, val, attrs = "", help = "") => `<label class="onbf" for="${id}"><span>${label}</span><input class="in" id="${id}" data-in="${id}" value="${esc(val)}" ${attrs}>${help ? `<small>${help}</small>` : ""}</label>`;

const AGE = () => `<label class="onbck"><input type="checkbox" data-ck="age" ${D.age ? "checked" : ""}><span>I am 13 or older and agree to the <a href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>.</span></label>`;
function stepBody(k) {
  const C = core.cfg(), par = D.role === "parent";
  if (k === "who") return `<h1>Build your recruiting profile</h1><p class="onbsub">It takes about two minutes. Your profile shows every college your marks fit and keeps your PRs in one place.</p>
    <div class="onbroles">${ROLES.map(([v, l, d]) => `<button type="button" data-set="role" data-v="${v}" aria-checked="${D.role === v}" role="radio"><span class="ri">${svg(ICON[v])}</span><b>${l}</b><small>${d}</small></button>`).join("")}</div>`;
  if (k === "about") return `<h1>${par ? "About you and your athlete" : fam() ? "About you" : "Your name"}</h1><p class="onbsub">${par ? "Coaches recruit the athlete. We keep your details so we know who to reach." : fam() ? "The basics coaches look at first." : "So we know who's using the site."}</p>
    <div class="onbg2">${inp("first", par ? "Your first name" : "First name", D.first, 'autocomplete="given-name" maxlength="60"')}${inp("last", par ? "Your last name" : "Last name", D.last, 'autocomplete="family-name" maxlength="60"')}</div>
    ${par ? inp("phone", "Your phone", D.phone, 'type="tel" autocomplete="tel" maxlength="30"') + `<label class="onbck"><input type="checkbox" data-ck="sms" ${D.sms ? "checked" : ""}><span>Preferred Recruit may text me about my athlete's recruiting. Message rates apply. Reply STOP to opt out.</span></label>` + inp("ath", "Your athlete's first name", D.ath, 'maxlength="60"') : ""}
    ${fam() ? `<div class="onbq"><span>${par ? "Your athlete's class" : "Your class"}</span>${opt("year", [...CLASSES.map(([y, l]) => [y, l, "Class of " + y]), [SENIOR - 1, "In college", "Already there"]], D.year, "c5")}</div>
    <div class="onbq"><span>Team</span>${opt("gender", [["m", "Men"], ["w", "Women"]], D.gender, "c2")}</div>
    <label class="onbf" for="state"><span>State</span><select class="in" id="state" data-in="state"><option value="">Choose a state</option>${Object.entries(core.ST).map(([k2, v]) => `<option value="${k2}" ${k2 === D.state ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>` + inp("school", par ? "Your athlete's high school (optional)" : "High school (optional)", D.school, 'maxlength="100" autocomplete="off"') : AGE()}`;
  if (k === "events") {
    const evs = D.gender ? (C.events ? C.events(D.gender) : []) : [];
    const sel = (cur, i) => `<select class="in" data-mk="e" data-i="${i}" aria-label="Event"><option value="">Choose an event</option>${evs.map(e => `<option value="${esc(e)}" ${e === cur ? "selected" : ""}>${esc(C.evName ? C.evName(e, D.gender) : e)}</option>`).join("")}</select>`;
    return `<h1>${par ? "Your athlete's events and PRs" : "Your events and PRs"}</h1><p class="onbsub">Add every event ${par ? "they" : "you"} compete in with ${par ? "their" : "your"} best mark. We compare each one against ${(core.cfg().nstd || 1200).toLocaleString()} college standards.</p>
      <div class="onbmk">${D.marks.map((m, i) => { const f = fitsFor(m[0], m[1]); return `<div class="onbmr">${sel(m[0], i)}<input class="in" data-mk="m" data-i="${i}" value="${esc(m[1])}" placeholder="${esc(m[0] && C.ph ? C.ph(m[0]) : "Best mark")}" inputmode="decimal" autocomplete="off" aria-label="Best mark"><span class="onbfit${f ? " on" : ""}" data-fit="${i}">${f != null ? `<b>${f.toLocaleString()}</b> programs` : ""}</span>${D.marks.length > 1 ? `<button type="button" class="onbrm" data-onb="rm" data-i="${i}" aria-label="Remove event">×</button>` : ""}</div>`; }).join("")}</div>
      ${D.marks.length < 5 ? `<button type="button" class="onbadd" data-onb="add">+ Add another event</button>` : ""}`;
  }
  if (k === "school") return `<h1>Academics</h1><p class="onbsub">Coaches check grades before they recruit. A strong GPA can open more programs than a faster time.</p>
    <div class="onbgpa">${inp("gpa", "Cumulative high school GPA", D.gpa, 'inputmode="decimal" placeholder="e.g. 3.4" maxlength="4"', "All of high school, on the scale your school uses.")}</div>`;
  if (k === "goals") return `<h1>Recruiting</h1><p class="onbsub">So the guides and tools you see fit where ${par ? "your athlete is" : "you are"} right now.</p>
    <div class="onbq"><span>Where ${par ? "is your athlete" : "are you"} in recruiting?</span>${opt("stage", STAGE, D.stage, "c1")}</div>
    <div class="onbq"><span>How serious ${par ? "is your athlete" : "are you"} about running in college?</span>${opt("serious", SERIOUS, D.serious, "c2")}</div>
    <div class="onbq"><span>${par ? "Who's involved in recruiting decisions?" : "Which parents help with your recruiting?"}</span>${opt("involve", INVOLVE, D.involve, "c4")}</div>
    ${D.role === "athlete" ? `<div class="onbsec"><b>A parent's contact</b><small>Optional. Recruiting help goes to a parent, never to an athlete directly.</small>
      ${inp("pname", "Parent's name", D.pname, 'maxlength="80"')}<div class="onbg2">${inp("pemail", "Parent's email", D.pemail, 'type="email" maxlength="120"')}${inp("pphone", "Parent's phone", D.pphone, 'type="tel" maxlength="30"')}</div></div>` : ""}
    ${AGE()}`;
  return "";
}

function wizard() {
  const S = stepsFor(), k = S[STEP] || "who", last = STEP >= S.length - 1 && !!D.role;
  const bar = `<ol class="onbsteps" aria-label="Progress">${(D.role ? S : ["who", "about", "events", "school", "goals"]).map((s, i) => `<li class="${i < STEP ? "done" : i === STEP ? "on" : ""}"><span>${i < STEP ? svg('<path d="M5 12l5 5 9-10"/>', 13) : i + 1}</span>${STEP_NAME[s]}</li>`).join("")}</ol>`;
  return top() + `<div class="onbwrap"><section class="onbmain">${bar}<form id="onbf" class="onbform" novalidate>${stepBody(k)}${MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : ""}
    ${k === "who" && !D.role ? "" : `<div class="onbnav">`}${STEP > 0 ? `<button type="button" class="onbback" data-onb="back">Back</button>` : "<span></span>"}${k === "who" ? "" : `<button class="acbtn onbgo" ${BUSY ? "disabled" : ""}>${BUSY ? "Saving…" : last ? (core.member() ? "Save profile" : "Finish my account") : "Continue"}</button>`}${k === "who" && !D.role ? "" : "</div>"}</form></section>${card()}</div>`;
}

function doneView() {
  const C = core.cfg(), marks = (D.marks || []).filter(m => m[0] && m[1]);
  const best = marks.map(m => [m, fitsFor(m[0], m[1])]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1])[0];
  return top(IS_ADMIN ? `<button type="button" class="onbtab${TAB === "admin" ? " on" : ""}" data-onb="tab" data-v="admin">Accounts</button><button type="button" class="onbtab${TAB === "profile" ? " on" : ""}" data-onb="tab" data-v="profile">My profile</button>` : "") +
    (TAB === "admin" && IS_ADMIN ? adminView() : fam() ? profileView() : simpleDone());
}
function simpleDone() {
  return `<div class="onbwrap one"><section class="onbmain onbdone"><span class="onbok">${svg('<path d="M5 12l5 5 9-10"/>', 26)}</span><h1>Your account is ready</h1>
    <p class="onbsub">Every standard, full results list and unlimited Recruiting AI is open to you now.</p>
    <div class="onbcta"><button type="button" class="acbtn" data-onb="exit">Go to the standards</button><button type="button" class="onbback" data-onb="edit">Edit account</button><button type="button" class="onbback" data-onb="out">Sign out</button></div>
    <p class="onbmail">Signed in as ${esc(core.ses() ? core.ses().user.email : "")}</p></section></div>`;
}
/* the athlete's own profile: photo, basics and full stats per event (private to the account and admins) */
function profileView() {
  const C = core.cfg(), par = D.role === "parent", marks = (D.marks || []).filter(m => m[0] && m[1]);
  const name = par ? (D.ath || "Your athlete") : [D.first, D.last].filter(Boolean).join(" ");
  const ini = name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const cls = CLASSES.find(c => c[0] === +D.year), stats = marks.map(([e, m]) => { const v = C.parse(m, e); return { e, m, st: v != null && C.stats ? C.stats(e, D.gender, v) : null }; });
  const best = stats.filter(x => x.st).sort((a, b) => b.st.n - a.st.n)[0];
  const ev = e => esc(C.evName ? C.evName(e, D.gender) : e);
  const tile = (v, l) => `<div class="prtile"><b>${v}</b><span>${l}</span></div>`;
  const evCard = ({ e, m, st }) => { const n = st ? st.n : 0, w = k => n ? Math.max(st[k] / n * 100, st[k] ? 4 : 0) : 0;
    return `<article class="prev"><header><span>${ev(e)}</span><b>${esc(m)}</b></header>
      ${st ? `<div class="prfit"><b>${n.toLocaleString()}</b><span>college programs fit this mark</span></div>
      <div class="prbar" role="img" aria-label="${st.T} Target, ${st.R} Recruit, ${st.W} Walk-On"><i class="T" style="width:${w("T")}%"></i><i class="R" style="width:${w("R")}%"></i><i class="W" style="width:${w("W")}%"></i></div>
      <div class="prlv"><span><i class="T"></i>${st.T} Target</span><span><i class="R"></i>${st.R} Recruit</span><span><i class="W"></i>${st.W} Walk-On</span></div>
      ${st.near ? `<p class="prnear">${esc(st.near.gap)} from ${esc(st.near.lv)} level at ${st.near.n} more programs</p>` : ""}
      ${st.top.length ? `<ul class="prtop">${st.top.map(t => `<li><a href="/schools/${esc(t.slug)}" data-onb="school" data-slug="${esc(t.slug)}">${esc(t.n)}</a><small>${esc(t.d)} · ${esc(t.lv)}</small></li>`).join("")}</ul>` : ""}
      <button type="button" class="onbback" data-onb="see" data-e="${esc(e)}" data-m="${esc(m)}">See all ${n.toLocaleString()} colleges</button>` : `<p class="prnear">No college standards for this event yet.</p>`}</article>`; };
  return `<div class="prwrap"><section class="prhero"><div class="prband"></div><div class="prhead">
      <div class="prav${AVA.busy ? " busy" : ""}">${AVA.url ? `<img src="${AVA.url}" alt="${esc(name)}">` : `<span>${esc(ini || "PR")}</span>`}
        <label class="prcam" title="${AVA.url ? "Change photo" : "Add a photo"}">${svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 18)}<input type="file" accept="image/jpeg,image/png,image/webp" data-onb-file hidden></label></div>
      <div class="prid"><h1>${esc(name)}</h1><p>${esc([cls ? "Class of " + cls[0] : D.year ? "In college" : "", D.gender ? (D.gender === "m" ? "Men's" : "Women's") + " track and field" : "", D.school, core.ST[D.state]].filter(Boolean).join(" · "))}</p>
        ${AVA.err ? `<p class="acerr">${esc(AVA.err)}</p>` : !AVA.url ? `<button type="button" class="aclnk" data-onb="pick">Add a profile photo</button>` : ""}</div>
      <div class="pract"><button type="button" class="onbx" data-onb="edit">Edit profile</button></div></div>
      <div class="prtiles">${tile(marks.length, marks.length === 1 ? "Event" : "Events")}${tile(best ? best.st.n.toLocaleString() : "–", "Programs your best mark fits")}${tile(D.gpa || "–", "GPA")}${tile(esc(({ getting_started: "Getting started", talking: "Talking to coaches", real_interest: "Real interest", offers: "Has offers" })[D.stage] || "–"), "Recruiting")}</div></section>
    <h2 class="prh2">${par ? "Their" : "Your"} events and PRs</h2><div class="prgrid">${stats.map(evCard).join("") || `<p class="onbsub">No events yet. <button type="button" class="aclnk" data-onb="edit">Add your PRs</button></p>`}</div>
    <section class="prmore"><div><h2 class="prh2">Recruiting</h2>${[["Where things stand", lab(STAGE, D.stage)], ["Goal", lab(SERIOUS, D.serious)], ["Parents involved", lab(INVOLVE, D.involve)], par ? ["Your phone", D.phone] : ["Parent", [D.pname, D.pemail].filter(Boolean).join(" · ")]].map(([k, v]) => `<div class="pcr"><span>${k}</span><b>${v ? esc(v) : "<i>Not added yet</i>"}</b></div>`).join("")}</div>
      <div class="prfoot"><p class="onbmail">Signed in as ${esc(core.ses() ? core.ses().user.email : "")}. Your profile is private: only you and the Preferred Recruit team can see it.</p><button type="button" class="onbback" data-onb="out">Sign out</button></div></section></div>`;
}


/* ---------- admin dashboard (read-only) ---------- */
const lab = (list, v) => (list.find(x => x[0] === v) || [])[1] || "";
function adminView() {
  if (!ADM) { loadAdmin(); return `<div class="onbwrap one"><section class="onbmain"><p class="onbsub">Loading accounts…</p></section></div>`; }
  if (ADM.err) return `<div class="onbwrap one"><section class="onbmain"><p class="acerr">${esc(ADM.err)}</p></section></div>`;
  const C = core.cfg(), q = ADMQ.trim().toLowerCase();
  const rows = ADM.rows.filter(r => (!ADMT || (ADMT === "open" ? !r.finished_at : r.finished_at && r.tier === ADMT)) && (!q || [r.email, r.first_name, r.last_name, r.athlete_first_name, r.state].join(" ").toLowerCase().includes(q)));
  const n = k => ADM.rows.filter(r => r.finished_at && r.tier === k).length, open = ADM.rows.filter(r => !r.finished_at).length;
  const who = r => r.role === "parent" ? `${esc(r.athlete_first_name || "Athlete")} <small>parent ${esc([r.first_name, r.last_name].filter(Boolean).join(" "))}</small>` : esc([r.first_name, r.last_name].filter(Boolean).join(" ") || "–");
  const contact = r => [r.email, r.phone && (r.phone + (r.sms_consent ? " (texts OK)" : "")), r.parent_name && "Parent: " + r.parent_name, r.parent_email, r.parent_phone].filter(Boolean).map(esc).join("<br>");
  const mk = r => (r.marks || []).map(m => `${esc(C.evName ? C.evName(m.e, r.gender) : m.e)} ${esc(C.fmt ? C.fmt(m.e, +m.m) : m.m)}`).join("<br>");
  return `<div class="onbadm"><div class="admhd"><h1>Accounts</h1><p class="onbsub">Read-only. Tier A = GPA 3.0+ and a mark that meets the Preferred Recruit outreach standard.</p></div>
    <div class="admst">${[["", "All", ADM.rows.length], ["A", "Tier A", n("A")], ["B", "Tier B", n("B")], ["C", "Tier C", n("C")], ["open", "Not finished", open]].map(([k, l, c]) => `<button type="button" data-onb="adt" data-v="${k}" class="${ADMT === k ? "on" : ""}"><b>${c}</b><span>${l}</span></button>`).join("")}</div>
    <div class="admbar"><input class="in" id="admq" data-in="admq" placeholder="Search name, email or state" value="${esc(ADMQ)}"><button type="button" class="onbback" data-onb="csv">Download CSV</button><button type="button" class="onbback" data-onb="reload">Refresh</button></div>
    <div class="admtbl"><table><thead><tr><th>Athlete</th><th>Tier</th><th>Class</th><th>Events and PRs</th><th>GPA</th><th>Recruiting</th><th>Contact</th><th>Joined</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td><b>${who(r)}</b><small>${esc(r.role || "no profile yet")}${r.state ? " · " + esc(r.state) : ""}${r.gender ? " · " + (r.gender === "m" ? "Men" : "Women") : ""}</small></td>
      <td><span class="admtier t${esc(r.finished_at ? r.tier : "x")}">${r.finished_at ? esc(r.tier) : "–"}</span>${r.opted_in_at ? '<small>clicked evaluation</small>' : ""}</td>
      <td>${r.grad_year ? esc(r.grad_year) : "–"}</td><td>${mk(r) || "–"}</td><td>${r.gpa != null ? esc(r.gpa) : "–"}</td>
      <td>${esc(lab(STAGE, r.recruiting_stage)) || "–"}<small>${esc([lab(SERIOUS, r.seriousness), r.parent_involvement && "Parents: " + lab(INVOLVE, r.parent_involvement)].filter(Boolean).join(" · "))}</small></td>
      <td class="admc">${contact(r)}${r.confirmed ? "" : '<small class="admwarn">email not confirmed</small>'}</td><td>${esc(new Date(r.created_at).toLocaleDateString())}</td></tr>`).join("") || `<tr><td colspan="8">No accounts match.</td></tr>`}
    </tbody></table></div></div>`;
}
async function loadAdmin() { try { const r = await core.api("/rest/v1/rpc/admin_accounts", { method: "POST", body: {} }); ADM = { rows: r || [] }; } catch (e) { ADM = { err: "Couldn't load accounts. " + e.message }; } render(); }
function csv() {
  const C = core.cfg(), H = ["email", "role", "first_name", "last_name", "phone", "sms_consent", "athlete_first_name", "parent_name", "parent_email", "parent_phone", "gender", "grad_year", "state", "gpa", "tier", "tier_reason", "recruiting_stage", "seriousness", "parent_involvement", "marks", "finished_at", "opted_in_at", "created_at"];
  const cell = v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const lines = [H.join(",")].concat(ADM.rows.map(r => H.map(h => cell(h === "marks" ? (r.marks || []).map(m => m.e + " " + (C.fmt ? C.fmt(m.e, +m.m) : m.m)).join("; ") : r[h])).join(",")));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `standards-accounts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

/* ---------- profile photo: square crop to 512px JPEG, private bucket "avatars/<user id>/avatar.jpg" ---------- */
async function loadAvatar() {
  const p = core.profile() || {}; if (!p.avatar_path) { AVA.url = null; return; }
  if (AVA.path === p.avatar_path && AVA.url) return;
  try { await core.fresh(); const r = await fetch(core.URL + "/storage/v1/object/authenticated/avatars/" + p.avatar_path.split("?")[0], { headers: { apikey: core.KEY, Authorization: "Bearer " + core.ses().access_token } });
    if (!r.ok) throw new Error(r.status); if (AVA.url) URL.revokeObjectURL(AVA.url); AVA.url = URL.createObjectURL(await r.blob()); AVA.path = p.avatar_path; } catch (e) { AVA.url = null; }
}
async function squareJpeg(file) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("That file isn't an image we can read.")); i.src = URL.createObjectURL(file); });
  const z = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas"); c.width = c.height = 512;
  c.getContext("2d").drawImage(img, (img.naturalWidth - z) / 2, (img.naturalHeight - z) / 2, z, z, 0, 0, 512, 512); URL.revokeObjectURL(img.src);
  return await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.88));
}
async function upload(file) {
  AVA.err = "";
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { AVA.err = "Use a JPG, PNG or WebP photo."; return render(); }
  if (file.size > 15 * 1024 * 1024) { AVA.err = "That photo is too big. Try one under 15 MB."; return render(); }
  AVA.busy = true; render();
  try {
    const blob = await squareJpeg(file), uid = core.ses().user.id, path = uid + "/avatar.jpg";
    await core.fresh();
    const r = await fetch(core.URL + "/storage/v1/object/avatars/" + path, { method: "POST", headers: { apikey: core.KEY, Authorization: "Bearer " + core.ses().access_token, "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "60" }, body: blob });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "upload failed");
    await core.api("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", body: { avatar_path: path + "?v=" + Date.now() }, prefer: "return=minimal" });
    await core.loadProfile(); if (AVA.url) URL.revokeObjectURL(AVA.url); AVA.url = URL.createObjectURL(blob); AVA.path = core.profile().avatar_path;
    core.cfg().log && core.cfg().log("account", { detail: "photo", placement: "profile" });
  } catch (e) { AVA.err = "Couldn't upload the photo. " + e.message; }
  AVA.busy = false; render();
}

/* ---------- render + save ---------- */
function render() {
  const el = layer(); if (!D) return;
  const inAcc = location.pathname === "/account";
  const html = (core.member() && (inAcc || STEP >= stepsFor().length)) || (inAcc && IS_ADMIN) ? doneView() : wizard();
  const ae = document.activeElement, keepId = ae && ae.dataset && ae.dataset.in, pos = ae && ae.selectionStart;
  el.innerHTML = html;
  if (keepId) { const n = el.querySelector(`[data-in="${keepId}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
}
function read() {
  const el = layer();
  el.querySelectorAll("[data-in]").forEach(n => { const k = n.dataset.in; if (k === "admq") ADMQ = n.value; else D[k] = n.value.trim(); });
  el.querySelectorAll("[data-ck]").forEach(n => { D[n.dataset.ck] = n.checked; });
  el.querySelectorAll("[data-mk]").forEach(n => { D.marks[+n.dataset.i][n.dataset.mk === "e" ? 0 : 1] = n.value.trim(); });
}
function check(k) {
  const C = core.cfg(), par = D.role === "parent";
  if (k === "about") {
    if (!D.first) return "Add your first name.";
    if (fam() && !D.last) return "Add your last name.";
    if (par && D.phone && D.phone.replace(/\D/g, "").length < 10) return "Check your phone number.";
    if (par && !D.ath) return "Add your athlete's first name.";
    if (fam() && !D.year) return "Choose a class.";
    if (fam() && !D.gender) return "Choose Men or Women.";
    if (fam() && !D.state) return "Choose a state.";
  }
  if (k === "events") {
    const ok = D.marks.filter(m => m[0] || m[1]);
    if (!ok.length) return "Add at least one event and best mark.";
    for (const [e, m] of ok) if (!e || !m || C.parse(m, e) == null) return `Check the mark for ${e ? (C.evName ? C.evName(e, D.gender) : e) : "the event"}${e && C.ph ? " (for example " + C.ph(e) + ")" : ""}.`;
    if (new Set(ok.map(m => m[0])).size < ok.length) return "Each event only once, please.";
  }
  if (k === "school") { const g = +D.gpa; if (!D.gpa || isNaN(g) || g < 0 || g > 5) return "Enter a GPA between 0.0 and 5.0, like 3.4."; }
  if (k === "goals") {
    if (!D.stage || !D.serious || !D.involve) return "Answer all three questions.";
    if (D.pemail && !/^\S+@\S+\.\S+$/.test(D.pemail)) return "Check the parent's email.";
    if (D.pphone && D.pphone.replace(/\D/g, "").length < 10) return "Check the parent's phone number.";
  }
  if ((k === "goals" || (k === "about" && !fam())) && !D.age) return "Please confirm you're 13 or older.";
  return "";
}
async function save(k, finish) {
  const C = core.cfg(), uid = core.ses().user.id, par = D.role === "parent", F = fam();
  const row = { id: uid, role: D.role, onboarding_step: STEP + 1, site_sid: C.sid || null };
  if (k === "about") Object.assign(row, { first_name: D.first || null, last_name: D.last || null, phone: par ? (D.phone || null) : null, sms_consent: par && !!D.phone && !!D.sms,
    athlete_first_name: par ? D.ath : null, grad_year: F ? +D.year : null, grade: F ? gradeOf(+D.year) : null, gender: F ? D.gender : null, state: F ? D.state : null, high_school: F ? (D.school || null) : null });
  if (k === "school") row.gpa = Math.round(+D.gpa * 100) / 100;
  if (k === "goals") Object.assign(row, { recruiting_stage: D.stage, seriousness: D.serious, parent_involvement: D.involve,
    parent_name: D.role === "athlete" ? (D.pname || null) : null, parent_email: D.role === "athlete" ? (D.pemail || null) : null, parent_phone: D.role === "athlete" ? (D.pphone || null) : null });
  if (finish) Object.assign(row, { age_13_plus: true, finished_at: (core.profile() && core.profile().finished_at) || new Date().toISOString() });
  await core.api("/rest/v1/profiles?on_conflict=id", { method: "POST", body: row, prefer: "resolution=merge-duplicates,return=minimal" });
  if (k === "events") {
    await core.api("/rest/v1/marks?user_id=eq." + uid, { method: "DELETE" });
    const ms = D.marks.filter(m => m[0] && m[1]).map(([e, m]) => ({ user_id: uid, event: e, mark: C.parse(m, e) }));
    if (ms.length) await core.api("/rest/v1/marks", { method: "POST", body: ms, prefer: "return=minimal" });
  }
  await core.loadProfile();
}
async function next() {
  read(); const S = stepsFor(), k = S[STEP], err = check(k);
  if (err) { MSG = err; return render(); }
  const finish = STEP === S.length - 1;
  BUSY = true; MSG = ""; render();
  try {
    await core.fresh(); await save(k, finish);
    core.cfg().log && core.cfg().log("account", { detail: finish ? "finished" : "step-" + k, placement: "onboarding" });
    STEP++; BUSY = false;
    if (finish) core.changed();
    render(); window.scrollTo(0, 0);
  } catch (e) { BUSY = false; MSG = "Couldn't save. " + e.message; render(); }
}

export async function show() {
  const el = layer(); document.documentElement.classList.add("onbon"); el.hidden = false;
  if (!document.querySelector('meta[name="robots"][data-onb]')) document.head.insertAdjacentHTML("beforeend", '<meta name="robots" content="noindex, nofollow" data-onb>');
  if (!core.ses()) { el.innerHTML = top() + `<div class="onbwrap one"><section class="onbmain onbdone"><h1>Build your recruiting profile</h1><p class="onbsub">Create a free account first. It takes about two minutes and shows every college your marks fit.</p><div class="onbcta"><button type="button" class="acbtn" data-acc="signup" data-why="onboarding">Create free account</button><button type="button" class="onbback" data-acc="signin" data-why="onboarding">I already have an account</button></div></section></div>`; return; }
  if (IS_ADMIN == null) IS_ADMIN = await core.api("/rest/v1/rpc/is_admin", { method: "POST", body: {} }).catch(() => false) === true;
  D = draft(); D.marks = await loadMarks(); await loadAvatar();
  if (!D.marks.length) { const I = core.cfg().intent || {}; D.marks = [[I.e && (core.cfg().events ? core.cfg().events(D.gender || "m").includes(I.e) : true) ? I.e : "", I.m || ""]]; }
  const p = core.profile() || {};
  STEP = core.member() ? (location.pathname === "/account" ? stepsFor().length : 0) : Math.min(p.onboarding_step || 0, stepsFor().length - 1);
  if (IS_ADMIN && location.pathname === "/account") TAB = "admin";
  render();
}
export function hide() { const el = document.getElementById("onb"); if (el) { el.hidden = true; el.innerHTML = ""; } document.documentElement.classList.remove("onbon"); }
export const isPage = () => location.pathname === "/onboarding" || location.pathname === "/account";
export function go(path) { if (location.pathname !== path) history.pushState({}, "", path); show(); window.scrollTo(0, 0); }

export function bind() {
  addEventListener("popstate", () => { if (isPage()) show(); else hide(); });
  document.addEventListener("click", e => {
    const el = document.getElementById("onb"); if (!el || el.hidden || !el.contains(e.target)) return;
    const s = e.target.closest("[data-set]");
    if (s) { read(); const k = s.dataset.set, v = s.dataset.v; D[k] = k === "year" ? +v : v; MSG = "";
      if (k === "role") { STEP = 1; if (!fam()) { D.gender = ""; } }
      if (k === "gender") D.marks = D.marks.map(m => [core.cfg().events(v).includes(m[0]) ? m[0] : "", m[1]]);
      return render(); }
    const b = e.target.closest("[data-onb]"); if (!b) return; const a = b.dataset.onb; e.preventDefault();
    if (a === "exit") { history.pushState({}, "", "/"); hide(); core.changed(); return; }
    if (a === "back") { read(); MSG = ""; STEP = Math.max(0, STEP - 1); return render(); }
    if (a === "add") { read(); D.marks.push(["", ""]); return render(); }
    if (a === "rm") { read(); D.marks.splice(+b.dataset.i, 1); return render(); }
    if (a === "edit") { STEP = 1; TAB = "profile"; history.pushState({}, "", "/onboarding"); return render(); }
    if (a === "tab") { TAB = b.dataset.v; return render(); }
    if (a === "pick") { const f = el.querySelector("[data-onb-file]"); return f && f.click(); }
    if (a === "school") { const slug = b.dataset.slug; history.pushState({}, "", "/schools/" + slug); hide(); core.changed(); window.__prStandardsRoute && window.__prStandardsRoute(slug); return; }
    if (a === "adt") { ADMT = b.dataset.v; return render(); }
    if (a === "reload") { ADM = null; return render(); }
    if (a === "csv") return ADM && ADM.rows && csv();
    if (a === "out") { if (AVA.url) URL.revokeObjectURL(AVA.url); AVA = { url: null, path: null, busy: false, err: "" }; core.signOut(); hide(); history.pushState({}, "", "/"); return; }
    if (a === "see") { history.pushState({}, "", `/?g=${D.gender}&e=${encodeURIComponent(b.dataset.e)}&m=${encodeURIComponent(b.dataset.m)}`); hide(); core.changed(); window.__prStandardsRoute && window.__prStandardsRoute(null); return; }
  });
  document.addEventListener("submit", e => { if (e.target.id !== "onbf") return; e.preventDefault(); if (!BUSY) next(); });
  document.addEventListener("input", e => {
    const el = document.getElementById("onb"); if (!el || el.hidden || !el.contains(e.target)) return;
    if (e.target.dataset.in === "admq") { ADMQ = e.target.value; return render(); }
    if (e.target.dataset.mk) { read(); const i = +e.target.dataset.i, f = fitsFor(...D.marks[i]), s = el.querySelector(`[data-fit="${i}"]`);
      if (s) { s.className = "onbfit" + (f != null ? " on" : ""); s.innerHTML = f != null ? `<b>${f.toLocaleString()}</b> programs` : ""; }
      const c = el.querySelector(".pcard"); if (c) c.outerHTML = card(); }
    else if (e.target.dataset.in) { read(); const c = el.querySelector(".pcard"); if (c) c.outerHTML = card(); }
  });
  document.addEventListener("change", e => { if (e.target.matches && e.target.matches("[data-onb-file]")) { upload(e.target.files && e.target.files[0]); e.target.value = ""; return; } const el = document.getElementById("onb"); if (el && !el.hidden && el.contains(e.target) && (e.target.dataset.mk === "e" || e.target.dataset.in === "state")) { read(); render(); } });
}
