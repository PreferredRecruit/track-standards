/* Daily pages (Ryan 2026-10-16: "i want to add 25 everyday, but i also cannot flood any page with a bunch of links so we need
   to do this strategically"). One page per state x gender x high school event: "College track in Texas for boys 400m runners",
   listing every program in that state with its real Target / Recruit / Walk-On for that event (high school units, converted
   like the rest of the site). Each page carries data no other page has, so this is not thin or duplicate content.

   Ryan 2026-10-18 ("its taking forever"): every scheduled page released on 2026-10-18; new combinations still append at 25/day.
   Release: scripts/seo/daily-schedule.json fixes every page's publish date (25 per day, highest search demand first). Dates
   never move once assigned; `node scripts/seo/daily.mjs --plan` only appends new combinations at the end. Each build publishes
   the pages due by today (UTC, or PUBLISH_DATE=YYYY-MM-DD), and the daily workflow rebuilds the site + pings IndexNow.

   Link budget (no link flooding):
     out of each daily page: at most 8 related links (state page, how-fast page, event hub, 3 sibling events in the same state,
       2 other states for the same event) plus the schools in its own table;
     into daily pages: only (a) its state page, one "By event" block that grows to at most 29 links, and (b) one hub per
       event (/colleges/<boys|girls>-<event>.html) listing the states. Each how-fast page gains ONE link (to its hub) and
       /explore.html gains ONE link (to /colleges.html). No homepage, footer, guide or sitewide link dumps.
   Quality floor: a page exists only when 5+ programs in that state list that event (raised from 3 on 2026-10-18 when every page
   was released at once: Ryan "only if it helps not hurts"; 3-4 program pages were the only thin ones). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONV, HS_EVENTS } from "./hs.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHED = path.join(HERE, "daily-schedule.json");
const PER_DAY = 25, LAUNCH = "2026-10-17", MIN_PROGRAMS = 5, MAX_RELATED = 8;
const WEIGHT = { "100m": 1, "200m": .8, "400m": .9, "800m": .85, "1600m": 1, "3200m": .8, "100m Hurdles": .6, '110m Hurdles (39")': .6, "300m Hurdles": .6,
  "High Jump": .55, "Pole Vault": .45, "Long Jump": .7, "Triple Jump": .5, "Shot Put": .6, "Discus": .5 };
const STATE = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington DC", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico", BC: "British Columbia" };
const FIELD = new Set(["High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"]);
const slug = s => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const HSG = g => (g === "m" ? "boys" : "girls");
const okEvent = (g, e) => !((g === "w" && e.startsWith("110m")) || (g === "m" && e === "100m Hurdles"));
const addDays = (d, k) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
export const dailyPath = (st, g, e) => `/colleges/${slug(STATE[st] || st)}/${HSG(g)}-${slug(e)}.html`;
export const hubPath = (g, e) => `/colleges/${HSG(g)}-${slug(e)}.html`;

function parseMark(str, e) {
  if (str == null) return null; const s = String(str).trim().toLowerCase().replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(/\s+/g, ""); if (!s) return null;
  if (FIELD.has(e)) { let m = s.match(/^(\d+(?:\.\d+)?)m$/); if (m) return +m[1]; m = s.match(/^(\d+)['\-](\d+(?:\.\d+)?)?(?:"|in)?$/); if (m) return ((+m[1]) * 12 + (+(m[2] || 0))) * 0.0254; m = s.match(/^(\d+(?:\.\d+)?)$/); if (m) { const v = +m[1]; return v < 30 ? v : null; } return null; }
  const t = s.replace(/[^0-9:.]/g, ""); if (!t || (t.match(/\./g) || []).length > 1) return null; const p = t.split(":").map(Number); if (p.some(isNaN)) return null;
  return p.length === 2 ? p[0] * 60 + p[1] : p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0];
}
/* every program in a state with its levels for one high school event, in high school units (same rules as the embed widget) */
function levelsFor(S, CT, st, g, e, parse) {
  const raw = (s, gg, ev) => { const o = (s.om || {})[gg] || {}; if (o[ev]) return o[ev]; if (s.em) return (s.em[gg] || {})[ev] || null; const c = ((CT[s.ck] || {})[gg] || {})[ev]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const c = CONV[e], out = [];
  for (const s of S) {
    if (s.s !== st || s.j) continue;
    let ev = e, t = raw(s, g, e);
    if (!t && c) { ev = [c.to, c.next && c.next.to].filter(Boolean).find(x => raw(s, g, x)); t = ev ? raw(s, g, ev) : null; }
    if (!t) continue;
    const back = x => ev === e ? x : c.add ? x - c.add : ev === c.to ? x / c.k[g] : x / c.next.k / c.k[g];
    const v = [0, 1, 2].map(j => { const x = parse(t[j], ev); return x == null ? null : back(x); });
    if (v.every(x => x == null)) continue;
    out.push({ s, v, conv: ev !== e ? ev : null });
  }
  return out;
}
function candidates(S, CT, parse) {
  const states = [...new Set(S.filter(s => s.s && !s.j).map(s => s.s))];
  const L = [];
  for (const st of states) for (const g of ["m", "w"]) for (const e of HS_EVENTS) {
    if (!okEvent(g, e)) continue;
    const n = levelsFor(S, CT, st, g, e, parse).length;
    if (n >= MIN_PROGRAMS) L.push({ id: `${st}|${g}|${e}`, score: n * (WEIGHT[e] || .4) });
  }
  return L.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));   /* highest demand first */
}
/* append-only planner: existing ids keep their dates; new ids go to the end, PER_DAY per day */
export function plan(S, CT, parse) {
  const old = fs.existsSync(SCHED) ? JSON.parse(fs.readFileSync(SCHED, "utf8")) : { launch: LAUNCH, perDay: PER_DAY, items: [] };
  const have = new Set(old.items.map(x => x.id)), add = candidates(S, CT, parse).filter(x => !have.has(x.id));
  let k = old.items.length;
  for (const x of add) { old.items.push({ id: x.id, date: addDays(old.launch, Math.floor(k / old.perDay)) }); k++; }
  fs.writeFileSync(SCHED, JSON.stringify(old, null, 1));
  return { total: old.items.length, added: add.length, last: old.items.length ? old.items[old.items.length - 1].date : null };
}

export function dailyPages({ out, S, CT, write, page, parse, esc, sl, SITE, gName, statePath }) {
  if (!fs.existsSync(SCHED)) return { pages: 0, dates: new Map() };
  const sched = JSON.parse(fs.readFileSync(SCHED, "utf8"));
  const today = process.env.PUBLISH_DATE || new Date().toISOString().slice(0, 10);
  const isF = e => FIELD.has(e);
  const ftin = x => { let i = Math.round((x / 0.0254) * 4) / 4, f = Math.floor(i / 12); i = i - f * 12; return `${f}'${String(i).replace(/\.0+$/, "")}"`; };
  const fmt = (e, x) => x == null ? "–" : isF(e) ? ftin(x) : x >= 60 ? `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}` : x.toFixed(2);
  const better = (e, a, b) => isF(e) ? a > b : a < b;   /* a is the harder bar */
  const median = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
  const HS = g => (g === "m" ? "Boys" : "Girls");
  const hsHow = (g, e) => `/how-fast/${g === "m" ? "mens" : "womens"}-${slug(e)}.html`;
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const live = sched.items.filter(x => x.date <= today).map(x => { const [st, g, e] = x.id.split("|"); return { ...x, st, g, e, rows: levelsFor(S, CT, st, g, e, parse) }; }).filter(x => x.rows.length >= MIN_PROGRAMS);
  const liveIds = new Set(live.map(x => x.id)), dates = new Map();
  const has = (st, g, e) => liveIds.has(`${st}|${g}|${e}`);
  const nState = st => S.filter(s => s.s === st && !s.j).length;
  const QA_CSS = `<style>.qa{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:14px 18px;margin:14px 0 6px}.qa b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}.qa p{margin:0}.upd{font-size:13px;color:var(--mute)}</style>`;

  for (const x of live) {
    const { st, g, e, rows, date } = x, nm = STATE[st] || st, p = dailyPath(st, g, e), conv = CONV[e];
    const ws = rows.map(r => r.v[2]).filter(v => v != null), W = median(ws), T = median(rows.map(r => r.v[0]));
    const easyV = ws.length ? (isF(e) ? Math.min(...ws) : Math.max(...ws)) : null, hardW = ws.length ? (isF(e) ? Math.max(...ws) : Math.min(...ws)) : null;
    const easy = rows.find(r => r.v[2] === easyV);
    const ts = rows.filter(r => r.v[0] != null), hard = ts.length ? ts.reduce((a, b) => better(e, b.v[0], a.v[0]) ? b : a) : null;
    const key = r => r.v[0] ?? r.v[1] ?? r.v[2];
    const sorted = [...rows].sort((a, b) => better(e, key(a), key(b)) ? -1 : better(e, key(b), key(a)) ? 1 : a.s.n.localeCompare(b.s.n));
    const who = `${HS(g).toLowerCase()} ${e}`;
    const evName = conv ? `${conv.to} (converted to the high school ${e})` : e;
    const answer = `${rows.length} college programs in ${nm} list ${gName(g).toLowerCase()} standards for the ${evName}. At the middle ${nm} program the Walk-On mark is ${fmt(e, W)}${T != null ? ` and the Target is ${fmt(e, T)}` : ""}.`
      + (easy ? ` The most reachable is ${easy.s.n} (Walk-On ${fmt(e, easy.v[2])})${hard && hard !== easy ? `, and the highest bar is ${hard.s.n} (Target ${fmt(e, hard.v[0])})` : ""}.` : "");
    const table = `<div class="scroll"><table><tr><th>School</th><th>Division</th><th class="n">Target</th><th class="n">Recruit</th><th class="n">Walk-On</th></tr>${sorted.map(r => `<tr><td><a href="${sl(r.s)}">${esc(r.s.t || r.s.n)}</a>${r.s.o ? ' <span class="star" title="Official published standards">★</span>' : ""}</td><td>${esc(r.s.d)}</td>${r.v.map((v, j) => `<td class="n">${(j === 1 && (r.s.d === "NCAA D3" || r.s.d === "NAIA")) ? "–" : esc(fmt(e, v))}</td>`).join("")}</tr>`).join("")}</table></div>`;
    const sib = ["100m", "200m", "400m", "800m", "1600m", "3200m", "Long Jump", "High Jump", "Shot Put", "300m Hurdles"].filter(z => z !== e && okEvent(g, z) && has(st, g, z)).slice(0, 3).map(z => [dailyPath(st, g, z), `${nm}: ${HS(g).toLowerCase()} ${z}`]);
    const near = [...new Set(live.filter(y => y.g === g && y.e === e && y.st !== st).map(y => y.st))].sort((a, b) => Math.abs(nState(a) - nState(st)) - Math.abs(nState(b) - nState(st))).slice(0, 2).map(z => [dailyPath(z, g, e), `${STATE[z] || z}: ${who}`]);
    const rel = [[statePath(st), `Every college program in ${nm}`], [hsHow(g, e), `${HS(g)} ${e}: how fast for college, nationally`], [hubPath(g, e), `${HS(g)} ${e} colleges by state`], ...sib, ...near].slice(0, MAX_RELATED);
    const faq = [[`How many colleges in ${nm} have ${gName(g).toLowerCase()} track and field for the ${e}?`, `${rows.length} programs in ${nm} list ${gName(g).toLowerCase()} standards for the ${conv ? conv.to : e} on this site, across ${[...new Set(rows.map(r => r.s.d))].join(", ")}.`],
      ...(W != null ? [[`What ${e} ${isF(e) ? "mark" : "time"} do I need to walk on at a college in ${nm}?`, `About ${fmt(e, W)} at the middle program, and between ${fmt(e, hardW)} and ${fmt(e, easyV)} depending on the school.`]] : []),
      ...(easy ? [[`Which college in ${nm} is the most reachable for a ${who} athlete?`, `${easy.s.n} (${easy.s.d}) has the most reachable Walk-On mark, ${fmt(e, easy.v[2])}.`]] : [])];
    const body = QA_CSS + `<div class="qa"><b>Quick answer</b><p>${esc(answer)}</p></div><p class="upd">Published ${date} · Preferred Recruit · ★ = the school's own published standards</p>`
      + `<h2>Every ${esc(nm)} program for the ${esc(who)}</h2>${table}`
      + (conv ? `<p class="upd">High school ${esc(e)} converted from the college ${esc(conv.to)}: ${esc(conv.how)}. See <a href="/convert.html">conversions</a>.</p>` : "")
      + `<p>Target: the strongest scholarship interest, depending on school funding. Recruit: where coaches start conversations (NCAA D3 and NAIA use Target and Walk-On). Walk-On: the minimum to make the roster. None of these is a guarantee.</p>`
      + `<h2>Common questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`
      + `<h2>Related</h2><div class="links">${rel.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>`;
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: `College track and field in ${nm} for ${who} athletes`, description: answer, author: ORG, publisher: ORG, datePublished: date, dateModified: date, mainEntityOfPage: SITE + p },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@context": "https://schema.org", "@type": "ItemList", name: `${nm} college track programs for the ${who}`, itemListElement: sorted.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.s.n, url: SITE + sl(r.s) })) }];
    write(p, page({ title: `${nm} College Track for ${HS(g)} ${e}: Every Program's Standards`, desc: answer,
      pathname: p, crumbs: [["Home", "/"], ["Colleges by state", "/colleges.html"], [`${HS(g)} ${e}`, hubPath(g, e)], [nm, p]],
      h1: `College track and field in ${esc(nm)} for ${esc(who)} athletes`, body, ld }));
    dates.set(p, date);
  }

  /* hubs: one per event (states as rows), plus the /colleges.html index; dated by their newest page */
  const hubs = new Map(); for (const x of live) { const k = `${x.g}|${x.e}`; if (!hubs.has(k)) hubs.set(k, []); hubs.get(k).push(x); }
  const newest = L => L.map(x => x.date).sort().pop();
  for (const [k, L] of hubs) {
    const [g, e] = k.split("|"), p = hubPath(g, e);
    L.sort((a, b) => (STATE[a.st] || a.st).localeCompare(STATE[b.st] || b.st));
    write(p, page({ title: `${HS(g)} ${e}: College Track Programs by State`, desc: `College track and field programs for ${HS(g).toLowerCase()} ${e} athletes, state by state: every program's Target, Recruit and Walk-On marks in high school units.`,
      pathname: p, crumbs: [["Home", "/"], ["Colleges by state", "/colleges.html"], [`${HS(g)} ${e}`, p]], h1: `${esc(HS(g))} ${esc(e)}: college programs by state`,
      intro: `Pick a state to see every college program there and the ${isF(e) ? "marks" : "times"} it takes to walk on, get recruited or be a target recruit. New states are added daily.`,
      body: `<div class="scroll"><table><tr><th>State</th><th class="n">Programs</th></tr>${L.map(x => `<tr><td><a href="${dailyPath(x.st, g, e)}">${esc(STATE[x.st] || x.st)}</a></td><td class="n">${x.rows.length}</td></tr>`).join("")}</table></div><p><a href="${hsHow(g, e)}">${esc(HS(g))} ${esc(e)} nationally: how fast do you need to run in college? ›</a></p>` }));
    dates.set(p, newest(L));
  }
  if (hubs.size) {
    write("/colleges.html", page({ title: "College Track and Field Programs by State and Event", desc: "Every state's college track and field programs for each high school event, with Target, Recruit and Walk-On marks in high school units. New pages daily.",
      pathname: "/colleges.html", crumbs: [["Home", "/"], ["Colleges by state", "/colleges.html"]], h1: "College track programs by state and event",
      intro: "Choose an event, then a state. Every page lists the programs in that state and what it takes to compete there.",
      body: ["m", "w"].map(g => `<h2>${HS(g)}</h2><div class="links">${[...hubs.keys()].filter(k => k.startsWith(g + "|")).map(k => k.split("|")[1]).sort((a, b) => HS_EVENTS.indexOf(a) - HS_EVENTS.indexOf(b)).map(e => `<a href="${hubPath(g, e)}">${esc(HS(g))} ${esc(e)}</a>`).join("")}</div>`).join("") }));
    dates.set("/colleges.html", newest(live));
  }

  /* inbound links, within budget: patch already-written pages just before their CTA block (once per page) */
  const patch = (rel, html) => { const f = path.join(out, rel); if (!fs.existsSync(f)) return false; const t = fs.readFileSync(f, "utf8"); if (t.includes('data-daily="1"')) return false; const i = t.indexOf('<div class="cta">'); if (i < 0) return false; fs.writeFileSync(f, t.slice(0, i) + html + t.slice(i)); return true; };
  /* run last in the build (after every page above is written), so later writers can't overwrite the inserted links */
  const finalize = () => {
  const byState = new Map(); for (const x of live) { if (!byState.has(x.st)) byState.set(x.st, []); byState.get(x.st).push(x); }
    let patched = 0;
  for (const [st, L] of byState) {
    L.sort((a, b) => a.g.localeCompare(b.g) || HS_EVENTS.indexOf(a.e) - HS_EVENTS.indexOf(b.e));
    patched += patch(statePath(st), `<h2 data-daily="1">${esc(STATE[st] || st)} colleges by event</h2><div class="links">${L.map(x => `<a href="${dailyPath(st, x.g, x.e)}">${HS(x.g)} ${esc(x.e)}</a>`).join("")}</div>`);
  }
  for (const k of hubs.keys()) { const [g, e] = k.split("|"); patched += patch(hsHow(g, e), `<p data-daily="1"><a href="${hubPath(g, e)}">${esc(HS(g))} ${esc(e)} colleges, state by state ›</a></p>`); }
  if (hubs.size) patched += patch("/explore.html", `<p data-daily="1"><a href="/colleges.html">College track programs by state and event ›</a></p>`);
    return patched;
  };
  return { pages: live.length, hubs: hubs.size, finalize, dates, today };
}

/* CLI: node scripts/seo/daily.mjs --plan   (extend the schedule; never moves existing dates) */
if (process.argv[1] && process.argv[1].endsWith("daily.mjs") && process.argv.includes("--plan")) {
  const DB = JSON.parse(fs.readFileSync(path.join(HERE, "../../public/data/db.json"), "utf8"));
  const r = plan(DB.schools, DB.ct, parseMark);
  console.log(`schedule: ${r.total} pages (${r.added} added), last release ${r.last}, ${PER_DAY}/day from ${LAUNCH}`);
}
