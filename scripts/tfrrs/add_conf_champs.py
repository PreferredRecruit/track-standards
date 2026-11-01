"""Adds conference championship meets (scrape_conf_champs.py) to the season results files, shown in the Results tab the same way as
the national championship (Ryan 2026-10-31): one list per meet, label "<conference> Championships", champ true, conf = the
conference's list label. Each event: the final in finishing order (TFRRS places, ties kept), then everyone else by their best mark at
the meet. Combined-event sub-results and para races are left out, as for nationals. Re-runnable (rewrites every season file).
Usage: python3 add_conf_champs.py <conf_champs dir> <site>/public/data/confmeets"""
import glob, gzip, json, os, re, sys
# same helpers as build_rank.py (that module runs the whole build on import)
def mval(m):
    s = re.sub(r"[^0-9:.]", "", str(m or ""))
    if not s or s.count(".") > 1: return None
    try: p = [float(x) for x in s.split(":")]
    except ValueError: return None
    return p[0] * 60 + p[1] if len(p) == 2 else (p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0])
def hi_ev(ev, mark): return str(mark).strip().lower().endswith("m") or bool(re.search(r"thlon|athlon", ev, re.I))
def better(ev, mark, v, w): return w is None or (v > w if hi_ev(ev, mark) else v < w)
FLOOR = {"60": 6.3, "100": 9.5, "200": 19.1, "400": 43.0, "800": 100, "1500": 205, "mile": 223, "3000": 440, "5000": 755, "10000": 1570,
         "60hurdles": 7.2, "100hurdles": 12.0, "110hurdles": 12.8, "400hurdles": 45.9, "3000steeplechase": 470}
def plausible(ev, v, mark):
    if hi_ev(ev, mark): return v > 0
    k = nk(ev); f = FLOOR.get(k)
    return f is None or v >= f
def nk(x): return re.sub(r"[^a-z0-9]", "", x.lower()).replace("meters", "").replace("relay", "")
def athpath(u):
    m = re.search(r"/athletes/(\d+/[^/?#]+/[^/?#]+?)(?:\.html)?$", u or "")
    return m.group(1) if m else ""

def person(a):
    if "," in a:
        last, first = a.split(",", 1)
        return f"{first.strip()} {last.strip()}"
    return a


def rows_of(C, ev, rounds, tid, meet_i):
    finals = [r for r in rounds if r["round"].lower().startswith("final")] or rounds[:1]
    best = {}
    for r in rounds:
        for row in r["rows"]:
            v = mval(row["mark"])
            if v is None or not row.get("athlete") or not plausible(ev, v, row["mark"]): continue
            k = (row["athlete"].lower(), row["team"].lower())
            if k not in best or better(ev, row["mark"], v, best[k][1]): best[k] = (row, v)
    out, seen = [], set()
    for r in finals:
        for row in sorted(r["rows"], key=lambda x: int(re.sub(r"\D", "", x["place"]) or 999)):
            k = (row["athlete"].lower(), row["team"].lower()); v = mval(row["mark"])
            if k in seen or v is None or not plausible(ev, v, row["mark"]): continue
            seen.add(k); pl = re.sub(r"\D", "", row["place"])
            out.append([int(pl) if pl else len(out) + 1, row, r.get("wind", "")])
    rest = sorted([b for k, b in best.items() if k not in seen], key=lambda t: -t[1] if hi_ev(ev, t[0]["mark"]) else t[1])
    out += [[len(out) + i + 1, t[0], ""] for i, t in enumerate(rest)]
    return [[pl, person(row["athlete"]), row.get("year", ""), tid(row["team"]), row["mark"], row.get("wind") or w, meet_i, C["date"], "", athpath(row.get("athlete_url", ""))] for pl, row, w in out]

ORDER = [r"^55 ", r"^60 Meters", r"^100 Meters", r"^200 ", r"^300 Meters", r"^400 Meters", r"^5[05]0? Hurdles|^55 Hurdles", r"^60 Hurdles", r"^100 Hurdles", r"^110 Hurdles", r"^400 Hurdles",
         r"^500 ", r"^600 ", r"^800 ", r"^1000 ", r"^1500 ", r"^Mile", r"^3000 Meters", r"^5000 ", r"^10,000", r"Steeple", r"4 x 100", r"4 x 200", r"4 x 400", r"4 x 800", r"Relay", r"High Jump", r"Pole Vault", r"Long Jump",
         r"Triple Jump", r"Shot Put", r"Weight Throw", r"Discus", r"Hammer", r"Javelin", r"athlon"]
def ev_order(ev): return next((i for i, x in enumerate(ORDER) if re.search(x, ev)), len(ORDER))

def main(cc_dir, out_dir):
    """one compact file per season: out_dir/<year>-<season>-<div>.dat = gzip {teams, meets, lists}; the site build merges it into that
    season's results file (prerender.mjs mergeConfMeets), after the Monday data, so current and past seasons both carry the meets"""
    os.makedirs(out_dir, exist_ok=True); n_files = n_meets = 0
    for d in sorted(glob.glob(os.path.join(cc_dir, "*", "*", "*"))):
        year, season, div = d.split(os.sep)[-3:]
        D = {"teams": [], "meets": [], "lists": []}; ti = {}
        def tid(t):
            if t not in ti: ti[t] = len(D["teams"]); D["teams"].append(t)
            return ti[t]
        for p in sorted(glob.glob(os.path.join(d, "*.json"))):
            C = json.load(open(p))
            if not C.get("events"): continue
            if C["meet"] not in D["meets"]: D["meets"].append(C["meet"])
            mi = D["meets"].index(C["meet"])
            L = {"id": C["meet"], "label": f"{C['conf']} Championships", "nat": False, "region": False, "champ": True, "conf": C["conf"], "url": C["url"], "g": {}}
            merged = {}
            for ev0, sides in C["events"].items():
                if re.search(r"top|para|wheelchair|ambulatory|unified", ev0, re.I): continue
                for g, rounds in sides.items(): merged.setdefault(ev0, {}).setdefault(g, []).extend(rounds)
            for ev, sides in merged.items():
                for g, rounds in sides.items():
                    R = rows_of(C, ev, rounds, tid, mi)
                    if R: L["g"].setdefault(g, {})[ev] = R
            for g in L["g"]: L["g"][g] = dict(sorted(L["g"][g].items(), key=lambda kv: ev_order(kv[0])))
            if L["g"]: D["lists"].append(L)
        if not D["lists"]: continue
        D["lists"].sort(key=lambda L: L["label"])
        with gzip.open(os.path.join(out_dir, f"{year}-{season}-{div}.dat"), "wb", compresslevel=9) as o: o.write(json.dumps(D, separators=(",", ":")).encode())
        n_files += 1; n_meets += len(D["lists"])
    print(f"conference meets: {n_meets} in {n_files} season files")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
