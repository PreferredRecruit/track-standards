"""Standards sweep (Ryan 2026-10-19: "make sure all the standards are correct and do a sweep").
Read-only audit of public/data/db.json. Every school's displayed levels (official chart om, manual em, conference line ct)
are checked for:
  MAP    official value not found in the school's own raw chart (off) -> mapping/transcription error
  PARSE  value that can't be read as a mark
  ORDER  levels out of order (Target must be best, then Recruit, then Walk-On)
  RANGE  outside a physical range for the event (wrong units, typo)
  DIV    far from the division's typical mark for that level (likely typo or wrong event)
  GENDER women's mark better than the same school's men's mark at the same level
  PAIR   1500m / 1600m / Mile or 3000m / 3200m that disagree with each other
  YEAR   official chart older than 2024 (site rule: only 2024+ charts)
Usage: python3 scripts/data/audit_standards.py [--json out.json]"""
import json, re, sys, statistics, pathlib
P = pathlib.Path(__file__).resolve().parents[2] / "public/data/db.json"
FIELD = {"High Jump", "Pole Vault", "Long Jump", "Triple Jump", "Shot Put", "Discus", "Hammer", "Javelin"}
LV = ["Target", "Recruit", "Walk-On"]
# physical sanity ranges (seconds or metres), generous: anything outside is a units or typing error
RANGE = {"m": {"100m": (9.8, 12.5), "200m": (19.8, 25.5), "400m": (44, 58), "800m": (104, 140), "1500m": (215, 290), "1600m": (235, 310),
               "Mile": (236, 315), "3000m": (465, 620), "3200m": (500, 680), "5000m": (790, 1080), "10000m": (1650, 2300),
               "110m Hurdles": (13.0, 19.5), "300m Hurdles": (35, 46), "400m Hurdles": (48, 68), "3000m Steeplechase": (500, 760),
               "High Jump": (1.55, 2.40), "Pole Vault": (2.8, 6.0), "Long Jump": (5.2, 8.4), "Triple Jump": (11, 17.5),
               "Shot Put": (9, 22), "Discus": (28, 70), "Hammer": (28, 80), "Javelin": (35, 85)},
         "w": {"100m": (10.8, 14.5), "200m": (22, 30), "400m": (49, 70), "800m": (118, 170), "1500m": (240, 350), "1600m": (265, 370),
               "Mile": (265, 375), "3000m": (520, 760), "3200m": (580, 820), "5000m": (900, 1320), "10000m": (1850, 2800),
               "100m Hurdles": (12.4, 19.5), "300m Hurdles": (39, 56), "400m Hurdles": (54, 82), "3000m Steeplechase": (560, 900),
               "High Jump": (1.35, 2.05), "Pole Vault": (2.2, 4.9), "Long Jump": (4.3, 7.2), "Triple Jump": (9, 14.8),
               "Shot Put": (8, 20), "Discus": (25, 66), "Hammer": (25, 76), "Javelin": (25, 66)}}

_CACHE = {}
def _load_parser(cells):
    """read every mark with the site's own reader (scripts/seo/markparse.mjs) so the audit sees exactly what the site sees"""
    import subprocess, tempfile, os
    todo = [c for c in cells if c not in _CACHE]
    if not todo: return
    js = 'import {parseMark} from "%s";import fs from "fs";const a=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(JSON.stringify(a.map(([s,e])=>parseMark(s,e))));' % (pathlib.Path(__file__).resolve().parents[1] / "seo/markparse.mjs").as_posix()
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as f: f.write(js)
    out = subprocess.run(["node", f.name], input=json.dumps(todo), capture_output=True, text=True, check=True).stdout
    os.unlink(f.name)
    for c, v in zip(todo, json.loads(out)): _CACHE[c] = v
def val(s, e):
    if s is None or str(s).strip() == "": return None
    k = (str(s), e)
    if k not in _CACHE: _load_parser([k])
    return _CACHE[k]

HIGHER = {"Heptathlon", "Decathlon", "Pentathlon", "Weight Throw"}
def better(a, b, e): return a >= b if (e in FIELD or e in HIGHER) else a <= b
def norm(s): return re.sub(r"[^0-9:.'\"m]", "", str(s).replace("’", "'").replace("”", '"').replace("″", '"').replace("′", "'")).rstrip("0").rstrip(".")
EVMAP = {"110mh": "110m Hurdles", "100mh": "100m Hurdles", "300mh": "300m Hurdles", "400mh": "400m Hurdles", "steeple": "3000m Steeplechase",
         "3000m steeple": "3000m Steeplechase", "3000m steeplechase": "3000m Steeplechase", "3k steeple": "3000m Steeplechase"}

def main():
    d = json.load(open(P)); S, CT = d["schools"], d["ct"]
    cells = set()
    for x in S:
        for src in (x.get("om") or {}, x.get("em") or {}):
            for g in src.values():
                for e, row in (g.items() if isinstance(g, dict) else []):
                    for c in row or []:
                        if c: cells.add((str(c), e))
    for v in CT.values():
        for g in v.values():
            for e, row in (g.items() if isinstance(g, dict) else []):
                for c in row or []:
                    if c and c[0]: cells.add((str(c[0]), e))
    _load_parser(sorted(cells))
    # displayed levels per school, same priority as the site: official om > manual em > conference line ct
    def shown(s, g):
        out = {}
        o = (s.get("om") or {}).get(g) or {}
        c = (CT.get(s.get("ck")) or {}).get(g) or {}
        em = (s.get("em") or {}).get(g) if s.get("em") else None
        evs = set(o) | set(em or {}) | set(c)
        for e in evs:
            if e in o and o[e]: out[e] = ("om", [x or "" for x in o[e]])
            elif em is not None:
                if e in em and em[e]: out[e] = ("em", [x or "" for x in em[e]])
            elif e in c and c[e]: out[e] = ("ct", [(x[0] if x else "") for x in c[e]])
        return out
    # division medians per gender/event/level from conference lines + official charts
    pool = {}
    for s in S:
        if s.get("j"): continue
        for g in "mw":
            for e, (src, row) in shown(s, g).items():
                for j, x in enumerate(row[:3]):
                    v = val(x, e)
                    if v: pool.setdefault((s["d"], g, e, j), []).append(v)
    med = {k: statistics.median(v) for k, v in pool.items() if len(v) >= 8}
    issues = []
    def add(s, kind, g, e, msg, src=""):
        issues.append({"school": s["n"], "div": s["d"], "official": bool(s.get("o")), "src": src, "kind": kind, "g": g, "event": e, "msg": msg, "url": s.get("src") or ""})
    for s in S:
        if s.get("j"): continue
        if s.get("o") and s.get("yr") and int(s["yr"]) < 2024: add(s, "YEAR", "", "", f"official chart year {s['yr']}")
        rows = {}
        for g in "mw":
            sh = shown(s, g); rows[g] = sh
            # MAP: every official value must appear in the school's own chart row for that event
            raw = ((s.get("off") or {}).get(g) or {}).get("rows") or []
            rawvals = {}
            for r in raw:
                if not r: continue
                k = str(r[0]).strip(); ev = EVMAP.get(k.lower(), k)
                rawvals.setdefault(ev, set()).update(norm(x) for x in r[1:] if x)
            for e, (src, row) in sh.items():
                nums = [val(x, e) for x in row[:3]]
                for j, x in enumerate(row[:3]):
                    if x and nums[j] is None: add(s, "PARSE", g, e, f"{LV[j]} '{x}' can't be read", src)
                if src == "om" and raw:
                    cand = rawvals.get(e)
                    if cand is None:
                        alt = [k for k in rawvals if k.lower().replace(" ", "") == e.lower().replace(" ", "")]
                        cand = rawvals.get(alt[0]) if alt else None
                    if cand is not None:
                        for j, x in enumerate(row[:3]):
                            if x and norm(x) not in cand: add(s, "MAP", g, e, f"{LV[j]} '{x}' not in the school's chart row {sorted(cand)}", src)
                # ORDER
                idx = [j for j in range(3) if nums[j] is not None]
                for a, b in zip(idx, idx[1:]):
                    if not better(nums[a], nums[b], e): add(s, "ORDER", g, e, f"{LV[a]} {row[a]} is not better than {LV[b]} {row[b]}", src)
                # RANGE
                lo, hi = RANGE[g].get(e, (None, None))
                for j in idx:
                    if lo is not None and not (lo <= nums[j] <= hi): add(s, "RANGE", g, e, f"{LV[j]} {row[j]} outside {lo}-{hi}", src)
                # DIV: far from the division's typical mark at that level
                for j in idx:
                    m = med.get((s["d"], g, e, j))
                    if not m: continue
                    r = (m - nums[j]) / m if e in FIELD else (nums[j] - m) / m   # >0 = worse than typical
                    lim = (.35 if e in FIELD else .15) if s["d"] in ("NCAA D1", "NCAA D2") else (.45 if e in FIELD else .22)
                    if r > lim or r < -lim * .8: add(s, "DIV", g, e, f"{LV[j]} {row[j]} is {abs(r)*100:.0f}% {'worse' if r > 0 else 'better'} than the {s['d']} typical", src)
            # PAIR: 1500 vs 1600 vs Mile (1600 ~ 1500 x 1.08, mile ~ 1500 x 1.08-1.085), 3000 vs 3200 (x 1.07)
            for a, b, f, tol in (("1500m", "Mile", 1.08, .035), ("1500m", "1600m", 1.075, .035), ("3000m", "3200m", 1.07, .04)):
                if a in sh and b in sh:
                    for j in range(3):
                        va, vb = val(sh[a][1][j], a) if j < len(sh[a][1]) else None, val(sh[b][1][j], b) if j < len(sh[b][1]) else None
                        if va and vb and abs(vb / (va * f) - 1) > tol: add(s, "PAIR", g, f"{a}/{b}", f"{LV[j]} {sh[a][1][j]} vs {sh[b][1][j]} (expected ~{vb/va:.3f} -> {f})", sh[b][0])
        # GENDER
        for e in set(rows["m"]) & set(rows["w"]):
            for j in range(3):
                mv = val(rows["m"][e][1][j], e) if j < len(rows["m"][e][1]) else None
                wv = val(rows["w"][e][1][j], e) if j < len(rows["w"][e][1]) else None
                if mv and wv and not better(mv, wv, e) and e not in ("100m Hurdles", "110m Hurdles", "Shot Put", "Discus", "Hammer", "Javelin", "Weight Throw"): add(s, "GENDER", "", e, f"{LV[j]} women {rows['w'][e][1][j]} better than men {rows['m'][e][1][j]}", rows["w"][e][0])
    from collections import Counter
    print("issues by kind:", dict(Counter(i["kind"] for i in issues)))
    print("by source:", dict(Counter((i["kind"], i["src"]) for i in issues)))
    print("schools affected:", len({i["school"] for i in issues}), " official:", len({i["school"] for i in issues if i["official"]}))
    if "--json" in sys.argv: json.dump(issues, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1)
    return issues

if __name__ == "__main__":
    main()
