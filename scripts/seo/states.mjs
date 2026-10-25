/* State hubs: /states/<state>-college-track-and-field.html (Ryan 2026-10-24: "prioritize the Oregon content ... optimize everything
   possible"). Was a bare list of schools. Now every state page answers first with real numbers, shows each program's Recruit level
   in the events families search most, the state's national champions and best developers (schoolfacts.json), and answers the
   questions people ask about the state ("Is Oregon good at track and field?", "Does Oregon State have a men's track team?")
   from data only, as FAQPage structured data too. Links stay inside the budget: the state's own schools, its conferences. */
import { loadFacts, evl, shortOf, newestFirst } from "./facts.mjs";

export function statePages({ root, S, DIVS, STATE, statePath, confName, sl, std, raw, parse, write, page, esc, SITE, SEASON }) {
  const { factsOf } = loadFacts(root);
  const byState = new Map(); for (const s of S) if (s.s) { if (!byState.has(s.s)) byState.set(s.s, []); byState.get(s.s).push(s); }
  const COLS = [["m", "100m"], ["m", "1500m"], ["w", "100m"], ["w", "1500m"]];
  /* entry level = the lowest level a program lists: Walk-On, or Recruit where there's no Walk-On tier (Power 4); D3/NAIA have no Recruit tier */
  const lowest = t => t ? [2, 1, 0].find(i => t[i] && String(t[i]).trim()) : undefined;
  const cell = (s, g, e) => { const t = std(s, g, e), i = lowest(t); return i == null ? "–" : String(t[i]).trim(); };
  const entry = (s, g, e) => { const t = raw(s, g, e), i = lowest(t); return i == null ? null : parse(t[i], e); };
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  for (const [st, L] of byState) {
    const nm = STATE[st] || st, p = statePath(st), four = L.filter(s => !s.j);
    const divs = [...DIVS, "NJCAA"].filter(d => L.some(s => s.d === d));
    const split = divs.map(d => d === "NJCAA" ? count(L.filter(s => s.d === d).length, "junior college", "junior colleges") : `${L.filter(s => s.d === d).length} in ${d === "NAIA" ? "the NAIA" : d.replace("NCAA ", d === divs[0] ? "NCAA " : "")}`);
    /* hardest and most reachable four-year program, by the men's 100m entry level (women's when fewer than two men's teams) */
    const pick = g => four.map(s => [s, entry(s, g, "100m")]).filter(x => x[1]).sort((a, b) => a[1] - b[1]);
    let g = "m", R = pick("m"); if (R.length < 2) { g = "w"; R = pick("w"); }
    const champs = four.map(s => [s, (factsOf(s) || {}).champ || []]).filter(x => x[1].length).sort((a, b) => b[1].length - a[1].length);
    const nChamp = champs.reduce((n, x) => n + x[1].length, 0);
    const devs = four.map(s => [s, (factsOf(s) || {}).dev]).filter(x => x[1]).sort((a, b) => b[1].peak_pct - a[1].peak_pct);
    const only = four.filter(s => (s.ng || []).length === 1);
    const gw = x => x === "m" ? "men's" : "women's";
    let ans = `${esc(nm)} has ${count(L.length, "college track and field program", "college track and field programs")}: ${list(split)}.`;
    /* the most reachable mark is often shared by a whole conference (one set of levels), so name the group, not one school */
    const easy = R.length ? R.filter(x => x[1] === R[R.length - 1][1]).map(x => x[0]) : [], easyName = easy.length > 1 ? `${easy.length > 3 ? `the ${easy[0].c} schools` : list(easy.map(shortOf))}` : easy.length ? shortOf(easy[0]) : "";
    const easyMark = easy.length ? cell(easy[0], g, "100m").replace(/ est\.$/, "") : "";
    if (R.length >= 2 && R[0][1] !== R[R.length - 1][1]) ans += ` The hardest to make is ${esc(shortOf(R[0][0]))}, where ${g === "m" ? "men" : "women"} need about ${esc(cell(R[0][0], g, "100m").replace(/ est\.$/, ""))} in the 100m to make the team, and the most reachable ${easy.length > 1 ? "are" : "is"} ${esc(easyName)} at ${esc(easyMark)}.`;
    if (nChamp) ans += ` ${esc(nm)} programs have won ${count(nChamp, "individual national title", "individual national titles")} since 2016${champs.length > 1 ? `, ${champs[0][1].length} of them at ${esc(shortOf(champs[0][0]))}` : ""}.`;
    let body = "";
    /* Recruit levels side by side, then each division's schools with their conference */
    if (four.length) body += `<h2>What it takes to make the team at every ${esc(nm)} college</h2><p>The entry level at each program: its Walk-On mark, or its Recruit mark at Power 4 schools, which take no walk-ons. Set from 2026 conference results or the school's own chart (★); "est." means the division's typical level, for schools without conference results. Open a school for its Target level and every event.</p><div class="scroll"><table><tr><th>School</th><th>Division</th><th class="n">Men's 100m</th><th class="n">Men's 1500m</th><th class="n">Women's 100m</th><th class="n">Women's 1500m</th></tr>${four.slice().sort((a, b) => DIVS.indexOf(a.d) - DIVS.indexOf(b.d) || shortOf(a).localeCompare(shortOf(b))).map(s => `<tr><td><a href="${sl(s)}">${esc(shortOf(s))}</a>${s.o ? ' <span class="star">★</span>' : ""}</td><td>${esc(s.d)}</td>${COLS.map(([g, e]) => `<td class="n">${esc(cell(s, g, e))}</td>`).join("")}</tr>`).join("")}</table></div>`;
    if (nChamp) body += `<h2>National champions from ${esc(nm)} colleges since 2016</h2><div class="scroll"><table><tr><th>School</th><th class="n">Titles</th><th>Most recent</th></tr>${champs.map(([s, C]) => { const c = newestFirst(C)[0]; return `<tr><td><a href="${sl(s)}">${esc(shortOf(s))}</a> <small>${esc(s.d)}</small></td><td class="n">${C.length}</td><td>${esc(c[5])}, ${c[3] === "m" ? "men's" : "women's"} ${esc(evl(c[4]))} (${c[0]} ${c[1]})</td></tr>`; }).join("")}</table></div><p style="font-size:13px;color:#4A4A52">Individual event titles at each division's national championships (relays not counted), from TFRRS meet results. The 2016 and 2021 NCAA D1 outdoor meets and the 2021 NAIA outdoor meet aren't on TFRRS, so they aren't counted; 2020 was cancelled.</p>`;
    if (devs.length >= 2) body += `<h2>Which ${esc(nm)} programs develop athletes best?</h2><p>Share of athletes who ran their season best at the conference championship or later, 2022 to 2026, against every program in the same division.</p><div class="scroll"><table><tr><th>School</th><th class="n">Peaked at the right time</th><th class="n">Better than</th><th class="n">Yearly improvement</th></tr>${devs.map(([s, d]) => `<tr><td><a href="${sl(s)}">${esc(shortOf(s))}</a> <small>${esc(s.d)}</small></td><td class="n">${d.peak}%</td><td class="n">${d.peak_pct}% of ${esc(d.division)}</td><td class="n">${d.yoy == null ? "–" : `${d.yoy >= 0 ? "+" : ""}${d.yoy.toFixed(2)}%`}</td></tr>`).join("")}</table></div>`;
    body += divs.map(d => `<h2>${esc(d)}${d === "NJCAA" ? " junior colleges" : ""} in ${esc(nm)} (${L.filter(s => s.d === d).length})</h2><div class="scroll"><table><tr><th>School</th><th>Conference</th></tr>${L.filter(s => s.d === d).sort((a, b) => shortOf(a).localeCompare(shortOf(b))).map(s => `<tr><td><a href="${sl(s)}">${esc(s.n)}</a>${s.o ? ' <span class="star">★ official</span>' : ""}${(s.ng || []).length === 1 ? ` <small>${s.ng[0] === "m" ? "women only" : "men only"}</small>` : ""}</td><td><a href="${confName.get(s.d + "|" + s.c)}">${esc(s.c)}</a></td></tr>`).join("")}</table></div>`).join("");
    /* questions people ask about the state, answered from the data above */
    const q = [];
    q.push([`What colleges in ${nm} have track and field?`, `${nm} has ${count(L.length, "college track and field program", "college track and field programs")}: ${list(split)}.${L.some(s => s.d === "NCAA D1") ? ` The NCAA D1 programs are ${list(L.filter(s => s.d === "NCAA D1").map(shortOf).sort())}.` : ""}`]);
    if (nChamp) q.push([`Is ${nm} good at track and field?`, `${nm} college programs have won ${count(nChamp, "individual national title", "individual national titles")} since 2016: ${list(champs.slice(0, 4).map(([s, C]) => `${C.length} at ${shortOf(s)}`))}.${devs.length ? ` ${shortOf(devs[0][0])} peaks its athletes best in the state: ${devs[0][1].peak}% ran their season best at the conference championship or later, better than ${devs[0][1].peak_pct}% of ${devs[0][1].division} programs.` : ""}`]);
    if (R.length >= 2 && R[0][1] !== R[R.length - 1][1]) q.push([`What is the easiest college in ${nm} to run track at?`, `By the ${gw(g)} 100m mark needed to make the team, the most reachable four-year ${easy.length > 1 ? `programs in ${nm} are ${easyName} in ${easy[0].d}${easy.length > 3 ? ` (${list(easy.map(shortOf))})` : ""}` : `program in ${nm} is ${easyName} (${easy[0].d})`} at ${easyMark}, and the hardest is ${shortOf(R[0][0])} (${R[0][0].d}) at ${cell(R[0][0], g, "100m").replace(/ est\.$/, "")}. Every program's level for every event is on its school page.`]);
    for (const s of only) q.push([`Does ${shortOf(s)} have a ${s.ng[0] === "m" ? "men's" : "women's"} track team?`, `No. ${shortOf(s)} competes in ${s.ng[0] === "m" ? "women's" : "men's"} track and field only: it has no ${s.ng[0] === "m" ? "men's" : "women's"} team on the 2026 NCAA results lists. ${s.ng[0] === "m" ? "Men" : "Women"} who want to compete in ${nm} can look at ${list(four.filter(x => x !== s && !(x.ng || []).includes(s.ng[0]) && x.d === s.d).map(shortOf).slice(0, 3)) || "the other programs on this page"}.`]);
    if (L.some(s => s.d === "NCAA D1")) q.push([`How many D1 track and field schools are in ${nm}?`, `${count(L.filter(s => s.d === "NCAA D1").length, "NCAA D1 program", "NCAA D1 programs")}: ${list(L.filter(s => s.d === "NCAA D1").map(s => `${shortOf(s)} (${s.c})`))}.`]);
    body += `<h2>Questions about college track and field in ${esc(nm)}</h2>${q.map(([a, b]) => `<h3>${esc(a)}</h3><p>${esc(b)}</p>`).join("")}`;
    write(p, page({ title: `${nm} College Track & Field: ${L.length} Programs & Standards`,
      desc: `Every college track and field program in ${nm}: ${four.length} NCAA and NAIA schools with ${SEASON} recruiting standards side by side${nChamp ? `, ${nChamp} national titles since 2016` : ""}${L.some(s => s.j) ? ` and ${L.filter(s => s.j).length} junior colleges` : ""}.`,
      pathname: p, crumbs: [["Home", "/"], ["Explore", "/explore.html"], [nm, p]], h1: `College Track &amp; Field Programs in ${esc(nm)}`,
      intro: ans, body,
      ld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: q.map(([a, b]) => ({ "@type": "Question", name: a, acceptedAnswer: { "@type": "Answer", text: b } })) },
        { "@context": "https://schema.org", "@type": "ItemList", name: `College track and field programs in ${nm}`, itemListElement: L.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + sl(s), name: s.n })) }] }));
  }
  return byState;
}
