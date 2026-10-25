#!/usr/bin/env python3
"""Cross country standards for every program (Ryan 2026-10-25: "Build out XC standards for every program and division using our
TFRRS results data"). Conference XC results on TFRRS are incomplete (no Big Ten, Big 12, Sun Belt ...), but nearly every NCAA
program runs its NCAA regional, so each program's levels come from its own runners there (NAIA has no regionals: its conference
meet, then the national meet), 2024 and 2025 averaged:
  Target   the team's 3rd runner        (top of the roster)
  Recruit  the team's 5th runner        (the last scorer)
  Walk-On  the team's 7th runner        (the last varsity spot)
Tiers follow the track rules: no Recruit level in D3 / NAIA, no Walk-On level at Power 4 programs without an official chart.
Times are put on one distance per division and gender (Riegel, exponent 1.06) and given a high school 5K equivalent the same way.
Courses differ, so every figure is labelled as an estimate on the pages.
Output: public/data/xc_standards.json {"schools": {name: {g: {"d": "10K", "lv": [s, s, s], "hs": [s, s, s], "n": seasons, "meet": label}}},
                                       "div": {division: {g: {"d", "tiers": {"Top": [..], "Mid": [..], "Low": [..]}, "all": [..], "n": programs}}}}
Usage: python3 scripts/tfrrs/build_xc_standards.py"""
import collections, gzip, json, os, re, statistics
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(SITE, "public", "data")
DV = {"d1": "NCAA D1", "d2": "NCAA D2", "d3": "NCAA D3", "naia": "NAIA"}
STD = {("NCAA D1", "m"): 10, ("NCAA D1", "w"): 6, ("NCAA D2", "m"): 10, ("NCAA D2", "w"): 6, ("NCAA D3", "m"): 8, ("NCAA D3", "w"): 6, ("NAIA", "m"): 8, ("NAIA", "w"): 5}
PLACES = (3, 5, 7)
km = lambda e: float(re.match(r"([\d.]+)\s*K", e).group(1)) if re.match(r"[\d.]+\s*K", e) else None
riegel = lambda t, d0, d1: t * (d1 / d0) ** 1.06
def secs(m):
    p = re.sub(r"[^0-9:.]", "", m or "").split(":")
    try: return float(p[0]) * 60 + float(p[1]) if len(p) == 2 else float(p[0]) * 3600 + float(p[1]) * 60 + float(p[2]) if len(p) == 3 else None
    except (ValueError, IndexError): return None
fnorm = lambda x: re.sub(r"[^a-z0-9&]+", " ", re.sub(r"\bst\.(?=\s|$)", "state", re.sub(r"\s*\([a-z]\)\s*$", "", str(x or "").lower()))).strip()

def main():
    db = json.load(open(os.path.join(D, "db.json")))
    idx = {}
    for s in db["schools"]:
        if s["d"] == "NJCAA": continue
        for a in [s.get("t"), s["n"], *(s.get("a") or [])]:
            if a: idx.setdefault((s["d"], fnorm(a)), s)
    p4 = {s["n"] for s in db["schools"] if (db["ct"].get(s.get("ck")) or {}).get("rule") == "p4" and not s.get("o")}
    runs = collections.defaultdict(list)   # (school, g) -> [(season, meet label, [seconds on the standard distance] sorted)]
    unmatched = collections.Counter()
    for y in ("2024", "2025"):
        for k, dv in DV.items():
            f = os.path.join(D, "rank", f"{y}-xc-{k}.dat")
            if not os.path.exists(f): continue
            x = json.loads(gzip.decompress(open(f, "rb").read()))
            region = [l for l in x["lists"] if "Region" in l["label"]]
            conf = [l for l in x["lists"] if not l.get("nat") and "Region" not in l["label"]]
            nat = [l for l in x["lists"] if l.get("nat")]
            pref = region + conf + nat if dv != "NAIA" else conf + nat   # first meet a team ran wins
            done = set()
            for l in pref:
                for g, E in l["g"].items():
                    ev = next((e for e in E if "Team" not in e and km(e)), None)
                    if not ev: continue
                    by = collections.defaultdict(list)
                    for r in E[ev]:
                        t = secs(r[4])
                        if t: by[x["teams"][r[3]]].append(t)
                    for team, T in by.items():
                        s = idx.get((dv, fnorm(team)))
                        if not s: unmatched[team] += 1; continue
                        if (s["n"], g) in done or len(T) < 5: continue
                        done.add((s["n"], g))
                        runs[(s["n"], g)].append((y, l["label"], sorted(riegel(t, km(ev), STD[(dv, g)]) for t in T)))
    S = {s["n"]: s for s in db["schools"]}
    out = {"schools": {}, "div": {}}
    pool = collections.defaultdict(list)
    for (n, g), R in runs.items():
        s = S[n]; dv = s["d"]; rule = db["rules"].get("P4" if n in p4 else dv)
        lv = []
        for i, pl in enumerate(PLACES):
            if rule[i] is None: lv.append(None); continue
            v = [r[2][pl - 1] for r in R if len(r[2]) >= pl]
            lv.append(round(statistics.mean(v), 1) if v else None)
        for i in (1, 2):   # a season with only 5 finishers can leave a lower level faster than the one above it
            prev = next((lv[j] for j in range(i - 1, -1, -1) if lv[j]), None)
            if lv[i] and prev and lv[i] < prev: lv[i] = prev
        if not any(lv): continue
        d = STD[(dv, g)]
        out["schools"].setdefault(n, {})[g] = {"d": f"{d}K", "lv": lv, "hs": [round(riegel(v, d, 5), 1) if v else None for v in lv], "n": len(R), "meet": R[-1][1]}
        pool[(dv, g)].append((n, lv))
    for (dv, g), L in pool.items():
        key = [x for x in L if x[1][1] or x[1][2]]
        ref = lambda lv: lv[1] if lv[1] else lv[2]
        key.sort(key=lambda x: ref(x[1]))
        third = max(1, len(key) // 3)
        med = lambda grp, i: (lambda v: round(statistics.median(v), 1) if v else None)([x[1][i] for x in grp if x[1][i]])
        tiers = {"Top": key[:third], "Mid": key[third:2 * third], "Low": key[2 * third:]}
        d = STD[(dv, g)]
        out["div"].setdefault(dv, {})[g] = {"d": f"{d}K", "n": len(key),
            "tiers": {t: [med(grp, i) for i in range(3)] for t, grp in tiers.items()},
            "all": [med(key, i) for i in range(3)],
            "hs": {t: [round(riegel(v, d, 5), 1) if v else None for v in [med(grp, i) for i in range(3)]] for t, grp in tiers.items()}}
    json.dump(out, open(os.path.join(D, "xc_standards.json"), "w"), separators=(",", ":"))
    print(len(out["schools"]), "programs with XC levels;", sum(len(v) for v in out["schools"].values()), "teams; unmatched team names:", len(unmatched))
    print("  most common unmatched:", unmatched.most_common(12))

if __name__ == "__main__": main()
