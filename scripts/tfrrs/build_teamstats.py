#!/usr/bin/env python3
"""Program analytics (Ryan 2026-10-24: "analyze and rank coaches based on athlete performance data ... average seasonal progression
for 100m runners at UCSB over the last 10 years? Are athletes peaking at the right time? When did most athletes run their fastest
times, and how does wind-legal data compare ... data-driven proof of how well a coach peaks their athletes").
Joins every athlete's race-by-race TFRRS history (public/data/history) with the school they ran for that season (public/data/career)
and measures, per school x season x event:
  n        athletes with 2+ races in the event that season
  imp      median in-season improvement, first race -> season best (%, positive = better)
  peak     of the athletes who raced the event at the school's conference championship that season (the championship meet the most
           of its athletes raced), the share whose season best came there or later (regionals, NCAA), and peak_n
  gap      for those who did NOT peak there: median gap between their conference-meet mark and their season best (%)
  yoy      median year-over-year change of returning athletes' season bests at the same school (%), and yoy_n
  month    season bests by month {"4": n, "5": n, ...}
  legal    wind events: median gap between the all-conditions and the wind-legal season best (%), legal_n
Event groups (sprints, hurdles, distance, jumps, throws) are rolled up too. Output: public/data/teamstats/<slug>.json and
_index.json [{slug, team, division, conference, n}] + _rank.json (programs ranked by peaking and development, last 5 years).
Coverage = athletes whose TFRRS page we have (the scan keeps adding them); every figure carries its n.
Usage: python3 scripts/tfrrs/build_teamstats.py"""
import collections, datetime, glob, gzip, json, os, re, statistics
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(SITE, "public", "data"); OUT = os.path.join(D, "teamstats")
GROUP = {**{e: "sprints" for e in ("55", "60", "100", "200", "300", "400")}, **{e: "hurdles" for e in ("55H", "60H", "100H", "110H", "400H")},
         **{e: "distance" for e in ("600", "800", "1000", "1500", "Mile", "3000", "5000", "10,000", "3000S", "2000S")},
         **{e: "jumps" for e in ("HJ", "PV", "LJ", "TJ")}, **{e: "throws" for e in ("SP", "DT", "HT", "JT", "WT")}}
FIELD = {"HJ", "PV", "LJ", "TJ", "SP", "DT", "HT", "JT", "WT", "Hep", "Dec", "Pent"}
WIND = {"100", "200", "100H", "110H", "LJ", "TJ"}
CHAMP = re.compile(r"championship|conference|\bncaa\b|regional|first round|nationals", re.I)
EVCODE = lambda e: {"High Jump": "HJ", "Pole Vault": "PV", "Long Jump": "LJ", "Triple Jump": "TJ", "Shot Put": "SP", "Weight Throw": "WT", "Discus": "DT",
                    "Hammer": "HT", "Javelin": "JT", "Heptathlon": "Hep", "Decathlon": "Dec", "Pentathlon": "Pent"}.get(e) or re.sub(r"^(\d[\d,]*) Meters$", r"\1", re.sub(r"^(\d+) Hurdles$", r"\1H", re.sub(r"^(\d+) Steeplechase$", r"\1S", e)))
slug = lambda t: re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")

def val(m):
    s = re.sub(r"[^0-9:.]", "", m or "")
    try: p = [float(x) for x in s.split(":")]
    except ValueError: return None
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1] if len(p) == 2 else p[0]

def wind(w):
    try: return float(w)
    except (TypeError, ValueError): return None

def med(L): return round(statistics.median(L), 2) if L else None

def main():
    # athlete id -> season -> (school, division, conference-free) from careers
    team = {}
    for f in glob.glob(os.path.join(D, "career", "*.dat")):
        for aid, a in json.loads(gzip.decompress(open(f, "rb").read())).items():
            for x in a["s"]: team.setdefault(aid, {})[x[0]] = (x[5], x[1])
    # pass 1: each school's conference championship per season = the championship meet the most of its athletes raced
    H_ALL = {}
    for f in glob.glob(os.path.join(D, "history", "*.dat")): H_ALL.update(json.loads(gzip.decompress(open(f, "rb").read())))
    cm = collections.defaultdict(lambda: collections.defaultdict(set))
    for aid, H in H_ALL.items():
        T = team.get(aid) or {}
        for r in H:
            if r[0] in T and r[1] and CHAMP.search(r[2]) and not re.search(r"\bncaa\b|regional|first round|nationals", r[2], re.I): cm[(T[r[0]][0], r[0])][(r[2], r[1])].add(aid)
    # not conference meets: the NY/New England championship series (Mets, IC4A/ECAC, NEICAAA, New England) run alongside the
    # conference season and would make early-season bests look like peaks. A meet carrying the school's conference name wins.
    NOTCONF = re.compile(r"\bmets\b|metropolitan|ic4a|ecac|neicaaa|new england|eastern college|\binvitational\b", re.I)
    db = json.load(open(os.path.join(D, "db.json")))
    confkw = {}
    for x in db["schools"]:
        c = x.get("c") or ""; kw = {c.lower(), re.sub(r"[^a-z0-9]", "", c.lower())}
        for a, b in (("atlantic 10", "a-10"), ("big ten", "b1g"), ("pac 12", "pac-12"), ("mountain west", "mw"), ("the american", "american athletic")): 
            if a in c.lower(): kw.add(b)
        confkw[x.get("t") or x["n"]] = {k for k in kw if len(k) >= 3}
    def pick(sch, meets):
        ok = {m: a for m, a in meets.items() if not NOTCONF.search(m[0])} or meets
        kw = confkw.get(sch, set()); named = {m: a for m, a in ok.items() if any(k in m[0].lower() or k in re.sub(r"[^a-z0-9]", "", m[0].lower()) for k in kw)}
        return max((named or ok).items(), key=lambda kv: (len(kv[1]), kv[0][1]))[0]
    CONF = {k: pick(k[0], v) for k, v in cm.items() if v}
    rec = collections.defaultdict(list)   # (school, season, code) -> per-athlete season records
    sbs = {}                               # (aid, code, season) -> (school, sb) for year-over-year
    if True:
        for aid, H in H_ALL.items():
            T = team.get(aid) or {}; by = collections.defaultdict(list)
            for r in H:
                if r[3] in GROUP and r[1] and val(r[4]) is not None: by[(r[0], r[3])].append(r)
            for (sk, code), R in by.items():
                if sk not in T: continue
                hi = code in FIELD; v = [val(r[4]) for r in R]
                bi = max(range(len(v)), key=lambda i: v[i]) if hi else min(range(len(v)), key=lambda i: v[i])
                sb, first = v[bi], v[0]
                legal = None
                if code in WIND:
                    lv = [v[i] for i, r in enumerate(R) if wind(r[5]) is not None and wind(r[5]) <= 2.0]
                    if lv: lb = max(lv) if hi else min(lv); legal = (sb - lb) / lb * 100 if hi else (lb - sb) / lb * 100
                cf = CONF.get((T[sk][0], sk)); at = [i for i, r in enumerate(R) if cf and r[2] == cf[0] and r[1] == cf[1]]
                peak = gap = None
                if at:
                    cv = max(v[i] for i in at) if hi else min(v[i] for i in at)
                    peak = R[bi][1] >= cf[1]; gap = (sb - cv) / cv * 100 if hi else (cv - sb) / cv * 100
                rec[(T[sk][0], sk, code)].append({"n": len(R), "imp": ((sb - first) / first if hi else (first - sb) / first) * 100 if len(R) > 1 else None,
                    "peak": peak, "gap": gap, "month": int(R[bi][1][5:7]), "legal": legal, "div": T[sk][1]})
                sbs[(aid, code, sk)] = (T[sk][0], sb, hi)
    # year over year at the same school (same season type, consecutive years)
    yoy = collections.defaultdict(list)
    for (aid, code, sk), (sch, sb, hi) in sbs.items():
        y, t = sk.split("-"); prev = sbs.get((aid, code, f"{int(y) - 1}-{t}"))
        if prev and prev[0] == sch: yoy[(sch, sk, code)].append(((sb - prev[1]) / prev[1] if hi else (prev[1] - sb) / prev[1]) * 100)
    def agg(L, Y):
        imp = [x["imp"] for x in L if x["imp"] is not None]; leg = [x["legal"] for x in L if x["legal"] is not None]; pk = [x for x in L if x["peak"] is not None]
        return {"n": len(L), "imp": med(imp), "peak": round(100 * sum(x["peak"] for x in pk) / len(pk)) if pk else None, "peak_n": len(pk), "gap": med([x["gap"] for x in pk if not x["peak"]]),
                "yoy": med(Y), "yoy_n": len(Y), "month": dict(collections.Counter(str(x["month"]) for x in L)), "legal": med(leg), "legal_n": len(leg)}
    schools = collections.defaultdict(dict); divs = {}
    for (sch, sk, code), L in rec.items():
        divs.setdefault(sch, collections.Counter())[L[0]["div"]] += len(L)
        for k in (code, "g:" + GROUP[code], "g:all"):
            cur = schools[sch].setdefault(sk, {}).setdefault(k, {"L": [], "Y": []})
            cur["L"] += L; cur["Y"] += yoy.get((sch, sk, code), [])
    os.makedirs(OUT, exist_ok=True); index = []; rank = []
    for sch, S in schools.items():
        out = {"team": sch, "division": divs[sch].most_common(1)[0][0], "seasons": {sk: {k: agg(v["L"], v["Y"]) for k, v in E.items()} for sk, E in sorted(S.items())},
               "conf_meet": {sk: list(CONF[(sch, sk)]) for sk in S if (sch, sk) in CONF}}
        json.dump(out, open(os.path.join(OUT, slug(sch) + ".json"), "w"), separators=(",", ":"))
        tot = sum(E["g:all"]["n"] for E in out["seasons"].values() if "g:all" in E)
        index.append({"slug": slug(sch), "team": sch, "division": out["division"], "n": tot})
        # ranking: last 5 outdoor + indoor seasons pooled, programs with 25+ athlete-seasons
        recent = [v for sk, E in S.items() if int(sk[:4]) >= 2022 for k, v in E.items() if k == "g:all"]
        L = [x for v in recent for x in v["L"]]; Y = [y for v in recent for y in v["Y"]]
        if len(L) >= 25:
            a = agg(L, Y)
            if a["peak_n"] >= 20: rank.append({"slug": slug(sch), "team": sch, "division": out["division"], **{k: a[k] for k in ("n", "imp", "peak", "peak_n", "gap", "yoy", "yoy_n")}})
    json.dump(sorted(index, key=lambda x: -x["n"]), open(os.path.join(OUT, "_index.json"), "w"), separators=(",", ":"))
    json.dump(rank, open(os.path.join(OUT, "_rank.json"), "w"), separators=(",", ":"))
    print(len(schools), "programs,", sum(len(v) for v in rec.values()), "athlete-season-events,", len(rank), "programs ranked (25+ athlete-seasons since 2022)")

if __name__ == "__main__": main()
