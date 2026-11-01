"""Packs the scraped meet results (scrape_meets.py) for the site: public/data/meets/<id>.dat (gzip) per meet, plus
public/data/meets/index.json = {athlete path: {meet name: id}} for the meets that have a file. The app opens a meet card from an
athlete's history with it (app.js meetView). Rows: [place, athlete, class, team, mark, wind]; rounds: [round, wind, rows], heats of
one round merged and ordered by place. Combined-event sub-results and para races are left out.
Usage: python3 build_meets.py <scraped meets dir> <site>/public/data/meets"""
import glob, gzip, html, json, os, re, sys

def person(a):
    if "," in a:
        last, first = a.split(",", 1)
        return f"{first.strip()} {last.strip()}"
    return a

def main(src, out):
    os.makedirs(out, exist_ok=True); have = set(); n = 0
    for f in glob.glob(os.path.join(src, "[0-9]*.json")):
        M = json.load(open(f))
        if not M.get("events"): continue
        ev = {}
        for e, sides in M["events"].items():
            if re.search(r"top|para|wheelchair|ambulatory|unified", e, re.I): continue
            for g, rounds in sides.items():
                by = {}
                for r in rounds: by.setdefault(r["round"], {"wind": r["wind"], "rows": []})["rows"] += r["rows"]
                R = []
                for rnd in sorted(by, key=lambda x: 0 if x.lower().startswith("final") else 1):
                    rows = sorted(by[rnd]["rows"], key=lambda x: int(re.sub(r"\D", "", x["place"]) or 9999))
                    R.append([rnd, by[rnd]["wind"], [[x["place"], person(x["athlete"]), x.get("year", ""), x["team"], x["mark"], x.get("wind", "")] for x in rows]])
                ev.setdefault(e, {})[g] = R
        if not ev: continue
        with gzip.open(os.path.join(out, f"{M['id']}.dat"), "wb", compresslevel=9) as o:
            o.write(json.dumps({"id": M["id"], "meet": html.unescape(M["meet"]), "url": M["url"], "ev": ev}, separators=(",", ":")).encode())
        have.add(M["id"]); n += 1
    A = json.load(open(os.path.join(src, "_athletes.json"))) if os.path.exists(os.path.join(src, "_athletes.json")) else {}
    idx = {k: {html.unescape(m): i for m, i in v.items() if i in have} for k, v in A.items()}
    json.dump({k: v for k, v in idx.items() if v}, open(os.path.join(out, "index.json"), "w"), separators=(",", ":"))
    print(f"meet results: {n} meets")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
