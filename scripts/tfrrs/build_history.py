#!/usr/bin/env python3
"""Meet-by-meet history (Ryan 2026-10-24: progression "throughout a specific season and across all the years they were in
college"). Every race and attempt series from each cached TFRRS athlete page (social/standards/tfrrs/cache, written consent on file;
fetch_legal.py --all keeps adding pages), individual events only.
Output: public/data/history/<id % 1024>.dat  gzip JSON {id: [[season key, date, meet, event code, mark, wind, place], ...]}
  (season key like "2026-outdoor"; event codes as on TFRRS: 100, 200, 110H, LJ, SP ...; oldest first)
Usage: python3 scripts/tfrrs/build_history.py"""
import gzip, json, os, re
SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_bt = open(os.path.join(SITE, "scripts", "tfrrs", "build_teams.py"), encoding="utf-8").read()
_ns = {"__file__": os.path.join(SITE, "scripts", "tfrrs", "build_teams.py")}; exec(_bt[:_bt.index("\nfor season_dir in")], _ns)
athlete, CACHE = _ns["athlete"], _ns["CACHE"]
OUT = os.path.join(SITE, "public", "data", "history"); B = 1024
MON = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}

def dkey(d):
    """sortable start date of a meet date ("Apr 1- 4, 2026", "May 27-30, 2026", "Feb 28-Mar 1, 2025")"""
    m = re.match(r"([A-Z][a-z]{2})\s*(\d+)", d or ""); y = re.search(r"(\d{4})\s*$", d or "")
    return f"{y.group(1)}-{MON.get(m.group(1), 0):02d}-{int(m.group(2)):02d}" if m and y else ""

def main():
    out, n = {}, 0
    for f in os.listdir(CACHE):
        m = re.match(r"https_tf_tfrrs_org_athletes_(\d+)_", f)
        if not m: continue
        try: h = athlete(open(os.path.join(CACHE, f), encoding="utf-8", errors="ignore").read())[1]
        except Exception: continue
        # a wind reading means the race was outdoors (TFRRS dates alone put mid-March outdoor meets in the indoor season)
        fix = lambda r: r[0].replace("-indoor", "-outdoor") if r[0].endswith("indoor") and re.match(r"^[+-]?\d", r[5] or "") else r[0]
        rows = sorted(([fix(r), dkey(r[1]), r[2], r[3], r[4], r[5], r[6]] for r in h if r[0] and not r[0].endswith("xc") and not re.match(r"4x|DMR|SMR", r[3])), key=lambda r: (r[1], r[0]))
        if rows: out.setdefault(int(m.group(1)) % B, {})[m.group(1)] = rows; n += 1
    os.makedirs(OUT, exist_ok=True)
    for b, d in out.items():
        with open(os.path.join(OUT, f"{b}.dat"), "wb") as fh: fh.write(gzip.compress(json.dumps(d, separators=(",", ":")).encode(), 9))
    print(n, "athletes with meet history,", len(out), "files")

if __name__ == "__main__": main()
