/* Facts nobody else has (Ryan 2026-10-24 "go all-in"), shared by the school and state pages: freshmen's first-season marks,
   national champions, development numbers (scripts/tfrrs/build_schoolfacts.py -> public/data/schoolfacts.json, keyed by TFRRS team name) */
import fs from "node:fs";
import path from "node:path";

export function loadFacts(root) {
  let FACTS = {}; try { FACTS = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "schoolfacts.json"), "utf8")); } catch { }
  const fnorm = x => String(x || "").toLowerCase().replace(/\s*\([a-z]\)\s*$/, "").replace(/\bst\.(?=\s|$)/g, "state").replace(/[^a-z0-9&]+/g, " ").trim();
  const FIDX = new Map(Object.keys(FACTS).map(k => [fnorm(k), k]));
  const factsOf = s => { for (const a of [s.t, s.n, ...(s.a || [])]) { const k = FIDX.get(fnorm(a)) || FIDX.get(fnorm(a).replace(/^university of /, "")); if (k) return FACTS[k]; } return null; };
  return { FACTS, factsOf };
}
const EVL = { "100 Meters": "100m", "200 Meters": "200m", "400 Meters": "400m", "800 Meters": "800m", "1500 Meters": "1500m", "5000 Meters": "5000m", "10,000 Meters": "10,000m", "100 Hurdles": "100m hurdles", "110 Hurdles": "110m hurdles", "400 Hurdles": "400m hurdles", "3000 Steeplechase": "steeplechase" };
export const evl = e => EVL[e] || e;
/* the name people use ("Oregon State", "Washington State"), not the legal one */
export const shortOf = s => (s.t && !/[().]/.test(s.t) && s.t.length < s.n.length ? s.t : s.n).replace(/\s*\(.*?\)\s*/g, " ").trim();
/* college 1500m -> roughly the high school 1600m */
export const t1600 = m => { const p = String(m).split(":").map(Number); const v = p.length === 2 ? p[0] * 60 + p[1] : p[0]; if (!isFinite(v) || v < 150) return null; const x = v / 0.9314; return `${Math.floor(x / 60)}:${String((x % 60).toFixed(0)).padStart(2, "0")}`; };
