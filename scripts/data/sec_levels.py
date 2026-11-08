"""SEC levels from the full conference depth (Ryan 2026-11-07: the SEC levels were "too aggressive and unrealistic";
"no way an SEC school is letting anyone slower than a 46.5 join a roster. Anyone running above a 46.9 is definitely not getting in.
Please update the logic to reflect that 46.5 is the hard cutoff").

The old Power 4 rule read the SEC's own TFRRS conference list, which stops at 25 athletes, so its Recruit level (20th) was a
conference finalist mark. This rule ranks every SEC athlete's 2026 outdoor best from the national D1 list (all depth, B squads
included, wind-aided marks left out) and sets each level as a share of the SEC athletes in that event (so thin events like the throws scale with their own depth):
  Target  = the top 10% of SEC athletes in the event
  Recruit = the top 25%
  Walk-On = the top 45% = the roster cutoff. Calibrated on Ryan's anchor: in the men's 400m the 45% line is exactly 46.50
            (42nd of 93 SEC men), and 46.9 would be the top 53%, which he said is "definitely not getting in".
Only events where the national list holds 50+ SEC athletes (the full roster depth: 100m to 5000m) are reset; the national
lists for hurdles, jumps and throws only reach the SEC's best athletes, so percentages there would raise the bar, and those events
keep their old Power 4 levels (Target and Recruit, no Walk-On). Schools with an official posted chart keep it.
Usage: python3 scripts/data/sec_levels.py [SEC|ACC|"Big Ten"|"Big 12" ...] [--write]   (dry run by default)"""
import json, gzip, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB = ROOT / "public/data/db.json"
RANK = ROOT / "public/data/rank/2026-outdoor-d1.dat"
SHARES = (0.10, 0.25, 0.45)
CONFS = {
    "SEC": {"Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Miss State", "Missouri", "Oklahoma", "Ole Miss",
            "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt"},
    # Ryan 2026-11-07 ("send"): same depth rule for the rest of the Power 4.
    "ACC": {"Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami (Fla.)", "NC State",
            "North Carolina", "Notre Dame", "Pittsburgh", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest"},
    "Big Ten": {"Illinois", "Indiana", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern",
                "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin"},
    "Big 12": {"Arizona", "Arizona State", "Baylor", "BYU", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State",
               "Oklahoma State", "TCU", "Texas Tech", "UCF", "Utah", "West Virginia"},
}
EV = {"100 Meters": "100m", "200 Meters": "200m", "400 Meters": "400m", "800 Meters": "800m", "1500 Meters": "1500m",
      "5000 Meters": "5000m", "10,000 Meters": "10000m", "100 Hurdles": "100m Hurdles", "110 Hurdles": "110m Hurdles",
      "400 Hurdles": "400m Hurdles", "3000 Steeplechase": "3000m Steeplechase", "High Jump": "High Jump", "Pole Vault": "Pole Vault",
      "Long Jump": "Long Jump", "Triple Jump": "Triple Jump", "Shot Put": "Shot Put", "Discus": "Discus", "Hammer": "Hammer", "Javelin": "Javelin"}
FIELD = {"High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"}
RUN = {"100m", "200m", "400m", "800m", "1500m", "5000m"}   # full roster depth in the national list; field events would get harder
WINDY = {"100m", "200m", "100m Hurdles", "110m Hurdles", "Long Jump", "Triple Jump"}


def base(team):
    return re.sub(r"\s*\([A-Z]\)$", "", team)


def legal(e, wind):
    if e not in WINDY or not wind:
        return True
    try:
        return float(wind) <= 2.0
    except ValueError:
        return True


def imperial(mark):
    m = float(re.sub(r"[^0-9.]", "", mark))
    q = int(m / 0.0254 * 4) / 4          # round down to the quarter inch, as track results do
    ft, inch = divmod(q, 12)
    s = f"{inch:.2f}".rstrip("0").rstrip(".")
    return f"{int(ft)}' {s}\""


def cell(mark, e):
    mark = re.sub(r"\s*(\(\d\)|[@#*]+)$", "", str(mark)).strip()
    return [mark, imperial(mark)] if e in FIELD else [mark, ""]


def main(write, names):
    d = json.load(gzip.open(RANK))
    db = json.load(open(DB))
    for name in names:
        conf(d, db, name, CONFS[name])
    db["rules"]["SEC"] = [10, 25, 45]   # percent of the conference's athletes in the event (key kept for the app)
    if write:
        json.dump(db, open(DB, "w"), ensure_ascii=False, separators=(",", ":"))
        print("written", DB)


def conf(d, db, name, SEC):
    T = d["teams"]
    nat = next(l for l in d["lists"] if l.get("nat"))
    missing = SEC - {base(t) for t in T}
    if missing:
        print(name, "teams not found in the national list:", missing)
    ct = db["ct"]["NCAA D1|" + name]
    out = []
    for g in ("m", "w"):
        old = ct.get(g, {})
        for le, rows in nat["g"][g].items():
            e = EV.get(le)
            if e not in RUN:
                continue
            sec = [r for r in rows if base(T[r[3]]) in SEC and legal(e, r[5])]
            if len(sec) < 50:
                continue
            lv = [cell(sec[max(1, round(f * len(sec))) - 1][4], e) for f in SHARES]
            out.append((g, e, len(sec), [x and x[0] for x in (old.get(e) or [])], [x[0] for x in lv]))
            old[e] = lv
        ct[g] = old
    ct["rule"] = "sec"
    print("==", name)
    for g, e, n, o, nw in out:
        print(f"{g} {e:20} n={n:<3} {str(o):34} -> {nw}")


if __name__ == "__main__":
    pick = [a for a in sys.argv[1:] if a in CONFS] or list(CONFS)
    main("--write" in sys.argv, pick)
