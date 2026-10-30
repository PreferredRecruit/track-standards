/* Rankings section (Ryan 2026-10-30: rankings on the site, "weekly, monthly, yearly rankings, cuz schools love flexing that").
     /rankings.html                                          hub: every division's current top 10 + the season archive
     /rankings/ncaa-d1-track-and-field-rankings.html          current season, every ranked program, men's/women's ranks,
                                                              change vs last year, and vs last week / last month once the
                                                              Monday snapshots cover the season (depth_history.json)
     /rankings/2025-outdoor-ncaa-d1-track-and-field-rankings.html   final rankings of each finished season (DEPTH_FROM on)
   Method and data: depth.mjs. Every row shows its counts so anyone can check it. */
import { DEPTH_DIVS, DEPTH_TOP, DEPTH_FROM, GROUPS, rankPath, seasonPath, groupPath, seasonLabel } from "./depth.mjs";

export function rankingPages({ R, write, page, esc, sl, SITE, QUIZ, confUrl, TOPICS }) {
  const done = [];
  if (!DEPTH_DIVS.every(d => R.cur[d])) return done;
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const CSS = `<style>.qa{background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:14px 18px;margin:14px 0 6px}.qa b{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}.qa p{margin:0;font-size:17px}.upd{font-size:13px;color:#4A4A52}.up{color:#0B7A3E;font-weight:600}.dn{color:#B42318}.nw{color:#4A4A52;font-size:12px}.cta{background:#F4F1FF;border-radius:14px;padding:14px 16px;margin:22px 0}</style>`;
  const nm = x => x.s ? (x.s.t && !/\./.test(x.s.t.replace(/\(.*?\)/g, "")) ? x.s.t : x.s.n) : x.t;   /* "Wayne State (Mich.)", not "Pittsburg St." */
  const link = x => x.s ? `<a href="${sl(x.s)}">${esc(nm(x))}</a>` : esc(x.t);
  const conf = x => x.s && confUrl(x.s) ? `<a href="${confUrl(x.s)}">${esc(x.s.c)}</a>` : x.s ? esc(x.s.c) : "–";
  const mv = (now, then) => then == null ? `<span class="nw">new</span>` : then > now ? `<span class="up">▲${then - now}</span>` : then < now ? `<span class="dn">▼${now - then}</span>` : "–";
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const SHORT = d => d.replace("NCAA ", "");
  const sum = c => c.rows.reduce((a, r) => a + r.n, 0);
  const table = (c, { yoy = true, wk = false, mo = false } = {}) => {
    const H = ["#", "Program", "Conference", "Top-50 entries", "Men", "Women", ...(yoy && c.prevOf ? [`vs ${+c.year - 1}`] : []), ...(wk ? ["Week"] : []), ...(mo ? ["Month"] : [])];
    return `<div class="scroll"><table><tr>${H.map((h, i) => `<th${i > 2 ? ' class="n"' : ""}>${h}</th>`).join("")}</tr>${c.rows.map(r => `<tr><td>${r.rank}</td><td>${link(r)}</td><td>${conf(r)}</td><td class="n"><b>${r.n}</b></td><td class="n">${r.m ? `${r.m} <small>(#${r.mr})</small>` : "–"}</td><td class="n">${r.w ? `${r.w} <small>(#${r.wr})</small>` : "–"}</td>${yoy && c.prevOf ? `<td class="n">${mv(r.rank, r.prev)}</td>` : ""}${wk ? `<td class="n">${mv(r.rank, r.wk)}</td>` : ""}${mo ? `<td class="n">${mv(r.rank, r.mo)}</td>` : ""}</tr>`).join("")}</table></div>`;
  };
  const METHOD = (c, d) => `<p>Each individual event on the ${esc(seasonLabel(c))} ${esc(d)} national qualifying list (TFRRS) counts its top ${DEPTH_TOP} men and top ${DEPTH_TOP} women. A program scores one entry for every spot its athletes hold, so an athlete in two events counts twice. Relays are left out. Ties share a rank. Men's and women's ranks are in brackets. The ranking measures national-level depth, not championship points or which school fits you best: <a href="/">search your mark</a> for that.</p>`;
  const risers = c => c.prevOf ? c.rows.filter(r => r.rank <= 50 && r.prev != null && r.prev - r.rank >= 5).sort((a, b) => (b.prev - b.rank) - (a.prev - a.rank)).slice(0, 5) : [];
  const art = ({ p, title, desc, h1, crumbs, answer, body, faq, date }) => {
    const plain = s => String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, dateModified: date, mainEntityOfPage: SITE + p, image: SITE + "/og.jpg", citation: ["https://www.tfrrs.org/"] },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) }];
    write(p, page({ title, desc, pathname: p, crumbs, h1, body: CSS + `<div class="qa"><b>Quick answer</b><p>${answer}</p></div>` + body + `<h2>Common questions</h2>${faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${x}</p>`).join("")}<h2>Using these rankings</h2><p>Schools, coaches and journalists are welcome to share a ranking with a link to its page. The counts behind every rank are in the table, so anyone can check them.</p><div class="cta"><b>Want coaches to see your marks?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div>`, ld }));
  };

  /* current season, one page per division */
  for (const d of DEPTH_DIVS) {
    const c = R.cur[d], p = rankPath(d), top3 = c.rows.slice(0, 3), up = risers(c);
    const wk = !!c.wkDate, mo = !!c.moDate;
    const GR = R.groups[d] || {}, gl = GROUPS.filter(([k]) => GR[k]);
    const arch = R.seasons[d].filter(x => +x.year >= DEPTH_FROM && x !== c).reverse();
    art({ p, date: c.asOf || `${c.year}-${c.season === "indoor" ? "03-20" : "06-20"}`, crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], [d, p]],
      title: `${d} Track and Field Rankings ${c.year} (${c.season === "indoor" ? "Indoor" : "Outdoor"})`, h1: `${esc(d)} track and field rankings: ${esc(seasonLabel(c))}`,
      desc: `${d} track and field team rankings for ${seasonLabel(c)}: all ${c.rows.length} programs with athletes in the national top ${DEPTH_TOP}, men's and women's ranks, and who moved up since ${+c.year - 1}.`,
      answer: `${list(top3.map(r => `${esc(nm(r))} (${r.n})`))} lead the ${esc(seasonLabel(c))} ${esc(d)} rankings, counted by athletes in the top ${DEPTH_TOP} of every national list.${up.length ? ` Biggest climbers since ${+c.year - 1}: ${list(up.slice(0, 3).map(r => `${esc(nm(r))} (#${r.prev} to #${r.rank})`))}.` : ""}`,
      body: `<p class="upd">${c.asOf ? `Updated ${c.asOf} (every Monday in season)` : `Final ${esc(seasonLabel(c))} lists`} · ${c.rows.length} ranked programs · ${sum(c)} top-${DEPTH_TOP} spots · ${wk || mo ? "" : "Weekly and monthly movement shows here once the next season's lists start (indoor, December)."}</p>`
        + `<h2>${esc(d)} team rankings, ${esc(seasonLabel(c))}</h2>` + table(c, { wk, mo })
        + (up.length ? `<h2>Biggest climbers since ${+c.year - 1}</h2><ul>${up.map(r => `<li>${link(r)}: #${r.prev} to #${r.rank} (${r.n} top-${DEPTH_TOP} spots)</li>`).join("")}</ul>` : "")
        + (gl.length ? `<h2>Rankings by event group</h2><div class="links">${gl.map(([k, l]) => `<a href="${groupPath(d, k)}">${esc(d)} ${esc(l.toLowerCase())}</a>`).join("")}</div>` : "")
        + `<h2>How the ranking works</h2>${METHOD(c, d)}`
        + (arch.length ? `<h2>Past seasons</h2><div class="links">${arch.map(x => `<a href="${seasonPath(d, x.year, x.season)}">${esc(d)} ${esc(seasonLabel(x))}</a>`).join("")}</div>` : "")
        + `<h2>Other divisions</h2><div class="links">${DEPTH_DIVS.filter(x => x !== d).map(x => `<a href="${rankPath(x)}">${esc(x)} rankings</a>`).join("")}<a href="/rankings.html">All rankings</a></div>`,
      faq: [[`Who is the best ${d} track and field team in ${c.year}?`, `${esc(nm(top3[0]))}, with ${top3[0].n} athletes in the top ${DEPTH_TOP} of the ${esc(seasonLabel(c))} national lists (${top3[0].m} men, ${top3[0].w} women).`],
        [`What is the best ${d} men's track program?`, (() => { const r = c.rows.filter(x => x.mr === 1); return `${list(r.map(x => esc(nm(x))))}, with ${r[0].m} men in the national top ${DEPTH_TOP}.`; })()],
        [`What is the best ${d} women's track program?`, (() => { const r = c.rows.filter(x => x.wr === 1); return `${list(r.map(x => esc(nm(x))))}, with ${r[0].w} women in the national top ${DEPTH_TOP}.`; })()],
        ["How often do these rankings update?", "Every Monday during the indoor and outdoor seasons, when the national lists refresh. Each finished season keeps its final ranking on its own page."]] });
    done.push([p, `${d} rankings`, ""]);

    /* event-group pages: sprints, hurdles, distance, jumps, throws, multis */
    for (const [k, label] of gl) {
      const rows = GR[k], q = groupPath(d, k), lw = label.toLowerCase(), t3 = rows.slice(0, 3);
      const gc = { ...c, rows, prevOf: 0 };
      art({ p: q, date: c.asOf || `${c.year}-${c.season === "indoor" ? "03-20" : "06-20"}`, crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], [d, p], [label, q]],
        title: `Best ${d} ${label} Programs ${c.year}: Track Rankings`, h1: `${esc(d)} ${esc(lw)} rankings: ${esc(seasonLabel(c))}`,
        desc: `The best ${d} ${lw} programs in ${seasonLabel(c)}, ranked by athletes in the top ${DEPTH_TOP} of every ${lw} event on the national lists. Men's and women's ranks for all ${rows.length} programs.`,
        answer: `${list(t3.map(r => `${esc(nm(r))} (${r.n})`))} have the most ${esc(lw)} athletes in the top ${DEPTH_TOP} of the ${esc(seasonLabel(c))} ${esc(d)} national lists.${(() => { const m = rows.find(r => r.mr === 1), w = rows.find(r => r.wr === 1); return m && w ? (m === w ? ` ${esc(nm(m))} is #1 for both men and women.` : ` Best for men: ${esc(nm(m))}; for women: ${esc(nm(w))}.`) : ""; })()}`,
        body: `<p class="upd">${c.asOf ? `Updated ${c.asOf}` : `Final ${esc(seasonLabel(c))} lists`} · ${rows.length} ranked programs</p><h2>${esc(d)} ${esc(lw)} rankings</h2>` + table(gc, { yoy: false })
          + `<h2>How it works</h2><p>Same method as the <a href="${p}">overall ${esc(d)} rankings</a>, counting only ${esc(lw)} events (${esc(lw === "sprints" ? "60m to 400m" : lw === "hurdles" ? "every hurdles race" : lw === "distance" ? "800m and up, including the steeplechase" : lw === "jumps" ? "high jump, pole vault, long jump and triple jump" : lw === "throws" ? "shot put, discus, hammer, javelin and weight throw" : "decathlon, heptathlon and pentathlon")}).</p>`
          + `<h2>Other event groups</h2><div class="links">${gl.filter(([x]) => x !== k).map(([x, l]) => `<a href="${groupPath(d, x)}">${esc(d)} ${esc(l.toLowerCase())}</a>`).join("")}</div>`,
        faq: [[`What is the best ${d} ${lw} program in ${c.year}?`, `${esc(nm(t3[0]))}, with ${t3[0].n} ${esc(lw)} athletes in the national top ${DEPTH_TOP} (${t3[0].m} men, ${t3[0].w} women).`]] });
      done.push([q, `${d} ${lw}`, ""]);
    }

    /* finished seasons: final rankings */
    for (const x of arch) {
      const q = seasonPath(d, x.year, x.season), t3 = x.rows.slice(0, 3), u = risers(x);
      art({ p: q, date: `${x.year}-${x.season === "indoor" ? "03-20" : "06-20"}`, crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], [d, p], [seasonLabel(x), q]],
        title: `${d} Track and Field Rankings: ${seasonLabel(x)} Final`, h1: `${esc(d)} track and field rankings: ${esc(seasonLabel(x))} final`,
        desc: `Final ${seasonLabel(x)} ${d} track and field team rankings: all ${x.rows.length} programs with athletes in the national top ${DEPTH_TOP}, men's and women's ranks and change from ${+x.year - 1}.`,
        answer: `${list(t3.map(r => `${esc(nm(r))} (${r.n})`))} finished on top of the ${esc(seasonLabel(x))} ${esc(d)} rankings, counted by athletes in the top ${DEPTH_TOP} of every national list.${u.length ? ` Biggest climbers: ${list(u.slice(0, 3).map(r => `${esc(nm(r))} (#${r.prev} to #${r.rank})`))}.` : ""}`,
        body: `<p class="upd">Final ${esc(seasonLabel(x))} lists · ${x.rows.length} ranked programs</p><h2>Final ${esc(d)} team rankings, ${esc(seasonLabel(x))}</h2>` + table(x)
          + (u.length ? `<h2>Biggest climbers from ${+x.year - 1}</h2><ul>${u.map(r => `<li>${link(r)}: #${r.prev} to #${r.rank}</li>`).join("")}</ul>` : "")
          + `<h2>How the ranking works</h2>${METHOD(x, d)}<p><a href="${p}">Current ${esc(d)} rankings ›</a></p>`,
        faq: [[`Who was the best ${d} track and field team in ${seasonLabel(x)}?`, `${esc(nm(t3[0]))}, with ${t3[0].n} athletes in the top ${DEPTH_TOP} of the national lists.`]] });
      done.push([q, `${d} ${seasonLabel(x)}`, ""]);
    }
  }

  /* hub */
  const H = DEPTH_DIVS.map(d => R.cur[d]);
  art({ p: "/rankings.html", date: H.map(c => c.asOf || `${c.year}-06-20`).sort().pop(), crumbs: [["Home", "/"], ["Rankings", "/rankings.html"]],
    title: `College Track and Field Rankings ${H[0].year}: D1, D2, D3, NAIA`, h1: "College track and field rankings",
    desc: `${H[0].year} college track and field team rankings for NCAA D1, D2, D3 and NAIA, by athletes in the national top ${DEPTH_TOP}. Updated every Monday in season, with every past season's final.`,
    answer: `The top programs right now: ${DEPTH_DIVS.map((d, i) => `${esc(SHORT(d))} ${esc(nm(H[i].rows[0]))}`).join(", ")}. Every ranked program counts its athletes in the top ${DEPTH_TOP} of its division's national lists.`,
    body: DEPTH_DIVS.map((d, i) => { const c = H[i]; return `<h2>${esc(d)} top 10 (${esc(seasonLabel(c))})</h2>` + table({ ...c, rows: c.rows.filter(r => r.rank <= 10) }) + `<p><a href="${rankPath(d)}">All ${c.rows.length} ${esc(d)} programs ›</a></p>`; }).join("")
      + `<h2>How the rankings work</h2>${METHOD(H[0], "division's")}<p>Conference pages show each conference's own ranking, and every school page shows where that school stands.</p>`,
    faq: [["What are the best college track and field programs?", `By national-list depth in ${esc(seasonLabel(H[0]))}: ${DEPTH_DIVS.map((d, i) => `${esc(nm(H[i].rows[0]))} in ${esc(d)}`).join(", ")}.`],
      ["How often are the rankings updated?", "Every Monday during the indoor (December to March) and outdoor (March to June) seasons."]] });
  done.push(["/rankings.html", "Rankings", ""]);
  return done;
}
