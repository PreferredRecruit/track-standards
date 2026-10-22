#!/usr/bin/env python3
"""Class of 2027 national lists for the High School tab (Ryan 2026-10-21: "upload all the data we have").
Source: social/carousels/2026-10-14_xc-2027-rankings/ (athletic.net 2026 US HS lists, class of 2027 only; pulled 2026-10-14):
athleticnet_marks.md (track 1600/mile/3200 from junior year, XC 3 miles) + data.csv (XC 5K, ranks 1-10 plus the #50 and #100 marks).
Writes public/data/hs/2026-US27.json and adds US27 to public/data/hs/index.json."""
import csv, json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
SRC = os.path.join(ROOT, "social", "carousels", "2026-10-14_xc-2027-rankings")
OUT = os.path.join(ROOT, "sites", "track-standards", "public", "data", "hs")
STN = {"AL":"Alabama","AZ":"Arizona","CA":"California","CO":"Colorado","DC":"Washington DC","FL":"Florida","GA":"Georgia","IA":"Iowa","IL":"Illinois","IN":"Indiana","LA":"Louisiana","MD":"Maryland","MI":"Michigan","MO":"Missouri","NC":"North Carolina","ND":"North Dakota","NH":"New Hampshire","NJ":"New Jersey","NV":"Nevada","NY":"New York","OR":"Oregon","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VA":"Virginia","WA":"Washington"}
SUF = {"jr", "ii", "iii", "iv"}
def short(n):
    w = [x for x in n.split() if x.lower().strip(".") not in SUF]
    return f"{w[0]} {w[-1][0].upper()}." if len(w) > 1 else (w[0] if w else "")
md = open(os.path.join(SRC, "athleticnet_marks.md")).read()
full, rows = {}, {}
LINE = re.compile(r"^(Boys|Girls)( 1600| mile| 3200)?:\s*(.+)$", re.M)
sec = None
for line in md.splitlines():
    if line.startswith("## XC 3 miles"): sec = "XC 3 Miles (fall 2026)"
    elif line.startswith("## XC 5K"): sec = None
    elif line.startswith("## Track"): sec = "track"
    m = LINE.match(line)
    if not m or not sec: continue
    g = "m" if m.group(1) == "Boys" else "w"
    ev = sec if sec != "track" else {" 1600": "1600m", " mile": "Mile", " 3200": "3200m"}[m.group(2)] + " (spring 2026)"
    out = []
    for k, item in enumerate(m.group(3).split(" · "), 1):
        item = re.sub(r"\s*\(.*?\)\s*$", "", item.strip())
        mm = re.match(r"^(.*?)(?:\s+([A-Z]{2}))?\s+(\d+:\d\d\.\d+)$", item)
        if not mm: continue
        name, st, mark = mm.group(1).strip(), mm.group(2), mm.group(3)
        if st: full[name.split()[-1].lower()] = (name, st)
        else: name, st = full.get(name.lower(), (name, ""))
        out.append([k, short(name), "12" if sec.startswith("XC") else "11", STN.get(st, st), mark, "", []])
    rows.setdefault(g, {})[ev] = out
for r in csv.DictReader(open(os.path.join(SRC, "data.csv"))):
    g = "m" if r["gender"] == "m" else "w"; ev = "XC 5K (fall 2026)"
    nm = short(r["athlete"]) if r["athlete"] else f"{int(r['rank'])}th-best mark in the class"
    team = " · ".join(x for x in [r["school"], r["state"]] if x)
    rows.setdefault(g, {}).setdefault(ev, []).append([int(r["rank"]), nm, r["grade"], team, r["time"], "", []])
order = ["1600m (spring 2026)", "Mile (spring 2026)", "3200m (spring 2026)", "XC 5K (fall 2026)", "XC 3 Miles (fall 2026)"]
data = {"y": 2026, "st": "US27", "label": "Class of 2027 (seniors this school year)",
        "note": "The fastest marks in the class of 2027 nationwide: track from their junior season (spring 2026), cross country from senior fall (fall 2026). Top 10 per list; the 5K list also shows the 50th and 100th-best marks. Source: athletic.net national high school lists (class of 2027 only, other grades removed), pulled Oct 14, 2026. Names show first name and last initial.",
        "g": {g: {e: rows[g][e] for e in order if e in rows.get(g, {})} for g in ("m", "w")}}
json.dump(data, open(os.path.join(OUT, "2026-US27.json"), "w"), separators=(",", ":"))
idx = json.load(open(os.path.join(OUT, "index.json")))
if "US27" not in idx["lists"].setdefault("2026", []): idx["lists"]["2026"].append("US27")
json.dump(idx, open(os.path.join(OUT, "index.json"), "w"), separators=(",", ":"))
print({g: {e: len(v) for e, v in d.items()} for g, d in data["g"].items()}); print(data["g"]["m"]["Mile (spring 2026)"][:3]); print(idx)
