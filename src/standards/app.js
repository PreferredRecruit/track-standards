// @ts-nocheck
/* Preferred Recruit · College Track & Field Standards app. Generated from the approved design mockup by export_lovable.py.
   Data: /data/db.json (standards), /data/rank_index.json + /data/rank/<key>.dat (gzip results, refreshed Mondays), /data/athletes.json. */
const LIVE_BASE = "https://raw.githubusercontent.com/emery-moye/Track-standards/data/";   // Monday refresh (data branch)
const LIVE = new Set();
async function unpack(r){ return await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).json(); }
async function getRank(key){
  if (LIVE.has(key) && typeof DecompressionStream !== "undefined") {
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
  for (const x of LIVEIDX) { LIVE.add(x.key); if (!RIDX.some(y => y.key === x.key)) RIDX.push(x); }

const EVENTS=["100m", "200m", "400m", "800m", "1500m", "1600m", "Mile", "3000m", "3200m", "5000m", "10000m", "100m Hurdles", "110m Hurdles", "110m Hurdles (39\")", "300m Hurdles", "400m Hurdles", "3000m Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"], CT=DB.ct, RULES=DB.rules;
const SCH=DB.schools.map(x=>{const side=g=>{if(x.em)return (x.em[g]||{});const o=(x.om||{})[g]||{},c=(CT[x.ck]||{})[g]||{},r={};EVENTS.forEach(e=>{if(o[e])r[e]=o[e];else if(c[e])r[e]=c[e].map(v=>v?v[0]:"")});return r};return Object.assign(x,{m:side("m"),w:side("w")})});
const ACR=SCH.map(s=>s.n.toLowerCase().replace(/\(.*?\)/g," ").split(/[^a-z&]+/).filter(w=>w&&!["of","the","at","and","in","for"].includes(w)).map(w=>w[0]).join(""));
const TOK=SCH.map(s=>[...new Set((s.n+" "+s.t+" "+(s.a||[]).join(" ")).toLowerCase().split(/[^a-z0-9&]+/).filter(Boolean))]);
const DIVS=["NCAA D1","NCAA D2","NCAA D3","NAIA","NJCAA"];
const QUIZ="https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards";
const FIELD=new Set(["High Jump","Pole Vault","Long Jump","Triple Jump","Shot Put","Discus","Hammer","Javelin"]);
const SHORT=new Set(["100m","200m","400m","100m Hurdles","110m Hurdles","300m Hurdles","400m Hurdles"]);
const TF={"100m":"100 Meters","200m":"200 Meters","400m":"400 Meters","800m":"800 Meters","1500m":"1500 Meters","5000m":"5000 Meters","10000m":"10,000 Meters","100m Hurdles":"100 Hurdles","110m Hurdles":"110 Hurdles","400m Hurdles":"400 Hurdles","3000m Steeplechase":"3000 Steeplechase","High Jump":"High Jump","Pole Vault":"Pole Vault","Long Jump":"Long Jump","Triple Jump":"Triple Jump","Shot Put":"Shot Put","Discus":"Discus","Hammer":"Hammer","Javelin":"Javelin"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const MAG='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
function parse(str,e){
  if(str==null) return null; const s=String(str).trim().toLowerCase().replace(/[’′]/g,"'").replace(/[”″]/g,'"').replace(/\s+/g,"");
  if(!s) return null;
  if(FIELD.has(e)){let m=s.match(/^(\d+(?:\.\d+)?)m$/); if(m) return +m[1];
    m=s.match(/^(\d+)['\-](\d+(?:\.\d+)?)?(?:"|in)?$/); if(m) return((+m[1])*12+(+(m[2]||0)))*0.0254;
    m=s.match(/^(\d+(?:\.\d+)?)$/); if(m){const v=+m[1];return v<30?v:null} return null}
  const t=s.replace(/[^0-9:.]/g,""); if(!t) return null; const p=t.split(":").map(Number); if(p.some(isNaN)) return null;
  return p.length===2?p[0]*60+p[1]:p.length===1?p[0]:null;
}
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
const better=(e,a,b)=>FIELD.has(e)?b-a:a-b;
const S={tab:"standards",school:null,g:"m",e:"100m",mark:"",run:false,f:"",div:"",n:15,q:""};
const seg=(k,v)=>`<div class="seg" role="group" aria-label="Team"><button type="button" data-${k}="m" aria-pressed="${v==="m"}">Men</button><button type="button" data-${k}="w" aria-pressed="${v==="w"}">Women</button></div>`;
const evs=g=>EVENTS.filter(e=>CONV[e]||SCH.some(s=>s[g][e])).filter(e=>!(g==="m"&&e==="100m Hurdles")&&!(g==="w"&&e.startsWith("110m Hurdles")));
const PH={"100m":"10.85","200m":"22.10","400m":"49.50","800m":"1:58.00","1500m":"4:05.00","1600m":"4:21.50","Mile":"4:23.00","3000m":"8:50.00","3200m":"9:20.00","5000m":"15:30.00","10000m":"32:00.00","100m Hurdles":"14.20","110m Hurdles":"14.80",'110m Hurdles (39")':"14.80","300m Hurdles":"38.50","400m Hurdles":"54.20","3000m Steeplechase":"9:45.00","High Jump":"6'6\"","Pole Vault":"14'6\"","Long Jump":"22'6\"","Triple Jump":"46'0\"","Shot Put":"52'0\"","Discus":"150'0\"","Hammer":"160'0\"","Javelin":"180'0\""};
const ph=e=>PH[e]||(FIELD.has(e)?"22'6\"":"4:21.50");

/* ---------- Recruitment Evaluation slide-in ---------- */
const EV={shown:false,dismissed:false,t:null};
try{EV.dismissed=sessionStorage.getItem("prEvalDismissed")==="1"}catch(e){}
function evalIn(title,body,delay){
  if(EV.shown||EV.dismissed) return; clearTimeout(EV.t);
  EV.t=setTimeout(()=>{if(EV.shown||EV.dismissed||S.school!=null) return; $("evt").textContent=title; $("evp").textContent=body;
    const el=$("eval"); el.classList.add("on"); el.setAttribute("aria-hidden","false"); EV.shown=true},delay||0);
}
function evalOut(){const el=$("eval");el.classList.remove("on");el.setAttribute("aria-hidden","true");EV.dismissed=true;try{sessionStorage.setItem("prEvalDismissed","1")}catch(e){}}
let scrolled=0,lastY=scrollY;
addEventListener("scroll",()=>{scrolled+=Math.abs(scrollY-lastY);lastY=scrollY;
  if(S.tab==="results"&&S.school==null&&scrolled>1400) evalIn("Close to these marks?","Coaches recruit from these lists. Get a free recruitment evaluation and see where you fit.",0)},{passive:true});

/* ---------- Standards (the current site's flow, rebranded) ---------- */
const DEF={W:"The minimum mark required to earn a spot on the team.",R:"The range where coaches typically start recruiting conversations and scholarship discussions begin.",T:"The marks that typically grant a full-ride scholarship, depending on school funding."};
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
    <label class="sr" for="mk">Personal best</label><input class="in" id="mk" placeholder="Personal best, e.g. ${esc(ph(S.e))}" value="${esc(S.mark)}" autocomplete="off" inputmode="decimal">
    <button class="go">Search colleges</button></div><div class="hint" id="hint"></div></form>`;
  /* order (Ryan 2026-10-13): search by stats · or · search one school · what the levels mean · results */
  o+=`<div class="orsep" role="separator"><span>or</span></div><div class="one"><h4>Search for one school</h4><p>${SCH.length.toLocaleString()} colleges across NCAA D1, D2, D3, NAIA and NJCAA.</p><div class="search">${MAG}<label class="sr" for="q">Search colleges</label><input class="in" id="q" placeholder="Try USC, Oregon or Ole Miss" autocomplete="off" value="${esc(S.q)}"><div id="drop"></div></div></div>`;
  o+=levels();
  if(S.run){
    const v=parse(S.mark,S.e),all=[];SCH.forEach((s,i)=>{const t=tier(s,S.g,S.e,v);if(t)all.push({s,i,t})});
    const ok=(x,skip)=>(skip==="d"||!S.div||x.s.d===S.div)&&(skip==="c"||!S.conf||x.s.c===S.conf)&&(skip==="t"||!S.f||x.t===S.f)&&(skip==="s"||!S.st||x.s.s===S.st);
    const sh=all.filter(x=>ok(x)).sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));CUR=sh;
    const opts=(skip,key)=>[...new Set(all.filter(x=>ok(x,skip)).map(key))].filter(Boolean);
    const dd=(id,label,cur,list,fmt=x=>x)=>`<label class="dd${cur?" on":""}"><span class="sr">${label}</span><select id="${id}"><option value="">${label}</option>${list.map(x=>`<option value="${esc(x)}" ${x===cur?"selected":""}>${esc(fmt(x))}</option>`).join("")}</select></label>`;
    const cl=convLine(S.e,S.g,v), c=k=>all.filter(x=>x.t===k).length;
    o+=`<div class="mhead"><p class="sum">${esc(S.mark)} in the ${S.g==="m"?"men's":"women's"} ${esc(S.e)} fits <b>${all.length}</b> colleges</p>
      <p class="mcount"><span class="lv T">${c("T")} Target</span><span class="lv R">${c("R")} Recruit</span><span class="lv W">${c("W")} Walk-On</span></p>${cl?`<p class="cvl"><b>College equivalent</b> ${cl}${cinfo(S.e)}</p>`:""}</div>
    <section class="mtab" aria-label="Your college matches">
      <div class="mbar"><h3>Your college matches</h3><div class="dds">
        ${dd("fd","All divisions",S.div,DIVS.filter(d=>opts("d",x=>x.s.d).includes(d)))}
        ${dd("fc","All conferences",S.conf,opts("c",x=>x.s.c).sort())}
        ${dd("ft","All tiers",S.f,["T","R","W"].filter(k=>opts("t",x=>x.t).includes(k)),k=>TN[k])}
        ${dd("fs","All states",S.st,opts("s",x=>x.s.s).sort())}
        ${S.div||S.conf||S.f||S.st?'<button class="clr" data-clear>Clear</button>':""}</div></div>
      <div class="mrow mh" aria-hidden="true"><span>School</span><span>Division</span><span>Conference</span><span class="mk">Mark to hit</span><span>Your level</span></div>
      ${sh.length?`<div id="sgrid">${cards(sh,0,S.n)}</div>${sh.length>S.n?'<div class="sent" id="sent" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>':""}`:'<p class="empty">No colleges match these filters.</p>'}
      <p class="vnote"><span class="star">★</span> Official standards, published by the school and verified by Preferred Recruit. Every other college is set from its 2026 conference results.</p>
    </section>`;
  }
  return o+`</div>`;
}
function hits(q){q=q.trim().toLowerCase().replace(/\s+/g," ");if(q.length<2)return [];const ws=q.split(" ");
  return SCH.map((s,i)=>{let b=0;if(s.a.includes(q))b=100;else if(ACR[i]===q)b=92;else if(s.a.some(a=>a.startsWith(q)))b=80;else if(ws.every(w=>TOK[i].some(t=>t.startsWith(w))))b=60;
    return [b?b+(s.o?3:0)+(s.d==="NCAA D1"?2:s.d==="NCAA D2"?1:0):0,i]}).filter(x=>x[0]).sort((a,b)=>b[0]-a[0]||SCH[a[1]].n.localeCompare(SCH[b[1]].n)).slice(0,8).map(x=>[SCH[x[1]],x[1]])}
const star=s=>s.o?'<span class="star" title="Official standards, verified">★</span>':"";
function drop(){const el=$("drop");if(!el)return;const h=hits(S.q.trim().toLowerCase());el.innerHTML=h.length?`<div class="drop">${h.map(([s,i])=>`<button data-school="${i}"><em>${esc(s.n)}${star(s)}</em><span>${s.d} · ${esc(s.c)}</span></button>`).join("")}</div>`:(S.q.trim().length>1?'<div class="drop"><p class="none">No college matches that. Try the full name or a short name like USC.</p></div>':"")}
const disp=(s,g,e,i)=>{const o=(s.om||{})[g]||{};if(o[e])return esc(o[e][i]||"–");const c=(((CT[s.ck]||{})[g]||{})[e]||[])[i];return c?(c[1]?`${esc(c[1])} <small>${esc(c[0])}</small>`:esc(c[0])):"–"};
function ruleText(s){if(s.est)return `These are Preferred Recruit estimates for ${esc(s.n)}. Its conference has no 2026 results list on TFRRS, so they can't be set from conference marks yet.`;const [t,r,w]=RULES[s.d]||[];const c=esc(s.c);
  if(s.d==="NJCAA") return `NJCAA results are national. Target is the ${ord(t)}-best mark in the country this season, Recruit the ${ord(r)}, Walk-On the ${ord(w)}.`;
  if(!r) return `${s.d==="NCAA D3"?"NCAA D3 programs don't give athletic scholarships, so every athlete is effectively a walk-on. ":""}Target is a top-${t} mark in the ${c} this season. Walk-On is the ${ord(w)}-best mark (or the last one listed).`;
  return `Target is the ${ord(t)}-best mark in the ${c} this season, Recruit the ${ord(r)}, Walk-On the ${ord(w)}.`}
function schoolLinks(s){const L=[];
  if(s.o&&s.src)L.push(`<a class="sl off" href="${esc(s.src)}" target="_blank" rel="noopener">★ Official standards</a>`);
  if(s.rs)L.push(`<a class="sl" href="${esc(s.rs)}" target="_blank" rel="noopener">Track &amp; field roster</a>`);
  if(s.cu&&s.cu!==s.rs)L.push(`<a class="sl" href="${esc(s.cu)}" target="_blank" rel="noopener">${/roster/i.test(s.cu)?"Roster":"Coaching staff"}</a>`);
  if(s.ws)L.push(`<a class="sl" href="${esc(s.ws)}" target="_blank" rel="noopener">Athletics site</a>`);
  if(s.u)L.push(`<a class="sl" href="${esc(s.u)}" target="_blank" rel="noopener">TFRRS team page</a>`);
  return L.length?`<nav class="slinks" aria-label="${esc(s.n)} links">${L.join("")}</nav>`:""}
function school(){const s=SCH[S.school],g=S.g,src=(CT[s.ck]||{}).src;
  let o=`<div class="sec" style="padding-top:0"><button class="back" data-back>‹ Back</button><h1 class="sname">${esc(s.n)} Track &amp; Field Standards${s.o?' <span class="star big" title="Official standards, verified">★</span>':""}</h1>
  <div class="meta"><span>${s.d} · ${esc(s.c)}${s.s?" · "+esc(s.s):""}</span>${s.o?`<span class="badge off">★ Official standards · published ${esc(s.yr)}</span>`:'<span class="badge">Based on 2026 conference results</span>'}</div>
  <p class="intro">${esc(s.n)} is ${/^(NCAA|NAIA|NJCAA)/.test(s.d)?"an":"a"} ${esc(s.d)} track and field program in the ${esc(s.c)}${s.s?`, based in ${esc(s.s)}`:""}. Below are the marks it takes to be a Target recruit, a Recruit or a Walk-On for men and women in every event${s.o?", taken from the school's own published standards":""}.</p>
  ${schoolLinks(s)}
  <div class="coach"><div><b>Interested in ${esc(s.n)}?</b><span>Let us help you contact the coach.</span></div><a href="${QUIZ}" target="_blank" rel="noopener">Get my recruitment evaluation</a></div>
  ${seg("g",g)}`;
  const off=s.o&&(s.off||{})[g];
  if(off){
    o+=`<div class="scroll" style="margin-top:16px"><table><thead><tr><th>Event</th>${off.tiers.map(t=>`<th class="num">${esc(t)}</th>`).join("")}</tr></thead><tbody>${off.rows.map(r=>`<tr><td>${esc(r[0])}</td>${off.tiers.map((_,i)=>`<td class="num">${esc(r[i+1]||"–")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="verify"><b>★ Official standards</b><span>Published by ${esc(s.n)} (${esc(s.yr)}) and checked mark for mark by Preferred Recruit.</span><a href="${esc(s.src)}" target="_blank" rel="noopener">View the official source ›</a>${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
  } else {
    const ev=EVENTS.filter(e=>s[g][e]);
    o+=`<div class="scroll" style="margin-top:16px"><table><thead><tr><th>Event</th><th class="num">Target</th><th class="num">Recruit</th><th class="num">Walk-On</th></tr></thead><tbody>
    ${ev.map(e=>`<tr><td>${e}</td><td class="num">${disp(s,g,e,0)}</td><td class="num">${disp(s,g,e,1)}</td><td class="num">${disp(s,g,e,2)}</td></tr>`).join("")||'<tr><td>No marks listed for this team yet.</td></tr>'}</tbody></table></div>
    <div class="verify"><b>How these are set</b><span>${ruleText(s)} ${esc(s.n)} doesn't publish an official chart we could verify. High school 1600m, 3200m, 300m hurdle and 39" hurdle marks are converted to these college events automatically.</span>${src?`<a href="${esc(src)}" target="_blank" rel="noopener">See the ${esc(s.c)} list on TFRRS ›</a>`:""}${s.u?`<a href="${esc(s.u)}" target="_blank" rel="noopener">Team on TFRRS ›</a>`:""}</div>`;
  }
  return o+`</div>`}

/* ---------- Results (TFRRS, organized) ---------- */
const R={season:"2026-outdoor",div:"NCAA D1",list:0,g:"m",ev:null,q:"",team:null,ath:null,n:9999,swap:true};
const CACHE={},LOADING={};
const DIVINFO={"NCAA D1":"NCAA D1","NCAA D2":"NCAA D2","NCAA D3":"NCAA D3",NAIA:"NAIA",NJCAA:"NJCAA",NCCAA:"NCCAA",NWAC:"NWAC",USCAA:"USCAA"};
const evLabel=e=>e.replace(/^(\d[\d,]*) Meters$/,"$1m").replace(/^(\d+) Hurdles$/,"$1m Hurdles").replace(/^(\d+) Steeplechase$/,"$1m Steeple").replace(/^4 x (\d+) Relay$/,"4×$1 Relay");
const years=()=>[...new Set(RIDX.map(x=>x.year))].sort().reverse();
const seasons=()=>[...new Set(RIDX.map(x=>x.year+"-"+x.season))].sort().reverse();
const seasonLabel=k=>{const [y,s]=k.split("-");return `${y} ${s[0].toUpperCase()+s.slice(1)}`};
const curKey=()=>{const x=RIDX.find(x=>x.year+"-"+x.season===R.season&&x.div===R.div)||RIDX.find(x=>x.year+"-"+x.season===R.season);if(x)R.div=x.div;return x&&x.key};
function load(key,quiet){if(CACHE[key]||LOADING[key])return LOADING[key];
  LOADING[key]=getRank(key).then(d=>{CACHE[key]=d}).catch(()=>{CACHE[key]={err:1,lists:[]}})
    .then(()=>{if(key===curKey()&&S.tab==="results"&&S.school==null){R.swap=true;render()} if(!quiet) prefetch()});
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
  return `<div class="divs" role="tablist" aria-label="Division"><span class="dind" id="dind"></span>${divs.map(d=>`<button role="tab" data-rdiv="${d}" aria-selected="${d===R.div}"><b>${d}</b></button>`).join("")}</div>`;
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
function results(){
  const key=curKey(), D=key&&CACHE[key]; if(key&&!D) load(key);
  let o=`<div class="sec"><p class="lede">The top marks in college track this season. Pick a level, then an event.</p><div class="rcard">${divTabs()}`;
  const ctl=(L)=>`<div class="rctl"><label class="sr" for="ry">Year</label><select class="in" id="ry">${years().map(y=>`<option ${y===R.season.split("-")[0]?"selected":""}>${y}</option>`).join("")}</select><div class="seg" role="group" aria-label="Season">${["outdoor","indoor"].map(x=>{const ok=RIDX.some(r=>r.year===R.season.split("-")[0]&&r.season===x);return `<button data-rsea="${x}" aria-pressed="${R.season.endsWith(x)}" ${ok?"":"disabled"}>${x==="outdoor"?"Outdoor":"Indoor"}</button>`}).join("")}</div>${seg("rg",R.g)}
    ${L?`<label class="sr" for="rl">List</label><select class="in" id="rl">${D.lists.map((l,i)=>`<option value="${i}" ${i===R.list?"selected":""}>${l.nat?"National list":esc(l.label)}</option>`).join("")}</select>`:'<span></span>'}
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
  const all=E[R.ev]||[], q=R.q.trim().toLowerCase(), rows=all.filter(r=>!q||r[1].toLowerCase().includes(q)||D.teams[r[3]].toLowerCase().includes(q));
  const st=(i,lab,cls="")=>{const r=all[i];return r?`<div class="st ${cls}"><small>${lab}</small><b>${esc(r[4])}</b><span>${esc(r[1]||D.teams[r[3]])}${r[1]?" · "+esc(D.teams[r[3]]):""}</span></div>`:""};
  const last=all.length-1;
  o+=`<div class="evwrap"><div class="evs" role="group" aria-label="Event">${evNames.map(e=>`<button data-rev="${esc(e)}" aria-pressed="${e===R.ev}">${esc(evLabel(e))}</button>`).join("")}</div></div>
  <div class="rbody${R.swap?" swap":""}"><div class="rhead"><h3>${gname} ${esc(evLabel(R.ev))}</h3><span>${esc(listName)} · ${esc(seasonLabel(R.season))} · ${all.length} marks</span></div>
  <div class="stats">${st(0,"#1 · "+(L.nat?R.div:L.label),"lead")}${(RULES[R.div]||[8,15,25]).map((k,j)=>k&&all[k-1]?st(k-1,`${ord(k)} · ${["Target","Recruit","Walk-On"][j]} line`):"").join("")}</div>${curve(all,R.ev)}
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
  if(/\bnaia\b/.test(q)) out.div="NAIA"; if(/\b(njcaa|juco)\b/.test(q)) out.div="NJCAA";
  out.tier=/walk.?on/.test(q)?"W":/\brecruit/.test(q)?"R":/\btarget/.test(q)?"T":null;
  return out;
}
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
      return {html:chartSvg(spec)+tbl(["School","Target","Recruit","Walk-On"],rows)+`<p>★ = official standards published by the school. Others are set from 2026 conference results.</p>`+quizLine,f:[`${ss[0].n} vs ${ss[1].n} ${d.e==="100m"?"400m":"100m"}`]};}
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
    if(d.e&&st[d.e]) {const t=st[d.e];return {html:`<p><b>${esc(s.n)}</b> ${gl(g)} ${esc(d.e)}${s.o?" (official standards)":" (based on 2026 conference results)"}:</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],["Walk-On",t[2]||"–"]])+quizLine}}
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
function scopeList(){return SCH.map((s,i)=>({s,i})).filter(({s})=>(!CX.div||s.d===CX.div)&&(!CX.conf||s.c===CX.conf)&&(!CX.state||s.s===CX.state))}
const scopeName=()=>[CX.conf,CX.div,CX.state].filter(Boolean).join(" · ")||"all divisions";
const fmtv=(e,v)=>FIELD.has(e)?v.toFixed(2)+"m":fmtT(v);

async function answer(raw){
  const d=detect(raw), q=d.q;
  /* 1. replies to a clarifying question */
  const pending=CX.await; CX.await=null;
  if(pending==="g"&&!d.g&&/\b(men|mens|man|boys?|guys?)\b/.test(q))d.g="m";
  if(pending==="mark"&&!d.mark){const m=q.match(/(\d{1,2}:\d{2}(?:\.\d+)?|\d{1,2}'\s?\d{0,2}(?:\.\d+)?"?|\d{1,3}(?:\.\d{1,2})?m?)/);if(m)d.mark=m[0].trim()}
  if((pending==="school"||pending==="school2")&&!d.schools.length){const h=hits(raw);if(h.length){d.school=h[0][1];d.schools=[h[0][1]]}}
  if(pending==="school2"&&d.schools.length&&(CX.schools||[]).length===1)d.schools=[CX.schools[0],d.schools[0]];
  /* 2. intent; a message with only new details is a follow-up to the last question */
  let intent=null;
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
    case "fit":{let x=needE("Which event is the mark in?");if(x)return x;x=needG();if(x)return x;
      if(!CX.mark)return askBack("mark",`What's your best ${gl(g)} ${esc(e)}? (for example ${esc(ph(e))})`);
      const v=parse(CX.mark,e);if(v==null)return askBack("mark",`I couldn't read "${esc(CX.mark)}" as a ${esc(e)} mark. Try something like ${esc(ph(e))}.`);
      const all=scopeList().map(({s,i})=>({s,i,t:tier(s,g,e,v)})).filter(z=>z.t);
      all.sort((a,b)=>"TRW".indexOf(a.t)-"TRW".indexOf(b.t)||DIVS.indexOf(a.s.d)-DIVS.indexOf(b.s.d)||a.s.n.localeCompare(b.s.n));
      const c=k=>all.filter(z=>z.t===k).length, cl=convLine(e,g,v), by={};all.forEach(z=>by[z.s.d]=(by[z.s.d]||0)+1);
      if(!all.length)return {html:(cl?`<p>College equivalent: ${cl}.</p>`:"")+`<p>A ${esc(CX.mark)} ${gl(g)} ${esc(e)} doesn't hit a listed standard in ${esc(scopeName())} yet.</p>`+quizLine,f:CX.div?["All divisions"]:["Only NAIA","Only NJCAA"]};
      const spec={title:`Colleges a ${CX.mark} ${e} fits, by division`,type:"bar",labels:DIVS.filter(z=>by[z]),series:[{name:"Colleges",values:DIVS.filter(z=>by[z]).map(z=>by[z])}],value_format:"number"};
      return {html:(cl?`<p>College equivalent: ${cl}.</p>`:"")+`<p>A <b>${esc(CX.mark)}</b> in the ${gl(g)} ${esc(e)} fits <b>${all.length}</b> colleges (${esc(scopeName())}): ${c("T")} Target, ${c("R")} Recruit, ${c("W")} Walk-On.</p>`+(Object.keys(by).length>1?chartSvg(spec):"")+
        tbl(["College","Division","Level"],all.slice(0,12).map(z=>[z.s.n+(z.s.o?" ★":""),z.s.d,TN[z.t]]),9)+(all.length>12?`<p>Top 12 of ${all.length}. Ask for a division, conference or state to narrow it.</p>`:"")+quizLine,
        f:[!CX.div?"Only D1":"All divisions","Only schools in Texas",g==="m"?"What about women?":"What about men?"]}}
    case "school":{const i=(CX.schools||[])[0];if(i==null)return askBack("school","Which school?");const s=SCH[i],gg=g||"m",sd=s[gg];
      if(e&&sd[e]){const t=sd[e];return {html:`<p><b>${esc(s.n)}</b>${s.o?" ★":""} · ${esc(s.d)} · ${esc(s.c)} · ${gl(gg)} ${esc(e)}:</p>`+tbl(["Level","Mark"],[["Target",t[0]||"–"],["Recruit",t[1]||"–"],["Walk-On",t[2]||"–"]])+`<p>${s.o?"Official standards published by the school.":esc(ruleText(s))}</p>`,f:[gg==="m"?"Women's":"Men's",`Which schools fit my ${e}?`,"Compare with another school"]}}
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
const divK=d=>{d=String(d||"").toLowerCase();if(!d)return "";if(/naia/.test(d))return "NAIA";if(/njcaa|juco/.test(d))return "NJCAA";if(/3|iii/.test(d))return "NCAA D3";if(/2|ii/.test(d))return "NCAA D2";if(/1|i/.test(d))return "NCAA D1";return ""};
const confK=c=>{c=String(c||"").toLowerCase().trim();if(!c)return "";return CONFS.find(x=>x.toLowerCase()===c)||CONFS.find(x=>x.toLowerCase().includes(c))||""};
const schoolOut=(s,i)=>({id:i,name:s.n,division:s.d,conference:s.c,state:s.s||"",official:!!s.o});
const tierObj=(t,e)=>t?{target:t[0]||null,recruit:t[1]||null,walk_on:t[2]||null,target_value:num(t[0],e),recruit_value:num(t[1],e),walk_on_value:num(t[2],e)}:null;
function ruleOf(s){const [t,r,w]=RULES[s.d]||[];return s.o?`official ${s.yr} chart published by the school`:(s.d==="NJCAA"?`national list: Target=${t}th, Recruit=${r}th, Walk-On=${w}th best mark`:`${s.c} 2026 conference marks: Target=${t}th best${r?`, Recruit=${r}th`:""}, Walk-On=${w}th`)}
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
- ${SCH.length} colleges: NCAA D1, NCAA D2, NCAA D3, NAIA, NJCAA. Levels: Target (the marks that typically earn the strongest scholarship interest, depending on school funding), Recruit (where coaches typically start recruiting conversations and scholarship talks; not a guarantee), Walk-On (minimum mark to earn a roster spot).
- Starred (official) schools use their own published chart (2024 or newer, verified mark for mark). Others: NCAA D1/D2 Target=8th, Recruit=15th, Walk-On=25th best mark in their 2026 conference; NCAA D3/NAIA Target=top 8, Walk-On=40th, no Recruit level (NCAA D3 gives no athletic scholarships); NJCAA uses the national list (15th/30th/50th).
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
  if(CHAT.msgs.length>=4) evalIn("Want a real person on your recruiting?","Get a free recruitment evaluation from Preferred Recruit. It takes about a minute.",1800);
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
  document.querySelectorAll(".switch button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===S.tab));
  $("app").className=S.tab==="results"&&!onSchool?"wide":"";
  $("app").innerHTML=onSchool?school():{standards,results,ask}[S.tab]();
  if(S.tab==="standards"&&!onSchool) drop();
  moveInd(); if(S.tab==="standards"&&!onSchool) watchMore(); if(S.tab==="results"&&!onSchool) slide(".divs","dind","div"); R.swap=false;
}
addEventListener("resize",moveInd);
document.addEventListener("click",ev=>{
  {const ci=ev.target.closest("[data-cinfo]");document.querySelectorAll(".ci.open").forEach(x=>{if(!ci||x!==ci.parentNode){x.classList.remove("open");x.querySelector("button").setAttribute("aria-expanded","false")}});if(ci){const w=ci.parentNode;w.classList.toggle("open");ci.setAttribute("aria-expanded",w.classList.contains("open"));return}}
  if(ev.target.closest("#evx")){evalOut();return}
  const b=ev.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.tab){S.tab=d.tab;S.school=null;R.swap=true;render();if(b.classList.contains("logo"))scrollTo({top:0,behavior:"smooth"});return}
  if("back" in d){S.school=null;render();return}
  if(d.school){S.school=+d.school;render();scrollTo({top:0});return}
  if(d.g){S.g=d.g;render();return}
  if(d.f!==undefined){S.f=d.f;S.n=24;render();return}
  if(d.div!==undefined){S.div=d.div;S.n=24;render();return}
  if("more" in d){S.n=9999;render();return}
  if("clear" in d){S.div=S.conf=S.f=S.st="";S.n=24;render();return}
  if(d.rdiv){if(d.rdiv!==R.div){R.div=d.rdiv;R.list=0;R.team=null;R.ath=null;R.swap=true;render()}return}
  if(d.rg){R.g=d.rg;R.team=null;R.ath=null;R.swap=true;render();return}
  if(d.rev){R.ev=d.rev;R.swap=true;render();const a=document.querySelector('.evs [aria-pressed="true"]');if(a)a.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});return}
  if(d.rsea){R.season=R.season.split("-")[0]+"-"+d.rsea;R.list=0;R.team=null;R.ath=null;R.swap=true;render();return}
  if("rmore" in d){R.n=9999;render();return}
  if(d.ai!==undefined){const D=CACHE[curKey()],E=D.lists[R.list].g[R.g],r=E[d.ae||R.ev][+d.ai];R.ath={name:r[1],team:r[3],yr:r[2],path:r[9]||""};R.swap=true;loadAth();render();const c=document.querySelector(".rcard");if(c)scrollTo({top:c.offsetTop-70,behavior:"smooth"});return}
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
  if(["fd","fc","ft","fs"].includes(t.id)){S[{fd:"div",fc:"conf",ft:"f",fs:"st"}[t.id]]=t.value;S.n=24;render()}
  if(t.id==="ry"){const y=t.value,s=R.season.split("-")[1],f=RIDX.find(r=>r.year===y);R.season=RIDX.some(r=>r.year===y&&r.season===s)?y+"-"+s:f.year+"-"+f.season;R.list=0;R.team=null;R.ath=null;R.swap=true;render()}
  if(t.id==="rl"){R.list=+t.value;R.team=null;R.ath=null;R.swap=true;render()}});
document.addEventListener("submit",ev=>{ev.preventDefault();
  if(ev.target.id==="cf"){send($("ct").value);return}
  if(parse(S.mark,S.e)==null){$("hint").textContent=`Enter a mark like ${ph(S.e)}`;return}
  S.run=true;S.f="";S.div="";S.conf="";S.st="";S.n=24;render();{const el=document.querySelector(".sum");if(el)scrollTo({top:el.getBoundingClientRect().top+scrollY-74,behavior:"smooth"})}
  const v=parse(S.mark,S.e), n=SCH.filter(s=>tier(s,S.g,S.e,v)).length;
  evalIn(n?`Your ${S.mark} fits ${n} colleges.`:"Every mark has a path.",n?"Want those coaches to see it? Get a free recruitment evaluation from Preferred Recruit.":"Get a free recruitment evaluation and see which programs fit you.",2500)});

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
  const route = slug => {
    if (slug) { let i = ALT.has(slug) ? ALT.get(slug) : -1; if (i < 0) { const h = hits(slug.replace(/-track-standards$/, "").replace(/-/g, " ")); i = h.length ? h[0][1] : -1; }
      if (i >= 0) { S.school = i; const s = SCH[i], path = "/schools/" + SLUG[i];
        if (location.pathname !== path) history.replaceState({}, "", path);
        const desc = `${s.n} track and field recruiting standards: Target, Recruit and Walk-On marks for men and women (${s.d}, ${s.c})${s.o ? ", from the school's official published standards" : ""}.`;
        setMeta(`${s.n} Track & Field Standards | Preferred Recruit`, desc, path, {"@context": "https://schema.org", "@type": "SportsOrganization", name: s.n + " Track & Field", sport: "Track and Field",
          url: "https://trackandfieldstandards.com" + path, description: desc, memberOf: {"@type": "SportsOrganization", name: s.c}, ...(s.s ? {address: {"@type": "PostalAddress", addressRegion: s.s}} : {}),
          sameAs: [s.ws, s.rs, s.src, s.u].filter(Boolean)});
        render(); scrollTo(0, 0); return; } }
    S.school = null; setMeta("College Track & Field Standards & Results | Preferred Recruit", "Every college track and field standard, every NCAA result and a recruiting AI: NCAA D1, D2, D3, NAIA and NJCAA.", "/",
      {"@context": "https://schema.org", "@type": "WebSite", name: "Preferred Recruit Track & Field Standards", url: "https://trackandfieldstandards.com/"}); render();
  };
  window.__prStandardsRoute = route;
  document.addEventListener("click", ev => { const b = ev.target.closest("[data-school]"); if (b) history.pushState({}, "", "/schools/" + SLUG[+b.dataset.school]);
    if (ev.target.closest("[data-back]") || ev.target.closest("[data-tab]")) { if (location.pathname !== "/") history.pushState({}, "", "/"); } }, true);
  addEventListener("popstate", () => { const m = location.pathname.match(/^\/schools\/([^/]+)/); route(m ? m[1] : null); });
  route(opts.slug);
}
