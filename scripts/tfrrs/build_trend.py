#!/usr/bin/env python3
"""Year-by-year trend summary for the Recruiting AI (Ryan 2026-10-24: "make it really good without an anthropic key"; e.g. "how has the
D1 men's 100m changed since 2016?"). From every national list: the mark at 1st, 10th, 25th, 50th, 100th and 250th place, and how many
athletes have a mark. Output: public/data/rank_trend.json {"<div>|<season>|<g>|<event>": {"<year>": [n, m1, m10, m25, m50, m100, m250]}}
Usage: python3 scripts/tfrrs/build_trend.py   (build_full.sh runs it)"""
import glob, gzip, json, os
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = {}
for f in sorted(glob.glob(os.path.join(SITE, "public", "data", "rank", "*.dat"))):
    y, season, div = os.path.basename(f)[:-4].split("-", 2)
    if season == "xc": continue
    d = json.loads(gzip.decompress(open(f, "rb").read()))
    nat = next((l for l in d["lists"] if l.get("nat")), None)
    if not nat: continue
    for g, E in nat["g"].items():
        for ev, rows in E.items():
            if "Relay" in ev: continue
            out.setdefault(f"{div}|{season}|{g}|{ev}", {})[y] = [len(rows)] + [rows[p - 1][4] if len(rows) >= p else None for p in (1, 10, 25, 50, 100, 250)]
json.dump(out, open(os.path.join(SITE, "public", "data", "rank_trend.json"), "w"), separators=(",", ":"))
print(len(out), "division/season/gender/event series")
