/* High school athlete / parent / coach pages (Ryan 2026-10-13: "build anything and everything that will optimize seo for
   high school athletes, coaches and parents to find this website"). Called from prerender.mjs generate(); every number comes
   from the site's own standards data. Conversions match the app (front_template CONV). Pages:
     /how-fast/<mens|womens>-<event>.html             how fast you need to run an event in college (incl. HS events)
     /colleges-for/<mens|womens>-<event>-<mark>.html  which colleges a mark fits (a ladder of common marks per event)
     /convert/<conversion>.html                       HS -> college conversion tables
     /guides/*.html, /for-parents.html, /for-coaches.html, hubs /how-fast.html /convert.html /guides.html
     /embed.html + /embed-data.json                   free standards widget for high school / club team sites (backlinks) */
import { PARSE_SRC } from "./markparse.mjs";
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
const AGG = DIVS;
/* boys throw lighter implements in high school (12 lb shot, 1.6 kg discus) than college men (16 lb, 2 kg); no reliable conversion */
const IMPL = { "Shot Put": "High school boys throw a 12 lb shot; college men throw 16 lb. These are college marks with the 16 lb shot, so a high school mark will read higher than the college equivalent.", "Discus": "High school boys throw a 1.6 kg discus; college men throw 2 kg. These are college marks with the 2 kg discus, so a high school mark will read higher than the college equivalent." };
const HS = g => (g === "m" ? "Boys" : "Girls");
const DEF = { T: "The marks that typically grant a full-ride scholarship, depending on school funding.", R: "The range where coaches typically start recruiting conversations and scholarship discussions begin. Not a guarantee.", W: "The minimum mark required to earn a spot on the team." };
export const CONV = {
  "1600m": { to: "1500m", k: { m: 0.9314, w: 0.9314 }, how: "1600m × 0.9314 (1600m to mile ×1.0058, mile to 1500m ×0.926)" },
  "Mile": { to: "1500m", k: { m: 0.926, w: 0.926 }, how: "Mile × 0.926" },
  "3200m": { to: "3000m", k: { m: 0.9314, w: 0.9314 }, next: { to: "5000m", k: 1.7186 }, how: "3200m × 0.9314 = 3000m, then 3000m × 1.7186 = 5000m (Riegel formula)" },
  "300m Hurdles": { to: "400m Hurdles", k: { m: 1.41, w: 1.45 }, how: "men ×1.41, women ×1.45 (same hurdle height in high school and college)" },
  '110m Hurdles (39")': { to: "110m Hurdles", add: 0.5, how: "39-inch high school time + 0.5 seconds for the 42-inch college hurdles" } };
export const HS_EVENTS = ["100m", "200m", "400m", "800m", "1600m", "3200m", "100m Hurdles", '110m Hurdles (39")', "300m Hurdles", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Javelin", "Hammer"];
/* field events read "how far do you need to throw the shot put", "how high do you need to jump in the high jump" (Ryan 2026-10-16:
   the field pages said "run the Shot Put"); Javelin and Hammer added (keyword gap: throws cluster). URLs unchanged. */
export const howAsk = (e, cap) => { const x = e.toLowerCase(), H = s => cap ? s.replace(/\b(\w)(\w*)/g, (w, c, r) => ["to", "the", "in"].includes(w) ? w : c.toUpperCase() + r) : s;
  if (e === "High Jump" || e === "Pole Vault") return H(`how high do you need to ${e === "High Jump" ? "jump" : "vault"} in the `) + (cap ? e : x);
  if (/Jump/.test(e)) return H("how far do you need to jump in the ") + (cap ? e : x);
  if (/Shot|Discus|Javelin|Hammer/.test(e)) return H("how far do you need to throw the ") + (cap ? e : x);
  return H("how fast do you need to run the ") + e; };
const COLLEGE_EVENTS = ["100m", "200m", "400m", "800m", "1500m", "3000m", "5000m", "100m Hurdles", "110m Hurdles", "400m Hurdles", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus"];

export function hsPages({ S, CT, write, writeRaw, page, parse, esc, slug, schoolUrl, evPath, FIELD, SITE, gName }) {
  const raw = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const isF = e => FIELD.has(e);
  const ftin = x => { let i = Math.round((x / 0.0254) * 4) / 4, f = Math.floor(i / 12); i = i - f * 12; return `${f}'${String(i).replace(/\.0+$/, "")}"`; };
  const fmt = (e, x) => isF(e) ? `${ftin(x)} (${x.toFixed(2)}m)` : x >= 60 ? `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}` : x.toFixed(2);
  const nice = (e, x) => isF(e) ? ftin(x) : x >= 60 ? `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}` : x.toFixed(1);
  const toCollege = (e, g, v) => { const c = CONV[e]; if (!c) return [{ e, v }]; const a = c.add ? v + c.add : v * c.k[g]; const o = [{ e: c.to, v: a }]; if (c.next) o.push({ e: c.next.to, v: a * c.next.k }); return o; };
  const fromCollege = (e, g, v) => { const c = CONV[e]; if (!c) return v; return c.add ? v - c.add : v / c.k[g]; };
  const ce = e => (CONV[e] ? CONV[e].to : e);
  const meets = (e, v, m) => { const sv = parse(m, e); if (sv == null) return false; return isF(e) ? v >= sv - 1e-9 : v <= sv + 1e-9; };
  function tierOf(s, g, e, v) {
    const cand = raw(s, g, e) ? [{ e, v }] : toCollege(e, g, v).filter(x => raw(s, g, x.e));
    if (!cand.length) return null; const x = cand[0], t = raw(s, g, x.e);
    return meets(x.e, x.v, t[0]) ? "Target" : meets(x.e, x.v, t[1]) ? "Recruit" : t[2] && meets(x.e, x.v, t[2]) ? "Walk-On" : null;
  }
  const qs = vals => { vals = vals.filter(v => v != null).sort((a, b) => a - b); return vals.length < 12 ? null : [.25, .5, .75].map(q => vals[Math.floor(vals.length * q)]); };
  const levelVals = (d, g, e, j) => S.filter(s => s.d === d).map(s => { const t = raw(s, g, e); return t ? parse(t[j], e) : null; });
  const G = g => (g === "m" ? "mens" : "womens");
  const hsPath = (g, e) => `/how-fast/${G(g)}-${slug(e)}.html`;
  const fitPath = (g, e, v) => `/colleges-for/${G(g)}-${slug(e)}-${slug(nice(e, v))}.html`;
  const roundNice = (e, x) => { if (e === "High Jump" || e === "Pole Vault") return Math.round(x / 0.0508) * 0.0508; if (isF(e)) return Math.round(x / (e.includes("Jump") ? 0.1524 : 0.6096)) * (e.includes("Jump") ? 0.1524 : 0.6096);
    return x < 15 ? Math.round(x * 10) / 10 : x < 60 ? Math.round(x * 2) / 2 : x < 300 ? Math.round(x / 5) * 5 : Math.round(x / 10) * 10; };
  const ladders = [];

  /* 1. how fast do you need to run X in college */
  for (const g of ["m", "w"]) for (const e of HS_EVENTS) {
    if ((g === "w" && e.startsWith("110m")) || (g === "m" && e === "100m Hurdles")) continue;
    const c = ce(e), rows = [];
    for (const d of AGG) { const cells = [0, 1, 2].map(j => { if (j === 1 && (d === "NCAA D3" || d === "NAIA")) return null; const r = qs(levelVals(d, g, c, j)); return r ? r.map(x => fromCollege(e, g, x)) : null; }); if (cells.some(Boolean)) rows.push([d, cells]); }
    if (!rows.length) continue;
    const all = rows.flatMap(([, cl]) => cl.filter(Boolean).flatMap(r => [r[0], r[2]])).sort((a, b) => a - b);
    const lo0 = all[0], hi0 = all[all.length - 1], sp = hi0 - lo0, lo = isF(c) ? lo0 - sp * .3 : lo0, hi = isF(c) ? hi0 : hi0 + sp * .3;
    const ladder = [...new Set(Array.from({ length: 14 }, (_, i) => roundNice(e, lo + (hi - lo) * i / 13)).map(x => +x.toFixed(4)))]
      .filter(v => v > 0 && S.some(s => tierOf(s, g, e, v)));
    if (isF(c)) ladder.reverse();
    ladders.push([g, e, ladder]);
    const name = `${HS(g)} ${e}`, p = hsPath(g, e), cv = CONV[e];
    const span = r => fmt(e, r[0]) === fmt(e, r[2]) ? fmt(e, r[0]) : `${fmt(e, r[0])} to ${fmt(e, r[2])}`;
    const ans = rows.filter(([, cl]) => cl[2]).map(([d, cl]) => `${d} walk-on marks: ${span(cl[2])}`).join("; ") + ".";
    write(p, page({ title: `${howAsk(e, true).replace(/^h/, "H")} in College? (${HS(g)}) | Preferred Recruit`,
      desc: `${name} marks it takes to walk on, get recruited or be a target recruit in NCAA D1, D2, D3 and NAIA, from ${S.length.toLocaleString()} college programs.${cv ? ` High school ${e} converted to the college ${cv.to}.` : ""}`,
      pathname: p, crumbs: [["Home", "/"], ["How fast?", "/how-fast.html"], [name, p]], h1: `${esc(howAsk(e).replace(/^h/, "H"))} in college? (${HS(g)})`,
      intro: `The ${isF(c) ? "marks" : "times"} college programs list for ${esc(gName(g).toLowerCase())} ${esc(c)}, by division. Each range is the middle half of programs (25th to 75th percentile); a dash means too few programs list that level (NCAA D3 and NAIA use Target and Walk-On).${g === "m" && IMPL[e] ? ` <b>${esc(IMPL[e])}</b>` : ""}${cv ? ` Colleges run the ${esc(cv.to)}, so these are converted back to the high school ${esc(e)}: ${esc(cv.how)}.` : ""}`,
      body: `<div class="scroll"><table><tr><th>Division</th><th class="n">Walk-On</th><th class="n">Recruit</th><th class="n">Target</th></tr>${rows.map(([d, cl]) => `<tr><td>${esc(d)}</td>${[2, 1, 0].map(j => `<td class="n">${cl[j] ? esc(span(cl[j])) : "–"}</td>`).join("")}</tr>`).join("")}</table></div>
<p><b>Walk-On:</b> ${DEF.W} <b>Recruit:</b> ${DEF.R} <b>Target:</b> ${DEF.T}</p>
<h2>What colleges can I ${isF(c) ? "compete" : "run"} for?</h2><p>Pick the mark closest to yours, or <a href="/">enter your exact mark</a>.</p><div class="links">${ladder.map(v => `<a href="${fitPath(g, e, v)}">${esc(nice(e, v))} ${esc(e)}</a>`).join("")}</div>
<h2>Every school's ${esc(c)} standards</h2><div class="links">${DIVS.map(d => `<a href="${evPath(d, g, c)}">${esc(d)} ${esc(gName(g))} ${esc(c)}</a>`).join("")}</div>
${cv ? `<p><a href="/convert.html">High school to college conversion tables ›</a></p>` : ""}`,
      ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: `${howAsk(e).replace(/^h/, "H")} to compete in college (${HS(g)})?`, acceptedAnswer: { "@type": "Answer", text: ans } }] }] }));
  }

  /* 2. what colleges can I run for with <mark> */
  for (const [g, e, ladder] of ladders) ladder.forEach((v, i) => {
    const mk = nice(e, v), p = fitPath(g, e, v), c = ce(e);
    const hits = S.map(s => ({ s, t: tierOf(s, g, e, v) })).filter(z => z.t), by = l => hits.filter(z => z.t === l);
    const conv = CONV[e] ? toCollege(e, g, v).map(z => `${fmt(z.e, z.v)} ${z.e}`).join(" / ") : "";
    const counts = DIVS.map(d => [d, hits.filter(z => z.s.d === d).length]).filter(z => z[1]);
    const list = l => { const L = by(l).sort((a, b) => DIVS.indexOf(a.s.d) - DIVS.indexOf(b.s.d) || a.s.n.localeCompare(b.s.n)); return L.length ? `<h2>${l} (${L.length})</h2><p>${DEF[l[0]]}</p><div class="links">${L.slice(0, 150).map(z => `<a href="${schoolUrl(z.s)}">${esc(z.s.n)} <small>${esc(z.s.d)}</small></a>`).join("")}</div>${L.length > 150 ? `<p>And ${L.length - 150} more. <a href="/">Search your exact mark</a>.</p>` : ""}` : ""; };
    const nb = [ladder[i - 1], ladder[i + 1]].filter(x => x != null).map(x => `<a href="${fitPath(g, e, x)}">${esc(nice(e, x))} ${esc(e)}</a>`).join(" · ");
    write(p, page({ title: `What Colleges Can I ${isF(c) ? "Compete" : "Run"} For With a ${mk} ${e.replace('110m Hurdles (39")', '39" Hurdles')}? (${HS(g)}) | Preferred Recruit`,
      desc: `A ${HS(g).toLowerCase().slice(0, -1)}s' ${mk} ${e} meets a listed standard at ${hits.length} college track programs: ${by("Target").length} Target, ${by("Recruit").length} Recruit and ${by("Walk-On").length} Walk-On across NCAA D1, D2, D3 and NAIA.`,
      pathname: p, crumbs: [["Home", "/"], [`How fast: ${HS(g)} ${e}`, hsPath(g, e)], [`${mk} ${e}`, p]], h1: `What colleges can I ${isF(c) ? "compete" : "run"} for with a ${esc(mk)} ${esc(e)}?`,
      intro: `A ${HS(g).toLowerCase().slice(0, -1)}s' ${esc(mk)} ${esc(e)}${conv ? ` (about ${esc(conv)} in college)` : ""} fits <b>${hits.length}</b> college programs. ${counts.map(([d, n]) => `${esc(d)}: ${n}`).join(" · ")}. <a href="/">Enter your exact mark</a> for your own list.${g === "m" && IMPL[e] ? ` <b>${esc(IMPL[e])}</b>` : ""}`,
      body: (list("Target") + list("Recruit") + list("Walk-On") || "<p>No listed standard at this mark yet.</p>") + (nb ? `<h2>Nearby marks</h2><p>${nb}</p>` : ""),
      ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: `What colleges can I ${isF(c) ? "compete" : "run"} for with a ${mk} ${e}?`, acceptedAnswer: { "@type": "Answer", text: `A ${gName(g).toLowerCase()} ${mk} ${e} meets a listed recruiting standard at ${hits.length} college track programs (${counts.map(([d, n]) => `${d} ${n}`).join(", ")}).` } }] }] }));
  });

  /* 3. conversion tables */
  const convPages = [
    ["1600m-to-1500m-conversion", "1600m to 1500m Conversion", "1600m", "m", [240, 400, 5]],
    ["mile-to-1500m-conversion", "Mile to 1500m Conversion", "Mile", "m", [240, 400, 5]],
    ["3200m-to-3000m-and-5000m-conversion", "3200m to 3000m and 5000m Conversion", "3200m", "m", [510, 840, 10]],
    ["300m-hurdles-to-400m-hurdles-boys", "300m Hurdles to 400m Hurdles Conversion (Boys)", "300m Hurdles", "m", [35, 46, 0.5]],
    ["300m-hurdles-to-400m-hurdles-girls", "300m Hurdles to 400m Hurdles Conversion (Girls)", "300m Hurdles", "w", [41, 56, 0.5]],
    ["39-inch-to-42-inch-110m-hurdles-conversion", "39-inch to 42-inch 110m Hurdles Conversion", '110m Hurdles (39")', "m", [13.6, 18, 0.2]]];
  for (const [s, t, e, g, [a, b, st]] of convPages) {
    const p = `/convert/${s}.html`, rows = []; for (let v = a; v <= b + 1e-9; v += st) rows.push([+v.toFixed(2), toCollege(e, g, +v.toFixed(2))]);
    write(p, page({ title: `${t} Table for High School Athletes | Preferred Recruit`, desc: `${t} table for high school athletes: every ${e} time next to its college ${CONV[e].to} equivalent, the same conversion this site uses for college recruiting standards.`,
      pathname: p, crumbs: [["Home", "/"], ["Conversions", "/convert.html"], [t, p]], h1: esc(t),
      intro: `High school and college race different distances or hurdle heights, so college standards need a conversion: ${esc(CONV[e].how)}. These are standard coaching conversions, a close estimate rather than an exact race result. The standards search on this site applies them automatically.`,
      body: `<div class="scroll"><table><tr><th>High school ${esc(e)}</th>${rows[0][1].map(z => `<th class="n">College ${esc(z.e)}</th>`).join("")}</tr>${rows.map(([v, cl]) => `<tr><td>${esc(fmt(e, v))}</td>${cl.map(z => `<td class="n">${esc(fmt(z.e, z.v))}</td>`).join("")}</tr>`).join("")}</table></div>
<p><a href="${hsPath(g, HS_EVENTS.includes(e) ? e : "1600m")}">${esc(howAsk(HS_EVENTS.includes(e) ? e : "1600m").replace(/^h/, "H"))} in college? ›</a></p>` }));
  }

  /* 4. guides + audience pages */
  const cmpEv = [["m", "100m"], ["m", "400m"], ["m", "1500m"], ["m", "Long Jump"], ["w", "100m"], ["w", "400m"], ["w", "1500m"], ["w", "Long Jump"]];
  const med = (d, g, e) => { const r = qs(levelVals(d, g, e, 2)); return r ? (isF(e) ? ftin(r[1]) : fmt(e, r[1])) : "–"; };
  const P1 = "/guides/ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field.html", P2 = "/guides/target-recruit-walk-on-explained.html";
  write(P1, page({ title: "NCAA D1 vs D2 vs D3 vs NAIA Track & Field Standards Compared | Preferred Recruit",
    desc: `How college track and field divisions compare: number of programs and the typical walk-on mark in key events for NCAA D1, D2, D3 and NAIA, from ${S.length.toLocaleString()} programs.`,
    pathname: P1, crumbs: [["Home", "/"], ["Guides", "/guides.html"], ["Divisions compared", P1]], h1: "NCAA D1 vs D2 vs D3 vs NAIA track &amp; field",
    intro: "The same mark can be a walk-on at one level and a target recruit at another. Here is how the divisions compare, using the median Walk-On mark across every program on this site.",
    body: `<div class="scroll"><table><tr><th>Division</th><th class="n">Programs</th>${cmpEv.map(([g, e]) => `<th class="n">${g === "m" ? "Men" : "Women"} ${esc(e)}</th>`).join("")}</tr>${AGG.map(d => `<tr><td>${esc(d)}</td><td class="n">${S.filter(s => s.d === d).length}</td>${cmpEv.map(([g, e]) => `<td class="n">${esc(med(d, g, e))}</td>`).join("")}</tr>`).join("")}</table></div>
<p>Median Walk-On standard by division. NCAA D3 programs do not offer athletic scholarships.</p><div class="links">${DIVS.flatMap(d => [["m", "100m"], ["w", "100m"]].map(([g, e]) => `<a href="${evPath(d, g, e)}">${esc(d)} ${esc(gName(g))} ${e} standards</a>`)).join("")}</div>` }));
  write(P2, page({ title: "Target, Recruit and Walk-On Track Standards Explained | Preferred Recruit", desc: "What Target, Recruit and Walk-On mean on college track and field recruiting standards, how each school's levels are set, and which mark gets you on a roster.",
    pathname: P2, crumbs: [["Home", "/"], ["Guides", "/guides.html"], ["Levels explained", P2]], h1: "Target, Recruit and Walk-On, explained",
    body: `<h2>Target</h2><p>${DEF.T}</p><h2>Recruit</h2><p>${DEF.R}</p><h2>Walk-On</h2><p>${DEF.W}</p>
<h2>How the levels are set</h2><p>${S.filter(s => s.o).length} schools publish their own standards. Those are marked ★ official and checked mark for mark against the school's site. For every other school, the levels come from its conference's 2026 results. In NCAA D1 and D2, Target is the 8th best mark in the conference, Recruit the 15th and Walk-On the 25th. In NCAA D3 and NAIA, Target is a top 8 conference mark and Walk-On the 40th.</p><p><a href="/">Search your mark ›</a></p>` }));
  const pop = g => ["100m", "400m", "800m", "1600m", "3200m", "Long Jump"].map(e => `<a href="${hsPath(g, e)}">${g === "m" ? "Boys" : "Girls"}: how fast for college in the ${e}?</a>`).join("");
  write("/for-parents.html", page({ title: "College Track & Field Recruiting Standards: A Guide for Parents | Preferred Recruit",
    desc: `Where could your athlete run in college? A parent's guide to track recruiting standards: see how their marks fit ${S.length.toLocaleString()} programs in NCAA D1, D2, D3 and NAIA.`,
    pathname: "/for-parents.html", crumbs: [["Home", "/"], ["For parents", "/for-parents.html"]], h1: "College track recruiting, for parents",
    intro: "If your son or daughter runs, jumps or throws in high school, the first question is usually: where could they compete in college? This site answers it with real numbers.",
    body: `<h2>Start here</h2><ol><li><a href="/">Enter their event and best mark</a>. High school 1600m, 3200m and 300m hurdle times are converted for you.</li><li>See every college where that mark is a Target, Recruit or Walk-On level.</li><li>Open any school for its full standards, roster and coaching staff links.</li></ol>
<h2>Common questions</h2><div class="links">${pop("m")}${pop("w")}<a href="${P1}">D1 vs D2 vs D3 vs NAIA</a><a href="${P2}">What Target, Recruit and Walk-On mean</a><a href="/explore.html">Every conference and state</a></div>` }));
  const SNIP = `<iframe src="${SITE}/embed.html" title="College track and field standards finder" width="100%" height="480" style="border:0;border-radius:16px;max-width:560px" loading="lazy"></iframe>\n<p style="font:13px sans-serif">Powered by <a href="${SITE}/">Preferred Recruit Track &amp; Field Standards</a></p>`;
  write("/for-coaches.html", page({ title: "Free College Track Standards Widget for High School Coaches | Preferred Recruit",
    desc: "A free tool for high school and club track coaches: add a college recruiting standards finder to your team website so athletes can see which college programs their marks fit.",
    pathname: "/for-coaches.html", crumbs: [["Home", "/"], ["For coaches", "/for-coaches.html"]], h1: "A free college standards finder for your team site",
    intro: "Your athletes ask where their marks could take them. Add this free finder to your team or club website: they pick an event, enter a mark and see how many college programs it fits, by level and division.",
    body: `<h2>Preview</h2><iframe src="/embed.html" title="College track and field standards finder" width="100%" height="480" style="border:0;border-radius:16px;max-width:560px;background:#fff" loading="lazy"></iframe>
<h2>Copy this onto your site</h2><p>Paste it anywhere your site builder accepts HTML. Wix, Squarespace, WordPress, Google Sites and most team-site builders have an "embed code" block.</p><pre style="white-space:pre-wrap;background:#fff;border:1px solid #E4E3EA;border-radius:12px;padding:14px;font-size:13px">${esc(SNIP)}</pre>
<h2>Pages to share with athletes</h2><div class="links"><a href="/how-fast.html">How fast do you need to run in college? (every event)</a><a href="/convert.html">High school to college conversions</a><a href="${P2}">Levels explained</a><a href="${P1}">Divisions compared</a><a href="/explore.html">Every conference and state</a></div>` }));
  const hub = (p, title, h, desc, items) => write(p, page({ title: `${title} | Preferred Recruit`, desc, pathname: p, crumbs: [["Home", "/"], [h, p]], h1: esc(h), body: `<div class="links">${items.map(([u, x]) => `<a href="${u}">${esc(x)}</a>`).join("")}</div>` }));
  hub("/how-fast.html", "How Fast Do You Need to Run in College? Every Event", "How fast do you need to run in college?", "College track and field standards for every high school event: 100m to 3200m, hurdles, jumps and throws, by division.", ladders.map(([g, e]) => [hsPath(g, e), `${g === "m" ? "Boys" : "Girls"} ${e}`]));
  hub("/convert.html", "High School to College Track Conversions", "High school to college conversions", "Convert high school 1600m, mile, 3200m, 300m hurdle and 39-inch hurdle times to college events: the conversion tables behind every college recruiting standard.", convPages.map(([s, t]) => [`/convert/${s}.html`, t]));
  hub("/guides.html", "College Track Recruiting Guides", "Guides", "College track and field recruiting guides for athletes, parents and coaches: what the levels mean, how D1, D2, D3 and NAIA compare, and how junior college works.", [[P2, "Target, Recruit and Walk-On explained"], [P1, "D1 vs D2 vs D3 vs NAIA"], ["/guides/junior-college-track-and-field-recruiting.html", "Junior college (NJCAA) recruiting"], ["/for-parents.html", "For parents"], ["/for-coaches.html", "For coaches"], ["/how-fast.html", "How fast do you need to run?"], ["/convert.html", "Conversions"]]);

  /* 5. embed widget: compact data (deduped threshold triples) + standalone page */
  /* rows are per school, chosen exactly like the pages (school's own HS-event chart first, else the converted college event),
     then expressed in high school units and deduped: [divIdx, T, R, W, count] */
  const opts = g => HS_EVENTS.filter(e => !((g === "w" && e.startsWith("110m")) || (g === "m" && e === "100m Hurdles")));
  const data = { divs: DIVS, ev: {} };
  for (const g of ["m", "w"]) for (const e of opts(g)) {
    const cnt = new Map();
    for (const s of S) {
      let ev = e, t = raw(s, g, e);
      if (!t) { const x = toCollege(e, g, 1).find(z => raw(s, g, z.e)); if (!x) continue; ev = x.e; t = raw(s, g, ev); }
      const back = x => ev === e ? x : ev === CONV[e].to ? fromCollege(e, g, x) : fromCollege(e, g, x / CONV[e].next.k);
      const v = t.map(m => { const x = parse(m, ev); return x == null ? null : +back(x).toFixed(isF(ev) ? 3 : 2); });
      if (v.every(x => x == null)) continue;
      const k = JSON.stringify([DIVS.indexOf(s.d), ...v]); cnt.set(k, (cnt.get(k) || 0) + 1);
    }
    if (cnt.size) data.ev[g + "|" + e] = [...cnt].map(([k, n]) => [...JSON.parse(k), n]);
  }
  writeRaw("/embed-data.json", JSON.stringify(data));
  writeRaw("/embed.html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>College Track Standards Finder</title><script defer src="/_vercel/insights/script.js"></script><script defer src="/_vercel/speed-insights/script.js"></script>
<style>*{box-sizing:border-box}html,body{margin:0;background:#fff}body{font:15px/1.45 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#0B0B0F;padding:18px}
h1{font-size:19px;letter-spacing:-.02em;margin:0 0 4px}p.s{margin:0 0 14px;color:#4A4A52;font-size:13px}.row{display:flex;gap:8px;flex-wrap:wrap}
select,input,button{font:inherit;padding:10px 12px;border:1px solid #DCDAE5;border-radius:12px;background:#FAFAFC;color:#0B0B0F}select{flex:1 1 120px}input{flex:1 1 110px;min-width:0}
button{background:linear-gradient(135deg,#A98BFF,#7A45F0 55%,#4E22C2);color:#fff;border:0;font-weight:650;cursor:pointer}
.out{margin-top:16px;padding:14px;border-radius:14px;background:#F5F3FD;min-height:84px}.big{font-size:28px;font-weight:700;letter-spacing:-.03em}
.lv{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;margin:6px 0}.lv b{font-size:16px}.dv{font-size:12px;color:#4A4A52}.err{color:#B42318}
a{color:#7A45F0;font-weight:600}.ft{margin-top:12px;font-size:12px;color:#4A4A52;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}</style></head><body>
<h1>Where could you compete in college?</h1><p class="s">Pick an event, enter your best high school mark.</p>
<div class="row"><select id="g" aria-label="Gender"><option value="m">Boys</option><option value="w">Girls</option></select><select id="e" aria-label="Event"></select></div>
<div class="row" style="margin-top:8px"><input id="v" placeholder="e.g. 4:35 or 20-6" aria-label="Your mark" inputmode="text"><button id="go">Check</button></div>
<div class="out" id="out">Your mark is compared with ${S.length.toLocaleString()} college programs' recruiting standards.</div>
<div class="ft"><span>Powered by <a href="${SITE}/" target="_blank" rel="noopener">Preferred Recruit Track Standards</a></span><a id="all" href="${SITE}/" target="_blank" rel="noopener">See every school ›</a></div>
<script>
const OPTS={m:${JSON.stringify(opts("m"))},w:${JSON.stringify(opts("w"))}},CONV=${JSON.stringify(CONV)},FIELD=new Set(${JSON.stringify([...FIELD])}),DEF=${JSON.stringify(DEF)};const IMPL=${JSON.stringify(IMPL)};
const $=id=>document.getElementById(id);let D=null;fetch("/embed-data.json").then(r=>r.json()).then(j=>D=j);
function fill(){const g=$("g").value;$("e").innerHTML=OPTS[g].map(e=>"<option>"+e.replace(/"/g,"&quot;")+"</option>").join("");}
$("g").onchange=fill;fill();
${PARSE_SRC}
var parse=parseMark;
function check(){const g=$("g").value,e=$("e").value,v=parse($("v").value,e),o=$("out");
 if(v==null){o.innerHTML='<span class="err">Enter a mark like 11.20, 4:35, 9:58 or 20-6.</span>';return}
 if(!D){o.textContent="Loading…";setTimeout(check,300);return}
 const c=CONV[e],f=FIELD.has(e),ok=t=>t!=null&&(f?v>=t-1e-9:v<=t+1e-9);
 const T={Target:0,Recruit:0,"Walk-On":0},byD=D.divs.map(()=>0);
 for(const[d,t,rc,w,n]of(D.ev[g+"|"+e]||[])){const l=ok(t)?"Target":ok(rc)?"Recruit":ok(w)?"Walk-On":null;if(l){T[l]+=n;byD[d]+=n}}
 const tot=T.Target+T.Recruit+T["Walk-On"];
 o.innerHTML='<div class="big">'+tot.toLocaleString()+' college programs</div><div class="lv"><span><b>'+T.Target+'</b> Target</span><span><b>'+T.Recruit+'</b> Recruit</span><span><b>'+T["Walk-On"]+'</b> Walk-On</span></div><div class="dv">'+D.divs.map((d,i)=>byD[i]?d+": "+byD[i]:"").filter(Boolean).join(" · ")+'</div>'+(g==="m"&&IMPL[e]?'<div class="dv">'+IMPL[e]+'</div>':"")+(c?'<div class="dv">High school '+e+' converted to the college '+c.to+' where needed.</div>':"");}
$("go").onclick=check;$("v").onkeydown=ev=>{if(ev.key==="Enter")check()};
</script></body></html>`);
}
