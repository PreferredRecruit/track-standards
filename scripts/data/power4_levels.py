"""Power 4 levels (Ryan 2026-10-22: "remove the walk-on category entirely ... recruit between 15 to 25 ... target the top 8 to 10";
the old SEC men's high jump Walk-On of 6-2 was the 25th and last jumper on the whole conference list).
For the ACC, Big Ten, Big 12 and SEC, from each conference's 2026 outdoor TFRRS performance list:
  Target  = the middle mark of the 8th-10th best (9th)
  Recruit = the middle mark of the 15th-25th best (20th; a list shorter than 25 uses the middle of 15th-last)
  Walk-On = none
Schools with an official posted chart keep it exactly as published, Walk-On tier included (Ryan 2026-10-22); this only sets the
conference levels used by every other Power 4 school. Usage: python3 scripts/data/power4_levels.py [--write]   (dry run by default)"""
import json, sys, pathlib, statistics
ROOT = pathlib.Path(__file__).resolve().parents[2]
P = ROOT / "public/data/db.json"
LISTS = ROOT.parents[1] / "social/standards/tfrrs/lists/2026/outdoor/d1"
P4 = {"ACC": "ACC", "Big Ten": "Big_Ten", "Big 12": "Big_12", "SEC": "SEC"}
EV = {"100 Meters": "100m", "200 Meters": "200m", "400 Meters": "400m", "800 Meters": "800m", "1500 Meters": "1500m",
      "5000 Meters": "5000m", "10,000 Meters": "10000m", "100 Hurdles": "100m Hurdles", "110 Hurdles": "110m Hurdles",
      "400 Hurdles": "400m Hurdles", "3000 Steeplechase": "3000m Steeplechase", "High Jump": "High Jump", "Pole Vault": "Pole Vault",
      "Long Jump": "Long Jump", "Triple Jump": "Triple Jump", "Shot Put": "Shot Put", "Discus": "Discus", "Hammer": "Hammer", "Javelin": "Javelin"}
FIELD = {"High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"}
def mid(rows, a, b):  # middle row of places a..b (1-based list positions, ties counted as separate athletes)
    band = rows[a - 1:b]
    return band[(len(band) - 1) // 2] if band else None
def cell(r, e):
    return [r["mark"], r.get("conv") or ""] if e in FIELD else [r["mark"], ""]
def main(write):
    d = json.load(open(P)); out = []
    for c, f in P4.items():
        ct = d["ct"]["NCAA D1|" + c]
        for g, gf in (("m", "m"), ("w", "f")):
            j = json.load(open(LISTS / f"{f}_Outdoor_Performance_List_{gf}.json"))
            new = {}
            for le, rows in j["events"].items():
                e = EV.get(le)
                if not e or len(rows) < 15: continue
                t, r = mid(rows, 8, 10), mid(rows, 15, 25)
                new[e] = [cell(t, e), cell(r, e), None]
            old = ct.get(g, {})
            for e in sorted(set(old) | set(new)):
                o = old.get(e); n = new.get(e)
                if n is None and o: n = [o[0], o[1], None]   # list too short this season: keep Target/Recruit, drop Walk-On
                if n: out.append((c, g, e, [x and x[0] for x in (o or [])], [x and x[0] for x in n])); old[e] = n
            ct[g] = old
        ct["rule"] = "p4"
    d["rules"]["P4"] = [9, 20, None]
    for c, g, e, o, n in out: print(f"{c:8} {g} {e:20} {str(o):40} -> {n}")
    if write: json.dump(d, open(P, "w"), ensure_ascii=False, separators=(",", ":")); print("written", P)
if __name__ == "__main__": main("--write" in sys.argv)
