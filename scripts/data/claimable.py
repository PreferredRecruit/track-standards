"""Which athlete pages can be claimed, and with which school email domain (Ryan 2026-11-07: verified college athlete accounts).
For every page in dist/data/athletes-index.json: the athlete's name and latest team (career data), the school's email domain
(public/data/school-domains.json via the site's school names + aliases), and `amb` = another athlete in our data on the same team
shares the last name and first initial (then an email like jwatkins@ could be either, so the claim goes to manual review).
Output: claimable.json [{id, name, team, domain, amb}] for loading into public.claimable_athletes (accounts project).
Usage: python3 claimable.py <site dir> <out json>"""
import glob, gzip, json, os, re, sys, unicodedata

def plain(s): return re.sub(r"[^a-z ]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().replace("-", " "))

def main(site, out):
    idx = json.load(open(os.path.join(site, "dist/data/athletes-index.json")))
    car = {}
    for f in glob.glob(os.path.join(site, "public/data/career/*.dat")):
        for k, v in json.loads(gzip.open(f).read()).items():
            if k in idx: car[k] = v
    S = json.load(open(os.path.join(site, "public/data/db.json")))["schools"]
    dom = json.load(open(os.path.join(site, "public/data/school-domains.json")))
    alias = {}
    for s in S:
        for n in [s["n"], s.get("t", "")] + s.get("a", []):
            if n: alias.setdefault(plain(n), []).append(s)
    # every athlete name per team across all career data, for the ambiguity check
    peers = {}
    for f in glob.glob(os.path.join(site, "public/data/career/*.dat")):
        for k, v in json.loads(gzip.open(f).read()).items():
            p = plain(v["n"]).split()
            if not p or not v.get("s"): continue
            for t in {r[5] for r in v["s"]}: peers.setdefault((plain(t), p[-1], p[0][:1]), set()).add(k)
    rows = []
    for k, v in car.items():
        latest = max(v["s"], key=lambda r: r[8] or "")
        team = latest[5]; c = alias.get(plain(team), [])
        c = list({s["n"]: s for s in c}.values()); c = [s for s in c if s.get("d") == latest[1]] or c          # "California" in NCAA D1 = UC Berkeley, not California (Pa.)
        school = c[0]["n"] if len(c) == 1 else None
        p = plain(v["n"]).split()
        amb = len(peers.get((plain(team), p[-1], p[0][:1]), set()) - {k}) > 0
        rows.append({"id": k, "name": v["n"], "team": team, "school": school, "domain": dom.get(school) if school else None, "amb": amb})
    json.dump(rows, open(out, "w"), indent=0)
    print(len(rows), "claimable pages,", sum(1 for r in rows if r["domain"]), "with a school email domain,", sum(r["amb"] for r in rows), "ambiguous names")
    print("no domain:", sorted({r["team"] for r in rows if not r["domain"]})[:30])

if __name__ == "__main__": main(*sys.argv[1:3])
