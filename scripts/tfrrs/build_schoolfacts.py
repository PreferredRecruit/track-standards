#!/usr/bin/env python3
"""School-page facts nobody else has (Ryan 2026-10-24: "go all-in on optimization ... prioritize the Oregon content"). Per program:
  fresh  what its freshmen ran in their first college outdoor season there (2022-2026), per gender and event:
         {"n": athletes, "med": median mark, "lo"/"hi": middle half, "best": best mark}  (only events with 3+ freshmen)
  champ  national champions from the program since 2016 (TFRRS championship results): [year, season, division, gender, event, athlete, mark]
  dev    how the program develops athletes, 2022-2026 (public/data/teamstats/_rank.json): peaking at the conference meet, year-over-year,
         in-season progression, with the percentile against its division
Output: public/data/schoolfacts.json {TFRRS team name: {...}}. scripts/seo/schools.mjs matches a school to its team name.
Usage: python3 scripts/tfrrs/build_schoolfacts.py   (build_full.sh runs it after the careers)"""
import collections, glob, gzip, json, os, re
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(SITE, "public", "data")
FIELD = re.compile(r"Jump|Vault|Put|Throw|Discus|Hammer|Javelin|thlon", re.I)
KEEP = {"100 Meters", "200 Meters", "400 Meters", "800 Meters", "1500 Meters", "5000 Meters", "10,000 Meters", "100 Hurdles", "110 Hurdles", "400 Hurdles",
        "3000 Steeplechase", "High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"}
def val(m):
    s = re.sub(r"[^0-9:.]", "", m or "")
    try: p = [float(x) for x in s.split(":")]
    except ValueError: return None
    return p[0] * 60 + p[1] if len(p) == 2 else p[0]

def main():
    facts = collections.defaultdict(dict); fr = collections.defaultdict(list)
    for f in glob.glob(os.path.join(D, "career", "*.dat")):
        for aid, a in json.loads(gzip.decompress(open(f, "rb").read())).items():
            first = {}
            for x in a["s"]:
                if len(x) < 11 or not x[0].endswith("outdoor") or x[2] not in KEEP: continue
                k = (x[5], x[2], x[10]); y = int(x[0][:4])
                if k not in first or y < first[k][0]: first[k] = (y, x)
            for (team, ev, g), (y, x) in first.items():
                if x[9] == "FR-1" and 2022 <= y <= 2026 and val(x[3]) is not None: fr[(team, g, ev)].append((val(x[3]), re.sub(r"\s*[@#]+", "", x[3])))
    for (team, g, ev), L in fr.items():
        if len(L) < 3: continue
        L.sort(key=lambda t: -t[0] if FIELD.search(ev) else t[0]); at = lambda p: L[min(len(L) - 1, int(p * len(L)))][1]
        facts[team].setdefault("fresh", {}).setdefault(g, {})[ev] = {"n": len(L), "best": L[0][1], "lo": at(.25), "med": at(.5), "hi": at(.75)}
    for f in sorted(glob.glob(os.path.join(D, "rank", "*.dat"))):
        y, season, div = os.path.basename(f)[:-4].split("-", 2)
        if season == "xc": continue
        d = json.loads(gzip.decompress(open(f, "rb").read()))
        for l in d["lists"]:
            if not l.get("champ"): continue
            for g, E in l["g"].items():
                for ev, rows in E.items():
                    if rows and rows[0][0] == 1 and rows[0][1] and "Relay" not in ev:
                        r = rows[0]; facts[d["teams"][r[3]]].setdefault("champ", []).append([y, season, div.upper() if len(div) <= 3 else div.upper(), g, ev, r[1], r[4]])
    R = json.load(open(os.path.join(D, "teamstats", "_rank.json")))
    for x in R:
        peers = [p for p in R if p["division"] == x["division"]]
        pct = lambda k: round(100 * sum(1 for p in peers if (p[k] or 0) <= (x[k] or 0)) / len(peers))
        facts[x["team"]]["dev"] = {**{k: x[k] for k in ("n", "imp", "peak", "peak_n", "gap", "yoy", "yoy_n")}, "peak_pct": pct("peak"), "yoy_pct": pct("yoy"), "peers": len(peers), "division": x["division"]}
    json.dump(facts, open(os.path.join(D, "schoolfacts.json"), "w"), separators=(",", ":"))
    print(len(facts), "programs;", sum(1 for v in facts.values() if "fresh" in v), "with freshman marks,", sum(1 for v in facts.values() if "champ" in v), "with national champions,", sum(1 for v in facts.values() if "dev" in v), "with development numbers")

if __name__ == "__main__": main()
