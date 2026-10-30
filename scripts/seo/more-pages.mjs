/* Missing pages found in Search Console (Ryan 2026-10-30: "do everything in your control to add specific things missing").
   Each answers searches the site already gets impressions for but had no page made for:
     /guides/college-cross-country-recruiting-times.html   "college cross country times", "d1 cross country recruiting times" (pos 6-11)
     /guides/best-colleges-for-track-and-field.html        "best colleges for track and field", "best track and field colleges" (pos 14-15)
     /guides/printable-track-and-field-recruiting-standards.html  one-page sheet + PDF (link asset for coaches, parents, clubs)
   Numbers come only from this site's data (xc_standards.json, TFRRS national lists, the standards), with method and n on the page.
   Wired in prerender.mjs next to reportPages(); returns [url, title, quick] rows for the guides hub. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import os from "node:os";

const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
export const MORE_DATE = "2026-10-30";
export const PDF_PATH = "/track-and-field-recruiting-standards-2026.pdf";

export function morePages({ root, out, S, CT, write, page, parse, esc, sl, evPath, FIELD, SITE, gName, QUIZ, fmtXC }) {
  const done = [];
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const CSS = `<style>.qa{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:14px 18px;margin:14px 0 6px}.qa b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}.qa p{margin:0;font-size:17px}.upd{font-size:13px;color:#4A4A52}.cta{background:#F4F1FF;border-radius:14px;padding:14px 16px;margin:22px 0}</style>`;
  const tbl = (head, rows) => `<div class="scroll"><table><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ""}>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const plain = s => String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const GP = s => `/guides/${s}.html`;

  function art({ p, title, desc, h1, crumb, answer, sections, faq, cite, src }) {
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, datePublished: MORE_DATE, dateModified: MORE_DATE, mainEntityOfPage: SITE + p, image: SITE + "/og.jpg", citation: ["https://www.tfrrs.org/"] },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) }];
    const body = CSS + `<div class="qa"><b>Quick answer</b><p>${answer}</p></div><p class="upd">Updated ${MORE_DATE} · Preferred Recruit · ${src}</p>`
      + sections.map(([h, html]) => `<h2>${h}</h2>${html}`).join("")
      + `<h2>Common questions</h2>${faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${x}</p>`).join("")}`
      + (cite ? `<h2>Using this data</h2><p>Coaches, journalists and researchers are welcome to cite these numbers with a link to this page: <code>${SITE}${p}</code>. ${cite}</p>` : "")
      + `<div class="cta"><b>Want coaches to see your marks?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div>`;
    write(p, page({ title, desc, pathname: p, crumbs: [["Home", "/"], ["Guides", "/guides.html"], [crumb, p]], h1, body, ld }));
    done.push([p, crumb, plain(answer)]);
  }

  /* ---------- 1. college cross country recruiting times (xc_standards.json div medians) ---------- */
  let XCS = {}; try { XCS = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "xc_standards.json"), "utf8")); } catch { }
  const XD = XCS.div || {}, TI = ["Top", "Mid", "Low"];
  const xi = d => d === "NCAA D3" || d === "NAIA" ? 2 : 1;                       /* 5th runner where a Recruit level exists, else 7th */
  const who = d => xi(d) === 1 ? "5th runner (the last scorer)" : "7th runner (the last varsity spot)";
  if (DIVS.every(d => XD[d] && XD[d].m && XD[d].w)) {
    const cell = (d, g, t) => { const x = XD[d][g], i = xi(d); return x.tiers[t][i] ? `${fmtXC(x.tiers[t][i])} <span style="color:#4A4A52">(${fmtXC(x.hs[t][i])} 5K)</span>` : "–"; };
    const mid = (d, g) => { const x = XD[d][g], i = xi(d); return [fmtXC(x.tiers.Mid[i]), fmtXC(x.hs.Mid[i]), x.d]; };
    const [dm, dmh, dmd] = mid("NCAA D1", "m"), [dw, dwh, dwd] = mid("NCAA D1", "w");
    const lines = g => DIVS.map(d => { const [c, h, dd] = mid(d, g); return `${d}: about ${h} (${c} for the college ${dd})`; });
    art({ p: GP("college-cross-country-recruiting-times"), crumb: "College cross country times",
      title: "College Cross Country Recruiting Times by Division (2026)", h1: "College cross country recruiting times by division",
      desc: "What 5K time do you need to run college cross country? Typical D1, D2, D3 and NAIA times from every team's own runners at the 2024 and 2025 NCAA regionals.",
      answer: `To make a typical NCAA D1 cross country team's scoring five, boys need about ${dmh} for a high school 5K (${dm} for the college ${dmd}) and girls about ${dwh} (${dw} for the ${dwd}). D2 is about ${mid("NCAA D2", "m")[1]} for boys and ${mid("NCAA D2", "w")[1]} for girls; at D3 and NAIA the varsity seventh spot takes about ${mid("NCAA D3", "m")[1]} and ${mid("NAIA", "m")[1]} for boys.`,
      src: "from every program's own runners at the NCAA regionals (NAIA: conference and national meets), 2024 and 2025, TFRRS",
      sections: [
        ["Boys: what 5K time do you need for college cross country?", `<p>The typical (middle-tier) program in each division, as a high school 5K:</p><ul>${lines("m").map(x => `<li>${esc(x)}</li>`).join("")}</ul>`],
        ["Girls: what 5K time do you need for college cross country?", `<ul>${lines("w").map(x => `<li>${esc(x)}</li>`).join("")}</ul>`],
        ["Men's cross country times by division and tier", `<p>Programs in each division are split into thirds by their 5th runner. Each cell is the median program's 5th runner (7th in D3 and NAIA) at its college distance, then the same fitness as a high school 5K.</p>` + tbl(["Division", "Runner", ...TI.map(t => `${t} tier`)], DIVS.map(d => [esc(d), esc(who(d)), ...TI.map(t => cell(d, "m", t))]))],
        ["Women's cross country times by division and tier", tbl(["Division", "Runner", ...TI.map(t => `${t} tier`)], DIVS.map(d => [esc(d), esc(who(d)), ...TI.map(t => cell(d, "w", t))]))],
        ["How these times are built", `<p>Nearly every NCAA program races its NCAA regional, so each team's levels come from its own runners there: the 3rd runner (top of the roster), the 5th (the last scorer) and the 7th (the last varsity spot), 2024 and 2025 averaged. NAIA has no regionals, so its teams use the conference and national meets. Men race 8K or 10K and women 5K or 6K, so every time is put on one distance per division (Riegel formula) and converted to a high school 5K. Courses differ, so treat each figure as an estimate. Programs measured: ${DIVS.map(d => `${d} ${XD[d].m.n} men's and ${XD[d].w.n} women's`).join(", ")}.</p><p>Every school page shows its own cross country levels. <a href="/">Search a school or your mark</a>, or see the <a href="/how-fast.html">track times by event</a>.</p>`]],
      faq: [
        ["What 5K time do you need to run D1 cross country?", `About ${dmh} for boys and ${dwh} for girls to be a scoring runner at a typical NCAA D1 program. Top D1 programs need about ${fmtXC(XD["NCAA D1"].m.hs.Top[1])} and ${fmtXC(XD["NCAA D1"].w.hs.Top[1])}.`],
        ["What 5K time do you need for D2 cross country?", `About ${mid("NCAA D2", "m")[1]} for boys and ${mid("NCAA D2", "w")[1]} for girls at a typical NCAA D2 program.`],
        ["What 5K time do you need for D3 cross country?", `About ${mid("NCAA D3", "m")[1]} for boys and ${mid("NCAA D3", "w")[1]} for girls to hold a varsity spot at a typical NCAA D3 program. Division III gives no athletic scholarships.`],
        ["How far do college cross country races go?", `Men's races are usually 8K or 10K and women's 5K or 6K. This page puts NCAA D1 on the ${dmd} for men and ${dwd} for women.`],
        ["Is a high school 5K the same as a college 5K?", "Close, but college courses, fields and distances differ, so these conversions are estimates. Coaches also look at track 1600m and 3200m marks."]],
      cite: "Times come from TFRRS NCAA regional and NAIA results; each division's men's and women's sample size is listed above." });
  }

  /* ---------- 2. best colleges for track and field (2026 national outdoor lists, top-50 entries) ---------- */
  let RIDX = []; try { RIDX = JSON.parse(fs.readFileSync(path.join(out, "data", "rank_index.json"), "utf8")); } catch { }
  const fnorm = x => String(x || "").toLowerCase().replace(/\bwis\.-/g, "wisconsin ").replace(/\bst\.(?=\s|$)/g, "state").replace(/\buniv\.?\b/g, "university").replace(/[^a-z0-9&]+/g, " ").trim();
  const IDX = new Map(); for (const s of S) for (const a of [s.t, s.n, ...(s.a || [])]) { const k = fnorm(a); if (k && !IDX.has(k + "|" + s.d)) IDX.set(k + "|" + s.d, s); }
  const schoolOf = (team, d) => IDX.get(fnorm(team) + "|" + d) || IDX.get("university of " + fnorm(team) + "|" + d) || null;
  const TOP = 50, RELAY = /relay/i, SHOW = { "NCAA D1": 25, "NCAA D2": 15, "NCAA D3": 15, NAIA: 15 };
  const rankings = {}; let year = null;
  for (const d of DIVS) {
    const k = RIDX.filter(x => x.div === d && x.season === "outdoor").sort((a, b) => b.year.localeCompare(a.year))[0];
    if (!k) continue;
    let D; try { D = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data", "rank", k.key + ".dat"))).toString()); } catch { continue; }
    const L = (D.lists || []).find(l => l.nat); if (!L) continue;
    year = year || k.year;
    const tally = new Map();
    for (const g of ["m", "w"]) for (const [ev, rows] of Object.entries((L.g || {})[g] || {})) {
      if (RELAY.test(ev)) continue;
      for (const r of rows.slice(0, TOP)) { const t = D.teams[r[3]]; if (!t) continue; const o = tally.get(t) || { m: 0, w: 0, ev: new Set() }; o[g]++; o.ev.add(ev); tally.set(t, o); }
    }
    rankings[d] = [...tally.entries()].map(([t, o]) => ({ t, m: o.m, w: o.w, n: o.m + o.w, ev: o.ev.size })).sort((a, b) => b.n - a.n || b.ev - a.ev || a.t.localeCompare(b.t));
  }
  if (DIVS.every(d => (rankings[d] || []).length >= 15)) {
    const lab = (t, d) => { const s = schoolOf(t, d); return s ? (s.t && !/[().]/.test(s.t) ? s.t : s.n) : t; };
    const nm = (t, d) => { const s = schoolOf(t, d); return s ? `<a href="${sl(s)}">${esc(lab(t, d))}</a>` : esc(t); };
    const top3 = d => list(rankings[d].slice(0, 3).map(x => `${lab(x.t, d)} (${x.n})`));
    const rows = d => { let r = 0, prev = null; return rankings[d].slice(0, SHOW[d]).map((x, i) => { if (x.n !== prev) { r = i + 1; prev = x.n; } return [String(r), nm(x.t, d), String(x.n), String(x.m), String(x.w), String(x.ev)]; }); };
    const head = ["#", "Program", "Top-50 entries", "Men", "Women", "Events"];
    art({ p: GP("best-colleges-for-track-and-field"), crumb: "Best colleges for track and field",
      title: `Best Colleges for Track and Field ${year}, Ranked by Data`, h1: `Best colleges for track and field in ${year}`,
      desc: `The best college track and field programs in ${year} by division, ranked by how many athletes each put in the top ${TOP} of the national outdoor lists. NCAA D1, D2, D3, NAIA.`,
      answer: `Ranked by how many athletes each program put in the top ${TOP} of the ${year} national outdoor lists, the deepest NCAA D1 track and field programs are ${top3("NCAA D1")}. In D2 the leaders are ${top3("NCAA D2")}; in D3 ${top3("NCAA D3")}; and in the NAIA ${top3("NAIA")}.`,
      src: `from the ${year} NCAA D1, D2, D3 and NAIA outdoor qualifying lists on TFRRS`,
      sections: [
        ...DIVS.map(d => [`Best ${d} track and field programs (${year})`, tbl(head, rows(d))]),
        ["How this ranking works", `<p>For each division, every individual event on the ${year} national outdoor qualifying list counts the top ${TOP} men and top ${TOP} women. A program scores one entry for each spot its athletes hold, so an athlete in two events counts twice. Relays are left out. "Events" is how many different events the program had a top-${TOP} athlete in, which shows range. The ranking measures depth of national-level talent, not championship points or how good a fit a school is for you.</p><p>Full rankings for every program, by event group and by season, updated every Monday in season: <a href="/rankings.html">college track and field rankings</a>.</p><p>A program that ranks lower here can still be the right place: see <a href="${GP("college-track-programs-that-develop-athletes-best")}">which programs develop athletes best</a>, and <a href="/">search your mark</a> to see where it fits.</p>`]],
      faq: [
        [`What is the best college for track and field in ${year}?`, `By national-list depth, ${lab(rankings["NCAA D1"][0].t, "NCAA D1")} in NCAA D1 (${rankings["NCAA D1"][0].n} top-${TOP} entries), ${lab(rankings["NCAA D2"][0].t, "NCAA D2")} in D2, ${lab(rankings["NCAA D3"][0].t, "NCAA D3")} in D3 and ${lab(rankings.NAIA[0].t, "NAIA")} in the NAIA.`],
        ["What is the best D2 track and field school?", `${top3("NCAA D2")} had the most athletes in the top ${TOP} of the ${year} NCAA D2 outdoor list.`],
        ["What is the best D3 track and field school?", `${top3("NCAA D3")} had the most athletes in the top ${TOP} of the ${year} NCAA D3 outdoor list. Division III gives no athletic scholarships.`],
        ["Should I pick a college by its ranking?", "Not on its own. The best fit is a program where your marks are near its Recruit or Walk-On level, the academics fit, and the coaches develop athletes. A top-ranked team may have no room in your event."]],
      cite: `Counts come from the ${year} national outdoor qualifying lists on TFRRS (top ${TOP} per event, men and women, relays excluded).` });
  }

  /* ---------- 3. printable one-page standards sheet (HTML page + PDF link) ---------- */
  const raw = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const ftin = x => { let i = Math.round((x / 0.0254) * 4) / 4, f = Math.floor(i / 12); i = i - f * 12; return `${f}'${String(i).replace(/\.0+$/, "")}"`; };
  const fmt = (e, x) => x == null ? "–" : FIELD.has(e) ? ftin(x) : x >= 60 ? `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}` : x.toFixed(2);
  const med = (d, g, e, j) => { if (j === 1 && (d === "NCAA D3" || d === "NAIA")) return null; const v = S.filter(s => s.d === d).map(s => { const t = raw(s, g, e); return t ? parse(t[j], e) : null; }).filter(v => v != null).sort((a, b) => a - b); return v.length >= 12 ? v[Math.floor(v.length / 2)] : null; };
  const EVS = { m: ["100m", "200m", "400m", "800m", "1500m", "5000m", "110m Hurdles", "400m Hurdles", "High Jump", "Long Jump", "Triple Jump", "Pole Vault", "Shot Put", "Discus"],
    w: ["100m", "200m", "400m", "800m", "1500m", "5000m", "100m Hurdles", "400m Hurdles", "High Jump", "Long Jump", "Triple Jump", "Pole Vault", "Shot Put", "Discus"] };
  /* the recruiting mark per division: Recruit in D1/D2, Target in D3/NAIA (no Recruit level there). Walk-On medians for field events
     run low (deep conference places in thin fields: D1 men's high jump 1.71m), so the shareable sheet leaves them out (2026-10-30). */
  const LV = d => d === "NCAA D3" || d === "NAIA" ? 0 : 1, LVN = d => LV(d) ? "Recruit" : "Target";
  const sheet = g => tbl(["Event", ...DIVS.map(d => `${esc(d.replace("NCAA ", ""))} ${LVN(d)}`)], EVS[g].map(e => [`<a href="${evPath("NCAA D1", g, e)}">${esc(e)}</a>`, ...DIVS.map(d => esc(fmt(e, med(d, g, e, LV(d)))))]));
  const nD = d => S.filter(s => s.d === d).length;
  const w100 = fmt("100m", med("NCAA D1", "m", "100m", 1)), w100w = fmt("100m", med("NCAA D1", "w", "100m", 1));
  const hasPdf = fs.existsSync(path.join(root, "public", PDF_PATH.slice(1)));
  art({ p: GP("printable-track-and-field-recruiting-standards"), crumb: "Printable standards sheet",
    title: "Printable Track and Field Recruiting Standards 2026 (PDF)", h1: "Printable track and field recruiting standards 2026",
    desc: "A one-page, printable sheet of 2026 college track and field recruiting standards: the typical recruiting mark in every event for D1, D2, D3 and NAIA, men and women. Free PDF.",
    answer: `One page, every event: the mark where a typical college program recruits, for men and women in NCAA D1, D2, D3 and NAIA. At a typical D1 program that's ${w100} in the men's 100m and ${w100w} in the women's.${hasPdf ? ` <a href="${PDF_PATH}">Download the PDF</a>.` : ""}`,
    src: `medians across ${S.length.toLocaleString()} college programs' standards`,
    sections: [
      ["Men's standards", sheet("m")], ["Women's standards", sheet("w")],
      ["How to use the sheet", `<p>Each cell is the median program in that division (programs: ${DIVS.map(d => `${d} ${nD(d)}`).join(", ")}). D1 and D2 show the Recruit level, where coaches start real conversations. D3 and NAIA have no Recruit level on this site, so they show Target, where interest is strongest. Walk-on marks are on each school's page. Bigger programs ask for more and smaller ones for less, so check each school on its own page. Field events are in feet and inches. High school 1600m, 3200m and 300m hurdle times convert on the <a href="/convert.html">conversion pages</a>.</p><p>Coaches and clubs are welcome to print and share it${hasPdf ? ` (<a href="${PDF_PATH}">PDF</a>)` : ""}, with a link to this page.</p>`]],
    faq: [["Is there a printable list of college track recruiting standards?", `Yes. This page is a one-page sheet of the typical recruiting mark in every event for D1, D2, D3 and NAIA${hasPdf ? ", with a free PDF" : ""}.`],
      ["What 100m time do D1 coaches recruit?", `About ${w100} for men and ${w100w} for women at a typical NCAA D1 program (the Recruit level).`]],
    cite: "" });
  /* standalone print layout, rendered to the PDF by scripts/seo/make-pdf.sh (Chrome headless, run locally after data changes) */
  const PH = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Track and Field Recruiting Standards 2026</title><meta name="robots" content="noindex"><style>@page{size:letter;margin:.45in}body{font:10.5px/1.3 -apple-system,Helvetica,Arial,sans-serif;color:#111}h1{font-size:20px;margin:0 0 2px}h2{font-size:13px;margin:12px 0 4px}p{margin:2px 0;color:#444}table{border-collapse:collapse;width:100%}th,td{padding:3px 6px;border-bottom:1px solid #ddd;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#F4F1FF}a{color:inherit;text-decoration:none}.ft{margin-top:10px;font-size:10px}</style></head><body><h1>Track and Field Recruiting Standards 2026</h1><p>The mark where a typical college program recruits (median program): Recruit level in D1 and D2, Target level in D3 and NAIA. Field events in feet and inches.</p><h2>Men</h2>${sheet("m").replace(/<\/?div[^>]*>/g, "")}<h2>Women</h2>${sheet("w").replace(/<\/?div[^>]*>/g, "")}<p class="ft">Medians across ${S.length.toLocaleString()} college programs' standards. Every school's own marks: trackandfieldstandards.com · Updated ${MORE_DATE} · Preferred Recruit</p></body></html>`;
  try { fs.writeFileSync(path.join(os.tmpdir(), "pr-standards-print.html"), PH); } catch { }
  return done;
}
