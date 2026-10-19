"""Standards sweep corrections (Ryan 2026-10-19: "make sure all the standards are correct and do a sweep").
Found by scripts/data/audit_standards.py, each official correction checked against the school's own published chart.
Run once on public/data/db.json (idempotent): python3 scripts/data/sweep_2026_10_19.py [--write]

1. Legacy levels (em) from the old site, no source, some clearly generated (CCC schools 0.3 s apart) or shifted (Seattle U
   women's "5000m" 11:25): schools in a conference that has 2026 conference results now use those results like every other
   school in that conference. The rest use their division's typical levels (step 3), labelled as estimates on the site.
2. Official charts: only cells the school's own chart proves wrong or that sit in the wrong event are changed."""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
P = pathlib.Path(__file__).resolve().parents[2] / "public/data/db.json"

def main(write):
    d = json.load(open(P)); by = {s["n"]: s for s in d["schools"]}; ct = d["ct"]; log = []
    # 1. legacy levels -> the conference's own 2026 results where that conference has them
    for s in d["schools"]:
        if not s.get("em"): continue
        k = f"{s['d']}|{s['c']}"
        if k in ct:
            s["ck"] = k; del s["em"]; s.pop("est", None); log.append(f"{s['n']}: legacy levels -> {k} conference results")
    def om(n, g): return by[n]["om"][g]
    def setc(n, g, e, row, why):
        o = om(n, g)
        if row is None:
            if e in o: del o[e]; log.append(f"{n} {g} {e}: removed ({why})")
        elif o.get(e) != row: o[e] = row; log.append(f"{n} {g} {e}: -> {row} ({why})")
    # 2. official charts
    setc("Arkansas State University", "m", "400m Hurdles", None, "chart's 400H row repeats its 400m row: 47.20/48.30/48.80")
    r = om("The University of North Carolina at Pembroke", "m").get("300m Hurdles")
    if r and r[0] == "54.70": setc("The University of North Carolina at Pembroke", "m", "300m Hurdles", ["", r[1], r[2]], "chart typo: Target 54.70 slower than Walk-On 40.90")
    setc("High Point University", "m", "Hammer", ["200’", "180’", "177’2”"], "chart cells pair 12lb | 16lb in mixed order; the 12lb (high school) mark is the longer of each pair")
    setc("Molloy University", "w", "Discus", None, "chart lists the Scholarship mark (110') below the Walk-On mark (115')")
    r = om("UNLV (University of Nevada, Las Vegas)", "w").get("Triple Jump")
    if r and r[1] == "40-0 / 12.9m": setc("UNLV (University of Nevada, Las Vegas)", "w", "Triple Jump", [r[0], "40-0 / 12.19m", r[2]], "40-0 is 12.19m; chart's 12.9m is a typo")
    r = om("Western Kentucky University", "m").get("5000m")
    if r and "xc" in r[1]: setc("Western Kentucky University", "m", "5000m", [r[0], "", r[2]], "Recruit cell is a cross country 5K time")
    L = "Lafayette College"
    if "Mile" in om(L, "m") and "1600:" in om(L, "m")["Mile"][2]:
        setc(L, "m", "1600m", ["", "", "4:25.00"], "chart cell '1600: 4:25.00; 1500: 4:06.50' split into its events")
        setc(L, "m", "1500m", ["", "", "4:06.50"], "same cell")
        setc(L, "m", "Mile", None, "the chart gives 1600m and 1500m, not the mile")
        setc(L, "w", "1600m", ["", "", "5:18.00"], "chart cell '1600: 5:18.00; 1500: 4:56.00' split into its events")
        setc(L, "w", "1500m", ["", "", "4:56.00"], "same cell")
        setc(L, "w", "Mile", None, "the chart gives 1600m and 1500m, not the mile")
    setc(L, "m", "3000m Steeplechase", ["", "", "9:45"], "chart: '2KS: 6:30; 3KS: 9:45', the 3000m steeple mark is 9:45")
    setc(L, "w", "3000m Steeplechase", None, "chart gives only a 2000m steeple mark (7:30)")
    for g in "mw": setc(L, g, "10000m", None, "chart gives a cross country 5K time, not a 10,000m mark")
    # 2b. chart year labels checked against the documents (2024-dated charts re-checked 2026-10-19: none replaced by a newer chart)
    c = by["The Catholic University of America"]
    if str(c.get("yr")) != "2025": c["yr"] = 2025; log.append("The Catholic University of America: chart year 2024 -> 2025 (document is titled 'Recruiting Standards 2025')")
    # 2c. display name cut off at 30 characters (TFRRS team name kept in "t" so its results still match; old URL kept as an alternate)
    f = by.get("Fashion Institute of Technolog")
    if f:
        f["n"] = "Fashion Institute of Technology"; f["os"] = ["fashion-institute-of-technology-track-standards", "fashion-institute-of-technolog-track-standards"]
        log.append("Fashion Institute of Technology: name was cut off ('Technolog')")
    # 3. (Ryan 2026-10-19 "green to go") schools still on legacy levels (WCC, Sunshine State, CCS, CCC: no conference results) get
    #    their division's typical level (median across the division's conferences, estimates excluded) in the events they list.
    import statistics
    from fix_levels import val as fval, fmt as ffmt, FIELD as FF
    pool = {}
    for k, v in ct.items():
        dv = k.split("|")[0]
        for g in "mw":
            for e, row in (v.get(g) or {}).items():
                for j, c in enumerate(row or []):
                    if c and not (len(c) > 2 and c[2]):
                        x = fval(c[0], e)
                        if x: pool.setdefault((dv, g, e, j), []).append(x)
    med = {k: statistics.median(v) for k, v in pool.items() if len(v) >= 5}
    rules = d.get("rules", {})
    for s in d["schools"]:
        if not s.get("em") or s.get("emdiv"): continue
        for g, evs in s["em"].items():
            for e in list(evs):
                row = []
                for j in range(3):
                    if (rules.get(s["d"]) or [1, 1, 1])[j] is None: row.append(""); continue
                    m = med.get((s["d"], g, e, j)); row.append(ffmt(m, e)[0] if m else "")
                if any(row): evs[e] = row
                else: del evs[e]
        s["emdiv"] = 1; log.append(f"{s['n']}: legacy levels -> {s['d']} typical levels")
    print("\n".join(log)); print(f"\n{len(log)} changes")
    if write: json.dump(d, open(P, "w"), separators=(",", ":"), ensure_ascii=False); print("written", P)

if __name__ == "__main__": main("--write" in sys.argv)
