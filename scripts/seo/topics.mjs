/* 25 SEO + AEO topic guides (Ryan 2026-10-16: "secure SEO dominance … 25 strategic … high-intent search terms" and
   "we need to dominate AEO as well as SEO"). Called from prerender.mjs after hsPages().
   Every page is answer-first so search engines and AI answer engines can quote it:
     a 2-3 sentence "Quick answer", question-style headings, an FAQ (FAQPage), Article structured data (+ HowTo where it fits),
     a visible "Updated" date and cited sources. Numbers come only from this site's standards data (medians across programs);
     facts that are not in the data are kept general and linked to the governing body. Never promise scholarships.
     No coach emails anywhere: coach contact = links to each school's own staff / athletics pages. */
const DIVS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
const NCAA = "https://www.ncaa.org/sports/2021/2/8/about-resources-recruiting.aspx";
const ELIG = "https://web3.ncaa.org/ecwr3/";
const NAIA = "https://play.mynaia.org/";
const TFRRS = "https://www.tfrrs.org/";
const WA_RULES = "https://worldathletics.org/about-iaaf/documents/book-of-rules";
const NFHS = "https://www.nfhs.org/";

export const TOPIC_DATE = "2026-10-16";
/* per-guide content edits: dateModified + "Updated" follow the real edit date (2026-10-21: two #7-ranked guides rebuilt with data) */
export const EDITED = { "/guides/how-to-get-recruited-for-track-and-field.html": "2026-11-04", "/guides/how-to-email-college-track-coaches.html": "2026-10-21", "/guides/d1-track-and-field-scholarship-times.html": "2026-10-30" };

export function topicPages({ S, CT, write, page, parse, esc, slug, evPath, FIELD, SITE, gName, STATE, statePath, resultPages, DATES, QUIZ }) {
  const raw = (s, g, e) => { const o = (s.om || {})[g] || {}; if (o[e]) return o[e]; if (s.em) return (s.em[g] || {})[e] || null; const c = ((CT[s.ck] || {})[g] || {})[e]; return c ? c.map(v => (v ? v[0] : "")) : null; };
  const isF = e => FIELD.has(e);
  const ftin = x => { let i = Math.round((x / 0.0254) * 4) / 4, f = Math.floor(i / 12); i = i - f * 12; return `${f}'${String(i).replace(/\.0+$/, "")}"`; };
  const fmt = (e, x) => x == null ? "–" : isF(e) ? `${ftin(x)} (${x.toFixed(2)}m)` : x >= 60 ? `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}` : x.toFixed(2);
  const vals = (d, g, e, j) => S.filter(s => s.d === d).map(s => { const t = raw(s, g, e); return t ? parse(t[j], e) : null; }).filter(v => v != null).sort((a, b) => a - b);
  const med = (d, g, e, j) => { if (j === 1 && (d === "NCAA D3" || d === "NAIA")) return null; const v = vals(d, g, e, j); return v.length >= 12 ? v[Math.floor(v.length / 2)] : null; };
  const m = (d, g, e, j) => fmt(e, med(d, g, e, j));
  const n = d => S.filter(s => s.d === d).length;
  const nW = d => S.filter(s => s.d === d && raw(s, "w", "100m")).length;
  const nWall = S.filter(s => raw(s, "w", "100m")).length;
  const nOff = S.filter(s => s.o).length;
  const G = g => (g === "m" ? "mens" : "womens");
  const hsPath = (g, e) => `/how-fast/${G(g)}-${slug(e)}.html`;
  const tbl = (head, rows) => `<div class="scroll"><table><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ""}>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
  const NOTE = `<p class="upd">NCAA D3 and NAIA have no separate Recruit level on this site: their levels are Target and Walk-On.</p>`;
  const evTable = (g, evs, j) => { const D = j === 1 ? DIVS.slice(0, 2) : DIVS; return tbl(["Event", ...D.map(esc)], evs.map(e => [`<a href="${evPath("NCAA D1", g, e)}">${esc(gName(g))} ${esc(e)}</a>`, ...D.map(d => esc(m(d, g, e, j)))])) + (j === 1 ? NOTE : ""); };
  const lvlTable = (g, e) => tbl(["Division", "Target", "Recruit", "Walk-On", "Programs"], DIVS.map(d => [esc(d), ...[0, 1, 2].map(j => (j === 1 && (d === "NCAA D3" || d === "NAIA")) ? "not set" : esc(m(d, g, e, j))), String(n(d))])) + NOTE;
  const latest = (div, season, g, ev) => resultPages.filter(([, x, gg, e]) => x.div === div && x.season === season && gg === g && e === ev).sort((a, b) => b[1].year.localeCompare(a[1].year))[0] || null;
  const RUN = ["100m", "200m", "400m", "800m", "1500m", "5000m", "110m Hurdles", "400m Hurdles"], RUNW = ["100m", "200m", "400m", "800m", "1500m", "5000m", "100m Hurdles", "400m Hurdles"];
  const JMP = ["High Jump", "Long Jump", "Triple Jump", "Pole Vault"], THR = ["Shot Put", "Discus", "Hammer", "Javelin"];
  const QA_CSS = `<style>.qa{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:14px 18px;margin:14px 0 6px}.qa b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}.qa p{margin:0}.upd{font-size:13px;color:var(--mute)}ol.how li{margin:6px 0}.tpl{white-space:pre-wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;font-size:14px}</style>`;
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.org", logo: SITE + "/icon-512.png" };
  const GP = s => `/guides/${s}.html`;
  const CORE = [["/", "Search your mark against every college"], ["/how-fast.html", "How fast do you need to run in college?"], ["/guides/target-recruit-walk-on-explained.html", "Target, Recruit and Walk-On explained"], ["/guides/ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field.html", "D1 vs D2 vs D3 vs NAIA compared"]];
  const done = [];

  function art({ p, title, desc, h1, crumb, answer, sections, faq = [], how, related = [], sources = [] }) {
    const url = SITE + p, base = DATES.db > TOPIC_DATE ? DATES.db : TOPIC_DATE, upd = (EDITED[p] || "") > base ? EDITED[p] : base, plain = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, datePublished: TOPIC_DATE, dateModified: upd, mainEntityOfPage: url, image: SITE + "/og.jpg", about: "College track and field recruiting" }];
    if (faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [["Quick answer: " + plain(h1), answer], ...faq].map(([q, a]) => ({ "@type": "Question", name: q.replace(/^Quick answer: /, ""), acceptedAnswer: { "@type": "Answer", text: plain(a) } })) });
    if (how) ld.push({ "@context": "https://schema.org", "@type": "HowTo", name: plain(h1), step: how.map(([nm, tx], i) => ({ "@type": "HowToStep", position: i + 1, name: nm, text: plain(tx) })) });
    const body = QA_CSS + `<div class="qa"><b>Quick answer</b><p>${answer}</p></div><p class="upd">Updated ${upd} · Preferred Recruit · built from ${S.length.toLocaleString()} college programs' standards</p>`
      + (how ? `<h2>Step by step</h2><ol class="how">${how.map(([nm, tx]) => `<li><b>${esc(nm)}.</b> ${tx}</li>`).join("")}</ol>` : "")
      + sections.map(([h, html]) => `<h2>${h}</h2>${html}`).join("")
      + (faq.length ? `<h2>Common questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${a}</p>`).join("")}` : "")
      + (related.length ? `<h2>Related</h2><div class="links">${related.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>` : "")
      + (sources.length ? `<h2>Sources</h2><ul>${sources.map(([u, t]) => `<li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>` : "");
    write(p, page({ title, desc, pathname: p, crumbs: [["Home", "/"], ["Guides", "/guides.html"], [crumb, p]], h1, body, ld }));
    done.push([p, crumb, plain(answer)]);
  }

  /* 1 */
  art({ p: GP("track-and-field-recruiting-standards-2026"), crumb: "Recruiting standards 2026",
    title: "Track and Field Recruiting Standards 2026: Every Division and Event", h1: "Track and field recruiting standards 2026",
    desc: `2026 college track and field recruiting standards for NCAA D1, D2, D3 and NAIA: typical Target, Recruit and Walk-On marks in every event, from ${S.length.toLocaleString()} programs.`,
    answer: `Recruiting standards are the marks college coaches use to decide who they recruit. Across ${n("NCAA D1")} NCAA D1 programs, the typical Walk-On mark is ${m("NCAA D1", "m", "100m", 2)} in the men's 100m and ${m("NCAA D1", "w", "100m", 2)} in the women's 100m. Every school sets its own, so check the exact school before you plan around a number.`,
    sections: [["What does each level mean?", `<p>Target is the range that usually gets the strongest scholarship interest. Recruit is where coaches start real conversations. Walk-On is the minimum to make the roster. ${nOff} schools publish their own official standards, and the rest are set from their conference's 2026 results.</p>`],
      ["Men's 2026 Walk-On marks by division", evTable("m", RUN.concat(JMP, ["Shot Put", "Discus"]), 2)],
      ["Women's 2026 Walk-On marks by division", evTable("w", RUNW.concat(JMP, ["Shot Put", "Discus"]), 2)],
      ["How to use these numbers", `<p>Treat the table as the middle of each division. A school near the top of D1 will ask for more, and a smaller program will ask for less. Search your own mark on the <a href="/">standards finder</a> to see the exact schools it fits.</p>`]],
    faq: [["Are these the official standards for every school?", `No. ${nOff} schools publish their own standards, which are shown with a star on each school page. The rest come from conference results and show where athletes actually placed.`],
      ["Do high school times convert to college events?", `Yes. The 1600m, 3200m and 300m hurdles are converted to college events automatically. See the <a href="/convert.html">conversion tables</a>.`],
      ["Does hitting a standard guarantee a scholarship?", "No. Standards show where coaches look, but scholarships depend on the school's budget, roster needs, grades and timing."]],
    related: CORE, sources: [[TFRRS, "TFRRS college results"], [NCAA, "NCAA recruiting resources"]] });

  /* 2 */
  art({ p: GP("d1-track-and-field-scholarship-times"), crumb: "D1 scholarship times",
    title: "D1 Track and Field Scholarship Standards and Times (2026)", h1: "D1 track and field scholarship times",
    desc: `What times and marks get D1 track and field scholarship interest? Typical NCAA D1 Target and Recruit marks for every men's and women's event, from ${n("NCAA D1")} programs.`,
    answer: `At a typical NCAA D1 program, scholarship conversations start around ${m("NCAA D1", "m", "100m", 1)} in the men's 100m and ${m("NCAA D1", "w", "100m", 1)} in the women's 100m (the Recruit level). The strongest scholarship interest usually starts near ${m("NCAA D1", "m", "100m", 0)} for men and ${m("NCAA D1", "w", "100m", 0)} for women (the Target level).`,
    sections: [["Men's D1 scholarship marks", tbl(["Event", "Target (strongest interest)", "Recruit (conversations start)"], RUN.concat(JMP, THR).map(e => [`<a href="${evPath("NCAA D1", "m", e)}">${esc(e)}</a>`, esc(m("NCAA D1", "m", e, 0)), esc(m("NCAA D1", "m", e, 1))]))],
      ["Women's D1 scholarship marks", tbl(["Event", "Target (strongest interest)", "Recruit (conversations start)"], RUNW.concat(JMP, THR).map(e => [`<a href="${evPath("NCAA D1", "w", e)}">${esc(e)}</a>`, esc(m("NCAA D1", "w", e, 0)), esc(m("NCAA D1", "w", e, 1))]))],
      ["Why the money depends on more than your time", `<p>Track scholarships are often split across several athletes, so a mark at the Recruit level can mean a partial offer, and academic aid can close the gap. The biggest programs ask for more than these medians, and many smaller D1 programs ask for less.</p>`]],
    faq: [["Is there one D1 scholarship time for each event?", "No. Each program sets its own, so the same time can earn an offer at one school and a walk-on spot at another."],
      ["Are these high school or college times?", "College marks. For high school 1600m, 3200m and 300m hurdle times, use the conversions on the how-fast pages."],
      ["Do D1 schools give full rides in track?", "Some do for top recruits, but most track scholarships are partial and combined with academic aid."]],
    related: [...CORE, [GP("college-track-and-field-walk-on-standards"), "Walk-on standards"]], sources: [[NCAA, "NCAA recruiting resources"], [TFRRS, "TFRRS college results"]] });

  /* 3: the pillar guide (Ryan 2026-11-04: "how do I get recruited for track"; NCSA's page runs ~2,700 words with question headings).
     Answer first, question headings in the searcher's words, live standards from this site's data. It shows what recruiting takes
     and hands the doing to the free evaluation (2026-11-03 rule: no DIY outreach kit on the site). */
  const PRO = "https://thepreferredrecruit.org";
  const SERVICE = `<p>That is a lot of work to do well for months, alongside school and training. <a href="${PRO}/how-it-works?utm_source=standards&utm_medium=guide&utm_campaign=recruiting">Preferred Recruit does it for your family</a>: a one-on-one plan, personal emails from the athlete's own account, a feature on the Preferred Recruit Instagram, and direct support through every reply, visit and offer. See <a href="${PRO}/results?utm_source=standards&utm_medium=guide&utm_campaign=recruiting">where our athletes signed</a>.</p>`;
  const STEPS = [["Know where your marks fit", `Enter your event and best mark on the <a href="/">standards finder</a> to see every college where it is a Target, Recruit or Walk-On level. That list is your starting point.`],
    ["Register where required", `Athletes aiming for NCAA D1 or D2 register with the <a href="${ELIG}" rel="noopener">NCAA Eligibility Center</a>, and NAIA athletes register at <a href="${NAIA}" rel="noopener">PlayNAIA</a>. Do it before senior year so visits and offers aren't delayed.`],
    ["Get in front of the right coaches", "Coaches recruit the athletes they know about. Each program on your list needs to hear from you directly, with your marks, results link, grades and graduation year, sent to the coach who runs your event."],
    ["Keep them updated", "One email rarely gets the answer. Coaches respond to athletes who keep sending new marks, especially indoor and outdoor championship results."],
    ["Talk, visit and compare", "When a coach replies, the calls, visits and offers start. Compare programs by fit and full cost, not only the athletic money."],
    ["Commit and sign", `Sign a written offer when you are ready. The <a href="${GP("track-and-field-recruiting-timeline-by-grade")}">timeline by grade</a> has the current signing dates.`]];
  const LOOK = (g) => `<p>Coaches start with the mark. Below is the typical Recruit level in NCAA D1 and D2, where scholarship conversations usually begin, for ${g === "m" ? "men" : "women"}.</p>${evTable(g, g === "m" ? ["100m", "200m", "400m", "800m", "1500m", "5000m", "110m Hurdles", "Long Jump", "Triple Jump", "Shot Put"] : ["100m", "200m", "400m", "800m", "1500m", "5000m", "100m Hurdles", "Long Jump", "Triple Jump", "Shot Put"], 1)}`;
  const PILLAR_FAQ = [["How do I get recruited for track?", "Find the colleges where your marks already fit, register with the NCAA Eligibility Center or PlayNAIA, get your marks in front of the event coach at each program, and keep sending new marks until coaches reply."],
    ["Do college coaches find track athletes on their own?", "Some do, through results databases and big meets, but in track and field most recruited athletes reached out first. Coaches can't recruit an athlete they've never heard of."],
    ["When do track coaches start recruiting?", "NCAA D1 coaches can start calls and emails on June 15 after sophomore year, and junior year is when most lists get built. Seniors still get recruited, especially by D2, D3 and NAIA programs."],
    ["What GPA do you need for college track?", `The NCAA Eligibility Center sets the minimum for D1 and D2 (16 core courses), and many programs look for more. Grades also unlock academic aid that stacks with athletic money. See <a href="${ELIG}" rel="noopener">NCAA initial eligibility</a>.`],
    ["Do I need a recruiting video?", "Usually not. Track coaches recruit on marks they can verify. A short race or jump video helps in technical events like pole vault, hurdles and the throws."],
    ["Does club track count?", "Yes, if the meet is sanctioned and the results are public. Coaches care that the mark is legal and verifiable, not which team you wore."],
    ["Which marks count for recruiting?", `Fully automatic (FAT) times and wind-legal marks from sanctioned meets. See <a href="${GP("understanding-track-and-field-prs-for-recruiting")}">understanding PRs</a>.`],
    ["Do I need a recruiting service?", "No. Every step can be done by a family. A service like Preferred Recruit does the outreach and follow-ups for you and guides the offers, which saves months and reaches more programs."]];
  const pillar = (g) => {
    const G2 = g ? (g === "m" ? "men's" : "women's") : "", who = g ? (g === "m" ? "boys" : "girls") : "", slugp = g ? `how-to-get-recruited-for-${g === "m" ? "mens" : "womens"}-track-and-field` : "how-to-get-recruited-for-track-and-field";
    const ex = g || "m", e4 = "400m";
    art({ p: GP(slugp), crumb: g ? `How to get recruited (${G2})` : "How to get recruited",
      title: g ? `How to Get Recruited for ${g === "m" ? "Men's" : "Women's"} College Track and Field` : "How to Get Recruited for Track and Field (Step by Step)",
      h1: g ? `How to get recruited for ${G2} college track and field` : "How to get recruited for track and field",
      desc: g ? `How high school ${who} get recruited for ${G2} college track and field: the marks coaches look for in every event and division, when recruiting starts, and how offers work.`
        : "How high school athletes get recruited for college track and field: where your marks fit, when coaches start recruiting, what they look for, and how visits and offers work.",
      answer: g ? `Find the colleges where your marks already fit, get them in front of the event coach at each program, and keep sending new marks until coaches reply. At a typical NCAA D1 program the roster mark in the ${G2} ${e4} is about ${m("NCAA D1", g, e4, 2)}, and scholarship conversations start near ${m("NCAA D1", g, e4, 1)}.`
        : `Find the colleges where your marks already fit, get them in front of the event coach at each program, and keep sending new marks until coaches reply. At a typical NCAA D1 program the roster mark in the 400m is about ${m("NCAA D1", "m", "400m", 2)} for men and ${m("NCAA D1", "w", "400m", 2)} for women, and it drops at D2, D3 and NAIA.`,
      how: STEPS,
      sections: [["How does track and field recruiting work?", `<p>In football and basketball, coaches scout and come to you. Track is different: results are public, every college roster is small, and coaches get far more emails than they can answer, so they recruit the athletes who reach them with a mark that fits. Your time or distance does most of the talking, and the rest is being seen by the right coach at the right time. The full process, from the first email to signing, is in <a href="${GP("college-track-recruiting-process")}">how the college track recruiting process works</a>.</p>`],
        ["When does track recruiting start?", `<p>You can contact coaches at any age. NCAA D1 coaches can start calls and emails on June 15 after sophomore year, and in-person contact on August 1 before junior year, so junior year is when most lists get built. Seniors still get recruited, especially by D2, D3, NAIA and junior college programs. See the <a href="${GP("track-and-field-recruiting-timeline-by-grade")}">recruiting timeline by grade</a>.</p>`],
        [g ? `How fast do ${who} need to be?` : "How fast do you need to be?", `<p>These are the typical marks that put an athlete on a college roster (the Walk-On level), from each program's official chart or its conference results. Every school sets its own, so check the exact schools on the <a href="/">standards finder</a>.</p>${g ? evTable(g, g === "m" ? RUN.concat(JMP, THR) : RUNW.concat(JMP, THR), 2) : evTable("m", ["100m", "200m", "400m", "800m", "1500m", "110m Hurdles", "Long Jump", "Shot Put"], 2) + evTable("w", ["100m", "200m", "400m", "800m", "1500m", "100m Hurdles", "Long Jump", "Shot Put"], 2)}`],
        ["What do college track coaches look for?", LOOK(ex) + `<p>After the mark, coaches look at how fast it is improving, grades, which events their roster needs this year, and how you compete in championship races. More in <a href="${GP("what-college-track-coaches-look-for")}">what college track coaches look for</a>.</p>`],
        ["Which division is right for you?", `<p>Pick by where your marks fit and what you want from college, not by the label. D1 has the most money and the highest standards, D2 and NAIA give athletic aid at lower marks, and D3 gives no athletic scholarships but often strong academic aid. Compare them in <a href="${GP("ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field")}">D1 vs D2 vs D3 vs NAIA</a>.</p>`],
        ["How do track scholarship offers work?", `<p>Most track scholarships are partial, and coaches split their budget across the roster, so many families combine athletic money with academic and need-based aid. See <a href="${GP("how-track-scholarship-offers-work")}">how track scholarship offers work</a> and <a href="${GP("how-many-track-and-field-scholarships")}">how many scholarships each division has</a>.</p>`],
        ["What it takes to do it well", `<p>Families who get recruited reach dozens of programs, write to each event coach personally, follow up for months, send every new mark, and answer coaches quickly and correctly once they reply.</p>${SERVICE}`]],
      faq: PILLAR_FAQ,
      related: [["/recruiting.html", "The recruiting guide, start to finish"], ...(g ? [[GP("how-to-get-recruited-for-track-and-field"), "How to get recruited (all athletes)"], [GP(`how-to-get-recruited-for-${g === "m" ? "womens" : "mens"}-track-and-field`), `How to get recruited (${g === "m" ? "women's" : "men's"})`]] : [[GP("how-to-get-recruited-for-mens-track-and-field"), "Men's track recruiting"], [GP("how-to-get-recruited-for-womens-track-and-field"), "Women's track recruiting"]]), ...CORE],
      sources: [[ELIG, "NCAA Eligibility Center"], [NAIA, "PlayNAIA eligibility"], [NCAA, "NCAA recruiting resources"]] });
  };
  pillar(null); pillar("m"); pillar("w");

  /* the recruiting process, start to finish (2026-11-04) */
  art({ p: GP("college-track-recruiting-process"), crumb: "The recruiting process",
    title: "How the College Track Recruiting Process Works (Step by Step)", h1: "How the college track and field recruiting process works",
    desc: "The college track and field recruiting process from first contact to signing: building a list, reaching coaches, replies, calls, visits, offers and commitment.",
    answer: "The process runs in six stages: a list of programs where your marks fit, first contact with each event coach, coach replies, calls and visits, written offers, and signing. Most athletes move through it in junior and senior year, and it only starts once the right coaches know your name.",
    how: [["The list", "Programs where your marks already fit, by division, conference, location and major."], ["First contact", "The event coach at each program hears from the athlete directly, with marks, results link, grades and graduation year."],
      ["Replies", "Interested coaches answer with questions, a questionnaire or a request for a call."], ["Calls and visits", "Phone or video calls with the coach, then unofficial and official visits."], ["Offers", "A written offer of a roster spot and any athletic aid, often combined with academic aid."], ["Commitment and signing", "The athlete commits and signs a written offer during the signing period."]],
    sections: [["What happens at each stage?", `<p><b>The list.</b> Start wide, usually 30 or more programs across divisions, so you have options when replies come in. The <a href="/">standards finder</a> shows where a mark fits today.</p><p><b>First contact.</b> Coaches can't recruit an athlete they've never heard of. Contact is allowed at any age from the athlete's side; NCAA rules only limit when coaches can start it (<a href="${GP("ncaa-track-and-field-recruiting-rules")}">recruiting rules</a>).</p><p><b>Replies.</b> A reply is genuine interest: the coach wants to know more. Answer quickly, with the facts they asked for.</p><p><b>Calls and visits.</b> Coaches use calls to learn about the athlete and family. Visits are where most families decide. Ask about roster spots, training and how aid works.</p><p><b>Offers.</b> An offer names the roster spot and the money. See <a href="${GP("how-track-scholarship-offers-work")}">how offers work</a>.</p><p><b>Signing.</b> The 2026-27 signing period for most D1 and D2 sports opens November 11, 2026 (<a href="${GP("track-and-field-recruiting-timeline-by-grade")}">timeline by grade</a>).</p>`],
      ["How long does the process take?", "<p>From first contact to an offer usually takes weeks to months, and the best results come from starting before junior year ends. Every new mark restarts conversations, so the process runs through the indoor and outdoor seasons.</p>"],
      ["Who does what?", `<p>The athlete races and keeps marks and grades up. The family manages the list, the contact and the follow-ups, and handles calls, visits and offers. The high school coach can vouch for the athlete when a college coach asks.</p>${SERVICE}`]],
    faq: [["How many schools should a track athlete contact?", "Most families reach 30 or more programs across several divisions. A wide list gives more replies and better offers to compare."],
      ["What counts as interest from a coach?", "A personal reply, a request for a call or visit, or an invitation to apply. A generic camp email is not interest."],
      ["Is it too late as a senior?", "No. Seniors still get recruited, especially by D2, D3, NAIA and junior college programs, and fall and indoor marks keep doors open."]],
    related: [["/recruiting.html", "The recruiting guide, start to finish"], [GP("how-to-get-recruited-for-track-and-field"), "How to get recruited"], [GP("track-and-field-recruiting-timeline-by-grade"), "Timeline by grade"], ...CORE.slice(0, 2)],
    sources: [[NCAA, "NCAA recruiting resources"], [ELIG, "NCAA Eligibility Center"]] });

  /* what coaches look for (2026-11-04) */
  art({ p: GP("what-college-track-coaches-look-for"), crumb: "What coaches look for",
    title: "What College Track Coaches Look For in Recruits", h1: "What college track coaches look for in recruits",
    desc: "What college track and field coaches look for: the marks that fit each division, improvement, grades, roster needs and championship racing, with typical Recruit marks by event.",
    answer: `Coaches start with the mark: at a typical NCAA D1 program, scholarship conversations begin near ${m("NCAA D1", "m", "100m", 1)} in the men's 100m and ${m("NCAA D1", "w", "100m", 1)} in the women's 100m. After that they look at improvement, grades, which events their roster needs, and how the athlete races in big meets.`,
    sections: [["The mark comes first", LOOK("m") + evTable("w", ["100m", "200m", "400m", "800m", "1500m", "5000m", "100m Hurdles", "Long Jump", "Triple Jump", "Shot Put"], 1)],
      ["Improvement", "<p>A steady drop in times or rise in marks tells a coach there is more to come. A junior who improved a lot this year can be a stronger recruit than a senior with a slightly better best mark.</p>"],
      ["Grades", `<p>Grades decide eligibility and unlock academic aid, which is how many track offers become affordable. D1 and D2 need 16 NCAA core courses (<a href="${ELIG}" rel="noopener">NCAA Eligibility Center</a>).</p>`],
      ["Roster needs", "<p>Every coach recruits to fill gaps: a team losing three seniors in the 400m needs 400m runners. The same mark can get a fast reply from one program and silence from another, which is why a wide list matters.</p>"],
      ["Racing in big meets", "<p>State, sectional and national meets show how an athlete handles pressure and rounds. Championship marks carry weight because coaches know the competition was real.</p>"],
      ["Legal, verifiable marks", `<p>Coaches trust fully automatic (FAT) times and wind-legal marks from sanctioned meets with public results. See <a href="${GP("understanding-track-and-field-prs-for-recruiting")}">understanding PRs</a>.</p>${SERVICE}`]],
    faq: [["Do coaches care about grades in track?", "Yes. Grades decide NCAA eligibility and academic aid, and many programs combine academic and athletic money in one offer."],
      ["Do coaches look at height or build?", "Less than in most sports. The mark matters most, with technique and room to grow in the jumps and throws."],
      ["Is one great race enough?", "It helps, but coaches look for marks they can trust: several strong legal results, ideally in championship meets."]],
    related: [["/recruiting.html", "The recruiting guide, start to finish"], [GP("how-to-get-recruited-for-track-and-field"), "How to get recruited"], [GP("d1-track-and-field-scholarship-times"), "D1 scholarship times"], ...CORE.slice(0, 2)],
    sources: [[ELIG, "NCAA Eligibility Center"], [TFRRS, "TFRRS college results"]] });

  /* how offers work (2026-11-04) */
  art({ p: GP("how-track-scholarship-offers-work"), crumb: "How offers work",
    title: "How Track and Field Scholarship Offers Work", h1: "How track and field scholarship offers work",
    desc: "How college track and field scholarship offers work: partial vs full scholarships, academic aid, D1, D2, D3 and NAIA differences, and what to ask before you commit.",
    answer: "A track offer names a roster spot and how much athletic aid comes with it. Most offers are partial scholarships, coaches split their budget across the team, and many families combine athletic money with academic and need-based aid. NCAA D3 schools give no athletic scholarships, only academic and need-based aid.",
    sections: [["What is in a track offer?", "<p>An offer says which program wants the athlete, for which season, and how much athletic aid comes with it, usually as a share of the cost of attendance. It may sit alongside an academic scholarship from the admissions office.</p>"],
      ["Partial vs full scholarships", `<p>Full rides are rare in track. The NCAA says most student-athletes receive partial aid, and coaches divide a set budget across the roster. Since July 2025, D1 schools in the House settlement have no scholarship cap but a 45-athlete roster limit per team; D2 allows 12.6 equivalencies and the NAIA 12. Details in <a href="${GP("how-many-track-and-field-scholarships")}">how many track scholarships each division has</a>.</p>`],
      ["How academic aid stacks", "<p>Strong grades can add merit aid from the school, and need-based aid depends on the family's finances. Many of the best track packages combine all three, which is why grades matter as much as marks.</p>"],
      ["What to ask before you commit", "<ul><li>How much is athletic aid, and does it change after the first year?</li><li>Is there academic or need-based aid on top?</li><li>What does the full cost come to after all aid?</li><li>Is the roster spot secure for four years?</li><li>How does the program train your event, and who coaches it?</li></ul>"],
      ["Comparing offers", `<p>Compare by the full cost after all aid, the fit with the coach and the academics, not by the size of the athletic number alone.</p>${SERVICE}`]],
    faq: [["Can you negotiate a track scholarship?", "Families can ask a coach to reconsider, especially with a better offer elsewhere or a new mark. Coaches answer within their budget and roster plan."],
      ["Do D3 schools give track scholarships?", "No athletic scholarships. D3 schools give academic and need-based aid, which can still make the total cost low."],
      ["Is a verbal offer binding?", "No. A written offer of athletic aid is what counts, signed during the signing period."]],
    related: [["/recruiting.html", "The recruiting guide, start to finish"], [GP("can-you-get-a-track-scholarship"), "Can you get a track scholarship?"], [GP("how-many-track-and-field-scholarships"), "How many scholarships"], ...CORE.slice(0, 2)],
    sources: [["https://www.ncaa.org/sports/2014/10/6/scholarships.aspx", "NCAA: Scholarships and financial aid"], ["https://www.naia.org/", "NAIA"]] });

  /* the recruiting hub (2026-11-04): one ordered path through every recruiting guide */
  {
    const PATH = [["Start here", [[GP("how-to-get-recruited-for-track-and-field"), "How to get recruited for track and field", "The whole plan on one page."], [GP("college-track-recruiting-process"), "How the recruiting process works", "From the first email to signing."], [GP("track-and-field-recruiting-timeline-by-grade"), "Recruiting timeline by grade", "What happens in 9th to 12th grade."]]],
      ["Where you fit", [["/how-fast.html", "How fast do you need to run in college?", "Every event, every division."], [GP("what-college-track-coaches-look-for"), "What college coaches look for", "Marks, improvement, grades, roster needs."], [GP("ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field"), "D1 vs D2 vs D3 vs NAIA", "Which division is right for you."], [GP("target-recruit-walk-on-explained"), "Target, Recruit and Walk-On explained", "What the levels on this site mean."]]],
      ["Men and women", [[GP("how-to-get-recruited-for-mens-track-and-field"), "Men's track and field recruiting", "Marks for every men's event."], [GP("how-to-get-recruited-for-womens-track-and-field"), "Women's track and field recruiting", "Marks for every women's event."]]],
      ["Rules and offers", [[GP("ncaa-track-and-field-recruiting-rules"), "NCAA recruiting rules", "When coaches can contact you."], [GP("how-track-scholarship-offers-work"), "How scholarship offers work", "Partial aid, academic aid, what to ask."], [GP("how-many-track-and-field-scholarships"), "How many track scholarships", "Limits by division."], [GP("college-track-and-field-walk-on-standards"), "Walk-on standards", "The marks to make a roster."]]],
      ["Other paths", [[GP("junior-college-track-and-field-recruiting"), "Junior college recruiting", "The NJCAA route."], [GP("college-cross-country-recruiting-times"), "Cross country recruiting times", "XC standards by division."], [GP("recruiting-tips-for-multi-event-athletes"), "Multi-event athletes", "Decathlon and heptathlon."]]]];
    const all = PATH.flatMap(([, L]) => L), p = "/recruiting.html";
    write(p, page({ title: "Track and Field Recruiting Guide: How It Works, Start to Finish", desc: "The complete track and field recruiting guide for high school athletes and parents: how to get recruited, the process, timeline, standards, rules and scholarship offers.",
      pathname: p, crumbs: [["Home", "/"], ["Recruiting", p]], h1: "Track and field recruiting, start to finish",
      intro: "Everything a high school athlete and family need to know about getting recruited for college track and field, in the order it happens. Every page uses this site's standards for 1,157 college programs.",
      body: PATH.map(([h, L]) => `<h2>${esc(h)}</h2><div class="rgl">${L.map(([u, t, d]) => `<a href="${u}"><b>${esc(t)}</b><span>${esc(d)}</span></a>`).join("")}</div>`).join("")
        + `<style>.rgl{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.rgl a{display:block;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:#fff;text-decoration:none}.rgl a:hover{border-color:var(--accent);text-decoration:none}.rgl b{display:block;color:var(--ink);font-size:16px}.rgl span{display:block;color:var(--mute);font-size:14px;margin-top:4px}</style>`
        + `<h2>Want it done for you?</h2>${SERVICE}`,
      ld: [{ "@context": "https://schema.org", "@type": "ItemList", name: "Track and field recruiting guide", itemListElement: all.map(([u, t], i) => ({ "@type": "ListItem", position: i + 1, name: t, url: SITE + u })) }] }));
    done.push([p, "Recruiting guide, start to finish", "The complete track and field recruiting guide."]);
  }

  /* 4 */
  art({ p: GP("milesplit-vs-flotrack-for-recruiting"), crumb: "MileSplit vs FloTrack",
    title: "MileSplit vs FloTrack for Track Recruiting: What Each One Is For", h1: "MileSplit vs FloTrack for recruiting",
    desc: "MileSplit vs FloTrack for high school track recruiting: what each site is for, how coaches use results databases, and where college standards fit in.",
    answer: "MileSplit is mainly a high school results and rankings database, and FloTrack is mainly video, live streams and news; both are part of FloSports. Coaches use results databases to confirm marks, but neither one tells you which colleges your marks fit, which is what college standards are for.",
    sections: [["How coaches use results sites", "<p>When a coach gets your email, they usually look your marks up to confirm them. That makes it worth keeping your results correct and complete on the high school databases your state uses, such as MileSplit or Athletic.net.</p>"],
      ["Where rankings help and where they don't", "<p>A state or national ranking tells a coach you are good compared with other high schoolers. It does not tell you how your mark compares with what that college's athletes run, so pair the ranking with the school's standards before you decide where to apply.</p>"],
      ["Where this site fits", `<p>This site compares your mark with college recruiting standards and college results from <a href="${TFRRS}" rel="noopener">TFRRS</a>, the results system college programs use. Use it to build your list, then point coaches to your high school results for proof.</p>`]],
    faq: [["Do college coaches look at MileSplit rankings?", "Many coaches check high school results databases to confirm marks, especially for athletes who emailed them."],
      ["Is FloTrack a recruiting service?", "FloTrack is a media and streaming platform. It covers high school and college track but does not place athletes with colleges."],
      ["Where do I see college results?", `College results are on TFRRS, and this site's <a href="/explore.html#results">results pages</a> show the national top marks by event.`]],
    related: CORE, sources: [[TFRRS, "TFRRS college results"], ["https://www.milesplit.com/", "MileSplit"], ["https://www.flotrack.org/", "FloTrack"], ["https://www.athletic.net/", "Athletic.net"]] });

  /* 5 */
  art({ p: GP("college-track-and-field-walk-on-standards"), crumb: "Walk-on standards",
    title: "College Track and Field Walk-On Standards by Division (2026)", h1: "College track and field walk-on standards",
    desc: `Walk-on standards for college track and field: the typical minimum mark to make the roster in NCAA D1, D2, D3 and NAIA, every event, from ${S.length.toLocaleString()} programs.`,
    answer: `The Walk-On standard is the minimum mark a program usually needs to put you on the roster. At a typical NCAA D1 program that is about ${m("NCAA D1", "m", "400m", 2)} in the men's 400m and ${m("NCAA D1", "w", "400m", 2)} in the women's 400m, and the bar drops at D2, D3 and NAIA.`,
    sections: [["Men's walk-on marks by division", evTable("m", RUN.concat(JMP, THR), 2)], ["Women's walk-on marks by division", evTable("w", RUNW.concat(JMP, THR), 2)],
      ["What a walk-on spot means", "<p>A walk-on makes the team without athletic scholarship money at first. Some walk-ons earn aid later by improving, so a walk-on offer from a program you love can be a real path.</p>"]],
    faq: [["Do walk-ons get scholarships later?", "Sometimes. Programs can move improving walk-ons onto aid in later years, but nothing is promised."],
      ["Can I walk on without contacting the coach?", "Rarely. Most programs fill their roster through recruiting, so email the coach well before you arrive."],
      ["Are walk-on standards the same everywhere?", "No. Each school sets its own, so check the school page before you plan."]],
    related: [...CORE, [GP("d1-track-and-field-scholarship-times"), "D1 scholarship times"]], sources: [[TFRRS, "TFRRS college results"]] });

  /* 6 */
  art({ p: GP("ncaa-track-and-field-recruiting-rules"), crumb: "NCAA recruiting rules",
    title: "NCAA Track and Field Recruiting Rules for High School Athletes", h1: "NCAA track and field recruiting rules for high schoolers",
    desc: "A plain-English guide to the NCAA recruiting rules that matter to high school track and field athletes: who can start contact, visits, eligibility and amateurism, by division.",
    answer: "You can email college coaches at any age, but NCAA Division I and II rules limit when coaches can start contact with you, which for most sports begins in the summer after sophomore year. Rules change, so confirm the exact dates in the NCAA's current recruiting guide.",
    sections: [["Contact you start vs contact they start", "<p>The rules limit what coaches can start, not what you can send. Athletes and parents can email coaches, fill out questionnaires and go to camps at any time, which is why reaching out early is allowed and smart.</p>"],
      ["What changes by division", "<p>Division I has the strictest calendar for calls, texts, visits and in-person contact. Division II is similar with a few more allowances. Division III and the NAIA have far fewer restrictions on contact.</p>"],
      ["Eligibility", `<p>To compete at NCAA D1 or D2 you need to be certified by the <a href="${ELIG}" rel="noopener">NCAA Eligibility Center</a> for academics and amateurism. NAIA athletes register with <a href="${NAIA}" rel="noopener">PlayNAIA</a>. Register before your senior year so visits and offers aren't delayed.</p>`]],
    faq: [["Can I email a D1 coach as a freshman?", "Yes. You can email any coach at any time. The limits are on when the coach can reach out to you first."],
      ["What is an official visit?", "A visit paid for by the college. The number and timing are limited by division rules."],
      ["Where do I find the exact dates?", `In the NCAA's current recruiting resources (<a href="${NCAA}" rel="noopener">ncaa.org</a>), which list the calendar by sport and division.`]],
    related: [[GP("how-to-get-recruited-for-track-and-field"), "How to get recruited"], [GP("how-to-email-college-track-coaches"), "How to email coaches"], ...CORE.slice(0, 2)],
    sources: [[NCAA, "NCAA recruiting resources"], [ELIG, "NCAA Eligibility Center"], [NAIA, "PlayNAIA"]] });

  /* 7 */
  art({ p: GP("best-spikes-for-high-school-sprinters"), crumb: "Sprint spikes guide",
    title: "Best Spikes for High School Sprinters (2026 Buying Guide)", h1: "How to pick the best spikes for high school sprinters",
    desc: "How high school sprinters should choose track spikes in 2026: sprint vs mid-distance plates, fit, pin length rules, budget, and when a new pair actually helps your times.",
    answer: "The best sprint spike is the one that fits snugly, has a stiff sprint plate for the 100m to 400m, and is legal for your meets. A newer model can help a little, but most time drops in high school come from training, starts and racing, not the shoe.",
    sections: [["Sprint vs mid-distance spikes", "<p>Sprint spikes have a stiffer, more aggressive plate and little heel cushion, built for the 100m to 400m. Mid-distance spikes add cushion for the 800m to 1600m. A 400m runner can wear either, and many prefer a sprint spike.</p>"],
      ["Fit", "<p>Spikes should fit tighter than trainers with no heel slip. Try them on with thin socks and jog in them before your first race.</p>"],
      ["Pins and rules", `<p>Many high school meets and tracks limit pin length and type. Check your state association rules and the meet information before race day (<a href="${NFHS}" rel="noopener">NFHS</a>).</p>`],
      ["Budget", "<p>A mid-priced sprint spike from any major brand is enough for most high school athletes. Spend on a premium pair once your marks are close to college standards and every hundredth counts.</p>"]],
    faq: [["Do expensive spikes make you faster?", "A little at the top end. Most high school improvement comes from training and race practice."],
      ["How long do spikes last?", "Usually one or two seasons for a sprinter, depending on how often you race and train in them."],
      ["Should I train in spikes?", "Use them for speed work and race practice, and do most other running in trainers to save your legs."]],
    related: [[GP("how-to-run-a-faster-400m"), "How to run a faster 400m"], [hsPath("m", "100m"), "Boys 100m: how fast for college?"], [hsPath("w", "100m"), "Girls 100m: how fast for college?"]], sources: [[NFHS, "NFHS (state association rules)"]] });

  /* 8 */
  art({ p: GP("high-school-track-summer-training"), crumb: "Summer training",
    title: "High School Track and Field Summer Training Plan", h1: "High school track and field summer training",
    desc: "How high school track and field athletes should train in the summer: rest, base building, strength, event work, summer meets and recruiting tasks before the next season.",
    answer: "Take one or two easy weeks after the season, then build a base with steady running, strength work and technique, and add speed and race-specific work in the last weeks before fall or indoor season. Summer is also a good time to email college coaches.",
    sections: [["A simple summer outline", "<ol><li>Weeks 1 to 2: rest and easy activity.</li><li>Weeks 3 to 8: base running, general strength, mobility and drills.</li><li>Weeks 9 to 12: more event-specific speed, tempo and technique.</li></ol><p>Distance runners keep more mileage through the summer, while sprinters and jumpers put more time into strength and short speed.</p>"],
      ["Summer meets", `<p>Summer meets such as Junior Olympics can add legal marks to your profile. See <a href="${GP("junior-olympics-track-and-field-recruiting")}">how Junior Olympics affects recruiting</a>.</p>`],
      ["Recruiting tasks for the summer", `<p>Build your college list, update your profile with spring marks and email coaches before the school year starts. See <a href="${GP("how-to-get-recruited-for-track-and-field")}">how to get recruited</a>.</p>`]],
    faq: [["Should I race all summer?", "A few summer meets help, but most of the summer should be training so you are fresh for the next season."],
      ["Is summer training different for sprinters?", "Yes. Sprinters do less mileage and more strength, starts and short speed work."]],
    related: [[GP("high-school-track-and-field-weight-room-workouts"), "Weight room workouts"], ...CORE.slice(0, 2)] });

  /* 9 */
  {
    const l = latest("NCAA D1", "outdoor", "m", "100m"), lw = latest("NCAA D1", "outdoor", "w", "100m");
    const yrs = [...new Set(resultPages.map(([, x]) => x.year))].sort();
    art({ p: GP("tfrrs-performance-lists-explained"), crumb: "TFRRS lists explained",
      title: "TFRRS Performance Lists Explained: How to Read College Track Results", h1: "TFRRS outdoor performance lists, explained",
      desc: "How to read TFRRS college track and field performance lists, what the national and conference lists tell high school athletes, and how they turn into recruiting standards.",
      answer: "TFRRS performance lists rank college athletes' best marks in each event for a season, nationally and by conference. Where your mark would place on a conference list tells you how a coach in that conference sees it.",
      sections: [["National lists vs conference lists", "<p>National lists show the very top of each division. Conference lists matter more for recruiting, because a coach recruits to score at their own conference meet.</p>"],
        ["How this site turns lists into standards", "<p>For schools without official standards, this site reads the conference's current season list. In NCAA D1 and D2, the 8th best mark becomes Target, the 15th Recruit and the 25th Walk-On. In NCAA D3 and the NAIA, Target is a top 8 mark and Walk-On the 40th.</p>"],
        ["Latest national lists on this site", `<div class="links">${[l, lw].filter(Boolean).map(([u, x, g, e]) => `<a href="${u}">${x.year} NCAA D1 outdoor ${esc(gName(g))} ${esc(e)}</a>`).join("")}<a href="/explore.html#results">Every list (${esc(yrs[0])} to ${esc(yrs[yrs.length - 1])})</a></div>`]],
      faq: [["Is TFRRS official?", "TFRRS is the results system most college programs and conferences use to publish their results."],
        ["Are high school results on TFRRS?", "No. TFRRS covers college results. High school results are on state databases such as MileSplit or Athletic.net."],
        ["Why does my mark rank differently indoors?", "Indoor and outdoor are separate seasons with different tracks and some different events, so each has its own lists."]],
      related: CORE, sources: [[TFRRS, "TFRRS"]] });
  }

  /* 10 */
  /* rewritten 2026-11-03 (Ryan: don't hand families the outreach kit): what coaches read and why emails go unanswered; no templates */
  art({ p: GP("how-to-email-college-track-coaches"), crumb: "Emailing coaches",
    title: "How to Email College Track Coaches: What Coaches Read", h1: "How to email college track coaches",
    desc: "What college track coaches look for in a recruiting email, when athletes should start, and why most athlete emails to coaches never get a reply.",
    answer: "College track coaches answer recruiting emails that lead with the athlete's event, best mark, graduation year and results, come from the athlete's own address, reach the right event coach, and keep coming after every new mark. Most athlete emails go unanswered because they miss one of those.",
    sections: [["What a coach checks first", `<p>Whether the mark already reaches the program's level. Coaches compare it with their own standard before they read anything else, so check where your mark fits on the <a href="/">standards search</a> first. Then graduation year, how the marks have improved, and grades.</p>`],
      ["Why most athlete emails get no reply", "<p>They go to the head coach instead of the event coach, they arrive after the class is mostly filled, they are sent once with no follow-up, or they read like a copy sent to a hundred schools. Coaches get a lot of email, and the ones they answer are specific, timely and persistent.</p>"],
      ["How Preferred Recruit handles it", `<p>Preferred Recruit works only with track and field athletes. The team sends personalized emails to coaches from the athlete's own inbox, follows up, and guides the family through replies, visits and offers. Preferred Recruit athletes have earned $10M+ in scholarships. Guaranteed genuine interest or a full refund. <a href="${QUIZ}">Get a free recruitment evaluation</a> to see which programs fit and which coaches to contact first.</p>`]],
    faq: [["Should the athlete or the parent email coaches?", "Coaches want to hear from the athlete, from the athlete's own email address."],
      ["When should athletes start emailing coaches?", "NCAA D1 and D2 coaches can contact recruits from June 15 after sophomore year, so most families start before junior year."],
      ["What if a coach never replies?", "No reply usually means the timing or the fit isn't there yet, not a final no. A new mark is the best reason to write again."]],
    related: [[QUIZ, "Free recruitment evaluation"], [GP("track-and-field-recruiting-timeline-by-grade"), "Recruiting timeline by grade"], ...CORE.slice(0, 1)],
    sources: [[NCAA, "NCAA recruiting resources"]] });

  /* 11 (rewritten 2026-11-03: no athletics-site link list) */
  art({ p: GP("track-and-field-recruiting-questionnaires-by-conference"), crumb: "Recruiting questionnaires",
    title: "Track and Field Recruiting Questionnaires: Do They Work?", h1: "Track and field recruiting questionnaires",
    desc: "What a college track recruiting questionnaire does, where programs post them, and why filling one out rarely gets an athlete recruited on its own.",
    answer: "Most college track programs post a recruiting questionnaire on their official athletics site, under Recruiting or Prospective Student-Athletes. It adds the athlete to the program's database. On its own it rarely gets read: coaches recruit the athletes who reach out to them directly and keep them updated.",
    sections: [["What a questionnaire does", "<p>It puts the athlete's name, marks, grades and contact details in the program's recruiting database, which coaches search when they need an event filled. Thousands of athletes fill them out, so a form alone rarely stands out.</p>"],
      ["What actually gets an athlete noticed", `<p>Preferred Recruit works only with track and field athletes. The team sends personalized emails to coaches from the athlete's own inbox, follows up, and guides the family through replies, visits and offers. Preferred Recruit athletes have earned $10M+ in scholarships. Guaranteed genuine interest or a full refund. <a href="${QUIZ}">Get a free recruitment evaluation</a> to see which programs fit and which coaches to contact first.</p>`]],
    faq: [["Is a questionnaire enough to get recruited?", "Rarely on its own. It adds you to the program's list, but direct contact with the event coach is what gets read."],
      ["Do D2, D3 and NAIA schools have questionnaires?", "Many do, on the same kind of page on their athletics site."]],
    related: [[QUIZ, "Free recruitment evaluation"], [GP("how-to-email-college-track-coaches"), "How to email coaches"], ...CORE.slice(0, 1)], sources: [[NCAA, "NCAA recruiting resources"]] });

  /* 12 (official claims only, brand brief section 0) */
  art({ p: GP("ncsa-vs-preferred-recruit-track-and-field"), crumb: "NCSA vs Preferred Recruit",
    title: "NCSA vs Preferred Recruit for Track and Field Recruiting", h1: "NCSA vs Preferred Recruit for track and field",
    desc: "How NCSA and Preferred Recruit differ for track and field families: a multi-sport recruiting network vs a done-for-you, track-only service, plus questions to ask any recruiting service.",
    answer: "NCSA is a multi-sport recruiting network where families build a profile that coaches can search. Preferred Recruit works only with track and field athletes and does the outreach for them, emailing coaches from the athlete's own inbox. Ask any service what it actually does each week and what it guarantees.",
    sections: [["Two different models", "<p>A profile network puts your information where coaches can find it, and your family does most of the outreach. A done-for-you service runs the outreach itself. Match the model to how much time your family has.</p>"],
      ["How Preferred Recruit works", `<p>Preferred Recruit is track and field only. The team sends personalized emails to coaches from the athlete's own inbox, follows up, and guides the family through replies, visits and offers. Preferred Recruit athletes have earned $10M+ in scholarships. Guaranteed genuine interest or a full refund.</p>`],
      ["Questions to ask any recruiting service", "<ol><li>Who contacts coaches, and how many each week?</li><li>Do the emails come from the athlete's own address?</li><li>Is the service specific to track and field?</li><li>What happens if no coach shows interest?</li><li>Can I see which coaches were contacted?</li></ol>"]],
    faq: [["Do I need a recruiting service at all?", `No. Many athletes get recruited by doing it themselves. Start with the <a href="/">standards search</a> and the <a href="${GP("how-to-get-recruited-for-track-and-field")}">step-by-step guide</a>.`],
      ["Who is Preferred Recruit for?", "Track and field athletes whose marks already fit college programs. Athletes need to meet qualifying marks before outreach starts."]],
    related: [[QUIZ, "Free recruitment evaluation"], [GP("how-to-get-recruited-for-track-and-field"), "How to get recruited"]], sources: [["https://thepreferredrecruit.org", "Preferred Recruit"], ["https://www.ncsasports.org/", "NCSA"]] });

  /* 12b (2026-11-03, Search Console: "runcruit" 7,788 impressions + "runrecruit"/"run recruit"/"runcruit login" ~3,000 more, position
     2-5, 0.6% CTR; the homepage was the result shown). Factual comparison only: Runcruit facts from runcruit.com/about; official PR claims. */
  { const nOff = S.filter(x => x.o).length, nJ = S.filter(x => x.j).length, n4 = S.filter(x => !x.j).length;
  art({ p: GP("runcruit-vs-track-standards"), crumb: "Runcruit vs Track Standards",
    title: "Runcruit vs Track Standards: College Track Fit Compared", h1: "Runcruit vs Track Standards",
    desc: "Runcruit vs Track Standards: both match your marks to college track programs for free. How each sets its levels, and how to check any prediction.",
    answer: `Runcruit and Track Standards both match a high school athlete's marks to college track and field programs for free. Runcruit covers 1,800+ U.S. and Canadian colleges with its own prediction tools. Track Standards sets every level from real conference results and ${nOff} official school charts checked mark for mark, and shows where each number comes from.`,
    sections: [["How each site predicts a fit", `<p>Runcruit describes its matching tools as proprietary, so the formula behind a match isn't published. Track Standards sets three levels for every program and event (Target, Recruit and Walk-On) from the marks it takes to place in that school's conference, or from the school's own published chart when it has one. The <a href="/rankings/methodology.html">methodology</a> and each school page's sources show exactly where a number comes from.</p>`],
      ["Side by side", `<table><thead><tr><th></th><th>Runcruit</th><th>Track Standards</th></tr></thead><tbody>
        <tr><td>Programs covered</td><td>1,800+ U.S. and Canadian colleges</td><td>${n4.toLocaleString()} NCAA D1, D2, D3 and NAIA programs plus ${nJ} NJCAA junior colleges</td></tr>
        <tr><td>Events</td><td>Track and field and cross country</td><td>Track and field and cross country, in high school events (1600m, 3200m, 300m hurdles)</td></tr>
        <tr><td>Where levels come from</td><td>Its own prediction tools</td><td>Conference results on TFRRS, plus ${nOff} official school charts verified mark for mark</td></tr>
        <tr><td>Extras</td><td>PR progression calculator; a free Pro account with exposure to coaches</td><td>Power Rankings for every division since 2016, every NCAA result since 2016, a Recruiting AI</td></tr>
        <tr><td>Cost</td><td>Free to search</td><td>Free to search; a free account opens every list</td></tr></tbody></table>`],
      ["Check any prediction yourself", `<p>Whichever site you use, check the match against real results. Open the school's conference championship on <a href="https://www.tfrrs.org/" rel="noopener">TFRRS</a> and see where your mark would have placed. If it scores at the conference meet, coaches will take it seriously. On Track Standards, every school page links its conference list so you can do this in one tap.</p>`],
      ["When you need more than a prediction", `<p>A prediction tells you where you fit. Getting recruited still means coaches hearing from you. Preferred Recruit works only with track and field athletes and emails coaches from the athlete's own inbox. Preferred Recruit athletes have earned $10M+ in scholarships. Guaranteed genuine interest or a full refund.</p>`]],
    faq: [["Is Runcruit legit?", "Yes. Runcruit is a real, free college track and cross country matching site. Like any prediction tool, treat its matches as a starting point and check them against the school's conference results on TFRRS."],
      ["Is this the Runcruit login?", `No. This site is Track Standards, made by Preferred Recruit, and it isn't connected to Runcruit. To sign in to Runcruit, go to runcruit.com. To save your marks here, create a free account on the <a href="/">Track Standards home page</a>.`],
      ["Which one is more accurate?", "It depends on the data behind each level. Track Standards publishes the source of every number (conference results or the school's own chart), so you can check any level against TFRRS yourself."],
      ["Can I use both?", `Yes. Compare what each says for your event, then check the schools you care about on their <a href="/">school pages</a>, which show the levels event by event.`]],
    related: [[QUIZ, "Free recruitment evaluation"], ["/rankings/methodology.html", "How the levels and rankings work"], [GP("ncsa-vs-preferred-recruit-track-and-field"), "NCSA vs Preferred Recruit"], [GP("target-recruit-walk-on-explained"), "Target, Recruit and Walk-On explained"]],
    sources: [["https://runcruit.com/about", "Runcruit: About"], ["https://www.tfrrs.org/", "TFRRS"]] }); }

  /* 13 */
  art({ p: GP("high-school-long-jump-recruiting-marks-d1"), crumb: "Long jump marks for D1",
    title: "High School Long Jump Recruiting Marks for D1 (and Every Division)", h1: "High school long jump recruiting marks for D1",
    desc: `What long jump do you need for D1 track and field? Typical NCAA D1, D2, D3 and NAIA Target, Recruit and Walk-On long jump marks for men and women, from ${S.length.toLocaleString()} programs.`,
    answer: `At a typical NCAA D1 program, the men's long jump Walk-On mark is about ${m("NCAA D1", "m", "Long Jump", 2)} and the women's about ${m("NCAA D1", "w", "Long Jump", 2)}. High school and college jumpers use the same runway and pit, so your high school mark compares directly, as long as it is wind-legal.`,
    sections: [["Men's long jump by division", lvlTable("m", "Long Jump")], ["Women's long jump by division", lvlTable("w", "Long Jump")],
      ["Wind matters", `<p>Marks with a tailwind over 2.0 m/s are wind-aided, and coaches notice. List your best legal mark first. See <a href="${GP("understanding-track-and-field-prs-for-recruiting")}">understanding PRs</a>.</p>`]],
    faq: [["Is my long jump good enough for D1?", `Compare it with the table above, then search it on the <a href="/">standards finder</a> to see the exact schools it fits.`],
      ["Do coaches care about triple jump too?", "Yes. Jumpers who score in two events are more valuable to a team, so list both."]],
    related: [[hsPath("m", "Long Jump"), "Boys long jump for college"], [hsPath("w", "Long Jump"), "Girls long jump for college"], [evPath("NCAA D1", "m", "Long Jump"), "Every D1 men's long jump standard"], [evPath("NCAA D1", "w", "Long Jump"), "Every D1 women's long jump standard"]], sources: [[WA_RULES, "World Athletics rules (wind)"]] });

  /* 14 */
  art({ p: GP("shot-put-and-discus-standards-for-college"), crumb: "Shot put and discus standards",
    title: "Shot Put and Discus Standards for College Track and Field", h1: "Shot put and discus throwing standards for college",
    desc: "College shot put and discus recruiting standards for NCAA D1, D2, D3 and NAIA, men and women, plus how high school implements compare with college weights.",
    answer: `At a typical NCAA D1 program, the Walk-On mark is about ${m("NCAA D1", "m", "Shot Put", 2)} in the men's shot put and ${m("NCAA D1", "w", "Shot Put", 2)} in the women's. High school boys throw a lighter shot (12 lb) and discus (1.6 kg) than college men (16 lb and 2 kg), so their marks read longer than the college equivalent.`,
    sections: [["Men's shot put", lvlTable("m", "Shot Put")], ["Men's discus", lvlTable("m", "Discus")], ["Women's shot put", lvlTable("w", "Shot Put")], ["Women's discus", lvlTable("w", "Discus")],
      ["Implement weights", "<p>Girls throw the same 4 kg shot and 1 kg discus in high school and college, so their marks compare directly. Boys move up from a 12 lb shot and 1.6 kg discus to a 16 lb shot and 2 kg discus, and coaches account for that when they read high school marks.</p>"]],
    faq: [["Do college coaches convert high school boys' throws?", "There is no exact conversion, so coaches judge high school marks against high school lists and look at technique and strength."],
      ["Do hammer and javelin matter for recruiting?", `Yes, and many throwers learn them in college. See the <a href="${evPath("NCAA D1", "m", "Hammer")}">D1 hammer</a> and <a href="${evPath("NCAA D1", "m", "Javelin")}">D1 javelin</a> standards.`]],
    related: [[evPath("NCAA D1", "m", "Shot Put"), "Every D1 men's shot put standard"], [evPath("NCAA D1", "w", "Discus"), "Every D1 women's discus standard"], ...CORE.slice(0, 2)], sources: [[NFHS, "NFHS (high school implements)"]] });

  /* 15 */
  art({ p: GP("cross-country-vs-track-recruiting"), crumb: "Cross country vs track",
    title: "Recruiting for High School Cross Country vs Track", h1: "Recruiting for cross country vs track",
    desc: "How college coaches recruit high school distance runners for cross country and track: which marks matter, how the seasons connect, and what to send coaches.",
    answer: "College distance coaches recruit for cross country and track together, and they lean on track times like the 1600m and 3200m because cross country courses vary too much to compare. Strong cross country results still help, especially state and national championship places.",
    sections: [["Which marks coaches use", `<p>Track times are the cleanest comparison, so lead with your 1600m and 3200m and include cross country places and times. This site converts the <a href="${hsPath("m", "1600m")}">1600m</a> and <a href="${hsPath("m", "3200m")}">3200m</a> to the college 1500m, 3000m and 5000m automatically.</p>`],
      ["How the seasons connect", "<p>Most college distance runners race cross country in the fall and indoor and outdoor track in the winter and spring, so coaches want runners who can handle all three.</p>"]],
    faq: [["Can I get recruited only for cross country?", "Some programs recruit cross country specialists, but most want runners who score in track distance events too."],
      ["Does my 5k cross country time matter?", "It helps as context, but course differences make track times the main number coaches compare."]],
    related: [[hsPath("w", "1600m"), "Girls 1600m: how fast for college?"], [hsPath("w", "3200m"), "Girls 3200m for college"], ["/convert.html", "High school to college conversions"]], sources: [[TFRRS, "TFRRS (college cross country results)"]] });

  /* 16 */
  art({ p: GP("d2-and-d3-track-and-field-scholarships"), crumb: "D2 and D3 opportunities",
    title: "D2 and D3 Track and Field Scholarship Opportunities", h1: "D2 and D3 track and field opportunities",
    desc: `NCAA D2 and D3 track and field: how scholarships and aid work, how the standards compare with D1, and how many programs there are (${n("NCAA D2")} D2 and ${n("NCAA D3")} D3 on this site).`,
    answer: `NCAA Division II offers partial athletic scholarships in track and field, and Division III offers no athletic scholarships but often gives academic and need-based aid. This site lists ${n("NCAA D2")} D2 and ${n("NCAA D3")} D3 programs, and their standards are within reach for many athletes who fall short of D1.`,
    sections: [["How the standards compare", `<p>Median Walk-On mark by division:</p>${tbl(["Event", ...DIVS.map(esc)], [["m", "100m"], ["m", "400m"], ["m", "1500m"], ["w", "100m"], ["w", "400m"], ["w", "1500m"]].map(([g, e]) => [`${esc(gName(g))} ${esc(e)}`, ...DIVS.map(d => esc(m(d, g, e, 2)))]))}`],
      ["How the money works", "<p>D2 coaches split a limited scholarship budget across the roster, so most offers are partial. D3 schools build aid packages from academic and need-based money, which can add up to more than a partial athletic scholarship somewhere else.</p>"],
      ["Don't skip the NAIA", `<p>The NAIA (${n("NAIA")} programs on this site) offers athletic scholarships too, with fewer recruiting restrictions. See <a href="/guides/ncaa-d1-vs-d2-vs-d3-vs-naia-track-and-field.html">every division compared</a>.</p>`]],
    faq: [["Do D3 schools give athletic scholarships?", "No. NCAA Division III does not award athletic scholarships, but athletes can receive academic and need-based aid."],
      ["Is D2 track competitive?", "Yes. The top D2 athletes post marks that would score at many D1 meets."]],
    related: CORE, sources: [[NCAA, "NCAA recruiting resources"], [NAIA, "PlayNAIA"]] });

  /* 17 */
  art({ p: GP("how-to-build-a-track-and-field-recruiting-profile"), crumb: "Build a recruiting profile",
    title: "How to Build a Track and Field Recruiting Profile Coaches Read", h1: "How to build a track and field recruiting profile",
    desc: "What to put in a high school track and field recruiting profile: marks with results links, progression, video, academics and contact info, laid out the way college coaches read it.",
    answer: "A good track recruiting profile shows your best legal marks with results links, how your marks have improved, a short video, your grades and graduation year, and how to reach you. Keep it on one page that loads fast on a phone.",
    how: [["Marks with proof", "List your best marks per event with the meet, date and a results link, legal marks first."],
      ["Progression", "Show season-by-season bests. Coaches recruit improvement as much as the current mark."],
      ["Video", "Add a recent race or competition video, plus a short training clip for field events."],
      ["Academics", "GPA, test scores if you have them, and your intended major."],
      ["Basics", "Graduation year, high school, club, height and weight for throwers and jumpers, and your contact info."]],
    sections: [["A profile is only half of it", "<p>A profile answers a coach's questions once the coach is looking. Getting coaches to look is the hard part.</p>" + `<p>Preferred Recruit works only with track and field athletes. The team sends personalized emails to coaches from the athlete's own inbox, follows up, and guides the family through replies, visits and offers. Preferred Recruit athletes have earned $10M+ in scholarships. Guaranteed genuine interest or a full refund. <a href="${QUIZ}">Get a free recruitment evaluation</a> to see which programs fit and which coaches to contact first.</p>`]],
    faq: [["Do I need a paid profile?", "No. A free page or document with the right information works."],
      ["Should I include meets where I ran slower?", "Include your bests and your progression. Coaches understand off days."]],
    related: [[GP("how-to-email-college-track-coaches"), "How to email coaches"], [GP("understanding-track-and-field-prs-for-recruiting"), "Understanding PRs"], ...CORE.slice(0, 1)], sources: [[ELIG, "NCAA Eligibility Center"]] });

  /* 18 */
  {
    const m1 = latest("NCAA D1", "outdoor", "m", "100m"), w1 = latest("NCAA D1", "outdoor", "w", "100m");
    art({ p: GP("fastest-100m-times-high-school-and-college"), crumb: "Fastest 100m times",
      title: "Fastest 100m Times: High School Marks vs College Standards", h1: "Fastest 100m times, high school vs college",
      desc: "How fast is a fast 100m? College 100m standards by division, the national college top 100m marks, and what high school 100m times fit each level.",
      answer: `The typical NCAA D1 Target mark in the 100m is ${m("NCAA D1", "m", "100m", 0)} for men and ${m("NCAA D1", "w", "100m", 0)} for women, and a typical D1 Walk-On mark is ${m("NCAA D1", "m", "100m", 2)} and ${m("NCAA D1", "w", "100m", 2)}. The fastest college 100m marks each season are on this site's results pages, and national high school lists are on MileSplit and Athletic.net.`,
      sections: [["Men's 100m standards by division", lvlTable("m", "100m")], ["Women's 100m standards by division", lvlTable("w", "100m")],
        ["The fastest college 100m marks", `<div class="links">${[m1, w1].filter(Boolean).map(([u, x, g]) => `<a href="${u}">${x.year} NCAA D1 ${esc(gName(g))} 100m top marks</a>`).join("")}<a href="/explore.html#results">Every division and year</a></div><p>For the fastest high school times, see the national high school lists on <a href="https://www.milesplit.com/" rel="noopener">MileSplit</a> and <a href="https://www.athletic.net/" rel="noopener">Athletic.net</a>.</p>`]],
      faq: [["What 100m time do I need for college?", `It depends on the division and school. Search your time on the <a href="${hsPath("m", "100m")}">boys 100m page</a> or <a href="${hsPath("w", "100m")}">girls 100m page</a>.`],
        ["Do hand times count?", `Coaches use fully automatic (FAT) times. A hand time is usually treated as about 0.24 seconds slower. See <a href="${GP("understanding-track-and-field-prs-for-recruiting")}">understanding PRs</a>.`]],
      related: [[hsPath("m", "100m"), "Boys 100m: how fast for college?"], [hsPath("w", "100m"), "Girls 100m for college"]], sources: [[TFRRS, "TFRRS college results"]] });
  }

  /* 19 */
  art({ p: GP("track-and-field-scholarships-for-female-athletes"), crumb: "Scholarships for female athletes",
    title: "Track and Field Scholarships for Female Athletes", h1: "Track and field scholarships for female athletes",
    desc: `Track and field scholarships for girls: how women's college programs fund athletes, typical women's standards by division, and how many programs recruit women (${nWall.toLocaleString()} on this site).`,
    answer: `At NCAA D1, women's track and field programs have historically had more scholarship money to share than men's, and women's track is one of the largest college sports for women. This site has women's standards for ${nWall.toLocaleString()} programs, with a typical D1 Walk-On of ${m("NCAA D1", "w", "400m", 2)} in the 400m.`,
    sections: [["Women's programs on this site", tbl(["Division", "Programs with women's standards"], DIVS.map(d => [esc(d), String(nW(d))]))],
      ["Women's Recruit marks by division", evTable("w", RUNW.concat(JMP, ["Shot Put", "Discus"]), 1)],
      ["Why girls should reach out early", "<p>Women's programs fill large rosters every year, so reaching out directly to the programs where your marks fit puts you on their list before it fills.</p>"]],
    faq: [["Do girls get more track scholarships than boys?", "At NCAA D1, women's track programs have historically had more scholarship equivalencies than men's. It varies by school and division."],
      ["Are women's standards set the same way?", "Yes. Official school charts first, then the conference's women's results."]],
    related: [[hsPath("w", "100m"), "Girls 100m for college"], [hsPath("w", "400m"), "Girls 400m for college"], [hsPath("w", "1600m"), "Girls 1600m for college"], ...CORE.slice(0, 1)], sources: [[NCAA, "NCAA recruiting resources"]] });

  /* 20 */
  art({ p: GP("high-school-track-and-field-weight-room-workouts"), crumb: "Weight room workouts",
    title: "High School Track and Field Weight Room Workouts", h1: "High school track and field weight room workouts",
    desc: "Weight room basics for high school sprinters, jumpers, throwers and distance runners: the lifts that matter, how often to train, and how to stay safe.",
    answer: "Most high school track athletes do well with two or three strength sessions a week built on squats, hinges, lunges, presses and core work, learned with good technique first. Sprinters and jumpers add explosive work, throwers lift heavier, and distance runners keep it lighter.",
    sections: [["The core lifts", "<ol><li>Squat or goblet squat</li><li>Hinge: trap-bar deadlift or Romanian deadlift</li><li>Single-leg: lunges, step-ups, split squats</li><li>Upper body: push-ups, presses, rows</li><li>Core work and low hops</li></ol>"],
      ["By event group", "<p>Sprinters and jumpers add jumps, bounds and medicine-ball throws. Throwers spend more time on heavy lifts and Olympic-style lifts with coaching. Distance runners do lighter full-body strength to stay healthy.</p>"],
      ["Safety", "<p>Learn each lift with a qualified coach, add weight slowly and cut back in race weeks. Pain that changes how you move means stop and get it checked.</p>"]],
    faq: [["Do college coaches care about lifting numbers?", "Mostly for throwers. For everyone else, coaches care about marks, and lifting is how you get there."],
      ["How often should I lift in season?", "Usually once or twice a week, lighter, and away from big meets."]],
    related: [[GP("high-school-track-summer-training"), "Summer training"], [GP("how-to-run-a-faster-400m"), "Faster 400m"]], sources: [["https://www.nsca.com/", "NSCA (strength and conditioning)"]] });

  /* 21 */
  art({ p: GP("junior-olympics-track-and-field-recruiting"), crumb: "Junior Olympics and recruiting",
    title: "Does Junior Olympics Track and Field Help You Get Recruited?", h1: "Junior Olympics track and field and recruiting",
    desc: "How AAU and USATF Junior Olympics track and field affect college recruiting: which marks count, when they help, and how to share summer results with coaches.",
    answer: "Junior Olympics marks count like any other legal, fully timed mark, and a strong summer result can put you on a coach's list before senior year. What matters is the mark itself, so send coaches the results link the same week.",
    sections: [["Which marks count", `<p>Fully automatic times and legal-wind marks from sanctioned meets count most. Hand times and wind-aided marks count less. See <a href="${GP("understanding-track-and-field-prs-for-recruiting")}">understanding PRs</a>.</p>`],
      ["When summer meets help most", "<p>The summer after junior year matters most, because coaches are building their next class and a new PR gives you a reason to email them again.</p>"]],
    faq: [["Do coaches attend Junior Olympics?", "Some do, but most will see your mark because you sent it, so email them the results."],
      ["Is a JO medal more important than the time?", "The time or mark matters most, because coaches compare it with their program's standards."]],
    related: [[GP("high-school-track-summer-training"), "Summer training"], [GP("how-to-email-college-track-coaches"), "Email coaches"]], sources: [["https://www.usatf.org/", "USATF"], ["https://aausports.org/", "AAU"]] });

  /* 22 */
  art({ p: GP("how-to-run-a-faster-400m"), crumb: "Run a faster 400m",
    title: "How to Run a Faster 400m in High School", h1: "How to run a faster 400m in high school",
    desc: "How high school athletes can run a faster 400m: race plan, speed, speed endurance, strength and practice races, plus the 400m marks colleges look for by division.",
    answer: `Get faster over 200m, build the speed endurance to hold it, and race with a fast but relaxed first 200m and a strong last 100m. At a typical NCAA D1 program the 400m Walk-On mark is about ${m("NCAA D1", "m", "400m", 2)} for men and ${m("NCAA D1", "w", "400m", 2)} for women.`,
    how: [["Raise top speed", "Short sprints and flying 30s with full rest. A faster 200m raises your 400m ceiling."],
      ["Build speed endurance", "Repeats of 150m to 300m at race effort with long rest, once or twice a week."],
      ["Plan the race", "Run the first 200m fast but relaxed, hold your form on the turn, and drive the last 100m."],
      ["Get strong", "Two strength sessions a week with single-leg work and core."],
      ["Race it often enough", "Practice races teach pacing better than any workout."]],
    sections: [["400m standards by division (men)", lvlTable("m", "400m")], ["400m standards by division (women)", lvlTable("w", "400m")]],
    faq: [["Should I run the 4x400?", "Yes. Relay splits show coaches your racing ability, though open marks are what they compare."],
      ["How do I know my 400m is good enough for college?", `Search it on the <a href="${hsPath("m", "400m")}">boys 400m</a> or <a href="${hsPath("w", "400m")}">girls 400m</a> page.`]],
    related: [[hsPath("m", "400m"), "Boys 400m: how fast for college?"], [hsPath("w", "400m"), "Girls 400m for college"], [GP("high-school-track-and-field-weight-room-workouts"), "Weight room workouts"]] });

  /* 23 (no coach emails: official staff / athletics pages only) */
  {
    const by = new Map(); for (const s of S) { if (!s.s) continue; const k = STATE[s.s] || s.s; if (!by.has(k)) by.set(k, []); by.get(k).push(s); }
    const rows = [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const staff = rows.map(([st, L]) => { const W = L.filter(s => s.cu); return W.length ? `<h3>${esc(st)}</h3><div class="links">${W.sort((a, b) => a.n.localeCompare(b.n)).map(s => `<a href="${esc(s.cu)}" rel="noopener nofollow">${esc(s.t || s.n)} coaching staff</a>`).join("")}</div>` : ""; }).join("");
    art({ p: GP("college-track-coach-contact-list-by-state"), crumb: "College track coaches by state",
      title: "College Track and Field Programs and Coaches by State", h1: "College track programs and coaches by state",
      desc: `College track and field programs in every state: ${S.length.toLocaleString()} programs grouped by state, and how athletes get the right coaches to answer.`,
      answer: "Every college program publishes its track and field coaching staff on its official athletics website. Finding a coach's name is the easy part; getting the right event coach to answer, at the right time, is what gets an athlete recruited. The state lists below show every program by state.",
      sections: [["Programs by state", tbl(["State", "Programs"], rows.map(([st, L]) => [`<a href="${statePath(L[0].s)}">${esc(st)}</a>`, String(L.length)]))],
        ["Finding coaches is the easy part", `<p>Preferred Recruit works only with track and field athletes. The team sends personalized emails to coaches from the athlete's own inbox, follows up, and guides the family through replies, visits and offers. Preferred Recruit athletes have earned $10M+ in scholarships. Guaranteed genuine interest or a full refund. <a href="${QUIZ}">Get a free recruitment evaluation</a> to see which programs fit and which coaches to contact first.</p>`]],
      faq: [["Why doesn't this page list coach email addresses?", "Coaches change jobs often, so the school's own staff page is the reliable source. Each school page links to it."],
        ["Who should I email, the head coach or the event coach?", "The event coach, with the head coach copied."]],
      related: [[QUIZ, "Free recruitment evaluation"], [GP("how-to-email-college-track-coaches"), "How to email coaches"], ["/explore.html", "Every conference and state"]], sources: [[TFRRS, "TFRRS team pages"]] });
  }

  /* 24 */
  art({ p: GP("understanding-track-and-field-prs-for-recruiting"), crumb: "Understanding PRs",
    title: "Understanding Track and Field PRs for College Recruiting", h1: "Understanding track and field PRs for recruiting",
    desc: "Which track and field PRs college coaches trust: FAT vs hand times, wind-legal marks, indoor vs outdoor, and how high school events convert to college events.",
    answer: "College coaches trust fully automatic (FAT) times and wind-legal marks from sanctioned meets with public results. A hand time is usually treated as about 0.24 seconds slower in the 100m and 200m, and sprint and horizontal jump marks with a tailwind over 2.0 m/s are wind-aided.",
    sections: [["FAT vs hand timing", "<p>FAT timing uses a camera at the finish and reads to the hundredth. Hand timing reads faster because of the timer's reaction time, so the standard conversion adds 0.24 seconds in the 100m and 200m and 0.14 seconds in the 400m and longer.</p>"],
      ["Wind", "<p>In the 100m, 200m, sprint hurdles, long jump and triple jump, a tailwind over 2.0 m/s makes the mark wind-aided. List your best legal mark first and the wind-aided mark second.</p>"],
      ["Indoor vs outdoor", "<p>Indoor tracks are usually 200m with tighter turns, so 200m and 400m times are slower indoors. Coaches compare indoor marks with indoor lists.</p>"],
      ["High school to college events", `<p>The 1600m, 3200m, 300m hurdles and 39-inch 110m hurdles convert to college events. See <a href="/convert.html">every conversion table</a>.</p>`]],
    faq: [["What does FAT mean?", "Fully automatic timing, a camera system that reads to the hundredth of a second."],
      ["Do coaches accept wind-aided marks?", "They see them, but they compare legal marks with their standards."],
      ["Does a relay split count as a PR?", "No. Relay splits show racing ability, but your open marks are what coaches compare."]],
    related: [["/convert.html", "High school to college conversions"], ...CORE.slice(0, 2)], sources: [[WA_RULES, "World Athletics Book of Rules"], [NFHS, "NFHS"]] });

  /* 25 */
  art({ p: GP("recruiting-tips-for-multi-event-athletes"), crumb: "Multi-event athletes",
    title: "Recruiting Tips for High School Multi-Event Athletes", h1: "Recruiting tips for high school multi-event athletes",
    desc: "How high school decathlon, heptathlon and multi-event athletes get recruited: which marks to send, how coaches read them, and how to find programs that coach multis.",
    answer: "Coaches recruit multi-event athletes on the event marks that show raw ability, usually sprints, hurdles and jumps, and on room to grow in events they haven't trained yet. Send your best individual marks first, with your decathlon or heptathlon score alongside.",
    sections: [["What coaches look for", "<p>Speed and jumping ability are hard to teach, so a fast hurdler or long jumper with some throwing skill is a strong multi recruit. Coaches expect your weaker events to improve in college.</p>"],
      ["Use individual standards too", `<p>Your individual marks may already fit standards in one or two events. Search each on the <a href="/">standards finder</a> and list the programs where several of your events fit.</p>`],
      ["Find programs that coach multis", "<p>Programs with multi-event athletes on their roster or in their conference results already coach the events. Check the roster links on each school page.</p>"]],
    faq: [["Do high schools have the decathlon?", "Few high school seasons include it, but many summer and invitational meets do, and a score helps coaches compare."],
      ["Should I specialize instead?", "If one event already fits strong standards, talk to coaches about both paths."]],
    related: [[evPath("NCAA D1", "m", "110m Hurdles"), "D1 110m hurdles standards"], [evPath("NCAA D1", "w", "100m Hurdles"), "D1 100m hurdles standards"], ...CORE.slice(0, 1)], sources: [[WA_RULES, "World Athletics combined events rules"]] });

  return done;
}
