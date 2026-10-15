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
import { schoolPages } from "./schools.mjs";
const SITE = "https://trackandfieldstandards.com";
const QUIZ = "https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards";
const EVENTS = ["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles",
  "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"];
const FIELD = new Set(["High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"]);
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
const RDIVS = [...DIVS, "NJCAA"];   /* results and champions pages: junior colleges included (results only, no levels) */
const STATE = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington DC", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", BC: "British Columbia" };

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = s => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const schoolSlug = s => (s.os && s.os[0]) || (String(s.n).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() + "-track-standards");
const gName = g => (g === "m" ? "Men's" : "Women's");
const evLabel = e => e.replace(/^(\d[\d,]*) Meters$/, "$1m").replace(/^(\d+) Hurdles$/, "$1m Hurdles").replace(/^(\d+) Steeplechase$/, "$1m Steeplechase").replace(/^4 x (\d+) Relay$/, "4x$1 Relay");
const secs = m => { const t = String(m || "").replace(/[^0-9:.]/g, ""); if (!t || (t.match(/\./g) || []).length > 1) return null; const p = t.split(":").map(Number); if (p.some(isNaN)) return null; return p.length === 2 ? p[0] * 60 + p[1] : p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0]; };
function parse(str, e) {
  if (str == null) return null; const s = String(str).trim().toLowerCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(/\s+/g, ""); if (!s) return null;
  if (FIELD.has(e)) { let m = s.match(/^(\d+(?:\.\d+)?)m$/); if (m) return +m[1]; m = s.match(/^(\d+)['\-](\d+(?:\.\d+)?)?(?:"|in)?$/); if (m) return ((+m[1]) * 12 + (+(m[2] || 0))) * 0.0254; m = s.match(/^(\d+(?:\.\d+)?)$/); if (m) { const v = +m[1]; return v < 30 ? v : null; } return null; }
  return secs(s);
}

const DATES = { db: "", data: "", max: "" };
/* past seasons never change: they keep the date the archive was built; only the current season moves with the Monday data */
const ARCHIVE_DATE = "2026-10-13";
const resultsDate = u => { const y = (u.match(/\/(\d{4})-/) || [])[1]; return y && DATES.data && y < DATES.data.slice(0, 4) ? ARCHIVE_DATE : DATES.data; };
function page({ title, desc, pathname, crumbs, h1, intro, body, ld }) {
  const url = SITE + pathname;
  const bc = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${SITE}/og.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/favicon-32.png" sizes="32x32"><script defer src="/_vercel/insights/script.js"></script><script defer src="/_vercel/speed-insights/script.js"></script><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(bc)}</script><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, url, dateModified: /^\/(results|champions)\//.test(pathname) ? resultsDate(pathname) : DATES.db })}</script>${(ld || []).map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join("")}
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
.star{color:#7A45F0}footer .soc{display:block;margin-top:8px;font-size:10px;color:#9A9AA3}footer .soc a{color:inherit;margin:0;text-decoration:none}header nav a.cta{white-space:nowrap}@media(max-width:560px){header nav a:not(.cta){display:none}header nav a.cta{margin-left:0}}</style></head><body>
<header><div><a class="logo" href="/"><img src="/icon-192.png" alt="">Preferred Recruit · Track Standards</a><nav><a href="/">Standards</a><a href="/explore.html">Explore</a><a class="cta" href="${QUIZ}">Free recruitment evaluation</a></nav></div></header>
<main><div class="bc">${crumbs.map(([n, u], i) => i < crumbs.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n)).join("")}</div>
<h1>${h1}</h1>${intro ? `<p class="intro">${intro}</p>` : ""}${body}
<div class="cta"><b>Looking to run in college?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div></main>
<footer><div><a href="/">Search standards</a><a href="/explore.html">All conferences, states and events</a><a href="/explore.html#champions">National champions</a><a href="/explore.html#results">Results</a><a href="/how-fast.html">How fast for college?</a><a href="/convert.html">Conversions</a><a href="/for-parents.html">For parents</a><a href="/for-coaches.html">For coaches</a><span>Standards updated ${DATES.db} · Results updated ${DATES.data}</span><span>© ${new Date().getFullYear()} Preferred Recruit</span><span class="soc"><a href="https://www.youtube.com/@thepreferredrecruit" rel="noopener">YouTube</a> · <a href="https://www.instagram.com/preferredrecruit/" rel="noopener">Instagram</a> · <a href="https://www.tiktok.com/@preferredrecruit" rel="noopener">TikTok</a></span></div></footer></body></html>`;
}

export function generate(root, out) {
  const DB = JSON.parse(fs.readFileSync(path.join(root, "public/data/db.json"), "utf8"));
  const RIDX = JSON.parse(fs.readFileSync(path.join(out, "data/rank_index.json"), "utf8"));   /* dist copy: includes the newest Monday data (seoPages) */
  const S = DB.schools, CT = DB.ct;
  const NS = S.filter(x => !x.j).length, NJ = S.filter(x => x.j).length;   /* schools with levels / junior colleges (results only) */
  const JG = "/guides/junior-college-track-and-field-recruiting.html";
  for (const name of ["index.html", "llms.txt"]) { const f = path.join(out, name); if (fs.existsSync(f)) fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/\{\{SCHOOLS\}\}/g, NS.toLocaleString())); }
  /* real dates (Ryan 2026-10-14 "just for seo"): standards = when db.json was built, results = the Monday data refresh */
  DATES.db = DB.built || new Date().toISOString().slice(0, 10);
  try { DATES.data = JSON.parse(fs.readFileSync(path.join(out, "data/updated.json"), "utf8")).updated.slice(0, 10); } catch { DATES.data = DATES.db; }
  DATES.max = DATES.data > DATES.db ? DATES.data : DATES.db;
  const std = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? (v[1] ? `${v[1]} (${v[0]})` : v[0]) + (v[2] ? " est." : "") : "")) : null; };
  const raw = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const sl = (s) => `/schools/${schoolSlug(s)}`;
  const files = []; const write = (p, html) => { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); files.push(p); };
  const confs = new Map(); for (const s of S) { const k = s.d + "|" + s.c; if (!confs.has(k)) confs.set(k, []); confs.get(k).push(s); }
  const confName = new Map(); for (const k of confs.keys()) { const [d, c] = k.split("|"); const dup = [...confs.keys()].filter(x => x.split("|")[1] === c).length > 1; confName.set(k, `/conferences/${slug(c)}${dup ? "-" + slug(d) : ""}-track-standards.html`); }
  const evPath = (d, g, e) => `/standards/${slug(d)}-${g === "m" ? "mens" : "womens"}-${slug(e)}.html`;
  const statePath = st => `/states/${slug(STATE[st] || st)}-college-track-and-field.html`;
  const evAvail = (list, g) => EVENTS.filter(e => list.some(s => raw(s, g, e)));

  /* conferences */
  for (const [k, list] of confs) {
    const [d, c] = k.split("|"); list.sort((a, b) => a.n.localeCompare(b.n));
    const line = (CT[(list[0] || {}).ck] || {});
    const evRows = g => EVENTS.filter(e => (line[g] || {})[e]).map(e => `<tr><td><a href="${evPath(d, g, e)}">${esc(e)}</a></td>${[0, 1, 2].map(j => `<td class="n">${esc(((line[g][e] || [])[j] || [])[0] || "–")}</td>`).join("")}</tr>`).join("");
    const body = `<h2>${esc(c)} track &amp; field programs (${list.length})</h2><div class="scroll"><table><tr><th>School</th><th>State</th><th>${d === "NJCAA" ? "On this site" : "Standards"}</th></tr>${list.map(s => `<tr><td><a href="${sl(s)}">${esc(s.n)}</a>${s.o ? ' <span class="star">★ official</span>' : ""}</td><td>${esc(STATE[s.s] || s.s || "")}</td><td>${s.j ? "Season results" : s.o ? "Published by the school" : s.est ? "Estimate" : "Set from 2026 conference results"}</td></tr>`).join("")}</table></div>` +
      (Object.keys(line.m || {}).length ? ["m", "w"].map(g => `<h2>${esc(c)} ${gName(g).toLowerCase()} marks: what it took this season</h2><p>The 8th, 15th and 25th best marks in the ${esc(c)} in 2026, which set the Target, Recruit and Walk-On levels for conference schools without an official chart.</p><div class="scroll"><table><tr><th>Event</th><th class="n">8th (Target)</th><th class="n">15th (Recruit)</th><th class="n">25th (Walk-On)</th></tr>${evRows(g)}</table></div>`).join("") : "");
    const juco = d === "NJCAA";
    write(confName.get(k), page({ title: juco ? `NJCAA Junior College Track & Field Programs (${list.length}) | Preferred Recruit` : `${c} Track & Field Recruiting Standards (${d}) | Preferred Recruit`,
      desc: juco ? `All ${list.length} NJCAA junior college track and field programs on TFRRS, with each program's season results, roster and site links. Junior colleges compete nationally, so this site shows results rather than predicted recruiting levels.` : `${c} track and field recruiting standards: Target, Recruit and Walk-On marks for all ${list.length} ${d} ${c} programs, plus what it took to score in the ${c} this season.`,
      pathname: confName.get(k), crumbs: [["Home", "/"], ["Explore", "/explore.html"], juco ? ["Junior colleges", JG] : [d, "/explore.html#" + slug(d)], [c, confName.get(k)]], h1: juco ? "NJCAA Junior College Track &amp; Field Programs" : `${esc(c)} Track &amp; Field Recruiting Standards`,
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
      const mid = j => { const v = vals(j); if (v.length < 4) return "–"; const f = x => FIELD.has(e) ? x.toFixed(2) + "m" : (x >= 60 ? Math.floor(x / 60) + ":" + (x % 60).toFixed(2).padStart(5, "0") : x.toFixed(2)); return `${f(v[Math.floor(v.length * .25)])} to ${f(v[Math.floor(v.length * .75)])}`; };
      const p = evPath(d, g, e), name = `${d} ${gName(g)} ${e}`;
      const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
        { "@type": "Question", name: `What does it take to walk on in ${name}?`, acceptedAnswer: { "@type": "Answer", text: `Across ${rows.length} ${d} programs, the middle half of ${gName(g).toLowerCase()} ${e} Walk-On standards run ${mid(2)}.` } },
        { "@type": "Question", name: `What ${e} time gets recruited in ${d}?`, acceptedAnswer: { "@type": "Answer", text: `The middle half of ${d} ${gName(g).toLowerCase()} ${e} Recruit standards run ${mid(1)}, and Target standards run ${mid(0)}. Recruiting standards are not a guarantee of an offer.` } }] };
      write(p, page({ title: `${name} Recruiting Standards: Every School | Preferred Recruit`, desc: `${name} recruiting standards for ${rows.length} programs: Target, Recruit and Walk-On marks, most reachable first. Middle half of Walk-On marks: ${mid(2)}.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], [d, "/explore.html#" + slug(d)], [`${gName(g)} ${e}`, p]], h1: `${esc(name)} Recruiting Standards`,
        intro: `Target, Recruit and Walk-On marks for every ${esc(d)} program in the ${gName(g).toLowerCase()} ${esc(e)}, most reachable Walk-On first. The middle half of programs: Target ${esc(mid(0))}, Recruit ${esc(mid(1))}, Walk-On ${esc(mid(2))}. ★ = the school's own published standards.`,
        body: `<div class="scroll"><table><tr><th>School</th><th>Conference</th><th class="n">Target</th><th class="n">Recruit</th><th class="n">Walk-On</th></tr>${rows.map(x => `<tr><td><a href="${sl(x.s)}">${esc(x.s.n)}</a>${x.s.o ? ' <span class="star">★</span>' : ""}</td><td><a href="${confName.get(x.s.d + "|" + x.s.c)}">${esc(x.s.c)}</a></td>${[0, 1, 2].map(j => `<td class="n">${esc(x.t[j] || "–")}</td>`).join("")}</tr>`).join("")}</table></div>`,
        ld: [faq] }));
    }
  }
  /* states */
  const byState = new Map(); for (const s of S) if (s.s) { if (!byState.has(s.s)) byState.set(s.s, []); byState.get(s.s).push(s); }
  for (const [st, list] of byState) {
    const nm = STATE[st] || st, p = statePath(st);
    const body = [...DIVS, "NJCAA"].filter(d => list.some(s => s.d === d)).map(d => `<h2>${esc(d)}${d === "NJCAA" ? " junior colleges" : ""} (${list.filter(s => s.d === d).length})</h2><div class="scroll"><table><tr><th>School</th><th>Conference</th></tr>${list.filter(s => s.d === d).sort((a, b) => a.n.localeCompare(b.n)).map(s => `<tr><td><a href="${sl(s)}">${esc(s.n)}</a>${s.o ? ' <span class="star">★ official</span>' : ""}</td><td><a href="${confName.get(s.d + "|" + s.c)}">${esc(s.c)}</a></td></tr>`).join("")}</table></div>`).join("");
    write(p, page({ title: `College Track & Field Programs in ${nm} (${list.length}) | Preferred Recruit`, desc: `All ${list.length} college track and field programs in ${nm}: NCAA D1, D2, D3 and NAIA with recruiting standards${list.some(s => s.j) ? `, plus ${list.filter(s => s.j).length} NJCAA junior colleges with season results` : ""}.`,
      pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], [nm, p]], h1: `College Track &amp; Field Programs in ${esc(nm)}`, intro: `${list.length} college track and field programs in ${esc(nm)}. Open any NCAA or NAIA school for its Target, Recruit and Walk-On standards${list.some(s => s.j) ? "; junior colleges show season results instead of levels" : ""}.`, body }));
  }
  /* champions + results (from the packed TFRRS results) */
  const champPages = [], resultPages = [];
  for (const x of RIDX) {
    if (!RDIVS.includes(x.div)) continue;
    let D; try { D = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data/rank", x.key + ".dat"))).toString()); } catch { continue; }
    const XC = x.season === "xc", seasonName = XC ? "Cross Country" : x.season[0].toUpperCase() + x.season.slice(1);
    const nat = D.lists.find(l => l.nat), champ = XC ? nat : D.lists.find(l => l.champ);   /* XC: the national meet is both */
    if (champ) {
      const p = `/champions/${x.year}-${x.season}-${slug(x.div)}.html`; champPages.push([p, `${x.year} ${seasonName} ${x.div}`]);
      const rows = g => Object.entries(champ.g[g] || {}).filter(([, r]) => r.length).map(([e, r]) => `<tr><td>${esc(evLabel(e))}</td><td>${esc(r[0][1] || D.teams[r[0][3]])}</td><td>${esc(D.teams[r[0][3]])}</td><td class="n">${esc(r[0][4])}${r[0][5] ? ` <small>(${esc(r[0][5])})</small>` : ""}</td></tr>`).join("");
      write(p, page({ title: XC ? `${x.year} ${x.div} Cross Country National Champions (Individual & Team) | Preferred Recruit` : `${x.year} ${x.div} ${seasonName} Track & Field National Champions | Preferred Recruit`, desc: XC ? `${x.year} ${x.div} cross country national champions, men and women: individual winners and winning teams from the national championship race.` : `Every ${x.year} ${x.div} ${x.season} track and field national champion, men and women, with winning marks from the national championship meet.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["National champions", "/explore.html#champions"], [`${x.year} ${seasonName} ${x.div}`, p]], h1: `${x.year} ${esc(x.div)} ${seasonName} National Champions`,
        intro: XC ? `Individual and team winners at the ${x.year} ${esc(x.div)} cross country national championships. Source: TFRRS meet results.` : `Winners of every event at the ${x.year} ${esc(x.div)} ${x.season} track and field national championships. Source: TFRRS meet results.`,
        body: ["m", "w"].map(g => `<h2>${gName(g)} champions</h2><div class="scroll"><table><tr><th>Event</th><th>Champion</th><th>Team</th><th class="n">Mark</th></tr>${rows(g)}</table></div>`).join("") }));
    }
    if (nat) for (const g of ["m", "w"]) for (const [e, r] of Object.entries(nat.g[g] || {})) {
      if (!r.length) continue;
      const ev = evLabel(e), p = `/results/${x.year}-${x.season}-${slug(x.div)}-${g === "m" ? "mens" : "womens"}-${slug(ev)}.html`; resultPages.push([p, x, g, ev]);
      write(p, page({ title: XC ? `${x.year} ${x.div} ${gName(g)} ${ev} Cross Country Championship Results | Preferred Recruit` : `${x.year} ${x.div} ${gName(g)} ${ev} Top Marks (${seasonName}) | Preferred Recruit`, desc: `Top ${Math.min(50, r.length)} ${gName(g).toLowerCase()} ${ev} marks in ${x.div} for ${x.year} ${x.season}, led by ${r[0][1] || D.teams[r[0][3]]} (${D.teams[r[0][3]]}) at ${r[0][4]}.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["Results", "/explore.html#results"], [`${x.year} ${seasonName} ${x.div}`, "/explore.html#r-" + x.key], [`${gName(g)} ${ev}`, p]],
        h1: XC ? `${x.year} ${esc(x.div)} ${gName(g)} ${esc(ev)} Cross Country Championship` : `${x.year} ${esc(x.div)} ${gName(g)} ${esc(ev)}: Top Marks`, intro: XC ? `${/Team/.test(ev) ? "Team standings" : "Individual results"} from the ${x.year} ${esc(x.div)} ${gName(g).toLowerCase()} cross country national championship (${esc(ev.replace(" Team", ""))}). Source: TFRRS.` : `The best ${gName(g).toLowerCase()} ${esc(ev)} marks in ${esc(x.div)} during the ${x.year} ${x.season} season, from the TFRRS national list plus the national championship meet.`,
        body: `<div class="scroll"><table><tr><th>#</th><th>Athlete</th><th>Class</th><th>Team</th><th class="n">Mark</th><th>Meet</th></tr>${r.slice(0, 50).map((z, i) => `<tr><td>${i + 1}</td><td>${esc(z[1] || D.teams[z[3]])}</td><td>${esc(z[2] || "")}</td><td>${esc(D.teams[z[3]])}</td><td class="n">${esc(z[4])}${z[8] ? ` <small>(${esc(z[8])})</small>` : z[5] ? ` <small>(${esc(z[5])})</small>` : ""}</td><td>${esc(D.meets[z[6]] || "")} <small>${esc(z[7] || "")}</small></td></tr>`).join("")}</table></div>` }));
    }
  }
  /* high school athletes, parents and coaches */
  const writeRaw = (p, txt) => { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };
  hsPages({ S: S.filter(x => !x.j), CT, write, writeRaw, page, parse, esc, slug, schoolUrl: sl, evPath, FIELD, SITE, gName });
  /* pre-built HTML for every school page (served at /schools/<slug> by vercel.json); already in the sitemap */
  try { schoolPages({ root, out, S, DATES, SITE, QUIZ, esc, schoolSlug, std, EVENTS, STATE, evLabel, confUrl: s => confName.get(s.d + "|" + s.c), statePath, evPath, gName }); }
  catch (e) { console.warn("school pages skipped:", e && e.message); }
  const groupLinks = (items) => `<div class="links">${items.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>`;
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
    write(JG, page({ title: "Junior College (NJCAA) Track & Field Recruiting: Programs, Results & How It Works | Preferred Recruit",
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
  const evLinks = DIVS.map(d => `<h2 id="${slug(d)}">${esc(d)}</h2><h3>Conferences</h3>${groupLinks([...confs.keys()].filter(k => k.startsWith(d + "|")).sort().map(k => [confName.get(k), k.split("|")[1]]))}<h3>Standards by event</h3>${groupLinks(["m", "w"].flatMap(g => evAvail(S.filter(s => s.d === d), g).map(e => [evPath(d, g, e), `${gName(g)} ${e}`])))}`).join("");
  const resultsByKey = new Map(); for (const [p, x, g, ev] of resultPages) { if (!resultsByKey.has(x.key)) resultsByKey.set(x.key, [x, []]); resultsByKey.get(x.key)[1].push([p, `${gName(g)} ${ev}`]); }
  const resultsHtml = [...resultsByKey.values()].sort((a, b) => b[0].year.localeCompare(a[0].year) || a[0].season.localeCompare(b[0].season) || RDIVS.indexOf(a[0].div) - RDIVS.indexOf(b[0].div))
    .map(([x, list]) => `<h3 id="r-${x.key}">${x.year} ${x.season} · ${esc(x.div)}</h3>${groupLinks(list)}`).join("");
  write("/explore.html", page({ title: "Explore College Track & Field: Conferences, States, Events, Champions | Preferred Recruit", desc: "Every college track and field conference, state, event standard, national champion and top-marks list: NCAA D1, D2, D3 and NAIA, 2016 to today.",
    pathname: "/explore.html", crumbs: [["Home", "/"], ["Explore", "/explore.html"]], h1: "Explore College Track &amp; Field",
    intro: `${NS.toLocaleString()} college programs with recruiting standards, ${NJ} junior colleges with results, ${confs.size} conferences, every event's recruiting standards, national champions and top marks from 2016 to today.`,
    body: `<h2 id="high-school">High school athletes, parents and coaches</h2>${groupLinks([["/how-fast.html", "How fast do you need to run in college? (every event)"], ["/convert.html", "High school to college conversions"], ["/guides.html", "Recruiting guides"], ["/for-parents.html", "For parents"], ["/for-coaches.html", "Free widget for coaches"]])}<h2 id="njcaa">Junior colleges (NJCAA)</h2>${groupLinks([[JG, "Junior college track & field recruiting guide"], [confName.get("NJCAA|NJCAA") || JG, `All ${NJ} NJCAA programs`], ["/?tab=results&div=NJCAA", "NJCAA national results list"]])}<h2>States</h2>${groupLinks([...byState.keys()].sort((a, b) => (STATE[a] || a).localeCompare(STATE[b] || b)).map(st => [statePath(st), STATE[st] || st]))}${evLinks}<h2 id="champions">National champions</h2>${groupLinks(champPages.map(([u, t]) => [u, t]))}<h2 id="results">Top marks by season</h2>${resultsHtml}` }));
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
<h2>Standards by division</h2>${DIVS.map(d => `<h3>${esc(d)}</h3>${L(["m", "w"].flatMap(g => ["100m", "400m", "800m", "1500m", "5000m", "Long Jump"].map(e => [evPath(d, g, e), `${d} ${gName(g)} ${e} standards`])))}`).join("")}
<h2>Schools with official published standards</h2>${L(S.filter(x => x.o).sort((a, b) => a.n.localeCompare(b.n)).map(x => [sl(x), x.n]))}
<h2>Conferences</h2>${L([...confs.keys()].sort().map(k => [confName.get(k), k === "NJCAA|NJCAA" ? "NJCAA junior colleges" : `${k.split("|")[1]} (${k.split("|")[0]})`]))}
<h2>Junior colleges</h2>${L([[JG, "Junior college (NJCAA) track & field recruiting guide"], ["/?tab=results&div=NJCAA", "NJCAA national results list"]])}
<h2>College track and field by state</h2>${L([...byState.keys()].sort((a, b) => (STATE[a] || a).localeCompare(STATE[b] || b)).map(st => [statePath(st), STATE[st] || st]))}
${latestYear ? `<h2>National champions and top marks</h2>${L(champPages.filter(([u]) => u.includes(latestYear)).map(([u, t]) => [u, t + " champions"]).concat([["/explore.html#results", "Top marks by season, 2016 to today"], ["/explore.html", "Explore everything"]]))}` : ""}
</main>`;
      fs.writeFileSync(shellFile, shell.replace('<div id="root"></div>', `<div id="root">${home}</div>`));
    }
  } catch (e) { console.warn("home page content skipped:", e && e.message); }
  /* sitemap index + one sitemap per section, each URL dated by the data it shows (so Google can trust lastmod) */
  const schoolUrls = [...new Set(S.map(sl))].sort();
  const lastmod = u => /^\/(results|champions)\//.test(u) ? resultsDate(u) : u === "/" || u.startsWith("/schools/") ? DATES.max : DATES.db;
  const groups = { schools: schoolUrls, results: files.filter(u => /^\/(results|champions)\//.test(u)).sort(),
    standards: ["/", ...files.filter(u => /^\/(standards|conferences|states)\//.test(u) || u === "/explore.html").sort()] };
  const used = new Set([...groups.schools, ...groups.results, ...groups.standards]);
  groups.guides = files.filter(u => !used.has(u)).sort();
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
    const d = await fetch(LIVE_BASE + "rank/" + x.key + ".dat", { signal: AbortSignal.timeout(30000) }); if (!d.ok) continue;
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
