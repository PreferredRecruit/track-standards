/* 3 "gap" SEO + AEO guides (Ryan 2026-10-16: "go ahead for everything"). Wire next to topicPages() in prerender.mjs:
     const GAPS = gapGuides({ ...same context as topicPages });  then add GAPS to the guides hub, sitemap list and llms.txt.
   Same page contract as topics.mjs: answer-first Quick answer, question-style H2s, FAQ (FAQPage), Article (+ HowTo on the
   timeline), visible "Updated" date, cited sources, internal links.
   Every rule or number below was checked in Chrome on 2026-10-16 against an official source (NCAA / NCAA manuals / College
   Sports Commission / NAIA handbook / PlayNAIA). Quotes and URLs: social/standards/site/GAP-GUIDES-SOURCES.md.
   Marks come only from this site's standards data (medians across programs). NJCAA scholarship numbers are NOT stated:
   njcaa.org returned 403 errors on 2026-10-16, so those facts stay general and link the NJCAA. Never promise scholarships. */
const SRC = {
  csc: ["https://www.collegesportscommission.org/roster-limits/", "College Sports Commission: roster limits (old scholarship limits vs new roster limits)"],
  ncaaRoster: ["https://www.ncaa.org/news/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/", "NCAA: DI Board of Directors adopts roster limits (June 23, 2025)"],
  ncaaAid: ["https://www.ncaa.org/student-athletes/scholarships-and-financial-aid/", "NCAA: Scholarships and financial aid"],
  d2Aid: ["https://www.ncaa.org/division-ii/governance/membership-and-institutional-resources/athletics-scholarships/", "NCAA: Division II athletics scholarships and equivalency limits"],
  naiaAid: ["https://www.naia.org/student-athletes/current/financial-aid/", "NAIA: Financial aid"],
  naiaHb: ["https://www.naia.org/wp-content/uploads/2026/07/2026_Official_Handbook.pdf", "NAIA Official Handbook 2026-27"],
  naiaGuide: ["https://play.mynaia.org/media/pzaf3rnz/naia_guide_college_bound_student.pdf", "NAIA Guide for the College-Bound Student-Athlete"],
  recruiting: ["https://www.ncaa.org/eligibility-center/recruiting/", "NCAA: Recruiting (signing dates and recruiting calendars)"],
  d1Cal: ["https://ncaaorg.s3.amazonaws.com/compliance/recruiting/calendar/2026-27/2026-27D1Rec_XCTFRecruitingCalendar.pdf", "NCAA: 2026-27 Division I cross country and track and field recruiting calendar"],
  d1Man: ["https://www.ncaa.org/division-i/governance/legislation-and-policy/", "NCAA Division I Manual 2026-27 (Bylaws 13 and 17), via NCAA legislation and policy"],
  d2Man: ["https://www.ncaa.org/division-ii/governance/legislation-and-policy/", "NCAA Division II Manual 2026-27 (Bylaw 13), via NCAA legislation and policy"],
  d2Sum: ["https://ncaaorg.s3.amazonaws.com/compliance/forms/d2/2026-27/2026-27D2Comp_SummaryofNCAARegulations.pdf", "NCAA: 2026-27 Division II summary of regulations"],
  d3Sum: ["https://ncaaorg.s3.amazonaws.com/compliance/forms/d3/2026-27/2026-27D3Comp_SummaryofNCAARegulations.pdf", "NCAA: 2026-27 Division III summary of regulations"],
  d3Man: ["https://www.ncaa.org/division-iii/governance/legislation-and-policy/", "NCAA Division III Manual 2026-27 (Bylaw 13), via NCAA legislation and policy"],
  d1Elig: ["https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-i/", "NCAA: Division I initial eligibility"],
  d2Elig: ["https://www.ncaa.org/eligibility-center/initial-eligibility-requirements/division-ii/", "NCAA: Division II initial eligibility"],
  espnNli: ["https://www.espn.com/college-sports/story/_/id/41702974/ncaa-approves-elimination-national-letter-intent-program", "ESPN: NCAA approves elimination of the national letter of intent (Oct 9, 2024)"],
  njcaa: ["https://www.njcaa.org/", "NJCAA (official site)"],
};
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
const NAIA_REG = "https://play.mynaia.org/";
const JG = "/guides/junior-college-track-and-field-recruiting.html";

export const GAP_DATE = "2026-10-16";

/* quick answers are fixed text (official numbers, no site data), so the hub and llms.txt can use them without a build context */
const Q1 = "Yes. NCAA Division I, Division II and NAIA schools can give track and field scholarships, and NCAA Division III schools cannot. Since July 2025, D1 schools that opted into the House settlement can fund up to 45 athletes per track team, but the NCAA says most athletes get partial aid rather than a full ride.";
const Q2 = "NCAA Division II allows 12.6 full scholarship equivalencies each for men's and women's cross country and track, and the NAIA allows 12 for track and field. D1 schools in the House settlement have no scholarship cap, only a 45-athlete roster limit. Coaches split this money, so most track athletes get partial scholarships.";
const Q3 = "Build your list in 9th and 10th grade, then expect real contact in 11th. NCAA Division I track coaches can start calls and emails on June 15 after sophomore year and in-person contact on August 1 before junior year. The 2026-27 signing period for most D1 and D2 sports opens November 11, 2026.";

export const GAP_GUIDES = [
  { slug: "can-you-get-a-track-scholarship", title: "Can you get a track scholarship?", quick: Q1 },
  { slug: "how-many-track-and-field-scholarships", title: "How many track and field scholarships are there?", quick: Q2 },
  { slug: "track-and-field-recruiting-timeline-by-grade", title: "Track and field recruiting timeline by grade", quick: Q3 },
];

export function gapGuides({ S, CT, write, page, parse, esc, slug, evPath, FIELD, SITE, gName, STATE, statePath, resultPages, DATES, QUIZ }) {
  /* same median helpers as topics.mjs (site data only) */
  const raw = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const isF = e => FIELD.has(e);
  const ftin = x => { let i = Math.round((x / 0.0254) * 4) / 4, f = Math.floor(i / 12); i = i - f * 12; return `${f}'${String(i).replace(/\.0+$/, "")}"`; };
  const fmt = (e, x) => x == null ? "–" : isF(e) ? `${ftin(x)} (${x.toFixed(2)}m)` : x >= 60 ? `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}` : x.toFixed(2);
  const vals = (d, g, e, j) => S.filter(s => s.d === d).map(s => { const t = raw(s, g, e); return t ? parse(t[j], e) : null; }).filter(v => v != null).sort((a, b) => a - b);
  const med = (d, g, e, j) => { if (j === 1 && (d === "NCAA D3" || d === "NAIA")) return null; const v = vals(d, g, e, j); return v.length >= 12 ? v[Math.floor(v.length / 2)] : null; };
  const m = (d, g, e, j) => fmt(e, med(d, g, e, j));
  const n = d => S.filter(s => s.d === d).length;
  const tbl = (head, rows) => `<div class="scroll"><table><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ""}>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const a = ([u, t]) => `<a href="${u}" rel="noopener">${esc(t)}</a>`;
  const L = (u, t) => `<a href="${u}">${t}</a>`;
  const GP = s => `/guides/${s}.html`;
  const QA_CSS = `<style>.qa{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:14px 18px;margin:14px 0 6px}.qa b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}.qa p{margin:0}.upd{font-size:13px;color:var(--mute)}ol.how li{margin:6px 0}</style>`;
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const CORE = [["/", "Search your mark against every college"], ["/how-fast.html", "How fast do you need to run in college?"], [GP("ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field"), "D1 vs D2 vs D3 vs NAIA compared"]];
  const done = [];

  function art({ p, title, desc, h1, crumb, q0, answer, sections, faq = [], how, related = [], sources = [] }) {
    const url = SITE + p, upd = GAP_DATE, plain = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, datePublished: GAP_DATE, dateModified: upd, mainEntityOfPage: url, image: SITE + "/og.jpg", about: "College track and field recruiting and scholarships", citation: sources.map(([u]) => u) }];
    if (faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [[q0, answer], ...faq].map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) });
    if (how) ld.push({ "@context": "https://schema.org", "@type": "HowTo", name: plain(h1), step: how.map(([nm, tx], i) => ({ "@type": "HowToStep", position: i + 1, name: nm, text: plain(tx) })) });
    const body = QA_CSS + `<div class="qa"><b>Quick answer</b><p>${esc(answer)}</p></div><p class="upd">Updated ${upd} · Preferred Recruit · rules checked against official NCAA and NAIA sources, marks from ${S.length.toLocaleString()} college programs' standards</p>`
      + (how ? `<h2>Step by step</h2><ol class="how">${how.map(([nm, tx]) => `<li><b>${esc(nm)}.</b> ${tx}</li>`).join("")}</ol>` : "")
      + sections.map(([h, html]) => `<h2>${h}</h2>${html}`).join("")
      + (faq.length ? `<h2>Common questions</h2>${faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${x}</p>`).join("")}` : "")
      + (related.length ? `<h2>Related</h2><div class="links">${related.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>` : "")
      + (sources.length ? `<h2>Sources</h2><ul>${sources.map(([u, t]) => `<li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul><p class="upd">Rules change every year. Confirm dates and limits with the governing body and the school before you plan around them.</p>` : "");
    write(p, page({ title, desc, pathname: p, crumbs: [["Home", "/"], ["Guides", "/guides.html"], [crumb, p]], h1, body, ld }));
    done.push([p, crumb, answer]);
  }

  /* 1: can you get a track scholarship */
  {
    const evs = [["m", "100m"], ["w", "100m"], ["m", "400m"], ["w", "400m"], ["m", "1500m"], ["w", "1500m"]];
    art({ p: GP("can-you-get-a-track-scholarship"), crumb: "Can you get a track scholarship?",
      title: "Can You Get a Track Scholarship? Who Gets One (2026)", h1: "Can you get a track scholarship",
      desc: "Who gets track scholarships in 2026: which divisions give athletic aid, what the House settlement changed in D1, the marks it takes and how to get seen.",
      q0: "Can you get a track scholarship?", answer: Q1,
      sections: [
        ["Which colleges give track and field scholarships?", `<p>The NCAA says "Most, but not all Division I or II schools offer athletics scholarships," and Division III schools do not offer them. Division III athletes can still get academic scholarships and need-based aid. NAIA schools give athletic aid too, with each school deciding how much an athlete receives (${a(SRC.naiaAid)}).</p>
<p>Junior colleges in the NJCAA are another route with their own scholarship rules. Check the ${a(SRC.njcaa)} and see the ${L(JG, "junior college recruiting guide")}.</p>
${tbl(["Division", "Athletic scholarships for track?", "Programs on this site"], [["NCAA D1", "Yes, at most schools", String(n("NCAA D1"))], ["NCAA D2", "Yes, at most schools (partial model)", String(n("NCAA D2"))], ["NCAA D3", "No (academic and need-based aid only)", String(n("NCAA D3"))], ["NAIA", "Yes", String(n("NAIA"))]])}`],
        ["What changed with the House settlement?", `<p>From July 1, 2025, NCAA Division I rules no longer have sport-specific scholarship limits for schools in the settlement. Those schools have roster limits instead and may offer scholarships to any athlete on the roster (${a(SRC.ncaaRoster)}). Schools had to decide by June 30 whether to opt in for 2025-26.</p>
<p>For track and field, the roster limit is 45 athletes for men's indoor, men's outdoor, women's indoor and women's outdoor, and 17 for each cross country team. The old limits were 12.6 scholarships for men's track and 18 for women's (${a(SRC.csc)}). Each school still sets its own budget, so ask each coach how their program funds the roster.</p>`],
        ["Does a scholarship have to be a full ride?", `<p>No. The NCAA says most student-athletes receive partial aid rather than a full ride, and coaches decide who gets aid and how much (${a(SRC.ncaaAid)}). Many track families combine athletic money with academic scholarships, need-based grants and other aid. See ${L(GP("how-many-track-and-field-scholarships"), "how many track scholarships there are")} for how the money gets split.</p>`],
        ["What marks does it take?", `<p>Every school sets its own bar. Across ${n("NCAA D1")} NCAA D1 programs on this site, the typical Recruit mark (where scholarship conversations usually start) looks like this:</p>
${tbl(["Event", "D1 Recruit (median)", "D1 Walk-On (median)", "D2 Recruit (median)"], evs.map(([g, e]) => [`<a href="${evPath("NCAA D1", g, e)}">${esc(gName(g))} ${esc(e)}</a>`, esc(m("NCAA D1", g, e, 1)), esc(m("NCAA D1", g, e, 2)), esc(m("NCAA D2", g, e, 1))]))}
<p>See every event in ${L(GP("d1-track-and-field-scholarship-times"), "D1 scholarship times")}, the ${L(GP("college-track-and-field-walk-on-standards"), "walk-on standards")} and ${L("/how-fast.html", "how fast you need to run in college")}. Then search your own mark on the ${L("/", "standards finder")}.</p>`],
        ["How do you get seen by college coaches?", `<p>Coaches recruit athletes they know about. Build a list of schools where your marks fit, email the event coach with your marks, results links, grades and video, and send an update after every PR. Follow ${L(GP("how-to-get-recruited-for-track-and-field"), "how to get recruited for track and field")} and use the ${L(GP("how-to-email-college-track-coaches"), "coach email templates")}. Register with the ${a(["https://www.ncaa.org/eligibility-center/", "NCAA Eligibility Center"])} for D1 or D2 and with ${a([NAIA_REG, "PlayNAIA"])} for the NAIA.</p>`]],
      faq: [
        ["Do D3 schools give track scholarships?", `No. The NCAA says Division III schools do not offer athletics scholarships. They do award academic scholarships, need-based grants and other institutional aid (${a(SRC.ncaaAid)}).`],
        ["Did the House settlement give every D1 track athlete a scholarship?", `No. It removed the scholarship cap for schools that opted in and set a 45-athlete roster limit per track team. Each school still decides how much aid to give and to whom.`],
        ["Can a D1 school take away my scholarship if I lose my roster spot?", `The NCAA says that if an athlete on aid loses a roster spot for roster management, performance or injury, the scholarship cannot be revoked unless the athlete chooses to transfer (${a(SRC.ncaaRoster)}).`],
        ["Does hitting a standard guarantee a scholarship?", "No. Standards show where coaches look. Aid depends on the school's budget, roster needs, grades and timing."]],
      related: [[GP("how-many-track-and-field-scholarships"), "How many track scholarships are there?"], [GP("track-and-field-recruiting-timeline-by-grade"), "Recruiting timeline by grade"], [evPath("NCAA D1", "m", "400m"), "Every D1 men's 400m standard"], [evPath("NCAA D1", "w", "400m"), "Every D1 women's 400m standard"], [GP("d2-and-d3-track-and-field-scholarships"), "D2 and D3 opportunities"], ...CORE],
      sources: [SRC.ncaaAid, SRC.ncaaRoster, SRC.csc, SRC.d1Man, SRC.naiaAid, SRC.njcaa] });
  }

  /* 2: how many track and field scholarships */
  art({ p: GP("how-many-track-and-field-scholarships"), crumb: "How many track scholarships?",
    title: "How Many Track and Field Scholarships Are There? (2026)", h1: "How many track and field scholarships are there",
    desc: "Track scholarship limits for 2026 by division: D1 roster limits after the House settlement, D2 and NAIA equivalencies, and why full rides are rare.",
    q0: "How many track and field scholarships are there?", answer: Q2,
    sections: [
      ["How many scholarships does each division allow?", tbl(["Division", "Men's track", "Women's track", "Source"], [
        ["NCAA D1 (settlement schools, 2025-26 on)", "No scholarship cap, 45-athlete roster limit (indoor and outdoor each)", "No scholarship cap, 45-athlete roster limit (indoor and outdoor each)", a([SRC.d1Man[0], "NCAA D1 Bylaw 17.2"])],
        ["NCAA D1 (old limit, before July 2025)", "12.6", "18", a([SRC.csc[0], "College Sports Commission"])],
        ["NCAA D2", "12.6 (cross country and track combined)", "12.6 (cross country and track combined)", a([SRC.d2Aid[0], "NCAA Division II"])],
        ["NCAA D3", "None (no athletics scholarships)", "None (no athletics scholarships)", a([SRC.ncaaAid[0], "NCAA"])],
        ["NAIA", "12 (indoor and outdoor track), cross country 5", "12 (indoor and outdoor track), cross country 5", a([SRC.naiaHb[0], "NAIA Handbook 2026-27"])],
        ["NJCAA", "Set by the NJCAA", "Set by the NJCAA", a([SRC.njcaa[0], "NJCAA"])]])
        + `<p class="upd">D1 cross country has its own roster limit of 17 per team. D1 schools that did not opt into the settlement follow different rules, so ask the school.</p>`],
      ["What is the difference between equivalency and headcount scholarships?", `<p>In a headcount sport every scholarship is a full ride. The NCAA lists the D1 headcount sports as football, basketball, tennis, volleyball and gymnastics. Track and field is not on that list, so it has worked as an equivalency sport, where a school has a set number of full-scholarship equivalencies to divide among athletes (${a(SRC.ncaaAid)}).</p>
<p>The NAIA explains equivalencies with baseball: 12 full grant equivalencies can be spread across any number of athletes, such as one full grant, 10 half grants and 24 quarter grants (${a(SRC.naiaAid)}). Track works the same way with its own limit.</p>`],
      ["Why are full rides rare in track?", `<p>The NCAA says most student-athletes receive partial aid rather than a full ride, and that most Division II athletes receive partial scholarships (${a(SRC.ncaaAid)}). Equivalency limits let coaches divide a set budget among several athletes, as the NCAA and NAIA both describe. Settlement schools in D1 can now fund more athletes, but each school still sets its own budget.</p>`],
      ["How does track scholarship money get split?", `<p>Coaches decide who gets aid, how much and whether it is renewed, and the amount depends on the sport, division and school (${a(SRC.ncaaAid)}). Division II coaches may divide scholarship funds across multiple athletes and combine them with academic scholarships and grants (${a(SRC.d2Aid)}). In the NAIA, aid to academically gifted students can be exempt from the sport's limit if the student meets NAIA academic criteria (${a(SRC.naiaAid)}).</p>
<p>When you compare offers, look at the full cost after all aid, not only the athletic number. At D1 and D2, a school that plans to reduce or not renew your scholarship must tell you in writing by July 1 and give you the right to appeal (${a(SRC.ncaaAid)}).</p>`],
      ["Where do your marks fit?", `<p>Aid offers usually follow marks. Check the typical ${L(GP("d1-track-and-field-scholarship-times"), "D1 scholarship times")}, compare ${L(GP("d2-and-d3-track-and-field-scholarships"), "D2 and D3 standards")}, and search your mark on the ${L("/", "standards finder")} to see which programs it fits.</p>`]],
    faq: [
      ["How many scholarships does a D1 track team have now?", `Settlement schools have no scholarship cap. They can offer aid to athletes within a 45-athlete roster limit for each men's and women's indoor and outdoor track team (${a(SRC.d1Man)}).`],
      ["How many scholarships does D2 track and field have?", `12.6 equivalencies for men's cross country and track combined, and 12.6 for women's (${a(SRC.d2Aid)}).`],
      ["How many scholarships does NAIA track and field have?", `The NAIA Handbook sets an upper limit of 12 for indoor and outdoor track and field and 5 for cross country (${a(SRC.naiaHb)}).`],
      ["What is the average track scholarship amount?", "No official source publishes one for track. Ask each coach for the full aid package and compare the cost after all aid."]],
    related: [[GP("can-you-get-a-track-scholarship"), "Can you get a track scholarship?"], [GP("track-and-field-scholarships-for-female-athletes"), "Scholarships for female athletes"], [GP("d2-and-d3-track-and-field-scholarships"), "D2 and D3 opportunities"], [JG, "Junior college (NJCAA) recruiting"], ...CORE],
    sources: [SRC.d1Man, SRC.csc, SRC.ncaaRoster, SRC.d2Aid, SRC.ncaaAid, SRC.naiaAid, SRC.naiaHb, SRC.njcaa] });

  /* 3: recruiting timeline by grade */
  art({ p: GP("track-and-field-recruiting-timeline-by-grade"), crumb: "Recruiting timeline by grade",
    title: "Track and Field Recruiting Timeline by Grade (2026)", h1: "Track and field recruiting timeline by grade",
    desc: "What high school track athletes should do in 9th, 10th, 11th and 12th grade, with NCAA D1, D2 and D3 contact dates, NAIA rules and how signing works now.",
    q0: "What is the track and field recruiting timeline by grade?", answer: Q3,
    how: [
      ["9th grade", `Learn your events and race as many legal, fully timed marks as you can. Take NCAA-approved core courses: D1 and D2 each require 16 (${a(SRC.d1Elig)}). You can email coaches and fill out questionnaires at any age.`],
      ["10th grade", `Build a college list where your marks already fit using the <a href="/">standards finder</a>, make a <a href="${GP("how-to-build-a-track-and-field-recruiting-profile")}">recruiting profile</a> and start emailing coaches. For D1, ten core courses (seven in English, math or science) must be done before senior year (${a(SRC.d1Elig)}).`],
      ["Summer after 10th grade", `D1 track coaches can start calling and emailing you on June 15. D2 coaches can start in-person contact and paid visits on June 15 before junior year. Register with the <a href="https://www.ncaa.org/eligibility-center/" rel="noopener">NCAA Eligibility Center</a> and <a href="${NAIA_REG}" rel="noopener">PlayNAIA</a>.`],
      ["11th grade", `This is the key year. D1 coaches can make in-person contact and host official visits from August 1. Send coaches every new PR, especially indoor and outdoor championship marks, and take your official and unofficial visits.`],
      ["12th grade", `It is not too late. Keep emailing coaches with fall and indoor marks, compare offers by full cost, and sign a written offer of athletics aid when you are ready. The 2026-27 signing period for most D1 and D2 sports opens November 11, 2026 (${a(SRC.recruiting)}).`]],
    sections: [
      ["When can college track coaches contact you?", tbl(["Division", "Calls, texts and email from coaches", "In-person contact off campus", "First paid (official) visit"], [
        ["NCAA D1", "June 15 after sophomore year", "August 1 before junior year", "August 1 of junior year"],
        ["NCAA D2", "Any time", "June 15 before junior year", "June 15 before junior year"],
        ["NCAA D3", "Check the NCAA D3 rules", "After sophomore year", "January 1 of junior year"],
        ["NAIA", "Few restrictions", "Few restrictions", "Check with the school"]])
        + `<p>Sources: NCAA D1 Manual Bylaws 13.1.1.1, 13.1.3.1, 13.4.1, 13.6.2.1.1 and 13.7.1.1 (${a(SRC.d1Man)}); NCAA D2 Manual Bylaws 13.1.1.1 and 13.1.3.1 and the ${a(SRC.d2Sum)}; NCAA D3 Manual Bylaw 13.1.1.1 and the ${a(SRC.d3Sum)}; ${a(SRC.naiaGuide)}. Track and field and cross country follow the general D1 rule, with no sport exception. You can contact coaches yourself at any time.</p>
<p>D1 track also has a recruiting calendar with contact and dead periods during the year. See the ${a(SRC.d1Cal)}.</p>`],
      ["What should you do in 9th and 10th grade?", `<p>The NCAA notes that parents often lead the process in 9th and 10th grade, and that by 11th and 12th grade students should take ownership of communication (${a(SRC.recruiting)}). Use these years to set legal marks, keep your grades up and build a list. See ${L(GP("how-to-get-recruited-for-track-and-field"), "how to get recruited")}.</p>`],
      ["Why is junior year the key year?", `<p>Junior year is when D1 and D2 coaches can first recruit you in person and host your official visits, so every new mark from that year reaches coaches at the right time. Email coaches after every PR with the results link. Use the ${L(GP("how-to-email-college-track-coaches"), "email templates")}.</p>`],
      ["Is senior year too late to get recruited?", `<p>No. Programs still fill rosters during senior year, and a strong fall or indoor mark is a reason to email again. Junior colleges are another path. See the ${L(JG, "junior college guide")}.</p>`],
      ["How does signing work now?", `<p>The NCAA Division I Council eliminated the National Letter of Intent in October 2024, replacing it with a written financial aid agreement (${a(SRC.espnNli)}). Today you sign an athletics aid agreement. Once you sign, coaches from other NCAA schools that offer athletics scholarships must stop recruiting you (${a(SRC.recruiting)}).</p>
<p>A verbal commitment is not binding for you or the school (${a(SRC.recruiting)}).</p>`],
      ["How are the NAIA and NJCAA different?", `<p>The NAIA says its recruiting process has few restrictions on contact between athletes and coaches, and every first-time NAIA athlete must register with the NAIA Eligibility Center at PlayNAIA (${a(SRC.naiaGuide)}). An incoming freshman is eligible with a 2.3 high school GPA, or by meeting two of three: an 18 ACT or 970 SAT, a 2.0 GPA, or a top-half class rank (${a(SRC.naiaHb)}).</p>
<p>The NJCAA sets its own recruiting and eligibility rules. Check the ${a(SRC.njcaa)} for the current handbook.</p>`]],
    faq: [
      ["When can D1 track coaches start contacting me?", `Calls and electronic messages from June 15 after your sophomore year, and in-person off-campus contact from August 1 before your junior year (${a(SRC.d1Man)}).`],
      ["Can I email college coaches before then?", "Yes. The rules limit when coaches can start contact, not when you can reach out. You can email coaches and fill out questionnaires at any age."],
      ["Is there still a National Letter of Intent?", `No. It was eliminated in October 2024. Athletes now sign a written offer of athletics aid (${a(SRC.espnNli)}).`],
      ["When is signing day for track and field?", `For 2026-27, the initial signing date for all Division I and II sports other than basketball and football is November 11, 2026 (${a(SRC.recruiting)}).`]],
    related: [[GP("ncaa-track-and-field-recruiting-rules"), "NCAA recruiting rules"], [GP("can-you-get-a-track-scholarship"), "Can you get a track scholarship?"], [GP("how-many-track-and-field-scholarships"), "How many track scholarships?"], [GP("high-school-track-summer-training"), "Summer training"], [QUIZ, "Free recruitment evaluation"], ...CORE],
    sources: [SRC.d1Man, SRC.d1Cal, SRC.recruiting, SRC.d1Elig, SRC.d2Elig, SRC.d2Man, SRC.d2Sum, SRC.d3Man, SRC.d3Sum, SRC.naiaGuide, SRC.naiaHb, SRC.espnNli, SRC.njcaa] });

  return done;
}
