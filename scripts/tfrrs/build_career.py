#!/usr/bin/env python3
"""Athlete careers (Ryan 2026-10-23: "my cal poly times arent here"): the athlete view showed only the season and team being
viewed, so transfers and multi-season athletes looked incomplete. This joins every results file by TFRRS athlete id: each
athlete's best mark per event per season, at whatever school, with the national rank where the national list has it.
Output: public/data/career/<id % 512>.dat  gzip JSON {id: {"n": name, "s": [[season key, division, event, mark, wind, team,
  national rank or 0, meet, date, class], ...]}}   (season key like "2023-outdoor"; newest season first)
Usage: python3 scripts/tfrrs/build_career.py"""
import glob, gzip, json, os, re
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RANK, OUT = os.path.join(SITE, "public", "data", "rank"), os.path.join(SITE, "public", "data", "career")
DIVS = {"d1": "NCAA D1", "d2": "NCAA D2", "d3": "NCAA D3", "naia": "NAIA", "njcaa": "NJCAA", "nccaa": "NCCAA", "nwac": "NWAC", "uscaa": "USCAA"}
B = 512
FIELD = re.compile(r"Jump|Vault|Put|Throw|Discus|Hammer|Javelin|thlon", re.I)

def val(m):
    s = re.sub(r"[^0-9:.]", "", m or "")
    try: p = [float(x) for x in s.split(":")]
    except ValueError: return None
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1] if len(p) == 2 else p[0]

def main():
    car = {}
    for f in sorted(glob.glob(os.path.join(RANK, "*.dat"))):
        k = os.path.basename(f)[:-4]; y, season, div = k.split("-", 2)
        if season == "xc": continue
        d = json.loads(gzip.decompress(open(f, "rb").read()))
        for l in d["lists"]:
            if l.get("champ"): continue
            for g, E in (l.get("g") or {}).items():
                for ev, rows in E.items():
                    if "Relay" in ev: continue
                    hi = bool(FIELD.search(ev))
                    for r in rows:
                        if not r[9] or not r[1]: continue
                        aid = r[9].split("/")[0]; v = val(r[4])
                        if not aid.isdigit() or v is None: continue
                        a = car.setdefault(aid, {"n": r[1], "b": {}})
                        sk = (f"{y}-{season}", ev); cur = a["b"].get(sk)
                        nat = r[0] if l.get("nat") else 0
                        row = [f"{y}-{season}", DIVS.get(div, div), ev, r[4], r[5], d["teams"][r[3]], nat, d["meets"][r[6]], r[7], r[2], v]
                        if cur is None or (v > cur[10] if hi else v < cur[10]) or (v == cur[10] and nat and not cur[6]): a["b"][sk] = row
    buckets = {}
    for aid, a in car.items():
        rows = sorted(a["b"].values(), key=lambda x: (x[0], x[2]), reverse=True)
        buckets.setdefault(int(aid) % B, {})[aid] = {"n": a["n"], "s": [x[:10] for x in rows]}
    os.makedirs(OUT, exist_ok=True)
    for i, b in buckets.items():
        with open(os.path.join(OUT, f"{i}.dat"), "wb") as fh: fh.write(gzip.compress(json.dumps(b, separators=(",", ":")).encode(), 9))
    print(len(car), "athletes,", len(buckets), "files")

if __name__ == "__main__": main()
