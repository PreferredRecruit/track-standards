/* PR Power Index v2 (Ryan 2026-10-30: "data-perfect", "indisputable", conference + national meet points, event-group squads without the
   four-athlete minimum). Built only from saved TFRRS data:
     dist/data/rank/<year>-<season>-<div>.dat   national qualifying list (lists[nat]) + "<division> Championships" results
     public/data/legal/<key>.json                wind-legal bests for athletes whose list mark was wind-aided
   Per division, season and gender (and combined):
     athlete score  0-100 from the athlete's wind-legal position p on the national list, F = that event's real championship field
                    size (counted from the championship results): p=1 -> 100, p=F -> 50, p>=2F -> 0, linear between
     projected pts  10-8-6-5-4-3-2-1 for legal list places 1-8 (individual events and relays)
     actual pts     the same scoring on the championship results (places 1-8, relays included)
     qualifiers     individual entrants in the championship results
     squads         per event group, a team's best 4 athletes weighted 1.0/0.75/0.5/0.25 (one athlete counted once per group, at
                    their best score); a squad is ranked only with at least one athlete inside the championship field (p <= F)
     Power          each part scaled 0-100 against the division leader, weighted: projected 20, actual 30, squads 25,
                    qualifiers 15 (conference meet performance 10 joins once conference results are saved; weights rescale) */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const PGROUPS = [["sprints", "Sprints", /^(55|60|100|200|300|400) Meters$/], ["hurdles", "Hurdles", /Hurdles$/], ["distance", "Distance", /^(600|800|1000|1500|3000|5000|10,000) Meters$|^Mile$|Steeplechase/],
  ["jumps", "Jumps", /Jump$|Vault$/], ["throws", "Throws", /^(Shot Put|Discus|Hammer|Javelin|Weight Throw)$/], ["multis", "Multi-events", /athlon$/]];
const grp = ev => (PGROUPS.find(([, , re]) => re.test(ev)) || [])[0] || null;
const HIGH = /Jump|Vault|Put|Throw|Discus|Hammer|Javelin|athlon/;
const WIND = /^(100|200) Meters$|^(100|110) Hurdles$|^(Long|Triple) Jump$/;
const RELAY = /relay|dmr|smr/i;
const PTS = [10, 8, 6, 5, 4, 3, 2, 1];
export const WEIGHTS = { proj: 20, act: 30, squad: 25, qual: 15 };
const val = (m, ev) => { const s = String(m || "").replace(/m$/, "").trim(); if (!s) return null; const p = s.split(":").map(Number); if (p.some(isNaN)) return null; const v = p.reduce((a, x) => a * 60 + x, 0); return HIGH.test(ev) ? -v : v; };
const wnum = w => { const x = parseFloat(String(w).replace("+", "")); return isNaN(x) ? null : x; };
const clean = t => String(t || "").replace(/ \([B-H]\)$/, "");

export function computePower({ dat, legal, official, fields }) {
  const T = dat.teams, L = (dat.lists || []).find(l => l.nat), C = (dat.lists || []).find(l => /Championships$/.test(l.label || "") && !l.nat);
  const FS = { m: {}, w: {} };   /* field size per event: from this season's championship, else the newest one passed in (in season) */
  if (!L) return null;
  const report = { windSwapped: 0, windDropped: 0, fieldSizes: {} };
  const out = { m: null, w: null, all: null, groups: {}, report, fields: FS, final: !!C };
  const team = r => clean(T[r[3]]);
  const per = { m: new Map(), w: new Map() };   /* team -> {proj, act, qual, ath: [{id, nm, ev, g, p, F, sc, grp}]} */
  const get = (g, t) => { let o = per[g].get(t); if (!o) per[g].set(t, o = { t, proj: 0, act: 0, qual: 0, ath: [] }); return o; };
  for (const g of ["m", "w"]) {
    const LG = (L.g || {})[g] || {}, CG = (C && C.g && C.g[g]) || {}, LEG = ((legal || {})[g]) || {};
    for (const [ev, rows0] of Object.entries(LG)) {
      const rel = RELAY.test(ev), F = (CG[ev] || []).length || ((fields || {})[g] || {})[ev] || 24; FS[g][ev] = F; report.fieldSizes[g + " " + ev] = F;
      /* wind-legal list: an aided mark is replaced by the athlete's saved legal best, or dropped if there is none */
      let rows = rows0.map(r => ({ r, v: val(r[4], ev), id: r[9] || r[1] + "|" + team(r) }));
      if (WIND.test(ev)) rows = rows.flatMap(x => { const w = wnum(x.r[5]); if (w == null || w <= 2.0) return [x];
        const lg = LEG[ev] && LEG[ev][x.r[9]]; if (lg) { report.windSwapped++; return [{ ...x, v: val(lg[0], ev), mk: lg[0] }]; } report.windDropped++; return []; });
      rows = rows.filter(x => x.v != null).sort((a, b) => a.v - b.v);
      const seen = new Set(); rows = rows.filter(x => !seen.has(x.id) && seen.add(x.id));
      rows.forEach((x, i) => { const p = i + 1, t = team(x.r); if (!t) return;
        if (p <= 8) get(g, t).proj += PTS[p - 1];
        if (rel) return;
        const sc = p <= F ? 100 - 50 * (p - 1) / Math.max(F - 1, 1) : p < 2 * F ? 50 * (2 * F - p) / F : 0;
        if (!C && p <= F) get(g, t).qual++;   /* in season: projected qualifiers (inside the field on the legal list) */
        if (sc > 0) get(g, t).ath.push({ id: x.id, nm: x.r[1], ev, p, F, sc, grp: grp(ev), mk: x.mk || x.r[4] }); });
    }
    /* actual points: the meet's official team scores when saved (they split ties and apply DQs/rescoring, which places alone can't:
       2026 D1 men Arkansas 56 official vs 58 from places); otherwise scored from the places */
    const OFF = official && official[g];
    for (const [ev, rows] of Object.entries(CG)) for (const r of rows) { const t = team(r); if (!t) continue; const pl = +r[0];
      if (!OFF && pl >= 1 && pl <= 8) get(g, t).act += PTS[pl - 1];
      if (!RELAY.test(ev)) get(g, t).qual++; }
    if (OFF) { for (const [t, v] of Object.entries(OFF)) get(g, clean(t)).act += +v; report.official = true; }
  }
  /* squads per gender and group */
  const W = [1, 0.75, 0.5, 0.25];
  const squads = o => { const S = {}; for (const [k] of PGROUPS) { const best = new Map(); for (const a of o.ath) if (a.grp === k && (!best.has(a.id) || best.get(a.id).sc < a.sc)) best.set(a.id, a);
    const top = [...best.values()].sort((a, b) => b.sc - a.sc), ok = top.some(a => a.p <= a.F);
    S[k] = ok ? { score: top.slice(0, 4).reduce((s, a, i) => s + a.sc * W[i], 0), size: Math.min(top.length, 4), ath: top.slice(0, 4) } : null; } return S; };
  const build = teams => { const rows = teams.map(o => ({ ...o, sq: o.sq, squad: Object.values(o.sq).reduce((s, x) => s + (x ? x.score : 0), 0) }));
    const mx = k => Math.max(...rows.map(r => r[k]), 1), M = { proj: mx("proj"), act: mx("act"), squad: mx("squad"), qual: mx("qual") };
    /* a part nobody scores in (no national meet yet, or none held) drops out and the other weights rescale, so the leader stays near 100 */
    const K = Object.keys(WEIGHTS).filter(k => rows.some(r => r[k] > 0)), WT = K.reduce((a, k) => a + WEIGHTS[k], 0);
    for (const r of rows) { r.part = Object.fromEntries(Object.keys(WEIGHTS).map(k => [k, 100 * r[k] / M[k]])); r.power = K.reduce((s, k) => s + r.part[k] * WEIGHTS[k], 0) / WT; }
    /* after the national meet the final order follows the official team scores, so the champion is always #1 (2026-10-30: Power alone put
       Florida over 2018 champion Georgia); Power breaks ties and orders the teams that didn't score. In season: Power only. */
    const fin = K.includes("act"), key = r => fin ? `${r.act}|${r.power.toFixed(1)}` : r.power.toFixed(1);
    const R = rows.filter(r => r.power > 0).sort((a, b) => (fin ? b.act - a.act : 0) || b.power - a.power || a.t.localeCompare(b.t));
    let rk = 0, prev = null; R.forEach((r, i) => { const v = key(r); if (v !== prev) { rk = i + 1; prev = v; } r.rank = rk; }); return R; };
  for (const g of ["m", "w"]) { const teams = [...per[g].values()]; for (const o of teams) o.sq = squads(o); out[g] = build(teams);
    out.groups[g] = Object.fromEntries(PGROUPS.map(([k]) => { const R = teams.filter(o => o.sq[k]).map(o => ({ t: o.t, ...o.sq[k] })).sort((a, b) => b.score - a.score);
      let rk = 0, prev = null; R.forEach((r, i) => { const v = r.score.toFixed(1); if (v !== prev) { rk = i + 1; prev = v; } r.rank = rk; }); return [k, R]; })); }
  /* combined: men + women summed per part, squads summed across both genders */
  const comb = new Map(); for (const g of ["m", "w"]) for (const o of per[g].values()) { const c = comb.get(o.t) || { t: o.t, proj: 0, act: 0, qual: 0, ath: [], sq: {} }; c.proj += o.proj; c.act += o.act; c.qual += o.qual;
    for (const [k] of PGROUPS) if (o.sq[k]) c.sq[k + g] = o.sq[k]; comb.set(o.t, c); }
  out.all = build([...comb.values()]);
  return out;
}

export function loadSeason(out, root, key) {
  const dat = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data", "rank", key + ".dat"))).toString());
  let legal = {}; try { legal = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "legal", key + ".json"), "utf8")); } catch { }
  let official = null; try { official = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "teamscores", key + ".json"), "utf8")); } catch { }
  return { dat, legal, official };
}
