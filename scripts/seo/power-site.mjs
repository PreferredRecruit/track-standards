/* Power Index for the whole site (Ryan 2026-10-30: v2 rankings approved, "push the current rankings live"). Runs power.mjs on every
   NCAA D1/D2/D3/NAIA indoor and outdoor season from POWER_FROM, maps TFRRS team names to school pages, and returns what the rankings,
   school and conference pages show. Weekly / monthly movement: power_history.json (scripts/seo/power-snapshot.mjs, Monday workflow). */
import fs from "node:fs";
import path from "node:path";
import { computePower, PGROUPS } from "./power.mjs";
import zlib from "node:zlib";

export const PDIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
export const POWER_FROM = 2016;   /* every season with TFRRS lists (Ryan 2026-10-30: "everything since 2016") */
const KEY = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia" };
const DS = d => KEY[d] === "naia" ? "naia" : "ncaa-" + KEY[d];
export const rankPath = d => `/rankings/${DS(d)}-track-and-field-rankings.html`;
export const seasonPath = (d, year, season) => `/rankings/${year}-${season}-${DS(d)}-track-and-field-rankings.html`;
export const groupPath = (d, k) => `/rankings/${DS(d)}-${k}-rankings.html`;
export const seasonLabel = x => `${x.year} ${x.season === "indoor" ? "Indoor" : "Outdoor"}`;
export { PGROUPS };

const fnorm = x => String(x || "").toLowerCase().replace(/\bwis\.-/g, "wisconsin ").replace(/\bst\.(?=\s|$)/g, "state").replace(/\buniv\.?\b/g, "university").replace(/[^a-z0-9&]+/g, " ").trim();
const J = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

export function computeSite({ out, root, S }) {
  const IDX = new Map(); for (const s of S) for (const a of [s.t, s.n, ...(s.a || [])]) { const k = fnorm(a) + "|" + s.d; if (fnorm(a) && !IDX.has(k)) IDX.set(k, s); }
  const schoolOf = (team, d) => IDX.get(fnorm(team) + "|" + d) || IDX.get("university of " + fnorm(team) + "|" + d) || null;
  const R = { seasons: {}, cur: {}, bySchool: new Map(), conf: new Map(), hist: J(path.join(out, "data", "power_history.json")) || [] };
  let files = []; try { files = fs.readdirSync(path.join(out, "data", "rank")); } catch { return R; }
  const SO = s => s === "indoor" ? 0 : 1;
  for (const d of PDIVS) {
    const keys = files.map(f => f.match(new RegExp(`^(\\d{4})-(indoor|outdoor)-${KEY[d]}\\.dat$`))).filter(Boolean).filter(m => +m[1] >= POWER_FROM)
      .map(m => ({ year: m[1], season: m[2] })).filter(k => !(k.year === "2020" && k.season === "outdoor")).sort((a, b) => a.year.localeCompare(b.year) || SO(a.season) - SO(b.season));
    R.seasons[d] = []; const lastFields = {};
    for (const k of keys) {
      const key = `${k.year}-${k.season}-${KEY[d]}`;
      let dat; try { dat = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data", "rank", key + ".dat"))).toString()); } catch { continue; }
      const legal = J(path.join(out, "data", "legal", key + ".json")) || J(path.join(root, "public", "data", "legal", key + ".json")) || {};
      const official = J(path.join(out, "data", "teamscores", key + ".json")) || J(path.join(root, "public", "data", "teamscores", key + ".json"));
      const P = computePower({ dat, legal, official, fields: lastFields[k.season] });
      if (!P || !P.all || !P.all.length) continue;
      if (P.final) lastFields[k.season] = P.fields;
      for (const v of ["all", "m", "w"]) for (const r of P[v]) r.s = schoolOf(r.t, d);
      for (const g of ["m", "w"]) for (const rows of Object.values(P.groups[g])) for (const r of rows) r.s = schoolOf(r.t, d);
      R.seasons[d].push({ ...k, key, P, official: !!(official && official.m) });
    }
    /* change vs the same season a year earlier, per view */
    for (const x of R.seasons[d]) { const p = R.seasons[d].find(y => y.season === x.season && +y.year === +x.year - 1); if (!p) continue;
      for (const v of ["all", "m", "w"]) { const pr = new Map(p.P[v].map(r => [r.t, r.rank])); for (const r of x.P[v]) r.prev = pr.has(r.t) ? pr.get(r.t) : null; } x.hasPrev = true; }
    const c = R.cur[d] = R.seasons[d][R.seasons[d].length - 1] || null;
    /* finished seasons with no national meet on TFRRS: 2020 indoor (cancelled, COVID-19), D1 outdoor 2016 and 2021, NAIA outdoor 2021,
       D3 indoor 2021 (cancelled). Ranked on the lists only and labelled so. */
    for (const x of R.seasons[d]) if (x !== c && !x.P.final) x.noMeet = x.year === "2020" || (x.year === "2021" && x.season === "indoor") ? "cancelled" : "missing";
    if (!c) continue;
    /* weekly / monthly movement (combined view) from the Monday snapshots of this season */
    const day = x => Date.parse(x + "T00:00:00Z");
    const H = R.hist.filter(h => h.d === d && h.key === `${c.year}-${c.season}`).sort((a, b) => a.date.localeCompare(b.date));
    if (H.length >= 2) { const last = H[H.length - 1], wk = [...H].reverse().find(h => day(last.date) - day(h.date) >= 6 * 864e5), mo = [...H].reverse().find(h => day(last.date) - day(h.date) >= 27 * 864e5);
      const rk = (h, v, t) => { const x = ((h.ranks || {})[v] || {})[t]; return x == null ? null : Array.isArray(x) ? x[0] : x; };   /* snapshots store [rank, Power] */
      for (const v of ["m", "w"]) for (const r of c.P[v]) { if (wk) r.wk = rk(wk, v, r.t); if (mo) r.mo = rk(mo, v, r.t); }
      c.wkDate = wk && wk.date; c.moDate = mo && mo.date; c.asOf = last.date; }
    /* men and women ranked separately (Ryan 2026-10-30: "we have to separate women and men rankings") */
    for (const g of ["m", "w"]) for (const r of c.P[g]) { if (!r.s) continue; const b = R.bySchool.get(r.s) || { d, year: c.year, season: c.season, m: null, w: null }; if (b[g]) continue;
      const gr = Object.fromEntries(Object.entries(c.P.groups[g]).map(([k, rows]) => { const x = rows.find(y => y.t === r.t); return x ? [k, x.rank] : null; }).filter(Boolean));
      b[g] = { rank: r.rank, of: c.P[g].length, prev: r.prev, act: r.act, qual: r.qual, power: r.power, groups: gr }; R.bySchool.set(r.s, b); }
  }
  /* conference tables: every conference school, ranked by its division Power rank, men and women separately */
  const confs = new Map(); for (const s of S) if (R.cur[s.d]) { const k = s.d + "|" + s.c; if (!confs.has(k)) confs.set(k, []); confs.get(k).push(s); }
  for (const [k, list] of confs) {
    const T = {};
    for (const g of ["m", "w"]) {
      const rows = list.map(s => ({ s, x: (R.bySchool.get(s) || {})[g] })).filter(r => r.x).sort((a, b) => a.x.rank - b.x.rank);
      rows.forEach((r, i) => { r.crank = i && r.x.rank === rows[i - 1].x.rank ? rows[i - 1].crank : i + 1; r.x.crank = r.crank; r.x.cof = list.length; });
      if (rows.length) T[g] = rows;
    }
    if (T.m || T.w) R.conf.set(k, T);
  }
  return R;
}
