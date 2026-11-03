// Visual check (2026-11-03): the 375 px + desktop half of docs/design/QUALITY-CHECKLIST.md.
//   node scripts/design/shots.mjs [base url] [path ...]      (default http://localhost:8090 and the key pages below)
// Takes a first-screen screenshot of each page at 375×812 (phone) and 1280×900 (desktop) into design-shots/ (gitignored) and
// fails on what a person would otherwise have to spot: horizontal scroll, page errors, form fields under 16 px on a phone (iOS zoom),
// Inter not loaded. Small tap targets (< 32 px) are listed as warnings. Uses Playwright from the editing folder's node_modules
// (a dev tool on this Mac, never a site dependency). Look at every screenshot before calling a UI change done.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "design-shots");
const [base = "http://localhost:8090", ...rest] = process.argv.slice(2);
const PAGES = rest.length ? rest : ["/", "/?g=m&e=800m&m=1%3A54&gr=11", "/schools/university-of-oregon-track-standards.html", "/?tab=results", "/?tab=rankings", "/rankings.html", "/standards/ncaa-d1-track-and-field-recruiting-standards.html"];
fs.mkdirSync(OUT, { recursive: true });
const slug = u => (u.replace(/^\/+|\.html$/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home").slice(0, 60);
const errs = [], warns = [];
const b = await chromium.launch();
for (const [w, h, tag] of [[375, 812, "phone"], [1280, 900, "desktop"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("prEvalDismissed", "1"); localStorage.setItem("prTour1:anon", "1"); } catch (e) {} });   // no pop-ups in the shots
  const p = await ctx.newPage();
  for (const u of PAGES) {
    const pe = []; const on = e => pe.push(String(e)); p.on("pageerror", on);
    await p.goto(base + u, { waitUntil: "networkidle" }).catch(e => pe.push("load: " + e.message));
    await p.waitForTimeout(900);
    const r = await p.evaluate(async phone => {
      await document.fonts.ready;
      const de = document.documentElement, over = de.scrollWidth - innerWidth;
      const vis = el => { const b = el.getBoundingClientRect(), s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
      const small = phone ? [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea")].filter(vis).filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id || el.name || el.tagName) : [];
      const tiny = phone ? [...document.querySelectorAll("button,a[href],[role=button]")].filter(vis).filter(el => { const b = el.getBoundingClientRect(); return b.height < 32 && b.width < 32; }).length : 0;
      return { over, small, tiny, inter: document.fonts.check("16px Inter") };
    }, tag === "phone");
    const name = `${tag}-${slug(u)}.png`;
    await p.screenshot({ path: path.join(OUT, name) });
    p.off("pageerror", on);
    const at = `${tag} ${u}`;
    if (r.over > 1) errs.push(`${at}: page scrolls sideways by ${r.over}px`);
    if (pe.length) errs.push(`${at}: ${pe.length} page error(s): ${pe[0].slice(0, 120)}`);
    if (r.small.length) errs.push(`${at}: form fields under 16px on a phone (iOS zoom): ${r.small.join(", ")}`);
    if (!r.inter) errs.push(`${at}: Inter not loaded`);
    if (r.tiny) warns.push(`${at}: ${r.tiny} tap target(s) under 32×32px`);
    console.log(`  ${r.over > 1 || pe.length || r.small.length ? "✗" : "✓"} ${at} → design-shots/${name}`);
  }
  await ctx.close();
}
await b.close();
for (const x of warns) console.log("  warn ", x);
for (const x of errs) console.log("  ERROR", x);
console.log(errs.length ? `✗ ${errs.length} error(s)` : `✓ pass (${warns.length} warning(s)). Now look at the screenshots in design-shots/.`);
process.exit(errs.length ? 1 : 0);
