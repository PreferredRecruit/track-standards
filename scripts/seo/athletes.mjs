/* College athlete pages (Ryan 2026-10-21: "for every athlete name or track result ... a single discrete link per entry ... a
   dedicated landing page" + "do what you know will work best to increase aeo and seo").
   Built to the scaled-pages rules in the seo-aeo-growth skill:
     - pilot only: the NCAA D1 outdoor national top 12 in every individual event of the latest season (about 500 athletes),
       college athletes only (public TFRRS results; high schoolers are minors and never get name pages)
     - every page is that athlete's own data: all of their list marks 2016 to today (matched by TFRRS athlete id), ranks, and how
       their marks compare with the college standards on this site. Generic advice is a link, never copied in.
     - released 100 a day from START (PUBLISH_DATE overrides "today"), so the URL set grows steadily
     - the link to each page is the athlete's name on the results/champions pages (a normal visible link, no extra UI)
   Writes /athletes/<slug>.html, the /athletes.html hub, and dist/data/athletes-index.json (TFRRS id -> page) for the app. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const START = "2026-10-21", PER_DAY = 100, TOP = 12;
const addDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export function athleteIndex({ out, RIDX, cleanRank, evLabel, slug, EVENTS }) {
  const today = process.env.PUBLISH_DATE || new Date().toISOString().slice(0, 10);
  const load = key => { try { return cleanRank(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, "data/rank", key + ".dat"))).toString())); } catch { return null; } };
  const ev = e => evLabel(e).replace(/,/g, "");
  const order = e => { const i = EVENTS.indexOf(e); return i < 0 ? 99 : i; };
  const latest = RIDX.filter(x => x.div === "NCAA D1" && x.season === "outdoor").map(x => x.year).sort().pop();
  const base = latest && RIDX.find(x => x.div === "NCAA D1" && x.season === "outdoor" && x.year === latest);
  const D0 = base && load(base.key); const nat0 = D0 && D0.lists.find(l => l.nat);
  const P = new Map();   /* TFRRS id -> athlete */
  const picks = [];
  if (nat0) for (const g of ["m", "w"]) for (const [e, rows] of Object.entries(nat0.g[g] || {})) {
    const E = ev(e); if (/relay/i.test(E)) continue;
    let n = 0;
    for (const r of rows) {
      if (n >= TOP) break; if (!r[1] || !r[9]) continue;
      const id = String(r[9]).split("/")[0]; n++;
      if (!P.has(id)) P.set(id, { id, name: r[1], team: D0.teams[r[3]], g, path: r[9], top: [], recs: [] });
      P.get(id).top.push({ e: E, rank: +r[0] || n });
    }
  }
  /* release order: best rank first, then event order; 100 a day */
  const list = [...P.values()].sort((a, b) => Math.min(...a.top.map(t => t.rank)) - Math.min(...b.top.map(t => t.rank)) || order(a.top[0].e) - order(b.top[0].e) || a.name.localeCompare(b.name));
  const used = new Set();
  list.forEach((a, i) => {
    a.release = addDays(START, Math.floor(i / PER_DAY));
    let s = slug(a.name + " " + a.team); if (used.has(s)) s += "-" + a.id; used.add(s); a.slug = s; a.url = `/athletes/${s}.html`;
  });
  const live = list.filter(a => a.release <= today);
  const LIVE = new Map(live.map(a => [a.id, a]));
  /* every list mark of every live athlete, all seasons and divisions (id match; older rows without an id match on name + team) */
  const byNT = new Map(live.map(a => [(a.name + "|" + a.team).toLowerCase(), a]));
  if (live.length) for (const x of RIDX) {
    const D = load(x.key); if (!D) continue;
    for (const L of D.lists) for (const g of ["m", "w"]) for (const [e, rows] of Object.entries(L.g[g] || {})) {
      const E = ev(e); if (/relay/i.test(E) || /\b(Men|Women)\b/.test(E)) continue;   /* championship lists name events "Men 100 Meter Dash": the list copy is enough */
      for (const r of rows) {
        if (!r[1]) continue;
        const a = (r[9] && LIVE.get(String(r[9]).split("/")[0])) || (!r[9] && byNT.get((r[1] + "|" + D.teams[r[3]]).toLowerCase()));
        if (!a || a.g !== g) continue;
        a.recs.push({ y: x.year, s: x.season, d: x.div, key: x.key, nat: !!L.nat, champ: !!L.champ, list: L.label, e: E, rank: +r[0] || null, mark: r[4], wind: r[5] || "", meet: D.meets[r[6]] || "", date: r[7] || "", team: D.teams[r[3]], cls: r[2] || "" });
      }
    }
  }
  fs.mkdirSync(path.join(out, "data"), { recursive: true });
  fs.writeFileSync(path.join(out, "data/athletes-index.json"), JSON.stringify(Object.fromEntries(live.map(a => [a.id, a.url]))));
  /* link for a results row (used by the results and champions pages) */
  const href = r => { if (!r || !r[9]) return null; const a = LIVE.get(String(r[9]).split("/")[0]); return a ? a.url : null; };
  return { live, all: list, href, today, out };
}

export function athletePages({ idx, write, page, esc, slug, S, raw, parse, FIELD, EVENTS, sl, evPath, confName, gName }) {
  const { live } = idx; if (!live.length) return 0;
  /* careers (Ryan 2026-10-24: "integrate this without crowding the pages with too many links"): school per season, one-line path,
     first-to-latest progression; plain text, no extra links. Data: public/data/career (scripts/tfrrs/build_career.py) */
  const CB = {}, careerOf = id => { const b = +id % 512; if (!(b in CB)) { try { CB[b] = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(idx.out, "data/career", b + ".dat"))).toString()); } catch { CB[b] = {}; } } return CB[b][id] || null; };
  const order = e => { const i = EVENTS.indexOf(e); return i < 0 ? 99 : i; };
  /* the site's one mark reader handles 10.5, 1:52.3, 7.45m and 24-5.5 (feet-inches) alike; strip only wind/notes in brackets */
  const val = (m, e) => { const v = parse(String(m).replace(/\(.*?\)/g, "").trim(), e); return v == null || isNaN(v) ? null : v; };
  const better = (e, a, b) => FIELD.has(e) ? a > b : a < b;
  const verb = e => /Jump|Vault/.test(e) ? "jumped" : /Put|Discus|Hammer|Javelin|Weight/.test(e) ? "threw" : /thlon/.test(e) ? "scored" : "ran";
  const progs = S.filter(s => !s.j);
  /* how many programs' levels a mark meets: [walk-on, recruit, target] counts + programs with that event */
  const fits = (g, e, v) => { let have = 0, w = 0, t = 0; for (const s of progs) { const L = raw(s, g, e); if (!L) continue; const lv = L.map(x => x ? val(x, e) : null); if (lv.every(x => x == null)) continue; have++;
      const walk = lv[2] ?? lv[1] ?? lv[0], top = lv[0] ?? lv[1] ?? lv[2]; if (walk != null && !better(e, walk, v)) w++; if (top != null && !better(e, top, v)) t++; } return { have, w, t }; };
  const seasonName = s => s === "xc" ? "cross country" : s;
  const resultPath = (r, g) => `/results/${r.y}-${r.s}-${slug(r.d)}-${g === "m" ? "mens" : "womens"}-${slug(r.e)}.html`;
  for (const a of live) {
    if (!a.recs.length) continue;
    const g = a.g, first = a.name.split(" ")[0];
    /* season bests: one row per season x event (best mark), with its national and conference rank when the athlete is on them */
    const by = new Map();
    for (const r of a.recs) {
      const k = `${r.y}|${r.s}|${r.d}|${r.e}`, v = val(r.mark, r.e); if (v == null) continue;
      const cur = by.get(k) || { y: r.y, s: r.s, d: r.d, e: r.e, v, mark: r.mark, wind: r.wind, meet: r.meet, date: r.date, team: r.team, cls: r.cls, nat: null, conf: null, confName: "" };
      if (better(r.e, v, cur.v)) Object.assign(cur, { v, mark: r.mark, wind: r.wind, meet: r.meet, date: r.date });
      if (r.nat && r.rank) cur.nat = cur.nat ? Math.min(cur.nat, r.rank) : r.rank;
      if (!r.nat && !r.champ && r.rank && !/region|qualif|ecac|ic4a|neicaaa|outdoor list|indoor list|division|championship|rankings/i.test(r.list)) { if (!cur.conf || r.rank < cur.conf) { cur.conf = r.rank; cur.confName = r.list; } }
      by.set(k, cur);
    }
    const rows = [...by.values()].sort((x, y) => y.y.localeCompare(x.y) || (y.s === "outdoor") - (x.s === "outdoor") || order(x.e) - order(y.e));
    if (!rows.length) continue;
    /* headline: the athlete's best national rank in the latest outdoor season */
    const head = rows.filter(r => r.s === "outdoor").sort((x, y) => y.y.localeCompare(x.y) || (x.nat || 999) - (y.nat || 999))[0] || rows[0];
    const bestByEv = new Map(); for (const r of rows) { const c = bestByEv.get(r.e); if (!c || better(r.e, r.v, c.v)) bestByEv.set(r.e, r); }
    const evBest = [...bestByEv.values()].sort((x, y) => order(x.e) - order(y.e));
    const fh = fits(g, head.e, head.v);
    const years = [...new Set(rows.map(r => r.y))].sort(), teams = [...new Set(rows.map(r => r.team))];
    const school = progs.find(s => s.d === head.d && (s.t === a.team || s.n === a.team)) || progs.find(s => s.t === a.team || s.n === a.team);
    const tfrrs = `https://tf.tfrrs.org/athletes/${a.path}`;
    const answer = `${a.name} (${a.team}) ${verb(head.e)} ${head.mark} in the ${head.e} in the ${head.y} ${seasonName(head.s)} season${head.nat ? `, #${head.nat} on the ${head.d} national list` : ""}.`
      + (!fh.have ? "" : fh.t === fh.have ? ` That mark ${FIELD.has(head.e) ? "goes past" : "beats"} the top recruiting level at all ${fh.have.toLocaleString()} college programs with ${head.e} standards on this site.`
        : ` That mark meets the Walk-On level at ${fh.w.toLocaleString()} of ${fh.have.toLocaleString()} college programs on this site and the top recruiting level at ${fh.t.toLocaleString()}.`);
    const car = careerOf(String(a.path).split("/")[0]), tmap = new Map((car ? car.s : []).map(x => [`${x[0]}|${x[3]}`, x[5]]));
    const teamOf = r => tmap.get(`${r.y}-${r.s}|${r.mark}`) || r.team;
    /* career path: schools in order with their years, TFRRS "previously at" schools first */
    const segs = []; [...rows].reverse().forEach(r => { const t = teamOf(r), L = segs[segs.length - 1]; if (L && L.t === t) L.y2 = r.y; else segs.push({ t, y1: r.y, y2: r.y }); });
    const prev = ((car && car.p) || []).filter(t => !segs.some(x => x.t === t));
    const cpath = segs.length > 1 || prev.length ? `<p class="cpath"><b>Career:</b> ${[...prev.map(esc), ...segs.map(x => `${esc(x.t)} (${x.y1 === x.y2 ? x.y1 : x.y1 + "–" + x.y2})`)].join(" → ")}</p>` : "";
    /* progression: each event's first and latest season best */
    const prog = [...new Set(rows.map(r => r.e))].map(e => { const L = rows.filter(r => r.e === e).sort((x, y) => x.y.localeCompare(y.y) || (x.s === "outdoor") - (y.s === "outdoor")); if (L.length < 2) return null;
      const f = L[0], l = L[L.length - 1], ch = FIELD.has(e) ? (l.v - f.v) / f.v : (f.v - l.v) / f.v; return [e, f, l, ch]; }).filter(Boolean).sort((x, y) => order(x[0]) - order(y[0]));
    const progT = prog.length ? `<h2>Progression</h2><div class="scroll"><table><tr><th>Event</th><th class="n">First season</th><th class="n">Latest season</th><th class="n">Change</th></tr>${prog.map(([e, f, l, ch]) =>
      `<tr><td>${esc(e)}</td><td class="n">${esc(f.mark)} <small>(${f.y} ${esc(seasonName(f.s))}${teamOf(f) !== teamOf(l) ? ", " + esc(teamOf(f)) : ""})</small></td><td class="n">${esc(l.mark)} <small>(${l.y} ${esc(seasonName(l.s))}${teamOf(f) !== teamOf(l) ? ", " + esc(teamOf(l)) : ""})</small></td><td class="n">${ch >= 0 ? "+" : ""}${(ch * 100).toFixed(1)}%</td></tr>`).join("")}</table></div>` : "";
    const table = `<div class="scroll"><table><tr><th>Season</th><th>School</th><th>Event</th><th class="n">Mark</th><th class="n">National rank</th><th>Conference rank</th><th>Meet</th></tr>${rows.map(r =>
      `<tr><td>${r.y} ${esc(seasonName(r.s))}${r.d !== head.d ? ` <small>(${esc(r.d)})</small>` : ""}</td><td>${esc(teamOf(r))}</td><td>${esc(r.e)}</td><td class="n">${esc(r.mark)}${r.wind ? ` <small>(${esc(r.wind)})</small>` : ""}</td><td class="n">${r.nat ? "#" + r.nat : "–"}</td><td>${r.conf ? `#${r.conf} ${esc(r.confName)}` : "–"}</td><td>${esc(r.meet)}${r.date ? ` <small>${esc(r.date)}</small>` : ""}</td></tr>`).join("")}</table></div>`;
    const cmp = evBest.map(r => { const f = fits(g, r.e, r.v); return f.have ? `<tr><td>${esc(r.e)}</td><td class="n">${esc(r.mark)}</td><td class="n">${f.w.toLocaleString()} of ${f.have.toLocaleString()}</td><td class="n">${f.t.toLocaleString()}</td></tr>` : ""; }).join("");
    const links = [];
    if (school) links.push([sl(school), `${school.n} track and field recruiting standards`]);
    if (school && confName.get(school.d + "|" + school.c)) links.push([confName.get(school.d + "|" + school.c), `${school.c} recruiting standards`]);
    links.push([evPath(head.d, g, head.e), `${head.d} ${gName(g).toLowerCase()} ${head.e} standards at every school`]);
    for (const r of evBest.slice(0, 3)) if (r.nat) links.push([resultPath(r, g), `${r.y} ${r.d} ${gName(g).toLowerCase()} ${r.e} top marks`]);
    links.push(["/athletes.html", "More college athletes"]);
    const faq = [[`What is ${a.name}'s best ${head.e} mark?`, `${evBest.find(r => r.e === head.e).mark}, set in the ${evBest.find(r => r.e === head.e).y} ${seasonName(evBest.find(r => r.e === head.e).s)} season (TFRRS performance lists).`]];
    if (fh.have) faq.push([`How many colleges would a ${head.mark} ${head.e} fit?`, fh.t === fh.have ? `All of them: it ${FIELD.has(head.e) ? "goes past" : "beats"} the top recruiting level at all ${fh.have.toLocaleString()} college programs with ${gName(g).toLowerCase()} ${head.e} standards on this site.` : `It meets the Walk-On level at ${fh.w.toLocaleString()} of ${fh.have.toLocaleString()} college programs with ${gName(g).toLowerCase()} ${head.e} standards on this site, and the top recruiting level at ${fh.t.toLocaleString()}.`]);
    const body = `${cpath}<h2>Season bests</h2>${table}${progT}
${cmp ? `<h2>How do ${esc(first)}'s marks compare with college recruiting standards?</h2><p>Each best mark against every program's levels on this site (Walk-On is the easiest level, the top level is Target or scholarship level).</p><div class="scroll"><table><tr><th>Event</th><th class="n">Best mark</th><th class="n">Meets Walk-On at</th><th class="n">Meets top level at</th></tr>${cmp}</table></div>` : ""}
<h2>Common questions</h2>${faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${esc(x)}</p>`).join("")}
<div class="claim" style="margin:26px 0;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:#fff"><b>Is this you?</b> Create a free profile to keep your PRs in one place and see every college your marks fit. <a href="/onboarding">Create your free profile ›</a></div>
<h2>Related</h2><div class="links">${links.slice(0, 8).map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join("")}</div>
<p style="font-size:13px;color:var(--mute)">Source: TFRRS performance lists ${years[0]} to ${years[years.length - 1]}${teams.length > 1 ? ` (teams: ${teams.map(esc).join(", ")})` : ""}. Marks are each season's best on a national or conference list, so meets without a list mark are not shown. <a href="${tfrrs}" rel="noopener">Full results on TFRRS ›</a></p>`;
    write(a.url, page({ title: `${a.name} (${a.team}) Track & Field Stats & Rankings`,
      desc: `${a.name} of ${a.team}: ${head.mark} in the ${head.e} (${head.y})${head.nat ? `, #${head.nat} in ${head.d}` : ""}. Season bests since ${years[0]}, national and conference ranks, and how the marks compare with college standards.`,
      pathname: a.url, crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["Athletes", "/athletes.html"], [a.name, a.url]],
      h1: `${esc(a.name)} · ${esc(a.team)} Track &amp; Field`, intro: esc(answer), body,
      ld: [{ "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: { "@type": "Person", name: a.name, affiliation: { "@type": "CollegeOrUniversity", name: school ? school.n : a.team }, sameAs: [tfrrs] } },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: x } })) }] }));
  }
  /* hub: every live athlete page by event (the one inbound hub for the family) */
  const byEv = new Map(); for (const a of live) { const t = a.top.slice().sort((x, y) => x.rank - y.rank)[0]; const k = `${gName(a.g)} ${t.e}`; if (!byEv.has(k)) byEv.set(k, []); byEv.get(k).push([a, t.rank]); }
  const sections = [...byEv.entries()].sort((x, y) => (x[0] > y[0] ? 1 : -1)).map(([k, L]) => `<h2>${esc(k)}</h2><div class="links">${L.sort((x, y) => x[1] - y[1]).map(([a, rk]) => `<a href="${a.url}">#${rk} ${esc(a.name)} (${esc(a.team)})</a>`).join("")}</div>`).join("");
  write("/athletes.html", page({ title: "College Track & Field Athletes: Stats & Rankings",
    desc: `Profiles of ${live.length} of the top NCAA D1 track and field athletes: every season best since 2016, national and conference ranks, and how each mark compares with college recruiting standards.`,
    pathname: "/athletes.html", crumbs: [["Home", "/"], ["Explore", "/explore.html"], ["Athletes", "/athletes.html"]],
    h1: "College Track &amp; Field Athletes", intro: `${live.length} of the top NCAA D1 athletes this season, each with every season best on the TFRRS lists since 2016 and how their marks compare with college recruiting standards. More are added every day.`,
    body: sections }));
  return live.length;
}
