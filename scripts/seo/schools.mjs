/* Pre-built school pages (Ryan 2026-10-14: "optimize everything we can"). The 1,269 school pages are the site's most valuable
   URLs but render in the browser, so crawlers first see an empty shell. For every school this writes:
     dist/schools/<slug>.html      the app shell with that school's title, description, canonical, structured data and the full
                                   standards + season bests as real HTML inside #root (the app replaces it when it starts)
     dist/data/teams/<slug>.json   the school's season bests from the latest outdoor TFRRS lists (the app shows the same table)
   Served at /schools/<slug> on hosts that map clean URLs to .html (vercel.json). On Lovable the SPA still serves that path. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const DK = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia", NJCAA: "njcaa" };

export function schoolPages({ root, out, S, SITE, QUIZ, esc, schoolSlug, std, EVENTS, STATE, evLabel, confUrl, statePath, evPath, gName }) {
  const shellFile = path.join(out, "index.html");
  if (!fs.existsSync(shellFile)) return [];
  const shell = fs.readFileSync(shellFile, "utf8");
  const idx = JSON.parse(fs.readFileSync(path.join(out, "data/rank_index.json"), "utf8"));
  const year = idx.filter(x => x.season === "outdoor").map(x => x.year).sort().pop();
  const RK = {};
  for (const [d, k] of Object.entries(DK)) {
    const f = path.join(out, "data/rank", `${year}-outdoor-${k}.dat`);
    if (fs.existsSync(f)) RK[d] = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
  }
  const order = e => { const i = EVENTS.indexOf(e); return i < 0 ? 99 : i; };

  /* a team's best mark per event: conference list = the non-national list where the team appears most; national = first national list */
  function bests(s) {
    const D = RK[s.d]; if (!D) return null;
    const ti = D.teams.indexOf(s.t); if (ti < 0) return null;
    const nat = D.lists.find(l => l.nat);
    let conf = null, most = 0;
    const norm = x => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
    conf = D.lists.find(l => !l.nat && !l.champ && norm(l.label) === norm(s.c)) || null;
    if (!conf) for (const l of D.lists) { if (l.nat || l.champ || /region|qualif|ecac|ic4a/i.test(l.label)) continue; let n = 0; for (const g of ["m", "w"]) for (const rows of Object.values(l.g[g] || {})) for (const r of rows) if (r[3] === ti) n++; if (n > most) { most = n; conf = l; } }
    const o = { y: year, conf: conf ? conf.label : null, nat: nat ? nat.label : null, m: [], w: [] };
    for (const g of ["m", "w"]) {
      const map = new Map();
      for (const [L, key] of [[conf, "cp"], [nat, "np"]]) {
        if (!L) continue;
        for (const [ev, rows] of Object.entries(L.g[g] || {})) {
          const e = evLabel(ev); if (/relay/i.test(e)) continue;
          const r = rows.find(x => x[3] === ti); if (!r) continue;
          const cur = map.get(e) || { e, mk: r[4], w: r[5] || "", a: r[1], ap: r[9] || "" };
          cur[key] = r[0]; map.set(e, cur);
        }
      }
      o[g] = [...map.values()].sort((a, b) => order(a.e) - order(b.e));
    }
    return o.m.length || o.w.length ? o : null;
  }

  const files = [];
  const tbl = (head, rows) => `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr>${head.map(h => `<th style="text-align:left;padding:8px;border-bottom:1px solid #E4E3EA">${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(c => `<td style="padding:8px;border-bottom:1px solid #EEE">${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const byConf = new Map(), byState = new Map();
  for (const x of S) { const k = x.d + "|" + x.c; if (!byConf.has(k)) byConf.set(k, []); byConf.get(k).push(x); if (x.s) { if (!byState.has(x.s)) byState.set(x.s, []); byState.get(x.s).push(x); } }
  const KEY = ["100m", "200m", "400m", "800m", "1500m", "5000m", "110m Hurdles", "100m Hurdles", "Long Jump", "High Jump", "Shot Put"];
  /* common questions, answered from the school's own standards (also sent as FAQPage structured data) */
  function faq(s, B) {
    const J = s.d === "NJCAA", lvl = J ? "top-150 national" : "Walk-On", q = [];
    const marks = g => KEY.map(e => { const t = std(s, g, e); return t && t[2] ? `${e} ${t[2].replace(/ est\.$/, "")}` : null; }).filter(Boolean).slice(0, 6);
    const m = marks("m"), w = marks("w");
    q.push([`What are the ${s.n} track and field recruiting standards?`, `${s.n} is ${/^[AEIOUN]/.test(s.d) ? "an" : "a"} ${s.d} program${s.c !== s.d ? ` in the ${s.c}` : ""}. ${s.o ? `Its standards come from the school's own published chart${s.yr ? ` (${s.yr})` : ""}.` : J ? "As a junior college, its benchmarks come from this season's NJCAA national list: the 30th, 75th and 150th best marks in the country." : "Its Target, Recruit and Walk-On levels are set from 2026 conference results."} The full table for men and women is on this page.`]);
    if (m.length || w.length) q.push([J ? `What marks rank in the NJCAA top 150 for ${s.n}?` : `What times do you need to walk on at ${s.n}?`, [m.length ? `Men's ${lvl}: ${m.join(", ")}.` : "", w.length ? `Women's ${lvl}: ${w.join(", ")}.` : ""].filter(Boolean).join(" ")]);
    q.push([`What conference is ${s.n} track and field in?`, `${s.n} competes in ${s.c !== s.d ? `the ${s.c} (${s.d})` : `the ${s.d}`}${s.s ? ` and is based in ${STATE[s.s] || s.s}` : ""}.`]);
    if (B) { const top = g => (B[g] || []).slice(0, 4).map(r => `${r.e} ${r.mk}${parseFloat(r.w) > 2 ? "w" : ""}`); const bm = top("m"), bw = top("w");
      if (bm.length || bw.length) q.push([`What are ${s.n}'s best track and field marks in ${B.y}?`, [bm.length ? `Men: ${bm.join(", ")}.` : "", bw.length ? `Women: ${bw.join(", ")}.` : ""].filter(Boolean).join(" ") + " From TFRRS outdoor lists."]); }
    return q;
  }
  const related = s => {
    const conf = (byConf.get(s.d + "|" + s.c) || []).filter(x => x !== s).sort((a, b) => a.n.localeCompare(b.n)).slice(0, 12);
    const st = s.s ? (byState.get(s.s) || []).filter(x => x !== s && !conf.includes(x)).sort((a, b) => a.n.localeCompare(b.n)).slice(0, 12) : [];
    return [conf, st];
  };
  for (const s of S) {
    const slug = schoolSlug(s), p = `/schools/${slug}`, url = SITE + p, J = s.d === "NJCAA";
    const B = bests(s);
    if (B) { const f = path.join(out, "data/teams", slug + ".json"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(B)); }
    const pick = (g, e) => { const t = std(s, g, e); return t ? t[2] : null; };
    const ex = [["m", "100m"], ["w", "400m"], ["m", "1500m"]].map(([g, e]) => [g, e, pick(g, e)]).filter(x => x[2]).slice(0, 2);
    const title = `${s.n} Track & Field Standards (${s.d}) | Preferred Recruit`;
    const desc = `${s.n} track and field recruiting standards for men and women (${s.d}${s.c !== s.d ? ", " + s.c : ""})${s.o ? ", from the school's official published standards" : ""}${ex.length ? `: ${ex.map(([g, e, v]) => `${g === "m" ? "men's" : "women's"} ${e} ${J ? "top-150" : "walk-on"} ${v}`).join(", ")}` : ""}${B ? `, plus ${B.y} season bests` : ""}.`;
    const ld = [{ "@context": "https://schema.org", "@type": "SportsOrganization", name: s.n + " Track & Field", sport: "Track and Field", url, description: desc,
      memberOf: { "@type": "SportsOrganization", name: s.c }, ...(s.s ? { address: { "@type": "PostalAddress", addressRegion: s.s } } : {}), sameAs: [s.ws, s.rs, s.src, s.u].filter(Boolean) },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq(s, B).map(([qq, aa]) => ({ "@type": "Question", name: qq, acceptedAnswer: { "@type": "Answer", text: aa } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], [s.c, confUrl(s)], [s.n, p]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) }];
    const side = g => {
      const off = s.o && (s.off || {})[g];
      if (off) return tbl(["Event", ...off.tiers.map(esc)], off.rows.map(r => [esc(r[0]), ...off.tiers.map((_, i) => esc(r[i + 1] || "–"))]));
      const ev = EVENTS.filter(e => std(s, g, e));
      return ev.length ? tbl(["Event", ...(J ? ["Top 30 nationally", "Top 75", "Top 150"] : ["Target", "Recruit", "Walk-On"])], ev.map(e => [`<a href="${evPath(s.d, g, e)}">${esc(e)}</a>`, ...std(s, g, e).map(x => esc(x || "–"))])) : "<p>No marks listed yet.</p>";
    };
    const bestTbl = g => B && B[g].length ? `<h3>${gName(g)}</h3>` + tbl(["Event", "Mark", "Athlete", B.conf ? "Conference rank" : "", "National rank"].filter(Boolean),
      B[g].map(r => [esc(r.e), esc(r.mk) + (parseFloat(r.w) > 2 ? "w" : ""), esc(r.a), ...(B.conf ? [r.cp ? "#" + r.cp : "–"] : []), r.np ? "#" + r.np : "–"])) : "";
    const links = [[s.src && s.o, s.src, "Official standards source"], [s.rs, s.rs, "Roster"], [s.cu, s.cu, "Coaching staff"], [s.ws, s.ws, "Athletics website"], [s.u, s.u, "Team on TFRRS"]].filter(x => x[0]);
    const body = `<main style="max-width:960px;margin:0 auto;padding:28px 20px 60px;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#0B0B0F">
<nav style="font-size:13px"><a href="/">Track Standards</a> › <a href="${confUrl(s)}">${esc(s.c)}</a>${s.s ? ` › <a href="${statePath(s.s)}">${esc(STATE[s.s] || s.s)}</a>` : ""}</nav>
<h1>${esc(s.n)} Track &amp; Field Standards${s.o ? " ★" : ""}</h1>
<p>${esc(s.n)} is ${/^[AEIOUN]/.test(s.d) ? "an" : "a"} ${esc(s.d)} track and field program${s.c !== s.d ? ` in the ${esc(s.c)}` : ""}${s.s ? `, based in ${esc(STATE[s.s] || s.s)}` : ""}. ${J ? "Below are this season's NJCAA national benchmarks: the marks that rank in the top 30, top 75 and top 150 in the country." : `Below are the marks it takes to be a Target recruit, a Recruit or a Walk-On for men and women in every event${s.o ? ", from the school's own published standards" : ", set from its 2026 conference results"}.`}</p>
<h2>Men's standards</h2>${side("m")}<h2>Women's standards</h2>${side("w")}
${B ? `<h2>${B.y} season bests</h2><p>${esc(s.n)}'s best mark in each event this outdoor season on TFRRS${B.conf ? `, with its rank in the ${esc(B.conf)} list` : ""}. A w marks a wind-aided mark.</p>${bestTbl("m")}${bestTbl("w")}` : ""}
${(() => { const q = faq(s, B); return `<h2>Common questions</h2>${q.map(([qq, aa]) => `<h3>${esc(qq)}</h3><p>${esc(aa)}</p>`).join("")}`; })()}
${(() => { const [c, st] = related(s); return (c.length ? `<h2>More ${esc(s.c)} programs</h2><ul style="columns:3 200px">${c.map(x => `<li><a href="/schools/${schoolSlug(x)}">${esc(x.n)}</a></li>`).join("")}</ul>` : "") + (st.length ? `<h2>More college programs in ${esc(STATE[s.s] || s.s)}</h2><ul style="columns:3 200px">${st.map(x => `<li><a href="/schools/${schoolSlug(x)}">${esc(x.n)}</a> <small>${esc(x.d)}</small></li>`).join("")}</ul>` : ""); })()}
${links.length ? `<h2>Links</h2><ul>${links.map(([, u, t]) => `<li><a href="${esc(u)}" rel="noopener">${t}</a></li>`).join("")}</ul>` : ""}
<p><a href="${confUrl(s)}">All ${esc(s.c)} standards</a>${s.s ? ` · <a href="${statePath(s.s)}">College track in ${esc(STATE[s.s] || s.s)}</a>` : ""} · <a href="/how-fast.html">How fast do you need to run in college?</a> · <a href="${QUIZ}">Free recruitment evaluation</a></p>
</main>`;
    const meta = (h, attr, key, val) => { const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`); const tag = `<meta ${attr}="${key}" content="${esc(val)}" />`; return re.test(h) ? h.replace(re, tag) : h.replace("</head>", tag + "\n</head>"); };
    let h = shell.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`).replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
    h = meta(h, "name", "description", desc); h = meta(h, "property", "og:url", url); h = meta(h, "property", "og:title", title); h = meta(h, "property", "og:description", desc);
    h = meta(h, "name", "twitter:title", title); h = meta(h, "name", "twitter:description", desc);
    h = h.replace("</head>", ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("") + "\n</head>").replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const f = path.join(out, "schools", slug + ".html"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h); files.push(p);
    /* the school's other old URLs get the same page (canonical stays on the main URL) so none of them 404 */
    const nameSlug = String(s.n).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() + "-track-standards";
    for (const alt of new Set([...(s.os || []), nameSlug])) if (alt !== slug && !fs.existsSync(path.join(out, "schools", alt + ".html"))) fs.writeFileSync(path.join(out, "schools", alt + ".html"), h);
  }
  /* any other unknown URL: the app shell, which finds the closest school (Vercel serves 404.html for missing files) */
  fs.writeFileSync(path.join(out, "404.html"), shell);
  return files;
}
