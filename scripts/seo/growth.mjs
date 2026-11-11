/* Growth plan pages (Ryan 2026-11-11: "lets do 4 5 6 7").
     /guides/what-if-my-time-doesnt-fit-any-college.html   gap page: ~8% of searches on the site fit zero colleges (search log,
                                                          Oct 17 to Nov 10 2026); answers with the most open programs per event
     /guides/high-school-track-recruiting-report-2026.html data report from the site's own anonymous search log (aggregates only,
                                                          snapshot in scripts/seo/data/search-report-2026-11.json) + CSV download
   Every mark comes from this site's standards data; every count from the snapshot. Returns [url, title, quick] rows for the
   guides hub and llms.txt. */
import fs from "node:fs";
import path from "node:path";
import { implC, IMPL_OFF, CONV } from "./hs.mjs";

const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
const EVENTS = [["m", "100m"], ["m", "200m"], ["m", "400m"], ["m", "800m"], ["m", "1600m"], ["m", "3200m"], ["m", '110m Hurdles (39")'], ["m", "300m Hurdles"], ["m", "Long Jump"], ["m", "High Jump"], ["m", "Triple Jump"], ["m", "Shot Put"], ["m", "Discus"],
  ["w", "100m"], ["w", "200m"], ["w", "400m"], ["w", "800m"], ["w", "1600m"], ["w", "3200m"], ["w", "100m Hurdles"], ["w", "300m Hurdles"], ["w", "Long Jump"], ["w", "High Jump"], ["w", "Triple Jump"], ["w", "Shot Put"], ["w", "Discus"]];

export function growthPages({ root, S, CT, write, writeRaw, page, parse, esc, slug, evPath, FIELD, SITE }) {
  const out = [];
  const isF = e => FIELD.has(e);
  const HS = g => (g === "m" ? "Boys" : "Girls");
  const raw = (s, g, e) => { if ((s.ng || []).includes(g)) return null; const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const ftin = x => { let i = Math.round((x / 0.0254) * 4) / 4, f = Math.floor(i / 12); i = i - f * 12; return `${f}'${String(i).replace(/\.0+$/, "")}"`; };
  const fmt = (e, x) => isF(e) ? ftin(x) : x >= 60 ? `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}` : x.toFixed(2);
  const G = g => (g === "m" ? "mens" : "womens");
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.org", logo: SITE + "/icon-512.png" };
  const today = new Date().toISOString().slice(0, 10);
  const tbl = (head, rows) => `<div class="scroll"><table><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ""}>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;

  /* the most open walk-on marks: per program, its Walk-On level (Recruit when a program lists no Walk-On), put in high school terms */
  const openMarks = (g, e) => {
    const c = CONV[e] ? CONV[e].to : e, k = CONV[e];
    const vals = [];
    for (const s of S) { const t = raw(s, g, c); if (!t) continue; let v = parse(t[2], c); if (v == null) v = parse(t[1], c); if (v == null) continue;
      if (implC(s, g, c) && IMPL_OFF[c] != null) v -= IMPL_OFF[c];
      if (k) v = k.add ? v - k.add : v / k.k[g];
      vals.push({ v, d: s.d }); }
    if (vals.length < 300) return null;
    const f = isF(e); vals.sort((a, b) => f ? a.v - b.v : b.v - a.v);           /* most open first */
    const at = q => vals[Math.floor(vals.length * q)].v;
    const p10 = at(0.10), p25 = at(0.25), med = at(0.5);
    const within = vals.filter(x => f ? x.v <= p10 + 1e-9 : x.v >= p10 - 1e-9);
    const byDiv = DIVS.map(d => within.filter(x => x.d === d).length);
    return { n: vals.length, p10, p25, med, byDiv };
  };

  /* ---------- gap page: no fits ---------- */
  {
    const p = "/guides/what-if-my-time-doesnt-fit-any-college.html";
    const R = EVENTS.map(([g, e]) => [g, e, openMarks(g, e)]).filter(r => r[2]);
    const pick = (g, e) => (R.find(r => r[0] === g && r[1] === e) || [])[2];
    const b16 = pick("m", "1600m"), b100 = pick("m", "100m"), g400 = pick("w", "400m");
    const quick = `About 8% of searches on Track Standards fit zero colleges, but the most open programs set their walk-on marks well below the typical ones. One in four college programs takes a boys 1600m walk-on at ${fmt("1600m", b16.p25)} or slower, and one in ten at ${fmt("1600m", b16.p10)}. For the boys 100m those marks are ${fmt("100m", b100.p25)} and ${fmt("100m", b100.p10)}.`;
    const rows = R.map(([g, e, o]) => [`<a href="/how-fast/${G(g)}-${slug(e)}.html">${HS(g)} ${esc(e)}</a>`, esc(fmt(e, o.med)), esc(fmt(e, o.p25)), esc(fmt(e, o.p10)), o.n.toLocaleString()]);
    const faq = [
      ["Why does my time fit zero colleges?", `The search compares your mark with each program's Walk-On, Recruit and Target levels. If it's slower (or shorter) than every program's walk-on level, it fits none yet. Check the event first: a 1600m time entered as a mile or 1500m, or a 5K cross country time entered as a track 5000m, can show zero fits by mistake.`],
      ["What is the easiest college to walk on to for track?", `It depends on the event. One in ten programs on this site takes a ${HS("m").toLowerCase()} 1600m walk-on at ${fmt("1600m", b16.p10)} or slower and a girls 400m walk-on at ${fmt("400m", g400.p10)} or slower. Most of the most open programs are NCAA D3 and NAIA, plus junior colleges, which aren't counted in this table.`],
      ["Can I still run in college if I'm not fast enough yet?", "Yes. Many athletes run at a junior college (NJCAA) first and transfer, and D3 and NAIA programs often take walk-ons who are still improving. Coaches also recruit on progress, so a junior or senior who keeps dropping time can still get recruited."],
      ["Should I try a different event?", "Often, yes. A sprinter whose 100m fits few programs may fit many more in the 400m or a jump, and a miler may fit more in the 800m or 3200m. Search each event you run; every one is scored on its own."]];
    write(p, page({ title: "My Track Time Doesn't Fit Any College: What Now? (2026)",
      desc: `${quick.slice(0, 150).replace(/\s\S*$/, "")}...`,
      pathname: p, crumbs: [["Home", "/"], ["Guides", "/guides.html"], ["No colleges fit my time", p]],
      h1: "My time doesn't fit any college. What now?",
      intro: `<b>${esc(quick)}</b> <span class="upd">Updated ${today}.</span>`,
      body: `<h2>What are the most open walk-on marks in college track?</h2>
<p>Each row puts every program's walk-on mark (its Recruit mark when it lists no walk-on level) in high school terms and lines them up from most open to toughest. "1 in 4" means a quarter of programs take a walk-on at that mark or slower (shorter in the field events). Junior colleges aren't included; see <a href="/guides/njcaa-track-and-field-marks-by-event.html">NJCAA marks by event</a>.</p>
${tbl(["Event", "Typical walk-on", "1 in 4 programs", "1 in 10 programs", "Programs"], rows)}
<p>Distance and hurdle times are converted to the high school event the same way as the rest of the site (<a href="/convert.html">conversion tables</a>). Boys' shot put and discus are in high school implement terms.</p>
<h2>What should I do if no colleges fit my mark?</h2>
<ol><li><b>Check the event and the mark.</b> A 1600m entered as a mile, or a cross country 5K entered as a track 5000m, is the most common reason for zero fits.</li>
<li><b>Search your other events.</b> Every event is scored on its own, and a second event often fits far more programs.</li>
<li><b>Look at D3, NAIA and junior college.</b> They hold most of the open walk-on marks above, and the <a href="/guides/junior-college-track-and-field-recruiting.html">junior college route</a> lets you transfer up later.</li>
<li><b>Know where the line is.</b> Open your event's <a href="/how-fast.html">how fast do you need to be</a> page and note the 1 in 10 mark above. That's your first goal.</li>
<li><b>Tell coaches about your progress.</b> Coaches recruit on improvement. A clear email with your marks, grade and next meets goes a long way: <a href="/guides/how-to-email-college-track-coaches.html">how to email college track coaches</a>.</li></ol>
<h2>Common questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
<p><a href="/"><b>Search your mark against every college ›</b></a></p>`,
      ld: [{ "@context": "https://schema.org", "@type": "Article", headline: "My track time doesn't fit any college. What now?", dateModified: today, author: ORG, publisher: ORG, mainEntityOfPage: SITE + p },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] }));
    out.push([p, "My time doesn't fit any college: what now?", quick]);
  }

  /* ---------- data report from the search log ---------- */
  {
    let D; try { D = JSON.parse(fs.readFileSync(path.join(root, "scripts", "seo", "data", "search-report-2026-11.json"), "utf8")); } catch { return out; }
    const p = "/guides/high-school-track-recruiting-report-2026.html", csv = "/downloads/high-school-track-recruiting-report-2026.csv";
    const C = D.contact, gT = Object.values(D.grades).reduce((a, b) => a + b, 0), gp = k => Math.round(100 * D.grades[k] / gT);
    const top = D.events[0], fmtEv = (g, e) => `${HS(g).toLowerCase()} ${e}`;
    const quick = `${C.all[1]}% of the ${C.all[0].toLocaleString()} high school athletes who answered on Track Standards hadn't been contacted by a college coach yet, including ${C["12"][1]}% of seniors and ${C["11"][1]}% of juniors (Oct 17 to Nov 10, 2026). The ${fmtEv(top[0], top[1])} was the most searched event, and the typical searched mark fit ${top[3]} colleges.`;
    const evRows = D.events.map(([g, e, n, med, z, h]) => [`${HS(g)} ${esc(e)}`, n.toLocaleString(), med.toLocaleString(), `${h}%`, `${z}%`]);
    const ctRows = ["9", "10", "11", "12"].map(k => [`${k}th grade`, C[k][0].toLocaleString(), `${C[k][1]}%`, `${C[k][2]}%`, `${C[k][3]}%`]).concat([["All who answered", C.all[0].toLocaleString(), `${C.all[1]}%`, `${C.all[2]}%`, `${C.all[3]}%`]]);
    const faq = [
      ["How many high school track athletes have been contacted by college coaches?", `On Track Standards, ${C.all[1]}% of ${C.all[0].toLocaleString()} athletes who answered said no coach had contacted them yet, ${C.all[2]}% said a few had, and ${C.all[3]}% already had offers. Among seniors it was ${C["12"][1]}% not yet, ${C["12"][2]}% a few and ${C["12"][3]}% with offers.`],
      ["What is the most searched event for college track recruiting?", `The ${fmtEv(top[0], top[1])}: ${top[2].toLocaleString()} athletes searched it, then the ${fmtEv(D.events[1][0], D.events[1][1])} (${D.events[1][2].toLocaleString()}) and the ${fmtEv(D.events[2][0], D.events[2][1])} (${D.events[2][2].toLocaleString()}).`],
      ["How many colleges does a typical high school mark fit?", `It depends on the event. The typical searched ${fmtEv(top[0], top[1])} mark fit ${top[3]} colleges, the ${fmtEv("m", "400m")} ${D.events.find(r => r[0] === "m" && r[1] === "400m")[3]} and the girls 400m ${D.events.find(r => r[0] === "w" && r[1] === "400m")[3]}. Most searched marks fit 100 or more programs.`]];
    writeRaw(csv, ["section,group,event,athletes,median_colleges_fit,pct_fit_100_plus,pct_fit_zero,pct_not_contacted,pct_a_few,pct_offers"]
      .concat(D.events.map(([g, e, n, med, z, h]) => `events,${g === "m" ? "boys" : "girls"},"${e.replace(/"/g, '""')}",${n},${med},${h},${z},,,`))
      .concat(["9", "10", "11", "12", "all"].map(k => `coach_contact,${k === "all" ? "all" : "grade " + k},,${C[k][0]},,,,${C[k][1]},${C[k][2]},${C[k][3]}`)).join("\n") + "\n");
    write(p, page({ title: "High School Track Recruiting Report 2026: 5,860 Athletes",
      desc: `${C.all[1]}% of high school track athletes who answered hadn't heard from a college coach, ${C["12"][1]}% of seniors. Search data from 5,860 athletes, by event and grade.`,
      pathname: p, crumbs: [["Home", "/"], ["Guides", "/guides.html"], ["Recruiting report 2026", p]],
      h1: "High school track recruiting report: what 5,860 athletes searched (fall 2026)",
      intro: `<b>${esc(quick)}</b> <span class="upd">Data: Oct 17 to Nov 10, 2026. Published ${today}.</span>`,
      body: `<h2>How many high school athletes have heard from a college coach?</h2>
<p>After a search, the site asks one question: "Have college coaches contacted you yet?" Answers by grade:</p>
${tbl(["Grade", "Answered", "Not yet", "Yes, a few", "Offers already"], ctRows)}
<p>Even in the fall of senior year, ${C["12"][1]}% of seniors who answered hadn't been contacted. Coaches can't recruit athletes they don't know about, so a good mark alone often isn't enough; see <a href="/guides/how-to-email-college-track-coaches.html">how to email college track coaches</a>.</p>
<h2>Which events do high school athletes search most?</h2>
<p>One row per athlete per event (repeat searches by the same athlete count once). "Colleges fit" is how many programs the searched mark met at Walk-On level or better; the typical athlete is the median.</p>
${tbl(["Event", "Athletes", "Typical colleges fit", "Fit 100+", "Fit zero"], evRows)}
<p>Athletes whose mark fit zero colleges have their own guide: <a href="/guides/what-if-my-time-doesnt-fit-any-college.html">my time doesn't fit any college, what now?</a></p>
<h2>Who searched?</h2>
<p>${D.searchers.toLocaleString()} athletes searched in the window. Of those who picked a grade: ${gp("9")}% 9th graders, ${gp("10")}% 10th, ${gp("11")}% 11th and ${gp("12")}% 12th.</p>
<h2>Common questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
<h2>Method and data</h2>
<p>Source: Track Standards' own anonymous search log (a random browser ID, never names, emails or what anyone typed in chat; see the <a href="/privacy.html">privacy page</a>). Window: October 17 to November 10, 2026. Events with fewer than 80 athletes are left out. The coach question was answered by ${C.all[0].toLocaleString()} athletes; ${(C.all[0] - ["9", "10", "11", "12"].reduce((a, k) => a + C[k][0], 0)).toLocaleString()} of them hadn't picked a grade. Free to cite with a link to this page. <a href="${csv}" download>Download the data (CSV)</a>.</p>`,
      ld: [{ "@context": "https://schema.org", "@type": "Article", headline: "High school track recruiting report 2026", datePublished: today, dateModified: today, author: ORG, publisher: ORG, mainEntityOfPage: SITE + p },
        { "@context": "https://schema.org", "@type": "Dataset", name: "High school track recruiting search data, fall 2026", description: quick, url: SITE + p, creator: ORG, license: "https://creativecommons.org/licenses/by/4.0/", temporalCoverage: `${D.window[0]}/${D.window[1]}`, distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: SITE + csv }] },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }] }));
    out.push([p, "High school track recruiting report 2026 (5,860 athletes)", quick]);
  }
  return out;
}
