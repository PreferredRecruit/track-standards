/* School page sweep (Ryan 2026-10-19: "no small errors on any schools parts"). Run after `vite build`:
   node scripts/data/check_school_pages.mjs
   1. every pre-built page in dist/schools: title/h1/description present, no "undefined"/"NaN"/"null"/"[object" leaking into text,
      every structured-data block parses, every internal link and image points at a file that exists
   2. the app's high school view for every school and gender (same rules as src/standards/app.js): every shown mark readable,
      Target best -> Walk-On, inside a possible range for the event, no level missing between two shown levels */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMark } from "../seo/markparse.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "dist");
const issues = [];
const add = (school, part, msg) => issues.push({ school, part, msg });

/* ---------- 1. pre-built pages ---------- */
const exists = u => {
  const p = decodeURIComponent(u.split(/[?#]/)[0]);
  if (p === "/" || p === "") return true;
  const f = path.join(DIST, p);
  return fs.existsSync(f) && fs.statSync(f).isFile() || fs.existsSync(f + ".html") || fs.existsSync(path.join(f, "index.html"));
};
const files = fs.readdirSync(path.join(DIST, "schools")).filter(f => f.endsWith(".html"));
for (const f of files) {
  const h = fs.readFileSync(path.join(DIST, "schools", f), "utf8"), name = f.replace(/\.html$/, "");
  if (/noindex/.test(h) && !/not-a-real|404/.test(name)) continue;   /* alternate-slug pages */
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1], desc = (h.match(/name="description" content="([^"]*)"/) || [])[1];
  if (!title) add(name, "title", "missing"); else if (title.length > 70) add(name, "title", `long (${title.length})`);
  if (!desc) add(name, "description", "missing");
  if (!/<h1[^>]*>[^<]+/.test(h)) add(name, "h1", "missing");
  const text = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  for (const bad of ["undefined", "NaN", "[object", "Infinity", " null "]) if (text.includes(bad)) add(name, "text", `contains "${bad.trim()}"`);
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { add(name, "structured data", "does not parse"); } }
  for (const m of h.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!/^\/(_vercel|\?)/.test(m[1]) && !m[1].startsWith("//") && !exists(m[1])) add(name, "link", `broken ${m[1]}`);
}

/* ---------- 2. the app's high school view ---------- */
const DB = JSON.parse(fs.readFileSync(path.join(DIST, "data/db.json"), "utf8")), CT = DB.ct;
const EVENTS = ["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles", '110m Hurdles (39")', "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"];
const FIELD = new Set(["High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"]);
const CONV = { "1600m": { to: "1500m", k: [0, 0.9314] }, "3200m": { to: "3000m", k: [0, 0.9314], next: { to: "5000m", k: 1.7186 } },
  '110m Hurdles (39")': { to: "110m Hurdles", add: [0, 0.5] }, "300m Hurdles": { to: "400m Hurdles", k: { m: [0, 1.41], w: [0, 1.45] } } };
const IMPL = { "Shot Put": -3.05, "Discus": -7.62 };
const HSE = g => ["100m", "200m", "400m", "800m", "1600m", "3200m", g === "m" ? '110m Hurdles (39")' : "100m Hurdles", "300m Hurdles", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Javelin"];
const side = (x, g) => { if ((x.ng || []).includes(g)) return {}; if (x.em) return x.em[g] || {}; const o = (x.om || {})[g] || {}, c = (CT[x.ck] || {})[g] || {}, r = {};
  for (const e of EVENTS) { if (o[e]) r[e] = o[e]; else if (c[e]) r[e] = c[e].map(v => (v ? v[0] : "")); } return r; };
const toHS = (e, g, ev, v) => { const c = CONV[e]; const k = c.k && (Array.isArray(c.k) ? c.k : c.k[g]); if (c.to === ev) return c.add ? v - c.add[1] : v / k[1]; if (c.next && c.next.to === ev) return v / c.next.k / k[1]; return null; };
const RNG = { m: { "100m": [9.8, 13], "200m": [19.8, 27], "400m": [44, 62], "800m": [104, 150], "1600m": [228, 345], "3200m": [495, 770], '110m Hurdles (39")': [12.8, 20], "300m Hurdles": [34.5, 52],
    "High Jump": [1.5, 2.4], "Pole Vault": [2.4, 6.0], "Long Jump": [5.0, 8.4], "Triple Jump": [10.5, 17.5], "Shot Put": [9, 25], "Discus": [25, 75], "Javelin": [30, 85] },
  w: { "100m": [10.8, 15], "200m": [22, 31], "400m": [49, 75], "800m": [118, 180], "1600m": [262, 410], "3200m": [560, 900], "100m Hurdles": [12.4, 20], "300m Hurdles": [38, 64],
    "High Jump": [1.3, 2.05], "Pole Vault": [2.0, 4.9], "Long Jump": [4.2, 7.2], "Triple Jump": [8.5, 14.8], "Shot Put": [7, 20], "Discus": [20, 66], "Javelin": [20, 66] } };
for (const s of DB.schools) {
  if (s.j) continue;
  for (const g of ["m", "w"]) {
    const sd = side(s, g);
    for (const e of HSE(g)) {
      let vals = null, src = e;
      if (sd[e]) { vals = sd[e].map(x => parseMark(x, e)); if (g === "m" && IMPL[e] != null && !((s.om || {})[g] || {})[e]) vals = vals.map(v => v == null ? null : v - IMPL[e]); }
      else if (CONV[e]) { for (const ev of [CONV[e].to, CONV[e].next && CONV[e].next.to].filter(Boolean)) if (sd[ev]) { src = ev; vals = sd[ev].map(x => { const v = parseMark(x, ev); return v == null ? null : toHS(e, g, ev, v); }); break; } }
      if (!vals) continue;
      const raw = (sd[src] || []).map(x => String(x || ""));
      const lab = `${g === "m" ? "men" : "women"} ${e}`;
      raw.forEach((x, j) => { if (x.trim() && !/^(n\/a|x+|-+|–|invite only|not contested.*)$/i.test(x.trim()) && vals[j] == null) add(s.n, lab, `can't read "${x}"`); });
      const idx = [0, 1, 2].filter(j => vals[j] != null);
      for (let a = 0; a + 1 < idx.length; a++) { const p = vals[idx[a]], q = vals[idx[a + 1]]; if (FIELD.has(e) ? p < q - 1e-9 : p > q + 1e-9) add(s.n, lab, `level ${idx[a]} (${raw[idx[a]]}) not better than level ${idx[a + 1]} (${raw[idx[a + 1]]})`); }
      const r = RNG[g][e]; if (r && !((s.om || {})[g] || {})[src]) for (const j of idx) if (vals[j] < r[0] || vals[j] > r[1]) add(s.n, lab, `${["Target", "Recruit", "Walk-On"][j]} ${raw[j]} outside ${r[0]}-${r[1]}${src !== e ? ` (from ${src})` : ""}${s.o ? " [official]" : ""}`);
    }
  }
}
const by = {}; for (const i of issues) (by[i.part.split(" ")[0]] ||= []).push(i);
console.log(`pages checked: ${files.length}, schools: ${DB.schools.length}, issues: ${issues.length}`);
for (const [k, L] of Object.entries(by)) { console.log(`\n== ${k} (${L.length})`); for (const i of L.slice(0, 40)) console.log(`  ${i.school} | ${i.part} | ${i.msg}`); }
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(issues, null, 1));
