/* Pre-built school pages (Ryan 2026-10-14: "optimize everything we can"). The 1,269 school pages are the site's most valuable
   URLs but render in the browser, so crawlers first see an empty shell. For every school this writes:
     dist/schools/<slug>.html      the app shell with that school's title, description, canonical, structured data and the full
                                   standards + season bests as real HTML inside #root (the app replaces it when it starts)
     dist/data/teams/<slug>.json   the school's season bests from the latest outdoor TFRRS lists (the app shows the same table)
   Served at /schools/<slug> on hosts that map clean URLs to .html (vercel.json). On Lovable the SPA still serves that path. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fitTitle, fitDesc, pickDesc, levelWords, SEASON } from "./meta.mjs";
const JG = "/guides/junior-college-track-and-field-recruiting.html";

const divHub = d => `/standards/${String(d).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-track-and-field-recruiting-standards.html`;   /* same path as prerender divPath */
const DK = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia", NJCAA: "njcaa" };   /* NJCAA: season bests only */

export function schoolPages({ root, out, S, CT = {}, DATES = {}, SITE, QUIZ, esc, schoolSlug, std, EVENTS, STATE, evLabel, confUrl, statePath, evPath, gName }) {
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

  /* Ryan's YouTube videos + Instagram reels about a school (scripts/seo/videos.json, matched by title/caption) */
  let VID = { schools: {} };
  try { VID = JSON.parse(fs.readFileSync(path.join(root, "scripts/seo/videos.json"), "utf8")); } catch {}
  fs.mkdirSync(path.join(out, "data"), { recursive: true }); fs.writeFileSync(path.join(out, "data/videos.json"), JSON.stringify(VID.schools || {}));
  const ytThumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const vidHtml = v => !v ? "" : `<h2>Watch</h2>${(v.yt || []).map(x => `<p><a href="https://www.youtube.com/watch?v=${x.id}" rel="noopener"><img src="${ytThumb(x.id)}" alt="${esc(x.t)}" width="320" height="180" loading="lazy" style="border-radius:12px;display:block;max-width:100%"></a><a href="https://www.youtube.com/watch?v=${x.id}" rel="noopener">${esc(x.t)}</a> · YouTube · Preferred Recruit</p>`).join("")}${(v.ig || []).map(x => `<p><a href="https://www.instagram.com/reel/${x.code}/" rel="noopener">Watch the standards reel on Instagram</a> (@preferredrecruit, ${esc(x.d)})</p>`).join("")}`;
  const vidLd = (v, s) => (v && v.yt || []).filter(x => x.d).map(x => ({ "@context": "https://schema.org", "@type": "VideoObject", name: x.t, description: x.desc || `${s.n} track and field recruiting standards, by Preferred Recruit.`, thumbnailUrl: [ytThumb(x.id)], uploadDate: x.d, embedUrl: `https://www.youtube.com/embed/${x.id}`, contentUrl: `https://www.youtube.com/watch?v=${x.id}`, publisher: { "@type": "Organization", name: "Preferred Recruit" } }));
  const files = [];
  const tbl = (head, rows) => `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr>${head.map(h => `<th style="text-align:left;padding:8px;border-bottom:1px solid #E4E3EA">${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(c => `<td style="padding:8px;border-bottom:1px solid #EEE">${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const byConf = new Map(), byState = new Map();
  for (const x of S) { const k = x.d + "|" + x.c; if (!byConf.has(k)) byConf.set(k, []); byConf.get(k).push(x); if (x.s) { if (!byState.has(x.s)) byState.set(x.s, []); byState.get(x.s).push(x); } }
  const KEY = ["100m", "200m", "400m", "800m", "1500m", "5000m", "110m Hurdles", "100m Hurdles", "Long Jump", "High Jump", "Shot Put"];
  /* common questions, answered from the school's own standards (also sent as FAQPage structured data) */
  function faq(s, B) {
    const one = (s.ng || [])[0], MW = one ? (one === "m" ? "women's" : "men's") : "men's and women's", MAW = one ? (one === "m" ? "women" : "men") : "men and women";
    const lvl = "Walk-On", q = [], J = !!s.j;
    const marks = g => KEY.map(e => { const t = std(s, g, e); return t && t[2] ? `${e} ${t[2].replace(/ est\.$/, "")}` : null; }).filter(Boolean).slice(0, 6);
    const m = marks("m"), w = marks("w");
    q.push([`What are the ${s.n} track and field recruiting standards?`, `${s.n} is ${/^[AEIOUN]/.test(s.d) ? "an" : "a"} ${s.d} program${s.c !== s.d ? ` in the ${s.c}` : ""}. ${J ? "This site doesn't set Target, Recruit or Walk-On levels for junior colleges, because NJCAA competition is national rather than conference-based and a program's marks can't be predicted reliably. Its season bests are on this page, and the full NJCAA national list is in Results." : `${s.o ? `Its standards come from the school's own published chart${s.yr ? ` (${s.yr})` : ""}.${s.o && !s.cv && +s.yr && +s.yr <= 2024 ? ` These are the most recent standards the program has published (${s.yr}). Current requirements may differ, so confirm with the coaching staff.` : ""}` : s.est ? "Its levels are estimates: the typical marks across its division, because the school doesn't publish standards and its conference has no championship results to set them from." : "Its Target, Recruit and Walk-On levels are set from 2026 conference results."} The full table for ${MAW} is on this page.`}`]);
    if (!J && (m.length || w.length)) q.push([`What times do you need to walk on at ${s.n}?`, [m.length ? `Men's ${lvl}: ${m.join(", ")}.` : "", w.length ? `Women's ${lvl}: ${w.join(", ")}.` : ""].filter(Boolean).join(" ")]);
    q.push([`What conference is ${s.n} track and field in?`, `${s.n} competes in ${s.c !== s.d ? `the ${s.c} (${s.d})` : J ? "the NJCAA (junior colleges compete nationally)" : `the ${s.d}`}${s.s ? ` and is based in ${STATE[s.s] || s.s}` : ""}.`]);
    if (B) { const top = g => (B[g] || []).slice(0, 4).map(r => `${r.e} ${r.mk}${parseFloat(r.w) > 2 ? "w" : ""}`); const bm = top("m"), bw = top("w");
      if (bm.length || bw.length) q.push([`What are ${s.n}'s best track and field marks in ${B.y}?`, [bm.length ? `Men: ${bm.join(", ")}.` : "", bw.length ? `Women: ${bw.join(", ")}.` : ""].filter(Boolean).join(" ") + " From TFRRS outdoor lists."]); }
    return q;
  }
  const related = s => {
    const conf = (byConf.get(s.d + "|" + s.c) || []).filter(x => x !== s).sort((a, b) => a.n.localeCompare(b.n)).slice(0, 12);
    const st = s.s ? (byState.get(s.s) || []).filter(x => x !== s && !conf.includes(x)).sort((a, b) => a.n.localeCompare(b.n)).slice(0, 12) : [];
    return [conf, st];
  };
  const T_COUNT = new Map(); for (const x of S) if (x.t) T_COUNT.set(x.t, (T_COUNT.get(x.t) || 0) + 1);
  for (const s of S) {
    const slug = schoolSlug(s), p = `/schools/${slug}`, url = SITE + p, J = !!s.j;
    const one = (s.ng || [])[0], MW = one ? (one === "m" ? "women's" : "men's") : "men's and women's", MAW = one ? (one === "m" ? "women" : "men") : "men and women";
    const B = bests(s);
    if (B) { const f = path.join(out, "data/teams", slug + ".json"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(B)); }
    const pick = (g, e) => { const t = std(s, g, e); return t ? t[2] : null; };
    const ex = [["m", "100m"], ["w", "400m"], ["m", "1500m"]].map(([g, e]) => [g, e, pick(g, e)]).filter(x => x[2]).slice(0, 2);
    const short = s.n.length <= 32 ? s.n : (s.t || s.n);
    /* searches say "ohio state track and field recruiting standards": keep "Track & Field" + year by using the common team name
       (Ohio State, Michigan, USC) when the full name doesn't fit; never TFRRS abbreviations like "Miami (Fla.)" or "Colorado St." */
    const T = `Track & Field Recruiting Standards ${SEASON}`, common = s.t && !/[().]/.test(s.t) && s.t !== s.n && T_COUNT.get(s.t) === 1 ? s.t : null;
    const title = fitTitle(J ? `${short} Track & Field (NJCAA): ${B ? B.y + " " : ""}Results & Roster`
      : `${s.n} ${T}`.length <= 60 ? `${s.n} ${T}` : common && `${common} ${T}`.length <= 60 ? `${common} ${T}` : `${short} ${T}`);
    const p4 = (CT[s.ck] || {}).rule === "p4", lw = p4 ? "recruit and scholarship-level" : levelWords(s.d), ofc = s.o ? ", from the official team chart" : "", conf = s.c !== s.d ? ", " + s.c : "";
    const exTxt = ex.length ? " " + ex.map(([g, e, v]) => `${g === "m" ? "Men's" : "Women's"} ${e} walk-on: ${v}.`).join(" ") : "";
    const weekly = B ? [" Season bests updated weekly.", " Free, no sign-up.", " Free."] : [" Free, no sign-up.", " Free to use.", " Free."];
    const desc = J ? pickDesc([`${s.n} (NJCAA) junior college track and field: ${B ? `${B.y} season bests in every event, ` : ""}roster and TFRRS links, and how junior college recruiting works.`,
        `${short} (NJCAA) junior college track and field: season bests, roster and TFRRS links.`], weekly)
      : pickDesc([`${s.n} track and field recruiting standards ${SEASON} (${s.d}${conf}): ${lw} marks for every ${MW} event${ofc}.${exTxt}`,
        `${s.n} track and field recruiting standards ${SEASON} (${s.d}${conf}): ${lw} marks for every ${MW} event${ofc}.`,
        `${s.n} track and field recruiting standards ${SEASON} (${s.d}): ${lw} marks for every ${MW} event${ofc}.`,
        `${short} track and field recruiting standards ${SEASON} (${s.d}): ${lw} marks for every event, ${MAW}.`,
        `${short} track and field recruiting standards ${SEASON}: ${lw} marks for every event.`], weekly);
    const ld = [{ "@context": "https://schema.org", "@type": "SportsOrganization", name: s.n + " Track & Field", sport: "Track and Field", url, description: desc,
      memberOf: { "@type": "SportsOrganization", name: s.c }, ...(s.s ? { address: { "@type": "PostalAddress", addressRegion: s.s } } : {}), sameAs: [s.ws, s.rs, s.src, s.u].filter(Boolean) },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq(s, B).map(([qq, aa]) => ({ "@type": "Question", name: qq, acceptedAnswer: { "@type": "Answer", text: aa } })) },
      { "@context": "https://schema.org", "@type": "WebPage", name: title, url, dateModified: DATES.max || DATES.db }, ...vidLd((VID.schools || {})[s.n], s),
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ...(J ? [] : [[s.d, divHub(s.d)]]), [s.c, confUrl(s)], [s.n, p]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) }];
    const side = g => {
      const off = s.o && (s.off || {})[g];
      if (off) return tbl(["Event", ...off.tiers.map(esc)], off.rows.map(r => [esc(r[0]), ...off.tiers.map((_, i) => esc(r[i + 1] || "–"))]));
      const ev = EVENTS.filter(e => std(s, g, e));
      return ev.length ? tbl(["Event", "Target", "Recruit", ...(p4 ? [] : ["Walk-On"])], ev.map(e => [`<a href="${evPath(s.d, g, e)}">${esc(e)}</a>`, ...std(s, g, e).slice(0, p4 ? 2 : 3).map(x => esc(x || "–"))])) : "<p>No marks listed yet.</p>";
    };
    const bestTbl = g => B && B[g].length ? `<h3>${gName(g)}</h3>` + tbl(["Event", "Mark", "Athlete", B.conf ? "Conference rank" : "", "National rank"].filter(Boolean),
      B[g].map(r => [esc(r.e), esc(r.mk) + (parseFloat(r.w) > 2 ? "w" : ""), esc(r.a), ...(B.conf ? [r.cp ? "#" + r.cp : "–"] : []), r.np ? "#" + r.np : "–"])) : "";
    const links = [[s.src && s.o, s.src, "Official standards source"], [s.rs, s.rs, "Roster"], [s.cu, s.cu, "Coaching staff"], [s.ws, s.ws, "Athletics website"], [s.u, s.u, "Team on TFRRS"]].filter(x => x[0]);
    const body = `<main style="max-width:960px;margin:0 auto;padding:28px 20px 60px;font:16px/1.55 -apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#0B0B0F">
<nav style="font-size:13px"><a href="/">Track Standards</a> › ${J ? "" : `<a href="${divHub(s.d)}">${esc(s.d)}</a> › `}<a href="${confUrl(s)}">${esc(s.c)}</a>${s.s ? ` › <a href="${statePath(s.s)}">${esc(STATE[s.s] || s.s)}</a>` : ""}</nav>
<h1>${esc(s.n)} Track &amp; Field${J ? " (NJCAA)" : " Standards"}${s.o ? " ★" : ""}</h1>${s.cv ? `<p style="display:inline-block;background:#E5F5EE;color:#12805C;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:650">✓ Verified by the ${esc(s.n)} coaching staff (${esc(s.cv)})</p>` : ""}
<p>${esc(s.n)} is ${/^[AEIOUN]/.test(s.d) ? "an" : "a"} ${esc(s.d)}${J ? " junior college" : ""} track and field program${s.c !== s.d ? ` in the ${esc(s.c)}` : ""}${s.s ? `, based in ${esc(STATE[s.s] || s.s)}` : ""}. ${J ? `Junior colleges compete nationally rather than in conferences, so this site shows ${esc(s.n)}'s season results instead of predicted recruiting levels.` : `Below are the marks it takes to be a Target recruit, a Recruit or a Walk-On for ${MAW} in every event${s.o ? `, from the school's own published standards${!s.cv && +s.yr && +s.yr <= 2024 ? ` (the most recent the program has published, ${s.yr}; current requirements may differ)` : ""}` : s.est ? " (estimates: typical marks for its division, since there is no published chart or conference championship)" : ", set from its 2026 conference results"}.`}</p>
${J ? `<h2>No recruiting levels for junior colleges</h2><p>This site doesn't set Target, Recruit or Walk-On levels for NJCAA programs: there's no reliable way to predict a junior college's marks. ${B ? `Below are ${esc(s.n)}'s best marks this season. ` : ""}The full NJCAA national list, by event, is in <a href="/?tab=results&div=NJCAA">Results</a>, and the <a href="${JG}">junior college recruiting guide</a> explains how NJCAA track works.</p>` : `${(s.ng || []).includes("m") ? "" : `<h2>Men's standards</h2>${side("m")}`}${(s.ng || []).includes("w") ? "" : `<h2>Women's standards</h2>${side("w")}`}`}
${B ? `<h2>${B.y} season bests</h2><p>${esc(s.n)}'s best mark in each event this outdoor season on TFRRS${B.conf ? `, with its rank in the ${esc(B.conf)} list` : ""}. A w marks a wind-aided mark.</p>${bestTbl("m")}${bestTbl("w")}` : ""}
${vidHtml((VID.schools || {})[s.n])}
${(() => { const q = faq(s, B); return `<h2>Common questions</h2>${q.map(([qq, aa]) => `<h3>${esc(qq)}</h3><p>${esc(aa)}</p>`).join("")}`; })()}
${(() => { const [c, st] = related(s); return (c.length ? `<h2>More ${esc(s.c)} programs</h2><ul style="columns:3 200px">${c.map(x => `<li><a href="/schools/${schoolSlug(x)}">${esc(x.n)}</a></li>`).join("")}</ul>` : "") + (st.length ? `<h2>More college programs in ${esc(STATE[s.s] || s.s)}</h2><ul style="columns:3 200px">${st.map(x => `<li><a href="/schools/${schoolSlug(x)}">${esc(x.n)}</a> <small>${esc(x.d)}</small></li>`).join("")}</ul>` : ""); })()}
${links.length ? `<h2>Links</h2><ul>${links.map(([, u, t]) => `<li><a href="${esc(u)}" rel="noopener">${t}</a></li>`).join("")}</ul>` : ""}
${/* coach portal links removed (Ryan 2026-10-16: "take out the coach log in"); backend kept, see social/standards/site/portal */""}
<p style="font-size:13px;color:#4A4A52">${J ? "" : `Standards updated ${DATES.db}`}${B ? `${J ? "" : " · "}Season bests updated ${DATES.data}` : ""}</p>
<p><a href="${confUrl(s)}">All ${esc(s.c)} ${J ? "junior college programs" : "standards"}</a>${s.s ? ` · <a href="${statePath(s.s)}">College track in ${esc(STATE[s.s] || s.s)}</a>` : ""} · <a href="/how-fast.html">How fast do you need to run in college?</a> · <a href="${QUIZ}">Free recruitment evaluation</a></p>
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
  fs.writeFileSync(path.join(out, "404.html"), shell.replace("</head>", '<meta name="robots" content="noindex">\n</head>'));
  return files;
}
