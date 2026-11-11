/* Which event groups each program actually fields (Ryan 2026-10-31: "decipher whether a school simply hasn't published standards or if
   they don't actually compete in those events"; Temple men run distance only). From the saved TFRRS lists of the last three seasons
   (indoor + outdoor; national lists carry every athlete since 2025, conference lists the top 100): a group with no marks by that school,
   for that gender, is "not fielded". Multi-events are left out (plenty of full teams have no multi athletes). Schools with no marks at all
   are left alone (unknown, not "nothing"). Result: s.nf = { m: ["sprints", ...], w: [...] }, only where a core group is missing. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const NF_GROUPS = ["sprints", "hurdles", "distance", "jumps", "throws"];
export const NF_LABEL = { sprints: "sprints", hurdles: "hurdles", distance: "distance", jumps: "jumps", throws: "throws" };
const LIST_GRP = [["sprints", /^(55|60|100|200|300|400) Meters$/], ["hurdles", /Hurdles$/], ["distance", /^(600|800|1000|1500|3000|5000|10,000) Meters$|^Mile$|Steeplechase/],
  ["jumps", /Jump$|Vault$/], ["throws", /^(Shot Put|Discus|Hammer|Javelin|Weight Throw)$/]];
/* the standards tables' event names (100m, 110m Hurdles, 3000m Steeplechase, ...) */
export const stdGroup = e => /Hurdles/.test(e) ? "hurdles" : /^(100|200|400)m$/.test(e) ? "sprints" : /^(800|1500|1600|3000|3200|5000|10000)m$|Mile|Steeple/.test(e) ? "distance"
  : /Jump|Vault/.test(e) ? "jumps" : /Put|Discus|Hammer|Javelin|Weight/.test(e) ? "throws" : /athlon/.test(e) ? "multis" : null;
const KEY = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia" };
const fnorm = x => String(x || "").toLowerCase().replace(/\bwis\.-/g, "wisconsin ").replace(/\bst\.(?=\s|$)/g, "state").replace(/\buniv\.?\b/g, "university").replace(/[^a-z0-9&]+/g, " ").trim();

export function markPrograms({ out, S }) {
  const dir = path.join(out, "data", "rank"); let files = []; try { files = fs.readdirSync(dir); } catch { return 0; }
  const years = [...new Set(files.map(f => +(f.match(/^(\d{4})-(indoor|outdoor)-/) || [])[1]).filter(Boolean))].sort((a, b) => b - a).slice(0, 3);
  const IDX = new Map(); for (const s of S) for (const a of [s.t, s.n, ...(s.a || [])]) { const k = fnorm(a) + "|" + s.d; if (fnorm(a) && !IDX.has(k)) IDX.set(k, s); }
  const F = new Map();
  for (const f of files) {
    const m = f.match(/^(\d{4})-(indoor|outdoor)-(d1|d2|d3|naia)\.dat$/); if (!m || !years.includes(+m[1])) continue;
    const d = Object.keys(KEY).find(k => KEY[k] === m[3]); let J; try { J = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))); } catch { continue; }
    for (const L of J.lists || []) for (const g of ["m", "w"]) for (const [ev, rows] of Object.entries((L.g || {})[g] || {})) {
      const grp = (LIST_GRP.find(([, re]) => re.test(ev)) || [])[0]; if (!grp) continue;
      for (const r of rows) { const t = String(J.teams[r[3]] || "").replace(/ \([B-H]\)$/, ""), s = IDX.get(fnorm(t) + "|" + d) || IDX.get("university of " + fnorm(t) + "|" + d); if (!s) continue;
        const o = F.get(s) || { m: new Set(), w: new Set() }; o[g].add(grp); F.set(s, o); }
    }
  }
  /* groups confirmed on the school's own TFRRS team page (scripts/seo/data/nf-verified.json, checked 2026-11-11) are never flagged */
  let VER = {}; try { VER = JSON.parse(fs.readFileSync(new URL("./data/nf-verified.json", import.meta.url), "utf8")).fielded || {}; } catch {}
  let n = 0;
  for (const s of S) { delete s.nf; const o = F.get(s); if (!o) continue;
    for (const g of ["m", "w"]) for (const k of VER[`${s.n}|${s.d}|${g}`] || []) o[g].add(k);
    const nf = {}; for (const g of ["m", "w"]) { if (!o[g].size) continue; const own = new Set(Object.keys(((s.om || {})[g]) || {}).map(stdGroup)), miss = NF_GROUPS.filter(k => !o[g].has(k) && !own.has(k));   /* a group on the school's own chart counts as fielded */ if (miss.length) nf[g] = miss; }   /* a gender with no marks at all: no team, handled elsewhere */
    if (nf.m || nf.w) { s.nf = nf; n++; } }
  return { n, years };
}
