#!/usr/bin/env python3
"""Athlete careers (Ryan 2026-10-23: "my cal poly times arent here"): the athlete view showed only the season and team being
viewed, so transfers and multi-season athletes looked incomplete. This joins every results file by TFRRS athlete id: each
athlete's best mark per event per season, at whatever school, with the national rank where the national list has it.
Output: public/data/career/<id % 512>.dat  gzip JSON {id: {"n": name, "s": [[season key, division, event, mark, wind, team,
  national rank or 0, meet, date, class, gender m|w], ...]}}   (season key like "2023-outdoor"; newest season first)
Usage: python3 scripts/tfrrs/build_career.py [out dir] [rank dir ...]   (default public/data/career from public/data/rank; the
Monday refresh passes its fresh current-season folder after the site's, so this week's marks replace that season's file)"""
import glob, gzip, json, os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "public", "data", "career")
RANKS = sys.argv[2:] or [os.path.join(SITE, "public", "data", "rank")]
DIVS = {"d1": "NCAA D1", "d2": "NCAA D2", "d3": "NCAA D3", "naia": "NAIA", "njcaa": "NJCAA", "nccaa": "NCCAA", "nwac": "NWAC", "uscaa": "USCAA"}
B = 512
FIELD = re.compile(r"Jump|Vault|Put|Throw|Discus|Hammer|Javelin|thlon", re.I)

def val(m):
    s = re.sub(r"[^0-9:.]", "", m or "")
    try: p = [float(x) for x in s.split(":")]
    except ValueError: return None
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1] if len(p) == 2 else p[0]

# one athlete's two spellings of one school ("Boston U." / "Boston University", "App State" / "Appalachian State",
# "NC State" / "North Carolina St.", "Wis.-Milwaukee" / "Milwaukee"). Strict, so real transfers stay apart: no extra trailing words
# (Kansas / Kansas State), different parentheses stay different (Miami (Ohio) / Miami (Fla.)), only system prefixes may lead.
LEAD = {("wis",), ("arkansas",), ("ul",), ("cal", "st"), ("cal", "state")}
def toks(t):
    par = re.findall(r"\(([^)]*)\)", t.lower()); t = re.sub(r"\([^)]*\)", " ", t.lower()).replace("&", " and ")
    w = [x for x in re.split(r"[^a-z0-9]+", t) if x and x not in ("university", "univ", "u")]
    return ["state" if x in ("st", "saint") and i > 0 else x for i, x in enumerate(w)], tuple(re.sub(r"[^a-z]", "", p) for p in par)
def cover(a, b):
    """a (the shorter name) matches the end of b token by token (same word, a 3+ letter prefix, or 2-letter initials of two
    b words); whatever is left at the front of b must be a known system prefix (Wis., Arkansas, UL, Cal St.)"""
    i, j = len(a) - 1, len(b) - 1
    while i >= 0:
        x = a[i]
        if j >= 0 and (b[j] == x or (len(x) >= 3 and (b[j].startswith(x) or x.startswith(b[j])))): i -= 1; j -= 1; continue
        if j >= 1 and len(x) == 2 and x == b[j - 1][0] + b[j][0]: i -= 1; j -= 2; continue
        return False
    return j < 0 or tuple(b[:j + 1]) in LEAD
def same(p, q):
    (a, pa), (b, pb) = toks(p), toks(q)
    # "(OH)" = "(Ohio)", "(IL)" = "(Ill.)": one abbreviation starts the other
    if pa and pb and not (len(pa) == len(pb) and all(x.startswith(y) or y.startswith(x) for x, y in zip(pa, pb))): return False
    if len(a) > len(b): a, b = b, a
    return bool(a) and cover(a, b)

# known renames whose spellings don't match (old TFRRS name -> current)
RENAME = {"Western State": "Western Colorado", "Western Colorado University": "Western Colorado", "Grandview": "Grand View", "ULM": "UL-Monroe",
          "West Virginia Tech": "WVU Tech", "William Jessup": "Jessup", "Metro State": "MSU Denver", "Nebraska-Omaha": "Omaha",
          "Bryant & Stratton (VA)": "Bryant & Stratton (Virginia)", "Mid. Tenn. State": "Middle Tennessee", "Williams Baptist College": "Williams Baptist",
          "Williams Baptist University": "Williams Baptist", "Southwestern Assemblies of God": "Nelson University", "SAGU": "Nelson University",
          "Ranger CC": "Ranger", "Southern New Hampshire": "SNHU", "Wheeling Jesuit": "Wheeling University", "Wheeling": "Wheeling University",
          "Dixie State": "Utah Tech", "Houston Baptist": "Houston Christian", "Humboldt State": "Cal Poly Humboldt", "IUPUI": "IU Indianapolis",
          "TAMU-Commerce": "East Texas A&M", "UL-Lafayette": "Louisiana", "Northwest Christian": "Bushnell", "UMKC": "Kansas City",
          "Cal St. San B'dino": "CSUSB", "Salem Int'l": "Salem (W.V.)", "Bryant & Stratton (VA)": "Bryant & Stratton (Virginia)"}

def main():
    car = {}; seen = {}   # team name -> seasons it appears in
    files = {}
    for rd in RANKS:
        for f in glob.glob(os.path.join(rd, "*.dat")): files[os.path.basename(f)] = f   # a later folder replaces the same season
    for f in [files[k] for k in sorted(files)]:
        k = os.path.basename(f)[:-4]; y, season, div = k.split("-", 2)
        if season == "xc": continue
        d = json.loads(gzip.decompress(open(f, "rb").read()))
        for t in d["teams"]: seen.setdefault(t, set()).add(f"{y}-{season}")
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
                        row = [f"{y}-{season}", DIVS.get(div, div), ev, r[4], r[5], d["teams"][r[3]], nat, d["meets"][r[6]], r[7], r[2], v, g]
                        if cur is None or (v > cur[10] if hi else v < cur[10]) or (v == cur[10] and nat and not cur[6]): a["b"][sk] = row
    # TFRRS renames ("Wis.-Milwaukee" -> "Milwaukee", "Dixie State" -> "Utah Tech"): two names sharing 3+ athletes that never
    # appear in the same season are one school; a name matching more than one other name ("Carroll") is left alone.
    pairs = {}
    for a in car.values():
        ts = sorted({x[5] for x in a["b"].values()})
        for i in range(len(ts)):
            for j in range(i + 1, len(ts)): pairs[(ts[i], ts[j])] = pairs.get((ts[i], ts[j]), 0) + 1
    link = {}
    for (p, q), n in pairs.items():
        if n >= 3 and not (seen.get(p, set()) & seen.get(q, set())): link.setdefault(p, set()).add(q); link.setdefault(q, set()).add(p)
    canon = {}
    for t in link:
        if len(link[t]) > 1 and any(len(link[u]) == 1 for u in link[t]) and len({max(seen[u]) for u in link[t]}) > 1 and not any(seen[u] & seen[v] for u in link[t] for v in link[t] if u < v):
            pass   # a chain of renames (A -> B -> C): resolved below
        elif len(link[t]) > 1: continue
        group, todo = {t}, [t]
        while todo:
            u = todo.pop()
            for v in link.get(u, ()):
                if v not in group and (len(link[v]) == 1 or not any(seen[v] & seen[w] for w in group)): group.add(v); todo.append(v)
        if any(seen[u] & seen[v] for u in group for v in group if u < v): continue
        canon[t] = max(group, key=lambda u: max(seen[u]))
    # TFRRS "* previously at <team>" (social/standards/tfrrs/extract_prev.py): prior schools, including ones without list marks
    pf = os.path.join(SITE, "..", "..", "social", "standards", "tfrrs", "prev_schools.json")
    PREV = json.load(open(pf)) if os.path.exists(pf) else {}
    buckets = {}
    for aid, a in car.items():
        for x in a["b"].values(): x[5] = RENAME.get(x[5], canon.get(x[5], x[5]))
        ts = sorted({x[5] for x in a["b"].values()}, key=lambda t: max(x[0] for x in a["b"].values() if x[5] == t), reverse=True)
        if len(ts) > 1:
            m = {}
            for i, t in enumerate(ts):
                for u in ts[:i]:
                    if same(t, u): m[t] = m.get(u, u); break
            for x in a["b"].values(): x[5] = m.get(x[5], x[5])
        rows = sorted(a["b"].values(), key=lambda x: (x[0], x[2]), reverse=True)
        e = {"n": a["n"], "s": [x[:10] + [x[11]] for x in rows]}   # [..., class, gender]
        if aid in PREV: e["p"] = [RENAME.get(t, canon.get(t, t)) for t, _ in PREV[aid]["prev"]]
        buckets.setdefault(int(aid) % B, {})[aid] = e
    # name search for every athlete 2016-today (Ryan 2026-10-24: Tibbs ran D2 years ago, so the season on screen didn't have him):
    # names/<2 letters>.dat, one file per first-two-letters of each name word: [name, id, school, latest season key, division]
    NB = {}
    for aid, a in car.items():
        last = max(a["b"].values(), key=lambda x: (x[0][:4], x[0].endswith("outdoor")))
        e = [a["n"], aid, RENAME.get(last[5], canon.get(last[5], last[5])), last[0], last[1]]
        for t in {re.sub(r"[^a-z]", "", w)[:2] for w in a["n"].lower().split()}:
            if len(t) == 2: NB.setdefault(t, []).append(e)
    os.makedirs(os.path.join(OUT, "names"), exist_ok=True)
    for t, L in NB.items():
        with open(os.path.join(OUT, "names", t + ".dat"), "wb") as fh: fh.write(gzip.compress(json.dumps(L, separators=(",", ":")).encode(), 9))
    os.makedirs(OUT, exist_ok=True)
    for i, b in buckets.items():
        with open(os.path.join(OUT, f"{i}.dat"), "wb") as fh: fh.write(gzip.compress(json.dumps(b, separators=(",", ":")).encode(), 9))
    print(len(car), "athletes,", len(buckets), "files,", sum(1 for k, v in canon.items() if k != v), "old team names merged,", sum(1 for a in car if a in PREV), "with TFRRS 'previously at' schools")

if __name__ == "__main__": main()
