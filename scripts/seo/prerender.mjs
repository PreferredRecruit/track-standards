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

const SITE = "https://trackandfieldstandards.com";
const QUIZ = "https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards";
const EVENTS = ["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles",
  "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"];
const FIELD = new Set(["High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"]);
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA"];
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

function page({ title, desc, pathname, crumbs, h1, intro, body, ld }) {
  const url = SITE + pathname;
  const bc = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/icon-512.png">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(bc)}</script>${(ld || []).map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join("")}
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
.star{color:#7A45F0}</style></head><body>
<header><div><a class="logo" href="/"><img src="/icon-192.png" alt="">Preferred Recruit · Track Standards</a><nav><a href="/">Standards</a><a href="/explore.html">Explore</a><a class="cta" href="${QUIZ}">Free recruitment evaluation</a></nav></div></header>
<main><div class="bc">${crumbs.map(([n, u], i) => i < crumbs.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n)).join("")}</div>
<h1>${h1}</h1>${intro ? `<p class="intro">${intro}</p>` : ""}${body}
<div class="cta"><b>Looking to run in college?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div></main>
<footer><div><a href="/">Search standards</a><a href="/explore.html">All conferences, states and events</a><a href="/explore.html#champions">National champions</a><a href="/explore.html#results">Results</a><span>© ${new Date().getFullYear()} Preferred Recruit</span></div></footer></body></html>`;
}

export function generate(root, out) {
  const DB = JSON.parse(fs.readFileSync(path.join(root, "public/data/db.json"), "utf8"));
  const RIDX = JSON.parse(fs.readFileSync(path.join(root, "public/data/rank_index.json"), "utf8"));
  const S = DB.schools, CT = DB.ct;
  const std = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? (v[1] ? `${v[1]} (${v[0]})` : v[0]) : "")) : null; };
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
    const body = `<h2>${esc(c)} track &amp; field programs (${list.length})</h2><div class="scroll"><table><tr><th>School</th><th>State</th><th>Standards</th></tr>${list.map(s => `<tr><td><a href="${sl(s)}">${esc(s.n)}</a>${s.o ? ' <span class="star">★ official</span>' : ""}</td><td>${esc(STATE[s.s] || s.s || "")}</td><td>${s.o ? "Published by the school" : s.est ? "Estimate" : "Set from 2026 conference results"}</td></tr>`).join("")}</table></div>` +
      (Object.keys(line.m || {}).length ? ["m", "w"].map(g => `<h2>${esc(c)} ${gName(g).toLowerCase()} marks: what it took this season</h2><p>The 8th, 15th and 25th best marks in the ${esc(c)} in 2026, which set the Target, Recruit and Walk-On levels for conference schools without an official chart.</p><div class="scroll"><table><tr><th>Event</th><th class="n">8th (Target)</th><th class="n">15th (Recruit)</th><th class="n">25th (Walk-On)</th></tr>${evRows(g)}</table></div>`).join("") : "");
    write(confName.get(k), page({ title: `${c} Track & Field Recruiting Standards (${d}) | Preferred Recruit`, desc: `${c} track and field recruiting standards: Target, Recruit and Walk-On marks for all ${list.length} ${d} ${c} programs, plus what it took to score in the ${c} this season.`,
      pathname: confName.get(k), crumbs: [["Home", "/"], ["Explore", "/explore.html"], [d, "/explore.html#" + slug(d)], [c, confName.get(k)]], h1: `${esc(c)} Track &amp; Field Recruiting Standards`,
      intro: `Every ${esc(d)} ${esc(c)} track and field program, with links to each school's Target, Recruit and Walk-On standards for men and women.`, body,
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
    const body = DIVS.filter(d => list.some(s => s.d === d)).map(d => `<h2>${esc(d)} (${list.filter(s => s.d === d).length})</h2><div class="scroll"><table><tr><th>School</th><th>Conference</th></tr>${list.filter(s => s.d === d).sort((a, b) => a.n.localeCompare(b.n)).map(s => `<tr><td><a href="${sl(s)}">${esc(s.n)}</a>${s.o ? ' <span class="star">★ official</span>' : ""}</td><td><a href="${confName.get(s.d + "|" + s.c)}">${esc(s.c)}</a></td></tr>`).join("")}</table></div>`).join("");
    write(p, page({ title: `College Track & Field Programs in ${nm} (${list.length}) | Preferred Recruit`, desc: `All ${list.length} college track and field programs in ${nm}: NCAA D1, D2, D3, NAIA and NJCAA, with recruiting standards for every school.`,
      pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], [nm, p]], h1: `College Track &amp; Field Programs in ${esc(nm)}`, intro: `${list.length} college track and field programs in ${esc(nm)}. Open any school for its Target, Recruit and Walk-On standards.`, body }));
  }
  /* champions + results (from the packed TFRRS results) */
  const champPages = [], resultPages = [];
  for (const x of RIDX) {
    if (!DIVS.includes(x.div)) continue;
    let D; try { D = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, "public/data/rank", x.key + ".dat"))).toString()); } catch { continue; }
    const seasonName = x.season[0].toUpperCase() + x.season.slice(1);
    const champ = D.lists.find(l => l.champ), nat = D.lists.find(l => l.nat);
    if (champ) {
      const p = `/champions/${x.year}-${x.season}-${slug(x.div)}.html`; champPages.push([p, `${x.year} ${seasonName} ${x.div}`]);
      const rows = g => Object.entries(champ.g[g] || {}).filter(([, r]) => r.length).map(([e, r]) => `<tr><td>${esc(evLabel(e))}</td><td>${esc(r[0][1] || D.teams[r[0][3]])}</td><td>${esc(D.teams[r[0][3]])}</td><td class="n">${esc(r[0][4])}${r[0][5] ? ` <small>(${esc(r[0][5])})</small>` : ""}</td></tr>`).join("");
      write(p, page({ title: `${x.year} ${x.div} ${seasonName} Track & Field National Champions | Preferred Recruit`, desc: `Every ${x.year} ${x.div} ${x.season} track and field national champion, men and women, with winning marks from the national championship meet.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["National champions", "/explore.html#champions"], [`${x.year} ${seasonName} ${x.div}`, p]], h1: `${x.year} ${esc(x.div)} ${seasonName} National Champions`,
        intro: `Winners of every event at the ${x.year} ${esc(x.div)} ${x.season} track and field national championships. Source: TFRRS meet results.`,
        body: ["m", "w"].map(g => `<h2>${gName(g)} champions</h2><div class="scroll"><table><tr><th>Event</th><th>Champion</th><th>Team</th><th class="n">Mark</th></tr>${rows(g)}</table></div>`).join("") }));
    }
    if (nat) for (const g of ["m", "w"]) for (const [e, r] of Object.entries(nat.g[g] || {})) {
      if (!r.length) continue;
      const ev = evLabel(e), p = `/results/${x.year}-${x.season}-${slug(x.div)}-${g === "m" ? "mens" : "womens"}-${slug(ev)}.html`; resultPages.push([p, x, g, ev]);
      write(p, page({ title: `${x.year} ${x.div} ${gName(g)} ${ev} Top Marks (${seasonName}) | Preferred Recruit`, desc: `Top ${Math.min(50, r.length)} ${gName(g).toLowerCase()} ${ev} marks in ${x.div} for ${x.year} ${x.season}, led by ${r[0][1] || D.teams[r[0][3]]} (${D.teams[r[0][3]]}) at ${r[0][4]}.`,
        pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["Results", "/explore.html#results"], [`${x.year} ${seasonName} ${x.div}`, "/explore.html#r-" + x.key], [`${gName(g)} ${ev}`, p]],
        h1: `${x.year} ${esc(x.div)} ${gName(g)} ${esc(ev)}: Top Marks`, intro: `The best ${gName(g).toLowerCase()} ${esc(ev)} marks in ${esc(x.div)} during the ${x.year} ${x.season} season, from the TFRRS national list plus the national championship meet.`,
        body: `<div class="scroll"><table><tr><th>#</th><th>Athlete</th><th>Class</th><th>Team</th><th class="n">Mark</th><th>Meet</th></tr>${r.slice(0, 50).map((z, i) => `<tr><td>${i + 1}</td><td>${esc(z[1] || D.teams[z[3]])}</td><td>${esc(z[2] || "")}</td><td>${esc(D.teams[z[3]])}</td><td class="n">${esc(z[4])}${z[8] ? ` <small>(${esc(z[8])})</small>` : z[5] ? ` <small>(${esc(z[5])})</small>` : ""}</td><td>${esc(D.meets[z[6]] || "")} <small>${esc(z[7] || "")}</small></td></tr>`).join("")}</table></div>` }));
    }
  }
  /* hub */
  const groupLinks = (items) => `<div class="links">${items.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>`;
  const evLinks = DIVS.map(d => `<h2 id="${slug(d)}">${esc(d)}</h2><h3>Conferences</h3>${groupLinks([...confs.keys()].filter(k => k.startsWith(d + "|")).sort().map(k => [confName.get(k), k.split("|")[1]]))}<h3>Standards by event</h3>${groupLinks(["m", "w"].flatMap(g => evAvail(S.filter(s => s.d === d), g).map(e => [evPath(d, g, e), `${gName(g)} ${e}`])))}`).join("");
  const resultsByKey = new Map(); for (const [p, x, g, ev] of resultPages) { if (!resultsByKey.has(x.key)) resultsByKey.set(x.key, [x, []]); resultsByKey.get(x.key)[1].push([p, `${gName(g)} ${ev}`]); }
  const resultsHtml = [...resultsByKey.values()].sort((a, b) => b[0].year.localeCompare(a[0].year) || a[0].season.localeCompare(b[0].season) || DIVS.indexOf(a[0].div) - DIVS.indexOf(b[0].div))
    .map(([x, list]) => `<h3 id="r-${x.key}">${x.year} ${x.season} · ${esc(x.div)}</h3>${groupLinks(list)}`).join("");
  write("/explore.html", page({ title: "Explore College Track & Field: Conferences, States, Events, Champions | Preferred Recruit", desc: "Every college track and field conference, state, event standard, national champion and top-marks list: NCAA D1, D2, D3, NAIA and NJCAA, 2016 to today.",
    pathname: "/explore.html", crumbs: [["Home", "/"], ["Explore", "/explore.html"]], h1: "Explore College Track &amp; Field",
    intro: `${S.length.toLocaleString()} college programs, ${confs.size} conferences, every event's recruiting standards, national champions and top marks from 2016 to today.`,
    body: `<h2>States</h2>${groupLinks([...byState.keys()].sort((a, b) => (STATE[a] || a).localeCompare(STATE[b] || b)).map(st => [statePath(st), STATE[st] || st]))}${evLinks}<h2 id="champions">National champions</h2>${groupLinks(champPages.map(([u, t]) => [u, t]))}<h2 id="results">Top marks by season</h2>${resultsHtml}` }));
  /* sitemap: every school page + every page above */
  const today = new Date().toISOString().slice(0, 10);
  const urls = ["/", ...[...new Set(S.map(sl))].sort(), ...files.sort()];
  fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  return { pages: files.length, urls: urls.length };
}

/* Vite plugin: generate after the app is built. A failure here never breaks the site build. */
export function seoPages() {
  let outDir = "dist", root = process.cwd();
  return {
    name: "pr-seo-pages", apply: "build",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); root = c.root; },
    closeBundle() {
      try { const r = generate(root, outDir); console.log(`SEO pages: ${r.pages} pages, sitemap ${r.urls} URLs`); }
      catch (e) { console.warn("SEO pages skipped:", e && e.message); }
    },
  };
}
