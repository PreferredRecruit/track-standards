"""Source links for every ranked season (Ryan 2026-11-02, SEO/AEO "send it": cite the authority behind each ranking). For each
<year>-<season>-<div> with a results file: the TFRRS national list and the national championship meet the Power Index uses.
Output: public/data/rank_sources.json = {key: {"list": url, "listName", "champ": url, "champName"}}.
Usage: python3 build_rank_sources.py <scraped lists dir>[,<more>] <champs dir> <site>/public/data"""
import glob, gzip, json, os, re, sys

def main(lists, champs, data):
    out = {}
    for f in glob.glob(os.path.join(data, "rank", "*.dat")):
        key = os.path.basename(f)[:-4]; m = re.match(r"(\d{4})-(indoor|outdoor)-(d1|d2|d3|naia)$", key)
        if not m: continue
        y, s, d = m.groups(); e = {}
        nat = next((L["id"] for L in json.loads(gzip.open(f).read())["lists"] if L.get("nat")), None)   # the list the ranking uses
        for base in lists.split(","):
            p = os.path.join(base, y, s, d, f"{nat}_m.json")
            if nat and os.path.exists(p):
                J = json.load(open(p)); e["list"] = re.sub(r"\?gender=\w+$", "", J["source"]); e["listName"] = J["list"]; break
        c = os.path.join(champs, y, s, d + ".json")
        if os.path.exists(c):
            C = json.load(open(c))
            if C.get("url"): e["champ"] = C["url"]; e["champName"] = C["meet"]
        if e: out[key] = e
    json.dump(out, open(os.path.join(data, "rank_sources.json"), "w"), indent=0, sort_keys=True)
    print(f"rank sources: {len(out)} seasons, {sum('champ' in v for v in out.values())} with the national meet")

if __name__ == "__main__":
    main(*sys.argv[1:4])
