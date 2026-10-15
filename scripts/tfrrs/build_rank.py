"""Package scraped TFRRS performance lists into one lazy-loaded JSON per (year, season, division) for the
College Track Results page of the standards front-page mockup. Writes rank/<key>.json + rank_index.json.
Row = [place, athlete "First Last", class year, team idx, mark, wind, meet idx, date]; teams/meets are string tables."""
import json, os, glob, re
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("TFRRS_LISTS", os.path.join(HERE, "lists"))
DIVS = {"d1": "NCAA D1", "d2": "NCAA D2", "d3": "NCAA D3", "naia": "NAIA", "njcaa": "NJCAA", "nccaa": "NCCAA", "nwac": "NWAC", "uscaa": "USCAA"}
OUT = os.environ.get("RANK_OUT", os.path.join(HERE, "rank"))
os.makedirs(OUT, exist_ok=True)
CHAMPS = os.environ.get("TFRRS_CHAMPS", os.path.join(HERE, "champs"))
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

def label(name):
    n = re.sub(r"_(Outdoor|Indoor)?_?Performance_List$", "", name)
    n = re.sub(r"^\d{4}_(\d{4}_)?", "", n).replace("_", " ").replace(" FINAL", "")
    return n

def national(name):
    # cross country (scrape_xc.py): the national championship meet is the division's main list; regions/conferences are not
    if "Cross_Country" in name: return bool(re.search(r"^(NCAA_Division_I+|NAIA|NJCAA_Division_I+)_Cross_Country_Championships$", name))
    return bool(re.search(r"Qualifying|Division_I_Indoor_List|All_Schools|^\d{4}_NAIA", name)) and not re.search(r"East|West|NJCAA_DIII", name)

def person(a):
    if "," in a:
        last, first = a.split(",", 1)
        return f"{first.strip()} {last.strip()}"
    return a

index = []
for d in sorted(glob.glob(os.path.join(SRC, "*", "*", "*"))):
    year, season, div = d.split(os.sep)[-3:]
    files = sorted(glob.glob(os.path.join(d, "*.json")))
    if not files: continue
    teams, meets, ti, mi = [], [], {}, {}
    def tid(s, arr, idx):
        if s not in idx: idx[s] = len(arr); arr.append(s)
        return idx[s]
    lists = {}
    for f in files:
        base = os.path.basename(f)[:-5]; name, g = base[:-2], base[-1]
        j = json.load(open(f))
        ev = {}
        for e, rows in j["events"].items():
            ev[e] = [[r.get("place"), person(r.get("athlete", "")), r.get("year", ""), tid(r.get("team", ""), teams, ti),
                      r.get("mark", ""), r.get("wind", ""), tid(r.get("meet", ""), meets, mi), r.get("date", ""), (r.get("conv") or "").strip(), (re.search(r"/athletes/(\d+/[^/?#]+/[^/?#]+)", (r.get("links") or {}).get("athletes") or "") or [None, ""])[1]] for r in rows]
        L = lists.setdefault(name, {"label": label(name), "nat": national(name), "region": "Region" in name, "g": {}})
        L["g"]["m" if g == "m" else "w"] = ev
    # --- national championship results (Ryan 2026-10-13: final lists close before nationals; TFRRS has the meets) ---
    cp = os.path.join(CHAMPS, year, season, div + ".json")
    if os.path.exists(cp):
        C = json.load(open(cp)); mi_c = tid(C["meet"], meets, mi)
        champ = {"label": f"{DIVS.get(div, div.upper())} Championships", "nat": False, "region": False, "champ": True, "g": {}}
        nat = next((n for n in lists if lists[n]["nat"]), None)
        merged_ev = {}
        for ev0, sides in C["events"].items():
            if re.search(r"top|para|wheelchair|ambulatory|unified", ev0, re.I): continue      # combined-event sub-results / para races
            m100 = re.match(r"^(men|women)\s+(\d+)\s*m$", ev0.strip(), re.I)
            for g, rounds in sides.items():
                ev = (m100.group(2) + " Meters") if m100 else ev0
                gg = ("w" if m100.group(1).lower() == "women" else "m") if m100 else g
                merged_ev.setdefault(ev, {}).setdefault(gg, []).extend(rounds)
        for ev, sides in merged_ev.items():
            for g, rounds in sides.items():
                finals = [r for r in rounds if r["round"].lower().startswith("final")] or rounds[:1]
                best = {}
                for r in rounds:
                    for row in r["rows"]:
                        v = mval(row["mark"])
                        if v is None or not row.get("athlete") or not plausible(ev, v, row["mark"]): continue
                        k = (row["athlete"].lower(), row["team"].lower())
                        if k not in best or better(ev, row["mark"], v, best[k][1]): best[k] = (row, v, r)
                rows_c, seen = [], set()
                for r in finals:
                    for row in sorted(r["rows"], key=lambda x: int(re.sub(r"\D", "", x["place"]) or 999)):
                        k = (row["athlete"].lower(), row["team"].lower())
                        if k in seen or mval(row["mark"]) is None or not plausible(ev, mval(row["mark"]), row["mark"]): continue
                        seen.add(k); rows_c.append(row)
                rest = sorted([b2 for k, b2 in best.items() if k not in seen], key=lambda t: t[1] if not hi_ev(ev, t[0]["mark"]) else -t[1])
                rows_c += [t[0] for t in rest]
                mk = lambda row, i: [i + 1, row["athlete"], row.get("year", ""), tid(row["team"], teams, ti), row["mark"], row.get("wind", ""), mi_c, C["date"], "", athpath(row.get("athlete_url", ""))]
                champ["g"].setdefault(g, {})[ev] = [mk(r, i) for i, r in enumerate(rows_c)]
                # merge best championship marks into the national list, re-ranked
                if nat:
                    E = lists[nat]["g"].setdefault(g, {}); ek = next((x for x in E if nk(x) == nk(ev)), None)
                    if ek:
                        cur = {(r[1].lower(), teams[r[3]].lower()): r for r in E[ek]}
                        legal = {}
                        for r in rounds:
                            for row in r["rows"]:
                                v = mval(row["mark"]); w = re.sub(r"[^0-9.+-]", "", str(row.get("wind") or ""))
                                if v is None or not row.get("athlete") or not plausible(ev, v, row["mark"]): continue
                                # TFRRS lists include wind-aided marks (wind shown), so championship marks are merged the same way
                                k = (row["athlete"].lower(), row["team"].lower())
                                if k not in legal or better(ev, row["mark"], v, legal[k][1]): legal[k] = (row, v, r)
                        for k, (row, v, r) in legal.items():
                            old = cur.get(k)
                            if old is None or better(ev, row["mark"], v, mval(old[4])):
                                cur[k] = mk(row, 0)
                        allr = [r for r in cur.values() if mval(r[4]) is not None]
                        allr.sort(key=lambda r: -mval(r[4]) if hi_ev(ev, r[4]) else mval(r[4]))
                        E[ek] = [[i + 1] + r[1:] for i, r in enumerate(allr[:max(len(E[ek]), 50)])]
        lists[C["meet"]] = champ
    # preview size budget (artifact <= 256 MB): history years keep national + championships in full, conference lists top 25, no region lists
    if os.environ.get("PREVIEW_TRIM") and int(year) < 2025:
        for n in list(lists):
            L0 = lists[n]
            if L0["region"]: del lists[n]; continue
            if not L0["nat"] and not L0.get("champ"):
                for g0 in L0["g"]:
                    for e0 in L0["g"][g0]: L0["g"][g0][e0] = L0["g"][g0][e0][:25]
    key = f"{year}-{season}-{div}"
    order = sorted(lists, key=lambda n: (not lists[n]["nat"], not lists[n].get("champ"), lists[n]["region"], lists[n]["label"]))
    out = {"teams": teams, "meets": meets, "lists": [dict(id=n, **lists[n]) for n in order]}
    p = os.path.join(OUT, key + ".json")
    json.dump(out, open(p, "w"), separators=(",", ":"))
    index.append({"key": key, "year": year, "season": season, "div": DIVS.get(div, div.upper()), "n": len(lists)})
    print(key, len(lists), "lists", os.path.getsize(p) // 1024, "KB")
json.dump(index, open(os.path.join(OUT, "rank_index.json"), "w"))
