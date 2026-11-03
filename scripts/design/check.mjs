// Design check (2026-11-03): the automated half of docs/design/QUALITY-CHECKLIST.md. No dependencies, ~1 s.
//   node scripts/design/check.mjs          → report, exit 1 on any error
// 1. Token budget (ratchet): distinct radii, shadows, font sizes, colours, breakpoints and !important in the app stylesheet may not
//    grow past scripts/design/budget.json. When a cleanup lowers a count, lower the budget in the same commit so it stays down.
// 2. Vercel Web Interface Guidelines anti-patterns a script can see (docs/design/vercel-web-interface-guidelines.md).
// 3. DESIGN.md rules: motion only on transform/opacity, no new gradients on buttons, reduced-motion rule present, font preloaded.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const CSS = rd("src/standards/standards.css"), UI = rd("src/standards/ui.css"), BUDGET = JSON.parse(rd("scripts/design/budget.json"));
const SRC = ["src/standards/app.js", "src/standards/account.js", "src/standards/onboard.js", "src/standards/tour.js", "src/standards/readiness.js", "scripts/seo/prerender.mjs", "scripts/seo/rankings.mjs", "index.html"];
const errs = [], warns = [];
const lineOf = (txt, i) => txt.slice(0, i).split("\n").length;

/* 1. token budget */
const uniq = rx => new Set((CSS.match(rx) || []).map(x => x.toLowerCase().replace(/\s+/g, ""))).size;
const counts = {
  radius: uniq(/border-radius:[^;}]+/g), shadow: uniq(/box-shadow:[^;}]+/g), fontSize: uniq(/font-size:[^;}]+/g),
  color: uniq(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi), important: (CSS.match(/!important/g) || []).length,
  breakpoints: new Set((CSS.match(/@media[^{]*max-width:\s*\d+px/g) || []).map(m => m.match(/(\d+)px/)[1])).size };
for (const [k, v] of Object.entries(counts)) {
  if (v > BUDGET[k]) errs.push(`budget: ${k} ${v} > ${BUDGET[k]} (use a token from ui.css instead of a new value)`);
  else if (v < BUDGET[k]) warns.push(`budget: ${k} is ${v}, budget ${BUDGET[k]}: lower budget.json to ${v} to lock in the cleanup`);
}

/* 2 + 3. pattern rules over CSS and source */
const rules = [
  [/transition:\s*all\b/g, "error", "transition: all → list the properties (Vercel, DESIGN.md motion)"],
  [/outline:\s*(none|0)\b/g, "warn", "outline removed: make sure a :focus-visible style replaces it"],
  [/user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/g, "error", "zoom disabled in viewport meta"],
  [/onpaste[^>]*preventDefault|addEventListener\(\s*["']paste["'][^)]*preventDefault/gi, "error", "paste blocked"],
  [/transition:[^;}]*\b(width|height|top|left|right|bottom|margin|padding)\b/g, "warn", "animating layout: prefer transform/opacity (DESIGN.md motion)"],
];
const files = { "src/standards/standards.css": CSS, "src/standards/ui.css": UI, ...Object.fromEntries(SRC.map(f => [f, rd(f)])) };
for (const [f, txt] of Object.entries(files)) for (const [rx, lvl, msg] of rules) for (const m of txt.matchAll(rx)) (lvl === "error" ? errs : warns).push(`${f}:${lineOf(txt, m.index)} ${msg}`);

/* user-facing "..." instead of "…" in string literals of the app */
for (const f of SRC.filter(f => f.endsWith(".js"))) { const t = files[f]; for (const m of t.matchAll(/["'`>][^"'`<\n]{2,60}[a-z]\.\.\.["'`<]/gi)) warns.push(`${f}:${lineOf(t, m.index)} "..." in UI text → "…"`); }

/* DESIGN.md guarantees that must stay true */
if (!/prefers-reduced-motion:\s*reduce/.test(UI)) errs.push("ui.css: global prefers-reduced-motion rule missing");
if (!/:focus-visible/.test(UI)) errs.push("ui.css: global :focus-visible rule missing");
if (!/rel="preload" href="\/fonts\/inter-var-latin\.woff2"/.test(files["index.html"])) errs.push("index.html: Inter preload missing");
if (!/href="\/ui\.css"/.test(files["scripts/seo/prerender.mjs"])) errs.push("prerender.mjs: guide pages no longer link /ui.css");
const grad = [...UI.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => /background[^;]*linear-gradient/.test(m[2]) && !/\.skel\b/.test(m[1])).map(m => m[1].trim());
if (grad.length) errs.push(`ui.css: gradient backgrounds on ${grad.join(", ")} (only the Results "Best" card may use one)`);

console.log("design check", JSON.stringify(counts));
for (const w of warns) console.log("  warn ", w);
for (const e of errs) console.log("  ERROR", e);
console.log(errs.length ? `✗ ${errs.length} error(s), ${warns.length} warning(s)` : `✓ pass (${warns.length} warning(s))`);
process.exit(errs.length ? 1 : 0);
