#!/usr/bin/env python3
"""High school rankings for the site (Ryan 2026-10-21: "just do highschool tab it can switch to").
Reads the checked athletic.net lists (social/standards/athleticnet/checked/*.checked.json, made by check_hs.py) and writes
public/data/hs/<year>-<ST>.json + public/data/hs/index.json. Only rows labelled ok or flag are published; ranks are recounted
inside the state. Names are first name + last initial (athletes are mostly minors)."""
import glob, json, os, re
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(SITE, "..", "..", "social", "standards", "athleticnet", "checked")
OUT = os.path.join(SITE, "public", "data", "hs"); os.makedirs(OUT, exist_ok=True)
SUF = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}
EVN = {"100m": "100m", "200m": "200m", "400m": "400m", "800m": "800m", "1500m": "1500m", "1600m": "1600m", "3000m": "3000m", "3200m": "3200m",
       "5000m": "5000m", "110mH": "110m Hurdles", "100mH": "100m Hurdles", "300mH": "300m Hurdles", "4x100m": "4x100 Relay", "4x200m": "4x200 Relay",
       "4x400m": "4x400 Relay", "hj": "High Jump", "pv": "Pole Vault", "lj": "Long Jump", "tj": "Triple Jump", "shot": "Shot Put", "discus": "Discus",
       "hammer": "Hammer", "javelin": "Javelin", "decathlon": "Decathlon", "heptathlon": "Heptathlon"}
ORDER = list(EVN)
def short(n):
    n = re.sub(r"\(.*?\)", " ", n).split()
    if not n: return ""
    first = n[0].title() if n[0].isupper() else n[0]
    rest = [w for w in n[1:] if w.lower() not in SUF]
    return f"{first} {rest[-1][0].upper()}." if rest else first
def tags(why):
    t = []
    if any("club" in w for w in why): t.append("club")
    if any("wind-aided" in w for w in why): t.append("wind")
    if any("no wind" in w for w in why): t.append("no wind")
    if any("hand" in w for w in why): t.append("hand")
    return t
idx = {}
for f in sorted(glob.glob(os.path.join(SRC, "*.checked.json"))):
    m = re.search(r"(\d{4})-outdoor-([A-Z]{2})", os.path.basename(f))
    if not m: continue
    y, st = m.group(1), m.group(2); D = json.load(open(f)); out = {"y": int(y), "st": st, "g": {"m": {}, "w": {}}}
    for key, L in D.items():
        _, g, ev = key.split("/"); g = "w" if g == "f" else g
        rows, k = [], 0
        for r in L["rows"]:
            if r["label"] not in ("ok", "flag"): continue
            k += 1; rows.append([k, short(r["name"]), r["grade"], r["team"], r["mark"], r["wind"], tags(r["why"])])
        if rows: out["g"][g][EVN.get(ev, ev)] = rows
    for g in out["g"]: out["g"][g] = dict(sorted(out["g"][g].items(), key=lambda kv: ORDER.index(next((a for a, b in EVN.items() if b == kv[0]), kv[0])) if kv[0] in EVN.values() else 99))
    json.dump(out, open(os.path.join(OUT, f"{y}-{st}.json"), "w"), separators=(",", ":"))
    idx.setdefault(y, []).append(st)
json.dump({"lists": idx, "note": "athletic.net performance lists, checked by Preferred Recruit"}, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
print(idx)
