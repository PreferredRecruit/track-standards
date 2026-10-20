// @ts-nocheck
/* Site accounts (Ryan 2026-10-19, spec: social/standards/site/ACCOUNTS-PLAN.md in the editing repo).
   Own Supabase project "track-standards-accounts" (never the TPR project), email + password only, email verification required.
   Logged out: top 10 results per list, first 15 colleges in a standards search, 5 Recruiting AI questions.
   A finished profile (Finish Account) opens everything. The database scores the tier (A/B/C); the page only reads it
   to pick which offer to show. Nothing here sends data to Close or any ad platform. */
const URL_ = "https://vtbrenadwivmiursebfp.supabase.co";
const KEY = "sb_publishable_Ym2-USDV80BCDbIMm6EoUQ_aPqqbIbJ";   // publishable key: safe in the browser, row-level security does the rest
export const LIMITS = { results: 10, standards: 15, ai: 5 };
const SK = "prAcc", AIK = "prAiQ";
const ST = { AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington DC",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming" };
const GPA = [["3_5_plus","3.5 or higher"],["3_0_to_3_49","3.0 to 3.49"],["2_3_to_2_99","2.3 to 2.99"],["under_2_3","Under 2.3"]];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

const SEEN = new Set();
let CFG = {}, SES = null, PRO = null, VIEW = "signup", MSG = "", BUSY = false, WHY = "";
import * as ONB from "./onboard.js";
const store = { get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

async function api(path, { method = "GET", body, auth = true, prefer } = {}) {
  const h = { apikey: KEY, "Content-Type": "application/json" };
  if (auth && SES) h.Authorization = "Bearer " + SES.access_token;
  if (prefer) h.Prefer = prefer;
  const r = await fetch(URL_ + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (!r.ok) { const m = (j && (j.msg || j.message || j.error_description || j.error)) || ("Error " + r.status); const e = new Error(m); e.status = r.status; e.code = j && (j.error_code || j.code); throw e; }
  return j;
}
const keep = s => { SES = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)), user: { id: s.user ? s.user.id : (SES && SES.user.id), email: s.user ? s.user.email : (SES && SES.user.email) } } : null; store.set(SK, SES); };
async function fresh() {
  if (!SES) return null;
  if (SES.expires_at - 60 > Date.now() / 1000) return SES;
  try { keep(await api("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: SES.refresh_token }, auth: false })); }
  catch (e) { keep(null); PRO = null; }
  return SES;
}
async function loadProfile() {
  if (!(await fresh())) { PRO = null; return null; }
  const rows = await api("/rest/v1/profiles?select=*&id=eq." + SES.user.id).catch(() => []);
  PRO = rows && rows[0] || null; return PRO;
}

/* ---------- public helpers used by app.js ---------- */
export const signedIn = () => !!SES;
export const member = () => !!(SES && PRO && PRO.finished_at);
export const tier = () => member() ? PRO.tier : null;
export const profile = () => PRO;
export function aiLeft() { if (member()) return Infinity; return Math.max(0, LIMITS.ai - (+store.get(AIK) || 0)); }
export function aiUse() { if (!member()) store.set(AIK, (+store.get(AIK) || 0) + 1); }
/* inline wall: blurred hint + one button, never a full-screen block (Google intrusive-interstitial rule) */
export function wall(kind, total) {
  const t = { standards: [`See all ${total} colleges`, "Create a free account to see every college your mark fits, with filters by division, conference and state."],
    results: ["See the full list", "Create a free account to see every ranked mark, all divisions and side-by-side compare."],
    ai: ["Keep asking", `You've used your ${LIMITS.ai} free questions. Create a free account for unlimited answers.`] }[kind];
  const need = SES && !member();
  if (CFG.log && !SEEN.has(kind)) { SEEN.add(kind); CFG.log("account", { detail: "wall-" + kind, placement: kind }); }
  return `<div class="acwall" data-wall="${kind}"><b>${esc(need ? "Finish your account" : t[0])}</b><p>${esc(need ? "Build your recruiting profile to see everything. It takes about two minutes." : t[1])}</p>
    <button type="button" class="acbtn" data-acc="${need ? "finish" : "signup"}" data-why="${kind}">${need ? "Finish my account" : "Create free account"}</button>${need ? "" : `<button type="button" class="aclnk" data-acc="signin" data-why="${kind}">I already have an account</button>`}</div>`;
}
export async function optIn() { if (member()) { try { await api("/rest/v1/rpc/record_opt_in", { method: "POST", body: {} }); } catch (e) {} } }

/* ---------- modal ---------- */
function shell() {
  if (document.getElementById("acc")) return;
  document.body.insertAdjacentHTML("beforeend", `<div class="evbg" id="accbg" hidden></div><aside class="eval acc" id="acc" role="dialog" aria-modal="true" aria-labelledby="acch" aria-hidden="true"><button class="x" data-acc="close" aria-label="Close">×</button><div class="bd" id="accb"></div></aside>`);
  const hd = document.querySelector("header .hd .pill");
  if (hd && !document.getElementById("acchd")) hd.insertAdjacentHTML("beforebegin", `<button type="button" class="acchd" id="acchd" data-acc="menu"></button>`);
}
function headBtn() { const b = document.getElementById("acchd"); if (!b) return; const t = SES ? (member() ? "My account" : "Finish account") : "Sign in";
  b.setAttribute("aria-label", t); b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>${t}</span>`; }
export const isOpen = () => { const el = document.getElementById("acc"); return !!(el && el.classList.contains("on")); };
function open(v, why) { shell(); CFG.onOpen && CFG.onOpen(); VIEW = v; MSG = ""; if (why) WHY = why; draw(); const el = document.getElementById("acc"); el.classList.add("on"); el.setAttribute("aria-hidden", "false"); const bg = document.getElementById("accbg"); bg.hidden = false; requestAnimationFrame(() => bg.classList.add("on")); CFG.log && CFG.log("account", { detail: "open-" + v, placement: WHY || undefined }); setTimeout(() => { const f = el.querySelector("input,select"); f && f.focus(); }, 60); }
function close() { const el = document.getElementById("acc"); if (!el) return; el.classList.remove("on"); el.setAttribute("aria-hidden", "true"); const bg = document.getElementById("accbg"); bg.classList.remove("on"); setTimeout(() => (bg.hidden = true), 300); }

const field = (id, label, input) => `<label class="acf" for="${id}"><span>${label}</span>${input}</label>`;
const seg = (name, opts, cur) => `<div class="acseg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
const FORM = {};   // Finish Account draft

function draw() {
  const b = document.getElementById("accb"); if (!b) return;
  const err = MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : "";
  if (VIEW === "signup" || VIEW === "signin") {
    const up = VIEW === "signup";
    b.innerHTML = `<p class="eye">Free account</p><h2 class="evh" id="acch">${up ? "Create your free account" : "Welcome back"}</h2>
      <p class="acsub">${up ? "See every college your mark fits, the full results lists and unlimited Recruiting AI." : "Sign in to see your full lists."}</p>
      <form id="accf" class="acform" novalidate>${field("ace", "Email", `<input class="in" id="ace" type="email" autocomplete="email" required>`)}
      ${field("acp", "Password", `<input class="in" id="acp" type="password" autocomplete="${up ? "new-password" : "current-password"}" minlength="8" required>`)}
      ${up ? `<p class="achint">At least 8 characters.</p>` : ""}${err}
      <button class="acbtn" ${BUSY ? "disabled" : ""}>${BUSY ? "One moment…" : up ? "Create account" : "Sign in"}</button></form>
      <p class="acalt">${up ? `Already have an account? <button type="button" class="aclnk" data-acc="signin">Sign in</button>` : `New here? <button type="button" class="aclnk" data-acc="signup">Create a free account</button> · <button type="button" class="aclnk" data-acc="forgot">Forgot password?</button>`}</p>
      <small class="acfine">By creating an account you agree to our <a href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>. We never sell your data.</small>`;
  } else if (VIEW === "forgot") {
    b.innerHTML = `<p class="eye">Reset password</p><h2 class="evh" id="acch">Forgot your password?</h2><p class="acsub">We'll email you a link to set a new one.</p>
      <form id="accr" class="acform" novalidate>${field("acre", "Email", `<input class="in" id="acre" type="email" autocomplete="email" required>`)}${err}<button class="acbtn" ${BUSY ? "disabled" : ""}>Send reset link</button></form>
      <p class="acalt"><button type="button" class="aclnk" data-acc="signin">Back to sign in</button></p>`;
  } else if (VIEW === "check") {
    b.innerHTML = `<p class="eye">One more step</p><h2 class="evh" id="acch">Check your email</h2><p class="acsub">We sent a confirmation link to <b>${esc(FORM._email || "your email")}</b>. Open it on this device to finish your account.</p><button type="button" class="acbtn" data-acc="close">Got it</button>`;
  } else if (VIEW === "reset") {
    b.innerHTML = `<p class="eye">Reset password</p><h2 class="evh" id="acch">Choose a new password</h2><form id="accn" class="acform" novalidate>${field("acnp", "New password", `<input class="in" id="acnp" type="password" autocomplete="new-password" minlength="8" required>`)}${err}<button class="acbtn" ${BUSY ? "disabled" : ""}>Save password</button></form>`;
  } else if (VIEW === "finish") drawFinish(b, err);
  else if (VIEW === "menu") {
    const p = PRO || {};
    b.innerHTML = `<p class="eye">${esc(SES ? SES.user.email : "")}</p><h2 class="evh" id="acch">${member() ? "Your account" : "Finish your account"}</h2>
      ${member() ? `<p class="acsub">${p.role === "parent" ? "Parent" : p.role === "athlete" ? "Athlete" : p.role === "coach" ? "Coach" : "Fan"}${p.grade ? " · " + (/\d/.test(p.grade) ? p.grade + "th grade" : p.grade) : ""}${p.state ? " · " + esc(ST[p.state] || p.state) : ""}</p>` : `<p class="acsub">Add your grade, events and GPA band to see the full lists.</p>`}
      <button type="button" class="acbtn" data-acc="finish">${member() ? "Edit profile" : "Finish account"}</button><button type="button" class="aclnk acout" data-acc="out">Sign out</button>`;
  }
}

function drawFinish(b, err) {
  const p = PRO || {}, I = CFG.intent || {};
  if (!FORM._init) Object.assign(FORM, { _init: 1, role: p.role || "", gender: p.gender || I.g || "", grade: p.grade || (I.gr ? String(I.gr) : ""), state: p.state || "", gpa: p.gpa_band || "", pe: p.parent_email || "", pp: p.parent_phone || "", sms: !!p.sms_consent, age: !!p.age_13_plus, marks: FORM.marks || [[I.e || "", I.m || ""]] });
  const ath = FORM.role === "athlete", par = FORM.role === "parent", fam = ath || par;
  const evList = FORM.gender ? (CFG.events ? CFG.events(FORM.gender) : []) : [];
  const evOpt = cur => `<option value="">Event</option>${evList.map(e => `<option value="${esc(e)}" ${e === cur ? "selected" : ""}>${esc(CFG.evName ? CFG.evName(e, FORM.gender) : e)}</option>`).join("")}`;
  b.innerHTML = `<p class="eye">About 20 seconds</p><h2 class="evh" id="acch">Finish your account</h2>
    <form id="accp" class="acform" novalidate>
    <div class="acq"><span>I am</span>${seg("role", [["athlete", "An athlete"], ["parent", "A parent"], ["coach", "A coach"], ["fan", "Just a fan"]], FORM.role)}</div>
    ${fam ? `<div class="acq"><span>Team</span>${seg("gender", [["m", "Men"], ["w", "Women"]], FORM.gender)}</div>
    <div class="acq"><span>${par ? "Your athlete's grade" : "Grade"}</span>${seg("grade", [["9", "9th"], ["10", "10th"], ["11", "11th"], ["12", "12th"], ["college", "College"]], FORM.grade)}</div>
    ${field("acst", "State", `<select class="in" id="acst"><option value="">Choose a state</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${k === FORM.state ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`)}
    <div class="acq"><span>Cumulative high school GPA</span>${seg("gpa", GPA, FORM.gpa)}</div>
    <div class="acq"><span>${par ? "Your athlete's best marks" : "Your best marks"}</span>${FORM.gender ? FORM.marks.map((m, i) => `<div class="acmk"><select class="in" data-mk="e" data-i="${i}" aria-label="Event">${evOpt(m[0])}</select><input class="in" data-mk="m" data-i="${i}" value="${esc(m[1])}" placeholder="${esc(CFG.ph ? CFG.ph(m[0]) : "PR")}" aria-label="Best mark" inputmode="decimal" autocomplete="off"></div>`).join("") + (FORM.marks.length < 3 ? `<button type="button" class="aclnk" data-acc="addmk">+ Add another event</button>` : "") : `<p class="achint">Pick a team first.</p>`}</div>
    ${ath ? field("acpe", "A parent's email (optional)", `<input class="in" id="acpe" type="email" value="${esc(FORM.pe)}" autocomplete="off">`) + `<p class="achint">Recruiting help goes to a parent, never to an athlete directly.</p>` : ""}
    ${par ? field("acpp", "Phone (optional)", `<input class="in" id="acpp" type="tel" value="${esc(FORM.pp)}" autocomplete="tel">`) + `<label class="acck"><input type="checkbox" id="acsms" ${FORM.sms ? "checked" : ""}> Preferred Recruit may text me about my athlete's recruiting. Message rates apply. Reply STOP to opt out.</label>` : ""}` : ""}
    <label class="acck"><input type="checkbox" id="acage" ${FORM.age ? "checked" : ""}> I am 13 or older.</label>${err}
    <button class="acbtn" ${BUSY ? "disabled" : ""}>${BUSY ? "Saving…" : "See my full results"}</button></form>`;
}
function readFinish() {
  const v = id => { const e = document.getElementById(id); return e ? e.value.trim() : undefined; };
  if (v("acst") !== undefined) FORM.state = v("acst"); if (v("acpe") !== undefined) FORM.pe = v("acpe"); if (v("acpp") !== undefined) FORM.pp = v("acpp");
  const s = document.getElementById("acsms"); if (s) FORM.sms = s.checked; const a = document.getElementById("acage"); if (a) FORM.age = a.checked;
  document.querySelectorAll("#accp [data-mk]").forEach(el => { FORM.marks[+el.dataset.i][el.dataset.mk === "e" ? 0 : 1] = el.value.trim(); });
}
async function saveFinish() {
  readFinish();
  const fam = FORM.role === "athlete" || FORM.role === "parent";
  if (!FORM.role) return fail("Choose who you are.");
  if (!FORM.age) return fail("You need to be 13 or older to create an account.");
  const marks = [];
  if (fam) {
    if (!FORM.gender) return fail("Choose Men or Women.");
    if (!FORM.grade) return fail("Choose a grade.");
    if (!FORM.state) return fail("Choose a state.");
    if (!FORM.gpa) return fail("Choose a GPA band.");
    for (const [e, m] of FORM.marks) { if (!e && !m) continue; const n = CFG.parse ? CFG.parse(m, e) : null; if (!e || n == null) return fail(`Check the mark for ${e || "the event"}${e && CFG.ph ? " (for example " + CFG.ph(e) + ")" : ""}.`); marks.push({ user_id: SES.user.id, event: e, mark: n }); }
    if (!marks.length) return fail("Add at least one event and best mark.");
    if (FORM.pe && !/^\S+@\S+\.\S+$/.test(FORM.pe)) return fail("Check the parent's email.");
  }
  BUSY = true; MSG = ""; draw();
  try {
    await fresh();
    const row = { id: SES.user.id, role: FORM.role, age_13_plus: true, site_sid: CFG.sid || null, finished_at: (PRO && PRO.finished_at) || new Date().toISOString(),
      gender: fam ? FORM.gender : null, grade: fam ? FORM.grade : null, state: fam ? FORM.state : null, gpa_band: fam ? FORM.gpa : null,
      parent_email: FORM.role === "athlete" && FORM.pe ? FORM.pe : null, parent_phone: FORM.role === "parent" && FORM.pp ? FORM.pp : null, sms_consent: FORM.role === "parent" && !!FORM.pp && FORM.sms };
    await api("/rest/v1/profiles?on_conflict=id", { method: "POST", body: row, prefer: "resolution=merge-duplicates,return=minimal" });
    await api("/rest/v1/marks?user_id=eq." + SES.user.id, { method: "DELETE" });
    if (marks.length) await api("/rest/v1/marks", { method: "POST", body: marks, prefer: "return=minimal" });
    await loadProfile();
    CFG.log && CFG.log("account", { detail: "finished", placement: WHY || undefined });
    BUSY = false; close(); changed();
  } catch (e) { BUSY = false; fail("Couldn't save. " + e.message); }
}
function fail(m) { MSG = m; BUSY = false; draw(); }
function changed() { headBtn(); CFG.onChange && CFG.onChange(); }

async function submit(id) {
  if (id === "accp") return saveFinish();
  const val = x => (document.getElementById(x) || {}).value || "";
  if (id === "accf") {
    const email = val("ace").trim(), pw = val("acp");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email.");
    if (pw.length < 8) return fail("Use at least 8 characters for your password.");
    BUSY = true; MSG = ""; draw();
    try {
      if (VIEW === "signup") {
        const r = await api("/auth/v1/signup?redirect_to=" + encodeURIComponent(location.origin + "/onboarding"), { method: "POST", body: { email, password: pw }, auth: false });
        CFG.log && CFG.log("account", { detail: "signup", placement: WHY || undefined });
        if (r && r.access_token) { keep(r); await loadProfile(); BUSY = false; close(); changed(); ONB.go("/onboarding"); return; }
        FORM._email = email; BUSY = false; VIEW = "check"; draw(); return;
      }
      keep(await api("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password: pw }, auth: false }));
      await loadProfile(); BUSY = false; CFG.log && CFG.log("account", { detail: "signin" });
      close(); changed(); if (ONB.isPage()) ONB.show(); else if (!member()) ONB.go("/onboarding");
    } catch (e) {
      BUSY = false;
      fail(/confirm/i.test(e.message) ? "Confirm your email first. Check your inbox for the link." : /invalid login/i.test(e.message) ? "That email and password don't match." : /already registered|exists/i.test(e.message) ? "That email already has an account. Sign in instead." : /pwned|weak|leaked/i.test(e.message + (e.code || "")) ? "That password has shown up in a data breach. Choose a different one." : e.message);
    }
  } else if (id === "accr") {
    const email = val("acre").trim(); if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email.");
    BUSY = true; draw();
    try { await api("/auth/v1/recover?redirect_to=" + encodeURIComponent(location.origin + location.pathname), { method: "POST", body: { email }, auth: false }); } catch (e) {}
    BUSY = false; MSG = ""; FORM._email = email; VIEW = "check"; draw();
    document.querySelector("#accb .acsub").innerHTML = `If <b>${esc(email)}</b> has an account, a reset link is on its way.`;
  } else if (id === "accn") {
    const pw = val("acnp"); if (pw.length < 8) return fail("Use at least 8 characters.");
    BUSY = true; draw();
    try { await api("/auth/v1/user", { method: "PUT", body: { password: pw } }); BUSY = false; close(); changed(); } catch (e) { fail(e.message); }
  }
}

/* links from the confirmation / reset emails land with tokens in the URL hash */
async function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("error_description")) { history.replaceState(null, "", location.pathname + location.search); open("signin"); fail(h.get("error_description").replace(/\+/g, " ")); return; }
  if (!h.get("access_token")) return;
  keep({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600 });
  history.replaceState(null, "", location.pathname + location.search);
  try { const u = await api("/auth/v1/user"); SES.user = { id: u.id, email: u.email }; store.set(SK, SES); } catch (e) { keep(null); return; }
  await loadProfile(); changed();
  if (h.get("type") === "recovery") open("reset"); else if (!member()) ONB.go("/onboarding"); else if (ONB.isPage()) ONB.show();
}

function signOut() { api("/auth/v1/logout", { method: "POST" }).catch(() => {}); keep(null); PRO = null; for (const k in FORM) delete FORM[k]; changed(); }
export const core = { ST, api, fresh, loadProfile, changed, signOut, member, profile: () => PRO, ses: () => SES, cfg: () => CFG };
export async function init(cfg) {
  CFG = cfg || {}; SES = store.get(SK); shell(); headBtn();
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-acc],[data-seg],a[href*='parentfunnel']"); if (!t) return;
    if (t.matches("a[href*='parentfunnel']")) { optIn(); return; }
    if (t.dataset.seg) { readFinish(); FORM[t.dataset.seg] = t.dataset.v; MSG = ""; draw(); return; }
    const a = t.dataset.acc; e.preventDefault();
    if (a === "close") return close();
    if (a === "addmk") { readFinish(); FORM.marks.push(["", ""]); return draw(); }
    if (a === "out") { signOut(); close(); return; }
    if (a === "menu") return SES ? ONB.go(member() ? "/account" : "/onboarding") : open("signin");
    if (a === "finish") { close(); return ONB.go("/onboarding"); }
    if (VIEW === a && document.getElementById("acc").classList.contains("on")) return;
    open(a, t.dataset.why);
  });
  document.addEventListener("submit", e => { if (!e.target.closest("#acc")) return; e.preventDefault(); if (!BUSY) submit(e.target.id); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  document.addEventListener("click", e => { if (e.target.id === "accbg") close(); });
  ONB.bind();
  if (SES) await loadProfile();
  headBtn();
  await fromHash();
  if (ONB.isPage()) ONB.show();
  return member();
}
