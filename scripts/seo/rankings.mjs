/* Rankings section, v2 (Ryan 2026-10-30: approved preview "super dope", white background, push live). PR Power Index from power.mjs /
   power-site.mjs, in the approved design: podium in school colors, logo + color bar on every row, best-group tags, event-group squads,
   share cards. Pages (same URLs as v1, so nothing 404s):
     /rankings.html                                         every division's podium + top 10
     /rankings/ncaa-d1-track-and-field-rankings.html         current season: Combined / Men / Women, squads, share cards, method
     /rankings/ncaa-d1-<group>-rankings.html                 men's and women's squads for one event group
     /rankings/<year>-<season>-ncaa-d1-track-and-field-rankings.html   each finished season (POWER_FROM on) */
import fs from "node:fs";
import path from "node:path";
import { PDIVS, PGROUPS, rankPath, seasonPath, groupPath, seasonLabel, eventPath, evName, eventSeason, EV_SKIP } from "./power-site.mjs";
import { WEIGHTS } from "./power.mjs";

export const RANK_CSS = `<style>
.pr{--tx:#12111A;--mu:#6B6A7B;--ln:#ECEAF3;--ac:#6C47FF;--ac2:#5B3BE0;--gold:#E8A917;--silver:#9AA5B4;--bronze:#C8743F;--up:#12A15A;--dn:#D92D20}
.pr-hero{margin:4px 0 8px;padding:20px 22px;border-radius:22px;background:radial-gradient(700px 300px at 0% -30%,rgba(108,71,255,.18),transparent 60%),radial-gradient(600px 300px at 100% -20%,rgba(232,169,23,.18),transparent 60%),#FBFAFF;border:1px solid var(--ln)}
.pr-hero p{margin:0;color:#3B3A4A}
.pr-kick{font-size:12px;font-weight:700;letter-spacing:.16em;color:var(--ac);text-transform:uppercase}.pr-title{font-size:clamp(30px,5.4vw,52px);line-height:1.02;font-weight:900;letter-spacing:-.035em;margin:8px 0 0;padding-bottom:.14em;background:linear-gradient(90deg,#12111A 10%,#6C47FF 60%,#E8A917);-webkit-background-clip:text;background-clip:text;color:transparent}
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
.pr .n{text-align:right;font-variant-numeric:tabular-nums}.pr-rk{font-weight:900;font-size:18px;color:#6B6A7B}.pr-rk.g{color:#9A6A00}.pr-rk.s{color:#5E6672}.pr-rk.b{color:#9A4F1F}   /* rank numbers at 4.5:1+ (UX audit 2026-10-31); medal colours stay on the podium discs */
.pr-pg{display:flex;gap:12px;align-items:center;min-width:0}.pr-pg b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--tx)}.pr-pg a{color:inherit}.pr-pg small{color:var(--mu);font-size:12px;display:block}
.pr-pw b{display:block}.pr-pw i{display:block;height:5px;margin:4px 0 0 auto;border-radius:4px;background:linear-gradient(90deg,transparent,var(--ac))}
.pr-mv{font-size:12px;font-weight:700;margin-left:6px}.pr-mv.u{color:#0B7A43}.pr-mv.d{color:var(--dn)}
.pr-chip{display:inline-block;font-size:11px;font-weight:650;padding:3px 8px;border-radius:99px;background:#F0EBFF;color:var(--ac2);margin:2px 4px 2px 0;white-space:nowrap}
.pr-tr.g{grid-template-columns:44px 1fr 110px 70px}.pr-tr.g small em{font-style:normal;color:var(--ac2)}.pr-sq{font-size:12px;font-weight:700;color:#5A3E00;background:#FFE7A8;border-radius:99px;padding:3px 10px;justify-self:end;white-space:nowrap}
.pr-note{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.pr-box{background:#FAF9FD;border:1px solid var(--ln);border-radius:18px;padding:18px}.pr-box h3{margin:0 0 6px;font-size:16px}.pr-box p,.pr-box li{color:#3B3A4A;font-size:14px}.pr-box ul{margin:6px 0 0;padding-left:18px}
.pr-cards{display:flex;gap:22px;flex-wrap:wrap}
.pr-card{color:#fff;width:360px;height:450px;border-radius:22px;padding:22px 22px 16px;overflow:hidden;background:radial-gradient(420px 320px at 50% 30%,color-mix(in srgb,var(--c) 70%,#000),#08080F 75%);border:1px solid rgba(255,255,255,.12);text-align:center;display:flex;flex-direction:column;align-items:center}
.pr-ct{font-size:10px;letter-spacing:.2em;font-weight:700;color:rgba(255,255,255,.75)}.pr-card .pr-lg{margin-top:14px;border-radius:24px;padding:10px;border:0}
.pr-cn{font-size:78px;font-weight:900;line-height:1;margin-top:10px;background:linear-gradient(180deg,#fff,#F5C451);-webkit-background-clip:text;background-clip:text;color:transparent}.pr-cl{font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px}.pr-cs{font-size:20px;font-weight:800;margin-top:4px}
.pr-cm{display:flex;gap:18px;margin-top:14px;font-weight:800;font-size:18px}.pr-cm em{display:block;font-style:normal;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.65)}.pr-cf{margin-top:auto;padding-top:10px;font-size:10px;letter-spacing:.14em;color:rgba(255,255,255,.6);font-weight:650}
.pr-more{display:inline-block;margin:10px 0 0;font-weight:650}
.ov{display:inline-grid;place-items:center;min-width:46px;height:38px;padding:0 8px;border-radius:12px;font-variant-numeric:tabular-nums;vertical-align:middle;position:relative;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 16px -8px rgba(18,17,26,.45)}
.ov b{font-size:20px;font-weight:900;letter-spacing:-.02em;line-height:1}.ov::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.28),transparent 55%);pointer-events:none}
.ov-a{background:linear-gradient(160deg,#FFE58A,#F2B731 45%,#C98A00);color:#2A1B00}.ov-b{background:linear-gradient(160deg,#9C82FF,#6C47FF 50%,#4B2BD6);color:#fff}.ov-c{background:linear-gradient(160deg,#7FB4FF,#2F7BEA 55%,#1D5BBF);color:#fff}.ov-d{background:linear-gradient(160deg,#C9C8D3,#8A8999);color:#fff}
.ov.big{min-width:96px;height:auto;padding:10px 14px 8px;border-radius:20px;display:inline-flex;flex-direction:column;gap:2px}.ov.big b{font-size:52px}.ov.big i{font-style:normal;font-size:11px;font-weight:800;letter-spacing:.2em;opacity:.85}
.at{display:inline-flex;flex-direction:column;align-items:flex-end;line-height:1.1}.at b{font-weight:800;font-size:15px}.at small{color:#8A8999;font-size:11px}.t-a{color:#B77900}.t-b{color:#5B3BE0}.t-c{color:#2F7BEA}.t-d{color:#6B6A7B}
.pr-pick{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;margin:14px 0 0;font-size:14px}.pr-pick label{font-weight:650;color:var(--mu)}.pr-pick select{font:inherit;font-weight:600;color:var(--tx);margin-left:6px;padding:7px 10px;border:1px solid var(--ln);border-radius:10px;background:#fff}.pr-pick a{font-weight:650}
.pr-duo{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pr-duo h3{margin:0 0 8px;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}
.pr-slim .hide{display:none}.pr-slim .pr-th,.pr-slim .pr-tr{grid-template-columns:34px 1fr 64px}
@media (max-width:760px){.pr-duo{grid-template-columns:1fr}.pr .hide{display:none}.pr-th,.pr-tr{grid-template-columns:34px 1fr 70px}.pr-pod{grid-template-columns:1fr}.pr-pc.p1{order:-1}.pr-note{grid-template-columns:1fr}.pr-tr.g{grid-template-columns:34px 1fr 56px}.pr-sq{display:none}.pr-tr.g small{display:none}
.pr-pc{display:grid;grid-template-columns:auto 1fr auto;text-align:left;gap:0 14px;align-items:center;padding:14px 16px!important}.pr-pc .pr-lg{margin:0;grid-row:span 2;width:52px!important;height:52px!important}.pr-pc b{margin:0;font-size:16px}.pr-pc small{grid-column:2}.pr-ps{grid-column:3;grid-row:1/3;margin:0;font-size:26px;text-align:right}.pr-pd{display:none}.pr-pm{top:8px;left:8px;width:22px;height:22px;font-size:12px}.pr-card{width:100%;max-width:360px}}

/* restraint pass (2026-11-02, preview): the data carries the colour. Scores are flat tiles (ink for 90+, violet tint below), no gloss or
   glow; one ink for rank numbers (top 3 just bolder); no colour bar per row (the logo already carries the school colour); the hero keeps
   one title (the page H1) and a plain-case line. Share images keep their own tier colours. */
.ov{box-shadow:none;border-radius:10px}.ov::after{display:none}.ov b,.pr-pc .ov b,.pr-tr .ov b{color:inherit}   /* the podium card styles every <b> as ink; the score keeps its tile's colour */
.ov-a{background:#12111A;color:#fff}.ov-b{background:#EEE8FF;color:#4B2BD6}.ov-c{background:#EAF2FE;color:#1D5BBF}.ov-d{background:#F1F0F5;color:#5E5D6B}
.pr-rk,.pr-rk.g,.pr-rk.s,.pr-rk.b{color:#5E5D6B;font-weight:700}.pr-rk.g,.pr-rk.s,.pr-rk.b{color:#12111A;font-weight:800}
.pr-tr::before,.rkcr::before{display:none}
@media (max-width:640px){.pr-pick select{font-size:16px}}   /* iOS zooms on fields under 16px (found by design:shots) */
.pr-hero{background:#FFFFFF;border-radius:20px}.pr-title{display:none}
.pr-kick{text-transform:none;letter-spacing:0;font-size:14px;font-weight:600;color:#5E5D6B;margin-bottom:6px}
@media (prefers-color-scheme:dark){#app .ov-a{background:#F5F5F7;color:#12111A}#app .ov-b{background:#2A2142;color:#CDB6FF}#app .ov-c{background:#162338;color:#9CC4FF}#app .ov-d{background:#24232B;color:#C8C8D0}#app .pr-hero{background:#121117}#app .pr-rk.g,#app .pr-rk.s,#app .pr-rk.b{color:#F5F5F7}}   /* the app has dark mode; the static guide pages don't */
</style>`;
/* explorer controls (app Rankings tab) */
const RKX_CSS = `.rkbar{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:flex-end;margin:6px 0 14px}.rkseg{display:flex;gap:4px;background:#F4F2FA;border:1px solid #ECEAF3;padding:4px;border-radius:12px}
.rkseg button{all:unset;cursor:pointer;padding:7px 12px;border-radius:9px;font-weight:650;font-size:14px;color:#6B6A7B}.rkseg button.on{background:#6C47FF;color:#fff;box-shadow:0 6px 16px rgba(108,71,255,.28)}
.rkbar label{display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B6A7B}.rkbar select{font:inherit;font-size:14px;text-transform:none;letter-spacing:0;font-weight:600;color:#12111A;padding:8px 10px;border:1px solid #ECEAF3;border-radius:10px;background:#fff;min-width:150px}
.rkbar select:disabled{opacity:.55}.rknote{font-size:13px;color:#6B6A7B;margin:4px 0 12px}.pr-th.rk3,.pr-tr.rk3{grid-template-columns:44px 1fr 110px}.rkall{all:unset;cursor:pointer;margin-top:12px;font-weight:650;color:#6C47FF}
.rkbar>select{font:inherit;font-size:14px;font-weight:600;color:#12111A;padding:9px 12px;border:1px solid #ECEAF3;border-radius:12px;background:#fff;min-width:170px}
.rkcats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 10px;border-bottom:1px solid #ECEAF3;margin-bottom:14px;scroll-margin-top:80px}.rkcats button{all:unset;cursor:pointer;white-space:nowrap;padding:9px 14px;border-radius:999px;font-weight:650;font-size:14px;color:#3B3A4A;background:#fff;border:1px solid #ECEAF3}.rkcats button.on{background:#12111A;color:#fff;border-color:#12111A}
.rkevs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.rkevs .lab{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B6A7B;align-self:center;margin-right:4px}.rkevs button{all:unset;cursor:pointer;padding:6px 11px;border-radius:999px;font-size:13px;font-weight:600;color:#5B3BE0;background:#F0EBFF}.rkevs button.on{background:#6C47FF;color:#fff}
.rkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}.rkcard{background:#fff;border:1px solid #ECEAF3;border-radius:18px;padding:14px 14px 8px;box-shadow:0 12px 34px -26px rgba(18,17,26,.25)}.rkcard:first-child{grid-column:1/-1}
.rkch{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.rkch b{font-size:15px}.rkch button{all:unset;cursor:pointer;font-size:13px;font-weight:650;color:#6C47FF}
.rkcr{display:grid;grid-template-columns:28px 32px 1fr auto;gap:10px;align-items:center;padding:8px 4px;border-top:1px solid #F2F0F7;position:relative}.rkcr::before{content:"";position:absolute;left:-14px;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--c)}
.rkcn{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rkcn a{color:#12111A}.rkwrap .pr{color:#12111A}.rkcs{font-weight:800;font-variant-numeric:tabular-nums}.rkcr .pr-rk{font-size:16px}
.rkempty{color:#6B6A7B;font-size:13px;margin:8px 4px 10px}.rkhow{margin:22px 0 0;background:#FAF9FD;border:1px solid #ECEAF3;border-radius:16px;padding:12px 16px;font-size:14px;color:#3B3A4A}.rkhow summary{cursor:pointer;font-weight:700;color:#12111A}.rkhow p{margin:8px 0 0}.rkcs{display:flex;align-items:center;gap:6px}.rkcs .ov{min-width:40px;height:32px}.rkcs .ov b{font-size:17px}.rkmini{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 6px}.rkmini button{all:unset;cursor:pointer;font-size:11.5px;font-weight:650;color:#5B3BE0;background:#F4F1FF;border-radius:999px;padding:3px 8px}.rkmini button:hover{background:#E6DEFF}.rkdiv{display:inline-block;margin-top:6px;font-size:12px;font-weight:700;color:#5B3BE0;background:#F0EBFF;border-radius:999px;padding:4px 10px}.rkempty.big{font-size:15px;background:#FAF9FD;border:1px solid #ECEAF3;border-radius:16px;padding:18px}
@media (max-width:760px){.rkbar>select{width:100%;min-width:0}.rkcard:first-child{grid-column:auto}.rkbar label{flex:1 1 45%}.rkbar select{min-width:0;width:100%}.pr-th.rk3,.pr-tr.rk3{grid-template-columns:34px 1fr 80px}}`;
const TABS_JS = `<script>if(location.hash==="#women"){var wb=document.querySelector('.pr-tabs[data-k="v"] button[data-v="w"]');if(wb)setTimeout(function(){wb.click()},0)}document.querySelectorAll(".pr-tabs").forEach(function(t){t.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;t.querySelectorAll("button").forEach(function(x){x.classList.toggle("on",x===b)});var k=t.dataset.k;document.querySelectorAll("[data-"+k+"]").forEach(function(v){if(v.classList.contains("pr-tabs"))return;v.hidden=v.getAttribute("data-"+k)!==b.dataset.v})})})</script>`;

export function rankingPages({ R, out, write, page, esc, sl, SITE, QUIZ }) {
  /* the four NCAA/NAIA divisions must all be there; junior colleges show when their data is (2026-11-03) */
  if (!["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"].every(d => R.cur[d])) return [];
  const DV = PDIVS.filter(d => R.cur[d]);
  fs.writeFileSync(path.join(out, "rankings.css"), RANK_CSS.replace(/<\/?style>/g, "") + RKX_CSS);   /* the app's Rankings tab uses the same styles */
  let brand = {}; try { brand = JSON.parse(fs.readFileSync(path.join(out, "brand", "brand.json"), "utf8")); } catch { }
  /* ranked teams with no school page (NWAC): logos from scripts/brand/team_logos.py, keyed "<division>|<TFRRS team name>" */
  let tlogo = {}; try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(out, "brand", "teams.json"), "utf8")))) if (v && v.logo && v.conf !== "low") tlogo[k.split("|").slice(1).join("|")] = v; } catch { }
  const ORG = { "@type": "Organization", name: "Preferred Recruit", url: "https://thepreferredrecruit.com", logo: SITE + "/icon-512.png" };
  const LG = Object.fromEntries(PGROUPS.map(([k, l]) => [k, l]));
  /* the TFRRS national list + national meet behind each season (scripts/tfrrs/build_rank_sources.py), cited on the page and in the data */
  let SRC = {}; try { SRC = JSON.parse(fs.readFileSync(path.join(out, "data", "rank_sources.json"), "utf8")); } catch { }
  const srcOf = c => SRC[c.key] || {};
  const srcLinks = c => { const x = srcOf(c); return [x.list && `<a href="${x.list}" rel="noopener">${esc(x.listName || "TFRRS national list")}</a>`, x.champ && `<a href="${x.champ}" rel="noopener">${esc(x.champName || "national championship results")}</a>`].filter(Boolean); };
  const info = r => { const s = r.s, b = s ? brand[sl(s).split("/").pop()] : tlogo[r.t] || null;
    return { nm: s ? (s.t && !/\./.test(s.t.replace(/\(.*?\)/g, "")) ? s.t : s.n) : r.t, conf: s ? s.c : "", url: s ? sl(s) : null, logo: b && b.logo && b.conf !== "low" ? b.logo : null, col: (b && b.primary) || "#6C47FF" }; };
  const logo = (i, z = 36) => i.logo ? `<span class="pr-lg" style="width:${z}px;height:${z}px"><img src="${i.logo}" alt="" loading="lazy" width="${z}" height="${z}"></span>` : `<span class="pr-lg ph" style="width:${z}px;height:${z}px;background:${i.col}">${esc(i.nm[0])}</span>`;
  const nmLink = i => i.url ? `<a href="${i.url}">${esc(i.nm)}</a>` : esc(i.nm);
  const medal = r => r === 1 ? "g" : r === 2 ? "s" : r === 3 ? "b" : "";
  const mv = (now, then) => then == null ? "" : then > now ? `<span class="pr-mv u">▲${then - now}</span>` : then < now ? `<span class="pr-mv d">▼${now - then}</span>` : "";
  const chips = (c, v, t) => { const L = []; for (const g of v === "all" ? ["m", "w"] : [v]) for (const [k, rows] of Object.entries(c.P.groups[g])) { const x = rows.find(y => y.t === t); if (x && x.rank <= 10) L.push([x.rank, `#${x.rank} ${LG[k]}${v === "all" ? (g === "m" ? " M" : " W") : ""}`]); }
    return L.sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => `<span class="pr-chip">${esc(x[1])}</span>`).join(""); };
  /* Madden-style ratings (Ryan 2026-10-31): OVR out of 99 + letter grade, attribute ratings under each team */
  const tier = o => o == null ? "d" : o >= 90 ? "a" : o >= 80 ? "b" : o >= 70 ? "c" : "d";
  const ovB = (o, big) => o == null ? "–" : `<span class="ov ov-${tier(o)}${big ? " big" : ""}"><b>${o}</b>${big ? "<i>OVR</i>" : ""}</span>`;   /* number-first (Ryan 2026-10-31: no letter grades) */
  const att = (o, raw) => `<span class="at">${o == null ? "–" : `<b class="t-${tier(o)}">${o}</b>`}${raw != null ? `<small>${raw}</small>` : ""}</span>`;
  const table = (c, v, lim) => `<div class="pr-tbl"><div class="pr-th"><span>#</span><span>Program</span><span class="n">OVR</span><span class="n hide">Nationals</span><span class="n hide">Lists</span><span class="n hide">Squads</span><span class="n hide">Qualifiers</span><span class="hide">Best groups</span></div>`
    + c.P[v].slice(0, lim).map(r => { const i = info(r);
      return `<div class="pr-tr" style="--c:${i.col}"><span class="pr-rk ${medal(r.rank)}">${r.rank}</span><span class="pr-pg">${logo(i)}<span><b>${nmLink(i)}</b><small>${esc(i.conf)}</small></span></span><span class="n">${ovB(r.ovr)}${mv(r.rank, r.prev)}</span><span class="n hide">${att(c.P.final ? r.sub.act : null, c.P.final ? `${r.act} pts` : "")}</span><span class="n hide">${att(r.sub.proj, `${r.proj} pts`)}</span><span class="n hide">${att(r.sub.squad)}</span><span class="n hide">${att(r.sub.qual, `${r.qual}`)}</span><span class="hide">${chips(c, v, r.t)}</span></div>`; }).join("") + `</div>`;
  const podium = (c, v) => `<div class="pr-pod">${[1, 0, 2].filter(ix => c.P[v][ix]).map(ix => { const r = c.P[v][ix], i = info(r);
    return `<div class="pr-pc p${ix + 1}" style="--c:${i.col}"><div class="pr-pm">${r.rank}</div>${logo(i, 72)}<b>${nmLink(i)}</b><small>${esc(i.conf)}</small><div class="pr-ps">${ovB(r.ovr, true)}</div><div class="pr-pd"><span>${c.P.final ? r.act : r.proj}<em>${c.P.final ? "Nat'l pts" : "Proj. pts"}</em></span><span>${r.qual}<em>Qualifiers</em></span></div></div>`; }).join("")}</div>`;
  const squadsTbl = (rows, lim) => `<div class="pr-tbl">${rows.slice(0, lim).map(r => { const i = info(r);
    return `<div class="pr-tr g" style="--c:${i.col}"><span class="pr-rk ${medal(r.rank)}">${r.rank}</span><span class="pr-pg">${logo(i, 30)}<span><b>${nmLink(i)}</b><small>${r.ath.map(a => `${esc(a.nm)} <em>${a.ovr ?? ""} · #${a.p} ${esc(a.ev.replace(" Meters", "m").replace(" Hurdles", "mH"))}</em>`).join(" · ")}</small></span></span><span class="pr-sq">Squad of ${r.size}</span><span class="n">${ovB(r.ovr)}</span></div>`; }).join("")}</div>`;
  const card = (c, r, lab) => { const i = info(r); return `<div class="pr-card" style="--c:${i.col}"><div class="pr-ct">TRACK &amp; FIELD STANDARDS · POWER RANKINGS</div>${logo(i, 150)}<div class="pr-cn">#${r.rank}</div><div class="pr-cl">${esc(lab)}</div><div class="pr-cs">${esc(i.nm)}</div><div class="pr-cm"><span>${r.ovr}<em>Overall</em></span><span>${esc(String(c.key || "").split("-").pop().toUpperCase())}<em>Division</em></span><span>${c.P.final ? r.act : r.qual}<em>${c.P.final ? "National pts" : "Proj. qualifiers"}</em></span></div><div class="pr-cf">${esc(seasonLabel(c).toUpperCase())} · trackandfieldstandards.com</div></div>`; };
  const badges = c => `<div class="pr-badges"><span class="pr-badge"><b>${c.noMeet ? "!" : "✓"}</b> ${c.official ? "Official TFRRS team scores" : c.P.final ? "National meet results (TFRRS)" : c.noMeet === "cancelled" ? "National meet cancelled: ranked on the national lists" : c.noMeet ? "National meet results not on TFRRS: ranked on the national lists" : "National lists, updated Mondays"}</span><span class="pr-badge"><b>✓</b> Wind-legal marks</span><span class="pr-badge"><b>✓</b> Field sizes from the championship</span><span class="pr-badge">Conference meet points: coming</span></div>${srcLinks(c).length ? `<p class="rknote">Sources (TFRRS): ${srcLinks(c).join(" · ")}. <a href="/rankings/methodology.html">How the rankings work</a></p>` : ""}`;
  const method = c => `<h2>How the Power Index works</h2><div class="pr-note"><div class="pr-box"><h3>The formula</h3><ul><li><b>National meet points</b> (${WEIGHTS.act}%): ${c.official ? "the official TFRRS team scores, ties and DQs included" : "scored 10-8-6-5-4-3-2-1 from the championship places"}</li><li><b>Projected points</b> (${WEIGHTS.proj}%): 10-8-6-5-4-3-2-1 for the top 8 on each wind-legal national list</li><li><b>Event-group squads</b> (${WEIGHTS.squad}%): sprints, hurdles, distance, jumps, throws and multis for men and women; each squad scores its best four athletes, weighted 1.0, 0.75, 0.5 and 0.25</li><li><b>Qualifiers</b> (${WEIGHTS.qual}%): ${c.P.final ? "individual entrants at the national meet" : "athletes inside each event's championship field on the national list"}</li><li><b>Conference meet points</b> (10%): added once conference results are saved</li></ul><p>Each part is scaled against the division leader. Every rating is out of 99 like a video game, and it is relative to the division: the best team in ${esc(c.d)} is 99 in ${esc(c.d)}. Everyone else is 60 + 39 × (their score ÷ the leader's)^0.6, and a rating never rises as you go down a list. 90+ elite, 80s national-level, 70s strong, 60s ranked.${c.P.final ? " After the national meet, the final order follows the official team scores, so the national champion is #1; the Power Index breaks ties and orders the teams that didn't score." : " During the season the order is the Power Index alone."}</p></div>`
    + `<div class="pr-box"><h3>Checked against the data</h3><ul><li>${c.official ? "National points come straight from the official team scores on TFRRS" : "National points scored from the championship places"}</li><li>${c.P.report.windSwapped.toLocaleString()} wind-aided marks replaced with each athlete's legal best</li><li>Field size per event counted from the championship results</li><li>Every athlete counted once per event; B and C squads count for their school</li></ul><p>An athlete's score is half list place (100 at #1, 50 at the last spot inside the championship field, 0 at twice that depth) and half mark quality against the division's average marks since 2016. <a href="/rankings/methodology.html">Full methodology with a worked example ›</a></p></div></div>`;
  const art = ({ p, date, crumbs, title, desc, kick, h1, sub, body, faq, lists = [], season = null }) => {
    const plain = s => String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
    const ld = [{ "@context": "https://schema.org", "@type": "Article", headline: plain(h1), description: desc, author: ORG, publisher: ORG, dateModified: date, mainEntityOfPage: SITE + p, image: SITE + "/og.jpg", citation: ["https://www.tfrrs.org/", ...(season ? [srcOf(season).list, srcOf(season).champ].filter(Boolean) : [])] },
      /* AEO + Google Dataset Search: each season's ranking is a dataset built on TFRRS (Ryan 2026-11-02) */
      ...(season ? [{ "@context": "https://schema.org", "@type": "Dataset", name: plain(h1), description: desc.length >= 50 ? desc : desc + " Built from TFRRS national lists and national championship results.",
        url: SITE + p, creator: ORG, publisher: ORG, dateModified: date, temporalCoverage: `${season.year}-${season.season === "indoor" ? "01" : "03"}/${season.year}-${season.season === "indoor" ? "03" : "06"}`, spatialCoverage: "United States",
        keywords: [`${season.d} track and field rankings`, `${season.year} ${season.season} track and field`, "college track and field team rankings", "track and field standards"],
        isBasedOn: [srcOf(season).list, srcOf(season).champ].filter(Boolean), measurementTechnique: "PR Power Index: national meet points, projected points from the wind-legal national list, event-group squads and qualifiers",
        variableMeasured: ["Overall rating (out of 99)", "National meet points", "Projected points", "Event-group squad score", "National qualifiers"],
        distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/data/power/${season.key}.json` }] }] : []),
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, x]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: plain(x) } })) },
      /* AEO: each ranking as an ItemList (top 25, school pages as item URLs) so answer engines can lift "who is #1" */
      ...lists.filter(([, rows]) => rows && rows.length).map(([name, rows]) => ({ "@context": "https://schema.org", "@type": "ItemList", name, itemListOrder: "https://schema.org/ItemListOrderAscending", numberOfItems: Math.min(rows.length, 25),
        itemListElement: rows.slice(0, 25).map(r => { const i = info(r); return { "@type": "ListItem", position: r.rank, name: i.nm, ...(i.url ? { url: SITE + i.url } : {}) }; }) }))];
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
    const pick = `<div class="pr-pick"><label>Season <select onchange="location.href=this.value">${[...R.seasons[d]].reverse().map(x => `<option value="${x === R.cur[d] ? rankPath(d) : seasonPath(d, x.year, x.season)}"${x === c ? " selected" : ""}>${esc(seasonLabel(x))}</option>`).join("")}</select></label><a href="/?tab=rankings&d=${encodeURIComponent(d)}&s=${c.key}">Open the rankings explorer: every event, week and month ›</a></div>`;
    const body = badges(c) + pick
      + `<div class="pr-tabs" data-k="v">${["m", "w"].map((g, i) => `<button data-v="${g}" class="${i ? "" : "on"}">${G[g]}</button>`).join("")}</div>`
      + ["m", "w"].map(genderBlock).join("")
      + method(c)
      + (current && evPages[d].length ? `<h2>${esc(d)} team rankings by event</h2><div class="links">${evPages[d].map(([ev]) => `<a href="${eventPath(d, ev)}">${esc(evName(ev))}</a>`).join("")}</div>` : "")
      + (current && arch.length ? `<h2>Past seasons</h2><div class="links">${arch.map(x => `<a href="${seasonPath(d, x.year, x.season)}">${esc(d)} ${esc(seasonLabel(x))}</a>`).join("")}</div>` : "")
      + `<h2>Other divisions</h2><div class="links">${DV.filter(x => x !== d).map(x => `<a href="${rankPath(x)}">${esc(x)} Power Rankings</a>`).join("")}<a href="/rankings.html">All rankings</a></div>`;
    const t3 = g => c.P[g].slice(0, 3).map(nmOf);
    art({ p, date: dateOf(c), crumbs: current ? [["Home", "/"], ["Rankings", "/rankings.html"], [d, p]] : [["Home", "/"], ["Rankings", "/rankings.html"], [d, rankPath(d)], [seasonLabel(c), p]],
      title: current ? `${d} Track and Field Rankings ${c.year} (${c.season === "indoor" ? "Indoor" : "Outdoor"})` : `${d} Track and Field Rankings: ${seasonLabel(c)} Final`,
      desc: `${d} men's and women's track and field Power Rankings, ${seasonLabel(c)}: ${c.P.m.length} men's and ${c.P.w.length} women's programs ranked on ${c.P.final ? "national meet points, " : ""}projected points, qualifiers and event-group squads.`,
      kick: `${esc(d)} · ${esc(seasonLabel(c))} · ${c.P.final ? "Final" : c.noMeet ? "Final lists" : c.asOf ? `Updated ${esc(c.asOf)}` : "In season"}`,
      h1: `${d} men's and women's track and field Power Rankings, ${seasonLabel(c)}`,
      sub: `Men: <b>${esc(list(t3("m")))}</b>. Women: <b>${esc(list(t3("w")))}</b>. Every program is ranked on ${c.P.final ? "national meet points, " : ""}projected points from the wind-legal national lists, qualifiers and event-group squads.`,
      body, season: { ...c, d }, lists: [[`${d} men's track and field Power Rankings, ${seasonLabel(c)}`, c.P.m], [`${d} women's track and field Power Rankings, ${seasonLabel(c)}`, c.P.w]],
      faq: [[`What is the best ${d} men's track and field team in ${seasonLabel(c)}?`, `${esc(nmOf(top("m")))}${c.P.final ? `, with ${top("m").act} points at the national meet` : ""}, ahead of ${esc(t3("m")[1])} and ${esc(t3("m")[2])}.`],
        [`What is the best ${d} women's track and field team in ${seasonLabel(c)}?`, `${esc(nmOf(top("w")))}${c.P.final ? `, with ${top("w").act} points at the national meet` : ""}, ahead of ${esc(t3("w")[1])} and ${esc(t3("w")[2])}.`],
        ["How often do the rankings update?", "Every Monday during the indoor and outdoor seasons. Each finished season keeps its final ranking on its own page."]] });
    done.push(p);
  };

  /* team rankings for each event (2026-10-31, SEO: "best d1 schools for the 400m"): one page per division + event, the newest season
     that ranks it, men and women; each row shows the athletes, their national list place and mark */
  const GRP = ev => (PGROUPS.find(([, , re]) => re.test(ev)) || [])[0] || "relays";
  const evOf = {}, evPages = {};
  for (const d of DV) { evOf[d] = {}; evPages[d] = [];
    const all = [...new Set(R.seasons[d].flatMap(x => ["m", "w"].flatMap(g => Object.keys(x.P.events[g] || {}))))].filter(ev => !EV_SKIP.test(ev));
    for (const ev of all) { const x = eventSeason(R, d, ev); if (!x) continue; evPages[d].push([ev, x]); (evOf[d][GRP(ev)] ||= []).push(ev); } }
  const evTbl = rows => `<div class="pr-tbl">${rows.map(r => { const i = info(r);
    return `<div class="pr-tr g" style="--c:${i.col}"><span class="pr-rk ${medal(r.rank)}">${r.rank}</span><span class="pr-pg">${logo(i, 30)}<span><b>${nmLink(i)}</b><small>${r.ath.map(a => `${a.nm === "Relay" ? "Relay" : esc(a.nm)} <em>#${a.p} · ${esc(a.mk || "")}</em>`).join(" · ")}</small></span></span><span class="pr-sq">${r.size > 1 ? `${r.size} on the list` : "1 on the list"}</span><span class="n">${ovB(r.ovr)}</span></div>`; }).join("")}</div>`;
  const STDN = ev => ev === "Mile" ? "Mile" : ev === "3000 Steeplechase" ? "3000m Steeplechase" : ev === "10,000 Meters" ? "10000m" : ev.replace(/ Meters$/, "m").replace(/^(\d+) Hurdles$/, "$1m Hurdles");
  const stdPage = (d, g, ev) => { const q = `/standards/${d.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${g === "m" ? "mens" : "womens"}-${STDN(ev).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}.html`; return fs.existsSync(path.join(out, q)) ? q : null; };
  const lead = (r, g, ev) => { if (!r) return ""; const a = r.ath[0], who = a.nm === "Relay" ? `a ${esc(a.mk)} relay, #${a.p} on the national list` : `${esc(a.nm)} (#${a.p} on the national list, ${esc(a.mk)})`;
    return `${g === "m" ? "Men" : "Women"}: <b>${esc(nmOf(r))}</b>, rated ${r.ovr}, led by ${who}${r.size > 1 ? ` with ${r.size} athletes on the list` : ""}. `; };
  const eventPages = d => { for (const [ev, x] of evPages[d]) {
    const p = eventPath(d, ev), nm = evName(ev), M = (x.P.events.m[ev] || []), W = (x.P.events.w[ev] || []), gk = GRP(ev);
    const T1 = `Best ${d} Programs for the ${nm}: Rankings ${x.year}`;
    const sibs = (evOf[d][gk] || []).filter(e => e !== ev).slice(0, 6);
    const std = ["m", "w"].map(g => [g, stdPage(d, g, ev)]).filter(([, q]) => q);
    const tabs = ["m", "w"].filter(g => (x.P.events[g][ev] || []).length);
    art({ p, date: dateOf(x), crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], [d, rankPath(d)], [nm, p]],
      title: T1.length <= 60 ? T1 : `Best ${d} ${nm} Programs ${x.year}`,
      desc: `The best ${d} ${nm} programs in ${seasonLabel(x)}, men and women: each team's best ${/Relay/.test(ev) ? "relay" : "four athletes"} on the wind-legal national list, with places and marks.`,
      kick: `${esc(d)} · ${esc(nm)} · ${esc(seasonLabel(x))}`, h1: `Best ${d} programs for the ${nm}, ${seasonLabel(x)}`,
      sub: lead(M[0], "m", ev) + lead(W[0], "w", ev) + (/Relay/.test(ev) ? "Each team is ranked on its best relay on the national list." : "Each program scores its best four athletes on the national list, weighted 1.0, 0.75, 0.5 and 0.25."),
      body: `<div class="pr-tabs" data-k="g">${tabs.map((g, i) => `<button data-v="${g}" class="${i ? "" : "on"}">${g === "m" ? "Men" : "Women"}</button>`).join("")}</div>` + tabs.map((g, i) => `<div data-g="${g}"${i ? " hidden" : ""}>${evTbl(x.P.events[g][ev])}</div>`).join("")
        + `<p>Programs need at least one athlete inside the championship field (the number of ${esc(nm)} entrants at the ${esc(d)} national meet) to be ranked. Marks are wind-legal; aided marks are replaced by the athlete's legal best.</p>`
        + (std.length ? `<h2>What it takes to make these teams</h2><div class="links">${std.map(([g, q]) => `<a href="${q}">${esc(d)} ${g === "m" ? "men's" : "women's"} ${esc(STDN(ev))} recruiting standards</a>`).join("")}</div>` : "")
        + `<h2>More ${esc(d)} rankings</h2><div class="links">${sibs.map(e => `<a href="${eventPath(d, e)}">Best ${esc(d)} programs: ${esc(evName(e))}</a>`).join("")}${gk !== "relays" ? `<a href="${groupPath(d, gk)}">${esc(d)} ${esc(LG[gk].toLowerCase())} rankings</a>` : ""}<a href="${rankPath(d)}">${esc(d)} Power Rankings</a></div>`,
      lists: tabs.map(g => [`Best ${d} ${g === "m" ? "men's" : "women's"} ${nm} programs, ${seasonLabel(x)}`, x.P.events[g][ev]]),
      faq: tabs.map(g => { const L = x.P.events[g][ev], gw = g === "m" ? "men's" : "women's";
        return [`What is the best ${d} ${gw} ${nm} program?`, `${esc(nmOf(L[0]))} in ${esc(seasonLabel(x))}${L[1] ? `, ahead of ${esc(nmOf(L[1]))}${L[2] ? ` and ${esc(nmOf(L[2]))}` : ""}` : ""}. ${L.length} ${esc(d)} programs had an athlete inside the national championship field.`]; }) });
    done.push(p); } };

  for (const d of DV) {
    const c = R.cur[d];
    eventPages(d);
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
          + ((evOf[d][k] || []).length ? `<h2>${esc(d)} ${esc(lw)} rankings by event</h2><div class="links">${evOf[d][k].map(ev => `<a href="${eventPath(d, ev)}">Best ${esc(d)} programs: ${esc(evName(ev))}</a>`).join("")}</div>` : "")
          + `<p><a href="${rankPath(d)}">${esc(d)} Power Rankings ›</a></p><h2>Other event groups</h2><div class="links">${PGROUPS.filter(([x]) => x !== k).map(([x, y]) => `<a href="${groupPath(d, x)}">${esc(d)} ${esc(y.toLowerCase())}</a>`).join("")}</div>`,
        lists: [[`Best ${d} men's ${lw} programs, ${seasonLabel(c)}`, c.P.groups.m[k]], [`Best ${d} women's ${lw} programs, ${seasonLabel(c)}`, c.P.groups.w[k]]],
        faq: [[`What is the best ${d} ${lw} program?`, `${M ? `Men: ${esc(nmOf(M))} (squad of ${M.size}). ` : ""}${W ? `Women: ${esc(nmOf(W))} (squad of ${W.size}).` : ""}`]] });
      done.push(q);
    }
  }
  /* explorer data (Ryan 2026-10-30: "see each year, each event, weekly, monthly"): one JSON per division + season for the app's
     Rankings tab, plus an index. Rows are [team, rank, power, natPts, projPts, qualifiers, squads, prevYearRank, lastWeek, lastMonth];
     squads [team, rank, score, size, [[athlete, event, list position, mark]...]]; weeks = the Monday snapshots of that season. */
  { const dir = path.join(out, "data", "power"); fs.mkdirSync(dir, { recursive: true });
    const idx = { divs: DV, seasons: {} };
    for (const d of DV) { idx.seasons[d] = [];
      for (const x of [...R.seasons[d]].reverse()) {
        const T = {}, tid = r => { if (!T[r.t]) { const i = info(r); T[r.t] = [i.nm, i.conf, i.url, i.logo, i.col]; } return r.t; };
        const rows = g => x.P[g].map(r => [tid(r), r.rank, r.ovr, x.P.final ? r.act : null, r.proj, r.qual, Math.round(r.squad), r.prev ?? null, r.wk ?? null, r.mo ?? null, +r.power.toFixed(1), [x.P.final ? r.sub.act : null, r.sub.proj, r.sub.squad, r.sub.qual]]);
        const sq = L => L.slice(0, 30).map(r => [tid(r), r.rank, r.ovr, r.size, r.ath.map(a => [a.nm, a.ev, a.p, a.mk, a.ovr]), Math.round(r.score)]);
        const weeks = R.hist.filter(h => h.d === d && h.key === `${x.year}-${x.season}`).sort((a, b) => a.date.localeCompare(b.date)).map(h => ({ date: h.date, ranks: { m: h.ranks.m, w: h.ranks.w }, groups: h.groups || null }));
        const J = { d, key: x.key, year: x.year, season: x.season, label: seasonLabel(x), final: x.P.final, official: x.official, noMeet: x.noMeet || null, asOf: x.asOf || null, page: x === R.cur[d] ? rankPath(d) : seasonPath(d, x.year, x.season),
          m: rows("m"), w: rows("w"), groups: { m: Object.fromEntries(Object.entries(x.P.groups.m).map(([k, L]) => [k, sq(L)])), w: Object.fromEntries(Object.entries(x.P.groups.w).map(([k, L]) => [k, sq(L)])) },
          events: { m: Object.fromEntries(Object.entries(x.P.events.m).map(([k, L]) => [k, sq(L)])), w: Object.fromEntries(Object.entries(x.P.events.w).map(([k, L]) => [k, sq(L)])) }, weeks, teams: T };
        fs.writeFileSync(path.join(dir, x.key + ".json"), JSON.stringify(J));
        idx.seasons[d].push({ key: x.key, label: seasonLabel(x), final: x.P.final, weeks: weeks.length });
      } }
    fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(idx)); }

  /* embeddable ranking badges (2026-10-31, link earning): /badge/<school slug>-<m|w>.svg for every ranked program, current season.
     Plain SVG text (no external images, so it renders inside an <img> on any site); school pages carry the embed code. */
  { const dir = path.join(out, "badge"); fs.mkdirSync(dir, { recursive: true });
    const x = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const TG = { a: ["#FFE58A", "#C98A00", "#2A1B00"], b: ["#9C82FF", "#4B2BD6", "#fff"], c: ["#7FB4FF", "#1D5BBF", "#fff"], d: ["#C9C8D3", "#8A8999", "#fff"] };
    let n = 0;
    for (const [sch, b] of R.bySchool) for (const g of ["m", "w"]) { const y = b[g]; if (!y) continue;
      const i = info({ s: sch, t: sch.n }), t = TG[tier(y.ovr)], X0 = 20 + 24 + 22 * String(y.rank).length + 10, cut = (v, px) => { const k = Math.floor((262 - X0) / px); return v.length > k ? v.slice(0, k - 1).trimEnd() + "…" : v; }, nm = cut(i.nm, 8.6);
      const sub = `${b.d} ${g === "m" ? "Men" : "Women"}`, conf = y.crank && y.crank <= 10 ? `#${y.crank} in the ${sch.c}` : "";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="112" viewBox="0 0 340 112" role="img" aria-label="${x(`${i.nm} ${g === "m" ? "men" : "women"}: #${y.rank} in the ${b.d} track and field Power Rankings, rated ${y.ovr}`)}">`
        + `<defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient></defs>`
        + `<rect x=".5" y=".5" width="339" height="111" rx="16" fill="#fff" stroke="#ECEAF3"/><rect x="0" y="16" width="5" height="80" rx="2.5" fill="${x(i.col)}"/>`
        + `<g font-family="Inter,'Segoe UI',Helvetica,Arial,sans-serif"><text x="20" y="27" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="#6C47FF">TRACK &amp; FIELD POWER RANKINGS</text>`
        + `<text x="20" y="65" font-size="34" font-weight="900" letter-spacing="-.5" fill="#12111A">#${y.rank}</text>`
        + `<text x="${X0}" y="${conf ? 47 : 51}" font-size="15" font-weight="800" fill="#12111A">${x(nm)}</text>`
        + `<text x="${X0}" y="${conf ? 63 : 68}" font-size="11.5" font-weight="600" fill="#6B6A7B">${x(sub)}</text>${conf ? `<text x="${X0}" y="78" font-size="11.5" font-weight="700" fill="#5B3BE0">${x(cut(conf, 6.9))}</text>` : ""}`
        + `<text x="20" y="100" font-size="9.5" font-weight="600" fill="#8A8999">${x(seasonLabel(b))} · trackandfieldstandards.com</text></g>`
        + `<rect x="270" y="30" width="54" height="52" rx="13" fill="url(#o)"/><g font-family="Inter,'Segoe UI',Helvetica,Arial,sans-serif" text-anchor="middle" fill="${t[2]}"><text x="297" y="62" font-size="24" font-weight="900">${y.ovr}</text><text x="297" y="76" font-size="7.5" font-weight="800" letter-spacing="1.4">OVR</text></g></svg>`;
      fs.writeFileSync(path.join(dir, `${sl(sch).split("/").pop()}-${g}.svg`), svg); n++; }
    console.log(`ranking badges: ${n}`); }

  /* methodology (Ryan 2026-11-02, AEO: a citable, versioned explanation with a worked example from live data) */
  { const d = "NCAA D1", c = R.cur[d], sq = (c.P.groups.m.hurdles || [])[0], W4 = [1, 0.75, 0.5, 0.25], f1 = x => (Math.round(x * 10) / 10).toString();
    const ex = sq ? `<h2>Worked example: the top ${esc(d)} men's hurdle squad, ${esc(seasonLabel(c))}</h2><p><b>${esc(nmOf(sq))}</b> ranks #1 on these athletes (wind-legal national list place and the championship field size F for that event):</p><ul>${sq.ath.map((a, i) => `<li>${esc(a.nm)}, ${esc(a.ev.replace(" Hurdles", "m hurdles"))}: #${a.p} of a field of ${a.F}, mark ${esc(a.mk)}. Place score ${f1(a.sp)}${a.st != null ? `, mark score ${f1(a.st)}` : ""}, athlete score ${f1(a.sc)} × weight ${W4[i]} = <b>${f1(a.sc * W4[i])}</b></li>`).join("")}</ul><p>Combined with the points its hurdlers scored at the national meet, that ranks #1 in ${esc(d)}, so the squad is rated 99.</p>` : "";
    art({ p: "/rankings/methodology.html", date: dateOf(c), crumbs: [["Home", "/"], ["Rankings", "/rankings.html"], ["Methodology", "/rankings/methodology.html"]],
      title: "How the Track and Field Power Rankings Work", desc: "The PR Power Index methodology: how college track and field teams are ranked from TFRRS national lists and national championship results, with weights, formulas and a worked example.",
      kick: "Methodology · PR Power Index v3", h1: "How the college track and field Power Rankings work",
      sub: `The PR Power Index ranks every NCAA D1, D2, D3, NAIA, NJCAA and NWAC program from two TFRRS sources: the wind-legal national performance list and the national championship results. National meet points count ${WEIGHTS.act}%, projected points ${WEIGHTS.proj}%, event-group squads ${WEIGHTS.squad}% and qualifiers ${WEIGHTS.qual}%. After the national meet, the official team scores set the final order.`,
      body: `<h2>The four parts</h2><ul><li><b>National meet points (${WEIGHTS.act}%)</b>: the official TFRRS team scores from the NCAA, NAIA, NJCAA or NWAC championship, 10-8-6-5-4-3-2-1 for places 1 to 8, relays included.</li><li><b>Projected points (${WEIGHTS.proj}%)</b>: the same scoring applied to the top 8 on each wind-legal national list, so in-season rankings reward the marks that would score.</li><li><b>Event-group squads (${WEIGHTS.squad}%)</b>: sprints, hurdles, distance, jumps, throws and multi-events for men and women. Each squad counts its best four athletes, weighted 1.0, 0.75, 0.5 and 0.25. After the national meet, each event-group and event ranking is half squad strength and half the points that group scored at the national meet.</li><li><b>Qualifiers (${WEIGHTS.qual}%)</b>: individual entrants at the national meet (in season: athletes inside each event's championship field on the list).</li></ul>`
        + `<h2>How an athlete is scored</h2><p>Each athlete's score is half <b>place</b> and half <b>mark</b>. The place score compares their spot on the wind-legal national list with that event's real championship field size F (counted from the championship results): 100 at #1, 50 at #F, 0 at twice the field, straight-line in between. The mark score compares the mark itself with that division's average marks since 2016 for the #1 athlete, the last qualifier and twice the field depth (100, 50 and 0), so a faster, deeper year scores higher than a slow one at the same list place. A mark better than the average #1 can score up to 110. Wind-aided marks are replaced with the athlete's legal best, or dropped if there is none. Each athlete counts once per event, and B and C squads count for their school.</p>`
        + `<h2>Ratings out of 99</h2><p>Each part is scaled against the division leader and combined with the weights above. The best team in a division is 99; everyone else is 60 + 39 × (their score ÷ the leader's)^0.6, and a rating never rises as you go down a list. 90+ elite, 80s national-level, 70s strong, 60s ranked.</p>`
        + ex
        + `<h2>Data sources</h2><p>Every number comes from <a href="https://www.tfrrs.org/" rel="noopener">TFRRS</a>, the official results system of college track and field: the final national qualifying lists and the national championship results, ${Object.keys(SRC).length} division seasons from 2016 on. Each ranking page links the exact list and meet it uses. Seasons with no national meet on TFRRS (2020, cancelled; a few 2016 and 2021 meets) are ranked on the lists and labelled.</p>`
        + `<h2>What changed in v3 (November 2026)</h2><p>Athlete scores now count the mark as well as the list place, so faster and deeper seasons count for more; event-group and event rankings now count national meet points after the meet; and an athlete listed twice under different spellings is counted once.</p><h2>What is coming next</h2><p>Conference championship results (being added for 2016 to 2026) will join as a small part, weighted by each conference's measured depth on the national lists.</p>`
        + `<h2>Rankings</h2><div class="links">${DV.map(x => `<a href="${rankPath(x)}">${esc(x)} Power Rankings</a>`).join("")}<a href="/rankings.html">All rankings</a></div>`,
      faq: [["How are college track and field teams ranked?", `By the PR Power Index: national meet points (${WEIGHTS.act}%), projected points from the wind-legal national list (${WEIGHTS.proj}%), event-group squads (${WEIGHTS.squad}%) and national qualifiers (${WEIGHTS.qual}%), all from TFRRS. After the national meet, the official team scores set the order.`],
        ["Where does the data come from?", "TFRRS national qualifying lists and national championship results for NCAA D1, D2, D3, NAIA and the NJCAA and NWAC junior colleges, every season from 2016."],
        ["Are wind-aided marks counted?", "No. An aided mark is replaced with the athlete's best legal mark, or left out if there is none."]] });
    done.push("/rankings/methodology.html"); }

  /* hub: men's and women's top 5 per division, side by side */
  const H = DV.map(d => R.cur[d]);
  art({ p: "/rankings.html", date: H.map(dateOf).sort().pop(), crumbs: [["Home", "/"], ["Rankings", "/rankings.html"]],
    title: `College Track and Field Rankings ${H[0].year}: D1, D2, D3, NAIA, JUCO`, desc: `${H[0].year} college track and field Power Rankings for NCAA D1, D2, D3, NAIA and junior college (NJCAA, NWAC) men and women: national meet points, projected points, qualifiers and event-group squads. Updated every Monday in season.`,
    kick: "NCAA D1 · D2 · D3 · NAIA · NJCAA · NWAC · Men and women", h1: "College track and field Power Rankings",
    sub: `Men: ${DV.map((d, i) => `${esc(d.replace("NCAA ", ""))} <b>${esc(nmOf(H[i].P.m[0]))}</b>`).join(", ")}. Women: ${DV.map((d, i) => `${esc(d.replace("NCAA ", ""))} <b>${esc(nmOf(H[i].P.w[0]))}</b>`).join(", ")}.`,
    body: DV.map((d, i) => { const c = H[i]; return `<h2>${esc(d)} · ${esc(seasonLabel(c))}</h2><div class="pr-duo">${["m", "w"].map(g => `<div><h3>${g === "m" ? "Men" : "Women"}</h3><div class="pr-slim">${table(c, g, 5)}</div><a class="pr-more" href="${rankPath(d)}${g === "w" ? "#women" : ""}">All ${esc(d)} ${g === "m" ? "men" : "women"} ›</a></div>`).join("")}</div>`; }).join("") + `<p><a href="/rankings/methodology.html">How the rankings work: formula, weights and sources ›</a></p>`,
    lists: DV.flatMap((d, i) => [[`${d} men's track and field Power Rankings`, H[i].P.m.slice(0, 5)], [`${d} women's track and field Power Rankings`, H[i].P.w.slice(0, 5)]]),
    faq: [["What are the best college track and field programs?", `Men: ${DV.map((d, i) => `${esc(nmOf(H[i].P.m[0]))} in ${esc(d)}`).join(", ")}. Women: ${DV.map((d, i) => `${esc(nmOf(H[i].P.w[0]))} in ${esc(d)}`).join(", ")}.`], ["How often are the rankings updated?", "Every Monday during the indoor (December to March) and outdoor (March to June) seasons."]] });
  done.push("/rankings.html");
  return done;
}
