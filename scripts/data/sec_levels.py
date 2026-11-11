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
SHARES = (0.10, 0.25)   # Ryan 2026-11-07: no Walk-On level for Power 4 (only a handful of case-by-case spots)
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


TARGET_RANK, RECRUIT_RANK = 8, 15
ANCHORS = {("Big Ten", "m", "110m Hurdles"): (["13.66", ""], ["13.90", ""]),   # Ryan 2026-11-07 ("13.9 and hs 13.7")
           ("Big Ten", "m", "High Jump"): (None, ["2.08m", "6' 10\""]),        # Ryan 2026-11-07 ("closer to 6'10")
           ("SEC", "m", "400m"): (None, ["45.77", ""]),                        # Ryan 2026-11-11 ("Keep the 45.77 mark")
           ("Big 12", "m", "Triple Jump"): (None, "rank10"),                   # Ryan 2026-11-11 ("use the top ten mark")
           ("SEC", "m", "Javelin"): ("rank4", "rank8")}                        # Ryan 2026-11-11 ("based on the eighth place throw"); Target moves to 4th to stay above


def p4_rank(d, db, verbose=True):
    """ONE rule for every Power 4 event (Ryan 2026-11-11: "the standards must be consistent across the board ... It does not make
    sense for some Power Four standards to be easier than mid-majors"). From the full-depth national D1 list, each conference's own
    athletes' 2026 bests: Target = the 8th best mark in the conference, Recruit = the 15th best. Every Power 4 conference has 16+
    athletes on the list in every event, so the rank always exists. Season bests include wind-aided marks, like the conference lists.
    Guardrail: a Power 4 level is never easier than the toughest non-Power-4 D1 conference's level in that event.
    No Walk-On level (Power 4 walk-on spots are a handful, case by case). Ryan's anchors win over the rule."""
    T = d["teams"]; nat = next(l for l in d["lists"] if l.get("nat")); ct = db["ct"]
    def num(c, e):
        if not c: return None
        m = re.sub(r"[^0-9:.]", "", str(c[0]))
        if not m: return None
        q = [float(x) for x in m.split(":")]
        return q[0] * 60 + q[1] if len(q) == 2 else q[0]
    rows_out = []
    for g in ("m", "w"):
        for le, e in EV.items():
            rows = nat["g"][g].get(le)
            if not rows: continue
            f = e in FIELD; harder = (lambda a, b: a > b) if f else (lambda a, b: a < b)
            mid = [ct[k][g][e] for k in ct if k.startswith("NCAA D1|") and k.split("|")[1] not in CONFS and (ct[k].get(g) or {}).get(e)]
            floor = [None, None]
            for i in (0, 1):
                vals = [(num(c[i], e), c[i]) for c in mid if len(c) > i and c[i] and num(c[i], e)]
                if vals: floor[i] = max(vals, key=lambda x: x[0]) if f else min(vals, key=lambda x: x[0])
            for name, S in CONFS.items():
                key = "NCAA D1|" + name
                if key not in ct: continue
                mine = [r for r in rows if base(T[r[3]]) in S]
                use = mine   # every athlete's season best, wind included: a wind-legal filter drops anyone whose best was windy
                             # (28% of SEC men's 100m, 56% of Big Ten), which skewed conferences against each other
                if len(use) < RECRUIT_RANK: continue
                old = (ct[key].get(g) or {}).get(e)
                lv = [cell(use[TARGET_RANK - 1][4], e), cell(use[RECRUIT_RANK - 1][4], e)]
                note = ""
                for i in (0, 1):
                    if floor[i] and harder(floor[i][0], num(lv[i], e)):
                        lv[i] = list(floor[i][1]) if isinstance(floor[i][1], list) else [floor[i][1], ""]; note += f" floor{i}"
                an = ANCHORS.get((name, g, e))
                if an:
                    pick = lambda x: cell(use[int(x[4:]) - 1][4], e) if isinstance(x, str) and x.startswith("rank") else x
                    lv = [pick(an[0]) or lv[0], pick(an[1]) or lv[1]]; note += " anchor"
                ct[key].setdefault(g, {})[e] = lv + [None]
                rows_out.append((name, g, e, len(use), [x and x[0] for x in (old or [])][:2], [lv[0][0], lv[1][0]], note))
    for name in CONFS: ct["NCAA D1|" + name]["rule"] = "sec"
    db["rules"]["SEC"] = [TARGET_RANK, RECRUIT_RANK, None]
    if verbose:
        for r in rows_out: print(f"{r[0]:8} {r[1]} {r[2]:20} n={r[3]:<4} {str(r[4]):30} -> {r[5]}{r[6]}")
    return rows_out


def main(write, names):
    if "--rank" in sys.argv:
        d = json.load(gzip.open(RANK)); db = json.load(open(DB))
        p4_rank(d, db)
        if write:
            json.dump(db, open(DB, "w"), ensure_ascii=False, separators=(",", ":")); print("written", DB)
        return
    d = json.load(gzip.open(RANK))
    db = json.load(open(DB))
    for name in names:
        conf(d, db, name, CONFS[name])
    db["rules"]["SEC"] = [10, 25, None]
    if "Big Ten" in names:
        big_ten_men_field(d, db)   # percent of the conference's athletes in the event (key kept for the app)
    if write:
        json.dump(db, open(DB, "w"), ensure_ascii=False, separators=(",", ":"))
        print("written", DB)


def big_ten_men_field(d, db):
    """Ryan 2026-11-07 (Oregon review): Big Ten men's hurdles and jumps Recruit levels were too soft ("it's faster in the Big Ten
    for sure"; high jump "closer to 6'10\""). Recruit = the 15th best Big Ten mark of 2026 on the national list (hurdles wind-legal;
    triple jump all conditions, approved at 15.13m = 49' 7.75"); high jump uses Ryan's 6' 10" anchor (2.08m). Target unchanged."""
    T = d["teams"]
    nat = next(l for l in d["lists"] if l.get("nat"))
    ct = db["ct"]["NCAA D1|Big Ten"]["m"]
    for le, legal_only in (("110 Hurdles", True), ("400 Hurdles", True), ("Triple Jump", False)):
        e = EV[le]
        rows = [r for r in nat["g"]["m"][le] if base(T[r[3]]) in CONFS["Big Ten"] and (not legal_only or legal(e, r[5]))]
        old = ct[e][1][0]
        ct[e][1] = cell(rows[14][4], e)
        print("Big Ten m", e, "Recruit", old, "->", ct[e][1][0])
    ct["110m Hurdles"][1] = ["13.90", ""]   # Ryan 2026-11-07: "still too soft ... 13.9 and hs 13.7"
    ct["110m Hurdles"][0] = ["13.66", ""]   # Target must stay faster than Recruit: 3rd best Big Ten mark of 2026
    print("Big Ten m 110m Hurdles Recruit -> 13.90 (Ryan)")
    old = ct["High Jump"][1][0]
    ct["High Jump"][1] = ["2.08m", "6' 10\""]
    print("Big Ten m High Jump Recruit", old, "-> 2.08m (6' 10\")")


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
            lv = [cell(sec[max(1, round(f * len(sec))) - 1][4], e) for f in SHARES] + [None]
            out.append((g, e, len(sec), [x and x[0] for x in (old.get(e) or [])], [x and x[0] for x in lv]))
            old[e] = lv
        ct[g] = old
    ct["rule"] = "sec"
    print("==", name)
    for g, e, n, o, nw in out:
        print(f"{g} {e:20} n={n:<3} {str(o):34} -> {nw}")


if __name__ == "__main__":
    pick = [a for a in sys.argv[1:] if a in CONFS] or list(CONFS)
    main("--write" in sys.argv, pick)
