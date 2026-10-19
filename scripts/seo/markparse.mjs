/* One mark reader for the whole site (Ryan 2026-10-19 standards sweep). The old reader skipped 683 official-chart cells because
   schools write marks many ways: "63 (19.20m)", "16-4 (4.98m)", "19'35\" (5.90)", "13.58.0", "1:03:00", "10:50/17:25", "15:45/xc",
   and a bare "16" in the pole vault means feet, not metres. A skipped cell made "check your mark" miss that level entirely.
   Rules: metres written next to a mark win; otherwise the first mark in the cell is read, and when a cell can be read two ways
   (bare number = metres or feet, "a:b:c" = h:m:s or m:ss:hh, "13.58.0" = 13:58.0, "4.35" in the mile = 4:35) the reading that is a
   possible mark for the event wins. Ranges are wide (high school to world class) and only choose between readings.
   PARSE_SRC is the same function as text, pasted into the app (src/standards/app.js) and the high school pages' inline script. */
export const PARSE_SRC = String.raw`function parseMark(str,e){
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
  var first=null;for(var i=0;i<alts.length;i++){var v2=one(alts[i]);if(v2==null)continue;if(first==null)first=v2;if(!R||inR(v2,R))return v2}return first}`;
export const parseMark = new Function(PARSE_SRC + "; return parseMark;")();
