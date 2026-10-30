/* National depth rankings (Ryan 2026-10-30: "what if we added rankings on to the website", "weekly, monthly, yearly rankings, cuz
   schools love flexing that"). One method everywhere (rankings pages, conference tables, school pages, the best-colleges guide,
   outreach): each individual event on a division's national outdoor/indoor qualifying list counts its top 50 men and top 50 women; a
   program scores one entry per spot (an athlete in two events counts twice); relays are left out. Competition ranks (ties share one).
   Season data: dist/data/rank/<year>-<season>-<div>.dat (repo copy + the newest Monday data). Weekly/monthly movement: snapshots the
   Monday refresh appends to depth_history.json on the data branch (scripts/tfrrs/depth_snapshot.py, same method). */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const DEPTH_DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
export const DEPTH_TOP = 50;
export const DEPTH_FROM = 2022;   /* yearly archive pages from this season on (gradual release) */
const KEY = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia" };
const DS = d => KEY[d] === "naia" ? "naia" : "ncaa-" + KEY[d];
export const rankPath = d => `/rankings/${DS(d)}-track-and-field-rankings.html`;
export const seasonPath = (d, year, season) => `/rankings/${year}-${season}-${DS(d)}-track-and-field-rankings.html`;

/* event groups (Ryan 2026-10-30: "rank all of these schools for each group, sprints distance throws") */
export const GROUPS = [["sprints", "Sprints", /^(55|60|100|200|300|400) Meters$/], ["hurdles", "Hurdles", /Hurdles$/], ["distance", "Distance", /^(600|800|1000|1500|3000|5000|10,000) Meters$|^Mile$|Steeplechase/],
  ["jumps", "Jumps", /Jump$|Vault$/], ["throws", "Throws", /^(Shot Put|Discus|Hammer|Javelin|Weight Throw)$/], ["multis", "Multi-events", /athlon$/]];
const groupOf = ev => (GROUPS.find(([, , re]) => re.test(ev)) || [])[0] || null;
export const groupPath = (d, k) => `/rankings/${DS(d)}-${k}-rankings.html`;
const fnorm = x => String(x || "").toLowerCase().replace(/\bwis\.-/g, "wisconsin ").replace(/\bst\.(?=\s|$)/g, "state").replace(/\buniv\.?\b/g, "university").replace(/[^a-z0-9&]+/g, " ").trim();
const ranked = (rows, key) => { let r = 0, prev = null; return rows.map((x, i) => { if (x[key] !== prev) { r = i + 1; prev = x[key]; } return r; }); };

/* one season's list -> ranked rows */
function seasonRows(D, schoolOf, d) {
  const L = (D.lists || []).find(l => l.nat); if (!L) return null;
  const tally = new Map();
  for (const g of ["m", "w"]) for (const [ev, rows] of Object.entries((L.g || {})[g] || {})) {
    if (/relay|dmr|smr/i.test(ev)) continue;
    for (const r of rows.slice(0, DEPTH_TOP)) { const t = String(D.teams[r[3]] || "").replace(/ \([B-H]\)$/, ""); if (!t) continue;   /* "Wayne State (Mich.) (B)": B/C squads count for their school */ const o = tally.get(t) || { m: 0, w: 0, ev: new Set(), gr: {} }; o[g]++; o.ev.add(ev); const k = groupOf(ev); if (k) { const q = o.gr[k] || (o.gr[k] = { m: 0, w: 0 }); q[g]++; } tally.set(t, o); }
  }
  if (!tally.size) return null;
  const rows = [...tally.entries()].map(([t, o]) => ({ t, s: schoolOf(t, d), m: o.m, w: o.w, n: o.m + o.w, ev: o.ev.size, gr: o.gr })).sort((a, b) => b.n - a.n || b.ev - a.ev || a.t.localeCompare(b.t));
  ranked(rows, "n").forEach((r, i) => { rows[i].rank = r; });
  for (const g of ["m", "w"]) { const by = rows.filter(x => x[g]).sort((a, b) => b[g] - a[g]); ranked(by, g).forEach((r, i) => { by[i][g + "r"] = r; }); }
  return rows;
}

export function computeDepth({ out, S }) {
  const dir = path.join(out, "data", "rank");
  const IDX = new Map(); for (const s of S) for (const a of [s.t, s.n, ...(s.a || [])]) { const k = fnorm(a) + "|" + s.d; if (fnorm(a) && !IDX.has(k)) IDX.set(k, s); }
  const schoolOf = (team, d) => IDX.get(fnorm(team) + "|" + d) || IDX.get("university of " + fnorm(team) + "|" + d) || null;
  const R = { seasons: {}, cur: {}, bySchool: new Map(), bySchoolGroups: new Map(), conf: new Map(), hist: [], groups: {} };
  let files = []; try { files = fs.readdirSync(dir); } catch { return R; }
  /* every season with a national list, per division; seasons sort indoor before outdoor within a year */
  const SO = s => s === "indoor" ? 0 : 1;
  for (const d of DEPTH_DIVS) {
    const keys = files.map(f => f.match(new RegExp(`^(\\d{4})-(indoor|outdoor)-${KEY[d]}\\.dat$`))).filter(Boolean).map(m => ({ year: m[1], season: m[2] }))
      .sort((a, b) => a.year.localeCompare(b.year) || SO(a.season) - SO(b.season));
    R.seasons[d] = [];
    for (const k of keys) {
      let D; try { D = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, `${k.year}-${k.season}-${KEY[d]}.dat`))).toString()); } catch { continue; }
      const rows = seasonRows(D, schoolOf, d); if (!rows) continue;
      R.seasons[d].push({ ...k, rows });
    }
    /* year-over-year: the same season a year earlier */
    for (const x of R.seasons[d]) { const p = R.seasons[d].find(y => y.season === x.season && +y.year === +x.year - 1); if (!p) continue;
      const pr = new Map(p.rows.map(r => [r.t, r.rank])); for (const r of x.rows) r.prev = pr.has(r.t) ? pr.get(r.t) : null; x.prevOf = p.rows.length; }
    R.cur[d] = R.seasons[d][R.seasons[d].length - 1] || null;
  }
  /* weekly / monthly movement from the Monday snapshots: [{date, d, key, ranks: {team: rank}}] */
  try { R.hist = JSON.parse(fs.readFileSync(path.join(out, "data", "depth_history.json"), "utf8")); } catch { R.hist = []; }
  const day = s => Date.parse(s + "T00:00:00Z");
  for (const d of DEPTH_DIVS) { const c = R.cur[d]; if (!c) continue;
    const H = R.hist.filter(h => h.d === d && h.key === `${c.year}-${c.season}`).sort((a, b) => a.date.localeCompare(b.date));
    if (H.length < 2) continue;
    const last = H[H.length - 1], wk = [...H].reverse().find(h => day(last.date) - day(h.date) >= 6 * 864e5), mo = [...H].reverse().find(h => day(last.date) - day(h.date) >= 27 * 864e5);
    for (const r of c.rows) { if (wk) r.wk = wk.ranks[r.t] ?? null; if (mo) r.mo = mo.ranks[r.t] ?? null; }
    c.wkDate = wk && wk.date; c.moDate = mo && mo.date; c.asOf = last.date; }
  /* event-group rankings for the current season: same count, only that group's events */
  R.groups = {};
  for (const d of DEPTH_DIVS) { const c = R.cur[d]; if (!c) continue; R.groups[d] = {};
    for (const [k] of GROUPS) {
      const rows = c.rows.filter(r => r.gr[k]).map(r => ({ t: r.t, s: r.s, m: r.gr[k].m, w: r.gr[k].w, n: r.gr[k].m + r.gr[k].w })).sort((a, b) => b.n - a.n || a.t.localeCompare(b.t));
      if (rows.length < 10) continue;
      ranked(rows, "n").forEach((x, i) => { rows[i].rank = x; });
      for (const g of ["m", "w"]) { const by = rows.filter(x => x[g]).sort((a, b) => b[g] - a[g]); ranked(by, g).forEach((x, i) => { by[i][g + "r"] = x; }); }
      R.groups[d][k] = rows;
      for (const r of rows) if (r.s) { const b = R.bySchoolGroups.get(r.s) || {}; b[k] = r.rank; R.bySchoolGroups.set(r.s, b); }
    } }
  /* the current season per school + conference tables */
  for (const d of DEPTH_DIVS) { const c = R.cur[d]; if (!c) continue; for (const x of c.rows) if (x.s && !R.bySchool.has(x.s)) R.bySchool.set(x.s, { d, ...x, of: c.rows.length, year: c.year, season: c.season }); }
  const confs = new Map(); for (const s of S) if (R.cur[s.d]) { const k = s.d + "|" + s.c; if (!confs.has(k)) confs.set(k, []); confs.get(k).push(s); }
  for (const [k, list] of confs) {
    const rows = list.map(s => { const x = R.bySchool.get(s); return { s, n: x ? x.n : 0, m: x ? x.m : 0, w: x ? x.w : 0, rank: x ? x.rank : null }; }).sort((a, b) => b.n - a.n || a.s.n.localeCompare(b.s.n));
    if (!rows.some(x => x.n)) continue;
    ranked(rows, "n").forEach((r, i) => { rows[i].crank = rows[i].n ? r : null; });
    R.conf.set(k, rows);
    for (const x of rows) { const b = R.bySchool.get(x.s); if (b && x.n) { b.crank = x.crank; b.cof = rows.length; } }
  }
  return R;
}
export const seasonLabel = x => `${x.year} ${x.season === "indoor" ? "Indoor" : "Outdoor"}`;
