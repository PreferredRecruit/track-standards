"""Team scores for every meet page, checked against the official totals (Ryan 2026-11-07: "accurately calculates track meet
scoring ... cross-reference our calculated team scores with official meet results").
For each meet in public/data/meets/<id>.dat: read the official TEAM SCORES tables on the TFRRS meet page (cached, polite fetcher),
score the finals ourselves under each common scoring system, and keep the system that reproduces the official table.
Only meets with an official table get scores on the site (unscored invitationals show none, so we never publish a made-up total).
Output public/data/meets/scores/<id>.json = {g: {"sys": "10-8-6-5-4-3-2-1", "t": [[team, official, ours], ...], "ok": true|false}} and scores-check.json (flags).
ok=false (DQs, rescoring, relay-only splits) means the page shows the official total and the meet is listed in _flags for review.
Usage: python3 meet_scores.py <site>/public/data/meets"""
import collections, gzip, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape_champs import get
from fetch_teamscores import scores as official

SYSTEMS = {"10-8-6-5-4-3-2-1": [10, 8, 6, 5, 4, 3, 2, 1], "10-8-6-4-2-1": [10, 8, 6, 4, 2, 1],
           "12-10-8-7-6-5-4-3-2-1": [12, 10, 8, 7, 6, 5, 4, 3, 2, 1], "9-7-6-5-4-3-2-1": [9, 7, 6, 5, 4, 3, 2, 1],
           "8-6-4-2-1": [8, 6, 4, 2, 1], "5-3-1": [5, 3, 1], "6-4-3-2-1": [6, 4, 3, 2, 1], "7-5-4-3-2-1": [7, 5, 4, 3, 2, 1]}

def final_rows(rounds):
    fin = [r for r in rounds if re.match(r"final", r[0], re.I)]
    return (fin or rounds[:1])[0][2] if rounds else []

def ours(ev, g, P, relay_x=1):
    T = collections.Counter()
    for e, sides in ev.items():
        rows = final_rows(sides.get(g) or [])
        byp = collections.defaultdict(list)
        for r in rows:
            if re.fullmatch(r"\d+", r[0] or "") and r[3]: byp[int(r[0])].append(r)
        mult = relay_x if re.search(r"relay|4 ?x", e, re.I) else 1
        for p, grp in byp.items():
            if p > len(P): continue
            pts = sum(P[i] for i in range(p - 1, min(p - 1 + len(grp), len(P)))) / len(grp) * mult
            for r in grp: T[r[3]] += pts
    return T

def key(t): return re.sub(r"[^a-z0-9]", "", t.lower())

def main(d):
    out, flags = {}, []
    for f in sorted(os.listdir(d)):
        if not f.endswith(".dat"): continue
        M = json.loads(gzip.open(os.path.join(d, f)).read())
        try: off = official(get(M["url"]))
        except Exception as e: print("fetch failed", M["id"], e, flush=True); continue
        if not off: continue
        res = {}
        for g, O in off.items():
            best = None
            for name, P in SYSTEMS.items():
                for rx in (1, 2):
                    T = {key(k): v for k, v in ours(M["ev"], g, P, rx).items()}
                    hit = sum(abs(T.get(key(t), 0) - v) < .01 for t, v in O.items())
                    if not best or hit > best[0]: best = (hit, name + (" (relays x2)" if rx == 2 else ""), T)
            hit, name, T = best
            rows = [[t, v, round(T.get(key(t), 0), 2)] for t, v in sorted(O.items(), key=lambda x: -x[1])]
            res[g] = {"sys": name, "t": rows, "ok": hit == len(O)}
            if hit != len(O): flags.append([M["id"], M["meet"], g, f"{hit}/{len(O)} teams match"])
        out[str(M["id"])] = res
        print(M["id"], M["meet"][:50], {g: (r["sys"], r["ok"]) for g, r in res.items()}, flush=True)
    sd = os.path.join(d, "scores"); os.makedirs(sd, exist_ok=True)
    for k, v in out.items(): json.dump(v, open(os.path.join(sd, k + ".json"), "w"), separators=(",", ":"))   # one small file per meet for the page
    out["_flags"] = flags
    json.dump({"flags": flags, "meets": len(out) - 1}, open(os.path.join(d, "scores-check.json"), "w"), indent=0)   # review list
    n = len(out) - 1; ok = sum(all(r["ok"] for r in v.values()) for k, v in out.items() if k != "_flags")
    print(f"{n} scored meets, {ok} match the official totals exactly, {len(flags)} gender tables flagged")

if __name__ == "__main__": main(sys.argv[1])
