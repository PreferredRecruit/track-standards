/* Rankings section, v2 (Ryan 2026-10-30: approved preview "super dope", white background, push live). PR Power Index from power.mjs /
   power-site.mjs, in the approved design: podium in school colors, logo + color bar on every row, best-group tags, event-group squads,
   share cards. Pages (same URLs as v1, so nothing 404s):
     /rankings.html                                         every division's podium + top 10
     /rankings/ncaa-d1-track-and-field-rankings.html         current season: Combined / Men / Women, squads, share cards, method
     /rankings/ncaa-d1-<group>-rankings.html                 men's and women's squads for one event group
     /rankings/<year>-<season>-ncaa-d1-track-and-field-rankings.html   each finished season (POWER_FROM on) */
import fs from "node:fs";
import path from "node:path";
import { PDIVS, PGROUPS, rankPath, seasonPath, groupPath, seasonLabel } from "./power-site.mjs";
import { WEIGHTS } from "./power.mjs";

export const RANK_CSS = `<style>
.pr{--tx:#12111A;--mu:#6B6A7B;--ln:#ECEAF3;--ac:#6C47FF;--ac2:#5B3BE0;--gold:#E8A917;--silver:#9AA5B4;--bronze:#C8743F;--up:#12A15A;--dn:#D92D20}
.pr-hero{margin:4px 0 8px;padding:20px 22px;border-radius:22px;background:radial-gradient(700px 300px at 0% -30%,rgba(108,71,255,.18),transparent 60%),radial-gradient(600px 300px at 100% -20%,rgba(232,169,23,.18),transparent 60%),#FBFAFF;border:1px solid var(--ln)}
.pr-hero p{margin:0;color:#3B3A4A}
.pr-kick{font-size:12px;font-weight:700;letter-spacing:.16em;color:var(--ac);text-transform:uppercase}.pr-title{font-size:clamp(30px,5.4vw,52px);line-height:1.02;font-weight:900;letter-spacing:-.035em;margin:8px 0 8px;background:linear-gradient(90deg,#12111A 10%,#6C47FF 60%,#E8A917);-webkit-background-clip:text;background-clip:text;color:transparent}
.pr-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pr-badge{border:1px solid var(--ln);background:#fff;border-radius:99px;padding:5px 11px;font-size:12px;color:#3B3A4A}.pr-badge b{color:var(--up)}
.pr-tabs{display:flex;gap:6px;background:#F4F2FA;border:1px solid var(--ln);padding:5px;border-radius:14px;width:fit-content;max-width:100%;overflow-x:auto;margin:22px 0 16px;scrollbar-width:none}
.pr-tabs button{all:unset;cursor:pointer;padding:8px 15px;border-radius:10px;font-weight:650;font-size:14px;color:var(--mu);white-space:nowrap}.pr-tabs button.on{background:var(--ac);color:#fff;box-shadow:0 6px 18px rgba(108,71,255,.3)}
.pr-pod{display:grid;grid-template-columns:1fr 1.12fr 1fr;gap:14px;align-items:end;margin-bottom:18px}
.pr-pc{position:relative;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 14%,#fff),#fff 70%);border:1px solid color-mix(in srgb,var(--c) 35%,#fff);box-shadow:0 10px 30px -14px color-mix(in srgb,var(--c) 45%,transparent);border-radius:22px;padding:22px 14px 16px;text-align:center}
.pr-pc.p1{padding-top:30px}.pr-pc b{display:block;font-size:18px;margin-top:10px;color:var(--tx)}.pr-pc a{color:inherit}.pr-pc small{color:var(--mu)}
.pr-pm{position:absolute;top:12px;left:14px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#fff;background:var(--silver)}.p1 .pr-pm{background:var(--gold)}.p3 .pr-pm{background:var(--bronze)}
.pr-ps{font-size:32px;font-weight:900;margin-top:6px;color:var(--tx)}.pr-ps em,.pr-pd em{display:block;font-style:normal;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);font-weight:650}
.pr-pd{display:flex;justify-content:center;gap:22px;margin-top:6px;font-weight:750}
.pr-lg{display:inline-grid;place-items:center;background:#fff;border:1px solid var(--ln);border-radius:10px;flex:none;overflow:hidden;padding:3px;vertical-align:middle}.pr-lg img{width:100%;height:100%;object-fit:contain}.pr-lg.ph{color:#fff;font-weight:800;border:0}
.pr-pc .pr-lg{margin:0 auto}
.pr-tbl{background:#fff;border:1px solid var(--ln);border-radius:18px;overflow:hidden;box-shadow:0 12px 40px -24px rgba(18,17,26,.18)}
.pr-th,.pr-tr{display:grid;grid-template-columns:44px minmax(170px,2.2fr) 1.1fr .7fr .7fr .7fr .7fr 1.6fr;gap:10px;align-items:center;padding:10px 16px}
.pr-th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);border-bottom:1px solid var(--ln);background:#FAF9FD;font-weight:700}
.pr-tr{border-bottom:1px solid var(--ln);position:relative}.pr-tr:last-child{border-bottom:0}.pr-tr::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:3px;background:var(--c)}.pr-tr:hover{background:#F7F5FF}
.pr .n{text-align:right;font-variant-numeric:tabular-nums}.pr-rk{font-weight:900;font-size:18px;color:#B4B3C2}.pr-rk.g{color:var(--gold)}.pr-rk.s{color:var(--silver)}.pr-rk.b{color:var(--bronze)}
.pr-pg{display:flex;gap:12px;align-items:center;min-width:0}.pr-pg b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--tx)}.pr-pg a{color:inherit}.pr-pg small{color:var(--mu);font-size:12px;display:block}
.pr-pw b{display:block}.pr-pw i{display:block;height:5px;margin:4px 0 0 auto;border-radius:4px;background:linear-gradient(90deg,transparent,var(--ac))}
.pr-mv{font-size:11px;font-weight:700;margin-left:6px}.pr-mv.u{color:var(--up)}.pr-mv.d{color:var(--dn)}
.pr-chip{display:inline-block;font-size:11px;font-weight:650;padding:3px 8px;border-radius:99px;background:#F0EBFF;color:var(--ac2);margin:2px 4px 2px 0;white-space:nowrap}
.pr-tr.g{grid-template-columns:44px 1fr 110px 70px}.pr-tr.g small em{font-style:normal;color:var(--ac2)}.pr-sq{font-size:12px;font-weight:700;color:#5A3E00;background:#FFE7A8;border-radius:99px;padding:3px 10px;justify-self:end;white-space:nowrap}
.pr-note{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.pr-box{background:#FAF9FD;border:1px solid var(--ln);border-radius:18px;padding:18px}.pr-box h3{margin:0 0 6px;font-size:16px}.pr-box p,.pr-box li{color:#3B3A4A;font-size:14px}.pr-box ul{margin:6px 0 0;padding-left:18px}
.pr-cards{display:flex;gap:22px;flex-wrap:wrap}
.pr-card{color:#fff;width:360px;height:450px;border-radius:22px;padding:22px 22px 16px;overflow:hidden;background:radial-gradient(420px 320px at 50% 30%,color-mix(in srgb,var(--c) 70%,#000),#08080F 75%);border:1px solid rgba(255,255,255,.12);text-align:center;display:flex;flex-direction:column;align-items:center}
.pr-ct{font-size:10px;letter-spacing:.2em;font-weight:700;color:rgba(255,255,255,.75)}.pr-card .pr-lg{margin-top:14px;border-radius:24px;padding:10px;border:0}
.pr-cn{font-size:78px;font-weight:900;line-height:1;margin-top:10px;background:linear-gradient(180deg,#fff,#F5C451);-webkit-background-clip:text;background-clip:text;color:transparent}.pr-cl{font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px}.pr-cs{font-size:20px;font-weight:800;margin-top:4px}
.pr-cm{display:flex;gap:18px;margin-top:14px;font-weight:800;font-size:18px}.pr-cm em{display:block;font-style:normal;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.65)}.pr-cf{margin-top:auto;padding-top:10px;font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.6);font-weight:650}
.pr-more{display:inline-block;margin:10px 0 0;font-weight:650}
.pr-duo{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pr-duo h3{margin:0 0 8px;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}
.pr-slim .hide{display:none}.pr-slim .pr-th,.pr-slim .pr-tr{grid-template-columns:34px 1fr 64px}
@media (max-width:760px){.pr-duo{grid-template-columns:1fr}.pr .hide{display:none}.pr-th,.pr-tr{grid-template-columns:34px 1fr 70px}.pr-pod{grid-template-columns:1fr}.pr-pc.p1{order:-1}.pr-note{grid-template-columns:1fr}.pr-tr.g{grid-template-columns:34px 1fr 56px}.pr-sq{display:none}.pr-tr.g small{display:none}
.pr-pc{display:grid;grid-template-columns:auto 1fr auto;text-align:left;gap:0 14px;align-items:center;padding:14px 16px!important}.pr-pc .pr-lg{margin:0;grid-row:span 2;width:52px!important;height:52px!important}.pr-pc b{margin:0;font-size:16px}.pr-pc small{grid-column:2}.pr-ps{grid-column:3;grid-row:1/3;margin:0;font-size:26px;text-align:right}.pr-pd{display:none}.pr-pm{top:8px;left:8px;width:22px;height:22px;font-size:12px}.pr-card{width:100%;max-width:360px}}
</style>`;
const TABS_JS = `<script>if(location.hash==="#women"){var wb=document.querySelector('.pr-tabs[data-k="v"] button[data-v="w"]');if(wb)setTimeout(function(){wb.click()},0)}document.querySelectorAll(".pr-tabs").forEach(function(t){t.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;t.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",x===b)});var k=t.dataset.k;document.querySelectorAll("[data-"+k+"]").forEach(function(v){if(v.classList.contains("pr-tabs"))return;v.hidden=v.getAttribute("data-"+k)!==b.dataset.v})})})</script>`;

export function rankingPages({ R, out, write, page, esc, sl, SITE, QUIZ }) {
  if (!PDIVS.every(d => R.cur[d])) return [];
  let brand = {}; try { brand = JSON.parse(fs.readFileSync(path.join(out, "brand", "brand.json"), "utf8")); } catch { }
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const LG = Object.fromEntries(PGROUPS.map(([k, l]) => [k, l]));
  const info = r => { const s = r.s, b = s ? brand[sl(s).split("/").pop()] : null;
    return { nm: s ? (s.t && !/\./.test(s.t.replace(/\(.*?\)/g, "")) ? s.t : s.n) : r.t, conf: s ? s.c : "", url: s ? sl(s) : null, logo: b && b.logo && b.conf !== "low" ? b.logo : null, col: (b && b.primary) || "#6C47FF" }; };
  const logo = (i, z = 36) => i.logo ? `<span class="pr-lg" style="width:${z}px;height:${z}px"><img src="${i.logo}" alt="" loading="lazy" width="${z}" height="${z}"></span>` : `<span class="pr-lg ph" style="width:${z}px;height:${z}px;background:${i.col}">${esc(i.nm[0])}</span>`;
  const nmLink = i => i.url ? `<a href="${i.url}">${esc(i.nm)}</a>` : esc(i.nm);
  const medal = r => r === 1 ? "g" : r === 2 ? "s" : r === 3 ? "b" : "";
  const mv = (now, then) => then == null ? "" : then > now ? `<span class="pr-mv u">▲${then - now}</span>` : then < now ? `<span class="pr-mv d">▼${now - then}</span>` : "";
  const chips = (c, v, t) => { const L = []; for (const g of v === "all" ? ["m", "w"] : [v]) for (const [k, rows] of Object.entries(c.P.groups[g])) { const x = rows.find(y => y.t === t); if (x && x.rank <= 10) L.push([x.rank, `#${x.rank} ${LG[k]}${v === "all" ? (g === "m" ? " M" : " W") : ""}`]); }
    return L.sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => `<span class="pr-chip">${esc(x[1])}</span>`).join(""); };
  const table = (c, v, lim) => `<div class="pr-tbl"><div class="pr-th"><span>#</span><span>Program</span><span class="n">Power</span><span class="n hide">Nat'l pts</span><span class="n hide">Projected</span><span class="n hide">Qualifiers</span><span class="n hide">Squads</span><span class="hide">Best groups</span></div>`
    + c.P[v].slice(0, lim).map(r => { const i = info(r);
      return `<div class="pr-tr" style="--c:${i.col}"><span class="pr-rk ${medal(r.rank)}">${r.rank}</span><span class="pr-pg">${logo(i)}<span><b>${nmLink(i)}</b><small>${esc(i.conf)}</small></span></span><span class="n pr-pw"><b>${r.power.toFixed(1)}${mv(r.rank, r.wk != null ? r.wk : r.prev)}</b><i style="width:${Math.max(4, r.power)}%"></i></span><span class="n hide">${c.P.final ? r.act : "–"}</span><span class="n hide">${r.proj}</span><span class="n hide">${r.qual}</span><span class="n hide">${r.squad.toFixed(0)}</span><span class="hide">${chips(c, v, r.t)}</span></div>`; }).join("") + `</div>`;
  const podium = (c, v) => `<div class="pr-pod">${[1, 0, 2].filter(ix => c.P[v][ix]).map(ix => { const r = c.P[v][ix], i = info(r);
    return `<div class="pr-pc p${ix + 1}" style="--c:${i.col}"><div class="pr-pm">${r.rank}</div>${logo(i, 72)}<b>${nmLink(i)}</b><small>${esc(i.conf)}</small><div class="pr-ps">${r.power.toFixed(1)}<em>Power</em></div><div class="pr-pd"><span>${c.P.final ? r.act : r.proj}<em>${c.P.final ? "Nat'l pts" : "Proj. pts"}</em></span><span>${r.qual}<em>Qualifiers</em></span></div></div>`; }).join("")}</div>`;
  const squadsTbl = (rows, lim) => `<div class="pr-tbl">${rows.slice(0, lim).map(r => { const i = info(r);
    return `<div class="pr-tr g" style="--c:${i.col}"><span class="pr-rk ${medal(r.rank)}">${r.rank}</span><span class="pr-pg">${logo(i, 30)}<span><b>${nmLink(i)}</b><small>${r.ath.map(a => `${esc(a.nm)} <em>#${a.p} ${esc(a.ev.replace(" Meters", "m").replace(" Hurdles", "mH"))}</em>`).join(" · ")}</small></span></span><span class="pr-sq">Squad of ${r.size}</span><span class="n"><b>${r.score.toFixed(0)}</b></span></div>`; }).join("")}</div>`;
  const card = (c, r, lab) => { const i = info(r); return `<div class="pr-card" style="--c:${i.col}"><div class="pr-ct">TRACK &amp; FIELD STANDARDS · POWER RANKINGS</div>${logo(i, 150)}<div class="pr-cn">#${r.rank}</div><div class="pr-cl">${esc(lab)}</div><div class="pr-cs">${esc(i.nm)}</div><div class="pr-cm"><span>${c.P.final ? r.act : r.proj}<em>${c.P.final ? "National pts" : "Projected pts"}</em></span><span>${r.qual}<em>${c.P.final ? "Qualifiers" : "Proj. qualifiers"}</em></span><span>${r.power.toFixed(1)}<em>Power</em></span></div><div class="pr-cf">${esc(seasonLabel(c).toUpperCase())} · trackandfieldstandards.com</div></div>`; };
  const badges = c => `<div class="pr-badges"><span class="pr-badge"><b>${c.noMeet ? "!" : "✓"}</b> ${c.official ? "Official TFRRS team scores" : c.P.final ? "National meet results (TFRRS)" : c.noMeet === "cancelled" ? "National meet cancelled: ranked on the national lists" : c.noMeet ? "National meet results not on TFRRS: ranked on the national lists" : "National lists, updated Mondays"}</span><span class="pr-badge"><b>✓</b> Wind-legal marks</span><span class="pr-badge"><b>✓</b> Field sizes from the championship</span><span class="pr-badge">Conference meet points: coming</span></div>`;
  const method = c => `<h2>How the Power Index works</h2><div class="pr-note"><div class="pr-box"><h3>The formula</h3><ul><li><b>National meet points</b> (${WEIGHTS.act}%): ${c.official ? "the official TFRRS team scores, ties and DQs included" : "scored 10-8-6-5-4-3-2-1 from the championship places"}</li><li><b>Projected points</b> (${WEIGHTS.proj}%): 10-8-6-5-4-3-2-1 for the top 8 on each wind-legal national list</li><li><b>Event-group squads</b> (${WEIGHTS.squad}%): sprints, hurdles, distance, jumps, throws and multis for men and women; each squad scores its best four athletes, weighted 1.0, 0.75, 0.5 and 0.25</li><li><b>Qualifiers</b> (${WEIGHTS.qual}%): ${c.P.final ? "individual entrants at the national meet" : "athletes inside each event's championship field on the national list"}</li><li><b>Conference meet points</b> (10%): added once conference results are saved</li></ul><p>Each part is scaled 0 to 100 against the division leader.${c.P.final ? " After the national meet, the final order follows the official team scores, so the national champion is #1; the Power Index breaks ties and orders the teams that didn't score." : " During the season the order is the Power Index alone."}</p></div>`
    + `<div class="pr-box"><h3>Checked against the data</h3><ul><li>${c.official ? "National points come straight from the official team scores on TFRRS" : "National points scored from the championship places"}</li><li>${c.P.report.windSwapped.toLocaleString()} wind-aided marks replaced with each athlete's legal best</li><li>Field size per event counted from the championship results</li><li>Every athlete counted once per event; B and C squads count for their school</li></ul><p>An athlete's score is 100 at #1 on the national list, 50 at the last spot inside the championship field and 0 at twice that depth.</p></div></div>`;
  const art = ({ p, date, crumbs, title, desc, kick, h1, sub, body, faq }) => {
    const plain = s => String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, dateModified: date, mainEntityOfPage: SITE + p, image: SITE + "/og.jpg", citation: ["https://www.tfrrs.org/"] },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) }];
    write(p, page({ title, desc, pathname: p, crumbs, h1: esc(plain(h1)), intro: "", ld,
      body: RANK_CSS + `<div class="pr"><div class="pr-hero"><div class="pr-kick">${kick}</div><div class="pr-title" aria-hidden="true">Power Rankings</div><p>${sub}</p></div>${body}<h2>Common questions</h2>${faq.map(([q, x]) => `<h3>${esc(q)}</h3><p>${x}</p>`).join("")}<h2>Sharing these rankings</h2><p>Schools, coaches and journalists are welcome to share a ranking with a link to its page. Every number behind a rank is on the page.</p><div class="cta"><b>Want coaches to see your marks?</b> Preferred Recruit gets athletes' marks in front of college coaches. <a href="${QUIZ}">Get your free recruitment evaluation ›</a></div></div>` + TABS_JS }));
  };
  const dateOf = c => c.asOf || `${c.year}-${c.season === "indoor" ? "03-20" : "06-20"}`;
  const nmOf = r => info(r).nm;
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const done = [];

  const seasonPage = (d, c, p, current) => {
    const arch = R.seasons[d].filter(x => x !== R.cur[d]).reverse();
    const top = v => c.P[v][0];
    const gl = g => PGROUPS.filter(([k]) => (c.P.groups[g][k] || []).length);
    const G = { m: "Men", w: "Women" }, GW = { m: "men's", w: "women's" };
    /* men and women are separate rankings (Ryan 2026-10-30): each tab has its own podium, table, squads and share card */
    const genderBlock = (g, i) => `<section data-v="${g}"${i ? " hidden" : ""}>${podium(c, g)}${table(c, g, 400)}`
      + `<h2>${esc(d)} ${GW[g]} event-group squads</h2><p>A squad scores its best four athletes, weighted 1.0, 0.75, 0.5 and 0.25, so one great athlete counts and real depth still wins. A squad needs at least one athlete inside the championship field.</p>`
      + `<div class="pr-tabs" data-k="g${g}">${gl(g).map(([k, l], j) => `<button data-v="${k}" class="${j ? "" : "on"}">${l}</button>`).join("")}</div>`
      + gl(g).map(([k], j) => `<div data-g${g}="${k}"${j ? " hidden" : ""}>${squadsTbl(c.P.groups[g][k], 15)}${current ? `<a class="pr-more" href="${groupPath(d, k)}">All ${esc(d)} ${esc(LG[k].toLowerCase())} squads ›</a>` : ""}</div>`).join("")
      + `<h2>Share the ranking</h2><div class="pr-cards">${card(c, top(g), `${d} ${GW[g]} Power Ranking`)}</div></section>`;
    const body = badges(c)
      + `<div class="pr-tabs" data-k="v">${["m", "w"].map((g, i) => `<button data-v="${g}" class="${i ? "" : "on"}">${G[g]}</button>`).join("")}</div>`
      + ["m", "w"].map(genderBlock).join("")
      + method(c)
      + (current && arch.length ? `<h2>Past seasons</h2><div class="links">${arch.map(x => `<a href="${seasonPath(d, x.year, x.season)}">${esc(d)} ${esc(seasonLabel(x))}</a>`).join("")}</div>` : "")
      + `<h2>Other divisions</h2><div class="links">${PDIVS.filter(x => x !== d).map(x => `<a href="${rankPath(x)}">${esc(x)} Power Rankings</a>`).join("")}<a href="/rankings.html">All rankings</a></div>`;
    const t3 = g => c.P[g].slice(0, 3).map(nmOf);
    art({ p, date: dateOf(c), crumbs: current ? [["Home", "/"], ["Rankings", "/rankings.html"], [d, p]] : [["Home", "/"], ["Rankings", "/rankings.html"], [d, rankPath(d)], [seasonLabel(c), p]],
      title: current ? `${d} Track and Field Rankings ${c.year} (${c.season === "indoor" ? "Indoor" : "Outdoor"})` : `${d} Track and Field Rankings: ${seasonLabel(c)} Final`,
      desc: `${d} men's and women's track and field Power Rankings, ${seasonLabel(c)}: ${c.P.m.length} men's and ${c.P.w.length} women's programs ranked on ${c.P.final ? "national meet points, " : ""}projected points, qualifiers and event-group squads.`,
      kick: `${esc(d)} · ${esc(seasonLabel(c))} · ${c.P.final ? "Final" : c.noMeet ? "Final lists" : c.asOf ? `Updated ${esc(c.asOf)}` : "In season"}`,
      h1: `${d} men's and women's track and field Power Rankings, ${seasonLabel(c)}`,
      sub: `Men: <b>${esc(list(t3("m")))}</b>. Women: <b>${esc(list(t3("w")))}</b>. Every program is ranked on ${c.P.final ? "national meet points, " : ""}projected points from the wind-legal national lists, qualifiers and event-group squads.`,
      body,
      faq: [[`What is the best ${d} men's track and field team in ${seasonLabel(c)}?`, `${esc(nmOf(top("m")))}${c.P.final ? `, with ${top("m").act} points at the national meet` : ""}, ahead of ${esc(t3("m")[1])} and ${esc(t3("m")[2])}.`],
        [`What is the best ${d} women's track and field team in ${seasonLabel(c)}?`, `${esc(nmOf(top("w")))}${c.P.final ? `, with ${top("w").act} points at the national meet` : ""}, ahead of ${esc(t3("w")[1])} and ${esc(t3("w")[2])}.`],
        ["How often do the rankings update?", "Every Monday during the indoor and outdoor seasons. Each finished season keeps its final ranking on its own page."]] });
    done.push(p);
  };

  for (const d of PDIVS) {
    const c = R.cur[d];
    seasonPage(d, c, rankPath(d), true);
    for (const x of R.seasons[d]) if (x !== c) seasonPage(d, x, seasonPath(d, x.year, x.season), false);
    for (const [k, l] of PGROUPS) {
      if (!["m", "w"].some(g => (c.P.groups[g][k] || []).length)) continue;
      const q = groupPath(d, k), lw = l.toLowerCase(), M = (c.P.groups.m[k] || [])[0], W = (c.P.groups.w[k] || [])[0];
      art({ p: q, date: dateOf(c), crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], [d, rankPath(d)], [l, q]],
        title: `Best ${d} ${l} Programs ${c.year}: Track Rankings`, desc: `The best ${d} ${lw} squads in ${seasonLabel(c)}: every program's best four ${lw} athletes on the wind-legal national lists, men and women.`,
        kick: `${esc(d)} · ${esc(l)} · ${esc(seasonLabel(c))}`, h1: `${d} ${lw} rankings, ${seasonLabel(c)}`,
        sub: `${M ? `Men: <b>${esc(nmOf(M))}</b>. ` : ""}${W ? `Women: <b>${esc(nmOf(W))}</b>. ` : ""}Each squad scores its best four ${esc(lw)} athletes, weighted 1.0, 0.75, 0.5 and 0.25.`,
        body: `<div class="pr-tabs" data-k="g"><button data-v="m" class="on">Men</button><button data-v="w">Women</button></div>` + ["m", "w"].map((g, i) => `<div data-g="${g}"${i ? " hidden" : ""}>${squadsTbl(c.P.groups[g][k] || [], 40)}</div>`).join("")
          + `<p><a href="${rankPath(d)}">${esc(d)} Power Rankings ›</a></p><h2>Other event groups</h2><div class="links">${PGROUPS.filter(([x]) => x !== k).map(([x, y]) => `<a href="${groupPath(d, x)}">${esc(d)} ${esc(y.toLowerCase())}</a>`).join("")}</div>`,
        faq: [[`What is the best ${d} ${lw} program?`, `${M ? `Men: ${esc(nmOf(M))} (squad of ${M.size}). ` : ""}${W ? `Women: ${esc(nmOf(W))} (squad of ${W.size}).` : ""}`]] });
      done.push(q);
    }
  }
  /* hub: men's and women's top 5 per division, side by side */
  const H = PDIVS.map(d => R.cur[d]);
  art({ p: "/rankings.html", date: H.map(dateOf).sort().pop(), crumbs: [["Home", "/"], ["Rankings", "/rankings.html"]],
    title: `College Track and Field Rankings ${H[0].year}: D1, D2, D3, NAIA`, desc: `${H[0].year} college track and field Power Rankings for NCAA D1, D2, D3 and NAIA men and women: national meet points, projected points, qualifiers and event-group squads. Updated every Monday in season.`,
    kick: "NCAA D1 · D2 · D3 · NAIA · Men and women", h1: "College track and field Power Rankings",
    sub: `Men: ${PDIVS.map((d, i) => `${esc(d.replace("NCAA ", ""))} <b>${esc(nmOf(H[i].P.m[0]))}</b>`).join(", ")}. Women: ${PDIVS.map((d, i) => `${esc(d.replace("NCAA ", ""))} <b>${esc(nmOf(H[i].P.w[0]))}</b>`).join(", ")}.`,
    body: PDIVS.map((d, i) => { const c = H[i]; return `<h2>${esc(d)} · ${esc(seasonLabel(c))}</h2><div class="pr-duo">${["m", "w"].map(g => `<div><h3>${g === "m" ? "Men" : "Women"}</h3><div class="pr-slim">${table(c, g, 5)}</div><a class="pr-more" href="${rankPath(d)}${g === "w" ? "#women" : ""}">All ${esc(d)} ${g === "m" ? "men" : "women"} ›</a></div>`).join("")}</div>`; }).join(""),
    faq: [["What are the best college track and field programs?", `Men: ${PDIVS.map((d, i) => `${esc(nmOf(H[i].P.m[0]))} in ${esc(d)}`).join(", ")}. Women: ${PDIVS.map((d, i) => `${esc(nmOf(H[i].P.w[0]))} in ${esc(d)}`).join(", ")}.`], ["How often are the rankings updated?", "Every Monday during the indoor (December to March) and outdoor (March to June) seasons."]] });
  done.push("/rankings.html");
  return done;
}
