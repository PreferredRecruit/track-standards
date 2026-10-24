/* Data reports for links and citations (Ryan 2026-10-24, outreach 2.1 + 2.2: "go all-in on optimization ... prioritize the
   Oregon content"). Journalists, coaches and AI engines cite numbers nobody else has, so each report is built only from this
   site's TFRRS data (public/data/teamstats/_rank.json, schoolfacts.json) and the standards, with the method and sample sizes
   on the page. Programs are ranked only with enough athletes behind the number (MIN below), and every row shows its n.
     /guides/college-track-programs-that-develop-athletes-best.html   peaking + year-over-year rankings by division, Power 4
     /guides/oregon-track-and-field-by-the-numbers.html               University of Oregon: titles, freshmen, levels, development
   Wired next to gapGuides() in prerender.mjs; returns [url, title, quick] rows for the guides hub. */
import fs from "node:fs";
import path from "node:path";
import { loadFacts, evl, shortOf, t1600, newestFirst } from "./facts.mjs";

const MIN = { "NCAA D1": 100, "NCAA D2": 100, "NCAA D3": 60, NAIA: 60 };   /* conference-meet athletes behind a peaking number */
const MINY = { "NCAA D1": 50, "NCAA D2": 50, "NCAA D3": 30, NAIA: 30 };    /* returning athletes behind a year-over-year number */
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
/* championship meets missing from TFRRS (checked 2026-10-24 with TFRRS meet search); 2020 was cancelled */
const MISSING = "The 2016 and 2021 NCAA D1 outdoor championships aren't on TFRRS, so titles from those two meets aren't counted; 2020 was cancelled.";

export function reportPages({ root, S, CT, std, write, page, esc, sl, SITE, DATES, QUIZ }) {
  const { FACTS, factsOf } = loadFacts(root);
  let R = []; try { R = JSON.parse(fs.readFileSync(path.join(root, "public", "data", "teamstats", "_rank.json"), "utf8")); } catch { return []; }
  const bySchool = new Map(); for (const s of S) { const f = factsOf(s); if (f && !bySchool.has(f)) bySchool.set(f, s); }
  const schoolOf = team => bySchool.get(FACTS[team]);
  const name = team => { const s = schoolOf(team); return s ? `<a href="${sl(s)}">${esc(shortOf(s))}</a>` : esc(team); };
  const plainName = team => { const s = schoolOf(team); return s ? shortOf(s) : team; };
  const pct = v => v == null ? "–" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
  const med = L => { const v = L.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const tbl = (head, rows) => `<div class="scroll"><table><tr>${head.map((h, i) => `<th${i > 1 ? ' class="n"' : ""}>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td${i > 1 ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const CSS = `<style>.qa{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:14px 18px;margin:14px 0 6px}.qa b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}.qa p{margin:0}.upd{font-size:13px;color:var(--mute)}</style>`;
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const UPD = DATES.max || DATES.db, done = [];
  function art({ p, title, desc, h1, crumb, answer, sections, faq, cite }) {
    const plain = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, datePublished: "2026-10-24", dateModified: UPD, mainEntityOfPage: SITE + p, image: SITE + "/og.jpg", citation: ["https://www.tfrrs.org/"] },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) }];
    const body = CSS + `<div class="qa"><b>Quick answer</b><p>${answer}</p></div><p class="upd">Updated ${UPD} · Preferred Recruit · built from TFRRS meet results and lists (2016 to 2026)</p>`
      + sections.map(([h, html]) => `<h2>${h}</h2>${html}`).join("")
      + `<h2>Common questions</h2>${faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${x}</p>`).join("")}`
      + `<h2>Using this data</h2><p>Journalists, coaches and researchers are welcome to cite these numbers with a link to this page: <code>${SITE}${p}</code>. ${cite}</p>`
      + `<div class="cta"><b>Want coaches to see your marks?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div>`;
    write(p, page({ title, desc, pathname: p, crumbs: [["Home", "/"], ["Guides", "/guides.html"], [crumb, p]], h1, body, ld }));
    done.push([p, crumb, plain(answer)]);
  }

  /* ---------- 2.1 which programs develop athletes best ---------- */
  {
    const D = d => R.filter(x => x.division === d);
    const peakers = d => D(d).filter(x => x.peak_n >= MIN[d] && x.peak != null).sort((a, b) => b.peak - a.peak || b.peak_n - a.peak_n);
    const growers = d => D(d).filter(x => x.yoy_n >= MINY[d] && x.yoy != null).sort((a, b) => b.yoy - a.yoy || b.yoy_n - a.yoy_n);
    const m = d => ({ peak: med(D(d).map(x => x.peak)), yoy: med(D(d).map(x => x.yoy)), imp: med(D(d).map(x => x.imp)), n: D(d).length, seasons: D(d).reduce((a, x) => a + x.n, 0) });
    const top3 = d => peakers(d).slice(0, 3).map(x => `${plainName(x.team)} (${x.peak}%)`);
    const p4 = R.filter(x => { const s = schoolOf(x.team); return s && (CT[s.ck] || {}).rule === "p4" && x.peak_n >= MIN["NCAA D1"]; }).sort((a, b) => b.peak - a.peak);
    const total = R.filter(x => DIVS.includes(x.division)).reduce((a, x) => a + x.n, 0);
    const d1 = m("NCAA D1");
    const answer = `In ${total.toLocaleString()} athlete-seasons of TFRRS results from 2022 to 2026, the typical NCAA D1 program had ${d1.peak}% of its athletes run their season best at the conference championship or later. The best D1 programs at peaking were ${list(top3("NCAA D1"))}${p4.length ? `, and among Power 4 programs ${plainName(p4[0].team)} led at ${p4[0].peak}%` : ""}.`;
    const rankTbl = (rows, k) => tbl(["#", "Program", k === "peak" ? "Peaked at the right time" : "Yearly improvement", "Athletes"], rows.slice(0, 25).map((x, i) => [i + 1, name(x.team), k === "peak" ? `${x.peak}%` : pct(x.yoy), k === "peak" ? x.peak_n : x.yoy_n]));
    const sections = [
      [`How is "developing athletes" measured?`, `<p>Three numbers per program, from every individual race on TFRRS by athletes whose pages are in this site's data, 2022 to 2026 indoor and outdoor:</p><ul><li><b>Peaked at the right time:</b> of the athletes who competed at the program's conference championship, the share who ran or threw their season best there or later (regionals, nationals). Coaches plan seasons around that meet, so this is the clearest test of timing.</li><li><b>Yearly improvement:</b> the median change in a returning athlete's season best from one year to the next at the same school.</li><li><b>In-season improvement:</b> the median gain from an athlete's first race of the season to their season best.</li></ul><p>A program is ranked only when at least ${MIN["NCAA D1"]} athletes (D1 and D2) or ${MIN["NCAA D3"]} (D3 and NAIA) raced its conference championship, and at least ${MINY["NCAA D1"]} or ${MINY["NCAA D3"]} returning athletes count toward yearly improvement. Mets, IC4A/ECAC and New England meets are not treated as conference championships.</p>`],
      ["What's typical in each division?", tbl(["Division", "", "Peaked at the right time", "Yearly improvement", "In-season improvement", "Programs"], DIVS.map(d => { const x = m(d); return [esc(d), "", `${x.peak}%`, pct(x.yoy), pct(x.imp), x.n]; }))],
      ...DIVS.map(d => [`Best ${esc(d)} programs at peaking`, rankTbl(peakers(d), "peak")]),
      ...(p4.length ? [["Power 4 programs ranked by peaking", tbl(["#", "Program", "Peaked at the right time", "Yearly improvement", "Athletes"], p4.map((x, i) => [i + 1, name(x.team), `${x.peak}%`, pct(x.yoy), x.peak_n]))]] : []),
      ...DIVS.map(d => [`Biggest year-over-year improvement in ${esc(d)}`, rankTbl(growers(d), "yoy")]),
    ];
    const faq = [
      ["Which college track program develops athletes the best?", answer],
      ["Do college track athletes peak at the conference championship?", `About half do. The typical program had ${DIVS.map(d => `${m(d).peak}% in ${d}`).join(", ")} of its conference-meet athletes run their season best there or later, 2022 to 2026.`],
      ["How much do college track athletes improve each year?", `A returning athlete's season best improved a median ${DIVS.map(d => `${pct(m(d).yoy)} in ${d}`).join(", ")} a year. In the 100m, 1% is about a tenth of a second; in the 1500m it's about 2.3 seconds.`],
      ["Where does this data come from?", `Every individual race on TFRRS by athletes whose pages are in this site's data (${total.toLocaleString()} athlete-seasons, 2022 to 2026), joined with the school each athlete ran for that season. Relays and cross country are left out.`]];
    art({ p: "/guides/college-track-programs-that-develop-athletes-best.html", title: "College Track Programs That Develop Athletes Best (2026)",
      desc: `Which college track and field programs develop athletes best? Peaking at the conference championship and year-over-year improvement, ranked for D1, D2, D3, NAIA and Power 4, from ${Math.round(total / 1000)}k athlete-seasons.`,
      h1: "Which college track programs develop athletes best?", crumb: "Programs that develop athletes best", answer, sections, faq,
      cite: "Rankings update as new TFRRS results come in; the numbers on each school's page match this report." });
  }

  /* ---------- 2.2 Oregon by the numbers ---------- */
  {
    const s = S.find(x => x.n === "University of Oregon"), F = s && factsOf(s);
    if (s && F) {
      const titles = new Map(); for (const [team, v] of Object.entries(FACTS)) { const n = (v.champ || []).filter(c => c[2] === "D1").length; if (n) titles.set(team, n); }
      const lead = [...titles.entries()].sort((a, b) => b[1] - a[1]), mine = (F.champ || []).filter(c => c[2] === "D1"), place = lead.findIndex(([t]) => FACTS[t] === F) + 1;
      const tied = lead.filter(([, n]) => n === mine.length).map(([t]) => t).filter(t => FACTS[t] !== F);
      const ahead = lead.filter(([, n]) => n > mine.length);
      const lv = (g, e) => { const t = std(s, g, e); return t && t[1] ? String(t[1]).replace(/ est\.$/, "") : null; };
      const fr = (g, e) => ((F.fresh || {})[g] || {})[e];
      const big = R.filter(x => { const y = schoolOf(x.team); return y && y.ck === s.ck && x.peak_n >= MIN["NCAA D1"]; }).sort((a, b) => b.peak - a.peak), bigAt = big.findIndex(x => FACTS[x.team] === F) + 1;
      const fm = fr("m", "100 Meters"), f15 = fr("m", "1500 Meters");
      const answer = `Oregon has won ${mine.length} individual NCAA D1 titles since 2016 in the championship meets on TFRRS, ${ahead.length ? `behind only ${list(ahead.map(([t, n]) => `${plainName(t)} (${n})`))}` : "the most of any program"}${tied.length ? ` and level with ${list(tied.map(plainName))}` : ""}. Its men's Recruit level is ${lv("m", "100m")} in the 100m and ${lv("m", "1500m")} in the 1500m${fm && f15 ? `, and its men's freshmen ran a median ${fm.med} and ${f15.med} in their first college season` : ""}.`;
      const CH = newestFirst(mine);
      const EV = [["100m", "100 Meters"], ["200m", "200 Meters"], ["400m", "400 Meters"], ["800m", "800 Meters"], ["1500m", "1500 Meters"], ["5000m", "5000 Meters"], ["Long Jump", "Long Jump"], ["High Jump", "High Jump"], ["Shot Put", "Shot Put"]];
      const lvRow = g => EV.map(([e, fe]) => { const t = std(s, g, e), f = fr(g, fe); return t ? [esc(e), "", esc(String(t[0] || "–").replace(/ est\.$/, "")), esc(String(t[1] || "–").replace(/ est\.$/, "")), f ? esc(f.med) : "–", f ? f.n : "–"] : null; }).filter(Boolean);
      const d = F.dev;
      const sections = [
        ["How many national titles has Oregon won since 2016?", `<p>${mine.length} individual NCAA D1 titles, indoor and outdoor, relays not counted. ${MISSING}</p>` + tbl(["Season", "", "Event", "Champion", "Mark"], CH.map(c => [`${c[0]} ${c[1]}`, "", `${c[3] === "m" ? "Men's" : "Women's"} ${esc(evl(c[4]))}`, esc(c[5]), esc(c[6])]))],
        ["Which programs have won the most D1 titles since 2016?", tbl(["#", "Program", "Individual titles"], lead.slice(0, 10).map(([t, n], i) => [i + 1, name(t), n]))],
        ["What does it take to run at Oregon?", `<p>Oregon's Target and Recruit levels (Big Ten, a Power 4 conference with no Walk-On level), next to what Oregon's freshmen actually ran in their first college outdoor season, 2022 to 2026.${lv("m", "1500m") && t1600(lv("m", "1500m")) ? ` The men's 1500m Recruit level is about ${t1600(lv("m", "1500m"))} for a high school 1600m.` : ""}</p><h3>Men</h3>${tbl(["Event", "", "Target", "Recruit", "Typical freshman", "Freshmen"], lvRow("m"))}<h3>Women</h3>${tbl(["Event", "", "Target", "Recruit", "Typical freshman", "Freshmen"], lvRow("w"))}<p><a href="${sl(s)}">Every event and the full Oregon standards ›</a></p>`],
        ...(d ? [["How well does Oregon develop athletes?", `<p>${d.peak}% of Oregon athletes who raced at the conference championship ran their season best there or later, better than ${d.peak_pct}% of ${d.peers} D1 programs${bigAt ? ` and ${bigAt}${["th", "st", "nd", "rd"][bigAt % 10 > 3 || [11, 12, 13].includes(bigAt % 100) ? 0 : bigAt % 10]} of ${big.length} Big Ten programs` : ""}. Returning athletes improved ${pct(d.yoy)} a year (${d.yoy_pct}th percentile), from ${d.n} athlete-seasons, 2022 to 2026.</p>` + (big.length ? tbl(["#", "Big Ten program", "Peaked at the right time", "Yearly improvement", "Athletes"], big.map((x, i) => [i + 1, name(x.team), `${x.peak}%`, pct(x.yoy), x.peak_n])) : "") + `<p><a href="/guides/college-track-programs-that-develop-athletes-best.html">How every program compares ›</a></p>`]] : []),
        ["What about the rest of Oregon?", `<p>Oregon is one of 17 college track and field programs in the state, which also has Oregon State (women only), Portland State and Portland in D1. <a href="/states/oregon-college-track-and-field.html">Every Oregon college, its standards and its national champions ›</a></p>`],
      ];
      const faq = [
        ["Is Oregon good at track and field?", answer],
        ["How many national champions has Oregon had?", `${mine.length} individual NCAA D1 champions since 2016 in the meets on TFRRS, most recently ${CH[0][5]} (${CH[0][3] === "m" ? "men's" : "women's"} ${evl(CH[0][4])}, ${CH[0][0]} ${CH[0][1]}). ${MISSING}`],
        ["What times do you need to run at Oregon?", `Oregon's Recruit level is ${lv("m", "100m")} in the 100m, ${lv("m", "400m")} in the 400m and ${lv("m", "1500m")} in the 1500m for men, and ${lv("w", "100m")}, ${lv("w", "400m")} and ${lv("w", "1500m")} for women.`],
        ...(fm ? [["What do Oregon freshmen run?", `Oregon's men's freshmen ran a median ${fm.med} in the 100m (best ${fm.best}, ${fm.n} freshmen since 2022)${f15 ? ` and ${f15.med} in the 1500m (${f15.n} freshmen)` : ""} in their first college outdoor season.`]] : []),
        ["Does Oregon State have a men's track team?", `No. Oregon State competes in women's track and field only; men in the state can look at Oregon, Portland State and Portland in D1. <a href="/states/oregon-college-track-and-field.html">Oregon colleges ›</a>`]];
      art({ p: "/guides/oregon-track-and-field-by-the-numbers.html", title: "Oregon Track and Field by the Numbers (2016 to 2026)",
        desc: `Oregon track and field in data: ${mine.length} NCAA D1 titles since 2016, Recruit levels, what Oregon freshmen actually ran, and how Oregon develops athletes against the Big Ten.`,
        h1: "Oregon track and field by the numbers", crumb: "Oregon by the numbers", answer, sections, faq,
        cite: "Titles come from TFRRS championship results; standards and freshman marks match the Oregon school page." });
    }
  }
  return done;
}
