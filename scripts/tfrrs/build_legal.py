#!/usr/bin/env python3
"""Wind-legal bests for the wind toggle (Ryan 2026-10-22). For every wind-aided row (wind > +2.0) in a wind event of an outdoor
results file, the athlete's best LEGAL mark of that season, read from their cached TFRRS athlete page
(social/standards/tfrrs/fetch_legal.py fetches them; written consent on file).
Output: public/data/legal/<year>-outdoor-<div>.json  {"m"|"w": {list event: {athlete path: [mark, wind, meet, date] | 0}}}
  0 = page read, no legal mark that season (wind over +2.0 every time); athletes whose page isn't cached yet are left out
  (the site hides those rows and says how many). A mark with no wind reading counts only if there is no legal reading: wind "NWI".
Usage: python3 scripts/tfrrs/build_legal.py [rank dir] [out dir]   (default public/data/rank -> public/data/legal)
Weekly refresh (GitHub, no page cache): TFRRS_CACHE=scripts/tfrrs/cache, LEGAL_BASE=public/data/legal (reuse what we shipped),
LEGAL_FETCH=<n> (fetch at most n new athlete pages, politely, via scrape_lists.get)."""
import glob, gzip, html, json, os, re, sys
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# the athlete-page parser from build_teams.py (its definitions only: importing it would rebuild every roster file)
_bt = open(os.path.join(SITE, "scripts", "tfrrs", "build_teams.py"), encoding="utf-8").read()
_ns = {"__file__": os.path.join(SITE, "scripts", "tfrrs", "build_teams.py")}; exec(_bt[:_bt.index("\nfor season_dir in")], _ns)
athlete = _ns["athlete"]; CACHE = os.environ.get("TFRRS_CACHE") or _ns["CACHE"]
BASE, FETCH = os.environ.get("LEGAL_BASE"), int(os.environ.get("LEGAL_FETCH") or 0); fetched = [0]
RANK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, "public", "data", "rank")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SITE, "public", "data", "legal")
os.makedirs(OUT, exist_ok=True)
EV = {"100 Meters": "100", "200 Meters": "200", "100 Hurdles": "100H", "110 Hurdles": "110H", "Long Jump": "LJ", "Triple Jump": "TJ"}
FIELD = {"LJ", "TJ"}
key = lambda u: os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", u)[-180:] + ".html")

def wind(w):
    try: return float(w)
    except (TypeError, ValueError): return None

def val(m):
    s = re.sub(r"[^0-9:.]", "", m or "")
    try: p = [float(x) for x in s.split(":")]
    except ValueError: return None
    return p[0] * 60 + p[1] if len(p) == 2 else p[0]

HIST = {}
def hist(path):
    if path not in HIST:
        f = key(f"https://tf.tfrrs.org/athletes/{html.unescape(path)}.html")
        if not os.path.exists(f) and fetched[0] < FETCH:
            sys.path.insert(0, os.path.join(SITE, "scripts", "tfrrs")); from scrape_lists import get
            try: get(f"https://tf.tfrrs.org/athletes/{html.unescape(path)}.html"); fetched[0] += 1
            except Exception as e: print("  fetch failed", path, e)
        HIST[path] = athlete(open(f, encoding="utf-8").read())[1] if os.path.exists(f) else None
    return HIST[path]

def legal_best(path, year, code):
    h = hist(path)
    if h is None: return None
    rows = [r for r in h if r[0] == f"{year}-outdoor" and r[3] == code and val(r[4])]
    ok = [r for r in rows if wind(r[5]) is not None and wind(r[5]) <= 2.0] or [r for r in rows if wind(r[5]) is None]
    if not ok: return 0
    b = (max if code in FIELD else min)(ok, key=lambda r: val(r[4]))
    return [b[4], b[5] if wind(b[5]) is not None else "NWI", b[2], b[1]]

def main():
    tot = got = 0
    for f in sorted(glob.glob(os.path.join(RANK, "*-outdoor-*.dat"))):
        k = os.path.basename(f)[:-4]; year = k[:4]
        d = json.loads(gzip.decompress(open(f, "rb").read()))
        out = {}; prior = {}
        if BASE and os.path.exists(os.path.join(BASE, k + ".json")): prior = json.load(open(os.path.join(BASE, k + ".json")))
        for l in d["lists"]:
            for g in "mw":
                for ev, rows in (l["g"].get(g) or {}).items():
                    if ev not in EV: continue
                    for r in rows:
                        w = wind(r[5])
                        if w is None or w <= 2.0 or not r[9]: continue
                        slot = out.setdefault(g, {}).setdefault(ev, {})
                        if r[9] in slot: continue
                        tot += 1; b = legal_best(r[9], year, EV[ev])
                        if b is None: b = ((prior.get(g) or {}).get(ev) or {}).get(r[9])
                        if b is not None: slot[r[9]] = b; got += 1
        json.dump(out, open(os.path.join(OUT, k + ".json"), "w"), separators=(",", ":"))
    print(f"{got}/{tot} wind-aided athlete-events resolved" + (f", {fetched[0]} pages fetched" if FETCH else ""))

if __name__ == "__main__": main()
