"""Cross country results from TFRRS (Ryan 2026-10-15: "xc can be an option for data on results side").
TFRRS publishes no XC performance lists, so the XC "results" are the championship meets: NCAA D1/D2/D3 (national
+ regions), NAIA, NJCAA (DI/DII/DIII) and every conference championship whose name matches a conference on the site.
Output mirrors scrape_lists so build_rank.py packages it like a season:
  lists/<year>/xc/<div>/<Meet_Name>_<m|f>.json
  {"list", "division", "season": "xc", "year", "gender", "source", "events": {"10K": [rows], "10K Team": [rows]}}
  row = {"place", "athlete", "year", "team", "mark", "conv", "meet", "date", "wind", "links"}; team rows use the team
  name as "athlete" and the team total time as "mark". Polite: same cached 3 s/page fetcher as scrape_lists."""
import html, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scrape_lists as SL

SEARCH = "https://xc.tfrrs.org/results_search_page.html?search_query=Cross+Country+Championships&with_year={year}&page={page}"
MEET = "https://xc.tfrrs.org{path}"

def norm(s): return re.sub(r"[^a-z0-9]", "", re.sub(r"\b(conference|athletic|association|the|cross[- ]country|championships?|\d{4})\b", " ", s.lower()))

def conf_divisions():
    """conference label -> division folder, from the site's standards database (either checkout layout)."""
    for p in (os.path.join(HERE, "..", "..", "..", "sites", "track-standards", "public", "data", "db.json"),
              os.path.join(HERE, "..", "..", "public", "data", "db.json")):
        p = os.path.abspath(p)
        if os.path.exists(p):
            d = json.load(open(p)); out = {}
            for k in d.get("ct", {}):
                dv, lab = k.split("|", 1)
                out[norm(lab)] = {"NCAA D1": "d1", "NCAA D2": "d2", "NCAA D3": "d3", "NAIA": "naia", "NJCAA": "njcaa"}.get(dv)
            return {k: v for k, v in out.items() if k and v}
    return {}

def division(name, confs):
    m = re.search(r"NCAA Division (III|II|I)\b", name)
    if m: return {"I": "d1", "II": "d2", "III": "d3"}[m.group(1)]
    if re.search(r"\bNAIA\b", name): return "naia"
    if re.search(r"\bNJCAA\b", name): return "njcaa"
    return confs.get(norm(name))

def meets_for_year(year, fresh=False):
    seen, out = set(), []
    for page in range(1, 10):
        try: d = SL.get(SEARCH.format(year=year, page=page), fresh)
        except Exception as e: print("FAILED search", year, page, e, flush=True); break
        found = 0
        for path, mid, name in re.findall(r'href="(/results/xc/(\d+)/[^"]+)"[^>]*>([^<]*)<', d):
            name = SL.txt(name)
            if mid in seen or not re.search(r"cross[- ]country championships", name, re.I): continue
            seen.add(mid); out.append((path, mid, name)); found += 1
        if not found: break
    return out

def parse_meet(page):
    """{"m": {"10K": rows, "10K Team": rows}, "f": {...}}, date. Handles the heading styles TFRRS uses
    ("Women 6k Run CC Team Results", "Women's Race - 6K Team Results", "Women's 6k Individual Results") and maps
    columns by header name. Team rows: mark = team score (what XC standings rank by), conv = total time."""
    dm = re.search(r"\b([A-Z][a-z]+ \d{1,2}, \d{4})\b", page)
    date = dm.group(1) if dm else ""
    out = {"m": {}, "f": {}}
    for h, body in re.findall(r"<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|\Z)", page, re.S):
        head = SL.txt(h)
        gm = re.match(r"\s*(Women|Men)", head, re.I); km = re.search(r"\b(Team|Individual)\s+Results", head, re.I)
        dmx = re.search(r"(\d+(?:\.\d+)?)\s*k\b", head, re.I)
        if not (gm and km and dmx): continue
        g = "f" if gm.group(1).lower() == "women" else "m"
        dist = dmx.group(1)
        if dist.endswith(".0"): dist = dist[:-2]
        dist += "K"
        kind = km.group(1).lower()
        tb = re.search(r"<table.*?</table>", body, re.S)
        if not tb: continue
        ths = [SL.txt(x).lower() for x in re.findall(r"<th[^>]*>(.*?)</th>", tb.group(0), re.S)]
        def col(*names):
            for n in names:
                for i, t in enumerate(ths):
                    if t == n: return i
            return None
        ci = {"pl": col("pl", "place"), "name": col("name", "athlete"), "year": col("year", "yr"), "team": col("team"),
              "time": col("time", "total time"), "score": col("score", "points")}
        rows = []
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", tb.group(0), re.S):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
            if not cells: continue
            t = [SL.txt(c) for c in cells]
            get = lambda k: t[ci[k]] if ci[k] is not None and ci[k] < len(t) else ""
            links = {k: re.sub(r"\.html$", "", u) for u, k in re.findall(r'href="(https?://[a-z]+\.tfrrs\.org/(athletes|teams)/[^"]+)"', tr)}
            try: place = int(re.sub(r"\D", "", get("pl") or t[0]) or 0)
            except ValueError: place = 0
            if kind == "individual":
                if not get("name") or not get("time"): continue
                rows.append({"place": place, "athlete": get("name"), "year": get("year"), "team": get("team"), "mark": get("time"), "conv": "", "meet": "", "date": date, "wind": "", "links": links})
            else:
                team = get("team") or (t[1] if len(t) > 1 else "")
                if not team or not (get("score") or get("time")): continue
                rows.append({"place": place, "athlete": team, "year": "", "team": team, "mark": get("score") or get("time"), "conv": get("time") if get("score") else "", "meet": "", "date": date, "wind": "", "links": links})
        if rows: out[g][dist if kind == "individual" else dist + " Team"] = rows
    return out, date

def main(years, fresh=False, rewrite=False):
    confs = conf_divisions()
    for year in years:
        meets = meets_for_year(year, fresh)
        print(f"{year} xc: {len(meets)} championship meets found", flush=True)
        for path, mid, name in meets:
            div = division(name, confs)
            if not div: print("  skip (unknown division):", name, flush=True); continue
            out_dir = os.path.join(HERE, "lists", str(year), "xc", div); os.makedirs(out_dir, exist_ok=True)
            safe = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")[:120]
            outs = {g: os.path.join(out_dir, f"{safe}_{g}.json") for g in ("m", "f")}
            if all(os.path.exists(o) for o in outs.values()) and not fresh and not rewrite: continue
            try: page = SL.get(MEET.format(path=path), fresh)
            except Exception as e: print("  FAILED", name, e, flush=True); continue
            ev, date = parse_meet(page)
            for g in ("m", "f"):
                if not ev[g]: continue
                for rows in ev[g].values():
                    for r in rows: r["meet"] = name
                json.dump({"list": name, "division": div, "season": "xc", "year": str(year), "gender": g, "source": MEET.format(path=path), "events": ev[g]}, open(outs[g], "w"))
            print(f"  {name} ({div}): " + ", ".join(f"{g} {sum(len(r) for r in ev[g].values())}" for g in ("m", "f")), flush=True)

if __name__ == "__main__":
    args = sys.argv[1:]
    main([int(a) for a in args if a.isdigit()] or [2026], fresh="--fresh" in args, rewrite="--rewrite" in args)
