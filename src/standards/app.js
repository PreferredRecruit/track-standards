// @ts-nocheck
/* Preferred Recruit · College Track & Field Standards app. Generated from the approved design mockup by export_lovable.py.
   Data: /data/db.json (standards), /data/rank_index.json + /data/rank/<key>.dat (gzip results, refreshed Mondays), /data/athletes.json. */
const LIVE_BASE = "https://raw.githubusercontent.com/PreferredRecruit/track-standards/data/";   // Monday refresh (data branch)
const LIVE_KEYS = new Set();   // keys published on the data branch (not the chat's LIVE flag)
async function unpack(r){ return await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json(); }
async function getRank(key){
  if (LIVE_KEYS.has(key) && typeof DecompressionStream !== "undefined") {
    try { const lr = await fetch(LIVE_BASE + "rank/" + key + ".dat", { cache: "no-cache" }); if (lr.ok) return await unpack(lr); } catch (e) {}
  }
  const r = await fetch("/data/rank/" + key + ".dat");
  if (!r.ok) throw new Error("missing " + key);
  if (typeof DecompressionStream !== "undefined") return await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json();
  throw new Error("browser too old to unpack results");
}
import * as ACC from "./account.js";
import * as READY from "./readiness.js";
const slugOf = n => n.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() + "-track-standards";
export async function mount(opts = {}) {
  if (window.__prStandardsMounted) { window.__prStandardsRoute && window.__prStandardsRoute(opts.slug); return; }
  window.__prStandardsMounted = true;
  const [DB, RIDX, LIVEIDX] = await Promise.all([fetch("/data/db.json").then(r => r.json()), fetch("/data/rank_index.json").then(r => r.json()),
    fetch(LIVE_BASE + "rank_index.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => [])]);
  for (const x of LIVEIDX) { LIVE_KEYS.add(x.key); if (!RIDX.some(y => y.key === x.key)) RIDX.push(x); }

const EVENTS=["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles", "110m Hurdles (39\")", "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"], CT=DB.ct, RULES=DB.rules;
const SCH=DB.schools.map(x=>{const side=g=>{if((x.ng||[]).includes(g))return {};if(x.em)return (x.em[g]||{});const o=(x.om||{})[g]||{},c=(CT[x.ck]||{})[g]||{},r={};EVENTS.forEach(e=>{if(o[e])r[e]=o[e];else if(c[e])r[e]=c[e].map(v=>v?v[0]:"")});return r};return Object.assign(x,{m:side("m"),w:side("w")})});
/* nicknames people actually type (Ryan 2026-10-23: "UCSB or Cal Poly ... not appearing"): curated ones, plus "UC X" -> ucx initials
   (UCSB, UCSD, UCR) and "Cal State X" -> csu + initials (CSUF, CSUB, CSULA). A generated one is only added when no other school uses it. */
{const NICK={"UC Santa Barbara":["ucsb","santa barbara","university of california santa barbara"],"Cal Poly":["cal poly slo","cal poly san luis obispo","san luis obispo","slo","california polytechnic state university"],
  "Long Beach State":["lbsu","csulb","cal state long beach","the beach"],"San Diego State":["sdsu"],"NC State University":["ncsu","north carolina state"],"SIU Edwardsville":["siue"],
  "University of Connecticut":["uconn"],"University of Vermont":["uvm"],"Stephen F. Austin State University":["sfa"],"University of Pennsylvania":["upenn"],"University of Missouri":["mizzou"],
  "Oklahoma State University":["okst","ok state"],"Arizona State University":["asu"],"California State University, Sacramento":["sac state"]};
 const used=new Set(SCH.flatMap(x=>x.a)),ini=t=>t.toLowerCase().split(/[^a-z]+/).filter(w=>w&&!["of","the","at","and"].includes(w)).map(w=>w[0]).join("");
 SCH.forEach(x=>{const add=(v,force)=>{if(v&&(force||!used.has(v))&&!x.a.includes(v)){x.a.push(v);used.add(v)}};(NICK[x.n]||[]).forEach(v=>add(v,true));
   for(const nm of [x.n,x.t]){let m=nm.match(/^UC (.+)$/);if(m)add("uc"+ini(m[1]));m=nm.match(/^(?:Cal State|Cal St\.|CSU|California State University,?) (.+)$/);if(m&&!/polytechnic/i.test(nm))add("csu"+ini(m[1]))}})}
const ACR=SCH.map(s=>s.n.toLowerCase().replace(/\(.*?\)/g," ").split(/[^a-z&]+/).filter(w=>w&&!["of","the","at","and","in","for"].includes(w)).map(w=>w[0]).join(""));
const TOK=SCH.map(s=>[...new Set((s.n+" "+s.t+" "+(s.a||[]).join(" ")).toLowerCase().split(/[^a-z0-9&]+/).filter(Boolean))]);
const DIVS=["NCAA D1","NCAA D2","NCAA D3","NAIA"];
const NSTD=SCH.filter(s=>!s.j).length;   /* schools with levels (junior colleges are results-only) */
const QUIZ="https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards";
/* ---------- search intent (Ryan 2026-10-16) ----------
   "if an athlete searches for distance or throws, the ad should target them specifically" and "we should be collecting all of the
   data of what people are searching". The browser remembers the events, grade and mark looked at (localStorage prIntent, shared with
   the SEO pages) so the pop-up speaks to that athlete, and each action goes to the anonymous insights log (Supabase function "track":
   random browser id, event, mark, grade, state, page; never names, emails, IPs or chat text). */
const TRACK="https://airqmzyuxyyiqjaocwmk.supabase.co/functions/v1/track";
const GRP=e=>{e=String(e||"");return /hurdle/i.test(e)?"hurdles":/thlon/i.test(e)?"multis":/jump|vault/i.test(e)?"jumps":/shot|discus|hammer|javelin|weight|throw/i.test(e)?"throws":/relay/i.test(e)?(/800|1600|mile|medley|dmr/i.test(e)?"distance":"sprints"):/^(55|60|100|200|400)(m| meters|$)/i.test(e)?"sprints":"distance"};
const GNAME={sprints:"the sprints",hurdles:"hurdles",distance:"distance",jumps:"the jumps",throws:"throws",multis:"the multis"};
const GCOACH={sprints:"Sprint coaches",hurdles:"Hurdles coaches",distance:"Distance coaches",jumps:"Jumps coaches",throws:"Throws coaches",multis:"Multi-event coaches"};
const evSay=e=>String(e).replace(/ \(39"\)/,"").replace(/^3000m Steeplechase$/,"steeplechase").replace(/^Mile$/,"mile").toLowerCase();
const INT=(()=>{try{return JSON.parse(localStorage.getItem("prIntent"))||{}}catch(e){return {}}})();
const SID=(()=>{try{let v=localStorage.getItem("prSid");if(!v){v=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36));localStorage.setItem("prSid",v)}return v}catch(e){return "anon-"+Math.random().toString(36).slice(2,12)}})();
/* A/B bucket per browser: 0 = data-driven copy (near-miss, school), 1 = plain intent copy (control) */
const BUCKET=0;   /* A/B test closed 2026-10-25: data-driven copy (dream 11.5%, near-miss 5.6%) beat plain intent copy; everyone gets it */
const saveInt=()=>{try{localStorage.setItem("prIntent",JSON.stringify(INT))}catch(e){}try{keepQ()}catch(e){}};
function intent(e,g,mark){if(!e)return;const grp=GRP(e);INT.e=e;INT.grp=grp;if(g)INT.g=g;if(mark){INT.m=mark;INT.me=e;INT.mg=g||INT.g}   /* the mark's own event + gender: SEO pages and likely-A checks only reuse a mark for those */INT.c=INT.c||{};INT.c[grp]=(INT.c[grp]||0)+1;INT.t=Date.now();saveInt()}
const topGrp=()=>{const c=INT.c||{};return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||INT.grp};
window.prLog=(k,x)=>log(k,Object.assign({event:INT.e||undefined,variant:x&&x.placement==="popup"&&EV.v||undefined,trig:x&&x.placement==="popup"&&EV.trig||undefined},x));
/* a signed-in coach (coach portal token on this origin) is verified server-side, so coach views are tagged with their school */
const T0=Date.now();
const scrollPct=()=>{const h=document.documentElement;return Math.min(100,Math.round((scrollY+innerHeight)/Math.max(h.scrollHeight,1)*100))};
/* the landing UTM stays with the whole visit (2026-10-24 audit: half of tagged sessions lost utm_source after the first click, since
   the address bar changes as people move around). Shared with the static pages' tracker through sessionStorage "prUtm". */
const UTM=(()=>{try{const u=new URLSearchParams(location.search).get("utm_source");if(u){sessionStorage.setItem("prUtm",u.slice(0,40));return u}return sessionStorage.getItem("prUtm")||undefined}catch(e){return new URLSearchParams(location.search).get("utm_source")||undefined}})();
function log(kind,x){try{let ct;try{ct=localStorage.getItem("pr_coach")||undefined}catch(e){}const b=Object.assign({sid:SID,kind,coach:ct,secs:Math.round((Date.now()-T0)/1000),scroll_pct:scrollPct(),hour:new Date().getHours(),grade:INT.gr||undefined,path:location.pathname+location.search,mobile:innerWidth<700,utm_source:UTM},x||{});
  if(b.event&&!b.grp)b.grp=GRP(b.event);fetch(TRACK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),keepalive:true}).catch(()=>{})}catch(e){}}
/* the funnel link carries the intent too, so the evaluation and CRM know the event and grade (utm_term = event, pr_grade = grade) */
function quizFor(){try{const u=new URL(QUIZ);/* Close keeps utm_term inside Lead Source but drops pr_* params, so the term also carries grade + account tier (Ryan 2026-10-21: route Tier A juniors/seniors first) */const tr=ACC.member()&&ACC.tier()?ACC.tier():"",cl=ACC.cls?ACC.cls():null;const term=[INT.e,INT.gr?"g"+INT.gr:"",tr?"t"+tr:"",cl?"c"+cl:"",qTag()].filter(Boolean).join(" ");if(term)u.searchParams.set("utm_term",term);if(INT.grp)u.searchParams.set("pr_group",INT.grp);if(INT.gr)u.searchParams.set("pr_grade",INT.gr);if(INT.m)u.searchParams.set("pr_mark",INT.m);if(INT.rs)u.searchParams.set("pr_status",INT.rs);if(ACC.member()){u.searchParams.set("pr_account","1");if(ACC.tier())u.searchParams.set("pr_tier",ACC.tier())}return u.toString()}catch(e){return QUIZ}}
/* account limits (Ryan 2026-10-19): logged out = top 10 per results list, first 15 colleges, 5 AI questions */
const RCAP=n=>ACC.member()?n:Math.min(n,ACC.LIMITS.results);
const rwall=(len,shown)=>!ACC.member()&&len>shown?ACC.wall("results"):"";
const FIELD=new Set(["High Jump","Pole Vault","Long Jump","Triple Jump","Shot Put","Discus","Hammer","Javelin"]);
const SHORT=new Set(["100m","200m","400m","100m Hurdles","110m Hurdles","300m Hurdles","400m Hurdles"]);
const TF={"100m":"100 Meters","200m":"200 Meters","400m":"400 Meters","800m":"800 Meters","1500m":"1500 Meters","5000m":"5000 Meters","10000m":"10,000 Meters","100m Hurdles":"100 Hurdles","110m Hurdles":"110 Hurdles","400m Hurdles":"400 Hurdles","3000m Steeplechase":"3000 Steeplechase","High Jump":"High Jump","Pole Vault":"Pole Vault","Long Jump":"Long Jump","Triple Jump":"Triple Jump","Shot Put":"Shot Put","Discus":"Discus","Hammer":"Hammer","Javelin":"Javelin"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const MAG='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
/* mark reader: same function as scripts/seo/markparse.mjs (keep in sync) */
function parseMark(str,e){
  if(str==null)return null;var s=String(str).toLowerCase().replace(/[’′‘]/g,"'").replace(/[”″“]/g,'"').replace(/\*/g,"").replace(/''/g,'"').replace(/\[/g,"(").replace(/\]/g,")").replace(/\bmet(?:er|re)s?\b/g,"m").trim();if(!s)return null;
  var FR={"High Jump":[1,2.5],"Pole Vault":[1.5,6.3],"Long Jump":[3,9],"Triple Jump":[7,18.5],"Shot Put":[5,24],"Discus":[12,75],"Hammer":[12,87],"Javelin":[12,99],"Weight Throw":[8,26]};
  var TR={"100m":[9.5,16],"200m":[19,35],"400m":[43,90],"800m":[100,200],"1500m":[205,420],"1600m":[225,450],"Mile":[225,450],"3000m":[450,900],"3200m":[480,960],"5000m":[760,1500],"10000m":[1600,3200],"100m Hurdles":[12,22],"110m Hurdles":[12.8,24],"300m Hurdles":[34,60],"400m Hurdles":[46,95],"3000m Steeplechase":[490,1000]};
  var inR=function(v,r){return v!=null&&isFinite(v)&&(!r||(v>=r[0]&&v<=r[1]))};
  if(FR[e]){var r=FR[e],m;
    var mr=/(\d+(?:\.\d*)?)\s*m(?![a-z])/g;while((m=mr.exec(s)))if(inR(+m[1],r))return +m[1];
    m=s.match(/\((\d+\.\d+)\)/);if(m&&inR(+m[1],r))return +m[1];m=s.match(/^(\d+\.\d\d)\s*\(/);if(m&&inR(+m[1],r))return +m[1];
    var f=s.replace(/^(\d+)"(\d)/,"$1'$2").split(/[\/(;]|\bor\b/)[0].replace(/\s+/g,"").replace(/(\d)ft-?(\d)/,"$1-$2").replace(/(\d)in$/,"$1").replace(/(\d)ft$/,"$1'");
    m=f.match(/^(\d+)(?:'|-|ft)-?(\d+(?:\.\d+)?)?(?:"|in|')?$/);
    if(m){var ft=+m[1],inch=m[2]?+m[2]:0;if(inch>=12&&/^\d\d$/.test(m[2]))inch=inch/10;if(inch<12)return(ft*12+inch)*0.0254;return null}
    m=f.match(/^(\d+(?:\.\d+)?)(?:'|ft|")?$/);
    if(m){var n=+m[1],asM=n,asFt=n*0.3048;if(/'|ft/.test(f))return inR(asFt,r)?asFt:null;if(/"/.test(f))return inR(n*0.0254,r)?n*0.0254:inR(asFt,r)?asFt:null;if(inR(asM,r))return asM;if(inR(asFt,r))return asFt;return n<30?n:null}
    return null}
  var R=TR[e],alts=s.replace(/\([^)]*\)/g," ").split(/[\/|;]|\bor\b/).map(function(x){return x.replace(/^[^:]*[a-z][^:]*:|^\s*\d{3,5}\s*:\s/,"").replace(/\b\d+k\b|\b[a-z]+\b/g," ")});
  var one=function(seg){var t=seg.replace(/[^0-9:.]/g,"");if(!t)return null;
  var c=(t.match(/:/g)||[]).length,d=(t.match(/\./g)||[]).length,p,a,b;
  if(c===0&&d===2){p=t.split(".");return +p[0]*60+ +(p[1]+"."+p[2])}
  if(c===0){var v=+t;if(isNaN(v))return null;if(R&&!inR(v,R)&&d===1){p=t.split(".");var mm=+p[0]*60+ +p[1];if(p[1].length===2&&inR(mm,R))return mm}return v}
  p=t.split(":");if(p.some(function(x){return x===""||isNaN(+x)}))return null;
  if(c===1)return +p[0]*60+ +p[1];
  if(c===2){a=+p[0]*3600+ +p[1]*60+ +p[2];b=+p[0]*60+ +(p[1]+"."+p[2].replace(".",""));if(R&&!inR(a,R)&&inR(b,R))return b;return a}
  return null};
  var first=null;for(var i=0;i<alts.length;i++){var v2=one(alts[i]);if(v2==null)continue;if(first==null)first=v2;if(!R||inR(v2,R))return v2}return first}
/* results clean-up: same function as scripts/seo/markparse.mjs CLEAN_SRC (keep in sync) */
function cleanRank(D){if(!D||!D.lists)return D;
  var LIM={"55m":9,"60m":10,"100m":16,"200m":34,"300m":60,"400m":80,"500m":110,"600m":130,"800m":220,"1000m":290,"1500m":480,"Mile":520,"3000m":1080,"5000m":1800,"10000m":3900,
    "55m Hurdles":12,"60m Hurdles":13,"100m Hurdles":22,"110m Hurdles":24,"400m Hurdles":100,"3000m Steeplechase":1200,
    "High Jump":1.0,"Pole Vault":1.5,"Long Jump":3,"Triple Jump":7,"Shot Put":5,"Discus":12,"Hammer":12,"Javelin":12,"Weight Throw":5};
  var lab=function(e){return String(e).replace(/^(\d[\d,]*) Meters$/,"$1m").replace(/,/g,"").replace(/^(\d+) Hurdles$/,"$1m Hurdles").replace(/^(\d+) Steeplechase$/,"$1m Steeplechase")};
  D.lists.forEach(function(l){Object.keys(l.g||{}).forEach(function(g){var G=l.g[g];Object.keys(G).forEach(function(ev){var rows=G[ev];if(!rows||rows.length<3)return;
    var e=lab(ev),up=/thlon|jump|vault|put|discus|hammer|javelin|throw/i.test(ev),v=rows.map(function(r){return parseMark(r[4],e)}),lim=LIM[e];
    var s=v.filter(function(x){return x!=null}).sort(function(a,b){return a-b});if(s.length<3)return;var med=s[Math.floor(s.length/2)];
    G[ev]=rows.filter(function(r,i){var x=v[i];if(x==null)return true;if(lim!=null&&(up?x<lim:x>lim))return false;return !(up?x<med*0.5:x>med*1.5)})})})});return D}
const parse=parseMark;
const ord=n=>n+(n%100>=11&&n%100<=13?"th":{1:"st",2:"nd",3:"rd"}[n%10]||"th");
const meets=(e,v,std)=>{const s=parse(std,e);if(s==null||v==null)return false;return FIELD.has(e)?v>=s-1e-9:v<=s+1e-9};
/* High school -> college conversions. One table, used everywhere (finder, school pages, AI).
   Distance: 1600m -> mile x1.0058, mile -> 1500m x0.926 (so 1600m -> 1500m x0.9314); 3200m -> 3000m x0.9314;
   3000m -> 5000m by Riegel (5000/3000)^1.06 = x1.7186. Hurdles: boys 110mH 39" -> 42" college height +0.5s;
   300mH -> 400mH x1.41 (men, both 36") / x1.45 (women, both 30"). Women's 100mH is 33" in both, so no change.
   Each conversion carries a tight range (low, mid, high); tiers use the mid value. */
const CONV={
  "1600m":{to:"1500m",k:[0.9284,0.9314,0.9344],how:"1600m × 0.9314 (1600m to mile ×1.0058, mile to 1500m ×0.926)"},
  "Mile":{to:"1500m",k:[0.923,0.926,0.929],how:"Mile × 0.926"},
  "3200m":{to:"3000m",k:[0.9284,0.9314,0.9344],next:{to:"5000m",k:1.7186},how:"3200m × 0.9314 = 3000m; 3000m × 1.7186 = 5000m (Riegel)"},
  "110m Hurdles (39\")":{to:"110m Hurdles",lab:"110m Hurdles at 42\"",add:[0.4,0.5,0.6],how:"39\" high school time + 0.5s (0.4 to 0.6) for 42\" college hurdles"},
  "300m Hurdles":{to:"400m Hurdles",k:{m:[1.39,1.41,1.43],w:[1.43,1.45,1.47]},how:"Men ×1.41 (1.39 to 1.43), women ×1.45 (1.43 to 1.47). Same hurdle height in both (36\" men, 30\" women)"}};
const fmtT=x=>{if(x==null)return"";if(x<60)return x.toFixed(2);const m=Math.floor(x/60),s=x-m*60;return m+":"+(s<10?"0":"")+s.toFixed(2)};
function convert(e,g,v){const c=CONV[e];if(!c||v==null)return null;
  const k=c.k&&(Array.isArray(c.k)?c.k:c.k[g]);const r=c.add?c.add.map(a=>v+a):k.map(f=>v*f);
  const out=[{e:c.to,lab:c.lab,lo:r[0],v:r[1],hi:r[2]}];if(c.next)out.push({e:c.next.to,lo:r[0]*c.next.k,v:r[1]*c.next.k,hi:r[2]*c.next.k});return out}
function convLine(e,g,v){const c=convert(e,g,v);if(!c)return "";
  return c.map(x=>`<span class="cvx"><b>${fmtT(x.v)}</b> ${esc(x.lab||x.e)} <small>range ${fmtT(x.lo)} to ${fmtT(x.hi)}</small></span>`).join("")}
/* "12-year-old simple" (Ryan 2026-10-19): athletes see marks in the events they run. A college 1500m standard is shown as its
   1600m equivalent (the inverse of CONV), 3000m/5000m as 3200m, 400m hurdles as 300m hurdles, 42" hurdles as 39". The math
   and the college number stay behind the small i. Official charts are always shown as the school published them. */
const HSE=g=>["100m","200m","400m","800m","1600m","3200m",g==="m"?'110m Hurdles (39")':"100m Hurdles","300m Hurdles","High Jump","Pole Vault","Long Jump","Triple Jump","Shot Put","Discus","Javelin"];
const hsName=(e,g)=>e==='110m Hurdles (39")'?"110m Hurdles":e==="110m Hurdles"&&g!=="w"?"110m Hurdles (college 42\")":e;
function toHS(e,g,ev,v){const c=CONV[e];if(!c||v==null)return null;const k=c.k&&(Array.isArray(c.k)?c.k:c.k[g]);
  if(c.to===ev)return c.add?v-c.add[1]:v/k[1];if(c.next&&c.next.to===ev)return v/c.next.k/k[1];return null}
const fmtHS=x=>x==null?"":x>=60?(()=>{const m=Math.floor(x/60),s=Math.round((x-m*60)*10)/10;return s>=60?(m+1)+":00.0":m+":"+(s<10?"0":"")+s.toFixed(1)})():x.toFixed(2);
/* a school's levels in a high school event: its own number when it lists that event, else the college event converted back */
function hsLevels(s,g,e){if(s[g][e]&&implC(s,g,e))return {t:s[g][e].map(x=>hsThrow(s,g,e,x)),from:IMPL[e].col+" "+e.toLowerCase(),orig:s[g][e]};if(s[g][e])return {t:s[g][e],from:null};const c=CONV[e];if(!c)return {t:null,from:null};
  for(const ev of [c.to,c.next&&c.next.to].filter(Boolean))if(s[g][ev])return {t:s[g][ev].map(x=>{const v=parse(x,ev);return v==null?"":fmtHS(toHS(e,g,ev,v))}),from:ev,orig:s[g][ev]};
  return {t:null,from:null}}
/* boys' throws (Ryan 2026-10-19: "we do need throwing conversions if its based on college instruments"). High school boys throw
   the 12lb shot and 1.6kg discus, college men the 16lb and 2kg. Levels set from college results (conference lists, division
   estimates) are compared after taking the implement difference off the high school mark: shot 10 ft (8 to 12; Throws America
   about 2.5 ft per pound, coaches quote about 8 ft), discus 25 ft (15 to 32; first-year college throwers 10 to 20 ft shorter,
   coaching rule 5 m per 250 g = 26 ft, Throws America 32 ft). Official school charts are written for high school recruits and
   are compared directly. Girls use the same implements in high school and college, so nothing changes for them. */
const IMPL={"Shot Put":{add:[-3.66,-3.05,-2.44],hs:"12lb",col:"16lb",how:"High school boys throw the 12lb shot and college men the 16lb, so we take about 10 ft (8 to 12 ft) off your mark before comparing it with marks set from college results."},
  "Discus":{add:[-9.75,-7.62,-4.57],hs:"1.6kg",col:"2kg",how:"High school boys throw the 1.6kg discus and college men the 2kg, so we take about 25 ft (15 to 32 ft) off your mark before comparing it with marks set from college results."}};
const implC=(s,g,e)=>g==="m"&&!!IMPL[e]&&!((s.om||{})[g]||{})[e];
const toCol=(s,g,e,v)=>v!=null&&implC(s,g,e)?v+IMPL[e].add[1]:v;
const fmtFt=m=>{const i=Math.round(m/0.0254*4)/4,ft=Math.floor(i/12),inch=+(i-ft*12).toFixed(2);return `${ft}' ${inch}" ${m.toFixed(2)}m`};
const hsThrow=(s,g,e,x)=>{const v=parse(x,e);return v==null?"":fmtFt(v-IMPL[e].add[1])};
function tier0(t,e,v){if(meets(e,v,t[0]))return "T";if(meets(e,v,t[1]))return "R";if(t[2]&&meets(e,v,t[2]))return "W";return null}
function tier(s,g,e,v){const t=s[g][e];if(t)return tier0(t,e,toCol(s,g,e,v));const c=convert(e,g,v);if(!c)return null;
  for(const x of c){if(s[g][x.e])return tier0(s[g][x.e],x.e,x.v)}return null}
const TN={T:"Target",R:"Recruit",W:"Walk-On"};
/* schools where the mark is just short of the next level (direct standards only); gap formatted for copy */
const fmtGap=(e,d)=>FIELD.has(e)?(()=>{const i=d*39.3701;return i>=12?`${Math.floor(i/12)}'${Math.round(i%12)}"`:`${Math.max(1,Math.round(i))} inch${Math.round(i)>1?"es":""}`})():`${d.toFixed(2)}s`;
function nearMiss(g,e,v){if(v==null)return {n:0};const F=FIELD.has(e),tol=F?0.03:0.02,cnt={W:[],R:[],T:[]};
  for(const s of SCH){const t=s[g]&&s[g][e];if(!t)continue;const vs=toCol(s,g,e,v),cur=tier0(t,e,vs),nx=cur===null?2:cur==="W"?1:cur==="R"?0:-1;if(nx<0||!t[nx])continue;
    const th=parse(t[nx],e);if(th==null)continue;const d=F?th-vs:vs-th;if(d>0&&d<=th*tol)cnt["WRT"[nx]].push(d)}
  const lvl=["R","T","W"].sort((a,b)=>cnt[b].length-cnt[a].length)[0],ds=cnt[lvl].sort((a,b)=>a-b);if(!ds.length)return {n:0};
  const med=ds[Math.floor(ds.length/2)],gap=fmtGap(e,med);
  return {n:ds.length,lvl,gap}}
const better=(e,a,b)=>FIELD.has(e)?b-a:a-b;
const S={tab:"standards",school:null,g:"m",e:"100m",mark:"",run:false,f:"",div:"",n:15,q:"",gr:INT.gr||""};
const seg=(k,v)=>`<div class="seg" role="group" aria-label="Team"><button type="button" data-${k}="m" aria-pressed="${v==="m"}">Men</button><button type="button" data-${k}="w" aria-pressed="${v==="w"}">Women</button></div>`;
const evs=g=>EVENTS.filter(e=>CONV[e]||SCH.some(s=>s[g][e])).filter(e=>!(g==="m"&&e==="100m Hurdles")&&!(g==="w"&&e.startsWith("110m Hurdles")));
const PH={"100m":"10.85","200m":"22.10","400m":"49.50","800m":"1:58.00","1500m":"4:05.00","1600m":"4:21.50","Mile":"4:23.00","3000m":"8:50.00","3200m":"9:20.00","5000m":"15:30.00","10000m":"32:00.00","100m Hurdles":"14.20","110m Hurdles":"14.80",'110m Hurdles (39")':"14.80","300m Hurdles":"38.50","400m Hurdles":"54.20","3000m Steeplechase":"9:45.00","High Jump":"6'6\"","Pole Vault":"14'6\"","Long Jump":"22'6\"","Triple Jump":"46'0\"","Shot Put":"52'0\"","Discus":"150'0\"","Hammer":"160'0\"","Javelin":"180'0\""};
const ph=e=>PH[e]||(FIELD.has(e)?"22'6\"":"4:21.50");

/* ---------- the results offer (Ryan 2026-10-16) ----------
   Copy ladder from the athlete's own result; fires at the moment they have seen it (results list scrolled into view and held for
   1.5 s), not on a timer. Bucket 0 = data-driven copy, bucket 1 = plain intent copy (control). Parents arriving from a shared link
   get the parent version. */
/* copy engine (Ryan 2026-10-16: "make it demonic copy, you run a 49.50 400m ?! ... use our copy engines to target our icps").
   Built from creative-strategy's proven winners (incredulous call-out at the athlete's own mark, comparison, season clock,
   reassurance) and the Empty Inbox mechanic, PA/SA athlete persona, juniors and seniors get the clock, 9th/10th get "start early".
   human-copy rules apply: plain spoken sentences, no em dashes, official claims only, numbers only from the site's data. */
const VERB=e=>({throws:"throw",jumps:"jump",multis:"score"})[GRP(e)]||"run";
const hookLine=()=>{if(!S.run||!S.mark)return "";const mk=S.mark.trim(),es=evSay(S.e),vb=VERB(S.e);
  return vb==="run"?`You run a ${mk} ${es}?!`:`You ${vb} ${mk} in the ${es}?!`};
/* copy v4 (Ryan 2026-10-17: Apple-level, "Standards" narrative, Cortex + sales-letter lines, short and authoritative).
   Angle: PA/SA high school athlete (11th/12th first), benefit = visibility, proof = the site's own standards data.
   Approved lines from the athlete sales letter: "Talent gets you the offer. Visibility gets you in the room.", "You are not the
   problem.", the junior/senior window. human-copy rules; official claims only; numbers only from the site's data. */
const clock=()=>+S.gr===12?"Senior year moves fast. Coaches are finishing their classes now.":+S.gr===11?"Junior year is the most important year of your recruiting timeline.":S.gr?"Starting early is how you compete for the best spots.":"";
const EVAL="A free evaluation shows";
/* grade tag on every variant (Ryan 2026-10-25: "sophomores are still a fit"): 9 alone, 10 with the sales grades */
const gsfx=()=>+S.gr>=11?"-11-12":+S.gr===10?"-10":+S.gr===9?"-9":"";
/* likely Tier A before sign-up (Ryan 2026-10-28: "the pop ups have to be better at targeting a+ and a leads"): a 10th-12th grader whose
   own searched mark meets the PR outreach standard (brand/context/tpr-standards.pdf, same table as supabase/accounts pr_standards).
   Tier A also needs GPA 3.0+, so these visitors get one extra tap ("GPA 3.0 or higher?") and the funnel link carries qA (mark + GPA,
   the Tier A rule) or qM (mark only) in utm_term, so setters can call them first. Signed-in accounts keep their real tier instead. */
const PRSTD={m:{"100m":11.49,"200m":23.5,"400m":52.5,"800m":128,"1600m":284,"3200m":624,"5000m":1019,"110m Hurdles":15.99,"300m Hurdles":41.5,"400m Hurdles":61,
    "High Jump":1.78,"Pole Vault":3.35,"Long Jump":6.1,"Triple Jump":12.5,"Shot Put":12.8,"Discus":39.62,"Hammer":42.67,"Javelin":39.62},
  w:{"100m":13.24,"200m":27.49,"400m":61.5,"800m":148,"1600m":360,"3200m":780,"5000m":1380,"100m Hurdles":16.99,"300m Hurdles":49.5,"400m Hurdles":71,
    "High Jump":1.47,"Pole Vault":2.74,"Long Jump":5.03,"Triple Jump":10.06,"Shot Put":9.14,"Discus":32,"Hammer":36.58,"Javelin":32}};
const canonEv=e=>{const l=String(e||"").toLowerCase();return EVENTS.find(x=>x.toLowerCase()===l)||e};   /* SEO pages store lowercase names */
function stdCheck(){if(ACC.member())return null;const run=S.run&&S.mark,e=canonEv(run?S.e:INT.me),g=run?S.g:INT.mg,mk=run?S.mark:INT.m,gr=+(S.gr||INT.gr);
  if(!e||!g||!mk||!(gr>=10&&gr<=12))return null;const std=PRSTD[g]&&PRSTD[g][String(e).replace(/ \(39"\)$/,"")],v=parse(mk,e);
  if(std==null||v==null)return null;return {e,g,mk:String(mk).trim(),gr,met:FIELD.has(e)?v>=std:v<=std}}
const likelyA=()=>{const c=stdCheck();return c&&c.met?c:null};
/* below the PR outreach standard (Ryan 2026-10-28 "bet send it": fewer low-fit leads for setters): evaluation offers become the free
   2-minute readiness check, which still sends anyone it qualifies to the evaluation. Skipped once the check is done on this browser,
   and for the chat (they asked for a person). Header and hero buttons stay the evaluation: those are their own choice. */
function lowFit(){const c=stdCheck();if(!c||c.met)return null;try{if(localStorage.getItem("prReadyDone"))return null}catch(e){}return c}
const qTag=()=>likelyA()?(INT.gpa==="yes"?"qA":"qM"):"";
window.prQ=()=>{try{return qTag()}catch(e){return ""}};
const keepQ=()=>{try{const q=qTag();if(q)localStorage.setItem("prQ",q);else localStorage.removeItem("prQ")}catch(e){}};
setTimeout(keepQ,0);   /* refresh the cached tag on every app load, so SEO pages carry it for returning visitors */
/* likely-A copy: their mark, how many programs it fits and where their grade sits on the recruiting clock. Facts only; human-copy rules. */
function aCopy(n){const a=likelyA();if(!a)return null;const N=n?` at ${n.toLocaleString()} programs`:"",ev=evSay(a.e);
  /* the grade line only when no search is on screen (with a search, the clock line under the body already says it) */
  const gl=S.run?"":a.gr===11?"College coaches can start contacting athletes after sophomore year, so junior year is when their lists get built. ":
    a.gr===12?"Senior year moves fast. Coaches are filling their last spots now. ":"College coaches can start contacting athletes after sophomore year. Getting on their lists early puts you first in line. ";
  return {t:`Your ${a.mk} ${ev} meets the standard${N}.`,b:`${gl}A free evaluation shows which of those coaches to contact first.`,
    bs:{none:`${gl}Coaches recruit the athletes they know about. A free evaluation shows which ones to contact first.`,some:`Interest is a good start. With a ${a.mk} ${ev}, a free evaluation shows how to turn it into offers.`,offers:`Offers mean options. A free evaluation shows who else would want a ${a.mk} ${ev} before you sign.`}}}
/* readiness offer: freshmen and marks not on any chart yet get the free 2-minute readiness check instead of the evaluation
   (nofit clicked 1 to 1.6%; the check gives them a plan and puts their answers on file for when they are a fit) */
function readyOffer(n,sfx){let done=false;try{done=!!localStorage.getItem("prReadyDone")}catch(e){}
  if(done)return n?null:{n,v:"nofit"+sfx,t:"Not on the chart yet? You are not the problem.",b:`Coaches recruit the athletes they know about. ${EVAL} which programs fit you today.`};
  return {n,v:"ready-"+(n?"early":"nofit")+sfx,ready:true,t:n?"You're early, and that's an advantage.":"Not on the chart yet? You are not the problem.",
    b:n?`Your ${S.mark.trim()} already meets the standard at ${n.toLocaleString()} programs. The 2-minute readiness check shows what to work on before coaches start calling.`:"The 2-minute readiness check shows where you stand today and what to work on next."}}
function offerCopy(){const v=parse(S.mark,S.e);if(v==null)return null;
  const all=SCH.filter(s=>tier(s,S.g,S.e,v)),n=all.length,T=all.filter(s=>tier(s,S.g,S.e,v)==="T").length,Rr=all.filter(s=>tier(s,S.g,S.e,v)==="R").length;
  const mk=S.mark.trim(), sfx=gsfx(), N=n.toLocaleString();
  if(!n||+S.gr===9){const r=readyOffer(n,sfx);if(r)return r}
  const nm=nearMiss(S.g,S.e,v), ls=(()=>{const x=INT.sch&&SCH.find(y=>y.n===INT.sch);return x&&tier(x,S.g,S.e,v)?x:null})();
  const bs={none:`Coaches recruit the athletes they know about. ${EVAL} which of these programs would want you.`,
    some:`Interest is a good start. ${EVAL} how to turn it into offers.`,
    offers:`Offers mean options. ${EVAL} who else would want you before you sign.`};
  {const ds=dreamSchool(),d=ds&&dreamCopy(ds,S.g,S.e,v);if(!BUCKET&&d)return {n,v:"dream-"+d.k+sfx,bs:dreamBs(d),t:d.t,b:d.b}}
  if(!BUCKET&&nm.n>=3) return {n,v:"nearmiss"+sfx,bs,t:`You're so close to the next level at ${nm.n} colleges.`,b:`A little more and a lot more coaches will want you. ${EVAL} where to focus next.`};
  if(!BUCKET&&!T&&!Rr) return {n,v:"walkon"+sfx,bs,t:`You meet the walk-on standard at ${N} programs.`,b:`${EVAL} which coaches could recruit you instead.`};
  if(!BUCKET&&ls) return {n,v:"school"+sfx,bs,t:`Your ${mk} meets ${ls.t||ls.n}'s standard.`,b:`${ls.t||ls.n}'s coaches recruit the athletes they know about. ${EVAL} if they'd want you.`};
  return {n,v:"intent"+sfx,bs,t:`Your ${mk} meets the standard at ${N} programs.`,b:bs.none};
}
let ARM=null;
/* polls the live results list (it is re-rendered after a search, so an observer on one node goes stale) */
function armOffer(){const o=offerCopy();if(!o||EV.shown||EV.dismissed)return;if(ARM)clearInterval(ARM.iv),clearTimeout(ARM.t);ARM={since:0};
  const fire=trig=>{if(!ARM)return;clearInterval(ARM.iv);clearTimeout(ARM.t);ARM=null;evalIn(o.t,o.b,0,o.v,trig,o.ready?null:o.bs)};
  if(!o.n){ARM.t=setTimeout(()=>fire("nofit"),3000);return}
  ARM.t=setTimeout(()=>fire("results-timer"),likelyA()?6000:12000);   /* fallback if they never scroll to the list */
  ARM.iv=setInterval(()=>{if(!ARM)return;if(!S.run||S.school!=null){clearInterval(ARM.iv);clearTimeout(ARM.t);ARM=null;return}
    const el=document.querySelector(".mtab"),r=el&&el.getBoundingClientRect(),inView=r&&r.top<innerHeight*0.55&&r.bottom>innerHeight*0.2;
    if(inView){if(!ARM.since)ARM.since=Date.now();else if(Date.now()-ARM.since>=1500)fire("results-seen")}else ARM.since=0},250)}
/* ---------- leaving? one last offer (Duolingo-style churn catch) ----------
   Desktop: the mouse heads for the tab bar. Phones: a fast scroll back up or 45 s idle on the results. Once per visit, never if an
   offer was already shown or dismissed, never in the first 20 s unless they searched. */
const EXIT={idle:null,lastY:scrollY,lastT:Date.now()};
function exitOffer(trig){
  if(EV.dismissed&&likelyA()){let used=true,out=0;try{used=sessionStorage.getItem("prA2")==="1";out=+sessionStorage.getItem("prEvalOutAt")||0}catch(e){}
    const blocked=ACC.tier()==="C"||ACC.isOpen()||document.getElementById("prnudge")||document.documentElement.classList.contains("onbon")||(ACC.signedIn()&&!ACC.member())||(S.school!=null&&(!SCH[S.school]||SCH[S.school].j));
    if(!used&&!blocked&&out&&Date.now()-out>60000){try{sessionStorage.setItem("prA2","1")}catch(e){}EV.dismissed=false;EV.shown=false}}
  if(EV.shown||EV.dismissed)return;if(S.school!=null){const s=SCH[S.school];if(!s||s.j)return;const nm=s.t||s.n;EV.force=true;
    const dv=INT.e&&INT.m?parse(INT.m,INT.e):null,d=dv!=null?dreamCopy(s,INT.g||S.g,INT.e,dv):null;
    if(d)evalIn(d.t,d.b,0,"school-exit-dream-"+d.k+gsfx(),trig,dreamBs(d));else evalIn(`Does ${nm} know your name?`,`Coaches recruit the athletes who reach out. ${EVAL} if ${nm} would want you.`,0,"school-exit"+gsfx(),trig,null);return}if(!S.run&&Date.now()-T0<20000)return;
  const o=S.run?offerCopy():null;
  /* no search yet: speak to the high school athlete about their own event when we know it (Ryan 2026-10-17: simpler, ICP-specific) */
  const ie=INT.e?evSay(INT.e):"";
  evalIn(o&&o.n?`${o.n.toLocaleString()} programs fit your ${S.mark.trim()}.`:"Talent gets you the offer. Visibility gets you in the room.",
    o&&o.n?`Before you go: ${EVAL.toLowerCase()} which of them would want you. It takes about a minute.`:`${EVAL} which college programs would want you${ie?` for the ${ie}`:""}. It takes about a minute.`,0,"exit"+(o?"-"+o.v:""),trig,o&&o.bs)}
document.addEventListener("mouseout",e=>{if(!e.relatedTarget&&e.clientY<=0&&innerWidth>=700)exitOffer("exit-desktop")});
addEventListener("scroll",()=>{const now=Date.now(),dy=scrollY-EXIT.lastY,dt=Math.max(now-EXIT.lastT,1);EXIT.lastY=scrollY;EXIT.lastT=now;
  if(innerWidth<700&&S.run&&scrollY>400&&dy/dt*1000<-2500)exitOffer("exit-scrollup")},{passive:true});
const resetIdle=()=>{clearTimeout(EXIT.idle);if(S.run)EXIT.idle=setTimeout(()=>exitOffer("exit-idle"),45000)};
["scroll","pointerdown","keydown","touchstart"].forEach(t=>addEventListener(t,resetIdle,{passive:true}));
/* ---------- were these results helpful? (yes = thanks, no = fixed reasons that feed the content list) ---------- */
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-hlp],[data-fb]");if(!b)return;const box=$("hlp");
  if(b.dataset.hlp==="up"){log("feedback",{detail:"helpful",event:S.e});box.innerHTML="<span>Thanks. Good luck this season.</span>";return}
  if(b.dataset.hlp==="down"){log("feedback",{detail:"not-helpful",event:S.e});box.innerHTML=`<span>What was missing?</span>${[["wrong-mark","My event or mark looks off"],["missing-school","A school I want isn't here"],["division-info","I wanted more D2, D3 or NAIA info"],["other","Something else"]].map(([k,l])=>`<button type="button" class="hbtn" data-fb="${k}">${l}</button>`).join("")}`;return}
  if(b.dataset.fb){log("feedback",{detail:b.dataset.fb,event:S.e});box.innerHTML="<span>Thanks. That helps us fix it.</span>"}});
/* ---------- Recruitment Evaluation slide-in ---------- */
const EV={shown:false,dismissed:false,t:null,v:null,trig:null};
try{EV.dismissed=sessionStorage.getItem("prEvalDismissed")==="1"}catch(e){}
/* v = copy variant, logged with shown/clicked so the admin report compares conversion per copy, event group and grade */
const TIERB={gpa:"Your grades already help you with coaches. A free evaluation shows which programs fit your marks now and how close you are to being recruited.",
  grow:"Coaches look at your grades and your marks together. A free evaluation shows which programs fit you today and what to work on next."};
/* level copy for qualified accounts: their best mark against the levels they picked (all four when none picked), the grade they're in,
   and how much a scholarship matters. Facts only: counts from this site's standards and NCAA contact timing. human-copy rules. */
const DMAP={D1:"NCAA D1",D2:"NCAA D2",D3:"NCAA D3",NAIA:"NAIA"};
function qualCopy(){if(!ACC.member()||!["A+","A"].includes(ACC.tier()))return null;const P=ACC.profile()||{},kid=pickKid(),g=kid?kid.gender:P.gender,marks=kid?kid.marks:ACC.myMarks();if(!g||!marks||!marks.length)return null;
  const want=(P.target_divisions||[]).map(d=>DMAP[d]).filter(Boolean),pool=want.length?want:DIVS;let best=null;
  for(const m of marks){if(m.v==null||isNaN(m.v))continue;let T=0,R=0;SCH.forEach(x=>{if(x.j||!pool.includes(x.d))return;const t=tier(x,g,m.e,m.v);if(t==="T")T++;else if(t==="R")R++});if(!best||T+R>best.n)best={m,n:T+R,T}}
  if(!best||!best.n)return null;const who=kid?`${kid.first_name}'s`:"Your",mk=FIELD.has(best.m.e)?best.m.v.toFixed(2)+"m":fmtT(best.m.v),gr=String(kid?kid.grade:P.grade||"");
  const where=pool.length===1?` ${pool[0]}`:"",t=`${who} ${mk} ${hsName(best.m.e,g)} is a Recruit mark${best.T?" or better":""} at ${best.n}${where} programs.`;
  const gl=gr==="11"?"College coaches can start contacting athletes after sophomore year, so junior year is when their lists get built. ":gr==="12"?"Senior year moves fast. ":"";
  const cost=P.scholarship_priority==="need"?" and which could help with cost":"",b=`${gl}A free evaluation shows which of those coaches to contact first${cost}.`;
  return {t,b,bs:{none:`Those coaches recruit the athletes they know about. A free evaluation shows which ones to contact first${cost}.`,some:"Interest is a good start. A free evaluation shows how to turn it into an offer.",offers:"Offers mean options. A free evaluation shows which programs fit best before you sign."}}}
/* behavior (Ryan 2026-10-25: "looking at school standards more than 5 times ... trigger specific outreach loops"): distinct schools viewed
   on this browser; a signed-in account also counts server-side (record_school_view stamps high_intent_at at 5). The 5th school opens
   one prompt (unless the visitor already closed one this visit); nothing is sent anywhere else. */
function schoolIntent(i){const s=SCH[i];if(!s)return;let seen=[];try{seen=JSON.parse(localStorage.getItem("prSeen")||"[]")}catch(e){}
  if(seen.includes(s.n))return;seen.push(s.n);try{localStorage.setItem("prSeen",JSON.stringify(seen.slice(-60)))}catch(e){}
  if(ACC.signedIn())ACC.core.api("/rest/v1/rpc/record_school_view",{method:"POST",body:{}}).catch(()=>{});
  if(seen.length!==5)return;log("school",{detail:"high-intent-5",school:s.n});
  if(EV.dismissed||s.j)return;EV.shown=false;EV.force=true;evalIn("You've compared five college programs.","A free evaluation shows which of them would want you and which coaches to contact first.",1800,"high-intent-5","high-intent")}
/* readiness entry under the search results, until the check is done on this browser */
const readyLink=()=>{try{if(localStorage.getItem("prReadyDone"))return ""}catch(e){}return `<button type="button" class="rqlink" data-ready>How ready are you for recruiting? Take the 2-minute check ›</button>`};
document.addEventListener("click",ev=>{if(ev.target.closest&&ev.target.closest("[data-ready]")){log("feedback",{detail:"readiness-link"});READY.go()}});
function evalIn(title,body,delay,v,trig,bs){
  if(EV.shown||EV.dismissed||ACC.tier()==="C"||ACC.isOpen()||document.getElementById("prnudge")||document.documentElement.classList.contains("onbon")||(ACC.signedIn()&&!ACC.member())) return; clearTimeout(EV.t);
  /* qualified accounts (Tier A/A+) hear about their own level (Ryan 2026-10-25: "copy that resonates with their specific recruitment level") */
  {const qc=(S.school==null||trig==="high-intent")&&!/^dream/.test(v||"")?qualCopy():null;if(qc){title=qc.t;body=qc.b;bs=qc.bs;v="qual-"+(v||"generic")}}
  {const ac=S.school==null&&!/^(dream|ready-|school|chat)/.test(v||"")&&!/^qual-/.test(v||"")?aCopy(S.run?(offerCopy()||{}).n:0):null;if(ac){title=ac.t;body=ac.b;bs=ac.bs;v="a-"+(v||"generic")}}
  {const lf=!/^(ready-|chat)/.test(v||"")?lowFit():null;if(lf){const ev=evSay(lf.e);title=`Where does your ${lf.mk} ${ev} stand for college?`;
    body="The 2-minute readiness check shows where you stand for college track and what to work on next.";bs=null;v="ready-low-"+(v||"generic")}}
  /* Tier B (GPA 2.3 to 2.99, or 3.0+ without a PR-standard mark yet): same headline, softer body (draft for Ryan's approval) */
  {const P=ACC.member()&&ACC.profile(),kid=pickKid();
   if(kid){const n=kid.first_name;title=title.replace(/^Your /,`${n}'s `).replace(/\byour\b/,`${n}'s`).replace(/^You're /,`${n} is `).replace(/^You /,`${n} `);
     const sw=t=>t&&t.replace(/would want you\b/g,`would want ${n}`).replace(/fit you\b/g,`fit ${n}`).replace(/\byour marks\b/g,`${n}'s marks`).replace(/recruit you\b/g,`recruit ${n}`);
     body=sw(body);if(bs)bs=Object.fromEntries(Object.entries(bs).map(([k,v])=>[k,sw(v)]))}
   else if(P&&P.role!=="parent"&&P.first_name&&/^Your /.test(title))title=`${P.first_name}, your ${title.slice(5)}`}
  if(ACC.tier()==="B"){const r=(ACC.profile()||{}).tier_reason||"";body=/^GPA 3\.0/.test(r)?TIERB.gpa:TIERB.grow;bs=null;v=(v||"generic")+"-b"}
  EV.t=setTimeout(()=>{if(EV.shown||EV.dismissed||(S.school!=null&&!EV.force)) return; EV.force=false; EV.v=v||"generic"; EV.ready=/^ready-/.test(EV.v); EV.trig=trig||"timer"; EV.title=title; EV.body=body; EV.bs=bs||null; openEval(true)},delay||0);
}
/* centre modal (Ryan 2026-10-16, e-commerce benchmarks: centre 6.84% vs bottom-corner 2.88%; multi-step +12%; click-triggered
   54%). Step 1 = one-tap "have coaches reached out?" (skipped once answered on this browser), step 2 = the tailored offer.
   Closing leaves a small pill that reopens it (click-triggered). Shown only after an action (search result seen, exit, pill),
   never on arrival, so it is not an intrusive interstitial for Google. */
const STATUS={none:"Not yet",some:"A few have",offers:"Yes, I have offers"};
const statusLine=k=>({none:"Coaches recruit the athletes they know about.",some:"Interest is a good start.",offers:"Offers mean options."})[k]||"";
/* step 2 copy: once the athlete has answered, their answer + one short line replaces the long body */
const evBody=()=>INT.rs&&EV.bs&&EV.bs[INT.rs]?EV.bs[INT.rs]:(EV.body||`${EVAL} which college programs would want you. It takes about a minute.`);
/* parents: the pop-up speaks about the kid whose event they're looking at, else their best-tier kid (Ryan: "your kids") */
const pickKid=()=>{const P=ACC.member()&&ACC.profile();if(!P||P.role!=="parent")return null;const ks=ACC.kids();if(!ks.length)return null;
  return ks.find(k=>k.gender===S.g&&k.marks.some(m=>m.e===S.e))||ks.find(k=>k.marks.some(m=>m.e===INT.e))||[...ks].sort((a,b)=>a.tier.localeCompare(b.tier))[0]};
/* dream-school copy (Ryan 2026-10-21: "use emotional hooks ... 'You are so close to reaching the standards for Harvard. Do you want help
   closing that gap?'"). The school = the athlete's own dream school (profile), else the school page they're on / last opened.
   Four lines by how close the mark is, no decimals on screen. A parent sees their athlete's name. human-copy rules. */
function dreamSchool(here){if(here!=null&&SCH[here])return SCH[here];const P=ACC.member()&&ACC.profile(),kid=pickKid(),names=(kid&&kid.dream_schools)||(P&&P.dream_schools)||[];
  for(const n of names){const x=SCH.find(y=>y.n===n&&!y.j);if(x)return x}const x=INT.sch&&SCH.find(y=>y.n===INT.sch&&!y.j);return x||null}
function dreamCopy(s,g,e,v){if(!s||v==null||!s[g])return null;const nm=s.t||s.n,t=tier(s,g,e,v),kid=pickKid(),who=kid&&kid.first_name;
  let lv=s[g][e],ev=e,vv=toCol(s,g,e,v);if(!lv){const c=convert(e,g,v)||[];const x=c.find(z=>s[g][z.e]);if(!x)return null;lv=s[g][x.e];ev=x.e;vv=x.v}
  const You=who?`${who} is`:"You're",yr=who?"Their":"Your";
  if(t==="T"||t==="R")return {k:"fit",t:who?`${who} already has what ${nm} looks for.`:`You already have what ${nm} looks for.`,b:`${nm}'s coaches recruit the athletes they know about. Want help getting on their radar?`};
  if(t)return {k:"range",t:`${You} in range for ${nm}.`,b:`${nm} could be a real option. Want help turning it into one?`};
  const L=lv.map(x=>x?parse(x,ev):null).filter(x=>x!=null);if(!L.length)return null;
  const F=FIELD.has(ev),walk=F?Math.min(...L):Math.max(...L),gap=F?(walk-vv)/walk:(vv-walk)/walk;
  if(gap<=(F?0.06:0.04))return {k:"close",t:`${You} so close to ${nm}.`,b:`${yr} dream school is within reach. Want help closing that gap?`};
  return {k:"far",t:`${nm} is worth chasing.`,b:`Athletes close gaps like this with the right plan. ${EVAL} what it would take.`}}
/* the step-2 body after "Have coaches contacted you yet?" keeps the dream-school line */
const dreamBs=d=>({none:d.b,some:`Interest is a good start. ${d.b}`,offers:`Offers mean options. ${d.b}`});
function eyebrow(){if(S.school!=null){const s=SCH[S.school];return s?`${s.t||s.n} · ${s.d}`:""}
  const P=ACC.member()&&ACC.profile(),kid=pickKid(),who=kid?kid.first_name:P&&P.role!=="parent"?P.first_name:null,yr=kid?kid.grad_year:P&&P.grad_year,cls=yr?`Class of ${yr}`:"";
  if(S.run&&S.mark)return who?`${who} · ${cls?cls+" · ":""}${S.e} ${S.mark.trim()}`:`${S.g==="w"?"Girls":"Boys"} ${S.e} · ${S.mark.trim()}${S.gr?` · ${S.gr}th grade`:""}`;
  if(who)return `${who}${cls?" · "+cls:""}${INT.e&&INT.m?` · ${INT.e} ${INT.m}`:""}`;
  return "Free recruitment evaluation"}
function openEval(log1){const el=$("eval");if(document.documentElement.classList.contains("onbon"))return;
  $("eve").textContent=eyebrow();$("evm").textContent=EV.title||"Talent gets you the offer. Visibility gets you in the room.";
  $("evp").textContent=evBody();const a=$("eva");a.href=EV.ready?"/readiness":quizFor();a.textContent=EV.ready?"Take the 2-minute readiness check":"Get my free evaluation";
  if(EV.ready)a.removeAttribute("target");else a.target="_blank";{const g=document.querySelector("#evs small");if(g)g.style.display=EV.ready?"none":""}
  const ck=S.run||S.school!=null?clock():"";$("evk").textContent=ck;$("evk").hidden=!ck||!!EV.ready;
  const ask=!INT.rs&&!EV.ready;$("evq").hidden=!ask;$("evs").hidden=ask;
  {const kid=pickKid(),ql=document.querySelector("#evq .evql"),o3=document.querySelector('[data-evq="offers"]');if(ql)ql.textContent=kid?`Have college coaches contacted ${kid.first_name} yet?`:"Have college coaches contacted you yet?";if(o3)o3.textContent=kid?"Offers already":"I have offers"}
  if(!ask&&!EV.ready&&likelyA()&&!INT.gpa)askGpa();
  el.classList.add("on");el.setAttribute("aria-hidden","false");$("evbg").hidden=false;requestAnimationFrame(()=>$("evbg").classList.add("on"));$("evpill").hidden=true;EV.shown=true;
  if(log1)log("popup_shown",{event:INT.e,placement:"popup",variant:EV.v,trig:EV.trig});
  setTimeout(()=>{try{el.focus({preventScroll:true})}catch(e){}},350)}
/* likely-A visitors: one tap for GPA (the other half of the Tier A rule), shown in the same question slot */
function askGpa(){const ql=document.querySelector("#evq .evql"),o=document.querySelector("#evq .evo");if(!ql||!o)return;if(!EV.gq)EV.gq=o.innerHTML;
  ql.textContent=pickKid()?"Is their GPA 3.0 or higher?":"Is your GPA 3.0 or higher?";
  o.innerHTML='<button type="button" data-evgpa="yes">Yes</button><button type="button" data-evgpa="no">Not yet</button><button type="button" data-evgpa="unsure">Not sure</button>';
  $("evq").hidden=false;$("evs").hidden=true}
function evalOut(){const el=$("eval");el.classList.remove("on");el.setAttribute("aria-hidden","true");$("evbg").classList.remove("on");setTimeout(()=>{if(!$("eval").classList.contains("on"))$("evbg").hidden=true},300);
  EV.dismissed=true;try{sessionStorage.setItem("prEvalDismissed","1");sessionStorage.setItem("prEvalOutAt",String(Date.now()))}catch(e){}
  if(S.school==null)$("evpill").hidden=false}
document.addEventListener("click",ev=>{
  const q=ev.target.closest("[data-evq]");if(q){INT.rs=q.dataset.evq;saveInt();log("feedback",{detail:"status-"+q.dataset.evq,event:INT.e});
    /* signed-in answers go on the profile too (2026-10-25: 116 profiles had no recruiting stage), so sales sees where each family is */
    {const st={none:"getting_started",some:"talking",offers:"offers"}[q.dataset.evq],u=ACC.signedIn()&&ACC.core.ses()&&ACC.core.ses().user;if(st&&u)ACC.core.api("/rest/v1/profiles?id=eq."+u.id,{method:"PATCH",body:{recruiting_stage:st},prefer:"return=minimal"}).catch(()=>{})}
    if(likelyA()&&!INT.gpa){askGpa();return}
    $("evp").textContent=evBody();$("eva").href=quizFor();$("evq").hidden=true;$("evs").hidden=false;return}
  const gq=ev.target.closest("[data-evgpa]");if(gq){INT.gpa=gq.dataset.evgpa;saveInt();keepQ();log("feedback",{detail:"gpa-"+INT.gpa,event:INT.e});
    const o=document.querySelector("#evq .evo");if(EV.gq){o.innerHTML=EV.gq;EV.gq=null}
    $("evp").textContent=evBody();$("eva").href=quizFor();$("evq").hidden=true;$("evs").hidden=false;return}
  if(EV.ready&&ev.target.closest("#eva")){ev.preventDefault();log("popup_click",{event:INT.e,placement:"popup",variant:EV.v,trig:EV.trig});evalOut();READY.go();return}
  if(ev.target.closest("#evlater")){evalOut();return}
  if(ev.target.id==="evbg"){evalOut();return}
  if(ev.target.closest("#evpill")){EV.v=(EV.v||"generic").replace(/^pill-/,"");EV.v="pill-"+EV.v;EV.trig="pill-click";openEval(true)}});
let scrolled=0,lastY=scrollY;
addEventListener("scroll",()=>{scrolled+=Math.abs(scrollY-lastY);lastY=scrollY;
  if(S.tab==="results"&&S.school==null&&scrolled>1400) {const gp=GRP(evLabel(R.ev||""))||topGrp();{let done=false;try{done=!!localStorage.getItem("prReadyDone")}catch(e){}
    if(done||likelyA())evalIn("Coaches recruit from lists like this one.",`${EVAL} where your marks fit and which programs would want you.`,0,gp?"results-"+gp:"results");
    else evalIn("Could you make a list like this one?","The 2-minute readiness check shows where you stand for college track and what to work on next.",0,"ready-results"+(gp?"-"+gp:"")+gsfx(),"results-scroll")}}},{passive:true});

/* ---------- Standards (the current site's flow, rebranded) ---------- */
const DEF={W:"The minimum mark required to earn a spot on the team.",R:"The range where coaches typically start recruiting conversations and scholarship discussions begin.",T:"The marks that typically grant a full-ride scholarship, depending on school funding."};
const levelsInfo=(side)=>`<span class="ci lvi${side?" "+side:""}"><button type="button" class="cib" data-cinfo aria-expanded="false" aria-label="What Target, Recruit and Walk-On mean">i</button><span class="cpop" role="tooltip"><b>What the levels mean</b><span class="lvrow T"><i></i><span><b>Target</b>${DEF.T}</span></span><span class="lvrow R"><i></i><span><b>Recruit</b>${DEF.R} Not a guarantee.</span></span><span class="lvrow W"><i></i><span><b>Walk-On</b>${DEF.W}</span></span></span></span>`;
const levels=()=>`<div class="levels"><h4>What the levels mean</h4><div class="lg3">
  <div class="lvc W"><b>Walk-On</b><p>${DEF.W}</p></div><div class="lvc R"><b>Recruit</b><p>${DEF.R}</p><em>Not a guarantee</em></div><div class="lvc T"><b>Target</b><p>${DEF.T}</p></div></div></div>`;
let CUR=[],IO=null;
function stdFor(s){const g=S.g;if(s[g][S.e])return [S.e,s[g][S.e]];const c=convert(S.e,g,parse(S.mark,S.e))||[];for(const x of c)if(s[g][x.e])return [x.e,s[g][x.e]];return [S.e,null]}
function cards(list,from,to){let o="";for(let k=from;k<Math.min(to,list.length);k++){const x=list[k],[ev,t]=stdFor(x.s),j={T:0,R:1,W:2}[x.t];
  o+=`<button class="mrow" data-school="${x.i}"><span class="mn"><b>${esc(x.s.n)}${star(x.s)}</b><small>${esc(x.s.d)} · ${esc(x.s.c)}</small></span><span class="mdv"><i>${esc(x.s.d.replace("NCAA ",""))}</i></span><span class="mc">${esc(x.s.c)}</span>
    <span class="mk">${t&&t[j]?(ev===S.e&&implC(x.s,S.g,ev)?`<span title="College ${IMPL[ev].col} standard: ${esc(t[j])}">${esc(hsThrow(x.s,S.g,ev,t[j]))}</span>`:ev!==S.e&&toHS(S.e,S.g,ev,parse(t[j],ev))!=null?`<span title="College ${esc(ev)} standard: ${esc(t[j])}">${fmtHS(toHS(S.e,S.g,ev,parse(t[j],ev)))}</span>`:esc(t[j])):"–"}</span><span><span class="pill2 ${x.t}">${TN[x.t]}</span></span></button>`}
  return o}
function watchMore(){if(IO){IO.disconnect();IO=null}const s=$("sent");if(!s||!("IntersectionObserver" in window))return;
  IO=new IntersectionObserver(es=>{if(!es.some(e=>e.isIntersecting))return;const from=S.n;S.n+=24;$("sgrid").insertAdjacentHTML("beforeend",cards(CUR,from,S.n));
    if(S.n>=CUR.length){IO.disconnect();IO=null;s.remove()}},{rootMargin:"600px 0px"});IO.observe(s)}
const iinfo=e=>`<span class="ci"><button type="button" class="cib" data-cinfo aria-expanded="false" aria-label="How we compare the ${esc(e)}">i</button><span class="cpop" role="tooltip"><b>${esc(IMPL[e].hs)} → ${esc(IMPL[e].col)}</b>${esc(IMPL[e].how)}<small>Every mark shown is in high school terms. Schools that publish their own standards are compared on their own number.</small></span></span>`;
const cinfo=(e,cl)=>`<span class="ci"><button type="button" class="cib" data-cinfo aria-expanded="false" aria-label="How we convert the ${esc(e)}">i</button><span class="cpop" role="tooltip"><b>${esc(e)} → ${esc(CONV[e].next?CONV[e].to+" / "+CONV[e].next.to:CONV[e].to)}</b>${esc(CONV[e].how)}${cl?`<span class="cvx2">Your mark in college terms: ${cl}</span>`:""}<small>College teams race different events, so we convert behind the scenes and show every standard as its ${esc(hsName(e,S.g))} equivalent. Schools that publish their own ${esc(hsName(e,S.g))} standard are shown with their own number.</small></span></span>`;
function standards(){
  const list=evs(S.g); if(!list.includes(S.e)) S.e=list[0];
  let o=`<div class="sec"><p class="lede">Select your gender, event, and enter your time to find the colleges that match you.</p>
  <form id="mf" class="panel"><div class="row">${seg("g",S.g)}
    <div class="evw"><label class="sr" for="ev">Event</label><select class="in" id="ev">${(()=>{const hs=HSE(S.g).filter(e=>list.includes(e)),more=list.filter(e=>!hs.includes(e)),op=e=>`<option value="${esc(e)}" ${e===S.e?"selected":""}>${esc(hsName(e,S.g))}</option>`;return hs.map(op).join("")+(more.length?`<optgroup label="More events">${more.map(op).join("")}</optgroup>`:"")})()}</select>${CONV[S.e]?cinfo(S.e):S.g==="m"&&IMPL[S.e]?iinfo(S.e):""}</div>
    <label class="sr" for="mk">Personal best</label><input class="in" id="mk" placeholder="PR, e.g. ${esc(ph(S.e))}" value="${esc(S.mark)}" autocomplete="off" inputmode="decimal">
    <div class="gseg" role="group" aria-label="Your grade"><span class="gl">Grade</span><div class="seg">${[9,10,11,12].map(n=>`<button type="button" data-grade="${n}" aria-pressed="${+S.gr===n}">${n}th</button>`).join("")}</div></div>
    <button class="go">Search colleges</button></div><div class="hint" id="hint"></div></form>`;
  /* order (Ryan 2026-10-13): search by stats · or · search one school · what the levels mean · results */
  o+=`<div class="orsep" role="separator"><span>or</span></div><div class="one"><h4>Search for one school</h4><p>${NSTD.toLocaleString()} colleges across NCAA D1, D2, D3 and NAIA, plus every NJCAA junior college.</p><div class="search">${MAG}<label class="sr" for="q">Search colleges</label><input class="in" id="q" placeholder="Try USC, Oregon or Ole Miss" autocomplete="off" value="${esc(S.q)}"><div id="drop"></div></div></div>`;
  if(S.run){
    const v=parse(S.mark,S.e),all=[];SCH.forEach((s,i)=>{const t=tier(s,S.g,S.e,v);if(t)all.push({s,i,t})});
    const ok=(x,skip)=>(skip==="d"||!S.div||x.s.d===S.div)&&(skip==="c"||!S.conf||x.s.c===S.conf)&&(skip==="t"||!S.f||x.t===S.f)&&(skip==="s"||!S.st||x.s.s===S.st);
    const sh=all.filter(x=>ok(x)).sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));CUR=sh;
    const opts=(skip,key)=>[...new Set(all.filter(x=>ok(x,skip)).map(key))].filter(Boolean);
    const dd=(id,label,cur,list,fmt=x=>x)=>`<label class="dd${cur?" on":""}"><span class="sr">${label}</span><select id="${id}"><option value="">${label}</option>${list.map(x=>`<option value="${esc(x)}" ${x===cur?"selected":""}>${esc(fmt(x))}</option>`).join("")}</select></label>`;
    const cl=convLine(S.e,S.g,v), c=k=>all.filter(x=>x.t===k).length;LASTSUM={mark:S.mark,e:S.e,g:S.g,n:all.length,T:c("T"),R:c("R"),W:c("W")};
    o+=`<div class="mhead"><p class="sum">${esc(S.mark)} in the ${S.g==="m"?"men's":"women's"} ${esc(hsName(S.e,S.g))} fits <b>${all.length}</b> colleges${CONV[S.e]?cinfo(S.e,cl):S.g==="m"&&IMPL[S.e]?iinfo(S.e):""}</p>
      <p class="mcount"><span class="lv T">${c("T")} Target</span><span class="lv R">${c("R")} Recruit</span><span class="lv W">${c("W")} Walk-On</span>${levelsInfo("left")}</p>${all.length?'<button type="button" class="shr" data-share><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>Share my results</button>':""}${`<div class="hlp" id="hlp"><span>Were these results helpful?</span><button type="button" class="hbtn" data-hlp="up">Yes</button><button type="button" class="hbtn" data-hlp="down">No</button></div>`}</div>
    ${readyLink()}${parentCard()}
    <section class="mtab" aria-label="Your college matches">
      <div class="mbar"><h3>Your college matches</h3><div class="dds">
        ${dd("fd","All divisions",S.div,DIVS.filter(d=>opts("d",x=>x.s.d).includes(d)))}
        ${dd("fc","All conferences",S.conf,opts("c",x=>x.s.c).sort())}
        ${dd("ft","All tiers",S.f,["T","R","W"].filter(k=>opts("t",x=>x.t).includes(k)),k=>TN[k])}
        ${dd("fs","All states",S.st,opts("s",x=>x.s.s).sort())}
        ${S.div||S.conf||S.f||S.st?'<button class="clr" data-clear>Clear</button>':""}</div></div>
      <div class="mrow mh" aria-hidden="true"><span>School</span><span>Division</span><span>Conference</span><span class="mk">Mark to hit</span><span>Your level ${levelsInfo()}</span></div>
      ${sh.length?(()=>{const cap=ACC.member()?S.n:Math.min(S.n,ACC.LIMITS.standards);return `<div id="sgrid">${cards(sh,0,cap)}</div>${!ACC.member()&&sh.length>cap?ACC.wall("standards",sh.length):sh.length>cap?'<div class="sent" id="sent" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>':""}`})():'<p class="empty">No colleges match these filters.</p>'}
      <p class="vnote"><span class="star">★</span> Official standards, published by the school and verified by Preferred Recruit. Most other colleges are set from their 2026 conference results; a few without either are marked as estimates.</p>
    </section>`;
  }
  return o+`</div>`;
}
function hits(q){q=q.trim().toLowerCase().replace(/\s+/g," ");if(q.length<2)return [];const ws=q.split(" ");
  return SCH.map((s,i)=>{let b=0;if(s.a.includes(q))b=100;else if(ACR[i]===q)b=92;else if(s.a.some(a=>a.startsWith(q)))b=80;else if(ws.every(w=>TOK[i].some(t=>t.startsWith(w))))b=60;
    return [b?b+(s.o?3:0)+(s.d==="NCAA D1"?2:s.d==="NCAA D2"?1:0):0,i]}).filter(x=>x[0]).sort((a,b)=>b[0]-a[0]||SCH[a[1]].n.localeCompare(SCH[b[1]].n)).slice(0,8).map(x=>[SCH[x[1]],x[1]])}
/* official charts from 2024 (Ryan 2026-10-19: no 2025-27 chart found -> say so professionally) */
const oldChart=s=>!!(s.o&&!s.cv&&+s.yr&&+s.yr<=2024),OLDNOTE=s=>oldChart(s)?` These are the most recent standards the program has published (${s.yr}). Current requirements may differ, so confirm with the coaching staff.`:"";
const star=s=>s.o?'<span class="star" title="Official standards, verified">★</span>':"";
/* Team search (Ryan 2026-10-20: "the same smooth experience as the standards search"): same matcher (hits), same live dropdown that
   updates in place while typing (no page redraw), school logo on every row, arrow keys + Enter, Escape closes. */
const TQ={v:""};
const tlogo=s=>{const B=brandOf(s);return B&&B.logo&&!B.hide_logo?`<img class="dlogo" src="${esc(B.logo)}" alt="" width="32" height="32" loading="lazy">`:`<i class="dlogo dini" aria-hidden="true">${esc((s.t||s.n).replace(/\(.*?\)/g,"").split(/[^A-Za-z&]+/).filter(w=>w&&!/^(of|the|at|and|in|for|university|college)$/i.test(w)).map(w=>w[0]).join("").slice(0,3).toUpperCase())}</i>`};
/* athletes in the search dropdown (Ryan 2026-10-23: "individuals from smaller schools are not appearing when searching by name"):
   every athlete on this season's national list, any event, men and women, not just the event on screen */
const AIDX=new WeakMap();   /* keyed by the loaded season object, so the wind toggle gets its own index */
function athIdx(key){const D=CACHE[key];if(!D||D.err)return null;if(AIDX.has(D))return AIDX.get(D);const li=Math.max(0,D.lists.findIndex(z=>z.nat)),L=D.lists[li],best=new Map();
  for(const g of ["m","w"])for(const [ev,rows] of Object.entries(L.g[g]||{})){if(/Relay/.test(ev))continue;rows.forEach((r,i)=>{if(!r[1])return;const k=r[1].toLowerCase()+"|"+r[3]+"|"+g,b=best.get(k);if(!b||r[0]<b.r[0])best.set(k,{li,g,ev,i,r,t:r[1].toLowerCase().split(/[^a-z0-9']+/).filter(Boolean)})})}
  const out=[...best.values()];AIDX.set(D,out);return out}
function athHits(q){const key=curKey();if(!key||q.length<3)return [];const X=athIdx(key);if(!X)return [];const ws=q.toLowerCase().split(/\s+/).filter(Boolean);
  return X.filter(a=>ws.every(w=>a.t.some(t=>t.startsWith(w)))).sort((a,b)=>a.r[0]-b.r[0]).slice(0,8)}
/* every athlete 2016-today by name (/data/career/names/<2 letters>.dat), for people not in the season on screen */
const NAMES={},NAMEL={};
function loadNames(t){if(NAMES[t]||NAMEL[t])return;NAMEL[t]=fetch("/data/career/names/"+t+".dat").then(r=>{if(!r.ok||typeof DecompressionStream==="undefined")throw 0;return unpack(r)}).then(j=>{NAMES[t]=j}).catch(()=>{NAMES[t]=[]}).then(()=>{const i=$("rq");if(i&&document.activeElement===i)teamDrop("rq")})}
function nameHits(q,skip){const ws=q.toLowerCase().split(/\s+/).map(w=>w.replace(/[^a-z']/g,"")).filter(Boolean);if(!ws.length||q.length<3)return [];const t=ws[ws.length-1].replace(/[^a-z]/g,"").slice(0,2);if(t.length<2)return [];
  if(!NAMES[t]){loadNames(t);return []}
  return NAMES[t].filter(e=>!skip.has(e[1])&&ws.every(w=>e[0].toLowerCase().split(/[^a-z0-9']+/).some(x=>x.startsWith(w)))).sort((a,b)=>b[3].localeCompare(a[3])).slice(0,8)}
function teamDrop(id){const el=$(id+"d"),inp=$(id);if(!el||!inp)return;const q=inp.value.trim();if(id==="tq")TQ.v=inp.value;const h=hits(q.toLowerCase());
  if(id==="rq"){const A=athHits(q),D=CACHE[curKey()],G=nameHits(q,new Set(A.map(a=>String(a.r[9]).split("/")[0])));if(!h.length&&!A.length&&!G.length){el.innerHTML="";return}
    const ah=A.length?`<p class="dhd">Athletes</p>${A.map(a=>`<button type="button" role="option" data-rath="${a.li}|${a.g}|${esc(a.ev)}|${a.i}"><i class="dlogo dini" aria-hidden="true">${esc(a.r[1].split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase())}</i><em>${esc(a.r[1])}</em><span>${esc(D.teams[a.r[3]])} · ${a.g==="m"?"Men's":"Women's"} ${esc(evLabel(a.ev))} ${esc(a.r[4])}<b>Athlete ›</b></span></button>`).join("")}`:"";
    const gh=G.length?`<p class="dhd">Other seasons</p>${G.map(e=>`<button type="button" role="option" data-gath="${esc(e[1])}|${esc(e[3])}|${esc(e[4])}"><i class="dlogo dini" aria-hidden="true">${esc(e[0].split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase())}</i><em>${esc(e[0])}</em><span>${esc(tcanon(e[2]))} · ${esc(seasonLabel(e[3]))} · ${esc(e[4].replace("NCAA ",""))}<b>Athlete ›</b></span></button>`).join("")}`:"";
    if(!h.length){el.innerHTML=`<div class="drop tdrop" role="listbox">${ah}${gh}</div>`;return}
    el.innerHTML=`<div class="drop tdrop" role="listbox"><p class="dhd">Schools</p>${h.map(([x,i],k)=>`<button type="button" role="option" data-tpage="${i}" class="${k===0?"on":""}">${tlogo(x)}<em>${esc(x.n)}</em><span>${esc(x.d.replace("NCAA ",""))}${x.c&&x.c!==x.d?" · "+esc(x.c):""}<b>Team ›</b></span></button>`).join("")}${ah}${gh}</div>`;return}
  const cmk=/^cms[ab]$/.test(id)?"s"+id[3]:null;
  el.innerHTML=h.length?`<div class="drop tdrop" role="listbox">${id==="rq"?'<p class="dhd">Schools</p>':""}${h.map(([x,i],k)=>`<button type="button" role="option" ${cmk?`data-cmpick="${cmk}|${i}"`:`data-tpage="${i}"`} class="${k===0?"on":""}">${tlogo(x)}<em>${esc(x.n)}</em><span>${esc(x.d.replace("NCAA ",""))}${x.c&&x.c!==x.d?" · "+esc(x.c):""}${cmk?"":"<b>Team ›</b>"}</span></button>`).join("")}</div>`
    :(q.length>1?'<div class="drop"><p class="none">No team matches that. Try the full name or a short name like USC.</p></div>':"")}
document.addEventListener("keydown",ev=>{const id=ev.target&&ev.target.id;if(!["q","tq","tq2","rq","cmsa","cmsb"].includes(id))return;const box=$(id==="q"?"drop":id+"d");const bs=box?[...box.querySelectorAll("button")]:[];
  if(ev.key==="Escape"){if(box)box.innerHTML="";return}if(!bs.length)return;let k=bs.findIndex(b=>b.classList.contains("on"));
  if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ev.preventDefault();k=ev.key==="ArrowDown"?Math.min(bs.length-1,k+1):Math.max(0,k-1);bs.forEach((b,j)=>b.classList.toggle("on",j===k));bs[k].scrollIntoView({block:"nearest"})}
  else if(ev.key==="Enter"){ev.preventDefault();(bs[k]||bs[0]).click()}});
document.addEventListener("click",ev=>{if(CM.edit&&!ev.target.closest(".cmsearch,[data-cmedit]")&&SCH[CM[CM.edit]]){CM.edit=null;render()}if(!ev.target.closest(".search"))["drop","tqd","tq2d","rqd","cmsad","cmsbd"].forEach(x=>{const e=$(x);if(e)e.innerHTML=""})});
function drop(){const el=$("drop");if(!el)return;const h=hits(S.q.trim().toLowerCase());el.innerHTML=h.length?`<div class="drop">${h.map(([s,i],k)=>`<button data-school="${i}" class="${k===0?"on":""}">${tlogo(s)}<em>${esc(s.n)}${star(s)}</em><span>${s.d} · ${esc(s.c)}</span></button>`).join("")}</div>`:(S.q.trim().length>1?'<div class="drop"><p class="none">No college matches that. Try the full name or a short name like USC.</p></div>':"")}
const disp=(s,g,e,i)=>{const o=(s.om||{})[g]||{};if(o[e])return esc(o[e][i]||"–");if(s.em)return esc(((s[g][e]||[])[i])||"–");const c=(((CT[s.ck]||{})[g]||{})[e]||[])[i];return c?(c[1]?`${esc(c[1])} <small>${esc(c[0])}</small>`:esc(c[0]))+(c[2]?'<sup class="dest" title="Too few athletes in this conference event to set it, so this is the division median">est</sup>':""):"–"};
/* Power 4 (Ryan 2026-10-22): no Walk-On level; Target = middle of the conference's 8th-10th best marks, Recruit = middle of the 15th-25th (scripts/data/power4_levels.py) */
const isP4=s=>!!s&&(CT[s.ck]||{}).rule==="p4",P4TXT="Power 4 conferences (ACC, Big Ten, Big 12, SEC) have no Walk-On level here: Target is the middle of the 8th to 10th best marks, Recruit the middle of the 15th to 25th.";
function ruleText(s){if(isP4(s)&&!s.o)return `In the ${esc(s.c)}, a Power 4 conference, there is no Walk-On level. Target is the middle of the 8th to 10th best marks in the conference this season, Recruit the middle of the 15th to 25th.`;if(s.est)return `These are Preferred Recruit estimates for ${esc(s.n)}. Its conference has no 2026 results list on TFRRS, so they can't be set from conference marks yet.`;const [t,r,w]=RULES[s.d]||[];const c=esc(s.c);
  if(!r) return `${s.d==="NCAA D3"?"NCAA D3 programs don't give athletic scholarships, so every athlete is effectively a walk-on. ":""}Target is a top-${t} mark in the ${c} this season. Walk-On is the ${ord(w)}-best mark (or the last one listed).`;
  return `Target is the ${ord(t)}-best mark in the ${c} this season, Recruit the ${ord(r)}, Walk-On the ${ord(w)}.`}
const slugx=x=>String(x).toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const ST_NAME={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington DC",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",BC:"British Columbia"};
const confUrl=s=>{const dup=SCH.some(x=>x.c===s.c&&x.d!==s.d);return `/conferences/${slugx(s.c)}${dup?"-"+slugx(s.d):""}-track-standards.html`};
const stateUrl=st=>`/states/${slugx(ST_NAME[st]||st)}-college-track-and-field.html`;
/* common questions + related programs (same text the pre-built page and its FAQ structured data carry) */
const FAQ_EV=["100m","200m","400m","800m","1500m","5000m","110m Hurdles","100m Hurdles","Long Jump","High Jump","Shot Put"];
/* previous years (Ryan 2026-10-25): the school's older published charts, one collapsed row; never the current levels */
function schoolArch(s){const A=s.arch||[];if(!A.length)return "";const g=S.g;
  const t=e=>e[g]?`<div class="scroll" style="margin-top:8px"><table><thead><tr><th>Event</th>${e[g].tiers.map(x=>`<th class="num">${esc(String(x).replace(/^(men's|women's|men|women)\s+/i,"").replace(/\s+standards?$/i,""))}</th>`).join("")}</tr></thead><tbody>${e[g].rows.map(r=>`<tr><td>${esc(r[0])}</td>${e[g].tiers.map((_,i)=>`<td class="num">${esc(r[i+1]||"–")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="tbp">No ${g==="m"?"men's":"women's"} chart in this one.</p>`;
  return `<details class="fold"><summary>Previous years<small>${A.map(e=>esc(e.yr)).join(" · ")}</small></summary><p class="tbp">Charts ${esc(s.t||s.n)} published on its own site before 2024, checked mark for mark. For comparison only: the levels above are current.</p>${A.map(e=>`<h4 class="arch-h">${e.yr==="Undated"?"Undated chart":esc(e.yr)+" chart"}</h4>${t(e)}${e.src?`<p class="gsrc"><a href="${esc(e.src)}" target="_blank" rel="noopener">Source: ${esc(s.t||s.n)} athletics</a></p>`:""}`).join("")}</details>`}
function schoolExtra(s){const lvl="Walk-On",i=SCH.indexOf(s);
  const mk=g=>FAQ_EV.map(e=>{const t=s[g][e];return t&&t[2]?`${e} ${t[2]}`:null}).filter(Boolean).slice(0,6),m=mk("m"),w=mk("w");
  const q=[[`What are the ${s.n} track and field recruiting standards?`,s.j?`${s.n} is an NJCAA junior college program${s.s?` in ${ST_NAME[s.s]||s.s}`:""}. This site doesn't set Target, Recruit or Walk-On levels for junior colleges, because NJCAA competition is national rather than conference-based and a program's marks can't be predicted reliably. Its season bests are above, and the full NJCAA national list is in Results.`:`${s.n} is ${/^[AEIOUN]/.test(s.d)?"an":"a"} ${s.d} program${s.c!==s.d?` in the ${s.c}`:""}. ${s.o?`Its standards come from the school's own published chart${s.yr?` (${s.yr})`:""}.${OLDNOTE(s)}`:s.est?"Its levels are estimates: the typical marks across its division, because the school doesn't publish standards and its conference has no championship results to set them from.":"Its Target, Recruit and Walk-On levels are set from 2026 conference results."} The full table for men and women is above.`]];
  if(!s.j&&(m.length||w.length))q.push([`What times do you need to walk on at ${s.n}?`,[m.length?`Men's ${lvl}: ${m.join(", ")}.`:"",w.length?`Women's ${lvl}: ${w.join(", ")}.`:""].filter(Boolean).join(" ")]);
  q.push([`What conference is ${s.n} track and field in?`,`${s.n} competes in ${s.c!==s.d?`the ${s.c} (${s.d})`:s.j?"the NJCAA (junior colleges compete nationally)":`the ${s.d}`}${s.s?` and is based in ${ST_NAME[s.s]||s.s}`:""}.`]);
  const conf=SCH.map((x,k)=>[x,k]).filter(([x,k])=>k!==i&&x.d===s.d&&x.c===s.c).sort((a,b)=>a[0].n.localeCompare(b[0].n)).slice(0,12);
  const st=s.s?SCH.map((x,k)=>[x,k]).filter(([x,k])=>k!==i&&x.s===s.s&&!(x.d===s.d&&x.c===s.c)).sort((a,b)=>a[0].n.localeCompare(b[0].n)).slice(0,12):[];
  /* folds (Ryan 2026-10-16: "less cluttered but still have all of the back links"): every link and answer stays in the page
     (search engines read collapsed <details>), each section is one tap-to-open row */
  const list=(t,L)=>L.length?`<details class="fold"><summary>${t}<small>${L.length}</small></summary><div class="rel">${L.map(([x,k])=>`<button type="button" data-school="${k}">${esc(x.n)}<small>${esc(x.d)}</small></button>`).join("")}</div></details>`:"";
  return `<details class="fold faq"><summary>Common questions<small>${q.length}</small></summary>${q.map(([a,b])=>`<details><summary>${esc(a)}</summary><p>${esc(b)}</p></details>`).join("")}</details>`+(conf.length||st.length?`<details class="fold"><summary>Similar programs<small>${conf.length+st.length}</small></summary>${conf.length?`<h4 class="relh">${esc(s.c)}</h4><div class="rel">${conf.map(([x,k])=>`<button type="button" data-school="${k}">${esc(x.n)}<small>${esc(x.d)}</small></button>`).join("")}</div>`:""}${st.length?`<h4 class="relh">More in ${esc(ST_NAME[s.s]||s.s||"")}</h4><div class="rel">${st.map(([x,k])=>`<button type="button" data-school="${k}">${esc(x.n)}<small>${esc(x.d)}</small></button>`).join("")}</div>`:""}</details>`:"")}
function schoolMore(s){const L=[`<a href="${confUrl(s)}">All ${esc(s.c)} schools</a>`];if(s.s)L.push(`<a href="${stateUrl(s.s)}">Colleges in ${esc(ST_NAME[s.s]||s.s)}</a>`);
  L.push(s.j?`<a href="/guides/junior-college-track-and-field-recruiting.html">Junior college recruiting guide</a>`:`<a href="/standards/${slugx(s.d)}-mens-400m.html">${esc(s.d)} standards by event</a>`,`<a href="/explore.html">Every conference and state</a>`);return `<nav class="more" aria-label="Explore"><h3 class="moreh">Explore</h3><ol>${L.map(a=>`<li>${a}</li>`).join("")}</ol></nav>`}
function schoolLinks(s){const L=[];
  if(s.o&&s.src)L.push(`<a class="sl off" href="${esc(s.src)}" target="_blank" rel="noopener">★ Official standards</a>`);
  if(s.rs)L.push(`<a class="sl" href="${esc(s.rs)}" target="_blank" rel="noopener">Track &amp; field roster</a>`);
  if(s.cu&&s.cu!==s.rs)L.push(`<a class="sl" href="${esc(s.cu)}" target="_blank" rel="noopener">${/roster/i.test(s.cu)?"Roster":"Coaching staff"}</a>`);
  if(s.ws)L.push(`<a class="sl" href="${esc(s.ws)}" target="_blank" rel="noopener">Athletics site</a>`);
  if(s.u)L.push(`<a class="sl" href="${esc(s.u)}" target="_blank" rel="noopener">TFRRS team page</a>`);
  return L.length?`<nav class="slinks" aria-label="${esc(s.n)} links">${L.join("")}</nav>`:""}
/* "Where do you stand at {School}?" (Ryan 2026-10-16): the athlete's own mark against this program, then a school-specific offer.
   Visitor-initiated, so the offer may open on a school page (click-triggered offers convert best in the e-commerce data). */
const SCK={e:null,mark:"",res:null};
function schoolCheck(s,g){const list=evs(g).filter(e=>s[g][e]||(CONV[e]&&s[g][CONV[e].to]));if(!list.length)return "";
  if(!list.includes(SCK.e))SCK.e=list.includes(INT.e)?INT.e:list.includes(S.e)?S.e:list[0];
  const nm=s.t||s.n,r=SCK.res;
  return `<form class="schk" id="schk"><b>Where do you stand at ${esc(nm)}?</b><div><label class="sr" for="schke">Event</label><select id="schke" class="in">${list.map(e=>`<option value="${esc(e)}" ${e===SCK.e?"selected":""}>${esc(hsName(e,g))}</option>`).join("")}</select><label class="sr" for="schkm">Your mark</label><input id="schkm" class="in" placeholder="Your PR, e.g. ${esc(ph(SCK.e))}" value="${esc(SCK.mark)}" autocomplete="off" inputmode="decimal"><button class="go">Check</button></div>${r?`<p class="schkr ${r.cls}">${r.html}</p>`:""}</form>`}
function schoolResult(s,g){const e=SCK.e,v=parse(SCK.mark,e);if(v==null)return {cls:"bad",html:`Enter a mark like ${esc(ph(e))}.`};
  const direct=s[g][e],cv=!direct&&CONV[e]?convert(e,g,v):null,std=direct||(cv&&s[g][cv[0].e]),ev2=direct?e:cv&&cv[0].e,vv=direct?toCol(s,g,e,v):cv&&cv[0].v;
  if(!std)return {cls:"bad",html:"No standard listed for that event here."};
  const t=tier0(std,ev2,vv),F=FIELD.has(ev2),nx=t===null?2:t==="W"?1:t==="R"?0:-1,nm=esc(s.t||s.n);
  let next="";if(nx>=0&&std[nx]){const th=parse(std[nx],ev2);if(th!=null){const d=F?th-vv:vv-th;if(d>0){const dh=ev2!==e&&!F?Math.abs(toHS(e,g,ev2,th)-v):d;next=` You're ${fmtGap(ev2,dh)} from ${TN["TRW"[nx]]} level.`}}}
  return {t,cls:t?"ok":"no",html:t?`Your ${esc(SCK.mark.trim())} is <b>${TN[t]}</b> level at ${nm}.${next}`:`Your ${esc(SCK.mark.trim())} isn't on ${nm}'s chart yet.${next}`};}
/* school branding (Ryan 2026-10-16, approved: school logo + colours on its page, Preferred Recruit identity kept).
   /brand/brand.json comes from scripts/brand/harvest.py (colours from each school's athletics site, contrast-checked: ink = text-safe
   on white, on = text colour on the band). Schools without data keep the default look. Logos only identify the program; a takedown
   sets hide_logo in scripts/brand/overrides.json. Our purple stays on every evaluation button. */
let BR=null,BRL=false;
function loadBrand(){if(BRL)return;BRL=true;fetch("/brand/brand.json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>{BR=j||{};if(S.school!=null){BRQ=true;render()}})}
let BRQ=false;   /* the re-render after brand data arrives skips the entrance fade (no double fade) */
if(/^\/schools\//.test(location.pathname))loadBrand();
function brandOf(s){if(BR===null){loadBrand();return null}
  const b=BR[(s.os&&s.os[0])||slugOf(s.n)];return b&&b.primary?b:null}
const schoolAbout=(s,vf="")=>`<section class="sabout"><details class="fold"><summary>About ${esc(s.n)}</summary><p class="intro">${esc(s.n)} is ${/^(NCAA|NAIA|NJCAA)/.test(s.d)?"an":"a"} ${esc(s.d)}${s.j?" junior college":""} track and field program${s.c!==s.d?` in the ${esc(s.c)}`:""}${s.s?`, based in ${esc(ST_NAME[s.s]||s.s)}`:""}. ${s.j?"Junior colleges compete nationally rather than in conferences, so this site shows its season results instead of predicted recruiting levels.":`These are the marks it takes to be a Target recruit, a Recruit or a Walk-On for ${(s.ng||[])[0]?((s.ng[0]==="m")?"women":"men"):"men and women"} in every event${s.o?", taken from the school's own published standards":""}.`}</p>${vf}</details></section>`;   /* link-button row removed (Ryan 2026-10-25: "not clogging the website with ... visible links"); the static page keeps them */
const brandNote=(s,B)=>B?`<p class="bnote">School names, logos and colours belong to their institutions and are used only to identify the program. Preferred Recruit is not affiliated with or endorsed by ${esc(s.n)}.</p>`:"";
/* school-page offer (Ryan 2026-10-17: "use a pop-up for that content", keep the page surface clean). Opens once the visitor has
   scrolled past the standards table (held 1.2 s), once per visit, same modal + rules as everywhere else. */
let SARM=null;
function armSchoolOffer(i){clearInterval(SARM);const s=SCH[i];if(!s||s.j||EV.shown||EV.dismissed)return;let since=0;
  const nm=s.t||s.n;
  const bs={none:`Coaches recruit the athletes who reach out. ${EVAL} if ${nm} would want you.`,some:`Interest is a good start. ${EVAL} how to turn it into an offer from ${nm}.`,offers:`Offers mean options. ${EVAL} if ${nm} would want you before you sign.`};
  SARM=setInterval(()=>{if(S.school!==i||EV.shown||EV.dismissed){clearInterval(SARM);return}
    const t=document.querySelector(".simple .scroll"),r=t&&t.getBoundingClientRect();if(!r)return;
    if(r.bottom<innerHeight*.6){if(!since)since=Date.now();else if(Date.now()-since>1200){clearInterval(SARM);EV.force=true;
      const dv=INT.e&&INT.m?parse(INT.m,INT.e):null,d=dv!=null&&!BUCKET?dreamCopy(s,INT.g||S.g,INT.e,dv):null;
      if(d)evalIn(d.t,d.b,0,"school-dream-"+d.k+gsfx(),"school-scroll",dreamBs(d));
      else evalIn(`Does ${nm} know your name?`,`Coaches recruit the athletes who reach out. ${EVAL} if ${nm} would want you.`,0,"school-page"+gsfx(),"school-scroll",bs)}}else since=0},300)}
function school(){const s=SCH[S.school];if((s.ng||[]).includes(S.g))S.g=S.g==="m"?"w":"m";const g=S.g,src=(CT[s.ck]||{}).src,B=brandOf(s);
  /* simple layout (Ryan 2026-10-16: "make it less cluttered and simple"): band (logo + name as the H1) → checker → table.
     Description, links and the evaluation card move to "About" at the bottom (still on the page for search engines).
     Schools without brand data get the same band in neutral ink with their initials. */
  /* contrast guard (Ryan 2026-10-16: "color contrast so we can see it for every school"): band text must reach WCAG 4.5:1 on the
     school colour; if it doesn't, the band uses the school's darker text-safe shade (ink) with white text */
  const {bv,mark}=bandBits(s);
  const still=BRQ;BRQ=false;
  let o=`<div class="sec branded simple${still?" still":""}" style="padding-top:0;${bv}"><button class="back" data-back>‹ Back</button>
  <div class="sband">${mark}<div><small>${/\(/.test(s.n)?esc(s.n.replace(/^.*?\((.*?)\).*$/,"$1"))+" · ":""}${esc(s.d)}${s.c!==s.d?" · "+esc(s.c):""}${s.s?" · "+esc(s.s):""}</small><h1 class="sname">${esc(s.n.replace(/\s*\(.*?\)\s*/g," ").trim())} Track &amp; Field${s.j?" (NJCAA)":" Standards"}</h1>${s.j?`<a class="tplink1" href="/teams/${tslug(S.school)}" data-tpage="${S.school}">Team results &amp; roster ›</a>`:tsw(S.school,"std")}${s.o?`<span class="offpill">★ Official standards${s.yr?` · ${esc(s.yr)}`:""}${oldChart(s)?" (latest published)":""}</span>`:""}</div></div>
  ${(s.ng||[]).length?`<p class="onlyg">${g==="m"?"Men's":"Women's"} track &amp; field only</p>`:seg("g",g)}`;   /* school checker removed (Ryan 2026-10-16: "is that even necessary, the kids can clearly see") */
  if(s.j){
    o+=`<div class="verify" style="margin-top:16px"><b>No recruiting levels for junior colleges</b><span>This site doesn't set Target, Recruit or Walk-On levels for NJCAA programs: junior colleges compete nationally rather than in conferences, so there's no reliable way to predict a program's marks. Below are ${esc(s.n)}'s best marks this season; the full national list, by event, is in Results.</span><a href="/?tab=results&div=NJCAA">NJCAA national list ›</a>${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
    setTimeout(()=>teamBest(S.school),0);
    return o+`<div id="tbest"></div>`+schoolExtra(s)+schoolMore(s)+`</div>`}
  const off=s.o&&(s.off||{})[g];
  if(off){
    o+=`<div class="scroll" style="margin-top:16px"><table><thead><tr><th>Event</th>${off.tiers.map(t=>`<th class="num" title="${esc(t)}">${esc(String(t).replace(/^(men's|women's|men|women)\s+/i,"").replace(/\s+standards?$/i,"")||t)}</th>`).join("")}</tr></thead><tbody>${off.rows.map(r=>`<tr><td>${esc(r[0])}</td>${off.tiers.map((_,i)=>`<td class="num">${esc(r[i+1]||"–")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${oldChart(s)?`<p class="oldnote">Most recent standards ${esc(s.t||s.n)} has published (${esc(s.yr)}). Current requirements may differ, so confirm with the coaching staff.</p>`:""}
    <div class="verify"><b>★ Official standards</b><span>${s.via?`From ${esc(s.via)}, in use by ${esc(s.yr)}. Checked mark for mark by Preferred Recruit. The women's chart adds that marks must be met on at least 2 occasions for consideration.`:`Published by ${esc(s.n)} (${esc(s.yr)}) and checked mark for mark by Preferred Recruit.${esc(OLDNOTE(s))}`}</span><a href="${esc(s.src)}" target="_blank" rel="noopener">${s.via?"See the chart ›":"View the official source ›"}</a>${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
  } else {
    const ev=EVENTS.filter(e=>s[g][e]),p4=isP4(s);
    /* high school events by default (1600m from the 1500m, 3200m from the 3000m/5000m, 300mH from the 400mH, 39" hurdles from 42"), college events one tap away */
    const hsr=HSE(g).map(e=>[e,hsLevels(s,g,e)]).filter(([e,x])=>x.t),tg=`<div class="seg evtg" role="group" aria-label="Events"><button type="button" data-cev="0" aria-pressed="${!S.cev}">High school events</button><button type="button" data-cev="1" aria-pressed="${!!S.cev}">College events</button></div>`;
    o+=`${hsr.length?tg:""}<div class="scroll" style="margin-top:12px"><table><thead><tr><th>Event</th><th class="num">Target</th><th class="num">Recruit${p4?" "+levelsInfo():""}</th>${p4?"":`<th class="num">Walk‑On ${levelsInfo()}</th>`}</tr></thead><tbody>
    ${(S.cev||!hsr.length?ev.map(e=>`<tr><td>${e}</td><td class="num">${disp(s,g,e,0)}</td><td class="num">${disp(s,g,e,1)}</td>${p4?"":`<td class="num">${disp(s,g,e,2)}</td>`}</tr>`):hsr.map(([e,x])=>x.from?`<tr title="Converted from the college ${esc(x.from)}: ${x.orig.slice(0,p4?2:3).map(v=>esc(v||"–")).join(" / ")}"><td>${esc(hsName(e,g))}</td>${(p4?[0,1]:[0,1,2]).map(i=>`<td class="num">${esc(x.t[i]||"–")}</td>`).join("")}</tr>`:`<tr><td>${esc(hsName(e,g))}</td><td class="num">${disp(s,g,e,0)}</td><td class="num">${disp(s,g,e,1)}</td>${p4?"":`<td class="num">${disp(s,g,e,2)}</td>`}</tr>`)).join("")||'<tr><td>No marks listed for this team yet.</td></tr>'}</tbody></table></div>
    <div class="verify"><b>How these are set</b><span>${ruleText(s)} ${esc(s.n)} doesn't publish an official chart we could verify.${EVENTS.some(e=>["m","w"].some(g=>((((CT[s.ck]||{})[g]||{})[e])||[]).some(v=>v&&v[2])))?" Levels marked est: the conference has too few athletes in that event to set a level, so it uses the median of the same level across its division.":""} High school events show the matching college standard in high school terms (for example the 1600m from the college 1500m); tap College events for the original marks.</span>${src?`<a href="${esc(src)}" target="_blank" rel="noopener">See the ${esc(s.c)} list on TFRRS ›</a>`:""}${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
  }
  setTimeout(()=>teamBest(S.school),0);
  setTimeout(()=>schoolVids(S.school),0);
  setTimeout(()=>armSchoolOffer(S.school),0);
  setTimeout(()=>schoolFacts(S.school),0);
  setTimeout(()=>schoolIntent(S.school),0);
  /* the "how these are set" / official-source box goes to the bottom (Ryan 2026-10-16: "just put it at the bottom") */
  const vm=o.match(/<div class="verify">[\s\S]*?<\/div>/),vf=vm?vm[0]:"";if(vf)o=o.replace(vf,"");
  return o+`<div id="sfacts"></div><div id="tbest"></div><div id="svid"></div>`+schoolArch(s)+schoolAbout(s,vf)+schoolExtra(s)+schoolMore(s)+brandNote(s,B)+`</div>`}
/* parent capture (Ryan 2026-10-25, enterprise value: parents buy, but 71 of 100 athlete accounts had no parent contact).
   Signed-in athletes without a parent on file see one card under their results until they add one or close it.
   Saves parent name / email / phone to their own profile (RLS: owner only). No SMS consent is taken here: a parent's
   phone can only be texted with the parent's own consent. */
const PCK="prParentCard";
function parentCard(){const P=ACC.member()&&ACC.profile();if(!P||P.role!=="athlete"||P.parent_email||P.parent_phone)return "";try{if(localStorage.getItem(PCK))return ""}catch(e){}
  return `<form class="pcard" id="pcard"><div class="pct"><b>Add a parent to your account</b><span>Most families decide on recruiting together. Add a parent so we can share your college list and next steps with them.</span></div>
  <div class="pcf"><input class="in" name="pn" placeholder="Parent name" autocomplete="off" maxlength="80" required><input class="in" name="pe" type="email" placeholder="Parent email" autocomplete="off" required><input class="in" name="pp" type="tel" placeholder="Parent phone (optional)" autocomplete="off" maxlength="30"></div>
  <div class="pca"><button class="go" type="submit">Add parent</button><button class="lnk" type="button" data-pcx>Not now</button></div><p class="pcm" hidden></p></form>`}
document.addEventListener("submit",async ev=>{const f=ev.target.closest&&ev.target.closest("#pcard");if(!f)return;ev.preventDefault();
  const u=ACC.core.ses()&&ACC.core.ses().user,m=f.querySelector(".pcm"),b=f.querySelector("button[type=submit]");if(!u)return;
  const body={parent_name:f.pn.value.trim()||null,parent_email:f.pe.value.trim()||null,parent_phone:f.pp.value.trim()||null};
  b.disabled=true;try{await ACC.core.api("/rest/v1/profiles?id=eq."+u.id,{method:"PATCH",body,prefer:"return=minimal"});await ACC.core.loadProfile();
    f.innerHTML=`<div class="pct"><b>Parent added</b><span>Thanks. ${esc(body.parent_name||"Your parent")} is on your account now.</span></div>`;log("account",{detail:"parent-added"});
    try{localStorage.setItem(PCK,"1")}catch(e){}}catch(e){b.disabled=false;m.hidden=false;m.textContent="That didn't save. Check the email and try again."}});
document.addEventListener("click",ev=>{const x=ev.target.closest&&ev.target.closest("[data-pcx]");if(!x)return;try{localStorage.setItem(PCK,"1")}catch(e){};const f=document.getElementById("pcard");if(f)f.remove();log("account",{detail:"parent-card-dismissed"})});
/* program facts (Ryan 2026-10-25: beat Runcruit/NCSA): head coach (school's own coaches page), roster by class + transfers (TFRRS),
   cross country levels from the team's own runners at its NCAA regional / conference meet. Built by scripts/data/fetch_coaches.py,
   scripts/tfrrs/build_programfacts.py and build_xc_standards.py; loaded once, only when a school opens. */
let SFX=null;
const fmtXC=x=>x==null?"–":Math.floor(x/60)+":"+String((x%60).toFixed(1)).padStart(4,"0");
function schoolFacts(i){if(i==null)return;const fill=()=>{const el=document.getElementById("sfacts");if(!el||S.school!==i)return;const s=SCH[i],g=S.g,[C,P,X]=SFX;
    const c=C[s.n],p=(P[s.n]||{})[g],x=((X.schools||{})[s.n]||{})[g],st=[];
    if(c&&c.coaches.length)st.push(`<div class="gs gcoach"><span>${/cross country|\bxc\b/i.test(c.coaches[0][1])&&!/track|t&f/i.test(c.coaches[0][1])?"Cross country coach":"Head coach"}</span><b>${esc(c.coaches[0][0])}</b></div>`);
    if(p)st.push(`<div class="gs"><span>Roster</span><b>${p.roster}</b></div>`,`<div class="gs"><span>Freshmen</span><b>${p.fr}</b></div>`,`<div class="gs"><span>Transfers</span><b>${p.transfers}</b></div>`);
    if(!st.length&&!x){el.innerHTML="";return}
    const p4=isP4(s),d3=s.d==="NCAA D3"||s.d==="NAIA",cols=[0,1,2].filter(k=>!(k===1&&d3)&&!(k===2&&p4)),lab=["Target","Recruit","Walk‑On"];
    const src=[p?`${esc(p.season.toLowerCase())} roster on TFRRS`:"",c?`coach from <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(s.t||s.n)} athletics</a>`:""].filter(Boolean).join(" · ");
    el.innerHTML=(st.length?`<div class="glance">${st.join("")}${src?`<p class="gsrc">${src.charAt(0).toUpperCase()+src.slice(1)}</p>`:""}</div>`:"")
      +(x?`<details class="fold"><summary>Cross country standards<small>${esc(x.d)}</small></summary><p class="tbp">What ${esc(s.n)}'s own runners ran at ${esc(x.meet.replace(/ Cross Country Championships$/,""))} (2024 and 2025): Target is the team's 3rd runner, Recruit the 5th, Walk‑On the 7th. The second row is the same fitness in a high school 5K. Courses differ, so these are estimates.</p><div class="scroll"><table><thead><tr><th></th>${cols.map(k=>`<th class="num">${lab[k]}</th>`).join("")}</tr></thead><tbody><tr><td>${esc(x.d)}</td>${cols.map(k=>`<td class="num">${fmtXC(x.lv[k])}</td>`).join("")}</tr><tr><td>High school 5K</td>${cols.map(k=>`<td class="num">${fmtXC(x.hs[k])}</td>`).join("")}</tr></tbody></table></div></details>`:"")};
  if(SFX)return fill();Promise.all(["coaches","programfacts","xc_standards"].map(f=>fetch("/data/"+f+".json").then(r=>r.ok?r.json():{}).catch(()=>({})))).then(d=>{SFX=d;fill()})}
/* Ryan's videos about this school (YouTube + Instagram reels), /data/videos.json written at build */
let VIDS=null;
/* videos live in a collapsed row (Ryan 2026-10-17: not visible up front); the links and the VideoObject data in the page head stay for search engines */
function schoolVids(i){if(i==null)return;const fill=()=>{const el=document.getElementById("svid");if(!el||S.school!==i)return;const v=(VIDS||{})[SCH[i].n];if(!v){el.innerHTML="";return}
  el.innerHTML=`<details class="fold vfold"><summary>Videos<small>${(v.yt||[]).length+(v.ig||[]).length}</small></summary><div class="vids">${(v.yt||[]).map(x=>`<a class="vcard" href="https://www.youtube.com/watch?v=${esc(x.id)}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${esc(x.id)}/hqdefault.jpg" alt="" loading="lazy"><span>${esc(x.t)}</span><small>YouTube</small></a>`).join("")}${(v.ig||[]).map(x=>`<a class="vcard ig" href="https://www.instagram.com/reel/${esc(x.code)}/" target="_blank" rel="noopener"><span>${esc(SCH[i].n)} standards reel</span><small>Instagram · @preferredrecruit</small></a>`).join("")}</div></details>`};
  if(VIDS)return fill();fetch("/data/videos.json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(d=>{VIDS=d||{};fill()})}
/* season bests (Ryan 2026-10-14 "optimize everything"): /data/teams/<slug>.json is written at build from the latest outdoor TFRRS lists */
const TB={};
function teamBest(i){const slug=window.__prSlug?window.__prSlug(i):null;if(!slug||i==null)return;
  const fold=el=>{const h=el.querySelector(".tbh");if(!h)return;const det=document.createElement("details"),sm=document.createElement("summary");det.className="fold";sm.innerHTML=h.innerHTML;h.remove();det.appendChild(sm);while(el.firstChild)det.appendChild(el.firstChild);el.appendChild(det)};
  const fill=d=>{const el=document.getElementById("tbest");if(!el||S.school!==i)return;const L=d?d[S.g]||[]:[];if(!L.length){el.innerHTML="";return}
    setTimeout(()=>fold(el),0);
    el.innerHTML=`<h3 class="tbh">${esc(d.y)} season bests<small>${S.g==="m"?"Men":"Women"} · TFRRS outdoor</small></h3><p class="tbp">${esc(SCH[i].n)}'s best mark in each event this season${d.conf?`, with its rank on the ${esc(d.conf)} list`:""}.</p>
    <div class="scroll"><table class="tbt"><thead><tr><th>Event</th><th class="num">Mark</th><th class="num">Rank</th></tr></thead><tbody>${L.map(r=>`<tr><td>${esc(r.e)}<small>${r.ap?`<a href="https://tf.tfrrs.org/athletes/${esc(r.ap)}" target="_blank" rel="noopener nofollow">${esc(r.a)}</a>`:esc(r.a)}</small></td><td class="num">${esc(r.mk)}${parseFloat(r.w)>2?"<small>wind-aided</small>":""}</td><td class="num">${[d.conf&&r.cp?`#${r.cp} ${esc(d.conf)}`:"",r.np?`#${r.np} national`:""].filter(Boolean).join("<br>")||"–"}</td></tr>`).join("")}</tbody></table></div>`};
  if(slug in TB)return fill(TB[slug]);
  fetch("/data/teams/"+slug+".json").then(r=>r.ok?r.json():null).catch(()=>null).then(d=>{TB[slug]=d;fill(d)})}
/* share my results: branded image card + a link that reopens this exact search (?g=&e=&m=) */
let LASTSUM=null;
function shareCard(L){const c=document.createElement("canvas");c.width=1080;c.height=1350;const x=c.getContext("2d"),F="-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif";
  const gr=x.createLinearGradient(0,0,1080,1350);gr.addColorStop(0,"#B196FF");gr.addColorStop(.55,"#7A45F0");gr.addColorStop(1,"#4E22C2");x.fillStyle=gr;x.fillRect(0,0,1080,1350);
  x.fillStyle="#fff";x.font=`600 42px ${F}`;x.fillText("Preferred Recruit · Track Standards",80,130);
  x.font=`700 170px ${F}`;x.fillText(L.mark,76,430);x.font=`500 56px ${F}`;x.fillText(`${L.g==="m"?"Men's":"Women's"} ${L.e}`,80,515);
  x.font=`700 92px ${F}`;x.fillText(`fits ${L.n.toLocaleString()} colleges`,80,700);
  x.font=`500 50px ${F}`;[["Target",L.T],["Recruit",L.R],["Walk-On",L.W]].filter(z=>z[1]).forEach((z,k)=>x.fillText(`${z[1].toLocaleString()}  ${z[0]}`,80,830+k*76));
  x.font=`600 46px ${F}`;x.fillText("Find yours: trackandfieldstandards.com",80,1250);
  return new Promise(r=>c.toBlob(r,"image/png"))}
async function doShare(btn){const L=LASTSUM;if(!L)return;
  const url=`https://trackandfieldstandards.com/?g=${L.g}&e=${encodeURIComponent(L.e)}&m=${encodeURIComponent(L.mark)}`,text=`My ${L.mark} ${L.e} fits ${L.n.toLocaleString()} college track programs. Check yours:`;
  try{const blob=await shareCard(L),file=new File([blob],"my-college-matches.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:text+" "+url});return}
    if(navigator.share){await navigator.share({title:"My college matches",text,url});return}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="my-college-matches.png";a.click();
    try{await navigator.clipboard.writeText(url)}catch(e){}btn.textContent="Image saved · link copied"}catch(e){}}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-share]");if(b){ev.preventDefault();doShare(b)}});

/* ---------- Results (TFRRS, organized) ---------- */
const R={season:"2026-outdoor",div:"NCAA D1",list:0,g:"m",ev:null,q:"",team:null,ath:null,n:100,swap:true,st:""};
/* team -> state for the Results state filter (Ryan 2026-10-16: "lets have an option to sort results per state"). TFRRS team names are
   matched to the standards database by name, team name or alias; relay squads "(B)" and "St." are normalised first. */
const tnorm=x=>String(x||"").toLowerCase().replace(/\s*\([a-z]\)\s*$/,"").replace(/\bst\.(?=\s|$)/g,"state").replace(/[^a-z0-9&]+/g," ").trim();
const TST=new Map();SCH.forEach(s=>{if(!s.s)return;[s.n,s.t,...(s.a||[])].forEach(a=>{const k=tnorm(a);if(k&&!TST.has(k))TST.set(k,s.s)})});
/* one name per school on athlete profiles: TFRRS spells some schools two ways ("Wis.-Milwaukee" / "Milwaukee") */
const TCAN=new Map();SCH.forEach(s=>{[s.n,s.t,...(s.a||[])].forEach(a=>{const k=tnorm(a);if(k&&!TCAN.has(k))TCAN.set(k,s.t||s.n)})});
const tcanon=n=>TCAN.get(tnorm(n))||TCAN.get(tnorm(n).replace(/^university of /,""))||n;
const teamSt=n=>TST.get(tnorm(n))||TST.get(tnorm(n).replace(/^university of /,""))||"";
const CACHE={},LOADING={};
/* wind-legal toggle (Ryan 2026-10-22: "only times within the wind-legal system ... similar to TFRRS"). TFRRS lists keep one
   all-conditions best per athlete, so with the toggle on every wind-aided row (wind over +2.0 in the 100m, 200m, sprint hurdles,
   long and triple jump) is swapped for that athlete's legal best of the season from /data/legal/<key>.json
   (scripts/tfrrs/build_legal.py), or hidden when there is none / it isn't loaded yet; the list is then re-sorted and re-ranked.
   CACHE holds whichever version is on, so every view (lists, conferences, Compare, team pages, athlete views, the AI) follows it. */
const WEV=new Set(["100 Meters","200 Meters","100 Hurdles","110 Hurdles","Long Jump","Triple Jump"]),WCODE=new Set(["100","200","100H","110H","LJ","TJ"]);
let WIND=(()=>{const q=new URLSearchParams(location.search).get("wind");if(q)return q==="legal";try{return localStorage.getItem("prWind")==="1"}catch(e){return false}})();
const RAW={},LEG={},LEGC={};
const aided=w=>{const x=parseFloat(w);return isFinite(x)&&x>2};
const wkey=k=>/-outdoor-/.test(k);
function loadLegal(key){if(LEG[key])return Promise.resolve();
  const get=u=>fetch(u,{cache:"no-cache"}).then(r=>r.ok?r.json():Promise.reject(r.status));
  /* current season: the Monday refresh copy and the site copy (updated as more athlete pages come in) are merged */
  const merge=(a,b)=>{for(const g in b)for(const e in b[g])Object.assign(((a[g]||(a[g]={}))[e]||(a[g][e]={})),b[g][e]);return a};
  return Promise.all([LIVE_KEYS.has(key)?get(LIVE_BASE+"legal/"+key+".json").catch(()=>({})):{},get("/data/legal/"+key+".json").catch(()=>({}))]).then(([a,b])=>{LEG[key]=merge(a,b)}).catch(()=>{LEG[key]={}})}
const ftq=m=>{const i=Math.round(m/0.0254*4)/4,ft=Math.floor(i/12);return `${ft}' ${+(i-ft*12).toFixed(2)}"`};
function legalOf(key){const D=RAW[key],G=LEG[key];if(!D||D.err||!wkey(key))return D;if(LEGC[key])return LEGC[key];
  const meets=D.meets.slice(),mi=new Map(meets.map((m,i)=>[m,i]));
  const lists=D.lists.map(l=>{if(l.champ)return l;const g2={},wh={};
    for(const g of Object.keys(l.g||{})){g2[g]={};for(const [ev,rows] of Object.entries(l.g[g])){
      if(!WEV.has(ev)||!rows.some(r=>aided(r[5]))){g2[g][ev]=rows;continue}
      const e=evLabel(ev).replace(/,/g,""),up=/Jump/.test(ev),out=[];let sw=0,hid=0;
      for(const r of rows){if(!aided(r[5])){out.push(r);continue}const a=(((G||{})[g]||{})[ev]||{})[r[9]];if(!a){hid++;continue}
        const r2=r.slice();r2[4]=a[0];r2[5]=a[1];if(!mi.has(a[2])){mi.set(a[2],meets.length);meets.push(a[2])}r2[6]=mi.get(a[2]);r2[7]=a[3];
        if(up){const v=parseMark(a[0],e);r2[8]=v?ftq(v):""}r2.lg=1;out.push(r2);sw++}
      const val=r=>{const v=parseMark(r[4],e);return v==null?(up?-1:1e9):v};out.sort((a,b)=>up?val(b)-val(a):val(a)-val(b));
      let pv=null,pl=0;g2[g][ev]=out.map((r,i)=>{const v=val(r),x=r.slice();x.lg=r.lg;if(v!==pv){pl=i+1;pv=v}x[0]=pl;return x});
      (wh[g]||(wh[g]={}))[ev]={sw,hid}}}
    return Object.assign({},l,{g:g2,wh})});
  return LEGC[key]=Object.assign({},D,{meets,lists})}
function setWind(on){WIND=on;try{localStorage.setItem("prWind",on?"1":"0")}catch(e){}
  Promise.all(Object.keys(RAW).filter(k=>on&&wkey(k)).map(loadLegal)).then(()=>{for(const k of Object.keys(RAW))CACHE[k]=on?legalOf(k):RAW[k];R.swap=true;render()});
  log("wind",{legal:on})}
const windSw=()=>(R.season||"").endsWith("outdoor")||TM.i!=null||CC.on?`<button type="button" class="cmpsw windsw" data-wind aria-pressed="${WIND}" title="Only wind-legal marks (wind +2.0 or less) in the 100m, 200m, hurdles, long jump and triple jump"><span class="sw" aria-hidden="true"></span>Wind-legal</button>`:"";
/* the note under a list when the toggle is on */
const windNote=(L,g,ev)=>{if(!WIND||!WEV.has(ev))return "";const x=((L.wh||{})[g]||{})[ev];return `<p class="wnote">Wind-legal marks only (wind +2.0 or less).${x&&x.sw?` ${x.sw} wind-aided best${x.sw>1?"s":""} replaced by the athlete's legal best.`:""}${x&&x.hid?` ${x.hid} athlete${x.hid>1?"s":""} hidden: no legal mark found yet.`:""}</p>`};
const DIVINFO={"NCAA D1":"NCAA D1","NCAA D2":"NCAA D2","NCAA D3":"NCAA D3",NAIA:"NAIA",NJCAA:"NJCAA",NCCAA:"NCCAA",NWAC:"NWAC",USCAA:"USCAA"};
const evLabel=e=>e.replace(/^(\d[\d,]*) Meters$/,"$1m").replace(/^(\d+) Hurdles$/,"$1m Hurdles").replace(/^(\d+) Steeplechase$/,"$1m Steeple").replace(/^4 x (\d+) Relay$/,"4×$1 Relay");
const years=()=>[...new Set(RIDX.map(x=>x.year))].sort().reverse();
const seasons=()=>[...new Set(RIDX.map(x=>x.year+"-"+x.season))].sort().reverse();
const seasonLabel=k=>{const [y,s]=k.split("-");return `${y} ${s==="xc"?"Cross Country":s[0].toUpperCase()+s.slice(1)}`};
/* multi-select divisions (Ryan 2026-10-17): R.sel = selected divisions; 2+ = combined list, or side-by-side columns on desktop when
   the Compare switch is on. Phones always get the combined vertical list (no sideways scrolling). */
const seasonDivs=()=>RIDX.filter(x=>x.year+"-"+x.season===R.season).map(x=>x.div).sort((a,b)=>Object.keys(DIVINFO).indexOf(a)-Object.keys(DIVINFO).indexOf(b));
const syncSel=()=>{const av=seasonDivs();if(!R.sel)R.sel=[R.div];R.sel=R.sel.filter(d=>av.includes(d));if(!R.sel.length)R.sel=[av.includes(R.div)?R.div:av[0]];if(R.sel.length===1)R.div=R.sel[0]};
const WIDE=()=>matchMedia("(min-width:761px)").matches;
const MULTI=()=>{syncSel();return R.sel.length>1};
const curKey=()=>{if(MULTI())return null;const x=RIDX.find(x=>x.year+"-"+x.season===R.season&&x.div===R.div)||RIDX.find(x=>x.year+"-"+x.season===R.season);if(x)R.div=x.div;return x&&x.key};
function load(key,quiet){if(CACHE[key]||LOADING[key])return LOADING[key];
  LOADING[key]=getRank(key).then(d=>{RAW[key]=cleanRank(d);return WIND&&wkey(key)?loadLegal(key):0}).then(()=>{CACHE[key]=WIND?legalOf(key):RAW[key]}).catch(()=>{CACHE[key]={err:1,lists:[]}})
    .then(()=>{if(TM.i!=null&&SCH[TM.i]&&key===keyOf(TM.sea,SCH[TM.i].d)&&S.tab==="results"){R.swap=true;render();return}if((key===curKey()||MULTI()&&key.startsWith(R.season+"-")||CC.on&&cmKeys().concat([keyOf(CM.sea,CM.div)],[CM.sa,CM.sb].map(i=>SCH[i]&&keyOf(CM.tsea,SCH[i].d))).includes(key))&&S.tab==="results"&&S.school==null){R.swap=true;render()} if(!quiet) prefetch()});
  return LOADING[key]}
/* full-depth season files are 1-5 MB each (Ryan 2026-10-22: every athlete back to 2016), so only desktops on a normal connection preload the other divisions */
function prefetch(){const c=navigator.connection||{};if(!WIDE()||c.saveData||/2g|3g/.test(c.effectiveType||""))return;const go=()=>RIDX.filter(x=>x.year+"-"+x.season===R.season&&!CACHE[x.key]).forEach(x=>load(x.key,true));(window.requestIdleCallback?requestIdleCallback(go,{timeout:2000}):setTimeout(go,600))}
const yr=y=>({"FR-1":"Freshman","SO-2":"Sophomore","JR-3":"Junior","SR-4":"Senior"}[y]||y||"");
const higher=(e,m)=>/m$/.test(m)||/thlon/i.test(e);
const mval=m=>{m=String(m).replace(/[^0-9:.]/g,"");if(!m)return null;const p=m.split(":").map(Number);return p.length===2?p[0]*60+p[1]:p.length===3?p[0]*3600+p[1]*60+p[2]:+p[0]};
/* results chart (Ryan 2026-10-21: no "Target/Recruit/Walk-On line" labels on D1 lists, real time values, and it follows the filters).
   Plots the marks being viewed (after state/search filters) by place, with the actual mark at fixed places (1st, 10th, 25th, 50th, last)
   and three labelled value lines. */
/* drag across the chart (Ryan 2026-10-21: "drag my mouse across it and see the individual things"): a marker follows the line and
   shows place, mark, athlete and team for the athlete under the pointer (mouse, pen or finger). */
const CV={};let CVN=0;
function curve(rows,e,lab){
  const P=rows.map((r,i)=>({i,v:mval(r[4]),m:r[4]})).filter(p=>p.v!=null&&isFinite(p.v));if(P.length<5)return "";
  const hi=higher(e,rows[0][4]),vs=P.map(p=>p.v),lo=Math.min(...vs),mx=Math.max(...vs),n=P.length,W=640,H=190,pl=62,pr=18,pt=34,pb=30;
  const X=k=>pl+(k/(n-1))*(W-pl-pr),Y=v=>{const t=(v-lo)/((mx-lo)||1);return pt+(hi?1-t:t)*(H-pt-pb)};
  const fmt=v=>hi?v.toFixed(2)+"m":fmtT(v);
  const id="cv"+(++CVN);CV[id]={W,H,pt,pb,pts:P.map((p,k)=>{const r=rows[p.i];return {x:X(k),y:Y(p.v),m:p.m,pl:+r[0]||k+1,who:lab?lab(r):""}})};
  const d=P.map((p,k)=>(k?"L":"M")+X(k).toFixed(1)+" "+Y(p.v).toFixed(1)).join(" ");
  const grid=[mx,(lo+mx)/2,lo].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="cg"/><text x="${pl-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" class="ct">${esc(fmt(v))}</text>`).join("");
  const ticks=[];for(const k of [...new Set([1,10,25,50,100,n].filter(k=>k<=n))]){while(ticks.length&&X(k-1)-X(ticks[ticks.length-1]-1)<64&&ticks[ticks.length-1]!==1)ticks.pop();if(!ticks.length||X(k-1)-X(ticks[ticks.length-1]-1)>=64||k===n)ticks.push(k)}
  const dots=ticks.map(k=>{const p=P[k-1],x=X(k-1),y=Y(p.v),anc=k===n?"end":k===1?"start":"middle";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="cd"/><text x="${x.toFixed(1)}" y="${(y-10).toFixed(1)}" text-anchor="${anc}" class="cm">${esc(p.m)}</text><text x="${x.toFixed(1)}" y="${H-8}" text-anchor="${anc}" class="ct">${k===1?"1st":ord(k)}</text>`}).join("");
  return `<div class="curve" data-cv="${id}"><div class="ctip" hidden></div><div class="cl"><span>Marks by place · ${n.toLocaleString()} athletes shown</span><span>${hi?"Farther":"Faster"} at the top</span></div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Marks from 1st (${esc(P[0].m)}) to ${ord(n)} (${esc(P[n-1].m)})"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A45F0" stop-opacity=".22"/><stop offset="1" stop-color="#7A45F0" stop-opacity="0"/></linearGradient></defs>
  ${grid}<path d="${d} L${X(n-1).toFixed(1)} ${H-pb} L${pl} ${H-pb} Z" fill="url(#cg)"/><path d="${d}" fill="none" stroke="#7A45F0" stroke-width="2.5" stroke-linejoin="round"/>${dots}<g class="chov" style="display:none"><line y1="${pt-8}" y2="${H-pb}" class="chl"/><circle r="6" class="chd"/></g><rect x="${pl}" y="0" width="${W-pl-pr}" height="${H}" fill="transparent" class="chit"/></svg></div>`;
}
/* ---------- Compare anything (Ryan 2026-10-19: "should not be limited to D1/D2/D3 ... Men vs Women, Conference vs Conference,
   School vs School ... compare different events on the same view"). A comparison is 2-4 columns (2 on phones); each column is
   division + list (national or a conference) + men/women + event, optionally one school. A school with "All events" shows its best
   mark in every event. Different events or genders are read side by side through "% of #1" (the list leader = 100%), drawn as one
   overlay chart. The whole comparison lives in the address (?tab=results&cmp=...) so it can be shared. */
const CC={on:false,cols:[]};
const CCOL=["#7A45F0","#E8590C","#0B7285","#C2255C"];
const ccMax=()=>WIDE()?4:2;
const rlab=e=>String(e).replace(/^(\d[\d,]*) Meters$/,"$1m").replace(/,/g,"").replace(/^(\d+) Hurdles$/,"$1m Hurdles").replace(/^(\d+) Steeplechase$/,"$1m Steeplechase");
const rhigh=e=>/thlon|jump|vault|put|discus|hammer|javelin|throw/i.test(e);
const rval=(e,m)=>parseMark(m,rlab(e));
const pctOf=(e,v,v1)=>v==null||!v1?null:rhigh(e)?v/v1*100:v1/v*100;
/* each column can carry its own season (c.s) so any comparison can run year against year (Ryan 2026-10-20) */
const ccKey=(div,sea)=>{const x=RIDX.find(x=>x.year+"-"+x.season===(sea||R.season)&&x.div===div);return x&&x.key};
const ccSea=c=>c.s||R.season;
const ccData=c=>{const k=ccKey(c.div,ccSea(c));if(!k)return {err:1};if(!CACHE[k]){load(k,true);return null}return CACHE[k].err?{err:1}:CACHE[k]};
const ccListOf=(D,l)=>l==="nat"?(D.lists.find(x=>x.nat)||D.lists[0]):(D.lists.find(x=>x.label===l)||D.lists.find(x=>x.nat)||D.lists[0]);
const ccMixed=()=>new Set(CC.cols.map(ccSea)).size>1;
const ccName=c=>`${ccMixed()?seasonLabel(ccSea(c))+" · ":""}${c.t?c.t+" · ":""}${c.l==="nat"?(DIVINFO[c.div]||c.div):c.l} · ${c.g==="m"?"Men's":"Women's"} ${c.e==="*"?"all events":evLabel(c.e)}`;
function ccSync(){try{const u=new URL(location.href);if(CC.on&&CC.cols.length){u.searchParams.set("tab","results");u.searchParams.set("cmp",CC.cols.map(c=>[c.div,c.l,c.g,c.e,c.t||"",c.s||""].map(x=>String(x).replace(/[|~]/g," ")).join("|")).join("~"))}else u.searchParams.delete("cmp");history.replaceState(history.state,"",u.pathname+u.search)}catch(e){}}
function ccFromUrl(v){const cols=String(v||"").split("~").map(s=>{const [div,l,g,e,t,sea]=s.split("|").map(x=>x||"");return div&&g&&e?{div,l:l||"nat",g:g==="w"?"w":"m",e,t,s:sea&&RIDX.some(r=>r.year+"-"+r.season===sea)?sea:""}:null}).filter(Boolean).slice(0,4);if(cols.length){CC.on=true;CC.cols=cols}}
/* presets start from what the visitor is looking at (division, gender, event) */
function ccPreset(p){syncSel();const div=R.div,g=R.g,D=CACHE[ccKey(div)];const L=D&&!D.err?ccListOf(D,"nat"):null;
  const evs=L?Object.keys(L.g[g]||{}):[],e=R.ev&&evs.includes(R.ev)?R.ev:(evs[0]||"100 Meters");
  const next={"100 Meters":"200 Meters","200 Meters":"400 Meters","400 Meters":"800 Meters","800 Meters":"1500 Meters","1500 Meters":"5000 Meters","5000 Meters":"10,000 Meters","110 Hurdles":"400 Hurdles","100 Hurdles":"400 Hurdles","Long Jump":"Triple Jump","Shot Put":"Discus","High Jump":"Long Jump"};
  if(p==="mw")CC.cols=[{div,l:"nat",g:"m",e,t:""},{div,l:"nat",g:"w",e,t:""}];
  else if(p==="ev")CC.cols=[{div,l:"nat",g,e,t:""},{div,l:"nat",g,e:next[e]&&evs.includes(next[e])?next[e]:evs.find(x=>x!==e)||e,t:""}];
  else if(p==="conf"){const NC=/region|qualif|ecac|ic4a|neicaaa|outdoor list|indoor list|division|championship/i,ok=D&&!D.err?D.lists.filter(x=>!x.nat&&!x.champ&&(x.g[g]||{})[e]&&!NC.test(x.label)):[];
    const pick=["SEC","Big Ten"].map(n=>ok.find(x=>x.label===n)).filter(Boolean);
    const cf=pick.length===2?pick:ok.sort((a,b)=>(b.g[g][e]||[]).length-(a.g[g][e]||[]).length).slice(0,2);
    CC.cols=cf.length===2?cf.map(x=>({div,l:x.label,g,e,t:""})):[{div,l:"nat",g,e,t:""}]}
  else if(p==="school"){const rows=L?((L.g[g]||{})[e]||[]):[],ts=[...new Set(rows.map(r=>D.teams[r[3]]))].slice(0,2);CC.cols=ts.map(t=>({div,l:"nat",g,e:"*",t}))}
  else if(p==="yy"){const [y,sn]=R.season.split("-"),prev=seasons().filter(k=>k.endsWith("-"+sn)&&k<R.season&&RIDX.some(r=>r.year+"-"+r.season===k&&r.div===div));
    CC.cols=[{div,l:"nat",g,e,t:"",s:R.season},...prev.slice(0,ccMax()-1).map(k=>({div,l:"nat",g,e,t:"",s:k}))]}
  else if(p==="div"){const ds=(R.sel.length>1?R.sel:seasonDivs().slice(0,3)).slice(0,ccMax());CC.cols=ds.map(d=>({div:d,l:"nat",g,e,t:""}))}
  CC.cols=CC.cols.slice(0,ccMax());CC.on=true;ccSync()}
function ccColumn(c,i){
  const D=ccData(c),head=sel=>`<header class="cch" style="--cc:${CCOL[i]}">${sel}</header>`;
  if(!D)return `<section class="col cc">${head(`<b>${esc(ccName(c))}</b>`)}${skeleton()}</section>`;
  if(D.err)return `<section class="col cc">${head(`<b>${esc(ccName(c))}</b><div class="ccs"><select data-cc="s" data-i="${i}" aria-label="Season">${seasons().filter(k=>RIDX.some(r=>r.year+"-"+r.season===k&&r.div===c.div)).map(k=>`<option value="${k}" ${k===ccSea(c)?"selected":""}>${esc(seasonLabel(k))}</option>`).join("")}</select></div>`)}<p class="ccmsg">Not available for this season. Pick another one above.</p></section>`;
  const L=ccListOf(D,c.l),E=L.g[c.g]||{},evs=Object.keys(E);if(c.e!=="*"&&!evs.includes(c.e))c.e=evs[0]||c.e;
  const divs=seasonDivs(),NC=/region|qualif|ecac|ic4a|neicaaa|outdoor list|indoor list|division/i,lists=[...D.lists.filter(x=>x.nat),...D.lists.filter(x=>!x.nat&&!x.champ&&!NC.test(x.label)).sort((a,b)=>a.label.localeCompare(b.label)),...D.lists.filter(x=>!x.nat&&!x.champ&&NC.test(x.label))];
  const seaOpts=seasons().filter(k=>RIDX.some(r=>r.year+"-"+r.season===k&&r.div===c.div));
  const ctl=`<div class="ccs"><select data-cc="s" data-i="${i}" aria-label="Season">${seaOpts.map(k=>`<option value="${k}" ${k===ccSea(c)?"selected":""}>${esc(seasonLabel(k))}</option>`).join("")}</select><select data-cc="div" data-i="${i}" aria-label="Division">${divs.map(d=>`<option ${d===c.div?"selected":""}>${esc(d)}</option>`).join("")}</select>
    <select data-cc="l" data-i="${i}" aria-label="List">${lists.map(x=>{const v=x.nat?"nat":x.label;return `<option value="${esc(v)}" ${(c.l==="nat"?x===L:x.label===c.l)?"selected":""}>${esc(x.nat?"National list":x.label)}</option>`}).join("")}</select>
    <select data-cc="g" data-i="${i}" aria-label="Men or women"><option value="m" ${c.g==="m"?"selected":""}>Men</option><option value="w" ${c.g==="w"?"selected":""}>Women</option></select>
    <select data-cc="e" data-i="${i}" aria-label="Event">${c.t?`<option value="*" ${c.e==="*"?"selected":""}>All events</option>`:""}${evs.map(e=>`<option value="${esc(e)}" ${e===c.e?"selected":""}>${esc(evLabel(e))}</option>`).join("")}</select>
    <input data-cc="t" data-i="${i}" list="cct${i}" placeholder="Any school" value="${esc(c.t||"")}" aria-label="School"><datalist id="cct${i}">${D.teams.filter(t=>!/\([A-Z]\)$/.test(t)).sort().map(t=>`<option value="${esc(t)}">`).join("")}</datalist>
    ${CC.cols.length>1?`<button type="button" class="ccx" data-ccdel="${i}" aria-label="Remove column">×</button>`:""}</div>`;
  const ti=c.t?D.teams.indexOf(c.t):-1;
  if(c.t&&ti<0)return `<section class="col cc">${head(`<b>${esc(ccName(c))}</b>${ctl}`)}<p class="ccmsg">${esc(c.t)} has no marks on this list.</p></section>`;
  if(c.e==="*"){   /* one school, best mark in every event */
    const rows=evs.map(e=>[e,(E[e]||[]).find(r=>r[3]===ti),(E[e]||[]).filter(r=>r[3]===ti).length]).filter(x=>x[1]);
    return `<section class="col cc">${head(`<b>${esc(ccName(c))}</b><span>${rows.length} events · ${rows.reduce((a,x)=>a+x[2],0)} marks on the list</span>${ctl}`)}
      <ol>${rows.map(([e,r,n])=>`<li><span class="rk">#${esc(r[0])}</span><span class="nm"><b>${esc(evLabel(e))}</b><small>${esc(r[1]||c.t)}${n>1?` · ${n} on the list`:""}</small></span><span class="mk">${esc(r[4])}</span></li>`).join("")||'<li><span></span><span class="nm">No marks on this list.</span><span></span></li>'}</ol></section>`}
  const all=E[c.e]||[],rows=ti>=0?all.filter(r=>r[3]===ti):all,v1=rval(c.e,(all[0]||[])[4]);
  const P=[1,10,25,50].filter(k=>all[k-1]);
  return `<section class="col cc">${head(`<b>${esc(ccName(c))}</b><span>${all.length.toLocaleString()} marks${ti>=0?` · ${rows.length} from ${esc(c.t)}`:""}</span>${ctl}`)}
    <div class="ccst">${P.map(k=>`<div><small>#${k}</small><b>${esc(all[k-1][4])}</b>${ccDelta(c,i,k,all)}</div>`).join("")}</div>
    <ol>${rows.slice(0,RCAP(25)).map(r=>{const p=pctOf(c.e,rval(c.e,r[4]),v1);return `<li><span class="rk">${esc(r[0])}</span><span class="nm"><b>${esc(r[1]||D.teams[r[3]])}</b><small>${esc(D.teams[r[3]])}</small></span><span class="mk">${esc(r[4])}${p!=null?`<small>${p.toFixed(1)}%</small>`:""}</span></li>`}).join("")}</ol></section>`}
/* how this column's #k mark differs from the first column's #k (same event): the year-to-year story */
function ccDelta(c,i,k,all){if(!i)return "";const c0=CC.cols[0];if(!c0||c0.e!==c.e||c.e==="*")return "";const D0=ccData(c0);if(!D0||D0.err)return "";
  const a0=((ccListOf(D0,c0.l).g[c0.g]||{})[c0.e]||[])[k-1];if(!a0||!all[k-1])return "";const v=rval(c.e,all[k-1][4]),v0=rval(c.e,a0[4]);if(v==null||v0==null)return "";
  const hi=rhigh(c.e),d=hi?v-v0:v0-v;if(Math.abs(d)<0.005)return `<em class="ccd eq">same</em>`;
  const amt=hi?(Math.abs(d)>=1?Math.abs(d).toFixed(2)+"m":Math.round(Math.abs(d)*100)+"cm"):Math.abs(d).toFixed(2)+"s";
  return `<em class="ccd ${d>0?"up":"dn"}">${amt} ${hi?(d>0?"farther":"shorter"):(d>0?"faster":"slower")}</em>`}
/* every list column's drop-off from #1 to #100, as % of its own leader, on one chart */
function ccChart(){
  const S2=CC.cols.map((c,i)=>{if(c.e==="*")return null;const D=ccData(c);if(!D||D.err)return null;const all=(ccListOf(D,c.l).g[c.g]||{})[c.e]||[],v1=rval(c.e,(all[0]||[])[4]);
    const ti=c.t?D.teams.indexOf(c.t):-1,pts=all.slice(0,100).map((r,k)=>[k,pctOf(c.e,rval(c.e,r[4]),v1),r[3]]).filter(p=>p[1]!=null);return pts.length>2?{i,c,pts,ti}:null}).filter(Boolean);
  if(!S2.length)return "";
  const W=640,H=180,pad=24,N=Math.max(...S2.map(s=>s.pts.length)),lo=Math.max(50,Math.floor(Math.min(...S2.flatMap(s=>s.pts.map(p=>p[1])))-1)),x=k=>pad+k/Math.max(1,N-1)*(W-pad*2),y=p=>pad/2+(100-p)/(100-lo)*(H-pad);
  return `<div class="ccchart"><div class="cl"><span>How each list drops off from its #1 (100%) to #${N}</span></div><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${[100,Math.round((100+lo)/2),lo].map(p=>`<line x1="${pad}" x2="${W-pad}" y1="${y(p)}" y2="${y(p)}" stroke="var(--pr-line)"/><text x="2" y="${y(p)+4}" font-size="11" fill="var(--pr-mute)">${p}%</text>`).join("")}
    ${S2.map(s=>`<path d="${s.pts.map((p,j)=>(j?"L":"M")+x(p[0]).toFixed(1)+" "+y(p[1]).toFixed(1)).join(" ")}" fill="none" stroke="${CCOL[s.i]}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>${s.ti>=0?s.pts.filter(p=>p[2]===s.ti).map(p=>`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="4" fill="${CCOL[s.i]}"/>`).join(""):""}`).join("")}</svg>
    <div class="cclg">${S2.map(s=>`<span><i style="background:${CCOL[s.i]}"></i>${esc(ccName(s.c))}</span>`).join("")}</div></div>`}
/* ---------- compare: school standards (Ryan 2026-10-20: "school tiers data fully accessible in the comparison tool") ----------
   Up to 4 programs side by side: Target / Recruit / Walk-On for one event (with the gap to the first school) or every event. */
const CS={g:"m",e:"*",ids:null};
function csSeed(){if(CS.ids)return;const ok=i=>i>=0&&!SCH[i].j;let a=INT.sch?SCH.findIndex(x=>x.n===INT.sch):-1;
  if(!ok(a))a=SCH.findIndex(x=>/^Oregon$/i.test(x.t||x.n));
  /* start with programs that differ: another conference in the same division (official standards first), then the next divisions down */
  const pick=(f)=>{const L=SCH.map((x,i)=>[x,i]).filter(([x,i])=>!x.j&&i!==a&&f(x));return (L.find(([x])=>x.o)||L[0]||[])[1]};
  const A=SCH[a]||{},nd=d=>DIVS[DIVS.indexOf(d)+1];
  const b=pick(x=>x.d===A.d&&x.c!==A.c),c=pick(x=>x.d===nd(A.d)),e=WIDE()?pick(x=>x.d===nd(nd(A.d))):undefined;
  CS.ids=[a,b,c,e].filter(i=>i!=null&&ok(i));CS.g=INT.g==="w"?"w":"m"}
const csEvs=()=>{const set=new Set();CS.ids.forEach(i=>Object.keys(SCH[i][CS.g]||{}).forEach(e=>{if((SCH[i][CS.g][e]||[]).some(Boolean))set.add(e)}));return EVENTS.filter(e=>set.has(e))};
function csGap(e,v,v0){if(v==null||v0==null)return "";const F=FIELD.has(e),d=F?v-v0:v0-v;if(Math.abs(d)<0.005)return '<em class="ccd eq">same</em>';
  const amt=F?(Math.abs(d)>=1?Math.abs(d).toFixed(2)+"m":Math.round(Math.abs(d)*100)+"cm"):Math.abs(d).toFixed(2)+"s";return `<em class="ccd ${d>0?"dn":"up"}">${amt} ${d>0?"tougher":"easier"}</em>`}
function stdCompare(){csSeed();const g=CS.g,evs=csEvs();if(CS.e!=="*"&&!evs.includes(CS.e))CS.e="*";
  const head=CS.ids.map((i,k)=>{const x=SCH[i];return `<th style="--cc:${CCOL[k]}"><a href="/schools/${SLUG[i]}" data-school="${i}">${esc(x.t||x.n)}</a>${star(x)}<small>${esc(x.d)} · ${esc(x.c)}</small><small class="cssrc">${x.o?`Official${x.yr?" "+esc(x.yr):""}`:x.est?"Estimate":"Set from conference results"}</small>${CS.ids.length>1?`<button type="button" class="ccx" data-csdel="${k}" aria-label="Remove ${esc(x.t||x.n)}">×</button>`:""}</th>`}).join("");
  const val=(i,e,t)=>{const a=(SCH[i][g]||{})[e];return a&&a[t]?a[t]:""};
  let body="";
  if(CS.e==="*") body=evs.map(e=>`<tr><th scope="row">${esc(e)}</th>${CS.ids.map(i=>`<td>${[0,1,2].map(t=>`<span class="cst ${"TRW"[t]}"><i></i>${val(i,e,t)?disp(SCH[i],g,e,t):"–"}</span>`).join("")}</td>`).join("")}</tr>`).join("");
  else body=[0,1,2].map(t=>`<tr><th scope="row"><span class="pill2 ${"TRW"[t]}">${TN["TRW"[t]]}</span></th>${CS.ids.map((i,k)=>{const raw=val(i,CS.e,t),v=raw?parse(raw,CS.e):null,raw0=val(CS.ids[0],CS.e,t),v0=raw0?parse(raw0,CS.e):null;
      return `<td><b>${raw?disp(SCH[i],g,CS.e,t):"–"}</b>${k&&raw&&raw0?csGap(CS.e,v,v0):""}</td>`}).join("")}</tr>`).join("");
  const can=CS.ids.length<4;
  return `<div class="cssec"><div class="csbar">${seg("csg",g)}
    <label class="sr" for="cse">Event</label><select class="in" id="cse"><option value="*">Every event</option>${evs.map(e=>`<option ${e===CS.e?"selected":""}>${esc(e)}</option>`).join("")}</select>
    ${can?`<label class="sr" for="csadd">Add a school</label><input class="in" id="csadd" list="csl" placeholder="Add a school (up to 4)" autocomplete="off"><datalist id="csl">${SCH.filter(x=>!x.j).map(x=>`<option value="${esc(x.n)}">`).join("")}</datalist>`:""}</div>
    ${CS.ids.length?`<div class="cswrap"><table class="cstbl"><thead><tr><th></th>${head}</tr></thead><tbody>${body||`<tr><td colspan="${CS.ids.length+1}">No ${g==="m"?"men's":"women's"} standards for these schools.</td></tr>`}</tbody></table></div>`:'<p class="ccmsg">Add a school to start.</p>'}
    <p class="note">${CS.e==="*"?"Each cell shows Target, Recruit and Walk-On.":"Gaps are measured against the first school."} ★ = official standards published by the school. Others are set from 2026 conference results; a few are estimates. ${NSTD.toLocaleString()} programs have standards (NJCAA colleges are results only).</p></div>`}
/* ---------- Compare, simple version (Ryan 2026-10-20: "simple enough for a 12-year-old") ----------
   One question (Years / Conferences / Divisions / Schools), one row of dropdowns, A vs B only, then a one-line answer and a
   four-row table: best mark and the top 10 / 25 / 50 cutoffs, with who is ahead. Full top-10 lists sit behind one tap. */
const CM={t:"years",g:"m",e:"100 Meters",div:"NCAA D1",conf:"",a:"",b:"",sea:"",open:false,sa:null,sb:null};
const NCL=/region|qualif|ecac|ic4a|neicaaa|outdoor list|indoor list|division|championship|rankings/i;
const seaOf=(div)=>seasons().filter(k=>RIDX.some(r=>r.year+"-"+r.season===k&&r.div===div)&&!k.endsWith("-xc"));
const keyOf=(sea,div)=>{const x=RIDX.find(r=>r.year+"-"+r.season===sea&&r.div===div);return x&&x.key};
function cmSides(){const t=CM.t;
  if(t==="years")return [{sea:CM.a,div:CM.div,l:CM.conf||"nat",name:seasonLabel(CM.a)},{sea:CM.b,div:CM.div,l:CM.conf||"nat",name:seasonLabel(CM.b)}];
  /* each side has its own division (Ryan 2026-10-24: "compare d1 and d2 conferences to each other") */
  if(t==="conf"){const da=CM.da||CM.div,db=CM.db||CM.div,x=da!==db;return [{sea:CM.sea,div:da,l:CM.a,name:CM.a+(x?` (${DIVINFO[da]||da})`:"")},{sea:CM.sea,div:db,l:CM.b,name:CM.b+(x?` (${DIVINFO[db]||db})`:"")}]}
  return [{sea:CM.sea,div:CM.a,l:"nat",name:(DIVINFO[CM.a]||CM.a)},{sea:CM.sea,div:CM.b,l:"nat",name:(DIVINFO[CM.b]||CM.b)}]}
const cmKeys=()=>CM.t==="schools"?[]:cmSides().map(x=>keyOf(x.sea,x.div)).filter(Boolean);
function cmData(x){const k=keyOf(x.sea,x.div);if(!k)return {err:1};const D=CACHE[k];if(!D){load(k,true);return null}if(D.err)return {err:1};
  const L=x.l==="nat"?(D.lists.find(z=>z.nat)||D.lists[0]):D.lists[confIdx(D,x.l)];return {D,L}}
function cmFix(){const all=seasons();
  if(!CM.sea||!all.includes(CM.sea))CM.sea=R.season;
  if(CM.t==="years"){const ss=seaOf(CM.div);if(!ss.includes(CM.a))CM.a=ss.includes(R.season)?R.season:ss[0];const typ=CM.a.split("-")[1];if(!ss.includes(CM.b)||CM.b===CM.a)CM.b=ss.find(k=>k<CM.a&&k.endsWith("-"+typ))||ss.find(k=>k!==CM.a)||CM.a}
  if(CM.t==="div"){const ds=RIDX.filter(r=>r.year+"-"+r.season===CM.sea).map(r=>r.div).sort((a,b)=>Object.keys(DIVINFO).indexOf(a)-Object.keys(DIVINFO).indexOf(b));if(!ds.includes(CM.a))CM.a=ds[0];if(!ds.includes(CM.b)||CM.b===CM.a)CM.b=ds.find(d=>d!==CM.a)||CM.a}
  if(CM.t==="conf"){CM.da=CM.da||CM.div;CM.db=CM.db||CM.div;const both=seaOf(CM.da).filter(k=>seaOf(CM.db).includes(k));if(both.length&&!both.includes(CM.sea))CM.sea=both[0];
    const ca=cmConfs(CM.da),cb=cmConfs(CM.db);
    if(ca&&!ca.includes(CM.a))CM.a=ca.includes("SEC")?"SEC":ca[0];if(cb&&(!cb.includes(CM.b)||(CM.b===CM.a&&CM.da===CM.db)))CM.b=cb.includes("Big Ten")&&!(CM.a==="Big Ten"&&CM.da===CM.db)?"Big Ten":cb.find(c=>!(c===CM.a&&CM.da===CM.db))}}
const cmConfs=div=>{const x=cmData({sea:CM.sea,div,l:"nat"});return x&&!x.err?x.D.lists.filter(z=>!z.nat&&!z.champ&&!NCL.test(z.label)).map(z=>z.label).sort():null};
const cmOpts=(list,cur,lab=x=>x)=>list.map(v=>`<option value="${esc(v)}" ${v===cur?"selected":""}>${esc(lab(v))}</option>`).join("");
const cmPick=(id,label,inner,cls="")=>`<label class="cmp ${cls}"><span>${label}</span><select data-cm="${id}">${inner}</select></label>`;
function cmVerdict(e,va,vb,na,nb,what){if(va==null||vb==null)return "";const hi=rhigh(e),d=hi?va-vb:vb-va,m=what==="10"?"10th-best mark":"best mark";
  if(Math.abs(d)<0.005)return `<p class="cmans">Their ${m}s are the same.</p>`;
  const w=d>0?na:nb,l=d>0?nb:na,amt=hi?(Math.abs(d)>=1?Math.abs(d).toFixed(2)+" m":Math.round(Math.abs(d)*100)+" cm"):Math.abs(d).toFixed(2)+" seconds";
  return `<p class="cmans"><b class="${d>0?"ca":"cb"}">${esc(w)}</b>'s ${m} is <b>${amt} ${hi?"farther":"faster"}</b> than ${esc(l)}'s.</p>`}
function cmGap(e,va,vb){if(va==null||vb==null)return "<td>–</td>";const hi=rhigh(e),d=hi?va-vb:vb-va;if(Math.abs(d)<0.005)return '<td class="cmg">Tied</td>';
  const amt=hi?(Math.abs(d)>=1?Math.abs(d).toFixed(2)+"m":Math.round(Math.abs(d)*100)+"cm"):Math.abs(d).toFixed(2)+"s";return `<td class="cmg"><span class="${d>0?"ca":"cb"}">${d>0?"A":"B"}</span> by ${amt}</td>`}
/* side by side (Ryan 2026-10-21: "go back to the side-by-side view where two rows are shown next to each other"): A's #1 next to
   B's #1, and so on down. The better mark at each spot is highlighted. */
function cmPair(e,na,nb,ra,rb){const N=Math.max(ra.length,rb.length),show=Math.min(N,CM.open?25:10),hi=rhigh(e);
  const cell=(x,win,c)=>x?`<div class="cmc ${c}${win?" win":""}"><span class="cmn"><b>${esc(x.n)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:""}</span><b class="cmm">${esc(x.mk)}</b></div>`:`<div class="cmc ${c} none"><span class="cmn"><small>No mark</small></span></div>`;
  let rows="";for(let k=0;k<show;k++){const a=ra[k],b=rb[k],ok=a&&b&&a.v!=null&&b.v!=null&&Math.abs(a.v-b.v)>=0.005,aw=ok?(hi?a.v>b.v:a.v<b.v):!!a&&!b,bw=ok?!aw:!!b&&!a;
    rows+=`<div class="cmr"><span class="cmk">${k+1}</span>${cell(a,aw,"ca")}${cell(b,bw,"cb")}</div>`}
  return `<div class="cmpair"><div class="cmr cmh"><span class="cmk">#</span><div class="ca"><i>A</i><span>${esc(na)}</span></div><div class="cb"><i>B</i><span>${esc(nb)}</span></div></div>${rows}</div>
    ${N>10?`<button type="button" class="cmmore" data-cmopen>${CM.open?"Show the top 10":`Show the top ${Math.min(N,25)}`}</button>`:""}<p class="cmkey"><span class="sw1"></span>Highlighted = the better mark at that spot</p>`}
function cmResults(){const sd=cmSides(),A=cmData(sd[0]),B=cmData(sd[1]);
  if(!A||!B)return `<div class="cmload">Loading the lists…</div>`;
  if(CM.t==="years"&&CM.conf&&(!A.err&&!A.L||!B.err&&!B.L))return `<p class="ccmsg">${esc(CM.conf)} has no list for ${esc(!A.L?sd[0].name:sd[1].name)}. Try another year.</p>`;
  if(A.err||B.err||!A.L||!B.L)return `<p class="ccmsg">${A.err||!A.L?esc(sd[0].name):esc(sd[1].name)} has no list for this pick. Try another one.</p>`;
  const ra=(A.L.g[CM.g]||{})[CM.e]||[],rb=(B.L.g[CM.g]||{})[CM.e]||[];
  if(!ra.length||!rb.length)return `<p class="ccmsg">No ${CM.g==="m"?"men's":"women's"} ${esc(evLabel(CM.e))} marks for ${!ra.length?esc(sd[0].name):esc(sd[1].name)}. Try another event.</p>`;
  const v=(rows,k)=>rows[k-1]?rval(CM.e,rows[k-1][4]):null,depth=ra[9]&&rb[9]?10:1;
  const X=(rows,D)=>rows.map(r=>({n:r[1]||D.teams[r[3]],sub:r[1]?D.teams[r[3]]:"",mk:r[4],v:rval(CM.e,r[4])}));
  const ctx=`<p class="cmctx">${CM.t==="years"?esc(CM.conf||"All of "+CM.div):""}${CM.t==="years"?" · ":""}${CM.g==="m"?"Men's":"Women's"} ${esc(evLabel(CM.e))}</p>`;
  return `${ctx}${cmVerdict(CM.e,v(ra,depth),v(rb,depth),sd[0].name,sd[1].name,depth===10?"10":"1")}${cmPair(CM.e,sd[0].name,sd[1].name,X(ra,A.D),X(rb,B.D))}`}
/* Teams (Ryan 2026-10-20: "make sure the compare feature is for kids' times on the teams"): two schools' athletes in one event and
   season, from every TFRRS list that season (national + conference), best mark per athlete. Plus "where would you fit". */
const tkey=x=>[x.n,x.t,...(x.a||[])].filter(Boolean).map(tnorm).flatMap(k=>[k,k.replace(/^university of /,"")]);
function teamRows(i,sea,e,g){const x=SCH[i];if(!x)return null;const k=keyOf(sea,x.d);if(!k)return {err:"no list"};const D=CACHE[k];if(!D){load(k,true);return null}if(D.err)return {err:"no list"};
  const want=new Set(tkey(x)),tis=D.teams.map((t,j)=>want.has(tnorm(t))?j:-1).filter(j=>j>=0);if(!tis.length)return {err:"no team",D};
  const best=new Map();for(const L of D.lists){for(const r of ((L.g[g]||{})[e]||[])){if(!tis.includes(r[3]))continue;const v=rval(e,r[4]);if(v==null)continue;const nm=r[1]||D.teams[r[3]];const b=best.get(nm);if(!b||(rhigh(e)?v>b.v:v<b.v))best.set(nm,{v,r})}}
  const rows=[...best.values()].sort((a,b)=>rhigh(e)?b.v-a.v:a.v-b.v);return {rows,D}}
function teamEvents(i,sea,g){const x=SCH[i];const k=x&&keyOf(sea,x.d),D=k&&CACHE[k];if(!D||D.err){if(k&&!D)load(k,true);return []}
  const L=D.lists.find(z=>z.nat)||D.lists[0];return Object.keys((L&&L.g[g])||{}).filter(e=>!/Relay|thlon/i.test(e))}
function cmTeams(){if(CM.sa==null){csSeed();const f=re=>SCH.findIndex(x=>!x.j&&re.test(x.t||x.n));const last=INT.sch?SCH.findIndex(x=>x.n===INT.sch&&!x.j):-1;
    CM.sa=last>=0?last:f(/^Oregon$/i);CM.sb=[f(/^USC$/i),f(/^Oregon$/i),CS.ids[1]].find(i=>i>=0&&i!==CM.sa)}
  const A=SCH[CM.sa],B=SCH[CM.sb],g=CM.g;if(!A||!B)return {html:'<p class="ccmsg">Type a school in A and B.</p>',evs:[],ss:[]};
  const ss=seaOf(A.d).filter(k=>seaOf(B.d).includes(k));if(!ss.includes(CM.tsea))CM.tsea=ss.includes(R.season)?R.season:ss[0];
  const evs=[...new Set([...teamEvents(CM.sa,CM.tsea,g),...teamEvents(CM.sb,CM.tsea,g)])];if(evs.length&&!evs.includes(CM.te))CM.te=evs.includes("400 Meters")?"400 Meters":evs[0];
  const e=CM.te,ta=teamRows(CM.sa,CM.tsea,e,g),tb=teamRows(CM.sb,CM.tsea,e,g),na=A.t||A.n,nb=B.t||B.n;
  if(!ta||!tb)return {html:'<div class="cmload">Loading the teams…</div>',evs,ss};
  const miss=[[ta,na],[tb,nb]].filter(([t])=>t.err||!t.rows.length).map(([t,n])=>n);
  const ra=ta.rows||[],rb=tb.rows||[],N=Math.max(ra.length,rb.length,1),show=CM.open?Math.min(N,25):Math.min(N,5);
  const cell=(t,k)=>{const x=(t.rows||[])[k];return x?`<td><b>${esc(x.r[4])}</b><small>${esc(x.r[1]||"")}${x.r[2]?" · "+esc(yr(x.r[2])):""}</small></td>`:"<td>–</td>"};
  let ans="";if(ra[0]&&rb[0]){const d=rhigh(e)?ra[0].v-rb[0].v:rb[0].v-ra[0].v,amt=rhigh(e)?(Math.abs(d)>=1?Math.abs(d).toFixed(2)+" m":Math.round(Math.abs(d)*100)+" cm"):Math.abs(d).toFixed(2)+" seconds";
    ans=Math.abs(d)<0.005?`<p class="cmans">Their best ${esc(evLabel(e))} marks are the same.</p>`:`<p class="cmans"><b class="${d>0?"ca":"cb"}">${esc(d>0?na:nb)}</b>'s best ${esc(evLabel(e))} athlete is <b>${amt} ${rhigh(e)?"farther":"faster"}</b> than ${esc(d>0?nb:na)}'s.</p>`}
  /* where would you fit: the kid's own PR (profile) or a typed mark */
  const mine=(ACC.myMarks&&ACC.myMarks()||[]).find(m=>m.e===rlab(e)),kid=pickKid(),kidm=kid&&kid.marks.find(m=>m.e===rlab(e));
  const myv=CM.my?rval(e,CM.my):mine?mine.v:kidm?kidm.v:null,who=CM.my?"You":mine?"You":kid?kid.first_name:"You";
  const place=rows=>rows.filter(x=>rhigh(e)?x.v>myv:x.v<myv).length+1;
  const fit=myv!=null&&(ra.length||rb.length)?`<p class="cmfit">${esc(who)}${who==="You"?"’d":" would"} be <b class="ca">#${place(ra)} on ${esc(na)}</b> and <b class="cb">#${place(rb)} on ${esc(nb)}</b> in the ${esc(evLabel(e))} this season.</p>`:"";
  const stdA=(A[g]||{})[rlab(e)],stdB=(B[g]||{})[rlab(e)];
  const std=stdA&&stdA[1]||stdB&&stdB[1]?`<p class="note">Recruit standard: ${esc(na)} ${stdA&&stdA[1]?esc(stdA[1]):"–"} · ${esc(nb)} ${stdB&&stdB[1]?esc(stdB[1]):"–"}</p>`:"";
  const X=rows=>rows.map(x=>({n:x.r[1]||"",sub:x.r[2]?yr(x.r[2]):"",mk:x.r[4],v:x.v}));
  return {evs,ss,html:`${miss.length?`<p class="ccmsg">No ${g==="m"?"men's":"women's"} ${esc(evLabel(e))} marks for ${esc(miss.join(" or "))} on TFRRS lists this season.</p>`:""}<p class="cmctx">${g==="m"?"Men's":"Women's"} ${esc(evLabel(e))} · ${esc(seasonLabel(CM.tsea))}</p>${ans}${fit}
    ${cmPair(e,na,nb,X(ra),X(rb))}${std}
    <p class="note">Athletes come from this season's TFRRS conference and national lists, so you see each team's athletes who made those lists, not the full roster.</p>`}}
function cmTeamPick(k){const i=CM[k],x=SCH[i],id="cms"+k[1];
  if(CM.edit===k||!x)return `<div class="search cmsearch">${MAG}<label class="sr" for="${id}">Search a school for ${k==="sa"?"A":"B"}</label><input class="in" id="${id}" placeholder="Type a school name" autocomplete="off" enterkeyhint="go"><div id="${id}d"></div></div>`;
  return `<button type="button" class="cmteam" data-cmedit="${k}" aria-label="Change team ${k==="sa"?"A":"B"}">${tlogo(x)}<span><b>${esc(x.t||x.n)}</b><small>${esc(x.d)}${x.c&&x.c!==x.d?" · "+esc(x.c):""}</small></span><em>Change</em></button>`}
function compareView(){cmFix();const t=CM.t,g=CM.g;loadBrand();
  const types=[["years","Years","Same event, two seasons"],["conf","Conferences","Two conferences"],["div","Divisions","D1 vs D2, D3, NAIA"],["schools","Teams","Two teams' athletes"]];
  const gsel=`<div class="cmp cmgp"><span>Men or women</span><div class="seg cmgs" role="group" aria-label="Men or women"><button type="button" data-cmg="m" aria-pressed="${g==="m"}">Men</button><button type="button" data-cmg="w" aria-pressed="${g==="w"}">Women</button></div></div>${windSw()}`;
  let shared="",A="",B="",body="",what="";
  if(t==="schools"){const r=cmTeams();
    shared=`${gsel}${cmPick("te","Event",cmOpts(r.evs.length?r.evs:[CM.te||"400 Meters"],CM.te,evLabel))}${cmPick("tsea","Season",cmOpts(r.ss,CM.tsea,seasonLabel))}<label class="cmp cmmy"><span>Your time (optional)</span><input data-cmmy value="${esc(CM.my||"")}" placeholder="e.g. 49.50" inputmode="decimal" autocomplete="off"></label>`;
    A=cmTeamPick("sa");B=cmTeamPick("sb");body=r.html;what="two teams"}
  else{const divsAll=Object.keys(DIVINFO).filter(d=>RIDX.some(r=>r.div===d));
    const evsrc=cmData(cmSides()[0]),evs=evsrc&&!evsrc.err&&evsrc.L?Object.keys(evsrc.L.g[g]||{}):[];if(evs.length&&!evs.includes(CM.e))CM.e=evs[0];
    const ev=cmPick("e","Event",cmOpts(evs.length?evs:[CM.e],CM.e,evLabel));
    if(t==="years"){const ss=seaOf(CM.div),x=cmData({sea:CM.a,div:CM.div,l:"nat"}),cs=x&&!x.err?confsOf(x.D):[];if(CM.conf&&!cs.includes(CM.conf)&&cs.length)cs.unshift(CM.conf);
      shared=`${gsel}${ev}${cmPick("div","Division",cmOpts(divsAll,CM.div))}${cmPick("conf","Conference",`<option value="">All of ${esc(CM.div)}</option>`+cmOpts(cs,CM.conf))}`;
      A=cmPick("a","Year",cmOpts(ss,CM.a,seasonLabel));B=cmPick("b","Year",cmOpts(ss,CM.b,seasonLabel));what="two seasons"}
    else if(t==="conf"){const ca=cmConfs(CM.da)||[CM.a].filter(Boolean),cb=cmConfs(CM.db)||[CM.b].filter(Boolean),both=seaOf(CM.da).filter(k=>seaOf(CM.db).includes(k));
      shared=`${gsel}${ev}${cmPick("sea","Season",cmOpts(both,CM.sea,seasonLabel))}`;
      A=cmPick("da","Division",cmOpts(divsAll,CM.da,d=>DIVINFO[d]||d))+cmPick("a","Conference",cmOpts(ca,CM.a));B=cmPick("db","Division",cmOpts(divsAll,CM.db,d=>DIVINFO[d]||d))+cmPick("b","Conference",cmOpts(cb,CM.b));what="two conferences (any divisions)"}
    else{const ds=RIDX.filter(r=>r.year+"-"+r.season===CM.sea).map(r=>r.div).sort((a,b)=>Object.keys(DIVINFO).indexOf(a)-Object.keys(DIVINFO).indexOf(b));
      shared=`${gsel}${ev}${cmPick("sea","Season",cmOpts(seasons().filter(k=>!k.endsWith("-xc")),CM.sea,seasonLabel))}`;
      A=cmPick("a","Division",cmOpts(ds,CM.a,d=>DIVINFO[d]||d));B=cmPick("b","Division",cmOpts(ds,CM.b,d=>DIVINFO[d]||d));what="two divisions"}
    body=cmResults()}
  return `<div class="sec cmx"><div class="cmhd"><button type="button" class="cmpsw" data-rcmp aria-pressed="true" title="Turn compare off to go back to the results lists"><span class="sw" aria-hidden="true"></span>Compare</button><span class="cmoff">Turn off to go back to the results</span></div>
    <p class="cmq"><span>1</span>What do you want to compare?</p><div class="cmtypes" role="tablist">${types.map(([k,l,d])=>`<button type="button" role="tab" data-cmt="${k}" aria-selected="${t===k}"><b>${l}</b><small>${d}</small></button>`).join("")}</div>
    <p class="cmq"><span>2</span>Pick the event</p><div class="cmrow">${shared}</div>
    <p class="cmq"><span>3</span>Choose ${what}</p><div class="cmab"><div class="cmside ca"><span class="cmtag">A</span>${A}</div><span class="cmvs">vs</span><div class="cmside cb"><span class="cmtag">B</span>${B}</div></div>
    <div class="cmout">${body}</div>${ACC.member()||t==="schools"?"":`<p class="note">Source: TFRRS performance lists.</p>`}</div>`}
function compareViewOld(){
  const ctl=`<div class="rctl"><label class="sr" for="ry">Year</label><select class="in" id="ry">${years().map(y=>`<option ${y===R.season.split("-")[0]?"selected":""}>${y}</option>`).join("")}</select><div class="seg" role="group" aria-label="Season">${["outdoor","indoor","xc"].filter(x=>RIDX.some(r=>r.year===R.season.split("-")[0]&&r.season===x)).map(x=>`<button data-rsea="${x}" aria-pressed="${R.season.endsWith(x)}">${{outdoor:"Outdoor",indoor:"Indoor",xc:"XC"}[x]}</button>`).join("")}</div></div>`;
  const pre=[["yy","Year vs Year"],["mw","Men vs Women"],["ev","Event vs Event"],["conf","Conference vs Conference"],["school","School vs School"],["div","Division vs Division"]];
  const mode=`<div class="seg csmode" role="group" aria-label="What to compare"><button type="button" data-ccmode="res" aria-pressed="${CC.mode!=="std"}">Results lists</button><button type="button" data-ccmode="std" aria-pressed="${CC.mode==="std"}">School standards</button></div>`;
  if(CC.mode==="std")return `<div class="sec"><p class="lede">Compare the Target, Recruit and Walk-On standards of up to four programs, for one event or every event.</p><div class="rcard"><div class="dsel"><button type="button" class="cmpsw" data-rcmp aria-pressed="true"><span class="sw" aria-hidden="true"></span>Compare</button>${mode}</div></div><div class="rbody swap">${stdCompare()}</div></div>`;
  return `<div class="sec"><p class="lede">Compare any lists side by side, in any year: divisions, conferences, schools, men and women, two events, or one list year against year.</p><div class="rcard">
    <div class="dsel"><button type="button" class="cmpsw" data-rcmp aria-pressed="true"><span class="sw" aria-hidden="true"></span>Compare</button>${mode}<div class="ccp" role="group" aria-label="Quick comparisons">${pre.map(([k,t])=>`<button type="button" data-ccp="${k}">${t}</button>`).join("")}</div></div>${ctl}</div>
    <div class="rbody${R.swap?" swap":""}"><div class="cols cc" style="--n:${CC.cols.length}">${CC.cols.map(ccColumn).join("")}</div>${ACC.member()?"":ACC.wall("results")}
    ${CC.cols.length<ccMax()?`<p style="margin:12px 2px"><button class="lnk" data-ccadd>+ Add a column</button></p>`:""}${ccChart()}
    <p class="note">Source: TFRRS performance lists. "% of #1" puts different events, genders and lists on one scale: the list leader is 100%.</p></div></div>`}
function divTabs(){
  const divs=RIDX.filter(x=>x.year+"-"+x.season===R.season).map(x=>x.div).sort((a,b)=>Object.keys(DIVINFO).indexOf(a)-Object.keys(DIVINFO).indexOf(b));
  syncSel();const allOn=R.sel.length===divs.length&&divs.length>1;
  return `<div class="dsel"><button type="button" class="cmpsw" data-rcmp aria-pressed="${!!R.cmp}" title="Show selected divisions side by side"><span class="sw" aria-hidden="true"></span>Compare</button>
  <div class="divs multi" role="group" aria-label="Division"><button type="button" data-rdiv="ALL" aria-pressed="${allOn}"><b>All</b></button>${divs.map(d=>`<button type="button" data-rdiv="${d}" aria-pressed="${R.sel.includes(d)&&!allOn}" aria-label="${d}"><b>${d.replace(/^NCAA /,"")}</b></button>`).join("")}</div>
  <button type="button" class="cmbsw" data-rmulti aria-pressed="${!!R.multi}" title="Pick more than one division"><span class="sw" aria-hidden="true"></span>Combine</button></div>`;
}
function hookRow(){const d=R.div;
  const t=d==="D1"?"Looking at D1 marks? See if you actually qualify.":`Could you compete in ${d}? See where you fit.`;
  return `<div class="hook solo"><div><b>${t}</b><span>Get a free recruitment evaluation from Preferred Recruit. It takes about a minute.</span></div><a href="${esc(quizFor())}" target="_blank" rel="noopener">Get my recruitment evaluation</a></div>`}
function skeleton(){return `<div class="grid">${Array.from({length:8},(_,i)=>`<div class="sk"><i style="width:30px;height:30px;border-radius:50%"></i><i style="width:${30+((i*17)%30)}%"></i><i style="width:18%;margin-left:auto"></i></div>`).join("")}</div>`}
let ATH=null,ATHL=null;
function loadAth(){if(ATH||ATHL)return;ATHL=fetch("/data/athletes.json").then(r=>r.json()).then(d=>{ATH=d}).catch(()=>{ATH={}}).then(()=>{if(R.ath)render()})}
const evName=e=>/^\d[\d,]*$/.test(e)?e+"m":e;
/* athlete profile pages (scripts/seo/athletes.mjs): TFRRS id -> /athletes/<slug>.html, linked from the in-app athlete view */
let AIX=null;function loadAix(){if(AIX!==null)return;AIX={};fetch("/data/athletes-index.json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>{AIX=j||{};if(R.ath)render()})}
/* careers (Ryan 2026-10-23: "my cal poly times arent here"): every season, every school, joined by TFRRS athlete id
   (scripts/tfrrs/build_career.py -> /data/career/<id % 512>.dat) */
const CAR={},CARL={};
function loadCareer(id){const b=+id%512;if(CAR[b]||CARL[b])return;const get=u=>fetch(u,{cache:"no-cache"}).then(r=>{if(!r.ok||typeof DecompressionStream==="undefined")throw 0;return unpack(r)});
  /* the Monday refresh's copy has this week's marks; the site copy is the fallback */
  CARL[b]=(LIVE_KEYS.size?get(LIVE_BASE+"career/"+b+".dat").catch(()=>get("/data/career/"+b+".dat")):get("/data/career/"+b+".dat")).then(j=>{CAR[b]=j}).catch(()=>{CAR[b]={}}).then(()=>{R.swap=false;render()})}
const DIVKEY={"NCAA D1":"d1","NCAA D2":"d2","NCAA D3":"d3",NAIA:"naia",NJCAA:"njcaa",NCCAA:"nccaa",NWAC:"nwac",USCAA:"uscaa"};
/* wind-legal careers: an aided season best is swapped for that season's legal best (same /data/legal files as the lists) */
function legalAlt(x,aid){const k=x[0]+"-"+DIVKEY[x[1]];if(!wkey(k))return null;const G=LEG[k];if(!G){loadLegal(k).then(()=>{R.swap=false;render()});return undefined}
  for(const g of ["m","w"]){const E=(G[g]||{})[x[2]];if(E)for(const p in E)if(p.split("/")[0]===aid)return E[p]}return null}
const careerOf=id=>{const b=CAR[+id%512];return b?(b[id]||{n:"",s:[]}):null};
/* progression (Ryan 2026-10-24: "charts for each event to show year-to-year and season-to-season improvements ... how athletes
   progressed under different coaches"): one chart per event, season bests in order (indoor hollow, outdoor solid), each school its
   own colour with a marker where they changed schools; up is always better */
const PCOL=["#7A45F0","#0EA5A4","#E8762D","#D6336C","#2F80ED","#5B8C2A"];
const skey=k=>{const [y,t]=k.split("-");return +y*2+(t==="outdoor"?1:0)};
/* charts are drawn at the width they are shown (2026-10-25 audit: a 640-wide chart shrunk onto a phone made its labels ~6px) */
const CW=()=>Math.min(640,Math.max(340,(typeof innerWidth==="number"?innerWidth:640)-36));
function progChart(rows,ev){const c=ecode(ev),F=tfield(c),pts=rows.filter(x=>x[2]===ev&&tval(x[3])!=null).sort((a,b)=>skey(a[0])-skey(b[0]));if(!pts.length)return "";
  const sch=[...new Set(pts.map(x=>tcanon(x[5])))],col=t=>PCOL[sch.indexOf(tcanon(t))%PCOL.length];
  const W=CW(),H=230,L=pts.length<2?(W-18)/2:(W<500?46:64),Rr=pts.length<2?(W-18)/2:18,T=26,Bt=44,v=pts.map(x=>tval(x[3])),lo=Math.min(...v),hi=Math.max(...v),pad=(hi-lo||Math.abs(hi)*.02||1)*.18;
  const y=x=>{const f=(x-(lo-pad))/((hi+pad)-(lo-pad));return T+(F?1-f:f)*(H-T-Bt)},X=i=>L+(pts.length===1?0:i*(W-L-Rr)/(pts.length-1));
  const lab=k=>{const [yy,t]=k.split("-");return `${t==="indoor"?"In":"Out"} ’${yy.slice(2)}`};
  let g=`<svg class="pgc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(evLabel(ev))} progression">`;
  [lo,hi].forEach(z=>{g+=`<line x1="${L}" x2="${W-Rr}" y1="${y(z)}" y2="${y(z)}" class="pgg"/>${pts.length>9?`<text x="${L-8}" y="${y(z)+4}" text-anchor="end" class="pgt">${esc(pts[v.indexOf(z)][3].replace(/\s*[@#]+/g,""))}</text>`:""}`});   /* axis values only when points aren't labelled */
  pts.forEach((x,i)=>{if(i&&tcanon(x[5])!==tcanon(pts[i-1][5])){const xm=(X(i)+X(i-1))/2;g+=`<line x1="${xm}" x2="${xm}" y1="${T-10}" y2="${H-Bt}" class="pgs"/><text x="${xm+4}" y="${T-12}" class="pgt pgn">→ ${esc(tcanon(x[5]))}</text>`}});
  g+=`<polyline class="pgl" points="${pts.map((x,i)=>X(i)+","+y(v[i])).join(" ")}"/>`;
  pts.forEach((x,i)=>{const ind=/indoor/.test(x[0]);g+=`<circle cx="${X(i)}" cy="${y(v[i])}" r="6" fill="${ind?"var(--pr-card)":col(x[5])}" stroke="${col(x[5])}" stroke-width="2.5"><title>${esc(seasonLabel(x[0]))} · ${esc(tcanon(x[5]))} · ${esc(x[3])}${x[4]?" (wind "+esc(x[4])+")":""}</title></circle>`;
    if(pts.length<=9)g+=`<text x="${X(i)}" y="${y(v[i])-12}" text-anchor="middle" class="pgv">${esc(x[3].replace(/\s*[@#]+/g,""))}</text>`;g+=`<text x="${X(i)}" y="${H-Bt+20}" text-anchor="middle" class="pgt">${lab(x[0])}</text>`});
  const a=v[0],b=v[v.length-1],imp=F?(b-a)/a:(a-b)/a;
  return g+`</svg><p class="pgcap">${sch.map(t=>`<span><i style="background:${col(t)}"></i>${esc(t)}</span>`).join("")}<span><i class="pgin"></i>indoor</span>${pts.length<2?`<b>One season of marks in this event so far</b>`:`<b class="${imp>=0?"up":"dn"}">${imp>=0?"+":""}${(imp*100).toFixed(1)}% from first to latest season</b>`}</p>`}
/* within a season (Ryan 2026-10-24: progression "throughout a specific season and across all the years"): every race from the
   athlete's TFRRS meet history (/data/history/<id % 1024>.dat, scripts/tfrrs/build_history.py), dated on the x axis */
const HIS={},HISL={};
function loadHist(id){const b=+id%1024;if(HIS[b]||HISL[b])return;HISL[b]=fetch("/data/history/"+b+".dat").then(r=>{if(!r.ok||typeof DecompressionStream==="undefined")throw 0;return unpack(r)}).then(j=>{HIS[b]=j}).catch(()=>{HIS[b]={}}).then(()=>{const w=document.querySelector(".pgw");if(w&&PGCS){const t=document.createElement("div");t.innerHTML=progBlock(PGCS,PGID);const n=t.querySelector(".pgw");if(n)w.replaceWith(n)}})}
const histOf=id=>{const b=HIS[+id%1024];return b?(b[id]||[]):null};
const dnum=d=>{const [y,m,dd]=d.split("-").map(Number);return Date.UTC(y,m-1,dd)/864e5};
/* one date style everywhere (2026-10-25 audit): ISO and TFRRS list dates -> "Jun 5, 2024" */
const MO="Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const fmtD=d=>{d=String(d||"");let m=d.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return `${MO[+m[2]-1]} ${+m[3]}, ${m[1]}`;m=d.match(/^(\d{1,2})\/(\d{1,2})(?:-\d{1,2})?\/(\d{2})$/);if(m)return `${MO[+m[1]-1]} ${+m[2]}, 20${m[3]}`;return d.replace(/\s*-\s*\d{1,2},/,",")};
const fmtW=w=>{const n=parseFloat(w);return isNaN(n)?String(w):(n>0?"+":"")+n.toFixed(1)};
function seasonChart(H,code,sk){const F=tfield(code),all=H.filter(x=>x[0]===sk&&x[3]===code&&tval(x[4])!=null&&x[1]);if(!all.length)return `<p class="pgnone">No ${esc(ename(code))} races in ${esc(seasonLabel(sk))}.</p>`;
  /* one point per meet (Ryan 2026-10-25: "why are there random dots"): each meet day's best mark, labelled; prelims and other rounds
     stay in that point's tooltip count, not as unlabeled dots. With wind-legal on, aided marks are left out. */
  const ok=x=>!(WIND&&WCODE.has(code)&&aided(x[5])),better=(a,b)=>F?a>b:a<b;
  const days=[...new Set(all.map(x=>x[1]))],pts=days.map(dd=>{const r=all.filter(x=>x[1]===dd&&ok(x));if(!r.length)return null;const b=r.reduce((p,q)=>better(tval(q[4]),tval(p[4]))?q:p);b.nr=r.length;return b}).filter(Boolean);
  if(!pts.length)return `<p class="pgnone">No wind-legal ${esc(ename(code))} marks in ${esc(seasonLabel(sk))}.</p>`;
  const v=pts.map(x=>tval(x[4])),best=F?Math.max(...v):Math.min(...v),bi=v.indexOf(best);
  const W=CW(),H2=230,L=30,Rr=30,T=30,Bt=44,lo=Math.min(...v),hi=Math.max(...v),pad=(hi-lo||Math.abs(hi)*.02||1)*.22,d0=dnum(pts[0][1]),d1=dnum(pts[pts.length-1][1]);
  const y=z=>{const f=(z-(lo-pad))/((hi+pad)-(lo-pad));return T+(F?1-f:f)*(H2-T-Bt)},X=x=>d1===d0?W/2:L+(dnum(x[1])-d0)/(d1-d0)*(W-L-Rr);
  const fmt=d=>{const [yy,m,dd]=d.split("-");return MO[+m-1]+" "+(+dd)};
  let g=`<svg class="pgc" viewBox="0 0 ${W} ${H2}" role="img" aria-label="${esc(ename(code))} meet bests, ${esc(seasonLabel(sk))}">`;
  g+=`<polyline class="pgl" points="${pts.map((x,i)=>X(x)+","+y(v[i])).join(" ")}"/>`;
  const LB=[];[bi,...pts.map((_,i)=>i).filter(i=>i!==bi)].forEach(i=>{const x=pts[i],isB=i===bi,cx=X(x),cy=y(v[i]),tx=x[4].replace(/\s*[@#]+/g,""),w2=tx.length*4.2+6;
    g+=`<circle cx="${cx}" cy="${cy}" r="${isB?7:5.5}" fill="${isB?"#13865a":"#7A45F0"}"><title>${esc(fmt(x[1]))} · ${esc(x[2])} · ${esc(x[4])}${x[5]?" (wind "+esc(x[5])+")":""}${x.nr>1?` · best of ${x.nr} rounds`:""}</title></circle>`;
    let ly=cy-13;const hit=yy=>LB.some(b=>Math.abs(b[0]-cx)<w2+b[2]&&Math.abs(b[1]-yy)<15);if(hit(ly))ly=cy+22;
    if(isB||!hit(ly)){LB.push([cx,ly,w2]);g+=`<text x="${cx}" y="${ly}" text-anchor="middle" class="pgv${isB?" pgb":""}">${esc(tx)}</text>`}});
  const tk=pts.map(x=>x[1]),ticks=tk.length<=6?tk:[tk[0],tk[Math.floor(tk.length/3)],tk[Math.floor(2*tk.length/3)],tk[tk.length-1]];
  ticks.forEach(dd=>{g+=`<text x="${X([0,dd])}" y="${H2-Bt+20}" text-anchor="middle" class="pgt">${fmt(dd)}</text>`});
  const bx=pts[bi],ch=(F?(best-v[0])/v[0]:(v[0]-best)/v[0]);
  return g+`</svg><p class="pgcap"><span><i style="background:#7A45F0"></i>best mark at each meet</span><span><i style="background:#13865a"></i>season best: ${esc(bx[4])} at ${esc(bx[2])}, ${esc(fmt(bx[1]))}</span><b class="${ch>=0?"up":"dn"}">${pts.length} meet${pts.length>1?"s":""}${bi>0?` · ${ch>=0?"+":""}${(ch*100).toFixed(1)}% from first meet to best`:""}</b></p>`}
/* the progression box; switching events redraws only this box, so the page doesn't jump */
let PGCS=null,PGID="";
function progBlock(cs,aid){PGCS=cs;PGID=aid||PGID;/* every event they've competed in (Ryan 2026-10-24: "toggle to the 200 or click into any other event"); most seasons first */
    const nS=e=>cs.filter(x=>x[2]===e).length,evs=[...new Set(cs.map(x=>x[2]))].sort((p,q)=>nS(q)-nS(p)||eord(ecode(p))-eord(ecode(q)));if(!evs.length)return "";
    if(!evs.includes(R.pev))R.pev=evs[0];
    const H=PGID?histOf(PGID):null;if(PGID&&H===null)loadHist(PGID);const code=ecode(R.pev);
    const hs=H?[...new Set(H.filter(x=>x[3]===code).map(x=>x[0]))].sort((a,b)=>skey(b)-skey(a)):[];if(!hs.includes(R.psea))R.psea=hs[0];
    const mode=`<div class="seg pgmode" role="group" aria-label="View"><button type="button" data-pmode="years" aria-pressed="${R.pmode!=="season"}">Across years</button><button type="button" data-pmode="season" aria-pressed="${R.pmode==="season"}">Within a season</button></div>`;
    const body=R.pmode==="season"?(H===null?'<p class="pgnone">Loading every race…</p>':!hs.length?`<p class="pgnone">Meet-by-meet marks for this athlete aren't loaded yet. They fill in as the TFRRS scan reaches them; the season bests are under Across years.</p>`
      :`<div class="evs pgsea" role="group" aria-label="Season">${hs.map(k=>`<button type="button" data-psea="${esc(k)}" aria-pressed="${k===R.psea}">${esc(seasonLabel(k))}</button>`).join("")}</div>${seasonChart(H,code,R.psea)}`):progChart(cs,R.pev);
    return `<div class="ah2">Progression</div><div class="pgw">${mode}${evs.length>1?`<div class="evs pgev" role="group" aria-label="Event">${evs.map(e=>`<button type="button" data-pev="${esc(e)}" aria-pressed="${e===R.pev}">${esc(evLabel(e))}<small>${nS(e)}</small></button>`).join("")}</div>`:""}${body}</div>`}
function athView(D){
  const a=R.ath, P=ATH&&ATH[a.path]; if(a.path&&!ATH) loadAth(); loadAix();
  const prof=a.path&&AIX&&AIX[String(a.path).split("/")[0]];
  const marks=[];D.lists.forEach(l=>{Object.entries(l.g[R.g]||{}).forEach(([e,rows])=>rows.forEach(r=>{if(r[1]===a.name&&r[3]===a.team)marks.push({e,l,r})}))});
  const best={};marks.forEach(m=>{const c=best[m.e];if(!c||(m.l.nat&&!c.l.nat)||(m.l.nat===c.l.nat&&m.r[0]<c.r[0]))best[m.e]=m});
  const init=a.name.split(" ").map(w=>w[0]).slice(0,2).join("");
  const tlink=a.path?`https://tf.tfrrs.org/athletes/${a.path}`:"";
  const aid=a.path?String(a.path).split("/")[0]:"";if(aid)loadCareer(aid);const C=aid?careerOf(aid):null,cs=(C?C.s:[]).map(x=>{if(!WIND||!WEV.has(x[2])||!aided(x[4]))return x;const L=legalAlt(x,aid);if(!L)return Object.assign(x.slice(),{ad:1});const y=x.slice();y[3]=L[0];y[4]=L[1];y[7]=L[2];y[8]=L[3];y[6]=0;y.lg=1;return y});
  /* college bests across every season and school */
  const cb={};cs.forEach(x=>{const c=ecode(x[2]),v=tval(x[3]);if(v==null||x.ad)return;const k=x[2]+"|"+x[0].split("-")[1],o=cb[k];if(!o||tbetter(c,v,o.v))cb[k]={x,v}});
  const pbs=cs.length?Object.values(cb).sort((p,q)=>eord(ecode(p.x[2]))-eord(ecode(q.x[2]))).map(({x})=>[evLabel(x[2])+(/indoor/.test(x[0])&&!/^(60|Mile|Weight|Pent|600|1000|3000 M)/.test(x[2])?" (indoor)":""),x[3],x[4],x[0].slice(0,4)+" · "+tcanon(x[5])])
    :P&&P.bests&&P.bests.length?P.bests.map(([e,m,w])=>[evName(e),m,w]):Object.values(best).map(m=>[evLabel(m.e),m.r[4],m.r[5]]);
  const schools=[...new Set([...((C&&C.p)||[]).map(tcanon),...cs.slice().reverse().map(x=>tcanon(x[5]))])];   /* TFRRS "previously at" first */
  let o=`<div class="rbody${R.swap?" swap":""}"><p style="margin:14px 2px 0"><button class="lnk" data-athback>‹ Back to rankings</button></p>
  <div class="ahead"><div class="avt" aria-hidden="true">${esc(init)}</div><div><h3>${esc(a.name)}</h3><p>${esc([yr(a.yr),schools.length>1?schools.join(" → "):D.teams[a.team],DIVINFO[R.div]||R.div].filter(Boolean).join(" · "))}</p></div>${prof?`<a href="${prof}">Full profile ›</a>`:tlink?`<a href="${tlink}" target="_blank" rel="noopener">Full profile on TFRRS ›</a>`:""}</div>
  <div class="ah2">College bests</div><div class="pbs">${pbs.map(([e,m,w,sub])=>{const ad=w&&parseFloat(w)>2;return `<div><small>${esc(e)}</small><b>${esc(m)}${ad?"w":""}</b>${sub?`<span>${esc(sub)}</span>`:""}${w?`<span>wind ${esc(fmtW(w))}${ad?" · aided":""}</span>`:""}</div>`}).join("")}</div>
  <div class="ah2">${esc(seasonLabel(R.season))} rankings</div><div class="grid"><div class="gh agr"><span>Event</span><span class="al">List</span><span>Rank</span><span style="text-align:right">Mark</span></div>
  ${Object.values(best).map(m=>`<div class="gr agr"><span style="font-weight:600">${esc(evLabel(m.e))}</span><span class="al" style="color:var(--pr-mute);font-size:14px">${esc(m.l.nat?(DIVINFO[R.div]||R.div)+" national":m.l.label)}</span><span class="rkb" style="width:auto;padding:0 10px;border-radius:999px">#${esc(m.r[0])}</span><span class="gmk">${esc(m.r[4])}${m.r[8]?`<small>${esc(m.r[8])}</small>`:""}</span></div>`).join("")}</div>
  ${progBlock(cs,aid)}
  ${cs.length?`<div class="ah2">Career by season</div><div class="grid"><div class="gh agr"><span>Season</span><span class="al">School · event</span><span>Rank</span><span style="text-align:right">Mark</span></div>
  ${cs.map(x=>`<div class="gr agr"><span style="font-weight:600">${esc(seasonLabel(x[0]))}</span><span class="al" style="font-size:14px">${esc(tcanon(x[5]))} · ${esc(evLabel(x[2]))}<small style="display:block;color:var(--pr-mute)">${esc(x[7])}${x[8]?" · "+esc(fmtD(x[8])):""}</small></span>${x[6]?`<span class="rkb" style="width:auto;padding:0 10px;border-radius:999px">#${esc(x[6])}</span>`:"<span></span>"}<span class="gmk">${esc(x[3])}${WEV.has(x[2])&&aided(x[4])&&!x.lg?"w":""}${x[4]?`<small>wind ${esc(fmtW(x[4]))}${x.lg?" · legal best":WEV.has(x[2])&&aided(x[4])?" · aided":""}</small>`:""}</span></div>`).join("")}</div>${WIND&&cs.some(x=>x.lg||x.ad)?`<p class="wnote">Wind-legal is on: wind-aided season bests are replaced by that season's legal best${cs.some(x=>x.ad)?"; marked aided where no legal mark was found yet":""}.</p>`:""}`:""}
  <div class="ah2">Meet history</div>`;
  if(a.path&&!ATH) o+=skeleton();
  else if(P&&P.meets&&P.meets.length) o+=`<div class="meets">${P.meets.map(m=>`<article class="mt1"><div class="mh"><b>${esc(m.meet)}</b><span>${esc(fmtD(m.date))}</span></div>${m.rows.map(r=>`<div class="mr"><span>${esc(evName(r[0]))}</span><b>${esc(r[1])}${r[2]?`<small>wind ${esc(r[2])}</small>`:""}</b>${r[3]?`<span class="plc ${/^1st/.test(r[3])?"w1":""}">${esc(r[3].replace(/\s*\(P\)/," · Prelim").replace(/\s*\(F\)/," · Final"))}</span>`:"<span></span>"}</div>`).join("")}</article>`).join("")}</div>`;
  else o+=`<div class="soon">Every race, round and meet for ${esc(a.name)} is on TFRRS.${tlink?` <a href="${tlink}" target="_blank" rel="noopener">See the full meet history ›</a>`:""}</div>`;
  return o+`${hookRow()}</div></div>`;
}
/* ---------- All divisions + Compare (Ryan 2026-10-17: "combine divisions ... all colleges ranked ... or even compare divisions") ----------
   Uses each division's national list for the season (the same files the single-division view loads). */
function multiResults(){
  const ks=RIDX.filter(x=>x.year+"-"+x.season===R.season&&R.sel.includes(x.div)).sort((a,b)=>Object.keys(DIVINFO).indexOf(a.div)-Object.keys(DIVINFO).indexOf(b.div));
  const CMPV=R.cmp&&WIDE();
  ks.forEach(x=>{if(!CACHE[x.key])load(x.key,true)});
  const ready=ks.filter(x=>CACHE[x.key]&&!CACHE[x.key].err);
  const nm=R.sel.length===seasonDivs().length?"Every division":R.sel.map(d=>d.replace(/^NCAA /,"")).join(" + ");
  let o=`<div class="sec"><p class="lede">${CMPV?`${esc(nm)}, side by side.`:`${esc(nm)} in one ranking.`}</p><div class="rcard">${divTabs()}`;
  const ctl=`<div class="rctl"><label class="sr" for="ry">Year</label><select class="in" id="ry">${years().map(y=>`<option ${y===R.season.split("-")[0]?"selected":""}>${y}</option>`).join("")}</select><div class="seg" role="group" aria-label="Season">${["outdoor","indoor","xc"].filter(x=>x!=="xc"||RIDX.some(r=>r.season==="xc")).map(x=>{const ok=x==="xc"||RIDX.some(r=>r.year===R.season.split("-")[0]&&r.season===x);return `<button data-rsea="${x}" aria-pressed="${R.season.endsWith(x)}" ${ok?"":"disabled"}>${{outdoor:"Outdoor",indoor:"Indoor",xc:"XC"}[x]}</button>`}).join("")}</div>${seg("rg",R.g)}${windSw()}`;
  if(ready.length<ks.length)return o+ctl+`<span></span><span></span></div></div>`+skeleton()+`</div>`;
  const nat=D=>D.lists.find(l=>l.nat)||D.lists[0];
  const evNames=[...new Set(ready.flatMap(x=>Object.keys((nat(CACHE[x.key]).g||{})[R.g]||{})))];if(!evNames.includes(R.ev))R.ev=evNames[0];
  const per=ready.map(x=>{const D=CACHE[x.key],rows=((nat(D).g||{})[R.g]||{})[R.ev]||[];return {div:x.div,D,rows}}).filter(p=>p.rows.length);
  const gname=R.g==="m"?"Men's":"Women's";
  if(CMPV){
    const P=[1,10,25,50],top=R.cn||25;
    o+=ctl+`<span></span><span></span></div></div><div class="evwrap"><div class="evs" role="group" aria-label="Event">${evNames.map(e=>`<button data-rev="${esc(e)}" aria-pressed="${e===R.ev}">${esc(evLabel(e))}</button>`).join("")}</div></div>
    <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${gname} ${esc(evLabel(R.ev))}</h3><span>${esc(seasonLabel(R.season))} · national lists</span></div>
    <div class="cols" style="--n:${per.length}">${per.map(p=>`<section class="col"><header><b>${esc(DIVINFO[p.div]||p.div)}</b><span>${P.map(k=>p.rows[k-1]?`#${k} ${esc(p.rows[k-1][4])}`:"").filter(Boolean).slice(0,2).join(" · ")}</span></header>
      <ol>${p.rows.slice(0,RCAP(top)).map((r,i)=>`<li><span class="rk">${i+1}</span><span class="nm"><b>${esc(r[1]||p.D.teams[r[3]])}</b><small>${esc(p.D.teams[r[3]]||"")}</small></span><span class="mk">${esc(r[4])}</span></li>`).join("")}</ol></section>`).join("")}</div>
    ${ACC.member()?(per.some(p=>p.rows.length>top)?`<button class="morer" data-cmore>Show more</button>`:""):rwall(Math.max(...per.map(p=>p.rows.length)),RCAP(top))}
    <p class="note">Each selected division's national list, side by side. Turn Compare off to combine them into one ranking. Source: TFRRS.</p>${hookRow()}</div></div>`;
    return o;
  }
  /* ALL: merge every division's national list for the event and re-rank by mark */
  /* every list in each division (national + conference lists), one best mark per athlete, so the ranking runs deep */
  let all=[];const seen=new Map();
  ready.forEach(x=>{const D=CACHE[x.key];D.lists.forEach(l=>(((l.g||{})[R.g]||{})[R.ev]||[]).forEach(r=>{const v=mval(r[4]);if(v==null)return;
    const o={div:x.div,name:r[1],yr:r[2],team:D.teams[r[3]],mark:r[4],wind:r[8]||(r[5]?"wind "+r[5]:""),meet:D.meets[r[6]],date:r[7],path:r[9],v};
    const id=x.div+"|"+(r[1]||"")+"|"+o.team,c=seen.get(id);if(!c)seen.set(id,o);else if(higher(R.ev,r[4])?v>c.v:v<c.v)seen.set(id,o)}))});
  all=[...seen.values()];
  const hi=all.length&&higher(R.ev,all[0].mark);all.sort((a,b)=>hi?b.v-a.v:a.v-b.v);
  const sts=[...new Set(all.map(x=>teamSt(x.team)).filter(Boolean))].sort((a,b)=>(ST_NAME[a]||a).localeCompare(ST_NAME[b]||b));
  o+=ctl+`<label class="sr" for="rs">State</label><select class="in" id="rs"><option value="">All states</option>${sts.map(x=>`<option value="${x}" ${x===R.st?"selected":""}>${esc(ST_NAME[x]||x)}</option>`).join("")}</select>
    <div class="search">${MAG}<label class="sr" for="rq">Search a school or athlete</label><input class="in" id="rq" placeholder="Search a school or athlete" value="${esc(R.q)}" autocomplete="off" enterkeyhint="go"><div id="rqd"></div></div></div></div>`;
  const q=R.q.trim().toLowerCase(),rows=all.filter(x=>(!q||(x.name||"").toLowerCase().includes(q)||(x.team||"").toLowerCase().includes(q))&&(!R.st||teamSt(x.team)===R.st));
  const show=R.an||100;
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event">${evNames.map(e=>`<button data-rev="${esc(e)}" aria-pressed="${e===R.ev}">${esc(evLabel(e))}</button>`).join("")}</div></div>
  <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${gname} ${esc(evLabel(R.ev))}, ${esc(nm.toLowerCase()==="every division"?"all divisions":nm)}</h3><span>${esc(seasonLabel(R.season))} · ${R.st?`${rows.length} of ${all.length} marks from ${esc(ST_NAME[R.st]||R.st)} schools`:`${all.length.toLocaleString()} marks from ${per.length} divisions`}</span></div>
  <div class="grid"><div class="gh"><span>Rank</span><span>Athlete</span><span>Team</span><span style="text-align:right">Mark</span><span>Meet</span></div>
  ${rows.slice(0,RCAP(show)).map(x=>{const k=all.indexOf(x)+1;return `<div class="gr ${k<=3?"p"+k:""}"><span class="rkb">${k}</span><span class="gnmw"><span class="gnm"><b>${esc(x.name||x.team)}</b></span><small>${esc(yr(x.yr))}${x.path?` · <a class="tf" href="https://tf.tfrrs.org/athletes/${esc(x.path)}" target="_blank" rel="noopener">TFRRS ↗</a>`:""}</small></span><span class="gtm" style="cursor:default">${esc(x.team)}<small class="dvt">${esc(DIVINFO[x.div]||x.div)}</small></span><span class="gmk">${esc(x.mark)}${x.wind?`<small>${esc(x.wind)}</small>`:""}</span><span class="gmt"><b>${esc(x.meet||"")}</b>${esc(x.date||"")}</span></div>`}).join("")||`<div class="gr"><span></span><span class="gnm"><small>No matches.</small></span></div>`}
  </div>${ACC.member()?(rows.length>show?`<button class="morer" data-amore>Show more</button>`:""):rwall(rows.length,RCAP(show))}${hookRow()}
  <p class="note">Every division's national and conference lists merged, one best mark per athlete, re-ranked by mark. Source: TFRRS performance lists.</p></div></div>`;
  return o;
}
/* ---------- Team pages (Ryan 2026-10-20: "emulating the functionality of TFRRS but with our premium branding") ----------
   /teams/<school> : school band (logo + colours, same as the standards page), then two tabs: Results (every event, each athlete's
   season best, TFRRS-style) and Roster (by class). Tap an athlete for their college bests and full meet history.
   D1: /data/roster/<TFRRS slug>.dat (scripts/tfrrs/build_teams.py: rosters + every athlete's TFRRS history).
   Other levels: built in the browser from the season's TFRRS lists (athletes who made a list). */
const TM={i:null,g:"m",sea:"",tab:"results",ath:null,ev:"",open:{}};
const TDATA={},TLOAD={};
const tbase=s=>s&&s.u?s.u.split("/").pop().replace(/\.html$/,"").replace("_college_m_","_college_").replace("_college_f_","_college_"):null;
const tslug=i=>slugOf(SCH[i].n).replace(/-track-standards$/,"");
function loadTeam(b){if(!b||TDATA[b]||TLOAD[b])return;TLOAD[b]=fetch("/data/roster/"+b+".dat").then(r=>{if(!r.ok||typeof DecompressionStream==="undefined")throw 0;return unpack(r)})
  .then(d=>{TDATA[b]=d}).catch(()=>{TDATA[b]={none:1}}).then(()=>{if(TM.i!=null&&tbase(SCH[TM.i])===b){R.swap=true;render()}})}
/* one event code for both sources: TFRRS history ("100","110H","LJ") and list names ("100 Meters","110 Hurdles","Long Jump") */
const ECODE={"High Jump":"HJ","Pole Vault":"PV","Long Jump":"LJ","Triple Jump":"TJ","Shot Put":"SP","Weight Throw":"WT","Discus":"DT","Hammer":"HT","Javelin":"JT","Pentathlon":"Pent","Heptathlon":"Hep","Decathlon":"Dec","Distance Medley Relay":"DMR","Sprint Medley Relay":"SMR"};
const ecode=e=>ECODE[e]||e.replace(/^(\d[\d,]*) Meters$/,"$1").replace(/^(\d+) Hurdles$/,"$1H").replace(/^(\d+) Steeplechase$/,"$1S").replace(/^4 x (\d+) Relay$/,"4x$1");
const ENAME={HJ:"High Jump",PV:"Pole Vault",LJ:"Long Jump",TJ:"Triple Jump",SP:"Shot Put",WT:"Weight Throw",DT:"Discus",HT:"Hammer",JT:"Javelin",Pent:"Pentathlon",Hep:"Heptathlon",Dec:"Decathlon",DMR:"Distance Medley",SMR:"Sprint Medley",Mile:"Mile"};
const ename=c=>ENAME[c]||c.replace(/^(\d[\d,]*)H$/,"$1m Hurdles").replace(/^(\d+)S$/,"$1m Steeple").replace(/^4x(\d+)y?$/,"4×$1 Relay").replace(/^(\d[\d,]*)$/,"$1m").replace(/^(\d+)y$/,"$1 yards");
const EORD=["55","60","100","150","200","300","400","500","600","600y","800","1000","1500","Mile","3000","5000","10,000","55H","60H","100H","110H","400H","2000S","3000S","4x100","4x200","4x400","4x800","DMR","SMR","HJ","PV","LJ","TJ","SP","WT","DT","HT","JT","Pent","Hep","Dec"];
const eord=c=>{const k=EORD.indexOf(c);return k<0?99:k};
const tfield=c=>/^(HJ|PV|LJ|TJ|SP|WT|DT|HT|JT|Pent|Hep|Dec)$/.test(c);
const trelay=c=>/^4x|MR$/.test(c);
const tval=m=>{const x=String(m).replace(/[^0-9:.]/g,"");if(!x)return null;const p=x.split(":").map(Number);const v=p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0];return isFinite(v)?v:null};
const tbetter=(c,a,b)=>tfield(c)?a>b:a<b;
const CLS=[["SR-4","Seniors"],["JR-3","Juniors"],["SO-2","Sophomores"],["FR-1","Freshmen"]];
/* list-based rows for a team in one season (all lists: national + conference), keyed by athlete name */
function tListRows(i,sea,g){const s=SCH[i],k=keyOf(sea,s.d);if(!k)return {rows:[]};const D=CACHE[k];if(!D){load(k,true);return null}if(D.err)return {rows:[]};
  const want=new Set(tkey(s)),tis=new Set(D.teams.map((t,j)=>want.has(tnorm(t))?j:-1).filter(j=>j>=0)),rows=[];
  for(const L of D.lists)for(const [e,rs] of Object.entries(L.g[g]||{}))for(const r of rs)if(tis.has(r[3]))rows.push({c:ecode(e),n:r[1]||"",yr:r[2]||"",mk:r[4],w:r[5]||"",meet:D.meets[r[6]]||"",date:r[7]||"",path:r[9]||""});
  return {rows}}
/* the season model: events -> best per athlete, and the roster */
function tModel(i,sea,g){const s=SCH[i],b=tbase(s),F=b&&TDATA[b]&&!TDATA[b].none?TDATA[b]:null,LR=tListRows(i,sea,g);
  if(b&&!TDATA[b]){loadTeam(b);return null}if(!LR&&!F)return null;
  const yr=sea.split("-")[0],ev={},put=(c,x)=>{const v=tval(x.mk);if(v==null)return;if(WIND&&WCODE.has(c)&&aided(x.w))return;x.v=v;const m=ev[c]||(ev[c]=new Map()),key=trelay(c)?x.mk+"|"+x.meet:(x.n||"").toLowerCase();const o=m.get(key);if(!o||tbetter(c,v,o.v))m.set(key,x)};
  let roster=[];
  if(F){const G=F.g[g]||{},ids=(G.ro||{})[yr]||[];roster=ids.map(ai=>{const a=F.A[ai];return {ai,n:a.n,yr:a.y[yr]||"",path:a.u}});
    F.A.forEach((a,ai)=>{if(a.g!==g||!a.h)return;a.h.forEach(h=>{if(h[0]!==sea)return;put(h[3],{n:trelay(h[3])?"":a.n,ai:trelay(h[3])?null:ai,yr:a.y[yr]||"",mk:h[4],w:h[5],meet:F.M[h[2]],date:h[1],pl:h[6]})})})}
  const byName=new Map(roster.map(r=>[r.n.toLowerCase(),r]));
  (LR&&LR.rows||[]).forEach(r=>{const m=byName.get(r.n.toLowerCase());if(F&&m&&F.A[m.ai].h)return;put(r.c,{n:r.n,ai:m?m.ai:null,yr:r.yr||(m&&m.yr)||"",mk:r.mk,w:r.w,meet:r.meet,date:r.date,path:r.path,lst:!F});
    if(!F&&r.n&&!byName.has(r.n.toLowerCase())){const x={ai:null,n:r.n,yr:r.yr,path:r.path};byName.set(r.n.toLowerCase(),x);roster.push(x)}});
  const events=Object.entries(ev).map(([c,m])=>[c,[...m.values()].sort((a,b)=>tfield(c)?b.v-a.v:a.v-b.v)]).sort((a,b)=>eord(a[0])-eord(b[0]));
  /* each roster athlete's best events this season, for the roster cards */
  const best=new Map();events.forEach(([c,rows])=>rows.forEach((x,k)=>{if(!x.n)return;const l=best.get(x.n.toLowerCase())||[];l.push([c,x.mk,k+1]);best.set(x.n.toLowerCase(),l)}));
  return {F,events,roster,best,loading:!LR}}
function tSeasons(i,g){const s=SCH[i],b=tbase(s),F=b&&TDATA[b]&&!TDATA[b].none?TDATA[b]:null,set=new Set(seaOf(s.d));
  if(F)F.A.forEach(a=>{if(a.g===g&&a.h)a.h.forEach(h=>h[0]&&set.add(h[0]))});return [...set].filter(k=>!k.endsWith("-xc")).sort().reverse()}
function openTeam(i,push=true){if(i==null||i<0)return;TQ.v="";TM.i=i;TM.ath=null;TM.ev="";TM.open={};TM.tab="results";TM.g=(SCH[i].ng||[]).includes(R.g)?(R.g==="m"?"w":"m"):R.g;TM.sea="";
  S.tab="results";S.school=null;CC.on=false;if(push)history.pushState({},"","/teams/"+tslug(i));tMeta(i);R.swap=true;render();scrollTo(0,0);log("team",{school:SCH[i].n,division:SCH[i].d})}
function closeTeam(){TM.i=null;TM.ath=null;history.pushState({},"","/?tab=results");R.swap=true;render();scrollTo(0,0)}
function tMeta(i){const s=SCH[i];if(window.__prMeta)window.__prMeta(`${s.t||s.n} Track & Field Results, Roster & Athletes | Preferred Recruit`,`${s.n} track and field: every athlete's season best by event, the full roster by class, and each athlete's meet history (${s.d}${s.c!==s.d?", "+s.c:""}). From TFRRS.`,"/teams/"+tslug(i))}
const schOfTeam=(name,div)=>{const n=tnorm(name);let i=SCH.findIndex(x=>x.d===div&&tkey(x).includes(n));if(i<0)i=SCH.findIndex(x=>tkey(x).includes(n));return i};
function bandBits(s){const B=brandOf(s);
  const lum=h=>{const c=String(h||"").replace("#","");if(c.length!==6)return 0;const f=x=>{x=parseInt(x,16)/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c.slice(0,2))+.7152*f(c.slice(2,4))+.0722*f(c.slice(4,6))};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  let bb=B&&B.primary,bo=B&&(B.on||"#ffffff");if(B&&cr(bb,bo)<4.5){bb=B.ink||bb;bo=cr(bb,"#ffffff")>=cr(bb,"#0B0B0F")?"#ffffff":"#0B0B0F"}
  const bv=B?`--sb:${bb};--sbi:${B.ink||B.primary};--sbo:${bo}`:"--sb:#1B1A25;--sbi:#4E33DB;--sbo:#fff";
  const ini=(s.t||s.n).replace(/\(.*?\)/g,"").split(/[^A-Za-z&]+/).filter(w=>w&&!/^(of|the|at|and|in|for|university|college)$/i.test(w)).map(w=>w[0]).join("").slice(0,3).toUpperCase()||"PR";
  const mark=B&&B.logo&&!B.hide_logo?`<img src="${esc(B.logo)}" alt="${esc(s.n)} logo" width="72" height="72" loading="eager">`:`<span class="sini" aria-hidden="true">${esc(ini)}</span>`;
  return {B,bv,mark}}
/* one switch on both pages (Ryan 2026-10-24: "a button to switch back and forth to recruitment standards seamlessly") */
const tsw=(i,on)=>SCH[i].j?"":`<div class="tsw" role="tablist" aria-label="Team results or recruiting standards">${on==="team"?'<span role="tab" aria-selected="true">Team results</span>':`<a role="tab" aria-selected="false" href="/teams/${tslug(i)}" data-tpage="${i}">Team results</a>`}${on==="std"?'<span role="tab" aria-selected="true">Recruiting standards</span>':`<a role="tab" aria-selected="false" href="/schools/${window.__prSlug(i)}" data-school="${i}">Recruiting standards</a>`}</div>`;
function teamPage(){const i=TM.i,s=SCH[i];if((s.ng||[]).includes(TM.g))TM.g=TM.g==="m"?"w":"m";const g=TM.g,{B,bv,mark}=bandBits(s);
  const b=tbase(s);if(b&&!TDATA[b])loadTeam(b);
  const ss=tSeasons(i,g);if(!ss.includes(TM.sea))TM.sea=ss.includes(R.season)?R.season:ss[0]||R.season;
  const M=tModel(i,TM.sea,g),nm=s.n.replace(/\s*\(.*?\)\s*/g," ").trim();
  let o=`<div class="sec branded simple tpage${R.swap?" swap":""}" style="padding-top:0;${bv}"><div class="tptop"><button class="back" data-tclose>‹ Back to results</button><div class="search tpsearch">${MAG}<label class="sr" for="tq2">Search another team</label><input class="in" id="tq2" placeholder="Search another team" autocomplete="off" enterkeyhint="go"><div id="tq2d"></div></div></div>
  <div class="sband">${mark}<div><small>${esc(s.d)}${s.c!==s.d?" · "+esc(s.c):""}${s.s?" · "+esc(ST_NAME[s.s]||s.s):""}</small><h1 class="sname">${esc(nm)} Track &amp; Field</h1>${tsw(i,"team")}
    <span class="tplinks">${s.u?`<a href="${esc(TM.g==="w"?s.u.replace("_college_m_","_college_f_"):s.u)}" target="_blank" rel="noopener nofollow">TFRRS ›</a>`:""}</span></div></div>`;
  if(TM.ath!=null&&M&&M.F)return o+tAthlete(M.F,TM.ath,s)+`</div>`;
  const tabs=`<div class="tptabs" role="tablist"><button type="button" role="tab" data-ttab="results" aria-selected="${TM.tab==="results"}">Results</button><button type="button" role="tab" data-ttab="roster" aria-selected="${TM.tab==="roster"}">Roster${M&&M.roster.length?` <small>${M.roster.length}</small>`:""}</button></div>`;
  o+=`<div class="tpbar">${(s.ng||[]).length?`<p class="onlyg">${g==="m"?"Men's":"Women's"} only</p>`:`<div class="seg" role="group" aria-label="Men or women"><button type="button" data-tg="m" aria-pressed="${g==="m"}">Men</button><button type="button" data-tg="w" aria-pressed="${g==="w"}">Women</button></div>`}
    <label class="cmp"><span>Season</span><select id="tsea">${ss.map(k=>`<option value="${k}" ${k===TM.sea?"selected":""}>${esc(seasonLabel(k))}</option>`).join("")}</select></label>${TM.sea.endsWith("outdoor")?windSw():""}</div>${tabs}`;
  if(!M)return o+skeleton()+`</div>`;
  if(TM.tab==="roster")return o+tRoster(M,s)+`</div>`;
  const evs=M.events;
  if(!evs.length)return o+`<div class="soon">No ${g==="m"?"men's":"women's"} marks for ${esc(nm)} in ${esc(seasonLabel(TM.sea))} yet. Try another season.${s.u?` <a href="${esc(s.u)}" target="_blank" rel="noopener nofollow">See the team on TFRRS ›</a>`:""}</div></div>`;
  if(TM.ev&&!evs.some(([c])=>c===TM.ev))TM.ev="";
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event"><button data-tev="" aria-pressed="${!TM.ev}">All events</button>${evs.map(([c])=>`<button data-tev="${esc(c)}" aria-pressed="${c===TM.ev}">${esc(ename(c))}</button>`).join("")}</div></div>`;
  const show=TM.ev?evs.filter(([c])=>c===TM.ev):evs;
  o+=`<div class="tpev">${show.map(([c,rows])=>{const all=TM.ev||TM.open[c],cut=all?rows:rows.slice(0,5);
    return `<section class="tpcard"><header><h3>${esc(ename(c))}</h3><span>${rows.length} ${trelay(c)?"mark":"athlete"}${rows.length===1?"":"s"}</span></header>
    <ol>${cut.map((x,k)=>`<li class="${k<3?"p"+(k+1):""}"><span class="rkb">${k+1}</span>${x.ai!=null&&M.F&&M.F.A[x.ai]?`<button class="tpnm" data-tath="${x.ai}">`:x.path?`<button class="tpnm" data-gath="${esc(String(x.path).split("/")[0])}|${esc(TM.sea)}|${esc(SCH[TM.i].d)}">`:'<span class="tpnm">'}<b>${esc(x.n||(trelay(c)?"Relay team":""))}</b><small>${esc([yr(x.yr),x.meet].filter(Boolean).join(" · "))}${x.date?` · ${esc(x.date.replace(/,?\s*\d{4}$/,""))}`:""}</small>${x.ai!=null&&M.F&&M.F.A[x.ai]?"</button>":x.path?"</button>":"</span>"}<b class="tpmk">${esc(x.mk)}${parseFloat(x.w)>2?`<small>wind ${esc(x.w)}</small>`:""}</b></li>`).join("")}</ol>
    ${!TM.ev&&rows.length>5?`<button type="button" class="tpmore" data-topen="${esc(c)}">${TM.open[c]?"Show top 5":`Show all ${rows.length}`}</button>`:""}</section>`}).join("")}</div>`;
  const part=M.F&&M.roster.some(r=>!M.F.A[r.ai].h);
  o+=`<p class="note">${M.F?`Season bests from each athlete's TFRRS results${part?" (athletes still loading show their best list mark)":""}.`:`Marks from this season's TFRRS conference and national lists, so you see the athletes who made a list.`} Tap an athlete for their meet history.</p>${hookRow()}`;
  return o+`</div>`}
function tRoster(M,s){const g=TM.g,F=M.F;if(!M.roster.length)return `<div class="soon">No ${g==="m"?"men's":"women's"} roster for ${esc(seasonLabel(TM.sea))}.</div>`;
  const grp=CLS.map(([k,l])=>[l,M.roster.filter(r=>r.yr===k)]).concat([["Other",M.roster.filter(r=>!CLS.some(([k])=>k===r.yr))]]).filter(([,l])=>l.length);
  return grp.map(([l,list])=>`<div class="ah2">${l} <span>${list.length}</span></div><div class="tpros">${list.sort((a,b)=>a.n.localeCompare(b.n)).map(r=>{const bs=(M.best.get(r.n.toLowerCase())||[]).sort((a,b)=>a[2]-b[2]).slice(0,2);
    const tag=r.ai!=null&&F?`button type="button" data-tath="${r.ai}"`:"div";return `<${tag} class="tpa"><span class="tpav" aria-hidden="true">${esc(r.n.split(" ").map(w=>w[0]).slice(0,2).join(""))}</span><span><b>${esc(r.n)}</b><small>${bs.length?bs.map(([c,mk])=>`${esc(ename(c))} ${esc(mk)}`).join(" · "):esc(yr(r.yr)||"")}</small></span></${tag.split(" ")[0]}>`}).join("")}</div>`).join("")+
    `<p class="note">${F?`Roster from TFRRS (${esc(seasonLabel(TM.sea).split(" ")[0])} season).`:"Athletes who made this season's TFRRS lists, not the full roster."}</p>`}
function tAthlete(F,ai,s){const a=F.A[ai],ys=Object.entries(a.y).sort().reverse(),cur=ys[0]?ys[0][1]:"";
  const tl=`https://tf.tfrrs.org/athletes/${a.u}`;
  let o=`<p style="margin:14px 2px 0"><button class="lnk" data-tath="-1">‹ ${esc(s.t||s.n)} ${TM.tab==="roster"?"roster":"results"}</button></p>
  <div class="ahead"><div class="avt" aria-hidden="true">${esc(a.n.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div><div><h3>${esc(a.n)}</h3><p>${esc([yr(cur),s.t||s.n,s.d].filter(Boolean).join(" · "))}</p></div><a href="${esc(tl)}" target="_blank" rel="noopener nofollow">Full profile on TFRRS ›</a></div>`;
  const bs=(a.b||[]).slice().sort((x,y)=>eord(x[0])-eord(y[0]));
  if(bs.length)o+=`<div class="ah2">College bests</div><div class="pbs">${bs.map(([c,m])=>`<div><small>${esc(ename(c))}</small><b>${esc(m)}</b></div>`).join("")}</div>`;
  if(!a.h){return o+`<div class="ah2">Meet history</div><div class="soon">${esc(a.n)}'s full meet history is still being added. <a href="${esc(tl)}" target="_blank" rel="noopener nofollow">See it on TFRRS now ›</a></div>`}
  /* season by season, newest first; each meet as a card */
  const bySea=new Map();a.h.forEach(h=>{const k=h[0]||"other";if(!bySea.has(k))bySea.set(k,new Map());const m=bySea.get(k),mk=h[2]+"|"+h[1];if(!m.has(mk))m.set(mk,{meet:F.M[h[2]],date:h[1],rows:[]});m.get(mk).rows.push(h)});
  const order=[...bySea.keys()].sort().reverse();
  o+=order.map(k=>{const meets=[...bySea.get(k).values()];
    const sb={};meets.forEach(m=>m.rows.forEach(h=>{if(trelay(h[3]))return;const v=tval(h[4]);if(v==null)return;if(!sb[h[3]]||tbetter(h[3],v,sb[h[3]][0]))sb[h[3]]=[v,h[4]]}));
    return `<div class="ah2">${k==="other"?"Other meets":esc(seasonLabel(k))}</div><div class="tpsb">${Object.entries(sb).sort((x,y)=>eord(x[0])-eord(y[0])).map(([c,[,m]])=>`<span><small>${esc(ename(c))}</small><b>${esc(m)}</b></span>`).join("")}</div>
    <div class="meets">${meets.map(m=>`<article class="mt1"><div class="mh"><b>${esc(m.meet)}</b><span>${esc(fmtD(m.date))}</span></div>${m.rows.map(h=>`<div class="mr"><span>${esc(ename(h[3]))}</span><b>${esc(h[4])}${h[5]?`<small>wind ${esc(h[5])}</small>`:""}</b>${h[6]?`<span class="plc ${/^1st/.test(h[6])?"w1":""}">${esc(h[6])}</span>`:"<span></span>"}</div>`).join("")}</article>`).join("")}</div>`}).join("");
  return o+hookRow()}
/* Conference list view (Ryan 2026-10-20): one big "Conference" picker on Results. Picking one shows that conference's plain ranked
   list (rank, athlete, team, mark). Remembered by name, so it sticks when the year or season changes. */
const cnorm=x=>String(x||"").toLowerCase().replace(/\bconference\b|\bthe\b|[^a-z0-9]/g,"");
function confIdx(D,lab){let i=D.lists.findIndex(z=>z.label===lab);if(i<0){const n=cnorm(lab);i=D.lists.findIndex(z=>!z.nat&&cnorm(z.label)===n)}return i}
const confsOf=D=>D.lists.filter(z=>!z.nat&&!z.champ&&!NCL.test(z.label)).map(z=>z.label).sort((a,b)=>a.localeCompare(b));
document.addEventListener("click",ev=>{if(R.cdd&&!ev.target.closest(".cdd")){R.cdd=false;render()}});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&R.cdd){R.cdd=false;render();const b=document.querySelector("[data-cdd]");if(b)b.focus()}});
function confBar(D,L,miss){const cs=confsOf(D),oth=D.lists.filter(z=>!z.nat&&!cs.includes(z.label)).map(z=>z.label);
  /* own menu, not a native <select> (Ryan 2026-10-22: the Mac menu draws "Conferences" / "Other lists" faint gray over the page) */
  const cur=L.nat?`All of ${R.div}`:L.label,op=(v,t)=>`<button type="button" role="option" class="cddo${(v===""?L.nat:!L.nat&&L.label===v)?" on":""}" aria-selected="${v===""?L.nat:!L.nat&&L.label===v}" data-rconfv="${esc(v)}">${esc(t||v)}</button>`;
  return `<div class="rconf"><div class="cmp cdd"><span id="cddl">Conference</span><button type="button" class="cddb" data-cdd aria-haspopup="listbox" aria-expanded="${!!R.cdd}" aria-labelledby="cddl"><b>${esc(cur)}</b><i aria-hidden="true"></i></button>
    ${R.cdd?`<div class="cddp" role="listbox" aria-label="Conference">${op("",`All of ${R.div}`)}${cs.length?`<p class="cddh">Conferences</p>${cs.map(v=>op(v)).join("")}`:""}${oth.length?`<p class="cddh">Other lists <span>regions and qualifying</span></p>${oth.map(v=>op(v)).join("")}`:""}</div>`:""}</div>
    ${L.nat?"":`<button type="button" class="rcbtn" data-rconfx>Show all of ${esc(R.div)}</button><button type="button" class="rcbtn rcgo" data-rconfcmp>Compare years in ${esc(L.label)}</button>`}</div>
    ${miss?`<p class="ccmsg">${esc(R.conf)} has no list for ${esc(seasonLabel(R.season))}, so this is all of ${esc(R.div)}.</p>`:""}`}
/* High school results (Ryan 2026-10-21: "just do highschool tab it can switch to dont make ui more complicated than it needs to be").
   One College | High School switch on Results. High school = plain ranked list per state: rank, athlete (first name + last initial),
   grade, school, mark. Data: /data/hs/<year>-<ST>.json (scripts/hs/build_hs.py, checked athletic.net lists). */
const HS={idx:null,data:{},st:"",y:"",g:"m",ev:""};
/* Ryan 2026-10-21: "hide the high school results for now until we are able to import all the data". Flip to true to bring the switch back. */
const HS_ON=false;
const lvlSw=()=>!HS_ON?"":`<div class="lvlrow"><div class="seg lvlsw" role="group" aria-label="College or high school"><button type="button" data-lvl="college" aria-pressed="${R.lvl!=="hs"}">College</button><button type="button" data-lvl="hs" aria-pressed="${R.lvl==="hs"}">High School</button></div></div>`;
const withSw=h=>h.replace('<div class="sec">','<div class="sec">'+lvlSw());
function hsView(){
  if(HS.idx===null){HS.idx=false;fetch("/data/hs/index.json").then(r=>r.json()).then(j=>{HS.idx=j.lists||{};render()}).catch(()=>{HS.idx={};render()})}
  let o=`<div class="sec">${lvlSw()}<p class="lede">The top high school marks in each state. Pick a state, then an event.</p><div class="rcard">`;
  if(!HS.idx)return o+`</div>${skeleton()}</div>`;
  const ys=Object.keys(HS.idx).sort().reverse();if(!ys.includes(HS.y))HS.y=ys[0]||"";const stLab=x=>x==="US27"?"National · Class of 2027":(ST_NAME[x]||x);const sts=(HS.idx[HS.y]||[]).slice().sort((a,b)=>(a==="US27"?-1:b==="US27"?1:stLab(a).localeCompare(stLab(b))));if(!sts.includes(HS.st))HS.st=sts[0]||"";
  const key=HS.y+"-"+HS.st,D=HS.data[key];
  if(D===undefined){HS.data[key]=null;fetch(`/data/hs/${key}.json`).then(r=>r.json()).then(j=>{HS.data[key]=j;render()}).catch(()=>{HS.data[key]={err:1};render()})}
  const G=D&&D.g?D.g[HS.g]||{}:{},evs=Object.keys(G);if(evs.length&&!evs.includes(HS.ev))HS.ev=evs[0];
  o+=`<div class="rctl hsctl"><label class="sr" for="hsst">State</label><select class="in" id="hsst">${sts.map(x=>`<option value="${x}" ${x===HS.st?"selected":""}>${esc(stLab(x))}</option>`).join("")}</select>
    <label class="sr" for="hsy">Year</label><select class="in" id="hsy">${ys.map(y=>`<option ${y===HS.y?"selected":""}>${y}</option>`).join("")}</select>
    <div class="seg" role="group" aria-label="Boys or girls"><button type="button" data-hsg="m" aria-pressed="${HS.g==="m"}">Boys</button><button type="button" data-hsg="w" aria-pressed="${HS.g==="w"}">Girls</button></div></div></div>`;
  if(!D)return o+skeleton()+`</div>`;
  if(D.err)return o+`<p class="ccmsg">This list isn't available right now.</p></div>`;
  const rows=G[HS.ev]||[],cap=RCAP(rows.length),sn=stLab(HS.st),gn=HS.g==="m"?"Boys'":"Girls'";
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event">${evs.map(e=>`<button data-hsev="${esc(e)}" aria-pressed="${e===HS.ev}">${esc(e)}</button>`).join("")}</div></div>
  <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${esc(sn)} ${gn} ${esc(HS.ev)}</h3><span>${esc(D.label||HS.y+" outdoor")} · ${rows.length} marks</span></div>
  <div class="grid raw hsg"><div class="gh"><span>Rank</span><span>Athlete</span><span>School</span><span style="text-align:right">Mark</span></div>
  ${rows.slice(0,cap).map(r=>`<div class="gr ${r[0]<=3?"p"+r[0]:""}"><span class="rkb">${r[0]}</span><span class="gnmw"><span class="gnm"><b>${esc(r[1])}</b></span><small>${r[2]?"Grade "+esc(r[2]):""}</small></span><span class="gtm" style="cursor:default">${esc(r[3])}${(r[6]||[]).map(t=>`<em class="hstag">${esc(t)}</em>`).join("")}</span><span class="gmk">${esc(r[4])}${r[5]?`<small>wind ${esc(r[5])}</small>`:""}</span></div>`).join("")||`<div class="gr"><span></span><span class="gnm"><small>No marks.</small></span></div>`}</div>
  ${rwall(rows.length,cap)}${hookRow()}
  <p class="note">${D.note?esc(D.note)+"</p><p class=\"note\" hidden>":""}${esc(sn)} is the first state. More states and years are on the way. Source: athletic.net performance lists, checked by Preferred Recruit (${esc(sn)} schools only, grades 9 to 12, legal wind). Names show first name and last initial. "club" means the mark was run for a club team outside the school season.</p></div></div>`;
  return o}
{let ACT=null;const hide=()=>{if(!ACT)return;const t=ACT.querySelector(".ctip"),g=ACT.querySelector(".chov");if(t)t.hidden=true;if(g)g.style.display="none";ACT=null};
  /* visible only while the pointer is over the plot: anything else (moving off, scrolling, leaving the window, lifting a finger) hides it */
  const move=ev=>{const svg=ev.target.closest&&ev.target.closest(".curve[data-cv] svg"),w=svg&&svg.closest(".curve");if(!w){hide();return}const c=CV[w.dataset.cv];if(!c){hide();return}
    if(ACT&&ACT!==w)hide();ACT=w;
    const b=svg.getBoundingClientRect(),sx=(ev.clientX-b.left)/b.width*c.W;let best=c.pts[0];for(const p of c.pts)if(Math.abs(p.x-sx)<Math.abs(best.x-sx))best=p;
    const g=w.querySelector(".chov"),l=g.querySelector("line"),o=g.querySelector("circle");g.style.display="";l.setAttribute("x1",best.x);l.setAttribute("x2",best.x);o.setAttribute("cx",best.x);o.setAttribute("cy",best.y);
    const t=w.querySelector(".ctip");t.hidden=false;t.innerHTML=`<b>${esc(best.m)}</b><span>${ord(best.pl)}${best.who?" · "+esc(best.who):""}</span>`;
    const wb=w.getBoundingClientRect(),px=b.left-wb.left+best.x/c.W*b.width,py=b.top-wb.top+best.y/c.H*b.height,tw=t.offsetWidth;
    t.style.left=Math.max(8,Math.min(wb.width-tw-8,px-tw/2))+"px";t.style.top=Math.max(4,py-t.offsetHeight-14)+"px"};
  document.addEventListener("pointermove",move);document.addEventListener("pointerdown",move);
  document.addEventListener("pointerout",ev=>{if(ACT&&(!ev.relatedTarget||!ACT.querySelector("svg").contains(ev.relatedTarget)))hide()});
  document.addEventListener("pointerup",ev=>{if(ev.pointerType!=="mouse")hide()});document.addEventListener("pointercancel",hide);
  addEventListener("scroll",hide,{passive:true});addEventListener("blur",hide);document.addEventListener("mouseleave",hide)}
function results(){
  if(TM.i!=null)return teamPage();
  if(R.lvl==="hs"&&HS_ON)return hsView();
  if(CC.on)return compareView();
  return withSw(resultsCollege())}
function resultsCollege(){
  if(MULTI())return multiResults();
  const key=curKey(), D=key&&CACHE[key]; if(key&&!D) load(key);
  loadBrand();
  let o=`<div class="sec"><p class="lede">The top marks in college track this season. Pick a level, then an event.</p><div class="rcard">${divTabs()}`;
  const ctl=(L)=>`<div class="rctl"><label class="sr" for="ry">Year</label><select class="in" id="ry">${years().map(y=>`<option ${y===R.season.split("-")[0]?"selected":""}>${y}</option>`).join("")}</select><div class="seg" role="group" aria-label="Season">${["outdoor","indoor","xc"].filter(x=>x!=="xc"||RIDX.some(r=>r.season==="xc")).map(x=>{const ok=x==="xc"||RIDX.some(r=>r.year===R.season.split("-")[0]&&r.season===x);return `<button data-rsea="${x}" aria-pressed="${R.season.endsWith(x)}" ${ok?"":"disabled"}>${{outdoor:"Outdoor",indoor:"Indoor",xc:"XC"}[x]}</button>`}).join("")}</div>${seg("rg",R.g)}${windSw()}
    ${L?(()=>{const sts=[...new Set(D.teams.map(teamSt).filter(Boolean))].sort((a,b)=>(ST_NAME[a]||a).localeCompare(ST_NAME[b]||b));return `<label class="sr" for="rs">State</label><select class="in" id="rs"><option value="">All states</option>${sts.map(x=>`<option value="${x}" ${x===R.st?"selected":""}>${esc(ST_NAME[x]||x)}</option>`).join("")}</select>`})():""}
    <div class="search">${MAG}<label class="sr" for="rq">Search a school or athlete</label><input class="in" id="rq" placeholder="Search a school or athlete" value="${esc(R.q)}" autocomplete="off" enterkeyhint="go"><div id="rqd"></div></div></div></div>`;
  if(!D||D.err){o+=ctl(null)+(D&&D.err?`<div class="loading">These results aren't available in the preview.</div>`:skeleton());return o+`</div>`}
  const natI=Math.max(0,D.lists.findIndex(z=>z.nat)),ci=R.conf?confIdx(D,R.conf):natI,miss=R.conf&&ci<0;R.list=ci<0?natI:ci;
  const L=D.lists[R.list], E=L.g[R.g]||{}, evNames=Object.keys(E); if(!evNames.includes(R.ev)) R.ev=evNames[0];
  o+=ctl(L)+confBar(D,L,miss);
  const listName=L.nat?`${DIVINFO[R.div]||R.div}`:L.label, gname=R.g==="m"?"Men's":"Women's";
  if(R.pend){const ti=D.teams.indexOf(R.pend);R.pend=null;if(ti>=0)R.team=ti}
  if(R.pendAth){const id=R.pendAth+"/";R.pendAth=null;let hit=null;for(const l of [...D.lists].sort((a,b)=>(b.nat?1:0)-(a.nat?1:0))){for(const g of ["m","w"])for(const [ev,rows] of Object.entries(l.g[g]||{})){const r=rows.find(r=>String(r[9]).startsWith(id));if(r){hit={g,ev,r};break}}if(hit)break}
    if(hit){R.g=hit.g;R.ev=hit.ev;R.ath={name:hit.r[1],team:hit.r[3],yr:hit.r[2],path:hit.r[9]||""};loadAth()}}
  if(R.ath) return o+athView(D);
  if(R.team!=null){
    const tn=D.teams[R.team], rows=[];evNames.forEach(e=>(E[e]||[]).forEach(r=>{if(r[3]===R.team)rows.push([e,r])}));
    return o+`<div class="rbody${R.swap?" swap":""}"><p style="margin:14px 2px 0"><button class="lnk" data-team="-1">‹ All teams</button></p>
    <div class="rhead"><h3>${esc(tn)}</h3><span>${rows.length} top marks · ${esc(listName)} · ${gname}</span></div>
    <div class="grid"><div class="gh"><span>Rank</span><span>Athlete</span><span>Event</span><span style="text-align:right">Mark</span><span>Meet</span></div>
    ${rows.slice(0,RCAP(rows.length)).map(([e,r])=>`<div class="gr"><span class="rkb">${esc(r[0])}</span>${r[1]?`<button class="gnm gath" data-ae="${esc(e)}" data-ai="${E[e].indexOf(r)}">`:'<span class="gnm">'}<b>${esc(r[1]||tn)}</b><small>${esc(yr(r[2]))}</small>${r[1]?"</button>":"</span>"}<span class="gtm" style="cursor:default">${esc(evLabel(e))}</span><span class="gmk">${esc(r[4])}${r[8]?`<small>${esc(r[8])}</small>`:""}</span><span class="gmt"><b>${esc(D.meets[r[6]])}</b>${esc(fmtD(r[7]))}</span></div>`).join("")}</div>${rwall(rows.length,RCAP(rows.length))}${hookRow()}</div></div>`;
  }
  {const nk=[key,R.list,R.g,R.ev,R.q,R.st,WIND].join("|");if(R.nk!==nk){R.nk=nk;R.n=100}}
  const all=E[R.ev]||[], q=R.q.trim().toLowerCase(), rows=all.filter(r=>(!q||r[1].toLowerCase().includes(q)||D.teams[r[3]].toLowerCase().includes(q))&&(!R.st||teamSt(D.teams[r[3]])===R.st));
  const tsug="";
  const stR=(r,lab,cls="")=>r?`<div class="st ${cls}"><small>${lab}</small><b>${esc(r[4])}</b><span>${esc(r[1]||D.teams[r[3]])}</span>${r[1]?`<span class="stt">${esc(D.teams[r[3]])}</span>`:""}</div>`:"";   /* name and team on their own lines so neither gets cut (Ryan 2026-10-22) */
  const st=(i,lab,cls="")=>{const r=all[i];return r?`<div class="st ${cls}"><small>${lab}</small><b>${esc(r[4])}</b><span>${esc(r[1]||D.teams[r[3]])}${r[1]?" · "+esc(D.teams[r[3]]):""}</span></div>`:""};
  const last=all.length-1;
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event">${evNames.map(e=>`<button data-rev="${esc(e)}" aria-pressed="${e===R.ev}">${esc(evLabel(e))}</button>`).join("")}</div></div>
  <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${L.nat?"":esc(L.label)+" "}${gname} ${esc(evLabel(R.ev))}</h3><span>${esc(listName)} · ${esc(seasonLabel(R.season))}${WIND&&WEV.has(R.ev)?" · wind-legal":""} · ${R.st?`${rows.length} of ${all.length} marks from ${esc(ST_NAME[R.st]||R.st)} schools (national rank shown)`:`${all.length} marks`}</span></div>
  ${windNote(L,R.g,R.ev)}${tsug}${L.nat?`<div class="stats">${[1,10,25,50].filter(k=>rows[k-1]).map(k=>stR(rows[k-1],k===1?"Best":ord(k)+" best",k===1?"lead":"")).join("")}</div>`:""}
  <div class="grid${L.nat?"":" raw"}"><div class="gh"><span>Rank</span><span>Athlete</span><span>Team</span><span style="text-align:right">Mark</span>${L.nat?"<span>Meet</span>":""}</div>
  ${rows.slice(0,RCAP(R.n)).map((r,i)=>{const k=all.indexOf(r)+1;return `<div class="gr ${k<=3?"p"+k:""}"><span class="rkb">${k}</span><span class="gnmw">${r[1]?`<button class="gnm gath" data-ai="${k-1}"><b>${esc(r[1])}</b></button>`:`<span class="gnm"><b>${esc(D.teams[r[3]])}</b></span>`}<small>${esc(yr(r[2]))}${r[9]?` · <a class="tf" href="https://tf.tfrrs.org/athletes/${esc(r[9])}" target="_blank" rel="noopener">TFRRS ↗</a>`:""}</small></span><button class="gtm" data-team="${r[3]}">${esc(D.teams[r[3]])}</button><span class="gmk">${esc(r[4])}${r[8]?`<small>${esc(r[8])}</small>`:r[5]?`<small>wind ${esc(r[5])}</small>`:""}</span>${L.nat?`<span class="gmt"><b>${esc(D.meets[r[6]])}</b>${esc(fmtD(r[7]))}</span>`:""}</div>`}).join("")||`<div class="gr"><span></span><span class="gnm"><small>No matches.</small></span></div>`}
  </div>${rwall(rows.length,RCAP(R.n))}${ACC.member()&&rows.length>R.n?`<p class="rmorew"><button type="button" class="rmoreb" data-rmore>Show ${Math.min(200,rows.length-R.n)} more <small>${R.n.toLocaleString()} of ${rows.length.toLocaleString()}</small></button></p>`:""}${hookRow()}
  <p class="note">Source: TFRRS performance lists. Tap a team to see all of its top marks.</p></div></div>`;
  return o;
}
/* ---------- Recruiting AI ---------- */
const CHAT={msgs:[],busy:false,draft:""};
const SUGG=[["Which D2 schools fit a 5:05 women's 1600m?","Your mark, every school"],["Kanyinsola Ajayi 100m progression","Any athlete since 2016"],["Is Auburn peaking at the right time?","Program analytics"],["How has the D1 men's 100m changed since 2016?","Trends by year"]];
const EVP=[["110m Hurdles",/110\s*(m|meters?)?\s*(h\b|hurdles?)/],["100m Hurdles",/100\s*(m|meters?)?\s*(h\b|hurdles?)/],["400m Hurdles",/400\s*(m|meters?)?\s*(h\b|ih\b|hurdles?)/],["110m Hurdles (39\")",/39\s*("|in\b|inch)/],["300m Hurdles",/300\s*(m|meters?)?\s*(h\b|ih\b|hurdles?)/],["3000m Steeplechase",/steeple/],["10000m",/(?<![\d:.])10,?000(?!\d)|\b10k\b/],["5000m",/(?<![\d:.])5,?000(?!\d)|\b5k\b/],["3200m",/(?<![\d:.])3,?200(?!\d)|two.?mile/],["3000m",/(?<![\d:.])3,?000(?!\d)|\b3k\b/],["1500m",/(?<![\d:.])1500(?!\d)/],["1600m",/(?<![\d:.])1600(?!\d)/],["Mile",/\bmile\b/],["800m",/(?<![\d:.])800(?!\d)/],["400m",/(?<![\d:.])400(?!\d)/],["200m",/(?<![\d:.])200(?!\d)/],["100m",/(?<![\d:.])100(?!\d)/],["High Jump",/high jump|\bhj\b/],["Pole Vault",/pole vault|\bpv\b/],["Long Jump",/long jump|\blj\b/],["Triple Jump",/triple jump|\btj\b/],["Shot Put",/shot/],["Discus",/discus/],["Hammer",/hammer/],["Javelin",/javelin|\bjav\b/]];
const ALIAS=SCH.map((s,i)=>{const n=s.n.toLowerCase();const a=new Set([...s.a,s.t.toLowerCase(),n,n.replace(/^university of /,""),n.replace(/^the /,""),n.replace(/ university$/,""),n.replace(/ college$/,"")]);return [...a].filter(x=>x.length>=3).map(x=>[x,i])}).flat().sort((a,b)=>b[0].length-a[0].length);
const CONFS=[...new Set(SCH.map(s=>s.c))].filter(c=>c.length>=3).sort((a,b)=>b.length-a.length);
const nq=q=>" "+q.toLowerCase().replace(/[’]/g,"'").replace(/'s\b/g,"").replace(/[^a-z0-9:.'" &-]/g," ").replace(/\s+/g," ")+" ";
function detect(raw){
  const q=nq(raw), out={q};
  out.g=/\b(women|womens|woman|girls?|female|ladies|daughters?|she|her|hers)\b/.test(q)?"w":/\b(men|mens|boys?|male|guys?|sons?|he|him|his)\b/.test(q)?"m":null;
  let rest=q; for(const [e,re] of EVP){const m=q.match(re);if(m){out.e=e;rest=q.replace(m[0]," ");break}}
  const mk=rest.match(/(\d{1,2}:\d{2}(?:\.\d+)?)|(\d{1,2}'\s?\d{1,2}(?:\.\d+)?"?)|(\d{1,3}\.\d{1,2})\s*m?\b/); if(mk) out.mark=mk[0].trim();
  {let rq=q;out.schools=[];for(const [a2,i] of ALIAS){if(rq.includes(" "+a2+" ")&&!out.schools.includes(i)){out.schools.push(i);rq=rq.replace(" "+a2+" "," | ")}}out.school=out.schools.length?out.schools[0]:undefined;}
  {let rq=q;out.confs=[];for(const c of CONFS){const k=" "+c.toLowerCase()+" ";if(rq.includes(k)){out.confs.push(c);rq=rq.replace(k," | ")}}out.conf=out.confs[0];}
  const yy=q.match(/\b(20(1[6-9]|2[0-6]))\b/);if(yy)out.year=yy[1];out.season=/\bindoor\b/.test(q)?"indoor":/\boutdoor\b/.test(q)?"outdoor":null;
  const dv=q.match(/\b(d1|di|division 1|division i|d2|dii|division 2|division ii|d3|diii|division 3|division iii)\b/); if(dv) out.div=/3|iii/.test(dv[0])?"NCAA D3":/2|ii/.test(dv[0])?"NCAA D2":"NCAA D1";
  if(/\bnaia\b/.test(q)) out.div="NAIA"; 
  out.tier=/walk.?on/.test(q)?"W":/\brecruit/.test(q)?"R":/\btarget/.test(q)?"T":null;
  return out;
}
/* every event + mark in one message (Ryan 2026-10-16: "if you type in multiple events, it kinda bugs out").
   Events are found most-specific first and blanked out so "400" never re-matches inside "400m hurdles"; each event takes the
   nearest unused mark on the side this message uses. */
function pairs(raw){let q=nq(raw);const evs=[],mks=[];
  for(const [e,re] of EVP){const g=new RegExp(re.source,re.flags.includes("g")?re.flags:re.flags+"g");let m;
    while((m=g.exec(q))){if(!evs.some(x=>x.e===e))evs.push({e,i:m.index,j:m.index+m[0].length});q=q.slice(0,m.index)+" ".repeat(m[0].length)+q.slice(m.index+m[0].length);g.lastIndex=m.index+m[0].length}}
  const mr=/(\d{1,2}:\d{2}(?:\.\d+)?)|(\d{1,2}'\s?\d{1,2}(?:\.\d+)?"?)|(\d{1,3}\.\d{1,2})\s*m?\b/g;let m;while((m=mr.exec(q)))mks.push({v:m[0].trim(),i:m.index,used:false});
  evs.sort((a,b)=>a.i-b.i);const out=[];
  /* writers keep one order per message: "49.5 in the 400 and 22.1 in the 200" (mark first) or "400m 49.5, 200m 22.1" (event first) */
  const markFirst=mks.length&&evs.length&&mks[0].i<evs[0].i;
  for(const x of evs){let best=null,bd=1e9;for(const k of mks){if(k.used)continue;const after=k.i>=x.j,d=after?k.i-x.j:x.i-(k.i+k.v.length);const pen=after===!markFirst?0:40;if(d+pen<bd&&d<60){bd=d+pen;best=k}}
    if(best){best.used=true;let mk=best.v;if(!FIELD.has(x.e))mk=mk.replace(/\s*m$/,"");if(parse(mk,x.e)!=null)out.push({e:x.e,mark:mk})}}
  return out}
const tbl=(h,rows,numFrom=1)=>`<div class="scroll"><table><thead><tr>${h.map((x,i)=>`<th class="${i>=numFrom?"num":""}">${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>=numFrom?"num":""}">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const gl=g=>g==="w"?"women's":"men's";
/* the AI's evaluation line carries the event + grade like every other button (2026-10-24 UTM audit) */
const QL=()=>`<p><a href="${esc(quizFor())}" target="_blank" rel="noopener">Looking to run in college? Get your recruitment evaluation ›</a></p>`;
function spread(list,e,k){const v=list.map(s=>s[k]).filter(x=>parse(x,e)!=null).sort((a,b)=>better(e,parse(a,e),parse(b,e)));if(v.length<4)return null;return [v[Math.floor(v.length*.25)],v[Math.floor(v.length*.75)],v.length]}
async function answerV1(raw){
  const d=detect(raw), g=d.g||"m", q=d.q;
  const isCmp=/\b(vs|versus|compare|compared|comparison|against|difference between)\b/.test(q);
  /* compare two or more schools */
  if(d.schools.length>=2&&(isCmp||/\band\b|\bor\b/.test(q))){
    const ss=d.schools.slice(0,4).map(i=>SCH[i]);
    if(d.e){const rows=ss.map(s=>{const t=s[g][d.e]||[];return [s.n+(s.o?" ★":""),t[0]||"–",t[1]||"–",t[2]||"–"]});
      const lab=["Target","Recruit","Walk-On"],val=(s,j)=>{const t=s[g][d.e];return t?parse(t[j],d.e):null};
      const spec={title:`${gl(g)[0].toUpperCase()+gl(g).slice(1)} ${d.e} standards`,type:"bar",labels:ss.map(s=>s.n.replace(/ \(.*\)/,"")),series:lab.map((l,j)=>({name:l,values:ss.map(s=>val(s,j))})).filter(x=>x.values.some(v=>v!=null)),value_format:FIELD.has(d.e)?"meters":"time",lower_is_better:!FIELD.has(d.e)};
      return {html:chartSvg(spec)+tbl(["School","Target","Recruit","Walk-On"],rows)+`<p>★ = official standards published by the school. Others are set from 2026 conference results or marked as estimates.</p>`+QL(),f:[`${ss[0].n} vs ${ss[1].n} ${d.e==="100m"?"400m":"100m"}`]};}
    const evs2=EVENTS.filter(e=>ss.some(s=>s[g][e])).slice(0,12);
    return {html:`<p>${gl(g)} Recruit marks side by side (Walk-On where a school has no Recruit level):</p>`+tbl(["Event",...ss.map(s=>s.n.replace(/ \(.*\)/,"")+(s.o?" ★":""))],evs2.map(e=>[e,...ss.map(s=>{const t=s[g][e];return t?(t[1]||t[2]||t[0]||"–"):"–"})]))+`<p>Name an event (like "${ss[0].n} vs ${ss[1].n} 400m") for a chart.</p>`,f:[`${ss[0].n} vs ${ss[1].n} 100m`,`${ss[0].n} vs ${ss[1].n} 1500m`]};
  }
  /* compare conferences */
  if(d.confs.length>=2){
    const e=d.e||"100m",cs=d.confs.slice(0,5),line=c=>{const s0=SCH.find(s=>s.c===c);return (((CT[(s0||{}).ck]||{})[g]||{})[e])||null};
    const L=cs.map(line);if(!L.some(Boolean))return {html:`<p>I don't have ${gl(g)} ${esc(e)} results for those conferences.</p>`};
    const lab=["Target line","Recruit line","Walk-On line"];
    const spec={title:`${cs.join(" vs ")} · ${gl(g)} ${e} · 2026`,type:"bar",labels:cs,series:lab.map((l,j)=>({name:l,values:L.map(x=>x&&x[j]?parse(x[j][0],e):null)})).filter(s=>s.values.some(v=>v!=null)),value_format:FIELD.has(e)?"meters":"time",lower_is_better:!FIELD.has(e)};
    return {html:(d.e?"":`<p>Showing the ${gl(g)} 100m. Add an event to compare another one.</p>`)+chartSvg(spec)+tbl(["Conference","Target","Recruit","Walk-On"],cs.map((c,k)=>[c,...[0,1,2].map(j=>L[k]&&L[k][j]?L[k][j][0]:"–")]))+`<p>Most conferences: the marks it took to rank 8th, 15th and 25th this season. ${P4TXT}</p>`,f:[`${cs[0]} vs ${cs[1]} ${e==="400m"?"800m":"400m"}`]};
  }
  /* high school -> college conversion */
  if(d.e&&CONV[d.e]&&d.mark&&/\b(convert|conversion|equivalent|equal|translate|in college|college time|college mark|worth)\b/.test(q)){
    const v=parse(d.mark,d.e),c=convert(d.e,g,v);if(c)return {html:`<p>A <b>${esc(d.mark)}</b> ${esc(d.e)} converts to:</p><p class="cvl">${convLine(d.e,g,v)}</p><p>${esc(CONV[d.e].how)}.</p>`,f:[`Which schools fit a ${d.mark} ${d.e}?`]};
  }
  /* athlete lookup (top D1 athletes have full meet history) */
  if(/\b(who is|athlete|profile|history|bests?|pr|prs)\b/.test(q)||q.split(" ").length<=5){
    loadAth();try{await ATHL}catch(e){}
    const A=ATH||{},k=Object.keys(A).find(p=>{const n=(A[p].name||"").toLowerCase();return n&&q.includes(" "+n+" ")});
    if(k){const a=A[k];return {html:`<p><b>${esc(a.name)}</b> · ${esc(yr(a.year))} · ${esc(a.team)}</p>`+tbl(["Event","College best"],a.bests.map(b=>[evName(b[0]),b[1]+(b[2]?` (wind ${b[2]})`:"")]))+
      `<p>Most recent meets:</p>`+tbl(["Meet","Date","Event","Mark","Place"],a.meets.slice(0,4).flatMap(m=>m.rows.slice(0,3).map(r=>[m.meet,m.date,evName(r[0]),r[1],r[3].replace(/\s*\(P\)/," · Prelim").replace(/\s*\(F\)/," · Final")])))+
      `<p><a href="https://tf.tfrrs.org/athletes/${esc(k)}" target="_blank" rel="noopener">Full profile on TFRRS ›</a></p>`};}
  }
  /* rankings for any year / season / division / conference */
  if(d.e&&(/\b(fastest|best|top|leader|leaders|rank|ranked|ranking|rankings|who|longest|highest|farthest|results|list)\b/.test(q)||d.year)){
    const div=d.div||"NCAA D1",y=d.year||"2026",se=d.season||"outdoor",x=RIDX.find(r=>r.year===y&&r.season===se&&r.div===div);
    if(!x)return {html:`<p>I don't have ${esc(y)} ${esc(se)} ${esc(div)} results yet. Available: ${esc([...new Set(RIDX.map(r=>r.year+" "+r.season))].join(", "))}.</p>`};
    await load(x.key,true);const D=CACHE[x.key];if(!D||D.err)return {html:"<p>Those results aren't available right now.</p>"};
    const L=d.conf?D.lists.find(l=>l.label.toLowerCase()===d.conf.toLowerCase())||D.lists.find(l=>l.label.toLowerCase().includes(d.conf.toLowerCase())):D.lists.find(l=>l.nat)||D.lists[0];
    const E=(L&&L.g[g])||{},want=TF[d.e]||d.e,ek=Object.keys(E).find(k=>k===want)||Object.keys(E).find(k=>evLabel(k)===d.e);
    if(!ek)return {html:`<p>No ${gl(g)} ${esc(d.e)} on the ${esc(L?L.label:div)} ${esc(y)} ${esc(se)} list.</p>`};
    const rows=E[ek].slice(0,10),lname=L.nat?div+" national list":L.label;
    const spec={title:`Top 10 ${gl(g)} ${d.e} · ${lname} · ${y} ${se}`,type:"bar",labels:rows.map(r=>r[1]||D.teams[r[3]]),series:[{name:d.e,values:rows.map(r=>mval(r[4]))}],value_format:FIELD.has(d.e)||/m$/.test(rows[0][4])?"meters":"time",lower_is_better:!(/m$/.test(rows[0][4]))};
    return {html:chartSvg(spec)+tbl(["#","Athlete","Team","Mark"],rows.map((r,i)=>[i+1,r[1]||D.teams[r[3]],D.teams[r[3]],r[4]]),3)+`<p>Full list on College Track Results.</p>`,f:[y==="2026"?`Top ${gl(g)} ${d.e} in ${div} 2025`:`Top ${gl(g)} ${d.e} in ${div} 2026`]};
  }
  if(/\b(mean|meaning|difference|what is a|what's a)\b/.test(q)&&d.school==null)
    return {html:`<p><b>Walk-On:</b> ${DEF.W}</p><p><b>Recruit:</b> ${DEF.R} Not a guarantee.</p><p><b>Target:</b> ${DEF.T}</p>`,f:["Compare Oregon vs USC 400m","Which D2 schools fit a 5:05 women's 1600m?"]};
  if(/\b(quiz|evaluation|preferred recruit|get recruited|help me|contact coaches|guarantee)\b/.test(q)&&!d.e&&d.school==null)
    return {html:`<p>Preferred Recruit gets your marks in front of college coaches. Guaranteed genuine interest or a full refund.</p><p>The free recruitment evaluation takes about a minute and shows if you qualify.</p>`+QL()};
  if(d.conf&&!d.e&&d.tier){d.e="100m";d.defaulted=1}
  if(d.e&&d.mark){
    const v=parse(d.mark,d.e); if(v==null) return {html:`<p>I couldn't read "${esc(d.mark)}" as a ${esc(d.e)} mark. Try something like ${esc(ph(d.e))}.</p>`};
    let pool=SCH.filter(s=>(!d.div||s.d===d.div)&&(!d.conf||s.c===d.conf)); const hit=pool.map(s=>({s,t:tier(s,g,d.e,v)})).filter(x=>x.t);
    const c=k=>hit.filter(x=>x.t===k).length; hit.sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||a.s.n.localeCompare(b.s.n));
    const scope=[d.div,d.conf].filter(Boolean).join(" · ")||"all divisions";
    if(!hit.length) return {html:`<p>A ${esc(d.mark)} ${gl(g)} ${esc(d.e)} doesn't meet a listed standard in ${esc(scope)} yet.</p>`+QL(),f:[`Which D3 schools fit a ${d.mark} ${d.e}?`]};
    const cvl=convLine(d.e,g,v);
    return {html:(cvl?`<p>College equivalent: ${cvl}.</p>`:"")+`<p>A <b>${esc(d.mark)}</b> in the ${gl(g)} ${esc(d.e)} fits <b>${hit.length}</b> colleges (${esc(scope)}): ${c("T")} at Target, ${c("R")} at Recruit and ${c("W")} at Walk-On.</p>`+tbl(["College","Division","Level"],hit.slice(0,10).map(x=>[x.s.n,x.s.d,TN[x.t]]),9)+(hit.length>10?`<p>Showing 10 of ${hit.length}. The full list is on College Track Standards.</p>`:"")+QL(),
      f:d.div?[]:[`Only D1 schools for a ${d.mark} ${d.e}`]};
  }
  if(d.school!=null){
    const s=SCH[d.school], st=s[g];
    if(d.e&&st[d.e]) {const t=st[d.e];return {html:`<p><b>${esc(s.n)}</b> ${gl(g)} ${esc(d.e)}${s.o?" (official standards)":s.est?" (estimate)":" (based on 2026 conference results)"}:</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],["Walk-On",t[2]||"–"]])+QL()}}
    const ev=EVENTS.filter(e=>st[e]); if(!ev.length) return {html:`<p>${esc(s.n)} doesn't list ${gl(g)} standards yet.</p>`};
    return {html:`<p><b>${esc(s.n)}</b> · ${s.d} · ${esc(s.c)} · ${gl(g)} standards${s.o?" (official)":" (based on conference results)"}:</p>`+tbl(["Event","Target","Recruit","Walk-On"],ev.map(e=>[e,st[e][0]||"–",st[e][1]||"–",st[e][2]||"–"]))+QL(),
      f:[`Show ${s.n} ${g==="m"?"women's":"men's"} standards`]};
  }
  if(d.e&&/\b(fastest|best|top|leader|leaders|rank|ranked|ranking|rankings|who|longest|highest|farthest)\b/.test(q)){
    const div=d.div||"NCAA D1", x=RIDX.find(r=>r.year==="2026"&&r.season==="outdoor"&&r.div===div); if(!x) return {html:"<p>I don't have that list yet.</p>"};
    if(!CACHE[x.key]) await load(x.key,true);
    const D=CACHE[x.key], L=D.lists.find(l=>l.nat)||D.lists[0], rows=L&&L.g[g]&&L.g[g][TF[d.e]];
    if(!rows||!rows.length) return {html:`<p>No ${esc(div)} ${gl(g)} ${esc(d.e)} list in the 2026 outdoor data.</p>`};
    return {html:`<p>Top ${gl(g)} ${esc(d.e)} marks in ${esc(div)}, 2026 outdoor (TFRRS):</p>`+tbl(["#","Athlete","Team","Mark"],rows.slice(0,10).map(r=>[r[0],r[1],D.teams[r[3]],r[4]]),3)+`<p>Full list on College Track Results.</p>`,f:[`Top ${g==="m"?"women's":"men's"} ${d.e} in ${div}`]};
  }
  if(d.e&&d.conf){
    const pool=SCH.filter(s=>s.c===d.conf&&s[g][d.e]); if(!pool.length) return {html:`<p>No ${esc(d.conf)} school lists ${gl(g)} ${esc(d.e)} standards yet.</p>`};
    const k=d.tier?{T:0,R:1,W:2}[d.tier]:null, rows=pool.map(s=>[s.n,...s[g][d.e]]).sort((a,b)=>(parse(a[k==null?2:k+1],d.e)??99)-(parse(b[k==null?2:k+1],d.e)??99));
    const ck0=(SCH.find(s=>s.c===d.conf)||{}).ck, cl0=(((CT[ck0]||{})[g]||{})[d.e]||[])[0], cl=cl0?[null,null,cl0[0]]:null;
    return {f:d.defaulted?[`${d.conf} 400m walk-on`,`${d.conf} women's 100m walk-on`]:null,html:`<p>${d.defaulted?"Here's the 100m to start. ":""}${esc(d.conf)} ${gl(g)} ${esc(d.e)} standards${d.tier?`, sorted by ${TN[d.tier]}`:""}:</p>`+tbl(["School","Target","Recruit","Walk-On"],rows.map(r=>[r[0],r[1]||"–",r[2]||"–",r[3]||"–"]))+(cl&&cl[2]?`<p>This season the 8th-best ${esc(d.conf)} mark was <b>${esc(cl[2])}</b>, usually the last scoring spot at the conference meet.</p>`:"")+QL()};
  }
  if(d.conf&&!d.e) return {html:`<p>Which event in the ${esc(d.conf)}? For example: "${esc(d.conf)} ${g==="w"?"women's ":""}400m walk-on".</p>`,f:[`${d.conf} 100m standards`,`${d.conf} 1500m standards`]};
  if(d.e){
    const div=d.div||"NCAA D1", pool=SCH.filter(s=>s.d===div&&s[g][d.e]).map(s=>({t:s[g][d.e][0],r:s[g][d.e][1],w:s[g][d.e][2]}));
    const T=spread(pool,d.e,"t"),Rr=spread(pool,d.e,"r"),W=spread(pool,d.e,"w"); const B=Rr||W||T; if(!B) return {html:`<p>Not enough ${esc(div)} ${gl(g)} ${esc(d.e)} standards to summarize yet.</p>`};
    return {html:`<p>Across ${B[2]} ${esc(div)} programs, the middle half of ${gl(g)} ${esc(d.e)} standards look like this:</p>`+tbl(["Level","Range"],[["Target",T?`${T[0]} to ${T[1]}`:"–"],["Recruit",Rr?`${Rr[0]} to ${Rr[1]}`:"–"],["Walk-On",W?`${W[0]} to ${W[1]}`:"–"]])+`<p>Tell me your best mark and I'll list the schools it fits.</p>`,
      f:[`Which ${div} schools fit a ${ph(d.e)} ${d.e}?`,`${d.e} ${div==="NCAA D1"?"NCAA D2":"NCAA D1"} standards`]};
  }
  return {html:`<p>I answer from this site's data. Ask about a school's standards, which colleges fit your mark, two schools or conferences side by side, rankings for any year back to 2016, an athlete, or a high school to college conversion.</p>`,f:SUGG.slice(0,3).map(s=>s[0])};
}

/* ---------- Recruiting chat v2: conversational, data-only (Ryan 2026-10-13) ----------
   Remembers the conversation (event, gender, mark, school, division, conference, year), answers follow-ups
   ("what about women?", "and D2?", "the 800 instead"), and asks clarifying questions with tap-able answers
   when something is missing or ambiguous. Every number comes from the site's own data. */
const CX={};
const STATES={alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",connecticut:"CT",delaware:"DE",florida:"FL",georgia:"GA",hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",mississippi:"MS",missouri:"MO",montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND",ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD",tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY"};
const EVCH={m:["100m","200m","400m","800m","1600m","3200m","110m Hurdles","Long Jump","High Jump","Shot Put"],w:["100m","200m","400m","800m","1600m","3200m","100m Hurdles","Long Jump","High Jump","Shot Put"]};
const RX={
  define:/\b(mean|meaning|means|difference between (a )?(target|recruit|walk)|what is a|what's a|explain the levels?)\b/,
  funnel:/\b(quiz|evaluation|get recruited|contact (a )?coach|help me get|preferred recruit|how do i get recruited|scholarship help)\b/,
  convert:/\b(convert|conversion|equivalent|equal to|translate|in college terms|college time|college mark|worth in college)\b/,
  count:/\bhow many\b/,
  champ:/\b(won|win|winner|champion|champions|championship|nationals|national title|ncaa final|national final)\b/,
  rank:/\b(fastest|best|top|leaders?|rank|ranked|ranking|rankings|record|results|who ran|longest|highest jump|farthest|furthest|list)\b/,
  superl:/\b(easiest|hardest|toughest|lowest|highest|slowest|most competitive|least competitive)\b/,
  cmp:/\b(vs|versus|compare|compared|comparison|against)\b/,
  fit:/\b(fit|fits|qualify|qualifies|could i|can i|where can|where could|which (schools|colleges)|what (schools|colleges)|good enough|my (time|mark|pr|pb|best)|recruit me|walk on at|chance|chances|options?)\b/,
  athlete:/\b(who is|athlete|profile|meet history|personal best of|bests? of)\b/,
  hi:/^\s*(hi|hey|hello|yo|sup|what's up|whats up|good (morning|afternoon|evening))\b/,
  thanks:/^\s*(thanks|thank you|thx|ty|appreciate it|cool|great|awesome|perfect|ok|okay|got it)\b/
};
const evChips=g=>EVCH[g||"m"].slice();
const gChips=["Men's","Women's"];
function askBack(slot,text,chips){CX.await=slot;return {html:`<p>${text}</p>`,f:chips||[]}}
function stateOf(q){for(const [k,v] of Object.entries(STATES)){if(q.includes(" "+k+" "))return v}const m=q.match(/\b(in|from) ([a-z]{2})\b/);if(m&&Object.values(STATES).includes(m[2].toUpperCase()))return m[2].toUpperCase();return null}
function ambiguousSchools(q){for(const [a] of ALIAS){if(q.includes(" "+a+" ")){const ids=[...new Set(ALIAS.filter(x=>x[0]===a).map(x=>x[1]))];return ids.length>1?ids:null}}return null}
function scopeList(){return SCH.map((s,i)=>({s,i})).filter(({s})=>!s.j&&(!CX.div||s.d===CX.div)&&(!CX.conf||s.c===CX.conf)&&(!CX.state||s.s===CX.state))}
const scopeName=()=>[CX.conf,CX.div,CX.state].filter(Boolean).join(" · ")||"all divisions";
const fmtv=(e,v)=>FIELD.has(e)?v.toFixed(2)+"m":fmtT(v);

/* several events at once: per-event fit + an honest estimate built only from the site's standards */
function multiAnswer(g,P){const L=scopeList(),rows=[],per=[];
  for(const p of P){const v=parse(p.mark,p.e);const fit=L.map(({s,i})=>({s,i,t:tier(s,g,p.e,v)})).filter(z=>z.t);
    const c=k=>fit.filter(z=>z.t===k).length,nm=nearMiss(g,p.e,v);per.push({...p,v,fit,T:c("T"),R:c("R"),W:c("W"),nm,cl:convLine(p.e,g,v)})}
  const by=new Map();per.forEach(p=>p.fit.forEach(z=>{const o=by.get(z.i)||{s:z.s,best:"W",evs:[]};o.evs.push(p.e+" ("+TN[z.t]+")");if("TRW".indexOf(z.t)<"TRW".indexOf(o.best))o.best=z.t;by.set(z.i,o)}));
  const comb=[...by.values()].sort((a,b)=>"TRW".indexOf(a.best)-"TRW".indexOf(b.best)||b.evs.length-a.evs.length||DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));
  const both=comb.filter(o=>o.evs.length===P.length).length, top=[...per].sort((a,b)=>(b.T+b.R)-(a.T+a.R)||b.fit.length-a.fit.length)[0];
  let h=`<p>Here's how your ${per.length} events stack up against ${esc(scopeName())} (${gl(g)}):</p>`+
    tbl(["Event","Mark","Colleges","Target","Recruit","Walk-On"],per.map(p=>[p.e,p.mark,p.fit.length,p.T,p.R,p.W]),2);
  h+=`<p><b>Estimate:</b> your strongest event is the <b>${esc(top.e)}</b>, which reaches Recruit or Target level at <b>${(top.T+top.R).toLocaleString()}</b> programs. `+
     `Across all ${per.length} events, <b>${comb.length.toLocaleString()}</b> colleges have a spot for you${P.length>1?`, and <b>${both.toLocaleString()}</b> fit you in every event you listed`:""}.</p>`;
  const nm=per.filter(p=>p.nm&&p.nm.n>=3);if(nm.length)h+=`<p>Closest to moving up: ${nm.map(p=>`your ${esc(p.e)} is ${esc(p.nm.gap)} from ${TN[p.nm.lvl]} level at ${p.nm.n} schools`).join("; ")}.</p>`;
  const cv=per.filter(p=>p.cl);if(cv.length)h+=`<p>College equivalents: ${cv.map(p=>`${esc(p.e)} ${p.cl}`).join(" ")}</p>`;
  if(comb.length)h+=tbl(["College","Division","Best level","Events that fit"],comb.slice(0,12).map(o=>[o.s.n+(o.s.o?" ★":""),o.s.d,TN[o.best],o.evs.join(", ")]),9)+(comb.length>12?`<p>Top 12 of ${comb.length}. Ask for a division, conference or state to narrow it.</p>`:"");
  h+=`<p class="note">Estimates compare your marks with each program's standards on this site. They aren't offers or guarantees; coaches also weigh grades, progression and roster needs.</p>`;
  return {html:h+QL(),f:[!CX.div?"Only D1":"All divisions","Only schools in Texas",g==="m"?"What about women?":"What about men?"]}}
/* ---------- athlete progression + comparisons for every athlete 2016-today (Ryan 2026-10-24: "if I ask for Ajay's progression
   over the years in the 100m, it should pull all that data instantly ... comparing Tibs to Ryan Searl ... generate graphs") ---------- */
const getNames=t=>{if(NAMES[t])return Promise.resolve(NAMES[t]);loadNames(t);return (NAMEL[t]||Promise.resolve()).then(()=>NAMES[t]||[])};
const getCareer=id=>{const b=+id%512;if(!CAR[b])loadCareer(id);return (CARL[b]||Promise.resolve()).then(()=>careerOf(id))};
const getHist=id=>{const b=+id%1024;if(!HIS[b])loadHist(id);return (HISL[b]||Promise.resolve()).then(()=>histOf(id))};
const ASTOP=new Set("compare comparison versus vs and to with against progression progress progressed improvement improve improved improving over the years year career history trend trends season seasons his her their of in at for show me how did has have what is was were a an running ran times time marks mark chart graph plot".split(" "));
const lev1=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,n=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++n>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}return n+(a.length-i)+(b.length-j)<=1};   /* "Tibs" = "Tibbs" */
async function resolveAthlete(seg){
  const ws=nq(seg).split(" ").map(w=>w.replace(/[^a-z']/g,"")).filter(w=>w.length>=3&&!ASTOP.has(w)&&!evKey(w));if(!ws.length)return null;
  const lists=await Promise.all([...new Set(ws.map(w=>w.slice(0,2)))].map(getNames)),seen=new Map();
  for(const L of lists)for(const e of L){const tk=e[0].toLowerCase().split(/[^a-z']+/).filter(Boolean);let sc=0,fuzzy=0;
    for(const w of ws){let j=tk.findIndex(t=>t===w||(w.length>=4&&t.startsWith(w))),fz=0;if(j<0&&w.length>=4){j=tk.findIndex(t=>lev1(t,w));fz=1;fuzzy=1}if(j<0){sc=-1;break}sc+=(tk[j]===w?2:1)+(j>0?1:0);
      if(fz){let k=0;while(k<w.length&&tk[j][k]===w[k])k++;sc+=k*.1}}
    if(sc>0&&(!seen.has(e[1])||seen.get(e[1]).sc<sc))seen.set(e[1],{e,sc,fuzzy})}
  let c=[...seen.values()];if(c.some(x=>!x.fuzzy))c=c.filter(x=>!x.fuzzy);   /* "Tibs" means Tibbs; typo matches only when nothing matches directly */
  c.sort((a,b)=>b.sc-a.sc||b.e[3].localeCompare(a.e[3]));if(!c.length)return {none:ws.join(" ")};
  const top=c.filter(x=>x.sc===c[0].sc);return top.length===1?{e:top[0].e}:{amb:top.slice(0,6).map(x=>x.e)}}
const aLink=e=>`/?tab=results&season=${e[3]}&div=${encodeURIComponent(e[4])}&athlete=${e[1]}`;
const evOf=(rows,want)=>{const evs=[...new Set(rows.map(x=>x[2]))];if(want){const m=evs.find(x=>evLabel(x)===want||x===TF[want])||evs.find(x=>evLabel(x).replace(/ \(.*\)/,"")===want);if(m)return m}
  return evs.sort((a,b)=>rows.filter(x=>x[2]===b).length-rows.filter(x=>x[2]===a).length)[0]};
const pct=(a,b,F)=>{const c=F?(b-a)/a:(a-b)/a;return `${c>=0?"+":""}${(c*100).toFixed(1)}%`};
async function athleteProgress(e,want,q=""){
  const C=await getCareer(e[1]);if(!C||!C.s.length)return {html:`<p>I don't have season marks for ${esc(e[0])} yet.</p>`};
  const ev=evOf(C.s,want),miss=want&&evLabel(ev)!==want&&(TF[want]||want)!==ev,F=tfield(ecode(ev)),pts=C.s.filter(x=>x[2]===ev&&tval(x[3])!=null).sort((a,b)=>skey(a[0])-skey(b[0]));
  const v=pts.map(x=>tval(x[3])),best=F?Math.max(...v):Math.min(...v),bx=pts[v.indexOf(best)],schools=[...new Set([...(C.p||[]).map(tcanon),...pts.map(x=>tcanon(x[5]))])];
  /* answer the question asked first: schools ("where did ... go before"), or a missing event */
  const allSch=[...new Set([...(C.p||[]).map(tcanon),...C.s.slice().sort((a,b)=>skey(a[0])-skey(b[0])).map(x=>tcanon(x[5]))])],yrs=C.s.map(x=>+x[0].slice(0,4));
  let lead="";
  if(/\b(before|previous\w*|transfer\w*|which (schools?|colleges?)|where did|where does|what (school|college)|go to school|schools? did)\b/.test(q))
    lead=allSch.length>1?`<p><b>${esc(e[0])}</b> has competed for ${allSch.map(x=>`<b>${esc(x)}</b>`).join(" → ")}.</p>`:`<p><b>${esc(e[0])}</b> has only competed for <b>${esc(allSch[0])}</b> on TFRRS (${Math.min(...yrs)} to ${Math.max(...yrs)}), no earlier school listed.</p>`;
  if(miss)lead+=`<p>I don't have ${esc(want)} marks for ${esc(e[0])} on the lists. ${esc(e[0].split(" ")[0])}'s events: ${esc([...new Set(C.s.map(x=>evLabel(x[2])))].join(", "))}. Here's the ${esc(evLabel(ev))}:</p>`;
  let html=lead+`<p><b>${esc(e[0])}</b> · ${esc(schools.join(" → "))} · ${esc(evLabel(ev))}: ${pts.length>1?`from <b>${esc(pts[0][3])}</b> (${esc(seasonLabel(pts[0][0]))}) to <b>${esc(pts[pts.length-1][3])}</b> (${esc(seasonLabel(pts[pts.length-1][0]))}), ${pct(v[0],v[v.length-1],F)}. Best: <b>${esc(bx[3])}</b> in ${esc(seasonLabel(bx[0]))}.`:`one season so far, <b>${esc(pts[0][3])}</b> (${esc(seasonLabel(pts[0][0]))}).`}</p>`;
  if(pts.length>1)html+=chartSvg({title:`${e[0]} · ${evLabel(ev)} season bests`,type:"line",labels:pts.map(x=>seasonLabel(x[0]).replace("Outdoor","Out").replace("Indoor","In")),series:[{name:e[0],values:v}],value_format:F?"meters":"time",lower_is_better:!F});
  html+=tbl(["Season","School","Mark","Change","National rank"],pts.map((x,i)=>[seasonLabel(x[0]),tcanon(x[5]),x[3]+(x[4]?` (wind ${x[4]})`:""),i?pct(v[i-1],v[i],F):"–",x[6]?"#"+x[6]:"–"]),2);
  /* the latest season race by race, when we have their TFRRS history */
  const H=await getHist(e[1]),code=ecode(ev),last=pts[pts.length-1][0],races=(H||[]).filter(x=>x[0]===last&&x[3]===code&&tval(x[4])!=null);
  if(races.length>1){const rv=races.map(x=>tval(x[4])),rb=F?Math.max(...rv):Math.min(...rv),bi=rv.indexOf(rb),champ=/championship|conference|ncaa|regional|first round/i.test(races[bi][2]);
    html+=`<p>${esc(seasonLabel(last))}, race by race: ${races.length} races, from ${esc(races[0][4])} to a season best of <b>${esc(races[bi][4])}</b> at ${esc(races[bi][2])}${champ?" (a championship meet: peaked on time)":""}.</p>`+chartSvg({title:`${e[0]} · ${evLabel(ev)} · ${seasonLabel(last)} races`,type:"line",labels:races.map(x=>{const [,m,dd]=x[1].split("-");return `${MO[+m-1]} ${+dd}`}),series:[{name:e[0],values:rv}],value_format:F?"meters":"time",lower_is_better:!F})}
  html+=`<p><a href="${aLink(e)}">Open ${esc(e[0])}'s full profile ›</a></p>`;
  const others=[...new Set(C.s.map(x=>x[2]))].filter(x=>x!==ev).slice(0,2).map(x=>`${e[0]} ${evLabel(x)} progression`);
  return {html,f:others}}
async function athleteCompare(e1,e2,want){
  const [A,B]=await Promise.all([getCareer(e1[1]),getCareer(e2[1])]);if(!A||!B)return {html:"<p>I couldn't load both careers.</p>"};
  const shared=[...new Set(A.s.map(x=>x[2]))].filter(x=>B.s.some(y=>y[2]===x));
  let ev=want?shared.find(x=>evLabel(x)===want):null;if(!ev)ev=shared.sort((a,b)=>(B.s.filter(x=>x[2]===b).length+A.s.filter(x=>x[2]===b).length)-(B.s.filter(x=>x[2]===a).length+A.s.filter(x=>x[2]===a).length))[0];
  if(!ev)return {html:`<p>${esc(e1[0])} and ${esc(e2[0])} haven't run a common event. ${esc(e1[0])}: ${esc([...new Set(A.s.map(x=>evLabel(x[2])))].join(", "))}. ${esc(e2[0])}: ${esc([...new Set(B.s.map(x=>evLabel(x[2])))].join(", "))}.</p>`};
  const F=tfield(ecode(ev));
  /* line up by college year (their eras can differ): each year's best, outdoor and indoor together */
  /* a college year = that spring's indoor + outdoor seasons ("2016-indoor" and "2016-outdoor" are the 2015-16 year) */
  const byYear=C=>{const r=C.s.filter(x=>x[2]===ev&&tval(x[3])!=null),y0=Math.min(...r.map(x=>+x[0].slice(0,4))),o={};
    r.forEach(x=>{const k=+x[0].slice(0,4)-y0+1,v=tval(x[3]);if(!o[k]||(F?v>o[k].v:v<o[k].v))o[k]={v,x}});return o};
  const a=byYear(A),b=byYear(B),n=Math.max(...Object.keys(a).map(Number),...Object.keys(b).map(Number));
  const labels=[...Array(n)].map((_,i)=>"Year "+(i+1));
  const best=o=>{const L=Object.values(o);return L.reduce((p,c)=>!p||(F?c.v>p.v:c.v<p.v)?c:p,null)};const ba=best(a),bb=best(b),d=Math.abs(ba.v-bb.v);
  const lead=(F?ba.v>bb.v:ba.v<bb.v)?e1[0]:e2[0];
  let html=`<p><b>${esc(e1[0])}</b> (${esc(tcanon(ba.x[5]))}) vs <b>${esc(e2[0])}</b> (${esc(tcanon(bb.x[5]))}) in the ${esc(evLabel(ev))}: career bests ${esc(ba.x[3])} and ${esc(bb.x[3])}. ${esc(lead)} is ahead by ${F?(d>=1?d.toFixed(2)+" m":Math.round(d*100)+" cm"):d.toFixed(2)+" seconds"}. Lined up by college year, since their seasons may not overlap.</p>`;
  html+=chartSvg({title:`${e1[0]} vs ${e2[0]} · ${evLabel(ev)} by college year`,type:"line",labels,series:[{name:e1[0],values:labels.map((_,i)=>a[i+1]?a[i+1].v:null)},{name:e2[0],values:labels.map((_,i)=>b[i+1]?b[i+1].v:null)}],value_format:F?"meters":"time",lower_is_better:!F});
  html+=tbl(["College year",e1[0],e2[0]],labels.map((l,i)=>[l,a[i+1]?`${a[i+1].x[3]} (${seasonLabel(a[i+1].x[0])})`:"–",b[i+1]?`${b[i+1].x[3]} (${seasonLabel(b[i+1].x[0])})`:"–"]),1);
  const imp=o=>{const k=Object.keys(o).map(Number).sort((p,q)=>p-q);return k.length>1?pct(o[k[0]].v,o[k[k.length-1]].v,F):"one season"};
  html+=`<p>First to latest year: ${esc(e1[0])} ${imp(a)}, ${esc(e2[0])} ${imp(b)}. Profiles: <a href="${aLink(e1)}">${esc(e1[0])}</a> · <a href="${aLink(e2)}">${esc(e2[0])}</a></p>`;
  return {html,f:shared.filter(x=>x!==ev).slice(0,2).map(x=>`Compare ${e1[0]} and ${e2[0]} ${evLabel(x)}`)}}
async function athleteQ(raw,d){
  const q=nq(raw);const cmp=/(compare|comparison|vs\.?|versus|against)\b/.test(q)||/\bcompare\b/.test(q);
  const prog=/\b(progress|progression|progressed|improv\w*|over the years|career|history|trend|year to year|season to season|peak\w*)\b/.test(q);
  if(!cmp&&!prog)return null;
  if(cmp){const body=raw.replace(/^.*?\bcompare\b/i,"");const parts=body.split(/\s+(?:vs\.?|versus|to|and|with|against)\s+/i).map(x=>x.trim()).filter(Boolean);
    if(parts.length>=2&&(d.schools.length>=2||d.confs.length>=2||parts.slice(0,2).some(isSchoolText)))return null;   /* "compare Oregon and Stanford" = schools */
    if(parts.length>=2){const [r1,r2]=await Promise.all([resolveAthlete(parts[0]),resolveAthlete(parts[1])]);
      if(r1&&r2&&r1.e&&r2.e)return athleteCompare(r1.e,r2.e,d.e);
      if(r1&&r1.amb)return {html:`<p>Which one did you mean?</p>`,f:r1.amb.map(x=>`Compare ${x[0]} to ${r2&&r2.e?r2.e[0]:parts[1]}`)};
      if(r2&&r2.amb)return {html:`<p>Which one did you mean?</p>`,f:r2.amb.map(x=>`Compare ${r1&&r1.e?r1.e[0]:parts[0]} to ${x[0]}`)};
      return null}}
  if(prog){/* an athlete first; "UCSB's 100m progression" (no athlete by that name) falls through to the program answers */
    const r=await resolveAthlete(raw.replace(/\b(men'?s|women'?s|indoor|outdoor|ncaa|d[123])\b/gi," "));if(!r)return null;if(r.e)return athleteProgress(r.e,d.e);
    if(r.amb)return {html:`<p>Which athlete did you mean?</p>`,f:r.amb.map(x=>`${x[0]} ${d.e||""} progression (${tcanon(x[2])}, ${seasonLabel(x[3])})`.replace(/\s+/g," "))};
    if(r.none&&!d.schools.length&&!d.confs.length)return {html:`<p>I couldn't find an athlete called "${esc(r.none)}" in the results since 2016. Try their full name.</p>`}}
  return null}
/* ---------- program analytics (Ryan 2026-10-24: "average seasonal progression for 100m runners at UCSB over the last 10 years? Are
   athletes peaking at the right time? When did most athletes run their fastest times ... wind-legal ... how well a coach peaks").
   /data/teamstats/<slug>.json from scripts/tfrrs/build_teamstats.py (race-by-race TFRRS histories x the school each season) ---------- */
const TS={},TSL={};const tsk=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const getTS=k=>{if(!TSL[k])TSL[k]=fetch("/data/teamstats/"+k+".json").then(r=>r.ok?r.json():null).catch(()=>null).then(j=>TS[k]=j);return TSL[k]};
const PGRP={sprints:/sprint/,hurdles:/hurdl/,distance:/distance|mid.?distance|\b(runners?|milers?)\b(?!.*\b(100|200|400)\b)/,jumps:/jump(?!.*high|.*long|.*triple)|jumpers/,throws:/throw/};
const pctS=v=>v==null?"–":`${v>=0?"+":""}${v.toFixed(2)}%`;
async function programQ(raw,d){
  const q=nq(raw);
  const rankQ=/\b(rank|ranking|best|top|which (schools?|programs?|coaches?|teams?))\b/.test(q)&&/\b(peak\w*|develop\w*|improv\w*|progress\w*|coach\w*)\b/.test(q)&&d.schools.length===0;
  if(rankQ){const R=await fetch("/data/teamstats/_rank.json").then(r=>r.json()).catch(()=>[]);const div=d.div||(/\bnaia\b/.test(q)?"NAIA":null);
    const conf=d.confs[0],inConf=conf?new Set(SCH.filter(x=>x.c===conf).map(x=>tsk(x.t||x.n))):null;
    const by=/develop|improv|progress/.test(q)&&!/peak/.test(q)?"yoy":"peak";
    const L=R.filter(x=>(!div||x.division===div)&&(!inConf||inConf.has(x.slug))&&(by==="peak"?x.peak_n>=30:x.yoy_n>=30)).sort((a,b)=>b[by]-a[by]).slice(0,12);
    if(!L.length)return {html:"<p>Not enough race data for that group yet.</p>"};
    const what=by==="peak"?"peaking at the conference championship (share of athletes who ran their season best there or later)":"developing returning athletes (median change in season best from one year to the next at the same school)";
    return {html:`<p>Best programs at ${what}, ${esc(conf||div||"all divisions")}, seasons 2022 to 2026, every event pooled.</p>`+chartSvg({title:`${by==="peak"?"Peaking":"Year-over-year development"} · ${conf||div||"all divisions"}`,type:"bar",labels:L.map(x=>x.team),series:[{name:by==="peak"?"% peaked":"median % better",values:L.map(x=>x[by])}],value_format:"number",lower_is_better:false})
      +tbl(["Program","Division","Peaked at conference","Missed by (median)","Year-over-year","Athlete-seasons"],L.map(x=>[x.team,x.division.replace("NCAA ",""),x.peak+"% of "+x.peak_n,pctS(x.gap),pctS(x.yoy)+" ("+x.yoy_n+")",x.n]),2)
      +`<p>How to read it: "peaked" counts athletes who raced their event at the school's conference championship and ran their season best there or later (regionals, NCAA). From TFRRS meet histories; programs need 30+ such athletes.</p>`,f:["Rank D1 programs at developing athletes","Rank SEC programs at peaking"]}}
  if(!d.schools.length)return null;
  if(!/\b(progress\w*|improv\w*|peak\w*|develop\w*|coach\w*|when did|timing|season bests? (come|came|happen)|wind|trend|over the (last|past))\b/.test(q))return null;
  if(d.schools.length>=2){/* "compare Auburn and Arkansas peaking": programs side by side, 2022-2026, every event */
    const R=await fetch("/data/teamstats/_rank.json").then(r=>r.json()).catch(()=>[]);const P=d.schools.slice(0,4).map(i=>({s:SCH[i],x:R.find(r=>r.slug===tsk(SCH[i].t||SCH[i].n))})).filter(p=>p.x);
    if(P.length<2)return {html:"<p>I don't have enough race data for both programs yet.</p>"};
    const pr=(f,v)=>{const peers=R.filter(r=>r.division===P[0].x.division);return Math.round(100*peers.filter(r=>r[f]<=v).length/peers.length)};
    return {html:`<p>${P.map(p=>`<b>${esc(p.s.t||p.s.n)}</b>`).join(" vs ")}, 2022 to 2026, every event pooled:</p>`
      +chartSvg({title:"Peaked at the conference championship (%)",type:"bar",labels:P.map(p=>p.s.t||p.s.n),series:[{name:"% peaked",values:P.map(p=>p.x.peak)}],value_format:"number",lower_is_better:false})
      +tbl(["Program","Peaked at conference","Missed by (median)","In-season progression","Year over year","Athlete-seasons"],P.map(p=>[p.s.t||p.s.n,`${p.x.peak}% of ${p.x.peak_n} (${pr("peak",p.x.peak)}th pct)`,pctS(p.x.gap),pctS(p.x.imp),`${pctS(p.x.yoy)} (${pr("yoy",p.x.yoy)}th pct)`,p.x.n]),1)
      +`<p>Percentiles are against every ${esc(P[0].x.division)} program. Ask about one program for its season-by-season numbers.</p>`,f:P.map(p=>`Is ${p.s.t||p.s.n} peaking at the right time?`).slice(0,2)}}
  const s=SCH[d.schools[0]],k=tsk(s.t||s.n);const T=await getTS(k);
  if(!T)return {html:`<p>I don't have race-by-race data for ${esc(s.n)} yet. It fills in as the TFRRS scan reaches their athletes.</p>`};
  /* site event name -> TFRRS code ("100m" -> 100, "110m Hurdles" -> 110H, "10000m" -> 10,000, "High Jump" -> HJ) */
  const ev=d.e?(ECODE[d.e]||d.e.replace(/^(\d+)m Hurdles.*$/,"$1H").replace(/^(\d+)m Steeplechase$/,"$1S").replace(/^10000m$/,"10,000").replace(/^(\d+)m$/,"$1")):null;
  const grp=Object.keys(PGRP).find(g=>PGRP[g].test(q));const key=ev||(grp?"g:"+grp:"g:all");
  const indoor=/\bindoor\b/.test(q),yrs=+((q.match(/\b(?:last|past)\s+(\d+)\s+years?\b/)||[])[1]||0),y1=new Date().getFullYear()-(yrs||11)+1;
  const S=Object.entries(T.seasons).filter(([sk,E])=>sk.endsWith(indoor?"indoor":"outdoor")&&+sk.slice(0,4)>=y1&&E[key]&&E[key].n).sort((a,b)=>a[0].localeCompare(b[0]));
  const label=ev?d.e:grp||"all events";
  if(!S.length)return {html:`<p>No ${esc(label)} race data for ${esc(s.n)} in those seasons.</p>`};
  const X=S.map(([sk,E])=>({sk,...E[key]})),sum=(f)=>{const L=X.filter(x=>x[f]!=null);return L.length?L.reduce((a,x)=>a+x[f]*x.n,0)/L.reduce((a,x)=>a+x.n,0):null};
  const pk=X.reduce((a,x)=>a+(x.peak!=null?x.peak*x.peak_n:0),0),pkn=X.reduce((a,x)=>a+(x.peak_n||0),0);
  const months={};X.forEach(x=>Object.entries(x.month||{}).forEach(([m,n])=>months[m]=(months[m]||0)+n));const mk=Object.keys(months).map(Number).sort((a,b)=>a-b),MN="Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const top=mk.reduce((a,m)=>months[m]>(months[a]||0)?m:a,mk[0]);const totM=mk.reduce((a,m)=>a+months[m],0);
  const R=await fetch("/data/teamstats/_rank.json").then(r=>r.json()).catch(()=>[]),me=R.find(x=>x.slug===k),peers=R.filter(x=>x.division===(me||{}).division);
  const pctile=(f)=>me&&peers.length?Math.round(100*peers.filter(x=>x[f]<=me[f]).length/peers.length):null;
  let html=`<p><b>${esc(s.n)}</b> · ${esc(label)} · ${indoor?"indoor":"outdoor"} ${esc(S[0][0].slice(0,4))} to ${esc(S[S.length-1][0].slice(0,4))} (men and women, ${X.reduce((a,x)=>a+x.n,0)} athlete-seasons with 2+ races):</p><ul>
    <li><b>In-season progression:</b> the typical athlete improved <b>${pctS(sum("imp"))}</b> from their first race to their season best.</li>
    <li><b>Peaking:</b> ${pkn?`<b>${Math.round(pk/pkn)}%</b> of the ${pkn} who raced at the conference championship ran their season best there or later`:"no conference-meet races in this data"}${me&&pctile("peak")!=null?` (all events, 2022 to 2026: ${me.peak}%, better than ${pctile("peak")}% of ${esc(me.division)} programs)`:""}.</li>
    <li><b>Year over year:</b> returning athletes' season bests changed <b>${pctS(sum("yoy"))}</b> a year at ${esc(s.t||s.n)}${me&&pctile("yoy")!=null?` (all events, 2022 to 2026: ${pctS(me.yoy)}, ${pctile("yoy")}th percentile in ${esc(me.division)})`:""}.</li>
    <li><b>When they ran their fastest:</b> ${totM?`most season bests came in <b>${MN[top-1]}</b> (${Math.round(100*months[top]/totM)}%)`:"–"}.</li>
    ${X.some(x=>x.legal_n)?`<li><b>Wind:</b> in wind events, the wind-legal season best was a median <b>${pctS(sum("legal"))}</b> slower than the all-conditions best.</li>`:""}</ul>`;
  html+=chartSvg({title:`${s.t||s.n} · ${label} · in-season improvement by season`,type:"line",labels:X.map(x=>x.sk.slice(0,4)),series:[{name:"median first race to season best (%)",values:X.map(x=>x.imp)}],value_format:"number",lower_is_better:false});
  if(totM)html+=chartSvg({title:`When season bests were set (${label})`,type:"bar",labels:mk.map(m=>MN[m-1]),series:[{name:"season bests",values:mk.map(m=>months[m])}],value_format:"number",lower_is_better:false});
  html+=tbl(["Season","Athletes","First race → best","Peaked at conference","Missed by (median)","Year over year"],X.map(x=>[seasonLabel(x.sk),x.n,pctS(x.imp),x.peak!=null?x.peak+"% of "+x.peak_n:"–",pctS(x.gap),x.yoy_n?pctS(x.yoy)+" ("+x.yoy_n+")":"–"]),1);
  html+=`<p>Conference meet used: ${esc(((T.conf_meet||{})[S[S.length-1][0]]||[""])[0])}. From TFRRS meet histories of athletes whose pages we've collected; every number shows its sample size.</p>`;
  return {html,f:[`${s.t||s.n} ${indoor?"outdoor":"indoor"} progression`,`Rank ${esc(s.c)} programs at peaking`,`${s.t||s.n} distance progression`]}}
/* ---------- smarter routing without an outside AI (Ryan 2026-10-24: "make it really good without an anthropic key") ---------- */
const QSTOP=new Set(("a an the and or but of in on at to for from by with about is are was were be been being do does did done has have had what whats what's which who whom whose when where why how much many "+
  "can could would should will shall may might must i me my mine you your he him his she her they them their we us our it its this that these those there here than then also just only very really "+
  "show tell give list find get compare vs versus against best top fastest quickest slowest longest highest farthest record records time times mark marks pr prs pb run ran running runs race races raced "+
  "jump jumped jumping throw threw throwing season seasons year years career progression progress improvement improve improved history stats statistics standard standards recruit recruiting recruited "+
  "walk walkon on college colleges school schools team teams program programs coach coaches athlete athletes runner runners sprinter sprinters men women mens womens men's women's boys girls guys "+
  "indoor outdoor ncaa division d1 d2 d3 naia njcaa conference conferences national nationals rank ranked ranking rankings meet meets go went before after transfer transferred previously now currently ever all time").split(" "));
let TREND=null;
const DIVRX=[["NCAA D1",/\b(d1|di|division (1|i))\b/],["NCAA D2",/\b(d2|dii|division (2|ii))\b/],["NCAA D3",/\b(d3|diii|division (3|iii))\b/],["NAIA",/\bnaia\b/],["NJCAA",/\b(njcaa|juco)\b/]];
const BETTER=/\b(under|sub|below|faster than|quicker than|less than|over|above|farther than|further than|higher than|longer than|more than|better than)\b/;
const isSchoolText=t=>{const x=nq(t).trim();return !!x&&(ALIAS.some(([a])=>a===x)||hits(x).some(([s])=>(s.t||s.n).toLowerCase()===x||s.n.toLowerCase()===x))};
const lastKey=(div,season)=>{const L=RIDX.filter(r=>r.div===div&&r.season===(season||"outdoor")).sort((a,b)=>b.year.localeCompare(a.year));return L[0]};
const listEv=(D,g,e)=>{const L=D.lists.find(l=>l.nat)||D.lists[0],E=(L&&L.g[g])||{},want=TF[e]||e;const k=Object.keys(E).find(k=>k===want)||Object.keys(E).find(k=>evLabel(k)===e);return k?{rows:E[k],key:k}:null};
async function smartQ(raw,d){
  const q=nq(raw);const divs=DIVRX.filter(([,re])=>re.test(q)).map(([k])=>k);
  const indoor=/\bindoor\b/.test(q)||/\b(60m|mile|weight throw|pentathlon)\b/.test(q),season=indoor?"indoor":"outdoor",g=d.g||CX.g||"m";
  /* 1. "how many D1 men ran under 10.2 in the 100m in 2026" -> count athletes on the national list */
  if(/\bhow many\b/.test(q)&&BETTER.test(q)&&d.e&&d.mark){const div=divs[0]||"NCAA D1",x=d.year?RIDX.find(r=>r.div===div&&r.year===d.year&&r.season===season):lastKey(div,season);if(!x)return {html:`<p>No ${esc(div)} ${season} list for ${esc(d.year||"that year")}.</p>`};
    await load(x.key,true);const D=CACHE[x.key],L=listEv(D,g,d.e);if(!L)return {html:`<p>No ${gl(g)} ${esc(d.e)} on the ${esc(div)} ${x.year} ${season} list.</p>`};
    const F=FIELD.has(d.e),lim=parse(d.mark,d.e),hit=L.rows.filter(r=>{const v=parse(String(r[4]).replace(/\s*[@#]+/g,""),d.e);return v!=null&&(F?v>lim:v<lim)});
    return {html:`<p><b>${hit.length}</b> ${gl(g)} athletes ${F?"went past":"ran faster than"} <b>${esc(d.mark)}</b> in the ${esc(d.e)} on the ${esc(div)} ${x.year} ${season} national list${WIND&&WEV.has(L.key)?" (wind-legal marks only)":" (all wind conditions)"}.</p>`+(hit.length?tbl(["#","Athlete","Team","Mark"],hit.slice(0,15).map(r=>[r[0],r[1],D.teams[r[3]],r[4]+(r[5]?` (${r[5]})`:"")]),3):"")+(hit.length>15?`<p>Plus ${hit.length-15} more on the Results tab.</p>`:""),f:[`How many ${div.replace("NCAA ","")} ${g==="w"?"women":"men"} ran under ${d.mark} in ${(+x.year)-1}?`]}}
  /* 1b. "who ran 9.72 in the 100m?" -> athletes with that exact mark (this season's lists first, then earlier years) */
  if(/\bwho\b/.test(q)&&/\b(ran|run|runs|jumped|threw|has|have|had|did)\b/.test(q)&&d.mark&&d.e){const want=parse(d.mark,d.e),hit=[];
    const keys=RIDX.filter(r=>(!divs.length||divs.includes(r.div))&&r.season===season&&(!d.year||r.year===d.year)).sort((a,b)=>b.year.localeCompare(a.year)||Object.keys(DIVINFO).indexOf(a.div)-Object.keys(DIVINFO).indexOf(b.div));
    for(const x of keys.slice(0,d.year?8:24)){await load(x.key,true);const D=CACHE[x.key],L=listEv(D,g,d.e);if(!L)continue;
      for(const r of L.rows){const v=parse(String(r[4]).replace(/\s*[@#]+/g,""),d.e);if(v!=null&&Math.abs(v-want)<.005)hit.push([x.year,x.div,r])}if(hit.length>=12)break}
    if(!hit.length)return {html:`<p>Nobody on the ${gl(g)} ${esc(d.e)} lists I checked has exactly ${esc(d.mark)}. Try a year or division.</p>`};
    return {html:`<p>${hit.length>=12?"At least ":""}<b>${hit.length}</b> ${gl(g)} ${esc(d.e)} season best${hit.length>1?"s":""} of exactly ${esc(d.mark)}:</p>`+tbl(["Season","Division","Athlete","Team","Mark","National rank"],hit.map(([y,dv,r])=>[`${y} ${season}`,dv.replace("NCAA ",""),r[1],"",r[4]+(r[5]?` (${r[5]})`:""),"#"+r[0]]).map((row,i)=>{row[3]=CACHE[keys.find(k=>k.year===hit[i][0]&&k.div===hit[i][1]).key].teams[hit[i][2][3]];return row}),4),f:hit.length===1?[`${hit[0][2][1]} progression`]:[]}}
  /* 2. two divisions: "difference between D1 and D2 in the 400m" */
  if(divs.length>=2&&d.e){const g2=g,out=[];for(const div of divs.slice(0,3)){const x=d.year?RIDX.find(r=>r.div===div&&r.year===d.year&&r.season===season):lastKey(div,season);if(!x)continue;await load(x.key,true);const L=listEv(CACHE[x.key],g2,d.e);if(L)out.push({div,yr:x.year,rows:L.rows})}
    if(out.length<2)return null;const P=[1,10,25,50,100],F=FIELD.has(d.e),val=r=>parse(String(r[4]).replace(/\s*[@#]+/g,""),d.e);
    const med=(div,j)=>{const V=SCH.filter(s=>s.d===div&&s[g2][d.e]&&s[g2][d.e][j]).map(s=>parse(s[g2][d.e][j],d.e)).filter(v=>v!=null).sort((a,b)=>a-b);return V.length?V[Math.floor(V.length/2)]:null};
    const fm=v=>v==null?"–":F?v.toFixed(2)+"m":fmtT(v);
    return {html:`<p>${gl(g2)[0].toUpperCase()+gl(g2).slice(1)} ${esc(d.e)}, ${out.map(o=>`${esc(o.div)} ${o.yr}`).join(" vs ")} ${season}: the marks it took to rank at each place on the national list, and each division's median recruiting levels.</p>`
      +chartSvg({title:`${gl(g2)} ${d.e} · national list by place`,type:"line",labels:P.map(p=>p===1?"1st":ord(p)),series:out.map(o=>({name:o.div.replace("NCAA ",""),values:P.map(p=>o.rows[p-1]?val(o.rows[p-1]):null)})),value_format:F?"meters":"time",lower_is_better:!F})
      +tbl(["Place",...out.map(o=>o.div.replace("NCAA ",""))],P.map(p=>[p===1?"1st":ord(p),...out.map(o=>o.rows[p-1]?o.rows[p-1][4]:"–")]),1)
      +tbl(["Median level",...out.map(o=>o.div.replace("NCAA ",""))],[["Target",0],["Recruit",1],["Walk-On",2]].map(([n,j])=>[n,...out.map(o=>fm(med(o.div,j)))]),1),f:[`Which D2 schools fit a ${d.e} like the D1 50th best?`]}}
  /* 2b. year-by-year trend: "how has the D1 men's 100m changed since 2016?" */
  if(d.e&&d.school==null&&/\b(changed?|changing|trend\w*|over the years|since (19|20)\d\d|year by year|each year|every year|history of|getting (faster|slower|better)|over time)\b/.test(q)&&!/\b(progress\w*|peak\w*)\b/.test(q)){
    const T=TREND||(TREND=await fetch("/data/rank_trend.json").then(r=>r.json()).catch(()=>({}))),div=divs[0]||"NCAA D1",dk=Object.keys(DIVKEY).find(k=>k===div)?DIVKEY[div]:"d1";
    const ser=T[`${dk}|${season}|${g}|${TF[d.e]||d.e}`];if(!ser)return {html:`<p>No ${esc(div)} ${gl(g)} ${esc(d.e)} lists to compare.</p>`};
    const since=+((q.match(/since ((19|20)\d\d)/)||[])[1]||0),Y=Object.keys(ser).filter(y=>+y>=since).sort(),F=FIELD.has(d.e),v=m=>m==null?null:parse(String(m).replace(/\s*[@#]+/g,""),d.e);
    const P=[["Winner",1],["10th",2],["50th",4],["100th",5]],first=ser[Y[0]],last=ser[Y[Y.length-1]],ch=(a,b)=>a!=null&&b!=null?pct(v(a),v(b),F):"–";
    return {html:`<p>${esc(div)} ${gl(g)} ${esc(d.e)}, ${season} ${Y[0]} to ${Y[Y.length-1]}: the 10th-best mark went from <b>${esc(first[2]||"–")}</b> to <b>${esc(last[2]||"–")}</b> (${ch(first[2],last[2])}), the 50th from ${esc(first[4]||"–")} to ${esc(last[4]||"–")} (${ch(first[4],last[4])}). ${+Y[0]<2022?"Lists before 2022 are shallower on TFRRS, so deep places start later.":""}</p>`
      +chartSvg({title:`${div} ${gl(g)} ${d.e} by year`,type:"line",labels:Y,series:P.map(([n,j])=>({name:n,values:Y.map(y=>v(ser[y][j]))})),value_format:F?"meters":"time",lower_is_better:!F})
      +tbl(["Year","Winner","10th","50th","100th","Athletes listed"],Y.map(y=>[y,ser[y][1]||"–",ser[y][2]||"–",ser[y][4]||"–",ser[y][5]||"–",ser[y][0]]),1),f:[`How has the ${div.replace("NCAA ","")} ${g==="m"?"women's":"men's"} ${d.e} changed?`]}}
  /* 2c. "what's a good 400 time for D2?" -> the division's typical levels (a fresh question: no schools carried over) */
  if(divs.length===1&&d.e&&d.school==null&&!d.mark&&!/\b(easiest|hardest|toughest|lowest|highest|slowest|which|list|schools|colleges|programs)\b/.test(q)&&/\b(good|need|average|typical|what time|how fast|how far|how high|standards?|walk.?on|recruit\w*|scholarship)\b/.test(q)){
    CX.schools=[];const div=divs[0],L=SCH.filter(x=>x.d===div&&x[g][d.e]),F=FIELD.has(d.e);if(!L.length)return null;
    const q3=j=>{const V=L.map(x=>x[g][d.e][j]).filter(Boolean).map(m=>parse(m,d.e)).filter(v=>v!=null).sort((a,b)=>a-b);if(!V.length)return null;const at=p=>V[Math.min(V.length-1,Math.floor(p*V.length))];return [at(.25),at(.5),at(.75)]};
    const fm=v=>v==null?"–":F?v.toFixed(2)+"m":fmtT(v),R=[["Target",0],["Recruit",1],["Walk-On",2]].map(([n,j])=>[n,q3(j)]).filter(x=>x[1]);
    const mid=R.find(x=>x[0]==="Recruit")||R[0];
    return {html:`<p>A good ${gl(g)} ${esc(d.e)} for ${esc(div)}: the typical program's Recruit level is <b>${fm(mid[1][1])}</b>${R.find(x=>x[0]==="Walk-On")?`, Walk-On <b>${fm(R.find(x=>x[0]==="Walk-On")[1][1])}</b>`:""}${R.find(x=>x[0]==="Target")?`, Target <b>${fm(R.find(x=>x[0]==="Target")[1][1])}</b>`:""} (medians across ${L.length} programs).</p>`
      +tbl(["Level","Typical program","Middle half of programs"],R.map(([n,v])=>[n,fm(v[1]),F?`${fm(v[0])} to ${fm(v[2])}`:`${fm(v[0])} to ${fm(v[2])}`]),1),f:[`Which ${div.replace("NCAA ","")} schools fit a ${fm(mid[1][1])} ${d.e}?`,`Easiest ${div.replace("NCAA ","")} schools to walk on in the ${d.e}`]}}
  /* 3. "fastest 100m runner at UCSB" -> the team's athletes in that event */
  if(d.school!=null&&d.e&&!d.mark&&/\b(fastest|quickest|best|top|who (is|are|was|were)|leaders?|longest|highest|farthest|team|roster|athletes|runners|sprinters|jumpers|throwers)\b/.test(q)&&!/\b(standards?|walk|recruit|need|progress\w*|peak\w*|develop\w*)\b/.test(q)){
    const s=SCH[d.school],x=d.year?RIDX.find(r=>r.div===s.d&&r.year===d.year&&r.season===season):lastKey(s.d,season);if(!x)return null;await load(x.key,true);const D=CACHE[x.key];
    const want=new Set(tkey(s)),tis=new Set(D.teams.map((t,j)=>want.has(tnorm(t))?j:-1).filter(j=>j>=0)),L=listEv(D,g,d.e);
    const rows=L?L.rows.filter(r=>tis.has(r[3])):[];if(!rows.length)return {html:`<p>${esc(s.n)} had no ${gl(g)} ${esc(d.e)} marks on the ${x.year} ${season} ${esc(s.d)} list.</p>`,f:[`${s.t||s.n} ${g==="m"?"women's":"men's"} fastest ${d.e}`]};
    return {html:`<p>${esc(s.t||s.n)}'s ${gl(g)} ${esc(d.e)}, ${x.year} ${season}: <b>${esc(rows[0][1])}</b> leads at <b>${esc(rows[0][4])}</b> (#${rows[0][0]} in ${esc(s.d)}).</p>`+tbl(["Team rank","Athlete","Class","Mark","National rank"],rows.slice(0,12).map((r,i)=>[i+1,r[1],yr(r[2]),r[4]+(r[5]?` (${r[5]})`:""),"#"+r[0]]),3)+`<p><a href="/teams/${tslug(d.school)}">Full ${esc(s.t||s.n)} team results ›</a></p>`,f:[`${s.t||s.n} ${d.e} progression`,`${rows[0][1]} progression`]}}
  /* 4. "how fast to walk on at LSU in the 200" -> that school's levels for the event */
  if(d.school!=null&&d.e&&!d.mark&&/\b(walk|walk-on|walkon|recruit\w*|need|standards?|how fast|what time|how far|how high|scholarship)\b/.test(q)&&!/\b(progress|peak|improv|develop)\w*/.test(q)){
    const s=SCH[d.school],t=s[g][d.e];if(!t)return {html:`<p>${esc(s.n)} has no ${gl(g)} ${esc(d.e)} level on this site.</p>`};
    const p4=isP4(s)&&!s.o,wo=/walk/.test(q);
    return {html:`<p><b>${esc(s.n)}</b> · ${gl(g)} ${esc(d.e)}${s.o?" (official standards ★)":""}: ${wo&&!t[2]?`there's no Walk-On level here${p4?` (${esc(s.c)} is a Power 4 conference)`:""}, so the bar to get in is the Recruit mark, <b>${esc(t[1]||t[0])}</b>.`:wo?`Walk-On <b>${esc(t[2])}</b>.`:`Recruit <b>${esc(t[1]||"–")}</b>, Target <b>${esc(t[0]||"–")}</b>.`}</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],...(p4?[]:[["Walk-On",t[2]||"–"]])],1)+`<p>${ruleText(s)}</p>`,f:[`Which schools fit a ${t[1]||t[0]} ${d.e}?`,`${s.t||s.n} fastest ${d.e}`]}}
  /* 5. an athlete's full name anywhere ("Where did Kanyinsola Ajayi go before Auburn?", "Ajayi best 200m") */
  if(!/\b(compare|vs|versus|against)\b/.test(q)){
    const words=q.split(" ").map(w=>w.replace(/[^a-z']/g,"")).filter(w=>w.length>=3&&!QSTOP.has(w)&&!evKey(w)&&!/^\d/.test(w)&&!CONFS.some(c=>c.toLowerCase()===w)&&!ALIAS.some(([a])=>a===w));
    if(words.length>=2){const r=await resolveAthlete(words.join(" "));if(r&&r.e)return athleteProgress(r.e,d.e,q);if(r&&r.amb&&words.length>=2)return {html:`<p>Which athlete did you mean?</p>`,f:r.amb.map(x=>`${x[0]} ${d.e||""} progression (${tcanon(x[2])}, ${seasonLabel(x[3])})`.replace(/\s+/g," "))}}}
  return null}
let GDEF=false;
async function answer(raw){const a=await answerCore(raw);
  if(GDEF&&a&&a.html&&!/Men's or women's\?/.test(a.html)){a.html=`<p class="gnote">Showing men's. Tap Women's for the women's version.</p>`+a.html;a.f=["Women's",...(a.f||[]).filter(x=>x!=="Women's")].slice(0,4)}
  GDEF=false;return a}
async function answerCore(raw){
  raw=raw.replace(/\s*\(([^()]*?),\s*\d{4} (Outdoor|Indoor)\)\s*$/,"");   /* the "(School, 2026 Outdoor)" label on athlete chips */
  const d=detect(raw), q=d.q;
  {const a=await smartQ(raw,d);if(a)return a}
  {const a=await programQ(raw,d);if(a)return a}
  {const a=await athleteQ(raw,d);if(a)return a}
  if(/\b(jucos?|njcaa|junior colleges?|community colleges?)\b/i.test(raw))return {html:`<p>This site doesn't set Target, Recruit or Walk-On levels for junior colleges: NJCAA competition is national rather than conference-based, so a program's marks can't be predicted reliably.</p><p>What you can do here: open <b>Results</b> and pick <b>NJCAA</b> to see this season's national list for any event, or search a junior college by name for its season bests, roster and TFRRS links.</p>`,f:["What does Walk-On mean?","Only NAIA","Only NCAA D3"]};
  /* 1. replies to a clarifying question */
  const pending=CX.await; CX.await=null;
  if(pending==="g"&&!d.g&&/\b(men|mens|man|boys?|guys?)\b/.test(q))d.g="m";
  if(pending==="mark"&&!d.mark){const m=q.match(/(\d{1,2}:\d{2}(?:\.\d+)?|\d{1,2}'\s?\d{0,2}(?:\.\d+)?"?|\d{1,3}(?:\.\d{1,2})?m?)/);if(m)d.mark=m[0].trim()}
  if((pending==="school"||pending==="school2")&&!d.schools.length){const h=hits(raw);if(h.length){d.school=h[0][1];d.schools=[h[0][1]]}}
  if(pending==="school2"&&d.schools.length&&(CX.schools||[]).length===1)d.schools=[CX.schools[0],d.schools[0]];
  /* 2. intent; a message with only new details is a follow-up to the last question */
  let intent=null;
  {const P=pairs(raw);if(P.length>=2){CX.pairs=P;intent="multi";d.e=P[0].e;d.mark=P[0].mark}}
  const inState=stateOf(q)&&/\b(schools?|colleges?|programs?|teams?|ones)\s+(in|from)\b|\b(in|from) (the state of )?[a-z]/.test(q)&&/\b(in|from)\b/.test(q)&&stateOf(q);
  if(inState){d.school=null;d.schools=[]}                       /* "schools in Texas" is the state, not University of Texas */
  if(inState&&CX.intent&&["fit","superl"].includes(CX.intent)&&/\b(only|just|what about|how about|in)\b/.test(q)&&!RX.count.test(q))intent=CX.intent;
  if(!intent&&inState&&RX.count.test(q))intent="count";
  if(!intent&&inState&&!d.e&&!d.mark)intent="state";
  if(!intent)for(const k of ["define","funnel","convert","count","champ","superl","athlete"])if(RX[k].test(q)){intent=k;break}
  if(!intent&&(d.schools.length>=2||d.confs.length>=2||(RX.cmp.test(q)&&(d.schools.length||d.confs.length))))intent="cmp";
  if(!intent&&RX.rank.test(q)&&d.schools.length<2&&d.school==null)intent="rank";
  if(!intent&&(d.mark&&d.e||RX.fit.test(q)))intent="fit";
  if(!intent&&d.school!=null)intent="school";
  if(!intent&&d.conf)intent="conf";
  if(!intent&&stateOf(q)&&/\b(schools?|colleges?|programs?|teams?)\b/.test(q))intent="state";
  if(!intent&&!pending&&RX.hi.test(q))return {html:"<p>Hey! Ask me about any college's standards, which schools fit your mark, this season's results, national champions, or how two schools compare.</p>",f:["Which D1 schools fit a 10.9 100m?","Oregon vs USC 400m","Who won the 2026 D1 men's 100m?"]};
  if(!intent&&!pending&&RX.thanks.test(q)&&!d.e&&!d.g)return {html:"<p>Anytime. Want to look at another school or event?</p>",f:["Compare two schools","Top marks this season","What the levels mean"]};
  const followup=!intent&&CX.intent&&(d.e||d.g||d.div||d.mark||d.year||d.season||/\b(what about|how about|and|instead|now|only|just)\b/.test(q));
  if(!intent&&(followup||pending))intent=CX.intent;
  /* 3. update memory */
  if(d.mark&&d.e&&!FIELD.has(d.e))d.mark=d.mark.replace(/\s*m$/,"");
  if(d.g)CX.g=d.g; if(d.e){if(CX.e&&CX.e!==d.e&&!d.mark)CX.mark=null;CX.e=d.e} if(d.mark)CX.mark=d.mark;
  if(d.div)CX.div=d.div; if(d.year)CX.year=d.year; if(d.season)CX.season=d.season;
  if(!followup&&!pending){if(!d.div)CX.div=null;if(!d.year)CX.year=null}   /* a new full question starts from all divisions, latest season */
  if(RX.cmp.test(q)&&!d.e&&d.schools.length>=2)CX.e=null;
  CX.lastIntent=intent;
  if(/\b(all divisions|any division|every division)\b/.test(q))CX.div=null;
  if(d.confs.length)CX.conf=d.confs[0]; else if(!followup&&!pending&&intent!=="conf")CX.conf=null;
  const st=stateOf(q); if(st)CX.state=st; else if(!followup&&!pending)CX.state=null;
  if(d.schools.length)CX.schools=d.schools.slice(0,4);
  if(d.schools.length===1&&pending!=="school"){const amb=ambiguousSchools(q);if(amb){CX.intent=intent||"school";return askBack("school","Which one did you mean?",amb.slice(0,4).map(i=>SCH[i].n))}}
  if(intent)CX.intent=intent;
  /* no gender given: men's by default (no stop-and-ask), flagged on every answer until they pick one */
  if(d.g)CX.gdef=false;
  if(!CX.g&&CX.e&&["fit","superl","rank","champ","conf","cmp","school","multi"].includes(intent)){CX.g="m";CX.gdef=true}
  if(CX.gdef&&!d.g&&["fit","superl","rank","champ","conf","cmp","school","multi"].includes(intent))GDEF=true;
  const g=CX.g, e=CX.e;
  const needG=t=>!g?askBack("g",t||"Men's or women's?",gChips):null;
  const needE=t=>!e?askBack("e",t||"Which event?",evChips(g)):null;
  switch(intent){
    case "define": return {html:`<p><b>Walk-On:</b> ${DEF.W}</p><p><b>Recruit:</b> ${DEF.R} Not a guarantee.</p><p><b>Target:</b> ${DEF.T}</p>`,f:["Which schools fit my mark?","What does it take to walk on in the SEC?"]};
    case "funnel": return {html:`<p>Preferred Recruit gets athletes' marks in front of college coaches. Guaranteed genuine interest or a full refund.</p><p>The free recruitment evaluation takes about a minute and shows where you stand.</p>`+QL()};
    case "convert":{const x=needE("Which high school event? (1600m, 3200m, Mile, 300m hurdles or 39-inch 110m hurdles)");if(x)return x;
      if(!CONV[e])return {html:`<p>The ${esc(e)} is the same in high school and college, so there's nothing to convert.</p>`};
      if(!CX.mark)return askBack("mark",`What's the ${esc(e)} mark you want to convert?`);
      const v=parse(CX.mark,e);if(v==null)return askBack("mark",`I couldn't read "${esc(CX.mark)}". Try something like ${esc(ph(e))}.`);
      return {html:`<p>A <b>${esc(CX.mark)}</b> ${esc(e)} converts to:</p><p class="cvl">${convLine(e,g||"m",v)}</p><p>${esc(CONV[e].how)}.</p>`,f:[`Which schools fit a ${CX.mark} ${e}?`]}}
    case "count":{const L=scopeList();const by={};L.forEach(({s})=>by[s.d]=(by[s.d]||0)+1);const off=L.filter(({s})=>s.o).length;
      return {html:`<p><b>${L.length.toLocaleString()}</b> colleges in ${esc(scopeName())}, and <b>${off}</b> of them publish official standards (★).</p>`+tbl(["Division","Colleges"],DIVS.filter(x=>by[x]).map(x=>[x,by[x]])),f:["How many in the SEC?","How many in Texas?"]}}
    case "state":{const L=scopeList();if(!L.length)return {html:`<p>I don't have any colleges listed in ${esc(CX.state)}.</p>`};
      L.sort((a,b)=>DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));
      return {html:`<p>${L.length} colleges in ${esc(CX.state)}${CX.div?` (${esc(CX.div)})`:""}:</p>`+tbl(["College","Division","Conference"],L.slice(0,40).map(({s})=>[s.n+(s.o?" ★":""),s.d,s.c]),9)+(L.length>40?`<p>Showing 40 of ${L.length}. Add a division to narrow it down.</p>`:""),f:[`D1 schools in ${CX.state}`,`D2 schools in ${CX.state}`]}}
    case "multi":{const x=needG();if(x)return x;return multiAnswer(g,CX.pairs||[])}
    case "fit":{let x=needE("Which event is the mark in?");if(x)return x;x=needG();if(x)return x;
      if(!CX.mark)return askBack("mark",`What's your best ${gl(g)} ${esc(e)}? (for example ${esc(ph(e))})`);
      const v=parse(CX.mark,e);if(v==null)return askBack("mark",`I couldn't read "${esc(CX.mark)}" as a ${esc(e)} mark. Try something like ${esc(ph(e))}.`);
      const all=scopeList().map(({s,i})=>({s,i,t:tier(s,g,e,v)})).filter(z=>z.t);
      all.sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));
      const c=k=>all.filter(z=>z.t===k).length, cl=convLine(e,g,v), by={};all.forEach(z=>by[z.s.d]=(by[z.s.d]||0)+1);
      if(!all.length)return {html:(cl?`<p>College equivalent: ${cl}.</p>`:"")+`<p>A ${esc(CX.mark)} ${gl(g)} ${esc(e)} doesn't hit a listed standard in ${esc(scopeName())} yet.</p>`+QL(),f:CX.div?["All divisions"]:["Only NAIA","Only NCAA D3"]};
      const spec={title:`Colleges a ${CX.mark} ${e} fits, by division`,type:"bar",labels:DIVS.filter(z=>by[z]),series:[{name:"Colleges",values:DIVS.filter(z=>by[z]).map(z=>by[z])}],value_format:"number"};
      return {html:(cl?`<p>College equivalent: ${cl}.</p>`:"")+`<p>A <b>${esc(CX.mark)}</b> in the ${gl(g)} ${esc(e)} fits <b>${all.length}</b> colleges (${esc(scopeName())}): ${c("T")} Target, ${c("R")} Recruit, ${c("W")} Walk-On.</p>`+(Object.keys(by).length>1?chartSvg(spec):"")+
        tbl(["College","Division","Level"],all.slice(0,12).map(z=>[z.s.n+(z.s.o?" ★":""),z.s.d,TN[z.t]]),9)+(all.length>12?`<p>Top 12 of ${all.length}. Ask for a division, conference or state to narrow it.</p>`:"")+QL(),
        f:[!CX.div?"Only D1":"All divisions","Only schools in Texas",g==="m"?"What about women?":"What about men?"]}}
    case "school":{const i=(CX.schools||[])[0];if(i==null)return askBack("school","Which school?");const s=SCH[i],gg=g||"m",sd=s[gg];
      if(e&&sd[e]){const t=sd[e];return {html:`<p><b>${esc(s.n)}</b>${s.o?" ★":""} · ${esc(s.d)} · ${esc(s.c)} · ${gl(gg)} ${esc(e)}:</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],["Walk-On",t[2]||"–"]])+`<p>${s.o?"Official standards published by the school.":esc(ruleText(s))}</p>`,f:[gg==="m"?"Women's":"Men's",`Which schools fit my ${e}?`,"Compare with another school"]}}
      if(s.j)return {html:`<p><b>${esc(s.n)}</b> is an NJCAA junior college. This site doesn't set Target, Recruit or Walk-On levels for junior colleges (NJCAA competition is national, not conference-based, so levels can't be predicted reliably). Its page has this season's bests, roster and TFRRS links, and the NJCAA national list is under Results.</p>`,f:["Only NAIA","Only NCAA D3","What does Walk-On mean?"]};
      const ev=EVENTS.filter(z=>sd[z]);if(!ev.length)return {html:`<p>${esc(s.n)} doesn't list ${gl(gg)} standards.</p>`,f:[gg==="m"?"Women's":"Men's"]};
      return {html:`<p><b>${esc(s.n)}</b>${s.o?" ★":""} · ${esc(s.d)} · ${esc(s.c)} · ${gl(gg)}${s.o?" (official standards)":""}:</p>`+tbl(["Event","Target","Recruit","Walk-On"],ev.map(z=>[z,sd[z][0]||"–",sd[z][1]||"–",sd[z][2]||"–"]))+QL(),f:[gg==="m"?"Women's":"Men's","Compare with another school"]}}
    case "cmp":{
      if(d.confs.length>=2||(d.confs.length===1&&!d.schools.length&&CX.conf2)){const cs=d.confs.slice(0,5),ee=e||"100m",gg=g||"m",line=c=>{const s0=SCH.find(s=>s.c===c);return (((CT[(s0||{}).ck]||{})[gg]||{})[ee])||null},L=cs.map(line);
        const spec={title:`${cs.join(" vs ")} · ${gl(gg)} ${ee}`,type:"bar",labels:cs,series:[["Target line",0],["Recruit line",1],["Walk-On line",2]].map(([n,j])=>({name:n,values:L.map(z=>z&&z[j]?parse(z[j][0],ee):null)})).filter(s=>s.values.some(v=>v!=null)),value_format:FIELD.has(ee)?"meters":"time",lower_is_better:!FIELD.has(ee)};
        return {html:(e?"":`<p>Showing the ${gl(gg)} 100m.</p>`)+chartSvg(spec)+tbl(["Conference","Target","Recruit","Walk-On"],cs.map((c,k)=>[c,...[0,1,2].map(j=>L[k]&&L[k][j]?L[k][j][0]:"–")]))+(cs.some(c=>isP4(SCH.find(s=>s.c===c)))?`<p>${P4TXT}</p>`:""),f:["400m instead","Women's","800m instead"]}}
      if((CX.schools||[]).length<2){if((CX.schools||[]).length===1)return askBack("school2",`Compare ${esc(SCH[CX.schools[0]].n)} with which school?`);return askBack("school","Which two schools should I compare?")}
      const ss=CX.schools.slice(0,4).map(i=>SCH[i]),gg=g||"m";
      if(!e){const evs2=EVENTS.filter(z=>ss.some(s=>s[gg][z])).slice(0,12);return {html:`<p>${gl(gg)} Recruit marks side by side (Walk-On where a school has no Recruit level):</p>`+tbl(["Event",...ss.map(s=>s.n+(s.o?" ★":""))],evs2.map(z=>[z,...ss.map(s=>{const t=s[gg][z];return t?(t[1]||t[2]||t[0]||"–"):"–"})])),f:["400m","1600m","Long Jump"]}}
      const spec={title:`${gl(gg)[0].toUpperCase()+gl(gg).slice(1)} ${e} standards`,type:"bar",labels:ss.map(s=>s.n.replace(/ \(.*\)/,"")),series:[["Target",0],["Recruit",1],["Walk-On",2]].map(([n,j])=>({name:n,values:ss.map(s=>{const t=s[gg][e];return t?parse(t[j],e):null})})).filter(z=>z.values.some(v=>v!=null)),value_format:FIELD.has(e)?"meters":"time",lower_is_better:!FIELD.has(e)};
      return {html:chartSvg(spec)+tbl(["School","Target","Recruit","Walk-On"],ss.map(s=>{const t=s[gg][e]||[];return [s.n+(s.o?" ★":""),t[0]||"–",t[1]||"–",t[2]||"–"]})),f:[gg==="m"?"Women's":"Men's","800m instead","Long Jump instead"]}}
    case "conf":{let x=needE(`Which event in the ${esc(CX.conf)}?`);if(x)return x;const gg=g||"m";
      const pool=SCH.filter(s=>s.c===CX.conf&&s[gg][e]);if(!pool.length)return {html:`<p>No ${esc(CX.conf)} school lists ${gl(gg)} ${esc(e)} standards.</p>`};
      const k=d.tier?{T:0,R:1,W:2}[d.tier]:2,val=s=>parse(s[gg][e][k],e),rows=pool.slice().sort((a,b)=>{const va=val(a),vb=val(b);if(va==null)return 1;if(vb==null)return -1;return FIELD.has(e)?va-vb:vb-va});
      return {html:`<p>${esc(CX.conf)} ${gl(gg)} ${esc(e)} standards, most reachable ${TN[["T","R","W"][k]]} first:</p>`+tbl(["School","Target","Recruit","Walk-On"],rows.map(s=>[s.n+(s.o?" ★":""),s[gg][e][0]||"–",s[gg][e][1]||"–",s[gg][e][2]||"–"]))+QL(),f:[gg==="m"?"Women's":"Men's","Another event",`Compare ${CX.conf} with another conference`]}}
    case "superl":{let x=needE();if(x)return x;x=needG();if(x)return x;
      const tierK=d.tier||(/walk/.test(q)?"W":/recruit/.test(q)?"R":/target/.test(q)?"T":"W"),j={T:0,R:1,W:2}[tierK],hard=/\b(hardest|toughest|most competitive|highest)\b/.test(q);
      const L=scopeList().map(({s})=>({s,v:s[g][e]?parse(s[g][e][j],e):null})).filter(z=>z.v!=null);
      const easyFirst=(a,b)=>FIELD.has(e)?a.v-b.v:b.v-a.v; L.sort((a,b)=>hard?-easyFirst(a,b):easyFirst(a,b));
      if(!L.length)return {html:`<p>No ${TN[tierK]} marks for the ${gl(g)} ${esc(e)} in ${esc(scopeName())}.</p>`};
      const top=L.slice(0,10),spec={title:`${hard?"Toughest":"Most reachable"} ${TN[tierK]} marks · ${gl(g)} ${e} · ${scopeName()}`,type:"bar",labels:top.map(z=>z.s.n.replace(/ \(.*\)/,"")),series:[{name:TN[tierK],values:top.map(z=>z.v)}],value_format:FIELD.has(e)?"meters":"time",lower_is_better:!FIELD.has(e)};
      return {html:chartSvg(spec)+tbl(["College","Division",TN[tierK]],top.map(z=>[z.s.n+(z.s.o?" ★":""),z.s.d,fmtv(e,z.v)]),2)+`<p>${hard?"Toughest":"Most reachable"} ${TN[tierK]} marks in ${esc(scopeName())}.</p>`,f:[hard?"Easiest instead":"Hardest instead","Only D1","Recruit level"]}}
    case "rank": case "champ":{let x=needE();if(x)return x;x=needG();if(x)return x;
      const div=CX.div||"NCAA D1",yy=CX.year||"2026",se=CX.season||"outdoor",r=RIDX.find(z=>z.year===yy&&z.season===se&&z.div===div);
      if(!r)return {html:`<p>I don't have ${esc(yy)} ${esc(se)} ${esc(div)} results.</p>`,f:["2026 outdoor","2025 outdoor"]};
      await load(r.key,true);const D=CACHE[r.key];if(!D||D.err)return {html:"<p>Those results aren't available right now.</p>"};
      const L=intent==="champ"?(D.lists.find(l=>l.champ)||null):(CX.conf?D.lists.find(l=>l.label.toLowerCase()===CX.conf.toLowerCase())||D.lists.find(l=>l.label.toLowerCase().includes(CX.conf.toLowerCase())):D.lists.find(l=>l.nat)||D.lists[0]);
      if(!L)return {html:`<p>${intent==="champ"?`There are no ${esc(div)} championship results for ${esc(yy)} ${esc(se)} on TFRRS`:"I couldn't find that list"}.</p>`};
      const E=L.g[g]||{},want=TF[e]||e,ek=Object.keys(E).find(k=>k===want)||Object.keys(E).find(k=>evLabel(k)===e);
      if(!ek)return {html:`<p>No ${gl(g)} ${esc(e)} on the ${esc(L.nat?div+" national":L.label)} ${esc(yy)} ${esc(se)} list.</p>`,f:evChips(g).slice(0,4)};
      const rows=E[ek].slice(0,intent==="champ"?8:10),hiv=/m$/.test(rows[0][4])||/thlon/i.test(ek);
      const head=intent==="champ"?`<p><b>${esc(rows[0][1]||D.teams[rows[0][3]])}</b> (${esc(D.teams[rows[0][3]])}) won the ${esc(yy)} ${esc(div)} ${esc(se)} ${gl(g)} ${esc(e)} in <b>${esc(rows[0][4])}</b>${rows[0][5]?` (wind ${esc(rows[0][5])})`:""}.</p>`:"";
      const spec={title:`${intent==="champ"?"Final":"Top 10"} · ${gl(g)} ${e} · ${L.nat?div+" national list":L.label} · ${yy} ${se}`,type:"bar",labels:rows.map(z=>z[1]||D.teams[z[3]]),series:[{name:e,values:rows.map(z=>mval(z[4]))}],value_format:hiv?"meters":"time",lower_is_better:!hiv};
      return {html:head+chartSvg(spec)+tbl(["#","Athlete","Team","Mark"],rows.map((z,k)=>[k+1,z[1]||D.teams[z[3]],D.teams[z[3]],z[4]+(z[5]?` (${z[5]})`:"")]),3),
        f:[g==="m"?"Women's":"Men's",yy==="2026"?"2025":"2026",intent==="champ"?"Top marks all season":"Who won nationals?",div==="NCAA D1"?"NCAA D2":"NCAA D1"]}}
    case "athlete":{loadAth();try{await ATHL}catch(e2){}const A=ATH||{};const name=raw.replace(/who is|athlete|profile|meet history|personal bests? of|bests? of|\?/gi,"").trim().toLowerCase();
      const k=Object.keys(A).find(p=>(A[p].name||"").toLowerCase()===name)||Object.keys(A).find(p=>name.length>3&&(A[p].name||"").toLowerCase().includes(name));
      if(!k)return {html:`<p>I have full meet histories for the top athletes in every D1 event. I couldn't find "${esc(name)}". Try their full name, or ask for an event's top marks.</p>`,f:["Top D1 men's 100m","Top D1 women's 400m"]};
      const a=A[k];return {html:`<p><b>${esc(a.name)}</b> · ${esc(yr(a.year))} · ${esc(a.team)}</p>`+tbl(["Event","College best"],a.bests.map(b=>[evName(b[0]),b[1]+(b[2]?` (wind ${b[2]})`:"")]))+`<p>Recent meets:</p>`+tbl(["Meet","Date","Event","Mark","Place"],a.meets.slice(0,4).flatMap(m=>m.rows.slice(0,3).map(r=>[m.meet,m.date,evName(r[0]),r[1],r[3].replace(/\s*\(P\)/," · Prelim").replace(/\s*\(F\)/," · Final")])))+`<p><a href="https://tf.tfrrs.org/athletes/${esc(k)}" target="_blank" rel="noopener">Full profile on TFRRS ›</a></p>`}}
  }
  /* 4. a name we recognize as an athlete, even without "who is" */
  if(!intent&&q.split(" ").filter(Boolean).length<=4){loadAth();try{await ATHL}catch(e2){}const A=ATH||{};const k=Object.keys(A).find(p=>{const n=(A[p].name||"").toLowerCase();return n&&q.includes(" "+n+" ")});if(k)return answer("who is "+A[k].name)}
  /* 5. an event on its own: ask what they want to know about it */
  if(d.e)return askBack("intent",`What do you want to know about the ${gl(g||"m")} ${esc(d.e)}?`,[`Which schools fit my ${d.e}?`,`Top ${d.e} marks this season`,`Who won the ${d.e} at nationals?`,`Easiest D1 schools to walk on in the ${d.e}`]);
  return {html:"<p>I answer from this site's data. You can ask:</p><ul><li>Which colleges fit your mark (high school marks are converted)</li><li>Any school's standards, or two schools side by side</li><li>A conference's standards, or two conferences compared</li><li>Top marks and national champions for any year back to 2016</li><li>Easiest or toughest schools to walk on, by division, conference or state</li><li>An athlete's bests and meet history</li></ul>",f:["Which schools fit a 52.0 400m?","Who won the 2026 D1 women's 100m?","Easiest D1 schools to walk on in the 800m"]};
}

/* ---------- Recruiting AI, live (Ryan 2026-10-13: "literally a chat gpt trained on the data within this site") ----------
   Uses the artifact `sample` capability (the viewer's own Claude) with page tools that query this site's data and draw charts.
   Falls back to the built-in rule engine (answer()) when sampling is unavailable or declined. */
let SAMPLE=null, LIVE=false, CTL=null;
/* Ryan 2026-10-13: "just make it a chat trained on our data, not a complete AI" -> the built-in data engine answers everything; no outside AI is called. */

const num=(m,e)=>{const v=parse(m,e);return v==null?null:Math.round(v*1000)/1000};
const evKey=e=>{e=String(e||"").trim();const hit=EVENTS.find(x=>x.toLowerCase()===e.toLowerCase());if(hit)return hit;for(const [k,re] of EVP){if(re.test(nq(e)))return k}return null};
const gk=g=>/^(w|f|women|womens|women's|girls?)$/i.test(String(g||"m"))?"w":"m";
const divK=d=>{d=String(d||"").toLowerCase();if(!d)return "";if(/naia/.test(d))return "NAIA";if(/3|iii/.test(d))return "NCAA D3";if(/2|ii/.test(d))return "NCAA D2";if(/1|i/.test(d))return "NCAA D1";return ""};
const confK=c=>{c=String(c||"").toLowerCase().trim();if(!c)return "";return CONFS.find(x=>x.toLowerCase()===c)||CONFS.find(x=>x.toLowerCase().includes(c))||""};
const schoolOut=(s,i)=>({id:i,name:s.n,division:s.d,conference:s.c,state:s.s||"",official:!!s.o});
const tierObj=(t,e)=>t?{target:t[0]||null,recruit:t[1]||null,walk_on:t[2]||null,target_value:num(t[0],e),recruit_value:num(t[1],e),walk_on_value:num(t[2],e)}:null;
function ruleOf(s){const [t,r,w]=RULES[s.d]||[];return s.j?"junior college: season results only, no levels":isP4(s)?`${s.c} 2026 conference marks (Power 4): Target=middle of the 8th-10th best, Recruit=middle of the 15th-25th, no Walk-On`:s.j?"junior college: season results only, no levels":s.o?`official ${s.yr} chart published by the school`:`${s.c} 2026 conference marks: Target=${t}th best${r?`, Recruit=${r}th`:""}, Walk-On=${w}th`}
function stdFor2(s,g,e,v){if(s[g][e])return [e,s[g][e]];for(const x of convert(e,g,v)||[])if(s[g][x.e])return [x.e,s[g][x.e]];return [e,null]}

const CHARTS={};let CHART_N=0;
const TOOLS=[
 {name:"search_schools",description:"Find colleges by name, nickname or abbreviation (USC, Ole Miss, LSU). Returns up to 8 {id,name,division,conference,state,official}. Use the id with school_standards.",
  inputSchema:{type:"object",properties:{query:{type:"string"}},required:["query"]},
  execute:({query})=>{status("Searching colleges");return hits(String(query||"")).map(([s,i])=>schoolOut(s,i))}},
 {name:"school_standards",description:"One college's Target / Recruit / Walk-On marks for every event (or one event), plus how they were set (official chart vs conference-based). Values: seconds for running, meters for jumps/throws.",
  inputSchema:{type:"object",properties:{school_id:{type:"number"},gender:{type:"string",enum:["men","women"]},event:{type:"string"}},required:["school_id","gender"]},
  execute:({school_id,gender,event})=>{const s=SCH[Number(school_id)];if(!s)throw new Error("unknown school_id; call search_schools first");status("Reading "+s.n);
    const g=gk(gender),e=event?evKey(event):null,ev=e?[e]:EVENTS.filter(x=>s[g][x]);const out={};ev.forEach(x=>{if(s[g][x])out[x]=tierObj(s[g][x],x)});
    return {...schoolOut(s,Number(school_id)),how_set:ruleOf(s),events:out,official_columns:s.o&&s.off&&s.off[g]?s.off[g].tiers:undefined}}},
 {name:"colleges_for_mark",description:"Every college where an athlete's mark meets Target, Recruit or Walk-On. Converts high school events (1600m, 3200m, 300m hurdles, 39-inch 110m hurdles) automatically. Optional division/conference/state filters. Returns counts and up to `limit` schools (default 25, max 60), best level first.",
  inputSchema:{type:"object",properties:{event:{type:"string"},mark:{type:"string",description:"as typed, e.g. 4:21.50, 10.85, 22'6\" or 6.86m"},gender:{type:"string",enum:["men","women"]},division:{type:"string"},conference:{type:"string"},state:{type:"string"},limit:{type:"number"}},required:["event","mark","gender"]},
  execute:({event,mark,gender,division,conference,state,limit})=>{const e=evKey(event);if(!e)throw new Error("unknown event");const g=gk(gender),v=parse(String(mark),e);if(v==null)throw new Error("couldn't read that mark for "+e);
    status("Matching your "+e);const d=divK(division),c=confK(conference),st=String(state||"").toUpperCase();
    const all=[];SCH.forEach((s,i)=>{if(d&&s.d!==d||c&&s.c!==c||st&&s.s!==st)return;const t=tier(s,g,e,v);if(t)all.push({s,i,t})});
    all.sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));
    const cnt=k=>all.filter(x=>x.t===k).length,byDiv={};all.forEach(x=>{byDiv[x.s.d]=(byDiv[x.s.d]||0)+1});
    return {event:e,mark:String(mark),converted:(convert(e,g,v)||[]).map(x=>({event:x.e,mark:fmtT(x.v),range:fmtT(x.lo)+" to "+fmtT(x.hi)})),
      total:all.length,target:cnt("T"),recruit:cnt("R"),walk_on:cnt("W"),by_division:byDiv,
      schools:all.slice(0,Math.min(60,Number(limit)||25)).map(x=>{const [ev2,t]=stdFor2(x.s,g,e,v);return {id:x.i,name:x.s.n,division:x.s.d,conference:x.s.c,level:TN[x.t],mark_to_hit:t?t[{T:0,R:1,W:2}[x.t]]:null,compared_event:ev2}})}}},
 {name:"conference_standards",description:"All colleges in one conference with their Target / Recruit / Walk-On marks for an event, plus the conference's 2026 level lines (8th/15th/25th best; Power 4 conferences: middle of 8th-10th and 15th-25th, no Walk-On). Use to compare schools inside a conference.",
  inputSchema:{type:"object",properties:{conference:{type:"string"},gender:{type:"string",enum:["men","women"]},event:{type:"string"}},required:["conference","gender","event"]},
  execute:({conference,gender,event})=>{const c=confK(conference),e=evKey(event),g=gk(gender);if(!c)throw new Error("unknown conference");if(!e)throw new Error("unknown event");status("Reading the "+c);
    const sc=SCH.filter(s=>s.c===c);const ck=(sc[0]||{}).ck,ct=(((CT[ck]||{})[g]||{})[e])||null;
    return {conference:c,division:(sc[0]||{}).d,event:e,conference_marks_2026:ct?{eighth:ct[0]&&ct[0][0],fifteenth:ct[1]&&ct[1][0],twenty_fifth:ct[2]&&ct[2][0]}:null,
      schools:sc.map(s=>({name:s.n,official:!!s.o,...(tierObj(s[g][e],e)||{})}))}}},
 {name:"rankings",description:"TFRRS top marks (performance list) for an event: the national list by default, or a conference by name. Available years/seasons are in the instructions. Returns up to `limit` rows (default 15, max 50): rank, athlete, class, team, mark, numeric value, meet, date.",
  inputSchema:{type:"object",properties:{event:{type:"string",description:"e.g. 100m, 1500m, Long Jump, 400m Hurdles"},gender:{type:"string",enum:["men","women"]},division:{type:"string"},year:{type:"string"},season:{type:"string",enum:["outdoor","indoor"]},conference:{type:"string"},limit:{type:"number"}},required:["event","gender"]},
  execute:async({event,gender,division,year,season,conference,limit})=>{const d=divK(division)||"NCAA D1",y=String(year||"2026"),se=season==="indoor"?"indoor":"outdoor";
    const x=RIDX.find(r=>r.year===y&&r.season===se&&r.div===d);if(!x)throw new Error(`no ${y} ${se} ${d} lists in this preview`);status(`Loading ${y} ${d} results`);
    await load(x.key,true);const D=CACHE[x.key];if(!D||D.err)throw new Error("results unavailable");
    const L=conference?D.lists.find(l=>l.label.toLowerCase().includes(String(conference).toLowerCase())):D.lists.find(l=>l.nat)||D.lists[0];if(!L)throw new Error("no list for that conference");
    const g=gk(gender),want=String(event).toLowerCase().replace(/\s+/g,""),E=L.g[g]||{};
    const ek=Object.keys(E).find(k=>evLabel(k).toLowerCase().replace(/\s+/g,"")===want||k.toLowerCase().replace(/\s+/g,"")===want)||Object.keys(E).find(k=>evLabel(k).toLowerCase().includes(String(event).toLowerCase()));
    if(!ek)throw new Error("event not on this list; events: "+Object.keys(E).map(evLabel).join(", "));
    return {list:L.nat?d+" national":L.label,year:y,season:se,event:evLabel(ek),rows:(E[ek]||[]).slice(0,Math.min(50,Number(limit)||15)).map((r,i)=>({rank:i+1,athlete:r[1]||D.teams[r[3]],class:yr(r[2]),team:D.teams[r[3]],mark:r[4],feet:r[8]||undefined,value:mval(r[4]),meet:D.meets[r[6]],date:r[7]}))}}},
 {name:"athlete",description:"An athlete's college bests and meet-by-meet history (full history for top D1 athletes; others return their 2026 D1 list appearances). Search by name.",
  inputSchema:{type:"object",properties:{name:{type:"string"}},required:["name"]},
  execute:async({name})=>{status("Looking up "+name);loadAth();await ATHL;const q=String(name).toLowerCase();const A=ATH||{};
    const k=Object.keys(A).find(p=>(A[p].name||"").toLowerCase()===q)||Object.keys(A).find(p=>(A[p].name||"").toLowerCase().includes(q));
    if(k){const a=A[k];return {name:a.name,class:yr(a.year),team:a.team,tfrrs:"https://tf.tfrrs.org/athletes/"+k,bests:a.bests,meets:a.meets.slice(0,10)}}
    const x=RIDX.find(r=>r.year==="2026"&&r.season==="outdoor"&&r.div==="NCAA D1");await load(x.key,true);const D=CACHE[x.key],hitsA=[];
    D.lists.forEach(l=>["m","w"].forEach(g=>Object.entries(l.g[g]||{}).forEach(([e,rows])=>rows.forEach((r,i)=>{if((r[1]||"").toLowerCase().includes(q))hitsA.push({athlete:r[1],team:D.teams[r[3]],list:l.nat?"D1 national":l.label,event:evLabel(e),rank:i+1,mark:r[4]})}))));
    if(!hitsA.length)throw new Error("not found on the 2026 D1 outdoor lists");return {appearances:hitsA.slice(0,30)}}},
 {name:"convert_mark",description:"Convert a high school mark to its college equivalent (1600m->1500m, Mile->1500m, 3200m->3000m and 5000m, 300m hurdles->400m hurdles, 39-inch->42-inch 110m hurdles) with a tight range.",
  inputSchema:{type:"object",properties:{event:{type:"string"},mark:{type:"string"},gender:{type:"string",enum:["men","women"]}},required:["event","mark","gender"]},
  execute:({event,mark,gender})=>{const e=evKey(event);const v=parse(String(mark),e);const c=convert(e,gk(gender),v);if(!c)throw new Error("no conversion for "+event);return {from:e,mark:String(mark),how:CONV[e].how,to:c.map(x=>({event:x.e,mark:fmtT(x.v),low:fmtT(x.lo),high:fmtT(x.hi)}))}}},
 {name:"make_chart",description:"Draw a chart in your answer: bar for comparisons, line for trends/progressions. values are numbers (seconds for times, meters for jumps/throws). Call it before writing the text that refers to it.",
  inputSchema:{type:"object",properties:{title:{type:"string"},type:{type:"string",enum:["bar","line"]},labels:{type:"array",items:{type:"string"}},series:{type:"array",items:{type:"object",properties:{name:{type:"string"},values:{type:"array",items:{type:"number"}}},required:["name","values"]}},value_format:{type:"string",enum:["time","meters","number"]},lower_is_better:{type:"boolean"}},required:["title","type","labels","series"]},
  execute:(spec)=>{const id="c"+(++CHART_N);CHARTS[id]=spec;const m=CHAT.msgs[CHAT.msgs.length-1];(m.charts=m.charts||[]).push(id);paintLive(m);return "chart drawn"}}
];

const yearsAvail=()=>[...new Set(RIDX.map(r=>`${r.year} ${r.season} (${RIDX.filter(z=>z.year===r.year&&z.season===r.season).map(z=>z.div).join(", ")})`))].join("; ");
function rulesTurn(){return `You are Track Recruiting AI on Preferred Recruit's college track & field standards website. You talk with high school athletes and their parents.
Answer ANY question about college track standards, results, athletes, schools, conferences and recruiting levels by calling the tools, which read this website's data. Pull, compare and contrast data across schools, divisions, conferences, events and years. Use make_chart whenever a comparison or trend is clearer as a chart.

Data facts:
- ${NSTD} colleges with levels: NCAA D1, NCAA D2, NCAA D3, NAIA. Junior colleges (NJCAA) have pages with season results only, no levels. Levels: Target (the marks that typically earn the strongest scholarship interest, depending on school funding), Recruit (where coaches typically start recruiting conversations and scholarship talks; not a guarantee), Walk-On (minimum mark to earn a roster spot).
- Starred (official) schools use their own published chart (2024 or newer, verified mark for mark). Others: NCAA D1/D2 Target=8th, Recruit=15th, Walk-On=25th best mark in their 2026 conference, except Power 4 (ACC, Big Ten, Big 12, SEC): Target=middle of the 8th-10th best, Recruit=middle of the 15th-25th, and NO Walk-On level (no walk-on mark for these schools, except starred schools whose own published chart has one); NCAA D3/NAIA Target=top 8, Walk-On=40th, no Recruit level (NCAA D3 gives no athletic scholarships).
- High school conversions: 1600m x0.9314 = 1500m; Mile x0.926 = 1500m; 3200m x0.9314 = 3000m, then x1.7186 = 5000m; 300m hurdles x1.41 men / x1.45 women = 400m hurdles; boys 39-inch 110m hurdles +0.5s = 42-inch.
- Results (TFRRS performance lists) available: ${yearsAvail()}.
- Events: ${EVENTS.join(", ")}.

Rules:
- Every number you state must come from a tool result in this conversation. Never guess or invent marks, schools, athletes or statistics. If the data isn't there, say so plainly.
- Never promise a scholarship, offer or admission. Never invent facts about Preferred Recruit.
- When someone shares their own mark, show where it fits and, at the end, mention once that a free recruitment evaluation from Preferred Recruit shows which coaches would be interested: [Get your free recruitment evaluation](${QUIZ}). Don't repeat the link in every answer.
- Write for parents: short, clear, warm, no jargon. Lead with the answer. Short paragraphs, bullets or a small markdown table. No em dashes.`}

function mdToHtml(t){
  const inl=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  const L=String(t).split("\n");let o="",i=0;
  while(i<L.length){const l=L[i];
    if(/^\s*\|.*\|\s*$/.test(l)&&i+1<L.length&&/^\s*\|[\s:|-]+\|\s*$/.test(L[i+1])){const row=x=>x.trim().replace(/^\||\|$/g,"").split("|").map(c=>c.trim());
      const hd=row(l);i+=2;let b="";while(i<L.length&&/^\s*\|.*\|\s*$/.test(L[i])){b+="<tr>"+row(L[i]).map(c=>`<td>${inl(c)}</td>`).join("")+"</tr>";i++}
      o+=`<div class="scroll"><table><thead><tr>${hd.map(c=>`<th>${inl(c)}</th>`).join("")}</tr></thead><tbody>${b}</tbody></table></div>`;continue}
    if(/^\s*[-*] /.test(l)){let b="";while(i<L.length&&/^\s*[-*] /.test(L[i])){b+=`<li>${inl(L[i].replace(/^\s*[-*] /,""))}</li>`;i++}o+=`<ul>${b}</ul>`;continue}
    if(/^\s*\d+\. /.test(l)){let b="";while(i<L.length&&/^\s*\d+\. /.test(L[i])){b+=`<li>${inl(L[i].replace(/^\s*\d+\. /,""))}</li>`;i++}o+=`<ol>${b}</ol>`;continue}
    if(/^#{1,4} /.test(l)){o+=`<h4>${inl(l.replace(/^#+ /,""))}</h4>`;i++;continue}
    if(l.trim())o+=`<p>${inl(l)}</p>`;i++}
  return o}
function chartSvg(sp){
  if(!sp)return "";const fmt=v=>sp.value_format==="time"?fmtT(v):sp.value_format==="meters"?v.toFixed(2)+"m":String(Math.round(v*100)/100);
  const S2=(sp.series||[]).filter(s=>Array.isArray(s.values)),labels=sp.labels||[];if(!S2.length||!labels.length)return "";
  const all=S2.flatMap(s=>s.values).filter(v=>typeof v==="number"&&isFinite(v));if(!all.length)return "";
  const COLORS=["#7A45F0","#16794A","#9A5200","#0A5FB4","#B0306A"];const legend=S2.length>1?`<div class="lg">${S2.map((s,k)=>`<span><i style="background:${COLORS[k%5]}"></i>${esc(s.name)}</span>`).join("")}</div>`:"";
  if(sp.type==="line"){const W=CW(),H=240,P=52,lo=Math.min(...all),hi=Math.max(...all),pad=(hi-lo)*.12||1,a=lo-pad,b=hi+pad;
    const X=i=>P+(labels.length<2?0:i*(W-P-14)/(labels.length-1)),Y=v=>{const t=(v-a)/(b-a);return 12+(sp.lower_is_better?t:1-t)*(H-44)};
    /* round gridlines (2026-10-25 audit: 9.66 / 9.96 / 10.27 read as noise): a 1-2-2.5-5 step, 3 to 5 lines inside the range */
    const step=(()=>{const raw=(b-a)/4,p=Math.pow(10,Math.floor(Math.log10(raw)));return [1,2,2.5,5,10].map(k=>k*p).find(k=>k>=raw)})(),ticks=[];for(let v=Math.ceil(a/step)*step;v<=b+1e-9;v+=step)ticks.push(+v.toFixed(6));
    let g=ticks.map(v=>{return `<line x1="${P}" x2="${W-14}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".12"/><text x="${P-6}" y="${Y(v)+4}" text-anchor="end">${esc(fmt(v))}</text>`}).join("");
    g+=labels.map((l,i)=>`<text x="${X(i)}" y="${H-12}" text-anchor="middle">${esc(String(l).slice(0,12))}</text>`).join("");
    g+=S2.map((s,k)=>{const pts=s.values.map((v,i)=>typeof v==="number"?[X(i),Y(v),i]:null).filter(Boolean);return `<polyline fill="none" stroke="${COLORS[k%5]}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p=>p[0]+","+p[1]).join(" ")}"/>`+pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${COLORS[k%5]}"><title>${esc(labels[p[2]])}: ${esc(fmt(s.values[p[2]]))}</title></circle>`).join("")}).join("");
    return `<figure class="chart"><figcaption>${esc(sp.title)}</figcaption>${legend}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sp.title)}">${g}</svg></figure>`}
  const lo=Math.min(...all),hi=Math.max(...all),W=CW(),LW=W<500?120:170,multi=S2.length>1,rowH=multi?14*S2.length+10:28,H=labels.length*rowH+8;
  const span=(hi-lo)||Math.abs(hi)||1,floor=sp.lower_is_better?hi+span*.25:Math.max(0,lo-span*.25);
  const len=v=>Math.max(6,(sp.lower_is_better?(floor-v):(v-floor))/((sp.lower_is_better?floor-lo:hi-floor)||1)*(W-LW-86));
  const rows=labels.map((l,i)=>`<text x="${LW-8}" y="${i*rowH+rowH/2+6}" text-anchor="end">${esc(String(l).slice(0,24))}</text>`+S2.map((s,k)=>{const v=s.values[i];if(typeof v!=="number")return "";const y=i*rowH+6+(multi?k*14:2);
    return `<rect x="${LW}" y="${y}" width="${len(v)}" height="${multi?11:17}" rx="5" fill="${COLORS[k%5]}"/><text x="${LW+len(v)+6}" y="${y+(multi?10:13)}" class="v">${esc(fmt(v))}</text>`}).join("")).join("");
  return `<figure class="chart"><figcaption>${esc(sp.title)}${sp.lower_is_better?' <small>longer bar = better mark</small>':""}</figcaption>${legend}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sp.title)}">${rows}</svg></figure>`}
function liveBody(m){return (m.charts||[]).map(id=>chartSvg(CHARTS[id])).join("")+(m.md?mdToHtml(m.md):"")+(m.busy?`<p class="stat"><span class="dots"><i></i><i></i><i></i></span>${esc(m.status||"Thinking…")}</p>`:"")+(m.err?`<p class="note">${esc(m.err)}</p>`:"")}
function paintLive(m){const el=$("live");if(el)el.innerHTML=liveBody(m);toBottom()}
function status(t){const m=CHAT.msgs[CHAT.msgs.length-1];if(m&&m.busy){m.status=t+"…";paintLive(m)}}

function ask(){
  const composer=`<div class="composer"><form id="cf" class="box"><label for="ct" class="sr">Message Recruiting AI</label><textarea id="ct" rows="1" placeholder="Ask anything about standards, results, athletes or your marks">${esc(CHAT.draft)}</textarea>
    ${CHAT.busy&&LIVE?`<button type="button" class="send" id="stop" aria-label="Stop"><svg width="14" height="14" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg></button>`:`<button class="send" id="send" aria-label="Send" ${CHAT.draft.trim()&&!CHAT.busy?"":"disabled"}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>`}</form>
    <p class="disc">${LIVE?"Powered by Claude, answering only from this site's standards and TFRRS results.":"Answers come straight from this site's standards and TFRRS results."} Confirm with each school.</p></div>`;
  const sugg=LIVE?[["Compare SEC and Big Ten walk-on marks in the men's 400m","Chart included"],["My daughter runs a 5:05 1600m. Which D2 schools fit?","Conversions + list"],["How did the D1 100m leaders change from 2025 to 2026?","Year over year"],["Who are the top 5 women's long jumpers in NCAA D1?","With a chart"]]:SUGG;
  if(!CHAT.msgs.length) return `<div class="sec chatsec"><p class="lede">Ask anything about college standards, results, athletes or your own marks${LIVE?". It compares data and draws charts.":"."}</p>${composer.replace('class="composer"','class="composer" style="position:static;margin-top:0"')}
    <div class="sugg">${sugg.map(([t,s])=>`<button data-ask="${esc(t)}">${esc(t)}<span>${esc(s)}</span></button>`).join("")}</div></div>`;
  return `<div class="sec chatsec"><div class="stream">${CHAT.msgs.map((m,i)=>m.me?`<div class="msg me"><div class="bub">${esc(m.t)}</div></div>`:
    m.live?`<div class="msg bot"><div class="av">PR</div><div class="body"${i===CHAT.msgs.length-1?' id="live"':""}>${liveBody(m)}</div></div>`:
    `<div class="msg bot"><div class="av">PR</div><div class="body">${m.html||'<span class="dots"><i></i><i></i><i></i></span>'}${m.f&&m.f.length?`<div class="fups">${m.f.map(x=>`<button data-ask="${esc(x)}">${esc(x)}</button>`).join("")}</div>`:""}</div></div>`).join("")}</div>${composer}</div>`;
}
async function send(t){
  t=t.trim(); if(!t||CHAT.busy) return;
  if(ACC.aiLeft()<=0){CHAT.draft="";CHAT.msgs.forEach(m=>m.f=null);CHAT.msgs.push({me:1,t},{html:ACC.wall("ai")});log("chat",{detail:"ai-limit"});render();toBottom();return}
  ACC.aiUse(); CHAT.busy=true; CHAT.draft="";
  CHAT.msgs.forEach(m=>m.f=null);
  if(!LIVE){CHAT.msgs.push({me:1,t},{html:null}); render(); toBottom();
    const [a]=await Promise.all([answer(t),new Promise(r=>setTimeout(r,650))]);
    Object.assign(CHAT.msgs[CHAT.msgs.length-1],a); CHAT.busy=false; render(); toBottom(); const ct=$("ct"); if(ct) ct.focus();}
  else{
    const hist=CHAT.msgs.filter(m=>m.me||m.live&&m.md).slice(-12).map(m=>({role:m.me?"user":"assistant",content:m.me?m.t:m.md}));
    const m={live:1,busy:1,md:"",status:"Thinking…",charts:[]};CHAT.msgs.push({me:1,t},m);render();toBottom();
    CTL=new AbortController();
    try{const r=await SAMPLE([{role:"user",content:rulesTurn()},...hist,{role:"user",content:t}],{cache:false,signal:CTL.signal,tools:TOOLS,
        onText:({text})=>{m.md=text;m.status="Writing…";paintLive(m)}});
      m.md=r.text;if(r.truncated)m.err="Cut short. Try asking for less at a time.";}
    catch(e){m.md=(e&&e.text)||m.md;const c=e&&e.code;
      if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed","tools_unavailable"].includes(c)){LIVE=false;
        const a=await answer(t);Object.assign(m,{live:0,html:a.html,f:a.f});}
      else if(c==="rate_limited")m.err="Too many questions at once. Give it a minute and ask again.";
      else if(c!=="cancelled")m.err="Something went wrong. Try asking again.";}
    m.busy=0;CHAT.busy=false;render();toBottom();const ct=$("ct");if(ct)ct.focus();
  }
  {const d=detect(t);if(d.e){intent(d.e,d.g,d.mark);log("chat",{event:d.e,g:d.g||undefined,mark:d.mark,school:d.school!=null?SCH[d.school].n:undefined,division:d.div})}else if(d.school!=null)log("chat",{school:SCH[d.school].n})}
  if(CHAT.msgs.length>=4) evalIn("Want a real person on your recruiting?",`${EVAL} which college programs would want you${INT.e?` for the ${evSay(INT.e)}`:""}. It takes about a minute.`,1800,INT.e?"chat-event":"chat");
}
document.addEventListener("click",ev=>{if(ev.target.closest("#stop"))CTL?.abort()});

const toBottom=()=>requestAnimationFrame(()=>scrollTo({top:document.body.scrollHeight,behavior:"smooth"}));

/* ---------- Rankings (Ryan 2026-10-30: a tab inside the app like Results and Recruiting AI; header and tabs stay put).
   The Power Rankings pages are pre-built (scripts/seo/rankings.mjs); this view loads one, keeps its .pr block and styles, and
   opens links to other ranking pages in place (/?tab=rankings&rk=<path>, so back/forward and shared links work). ---------- */
const RK={path:"/rankings.html",html:{},busy:{},g:"m"};
const rkOk=p=>/^\/rankings(\.html|\/[a-z0-9-]+\.html)$/.test(p||"");
function rankings(){const p=RK.path,h=RK.html[p];
  if(h!=null)return h;
  if(!RK.busy[p]){RK.busy[p]=true;fetch(p).then(r=>r.ok?r.text():Promise.reject(r.status)).then(t=>{const d=new DOMParser().parseFromString(t,"text/html"),pr=d.querySelector("main .pr"),h1=d.querySelector("main h1"),st=[...d.querySelectorAll("main style")].map(x=>x.outerHTML).join("");
      RK.html[p]=pr?`<div class="rkwrap">${p!=="/rankings.html"?`<p class="rkback"><a href="/rankings.html">‹ All rankings</a></p>`:""}${h1&&p!=="/rankings.html"?`<h2 class="rkh">${h1.innerHTML}</h2>`:""}${st}${pr.outerHTML}</div>`:`<p class="rkload">Rankings could not load. <a href="${p}">Open them here ›</a></p>`;})
    .catch(()=>{RK.html[p]=`<p class="rkload">Rankings could not load. <a href="${p}">Open them here ›</a></p>`}).finally(()=>{RK.busy[p]=false;if(S.tab==="rankings"&&RK.path===p)render()});}
  return `<div class="rkwrap"><p class="rkload">Loading rankings…</p></div>`}

/* ---------- shell ---------- */
let first=true;
function moveInd(){const a=document.querySelector('.switch button[aria-selected="true"]'),ind=$("ind");if(!a)return;
  if(first){ind.style.transition="none"} ind.style.width=a.offsetWidth+"px"; ind.style.transform=`translateX(${a.offsetLeft}px)`;
  if(first){ind.offsetWidth;ind.style.transition="";first=false}}
const LASTX={};
function slide(sel,indId,key){const a=document.querySelector(sel+' [aria-selected="true"]'),ind=$(indId);if(!a||!ind)return;
  const p=LASTX[key];ind.style.transition="none";if(p){ind.style.width=p[0]+"px";ind.style.transform=`translateX(${p[1]}px)`}
  else{ind.style.width=a.offsetWidth+"px";ind.style.transform=`translateX(${a.offsetLeft}px)`}
  ind.offsetWidth;ind.style.transition="";ind.style.width=a.offsetWidth+"px";ind.style.transform=`translateX(${a.offsetLeft}px)`;LASTX[key]=[a.offsetWidth,a.offsetLeft]}
function render(){
  const onSchool=S.school!=null;
  $("hero").hidden=onSchool||(S.tab==="results"&&TM.i!=null);
  {const pl=$("evpill");if(pl)pl.hidden=onSchool||!EV.dismissed||EV.shown&&$("eval").classList.contains("on");}
  document.querySelectorAll(".switch button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===S.tab));
  $("app").className=(S.tab==="results"||S.tab==="rankings")&&!onSchool?"wide":"";
  const ae=document.activeElement,fid=ae&&/^(tq|tq2|q|rq|cmsa|cmsb)$/.test(ae.id)?ae.id:null,fpos=fid?ae.selectionStart:0,fval=fid?ae.value:"";
  $("app").innerHTML=onSchool?school():{standards,rankings,results,ask}[S.tab]();
  if(fid){const n=$(fid);if(n){n.value=fval;n.focus();try{n.setSelectionRange(fpos,fpos)}catch(e){}if(fid==="q")drop();else teamDrop(fid)}}  /* a data load mid-typing keeps the search box and its list */
  if(S.tab==="standards"&&!onSchool) drop();
  if(S.tab==="rankings"&&!onSchool&&RK.g==="w"){const wb=document.querySelector('#app .pr-tabs[data-k="v"] button[data-v="w"]');if(wb&&!wb.classList.contains("on"))wb.click()}   /* "All women" links open the Women tab */
  moveInd(); if(S.tab==="standards"&&!onSchool) watchMore();  R.swap=false; ACC.ensureHead&&ACC.ensureHead();
}
addEventListener("resize",moveInd);
matchMedia("(min-width:761px)").addEventListener("change",()=>{if(S.tab==="results"&&R.cmp&&MULTI())render()});
document.addEventListener("click",ev=>{
  {const ci=ev.target.closest("[data-cinfo]");document.querySelectorAll(".ci.open").forEach(x=>{if(!ci||x!==ci.parentNode){x.classList.remove("open");x.querySelector("button").setAttribute("aria-expanded","false")}});if(ci){const w=ci.parentNode;w.classList.toggle("open");ci.setAttribute("aria-expanded",w.classList.contains("open"));return}}
  if(ev.target.closest("#evx")){evalOut();return}
  {const a=S.tab==="rankings"&&S.school==null&&ev.target.closest('#app a[href^="/rankings"]');
    const hr=a&&a.getAttribute("href").split("#");
    if(a&&!(ev.metaKey||ev.ctrlKey||ev.shiftKey)&&rkOk(hr[0])){ev.preventDefault();RK.path=hr[0];RK.g=hr[1]==="women"?"w":"m";history.pushState({},"","/?tab=rankings"+(RK.path!=="/rankings.html"?"&rk="+encodeURIComponent(RK.path):""));render();const t=$("app").getBoundingClientRect().top+scrollY-80;if(scrollY>t)scrollTo(0,t);return}}
  {const tb=ev.target.closest("#app .pr-tabs button");if(tb){const t=tb.closest(".pr-tabs"),k=t.dataset.k;if(k==="v")RK.g=tb.dataset.v;t.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===tb));
    t.parentNode.querySelectorAll("[data-"+k+"]").forEach(v=>{if(!v.classList.contains("pr-tabs"))v.hidden=v.getAttribute("data-"+k)!==tb.dataset.v});return}}
  const b=ev.target.closest("button,a[data-tpage]");if(!b)return;const d=b.dataset;
  if(d.tab){const home=b.classList.contains("logo");if(d.tab==="rankings"){RK.path="/rankings.html";RK.g="m"}S.tab=d.tab;S.school=null;TM.i=null;TM.ath=null;R.swap=true;
    if(home){S.run=false;S.mark="";S.f=S.div=S.conf=S.st="";try{if(location.pathname!=="/"||location.search)history.pushState({},"","/")}catch(e){}}
    render();if(home)scrollTo({top:0,behavior:"smooth"});return}
  if("back" in d){S.school=null;render();return}
  if(d.school){S.school=+d.school;render();scrollTo({top:0});INT.sch=SCH[S.school].n;saveInt();log("school",{school:SCH[S.school].n,division:SCH[S.school].d,state:ST_NAME[SCH[S.school].s]||SCH[S.school].s});return}
  if(d.grade){S.gr=INT.gr=+d.grade;saveInt();document.querySelectorAll("[data-grade]").forEach(x=>x.setAttribute("aria-pressed",x===b));const gs=b.closest(".gseg");gs&&gs.classList.remove("need");log("grade",{});const h=$("hint");if(h&&/grade/.test(h.textContent))h.textContent="";return}
  if(d.cev!==undefined){S.cev=d.cev==="1";render();return}
  if(d.g){S.g=d.g;render();return}
  if(d.f!==undefined){S.f=d.f;S.n=24;render();return}
  if(d.div!==undefined){S.div=d.div;S.n=24;render();return}
  if("more" in d){if(ACC.member())S.n=9999;render();return}
  if("clear" in d){S.div=S.conf=S.f=S.st="";S.n=24;render();return}
  if(d.rdiv){syncSel();const av=seasonDivs();
    /* Ryan 2026-10-20 bug: taps added divisions to a combined list, so D2 "did nothing". Now a tap shows that division only;
       All shows every division together; the Combine switch lets you pick several. */
    if(d.rdiv==="ALL")R.sel=R.sel.length===av.length?[R.div]:av.slice();
    else if(!R.multi){R.sel=[d.rdiv];R.div=d.rdiv}
    else if(R.sel.length===av.length&&av.length>1)R.sel=[d.rdiv];
    else if(R.sel.includes(d.rdiv)){if(R.sel.length>1)R.sel=R.sel.filter(x=>x!==d.rdiv)}else R.sel=[...R.sel,d.rdiv];
    syncSel();R.list=0;R.conf="";R.team=null;R.ath=null;R.an=100;R.cn=25;R.swap=true;render();return}
  if("rcmp" in d){if(CC.on){CC.on=false;ccSync()}else{CC.on=true;CM.g=R.g;CM.div=R.div;CM.sea=R.season;if(R.ev)CM.e=R.ev;CM.a=CM.b="";CM.conf="";if(R.sel&&R.sel.length>1)CM.t="div";else if(R.conf){CM.t="years";CM.conf=R.conf}}R.swap=true;render();return}
  if(d.lvl){R.lvl=d.lvl==="hs"?"hs":"college";CC.on=false;R.swap=true;render();log("results_event",{detail:"level-"+R.lvl});return}
  if(d.hsg){HS.g=d.hsg;R.swap=true;render();return}
  if(d.hsev!==undefined){HS.ev=d.hsev;R.swap=true;render();return}
  if("cdd" in d){R.cdd=!R.cdd;render();if(R.cdd){const o=document.querySelector(".cddo.on");if(o)o.scrollIntoView({block:"nearest"})}return}
  if(d.rconfv!==undefined){R.cdd=false;R.conf=d.rconfv;R.team=null;R.ath=null;R.swap=true;render();if(d.rconfv)log("results_event",{detail:"conf-list",list:d.rconfv});return}
  if("rconfx" in d){R.conf="";R.team=null;R.ath=null;R.swap=true;render();return}
  if("rconfcmp" in d){CC.on=true;CM.t="years";CM.g=R.g;CM.div=R.div;CM.conf=R.conf||"";CM.sea=R.season;if(R.ev)CM.e=R.ev;CM.a=R.season;CM.b="";CM.open=false;R.swap=true;render();scrollTo({top:0});log("results_event",{detail:"conf-years"});return}
  if(d.cmt){CM.t=d.cmt;CM.a=CM.b="";CM.open=false;R.swap=true;render();log("results_event",{detail:"compare-"+d.cmt});return}
  if(d.cmg){CM.g=d.cmg;R.swap=true;render();return}
  if(d.cmedit){CM.edit=d.cmedit;render();const n=$("cms"+d.cmedit[1]);if(n)n.focus();return}
  if(d.cmpick){const [k,i]=d.cmpick.split("|");CM[k]=+i;CM.edit=null;CM.open=false;R.swap=true;render();log("results_event",{detail:"compare-team",school:SCH[+i].n});return}
  if("rmulti" in d){R.multi=!R.multi;if(!R.multi){syncSel();R.sel=[R.sel.includes(R.div)?R.div:R.sel[0]];R.div=R.sel[0]}R.swap=true;render();return}
  if("cmopen" in d){CM.open=!CM.open;R.swap=true;render();return}
  if(d.ccp){ccPreset(d.ccp);R.swap=true;render();return}
  if(d.ccmode){CC.mode=d.ccmode;R.swap=true;render();log("results_event",{detail:"compare-"+d.ccmode});return}
  if(d.csg){CS.g=d.csg;render();return}
  if(d.csdel!==undefined){CS.ids.splice(+d.csdel,1);render();return}
  if("ccadd" in d){const c=CC.cols[CC.cols.length-1]||{div:R.div,l:"nat",g:R.g,e:R.ev||"100 Meters",t:""};CC.cols.push({...c,g:c.g==="m"?"w":"m"});CC.cols=CC.cols.slice(0,ccMax());ccSync();render();return}
  if(d.ccdel!==undefined){CC.cols.splice(+d.ccdel,1);ccSync();render();return}
  if(d.ccteam){const [dv,t]=d.ccteam.split("|");CC.on=true;CC.cols=[{div:dv,l:"nat",g:R.g,e:"*",t}];ccSync();R.swap=true;render();return}
  if(d.rteam){const [dv,t]=d.rteam.split("|");R.sel=[dv];R.div=dv;R.pend=t;R.q="";R.ath=null;R.list=0;R.conf="";R.swap=true;render();return}
  if("cmore" in d){R.cn=(R.cn||25)+50;render();return}
  if("amore" in d){R.an=(R.an||100)+200;render();return}
  if(d.wind!==undefined){setWind(!WIND);return}
  if(d.pmode||d.psea){if(d.pmode)R.pmode=d.pmode;if(d.psea)R.psea=d.psea;const w=document.querySelector(".pgw");if(w&&PGCS){const t=document.createElement("div");t.innerHTML=progBlock(PGCS);const n=t.querySelector(".pgw");if(n){w.replaceWith(n);return}}render();return}
  if(d.pev){R.pev=d.pev;const w=document.querySelector(".pgw");if(w&&PGCS){const t=document.createElement("div");t.innerHTML=progBlock(PGCS);const n=t.querySelector(".pgw");if(n){w.replaceWith(n);return}}R.swap=false;render();return}
  if(d.gath){const [aid,sk,div]=d.gath.split("|");if(TM.i!=null){TM.i=null;TM.ath=null;history.pushState({},"",`/?tab=results&season=${sk}&div=${encodeURIComponent(div)}&athlete=${aid}`)}R.season=sk;R.div=div;R.sel=[div];R.conf="";R.q="";R.team=null;R.ath=null;R.pendAth=aid;R.swap=true;render();{const x=$("rqd"),qi=$("rq");if(x)x.innerHTML="";if(qi)qi.value=""}scrollTo(0,0);log("athlete",{from:"search-all",season:sk,division:div});return}
  if(d.rath){const [li,g,ev,i]=d.rath.split("|"),D=CACHE[curKey()],r=D&&((D.lists[+li].g[g]||{})[ev]||[])[+i];if(!r)return;
    R.conf="";R.g=g;R.ev=ev;R.q="";R.team=null;R.ath={name:r[1],team:r[3],yr:r[2],path:r[9]||""};R.swap=true;loadAth();render();{const x=$("rqd"),qi=$("rq");if(x)x.innerHTML="";if(qi)qi.value=""}scrollTo(0,0);log("athlete",{athlete:r[1],team:D.teams[r[3]],from:"search"});return}
  if(d.rg){R.g=d.rg;R.team=null;R.ath=null;R.swap=true;render();return}
  if(d.rev){R.ev=d.rev;R.swap=true;render();{const el=evLabel(d.rev);intent(el,R.g);log("results_event",{event:el,g:R.g,division:R.div,state:R.st?ST_NAME[R.st]:undefined})}const a=document.querySelector('.evs [aria-pressed="true"]');if(a)a.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});return}
  if(d.rsea){const y0=R.season.split("-")[0];const y=RIDX.some(r=>r.year===y0&&r.season===d.rsea)?y0:RIDX.filter(r=>r.season===d.rsea).map(r=>r.year).sort().pop();R.season=y+"-"+d.rsea;R.list=0;R.team=null;R.ath=null;R.swap=true;render();return}
  if("rmore" in d){R.n+=200;render();return}
  if(d.ai!==undefined){const D=CACHE[curKey()],E=D.lists[R.list].g[R.g],r=E[d.ae||R.ev][+d.ai];R.ath={name:r[1],team:r[3],yr:r[2],path:r[9]||""};R.swap=true;loadAth();render();log("athlete",{athlete:r[1],team:D.teams[r[3]],event:evLabel(d.ae||R.ev),g:R.g,division:R.div});const c=document.querySelector(".rcard");if(c)scrollTo({top:c.offsetTop-70,behavior:"smooth"});return}
  if("athback" in d){R.ath=null;R.swap=true;render();return}
  if(d.team){if(+d.team>=0){const D=CACHE[curKey()],ti=D&&schOfTeam(D.teams[+d.team],R.div);if(ti>=0){openTeam(ti);return}}R.ath=null;R.team=+d.team<0?null:+d.team;R.swap=true;render();return}
  if(d.tpage!==undefined){if(ev.metaKey||ev.ctrlKey||ev.shiftKey)return;ev.preventDefault();openTeam(+d.tpage);return}
  if("tclose" in d){closeTeam();return}
  if(d.ttab){TM.tab=d.ttab;TM.ath=null;R.swap=true;render();return}
  if(d.tg){TM.g=d.tg;TM.ath=null;TM.open={};R.swap=true;render();return}
  if(d.tev!==undefined){TM.ev=d.tev;R.swap=true;render();return}
  if(d.topen){TM.open[d.topen]=!TM.open[d.topen];render();return}
  if(d.tath!==undefined){TM.ath=+d.tath<0?null:+d.tath;R.swap=true;render();scrollTo(0,document.querySelector(".tpage")?0:0);if(TM.ath!=null)log("team_athlete",{school:SCH[TM.i].n});return}
  if(d.ask){send(d.ask);return}
});
document.addEventListener("input",ev=>{const t=ev.target;
  if(t.id==="q"){S.q=t.value;drop()}
  if(t.id==="tq"||t.id==="tq2"||t.id==="cmsa"||t.id==="cmsb"){teamDrop(t.id);return}
  if(t.id==="mk") S.mark=t.value;
  if(t.id==="rq"){R.q=t.value;const pos=t.selectionStart;render();const n=$("rq");n.focus();n.setSelectionRange(pos,pos)}
  if(t.id==="ct"){CHAT.draft=t.value;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,160)+"px";$("send").disabled=!t.value.trim()||CHAT.busy}});
document.addEventListener("keydown",ev=>{if(ev.target.id==="ct"&&ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();send(ev.target.value)}if(ev.key==="Escape"&&EV.shown&&!EV.dismissed)evalOut()});
document.addEventListener("change",ev=>{const t=ev.target;
  if(t.dataset&&t.dataset.cc){const c=CC.cols[+t.dataset.i];if(c){const k=t.dataset.cc,v=t.value.trim();
    if(k==="s")c.s=v;else if(k==="div"){c.div=v;c.l="nat";c.t="";if(c.s&&!RIDX.some(r=>r.year+"-"+r.season===c.s&&r.div===v))c.s=""}else if(k==="l")c.l=v;else if(k==="g")c.g=v;else if(k==="e")c.e=v;else if(k==="t"){c.t=v;if(!v&&c.e==="*")c.e=R.ev||"100 Meters"}
    ccSync();R.swap=false;render()}return}
  if(t.dataset&&t.dataset.cm){const k=t.dataset.cm;CM[k]=t.value;if(k==="div")CM.conf="";if(k==="da")CM.a="";if(k==="db")CM.b="";if(k==="div"||k==="sea"){if(CM.t!=="div")CM.a=CM.b=""}R.swap=true;render();return}
  if(t.dataset&&"cmmy" in t.dataset){CM.my=t.value.trim();R.swap=true;render();return}
  if(t.dataset&&t.dataset.cmsch){const v=t.value.trim().toLowerCase();let i=SCH.findIndex(x=>!x.j&&(x.n.toLowerCase()===v||(x.t||"").toLowerCase()===v));if(i<0&&v)i=SCH.findIndex(x=>!x.j&&(x.n.toLowerCase().includes(v)||(x.t||"").toLowerCase().includes(v)));if(i>=0){CM[t.dataset.cmsch]=i;R.swap=true;render()}return}
  if(t.id==="cse"){CS.e=t.value;render();return}
  if(t.id==="csadd"){const v=t.value.trim().toLowerCase();if(!v)return;let i=SCH.findIndex(x=>!x.j&&(x.n.toLowerCase()===v||(x.t||"").toLowerCase()===v));if(i<0)i=SCH.findIndex(x=>!x.j&&(x.n.toLowerCase().includes(v)||(x.t||"").toLowerCase().includes(v)));if(i>=0&&!CS.ids.includes(i)&&CS.ids.length<4){CS.ids.push(i);render()}return}
  if(t.id==="ev"){S.e=t.value;S.mark="";S.run=false;render()}
  if(t.id==="gr"){S.gr=INT.gr=+t.value;saveInt();t.classList.remove("ph");log("grade",{});const h=$("hint");if(h&&/grade/.test(h.textContent))h.textContent=""}
  if(t.id==="rs"){R.st=t.value;R.swap=true;render();if(R.st)log("results_state",{state:ST_NAME[R.st]||R.st,division:R.div,event:evLabel(R.ev||""),g:R.g})}
  if(["fd","fc","ft","fs"].includes(t.id)){S[{fd:"div",fc:"conf",ft:"f",fs:"st"}[t.id]]=t.value;S.n=24;render()}
  if(t.id==="ry"){const y=t.value,s=R.season.split("-")[1],f=RIDX.find(r=>r.year===y);R.season=RIDX.some(r=>r.year===y&&r.season===s)?y+"-"+s:f.year+"-"+f.season;R.list=0;R.team=null;R.ath=null;R.swap=true;render()}
  if(t.id==="hsst"){HS.st=t.value;HS.ev="";R.swap=true;render();return}
  if(t.id==="hsy"){HS.y=t.value;R.swap=true;render();return}
  if(t.id==="tsea"){TM.sea=t.value;TM.ath=null;TM.open={};R.swap=true;render();return}
  if(t.id==="rconf"){R.conf=t.value;R.team=null;R.ath=null;R.swap=true;render();if(t.value)log("results_event",{detail:"conf-list",list:t.value})}});
document.addEventListener("submit",ev=>{ev.preventDefault();
  if(ev.target.id==="schk"){const s=SCH[S.school];if(!s)return;SCK.e=$("schke").value;SCK.mark=$("schkm").value;SCK.res=schoolResult(s,S.g);
    const box=ev.target.querySelector(".schkr")||ev.target.appendChild(document.createElement("p"));box.className="schkr "+SCK.res.cls;box.innerHTML=SCK.res.html;
    if(SCK.res.cls==="bad")return;
    intent(SCK.e,S.g,SCK.mark.trim());log("school",{school:s.n,division:s.d,event:SCK.e,mark:SCK.mark.trim(),g:S.g,detail:"check-"+(SCK.res.t?TN[SCK.res.t]:"none")});
    const nm=s.t||s.n,vb=VERB(SCK.e),mk=SCK.mark.trim(),es=evSay(SCK.e),hk=vb==="run"?`You run a ${mk} ${es}?!`:`You ${vb} ${mk} in the ${es}?!`;
    const t=SCK.res.t?`That's ${TN[SCK.res.t]} level at ${nm}. Do their coaches know you exist?`:`Not on ${nm}'s chart yet? That doesn't mean you're not good enough.`;
    const vv=parse(mk,SCK.e),fitN=SCH.filter(x=>tier(x,S.g,SCK.e,vv)).length.toLocaleString(),hit=!!SCK.res.t;
    const ask=hit?`Find out whether ${nm}'s coaches would want your ${mk}.`:`Your ${mk} still fits ${fitN} colleges. Find out which of their coaches would want you.`;
    const bs={none:`Coaches can't recruit an athlete they've never heard of. ${ask}`,some:`A few emails is a start, but it isn't an offer. ${hit?`Find out how to turn that interest into an offer from ${nm}.`:"Find out how to turn that interest into real offers."}`,offers:`Offers give you leverage. ${hit?`Find out whether ${nm} would want your ${mk} before you sign.`:`Find out who else would want your ${mk} before you sign.`}`};
    EV.hook=hk;setTimeout(()=>{EV.shown=false;EV.dismissed=false;EV.force=true;evalIn(t,ask,0,"school-check"+gsfx(),"school-check",bs)},900);return}
  if(ev.target.id==="cf"){send($("ct").value);return}
  if(parse(S.mark,S.e)==null){$("hint").textContent=`Enter a mark like ${ph(S.e)}`;return}
  if(!S.gr){$("hint").textContent="Pick your grade to see your colleges.";const gs=document.querySelector(".gseg");if(gs){gs.classList.remove("need");void gs.offsetWidth;gs.classList.add("need");gs.querySelector("button").focus()}return}
  S.run=true;S.f="";S.div="";S.conf="";S.st="";S.n=24;render();
  /* each search gets its own URL: shareable, back button returns to the form, and analytics counts it as a page view (Ryan 2026-10-15: bounce rate) */
  try{const u=`/?g=${S.g}&e=${encodeURIComponent(S.e)}&m=${encodeURIComponent(S.mark.trim())}`;if(location.pathname+location.search!==u)history.pushState({},"",u)}catch(e){}{const el=document.querySelector(".sum");if(el)scrollTo({top:el.getBoundingClientRect().top+scrollY-74,behavior:"smooth"})}
  const v=parse(S.mark,S.e), n=SCH.filter(s=>tier(s,S.g,S.e,v)).length;
  intent(S.e,S.g,S.mark.trim()); log("search",{g:S.g,event:S.e,mark:S.mark.trim(),n_fits:n});
  armOffer();});

  /* return visit (new session, last search 30+ min ago): remind them of their own mark once, 15 s in, unless they search again */
  try{const first=!sessionStorage.getItem("prSeen");sessionStorage.setItem("prSeen","1");
    if(first&&INT.e&&INT.m&&INT.t&&Date.now()-INT.t>18e5) setTimeout(()=>{if(!S.run)evalIn(`Do coaches know about your ${INT.m} ${evSay(INT.e)} yet?`,`If they don't, they can't recruit you. ${EVAL} who would.`,0,"return"+(+INT.gr>=11?"-11-12":+INT.gr===10?"-10":+INT.gr===9?"-9":""))},15000)}catch(e){}
  /* ---- routing: /schools/<slug> opens that school; keeps the old site's URLs working ---- */
  const SLUG = SCH.map(s => (s.os && s.os[0]) || slugOf(s.n));   // old trackandfieldstandards.com URL first, so Google keeps its rankings
  const ALT = new Map(); SCH.forEach((s, i) => { ALT.set(slugOf(s.n), i); (s.os || []).forEach(x => ALT.set(x, i)); });
  const tag = (sel, make) => document.head.querySelector(sel) || document.head.appendChild(make());
  const meta = (attr, key, val) => tag(`meta[${attr}="${key}"]`, () => { const m = document.createElement("meta"); m.setAttribute(attr, key); return m; }).setAttribute("content", val);
  const setMeta = (title, desc, path, ld) => {
    document.title = title; meta("name", "description", desc);
    meta("property", "og:title", title); meta("property", "og:description", desc); meta("property", "og:type", "website");
    meta("property", "og:url", "https://trackandfieldstandards.com" + path); meta("name", "twitter:card", "summary_large_image");
    meta("name", "twitter:title", title); meta("name", "twitter:description", desc);
    tag('link[rel="canonical"]', () => { const l = document.createElement("link"); l.rel = "canonical"; return l; }).href = "https://trackandfieldstandards.com" + path;
    const s = tag("script#pr-ld", () => { const x = document.createElement("script"); x.id = "pr-ld"; x.type = "application/ld+json"; return x; }); s.textContent = JSON.stringify(ld || {});
  };
  let FIRST_ROUTE = true;
  window.__prMeta = setMeta;
  const route = slug => {
    { const tm = location.pathname.match(/^\/teams\/([^/]+)/); if (tm) { const ts = tm[1].replace(/\.html$/, ""); let i = SCH.findIndex((x, k) => tslug(k) === ts); if (i < 0) { const h = hits(ts.replace(/-/g, " ")); i = h.length ? h[0][1] : -1; }
      if (i >= 0) { if (TM.i !== i) openTeam(i, false); else { tMeta(i); render(); } if (location.pathname !== "/teams/" + tslug(i)) history.replaceState({}, "", "/teams/" + tslug(i)); return; } }
      else if (TM.i != null) { TM.i = null; TM.ath = null; } }
    if (slug) slug = String(slug).replace(/\.html$/, "");   /* pre-built /schools/<slug>.html pages */
    if (slug) { let i = ALT.has(slug) ? ALT.get(slug) : -1; if (i < 0) { const h = hits(slug.replace(/-track-standards$/, "").replace(/-/g, " ")); i = h.length ? h[0][1] : -1; }
      if (i >= 0) { S.school = i; const s = SCH[i], path = "/schools/" + SLUG[i]; INT.sch = s.n; saveInt(); log("school", { school: s.n, division: s.d, state: ST_NAME[s.s] || s.s });
        if (location.pathname !== path) history.replaceState({}, "", path);
        const lw = isP4(s) && !s.o ? "recruit and scholarship-level" : s.c === "Ivy League" ? "walk-on and recruit" : s.d === "NCAA D3" ? "walk-on and target" : s.d === "NAIA" ? "walk-on and scholarship-level" : "walk-on, recruit and scholarship-level";
        const desc = s.j ? `${s.n} (NJCAA) junior college track and field: season bests in every event, roster and TFRRS links, and how junior college recruiting works.` : `${s.n} track and field recruiting standards 2026-27 (${s.d}${s.c !== s.d ? ", " + s.c : ""}): ${lw} marks for every ${(s.ng||[])[0]?((s.ng[0]==="m")?"women's":"men's"):"men's and women's"} event${s.o ? ", from the official team chart" : ""}. Free, updated weekly.`;
        const descPrev = s.j ? `${s.n} is an NJCAA junior college track and field program. Season bests, roster and TFRRS links; junior colleges get results here, not predicted recruiting standards.` : `${s.n} track and field recruiting standards: Target, Recruit and Walk-On marks for ${(s.ng||[])[0]?((s.ng[0]==="m")?"women":"men"):"men and women"} (${s.d}, ${s.c})${s.o ? ", from the school's official published standards" : ""}.`;
        const short = s.n.length <= 32 ? s.n : (s.t || s.n), TT = "Track & Field Recruiting Standards 2026-27",
          common = s.t && !/[().]/.test(s.t) && s.t !== s.n && SCH.filter(x => x.t === s.t).length === 1 ? s.t : null, /* same rule as the pre-built page title */
          T0 = s.j ? `${short} Track & Field (NJCAA): Results & Roster` : `${s.n} ${TT}`.length <= 60 ? `${s.n} ${TT}` : common && `${common} ${TT}`.length <= 60 ? `${common} ${TT}` : `${short} ${TT}`;
        setMeta((T0 + " | Preferred Recruit").length <= 62 ? T0 + " | Preferred Recruit" : T0, desc, path, {"@context": "https://schema.org", "@type": "SportsOrganization", name: s.n + " Track & Field", sport: "Track and Field",
          url: "https://trackandfieldstandards.com" + path, description: desc, memberOf: {"@type": "SportsOrganization", name: s.c}, ...(s.s ? {address: {"@type": "PostalAddress", addressRegion: s.s}} : {}),
          sameAs: [s.ws, s.rs, s.src, s.u].filter(Boolean)});
        render(); scrollTo(0, 0); return; } }
    { /* Ryan 2026-10-16: "if i search a standard and i go back home or refresh the standards are stuck on the screen".
         Refresh = a fresh form (the search params are dropped); back/forward follow the URL; shared links still open the results. */
      const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (FIRST_ROUTE && nav && nav.type === "reload" && location.search) history.replaceState({}, "", location.pathname);
      FIRST_ROUTE = false;
      const q = new URLSearchParams(location.search);   /* shared result links: /?g=m&e=100m&m=10.95 */
      { const gq = +q.get("gr"); if (gq >= 9 && gq <= 12 && INT.gr !== gq) { INT.gr = gq; S.gr = gq; saveInt(); log("grade", {}); } }   /* grade from the SEO-page mark checker */
      if (q.get("m") && q.get("e")) { if (!S.run || S.mark !== q.get("m") || S.e !== q.get("e")) { S.g = q.get("g") === "w" ? "w" : "m"; S.e = q.get("e"); S.mark = q.get("m"); S.run = true; S.tab = "standards"; } }
      else if (S.run) { S.run = false; S.mark = ""; S.f = S.div = S.conf = S.st = ""; }
      if (S.tab === "rankings" && !q.get("rk")) RK.path = "/rankings.html";   /* back from a division page lands on the rankings home */
      if (q.get("tab") === "rankings") { S.tab = "rankings"; RK.path = rkOk(q.get("rk")) ? q.get("rk") : "/rankings.html"; }
      else if (q.get("tab") === "ask" && !(q.get("m") && q.get("e"))) S.tab = "ask";
      else if (q.get("tab") === "results") { S.tab = "results"; if (q.get("div") && DIVINFO[q.get("div")]) R.div = q.get("div"); if (q.get("cmp")) ccFromUrl(q.get("cmp"));
        /* athlete profile links: /?tab=results&season=2026-outdoor&div=NCAA%20D1&athlete=<TFRRS id> (results pages link every name here) */
        if (/^\d+$/.test(q.get("athlete") || "")) { if (seasons().includes(q.get("season"))) R.season = q.get("season"); R.sel = [R.div]; R.conf = ""; R.q = ""; R.team = null; R.ath = null; TM.i = null; CC.on = false; R.pendAth = q.get("athlete"); } } }
    S.school = null; setMeta("College Track & Field Recruiting Standards & Rankings", `Recruiting standards for ${NSTD.toLocaleString()} college track and field programs: walk-on, recruit and scholarship times for NCAA D1, D2, D3 and NAIA, plus results since 2016.`, "/",
      {"@context": "https://schema.org", "@type": "WebSite", name: "Preferred Recruit Track & Field Standards", url: "https://trackandfieldstandards.com/"}); render(); if (S.run) armOffer();
  };
  window.__prStandardsRoute = route;
  window.__prSlug = i => SLUG[i];
  document.addEventListener("click", ev => { const b = ev.target.closest("[data-school]"); if (b) { if (b.tagName === "A") { if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return; ev.preventDefault(); } const i = +b.dataset.school; history.pushState({}, "", "/schools/" + SLUG[i]); setTimeout(() => route(SLUG[i]), 0); }
    if (ev.target.closest("[data-back]") || ev.target.closest("[data-tab]")) { if (location.pathname !== "/") history.pushState({}, "", "/"); } }, true);
  addEventListener("popstate", () => { const m = location.pathname.match(/^\/schools\/([^/]+)/); route(m ? m[1] : null); });   /* /teams/<school> is read from the path inside route() */
  route(opts.slug);
  const fromProfile=()=>{const P=ACC.member()&&ACC.profile();if(!P)return;
    const kid=pickKid(),gr=kid?kid.grade:P.grade;if(/^\d+$/.test(gr||"")){INT.gr=+gr;S.gr=+gr}
    const rs={getting_started:"none",talking:"some",real_interest:"some",offers:"offers"}[P.recruiting_stage];if(rs)INT.rs=rs;
    if(P.gender&&!INT.g)INT.g=P.gender;saveInt()};
  READY.bind();
  ACC.init({divfit:(e,g,v)=>{const o={};SCH.forEach(s=>{if(s.j)return;const t=tier(s,g,e,v);if(!t)return;const d=o[s.d]||(o[s.d]={T:0,R:0,W:0});d[t]++});return o},
    /* the readiness result's link carries the quiz's own answers, not the last search (account tier/class tags kept) */
    quiz:o=>{const u=new URL(quizFor()),keep=(u.searchParams.get("utm_term")||"").split(" ").filter(t=>/^[tc](A\+|[ABCSM])$/.test(t));u.searchParams.set("utm_content","readiness");
      u.searchParams.set("utm_term",[o.e,o.grade?"g"+o.grade:"","readiness-"+o.score,...keep].filter(Boolean).join(" "));
      for(const [k,v] of [["pr_grade",o.grade],["pr_mark",o.m],["pr_status",o.stage]])if(v)u.searchParams.set(k,v);else u.searchParams.delete(k);return u.toString()},schools:(()=>{let L=null;return ()=>L||(L=SCH.filter(x=>!x.j).map(x=>x.n).sort())})(),onOpen:()=>{clearTimeout(EV.t);if($("eval").classList.contains("on"))evalOut()},parse:parseMark,events:g=>HSE(g).filter(e=>evs(g).includes(e)),evName:hsName,ph,nstd:NSTD,fits:(e,g,v)=>SCH.filter(s=>tier(s,g,e,v)).length,fmt:(e,v)=>FIELD.has(e)?v.toFixed(2)+"m":fmtT(v),stats:(e,g,v)=>{const L=[];SCH.forEach((s,i)=>{const t=tier(s,g,e,v);if(t)L.push({s,i,t})});const c=k=>L.filter(x=>x.t===k).length;
    const top=["T","R","W"].map(k=>L.filter(x=>x.t===k&&DIVS.includes(x.s.d)).sort((a,b)=>DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||(b.s.o?1:0)-(a.s.o?1:0)||a.s.n.localeCompare(b.s.n))[0]).filter(Boolean).map(x=>({n:x.s.t||x.s.n,d:x.s.d,lv:TN[x.t],slug:SLUG[x.i]}));
    const nm=nearMiss(g,e,v);return {n:L.length,T:c("T"),R:c("R"),W:c("W"),near:nm.n?{n:nm.n,lv:TN[nm.lvl],gap:nm.gap}:null,top}},intent:INT,sid:SID,log,onChange:()=>{fromProfile();render()}}).then(()=>{fromProfile();render();if(READY.isPage())READY.show()});
}
