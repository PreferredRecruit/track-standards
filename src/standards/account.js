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
let KIDS = [], MINE = [], RESENT = 0, CLS = null, PRV = null;
let CFG = {}, SES = null, PRO = null, VIEW = "signup", MSG = "", BUSY = false, WHY = "";
/* the account pages load on demand (2026-11-02 speed pass: 59 KB most visitors never use). Same calls as before. */
let ONBM = null;
const onb = () => ONBM || (ONBM = import("./onboard.js").then(m => { m.bind(); return m; }));
const ONB = { isPage: () => location.pathname === "/onboarding" || location.pathname === "/account",
  go: p => onb().then(m => m.go(p)), show: () => onb().then(m => m.show()),
  bind: () => addEventListener("popstate", () => { if (!ONBM && ONB.isPage()) ONB.show(); }) };
const store = { get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- staying signed in (Ryan 2026-10-20: "I should not have to log in every single time I visit") ----------
   The session lives in localStorage plus a 400-day first-party cookie backup (some phones and in-app browsers clear
   localStorage). Access tokens last an hour and are renewed before they run out, on tab focus and on any 401, by one
   tab at a time (Web Locks), and other tabs pick the new tokens up from storage. A failed network call never signs
   anyone out: only the server saying the refresh token is invalid does. */
const CK = "pr_rt";
const cookie = { get() { const m = document.cookie.match(/(?:^|; )pr_rt=([^;]*)/); try { return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { return null; } },
  set(v) { try { document.cookie = v ? `${CK}=${encodeURIComponent(JSON.stringify(v))}; Max-Age=${400 * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}` : `${CK}=; Max-Age=0; Path=/; SameSite=Lax`; } catch (e) {} } };
async function api(path, { method = "GET", body, auth = true, prefer } = {}, retried) {
  const h = { apikey: KEY, "Content-Type": "application/json" };
  if (auth && SES) h.Authorization = "Bearer " + SES.access_token;
  if (prefer) h.Prefer = prefer;
  const r = await fetch(URL_ + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (r.status === 401 && auth && SES && !retried && !/\/auth\/v1\/token/.test(path)) { await fresh(true); if (SES) return api(path, { method, body, auth, prefer }, true); }
  if (!r.ok) { const m = (j && (j.msg || j.message || j.error_description || j.error)) || ("Error " + r.status); const e = new Error(m); e.status = r.status; e.code = j && (j.error_code || j.code); throw e; }
  return j;
}
const keep = s => {
  SES = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)), user: { id: s.user ? s.user.id : (SES && SES.user.id), email: s.user ? s.user.email : (SES && SES.user.email) } } : null;
  store.set(SK, SES); cookie.set(SES ? { rt: SES.refresh_token, id: SES.user.id, email: SES.user.email } : null); schedule();
};
let REFRESHING = null, TIMER = null;
function schedule() { clearTimeout(TIMER); if (!SES) return; const ms = Math.max(30000, (SES.expires_at - 120) * 1000 - Date.now()); TIMER = setTimeout(() => fresh(true), Math.min(ms, 2147483000)); }
async function doRefresh(force) {
  const latest = store.get(SK); if (latest && latest.refresh_token && (!SES || latest.expires_at > SES.expires_at)) SES = latest;   // another tab already renewed
  if (!SES) return null;
  if (!force && SES.expires_at - 120 > Date.now() / 1000) return SES;
  const rt = SES.refresh_token;
  for (let i = 0; i < 3; i++) {
    try { keep(await api("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: rt }, auth: false })); return SES; }
    catch (e) {
      const after = store.get(SK); if (after && after.refresh_token !== rt) { SES = after; schedule(); return SES; }   // renewed elsewhere meanwhile
      if (e.status === 400 || e.status === 401 || e.status === 403) { keep(null); PRO = null; KIDS = []; changed(); return null; }   // the server says this sign-in is over
      await new Promise(ok => setTimeout(ok, 800 * (i + 1)));   // network hiccup: keep the session and try again
    }
  }
  return SES;
}
async function fresh(force) {
  if (!SES) return null;
  if (!force && SES.expires_at - 120 > Date.now() / 1000) return SES;
  if (REFRESHING) return REFRESHING;
  REFRESHING = (navigator.locks ? navigator.locks.request("pr-auth-refresh", () => doRefresh(force)) : doRefresh(force)).finally(() => { REFRESHING = null; });
  return REFRESHING;
}
/* restore a session from the cookie backup when localStorage was cleared */
async function restore() {
  if (SES) { const c = cookie.get(); if (!c || c.rt !== SES.refresh_token) cookie.set({ rt: SES.refresh_token, id: SES.user.id, email: SES.user.email }); return; }
  const c = cookie.get(); if (!c || !c.rt) return;
  SES = { access_token: "", refresh_token: c.rt, expires_at: 0, user: { id: c.id, email: c.email } };
  await fresh(true);
}
async function loadProfile() {
  if (!(await fresh())) { PRO = null; cacheRank(); return null; }
  const rows = await api("/rest/v1/profiles?select=*&id=eq." + SES.user.id).catch(() => []);
  PRO = rows && rows[0] || null; KIDS = []; MINE = [];
  CLS = null; if (PRO) { const cr = await api("/rest/v1/account_classes?select=class&user_id=eq." + SES.user.id).catch(() => []); CLS = cr && cr[0] ? cr[0].class : null; }
  cacheRank(); prBadge();
  if (PRO && PRO.role === "athlete") { const ms = await api("/rest/v1/marks?select=event,mark&user_id=eq." + SES.user.id + "&athlete_id=is.null").catch(() => []); MINE = (ms || []).map(m => ({ e: m.event, v: +m.mark })); }
  if (PRO && PRO.role === "parent") {
    const [ks, ms] = await Promise.all([api("/rest/v1/athletes?select=id,first_name,gender,grad_year,grade,gpa,tier,dream_schools&parent_id=eq." + SES.user.id + "&order=created_at").catch(() => []), api("/rest/v1/marks?select=event,mark,athlete_id&user_id=eq." + SES.user.id).catch(() => [])]);
    KIDS = (ks || []).map(k => Object.assign(k, { marks: (ms || []).filter(m => m.athlete_id === k.id).map(m => ({ e: m.event, v: +m.mark })) }));
  }
  if (PRO && PRO.role === "parent" && PRO.finished_at && !PRO.email_updates && !EMASKED && !store.get(EMK)) { EMASKED = 1; setTimeout(emAsk, 4000); }
  return PRO;
}

/* one-time ask for existing parents (Ryan 2026-11-08 "approve"): standards-change emails, one a month at most. Asked once per
   browser; any answer (or the close button) stores the flag. New parents get the same checkbox in onboarding and settings. */
const EMK = "prEmAsk"; let EMASKED = 0;
function emAsk() {
  if (!PRO || PRO.email_updates || store.get(EMK) || document.getElementById("emask")) return;
  if (document.querySelector(".onb, #acc.on, [role=dialog][aria-modal=true]")) { setTimeout(emAsk, 8000); return; }
  document.body.insertAdjacentHTML("beforeend", `<div class="emask" id="emask" role="region" aria-label="Email updates"><p>Want the monthly standards update? What changed in college track recruiting, and where your athlete stands. One email a month.</p><div class="emab"><button type="button" class="btn emyes">Yes, email me</button><button type="button" class="emno">No thanks</button></div></div>`);
  const el = document.getElementById("emask"), done = v => { store.set(EMK, v); el.remove(); };
  el.querySelector(".emyes").onclick = async () => {
    done("yes");
    try { await api("/rest/v1/profiles?id=eq." + SES.user.id, { method: "PATCH", prefer: "return=minimal", body: { email_updates: true } }); PRO.email_updates = true; } catch (e) { store.set(EMK, null); }
  };
  el.querySelector(".emno").onclick = () => done("no");
}

/* Preferred Recruit verified badge (Ryan 2026-11-02: "when the kids use their TPR email and verify it, then they get automatically
   verified badge"). The badge row is written only by the pr-verify function, after TPR confirms this account's own confirmed email is
   a Preferred Recruit athlete or parent email. Read the row; if there is none, ask pr-verify once per visit. Sends nothing to anyone. */
async function prBadge() {
  const id = SES && SES.user && SES.user.id; if (!id) { PRV = null; return; }
  const rows = await api("/rest/v1/pr_verified?select=via&user_id=eq." + id).catch(() => []);
  PRV = rows && rows[0] ? rows[0].via : null; if (PRV) return;
  const k = "prVerChk:" + id; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) {}
  try { const r = await fetch(URL_ + "/functions/v1/pr-verify", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + SES.access_token } }).then(x => x.json());
    if (r && r.verified) { PRV = r.via; CFG.log && CFG.log("account", { detail: "pr-verified" }); changed(); } } catch (e) {}
}
export const prVerified = () => !!PRV;
/* the badge itself: a check in a filled circle, with a plain-word tooltip */
export const badge = (sz = 16) => PRV ? badgeSvg(sz) : "";
export const badgeSvg = (sz = 16) => `<span class="prvb" title="Verified Preferred Recruit athlete" aria-label="Verified Preferred Recruit athlete"><svg width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5l2.6 2 3.3-.3 1 3.1 2.8 1.8-.9 3.2.9 3.2-2.8 1.8-1 3.1-3.3-.3-2.6 2-2.6-2-3.3.3-1-3.1-2.8-1.8.9-3.2-.9-3.2 2.8-1.8 1-3.1 3.3.3z"/><path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

/* ---------- public helpers used by app.js ---------- */
export const signedIn = () => !!SES;
export const member = () => !!(SES && PRO && PRO.finished_at);
export const tier = () => member() ? PRO.tier : null;
/* account class S / M (parents) for lead tracking; "standard" accounts carry the tier only */
export const cls = () => member() && (CLS === "S" || CLS === "M") ? CLS : null;
/* rank tag added to utm_term on every evaluation link (index.html click handler); no personal data, only tier + class */
export const rankTag = () => member() ? ["t" + PRO.tier, cls() ? "c" + cls() : ""].filter(Boolean).join(" ") : "";
if (typeof window !== "undefined") window.prRank = () => rankTag();
/* static SEO pages have no account code: they read this cached tag (tier + class only) */
function cacheRank() { try { const r = rankTag(); if (r) localStorage.setItem("prRank", r); else localStorage.removeItem("prRank"); } catch (e) {} }
export const profile = () => PRO;
export const kids = () => KIDS;
/* the signed-in athlete's own PRs ({e, v}), for "where would you fit" in Compare */
export const myMarks = () => MINE;
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
  ensureHead();
}
/* header Sign in / My account button (Ryan 2026-10-21: "make sure the sign-in button remains persistent and visible across all views").
   The header can be redrawn (route change, React remount); every render calls this, so the button is put back and relabelled. */
export function ensureHead() {
  const pill = document.querySelector("header .hd .pill"); if (!pill) return;
  let b = document.getElementById("acchd");
  if (b && !pill.parentNode.contains(b)) { b.remove(); b = null; }
  if (!b) { pill.insertAdjacentHTML("beforebegin", `<button type="button" class="acchd" id="acchd" data-acc="menu"></button>`); headBtn(); }
  else if (!b.firstChild) headBtn();
}
function headBtn() { const b = document.getElementById("acchd"); if (!b) return; const t = SES ? (member() ? "My account" : "Finish account") : "Sign in";
  b.setAttribute("aria-label", t); b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span>${t}</span>${member() ? badge(14) : ""}`; }
export const isOpen = () => { const el = document.getElementById("acc"); return !!(el && el.classList.contains("on")); };
function open(v, why) { shell(); CFG.onOpen && CFG.onOpen(); VIEW = v; MSG = ""; if (why) WHY = why; draw(); const el = document.getElementById("acc"); el.classList.add("on"); el.setAttribute("aria-hidden", "false"); const bg = document.getElementById("accbg"); bg.hidden = false; requestAnimationFrame(() => bg.classList.add("on")); CFG.log && CFG.log("account", { detail: "open-" + v, placement: WHY || undefined }); setTimeout(() => { const f = el.querySelector("input,select"); f && f.focus(); }, 60); }
/* phones: the confirm link often opens in another browser, so the tab that signed up never learns it worked (2026-11-05: 49% of phone
   signups reached the profile steps, 73% on desktop). While the "check your email" sheet is up, quietly try the sign-in again, on return
   to the tab and every 8 seconds, for 15 minutes. The password stays in memory only. */
let WATCH = null;
function stopWatch() { if (WATCH) { clearInterval(WATCH.t); document.removeEventListener("visibilitychange", WATCH.on); WATCH = null; } }
function watchConfirm(email, password) {
  stopWatch();
  const w = WATCH = { busy: false, errs: 0, until: Date.now() + 15 * 6e4 };
  w.on = async () => {
    if (WATCH !== w || w.busy || document.visibilityState !== "visible") return;
    if (SES || VIEW !== "check" || Date.now() > w.until) return stopWatch();
    w.busy = true;
    try {
      const r = await api("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password }, auth: false });
      if (WATCH !== w) return;
      stopWatch(); keep(r); await loadProfile();
      CFG.log && CFG.log("account", { detail: "confirm-auto" });
      try { localStorage.removeItem("prPending"); } catch (e) {}
      close(); changed(); if (ONB.isPage()) ONB.show(); else if (!member()) ONB.go("/onboarding");
    } catch (e) { if (!/confirm/i.test(e.message) && ++w.errs >= 3) stopWatch(); }
    w.busy = false;
  };
  w.t = setInterval(w.on, 8000);
  document.addEventListener("visibilitychange", w.on);
}
function close() { const el = document.getElementById("acc"); if (!el) return; el.classList.remove("on"); el.setAttribute("aria-hidden", "true"); const bg = document.getElementById("accbg"); bg.classList.remove("on"); setTimeout(() => (bg.hidden = true), 300); }

/* password field with a Show / Hide toggle (Ryan 2026-10-20: "it should not be difficult for these kids to sign up") */
const pw = (id, label, ac) => `<label class="acf" for="${id}"><span>${label}</span><span class="acpw"><input class="in" id="${id}" type="password" autocomplete="${ac}" minlength="6" required><button type="button" class="acshow" data-show="${id}" aria-label="Show password">Show</button></span></label>`;
const field = (id, label, input) => `<label class="acf" for="${id}"><span>${label}</span>${input}</label>`;
const seg = (name, opts, cur) => `<div class="acseg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
const FORM = {};   // Finish Account draft
/* 6-digit email codes (Ryan 2026-11-12): links died when kids pressed "send again" (each email cancels the last link) or when school /
   iCloud mail scanners opened the link first. The emails now carry a code typed here; the newest code always works. */
let PENDPW = "";
const codeForm = (label, err) => `<form id="accc" class="acform acotp" novalidate>${field("acotp", "6-digit code", `<input class="in acotpi" id="acotp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="8" placeholder="123456" required>`)}${err}<button class="acbtn" ${BUSY ? "disabled" : ""}>${BUSY ? "Checking…" : label}</button></form>`;

function draw() {
  const b = document.getElementById("accb"); if (!b) return;
  /* keep what they typed (and Show/Hide) when the sheet redraws for an error message */
  const keep = {}, shown = !!b.querySelector('.acpw input[type="text"]'), foc = document.activeElement && document.activeElement.id;
  b.querySelectorAll("input").forEach(i => { if (i.id) keep[i.id] = i.value; });
  setTimeout(() => { for (const id in keep) { const i = document.getElementById(id); if (i && !i.value) i.value = keep[id]; }
    if (shown) { b.querySelectorAll(".acpw input").forEach(i => i.type = "text"); b.querySelectorAll(".acshow").forEach(x => { x.textContent = "Hide"; x.setAttribute("aria-label", "Hide password"); }); }
    const f = foc && document.getElementById(foc); if (f && b.contains(f)) f.focus(); }, 0);
  const err = MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : "";
  if (VIEW === "signup" || VIEW === "signin") {
    const up = VIEW === "signup";
    b.innerHTML = `<p class="eye">Free account</p><h2 class="evh" id="acch">${up ? "Create your free account" : "Welcome back"}</h2>
      <p class="acsub">${up ? "See every college your mark fits, the full results lists and unlimited Recruiting AI." : "Sign in to see your full lists."}</p>
      <form id="accf" class="acform" novalidate>${field("ace", "Email", `<input class="in" id="ace" type="email" autocomplete="email" value="${esc(FORM._email || "")}" required>`)}
      ${pw("acp", "Password", up ? "new-password" : "current-password")}
      ${up ? pw("acp2", "Confirm password", "new-password") + `<p class="achint">At least 6 characters.</p>` : ""}${err}
      <button class="acbtn" ${BUSY ? "disabled" : ""}>${BUSY ? "One moment…" : up ? "Create account" : "Sign in"}</button></form>
      ${up ? "" : `<div class="acor"><span>or</span></div><button type="button" class="acbtn acghost" data-acc="link">Email me a sign-in code</button><p class="achint acc2">No password needed. We'll email you a 6-digit code that signs you straight in.</p>`}
      <p class="acalt">${up ? `Already have an account? <button type="button" class="aclnk" data-acc="signin">Sign in</button>` : `New here? <button type="button" class="aclnk" data-acc="signup">Create a free account</button> · <button type="button" class="aclnk" data-acc="forgot">Forgot password?</button>`}</p>
      <small class="acfine">By creating an account you agree to our <a href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>. We never sell your data.</small>`;
  } else if (VIEW === "expired") {
    b.innerHTML = `<p class="eye">Email link</p><h2 class="evh" id="acch">That link has expired</h2><p class="acsub">Email links only work once and for a limited time. Enter your email and we'll send you a 6-digit code instead.</p>
      <form id="accx" class="acform" novalidate>${field("acx", "Email", `<input class="in" id="acx" type="email" autocomplete="email" value="${esc(FORM._email || "")}" required>`)}${err}<button class="acbtn" ${BUSY ? "disabled" : ""}>${BUSY ? "One moment…" : "Send me a code"}</button></form>
      <p class="acalt">Already confirmed? <button type="button" class="aclnk" data-acc="signin">Sign in</button></p>`;
  } else if (VIEW === "forgot") {
    b.innerHTML = `<p class="eye">Reset password</p><h2 class="evh" id="acch">Forgot your password?</h2><p class="acsub">We'll email you a 6-digit code, then you choose a new password.</p>
      <form id="accr" class="acform" novalidate>${field("acre", "Email", `<input class="in" id="acre" type="email" autocomplete="email" value="${esc(FORM._email || "")}" required>`)}${err}<button class="acbtn" ${BUSY ? "disabled" : ""}>Send reset code</button></form>
      <div class="acor"><span>or</span></div><button type="button" class="acbtn acghost" data-acc="link">Email me a sign-in code instead</button>
      <p class="acalt"><button type="button" class="aclnk" data-acc="signin">Back to sign in</button></p>`;
  } else if (VIEW === "sent") {
    const em = FORM._email || "", dom = (em.split("@")[1] || "").toLowerCase(), reset = FORM._sent === "reset";
    const inbox = /gmail|googlemail/.test(dom) ? ["Open Gmail", "https://mail.google.com/mail/u/0/#search/from%3Atrackandfieldstandards.com"] : /outlook|hotmail|live|msn/.test(dom) ? ["Open Outlook", "https://outlook.live.com/mail/0/"] : /yahoo/.test(dom) ? ["Open Yahoo Mail", "https://mail.yahoo.com/"] : /icloud|me\.com|mac\.com/.test(dom) ? ["Open iCloud Mail", "https://www.icloud.com/mail"] : null;
    b.innerHTML = `<p class="eye">${reset ? "Reset password" : "Sign-in code"}</p><h2 class="evh" id="acch">Check your email</h2><p class="acsub">If <b>${esc(em)}</b> has an account, we just sent a 6-digit code. Type it below${reset ? ", then choose a new password." : " and you're in, no password needed."}</p>
      ${codeForm(reset ? "Continue" : "Sign in", MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : "")}
      ${inbox ? `<a class="acbtn acghost acmail" href="${inbox[1]}" target="_blank" rel="noopener">${inbox[0]}</a>` : ""}
      <p class="achint">It comes from Track &amp; Field Standards. Not there after a minute? Check spam or promotions. If you asked more than once, use the newest email.</p>
      <div class="acrow"><button type="button" class="aclnk" data-acc="${reset ? "again-reset" : "link"}" ${RESENT > Date.now() ? "disabled" : ""}>${RESENT > Date.now() ? "Email sent again" : "Send it again"}</button><button type="button" class="aclnk" data-acc="signin">Back to sign in</button></div>`;
  } else if (VIEW === "check") {
    const em = FORM._email || "", dom = (em.split("@")[1] || "").toLowerCase();
    const inbox = /gmail|googlemail/.test(dom) ? ["Open Gmail", "https://mail.google.com/mail/u/0/#search/from%3Atrackandfieldstandards.com"] : /outlook|hotmail|live|msn/.test(dom) ? ["Open Outlook", "https://outlook.live.com/mail/0/"] : /yahoo/.test(dom) ? ["Open Yahoo Mail", "https://mail.yahoo.com/"] : /icloud|me\.com|mac\.com/.test(dom) ? ["Open iCloud Mail", "https://www.icloud.com/mail"] : null;
    b.innerHTML = `<p class="eye">One more step</p><h2 class="evh" id="acch">Check your email</h2><p class="acsub">We sent a 6-digit code to <b>${esc(em || "your email")}</b>. Type it below to finish your free account.</p>
      ${codeForm("Confirm my email", MSG ? `<p class="acerr" role="alert">${esc(MSG)}</p>` : "")}
      ${inbox ? `<a class="acbtn acghost acmail" href="${inbox[1]}" target="_blank" rel="noopener">${inbox[0]}</a>` : ""}
      <p class="achint">It comes from Track &amp; Field Standards. Not there after a minute? Check spam or promotions. If you asked more than once, use the newest email.</p>
      <div class="acrow"><button type="button" class="aclnk" data-acc="resend" ${RESENT > Date.now() ? "disabled" : ""}>${RESENT > Date.now() ? "Email sent again" : "Send it again"}</button><button type="button" class="aclnk" data-acc="signup">Wrong email? Start over</button></div>`;
  } else if (VIEW === "reset") {
    b.innerHTML = `<p class="eye">Reset password</p><h2 class="evh" id="acch">Choose a new password</h2><form id="accn" class="acform" novalidate>${pw("acnp", "New password", "new-password")}${pw("acnp2", "Confirm new password", "new-password")}<p class="achint">At least 6 characters.</p>${err}<button class="acbtn" ${BUSY ? "disabled" : ""}>Save password</button></form>`;
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
  if (!FORM._init) Object.assign(FORM, { _init: 1, role: p.role || "", gender: p.gender || I.g || "", grade: p.grade || (I.gr ? String(I.gr) : ""), state: p.state || "", gpa: p.gpa_band || "", pe: p.parent_email || "", pp: p.parent_phone || "", sms: !!p.sms_consent, em: !!p.email_updates, age: !!p.age_13_plus, marks: FORM.marks || [[I.e || "", I.m || ""]] });
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
    ${par ? field("acpp", "Phone (optional)", `<input class="in" id="acpp" type="tel" value="${esc(FORM.pp)}" autocomplete="tel">`) + `<label class="acck"><input type="checkbox" id="acsms" ${FORM.sms ? "checked" : ""}> Preferred Recruit may text me about my athlete's recruiting. Message rates apply. Reply STOP to opt out.</label><label class="acck"><input type="checkbox" id="acem" ${FORM.em ? "checked" : ""}> Send me the monthly standards update: what changed in college track recruiting, the NCAA news that matters, and where my athlete stands. One email a month. Unsubscribe any time.</label>` : ""}` : ""}
    <label class="acck"><input type="checkbox" id="acage" ${FORM.age ? "checked" : ""}> I am 13 or older.</label>${err}
    <button class="acbtn" ${BUSY ? "disabled" : ""}>${BUSY ? "Saving…" : "See my full results"}</button></form>`;
}
function readFinish() {
  const v = id => { const e = document.getElementById(id); return e ? e.value.trim() : undefined; };
  if (v("acst") !== undefined) FORM.state = v("acst"); if (v("acpe") !== undefined) FORM.pe = v("acpe"); if (v("acpp") !== undefined) FORM.pp = v("acpp");
  const s = document.getElementById("acsms"); if (s) FORM.sms = s.checked; const em = document.getElementById("acem"); if (em) FORM.em = em.checked; const a = document.getElementById("acage"); if (a) FORM.age = a.checked;
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
      parent_email: FORM.role === "athlete" && FORM.pe ? FORM.pe : null, parent_phone: FORM.role === "parent" && FORM.pp ? FORM.pp : null, sms_consent: FORM.role === "parent" && !!FORM.pp && FORM.sms, email_updates: FORM.role === "parent" && !!FORM.em };
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
    if (pw.length < 6) return fail("Use at least 6 characters for your password.");
    if (VIEW === "signup" && pw !== val("acp2")) return fail("The two passwords don't match. Type them again.");
    BUSY = true; MSG = ""; draw();
    try {
      if (VIEW === "signup") {
        const r = await api("/auth/v1/signup?redirect_to=" + encodeURIComponent(location.origin + "/onboarding"), { method: "POST", body: { email, password: pw }, auth: false });
        /* an email that already has an account gets an obfuscated user with no identities and no email is sent (UX audit 2026-11-03) */
        const idn = r && (r.user ? r.user.identities : r.identities);
        if (r && !r.access_token && Array.isArray(idn) && !idn.length) { BUSY = false; VIEW = "signin"; CFG.log && CFG.log("account", { detail: "signup-existing" }); return fail("That email already has an account. Sign in, or use Email me a sign-in code below."); }
        CFG.log && CFG.log("account", { detail: "signup", placement: WHY || undefined });
        if (r && r.access_token) { keep(r); await loadProfile(); BUSY = false; close(); changed(); ONB.go("/onboarding"); return; }
        FORM._email = email; PENDPW = pw; BUSY = false; VIEW = "check"; draw(); watchConfirm(email, pw); try { localStorage.setItem("prPending", JSON.stringify({ e: email, t: Date.now() })); } catch (e2) {} return;
      }
      keep(await api("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password: pw }, auth: false }));
      await loadProfile(); BUSY = false; CFG.log && CFG.log("account", { detail: "signin" });
      close(); changed(); if (ONB.isPage()) ONB.show(); else if (!member()) ONB.go("/onboarding");
    } catch (e) {
      BUSY = false;
      if (VIEW === "signup" && /sending confirmation|smtp/i.test(e.message)) return fail("Our email service was busy for a second. Tap Create account to try again.");
      if (/confirm/i.test(e.message)) { FORM._email = email; PENDPW = pw; VIEW = "check"; MSG = "Confirm your email first. Type the code we sent, or send a new one below."; draw(); watchConfirm(email, pw); return; }
      fail(/confirm/i.test(e.message) ? "Confirm your email first. Type the code we emailed you." : /invalid login/i.test(e.message) ? "That email and password don't match. Forgot it? Use Email me a sign-in code below, or reset your password." : /already registered|exists/i.test(e.message) ? "That email already has an account. Sign in instead." : /weak|short/i.test(e.message + (e.code || "")) ? "Use at least 6 characters for your password." : e.message);
    }
  } else if (id === "accx") {   /* a fresh link: the confirmation email if they never confirmed, else a sign-in link */
    const email = val("acx").trim(); if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email.");
    FORM._email = email; BUSY = true; draw();
    try { await api("/auth/v1/resend?redirect_to=" + encodeURIComponent(location.origin + "/onboarding"), { method: "POST", body: { type: "signup", email }, auth: false }); }
    catch (e) {
      if (/seconds|rate/i.test(e.message)) { BUSY = false; return fail("Please wait a minute before sending again."); }
      try { await api("/auth/v1/otp?redirect_to=" + encodeURIComponent(location.origin + "/account"), { method: "POST", body: { email, create_user: false }, auth: false }); } catch (e2) {}
    }
    BUSY = false; FORM._sent = "link"; RESENT = Date.now() + 60000; VIEW = "sent"; draw(); setTimeout(draw, 60500);
    CFG.log && CFG.log("account", { detail: "expired-newlink" });
  } else if (id === "accr") {
    const email = val("acre").trim(); if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email.");
    BUSY = true; draw();
    try { await api("/auth/v1/recover?redirect_to=" + encodeURIComponent(location.origin + "/account"), { method: "POST", body: { email }, auth: false }); } catch (e) {}
    BUSY = false; MSG = ""; FORM._email = email; FORM._sent = "reset"; RESENT = Date.now() + 60000; VIEW = "sent"; draw(); setTimeout(draw, 60500);
  } else if (id === "accc") {
    const code = val("acotp").replace(/\D/g, ""), em = FORM._email, type = VIEW === "check" ? "signup" : FORM._sent === "reset" ? "recovery" : "email";
    if (code.length < 6) return fail("Type the 6-digit code from the email.");
    BUSY = true; draw();
    const done = async r => { stopWatch(); keep(r); BUSY = false; PENDPW = ""; try { localStorage.removeItem("prPending"); } catch (e) {}
      CFG.log && CFG.log("account", { detail: "code-" + type }); await loadProfile(); changed();
      if (type === "recovery") return open("reset");
      close(); if (ONB.isPage()) ONB.show(); else if (!member()) ONB.go("/onboarding"); };
    try { return await done(await api("/auth/v1/verify", { method: "POST", body: { type, email: em, token: code }, auth: false })); }
    catch (e) {
      /* a mail scanner may have used the code already, which still confirms the email: try the password they just set */
      if (type === "signup" && PENDPW) { try { return await done(await api("/auth/v1/token?grant_type=password", { method: "POST", body: { email: em, password: PENDPW }, auth: false })); } catch (e2) {} }
      fail(/expired|invalid|not found/i.test(e.message) ? "That code didn't work. Use the code from the newest email, or send a new one below." : e.message);
    }
  } else if (id === "accn") {
    const pw = val("acnp"); if (pw.length < 6) return fail("Use at least 6 characters.");
    if (pw !== val("acnp2")) return fail("The two passwords don't match. Type them again.");
    BUSY = true; draw();
    try { await api("/auth/v1/user", { method: "PUT", body: { password: pw } }); BUSY = false; close(); changed(); } catch (e) { fail(e.message); }
  }
}

/* links from the confirmation / reset emails land with tokens in the URL hash */
async function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("error_description")) { history.replaceState(null, "", location.pathname + location.search);
    /* 2026-11-11: ~13 a day opened an old or used email link and got a raw "Email link is invalid or has expired" */
    if (/expired|invalid/i.test(h.get("error_description")) || h.get("error_code") === "otp_expired") { open("expired"); return; }
    open("signin"); fail(h.get("error_description").replace(/\+/g, " ")); return; }
  if (!h.get("access_token")) return;
  keep({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600 });
  history.replaceState(null, "", location.pathname + location.search);
  try { const u = await api("/auth/v1/user"); SES.user = { id: u.id, email: u.email }; store.set(SK, SES); } catch (e) { keep(null); return; }
  await loadProfile(); changed();
  if (h.get("type") === "recovery") open("reset"); else if (!member()) ONB.go("/onboarding"); else if (ONB.isPage()) ONB.show();
}

function signOut() { api("/auth/v1/logout", { method: "POST" }).catch(() => {}); keep(null); PRO = null; cacheRank(); for (const k in FORM) delete FORM[k]; changed(); }
/* re-engagement bars (Ryan 2026-10-21: "on-site pop-up reminders for when they return"). Once per visit each, bottom of the screen:
   - signed up, email never confirmed (remembered in this browser): confirm reminder + "Send it again"
   - signed-in member missing PRs / GPA / class (or a parent with no athlete yet): finish-profile reminder
   While a bar is up the evaluation pop-up waits (app.js checks #prnudge). */
export function needs() {
  if (!SES || !member() || !PRO) return [];
  if (PRO.role === "athlete") { const m = []; if (!MINE.length) m.push("prs"); if (PRO.gpa == null) m.push("gpa"); if (!PRO.grad_year) m.push("class"); return m; }
  if (PRO.role === "parent") { if (!KIDS.length) return ["athlete"]; const k = KIDS[0], m = []; if (!(k.marks || []).length) m.push("prs"); if (k.gpa == null) m.push("gpa"); return m; }
  return [];
}
function bar(id, html) {
  if (document.getElementById("prnudge")) return;
  try { if (sessionStorage.getItem(id)) return; sessionStorage.setItem(id, "1"); } catch (e) {}
  document.body.insertAdjacentHTML("beforeend", `<div class="prnudge" id="prnudge" role="status">${html}<button type="button" class="prnx" data-nudgex aria-label="Close">×</button></div>`);
  const el = document.getElementById("prnudge"); requestAnimationFrame(() => el.classList.add("on"));
  CFG.log && CFG.log("account", { detail: "nudge-shown-" + id.replace("prNudge-", "") });
}
function nudges() {
  if (document.documentElement.classList.contains("onbon") || isOpen()) return;   /* not over the profile pages or the sign-in sheet */
  if (!SES) {
    let P = null; try { P = JSON.parse(localStorage.getItem("prPending") || "null"); } catch (e) {}
    if (P && P.e && Date.now() - P.t < 14 * 864e5) { FORM._email = P.e; const em = String(P.e).replace(/^(.).*?(@.*)$/, "$1•••$2");
      bar("prNudge-confirm", `<p><b>Confirm your email to finish your free account.</b> <span>We sent a code to ${esc(em)}.</span></p><button type="button" class="prnb" data-acc="code">Enter my code</button>`); return; }
    joinLater(); return;
  }
  try { localStorage.removeItem("prPending"); } catch (e) {}
  /* signed up but never finished the setup steps (Ryan 2026-11-02: "users who haven't finished setting up their accounts ... receiving pop-ups") */
  if (!member()) { bar("prNudge-finish", `<p><b>Finish setting up your free account.</b> <span>It takes about two minutes, then you can see every college your marks fit.</span></p><a class="prnb" href="/onboarding" data-nudgego="onb">Finish setup</a>`); return; }
  const n = needs(); if (!n.length) return;
  const what = n[0] === "athlete" ? "Add your athlete" : n.includes("prs") ? "Add your PRs" : n.includes("gpa") ? "Add your GPA" : "Add your class";
  const why = n[0] === "athlete" ? "to see every college their marks fit." : n.includes("prs") ? "to see every college your marks fit." : "so your profile shows the right colleges.";
  bar("prNudge-profile", `<p><b>${what}</b> <span>${why}</span></p><a class="prnb" href="/account" data-nudgego>Finish profile</a>`);
}
/* create-account invite for visitors without an account (Ryan 2026-11-02): once per visit, only after they've used the site for a bit
   (25 s and some scrolling, a search or a second page, or 45 s on the site), never while the evaluation pop-up, a sheet or the tour is up */
function joinLater() {
  const t0 = Date.now(); let pages = 0; try { pages = +sessionStorage.getItem("prPv") || 0; sessionStorage.setItem("prPv", String(pages + 1)); } catch (e) {}
  const iv = setInterval(() => {
    if (SES) return clearInterval(iv);
    try { if (sessionStorage.getItem("prNudge-join")) return clearInterval(iv); } catch (e) {}
    const busy = document.documentElement.classList.contains("onbon") || isOpen() || document.getElementById("prnudge") || document.querySelector("#eval.on,.evbg.on");
    const used = (scrollY > innerHeight * 0.6 || /[?&]m=/.test(location.search) || pages >= 1) && Date.now() - t0 > 25000 || Date.now() - t0 > 45000;
    if (busy || !used) return;
    clearInterval(iv);
    bar("prNudge-join", `<p><b>Make a free account.</b> <span>Save your athlete's times, see every college that fits and ask the Recruiting AI as much as you want.</span></p><button type="button" class="prnb" data-acc="signup" data-why="nudge">Create free account</button>`);
  }, 2000);
}
export const core = { badge, badgeSvg, prVerified, URL: URL_, KEY, ST, api, fresh, loadProfile, changed, signOut, member, profile: () => PRO, ses: () => SES, cfg: () => CFG };
export async function init(cfg) {
  CFG = cfg || {}; SES = store.get(SK); shell(); headBtn();
  document.addEventListener("click", e => {
    const sh = e.target.closest("[data-show]");
    if (sh) { e.preventDefault(); const show = sh.textContent === "Show"; sh.closest(".acf").parentElement.querySelectorAll(".acpw input").forEach(i => i.type = show ? "text" : "password"); document.querySelectorAll("#accb .acshow").forEach(x => { x.textContent = show ? "Hide" : "Show"; x.setAttribute("aria-label", show ? "Hide password" : "Show password"); }); return; }
    const t = e.target.closest("[data-acc],[data-seg],a[href*='parentfunnel']"); if (!t) return;
    if (t.matches("a[href*='parentfunnel']")) { optIn(); return; }
    if (t.dataset.seg) { readFinish(); FORM[t.dataset.seg] = t.dataset.v; MSG = ""; draw(); return; }
    const a = t.dataset.acc; e.preventDefault();
    if (a === "close") return close();
    if (a === "link" || a === "again-reset") {
      const inp = document.getElementById("ace") || document.getElementById("acre"), em = ((inp && inp.value) || FORM._email || "").trim();
      if (!/^\S+@\S+\.\S+$/.test(em)) { MSG = "Enter your email first."; return draw(); }
      FORM._email = em; FORM._sent = a === "link" ? "link" : "reset"; MSG = ""; RESENT = Date.now() + 60000; VIEW = "sent"; draw(); setTimeout(draw, 60500);
      const path = a === "link" ? "/auth/v1/otp?redirect_to=" + encodeURIComponent(location.origin + "/account") : "/auth/v1/recover?redirect_to=" + encodeURIComponent(location.origin + "/account");
      api(path, { method: "POST", body: a === "link" ? { email: em, create_user: false } : { email: em }, auth: false }).catch(err => { if (/seconds|rate/i.test(err.message)) { MSG = "Please wait a minute before sending again."; RESENT = 0; draw(); }
        /* 2026-11-11: ~4 a day asked for a sign-in link for an email with no account and waited for an email that never came */
        else if (a === "link" && (err.code === "otp_disabled" || /signups not allowed/i.test(err.message))) { VIEW = "signup"; MSG = "There's no account with that email yet. Create a free one here."; draw(); } });
      CFG.log && CFG.log("account", { detail: a === "link" ? "magic-link" : "reset" }); return; }
    if (a === "code") { if (!FORM._email) return; return open("check"); }
    if (a === "resend") { const em = FORM._email; if (!em) return; MSG = ""; RESENT = Date.now() + 60000; if (VIEW !== "check" || !isOpen()) open("check"); else draw();
      api("/auth/v1/resend?redirect_to=" + encodeURIComponent(location.origin + "/onboarding"), { method: "POST", body: { type: "signup", email: em }, auth: false }).catch(err => { MSG = /seconds|rate/i.test(err.message) ? "Please wait a minute before sending again." : err.message; RESENT = 0; draw(); });
      CFG.log && CFG.log("account", { detail: "resend" }); setTimeout(draw, 60500); return; }
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
  await restore();
  addEventListener("storage", e => { if (e.key !== SK) return; const v = store.get(SK);
    if (!v && SES) { SES = null; PRO = null; KIDS = []; cookie.set(null); changed(); }
    else if (v && (!SES || v.refresh_token !== SES.refresh_token)) { const was = !!SES; SES = v; schedule(); if (!was) loadProfile().then(changed); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && SES) fresh(); });
  if (SES) { schedule(); await loadProfile(); }
  headBtn();
  await fromHash();
  document.addEventListener("click", e => { const rs = e.target.closest('#prnudge [data-acc="resend"]'); if (rs) setTimeout(() => { rs.textContent = "Sent. Check your inbox"; rs.disabled = true; }, 0); });
  document.addEventListener("click", e => { const x = e.target.closest("[data-nudgex],[data-nudgego]"); if (!x) return; const el = document.getElementById("prnudge"); if (el) el.remove();
    if (x.matches("[data-nudgego]")) { e.preventDefault(); CFG.log && CFG.log("account", { detail: "nudge-click" }); ONB.go(x.dataset.nudgego === "onb" ? "/onboarding" : "/account"); } });
  document.addEventListener("click", e => { const j = e.target.closest('#prnudge [data-acc="signup"]'); if (!j) return; const el = document.getElementById("prnudge"); if (el) setTimeout(() => el.remove(), 0); CFG.log && CFG.log("account", { detail: "nudge-click-join" }); });   /* the [data-acc] handler opens sign-up */
  setTimeout(nudges, 4000);   /* after the page settles, never on arrival */
  /* Ryan 2026-10-19: a signed-in account must finish its profile before using the site */
  if (ONB.isPage()) ONB.show(); else if (SES && !member() && !/^\/(privacy|admin)\.html$/.test(location.pathname)) ONB.go("/onboarding");
  return member();
}
