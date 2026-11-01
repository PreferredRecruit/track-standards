"""Coverage of conference championship meets per season and division (Ryan 2026-11-01: confirm we have everything since 2016).
Real conferences only (lists the scraper skips, like performance lists, are left out). Prints a table plus every missing meet
with the closest TFRRS meet the search saw. Usage: python3 conf_coverage.py <conf_champs dir>"""
import glob, json, os, sys
from scrape_conf_champs import SKIP
def main(d):
    T = {}; miss = []
    for f in sorted(glob.glob(os.path.join(d, "*", "*", "*", "*.json"))):
        y, s, dv = f.split(os.sep)[-4:-1]; C = json.load(open(f))
        if SKIP.search(C.get("conf", "")): continue
        k = (y, s); T.setdefault(k, {}).setdefault(dv, [0, 0]); T[k][dv][1] += 1
        if C.get("missing"): miss.append((y, s, dv, C["conf"].strip(), C.get("best")))
        else: T[k][dv][0] += 1
    print("season          D1      D2      D3      NAIA    all")
    for k in sorted(T, reverse=True):
        a = [T[k].get(x, [0, 0]) for x in ("d1", "d2", "d3", "naia")]; tot = [sum(x[0] for x in a), sum(x[1] for x in a)]
        print(f"{k[0]} {k[1]:8}" + "".join(f"{x[0]:>3}/{x[1]:<4}" for x in a) + f"{tot[0]}/{tot[1]} ({100*tot[0]//max(tot[1],1)}%)")
    print(f"\nmissing: {len(miss)}")
    for m in miss: print("  ", *m)
if __name__ == "__main__": main(sys.argv[1])
