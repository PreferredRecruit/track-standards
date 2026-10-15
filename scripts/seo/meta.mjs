/* Search titles and descriptions (Ryan 2026-10-15: "optimized for track and field recruiting ... 155-160 characters ...
   documentary-style authority"). Every generated page runs its title/description through these so they share one voice:
   titles fit Google's ~60-character display (brand appended only when it fits), descriptions land at 150-160 characters,
   and "scholarship" is never used for NCAA D3 (no athletic aid). No em dashes (house copy rule). */
export const SEASON = "2026-27";
export const BRAND = "Preferred Recruit";

/* what the levels are called in copy, by division (D3/NAIA have no Recruit level; D3 has no athletic scholarships) */
export const levelWords = d => d === "NCAA D3" ? "walk-on and target" : d === "NAIA" ? "walk-on and scholarship-level" : d === "NJCAA" ? "season results" : "walk-on, recruit and scholarship-level";

export function fitTitle(t) {
  t = String(t).replace(/\s*[|·]\s*Preferred Recruit\s*$/, "").replace(/\s+/g, " ").trim();
  /* shorten in steps until it fits Google's ~60-character display; brand only when there's room */
  const steps = [x => x, x => x.replace(/: Every School$/, ""), x => x.replace(" Track & Field ", " Track "), x => x.replace(/ \d{4}-\d{2}\b/, ""),
    x => x.replace(/^(.*?) (University|College)( of [A-Z][\w.&' -]*)?(?= Track)/, (m, a, u, o) => o ? `${u}${o}` : a),
    x => x.replace(" Table for High School Athletes", "").replace(" Conversion", "")];
  let cur = t;
  for (const f of steps) { cur = f(cur); if (`${cur} | ${BRAND}`.length <= 62) return `${cur} | ${BRAND}`; if (cur.length <= 60) return cur; }
  return cur;
}

/* factual closers that bring a short description up to 150+ characters; only phrases true for that page type:
   "results" = weekly TFRRS data (results, champions), "standards" = NCAA/NAIA standards pages, "general" = guides, tools */
const TAILS = {
  results: [" Updated weekly from TFRRS.", " Free, no sign-up.", " Updated weekly.", " Free to use.", " Free."],
  standards: [" NCAA D1, D2, D3 and NAIA.", " Free, no sign-up.", " Free to use.", " Free."],
  general: [" Free, no sign-up.", " Free to use.", " Free."] };
export const tailsFor = path => /^\/(results|champions)\//.test(path) ? TAILS.results : /^\/(standards|conferences|states|colleges-for|how-fast)\/|^\/(explore|how-fast)\.html$|^\/$/.test(path) ? TAILS.standards : TAILS.general;
/* pick the first candidate that fits 160 (whole sentences, never a mid-list cut), then pad with true closers */
export function pickDesc(cands, tails) { const c = cands.map(x => String(x).replace(/\s+/g, " ").trim()).find(x => x.length <= 160) || cands[cands.length - 1]; return fitDesc(c, tails); }
export function fitDesc(d, tails = TAILS.general) {
  d = String(d).replace(/\s+/g, " ").replace(/\s—\s|—/g, ", ").replace(/\.\.+/g, ".").trim();
  if (d.length > 160) {
    /* keep whole sentences: cut at the last sentence end inside 160, else at the last clause break */
    const head = d.slice(0, 160);
    let i = Math.max(head.lastIndexOf(". "), head.endsWith(".") ? 159 : -1);
    if (i >= 100) d = d.slice(0, i + 1);
    else { const j = Math.max(head.lastIndexOf(", "), head.lastIndexOf(": ")); d = (j >= 100 ? d.slice(0, j) : head.slice(0, head.lastIndexOf(" "))).replace(/[,:;(\s-]+$/, "") + "."; }
  }
  /* at most one closer per family ("Free..." / "Updated weekly..." / divisions) so it never reads as padding */
  const fam = t => /free/i.test(t) ? "free" : /weekly/i.test(t) ? "weekly" : "div";
  const used = new Set([...(/free/i.test(d) ? ["free"] : []), ...(/weekly/i.test(d) ? ["weekly"] : [])]);
  for (const t of tails) { if (d.length >= 150) break; if (used.has(fam(t))) continue; if (d.length + t.length <= 160) { d += t; used.add(fam(t)); } }
  return d;
}
