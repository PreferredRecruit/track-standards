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
import { loadFacts, evl, shortOf, t1600, newestFirst } from "./facts.mjs";
import { hsRows, fmtXC } from "./hsconv.mjs";
const JG = "/guides/junior-college-track-and-field-recruiting.html";

const divHub = d => `/standards/${String(d).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-track-and-field-recruiting-standards.html`;   /* same path as prerender divPath */
const DK = { "NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", NAIA: "naia", NJCAA: "njcaa" };   /* NJCAA: season bests only */

export function schoolPages({ root, out, S, CT = {}, DATES = {}, SITE, QUIZ, esc, schoolSlug, std, parse, EVENTS, STATE, evLabel, confUrl, statePath, evPath, gName }) {
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
  const { factsOf } = loadFacts(root);   /* scripts/seo/facts.mjs */
  /* program facts (Ryan 2026-10-25, beat Runcruit/NCSA): roster by class + transfers (build_programfacts.py), head coaches from the
     school's own coaches page (scripts/data/fetch_coaches.py), cross country levels from NCAA regionals (build_xc_standards.py) */
  const J0 = f => { try { return JSON.parse(fs.readFileSync(path.join(root, "public", "data", f), "utf8")); } catch { return {}; } };
  const PF = J0("programfacts.json"), CO = J0("coaches.json"), XC = J0("xc_standards.json").schools || {};
  const xcOnly = C => C.coaches.every(([, t]) => /cross country|\bxc\b/i.test(t) && !/track|t&f/i.test(t));
  const glance = s => {
    const P = PF[s.n] || {}, C = CO[s.n], X = XC[s.n] || {}, rows = [];
    if (C && C.coaches.length) rows.push([(xcOnly(C) ? "Cross country coach" : "Head coach") + (C.coaches.length > 1 ? "es" : ""), C.coaches.map(([n, t]) => `${esc(n)} <small>(${esc(t)})</small>`).join("<br>") + ` <small><a href="${esc(C.url)}" rel="noopener">source</a></small>`]);
    for (const g of ["m", "w"]) { const r = P[g]; if (!r) continue;
      rows.push([`${gName(g)} roster`, `${r.roster} athletes on the ${esc(r.season)} TFRRS roster: ${r.fr} freshmen, ${r.so} sophomores, ${r.jr} juniors, ${r.sr} seniors${r.transfers ? `; ${r.transfers} competed for another college first (transfers)` : ""}`]); }
    if (X.m || X.w) rows.push(["Cross country", ["m", "w"].filter(g => X[g]).map(g => `${gName(g)} ${X[g].d}`).join(" · ") + ` <small>(<a href="#cross-country">levels below</a>)</small>`]);
    rows.push(["Conference", `${esc(s.c)} (${esc(s.d)})`]);
    return rows.length > 1 ? `<h2>${esc(shortOf(s))} track and field at a glance</h2><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([a, b]) => `<tr><th style="text-align:left;padding:8px;border-bottom:1px solid #EEE;width:28%;vertical-align:top">${a}</th><td style="padding:8px;border-bottom:1px solid #EEE">${b}</td></tr>`).join("")}</table></div>` : "";
  };
  const xcSection = s => {
    const X = XC[s.n]; if (!X) return "";
    const p4 = (CT[s.ck] || {}).rule === "p4" && !s.o, d3 = s.d === "NCAA D3" || s.d === "NAIA";
    const cols = [0, 1, 2].filter(i => !(i === 1 && d3) && !(i === 2 && p4)), lab = ["Target", "Recruit", "Walk-On"];
    const rows = ["m", "w"].filter(g => X[g]).flatMap(g => [[`${gName(g)} ${X[g].d}`, ...cols.map(i => fmtXC(X[g].lv[i]))], [`<small>about, in a high school 5K</small>`, ...cols.map(i => `<small>${fmtXC(X[g].hs[i])}</small>`)]]);
    return `<h2 id="cross-country">${esc(shortOf(s))} cross country standards</h2><p>What ${esc(shortOf(s))}'s own runners ran at ${esc(X[Object.keys(X)[0]].meet.replace(/ Cross Country Championships$/, ""))} (2024 and 2025 averaged): Target is the team's 3rd runner, Recruit its 5th (the last scorer), Walk-On its 7th (the last varsity spot). Courses differ, so treat these as estimates; the high school 5K line is the same fitness over 5K.</p>` + tbl(["", ...cols.map(i => lab[i])], rows);
  };
  /* previous years (Ryan 2026-10-25): older official charts from the school's own site, verified mark for mark, one collapsed
     section at the bottom; they never set the levels above */
  const archSection = s => !(s.arch || []).length ? "" : `<details style="margin-top:34px;border-top:1px solid #E4E3EA;padding-top:14px"><summary style="cursor:pointer;font-size:20px;font-weight:700;letter-spacing:-.02em">Previous years: ${esc(shortOf(s))}'s earlier published standards (${s.arch.map(e => esc(e.yr)).join(", ")})</summary><p style="color:#4A4A52">Charts ${esc(shortOf(s))} published on its own athletics site before 2024, checked mark for mark against the school's page. They're here for comparison: the levels at the top of this page are the current ones.</p>${s.arch.map(e => `<h3>${e.yr === "Undated" ? "Undated chart" : esc(e.yr) + " chart"}</h3>${["m", "w"].filter(g => e[g]).map(g => `<h4 style="margin:12px 0 6px">${gName(g)}</h4>` + tbl(["Event", ...e[g].tiers.map(esc)], e[g].rows.map(r => [esc(r[0]), ...e[g].tiers.map((_, i) => esc(r[i + 1] || "–"))]))).join("")}${e.src ? `<p style="font-size:13px"><a href="${esc(e.src)}" rel="noopener nofollow">Source: ${esc(shortOf(s))} athletics</a></p>` : ""}`).join("")}</details>`;
  const hsTbl = (s, g) => {
    if (s.j) return "";
    const R = hsRows((gg, e) => std(s, gg, e), g, parse), p4 = (CT[s.ck] || {}).rule === "p4" && !s.o;
    const cols = [0, 1, 2].filter(i => !(i === 2 && p4) && R.some(r => r[1][i])), lab = ["Target", "Recruit", "Walk-On"];
    return R.length ? tbl(["High school event", ...cols.map(i => lab[i])], R.map(([e, v, note]) => [`${esc(e)}${note ? ` <small style="color:#4A4A52">${esc(note)}</small>` : ""}`, ...cols.map(i => esc(v[i] || "–"))])) : "";
  };
  /* the answer first, in plain words with real numbers: what it takes, in high school terms where it helps */
  function answerFirst(s, F) {
    if (s.j) return "";
    const lvl = g => { const L = []; for (const e of ["100m", "400m", "1500m"]) { const t = std(s, g, e); if (!t) continue; const m = String(t[1] || t[2] || t[0] || "").replace(/ est\.$/, ""); if (!m) continue; const own = e === "1500m" && s.o && std(s, g, "1600m"), o1600 = own && String(own[1] || own[2] || own[0] || "").replace(/ est\.$/, "");
      L.push(e === "1500m" && o1600 ? `${m} in the 1500m (${o1600} in the 1600m)` : e === "1500m" && t1600(m) ? `${m} in the 1500m (about ${t1600(m)} for a high school 1600m)` : `${m} in the ${e}`); } return L; };
    const join = L => L.length > 1 ? L.slice(0, -1).join(", ") + " and " + L[L.length - 1] : L[0];
    const m = (s.ng || []).includes("m") ? [] : lvl("m"), w = (s.ng || []).includes("w") ? [] : lvl("w");
    if (!m.length && !w.length) return "";
    const which = std(s, "m", "100m") || std(s, "w", "100m");
    /* official chart: name the tier the way the school does ("Considered For Athletic Aid"), and the marks are exact */
    let lv = which && which[1] ? "Recruit level" : "recruiting level";
    if (s.o && which) { const v = String(which[1] || which[2] || which[0] || ""), O = (s.off || {})[std(s, "m", "100m") ? "m" : "w"], r = O && O.rows.find(x => x.slice(1).includes(v)), i = r ? r.slice(1).indexOf(v) : -1;
      lv = i >= 0 && O.tiers[i] ? `published standard (${String(O.tiers[i]).replace(/^(men's|women's|men|women)\s+/i, "").replace(/\s+standards?$/i, "")})` : "published standard"; }
    const fr = F && F.fresh && (F.fresh.m || {})["100 Meters"] || F && F.fresh && (F.fresh.w || {})["100 Meters"];
    const frg = F && F.fresh && (F.fresh.m || {})["100 Meters"] ? "men's" : "women's";
    return `<p class="answer" style="font-size:17px;background:#F4F1FF;border-radius:14px;padding:14px 16px"><b>Quick answer:</b> ${esc(shortOf(s))}'s ${lv} is ${s.o ? "" : "about "}${m.length ? `${join(m)} for men` : ""}${m.length && w.length ? ", and " : ""}${w.length ? `${join(w)} for women` : ""}.${fr ? ` ${esc(shortOf(s))}'s ${frg} freshmen ran a median ${esc(fr.med)} in the 100m in their first college season (${fr.n} freshmen since 2022).` : ""}</p>`;
  }
  function factSections(s, F) {
    if (!F) return "";
    const nm = esc(shortOf(s)); let o = "";
    if (F.fresh) {
      const ORD = ["100 Meters", "200 Meters", "400 Meters", "800 Meters", "1500 Meters", "5000 Meters", "10,000 Meters", "100 Hurdles", "110 Hurdles", "400 Hurdles", "3000 Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"];
      const rows = g => Object.entries(F.fresh[g] || {}).sort((a, b) => ORD.indexOf(a[0]) - ORD.indexOf(b[0]));
      const T = g => rows(g).length && !(s.ng || []).includes(g) ? `<h3>${gName(g)}</h3>` + tbl(["Event", "Typical freshman", "Middle half", "Best freshman", "Freshmen"], rows(g).map(([e, x]) => [esc(evl(e)), esc(x.med), `${esc(x.lo)} to ${esc(x.hi)}`, esc(x.best), x.n])) : "";
      const body = T("m") + T("w");
      if (body) o += `<h2>What ${nm} freshmen actually ran</h2><p>Marks from ${nm} athletes' first college outdoor season (2022 to 2026, TFRRS lists): the realistic level of the athletes the program actually brings in, not a chart.</p>${body}`;
    }
    if (F.dev) {
      const d = F.dev, p = v => v == null ? "–" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
      o += `<h2>How ${nm} develops athletes</h2><ul><li><b>Peaking:</b> ${d.peak}% of ${nm} athletes who raced at the conference championship ran their season best there or later (better than ${d.peak_pct}% of ${d.peers} ${esc(d.division)} programs).</li><li><b>Year over year:</b> returning athletes' season bests improved ${p(d.yoy)} a year (${d.yoy_pct}th percentile in ${esc(d.division)}).</li><li><b>In a season:</b> the typical athlete improved ${p(d.imp)} from their first race to their season best.</li></ul><p style="font-size:13px;color:#4A4A52">2022 to 2026 outdoor and indoor, every event, from ${d.n} athlete-seasons of TFRRS meet results.</p>`;
    }
    if (F.champ && F.champ.length) {
      const C = newestFirst(F.champ);
      o += `<h2>National champions from ${nm} since 2016</h2><p>${C.length} individual national title${C.length > 1 ? "s" : ""} at the ${esc(s.d)} championships${s.d === "NCAA D1" ? " (the 2016 and 2021 outdoor meets aren't on TFRRS, so titles from those two aren't counted)" : ""}.</p>` + tbl(["Season", "Event", "Champion", "Mark"], C.slice(0, 30).map(c => [`${c[0]} ${c[1]}`, `${c[3] === "m" ? "Men's" : "Women's"} ${esc(evl(c[4]))}`, esc(c[5]), esc(c[6])]));
    }
    return o;
  }
  /* common questions, answered from the school's own standards (also sent as FAQPage structured data) */
  function faq(s, B) {
    const one = (s.ng || [])[0], MW = one ? (one === "m" ? "women's" : "men's") : "men's and women's", MAW = one ? (one === "m" ? "women" : "men") : "men and women";
    const lvl = "Walk-On", q = [], J = !!s.j;
    const marks = g => KEY.map(e => { const t = std(s, g, e); return t && t[2] ? `${e} ${t[2].replace(/ est\.$/, "")}` : null; }).filter(Boolean).slice(0, 6);
    const m = marks("m"), w = marks("w");
    q.push([`What are the ${s.n} track and field recruiting standards?`, `${s.n} is ${/^[AEIOUN]/.test(s.d) ? "an" : "a"} ${s.d} program${s.c !== s.d ? ` in the ${s.c}` : ""}. ${J ? "This site doesn't set Target, Recruit or Walk-On levels for junior colleges, because NJCAA competition is national rather than conference-based and a program's marks can't be predicted reliably. Its season bests are on this page, and the full NJCAA national list is in Results." : `${s.o ? `Its standards come from the school's own published chart${s.yr ? ` (${s.yr})` : ""}.${s.o && !s.cv && +s.yr && +s.yr <= 2024 ? ` These are the most recent standards the program has published (${s.yr}). Current requirements may differ, so confirm with the coaching staff.` : ""}` : s.est ? "Its levels are estimates: the typical marks across its division, because the school doesn't publish standards and its conference has no championship results to set them from." : "Its Target, Recruit and Walk-On levels are set from 2026 conference results."} The full table for ${MAW} is on this page.`}`]);
    if (!J && (m.length || w.length)) q.push([`What times do you need to walk on at ${s.n}?`, [m.length ? `Men's ${lvl}: ${m.join(", ")}.` : "", w.length ? `Women's ${lvl}: ${w.join(", ")}.` : ""].filter(Boolean).join(" ")]);
    /* Ivy League and D3 give no athletic scholarships (2026-10-28: Ivy pages said "scholarship-level" and drew 1-3% CTR at position ~5) */
    if (!J && (s.c === "Ivy League" || s.d === "NCAA D3")) { const nm = shortOf(s);
      q.push([`Does ${nm} give athletic scholarships for track and field?`, s.c === "Ivy League"
        ? `No. Ivy League schools don't offer athletic scholarships. ${nm} gives need-based financial aid, the same way it does for every student, so the recruiting bar here is about making the team, not earning athletic money.`
        : `No. NCAA Division III schools don't offer athletic scholarships. Aid at ${nm} is need-based or academic, so the recruiting bar here is about making the team, not earning athletic money.`]); }
    { const F = factsOf(s), nm = shortOf(s), P4 = (CT[s.ck] || {}).rule === "p4" && !s.o;
      if (!J && P4) q.push([`Does ${nm} track and field take walk-ons?`, `This site sets no Walk-On level for ${nm}: it's in the ${s.c}, a Power 4 conference, where roster limits leave little room for walk-ons. The bar to aim for is the Recruit level, set from the middle of the conference's 15th to 25th best marks.`]);
      const fm = F && F.fresh && (F.fresh.m || {})["100 Meters"], fw = F && F.fresh && (F.fresh.w || {})["400 Meters"] || F && F.fresh && (F.fresh.w || {})["100 Meters"];
      if (fm || fw) q.push([`What do ${nm} track freshmen run?`, [fm ? `${nm}'s men's freshmen ran a median ${fm.med} in the 100m in their first college season (best ${fm.best}, ${fm.n} freshmen since 2022).` : "", fw ? `Women's freshmen: a median ${fw.med} in the ${F.fresh.w["400 Meters"] ? "400m" : "100m"}.` : ""].filter(Boolean).join(" ")]);
      if (F && F.dev) q.push([`Is ${nm} good at developing track athletes?`, `From 2022 to 2026, ${F.dev.peak}% of ${nm} athletes who raced at the conference championship ran their season best there or later, better than ${F.dev.peak_pct}% of ${F.dev.division} programs, and returning athletes improved ${F.dev.yoy >= 0 ? "+" : ""}${F.dev.yoy.toFixed(2)}% a year.`]);
      if (F && F.champ && F.champ.length) q.push([`How many national champions has ${nm} had?`, `${F.champ.length} individual ${s.d} national title${F.champ.length > 1 ? "s" : ""} since 2016, most recently ${newestFirst(F.champ)[0][5]} (${newestFirst(F.champ)[0][0]}).`]); }
    if (!J) { const nm = shortOf(s), C = CO[s.n], P = PF[s.n] || {}, X = XC[s.n];
      if (C && C.coaches.length && !xcOnly(C)) q.push([`Who is the head coach of ${nm} track and field?`, `${C.coaches.map(([n, t]) => `${n} (${t})`).join(" and ")}, per ${nm}'s athletics website.`]);
      const rs = ["m", "w"].filter(g => P[g]).map(g => `${P[g].roster} ${g === "m" ? "men" : "women"} (${P[g].fr} freshmen${P[g].transfers ? `, ${P[g].transfers} transfers` : ""})`);
      if (rs.length) q.push([`How many athletes are on the ${nm} track and field roster?`, `${rs.join(" and ")} on the ${(P.m || P.w).season} TFRRS roster.`]);
      if (X) { const p4 = (CT[s.ck] || {}).rule === "p4" && !s.o, i = p4 || !X[Object.keys(X)[0]].lv[2] ? 1 : 2;
        const part = g => X[g] && X[g].lv[i] ? `${g === "m" ? "men" : "women"} about ${fmtXC(X[g].lv[i])} for ${X[g].d} (about ${fmtXC(X[g].hs[i])} in a high school 5K)` : "";
        const t = ["m", "w"].map(part).filter(Boolean);
        if (t.length) q.push([`What cross country times do you need for ${nm}?`, `To ${i === 1 ? "be a scoring runner" : "make the varsity seven"} at ${nm}, ${t.join("; ")}, from its own runners at the NCAA regional or conference meet in 2024 and 2025.`]); } }
    if (!J && (s.arch || []).length) q.push([`Has ${shortOf(s)} published track and field recruiting standards before?`, `Yes. ${shortOf(s)} published ${s.arch.length > 1 ? "charts" : "a chart"} on its athletics site (${s.arch.map(e => e.yr === "Undated" ? "undated" : e.yr).join(", ")}), shown under Previous years on this page. ${s.o ? "Its current official chart is at the top." : "It hasn't published a 2024 or later chart, so the current levels come from 2026 conference results."}`]);
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
    const p4 = (CT[s.ck] || {}).rule === "p4" && !s.o, lw = p4 ? "recruit and scholarship-level" : s.c === "Ivy League" ? "walk-on and recruit" : levelWords(s.d), ofc = s.o ? ", from the official team chart" : "", conf = s.c !== s.d ? ", " + s.c : "";
    const exTxt = ex.length ? " " + ex.map(([g, e, v]) => `${g === "m" ? "Men's" : "Women's"} ${e} walk-on: ${v}.`).join(" ") : "";
    const weekly = B ? [" Season bests updated weekly.", " Free, no sign-up.", " Free."] : [" Free, no sign-up.", " Free to use.", " Free."];
    const desc = J ? pickDesc([`${s.n} (NJCAA) junior college track and field: ${B ? `${B.y} season bests in every event, ` : ""}roster and TFRRS links, and how junior college recruiting works.`,
        `${short} (NJCAA) junior college track and field: season bests, roster and TFRRS links.`], weekly)
      : pickDesc([`${s.n} track and field recruiting standards ${SEASON} (${s.d}${conf}): ${lw} marks for every ${MW} event${ofc}.${exTxt}`,
        `${s.n} track and field recruiting standards ${SEASON} (${s.d}${conf}): ${lw} marks for every ${MW} event${ofc}.`,
        `${s.n} track and field recruiting standards ${SEASON} (${s.d}): ${lw} marks for every ${MW} event${ofc}.`,
        `${short} track and field recruiting standards ${SEASON} (${s.d}): ${lw} marks for every event, ${MAW}.`,
        `${short} track and field recruiting standards ${SEASON}: ${lw} marks for every event.`], weekly);
    const ld = [{ "@context": "https://schema.org", "@type": "SportsTeam", name: s.n + " Track & Field", sport: "Track and Field", url, description: desc,
      ...(CO[s.n] ? { coach: CO[s.n].coaches.map(([n, t]) => ({ "@type": "Person", name: n, jobTitle: t })) } : {}),
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
<h1>${esc(s.n)} Track &amp; Field${J ? " (NJCAA)" : " Standards"}${s.o ? " ★" : ""}</h1>${answerFirst(s, factsOf(s))}${J ? "" : glance(s)}${s.cv ? `<p style="display:inline-block;background:#E5F5EE;color:#12805C;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:650">✓ Verified by the ${esc(s.n)} coaching staff (${esc(s.cv)})</p>` : ""}
<p>${esc(s.n)} is ${/^[AEIOUN]/.test(s.d) ? "an" : "a"} ${esc(s.d)}${J ? " junior college" : ""} track and field program${s.c !== s.d ? ` in the ${esc(s.c)}` : ""}${s.s ? `, based in ${esc(STATE[s.s] || s.s)}` : ""}. ${J ? `Junior colleges compete nationally rather than in conferences, so this site shows ${esc(s.n)}'s season results instead of predicted recruiting levels.` : `Below are the marks it takes to be a Target recruit, a Recruit or a Walk-On for ${MAW} in every event${s.o ? `, from the school's own published standards${!s.cv && +s.yr && +s.yr <= 2024 ? ` (the most recent the program has published, ${s.yr}; current requirements may differ)` : ""}` : s.est ? " (estimates: typical marks for its division, since there is no published chart or conference championship)" : ", set from its 2026 conference results"}.`}</p>
${J ? `<h2>No recruiting levels for junior colleges</h2><p>This site doesn't set Target, Recruit or Walk-On levels for NJCAA programs: there's no reliable way to predict a junior college's marks. ${B ? `Below are ${esc(s.n)}'s best marks this season. ` : ""}The full NJCAA national list, by event, is in <a href="/?tab=results&div=NJCAA">Results</a>, and the <a href="${JG}">junior college recruiting guide</a> explains how NJCAA track works.</p>` : `${["m", "w"].filter(g => !(s.ng || []).includes(g)).map(g => s.o
      /* an official chart is shown exactly as the school published it, never converted (Ryan 2026-10-25: "why are we not using their official standards") */
      ? `<h2>${gName(g)} official standards</h2><p>As published by ${esc(shortOf(s))}${s.yr ? ` (${esc(String(s.yr))})` : ""}${s.src ? `: <a href="${esc(String(s.src).split(" ")[0])}" rel="noopener">source</a>` : ""}.</p>${side(g)}`
      : `<h2>${gName(g)} standards in high school events</h2><p>${esc(shortOf(s))}'s levels as the marks you run in high school: the 1600m, 3200m and 300m hurdles are converted from the college events with the same factors as the mark checker.</p>${hsTbl(s, g)}<h2>${gName(g)} standards (college events)</h2>${side(g)}`).join("")}${xcSection(s)}`}
${B ? `<h2>${B.y} season bests</h2><p>${esc(s.n)}'s best mark in each event this outdoor season on TFRRS${B.conf ? `, with its rank in the ${esc(B.conf)} list` : ""}. A w marks a wind-aided mark.</p>${bestTbl("m")}${bestTbl("w")}` : ""}
${factSections(s, factsOf(s))}
${archSection(s)}
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
