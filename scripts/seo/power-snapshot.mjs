/* Weekly Power Ranking snapshot (Ryan 2026-10-30: "weekly, monthly, yearly rankings"). Run by scripts/tfrrs/weekly.py after this Monday's
   lists are built: node scripts/seo/power-snapshot.mjs <weekly out dir>. Ranks with the same code as the site (computeSite), on the repo's
   data overlaid with this week's files, and appends {date, d, key, ranks: {all, m, w}} to the history already on the data branch. */
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { computeSite, PDIVS } from "./power-site.mjs";
const OUT = path.resolve(process.argv[2]), ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "power-")), D = path.join(tmp, "data");
for (const [sub, from] of [["rank", "rank"], ["legal", "legal"], ["teamscores", "teamscores"]]) {
  fs.mkdirSync(path.join(D, sub), { recursive: true });
  for (const base of [path.join(ROOT, "public", "data", sub), path.join(OUT, from)]) { let f = []; try { f = fs.readdirSync(base); } catch { } for (const x of f) fs.copyFileSync(path.join(base, x), path.join(D, sub, x)); }
}
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "data", "db.json"), "utf8")).schools.filter(s => !s.j);
const R = computeSite({ out: tmp, root: ROOT, S });
let hist = []; try { const r = await fetch("https://raw.githubusercontent.com/PreferredRecruit/track-standards/data/power_history.json", { signal: AbortSignal.timeout(20000) }); if (r.ok) hist = await r.json(); } catch { }
const today = new Date().toISOString().slice(0, 10), year = String(new Date().getUTCFullYear() + (new Date().getUTCMonth() === 11 ? 1 : 0));
hist = hist.filter(h => h.date !== today);
for (const d of PDIVS) { const c = R.cur[d]; if (!c || c.P.final || +c.year < +year - 1) continue;   /* only a season still in progress */
  hist.push({ date: today, d, key: `${c.year}-${c.season}`, ranks: Object.fromEntries(["all", "m", "w"].map(v => [v, Object.fromEntries(c.P[v].map(r => [r.t, r.rank]))])) }); }
const cut = new Date(Date.now() - 800 * 864e5).toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, "power_history.json"), JSON.stringify(hist.filter(h => h.date >= cut)));
console.log("power snapshots:", hist.length);
