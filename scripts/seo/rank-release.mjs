/* Rankings for links and citations (Ryan 2026-11-03: "send all of this").
   1. CSV downloads: one file per division + season (/downloads/<season>-<div>-power-rankings.csv) and a downloads page with Dataset
      data, so journalists, researchers and AI tools can pull and cite the numbers. Free to use with a credit link.
   2. Weekly releases: one dated page per division per Monday snapshot (power_history.json, scripts/seo/power-snapshot.mjs), with
      movement since the week before, plus a weekly hub. Nothing is written until the first snapshot exists (indoor, December). */
import fs from "node:fs"; import path from "node:path";
import { PDIVS, rankPath, seasonPath, seasonLabel } from "./power-site.mjs";
import { grade } from "./power.mjs";

const DSL = d => /^NCAA /.test(d) ? d.toLowerCase().replace(/ /g, "-") : d.toLowerCase();
const csvPath = (d, c) => `/downloads/${c.year}-${c.season}-${DSL(d)}-power-rankings.csv`;
export const weekPath = (d, date) => `/rankings/weekly/${DSL(d)}-track-and-field-rankings-${date}.html`;
const cell = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const fmtDate = iso => new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function releasePages({ R, out, write, page, esc, sl, SITE }) {
  if (!R || !R.cur || !Object.keys(R.cur).length) return [];
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.org", logo: SITE + "/icon-512.png" };
  const nameOf = r => r && r.s ? (r.s.t && !/\./.test(r.s.t.replace(/\(.*?\)/g, "")) ? r.s.t : r.s.n) : (r && r.t) || "";
  const link = (r, label) => r && r.s ? `<a href="${sl(r.s)}">${esc(label)}</a>` : esc(label);
  const done = [], DV = PDIVS.filter(d => (R.seasons[d] || []).length);

  /* 1. CSV per division + season */
  const files = [];
  for (const d of DV) for (const c of R.seasons[d]) {
    const rows = [["season", "division", "team", "rank", "school", "overall_rating", "grade", "power_score", "national_meet_points", "projected_points", "national_qualifiers"]];
    for (const g of ["m", "w"]) for (const r of c.P[g] || []) rows.push([seasonLabel(c), d, g === "m" ? "men" : "women", r.rank, nameOf(r), r.ovr ?? "", grade(r.ovr), r.power != null ? (+r.power).toFixed(1) : "", r.act ?? "", r.proj ?? "", r.qual ?? ""]);
    if (rows.length < 2) continue;
    const p = csvPath(d, c), f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, rows.map(x => x.map(cell).join(",")).join("\n") + "\n");
    files.push({ d, c, p, n: rows.length - 1 });
  }
  if (files.length) {
    const p = "/rankings/downloads.html", latest = files.reduce((a, x) => x.c.key > a ? x.c.key : a, "");
    const date = new Date().toISOString().slice(0, 10);
    const ld = [{ "@context": "https://schema.org", "@type": "DataCatalog", name: "College track and field Power Rankings data", url: SITE + p, publisher: ORG, creator: ORG, dateModified: date,
      dataset: DV.map(d => { const fs2 = files.filter(x => x.d === d), c = R.cur[d];
        return { "@type": "Dataset", name: `${d} track and field Power Rankings, ${fs2[0].c.year} to ${fs2[fs2.length - 1].c.year}`,
          description: `Team rankings for every ${d} men's and women's track and field program, every indoor and outdoor season since ${fs2[0].c.year}, from TFRRS national lists and national championship team scores (PR Power Index).`,
          url: SITE + rankPath(d), creator: ORG, license: SITE + p + "#use", isAccessibleForFree: true, temporalCoverage: `${fs2[0].c.year}/${c ? c.year : fs2[fs2.length - 1].c.year}`,
          distribution: fs2.map(x => ({ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: SITE + x.p, name: `${d} ${seasonLabel(x.c)}` })) }; }) }];
    const body = `<p>Every ranking on this site as a spreadsheet: one CSV per division and season, men and women, with the rank, overall rating (out of 99), grade, Power score, national meet points, projected points and national qualifiers for every ranked program. ${files.length.toLocaleString()} files, built from <a href="https://www.tfrrs.org/" rel="noopener">TFRRS</a> national lists and official national championship team scores. <a href="/rankings/methodology.html">How the rankings work ›</a></p>`
      + DV.map(d => `<h2>${esc(d)}</h2><ul style="columns:2 220px;padding-left:18px">${files.filter(x => x.d === d).slice().reverse().map(x => `<li><a href="${x.p}" download>${esc(seasonLabel(x.c))}</a> <small>(${x.n.toLocaleString()} teams)</small> · <a href="${seasonPath(d, x.c.year, x.c.season)}">view</a></li>`).join("")}</ul>`).join("")
      + `<h2 id="use">Using the data</h2><p>The files are free to use in articles, school sites, research and AI tools. Please credit "PR Power Index, trackandfieldstandards.com" with a link to the ranking page or this page. Columns: season, division, team (men or women), rank, school, overall_rating, grade, power_score, national_meet_points (official TFRRS team score; blank before the national meet), projected_points (10-8-6-5-4-3-2-1 on the wind-legal national list), national_qualifiers. Ranks update every Monday in season.</p>`;
    write(p, page({ title: "College Track and Field Rankings Data (CSV Downloads)", desc: `Download every college track and field Power Ranking as CSV: NCAA D1, D2, D3, NAIA and junior colleges, men and women, every season since ${files[0].c.year}. Free with credit.`,
      pathname: p, crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], ["Downloads", p]], h1: "College track and field rankings data", intro: "", ld, body }));
    done.push(p); void latest;
  }

  /* 2. weekly releases from the Monday snapshots */
  const H = (R.hist || []).filter(h => h && h.date && h.d && h.ranks && DV.includes(h.d)).sort((a, b) => a.date.localeCompare(b.date));
  if (H.length) {
    const rowOf = new Map(); for (const d of DV) for (const c of R.seasons[d]) for (const g of ["m", "w"]) for (const r of c.P[g] || []) rowOf.set(`${d}|${r.t}`, r);
    const weeks = [];
    for (const h of H) {
      const prev = [...H].reverse().find(x => x.d === h.d && x.key === h.key && x.date < h.date);
      const wkNo = H.filter(x => x.d === h.d && x.key === h.key && x.date <= h.date).length;
      const [yr, se] = h.key.split("-"), lab = `${yr} ${se === "indoor" ? "Indoor" : "Outdoor"}`, p = weekPath(h.d, h.date), when = fmtDate(h.date);
      const top = g => Object.entries(h.ranks[g] || {}).map(([t, [rk, pw]]) => ({ t, rk, pw, was: prev && prev.ranks[g] && prev.ranks[g][t] ? prev.ranks[g][t][0] : null })).sort((a, b) => a.rk - b.rk);
      const tbl = g => `<table><thead><tr><th>Rank</th><th>School</th><th>Power</th><th>Last week</th></tr></thead><tbody>${top(g).slice(0, 25).map(x => { const r = rowOf.get(`${h.d}|${x.t}`), mv = x.was == null ? "new" : x.was > x.rk ? `▲ ${x.was - x.rk}` : x.was < x.rk ? `▼ ${x.rk - x.was}` : "–";
        return `<tr><td>${x.rk}</td><td>${link(r, r ? nameOf(r) : x.t)}</td><td>${(+x.pw).toFixed(1)}</td><td>${prev ? (x.was == null ? "new" : `#${x.was} (${mv})`) : "–"}</td></tr>`; }).join("")}</tbody></table>`;
      const lead = g => { const L = top(g); if (!L.length) return ""; const r = rowOf.get(`${h.d}|${L[0].t}`), up = prev ? L.filter(x => x.was != null && x.rk <= 25).sort((a, b) => (b.was - b.rk) - (a.was - a.rk))[0] : null;
        return `${g === "m" ? "Men" : "Women"}: ${r ? nameOf(r) : L[0].t} #1${up && up.was > up.rk ? `, biggest move ${(rowOf.get(`${h.d}|${up.t}`) ? nameOf(rowOf.get(`${h.d}|${up.t}`)) : up.t)} up ${up.was - up.rk} to #${up.rk}` : ""}.`; };
      const answer = `${h.d} track and field Power Rankings, ${lab} week ${wkNo} (${when}). ${lead("m")} ${lead("w")}`;
      const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: `${h.d} Track and Field Power Rankings: ${lab} Week ${wkNo}`, description: answer, author: ORG, publisher: ORG, datePublished: h.date, dateModified: h.date, mainEntityOfPage: SITE + p, citation: ["https://www.tfrrs.org/"] },
        ...["m", "w"].map(g => ({ "@context": "https://schema.org", "@type": "ItemList", name: `${h.d} ${g === "m" ? "men's" : "women's"} track and field Power Rankings, ${lab} week ${wkNo}`, itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: top(g).slice(0, 25).map(x => { const r = rowOf.get(`${h.d}|${x.t}`); return { "@type": "ListItem", position: x.rk, name: r ? nameOf(r) : x.t, ...(r && r.s ? { url: SITE + sl(r.s) } : {}) }; }) }))];
      write(p, page({ title: `${h.d} Track and Field Rankings: ${lab} Week ${wkNo}`, desc: answer, pathname: p,
        crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], ["Weekly", "/rankings/weekly.html"], [`${h.d} week ${wkNo}`, p]], h1: `${esc(h.d)} Power Rankings: ${esc(lab)} week ${wkNo}`, intro: "", ld,
        body: `<p><b>${esc(answer)}</b></p><p>Ranked on ${esc(when)} from that Monday's TFRRS national lists (wind-legal marks, event-group squads, projected national points). <a href="${rankPath(h.d)}">Current full rankings ›</a> · <a href="/rankings/methodology.html">Methodology</a> · <a href="/rankings/downloads.html">Download the data</a></p><h2>Men, top 25</h2>${tbl("m")}<h2>Women, top 25</h2>${tbl("w")}<p>Schools and journalists are welcome to share this ranking with a link to this page.</p>` }));
      weeks.push({ h, p, lab, wkNo, when }); done.push(p);
    }
    const hp = "/rankings/weekly.html", last = weeks[weeks.length - 1];
    write(hp, page({ title: "Weekly College Track and Field Power Rankings", desc: `Weekly NCAA D1, D2, D3, NAIA and junior college track and field Power Rankings, released every Monday in season. Latest: ${last.when}.`, pathname: hp,
      crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], ["Weekly", hp]], h1: "Weekly track and field Power Rankings", intro: "",
      ld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Weekly college track and field Power Rankings", url: SITE + hp, dateModified: last.h.date, publisher: ORG }],
      body: `<p>New rankings every Monday in season, ranked from that week's TFRRS national lists. Latest release: ${esc(last.when)}.</p>` + DV.filter(d => weeks.some(w => w.h.d === d)).map(d => `<h2>${esc(d)}</h2><ul>${weeks.filter(w => w.h.d === d).reverse().map(w => `<li><a href="${w.p}">${esc(w.lab)} week ${w.wkNo}</a> <small>${esc(w.when)}</small></li>`).join("")}</ul>`).join("") }));
    done.push(hp);
  }
  return done;
}
