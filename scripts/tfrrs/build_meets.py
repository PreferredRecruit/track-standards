"""Packs the scraped meet results (scrape_meets.py) for the site: public/data/meets/<id>.dat (gzip) per meet, plus
public/data/meets/index.json = {athlete path: {meet name: id}} for the meets that have a file. The app opens a meet card from an
athlete's history with it (app.js meetView). Rows: [place, athlete, class, team, mark, wind]; rounds: [round, wind, rows], heats of
one round merged and ordered by place. Combined-event sub-results and para races are left out.
all.json (2026-11-13) = [[id, meet name, first day, last day]] for every meet with a file, so a meet opens from any athlete's
history or any Results row, not only from the 177 profile athletes in index.json. Dates are ISO, read from the dated index keys.
Usage: python3 build_meets.py <scraped meets dir> <site>/public/data/meets [--index-only]   (--index-only leaves the .dat files alone)"""
import datetime, glob, gzip, html, json, os, re, sys

MON = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
def span(d):
    """'Jun 5- 8, 2024' / 'Feb 27-Mar 1, 2025' / 'Jan 24, 2026' -> (first ISO day, last ISO day)"""
    m = re.match(r"([A-Z][a-z]{2}) (\d{1,2})(?:\s*[-/]\s*(?:([A-Z][a-z]{2}) )?(\d{1,2}))?, (\d{4})$", d)
    if not m or m.group(1) not in MON: return None
    y = int(m.group(5)); a = datetime.date(y, MON[m.group(1)], int(m.group(2)))
    b = datetime.date(y, MON.get(m.group(3) or m.group(1), a.month), int(m.group(4))) if m.group(4) else a
    if b < a: a = a.replace(year=y - 1)   # Dec 31-Jan 1
    return a.isoformat(), b.isoformat()

def person(a):
    if "," in a:
        last, first = a.split(",", 1)
        return f"{first.strip()} {last.strip()}"
    return a

def main(src, out, index_only=False):
    os.makedirs(out, exist_ok=True); have = set(); n = 0
    if index_only: have = {int(os.path.basename(f)[:-4]) for f in glob.glob(os.path.join(out, "[0-9]*.dat"))}
    for f in ([] if index_only else glob.glob(os.path.join(src, "[0-9]*.json"))):
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
    G = {}
    for v in idx.values():
        for k, i in v.items():
            if "|" not in k: continue
            name, d = k.rsplit("|", 1); sp = span(d)
            if sp: G.setdefault(i, [i, name, sp[0], sp[1]])
    json.dump(sorted(G.values()), open(os.path.join(out, "all.json"), "w"), separators=(",", ":"), ensure_ascii=False)
    print(f"meet results: {n or len(have)} meets, {len(G)} in all.json ({len(have) - len(G)} files without a dated key)")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], "--index-only" in sys.argv)
