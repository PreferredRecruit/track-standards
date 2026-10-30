/* SEO pages (Ryan 2026-10-13: "make seo demonic and get every search available").
   Runs at the end of every `vite build` (see vite.config.ts) and writes plain, JavaScript-free HTML pages into dist/
   that search engines and AI search can read instantly, all cross-linked, plus a sitemap covering every page:
     /explore.html                                   hub of everything
     /conferences/<conference>-track-standards.html  every conference: its schools + what it took to place 8th/15th/25th
     /standards/<division>-<mens|womens>-<event>.html  every division x event: every school's Target/Recruit/Walk-On
     /states/<state>-college-track-and-field.html    every state: its college programs
     /champions/<year>-<season>-<division>.html      national champions by year
     /results/<year>-<season>-<division>-<g>-<event>.html  national top marks (TFRRS lists, incl. championship marks)
   School pages stay at /schools/<slug> (the app) so existing Google rankings are kept; every page here links to them. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { hsPages } from "./hs.mjs";
import { parseMark, cleanRank } from "./markparse.mjs";
import { fitTitle, fitDesc, tailsFor, levelWords, SEASON } from "./meta.mjs";
import { schoolPages } from "./schools.mjs";
import { statePages } from "./states.mjs";
import { reportPages } from "./reports.mjs";
import { hsLevel, hsRows, fmtXC, fmtHS } from "./hsconv.mjs";
import { topicPages, EDITED } from "./topics.mjs";
import { gapGuides } from "./gap-guides.mjs";
import { dailyPages } from "./daily.mjs";
import { athleteIndex, athletePages } from "./athletes.mjs";
const SITE = "https://trackandfieldstandards.com";
const QUIZ = "https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards";
const EVENTS = ["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles",
  "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"];
/* URL slug -> event name for the SEO-page script, longest first (2026-10-29: /colleges-for/mens-100m-10-3 read as event "100m 10 3") */
const SEO_EVS = JSON.stringify(Object.fromEntries([...EVENTS, '110m Hurdles (39")'].map(e => [e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), e]).sort((a, b) => b[0].length - a[0].length)));
const FIELD = new Set(["High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"]);
/* metres -> feet and inches to the quarter inch, how US high school field marks are written (2026-10-28: "d1 long jump standards" ranked #18; families search in feet) */
const ftIn = m => { const q = Math.round(m / 0.0254 * 4) / 4, ft = Math.floor(q / 12), i = q - ft * 12; return `${ft}'${String(i).replace(/\.0+$/, "")}"`; };
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
const RDIVS = [...DIVS, "NJCAA"];   /* results and champions pages: junior colleges included (results only, no levels) */
const STATE = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington DC", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", BC: "British Columbia" };

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = s => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const schoolSlug = s => (s.os && s.os[0]) || (String(s.n).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() + "-track-standards");
const gName = g => (g === "m" ? "Men's" : "Women's");
const evLabel = e => e.replace(/^(\d[\d,]*) Meters$/, "$1m").replace(/^(\d+) Hurdles$/, "$1m Hurdles").replace(/^(\d+) Steeplechase$/, "$1m Steeplechase").replace(/^4 x (\d+) Relay$/, "4x$1 Relay");
const secs = m => { const t = String(m || "").replace(/[^0-9:.]/g, ""); if (!t || (t.match(/\./g) || []).length > 1) return null; const p = t.split(":").map(Number); if (p.some(isNaN)) return null; return p.length === 2 ? p[0] * 60 + p[1] : p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0]; };
const parse = parseMark;   /* scripts/seo/markparse.mjs: one reader for the whole site */

const DATES = { db: "", data: "", max: "" };
/* past seasons never change: they keep the date the archive was built; only the current season moves with the Monday data */
const ARCHIVE_DATE = "2026-10-13";
const resultsDate = u => { const y = (u.match(/\/(\d{4})-/) || [])[1]; return y && DATES.data && y < DATES.data.slice(0, 4) ? ARCHIVE_DATE : DATES.data; };
/* "Check your mark" box (Ryan 2026-10-17: bounce rate). Plain GET form into the app's search (/?g=&e=&m=), which counts as a new
   page view and shows every college the mark fits. Pre-set to the page's own event and gender when the URL names them. */
const CHECK_EV = ["100m", "200m", "400m", "800m", "1600m", "Mile", "1500m", "3200m", "3000m", "5000m", "100m Hurdles", "110m Hurdles", "300m Hurdles", "400m Hurdles", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"];
function checker(pathname) {
  const p = pathname.toLowerCase(), g = /(womens|girls)/.test(p) ? "w" : "m";
  const e = [...CHECK_EV].sort((a, b) => b.length - a.length).find(x => p.includes("-" + slug(x) + ".") || p.includes("-" + slug(x) + "-") || p.includes("/" + slug(x) + ".")) || "1600m";
  return `<form class="chk" action="/" method="get"><b>Check your mark against every college</b><div><select name="g" aria-label="Gender"><option value="m"${g === "m" ? " selected" : ""}>Boys / men</option><option value="w"${g === "w" ? " selected" : ""}>Girls / women</option></select>`
    + `<select name="e" aria-label="Event">${CHECK_EV.map(x => `<option${x === e ? " selected" : ""}>${esc(x)}</option>`).join("")}</select><input name="m" required placeholder="Your mark, e.g. 4:35 or 20-6" aria-label="Your mark"><select name="gr" required aria-label="Grade"><option value="" disabled selected>Grade</option><option value="9">9th</option><option value="10">10th</option><option value="11">11th</option><option value="12">12th</option></select><button>See colleges</button></div></form>`;
}
const CHK_CSS = `.chk{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin:16px 0}.chk b{display:block;font-size:15px;margin-bottom:8px}.chk div{display:flex;gap:8px;flex-wrap:wrap}.chk select,.chk input{font:inherit;padding:10px 12px;border:1px solid #DCDAE5;border-radius:12px;background:#FAFAFC;flex:1 1 140px;min-width:0}.chk button{font:inherit;font-weight:650;border:0;border-radius:999px;padding:10px 18px;background:#7A45F0;color:#fff;cursor:pointer}`;
const withChecker = (pathname, body) => { const c = checker(pathname), i = body.indexOf('<p class="upd">'); if (body.includes('<div class="qa">') && i > -1) { const j = body.indexOf("</p>", i) + 4; return body.slice(0, j) + c + body.slice(j); } return c + body; };
function page({ title, desc, pathname, crumbs, h1, intro, body, ld }) {
  if (!/^\/(guides|for-coaches)\.html$/.test(pathname)) body = withChecker(pathname, body);
  title = fitTitle(title); desc = fitDesc(desc, tailsFor(pathname));
  const url = SITE + pathname;
  const bc = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${SITE}/og.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/pr-favicon-192.png" type="image/png" sizes="192x192"><link rel="icon" href="/pr-favicon-48.png" type="image/png" sizes="48x48"><script defer src="/_vercel/insights/script.js"></script><script>/* recruitment-evaluation click tracking (Ryan 2026-10-15): Vercel event "Evaluation click" + utm_content per placement */
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[href*="thepreferredrecruit.com/parentfunnel"]');if(!a)return;
var p=a.closest("#spop")?"seo-pop":a.closest(".pill,header nav")?"header":a.closest(".inl")?"hero":a.closest("#eval,.eval")?"popup":a.closest(".coach")?"school-page":a.closest(".hook")?"results":a.closest(".chat,.ask,.msgs,.msg,.ans")?"chat":a.closest(".sbar")?"seo-bar":a.closest(".cta")?"seo-page":"other";
var path=location.pathname,kind=path==="/"?"home":path.indexOf("/schools/")===0?"school":path.split("/")[1].replace(".html","")||"home";
try{var u=new URL(a.href);u.searchParams.set("utm_content",p);var rk="";try{rk=localStorage.getItem("prRank")||localStorage.getItem("prQ")||""}catch(z){}if(rk){var tm=(u.searchParams.get("utm_term")||"").replace(/(^| )([tc](A\\+|[ABCSM])|q[AM])(?= |$)/g,"").trim();u.searchParams.set("utm_term",(tm?tm+" ":"")+rk)}a.href=u.toString()}catch(x){}
window.va("event",{name:"Evaluation click",data:{placement:p,page:kind,path:path.slice(0,120)}});if(window.prLog)window.prLog("popup_click",{placement:p,trig:p==="seo-bar"&&window.prBarTrig?window.prBarTrig():undefined,variant:p==="seo-bar"?(document.querySelector("#sbar b").textContent.indexOf("If you want")===0?"bar-event":"bar-generic"):undefined,event:(function(){try{return JSON.parse(localStorage.getItem("prIntent")).e}catch(e){}})()})},true);</script><script defer src="/_vercel/speed-insights/script.js"></script><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(bc)}</script><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, url, dateModified: EDITED[pathname] || (/^\/(results|champions)\//.test(pathname) ? resultsDate(pathname) : DATES.db) })}</script>${(ld || []).map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join("")}
<style>:root{--ink:#0B0B0F;--ink2:#2E2E36;--mute:#4A4A52;--line:#E4E3EA;--soft:#F3F2F7;--accent:#7A45F0}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#FDFDFE,#F1F0F6);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}header{background:rgba(255,255,255,.85);border-bottom:1px solid var(--line)}header div{max-width:1000px;margin:0 auto;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
header a.logo{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font-weight:650}header img{width:30px;height:30px;border-radius:9px}
header nav a{margin-left:16px;font-size:14px;text-decoration:none;color:var(--mute)}header nav a.cta{color:#fff;background:#7A45F0;padding:7px 14px;border-radius:999px}
main{max-width:1000px;margin:0 auto;padding:26px 20px 60px}.bc{font-size:13px;color:var(--mute)}.bc a{color:var(--mute)}h1{font-size:clamp(28px,4.4vw,42px);letter-spacing:-.035em;line-height:1.1;margin:10px 0 10px}
h2{font-size:22px;letter-spacing:-.02em;margin:34px 0 10px}.intro{color:var(--ink2);max-width:52em}table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);font-size:14px}th{background:var(--soft);font-size:12px;color:var(--mute)}.n{text-align:right}.scroll{overflow-x:auto}
.cta{margin:30px 0;padding:18px 20px;border-radius:18px;background:linear-gradient(135deg,#A98BFF,#7A45F0 55%,#4E22C2);color:#fff}.cta a{color:#fff;font-weight:700}
.links{columns:3 220px;gap:24px;font-size:14px}.links a{display:block;padding:3px 0;text-decoration:none}.links a:hover{text-decoration:underline}
footer{border-top:1px solid var(--line);font-size:13px;color:var(--mute);padding:20px}footer div{max-width:1000px;margin:0 auto}footer a{color:var(--mute);margin-right:14px}
${CHK_CSS}.sbar{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;max-width:720px;margin:0 auto;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px -18px rgba(20,16,60,.45);padding:10px 12px 10px 16px}.sbar[hidden]{display:none}.sbar p{margin:0;flex:1;font-size:14px;line-height:1.35}.sbar a{white-space:nowrap;background:#7A45F0;color:#fff;font-weight:650;text-decoration:none;border-radius:999px;padding:9px 14px;font-size:14px}.sbar button{border:0;background:var(--soft);border-radius:50%;width:28px;height:28px;font-size:17px;line-height:1;cursor:pointer}@media(max-width:560px){.sbar span{display:none}}.star{color:#7A45F0}footer .soc{display:block;margin-top:8px;font-size:10px;color:#9A9AA3}footer .soc a{color:inherit;margin:0;text-decoration:none}header nav a.cta{white-space:nowrap}@media(max-width:560px){header nav a:not(.cta){display:none}header nav a.cta{margin-left:0}}
/* 2026-10-25 audit: the static pages wear the app's finish (Ryan: "billion-dollar company aesthetic", "not clogged with visible links") */
header{position:sticky;top:0;z-index:40;backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);background:rgba(253,253,254,.82)}
header div{padding:10px 20px}header a.logo{gap:11px;line-height:1.15}header a.logo img{width:34px;height:34px;border-radius:10px;box-shadow:0 6px 16px -8px rgba(78,34,194,.6)}
header a.logo b{display:block;font-size:15px;font-weight:700;letter-spacing:-.01em}header a.logo small{display:block;font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}
header nav{display:flex;align-items:center;gap:22px}header nav a{margin:0;font-weight:550;color:var(--ink2)}header nav a:hover{color:var(--ink)}
header nav a.cta{background:linear-gradient(180deg,#8F63FF,#6B35E8);padding:9px 16px;font-weight:650;box-shadow:0 10px 24px -12px rgba(107,53,232,.9)}
a{text-decoration:none}main a:hover{text-decoration:underline}.bc a:hover{color:var(--ink)}
h1{font-weight:750;letter-spacing:-.04em}h2{font-weight:700;letter-spacing:-.025em;margin:40px 0 12px}h3{letter-spacing:-.015em}.intro{font-size:17px;line-height:1.6}
table{border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px rgba(20,16,50,.05),0 22px 50px -36px rgba(70,30,160,.35)}
th{background:#fff;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mute);padding:13px 16px}td{padding:12px 16px;font-size:15px}tr:last-child td{border-bottom:0}
td.n{font-weight:650;color:var(--ink)}td a{color:var(--ink);font-weight:600}td a:hover{color:var(--accent);text-decoration:none}td small{color:var(--mute)}
.links a{color:var(--ink2);padding:5px 0}.links a:hover{color:var(--accent);text-decoration:none}
details.morel{margin-top:6px}details.morel>summary{cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:650;color:var(--accent);padding:6px 0}details.morel>summary::-webkit-details-marker{display:none}details.morel>summary::after{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px)}details.morel[open]>summary{display:none}
.cta{border-radius:22px;padding:22px 24px;box-shadow:0 24px 50px -30px rgba(78,34,194,.8)}footer{padding:26px 20px 90px}
code{overflow-wrap:anywhere;word-break:break-word;font-size:.9em;background:var(--soft);border-radius:6px;padding:1px 6px}
header nav a.cta .s{display:none}
@media(max-width:560px){td,th{padding:11px 12px}td{font-size:14px}header div{flex-wrap:nowrap;padding:10px 16px}header nav{gap:0}header nav a.cta{padding:8px 14px;font-size:13.5px}header nav a.cta .l{display:none}header nav a.cta .s{display:inline}header a.logo small{letter-spacing:.12em}}</style></head><body>
<header><div><a class="logo" href="/"><img src="/icon-192.png" alt=""><span><b>Preferred Recruit</b><small>Track Standards</small></span></a><nav><a href="/">Standards</a><a href="/explore.html">Explore</a><a class="cta" href="${QUIZ}"><span class="l">Free recruitment evaluation</span><span class="s">Free evaluation</span></a></nav></div></header>
<main><div class="bc">${crumbs.map(([n, u], i) => i < crumbs.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n)).join("")}</div>
<h1>${h1}</h1>${intro ? `<p class="intro">${intro}</p>` : ""}${body}
<div class="cta"><b>Looking to run in college?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div></main>
<footer><div><a href="/explore.html">Explore every school, conference and result</a> · <a href="/privacy.html">Privacy</a><span>Standards updated ${DATES.db} · Results updated ${DATES.data} · © ${new Date().getFullYear()} Preferred Recruit</span></div></footer>
<script>/* SEO-page bottom bar (Ryan 2026-10-17): shows after 50% scroll or 12 s (5 s from the 2nd page), once per visit, never on arrival; shares the app pop-up's dismiss flag.
   Search intent (Ryan 2026-10-16): the copy names the athlete's event (this page's event, else the last one they looked at on the site,
   from localStorage prIntent), the funnel link carries event + grade, and the page view goes to the anonymous insights log. */
(function(){var T="https://airqmzyuxyyiqjaocwmk.supabase.co/functions/v1/track",I={},sid,T0=Date.now(),TRIG="",UTM;
try{UTM=new URLSearchParams(location.search).get("utm_source");if(UTM)sessionStorage.setItem("prUtm",UTM.slice(0,40));else UTM=sessionStorage.getItem("prUtm")||undefined}catch(e){}
try{I=JSON.parse(localStorage.getItem("prIntent"))||{};sid=localStorage.getItem("prSid");if(!sid){sid=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36));localStorage.setItem("prSid",sid)}}catch(e){sid="anon-"+Math.random().toString(36).slice(2,12)}
function grp(e){e=String(e||"");return /hurdle/i.test(e)?"hurdles":/thlon/i.test(e)?"multis":/jump|vault/i.test(e)?"jumps":/shot|discus|hammer|javelin|weight|throw/i.test(e)?"throws":/relay/i.test(e)?(/800|1600|mile|medley/i.test(e)?"distance":"sprints"):/^(55|60|100|200|400)(m|$)/i.test(e)?"sprints":"distance"}
window.prLog=function(k,x){try{var ct;try{ct=localStorage.getItem("pr_coach")||undefined}catch(e){}var hh=document.documentElement,b={sid:sid,kind:k,coach:ct,secs:Math.round((Date.now()-T0)/1000),scroll_pct:Math.min(100,Math.round((scrollY+innerHeight)/Math.max(hh.scrollHeight,1)*100)),hour:new Date().getHours(),grade:I.gr||undefined,path:location.pathname,mobile:innerWidth<700,utm_source:UTM};for(var q in x||{})b[q]=x[q];if(b.event&&!b.grp)b.grp=grp(b.event);fetch(T,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),keepalive:true}).catch(function(){})}catch(e){}};
var m=location.pathname.match(/(?:^|[\/-])(boys|girls|mens|womens)-([a-z0-9-]+?)(?:-track-standards)?(?:\.html)?$/),ev=null,g=null;
if(m){var EVS=${SEO_EVS};for(var k in EVS){if(m[2]===k||m[2].indexOf(k+"-")===0){ev=EVS[k];break}}}
if(ev){g=/^(boys|mens)$/.test(m[1])?"m":"w";I.e=ev;I.grp=grp(ev);I.g=g;I.c=I.c||{};I.c[I.grp]=(I.c[I.grp]||0)+1;try{localStorage.setItem("prIntent",JSON.stringify(I))}catch(e){}}
prLog("seo_page",{event:ev||undefined,g:g||undefined});
/* bottom bar removed (2026-10-25: 0.2% click rate on 3,881 views, and Ryan wants landing pages clean); the page view + intent above stay */
/* SEO-page pop-up (Ryan 2026-10-29: "yeah we need more pop ups"; 3 days: ~1,039 SEO-page visits, ~210 ever saw an offer). Same centre
   format as the app (6.4% vs the old bar's 0.2%): after 50% scroll or 25 s, once per visit, never on arrival, shares the app's dismiss
   flag, not on coach pages. Copy names this page's event (else the last one they looked at); 9th graders get the free readiness check
   (same rule as the app); the funnel link carries event, grade and the rank/likely-A tag (prRank / prQ). */
(function(){var path=location.pathname;if(/^[/](for-coaches|coaches|admin|embed|onboarding|privacy)([.]html|[/]|$)/.test(path))return;
try{if(sessionStorage.getItem("prEvalDismissed")==="1"||sessionStorage.getItem("prSeoPop")==="1")return;
  if(/(^| )tC( |$)/.test(localStorage.getItem("prRank")||""))return}catch(e){}   /* Tier C accounts get no sales offer (same rule as the app) */
var e=I.e||"",gr=+I.gr||0,mk=I.m&&I.me&&String(I.me).toLowerCase()===String(e).toLowerCase()&&I.mg===I.g?String(I.m):"",nine=gr===9,who=I.g==="w"?"Girls":I.g==="m"?"Boys":"",evs=String(e).toLowerCase();
var t=mk?"Where does your "+mk+" "+evs+" fit?":e?"Which colleges would want your "+evs+"?":"Talent gets you the offer. Visibility gets you in the room.";
var b=nine?"The free 2-minute readiness check shows where you stand for college track and what to work on before coaches start calling.":"A free evaluation from Preferred Recruit shows which college programs would want you and which coaches to contact first. It takes about a minute.";
var Q="https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards",href=Q;
if(nine)href="/readiness";else{try{var u=new URL(Q),rk="";try{rk=localStorage.getItem("prRank")||localStorage.getItem("prQ")||""}catch(z){}u.searchParams.set("utm_content","seo-pop");u.searchParams.set("utm_term",[e,gr?"g"+gr:"",rk].filter(Boolean).join(" "));href=u.toString()}catch(z){}}
var st=document.createElement("style");st.textContent="#spopbg{position:fixed;inset:0;background:rgba(20,16,40,.38);backdrop-filter:blur(3px);z-index:80;opacity:0;transition:opacity .3s}#spopbg.on{opacity:1}#spop{position:fixed;left:50%;top:50%;transform:translate(-50%,-46%);opacity:0;transition:all .35s cubic-bezier(.2,.8,.2,1);z-index:81;width:min(420px,calc(100vw - 32px));background:#fff;border-radius:22px;box-shadow:0 30px 80px -20px rgba(20,16,60,.5);padding:26px 24px 20px}#spop.on{opacity:1;transform:translate(-50%,-50%)}#spop .ey{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7A45F0;font-weight:700;margin:0 0 8px}#spop h2{font-size:23px;line-height:1.2;margin:0 0 10px;letter-spacing:-.01em}#spop p{font-size:15px;line-height:1.45;color:#4a4a55;margin:0 0 18px}#spop a.go{display:block;text-align:center;background:#7A45F0;color:#fff;font-weight:650;text-decoration:none;border-radius:999px;padding:13px 16px;font-size:16px}#spop button{display:block;margin:10px auto 0;border:0;background:none;color:#8a8a95;font:inherit;font-size:14px;cursor:pointer}#spop small{display:block;text-align:center;color:#9a9aa3;font-size:12px;margin-top:6px}#spop .x{position:absolute;top:12px;right:12px;margin:0;width:30px;height:30px;border-radius:50%;background:#f3f3f6;font-size:18px;color:#555}";
var shown=false;function show(trig){if(shown)return;shown=true;try{sessionStorage.setItem("prSeoPop","1")}catch(z){}document.head.appendChild(st);
  var bg=document.createElement("div");bg.id="spopbg";var d=document.createElement("aside");d.id="spop";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-labelledby","spoph");
  d.innerHTML='<button class="x" aria-label="Close">×</button><p class="ey"></p><h2 id="spoph"></h2><p class="bd"></p><a class="go"></a><button class="later">Not now</button><small></small>';
  d.querySelector(".ey").textContent=(who&&e?who+" "+evs:"Free recruitment evaluation")+(gr?" · "+gr+"th grade":"");d.querySelector("h2").textContent=t;d.querySelector(".bd").textContent=b;
  var a=d.querySelector(".go");a.href=href;a.textContent=nine?"Take the 2-minute readiness check":"Get my free evaluation";if(!nine){a.target="_blank";a.rel="noopener";d.querySelector("small").textContent="Guaranteed genuine interest or a full refund."}
  document.body.appendChild(bg);document.body.appendChild(d);requestAnimationFrame(function(){bg.classList.add("on");d.classList.add("on")});
  var v=(nine?"seo-ready":mk?"seo-mark":e?"seo-event":"seo-generic");prLog("popup_shown",{placement:"seo-pop",variant:v,trig:trig,event:e||undefined});
  if(nine)a.addEventListener("click",function(){prLog("popup_click",{placement:"seo-pop",variant:v,trig:trig,event:e||undefined})});
  function close(){d.classList.remove("on");bg.classList.remove("on");setTimeout(function(){d.remove();bg.remove()},350);try{sessionStorage.setItem("prEvalDismissed","1");sessionStorage.setItem("prEvalOutAt",String(Date.now()))}catch(z){}document.removeEventListener("keydown",esc)}
  function esc(k){if(k.key==="Escape")close()}document.addEventListener("keydown",esc);bg.addEventListener("click",close);d.querySelector(".x").addEventListener("click",close);d.querySelector(".later").addEventListener("click",close);
  setTimeout(function(){try{a.focus({preventScroll:true})}catch(z){}},360)}
var tm=setTimeout(function(){show("timer-25s")},25000);
/* 2026-10-30: day one showed it after ~2 s on average (456 views, 0 clicks): arriving from Google, the browser jumps to the
   highlighted answer, and that jump counted as "scrolled halfway". Now it needs 10 s on the page AND 400 px the reader scrolled. */
var y0=null;addEventListener("scroll",function f(){if(y0===null){y0=scrollY;return}var h=document.documentElement;
  if(Date.now()-T0>=10000&&Math.abs(scrollY-y0)>=400&&(scrollY+innerHeight)/Math.max(h.scrollHeight,1)>=.5){removeEventListener("scroll",f);clearTimeout(tm);setTimeout(function(){show("scroll-50")},400)}},{passive:true});
})();
})();</script></body></html>`;
}

export function generate(root, out) {
  const DB = JSON.parse(fs.readFileSync(path.join(root, "public/data/db.json"), "utf8"));
  const RIDX = JSON.parse(fs.readFileSync(path.join(out, "data/rank_index.json"), "utf8"));   /* dist copy: includes the newest Monday data (seoPages) */
  const S = DB.schools, CT = DB.ct;
  /* coach portal: admin-approved standards from verified staff become the school's official standards (Ryan 2026-10-16) */
  try {
    const CS = JSON.parse(fs.readFileSync(path.join(root, "public/data/coach-standards.json"), "utf8")), bySlug = new Map(CS.map(x => [x.slug, x]));
    let n = 0;
    for (const s of S) { const x = bySlug.get(schoolSlug(s)); if (!x || s.j) continue; s.om = x.standards; s.o = "1"; s.off = undefined; s.cv = String(x.approved_at || "").slice(0, 10); if (x.season) s.yr = x.season; s.src = null; n++; }
    if (n) { fs.writeFileSync(path.join(out, "data/db.json"), JSON.stringify(DB)); console.log(`coach-verified standards merged: ${n} schools`); }
  } catch { /* no feed yet */ }
  /* teams that don't exist (Ryan 2026-10-19 "no small errors on any schools parts"): conference levels gave every school men's and
     women's standards, so women-only programs (Northwestern, Temple, Wellesley...) showed men's standards. A gender is hidden when
     the school has no official chart for it, none of its athletes appear in that gender's lists in the last two outdoor seasons,
     the other gender has 4+ marks there, and its roster link doesn't name that team. Recomputed every build from the results. */
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(out, "data/rank_index.json"), "utf8"));
    const yrs = [...new Set(idx.filter(x => x.season === "outdoor").map(x => x.year))].sort().slice(-2);
    const DKk = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia" }, cnt = new Map();
    for (const y of yrs) for (const [d, k] of Object.entries(DKk)) {
      const f = path.join(out, "data/rank", `${y}-outdoor-${k}.dat`); if (!fs.existsSync(f)) continue;
      const D = cleanRank(JSON.parse(zlib.gunzipSync(fs.readFileSync(f))));
      for (const l of D.lists) for (const g of ["m", "w"]) for (const rows of Object.values(l.g[g] || {})) for (const r of rows) {
        const key = d + "|" + D.teams[r[3]]; if (!cnt.has(key)) cnt.set(key, { m: 0, w: 0 }); cnt.get(key)[g]++; }
    }
    let hidden = 0;
    for (const s of S) {
      delete s.ng; if (s.j || !s.t) continue; const c = cnt.get(s.d + "|" + s.t); if (!c) continue;
      for (const [g, o] of [["m", "w"], ["w", "m"]]) {
        const team = g === "m" ? /(^|[^o])mens-track/i : /womens-track/i;
        if (!c[g] && c[o] >= 4 && !((s.om || {})[g]) && !team.test(s.rs || "")) { s.ng = [g]; hidden++; }
      }
    }
    fs.writeFileSync(path.join(out, "data/db.json"), JSON.stringify(DB)); console.log(`teams without a men's or women's program: ${hidden}`);
  } catch (e) { console.warn("team check skipped:", e && e.message); }
  const NS = S.filter(x => !x.j).length, NJ = S.filter(x => x.j).length;   /* schools with levels / junior colleges (results only) */
  const JG = "/guides/junior-college-track-and-field-recruiting.html";
  for (const name of ["index.html", "llms.txt"]) { const f = path.join(out, name); if (fs.existsSync(f)) fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/\{\{SCHOOLS\}\}/g, NS.toLocaleString())); }
  /* real dates (Ryan 2026-10-14 "just for seo"): standards = when db.json was built, results = the Monday data refresh */
  DATES.db = DB.built || new Date().toISOString().slice(0, 10);
  try { DATES.data = JSON.parse(fs.readFileSync(path.join(out, "data/updated.json"), "utf8")).updated.slice(0, 10); } catch { DATES.data = DATES.db; }
  DATES.max = DATES.data > DATES.db ? DATES.data : DATES.db;
  let XCS = {}; try { XCS = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "xc_standards.json"), "utf8")); } catch { }
  const std = (s, g, e) => { if ((s.ng || []).includes(g)) return null; const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? (v[1] ? `${v[1]} (${v[0]})` : v[0]) + (v[2] ? " est." : "") : "")) : null; };
  const raw = (s, g, e) => { if ((s.ng || []).includes(g)) return null; const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const sl = (s) => `/schools/${schoolSlug(s)}`;
  const files = []; const write = (p, html) => { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); files.push(p); };
  /* long link lists show 12, the rest one tap away (every link stays in the page for search engines) */
  const groupLinks = (items) => { const A = ([u, t]) => `<a href="${u}">${esc(t)}</a>`; return items.length > 18 ? `<div class="links">${items.slice(0, 12).map(A).join("")}</div><details class="morel"><summary>Show all ${items.length}</summary><div class="links">${items.slice(12).map(A).join("")}</div></details>` : `<div class="links">${items.map(A).join("")}</div>`; };
  const confs = new Map(); for (const s of S) { const k = s.d + "|" + s.c; if (!confs.has(k)) confs.set(k, []); confs.get(k).push(s); }
  const confName = new Map(); for (const k of confs.keys()) { const [d, c] = k.split("|"); const dup = [...confs.keys()].filter(x => x.split("|")[1] === c).length > 1; confName.set(k, `/conferences/${slug(c)}${dup ? "-" + slug(d) : ""}-track-standards.html`); }
  const evPath = (d, g, e) => `/standards/${slug(d)}-${g === "m" ? "mens" : "womens"}-${slug(e)}.html`;
  const divPath = d => `/standards/${slug(d)}-track-and-field-recruiting-standards.html`;   /* division hubs: "d1 track and field recruiting standards" */
  const statePath = st => `/states/${slug(STATE[st] || st)}-college-track-and-field.html`;
  const evAvail = (list, g) => EVENTS.filter(e => list.some(s => raw(s, g, e)));

  /* conferences */
  for (const [k, list] of confs) {
    const [d, c] = k.split("|"); list.sort((a, b) => a.n.localeCompare(b.n));
    const line = (CT[(list[0] || {}).ck] || {});
    const evRows = (g, n = 3) => EVENTS.filter(e => (line[g] || {})[e]).map(e => `<tr><td><a href="${evPath(d, g, e)}">${esc(e)}</a></td>${[0, 1, 2].slice(0, n).map(j => `<td class="n">${esc(((line[g][e] || [])[j] || [])[0] || "–")}</td>`).join("")}</tr>`).join("");
    /* the conference's levels in high school events first (Ryan 2026-10-25) */
    const confHS = g => { const R = hsRows((gg, e) => { const r = (line[gg] || {})[e]; return r ? [0, 1, 2].map(j => { const v = r[j]; return v ? (v[1] ? `${v[1]} (${v[0]})` : v[0]) : ""; }) : null; }, g, parse), cl = [0, 1, 2].filter(j => (line.rule !== "p4" || j < 2) && R.some(x => x[1][j])), LB = ["Target", "Recruit", "Walk-On"];
      return R.length ? `<h2>${esc(c)} ${gName(g).toLowerCase()} standards in high school events</h2><div class="scroll"><table><tr><th>High school event</th>${cl.map(j => `<th class="n">${LB[j]}</th>`).join("")}</tr>${R.map(([e, v, note]) => `<tr><td>${esc(e)}${note ? ` <small>${esc(note)}</small>` : ""}</td>${cl.map(j => `<td class="n">${esc(v[j] || "–")}</td>`).join("")}</tr>`).join("")}</table></div>` : ""; };
    const body = (d !== "NJCAA" && Object.keys(line.m || line.w || {}).length ? confHS("m") + confHS("w") + `<p>The ${esc(c)}'s levels from its 2026 championship, converted to the events you run in high school (1600m from the 1500m, 3200m from the 5000m, 300m hurdles from the 400m hurdles). Schools with their own published chart (★) can differ: open the school.</p>` : "") + `<h2>${esc(c)} track &amp; field programs (${list.length})</h2><div class="scroll"><table><tr><th>School</th><th>State</th><th>${d === "NJCAA" ? "On this site" : "Standards"}</th></tr>${list.map(s => `<tr><td><a href="${sl(s)}">${esc(s.n)}</a>${s.o ? ' <span class="star">★ official</span>' : ""}</td><td>${esc(STATE[s.s] || s.s || "")}</td><td>${s.j ? "Season results" : s.o ? "Published by the school" : s.est ? "Estimate" : "Set from 2026 conference results"}</td></tr>`).join("")}</table></div>` +
      (Object.keys(line.m || {}).length ? ["m", "w"].map(g => (line.rule === "p4" ? `<h2>${esc(c)} ${gName(g).toLowerCase()} marks: what it took this season</h2><p>The ${esc(c)} is a Power 4 conference, so there is no Walk-On level. Target is the middle of the 8th to 10th best marks in the conference in 2026 and Recruit the middle of the 15th to 25th, for conference schools without an official chart.</p><div class="scroll"><table><tr><th>Event</th><th class="n">Target</th><th class="n">Recruit</th></tr>${evRows(g, 2)}</table></div>` : `<h2>${esc(c)} ${gName(g).toLowerCase()} marks: what it took this season</h2><p>The 8th, 15th and 25th best marks in the ${esc(c)} in 2026, which set the Target, Recruit and Walk-On levels for conference schools without an official chart.</p><div class="scroll"><table><tr><th>Event</th><th class="n">8th (Target)</th><th class="n">15th (Recruit)</th><th class="n">25th (Walk-On)</th></tr>${evRows(g)}</table></div>`)).join("") : "");
    const juco = d === "NJCAA";
    /* a conference named like a school ("American" vs American University) says Conference, so no two pages share a title */
    const cTitle = S.some(x => (x.t || "") === c || x.n === c) ? `${c} Conference` : c;
    write(confName.get(k), page({ title: juco ? `NJCAA Junior College Track & Field Programs (${list.length})` : `${cTitle} Track & Field Recruiting Standards ${SEASON}`,
      desc: juco ? `All ${list.length} NJCAA junior college track and field programs, with each team's season results, roster and TFRRS links. Results only: no predicted levels.` : `${c} track and field recruiting standards ${SEASON}: ${levelWords(d)} marks for all ${list.length} ${d} programs, plus what it took to score at the ${c} championships.`,
      pathname: confName.get(k), crumbs: [["Home", "/"], ["Explore", "/explore.html"], juco ? ["Junior colleges", JG] : [d, divPath(d)], [c, confName.get(k)]], h1: juco ? "NJCAA Junior College Track &amp; Field Programs" : `${esc(c)} Track &amp; Field Recruiting Standards`,
      intro: juco ? `${list.length} junior college programs compete in NJCAA track and field. There are no conference lists, so this site doesn't set recruiting levels for them; each program's page shows its season bests, roster and TFRRS links, and the <a href="${JG}">junior college guide</a> explains how NJCAA recruiting works.` : `Every ${esc(d)} ${esc(c)} track and field program, with links to each school's Target, Recruit and Walk-On standards for men and women.`, body,
      ld: [{ "@context": "https://schema.org", "@type": "ItemList", name: `${c} track and field programs`, itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + sl(s), name: s.n })) }] }));
  }
  /* division x event */
  for (const d of DIVS) for (const g of ["m", "w"]) {
    const list = S.filter(s => s.d === d);
    for (const e of evAvail(list, g)) {
      const rows = list.map(s => ({ s, t: std(s, g, e), r: raw(s, g, e) })).filter(x => x.t);
      const wv = x => parse(x.r[2], e); rows.sort((a, b) => { const va = wv(a), vb = wv(b); if (va == null) return 1; if (vb == null) return -1; return FIELD.has(e) ? va - vb : vb - va; });
      const vals = j => rows.map(x => parse(x.r[j], e)).filter(v => v != null).sort((a, b) => a - b);
      const mid = j => { const v = vals(j); if (v.length < 4) return "–"; const f = x => FIELD.has(e) ? `${x.toFixed(2)}m (${ftIn(x)})` : (x >= 60 ? Math.floor(x / 60) + ":" + (x % 60).toFixed(2).padStart(5, "0") : x.toFixed(2)); return `${f(v[Math.floor(v.length * .25)])} to ${f(v[Math.floor(v.length * .75)])}`; };
      const p = evPath(d, g, e), name = `${d} ${gName(g)} ${e}`;
      /* the high school event next to the college one (Ryan 2026-10-25: a high school column on every table) */
      const HSE = { "1500m": "1600m", "3000m": "3200m", "5000m": "3200m", "400m Hurdles": "300m Hurdles", ...(g === "m" ? { "110m Hurdles": '110m Hurdles (39")' } : {}) }[e];
      const entry = x => { const j = [2, 1, 0].find(i => x.t[i] && String(x.t[i]).trim()); return j == null ? null : String(x.t[j]); };
      const hsOf = x => { const v = entry(x); return v ? hsLevel(0, e, g, v.replace(/ est\.$/, ""), parse) : null; };
      const hsMid = (() => { if (!HSE) return null; const v = rows.map(x => { const h = hsOf(x); return h ? parse(h, HSE.replace(/ \(39"\)$/, "")) : null; }).filter(x => x != null).sort((a, b) => a - b); return v.length >= 4 ? [v[Math.floor(v.length * .25)], v[Math.floor(v.length * .75)]].map(x => fmtHS(x)) : null; })();
      const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
        ...(hsMid ? [{ "@type": "Question", name: `What ${HSE} time do you need for ${d} ${gName(g).toLowerCase()} track?`, acceptedAnswer: { "@type": "Answer", text: `In high school terms, the mark to make the team at the middle half of ${d} programs is about ${hsMid[0]} to ${hsMid[1]} in the ${HSE}, converted from each program's college ${e} level (Walk-On, or Recruit where there's no Walk-On level).` } }] : []),
        { "@type": "Question", name: `What does it take to walk on in ${name}?`, acceptedAnswer: { "@type": "Answer", text: `Across ${rows.length} ${d} programs, the middle half of ${gName(g).toLowerCase()} ${e} Walk-On standards run ${mid(2)}.` } },
        { "@type": "Question", name: `What ${e} ${FIELD.has(e) ? "mark" : "time"} gets recruited in ${d}?`, acceptedAnswer: { "@type": "Answer", text: `The middle half of ${d} ${gName(g).toLowerCase()} ${e} Recruit standards run ${mid(1)}, and Target standards run ${mid(0)}. Recruiting standards are not a guarantee of an offer.` } }] };
      /* answer first (2026-10-30: "d1 400m time", "d1 mile time" at position 5-8, 0 clicks): the number opens the page, in the searcher's words */
      const tw = FIELD.has(e) ? "mark" : "time", r1 = mid(1), r2 = mid(2);
      const ans = `${r1 !== "–" ? `Most ${d} programs recruit ${gName(g).toLowerCase()} ${e} athletes at about ${r1} (the middle half of Recruit levels)` : `The typical ${d} ${gName(g).toLowerCase()} ${e} standard is about ${r2}`}${r1 !== "–" && r2 !== "–" ? `, and walk-on ${tw}s run about ${r2}` : ""}.${hsMid ? ` In high school terms that's about ${hsMid[0]} to ${hsMid[1]} in the ${HSE}.` : ""}`;
      faq.mainEntity.unshift({ "@type": "Question", name: `What ${e} ${tw} do you need for ${d} ${gName(g).toLowerCase()} track?`, acceptedAnswer: { "@type": "Answer", text: ans } });
      const T1 = `${name} ${FIELD.has(e) ? "Marks" : "Times"} & Recruiting Standards ${SEASON}`;
      write(p, page({ title: T1.length <= 60 ? T1 : `${name} Recruiting Standards ${SEASON}: Every School`, desc: `${name} recruiting standards ${SEASON} at all ${rows.length} programs: ${levelWords(d)} ${FIELD.has(e) ? "marks" : "times"}, ranked most reachable first. Typical walk-on: ${mid(2)}.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], [d, divPath(d)], [`${gName(g)} ${e}`, p]], h1: `${esc(name)} Recruiting Standards`,
        intro: `<b>${esc(ans)}</b> Below: Target, Recruit and Walk-On marks for every ${esc(d)} program, most reachable Walk-On first (middle half of programs: Target ${esc(mid(0))}). ★ = the school's own published standards.`,
        body: `<div class="scroll"><table><tr><th>School</th><th>Conference</th>${HSE ? `<th class="n">High school ${esc(HSE)} to make the team</th>` : ""}<th class="n">Target</th><th class="n">Recruit</th><th class="n">Walk-On</th></tr>${rows.map(x => `<tr><td><a href="${sl(x.s)}">${esc(x.s.n)}</a>${x.s.o ? ' <span class="star">★</span>' : ""}</td><td><a href="${confName.get(x.s.d + "|" + x.s.c)}">${esc(x.s.c)}</a></td>${HSE ? `<td class="n"><b>${esc(hsOf(x) || "–")}</b></td>` : ""}${[0, 1, 2].map(j => `<td class="n">${esc(x.t[j] || "–")}</td>`).join("")}</tr>`).join("")}</table></div>`
          + `<h2>Common questions</h2>${faq.mainEntity.map(x => `<h3>${esc(x.name)}</h3><p>${esc(x.acceptedAnswer.text)}</p>`).join("")}`,
        ld: [faq] }));
    }
  }

  /* division hubs (Ryan 2026-10-17 "fix what u can": "d1/d2/d3 track and field recruiting standards" ranked 8-12 with no page made for it).
     Every event's median Target/Recruit/Walk-On across the division's programs, linked to the full event table, plus every conference and school. */
  /* feet first, as on the school pages; each measurement unbroken (nbsp) so a narrow cell wraps only between feet and metres */
  const fmtMark = (e, x) => { if (FIELD.has(e)) { const inch = Math.round(x / 0.0254); return `${Math.floor(inch / 12)}'\u00a0${inch % 12}" (${x.toFixed(2)}m)`; } return x >= 60 ? Math.floor(x / 60) + ":" + (x % 60).toFixed(2).padStart(5, "0") : x.toFixed(2); };
  for (const d of DIVS) {
    const list = S.filter(s => s.d === d).sort((a, b) => a.n.localeCompare(b.n)), p = divPath(d), nOff = list.filter(s => s.o).length;
    const med = (g, e, j) => { const v = list.map(s => { const r = raw(s, g, e); return r ? parse(r[j], e) : null; }).filter(v => v != null).sort((a, b) => a - b); return v.length >= 4 ? fmtMark(e, v[Math.floor(v.length / 2)]) : null; };
    /* college events only (1600m/3200m/300mH come from a handful of charts and give unstable medians); levels per division rule
       (D3 and NAIA have no Recruit level); a Recruit median outside its Target/Walk-On pair is dropped rather than shown out of order */
    const HUB_EV = new Set(["100m", "200m", "400m", "800m", "1500m", "5000m", "10000m", "100m Hurdles", "110m Hurdles", "400m Hurdles", "3000m Steeplechase", ...FIELD]);
    const cols = [0, 1, 2].filter(j => (DB.rules || {})[d] ? DB.rules[d][j] != null : true);
    const tab = {}; for (const g of ["m", "w"]) tab[g] = evAvail(list, g).filter(e => HUB_EV.has(e)).map(e => {
      const v = [0, 1, 2].map(j => med(g, e, j)), n = v.map(x => x && parse(x, e));
      if (n[1] != null && n[0] != null && n[2] != null && !(FIELD.has(e) ? n[0] >= n[1] && n[1] >= n[2] : n[0] <= n[1] && n[1] <= n[2])) v[1] = null;
      return { e, v }; }).filter(r => cols.some(j => r.v[j]));
    const LV = ["Target", "Recruit", "Walk-On"];
    const tbl = g => `<h2>${esc(d)} ${gName(g).toLowerCase()} recruiting standards by event</h2><div class="scroll"><table><tr><th>Event</th>${cols.map(j => `<th class="n">${LV[j]}</th>`).join("")}</tr>${tab[g].map(r => `<tr><td><a href="${evPath(d, g, r.e)}">${esc(r.e)}</a></td>${cols.map(j => `<td class="n">${esc(r.v[j] || "–")}</td>`).join("")}</tr>`).join("")}</table></div>`;
    const pick = (g, e) => (tab[g].find(r => r.e === e) || { v: [] }).v;
    const q = [];
    const m100 = pick("m", "100m"), w100 = pick("w", "100m"), m1500 = pick("m", "1500m"), w1500 = pick("w", "1500m");
    if (m100[2] && w100[2]) q.push([`How fast do you need to run the 100m for ${d} track?`, `At the median ${d} program the men's 100m Walk-On standard is ${m100[2]} and the women's is ${w100[2]}${m100[0] ? `; the Target standard is ${m100[0]} for men and ${w100[0]} for women` : ""}. Standards vary by program: the event table lists every school.`]);
    if (m1500[2] && w1500[2]) q.push([`What 1500m time do you need for ${d}?`, `The median ${d} Walk-On standard in the 1500m is ${m1500[2]} for men and ${w1500[2]} for women. High school 1600m and mile times are converted on this site's search.`]);
    q.push([`How are ${d} recruiting standards set?`, `${nOff} of ${list.length} ${d} programs publish their own standards (marked ★ official). For the rest, levels come from what it took to place 8th, 15th and 25th at the program's 2026 conference championship${d === "NCAA D1" ? " (Power 4 conferences, the ACC, Big Ten, Big 12 and SEC, have no Walk-On level: Target is the middle of the 8th to 10th best marks and Recruit the middle of the 15th to 25th)" : ""}. Standards are a guide, not a guarantee of a roster spot${d === "NCAA D3" ? "; NCAA D3 programs give no athletic scholarships" : ""}.`]);
    const confKeys = [...confs.keys()].filter(k => k.startsWith(d + "|")).sort();
    /* Top / Mid / Low tiers (Ryan 2026-10-25: "Create Top, Mid, and Low tier tables for every division (Power 4 vs mid-major vs
       low-major). Place these at the top"). D1: Top = Power 4, the other conferences split in half by level; D2/D3/NAIA:
       conferences in thirds by level. Level = the conference's average percentile across core events (its own 2026 marks).
       Each cell = the median program in that tier, at Recruit (D1/D2) or Walk-On (D3/NAIA, no Recruit level), in high school events. */
    const TJ = cols.includes(1) ? 1 : 2, CORE = ["100m", "200m", "400m", "800m", "1500m", "5000m", "Long Jump", "High Jump", "Shot Put"];
    const confLv = new Map(confKeys.map(k => [k, (() => { const L = list.filter(x => x.d + "|" + x.c === k), sc = [];
      for (const g of ["m", "w"]) for (const e of CORE) { const v = L.map(x => { const r = raw(x, g, e); return r && parse(r[TJ] || r[1] || r[2], e); }).filter(v => v != null).sort((a, b) => a - b); if (v.length) sc.push([g, e, v[Math.floor(v.length / 2)]]); }
      return sc; })()]));
    const pctOf = k => { const sc = confLv.get(k); if (!sc.length) return null; const ps = sc.map(([g, e, v]) => { const all = [...confLv.values()].map(x => (x.find(y => y[0] === g && y[1] === e) || [])[2]).filter(x => x != null); const better = all.filter(x => FIELD.has(e) ? x > v : x < v).length; return better / all.length; }); return ps.reduce((a, b) => a + b, 0) / ps.length; };
    const isP4 = k => (CT[k] || {}).rule === "p4";
    const ranked = confKeys.filter(k => !isP4(k) && pctOf(k) != null).sort((a, b) => pctOf(a) - pctOf(b));
    const TIERS = d === "NCAA D1" ? [["Power 4", confKeys.filter(isP4)], ["Mid-major", ranked.slice(0, Math.ceil(ranked.length / 2))], ["Low-major", ranked.slice(Math.ceil(ranked.length / 2))]]
      : [["Top tier", ranked.slice(0, Math.ceil(ranked.length / 3))], ["Mid tier", ranked.slice(Math.ceil(ranked.length / 3), Math.ceil(2 * ranked.length / 3))], ["Low tier", ranked.slice(Math.ceil(2 * ranked.length / 3))]];
    const tierMed = (keys, g, e) => { const v = list.filter(x => keys.includes(x.d + "|" + x.c) && !x.est).map(x => { const r = std(x, g, e); const j = isP4(x.d + "|" + x.c) ? 1 : TJ; return r && r[j] && !/ est\.$/.test(r[j]) ? parse(String(r[j]).split(" (")[0], e) : null; }).filter(v => v != null).sort((a, b) => a - b); return v.length >= 3 ? v[Math.floor(v.length / 2)] : null; };
    const hsEv = g => [["100m", "100m"], ["200m", "200m"], ["400m", "400m"], ["800m", "800m"], ["1600m", "1500m"], ["3200m", "5000m"], g === "m" ? ['110m Hurdles (39")', "110m Hurdles"] : ["100m Hurdles", "100m Hurdles"], ["300m Hurdles", "400m Hurdles"], ["High Jump", "High Jump"], ["Pole Vault", "Pole Vault"], ["Long Jump", "Long Jump"], ["Triple Jump", "Triple Jump"], ["Shot Put", "Shot Put"], ["Discus", "Discus"]];
    const hsVal = (g, hs, e, v) => v == null ? "–" : FIELD.has(e) ? fmtMark(e, v) : hs === e ? fmtMark(e, v) : (hsLevel(0, e, g, String(fmtMark(e, v)).split(" (")[0], parse) || "–");
    /* a thin event can come out with a lower tier ahead of a higher one: show a dash there rather than an out-of-order number */
    const TV = {}; for (const g of ["m", "w"]) TV[g] = hsEv(g).map(([hs, e]) => { const n = TIERS.map(([, keys]) => tierMed(keys, g, e)); let best = null;
      return [hs, n.map(v => { if (v == null) return "–"; if (best != null && (FIELD.has(e) ? v > best : v < best)) return "–"; best = v; return hsVal(g, hs, e, v); })]; }).filter(r => r[1].some(x => x !== "–"));
    const lvWord = TJ === 1 ? "Recruit" : "Walk-On (the mark to make the team)";
    const tierTbl = g => `<h2>${esc(d)} ${gName(g).toLowerCase()} standards by tier (high school events)</h2><div class="scroll"><table><tr><th>Event</th>${TIERS.map(([t]) => `<th class="n">${t}</th>`).join("")}</tr>${TV[g].map(([e, v]) => `<tr><td>${esc(e)}</td>${v.map(x => `<td class="n">${esc(x)}</td>`).join("")}</tr>`).join("")}</table></div>`;
    const XD = ((XCS.div || {})[d]) || {}, XT = ["Top", "Mid", "Low"];
    const xcTbl = Object.keys(XD).length ? `<h2>${esc(d)} cross country standards by tier</h2><p>From every ${esc(d)} team's own runners at the NCAA ${d === "NAIA" ? "conference and national meets" : "regionals"}, 2024 and 2025: programs split into thirds by their 5th runner. Cells show the ${d === "NCAA D3" || d === "NAIA" ? "7th runner (the varsity line)" : "5th runner (the last scorer)"}, then the same fitness in a high school 5K.</p><div class="scroll"><table><tr><th>Race</th>${XT.map(t => `<th class="n">${t} tier</th>`).join("")}</tr>${["m", "w"].filter(g => XD[g]).map(g => { const i = XD[g].tiers.Top[1] ? 1 : 2; return `<tr><td>${gName(g)} ${XD[g].d}</td>${XT.map(t => `<td class="n">${fmtXC(XD[g].tiers[t][i])}</td>`).join("")}</tr><tr><td><small>High school 5K, about</small></td>${XT.map(t => `<td class="n"><small>${fmtXC(XD[g].hs[t][i])}</small></td>`).join("")}</tr>`; }).join("")}</table></div>` : "";
    const tierNote = `<p>Each cell is the median ${esc(d)} program in that tier at the ${lvWord} level, in the events you run in high school (1600m from the college 1500m, 3200m from the 5000m, 300m hurdles from the 400m hurdles${d === "NCAA D1" ? "; Power 4 programs have no Walk-On level, so their Recruit level is used" : ""}). Tiers: ${TIERS.map(([t, keys]) => `<b>${t}</b>: ${keys.map(k => `<a href="${confName.get(k)}">${esc(k.split("|")[1])}</a>`).join(", ")}`).join(". ")}.</p>`;
    let lead = "";   /* answer first (2026-10-29 AEO check): the tier answer opens the page, before the checker */
    { const m16 = TV.m.find(r => r[0] === "1600m"), m1 = TV.m.find(r => r[0] === "100m"), w16 = TV.w.find(r => r[0] === "1600m");
      if (m16 && m1) { const w1 = TV.w.find(r => r[0] === "100m"), mid = TIERS.length > 1 ? 1 : 0;
        const mi = v => { const x = parse(String(v), "1600m"); return x ? ` (${Math.floor(x * 1.0058 / 60)}:${(x * 1.0058 % 60).toFixed(1).padStart(4, "0")} for a mile)` : ""; };   /* "d1 mile time": 228 impressions, position 4.9 */
        lead = `At a typical ${d === "NCAA D1" ? "mid-major " : "mid-tier "}${d} program, boys need about ${m1[1][mid]} in the 100m and ${m16[1][mid]} in the 1600m${mi(m16[1][mid])}${w1 && w16 ? `, and girls about ${w1[1][mid]} and ${w16[1][mid]}${mi(w16[1][mid])}` : ""}, to ${TJ === 1 ? "get recruited" : "make the team"}.${d === "NCAA D3" ? " Division III gives no athletic scholarships; aid is need-based or academic." : ""} `; }
      if (m16 && m1) q.unshift([`What times do you need to run ${d} track in high school?`, `${TIERS.map(([t], i) => `${t}: about ${m1[1][i]} in the 100m and ${m16[1][i]} in the 1600m for boys${w16 ? `, ${w16[1][i]} in the 1600m for girls` : ""}`).join("; ")}. These are the ${TJ === 1 ? "Recruit" : "Walk-On"} levels of the median program in each tier, converted to high school events.`]);
      if (XD.m) { const i = XD.m.tiers.Top[1] ? 1 : 2; q.splice(1, 0, [`What cross country times do you need for ${d}?`, `${XT.map(t => `${t} tier: about ${fmtXC(XD.m.hs[t][i])} for boys${XD.w ? ` and ${fmtXC(XD.w.hs[t][i])} for girls` : ""} in a high school 5K`).join("; ")}, from ${d} teams' own runners in 2024 and 2025.`]); } }
    const body = tierTbl("m") + tierTbl("w") + tierNote + xcTbl + tbl("m") + tbl("w") + `<p>Each value is the median across ${list.length} ${esc(d)} programs. Tap an event for every school's marks, most reachable first.</p>`
      + `<h2>Common questions</h2><div class="qa">${q.map(([a, b]) => `<h3>${esc(a)}</h3><p>${esc(b)}</p>`).join("")}</div>`
      + `<h2>${esc(d)} conferences (${confKeys.length})</h2>${groupLinks(confKeys.map(k => [confName.get(k), k.split("|")[1]]))}`
      + `<h2>Other divisions</h2>${groupLinks(DIVS.filter(x => x !== d).map(x => [divPath(x), `${x} track and field recruiting standards`]).concat([["/how-fast.html", "How fast do you need to run in college?"], ["/guides/ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field.html", "D1 vs D2 vs D3 vs NAIA"]]))}`
      + `<h2>Every ${esc(d)} track &amp; field program (${list.length})</h2>${groupLinks(list.map(s => [sl(s), s.n + (s.o ? " ★" : "")]))}`;
    write(p, page({ title: `${d} Track & Field Recruiting Standards ${SEASON}`,
      desc: `${d} track and field recruiting standards ${SEASON}: the typical ${levelWords(d)} mark in every event, men and women, from all ${list.length} ${d} programs.`,
      pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], [d, p]], h1: `${esc(d)} Track &amp; Field Recruiting Standards ${SEASON}`,
      intro: `${lead ? `<b>${esc(lead.trim())}</b> ` : ""}What it takes to run, jump or throw in ${esc(d)} track and field: the median Target, Recruit and Walk-On mark in every event across all ${list.length} ${esc(d)} programs. ${nOff} programs publish official standards (★).`,
      body, ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: q.map(([a, b]) => ({ "@type": "Question", name: a, acceptedAnswer: { "@type": "Answer", text: b } })) },
        { "@context": "https://schema.org", "@type": "ItemList", name: `${d} track and field programs`, itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + sl(s), name: s.n })) }] }));
  }
  /* states (scripts/seo/states.mjs) */
  const byState = statePages({ root, S, DIVS, STATE, statePath, confName, sl, std, raw, parse, write, page, esc, SITE, SEASON });
  /* college athlete pages (pilot, released 100/day): the index comes first so results/champions names can link to them */
  const AIDX = athleteIndex({ out, RIDX, cleanRank, evLabel, slug, EVENTS });
  /* every athlete name is a link (Ryan 2026-10-24: "unable to click on the individual athlete names"): their page when they have one,
     otherwise their profile in the app (season of this page, nofollow so crawlers stay on the real pages) */
  const nameCell = (z, D, x) => { if (!z[1]) return esc(D.teams[z[3]]); const h = AIDX.href(z); if (h) return `<a href="${h}">${esc(z[1])}</a>`;
    const id = z[9] && String(z[9]).split("/")[0]; return id && x ? `<a href="/?tab=results&amp;season=${x.year}-${x.season}&amp;div=${encodeURIComponent(x.div)}&amp;athlete=${id}" rel="nofollow">${esc(z[1])}</a>` : esc(z[1]); };
  /* champions + results (from the packed TFRRS results) */
  const champPages = [], resultPages = [];
  for (const x of RIDX) {
    if (!RDIVS.includes(x.div)) continue;
    let D; try { D = cleanRank(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data/rank", x.key + ".dat"))).toString())); } catch { continue; }
    const XC = x.season === "xc", seasonName = XC ? "Cross Country" : x.season[0].toUpperCase() + x.season.slice(1);
    const nat = D.lists.find(l => l.nat), champ = XC ? nat : D.lists.find(l => l.champ);   /* XC: the national meet is both */
    if (champ) {
      const p = `/champions/${x.year}-${x.season}-${slug(x.div)}.html`; champPages.push([p, `${x.year} ${seasonName} ${x.div}`]);
      const rows = g => Object.entries(champ.g[g] || {}).filter(([, r]) => r.length).map(([e, r]) => `<tr><td>${esc(evLabel(e))}</td><td>${nameCell(r[0], D, x)}</td><td>${esc(D.teams[r[0][3]])}</td><td class="n">${esc(r[0][4])}${r[0][5] ? ` <small>(${esc(r[0][5])})</small>` : ""}</td></tr>`).join("");
      write(p, page({ title: XC ? `${x.year} ${x.div} Cross Country National Champions` : `${x.year} ${x.div} ${seasonName} Track & Field National Champions`, desc: XC ? `${x.year} ${x.div} cross country national champions: men's and women's individual winners and team titles from the national championship race, with times.` : `Every ${x.year} ${x.div} ${x.season} track and field national champion, men and women, event by event, with the winning mark, team and wind from the national meet.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["National champions", "/explore.html#champions"], [`${x.year} ${seasonName} ${x.div}`, p]], h1: `${x.year} ${esc(x.div)} ${seasonName} National Champions`,
        intro: XC ? `Individual and team winners at the ${x.year} ${esc(x.div)} cross country national championships. Source: TFRRS meet results.` : `Winners of every event at the ${x.year} ${esc(x.div)} ${x.season} track and field national championships. Source: TFRRS meet results.`,
        body: ["m", "w"].map(g => `<h2>${gName(g)} champions</h2><div class="scroll"><table><tr><th>Event</th><th>Champion</th><th>Team</th><th class="n">Mark</th></tr>${rows(g)}</table></div>`).join("") }));
    }
    if (nat) for (const g of ["m", "w"]) for (const [e, r] of Object.entries(nat.g[g] || {})) {
      if (!r.length) continue;
      const ev = evLabel(e), p = `/results/${x.year}-${x.season}-${slug(x.div)}-${g === "m" ? "mens" : "womens"}-${slug(ev)}.html`; resultPages.push([p, x, g, ev]);
      write(p, page({ title: XC ? `${x.year} ${x.div} ${gName(g)} ${ev} XC Championship Results` : `${x.year} ${x.div} ${gName(g)} ${ev} Rankings (${seasonName})`, desc: XC ? `${x.year} ${x.div} ${gName(g).toLowerCase()} ${ev} cross country championship results: ${/Team/.test(ev) ? "team standings" : "every finisher"}, led by ${r[0][1] || D.teams[r[0][3]]} (${D.teams[r[0][3]]}) in ${r[0][4]}.` : `${x.year} ${x.div} ${gName(g).toLowerCase()} ${ev} rankings: the top ${Math.min(50, r.length)} ${x.season} marks, led by ${r[0][1] || D.teams[r[0][3]]} (${D.teams[r[0][3]]}) at ${r[0][4]}. Class, team and meet for every mark.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["Results", "/explore.html#results"], [`${x.year} ${seasonName} ${x.div}`, "/explore.html#r-" + x.key], [`${gName(g)} ${ev}`, p]],
        h1: XC ? `${x.year} ${esc(x.div)} ${gName(g)} ${esc(ev)} Cross Country Championship` : `${x.year} ${esc(x.div)} ${gName(g)} ${esc(ev)}: Top Marks`, intro: XC ? `${/Team/.test(ev) ? "Team standings" : "Individual results"} from the ${x.year} ${esc(x.div)} ${gName(g).toLowerCase()} cross country national championship (${esc(ev.replace(" Team", ""))}). Source: TFRRS.` : `The best ${gName(g).toLowerCase()} ${esc(ev)} marks in ${esc(x.div)} during the ${x.year} ${x.season} season, from the TFRRS national list plus the national championship meet.`,
        body: `<div class="scroll"><table><tr><th>#</th><th>Athlete</th><th>Class</th><th>Team</th><th class="n">Mark</th><th>Meet</th></tr>${r.slice(0, 50).map((z, i) => `<tr><td>${i + 1}</td><td>${nameCell(z, D, x)}</td><td>${esc(z[2] || "")}</td><td>${esc(D.teams[z[3]])}</td><td class="n">${esc(z[4])}${z[8] ? ` <small>(${esc(z[8])})</small>` : z[5] ? ` <small>(${esc(z[5])})</small>` : ""}</td><td>${esc(D.meets[z[6]] || "")} <small>${esc(z[7] || "")}</small></td></tr>`).join("")}</table></div>` }));
    }
  }
  { const n = athletePages({ idx: AIDX, write, page, esc, slug, S, raw, parse, FIELD, EVENTS, sl, evPath, confName, gName }); console.log(`athlete pages: ${n} live of ${AIDX.all.length} (100/day)`); }
  /* high school athletes, parents and coaches */
  const writeRaw = (p, txt) => { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };
  hsPages({ S: S.filter(x => !x.j), CT, write, writeRaw, page, parse, esc, slug, schoolUrl: sl, evPath, FIELD, SITE, gName });
  /* 25 SEO + AEO topic guides (Ryan 2026-10-16), then the guides hub is rebuilt to list them */
  const TOPICS = topicPages({ S: S.filter(x => !x.j), CT, write, page, parse, esc, slug, evPath, FIELD, SITE, gName, STATE, statePath, resultPages, DATES, QUIZ });
  /* scholarship + timeline guides fact-checked against NCAA/NAIA sources (social/standards/site/GAP-GUIDES-SOURCES.md) */
  /* data reports for links and citations (scripts/seo/reports.mjs, outreach 2.1 + 2.2) */
  try { TOPICS.push(...reportPages({ root, S: S.filter(x => !x.j), CT, std, write, page, esc, sl, SITE, DATES, QUIZ })); } catch (e) { console.warn("reports skipped:", e && e.message); }
  try { TOPICS.push(...gapGuides({ S: S.filter(x => !x.j), CT, write, page, parse, esc, slug, evPath, FIELD, SITE, gName, STATE, statePath, resultPages, DATES, QUIZ })); } catch (e) { console.warn("gap guides skipped:", e && e.message); }
  /* NJCAA marks by event (Ryan 2026-10-16, keyword gap "njcaa track standards"): this site sets no NJCAA levels (national, not
     conference, competition), so the page shows what it took to rank #1/#10/#25/#50/#100 on the newest NJCAA national list (TFRRS). */
  try {
    const nk = RIDX.filter(x => x.div === "NJCAA" && x.season === "outdoor").sort((a, b) => b.year.localeCompare(a.year))[0];
    const nd = nk && cleanRank(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data/rank", nk.key + ".dat"))).toString()));
    const NL = nd && (nd.lists.find(l => /all schools/i.test(l.label || "")) || nd.lists.find(l => l.nat));
    if (NL) {
      const P = [1, 10, 25, 50, 100], clean = m => String(m || "").replace(/[@#*]/g, "").trim();
      const nice = e => e.replace(/^(\d[\d,]*) Meters$/, "$1m").replace(/^(\d+) Hurdles$/, "$1m Hurdles").replace(/^(\d+) Steeplechase$/, "$1m Steeplechase");
      const tab = g => { const E = NL.g[g] || {}; const rows = Object.keys(E).filter(e => !/Relay|thlon/.test(e) && E[e].length >= 50);
        return { rows, html: `<div class="scroll"><table><thead><tr><th>Event</th>${P.map(k => `<th class="num">#${k}</th>`).join("")}</tr></thead><tbody>${rows.map(e => `<tr><td>${esc(nice(e))}</td>${P.map(k => `<td class="num">${E[e][k - 1] ? esc(clean(E[e][k - 1][4])) : "–"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` }; };
      const M = tab("m"), W = tab("w"), m50 = e => { const r = (NL.g.m[e] || [])[49]; return r ? clean(r[4]) : null; }, w50 = e => { const r = (NL.g.w[e] || [])[49]; return r ? clean(r[4]) : null; };
      const yr = nk.year, up = DATES.data, url = "/guides/njcaa-track-and-field-marks-by-event.html";
      const quick = `On the ${yr} NJCAA outdoor national list, the 50th-best men's marks were ${m50("100 Meters")} in the 100m, ${m50("400 Meters")} in the 400m and ${m50("1500 Meters")} in the 1500m; women's were ${w50("100 Meters")}, ${w50("400 Meters")} and ${w50("1500 Meters")}. Junior colleges don't publish one standard, so national rank is the best guide.`;
      const faq = [[`What times do you need to run NJCAA track?`, quick],
        [`Do NJCAA programs have recruiting standards?`, `Most junior colleges don't publish a standards chart, and NJCAA competition is national rather than conference-based, so this site doesn't set Target, Recruit or Walk-On levels for them. The national list shows where your mark would rank among every NJCAA athlete.`],
        [`Where do these marks come from?`, `The ${yr} NJCAA outdoor national performance list on TFRRS (${esc(NL.label)}), updated ${up}. Wind-aided marks are included as listed.`]];
      write(url, page({ title: `NJCAA Track and Field Marks by Event (${yr})`, desc: `What it took to rank #1, #10, #25, #50 and #100 nationally in every NJCAA track and field event in ${yr}, men and women, from the TFRRS national list.`,
        pathname: url, crumbs: [["Home", "/"], ["Guides", "/guides.html"], ["NJCAA marks", url]], h1: `NJCAA track and field marks by event (${yr})`,
        intro: `<div class="qa"><b>Quick answer</b><p>${esc(quick)}</p></div><p class="upd">Updated ${up} · Source: TFRRS national list</p>`,
        body: `<h2>Men's NJCAA marks by national rank</h2>${M.html}<h2>Women's NJCAA marks by national rank</h2>${W.html}
<h2>How should you use these marks?</h2><p>If your mark would rank in the top 100 on this list, you can compete in the NJCAA right away, and a top-25 mark puts you near the national meet. Junior college can also be a path to a four-year program: see the <a href="/guides/junior-college-track-and-field-recruiting.html">junior college recruiting guide</a>.</p>
<h2>Common questions</h2>${faq.map(([q, a2]) => `<h3>${esc(q)}</h3><p>${esc(a2)}</p>`).join("")}
<p><a href="/?tab=results&div=NJCAA">Full NJCAA national list ›</a> · <a href="/how-fast.html">How fast do you need to run in college?</a> · <a href="https://www.njcaa.org/" rel="noopener">NJCAA</a> · <a href="https://www.tfrrs.org/" rel="noopener">TFRRS</a></p>
<div class="cta"><b>Looking to run in college?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div>`,
        ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a2]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a2 } })) },
          { "@context": "https://schema.org", "@type": "Article", headline: `NJCAA track and field marks by event (${yr})`, dateModified: up, author: { "@type": "Organization", name: "Preferred Recruit" }, publisher: { "@type": "Organization", name: "Preferred Recruit" } }] }));
      TOPICS.push([url, `NJCAA track and field marks by event (${yr})`, quick]);
    }
  } catch (e) { console.warn("NJCAA marks page skipped:", e && e.message); }
  write("/guides.html", page({ title: "College Track Recruiting Guides for Athletes, Parents and Coaches | Preferred Recruit",
    desc: "College track and field recruiting guides: standards, scholarship times, walk-on marks, NCAA rules, emailing coaches, recruiting profiles, training and every division compared.",
    pathname: "/guides.html", crumbs: [["Home", "/"], ["Guides", "/guides.html"]], h1: "College track recruiting guides",
    intro: "Plain answers to the questions high school athletes and parents ask most, built from this site's standards for every college program.",
    body: `<h2>Recruiting guides</h2><div class="links">${TOPICS.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>
<h2>Levels, divisions and tools</h2><div class="links"><a href="/guides/target-recruit-walk-on-explained.html">Target, Recruit and Walk-On explained</a><a href="/guides/ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field.html">D1 vs D2 vs D3 vs NAIA</a><a href="${JG}">Junior college (NJCAA) recruiting</a><a href="/for-parents.html">For parents</a><a href="/for-coaches.html">For coaches</a><a href="/how-fast.html">How fast do you need to run?</a><a href="/convert.html">Conversions</a></div>`,
    ld: [{ "@context": "https://schema.org", "@type": "ItemList", name: "College track recruiting guides", itemListElement: TOPICS.map(([u, t], i) => ({ "@type": "ListItem", position: i + 1, name: t, url: SITE + u })) }] }));
  /* daily state x event pages (25/day on a fixed schedule, link-budgeted; Ryan 2026-10-16) */
  const DAILY = dailyPages({ out, S: S.filter(x => !x.j), CT, write, page, parse, esc, sl, SITE, gName, statePath });
  console.log(`daily pages: ${DAILY.pages} live (${DAILY.hubs || 0} hubs) as of ${DAILY.today || "-"}`);
  /* AEO: give AI answer engines every guide's quick answer in llms.txt (numbers regenerate with the data each build) */
  { const f = path.join(out, "llms.txt"); if (fs.existsSync(f)) fs.appendFileSync(f, `\n## Recruiting guides (quick answers)\n${TOPICS.map(([u, t, a]) => `- [${t}](${SITE}${u}): ${a}`).join("\n")}\n`); }
  /* pre-built HTML for every school page (served at /schools/<slug> by vercel.json); already in the sitemap */
  try { schoolPages({ root, out, S, CT, DATES, SITE, QUIZ, esc, schoolSlug, std, parse, EVENTS, STATE, evLabel, confUrl: s => confName.get(s.d + "|" + s.c), statePath, evPath, gName }); }
  catch (e) { console.warn("school pages skipped:", e && e.message); }
  /* junior college guide (Ryan 2026-10-15: JUCOs get no levels, but every junior-college search should still land here) */
  {
    const jucos = S.filter(x => x.j).sort((a, b) => (STATE[a.s] || a.s || "zz").localeCompare(STATE[b.s] || b.s || "zz") || a.n.localeCompare(b.n));
    const latest = RIDX.filter(x => x.div === "NJCAA" && x.season === "outdoor").map(x => x.year).sort().pop();
    const njResults = resultPages.filter(([, x]) => x.div === "NJCAA" && x.year === latest && x.season === "outdoor");
    const njChamps = champPages.filter(([u]) => /-njcaa\.html$/.test(u)).slice(-4).reverse();
    const byStateJ = new Map(); for (const x of jucos) { const k = STATE[x.s] || x.s || "Other"; if (!byStateJ.has(k)) byStateJ.set(k, []); byStateJ.get(k).push(x); }
    const faq = [
      ["Does this site list recruiting standards for junior colleges?", `No. Target, Recruit and Walk-On levels are set from conference results, and NJCAA junior colleges compete nationally rather than in conferences, so their marks can't be predicted reliably. Instead, every NJCAA program has a page with its season bests, roster and TFRRS links, and this season's NJCAA national list is on the site by event.`],
      ["Where can I see NJCAA track and field results?", `This season's NJCAA outdoor national list is on this site by event (${njResults.length} event lists${latest ? ` for ${latest}` : ""}), refreshed every Monday from TFRRS, along with NJCAA national champions by year.`],
      ["How many junior colleges have track and field?", `${NJ} NJCAA programs appear on this season's TFRRS national list. They are listed by state on this page, each with its own page.`]];
    write(JG, page({ title: "Junior College (NJCAA) Track & Field Recruiting Guide",
      desc: `Junior college track and field recruiting: all ${NJ} NJCAA programs by state, this season's NJCAA national results by event, national champions, and why junior colleges don't have predicted recruiting standards.`,
      pathname: JG, crumbs: [["Home", "/"], ["Guides", "/guides.html"], ["Junior colleges", JG]], h1: "Junior college (NJCAA) track &amp; field recruiting",
      intro: `${NJ} junior college programs compete in NJCAA track and field. Unlike NCAA and NAIA schools, they have no conference lists, which is how this site sets Target, Recruit and Walk-On levels, so junior colleges get no predicted standards here. What you get instead: every program's season bests, roster and TFRRS links, and the national list for every event.`,
      body: `<h2>This season's NJCAA national lists</h2>${njResults.length ? groupLinks(njResults.map(([u, , g, ev]) => [u, `${gName(g)} ${ev}`])) : `<p><a href="/?tab=results&div=NJCAA">Open the NJCAA national list in Results ›</a></p>`}
${njChamps.length ? `<h2>NJCAA national champions</h2>${groupLinks(njChamps)}` : ""}
<h2>Every NJCAA program by state</h2>${[...byStateJ.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([st, L]) => `<h3>${esc(st)} (${L.length})</h3>${groupLinks(L.map(x => [sl(x), x.n]))}`).join("")}
<h2>Common questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`,
      ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] }));
  }
  /* hub */
  const evLinks = DIVS.map(d => `<h2 id="${slug(d)}">${esc(d)}</h2><p><a href="${divPath(d)}">${esc(d)} track and field recruiting standards: every event</a></p><h3>Conferences</h3>${groupLinks([...confs.keys()].filter(k => k.startsWith(d + "|")).sort().map(k => [confName.get(k), k.split("|")[1]]))}<h3>Standards by event</h3>${groupLinks(["m", "w"].flatMap(g => evAvail(S.filter(s => s.d === d), g).map(e => [evPath(d, g, e), `${gName(g)} ${e}`])))}`).join("");
  const resultsByKey = new Map(); for (const [p, x, g, ev] of resultPages) { if (!resultsByKey.has(x.key)) resultsByKey.set(x.key, [x, []]); resultsByKey.get(x.key)[1].push([p, `${gName(g)} ${ev}`]); }
  const resultsHtml = [...resultsByKey.values()].sort((a, b) => b[0].year.localeCompare(a[0].year) || a[0].season.localeCompare(b[0].season) || RDIVS.indexOf(a[0].div) - RDIVS.indexOf(b[0].div))
    .map(([x, list]) => `<h3 id="r-${x.key}">${x.year} ${x.season} · ${esc(x.div)}</h3>${groupLinks(list)}`).join("");
  write("/explore.html", page({ title: "Explore College Track & Field: Standards, Rankings, Champions", desc: `Every college track and field conference, state, event standard, ranking and national champion in one place: NCAA D1, D2, D3, NAIA and NJCAA, 2016 to today.`,
    pathname: "/explore.html", crumbs: [["Home", "/"], ["Explore", "/explore.html"]], h1: "Explore College Track &amp; Field",
    intro: `${NS.toLocaleString()} college programs with recruiting standards, ${NJ} junior colleges with results, ${confs.size} conferences, every event's recruiting standards, national champions and top marks from 2016 to today.`,
    body: `<h2 id="high-school">High school athletes, parents and coaches</h2>${groupLinks([["/how-fast.html", "How fast do you need to run in college? (every event)"], ["/convert.html", "High school to college conversions"], ["/guides.html", "Recruiting guides"], ["/for-parents.html", "For parents"], ["/for-coaches.html", "Free widget for coaches"]])}<h2 id="preferred-recruit">Preferred Recruit</h2>${groupLinks([["https://thepreferredrecruit.com/", "thepreferredrecruit.com"], ["https://www.youtube.com/@thepreferredrecruit", "YouTube"], ["https://www.instagram.com/preferredrecruit/", "Instagram"], ["https://www.tiktok.com/@preferredrecruit", "TikTok"]])}<h2 id="njcaa">Junior colleges (NJCAA)</h2>${groupLinks([[JG, "Junior college track & field recruiting guide"], [confName.get("NJCAA|NJCAA") || JG, `All ${NJ} NJCAA programs`], ["/?tab=results&div=NJCAA", "NJCAA national results list"]])}<h2>States</h2>${groupLinks([...byState.keys()].sort((a, b) => (STATE[a] || a).localeCompare(STATE[b] || b)).map(st => [statePath(st), STATE[st] || st]))}${evLinks}<h2 id="champions">National champions</h2>${groupLinks(champPages.map(([u, t]) => [u, t]))}<h2 id="results">Top marks by season</h2><p><a href="/athletes.html">Top college athletes: season bests, ranks and how their marks compare with college standards ›</a></p>${resultsHtml}` }));
  /* sitemap: every school page + every page above */
  /* home page: real content in #root so crawlers see the site's main page (the app replaces it when it starts).
     Runs after schoolPages, which reads the clean shell. */
  try {
    const shellFile = path.join(out, "index.html");
    if (fs.existsSync(shellFile)) {
      const shell = fs.readFileSync(shellFile, "utf8");
      const L = items => `<ul style="columns:3 200px;padding-left:18px">${items.map(([u, t]) => `<li><a href="${u}">${esc(t)}</a></li>`).join("")}</ul>`;
      const latestYear = champPages.length ? champPages.map(([u]) => u.match(/\/champions\/(\d{4})/)).filter(Boolean).map(m => m[1]).sort().pop() : null;
      const home = `<main style="max-width:1000px;margin:0 auto;padding:28px 20px 60px;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#0B0B0F">
<h1>College Track &amp; Field Standards and Results</h1>
<p>Recruiting standards for ${NS.toLocaleString()} college track and field programs in NCAA D1, D2, D3 and NAIA, every NCAA result since 2016, results for ${NJ} NJCAA junior colleges, and a recruiting AI. Enter your event and best mark to see every college where it's a Target, Recruit or Walk-On level. High school 1600m, 3200m, 300m hurdle and 39-inch hurdle marks are converted automatically.</p>
<h2>How fast do you need to run in college?</h2>${L(["m", "w"].flatMap(g => ["100m", "200m", "400m", "800m", "1600m", "3200m", "Long Jump", "Shot Put"].map(e => [`/how-fast/${g === "m" ? "mens" : "womens"}-${slug(e)}.html`, `${g === "m" ? "Boys" : "Girls"} ${e}`])).concat([["/convert.html", "High school to college conversions"], ["/guides.html", "Recruiting guides"], ["/for-parents.html", "For parents"], ["/for-coaches.html", "For coaches"]]))}
<h2>Standards by division</h2>${DIVS.map(d => `<h3><a href="${divPath(d)}">${esc(d)} track and field recruiting standards</a></h3>${L(["m", "w"].flatMap(g => ["100m", "400m", "800m", "1500m", "5000m", "Long Jump"].map(e => [evPath(d, g, e), `${d} ${gName(g)} ${e} standards`])))}`).join("")}
<h2>Schools with official published standards</h2>${L(S.filter(x => x.o).sort((a, b) => a.n.localeCompare(b.n)).map(x => [sl(x), x.n]))}
<h2>Conferences</h2>${L([...confs.keys()].sort().map(k => [confName.get(k), k === "NJCAA|NJCAA" ? "NJCAA junior colleges" : `${k.split("|")[1]} (${k.split("|")[0]})`]))}
<h2>Recruiting guides</h2>${L(TOPICS.map(([u, t]) => [u, t]))}
<h2>Junior colleges</h2>${L([[JG, "Junior college (NJCAA) track & field recruiting guide"], ["/?tab=results&div=NJCAA", "NJCAA national results list"]])}
<h2>College track and field by state</h2>${L([...byState.keys()].sort((a, b) => (STATE[a] || a).localeCompare(STATE[b] || b)).map(st => [statePath(st), STATE[st] || st]))}
${latestYear ? `<h2>National champions and top marks</h2>${L(champPages.filter(([u]) => u.includes(latestYear)).map(([u, t]) => [u, t + " champions"]).concat([["/explore.html#results", "Top marks by season, 2016 to today"], ["/explore.html", "Explore everything"]]))}` : ""}
</main>`;
      fs.writeFileSync(shellFile, shell.replace('<div id="root"></div>', `<div id="root">${home}</div>`));
    }
  } catch (e) { console.warn("home page content skipped:", e && e.message); }
  if (DAILY.finalize) console.log(`daily pages: ${DAILY.finalize()} inbound link blocks`);
  /* link check (2026-10-29 bug sweep: athlete pages and explore linked heptathlon/decathlon standards and some 10000m results pages
     that are never built): an internal link to a page that doesn't exist becomes plain text, so no page ships a dead link */
  { let fixed = 0; const has = u => fs.existsSync(path.join(out, u));
    for (const p of files) { const f = path.join(out, p), h = fs.readFileSync(f, "utf8");
      const n = h.replace(/<a href="(\/(?:standards|results|champions|colleges|colleges-for|states|conferences|how-fast|athletes|guides)\/[^"#?]+\.html)"[^>]*>([\s\S]*?)<\/a>/g, (m, u, inner) => has(u) ? m : (fixed++, inner));
      if (n !== h) fs.writeFileSync(f, n); }
    if (fixed) console.log(`link check: ${fixed} links to missing pages unlinked`); }
  /* sitemap index + one sitemap per section, each URL dated by the data it shows (so Google can trust lastmod) */
  const schoolUrls = [...new Set(S.map(sl))].sort();
  const AREL = new Map(AIDX.live.map(x => [x.url, x.release > DATES.max ? x.release : DATES.max]));   /* athlete pages: release day (data changes move it via DATES.max) */
  const base = u => EDITED[u] || DAILY.dates.get(u) || AREL.get(u) || (/^\/(results|champions)\//.test(u) ? resultsDate(u) : u === "/" || u.startsWith("/schools/") ? DATES.max : DATES.db);
  /* copy edits that change what a page says move its date too (2026-10-28: Ivy + D3 scholarship answer, feet on field-event pages) */
  const COPY = [[new Set(S.filter(s => !s.j && (s.c === "Ivy League" || s.d === "NCAA D3")).map(sl)), "2026-10-28"],
    [new Set(files.filter(u => /^\/standards\/.*(jump|vault|shot-put|discus|hammer|javelin)/.test(u))), "2026-10-28"],
    [new Set(files.filter(u => u.startsWith("/how-fast/") || /^\/standards\/(ncaa-d[123]|naia)-track-and-field-recruiting-standards\.html$/.test(u))), "2026-10-29"],
    [new Set([...files.filter(u => /^\/standards\/(ncaa-d[123]|naia|njcaa)-/.test(u) || u.startsWith("/convert/")), ...S.map(sl)]), "2026-10-30"]];   /* answer-first event pages, "Is X D1?" on school pages, conversion answers */   /* answer-first (how-fast + division hubs) */
  const lastmod = u => COPY.reduce((d, [set, day]) => set.has(u) && day > d ? day : d, base(u));
  /* each page's own dateModified follows the same copy-edit dates, so the page and the sitemap agree */
  for (const [set, day] of COPY) for (const u of set) { const f = path.join(out, u.endsWith(".html") ? u : u + ".html"); if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, "utf8"), n = h.replace(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g, (m, d) => d < day ? `"dateModified":"${day}"` : m); if (n !== h) fs.writeFileSync(f, n); }
  const groups = { schools: schoolUrls, results: files.filter(u => /^\/(results|champions)\//.test(u)).sort(),
    standards: ["/", ...files.filter(u => /^\/(standards|conferences|states)\//.test(u) || u === "/explore.html").sort()] };
  groups.colleges = files.filter(u => u === "/colleges.html" || u.startsWith("/colleges/")).sort();
  groups.athletes = files.filter(u => u === "/athletes.html" || u.startsWith("/athletes/")).sort();
  const used = new Set([...groups.schools, ...groups.results, ...groups.standards, ...groups.colleges, ...groups.athletes]);
  groups.guides = files.filter(u => !used.has(u)).sort();
  for (const k of Object.keys(groups)) groups[k] = [...new Set(groups[k])];   /* a page written twice (guides.html) is listed once */
  const urls = Object.values(groups).flat();
  for (const [k, list] of Object.entries(groups)) fs.writeFileSync(path.join(out, `sitemap-${k}.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod(u)}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.entries(groups).map(([k, list]) => `  <sitemap><loc>${SITE}/sitemap-${k}.xml</loc><lastmod>${list.map(lastmod).sort().pop()}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`);
  return { pages: files.length, urls: urls.length };
}

/* newest Monday results (data branch) copied over the repo's copy in dist/data before the pages are generated,
   so the weekly rebuild refreshes season bests, champions and top marks */
const LIVE_BASE = "https://raw.githubusercontent.com/PreferredRecruit/track-standards/data/";
async function freshData(out) {
  const r = await fetch(LIVE_BASE + "rank_index.json", { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error("index " + r.status);
  const live = await r.json(), f = path.join(out, "data/rank_index.json"), idx = JSON.parse(fs.readFileSync(f, "utf8"));
  let n = 0;
  for (const x of live) {
    /* retried: a dropped download used to skip that season and silently remove its results/champions pages (2026-10-17) */
    let d = null;
    for (let t = 0; t < 4 && !(d && d.ok); t++) { if (t) await new Promise(r => setTimeout(r, 1500 * t)); try { d = await fetch(LIVE_BASE + "rank/" + x.key + ".dat", { signal: AbortSignal.timeout(30000) }); } catch { d = null; } }
    if (!d || !d.ok) { console.warn(`Monday data: ${x.key} failed after 4 tries (its pages use the repo copy if there is one)`); if (!idx.some(y => y.key === x.key) && fs.existsSync(path.join(out, "data/rank", x.key + ".dat"))) idx.push(x); continue; }
    fs.writeFileSync(path.join(out, "data/rank", x.key + ".dat"), Buffer.from(await d.arrayBuffer())); n++;
    const i = idx.findIndex(y => y.key === x.key); if (i >= 0) idx[i] = x; else idx.push(x);
  }
  try { const u = await fetch(LIVE_BASE + "updated.json", { signal: AbortSignal.timeout(15000) }); if (u.ok) fs.writeFileSync(path.join(out, "data/updated.json"), await u.text()); } catch {}
  fs.writeFileSync(f, JSON.stringify(idx)); console.log(`Monday data: ${n} result files from the data branch`);
}

/* Vite plugin: generate after the app is built. A failure here never breaks the site build. */
export function seoPages() {
  let outDir = "dist", root = process.cwd();
  return {
    name: "pr-seo-pages", apply: "build",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); root = c.root; },
    async closeBundle() {
      try { await freshData(outDir); } catch (e) { console.warn("Monday data not fetched, using the copy in the repo:", e && e.message); }
      try { const r = generate(root, outDir); console.log(`SEO pages: ${r.pages} pages, sitemap ${r.urls} URLs`); }
      catch (e) { console.warn("SEO pages skipped:", e && e.message); }
    },
  };
}
