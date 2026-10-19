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
const slugOf = n => n.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim() + "-track-standards";
export async function mount(opts = {}) {
  if (window.__prStandardsMounted) { window.__prStandardsRoute && window.__prStandardsRoute(opts.slug); return; }
  window.__prStandardsMounted = true;
  const [DB, RIDX, LIVEIDX] = await Promise.all([fetch("/data/db.json").then(r => r.json()), fetch("/data/rank_index.json").then(r => r.json()),
    fetch(LIVE_BASE + "rank_index.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => [])]);
  for (const x of LIVEIDX) { LIVE_KEYS.add(x.key); if (!RIDX.some(y => y.key === x.key)) RIDX.push(x); }

const EVENTS=["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles", "110m Hurdles (39\")", "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"], CT=DB.ct, RULES=DB.rules;
const SCH=DB.schools.map(x=>{const side=g=>{if(x.em)return (x.em[g]||{});const o=(x.om||{})[g]||{},c=(CT[x.ck]||{})[g]||{},r={};EVENTS.forEach(e=>{if(o[e])r[e]=o[e];else if(c[e])r[e]=c[e].map(v=>v?v[0]:"")});return r};return Object.assign(x,{m:side("m"),w:side("w")})});
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
const BUCKET=[...SID].reduce((a,c)=>a+c.charCodeAt(0),0)%2;
const saveInt=()=>{try{localStorage.setItem("prIntent",JSON.stringify(INT))}catch(e){}};
function intent(e,g,mark){if(!e)return;const grp=GRP(e);INT.e=e;INT.grp=grp;if(g)INT.g=g;if(mark)INT.m=mark;INT.c=INT.c||{};INT.c[grp]=(INT.c[grp]||0)+1;INT.t=Date.now();saveInt()}
const topGrp=()=>{const c=INT.c||{};return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||INT.grp};
window.prLog=(k,x)=>log(k,Object.assign({event:INT.e||undefined,variant:x&&x.placement==="popup"&&EV.v||undefined,trig:x&&x.placement==="popup"&&EV.trig||undefined},x));
/* a signed-in coach (coach portal token on this origin) is verified server-side, so coach views are tagged with their school */
const T0=Date.now();
const scrollPct=()=>{const h=document.documentElement;return Math.min(100,Math.round((scrollY+innerHeight)/Math.max(h.scrollHeight,1)*100))};
function log(kind,x){try{let ct;try{ct=localStorage.getItem("pr_coach")||undefined}catch(e){}const b=Object.assign({sid:SID,kind,coach:ct,secs:Math.round((Date.now()-T0)/1000),scroll_pct:scrollPct(),hour:new Date().getHours(),grade:INT.gr||undefined,path:location.pathname+location.search,mobile:innerWidth<700,utm_source:new URLSearchParams(location.search).get("utm_source")||undefined},x||{});
  if(b.event&&!b.grp)b.grp=GRP(b.event);fetch(TRACK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),keepalive:true}).catch(()=>{})}catch(e){}}
/* the funnel link carries the intent too, so the evaluation and CRM know the event and grade (utm_term = event, pr_grade = grade) */
function quizFor(){try{const u=new URL(QUIZ);if(INT.e)u.searchParams.set("utm_term",INT.e);if(INT.grp)u.searchParams.set("pr_group",INT.grp);if(INT.gr)u.searchParams.set("pr_grade",INT.gr);if(INT.m)u.searchParams.set("pr_mark",INT.m);if(INT.rs)u.searchParams.set("pr_status",INT.rs);return u.toString()}catch(e){return QUIZ}}
const FIELD=new Set(["High Jump","Pole Vault","Long Jump","Triple Jump","Shot Put","Discus","Hammer","Javelin"]);
const SHORT=new Set(["100m","200m","400m","100m Hurdles","110m Hurdles","300m Hurdles","400m Hurdles"]);
const TF={"100m":"100 Meters","200m":"200 Meters","400m":"400 Meters","800m":"800 Meters","1500m":"1500 Meters","5000m":"5000 Meters","10000m":"10,000 Meters","100m Hurdles":"100 Hurdles","110m Hurdles":"110 Hurdles","400m Hurdles":"400 Hurdles","3000m Steeplechase":"3000 Steeplechase","High Jump":"High Jump","Pole Vault":"Pole Vault","Long Jump":"Long Jump","Triple Jump":"Triple Jump","Shot Put":"Shot Put","Discus":"Discus","Hammer":"Hammer","Javelin":"Javelin"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const MAG='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
/* mark reader: same function as scripts/seo/markparse.mjs (keep in sync) */
function parseMark(str,e){
  if(str==null)return null;var s=String(str).toLowerCase().replace(/[’′‘]/g,"'").replace(/[”″“]/g,'"').replace(/\*/g,"").replace(/''/g,'"').replace(/\[/g,"(").replace(/\]/g,")").replace(/\bmet(?:er|re)s?\b/g,"m").trim();if(!s)return null;
  var FR={"High Jump":[1,2.5],"Pole Vault":[1.5,6.3],"Long Jump":[3,9],"Triple Jump":[7,18.5],"Shot Put":[5,23.5],"Discus":[12,72],"Hammer":[12,82],"Javelin":[12,76],"Weight Throw":[8,26]};
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
function tier0(t,e,v){if(meets(e,v,t[0]))return "T";if(meets(e,v,t[1]))return "R";if(t[2]&&meets(e,v,t[2]))return "W";return null}
function tier(s,g,e,v){const t=s[g][e];if(t)return tier0(t,e,v);const c=convert(e,g,v);if(!c)return null;
  for(const x of c){if(s[g][x.e])return tier0(s[g][x.e],x.e,x.v)}return null}
const TN={T:"Target",R:"Recruit",W:"Walk-On"};
/* schools where the mark is just short of the next level (direct standards only); gap formatted for copy */
const fmtGap=(e,d)=>FIELD.has(e)?(()=>{const i=d*39.3701;return i>=12?`${Math.floor(i/12)}'${Math.round(i%12)}"`:`${Math.max(1,Math.round(i))} inch${Math.round(i)>1?"es":""}`})():`${d.toFixed(2)}s`;
function nearMiss(g,e,v){if(v==null)return {n:0};const F=FIELD.has(e),tol=F?0.03:0.02,cnt={W:[],R:[],T:[]};
  for(const s of SCH){const t=s[g]&&s[g][e];if(!t)continue;const cur=tier0(t,e,v),nx=cur===null?2:cur==="W"?1:cur==="R"?0:-1;if(nx<0||!t[nx])continue;
    const th=parse(t[nx],e);if(th==null)continue;const d=F?th-v:v-th;if(d>0&&d<=th*tol)cnt["WRT"[nx]].push(d)}
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
function offerCopy(){const v=parse(S.mark,S.e);if(v==null)return null;
  const all=SCH.filter(s=>tier(s,S.g,S.e,v)),n=all.length,T=all.filter(s=>tier(s,S.g,S.e,v)==="T").length,Rr=all.filter(s=>tier(s,S.g,S.e,v)==="R").length;
  const mk=S.mark.trim(), late=+S.gr>=11, sfx=late?"-11-12":S.gr?"-9-10":"", N=n.toLocaleString();
  if(!n) return {n,v:"nofit"+sfx,t:"Not on the chart yet? You are not the problem.",b:`Coaches recruit the athletes they know about. ${EVAL} which programs fit you today.`};
  const nm=nearMiss(S.g,S.e,v), ls=(()=>{const x=INT.sch&&SCH.find(y=>y.n===INT.sch);return x&&tier(x,S.g,S.e,v)?x:null})();
  const bs={none:`Coaches recruit the athletes they know about. ${EVAL} which of these programs would want you.`,
    some:`Interest is a good start. ${EVAL} how to turn it into offers.`,
    offers:`Offers mean options. ${EVAL} who else would want you before you sign.`};
  if(!BUCKET&&nm.n>=3) return {n,v:"nearmiss"+sfx,bs,t:`You're ${nm.gap} from Recruit level at ${nm.n} programs.`.replace("Recruit level",`${TN[nm.lvl]} level`),b:`${EVAL} which coaches would want you now and where to focus next.`};
  if(!BUCKET&&!T&&!Rr) return {n,v:"walkon"+sfx,bs,t:`You meet the walk-on standard at ${N} programs.`,b:`${EVAL} which coaches could recruit you instead.`};
  if(!BUCKET&&ls) return {n,v:"school"+sfx,bs,t:`Your ${mk} meets ${ls.t||ls.n}'s standard.`,b:`${ls.t||ls.n}'s coaches recruit the athletes they know about. ${EVAL} if they'd want you.`};
  return {n,v:"intent"+sfx,bs,t:`Your ${mk} meets the standard at ${N} programs.`,b:bs.none};
}
let ARM=null;
/* polls the live results list (it is re-rendered after a search, so an observer on one node goes stale) */
function armOffer(){const o=offerCopy();if(!o||EV.shown||EV.dismissed)return;if(ARM)clearInterval(ARM.iv),clearTimeout(ARM.t);ARM={since:0};
  const fire=trig=>{if(!ARM)return;clearInterval(ARM.iv);clearTimeout(ARM.t);ARM=null;evalIn(o.t,o.b,0,o.v,trig,o.bs)};
  if(!o.n){ARM.t=setTimeout(()=>fire("nofit"),3000);return}
  ARM.t=setTimeout(()=>fire("results-timer"),12000);   /* fallback if they never scroll to the list */
  ARM.iv=setInterval(()=>{if(!ARM)return;if(!S.run||S.school!=null){clearInterval(ARM.iv);clearTimeout(ARM.t);ARM=null;return}
    const el=document.querySelector(".mtab"),r=el&&el.getBoundingClientRect(),inView=r&&r.top<innerHeight*0.55&&r.bottom>innerHeight*0.2;
    if(inView){if(!ARM.since)ARM.since=Date.now();else if(Date.now()-ARM.since>=1500)fire("results-seen")}else ARM.since=0},250)}
/* ---------- leaving? one last offer (Duolingo-style churn catch) ----------
   Desktop: the mouse heads for the tab bar. Phones: a fast scroll back up or 45 s idle on the results. Once per visit, never if an
   offer was already shown or dismissed, never in the first 20 s unless they searched. */
const EXIT={idle:null,lastY:scrollY,lastT:Date.now()};
function exitOffer(trig){if(EV.shown||EV.dismissed)return;if(S.school!=null){const s=SCH[S.school];if(!s||s.j)return;const nm=s.t||s.n;EV.force=true;evalIn(`Does ${nm} know your name?`,`Coaches recruit the athletes who reach out. ${EVAL} if ${nm} would want you.`,0,"school-exit",trig,null);return}if(!S.run&&Date.now()-T0<20000)return;
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
function evalIn(title,body,delay,v,trig,bs){
  if(EV.shown||EV.dismissed) return; clearTimeout(EV.t);
  EV.t=setTimeout(()=>{if(EV.shown||EV.dismissed||(S.school!=null&&!EV.force)) return; EV.force=false; EV.v=v||"generic"; EV.trig=trig||"timer"; EV.title=title; EV.body=body; EV.bs=bs||null; openEval(true)},delay||0);
}
/* centre modal (Ryan 2026-10-16, e-commerce benchmarks: centre 6.84% vs bottom-corner 2.88%; multi-step +12%; click-triggered
   54%). Step 1 = one-tap "have coaches reached out?" (skipped once answered on this browser), step 2 = the tailored offer.
   Closing leaves a small pill that reopens it (click-triggered). Shown only after an action (search result seen, exit, pill),
   never on arrival, so it is not an intrusive interstitial for Google. */
const STATUS={none:"Not yet",some:"A few have",offers:"Yes, I have offers"};
const statusLine=k=>({none:"Coaches recruit the athletes they know about.",some:"Interest is a good start.",offers:"Offers mean options."})[k]||"";
/* step 2 copy: once the athlete has answered, their answer + one short line replaces the long body */
const evBody=()=>INT.rs&&EV.bs&&EV.bs[INT.rs]?EV.bs[INT.rs]:(EV.body||`${EVAL} which college programs would want you. It takes about a minute.`);
function eyebrow(){if(S.school!=null){const s=SCH[S.school];return s?`${s.t||s.n} · ${s.d}`:""}
  if(S.run&&S.mark)return `${S.g==="w"?"Girls":"Boys"} ${S.e} · ${S.mark.trim()}${S.gr?` · ${S.gr}th grade`:""}`;
  return "Free recruitment evaluation"}
function openEval(log1){const el=$("eval");
  $("eve").textContent=eyebrow();$("evm").textContent=EV.title||"Talent gets you the offer. Visibility gets you in the room.";
  $("evp").textContent=evBody();$("eva").href=quizFor();
  const ck=S.run||S.school!=null?clock():"";$("evk").textContent=ck;$("evk").hidden=!ck;
  const ask=!INT.rs;$("evq").hidden=!ask;$("evs").hidden=ask;
  el.classList.add("on");el.setAttribute("aria-hidden","false");$("evbg").hidden=false;requestAnimationFrame(()=>$("evbg").classList.add("on"));$("evpill").hidden=true;EV.shown=true;
  if(log1)log("popup_shown",{event:INT.e,placement:"popup",variant:EV.v,trig:EV.trig});
  setTimeout(()=>{try{el.focus({preventScroll:true})}catch(e){}},350)}
function evalOut(){const el=$("eval");el.classList.remove("on");el.setAttribute("aria-hidden","true");$("evbg").classList.remove("on");setTimeout(()=>{if(!$("eval").classList.contains("on"))$("evbg").hidden=true},300);
  EV.dismissed=true;try{sessionStorage.setItem("prEvalDismissed","1")}catch(e){}
  if(S.school==null)$("evpill").hidden=false}
document.addEventListener("click",ev=>{
  const q=ev.target.closest("[data-evq]");if(q){INT.rs=q.dataset.evq;saveInt();log("feedback",{detail:"status-"+q.dataset.evq,event:INT.e});
    $("evp").textContent=evBody();$("eva").href=quizFor();$("evq").hidden=true;$("evs").hidden=false;return}
  if(ev.target.closest("#evlater")){evalOut();return}
  if(ev.target.id==="evbg"){evalOut();return}
  if(ev.target.closest("#evpill")){EV.v=(EV.v||"generic").replace(/^pill-/,"");EV.v="pill-"+EV.v;EV.trig="pill-click";openEval(true)}});
let scrolled=0,lastY=scrollY;
addEventListener("scroll",()=>{scrolled+=Math.abs(scrollY-lastY);lastY=scrollY;
  if(S.tab==="results"&&S.school==null&&scrolled>1400) {const gp=GRP(evLabel(R.ev||""))||topGrp();evalIn("Coaches recruit from lists like this one.",`${EVAL} where your marks fit and which programs would want you.`,0,gp?"results-"+gp:"results")}},{passive:true});

/* ---------- Standards (the current site's flow, rebranded) ---------- */
const DEF={W:"The minimum mark required to earn a spot on the team.",R:"The range where coaches typically start recruiting conversations and scholarship discussions begin.",T:"The marks that typically grant a full-ride scholarship, depending on school funding."};
const levelsInfo=(side)=>`<span class="ci lvi${side?" "+side:""}"><button type="button" class="cib" data-cinfo aria-expanded="false" aria-label="What Target, Recruit and Walk-On mean">i</button><span class="cpop" role="tooltip"><b>What the levels mean</b><span class="lvrow T"><i></i><span><b>Target</b>${DEF.T}</span></span><span class="lvrow R"><i></i><span><b>Recruit</b>${DEF.R} Not a guarantee.</span></span><span class="lvrow W"><i></i><span><b>Walk-On</b>${DEF.W}</span></span></span></span>`;
const levels=()=>`<div class="levels"><h4>What the levels mean</h4><div class="lg3">
  <div class="lvc W"><b>Walk-On</b><p>${DEF.W}</p></div><div class="lvc R"><b>Recruit</b><p>${DEF.R}</p><em>Not a guarantee</em></div><div class="lvc T"><b>Target</b><p>${DEF.T}</p></div></div></div>`;
let CUR=[],IO=null;
function stdFor(s){const g=S.g;if(s[g][S.e])return [S.e,s[g][S.e]];const c=convert(S.e,g,parse(S.mark,S.e))||[];for(const x of c)if(s[g][x.e])return [x.e,s[g][x.e]];return [S.e,null]}
function cards(list,from,to){let o="";for(let k=from;k<Math.min(to,list.length);k++){const x=list[k],[ev,t]=stdFor(x.s),j={T:0,R:1,W:2}[x.t];
  o+=`<button class="mrow" data-school="${x.i}"><span class="mn"><b>${esc(x.s.n)}${star(x.s)}</b><small>${esc(x.s.d)} · ${esc(x.s.c)}</small></span><span class="mdv"><i>${esc(x.s.d.replace("NCAA ",""))}</i></span><span class="mc">${esc(x.s.c)}</span>
    <span class="mk">${t&&t[j]?`${esc(t[j])}${ev!==S.e?`<small>${esc(ev)}</small>`:""}`:"–"}</span><span><span class="pill2 ${x.t}">${TN[x.t]}</span></span></button>`}
  return o}
function watchMore(){if(IO){IO.disconnect();IO=null}const s=$("sent");if(!s||!("IntersectionObserver" in window))return;
  IO=new IntersectionObserver(es=>{if(!es.some(e=>e.isIntersecting))return;const from=S.n;S.n+=24;$("sgrid").insertAdjacentHTML("beforeend",cards(CUR,from,S.n));
    if(S.n>=CUR.length){IO.disconnect();IO=null;s.remove()}},{rootMargin:"600px 0px"});IO.observe(s)}
const cinfo=e=>`<span class="ci"><button type="button" class="cib" data-cinfo aria-expanded="false" aria-label="How we convert the ${esc(e)}">i</button><span class="cpop" role="tooltip"><b>${esc(e)} → ${esc(CONV[e].next?CONV[e].to+" / "+CONV[e].next.to:CONV[e].to)}</b>${esc(CONV[e].how)}<small>College standards use college events, so we convert this high school mark first. Schools that publish their own ${esc(e)} standard are compared on their own number.</small></span></span>`;
function standards(){
  const list=evs(S.g); if(!list.includes(S.e)) S.e=list[0];
  let o=`<div class="sec"><p class="lede">Select your gender, event, and enter your time to find the colleges that match you.</p>
  <form id="mf" class="panel"><div class="row">${seg("g",S.g)}
    <div class="evw"><label class="sr" for="ev">Event</label><select class="in" id="ev">${list.map(e=>`<option value="${esc(e)}" ${e===S.e?"selected":""}>${esc(e)}${CONV[e]?" · converted":""}</option>`).join("")}</select>${CONV[S.e]?cinfo(S.e):""}</div>
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
    o+=`<div class="mhead"><p class="sum">${esc(S.mark)} in the ${S.g==="m"?"men's":"women's"} ${esc(S.e)} fits <b>${all.length}</b> colleges</p>
      <p class="mcount"><span class="lv T">${c("T")} Target</span><span class="lv R">${c("R")} Recruit</span><span class="lv W">${c("W")} Walk-On</span>${levelsInfo("left")}</p>${cl?`<p class="cvl"><b>College equivalent</b> ${cl}${cinfo(S.e)}</p>`:""}${all.length?'<button type="button" class="shr" data-share><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>Share my results</button>':""}${`<div class="hlp" id="hlp"><span>Were these results helpful?</span><button type="button" class="hbtn" data-hlp="up">Yes</button><button type="button" class="hbtn" data-hlp="down">No</button></div>`}</div>
    <section class="mtab" aria-label="Your college matches">
      <div class="mbar"><h3>Your college matches</h3><div class="dds">
        ${dd("fd","All divisions",S.div,DIVS.filter(d=>opts("d",x=>x.s.d).includes(d)))}
        ${dd("fc","All conferences",S.conf,opts("c",x=>x.s.c).sort())}
        ${dd("ft","All tiers",S.f,["T","R","W"].filter(k=>opts("t",x=>x.t).includes(k)),k=>TN[k])}
        ${dd("fs","All states",S.st,opts("s",x=>x.s.s).sort())}
        ${S.div||S.conf||S.f||S.st?'<button class="clr" data-clear>Clear</button>':""}</div></div>
      <div class="mrow mh" aria-hidden="true"><span>School</span><span>Division</span><span>Conference</span><span class="mk">Mark to hit</span><span>Your level ${levelsInfo()}</span></div>
      ${sh.length?`<div id="sgrid">${cards(sh,0,S.n)}</div>${sh.length>S.n?'<div class="sent" id="sent" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>':""}`:'<p class="empty">No colleges match these filters.</p>'}
      <p class="vnote"><span class="star">★</span> Official standards, published by the school and verified by Preferred Recruit. Most other colleges are set from their 2026 conference results; a few without either are marked as estimates.</p>
    </section>`;
  }
  return o+`</div>`;
}
function hits(q){q=q.trim().toLowerCase().replace(/\s+/g," ");if(q.length<2)return [];const ws=q.split(" ");
  return SCH.map((s,i)=>{let b=0;if(s.a.includes(q))b=100;else if(ACR[i]===q)b=92;else if(s.a.some(a=>a.startsWith(q)))b=80;else if(ws.every(w=>TOK[i].some(t=>t.startsWith(w))))b=60;
    return [b?b+(s.o?3:0)+(s.d==="NCAA D1"?2:s.d==="NCAA D2"?1:0):0,i]}).filter(x=>x[0]).sort((a,b)=>b[0]-a[0]||SCH[a[1]].n.localeCompare(SCH[b[1]].n)).slice(0,8).map(x=>[SCH[x[1]],x[1]])}
const star=s=>s.o?'<span class="star" title="Official standards, verified">★</span>':"";
function drop(){const el=$("drop");if(!el)return;const h=hits(S.q.trim().toLowerCase());el.innerHTML=h.length?`<div class="drop">${h.map(([s,i])=>`<button data-school="${i}"><em>${esc(s.n)}${star(s)}</em><span>${s.d} · ${esc(s.c)}</span></button>`).join("")}</div>`:(S.q.trim().length>1?'<div class="drop"><p class="none">No college matches that. Try the full name or a short name like USC.</p></div>':"")}
const disp=(s,g,e,i)=>{const o=(s.om||{})[g]||{};if(o[e])return esc(o[e][i]||"–");const c=(((CT[s.ck]||{})[g]||{})[e]||[])[i];return c?(c[1]?`${esc(c[1])} <small>${esc(c[0])}</small>`:esc(c[0]))+(c[2]?'<sup class="dest" title="Too few athletes in this conference event to set it, so this is the division median">est</sup>':""):"–"};
function ruleText(s){if(s.est)return `These are Preferred Recruit estimates for ${esc(s.n)}. Its conference has no 2026 results list on TFRRS, so they can't be set from conference marks yet.`;const [t,r,w]=RULES[s.d]||[];const c=esc(s.c);
  if(!r) return `${s.d==="NCAA D3"?"NCAA D3 programs don't give athletic scholarships, so every athlete is effectively a walk-on. ":""}Target is a top-${t} mark in the ${c} this season. Walk-On is the ${ord(w)}-best mark (or the last one listed).`;
  return `Target is the ${ord(t)}-best mark in the ${c} this season, Recruit the ${ord(r)}, Walk-On the ${ord(w)}.`}
const slugx=x=>String(x).toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const ST_NAME={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington DC",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",BC:"British Columbia"};
const confUrl=s=>{const dup=SCH.some(x=>x.c===s.c&&x.d!==s.d);return `/conferences/${slugx(s.c)}${dup?"-"+slugx(s.d):""}-track-standards.html`};
const stateUrl=st=>`/states/${slugx(ST_NAME[st]||st)}-college-track-and-field.html`;
/* common questions + related programs (same text the pre-built page and its FAQ structured data carry) */
const FAQ_EV=["100m","200m","400m","800m","1500m","5000m","110m Hurdles","100m Hurdles","Long Jump","High Jump","Shot Put"];
function schoolExtra(s){const lvl="Walk-On",i=SCH.indexOf(s);
  const mk=g=>FAQ_EV.map(e=>{const t=s[g][e];return t&&t[2]?`${e} ${t[2]}`:null}).filter(Boolean).slice(0,6),m=mk("m"),w=mk("w");
  const q=[[`What are the ${s.n} track and field recruiting standards?`,s.j?`${s.n} is an NJCAA junior college program${s.s?` in ${ST_NAME[s.s]||s.s}`:""}. This site doesn't set Target, Recruit or Walk-On levels for junior colleges, because NJCAA competition is national rather than conference-based and a program's marks can't be predicted reliably. Its season bests are above, and the full NJCAA national list is in Results.`:`${s.n} is ${/^[AEIOUN]/.test(s.d)?"an":"a"} ${s.d} program${s.c!==s.d?` in the ${s.c}`:""}. ${s.o?`Its standards come from the school's own published chart${s.yr?` (${s.yr})`:""}.`:s.est?"Its levels are estimates: the school doesn't publish standards and its conference has no outdoor championship results to set them from.":"Its Target, Recruit and Walk-On levels are set from 2026 conference results."} The full table for men and women is above.`]];
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
  return `<form class="schk" id="schk"><b>Where do you stand at ${esc(nm)}?</b><div><label class="sr" for="schke">Event</label><select id="schke" class="in">${list.map(e=>`<option ${e===SCK.e?"selected":""}>${esc(e)}</option>`).join("")}</select><label class="sr" for="schkm">Your mark</label><input id="schkm" class="in" placeholder="Your PR, e.g. ${esc(ph(SCK.e))}" value="${esc(SCK.mark)}" autocomplete="off" inputmode="decimal"><button class="go">Check</button></div>${r?`<p class="schkr ${r.cls}">${r.html}</p>`:""}</form>`}
function schoolResult(s,g){const e=SCK.e,v=parse(SCK.mark,e);if(v==null)return {cls:"bad",html:`Enter a mark like ${esc(ph(e))}.`};
  const direct=s[g][e],cv=!direct&&CONV[e]?convert(e,g,v):null,std=direct||(cv&&s[g][cv[0].e]),ev2=direct?e:cv&&cv[0].e,vv=direct?v:cv&&cv[0].v;
  if(!std)return {cls:"bad",html:"No standard listed for that event here."};
  const t=tier0(std,ev2,vv),F=FIELD.has(ev2),nx=t===null?2:t==="W"?1:t==="R"?0:-1,nm=esc(s.t||s.n);
  let next="";if(nx>=0&&std[nx]){const th=parse(std[nx],ev2);if(th!=null){const d=F?th-vv:vv-th;if(d>0)next=` You're ${fmtGap(ev2,d)} from ${TN["TRW"[nx]]} level.`}}
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
const schoolAbout=(s,vf="")=>`<section class="sabout"><details class="fold"><summary>About ${esc(s.n)}</summary><p class="intro">${esc(s.n)} is ${/^(NCAA|NAIA|NJCAA)/.test(s.d)?"an":"a"} ${esc(s.d)}${s.j?" junior college":""} track and field program${s.c!==s.d?` in the ${esc(s.c)}`:""}${s.s?`, based in ${esc(ST_NAME[s.s]||s.s)}`:""}. ${s.j?"Junior colleges compete nationally rather than in conferences, so this site shows its season results instead of predicted recruiting levels.":`These are the marks it takes to be a Target recruit, a Recruit or a Walk-On for men and women in every event${s.o?", taken from the school's own published standards":""}.`}</p>${vf}${schoolLinks(s)}</details></section>`;
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
      evalIn(`Does ${nm} know your name?`,`Coaches recruit the athletes who reach out. ${EVAL} if ${nm} would want you.`,0,"school-page"+(+S.gr>=11?"-11-12":S.gr?"-9-10":""),"school-scroll",bs)}}else since=0},300)}
function school(){const s=SCH[S.school],g=S.g,src=(CT[s.ck]||{}).src,B=brandOf(s);
  /* simple layout (Ryan 2026-10-16: "make it less cluttered and simple"): band (logo + name as the H1) → checker → table.
     Description, links and the evaluation card move to "About" at the bottom (still on the page for search engines).
     Schools without brand data get the same band in neutral ink with their initials. */
  /* contrast guard (Ryan 2026-10-16: "color contrast so we can see it for every school"): band text must reach WCAG 4.5:1 on the
     school colour; if it doesn't, the band uses the school's darker text-safe shade (ink) with white text */
  const lum=h=>{const c=String(h||"").replace("#","");if(c.length!==6)return 0;const f=x=>{x=parseInt(x,16)/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c.slice(0,2))+.7152*f(c.slice(2,4))+.0722*f(c.slice(4,6))};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  let bb=B&&B.primary,bo=B&&(B.on||"#ffffff");if(B&&cr(bb,bo)<4.5){bb=B.ink||bb;bo=cr(bb,"#ffffff")>=cr(bb,"#0B0B0F")?"#ffffff":"#0B0B0F"}
  const bv=B?`--sb:${bb};--sbi:${B.ink||B.primary};--sbo:${bo}`:"--sb:#1B1A25;--sbi:#4E33DB;--sbo:#fff";
  const ini=(s.t||s.n).replace(/\(.*?\)/g,"").split(/[^A-Za-z&]+/).filter(w=>w&&!/^(of|the|at|and|in|for|university|college)$/i.test(w)).map(w=>w[0]).join("").slice(0,3).toUpperCase()||"PR";
  const mark=B&&B.logo&&!B.hide_logo?`<img src="${esc(B.logo)}" alt="${esc(s.n)} logo" width="72" height="72" loading="eager">`:`<span class="sini" aria-hidden="true">${esc(ini)}</span>`;
  const still=BRQ;BRQ=false;
  let o=`<div class="sec branded simple${still?" still":""}" style="padding-top:0;${bv}"><button class="back" data-back>‹ Back</button>
  <div class="sband">${mark}<div><small>${/\(/.test(s.n)?esc(s.n.replace(/^.*?\((.*?)\).*$/,"$1"))+" · ":""}${esc(s.d)}${s.c!==s.d?" · "+esc(s.c):""}${s.s?" · "+esc(s.s):""}</small><h1 class="sname">${esc(s.n.replace(/\s*\(.*?\)\s*/g," ").trim())} Track &amp; Field${s.j?" (NJCAA)":" Standards"}</h1>${s.o?`<span class="offpill">★ Official standards${s.yr?` · ${esc(s.yr)}`:""}</span>`:""}</div></div>
  ${seg("g",g)}`;   /* school checker removed (Ryan 2026-10-16: "is that even necessary, the kids can clearly see") */
  if(s.j){
    o+=`<div class="verify" style="margin-top:16px"><b>No recruiting levels for junior colleges</b><span>This site doesn't set Target, Recruit or Walk-On levels for NJCAA programs: junior colleges compete nationally rather than in conferences, so there's no reliable way to predict a program's marks. Below are ${esc(s.n)}'s best marks this season; the full national list, by event, is in Results.</span><a href="/?tab=results&div=NJCAA">NJCAA national list ›</a>${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
    setTimeout(()=>teamBest(S.school),0);
    return o+`<div id="tbest"></div>`+schoolExtra(s)+schoolMore(s)+`</div>`}
  const off=s.o&&(s.off||{})[g];
  if(off){
    o+=`<div class="scroll" style="margin-top:16px"><table><thead><tr><th>Event</th>${off.tiers.map(t=>`<th class="num" title="${esc(t)}">${esc(String(t).replace(/^(men's|women's|men|women)\s+/i,"").replace(/\s+standards?$/i,"")||t)}</th>`).join("")}</tr></thead><tbody>${off.rows.map(r=>`<tr><td>${esc(r[0])}</td>${off.tiers.map((_,i)=>`<td class="num">${esc(r[i+1]||"–")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="verify"><b>★ Official standards</b><span>Published by ${esc(s.n)} (${esc(s.yr)}) and checked mark for mark by Preferred Recruit.</span><a href="${esc(s.src)}" target="_blank" rel="noopener">View the official source ›</a>${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
  } else {
    const ev=EVENTS.filter(e=>s[g][e]);
    o+=`<div class="scroll" style="margin-top:16px"><table><thead><tr><th>Event</th><th class="num">Target</th><th class="num">Recruit</th><th class="num">Walk‑On ${levelsInfo()}</th></tr></thead><tbody>
    ${ev.map(e=>`<tr><td>${e}</td><td class="num">${disp(s,g,e,0)}</td><td class="num">${disp(s,g,e,1)}</td><td class="num">${disp(s,g,e,2)}</td></tr>`).join("")||'<tr><td>No marks listed for this team yet.</td></tr>'}</tbody></table></div>
    <div class="verify"><b>How these are set</b><span>${ruleText(s)} ${esc(s.n)} doesn't publish an official chart we could verify.${EVENTS.some(e=>["m","w"].some(g=>((((CT[s.ck]||{})[g]||{})[e])||[]).some(v=>v&&v[2])))?" Levels marked est: the conference has too few athletes in that event to set a level, so it uses the median of the same level across its division.":""} High school 1600m, 3200m, 300m hurdle and 39" hurdle marks are converted to these college events automatically.</span>${src?`<a href="${esc(src)}" target="_blank" rel="noopener">See the ${esc(s.c)} list on TFRRS ›</a>`:""}${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
  }
  setTimeout(()=>teamBest(S.school),0);
  setTimeout(()=>schoolVids(S.school),0);
  setTimeout(()=>armSchoolOffer(S.school),0);
  /* the "how these are set" / official-source box goes to the bottom (Ryan 2026-10-16: "just put it at the bottom") */
  const vm=o.match(/<div class="verify">[\s\S]*?<\/div>/),vf=vm?vm[0]:"";if(vf)o=o.replace(vf,"");
  return o+`<div id="tbest"></div><div id="svid"></div>`+schoolAbout(s,vf)+schoolExtra(s)+schoolMore(s)+brandNote(s,B)+`</div>`}
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
const R={season:"2026-outdoor",div:"NCAA D1",list:0,g:"m",ev:null,q:"",team:null,ath:null,n:9999,swap:true,st:""};
/* team -> state for the Results state filter (Ryan 2026-10-16: "lets have an option to sort results per state"). TFRRS team names are
   matched to the standards database by name, team name or alias; relay squads "(B)" and "St." are normalised first. */
const tnorm=x=>String(x||"").toLowerCase().replace(/\s*\([a-z]\)\s*$/,"").replace(/\bst\.(?=\s|$)/g,"state").replace(/[^a-z0-9&]+/g," ").trim();
const TST=new Map();SCH.forEach(s=>{if(!s.s)return;[s.n,s.t,...(s.a||[])].forEach(a=>{const k=tnorm(a);if(k&&!TST.has(k))TST.set(k,s.s)})});
const teamSt=n=>TST.get(tnorm(n))||TST.get(tnorm(n).replace(/^university of /,""))||"";
const CACHE={},LOADING={};
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
  LOADING[key]=getRank(key).then(d=>{CACHE[key]=d}).catch(()=>{CACHE[key]={err:1,lists:[]}})
    .then(()=>{if((key===curKey()||MULTI()&&key.startsWith(R.season+"-"))&&S.tab==="results"&&S.school==null){R.swap=true;render()} if(!quiet) prefetch()});
  return LOADING[key]}
function prefetch(){const go=()=>RIDX.filter(x=>x.year+"-"+x.season===R.season&&!CACHE[x.key]).forEach(x=>load(x.key,true));(window.requestIdleCallback?requestIdleCallback(go,{timeout:2000}):setTimeout(go,600))}
const yr=y=>({"FR-1":"Freshman","SO-2":"Sophomore","JR-3":"Junior","SR-4":"Senior"}[y]||y||"");
const higher=(e,m)=>/m$/.test(m)||/thlon/i.test(e);
const mval=m=>{m=String(m).replace(/[^0-9:.]/g,"");if(!m)return null;const p=m.split(":").map(Number);return p.length===2?p[0]*60+p[1]:p.length===3?p[0]*3600+p[1]*60+p[2]:+p[0]};
function curve(rows,e){
  const v=rows.map(r=>mval(r[4])).filter(x=>x!=null&&isFinite(x)); if(v.length<5) return "";
  const hi=higher(e,rows[0][4]), lo=Math.min(...v), mx=Math.max(...v), W=600, H=96, pad=6;
  const y=x=>{const t=(x-lo)/((mx-lo)||1);return pad+(hi?1-t:t)*(H-pad*2)};
  const pts=v.map((x,i)=>[i/(v.length-1)*W,y(x)]), d=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const tick=[0,Math.min(9,v.length-1),v.length-1];
  return `<div class="curve"><div class="cl"><span>How the marks drop off from #1 to #${v.length}</span><span>${esc(rows[0][4])} → ${esc(rows[v.length-1][4])}</span></div>
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A45F0" stop-opacity=".28"/><stop offset="1" stop-color="#7A45F0" stop-opacity="0"/></linearGradient></defs>
  <path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#cg)"/><path d="${d}" fill="none" stroke="#7A45F0" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
  ${tick.map(i=>`<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="4" fill="#fff" stroke="#7A45F0" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`).join("")}</svg></div>`;
}
function divTabs(){
  const divs=RIDX.filter(x=>x.year+"-"+x.season===R.season).map(x=>x.div).sort((a,b)=>Object.keys(DIVINFO).indexOf(a)-Object.keys(DIVINFO).indexOf(b));
  syncSel();const allOn=R.sel.length===divs.length&&divs.length>1;
  return `<div class="dsel"><button type="button" class="cmpsw" data-rcmp aria-pressed="${!!R.cmp}" title="Show selected divisions side by side"><span class="sw" aria-hidden="true"></span>Compare</button>
  <div class="divs multi" role="group" aria-label="Divisions (select one or more)"><button type="button" data-rdiv="ALL" aria-pressed="${allOn}"><b>All</b></button>${divs.map(d=>`<button type="button" data-rdiv="${d}" aria-pressed="${R.sel.includes(d)&&!allOn}" aria-label="${d}"><b>${d.replace(/^NCAA /,"")}</b></button>`).join("")}</div></div>`;
}
function hookRow(){const d=R.div;
  const t=d==="D1"?"Looking at D1 marks? See if you actually qualify.":`Could you compete in ${d}? See where you fit.`;
  return `<div class="hook solo"><div><b>${t}</b><span>Get a free recruitment evaluation from Preferred Recruit. It takes about a minute.</span></div><a href="${QUIZ}" target="_blank" rel="noopener">Get my recruitment evaluation</a></div>`}
function skeleton(){return `<div class="grid">${Array.from({length:8},(_,i)=>`<div class="sk"><i style="width:30px;height:30px;border-radius:50%"></i><i style="width:${30+((i*17)%30)}%"></i><i style="width:18%;margin-left:auto"></i></div>`).join("")}</div>`}
let ATH=null,ATHL=null;
function loadAth(){if(ATH||ATHL)return;ATHL=fetch("/data/athletes.json").then(r=>r.json()).then(d=>{ATH=d}).catch(()=>{ATH={}}).then(()=>{if(R.ath)render()})}
const evName=e=>/^\d[\d,]*$/.test(e)?e+"m":e;
function athView(D){
  const a=R.ath, P=ATH&&ATH[a.path]; if(a.path&&!ATH) loadAth();
  const marks=[];D.lists.forEach(l=>{Object.entries(l.g[R.g]||{}).forEach(([e,rows])=>rows.forEach(r=>{if(r[1]===a.name&&r[3]===a.team)marks.push({e,l,r})}))});
  const best={};marks.forEach(m=>{const c=best[m.e];if(!c||(m.l.nat&&!c.l.nat)||(m.l.nat===c.l.nat&&m.r[0]<c.r[0]))best[m.e]=m});
  const init=a.name.split(" ").map(w=>w[0]).slice(0,2).join("");
  const tlink=a.path?`https://tf.tfrrs.org/athletes/${a.path}`:"";
  const pbs=P&&P.bests&&P.bests.length?P.bests.map(([e,m,w])=>[evName(e),m,w]):Object.values(best).map(m=>[evLabel(m.e),m.r[4],m.r[5]]);
  let o=`<div class="rbody${R.swap?" swap":""}"><p style="margin:14px 2px 0"><button class="lnk" data-athback>‹ Back to rankings</button></p>
  <div class="ahead"><div class="avt" aria-hidden="true">${esc(init)}</div><div><h3>${esc(a.name)}</h3><p>${esc([yr(a.yr),D.teams[a.team],DIVINFO[R.div]||R.div].filter(Boolean).join(" · "))}</p></div>${tlink?`<a href="${tlink}" target="_blank" rel="noopener">Full profile on TFRRS ›</a>`:""}</div>
  <div class="ah2">College bests</div><div class="pbs">${pbs.map(([e,m,w])=>`<div><small>${esc(e)}</small><b>${esc(m)}</b>${w?`<span>wind ${esc(w)}</span>`:""}</div>`).join("")}</div>
  <div class="ah2">${esc(seasonLabel(R.season))} rankings</div><div class="grid"><div class="gh agr"><span>Event</span><span class="al">List</span><span>Rank</span><span style="text-align:right">Mark</span></div>
  ${Object.values(best).map(m=>`<div class="gr agr"><span style="font-weight:600">${esc(evLabel(m.e))}</span><span class="al" style="color:var(--pr-mute);font-size:14px">${esc(m.l.nat?(DIVINFO[R.div]||R.div)+" national":m.l.label)}</span><span class="rkb" style="width:auto;padding:0 10px;border-radius:999px">#${esc(m.r[0])}</span><span class="gmk">${esc(m.r[4])}${m.r[8]?`<small>${esc(m.r[8])}</small>`:""}</span></div>`).join("")}</div>
  <div class="ah2">Meet history</div>`;
  if(a.path&&!ATH) o+=skeleton();
  else if(P&&P.meets&&P.meets.length) o+=`<div class="meets">${P.meets.map(m=>`<article class="mt1"><div class="mh"><b>${esc(m.meet)}</b><span>${esc(m.date)}</span></div>${m.rows.map(r=>`<div class="mr"><span>${esc(evName(r[0]))}</span><b>${esc(r[1])}${r[2]?`<small>wind ${esc(r[2])}</small>`:""}</b>${r[3]?`<span class="plc ${/^1st/.test(r[3])?"w1":""}">${esc(r[3].replace(/\s*\(P\)/," · Prelim").replace(/\s*\(F\)/," · Final"))}</span>`:"<span></span>"}</div>`).join("")}</article>`).join("")}</div>`;
  else o+=`<div class="soon">Full meet history for every athlete comes with the live site. This preview includes it for the top 5 in each D1 outdoor event.${tlink?` <a href="${tlink}" target="_blank" rel="noopener">See ${esc(a.name)} on TFRRS ›</a>`:""}</div>`;
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
  const ctl=`<div class="rctl"><label class="sr" for="ry">Year</label><select class="in" id="ry">${years().map(y=>`<option ${y===R.season.split("-")[0]?"selected":""}>${y}</option>`).join("")}</select><div class="seg" role="group" aria-label="Season">${["outdoor","indoor","xc"].filter(x=>x!=="xc"||RIDX.some(r=>r.season==="xc")).map(x=>{const ok=x==="xc"||RIDX.some(r=>r.year===R.season.split("-")[0]&&r.season===x);return `<button data-rsea="${x}" aria-pressed="${R.season.endsWith(x)}" ${ok?"":"disabled"}>${{outdoor:"Outdoor",indoor:"Indoor",xc:"XC"}[x]}</button>`}).join("")}</div>${seg("rg",R.g)}`;
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
      <ol>${p.rows.slice(0,top).map((r,i)=>`<li><span class="rk">${i+1}</span><span class="nm"><b>${esc(r[1]||p.D.teams[r[3]])}</b><small>${esc(p.D.teams[r[3]]||"")}</small></span><span class="mk">${esc(r[4])}</span></li>`).join("")}</ol></section>`).join("")}</div>
    ${per.some(p=>p.rows.length>top)?`<button class="morer" data-cmore>Show more</button>`:""}
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
    <div class="search">${MAG}<label class="sr" for="rq">Find an athlete or team</label><input class="in" id="rq" placeholder="Athlete or team" value="${esc(R.q)}" autocomplete="off"></div></div></div>`;
  const q=R.q.trim().toLowerCase(),rows=all.filter(x=>(!q||(x.name||"").toLowerCase().includes(q)||(x.team||"").toLowerCase().includes(q))&&(!R.st||teamSt(x.team)===R.st));
  const show=R.an||100;
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event">${evNames.map(e=>`<button data-rev="${esc(e)}" aria-pressed="${e===R.ev}">${esc(evLabel(e))}</button>`).join("")}</div></div>
  <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${gname} ${esc(evLabel(R.ev))}, ${esc(nm.toLowerCase()==="every division"?"all divisions":nm)}</h3><span>${esc(seasonLabel(R.season))} · ${R.st?`${rows.length} of ${all.length} marks from ${esc(ST_NAME[R.st]||R.st)} schools`:`${all.length.toLocaleString()} marks from ${per.length} divisions`}</span></div>${curve(all.map(x=>[0,0,0,0,x.mark]),R.ev)}
  <div class="grid"><div class="gh"><span>Rank</span><span>Athlete</span><span>Team</span><span style="text-align:right">Mark</span><span>Meet</span></div>
  ${rows.slice(0,show).map(x=>{const k=all.indexOf(x)+1;return `<div class="gr ${k<=3?"p"+k:""}"><span class="rkb">${k}</span><span class="gnmw"><span class="gnm"><b>${esc(x.name||x.team)}</b></span><small>${esc(yr(x.yr))}${x.path?` · <a class="tf" href="https://tf.tfrrs.org/athletes/${esc(x.path)}" target="_blank" rel="noopener">TFRRS ↗</a>`:""}</small></span><span class="gtm" style="cursor:default">${esc(x.team)}<small class="dvt">${esc(DIVINFO[x.div]||x.div)}</small></span><span class="gmk">${esc(x.mark)}${x.wind?`<small>${esc(x.wind)}</small>`:""}</span><span class="gmt"><b>${esc(x.meet||"")}</b>${esc(x.date||"")}</span></div>`}).join("")||`<div class="gr"><span></span><span class="gnm"><small>No matches.</small></span></div>`}
  </div>${rows.length>show?`<button class="morer" data-amore>Show more</button>`:""}${hookRow()}
  <p class="note">Every division's national and conference lists merged, one best mark per athlete, re-ranked by mark. Source: TFRRS performance lists.</p></div></div>`;
  return o;
}
function results(){
  if(MULTI())return multiResults();
  const key=curKey(), D=key&&CACHE[key]; if(key&&!D) load(key);
  let o=`<div class="sec"><p class="lede">The top marks in college track this season. Pick a level, then an event.</p><div class="rcard">${divTabs()}`;
  const ctl=(L)=>`<div class="rctl"><label class="sr" for="ry">Year</label><select class="in" id="ry">${years().map(y=>`<option ${y===R.season.split("-")[0]?"selected":""}>${y}</option>`).join("")}</select><div class="seg" role="group" aria-label="Season">${["outdoor","indoor","xc"].filter(x=>x!=="xc"||RIDX.some(r=>r.season==="xc")).map(x=>{const ok=x==="xc"||RIDX.some(r=>r.year===R.season.split("-")[0]&&r.season===x);return `<button data-rsea="${x}" aria-pressed="${R.season.endsWith(x)}" ${ok?"":"disabled"}>${{outdoor:"Outdoor",indoor:"Indoor",xc:"XC"}[x]}</button>`}).join("")}</div>${seg("rg",R.g)}
    ${L?`<label class="sr" for="rl">List</label><select class="in" id="rl">${D.lists.map((l,i)=>`<option value="${i}" ${i===R.list?"selected":""}>${l.nat?"National list":esc(l.label)}</option>`).join("")}</select>`:'<span></span>'}
    ${L?(()=>{const sts=[...new Set(D.teams.map(teamSt).filter(Boolean))].sort((a,b)=>(ST_NAME[a]||a).localeCompare(ST_NAME[b]||b));return `<label class="sr" for="rs">State</label><select class="in" id="rs"><option value="">All states</option>${sts.map(x=>`<option value="${x}" ${x===R.st?"selected":""}>${esc(ST_NAME[x]||x)}</option>`).join("")}</select>`})():""}
    <div class="search">${MAG}<label class="sr" for="rq">Find an athlete or team</label><input class="in" id="rq" placeholder="Athlete or team" value="${esc(R.q)}" autocomplete="off"></div></div></div>`;
  if(!D||D.err){o+=ctl(null)+(D&&D.err?`<div class="loading">These results aren't available in the preview.</div>`:skeleton());return o+`</div>`}
  if(R.list>=D.lists.length) R.list=0;
  const L=D.lists[R.list], E=L.g[R.g]||{}, evNames=Object.keys(E); if(!evNames.includes(R.ev)) R.ev=evNames[0];
  o+=ctl(L);
  const listName=L.nat?`${DIVINFO[R.div]||R.div}`:L.label, gname=R.g==="m"?"Men's":"Women's";
  if(R.ath) return o+athView(D);
  if(R.team!=null){
    const tn=D.teams[R.team], rows=[];evNames.forEach(e=>(E[e]||[]).forEach(r=>{if(r[3]===R.team)rows.push([e,r])}));
    return o+`<div class="rbody${R.swap?" swap":""}"><p style="margin:14px 2px 0"><button class="lnk" data-team="-1">‹ All teams</button></p>
    <div class="rhead"><h3>${esc(tn)}</h3><span>${rows.length} top marks · ${esc(listName)} · ${gname}</span></div>
    <div class="grid"><div class="gh"><span>Rank</span><span>Athlete</span><span>Event</span><span style="text-align:right">Mark</span><span>Meet</span></div>
    ${rows.map(([e,r])=>`<div class="gr"><span class="rkb">${esc(r[0])}</span>${r[1]?`<button class="gnm gath" data-ae="${esc(e)}" data-ai="${E[e].indexOf(r)}">`:'<span class="gnm">'}<b>${esc(r[1]||tn)}</b><small>${esc(yr(r[2]))}</small>${r[1]?"</button>":"</span>"}<span class="gtm" style="cursor:default">${esc(evLabel(e))}</span><span class="gmk">${esc(r[4])}${r[8]?`<small>${esc(r[8])}</small>`:""}</span><span class="gmt"><b>${esc(D.meets[r[6]])}</b>${esc(r[7])}</span></div>`).join("")}</div>${hookRow()}</div></div>`;
  }
  const all=E[R.ev]||[], q=R.q.trim().toLowerCase(), rows=all.filter(r=>(!q||r[1].toLowerCase().includes(q)||D.teams[r[3]].toLowerCase().includes(q))&&(!R.st||teamSt(D.teams[r[3]])===R.st));
  const st=(i,lab,cls="")=>{const r=all[i];return r?`<div class="st ${cls}"><small>${lab}</small><b>${esc(r[4])}</b><span>${esc(r[1]||D.teams[r[3]])}${r[1]?" · "+esc(D.teams[r[3]]):""}</span></div>`:""};
  const last=all.length-1;
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event">${evNames.map(e=>`<button data-rev="${esc(e)}" aria-pressed="${e===R.ev}">${esc(evLabel(e))}</button>`).join("")}</div></div>
  <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${gname} ${esc(evLabel(R.ev))}</h3><span>${esc(listName)} · ${esc(seasonLabel(R.season))} · ${R.st?`${rows.length} of ${all.length} marks from ${esc(ST_NAME[R.st]||R.st)} schools (national rank shown)`:`${all.length} marks`}</span></div>
  <div class="stats">${st(0,"#1 · "+(L.nat?R.div:L.label),"lead")}${(R.season.endsWith("xc")?[]:RULES[R.div]||[]).map((k,j)=>k&&all[k-1]?st(k-1,`${ord(k)} · ${["Target","Recruit","Walk-On"][j]} line`):"").join("")}</div>${curve(all,R.ev)}
  <div class="grid"><div class="gh"><span>Rank</span><span>Athlete</span><span>Team</span><span style="text-align:right">Mark</span><span>Meet</span></div>
  ${rows.slice(0,R.n).map((r,i)=>{const k=all.indexOf(r)+1;return `<div class="gr ${k<=3?"p"+k:""}"><span class="rkb">${k}</span><span class="gnmw">${r[1]?`<button class="gnm gath" data-ai="${k-1}"><b>${esc(r[1])}</b></button>`:`<span class="gnm"><b>${esc(D.teams[r[3]])}</b></span>`}<small>${esc(yr(r[2]))}${r[9]?` · <a class="tf" href="https://tf.tfrrs.org/athletes/${esc(r[9])}" target="_blank" rel="noopener">TFRRS ↗</a>`:""}</small></span><button class="gtm" data-team="${r[3]}">${esc(D.teams[r[3]])}</button><span class="gmk">${esc(r[4])}${r[8]?`<small>${esc(r[8])}</small>`:r[5]?`<small>wind ${esc(r[5])}</small>`:""}</span><span class="gmt"><b>${esc(D.meets[r[6]])}</b>${esc(r[7])}</span></div>`}).join("")||`<div class="gr"><span></span><span class="gnm"><small>No matches.</small></span></div>`}
  </div>${hookRow()}
  <p class="note">Source: TFRRS performance lists. Tap a team to see all of its top marks.</p></div></div>`;
  return o;
}
/* ---------- Recruiting AI ---------- */
const CHAT={msgs:[],busy:false,draft:""};
const SUGG=[["Which D2 schools fit a 5:05 women's 1600m?","Your mark, every school"],["Compare Oregon vs USC 400m","Side by side + chart"],["SEC vs Big Ten 800m","Conference compare"],["Top D1 women's long jump 2025","Rankings by year"]];
const EVP=[["110m Hurdles",/110\s*(m|meters?)?\s*(h\b|hurdles?)/],["100m Hurdles",/100\s*(m|meters?)?\s*(h\b|hurdles?)/],["400m Hurdles",/400\s*(m|meters?)?\s*(h\b|ih\b|hurdles?)/],["110m Hurdles (39\")",/39\s*("|in\b|inch)/],["300m Hurdles",/300\s*(m|meters?)?\s*(h\b|ih\b|hurdles?)/],["3000m Steeplechase",/steeple/],["10000m",/(?<![\d:.])10,?000(?!\d)|\b10k\b/],["5000m",/(?<![\d:.])5,?000(?!\d)|\b5k\b/],["3200m",/(?<![\d:.])3,?200(?!\d)|two.?mile/],["3000m",/(?<![\d:.])3,?000(?!\d)|\b3k\b/],["1500m",/(?<![\d:.])1500(?!\d)/],["1600m",/(?<![\d:.])1600(?!\d)/],["Mile",/\bmile\b/],["800m",/(?<![\d:.])800(?!\d)/],["400m",/(?<![\d:.])400(?!\d)/],["200m",/(?<![\d:.])200(?!\d)/],["100m",/(?<![\d:.])100(?!\d)/],["High Jump",/high jump|\bhj\b/],["Pole Vault",/pole vault|\bpv\b/],["Long Jump",/long jump|\blj\b/],["Triple Jump",/triple jump|\btj\b/],["Shot Put",/shot/],["Discus",/discus/],["Hammer",/hammer/],["Javelin",/javelin|\bjav\b/]];
const ALIAS=SCH.map((s,i)=>{const n=s.n.toLowerCase();const a=new Set([...s.a,s.t.toLowerCase(),n,n.replace(/^university of /,""),n.replace(/^the /,""),n.replace(/ university$/,""),n.replace(/ college$/,"")]);return [...a].filter(x=>x.length>=3).map(x=>[x,i])}).flat().sort((a,b)=>b[0].length-a[0].length);
const CONFS=[...new Set(SCH.map(s=>s.c))].filter(c=>c.length>=3).sort((a,b)=>b.length-a.length);
const nq=q=>" "+q.toLowerCase().replace(/[’]/g,"'").replace(/'s\b/g,"").replace(/[^a-z0-9:.'" &-]/g," ").replace(/\s+/g," ")+" ";
function detect(raw){
  const q=nq(raw), out={q};
  out.g=/\b(women|womens|woman|girls?|female|ladies)\b/.test(q)?"w":/\b(men|mens|boys?|male|guys?)\b/.test(q)?"m":null;
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
const quizLine=`<p><a href="${QUIZ}" target="_blank" rel="noopener">Looking to run in college? Get your recruitment evaluation ›</a></p>`;
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
      return {html:chartSvg(spec)+tbl(["School","Target","Recruit","Walk-On"],rows)+`<p>★ = official standards published by the school. Others are set from 2026 conference results or marked as estimates.</p>`+quizLine,f:[`${ss[0].n} vs ${ss[1].n} ${d.e==="100m"?"400m":"100m"}`]};}
    const evs2=EVENTS.filter(e=>ss.some(s=>s[g][e])).slice(0,12);
    return {html:`<p>${gl(g)} Recruit marks side by side (Walk-On where a school has no Recruit level):</p>`+tbl(["Event",...ss.map(s=>s.n.replace(/ \(.*\)/,"")+(s.o?" ★":""))],evs2.map(e=>[e,...ss.map(s=>{const t=s[g][e];return t?(t[1]||t[2]||t[0]||"–"):"–"})]))+`<p>Name an event (like "${ss[0].n} vs ${ss[1].n} 400m") for a chart.</p>`,f:[`${ss[0].n} vs ${ss[1].n} 100m`,`${ss[0].n} vs ${ss[1].n} 1500m`]};
  }
  /* compare conferences */
  if(d.confs.length>=2){
    const e=d.e||"100m",cs=d.confs.slice(0,5),line=c=>{const s0=SCH.find(s=>s.c===c);return (((CT[(s0||{}).ck]||{})[g]||{})[e])||null};
    const L=cs.map(line);if(!L.some(Boolean))return {html:`<p>I don't have ${gl(g)} ${esc(e)} results for those conferences.</p>`};
    const lab=["8th best (Target line)","15th best (Recruit line)","25th best (Walk-On line)"];
    const spec={title:`${cs.join(" vs ")} · ${gl(g)} ${e} · 2026`,type:"bar",labels:cs,series:lab.map((l,j)=>({name:l,values:L.map(x=>x&&x[j]?parse(x[j][0],e):null)})).filter(s=>s.values.some(v=>v!=null)),value_format:FIELD.has(e)?"meters":"time",lower_is_better:!FIELD.has(e)};
    return {html:(d.e?"":`<p>Showing the ${gl(g)} 100m. Add an event to compare another one.</p>`)+chartSvg(spec)+tbl(["Conference","8th","15th","25th"],cs.map((c,k)=>[c,...[0,1,2].map(j=>L[k]&&L[k][j]?L[k][j][0]:"–")]))+`<p>These are the marks it took to finish 8th, 15th and 25th in each conference this season.</p>`,f:[`${cs[0]} vs ${cs[1]} ${e==="400m"?"800m":"400m"}`]};
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
    return {html:`<p>Preferred Recruit gets your marks in front of college coaches. Guaranteed genuine interest or a full refund.</p><p>The free recruitment evaluation takes about a minute and shows if you qualify.</p>`+quizLine};
  if(d.conf&&!d.e&&d.tier){d.e="100m";d.defaulted=1}
  if(d.e&&d.mark){
    const v=parse(d.mark,d.e); if(v==null) return {html:`<p>I couldn't read "${esc(d.mark)}" as a ${esc(d.e)} mark. Try something like ${esc(ph(d.e))}.</p>`};
    let pool=SCH.filter(s=>(!d.div||s.d===d.div)&&(!d.conf||s.c===d.conf)); const hit=pool.map(s=>({s,t:tier(s,g,d.e,v)})).filter(x=>x.t);
    const c=k=>hit.filter(x=>x.t===k).length; hit.sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||a.s.n.localeCompare(b.s.n));
    const scope=[d.div,d.conf].filter(Boolean).join(" · ")||"all divisions";
    if(!hit.length) return {html:`<p>A ${esc(d.mark)} ${gl(g)} ${esc(d.e)} doesn't meet a listed standard in ${esc(scope)} yet.</p>`+quizLine,f:[`Which D3 schools fit a ${d.mark} ${d.e}?`]};
    const cvl=convLine(d.e,g,v);
    return {html:(cvl?`<p>College equivalent: ${cvl}.</p>`:"")+`<p>A <b>${esc(d.mark)}</b> in the ${gl(g)} ${esc(d.e)} fits <b>${hit.length}</b> colleges (${esc(scope)}): ${c("T")} at Target, ${c("R")} at Recruit and ${c("W")} at Walk-On.</p>`+tbl(["College","Division","Level"],hit.slice(0,10).map(x=>[x.s.n,x.s.d,TN[x.t]]),9)+(hit.length>10?`<p>Showing 10 of ${hit.length}. The full list is on College Track Standards.</p>`:"")+quizLine,
      f:d.div?[]:[`Only D1 schools for a ${d.mark} ${d.e}`]};
  }
  if(d.school!=null){
    const s=SCH[d.school], st=s[g];
    if(d.e&&st[d.e]) {const t=st[d.e];return {html:`<p><b>${esc(s.n)}</b> ${gl(g)} ${esc(d.e)}${s.o?" (official standards)":s.est?" (estimate)":" (based on 2026 conference results)"}:</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],["Walk-On",t[2]||"–"]])+quizLine}}
    const ev=EVENTS.filter(e=>st[e]); if(!ev.length) return {html:`<p>${esc(s.n)} doesn't list ${gl(g)} standards yet.</p>`};
    return {html:`<p><b>${esc(s.n)}</b> · ${s.d} · ${esc(s.c)} · ${gl(g)} standards${s.o?" (official)":" (based on conference results)"}:</p>`+tbl(["Event","Target","Recruit","Walk-On"],ev.map(e=>[e,st[e][0]||"–",st[e][1]||"–",st[e][2]||"–"]))+quizLine,
      f:[`Show ${s.n} ${g==="m"?"women's":"men's"} standards`]};
  }
  if(d.e&&/\b(fastest|best|top|leader|leaders|rank|ranked|ranking|rankings|who|longest|highest|farthest)\b/.test(q)){
    const div=d.div||"NCAA D1", x=RIDX.find(r=>r.year==="2026"&&r.season==="outdoor"&&r.div===div); if(!x) return {html:"<p>I don't have that list yet.</p>"};
    if(!CACHE[x.key]) CACHE[x.key]=await fetch("rank/"+x.key+".json").then(r=>r.json()).catch(()=>({lists:[]}));
    const D=CACHE[x.key], L=D.lists.find(l=>l.nat)||D.lists[0], rows=L&&L.g[g]&&L.g[g][TF[d.e]];
    if(!rows||!rows.length) return {html:`<p>No ${esc(div)} ${gl(g)} ${esc(d.e)} list in the 2026 outdoor data.</p>`};
    return {html:`<p>Top ${gl(g)} ${esc(d.e)} marks in ${esc(div)}, 2026 outdoor (TFRRS):</p>`+tbl(["#","Athlete","Team","Mark"],rows.slice(0,10).map(r=>[r[0],r[1],D.teams[r[3]],r[4]]),3)+`<p>Full list on College Track Results.</p>`,f:[`Top ${g==="m"?"women's":"men's"} ${d.e} in ${div}`]};
  }
  if(d.e&&d.conf){
    const pool=SCH.filter(s=>s.c===d.conf&&s[g][d.e]); if(!pool.length) return {html:`<p>No ${esc(d.conf)} school lists ${gl(g)} ${esc(d.e)} standards yet.</p>`};
    const k=d.tier?{T:0,R:1,W:2}[d.tier]:null, rows=pool.map(s=>[s.n,...s[g][d.e]]).sort((a,b)=>(parse(a[k==null?2:k+1],d.e)??99)-(parse(b[k==null?2:k+1],d.e)??99));
    const ck0=(SCH.find(s=>s.c===d.conf)||{}).ck, cl0=(((CT[ck0]||{})[g]||{})[d.e]||[])[0], cl=cl0?[null,null,cl0[0]]:null;
    return {f:d.defaulted?[`${d.conf} 400m walk-on`,`${d.conf} women's 100m walk-on`]:null,html:`<p>${d.defaulted?"Here's the 100m to start. ":""}${esc(d.conf)} ${gl(g)} ${esc(d.e)} standards${d.tier?`, sorted by ${TN[d.tier]}`:""}:</p>`+tbl(["School","Target","Recruit","Walk-On"],rows.map(r=>[r[0],r[1]||"–",r[2]||"–",r[3]||"–"]))+(cl&&cl[2]?`<p>This season the 8th-best ${esc(d.conf)} mark was <b>${esc(cl[2])}</b>, usually the last scoring spot at the conference meet.</p>`:"")+quizLine};
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
  return {html:h+quizLine,f:[!CX.div?"Only D1":"All divisions","Only schools in Texas",g==="m"?"What about women?":"What about men?"]}}
async function answer(raw){
  const d=detect(raw), q=d.q;
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
  if(/\b(all divisions|any division|every division)\b/.test(q))CX.div=null;
  if(d.confs.length)CX.conf=d.confs[0]; else if(!followup&&!pending&&intent!=="conf")CX.conf=null;
  const st=stateOf(q); if(st)CX.state=st; else if(!followup&&!pending)CX.state=null;
  if(d.schools.length)CX.schools=d.schools.slice(0,4);
  if(d.schools.length===1&&pending!=="school"){const amb=ambiguousSchools(q);if(amb){CX.intent=intent||"school";return askBack("school","Which one did you mean?",amb.slice(0,4).map(i=>SCH[i].n))}}
  if(intent)CX.intent=intent;
  const g=CX.g, e=CX.e;
  const needG=t=>!g?askBack("g",t||"Men's or women's?",gChips):null;
  const needE=t=>!e?askBack("e",t||"Which event?",evChips(g)):null;
  switch(intent){
    case "define": return {html:`<p><b>Walk-On:</b> ${DEF.W}</p><p><b>Recruit:</b> ${DEF.R} Not a guarantee.</p><p><b>Target:</b> ${DEF.T}</p>`,f:["Which schools fit my mark?","What does it take to walk on in the SEC?"]};
    case "funnel": return {html:`<p>Preferred Recruit gets athletes' marks in front of college coaches. Guaranteed genuine interest or a full refund.</p><p>The free recruitment evaluation takes about a minute and shows where you stand.</p>`+quizLine};
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
      if(!all.length)return {html:(cl?`<p>College equivalent: ${cl}.</p>`:"")+`<p>A ${esc(CX.mark)} ${gl(g)} ${esc(e)} doesn't hit a listed standard in ${esc(scopeName())} yet.</p>`+quizLine,f:CX.div?["All divisions"]:["Only NAIA","Only NCAA D3"]};
      const spec={title:`Colleges a ${CX.mark} ${e} fits, by division`,type:"bar",labels:DIVS.filter(z=>by[z]),series:[{name:"Colleges",values:DIVS.filter(z=>by[z]).map(z=>by[z])}],value_format:"number"};
      return {html:(cl?`<p>College equivalent: ${cl}.</p>`:"")+`<p>A <b>${esc(CX.mark)}</b> in the ${gl(g)} ${esc(e)} fits <b>${all.length}</b> colleges (${esc(scopeName())}): ${c("T")} Target, ${c("R")} Recruit, ${c("W")} Walk-On.</p>`+(Object.keys(by).length>1?chartSvg(spec):"")+
        tbl(["College","Division","Level"],all.slice(0,12).map(z=>[z.s.n+(z.s.o?" ★":""),z.s.d,TN[z.t]]),9)+(all.length>12?`<p>Top 12 of ${all.length}. Ask for a division, conference or state to narrow it.</p>`:"")+quizLine,
        f:[!CX.div?"Only D1":"All divisions","Only schools in Texas",g==="m"?"What about women?":"What about men?"]}}
    case "school":{const i=(CX.schools||[])[0];if(i==null)return askBack("school","Which school?");const s=SCH[i],gg=g||"m",sd=s[gg];
      if(e&&sd[e]){const t=sd[e];return {html:`<p><b>${esc(s.n)}</b>${s.o?" ★":""} · ${esc(s.d)} · ${esc(s.c)} · ${gl(gg)} ${esc(e)}:</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],["Walk-On",t[2]||"–"]])+`<p>${s.o?"Official standards published by the school.":esc(ruleText(s))}</p>`,f:[gg==="m"?"Women's":"Men's",`Which schools fit my ${e}?`,"Compare with another school"]}}
      if(s.j)return {html:`<p><b>${esc(s.n)}</b> is an NJCAA junior college. This site doesn't set Target, Recruit or Walk-On levels for junior colleges (NJCAA competition is national, not conference-based, so levels can't be predicted reliably). Its page has this season's bests, roster and TFRRS links, and the NJCAA national list is under Results.</p>`,f:["Only NAIA","Only NCAA D3","What does Walk-On mean?"]};
      const ev=EVENTS.filter(z=>sd[z]);if(!ev.length)return {html:`<p>${esc(s.n)} doesn't list ${gl(gg)} standards.</p>`,f:[gg==="m"?"Women's":"Men's"]};
      return {html:`<p><b>${esc(s.n)}</b>${s.o?" ★":""} · ${esc(s.d)} · ${esc(s.c)} · ${gl(gg)}${s.o?" (official standards)":""}:</p>`+tbl(["Event","Target","Recruit","Walk-On"],ev.map(z=>[z,sd[z][0]||"–",sd[z][1]||"–",sd[z][2]||"–"]))+quizLine,f:[gg==="m"?"Women's":"Men's","Compare with another school"]}}
    case "cmp":{
      if(d.confs.length>=2||(d.confs.length===1&&!d.schools.length&&CX.conf2)){const cs=d.confs.slice(0,5),ee=e||"100m",gg=g||"m",line=c=>{const s0=SCH.find(s=>s.c===c);return (((CT[(s0||{}).ck]||{})[gg]||{})[ee])||null},L=cs.map(line);
        const spec={title:`${cs.join(" vs ")} · ${gl(gg)} ${ee}`,type:"bar",labels:cs,series:[["8th (Target line)",0],["15th (Recruit line)",1],["25th (Walk-On line)",2]].map(([n,j])=>({name:n,values:L.map(z=>z&&z[j]?parse(z[j][0],ee):null)})).filter(s=>s.values.some(v=>v!=null)),value_format:FIELD.has(ee)?"meters":"time",lower_is_better:!FIELD.has(ee)};
        return {html:(e?"":`<p>Showing the ${gl(gg)} 100m.</p>`)+chartSvg(spec)+tbl(["Conference","8th","15th","25th"],cs.map((c,k)=>[c,...[0,1,2].map(j=>L[k]&&L[k][j]?L[k][j][0]:"–")])),f:["400m instead","Women's","800m instead"]}}
      if((CX.schools||[]).length<2){if((CX.schools||[]).length===1)return askBack("school2",`Compare ${esc(SCH[CX.schools[0]].n)} with which school?`);return askBack("school","Which two schools should I compare?")}
      const ss=CX.schools.slice(0,4).map(i=>SCH[i]),gg=g||"m";
      if(!e){const evs2=EVENTS.filter(z=>ss.some(s=>s[gg][z])).slice(0,12);return {html:`<p>${gl(gg)} Recruit marks side by side (Walk-On where a school has no Recruit level):</p>`+tbl(["Event",...ss.map(s=>s.n+(s.o?" ★":""))],evs2.map(z=>[z,...ss.map(s=>{const t=s[gg][z];return t?(t[1]||t[2]||t[0]||"–"):"–"})])),f:["400m","1600m","Long Jump"]}}
      const spec={title:`${gl(gg)[0].toUpperCase()+gl(gg).slice(1)} ${e} standards`,type:"bar",labels:ss.map(s=>s.n.replace(/ \(.*\)/,"")),series:[["Target",0],["Recruit",1],["Walk-On",2]].map(([n,j])=>({name:n,values:ss.map(s=>{const t=s[gg][e];return t?parse(t[j],e):null})})).filter(z=>z.values.some(v=>v!=null)),value_format:FIELD.has(e)?"meters":"time",lower_is_better:!FIELD.has(e)};
      return {html:chartSvg(spec)+tbl(["School","Target","Recruit","Walk-On"],ss.map(s=>{const t=s[gg][e]||[];return [s.n+(s.o?" ★":""),t[0]||"–",t[1]||"–",t[2]||"–"]})),f:[gg==="m"?"Women's":"Men's","800m instead","Long Jump instead"]}}
    case "conf":{let x=needE(`Which event in the ${esc(CX.conf)}?`);if(x)return x;const gg=g||"m";
      const pool=SCH.filter(s=>s.c===CX.conf&&s[gg][e]);if(!pool.length)return {html:`<p>No ${esc(CX.conf)} school lists ${gl(gg)} ${esc(e)} standards.</p>`};
      const k=d.tier?{T:0,R:1,W:2}[d.tier]:2,val=s=>parse(s[gg][e][k],e),rows=pool.slice().sort((a,b)=>{const va=val(a),vb=val(b);if(va==null)return 1;if(vb==null)return -1;return FIELD.has(e)?va-vb:vb-va});
      return {html:`<p>${esc(CX.conf)} ${gl(gg)} ${esc(e)} standards, most reachable ${TN[["T","R","W"][k]]} first:</p>`+tbl(["School","Target","Recruit","Walk-On"],rows.map(s=>[s.n+(s.o?" ★":""),s[gg][e][0]||"–",s[gg][e][1]||"–",s[gg][e][2]||"–"]))+quizLine,f:[gg==="m"?"Women's":"Men's","Another event",`Compare ${CX.conf} with another conference`]}}
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
function ruleOf(s){const [t,r,w]=RULES[s.d]||[];return s.j?"junior college: season results only, no levels":s.o?`official ${s.yr} chart published by the school`:`${s.c} 2026 conference marks: Target=${t}th best${r?`, Recruit=${r}th`:""}, Walk-On=${w}th`}
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
 {name:"conference_standards",description:"All colleges in one conference with their Target / Recruit / Walk-On marks for an event, plus the conference's 2026 8th/15th/25th-best marks. Use to compare schools inside a conference.",
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
- Starred (official) schools use their own published chart (2024 or newer, verified mark for mark). Others: NCAA D1/D2 Target=8th, Recruit=15th, Walk-On=25th best mark in their 2026 conference; NCAA D3/NAIA Target=top 8, Walk-On=40th, no Recruit level (NCAA D3 gives no athletic scholarships).
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
  if(sp.type==="line"){const W=640,H=240,P=52,lo=Math.min(...all),hi=Math.max(...all),pad=(hi-lo)*.12||1,a=lo-pad,b=hi+pad;
    const X=i=>P+(labels.length<2?0:i*(W-P-14)/(labels.length-1)),Y=v=>{const t=(v-a)/(b-a);return 12+(sp.lower_is_better?t:1-t)*(H-44)};
    let g=[0,.5,1].map(f=>{const v=a+(b-a)*f;return `<line x1="${P}" x2="${W-14}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".12"/><text x="${P-6}" y="${Y(v)+4}" text-anchor="end">${esc(fmt(v))}</text>`}).join("");
    g+=labels.map((l,i)=>`<text x="${X(i)}" y="${H-12}" text-anchor="middle">${esc(String(l).slice(0,12))}</text>`).join("");
    g+=S2.map((s,k)=>{const pts=s.values.map((v,i)=>typeof v==="number"?[X(i),Y(v),i]:null).filter(Boolean);return `<polyline fill="none" stroke="${COLORS[k%5]}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p=>p[0]+","+p[1]).join(" ")}"/>`+pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${COLORS[k%5]}"><title>${esc(labels[p[2]])}: ${esc(fmt(s.values[p[2]]))}</title></circle>`).join("")}).join("");
    return `<figure class="chart"><figcaption>${esc(sp.title)}</figcaption>${legend}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(sp.title)}">${g}</svg></figure>`}
  const lo=Math.min(...all),hi=Math.max(...all),W=640,LW=170,multi=S2.length>1,rowH=multi?14*S2.length+10:28,H=labels.length*rowH+8;
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
  t=t.trim(); if(!t||CHAT.busy) return; CHAT.busy=true; CHAT.draft="";
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
  $("hero").hidden=onSchool;
  {const pl=$("evpill");if(pl)pl.hidden=onSchool||!EV.dismissed||EV.shown&&$("eval").classList.contains("on");}
  document.querySelectorAll(".switch button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===S.tab));
  $("app").className=S.tab==="results"&&!onSchool?"wide":"";
  $("app").innerHTML=onSchool?school():{standards,results,ask}[S.tab]();
  if(S.tab==="standards"&&!onSchool) drop();
  moveInd(); if(S.tab==="standards"&&!onSchool) watchMore();  R.swap=false;
}
addEventListener("resize",moveInd);
matchMedia("(min-width:761px)").addEventListener("change",()=>{if(S.tab==="results"&&R.cmp&&MULTI())render()});
document.addEventListener("click",ev=>{
  {const ci=ev.target.closest("[data-cinfo]");document.querySelectorAll(".ci.open").forEach(x=>{if(!ci||x!==ci.parentNode){x.classList.remove("open");x.querySelector("button").setAttribute("aria-expanded","false")}});if(ci){const w=ci.parentNode;w.classList.toggle("open");ci.setAttribute("aria-expanded",w.classList.contains("open"));return}}
  if(ev.target.closest("#evx")){evalOut();return}
  const b=ev.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.tab){const home=b.classList.contains("logo");S.tab=d.tab;S.school=null;R.swap=true;
    if(home){S.run=false;S.mark="";S.f=S.div=S.conf=S.st="";try{if(location.pathname!=="/"||location.search)history.pushState({},"","/")}catch(e){}}
    render();if(home)scrollTo({top:0,behavior:"smooth"});return}
  if("back" in d){S.school=null;render();return}
  if(d.school){S.school=+d.school;render();scrollTo({top:0});INT.sch=SCH[S.school].n;saveInt();log("school",{school:SCH[S.school].n,division:SCH[S.school].d,state:ST_NAME[SCH[S.school].s]||SCH[S.school].s});return}
  if(d.grade){S.gr=INT.gr=+d.grade;saveInt();document.querySelectorAll("[data-grade]").forEach(x=>x.setAttribute("aria-pressed",x===b));const gs=b.closest(".gseg");gs&&gs.classList.remove("need");log("grade",{});const h=$("hint");if(h&&/grade/.test(h.textContent))h.textContent="";return}
  if(d.g){S.g=d.g;render();return}
  if(d.f!==undefined){S.f=d.f;S.n=24;render();return}
  if(d.div!==undefined){S.div=d.div;S.n=24;render();return}
  if("more" in d){S.n=9999;render();return}
  if("clear" in d){S.div=S.conf=S.f=S.st="";S.n=24;render();return}
  if(d.rdiv){syncSel();const av=seasonDivs();
    if(d.rdiv==="ALL")R.sel=R.sel.length===av.length?[R.div]:av.slice();
    else if(R.sel.length===av.length&&av.length>1)R.sel=[d.rdiv];                     /* from "All", a tap picks just that one */
    else if(R.sel.includes(d.rdiv)){if(R.sel.length>1)R.sel=R.sel.filter(x=>x!==d.rdiv)}else R.sel=[...R.sel,d.rdiv];
    syncSel();R.list=0;R.team=null;R.ath=null;R.an=100;R.cn=25;R.swap=true;render();return}
  if("rcmp" in d){R.cmp=!R.cmp;R.swap=true;render();return}
  if("cmore" in d){R.cn=(R.cn||25)+50;render();return}
  if("amore" in d){R.an=(R.an||100)+200;render();return}
  if(d.rg){R.g=d.rg;R.team=null;R.ath=null;R.swap=true;render();return}
  if(d.rev){R.ev=d.rev;R.swap=true;render();{const el=evLabel(d.rev);intent(el,R.g);log("results_event",{event:el,g:R.g,division:R.div,state:R.st?ST_NAME[R.st]:undefined})}const a=document.querySelector('.evs [aria-pressed="true"]');if(a)a.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});return}
  if(d.rsea){const y0=R.season.split("-")[0];const y=RIDX.some(r=>r.year===y0&&r.season===d.rsea)?y0:RIDX.filter(r=>r.season===d.rsea).map(r=>r.year).sort().pop();R.season=y+"-"+d.rsea;R.list=0;R.team=null;R.ath=null;R.swap=true;render();return}
  if("rmore" in d){R.n=9999;render();return}
  if(d.ai!==undefined){const D=CACHE[curKey()],E=D.lists[R.list].g[R.g],r=E[d.ae||R.ev][+d.ai];R.ath={name:r[1],team:r[3],yr:r[2],path:r[9]||""};R.swap=true;loadAth();render();log("athlete",{athlete:r[1],team:D.teams[r[3]],event:evLabel(d.ae||R.ev),g:R.g,division:R.div});const c=document.querySelector(".rcard");if(c)scrollTo({top:c.offsetTop-70,behavior:"smooth"});return}
  if("athback" in d){R.ath=null;R.swap=true;render();return}
  if(d.team){R.ath=null;R.team=+d.team<0?null:+d.team;R.swap=true;render();return}
  if(d.ask){send(d.ask);return}
});
document.addEventListener("input",ev=>{const t=ev.target;
  if(t.id==="q"){S.q=t.value;drop()}
  if(t.id==="mk") S.mark=t.value;
  if(t.id==="rq"){R.q=t.value;const pos=t.selectionStart;render();const n=$("rq");n.focus();n.setSelectionRange(pos,pos)}
  if(t.id==="ct"){CHAT.draft=t.value;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,160)+"px";$("send").disabled=!t.value.trim()||CHAT.busy}});
document.addEventListener("keydown",ev=>{if(ev.target.id==="ct"&&ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();send(ev.target.value)}if(ev.key==="Escape"&&EV.shown&&!EV.dismissed)evalOut()});
document.addEventListener("change",ev=>{const t=ev.target;
  if(t.id==="ev"){S.e=t.value;S.mark="";S.run=false;render()}
  if(t.id==="gr"){S.gr=INT.gr=+t.value;saveInt();t.classList.remove("ph");log("grade",{});const h=$("hint");if(h&&/grade/.test(h.textContent))h.textContent=""}
  if(t.id==="rs"){R.st=t.value;R.swap=true;render();if(R.st)log("results_state",{state:ST_NAME[R.st]||R.st,division:R.div,event:evLabel(R.ev||""),g:R.g})}
  if(["fd","fc","ft","fs"].includes(t.id)){S[{fd:"div",fc:"conf",ft:"f",fs:"st"}[t.id]]=t.value;S.n=24;render()}
  if(t.id==="ry"){const y=t.value,s=R.season.split("-")[1],f=RIDX.find(r=>r.year===y);R.season=RIDX.some(r=>r.year===y&&r.season===s)?y+"-"+s:f.year+"-"+f.season;R.list=0;R.team=null;R.ath=null;R.swap=true;render()}
  if(t.id==="rl"){R.list=+t.value;R.team=null;R.ath=null;R.swap=true;render()}});
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
    EV.hook=hk;setTimeout(()=>{EV.shown=false;EV.dismissed=false;EV.force=true;evalIn(t,ask,0,"school-check"+(+S.gr>=11?"-11-12":S.gr?"-9-10":""),"school-check",bs)},900);return}
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
    if(first&&INT.e&&INT.m&&INT.t&&Date.now()-INT.t>18e5) setTimeout(()=>{if(!S.run)evalIn(`Do coaches know about your ${INT.m} ${evSay(INT.e)} yet?`,`If they don't, they can't recruit you. ${EVAL} who would.`,0,"return"+(+INT.gr>=11?"-11-12":"-9-10"))},15000)}catch(e){}
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
  const route = slug => {
    if (slug) slug = String(slug).replace(/\.html$/, "");   /* pre-built /schools/<slug>.html pages */
    if (slug) { let i = ALT.has(slug) ? ALT.get(slug) : -1; if (i < 0) { const h = hits(slug.replace(/-track-standards$/, "").replace(/-/g, " ")); i = h.length ? h[0][1] : -1; }
      if (i >= 0) { S.school = i; const s = SCH[i], path = "/schools/" + SLUG[i]; INT.sch = s.n; saveInt(); log("school", { school: s.n, division: s.d, state: ST_NAME[s.s] || s.s });
        if (location.pathname !== path) history.replaceState({}, "", path);
        const lw = s.d === "NCAA D3" ? "walk-on and target" : s.d === "NAIA" ? "walk-on and scholarship-level" : "walk-on, recruit and scholarship-level";
        const desc = s.j ? `${s.n} (NJCAA) junior college track and field: season bests in every event, roster and TFRRS links, and how junior college recruiting works.` : `${s.n} track and field recruiting standards 2026-27 (${s.d}${s.c !== s.d ? ", " + s.c : ""}): ${lw} marks for every men's and women's event${s.o ? ", from the official team chart" : ""}. Free, updated weekly.`;
        const descPrev = s.j ? `${s.n} is an NJCAA junior college track and field program. Season bests, roster and TFRRS links; junior colleges get results here, not predicted recruiting standards.` : `${s.n} track and field recruiting standards: Target, Recruit and Walk-On marks for men and women (${s.d}, ${s.c})${s.o ? ", from the school's official published standards" : ""}.`;
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
      if (q.get("tab") === "results") { S.tab = "results"; if (q.get("div") && DIVINFO[q.get("div")]) R.div = q.get("div"); } }
    S.school = null; setMeta("College Track & Field Recruiting Standards & Rankings 2026-27", `Recruiting standards for ${NSTD.toLocaleString()} college track and field programs: walk-on, recruit and scholarship times for NCAA D1, D2, D3 and NAIA, plus results since 2016.`, "/",
      {"@context": "https://schema.org", "@type": "WebSite", name: "Preferred Recruit Track & Field Standards", url: "https://trackandfieldstandards.com/"}); render(); if (S.run) armOffer();
  };
  window.__prStandardsRoute = route;
  window.__prSlug = i => SLUG[i];
  document.addEventListener("click", ev => { const b = ev.target.closest("[data-school]"); if (b) { const i = +b.dataset.school; history.pushState({}, "", "/schools/" + SLUG[i]); setTimeout(() => route(SLUG[i]), 0); }
    if (ev.target.closest("[data-back]") || ev.target.closest("[data-tab]")) { if (location.pathname !== "/") history.pushState({}, "", "/"); } }, true);
  addEventListener("popstate", () => { const m = location.pathname.match(/^\/schools\/([^/]+)/); route(m ? m[1] : null); });
  route(opts.slug);
}
